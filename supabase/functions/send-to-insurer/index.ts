import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const REPLY_DOMAIN = 'replies.savo.co.nz';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { claimId, insurerEmail, subject, body } = await req.json();
    if (!claimId || !insurerEmail || !subject || !body) {
      throw new Error('Missing required fields: claimId, insurerEmail, subject, body');
    }

    // Verify user owns this claim
    const { data: claim, error: claimErr } = await supabase
      .from('claims')
      .select('id, user_id, claim_number')
      .eq('id', claimId)
      .single();
    if (claimErr || !claim) throw new Error('Claim not found');
    if (claim.user_id !== user.id) throw new Error('Unauthorized: not your claim');

    // Use shorter claim reference number (CLM-0001 format)
    const claimRef = String(claim.claim_number).padStart(4, '0');
    const replyToAddress = `claim-${claimRef}@${REPLY_DOMAIN}`;
    // Show user's email in the reply-to display name so insurer can see it
    const replyTo = `"${user.email}" <${replyToAddress}>`;

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    const senderName = profile?.display_name || 'Savo User';

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${senderName} via Savo <claims@savo.co.nz>`,
        to: [insurerEmail],
        reply_to: replyTo,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px;">
              ${body.replace(/\n/g, '<br />')}
            </div>
            <div style="border-top: 1px solid #e5e5e5; padding: 15px 20px; margin-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Sent via <strong>Savo</strong> – Vehicle Claims Assistant<br/>
                Reply to this email and your response will be tracked automatically.
              </p>
            </div>
          </div>`,
        text: `${body}\n\n---\nSent via Savo – Vehicle Claims Assistant\nReply to this email and your response will be tracked automatically.`,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`);

    // Store the outbound message
    await supabase.from('claim_messages').insert({
      claim_id: claimId,
      user_id: user.id,
      direction: 'outbound',
      subject,
      body,
      from_email: user.email,
      to_email: insurerEmail,
      resend_message_id: result.id,
    });

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send to insurer error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
