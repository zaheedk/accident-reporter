// Inbound rental agreement webhook
//
// Rental partner emails a signed rental agreement PDF from their desk system
// to their unique inbound alias (e.g. jamesblond+abc123@hires.savo.co.nz).
// This function:
//   1. Identifies the partner by the recipient alias
//   2. Extracts structured fields (customer name/email/phone, rego, hire dates)
//      from the PDF attachment using Lovable AI
//   3. Finds or creates a SAVO user account for the customer
//   4. Attaches a rental vehicle (copied from partner_fleet_vehicles or
//      created from the PDF data if the rego is not in the fleet)
//   5. Saves the signed PDF to the customer's user_documents under the
//      'rental_agreement' category
//   6. Notifies the customer by email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verifySvixSignature } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === 'string' && x.trim()) return x.trim();
        if (x && typeof x === 'object') {
          const obj = x as Record<string, unknown>;
          if (typeof obj.address === 'string' && obj.address.trim()) return obj.address.trim();
          if (typeof obj.email === 'string' && obj.email.trim()) return obj.email.trim();
        }
      }
    }
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      if (typeof obj.address === 'string' && obj.address.trim()) return obj.address.trim();
      if (typeof obj.email === 'string' && obj.email.trim()) return obj.email.trim();
    }
  }
  return '';
}

function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

interface ExtractedFields {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  rego_number: string;
  hire_start_date: string;
  hire_end_date: string;
}

async function extractFromPdf(pdfBase64: string, partnerName: string): Promise<ExtractedFields | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You extract structured rental-agreement data from PDFs supplied by ${partnerName}. Return ISO dates (YYYY-MM-DD) when possible. Use empty strings for any field you cannot determine confidently.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the renting customer details, vehicle rego, and hire period from this signed rental agreement.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
            },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'record_rental_agreement',
            description: 'Record the parsed rental agreement fields.',
            parameters: {
              type: 'object',
              properties: {
                customer_name: { type: 'string' },
                customer_email: { type: 'string' },
                customer_phone: { type: 'string' },
                rego_number: { type: 'string', description: 'NZ vehicle registration plate' },
                hire_start_date: { type: 'string', description: 'YYYY-MM-DD' },
                hire_end_date: { type: 'string', description: 'YYYY-MM-DD' },
              },
              required: ['customer_name', 'customer_email', 'rego_number'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'record_rental_agreement' } },
    }),
  });

  if (!resp.ok) {
    console.error('Lovable AI error', resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  try {
    const parsed = JSON.parse(args);
    return {
      customer_name: parsed.customer_name || '',
      customer_email: (parsed.customer_email || '').toLowerCase().trim(),
      customer_phone: parsed.customer_phone || '',
      rego_number: (parsed.rego_number || '').toUpperCase().replace(/\s+/g, ''),
      hire_start_date: parsed.hire_start_date || '',
      hire_end_date: parsed.hire_end_date || '',
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  // Svix-signed webhook from Resend, or service-role internal forwarding.
  const rawBody = await req.text();
  const authHeader = req.headers.get('Authorization') || '';
  const serviceKey0 = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const isInternal = !!serviceKey0 && authHeader === `Bearer ${serviceKey0}`;
  if (!isInternal) {
    const sigOk = await verifySvixSignature(req, rawBody);
    if (!sigOk) {
      console.warn('Rejecting inbound-rental-agreement: invalid Svix signature');
      return json({ error: 'Forbidden' }, 403);
    }
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload = (() => { try { return JSON.parse(rawBody || '{}'); } catch { return {}; } })();
    const emailData: any = payload?.data || payload?.email || payload;


    const toRaw = emailData.to || emailData.envelope?.to || emailData.rcpt_to || emailData.recipient;
    const toAddress = firstNonEmpty(Array.isArray(toRaw) ? toRaw[0] : toRaw).toLowerCase();
    const fromRaw = emailData.from || emailData.envelope?.from || emailData.sender;
    const fromAddress = extractEmail(firstNonEmpty(Array.isArray(fromRaw) ? fromRaw[0] : fromRaw));
    const subject = firstNonEmpty(emailData.subject, 'Rental agreement');

    if (!toAddress) return json({ ok: true, skipped: 'no recipient' });

    // --- Identify partner by inbound alias ---
    const aliasMatch = toAddress.match(/[a-z0-9]+\+[a-z0-9]+@hires\.savo\.co\.nz/);
    const alias = aliasMatch ? aliasMatch[0] : toAddress;

    const { data: partner } = await supabase
      .from('rental_partners')
      .select('id, owner_user_id, company_name, contact_email')
      .eq('inbound_alias', alias)
      .maybeSingle();

    if (!partner) {
      console.log('No partner for alias', alias);
      return json({ ok: true, skipped: 'no partner', alias });
    }

    // --- Find PDF attachment ---
    const attachments: any[] = emailData.attachments || emailData.files || [];
    const pdfAtt = attachments.find((a) => {
      const name = (a.filename || a.name || '').toLowerCase();
      const mime = (a.content_type || a.contentType || a.type || '').toLowerCase();
      return mime.includes('pdf') || name.endsWith('.pdf');
    });
    if (!pdfAtt) {
      console.log('No PDF attachment in rental email from', fromAddress);
      return json({ ok: true, skipped: 'no PDF attachment' });
    }

    const pdfB64: string = pdfAtt.content || pdfAtt.data || pdfAtt.base64 || '';
    if (!pdfB64) return json({ ok: true, skipped: 'empty attachment' });

    // --- Extract fields with AI ---
    const extracted = await extractFromPdf(pdfB64, partner.company_name);
    if (!extracted || !extracted.customer_email || !extracted.rego_number) {
      console.error('AI extraction failed or missing required fields', extracted);
      return json({ ok: false, error: 'extraction_failed' }, 200);
    }

    // --- Find or create customer SAVO user ---
    let customerUserId: string | null = null;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', extracted.customer_email)
      .maybeSingle();
    if (existingProfile?.user_id) {
      customerUserId = existingProfile.user_id;
    } else {
      // Fall back to auth lookup
      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = listed?.users?.find((u: any) => (u.email || '').toLowerCase() === extracted.customer_email);
      if (found) {
        customerUserId = found.id;
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: extracted.customer_email,
          email_confirm: true,
          user_metadata: {
            full_name: extracted.customer_name,
            source: `rental_partner:${partner.company_name}`,
          },
        });
        if (createErr || !created.user) {
          console.error('Create user failed', createErr);
          return json({ ok: false, error: 'create_user_failed' }, 200);
        }
        customerUserId = created.user.id;
        // Ensure profile row exists with phone
        await supabase.from('profiles').upsert({
          user_id: customerUserId,
          email: extracted.customer_email,
          display_name: extracted.customer_name,
          phone_number: extracted.customer_phone,
          email_verified: false,
          source: `rental_partner:${partner.company_name}`,
        }, { onConflict: 'user_id' });
      }
    }

    if (!customerUserId) return json({ ok: false, error: 'no_customer_id' }, 200);

    // --- Look up fleet vehicle by rego ---
    const { data: fleetVehicle } = await supabase
      .from('partner_fleet_vehicles')
      .select('*')
      .eq('partner_id', partner.id)
      .eq('rego_number', extracted.rego_number)
      .maybeSingle();

    // --- Insert vehicle row on customer account ---
    const vehicleRow = {
      user_id: customerUserId,
      rental_partner_id: partner.id,
      is_rental: true,
      hire_start_date: extracted.hire_start_date,
      hire_end_date: extracted.hire_end_date,
      rego_number: extracted.rego_number,
      year: fleetVehicle?.year || '',
      make: fleetVehicle?.make || '',
      model: fleetVehicle?.model || '',
      color: fleetVehicle?.color || '',
      wof_expiry: '',
      rego_expiry: '',
      finance_arrangement: false,
      modified: false,
      insurance_company: '',
      insurance_policy_number: '',
      insurance_expiry: '',
      photo_url: '',
      is_active: true,
    };

    const { data: vehicleInserted, error: vInsErr } = await supabase
      .from('vehicles')
      .insert(vehicleRow)
      .select('id')
      .single();

    if (vInsErr || !vehicleInserted) {
      console.error('Vehicle insert failed', vInsErr);
      return json({ ok: false, error: vInsErr?.message }, 200);
    }

    // --- Upload PDF to user-documents bucket ---
    const safeName = `rental_agreement_${extracted.rego_number}_${Date.now()}.pdf`;
    const filePath = `${customerUserId}/rental_agreements/${safeName}`;
    const pdfBytes = b64decode(pdfB64);

    const { error: upErr } = await supabase.storage
      .from('user-documents')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: false });
    if (upErr) {
      console.error('Storage upload failed', upErr);
    }

    await supabase.from('user_documents').insert({
      user_id: customerUserId,
      vehicle_id: vehicleInserted.id,
      file_path: filePath,
      file_name: pdfAtt.filename || safeName,
      file_size: pdfBytes.byteLength,
      category: 'rental_agreement',
      notes: `Signed rental agreement from ${partner.company_name}`,
    });

    // --- Notify the customer ---
    await supabase.from('notifications').insert({
      user_id: customerUserId,
      type: 'rental_attached',
      title: `${partner.company_name} added your hire vehicle`,
      message: `Your rental vehicle ${extracted.rego_number} has been added to SAVO. The signed rental agreement is in your Documents.`,
    });

    // Send a welcome email (best-effort)
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SAVO <info@savo.co.nz>',
            to: [extracted.customer_email],
            subject: `Your ${partner.company_name} hire vehicle is on SAVO`,
            html: `<p>Hi ${extracted.customer_name || 'there'},</p>
                   <p><strong>${partner.company_name}</strong> has added the hire vehicle <strong>${extracted.rego_number}</strong> to your SAVO account, along with your signed rental agreement.</p>
                   <p>You can view your vehicle and documents at <a href="https://www.savo.co.nz">savo.co.nz</a>.</p>
                   <p>If you don't yet have a SAVO account, sign in using <strong>${extracted.customer_email}</strong> via "Forgot password" to set one up.</p>
                   <p>— The SAVO team</p>`,
          }),
        });
      }
    } catch (e) {
      console.warn('Customer notification email failed', e);
    }

    return json({ ok: true, vehicle_id: vehicleInserted.id, customer_user_id: customerUserId });
  } catch (e) {
    console.error('inbound-rental-agreement error', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 200);
  }
});
