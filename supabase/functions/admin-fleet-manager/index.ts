import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, target_user_id, fleet_name } = await req.json();
    if (!action || !target_user_id) {
      return new Response(JSON.stringify({ error: 'Missing action or target_user_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'assign') {
      // Check if user is already in a fleet
      const { data: existingMember } = await admin
        .from('fleet_members')
        .select('fleet_id, role')
        .eq('user_id', target_user_id)
        .maybeSingle();

      if (existingMember) {
        if (existingMember.role === 'manager') {
          return new Response(JSON.stringify({ ok: true, message: 'Already a fleet manager' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'User is already a driver in another fleet. Remove them first.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Look up display name for default fleet name
      const { data: profile } = await admin
        .from('profiles')
        .select('display_name')
        .eq('user_id', target_user_id)
        .maybeSingle();

      const name = (fleet_name && String(fleet_name).trim()) ||
        (profile?.display_name ? `${profile.display_name}'s Fleet` : 'My Fleet');

      const { data: fleet, error: fleetErr } = await admin
        .from('fleets')
        .insert({ manager_user_id: target_user_id, name })
        .select('id, name')
        .single();
      if (fleetErr) throw fleetErr;

      return new Response(JSON.stringify({ ok: true, fleet }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'revoke') {
      // Find fleet they manage
      const { data: fleet } = await admin
        .from('fleets')
        .select('id')
        .eq('manager_user_id', target_user_id)
        .maybeSingle();
      if (!fleet) {
        return new Response(JSON.stringify({ ok: true, message: 'Not a fleet manager' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Cascade clean-up
      await admin.from('fleet_vehicle_assignments').delete().eq('fleet_id', fleet.id);
      await admin.from('fleet_invites').delete().eq('fleet_id', fleet.id);
      await admin.from('fleet_members').delete().eq('fleet_id', fleet.id);
      const { error: delErr } = await admin.from('fleets').delete().eq('id', fleet.id);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const { data: fleets } = await admin
        .from('fleets')
        .select('id, name, manager_user_id');
      return new Response(JSON.stringify({ fleets: fleets || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
