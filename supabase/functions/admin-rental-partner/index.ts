import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function aliasFromName(name: string): string {
  const slug = (name || 'partner')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16) || 'partner';
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${slug}+${suffix}@hires.savo.co.nz`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from('user_roles').select('role')
      .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return json({ error: 'Forbidden' }, 403);

    const body = await req.json();
    const { action } = body;

    if (action === 'list') {
      const [{ data: partners }, { data: applications }] = await Promise.all([
        admin.from('rental_partners').select('*').order('created_at', { ascending: false }),
        admin.from('rental_partner_applications').select('*').order('created_at', { ascending: false }),
      ]);
      return json({ partners: partners || [], applications: applications || [] });
    }

    if (action === 'approve_application') {
      const { application_id } = body;
      if (!application_id) return json({ error: 'application_id required' }, 400);
      const { data: app } = await admin.from('rental_partner_applications').select('*').eq('id', application_id).maybeSingle();
      if (!app) return json({ error: 'Application not found' }, 404);
      if (app.status !== 'pending') return json({ error: 'Already reviewed' }, 400);

      const { data: existing } = await admin.from('rental_partners').select('id').eq('owner_user_id', app.user_id).maybeSingle();
      if (!existing) {
        const { error: insErr } = await admin.from('rental_partners').insert({
          owner_user_id: app.user_id,
          company_name: app.company_name,
          contact_email: app.contact_email,
          phone: app.phone,
          inbound_alias: aliasFromName(app.company_name),
        });
        if (insErr) return json({ error: insErr.message }, 500);
      }

      await admin.from('rental_partner_applications').update({
        status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: userData.user.id,
      }).eq('id', application_id);

      return json({ ok: true });
    }

    if (action === 'reject_application') {
      const { application_id, notes } = body;
      if (!application_id) return json({ error: 'application_id required' }, 400);
      await admin.from('rental_partner_applications').update({
        status: 'rejected', admin_notes: notes || '',
        reviewed_at: new Date().toISOString(), reviewed_by: userData.user.id,
      }).eq('id', application_id);
      return json({ ok: true });
    }

    if (action === 'revoke_partner') {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: 'target_user_id required' }, 400);
      const { data: partner } = await admin.from('rental_partners').select('id')
        .eq('owner_user_id', target_user_id).maybeSingle();
      if (!partner) return json({ ok: true, message: 'Not a rental partner' });
      const { error } = await admin.from('rental_partners').delete().eq('id', partner.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'create_partner') {
      const { company_name, owner_email, contact_email, phone } = body;
      if (!company_name || !owner_email) return json({ error: 'company_name and owner_email required' }, 400);

      // Find or create the owner user by email
      let ownerId: string | null = null;
      const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = usersList?.users?.find((u: any) => (u.email || '').toLowerCase() === owner_email.toLowerCase());
      if (existingUser) {
        ownerId = existingUser.id;
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: owner_email,
          email_confirm: true,
          user_metadata: { source: 'rental_partner', full_name: company_name },
        });
        if (createErr || !created.user) return json({ error: createErr?.message || 'Failed to create owner user' }, 500);
        ownerId = created.user.id;
      }

      const { data: existingPartner } = await admin.from('rental_partners').select('id')
        .eq('owner_user_id', ownerId).maybeSingle();
      if (existingPartner) return json({ error: 'This user is already a rental partner' }, 400);

      const { data: newPartner, error: insErr } = await admin.from('rental_partners').insert({
        owner_user_id: ownerId,
        company_name,
        contact_email: contact_email || owner_email,
        phone: phone || '',
        inbound_alias: aliasFromName(company_name),
      }).select('*').single();
      if (insErr) return json({ error: insErr.message }, 500);

      return json({ ok: true, partner: newPartner });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
