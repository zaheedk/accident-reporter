import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_FROM = 'SAVO Support <info@savo.co.nz>';

async function sendAutoReply(toEmail: string, originalSubject: string, reason: 'no_claim_ref' | 'sender_mismatch') {
  if (!RESEND_API_KEY || !toEmail || toEmail === 'unknown@unknown') return;

  const subject = `Re: ${originalSubject || 'Your forwarded email'} — action needed`;

  const intro = reason === 'sender_mismatch'
    ? `We received your forwarded email, but it was sent from an address that doesn't match the email registered on your SAVO account. Please forward it again from your registered email address.`
    : `We received your forwarded email, but we couldn't tell which incident it relates to. Please forward it again and include your claim reference (e.g. <strong>CLM-0001</strong>) anywhere in the subject line.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e3a5f;">
      <div style="padding: 24px;">
        <h2 style="margin: 0 0 12px; font-size: 18px;">We couldn't file your email</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #333;">${intro}</p>
        <p style="font-size: 14px; line-height: 1.5; color: #333; margin-top: 16px;">
          You can find your claim reference (CLM-XXXX) in the SAVO app under your incident report.
        </p>
        <p style="font-size: 14px; line-height: 1.5; color: #333;">
          Once forwarded correctly, the email will appear in the <strong>Messages</strong> tab of that incident automatically.
        </p>
      </div>
      <div style="border-top: 1px solid #e5e5e5; padding: 15px 24px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated reply from <strong>SAVO</strong> — Vehicle Claims Assistant.
        </p>
      </div>
    </div>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SUPPORT_FROM,
        to: [toEmail],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error('Auto-reply send failed:', err);
  }
}

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
    if (typeof obj.address === 'string' && obj.address.trim()) return obj.address.trim();
    if (typeof obj.email === 'string' && obj.email.trim()) return obj.email.trim();
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

/**
 * Extract a CLM-XXXX claim number from:
 * 1. The "to" address (e.g. claim-0001@replies.savo.co.nz)
 * 2. The subject line (e.g. "Re: CLM-0042 – my damage claim")
 */
function extractClaimNumber(toAddress: string, subject: string): number | null {
  // Method 1: from the to-address (existing behaviour)
  const toMatch = toAddress.match(/claim-(\d+)@/i);
  if (toMatch) return parseInt(toMatch[1], 10);

  // Method 2: from the subject line (new – for info@savo.co.nz emails)
  const subjectMatch = subject.match(/CLM[- ]?(\d+)/i);
  if (subjectMatch) return parseInt(subjectMatch[1], 10);

  return null;
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

    // --- Extract claim number from to-address OR subject line ---
    const claimNumber = extractClaimNumber(toAddress, subject);

    let claim: { id: string; user_id: string; insurance_company: string } | null = null;

    if (claimNumber !== null) {
      // Try matching by internal CLM sequence number
      const { data } = await supabase
        .from('claims')
        .select('id, user_id, insurance_company')
        .eq('claim_number', claimNumber)
        .single();
      claim = data;
    }

    // If no match by CLM number, try matching the subject against user_claim_number
    if (!claim) {
      // Search for any claim whose user_claim_number appears in the subject
      const { data: allClaims } = await supabase
        .from('claims')
        .select('id, user_id, insurance_company, user_claim_number')
        .neq('user_claim_number', '');

      if (allClaims) {
        const subjectLower = subject.toLowerCase();
        claim = allClaims.find(c => c.user_claim_number && subjectLower.includes(c.user_claim_number.toLowerCase())) || null;
      }
    }

    if (!claim) {
      console.log('No claim found for inbound email. Subject:', subject, 'To:', toAddress);
      // Auto-reply to the sender so they know to include CLM-XXXX
      await sendAutoReply(from, subject, 'no_claim_ref');
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Claim not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromEmail = (from || 'unknown@unknown').toLowerCase();

    // --- Determine if sender matches the claim owner ---
    // Check if the sender's email matches a user profile in the database
    const isReplyRoute = toAddress.match(/claim-\d+@/i); // existing reply-to routing
    let senderVerified = !!isReplyRoute; // reply-route emails are always trusted

    if (!senderVerified) {
      // For info@ emails, verify the sender matches the claim owner's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', claim.user_id)
        .eq('email', fromEmail)
        .maybeSingle();

      if (profile) {
        senderVerified = true;
      } else {
        // Also check auth.users email via profiles (email might not be in profiles)
        // Try matching via the auth user's email stored at signup
        const { data: authCheck } = await supabase.auth.admin.getUserById(claim.user_id);
        if (authCheck?.user?.email?.toLowerCase() === fromEmail) {
          senderVerified = true;
        }
      }
    }

    if (!senderVerified) {
      console.log('Sender email does not match claim owner:', fromEmail, 'claim_number:', claimNumber);

      // Notify all admins about the unmatched email
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          type: 'unmatched_email',
          title: 'Unmatched inbound email',
          message: `An email from ${fromEmail} referenced CLM-${String(claimNumber).padStart(4, '0')} but the sender doesn't match any registered user. Subject: ${subject}`,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Sender not verified' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Store the inbound message ---
    await supabase.from('claim_messages').insert({
      claim_id: claim.id,
      user_id: claim.user_id,
      direction: 'inbound',
      subject: subject || '(No subject)',
      body: bodyText || '(No body content was included in the email payload)',
      from_email: fromEmail,
      to_email: toAddress,
    });

    // Create an in-app notification for the claim owner
    await supabase.from('notifications').insert({
      user_id: claim.user_id,
      type: 'insurer_reply',
      title: 'New email filed to your incident',
      message: `An email has been filed against CLM-${String(claimNumber).padStart(4, '0')}. Subject: ${subject}`,
    });

    return new Response(JSON.stringify({ success: true, claimId: claim.id, claimNumber, stored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Inbound email webhook error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
