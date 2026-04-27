// Edge function consumed by the home-screen widget.
// Auth: a long-lived widget token in the `X-Widget-Token` header.
// Returns a JSON payload with: latest 3 claims, next 3 vehicle expiries, emergency contacts.

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

  // Latest 3 claims
  const { data: claimsRaw } = await admin
    .from('claims')
    .select('report_number, status, incident_date, incident_location, insurance_company, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(3);

  const claims = (claimsRaw ?? []).map((c) => ({
    reportNumber: c.report_number,
    status: c.status,
    incidentDate: c.incident_date,
    location: c.incident_location,
    insurer: c.insurance_company,
  }));
  const latestClaim = claims[0] ?? null;

  // All vehicles (for expiries + selectable widget vehicle list)
  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, rego_number, make, model, rego_expiry, wof_expiry, insurance_expiry, insurance_company, roadside_provider, roadside_phone, is_default, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  type Expiry = { kind: string; date: string; vehicle: string; rego: string; insurer?: string };
  const expiries: Expiry[] = [];
  for (const v of vehicles ?? []) {
    const label = `${v.make ?? ''} ${v.model ?? ''}`.trim() || 'Vehicle';
    if (v.rego_expiry) expiries.push({ kind: 'Rego', date: v.rego_expiry, vehicle: label, rego: v.rego_number ?? '' });
    if (v.wof_expiry) expiries.push({ kind: 'WOF', date: v.wof_expiry, vehicle: label, rego: v.rego_number ?? '' });
    if (v.insurance_expiry) expiries.push({ kind: 'Insurance', date: v.insurance_expiry, vehicle: label, rego: v.rego_number ?? '', insurer: v.insurance_company ?? '' });
  }
  // Sort: prioritise upcoming (today onwards) by soonest, then past by most recent
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = expiries.filter((e) => e.date >= today).sort((a, b) => (a.date > b.date ? 1 : -1));
  const past = expiries.filter((e) => e.date < today).sort((a, b) => (a.date > b.date ? -1 : 1));
  const nextExpiries = [...upcoming, ...past].slice(0, 3);
  const nextExpiry = nextExpiries[0] ?? null;

  // Primary vehicle = explicit default if set, else most recently updated.
  // We also expose the full list so the widget can let the user cycle through them.
  const primaryVehicle = (vehicles ?? []).find((v) => v.is_default) ?? (vehicles ?? [])[0] ?? null;
  const vehicleSummary = primaryVehicle
    ? {
        rego: primaryVehicle.rego_number ?? '',
        make: primaryVehicle.make ?? '',
        model: primaryVehicle.model ?? '',
      }
    : null;
  const vehicleList = (vehicles ?? []).map((v) => ({
    rego: v.rego_number ?? '',
    make: v.make ?? '',
    model: v.model ?? '',
    roadsideName: v.roadside_provider ?? '',
    roadsidePhone: v.roadside_phone ?? '',
    isDefault: !!v.is_default,
  }));
  const roadside = primaryVehicle && primaryVehicle.roadside_phone
    ? {
        name: primaryVehicle.roadside_provider || 'Roadside',
        phone: primaryVehicle.roadside_phone,
      }
    : null;

  // Insurer contact
  let insurerPhone = '';
  let insurerName = '';
  if (latestClaim?.insurer) {
    const { data: ic } = await admin
      .from('insurance_companies')
      .select('name, phone')
      .ilike('name', latestClaim.insurer)
      .maybeSingle();
    if (ic) {
      insurerPhone = ic.phone ?? '';
      insurerName = ic.name ?? '';
    }
  }

  return json({
    refreshedAt: new Date().toISOString(),
    claim: latestClaim,
    claims,
    nextExpiry,
    nextExpiries,
    vehicle: vehicleSummary,
    vehicles: vehicleList,
    contacts: {
      insurer: insurerName ? { name: insurerName, phone: insurerPhone } : null,
      roadside,
      emergency: { name: 'Emergency', phone: '111' },
    },
  });
});
