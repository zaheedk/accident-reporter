import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date 30 days from now
    const now = new Date();
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + 30);
    const targetDate = reminderDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if this is a test request
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const isTest = body.test === true;
    const testEmail = body.testEmail;

    // Get all vehicles
    const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('*, user_id');
    if (vErr) throw vErr;

    // Get all profiles with license expiry
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('user_id, license_number, license_expiry, email, email_verified, display_name');
    if (pErr) throw pErr;

    const results: string[] = [];

    // Helper to resolve user email
    const resolveEmail = async (userId: string, isTest: boolean, testEmail?: string) => {
      if (isTest) return testEmail;
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      let userEmail = userData?.user?.email;
      if (userEmail?.endsWith('@savo.phone.local')) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, email_verified')
          .eq('user_id', userId)
          .single();
        if (profileData?.email && profileData?.email_verified) {
          userEmail = profileData.email;
        } else {
          userEmail = null;
        }
      }
      return userEmail;
    };

    // Helper to send notification + email + push
    const sendReminder = async (userId: string, vehicleId: string | null, type: string, title: string, message: string, emailData: Record<string, string>, userEmail: string | null | undefined, pushUrl: string) => {
      // Check for existing notification (avoid duplicates) — skip for tests
      if (!isTest) {
        const { data: existing } = await supabase.from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', type)
          .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
          .limit(1);
        if (existing && existing.length > 0) return;
      }

      // Create in-app notification
      const notifData: Record<string, any> = { user_id: userId, type, title, message };
      if (vehicleId) notifData.vehicle_id = vehicleId;
      await supabase.from('notifications').insert(notifData);

      // Send email
      if (userEmail) {
        await supabase.functions.invoke('send-email', {
          body: { type, to: userEmail, data: emailData },
        });
        results.push(`Sent ${type} email to ${userEmail}`);
      } else {
        results.push(`Created notification for ${type} (no verified email)`);
      }

      // Send push
      try {
        await supabase.functions.invoke('send-push', {
          body: { user_id: userId, title, body: message, url: pushUrl, tag: `${type}-${vehicleId || userId}` },
        });
        results.push(`Sent ${type} push for user ${userId}`);
      } catch (pushErr) {
        console.error('Push notification error:', pushErr);
      }
    };

    // --- Vehicle expiry checks ---
    for (const v of vehicles || []) {
      const vehicleName = `${v.year} ${v.make} ${v.model}`;
      const userEmail = await resolveEmail(v.user_id, isTest, testEmail);

      const checks = [
        { field: v.rego_expiry, type: 'rego_expiry_reminder', title: 'Registration Expiry Reminder', message: `Your registration for ${vehicleName} (${v.rego_number}) expires on ${v.rego_expiry}. Please renew it soon.` },
        { field: v.wof_expiry, type: 'wof_expiry_reminder', title: 'WOF Expiry Reminder', message: `Your WOF for ${vehicleName} (${v.rego_number}) expires on ${v.wof_expiry}. Book an inspection soon.` },
        { field: v.insurance_expiry, type: 'insurance_expiry_reminder', title: 'Insurance Policy Expiry Reminder', message: `Your insurance policy for ${vehicleName} (${v.rego_number}) expires on ${v.insurance_expiry}. Contact your insurer to renew.` },
      ];

      for (const check of checks) {
        if (!check.field) continue;
        const shouldNotify = isTest || check.field === targetDate;
        if (!shouldNotify) continue;

        const emailData: Record<string, string> = { vehicle: vehicleName, rego: v.rego_number, expiryDate: check.field };
        if (check.type === 'insurance_expiry_reminder') {
          emailData.insurer = v.insurance_company || '';
          emailData.policyNumber = v.insurance_policy_number || '';
        }
        await sendReminder(v.user_id, v.id, check.type, check.title, check.message, emailData, userEmail, '/vehicles');
      }
    }

    // --- Driver license expiry checks ---
    for (const p of profiles || []) {
      if (!p.license_expiry || !p.license_number) continue;
      const shouldNotify = isTest || p.license_expiry === targetDate;
      if (!shouldNotify) continue;

      const userEmail = await resolveEmail(p.user_id, isTest, testEmail);
      const displayName = p.display_name || 'driver';
      const title = 'Driver License Expiry Reminder';
      const message = `Your driver license (${p.license_number}) expires on ${p.license_expiry}. Please renew it soon.`;
      const emailData = { licenseNumber: p.license_number, expiryDate: p.license_expiry, name: displayName };

      await sendReminder(p.user_id, null, 'license_expiry_reminder', title, message, emailData, userEmail, '/profile');
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
