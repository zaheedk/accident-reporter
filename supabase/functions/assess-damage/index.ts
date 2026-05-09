import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a senior NZ vehicle damage assessor. You will receive photos of a damaged vehicle and must produce a structured damage report.

Identify visible damage zones, the affected parts, and severity. Estimate a realistic NZ panel-shop repair cost RANGE in NZD (parts + labour + paint), based on typical NZ panel rates (~$95-$130/hr labour, OEM/aftermarket parts, paint per panel ~$400-$700).

Severity scale: "minor" (scratch, small dent), "moderate" (panel needs replacement or significant paint), "severe" (structural / major component replacement, airbag deploy, frame impact).

Confidence (0-100): how confident you are in the assessment based on photo quality, angles, and visible context. Lower confidence if photos are dark, blurry, partial, or only show one angle.

Return ONLY valid JSON matching this exact schema, no markdown, no commentary:
{
  "overall_severity": "minor" | "moderate" | "severe",
  "confidence": <integer 0-100>,
  "cost_low": <integer NZD>,
  "cost_high": <integer NZD>,
  "zones": [
    { "part": "<part name>", "severity": "minor" | "moderate" | "severe", "description": "<1 short sentence>" }
  ],
  "notes": "<1-2 sentence overall summary>"
}`;

async function fetchAsDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`image fetch ${r.status}`);
  const ct = r.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  return `data:${ct};base64,${btoa(bin)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userRes.user.id;

    const { claimId } = await req.json();
    if (!claimId) throw new Error("claimId required");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify ownership and load photos
    const { data: claim, error: cErr } = await admin
      .from("claims")
      .select("id, user_id")
      .eq("id", claimId)
      .single();
    if (cErr || !claim) throw new Error("Claim not found");
    if (claim.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: photos } = await admin
      .from("claim_photos")
      .select("id, file_path")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: true })
      .limit(6);

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: "Add at least one damage photo first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build signed URLs and download as base64
    const imageParts: any[] = [];
    for (const p of photos) {
      const { data: signed } = await admin.storage.from("claim-photos").createSignedUrl(p.file_path, 600);
      if (!signed?.signedUrl) continue;
      try {
        const dataUrl = await fetchAsDataUrl(signed.signedUrl);
        imageParts.push({ type: "image_url", image_url: { url: dataUrl } });
      } catch (e) {
        console.error("img fetch failed", e);
      }
    }
    if (imageParts.length === 0) throw new Error("Failed to load any photos");

    const model = "google/gemini-2.5-pro";
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyse these ${imageParts.length} photo(s) of the damaged vehicle and produce the JSON report.` },
              ...imageParts,
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await aiRes.json();
    const raw: string = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(cleaned); } catch {
      // try to extract JSON object substring
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned invalid JSON");
      parsed = JSON.parse(m[0]);
    }

    const zones = Array.isArray(parsed.zones) ? parsed.zones : [];
    const sev = ["minor", "moderate", "severe"].includes(parsed.overall_severity) ? parsed.overall_severity : "moderate";

    // Replace any prior assessment for this claim
    await admin.from("damage_assessments").delete().eq("claim_id", claimId);

    const { data: inserted, error: iErr } = await admin
      .from("damage_assessments")
      .insert({
        claim_id: claimId,
        user_id: userId,
        overall_severity: sev,
        zones_count: zones.length,
        confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
        cost_low: Math.max(0, Math.round(Number(parsed.cost_low) || 0)),
        cost_high: Math.max(0, Math.round(Number(parsed.cost_high) || 0)),
        currency: "NZD",
        zones,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        model,
        raw_response: parsed,
      })
      .select()
      .single();
    if (iErr) throw iErr;

    return new Response(JSON.stringify({ assessment: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assess-damage error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
