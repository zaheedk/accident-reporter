import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the maintained RFC 8291/8292 implementation rather than legacy aesgcm.
import webpush from "npm:web-push@3.6.7";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Internal-only endpoint: invoked by other edge functions (e.g.
  // check-expiry-reminders) using the service-role key.
  const forbidden = requireServiceRole(req);
  if (forbidden) {
    return new Response(forbidden.body, {
      status: forbidden.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  try {
    const { user_id, title, body: msgBody, url, tag, kind = 'expiry' } = await req.json();
    if (typeof user_id !== 'string' || typeof title !== 'string' || typeof msgBody !== 'string' || !['quiz', 'expiry'].includes(kind)) {
      return new Response(JSON.stringify({ error: 'Invalid notification' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = 'BOo-qOvBG11PGO37UZBZ15RN0h9cdY1I9Xt3HkNHT204DnQGw53LQ7ucwfC-lggDXLSLG5Fx2hqH0khSF_Y2nxY';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPrivateKey) throw new Error('Push delivery is not configured');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subs, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)
      .eq(kind === 'quiz' ? 'quiz_enabled' : 'expiry_enabled', true);
    if (subscriptionError) throw subscriptionError;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = { title, body: msgBody, url: url || '/dashboard', tag: tag || 'savo-reminder', icon: '/app-icon-192.png' };
    
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
          TTL: 86400, contentEncoding: 'aes128gcm',
          vapidDetails: { subject: 'mailto:hello@savo.co.nz', publicKey: vapidPublicKey, privateKey: vapidPrivateKey },
        });
        sent++;
      } catch (e: unknown) {
        const status = typeof e === 'object' && e !== null && 'statusCode' in e ? Number(e.statusCode) : 0;
        if (status === 404 || status === 410) await supabase.from('push_subscriptions').delete().eq('user_id', user_id).eq('endpoint', sub.endpoint);
        else errors.push(status ? `Push provider returned ${status}` : 'Push delivery failed');
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
