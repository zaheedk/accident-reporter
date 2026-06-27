import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REMINDER_WINDOWS = [30, 14, 7, 3, 1]; // days before expiry

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("0")) return "+64" + cleaned.slice(1);
  if (/^\d{8,10}$/.test(cleaned)) return "+64" + cleaned;
  return "+" + cleaned;
}

async function sendSms(toPhone: string, body: string): Promise<boolean> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) return false;
  try {
    const e164 = normalizePhone(toPhone);
    if (!/^\+\d{8,15}$/.test(e164)) return false;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const credentials = btoa(`${sid}:${token}`);
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: e164, From: from, Body: body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Twilio SMS error:", data);
      return false;
    }
    return true;
  } catch (err) {
    console.error("SMS send failed:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduled-job endpoint: require the Supabase service-role bearer token.
  const forbidden = requireServiceRole(req);
  if (forbidden) {
    return new Response(forbidden.body, {
      status: forbidden.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    // Build a map of YYYY-MM-DD -> daysOut for each reminder window
    const windowMap = new Map<string, number>();
    for (const days of REMINDER_WINDOWS) {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      windowMap.set(d.toISOString().split('T')[0], days);
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const isTest = body.test === true;
    const testEmail = body.testEmail;
    const testPhone = body.testPhone;
    const testDays = typeof body.testDays === 'number' ? body.testDays : 30;

    const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('*, user_id');
    if (vErr) throw vErr;

    const { data: profiles, error: pErr } = await supabase.from('profiles').select('user_id, license_number, license_expiry, email, email_verified, display_name, phone_number');
    if (pErr) throw pErr;

    const profileByUser = new Map<string, any>();
    for (const p of profiles || []) profileByUser.set(p.user_id, p);

    const results: string[] = [];

    const resolveEmail = async (userId: string) => {
      if (isTest) return testEmail;
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      let userEmail = userData?.user?.email;
      if (userEmail?.endsWith('@savo.phone.local')) {
        const profile = profileByUser.get(userId);
        userEmail = profile?.email && profile?.email_verified ? profile.email : null;
      }
      return userEmail;
    };

    const resolvePhone = async (userId: string): Promise<string | null> => {
      if (isTest) return testPhone || null;
      const profile = profileByUser.get(userId);
      if (profile?.phone_number) return profile.phone_number;
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      return userData?.user?.phone || null;
    };

    const sendReminder = async (
      userId: string,
      vehicleId: string | null,
      baseType: string,
      daysOut: number,
      title: string,
      message: string,
      smsMessage: string,
      emailData: Record<string, string>,
      userEmail: string | null | undefined,
      userPhone: string | null,
      pushUrl: string,
    ) => {
      // Per-window dedupe key
      const type = `${baseType}_${daysOut}d`;

      if (!isTest) {
        // Avoid duplicate for same window — check ever, since each window only fires once
        const { data: existing } = await supabase.from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', type)
          .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
          .limit(1);
        if (existing && existing.length > 0) return;
      }

      // In-app notification
      const notifData: Record<string, any> = { user_id: userId, type, title, message };
      if (vehicleId) notifData.vehicle_id = vehicleId;
      await supabase.from('notifications').insert(notifData);

      // Email
      if (userEmail) {
        await supabase.functions.invoke('send-email', {
          body: { type: baseType, to: userEmail, data: { ...emailData, daysRemaining: String(daysOut) } },
        });
        results.push(`Email ${type} -> ${userEmail}`);
      }

      // Push
      try {
        await supabase.functions.invoke('send-push', {
          body: { user_id: userId, title, body: message, url: pushUrl, tag: `${type}-${vehicleId || userId}` },
        });
      } catch (pushErr) {
        console.error('Push error:', pushErr);
      }

      // SMS
      if (userPhone) {
        const ok = await sendSms(userPhone, smsMessage);
        if (ok) results.push(`SMS ${type} -> ${userPhone}`);
      }
    };

    // Vehicle expiry checks
    for (const v of vehicles || []) {
      const vehicleName = `${v.year} ${v.make} ${v.model}`.trim();
      const userEmail = await resolveEmail(v.user_id);
      const userPhone = await resolvePhone(v.user_id);

      const checks = [
        { field: v.rego_expiry, type: 'rego_expiry_reminder', label: 'Registration', book: 'Please renew it soon.' },
        { field: v.wof_expiry, type: 'wof_expiry_reminder', label: 'WOF', book: 'Book an inspection soon.' },
        { field: v.insurance_expiry, type: 'insurance_expiry_reminder', label: 'Insurance policy', book: 'Contact your insurer to renew.' },
      ];

      for (const check of checks) {
        if (!check.field) continue;
        const daysOut = isTest ? testDays : windowMap.get(check.field);
        if (daysOut === undefined) continue;

        const dayWord = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`;
        const title = `${check.label} expires ${dayWord}`;
        const message = `Your ${check.label.toLowerCase()} for ${vehicleName} (${v.rego_number}) expires on ${check.field} (${dayWord}). ${check.book}`;
        const smsMessage = `SAVO: ${check.label} for ${v.rego_number} expires ${dayWord} (${check.field}). ${check.book}`;

        const emailData: Record<string, string> = { vehicle: vehicleName, rego: v.rego_number, expiryDate: check.field };
        if (check.type === 'insurance_expiry_reminder') {
          emailData.insurer = v.insurance_company || '';
          emailData.policyNumber = v.insurance_policy_number || '';
        }
        await sendReminder(v.user_id, v.id, check.type, daysOut, title, message, smsMessage, emailData, userEmail, userPhone, '/vehicles');
      }
    }

    // Driver license expiry checks
    for (const p of profiles || []) {
      if (!p.license_expiry || !p.license_number) continue;
      const daysOut = isTest ? testDays : windowMap.get(p.license_expiry);
      if (daysOut === undefined) continue;

      const userEmail = await resolveEmail(p.user_id);
      const userPhone = await resolvePhone(p.user_id);
      const displayName = p.display_name || 'driver';
      const dayWord = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`;
      const title = `Driver licence expires ${dayWord}`;
      const message = `Your driver licence (${p.license_number}) expires on ${p.license_expiry} (${dayWord}). Please renew it soon.`;
      const smsMessage = `SAVO: Driver licence ${p.license_number} expires ${dayWord} (${p.license_expiry}). Please renew soon.`;
      const emailData = { licenseNumber: p.license_number, expiryDate: p.license_expiry, name: displayName };

      await sendReminder(p.user_id, null, 'license_expiry_reminder', daysOut, title, message, smsMessage, emailData, userEmail, userPhone, '/profile');
    }

    return new Response(JSON.stringify({ success: true, sent: results.length, details: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Expiry check error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
