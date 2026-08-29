import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bound on work per run — never fan out beyond this many users.
const MAX_USERS_PER_RUN = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const forbidden = requireServiceRole(req);
  if (forbidden) {
    return new Response(forbidden.body, {
      status: forbidden.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .limit(MAX_USERS_PER_RUN * 4);

    if (error) throw error;

    const userIds = [...new Set((subs ?? []).map((s: { user_id: string }) => s.user_id))].slice(
      0,
      MAX_USERS_PER_RUN,
    );

    let sent = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: userId,
            title: "Today's 3 fault questions",
            body: "Who's at fault? Answer today's 3 NZ road scenarios and keep your streak alive.",
            url: '/fault-quiz',
            tag: 'savo-fault-quiz',
          }),
        });
        if (res.ok) sent++;
        else errors.push(`send-push ${res.status} for one user`);
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : 'Unknown error');
      }
    }

    return new Response(JSON.stringify({ users: userIds.length, sent, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('daily-quiz-push failed:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
