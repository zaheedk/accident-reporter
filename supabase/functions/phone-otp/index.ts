import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

async function hashOtp(code: string, phone: string): Promise<string> {
  // Salt with the phone number so identical OTPs across phones differ.
  const data = new TextEncoder().encode(`${phone}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Normalize a phone number to E.164 format. Defaults to NZ (+64) if no country code. */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("0")) return "+64" + cleaned.slice(1); // NZ default
  // No country code and no leading 0 — assume NZ mobile
  if (/^\d{8,10}$/.test(cleaned)) return "+64" + cleaned;
  return "+" + cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  if (!TWILIO_ACCOUNT_SID) {
    return new Response(
      JSON.stringify({ error: "TWILIO_ACCOUNT_SID is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!TWILIO_AUTH_TOKEN) {
    return new Response(
      JSON.stringify({ error: "TWILIO_AUTH_TOKEN is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, phone, otp } = await req.json();

    if (action === "send") {
      if (!phone) {
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const e164Phone = normalizePhone(phone);
      // Strict NZ + international format guard.
      if (!/^\+\d{8,15}$/.test(e164Phone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate-limit: at most 1 SMS / 30s and 5 / 24h per phone number.
      const since30s = new Date(Date.now() - 30 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentBurst } = await supabaseAdmin
        .from("phone_otps")
        .select("id", { count: "exact", head: true })
        .eq("phone_number", e164Phone)
        .gte("created_at", since30s);
      const { count: recentDay } = await supabaseAdmin
        .from("phone_otps")
        .select("id", { count: "exact", head: true })
        .eq("phone_number", e164Phone)
        .gte("created_at", since24h);
      if ((recentBurst ?? 0) >= 1 || (recentDay ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "Too many OTP requests, please wait before trying again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otpCode = generateOtp();
      const otpHash = await hashOtp(otpCode, e164Phone);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: dbError } = await supabaseAdmin
        .from("phone_otps")
        .insert({ phone_number: e164Phone, otp_code: otpHash, expires_at: expiresAt });

      if (dbError) {
        console.error("DB error:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to store OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send SMS via Twilio REST API directly
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      const smsResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: e164Phone,
          From: Deno.env.get("TWILIO_PHONE_NUMBER") || "",
          Body: `Your SAVO verification code is: ${otpCode}. It expires in 15 minutes.`,
        }),
      });

      const smsData = await smsResponse.json();
      if (!smsResponse.ok) {
        console.error("Twilio error:", smsData);
        const twilioMsg = smsData?.message || "Failed to send SMS";
        return new Response(
          JSON.stringify({ error: twilioMsg, code: smsData?.code }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!phone || !otp) {
        return new Response(
          JSON.stringify({ error: "Phone and OTP are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const e164Phone = normalizePhone(phone);
      const otpHash = await hashOtp(otp, e164Phone);

      // Compare the submitted code against the hashed value stored at rest.
      const { data: anyMatch } = await supabaseAdmin
        .from("phone_otps")
        .select("*")
        .eq("phone_number", e164Phone)
        .eq("otp_code", otpHash)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!anyMatch) {
        return new Response(
          JSON.stringify({ error: "Invalid verification code. Please check and try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(anyMatch.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Your verification code has expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otpRecord = anyMatch;

      await supabaseAdmin
        .from("phone_otps")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone_number", e164Phone)
        .maybeSingle();

      if (existingProfile) {
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: `phone_${e164Phone.replace(/\+/g, "")}@savo.phone.local`,
        });

        if (signInError) {
          console.error("Sign in error:", signInError);
          return new Response(
            JSON.stringify({ error: "Failed to sign in" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            isNewUser: false,
            token: signInData?.properties?.hashed_token,
            actionLink: signInData?.properties?.action_link,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const fakeEmail = `phone_${e164Phone.replace(/\+/g, "")}@savo.phone.local`;
        const tempPassword = crypto.randomUUID();

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: fakeEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { phone_number: e164Phone, full_name: "" },
        });

        if (createError) {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (newUser?.user) {
          await supabaseAdmin
            .from("profiles")
            .update({ phone_number: e164Phone })
            .eq("user_id", newUser.user.id);
        }

        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: fakeEmail,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ error: "Account created but sign-in failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            isNewUser: true,
            token: signInData?.properties?.hashed_token,
            actionLink: signInData?.properties?.action_link,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
