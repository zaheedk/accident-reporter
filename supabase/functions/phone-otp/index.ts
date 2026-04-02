import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

/** Normalize a phone number to E.164 format. Defaults to NZ (+64) if no country code. */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) {
    return "+64" + cleaned.slice(1); // NZ default
  }
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

      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: dbError } = await supabaseAdmin
        .from("phone_otps")
        .insert({ phone_number: phone, otp_code: otpCode, expires_at: expiresAt });

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
          To: phone,
          From: Deno.env.get("TWILIO_PHONE_NUMBER") || "",
          Body: `Your Savo verification code is: ${otpCode}. It expires in 10 minutes.`,
        }),
      });

      const smsData = await smsResponse.json();
      if (!smsResponse.ok) {
        console.error("Twilio error:", smsData);
        return new Response(
          JSON.stringify({ error: "Failed to send SMS" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

      const { data: otpRecord, error: findError } = await supabaseAdmin
        .from("phone_otps")
        .select("*")
        .eq("phone_number", phone)
        .eq("otp_code", otp)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError || !otpRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("phone_otps")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone_number", phone)
        .maybeSingle();

      if (existingProfile) {
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: `phone_${phone.replace(/\+/g, "")}@savo.phone.local`,
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
        const fakeEmail = `phone_${phone.replace(/\+/g, "")}@savo.phone.local`;
        const tempPassword = crypto.randomUUID();

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: fakeEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { phone_number: phone, full_name: "" },
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
            .update({ phone_number: phone })
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
