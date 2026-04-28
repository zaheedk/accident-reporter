// Edge function consumed by the home-screen widget.
// Auth: a long-lived widget token in the `X-Widget-Token` header.
// Returns per-vehicle expiry data and emergency/roadside contacts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-widget-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const token = req.headers.get('x-widget-token') ?? '';
  if (!token || token.length < 16) return json({ error: 'missing_token' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tokenRow, error: tokenErr } = await admin
    .from('widget_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (tokenErr || !tokenRow) return json({ error: 'invalid_token' }, 401);
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return json({ error: 'expired' }, 401);

  const userId = tokenRow.user_id as string;

  admin.from('widget_tokens').update({ last_used_at: new Date().toISOString() }).eq('token', token).then(() => {});

  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, rego_number, make, model, rego_expiry, wof_expiry, insurance_expiry, insurance_company, roadside_provider, roadside_phone, is_default, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  const vehicleList = (vehicles ?? []).map((v) => ({
    rego: v.rego_number ?? '',
    make: v.make ?? '',
    model: v.model ?? '',
    nickname: [v.make, v.model].filter(Boolean).join(' ').trim(),
    regoExpiry: v.rego_expiry ?? '',
    wofExpiry: v.wof_expiry ?? '',
    insuranceExpiry: v.insurance_expiry ?? '',
    roadsideName: v.roadside_provider ?? '',
    roadsidePhone: v.roadside_phone ?? '',
    isDefault: !!v.is_default,
  }));

  const primaryVehicle = (vehicles ?? []).find((v) => v.is_default) ?? (vehicles ?? [])[0] ?? null;
  const vehicleSummary = primaryVehicle
    ? {
        rego: primaryVehicle.rego_number ?? '',
        make: primaryVehicle.make ?? '',
        model: primaryVehicle.model ?? '',
      }
    : null;

  return json({
    refreshedAt: new Date().toISOString(),
    vehicle: vehicleSummary,
    vehicles: vehicleList,
    contacts: {
      emergency: { name: 'Emergency', phone: '111' },
    },
  });
});
