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

    const payload = await req.json();

    // Resend inbound webhook payload
    const { from, to, subject, text, html } = payload;

    if (!to || !from) {
      throw new Error('Missing required fields in webhook payload');
    }

    // Extract claim reference from the to address: claim-0001@replies.savo.co.nz
    const toAddress = Array.isArray(to) ? to[0] : to;
    const match = toAddress.match(/claim-(\d+)@/i);
    if (!match) {
      console.log('No claim reference found in to address:', toAddress);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'No claim ref in address' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claimNumber = parseInt(match[1], 10);

    // Look up claim by claim_number
    const { data: claim, error: claimErr } = await supabase
      .from('claims')
      .select('id, user_id, insurance_company')
      .eq('claim_number', claimNumber)
      .single();

    if (claimErr || !claim) {
      console.error('Claim not found for inbound email, claim_number:', claimNumber);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Claim not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromEmail = typeof from === 'string' ? from : (from?.address || from?.email || JSON.stringify(from));
    const bodyText = text || (html ? html.replace(/<[^>]*>/g, '') : '');

    // Store the inbound message
    await supabase.from('claim_messages').insert({
      claim_id: claimId,
      user_id: claim.user_id,
      direction: 'inbound',
      subject: subject || '(No subject)',
      body: bodyText,
      from_email: fromEmail,
      to_email: toAddress,
    });

    // Create an in-app notification
    await supabase.from('notifications').insert({
      user_id: claim.user_id,
      type: 'insurer_reply',
      title: 'Reply from Insurance Company',
      message: `You received a reply regarding your claim from ${fromEmail}. Subject: ${subject || '(No subject)'}`,
    });

    return new Response(JSON.stringify({ success: true, claimId, stored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Inbound email webhook error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200, // Return 200 to prevent Resend from retrying
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
