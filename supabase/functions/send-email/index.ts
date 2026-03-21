import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'Savo <noreply@savo.co.nz>';

interface EmailRequest {
  type: 'contact_confirmation' | 'claim_submitted' | 'welcome';
  to: string;
  data?: Record<string, string>;
}

function getEmailContent(type: string, data: Record<string, string> = {}) {
  switch (type) {
    case 'contact_confirmation':
      return {
        subject: 'Thanks for contacting Savo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Thanks for reaching out${data.name ? `, ${data.name}` : ''}!</h2>
              <p style="color: #555; line-height: 1.6;">We've received your message and will get back to you as soon as possible.</p>
              ${data.message ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="color: #666; margin: 0; font-style: italic;">"${data.message}"</p></div>` : ''}
              <p style="color: #555; line-height: 1.6;">In the meantime, if you need urgent help, call us at <strong>0800 CLAIMS (252 467)</strong>.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    case 'claim_submitted':
      return {
        subject: `Your claim has been submitted – ${data.date || 'Savo'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Claim Submitted Successfully</h2>
              <p style="color: #555; line-height: 1.6;">Your incident report has been submitted. Here's a summary:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${data.date ? `<tr><td style="padding: 8px 0; color: #999; width: 120px;">Date</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.date}</td></tr>` : ''}
                ${data.location ? `<tr><td style="padding: 8px 0; color: #999;">Location</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.location}</td></tr>` : ''}
                ${data.vehicle ? `<tr><td style="padding: 8px 0; color: #999;">Vehicle</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.vehicle}</td></tr>` : ''}
                ${data.insurer ? `<tr><td style="padding: 8px 0; color: #999;">Insurer</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.insurer}</td></tr>` : ''}
              </table>
              <p style="color: #555; line-height: 1.6;">You can view your full report anytime in the Savo app. If you selected a panel shop, a repair request has been sent on your behalf.</p>
              <p style="color: #555; line-height: 1.6;">Need to contact your insurer? Call them directly from the app.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    case 'welcome':
      return {
        subject: 'Welcome to Savo – Your claims assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">You're all set! 🎉</h2>
              <p style="color: #555; line-height: 1.6;">Savo makes vehicle insurance claims simple, fast, and stress-free. Here's what you can do:</p>
              <ul style="color: #555; line-height: 2;">
                <li><strong>Add your vehicles</strong> – Keep your fleet details ready</li>
                <li><strong>Report incidents</strong> – Our step-by-step wizard guides you</li>
                <li><strong>Find panel shops</strong> – Connect with trusted repairers</li>
                <li><strong>Track claims</strong> – Everything in one place</li>
              </ul>
              <p style="color: #555; line-height: 1.6;">If you ever need help, we're just a message away.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { type, to, data } = (await req.json()) as EmailRequest;

    if (!type || !to) {
      throw new Error('Missing required fields: type, to');
    }

    const { subject, html } = getEmailContent(type, data);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', result);
      throw new Error(`Resend error: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
