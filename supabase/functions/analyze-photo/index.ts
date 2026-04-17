import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, type } = await req.json();
    // type: "damage" | "rego" | "license"

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    if (type === "damage") {
      systemPrompt = `You are a vehicle damage assessment expert. Analyze the photo and provide a concise, professional description of the visible damage to the vehicle. Include:
- Location of damage on the vehicle (front, rear, driver side, etc.)
- Type of damage (dent, scratch, crack, shattered, bent, etc.)
- Severity estimate (minor, moderate, severe)
- Any affected parts (bumper, fender, door, windshield, headlight, etc.)
Keep it factual and under 150 words. Do not speculate about cause.`;
    } else if (type === "rego") {
      systemPrompt = `You are a license plate/registration number detection system. Look at the photo and extract the vehicle registration number (license plate). 
Return ONLY a JSON object with these fields:
- "rego": the registration/license plate text (uppercase, no spaces), or null if not visible
- "confidence": "high", "medium", or "low"
Do not include any other text, just the JSON.`;
    } else if (type === "license") {
      systemPrompt = `You are a driver's license information extraction system. Analyze the driver's license photo and extract:
Return ONLY a JSON object with these fields:
- "fullName": the full name on the license, or null
- "licenseNumber": the license number, or null  
- "address": the address if visible, or null
- "dateOfBirth": date of birth if visible, or null
Do not include any other text, just the JSON.`;
    }

    // Download the image and convert to base64 data URL.
    // Gemini's URL-fetcher does not reliably handle Supabase signed URLs (query string tokens),
    // so we inline the image bytes instead.
    let imagePayload: string = imageUrl;
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      const buf = new Uint8Array(await imgRes.arrayBuffer());
      // Convert to base64 in chunks to avoid call stack overflow
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < buf.length; i += chunkSize) {
        binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      imagePayload = `data:${contentType};base64,${base64}`;
    } catch (fetchErr) {
      console.error("Failed to download image, falling back to URL:", fetchErr);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: type === "damage" ? "Analyze the damage in this vehicle photo." : type === "rego" ? "Extract the registration number from this photo." : "Extract the driver license details from this photo." },
              { type: "image_url", image_url: { url: imagePayload } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-photo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
