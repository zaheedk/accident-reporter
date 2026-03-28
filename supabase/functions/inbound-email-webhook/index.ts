import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractString(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractString(item);
      if (extracted) return extracted;
    }
    return '';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // Common address object shapes
    if (typeof obj.address === 'string' && obj.address.trim()) return obj.address.trim();
    if (typeof obj.email === 'string' && obj.email.trim()) return obj.email.trim();

    // Common content object shapes
    const candidates = [obj.text, obj.plain_text, obj.plain, obj.body, obj.value, obj.content];
    for (const candidate of candidates) {
      const extracted = extractString(candidate);
      if (extracted) return extracted;
    }
  }

  return '';
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const extracted = extractString(value);
    if (extracted) return extracted;
  }
  return '';
}

function htmlToText(html: string): string {
  if (!html) return '';

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const emailData = (payload?.data || payload || {}) as Record<string, unknown>;

    // Support multiple provider payload shapes
    const from = firstNonEmpty(
      emailData.from,
      emailData.sender,
      emailData.from_email,
      (emailData.envelope as Record<string, unknown> | undefined)?.from,
    );

    const toRaw =
      emailData.to ||
      (emailData.envelope as Record<string, unknown> | undefined)?.to ||
      emailData.rcpt_to ||
      emailData.recipient;

    const toAddress = firstNonEmpty(Array.isArray(toRaw) ? toRaw[0] : toRaw);
    const subject = firstNonEmpty(emailData.subject, '(No subject)');

    const text = firstNonEmpty(
      emailData.text,
      emailData.plain_text,
      emailData.text_body,
      emailData.body_text,
      emailData.body,
      (emailData.content as Record<string, unknown> | undefined)?.text,
      (emailData.content as Record<string, unknown> | undefined)?.plain,
      (emailData.email as Record<string, unknown> | undefined)?.text,
    );

    const html = firstNonEmpty(
      emailData.html,
      emailData.html_body,
      emailData.stripped_html,
      (emailData.content as Record<string, unknown> | undefined)?.html,
      (emailData.email as Record<string, unknown> | undefined)?.html,
    );

    const bodyText = firstNonEmpty(text, htmlToText(html));

    if (!toAddress && !from) {
      console.log('Inbound payload missing to/from. Keys:', JSON.stringify(Object.keys(emailData)));
      throw new Error('Missing required fields in webhook payload');
    }

    // Extract claim reference from the to address: claim-0001@replies.savo.co.nz
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

    const fromEmail = from || 'unknown@unknown';

    // Store the inbound message
    await supabase.from('claim_messages').insert({
      claim_id: claim.id,
      user_id: claim.user_id,
      direction: 'inbound',
      subject: subject || '(No subject)',
      body: bodyText || '(No body content was included in the email payload)',
      from_email: fromEmail,
      to_email: toAddress,
    });

    // Create an in-app notification
    await supabase.from('notifications').insert({
      user_id: claim.user_id,
      type: 'insurer_reply',
      title: 'Reply from Insurance Company',
      message: `You received a reply regarding claim CLM-${String(claimNumber).padStart(4, '0')} from ${fromEmail}. Subject: ${subject || '(No subject)'}`,
    });

    return new Response(JSON.stringify({ success: true, claimId: claim.id, claimNumber, stored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Inbound email webhook error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200, // Return 200 to prevent provider retries on malformed payloads
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
