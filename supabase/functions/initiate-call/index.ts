import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY not configured");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER not configured");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Not authenticated");

    const { claimId, insurerPhone: rawInsurerPhone, userPhone: rawUserPhone } = await req.json();
    if (!claimId || !rawUserPhone) {
      return new Response(JSON.stringify({ error: "claimId and userPhone are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .select("insurance_company")
      .eq("id", claimId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (claimErr) {
      throw new Error(`Failed to load claim: ${claimErr.message}`);
    }

    if (!claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedInsurerPhone = rawInsurerPhone;

    if (claim.insurance_company) {
      const { data: insurer, error: insurerErr } = await supabase
        .from("insurance_companies")
        .select("phone")
        .eq("name", claim.insurance_company)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (insurerErr) {
        throw new Error(`Failed to resolve insurer phone: ${insurerErr.message}`);
      }

      if (insurer?.phone) {
        resolvedInsurerPhone = insurer.phone;
      }
    }

    if (!resolvedInsurerPhone) {
      return new Response(JSON.stringify({ error: "No insurer phone number found for this claim" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize NZ phone numbers to E.164
    const normalizeNZPhone = (phone: string): string => {
      const digits = phone.replace(/[\s\-()]/g, "");
      if (digits.startsWith("+")) return digits;
      if (digits.startsWith("00")) return "+" + digits.slice(2);
      if (digits.startsWith("0")) return "+64" + digits.slice(1);
      return "+64" + digits;
    };

    const insurerPhone = normalizeNZPhone(resolvedInsurerPhone);
    const userPhone = normalizeNZPhone(rawUserPhone);
    console.log(`Resolved insurer phone from claim ${claimId} (${claim.insurance_company}) — user: ${userPhone}, insurer: ${insurerPhone}`);

    // The callback URL for Twilio to hit when the call connects / ends
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/call-status-webhook`;

    // Step 1: Call the user's phone first. When they answer, Twilio connects to the insurer.
    // We use TwiML <Dial> with a <Number> inside to bridge to the insurer and record both legs.
    const twiml = `<Response><Say>Connecting you to your insurance company. This call will be recorded.</Say><Dial record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}?claim_id=${claimId}&amp;user_id=${user.id}" recordingStatusCallbackMethod="POST"><Number>${insurerPhone}</Number></Dial></Response>`;

    const response = await fetch(`${GATEWAY_URL}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: userPhone,
        From: TWILIO_PHONE_NUMBER,
        Twiml: twiml,
        StatusCallback: statusCallbackUrl,
        StatusCallbackMethod: "POST",
        StatusCallbackEvent: "completed",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Twilio error [${response.status}]: ${JSON.stringify(data)}`);
    }

    // Create a pending call_recordings row
    await supabase.from("call_recordings").insert({
      claim_id: claimId,
      user_id: user.id,
      file_path: "",
      file_name: `call-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      twilio_call_sid: data.sid,
      status: "calling",
    });

    return new Response(JSON.stringify({ callSid: data.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("initiate-call error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
