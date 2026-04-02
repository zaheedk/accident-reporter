import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'Savo <noreply@savo.co.nz>';

function getBrandedHtml(title: string, bodyContent: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#e8551e,#d44a18);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Savo</h1>
    </div>
    <div style="background:#ffffff;padding:30px 30px 40px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:20px;">${title}</h2>
      ${bodyContent}
    </div>
    <div style="text-align:center;padding:20px 0;">
      <p style="color:#999;font-size:11px;margin:0;">© ${new Date().getFullYear()} Savo · Vehicle Claims Assistant</p>
      <p style="color:#bbb;font-size:11px;margin:4px 0 0;">Auckland, New Zealand</p>
    </div>
  </div>
</body>
</html>`;
}

function getEmailContent(emailType: string, confirmationUrl: string, otpToken?: string) {
  switch (emailType) {
    case 'signup':
    case 'email':
      return {
        subject: 'Confirm your Savo account',
        html: getBrandedHtml('Confirm your email', `
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">Welcome to Savo! Please verify your email address to get started.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8551e,#d44a18);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Verify Email Address</a>
          </div>
          <p style="color:#999;font-size:13px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color:#e8551e;font-size:12px;word-break:break-all;">${confirmationUrl}</p>
          <p style="color:#999;font-size:12px;margin-top:20px;">If you didn't create a Savo account, you can safely ignore this email.</p>
        `),
      };

    case 'recovery':
      return {
        subject: 'Reset your Savo password',
        html: getBrandedHtml('Reset your password', `
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">We received a request to reset your password. Click the button below to choose a new one.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8551e,#d44a18);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Reset Password</a>
          </div>
          <p style="color:#999;font-size:13px;line-height:1.5;">If the button doesn't work, copy and paste this link:</p>
          <p style="color:#e8551e;font-size:12px;word-break:break-all;">${confirmationUrl}</p>
          <p style="color:#999;font-size:12px;margin-top:20px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        `),
      };

    case 'magiclink':
      return {
        subject: 'Your Savo login link',
        html: getBrandedHtml('Sign in to Savo', `
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">Click the button below to sign in to your Savo account. This link expires in 10 minutes.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8551e,#d44a18);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Sign In</a>
          </div>
          <p style="color:#999;font-size:13px;">If you didn't request this, please ignore this email.</p>
        `),
      };

    case 'invite':
      return {
        subject: "You've been invited to Savo",
        html: getBrandedHtml("You're invited!", `
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">You've been invited to join Savo — your vehicle claims assistant. Click below to accept the invitation and set up your account.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8551e,#d44a18);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Accept Invitation</a>
          </div>
        `),
      };

    case 'email_change':
      return {
        subject: 'Confirm your new email – Savo',
        html: getBrandedHtml('Confirm email change', `
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">You requested to change your email address. Please confirm by clicking the button below.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8551e,#d44a18);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Confirm New Email</a>
          </div>
          <p style="color:#999;font-size:12px;margin-top:20px;">If you didn't request this change, please contact support immediately.</p>
        `),
      };

    case 'reauthentication':
      return {
        subject: 'Your Savo verification code',
        html: getBrandedHtml('Verification code', `
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">Use the code below to verify your identity:</p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;background:#f5f5f5;border:2px solid #e5e5e5;border-radius:12px;padding:16px 32px;">
              <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1a1a1a;">${otpToken || ''}</span>
            </div>
          </div>
          <p style="color:#999;font-size:13px;">This code expires in 10 minutes.</p>
        `),
      };

    default:
      return {
        subject: 'Savo notification',
        html: getBrandedHtml('Notification', `
          <p style="color:#555;line-height:1.6;">You have a new notification from Savo.</p>
          ${confirmationUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8551e,#d44a18);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Take Action</a></div>` : ''}
        `),
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const payload = await req.json();
    
    // Supabase auth hook payload structure
    const { user, email_data } = payload;
    
    if (!user?.email || !email_data?.token_hash) {
      throw new Error('Invalid auth hook payload');
    }

    const recipientEmail = email_data.redirect_to
      ? user.email
      : user.email;
    
    const emailType = email_data.email_action_type || 'signup';
    
    // Build confirmation URL
    const siteUrl = email_data.site_url || 'https://savonz.lovable.app';
    const redirectTo = email_data.redirect_to || siteUrl;
    const tokenHash = email_data.token_hash;
    const type = email_data.email_action_type === 'signup' ? 'signup' : 
                 email_data.email_action_type === 'recovery' ? 'recovery' :
                 email_data.email_action_type === 'magiclink' ? 'magiclink' :
                 email_data.email_action_type === 'invite' ? 'invite' :
                 email_data.email_action_type === 'email_change' ? 'email_change' :
                 'signup';
    
    const confirmationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`;
    
    const otpToken = email_data.token;
    const { subject, html } = getEmailContent(emailType, confirmationUrl, otpToken);

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('Resend error:', JSON.stringify(result));
      throw new Error(`Resend error: ${JSON.stringify(result)}`);
    }

    console.log(`Auth email sent: type=${emailType}, to=${user.email}, id=${result.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auth email hook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
