import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_FROM = 'SAVO Support <info@savo.co.nz>';

async function sendAutoReply(_toEmail: string, _originalSubject: string, _reason: 'no_claim_ref' | 'sender_mismatch') {
  // Auto-replies disabled to prevent reply loops with mail systems that
  // re-deliver our notification back into the inbound webhook.
  return;
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

function extractEmailAddress(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim();
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

    const fromCheck = firstNonEmpty(
      emailData.from,
      emailData.sender,
      emailData.from_email,
      (emailData.envelope as Record<string, unknown> | undefined)?.from,
    ).toLowerCase();
    if (fromCheck.includes('info@savo.co.nz')) {
      // Ignore emails from our own support address to avoid loops.
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'self-loop' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Route rental-partner emails to the dedicated webhook
    if (toAddress.toLowerCase().includes('@hires.savo.co.nz')) {
      try {
        const rentalUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/inbound-rental-agreement`;
        const forwardRes = await fetch(rentalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify(payload),
        });
        const forwardBody = await forwardRes.text();
        return new Response(JSON.stringify({ success: true, forwarded_to: 'inbound-rental-agreement', downstream_status: forwardRes.status, downstream_body: forwardBody }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fwdErr) {
        console.error('Forward to rental webhook failed:', fwdErr);
        return new Response(JSON.stringify({ success: false, error: 'forward_failed' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

    const fromEmailEarly = extractEmailAddress(from).toLowerCase();

    // Guard: ignore self-loops where our own outbound system addresses are
    // re-delivered into this webhook. These create false "Unmatched inbound
    // email" notifications when our claim emails bounce back through the
    // inbound mailbox.
    const SELF_ADDRESSES = new Set([
      'claims@savo.co.nz',
      'info@savo.co.nz',
      'noreply@savo.co.nz',
      'no-reply@savo.co.nz',
      'support@savo.co.nz',
    ]);
    if (
      SELF_ADDRESSES.has(fromEmailEarly) ||
      fromEmailEarly.endsWith('@notify.savo.co.nz') ||
      fromEmailEarly.endsWith('@replies.savo.co.nz')
    ) {
      console.log('Ignoring self-loop inbound email from:', fromEmailEarly);
      return new Response(JSON.stringify({ ok: true, ignored: 'self_loop' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subjectNorm = subject.toLowerCase();
    const subjectCompact = subjectNorm.replace(/[\s\-_/]+/g, '');

    // --- Extract claim number from to-address OR subject line ---
    const claimNumber = extractClaimNumber(toAddress, subject);

    let claim: { id: string; user_id: string; insurance_company: string } | null = null;

    if (claimNumber !== null) {
      // Try matching by internal CLM sequence number
      const { data } = await supabase
        .from('claims')
        .select('id, user_id, insurance_company')
        .eq('claim_number', claimNumber)
        .maybeSingle();
      claim = data;
    }

    // Try matching by report_number (8-char public id) appearing in subject
    if (!claim) {
      const tokens = (subject.toUpperCase().match(/\b[A-Z0-9]{8}\b/g) || []);
      for (const t of tokens) {
        const { data } = await supabase
          .from('claims')
          .select('id, user_id, insurance_company')
          .eq('report_number', t)
          .maybeSingle();
        if (data) { claim = data; break; }
      }
    }

    // Try matching the subject against user_claim_number
    // Prefer claims belonging to the sender; fall back to any claim.
    if (!claim) {
      // Resolve sender -> user_id (profile email or auth email)
      let senderUserId: string | null = null;
      if (fromEmailEarly) {
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', fromEmailEarly)
          .maybeSingle();
        if (profileMatch?.user_id) senderUserId = profileMatch.user_id;
      }

      const matchUcn = (rows: Array<{ user_claim_number: string | null }> | null, row: any) => {
        const ucn = (row.user_claim_number || '').trim();
        if (!ucn) return false;
        const ucnLower = ucn.toLowerCase();
        const ucnCompact = ucnLower.replace(/[\s\-_/]+/g, '');
        return subjectNorm.includes(ucnLower) ||
               (ucnCompact.length >= 4 && subjectCompact.includes(ucnCompact));
      };

      if (senderUserId) {
        const { data: ownClaims } = await supabase
          .from('claims')
          .select('id, user_id, insurance_company, user_claim_number')
          .eq('user_id', senderUserId)
          .neq('user_claim_number', '');
        const hit = (ownClaims || []).find((c) => matchUcn(ownClaims as any, c));
        if (hit) claim = { id: hit.id, user_id: hit.user_id, insurance_company: hit.insurance_company };
      }

      if (!claim) {
        const { data: allClaims } = await supabase
          .from('claims')
          .select('id, user_id, insurance_company, user_claim_number')
          .neq('user_claim_number', '');
        const hit = (allClaims || []).find((c) => matchUcn(allClaims as any, c));
        if (hit) claim = { id: hit.id, user_id: hit.user_id, insurance_company: hit.insurance_company };
      }
    }

    if (!claim) {
      console.log('No claim matched. Forwarding to inbound-document-webhook. Subject:', subject, 'To:', toAddress);
      // Fallback: hand the raw payload to the document webhook so any
      // attachments get filed against the sender's vehicle/profile.
      try {
        const docUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/inbound-document-webhook`;
        const forwardRes = await fetch(docUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify(payload),
        });
        const forwardBody = await forwardRes.text();
        return new Response(JSON.stringify({
          success: true,
          forwarded_to: 'inbound-document-webhook',
          downstream_status: forwardRes.status,
          downstream_body: forwardBody,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (fwdErr) {
        console.error('Forward to document webhook failed:', fwdErr);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Claim not found and forward failed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
          message: `An email from ${fromEmail} matched a claim but the sender doesn't match the claim owner. Subject: ${subject}`,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // Auto-reply to the sender so they know to forward from their registered email
      await sendAutoReply(from, subject, 'sender_mismatch');

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
      message: `An email has been filed against your incident. Subject: ${subject}`,
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
