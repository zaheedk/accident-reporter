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

    const results: string[] = [];

    for (const v of vehicles || []) {
      const vehicleName = `${v.year} ${v.make} ${v.model}`;
      const vehicleData = { vehicle: vehicleName, rego: v.rego_number };

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(v.user_id);
      const userEmail = isTest ? testEmail : userData?.user?.email;
      if (!userEmail) continue;

      const checks = [
        { field: v.rego_expiry, type: 'rego_expiry_reminder', title: 'Registration Expiry Reminder', message: `Your registration for ${vehicleName} (${v.rego_number}) expires on ${v.rego_expiry}. Please renew it soon.` },
        { field: v.wof_expiry, type: 'wof_expiry_reminder', title: 'WOF Expiry Reminder', message: `Your WOF for ${vehicleName} (${v.rego_number}) expires on ${v.wof_expiry}. Book an inspection soon.` },
        { field: v.insurance_expiry, type: 'insurance_expiry_reminder', title: 'Insurance Policy Expiry Reminder', message: `Your insurance policy for ${vehicleName} (${v.rego_number}) expires on ${v.insurance_expiry}. Contact your insurer to renew.` },
      ];

      for (const check of checks) {
        if (!check.field) continue;

        const shouldNotify = isTest || check.field === targetDate;
        if (!shouldNotify) continue;

        // Check for existing notification (avoid duplicates) — skip for tests
        if (!isTest) {
          const { data: existing } = await supabase.from('notifications')
            .select('id')
            .eq('user_id', v.user_id)
            .eq('type', check.type)
            .eq('vehicle_id', v.id)
            .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
            .limit(1);
          if (existing && existing.length > 0) continue;
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: v.user_id,
          type: check.type,
          title: check.title,
          message: check.message,
          vehicle_id: v.id,
        });

        // Send email via send-email function
        const emailData: Record<string, string> = {
          ...vehicleData,
          expiryDate: check.field,
        };
        if (check.type === 'insurance_expiry_reminder') {
          emailData.insurer = v.insurance_company || '';
          emailData.policyNumber = v.insurance_policy_number || '';
        }

        await supabase.functions.invoke('send-email', {
          body: { type: check.type, to: userEmail, data: emailData },
        });

        results.push(`Sent ${check.type} for ${vehicleName} to ${userEmail}`);
      }
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
