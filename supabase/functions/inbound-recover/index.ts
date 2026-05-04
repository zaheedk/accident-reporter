// One-off recovery: list recent received emails and re-trigger the
// inbound-document-webhook for each so attachments get processed
// using the receiving-capable API key.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey =
    Deno.env.get("RESEND_RECEIVING_API_KEY") || Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "missing_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const listRes = await fetch("https://api.resend.com/emails/receiving", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!listRes.ok) {
    return new Response(
      JSON.stringify({ error: "list_failed", status: listRes.status, body: await listRes.text() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const list = await listRes.json();
  const emails = Array.isArray(list?.data) ? list.data : [];

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const results: unknown[] = [];
  for (const e of emails.slice(0, 10)) {
    const detailRes = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(e.id)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const detail = detailRes.ok ? await detailRes.json() : {};
    const from = detail.from || e.from;
    const to = detail.to || e.to;
    const subject = detail.subject || e.subject;
    const attachments = Array.isArray(detail.attachments) ? detail.attachments : [];

    const forwardRes = await fetch(
      `${supabaseUrl}/functions/v1/inbound-document-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          data: {
            email_id: e.id,
            from,
            to,
            subject,
            attachments,
          },
        }),
      },
    );
    results.push({
      id: e.id,
      from,
      subject,
      attachmentCount: attachments.length,
      status: forwardRes.status,
      body: await forwardRes.text(),
    });
  }

  return new Response(JSON.stringify({ count: emails.length, results }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
