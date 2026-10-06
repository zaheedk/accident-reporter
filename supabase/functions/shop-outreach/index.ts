// Admin-only panel-beater link outreach. One email per shop, ever.
// Actions: "list" (preview top 20), "send" (admin, sends to selected ids), "optout" (public, by token).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SITE = "https://www.savo.co.nz";
const FROM = "SAVO <hello@savo.co.nz>";
const REPLY_TO = "zaheedk@gmail.com";
const LIMIT = 20;

const slug = (s: string) =>
  (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function buildEmail(shop: { name: string; city: string }, token: string) {
  const page = `${SITE}/panel-beaters/${slug(shop.city)}/${slug(shop.name)}`;
  const badge = `<a href="${page}"><img src="${SITE}/featured-on-savo.svg" alt="Featured on SAVO" width="180" height="56"></a>`;
  const subject = `${shop.name} is featured on SAVO`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.6;max-width:560px">
<p>Kia ora ${esc(shop.name)} team,</p>
<p>Your workshop is featured on SAVO's ${esc(shop.city)} panel beaters page because of your strong Google rating. SAVO is a free NZ resource that helps drivers understand their insurance rights after an accident, including their right to choose their own repairer.</p>
<p>Your listing: <a href="${page}">${page}</a></p>
<p>If you'd like to show customers you're featured, you're welcome to add our badge to your website. Paste this code onto any page:</p>
<pre style="background:#f3f4f6;padding:10px;border-radius:6px;font-size:12px;white-space:pre-wrap">${esc(badge)}</pre>
<p><a href="${page}"><img src="${SITE}/featured-on-savo.svg" alt="Featured on SAVO" width="180" height="56"></a></p>
<p>If any details on your listing are wrong (hours, services, phone), just reply and we'll fix them.</p>
<p>Ngā mihi,<br>The SAVO team<br><a href="${SITE}">savo.co.nz</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
<p style="font-size:11px;color:#6b7280">You're receiving this one-off email because your business email is publicly listed. Sent by SAVO, New Zealand. <a href="${SITE}/outreach/unsubscribe?token=${token}">Don't contact me again</a>.</p>
</div>`;
  return { subject, html, page };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "optout") {
      const token = String(body.token || "");
      if (!/^[a-f0-9]{36}$/.test(token)) return json({ error: "Invalid link" }, 400);
      const { data } = await admin.from("shop_outreach").update({ opted_out_at: new Date().toISOString() })
        .eq("opt_out_token", token).select("id").maybeSingle();
      return json({ ok: !!data });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { data: shops } = await admin.from("panel_shops").select("id,name,city,email,google_rating")
      .neq("email", "").order("google_rating", { ascending: false }).limit(200);
    const { data: done } = await admin.from("shop_outreach").select("panel_shop_id,status,sent_at,opted_out_at,email");
    const doneMap = new Map((done ?? []).map((d) => [d.panel_shop_id, d]));
    const valid = (shops ?? []).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim()));
    const pending = valid.filter((s) => !doneMap.has(s.id)).slice(0, LIMIT);
    const sent = valid.filter((s) => doneMap.has(s.id)).map((s) => ({ ...s, outreach: doneMap.get(s.id) }));

    if (action === "list") {
      const sample = pending[0] ? buildEmail(pending[0], "preview") : null;
      return json({ pending, sent, sample, from: FROM, replyTo: REPLY_TO });
    }

    if (action === "send") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, LIMIT) : [];
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) return json({ error: "Email service not configured" }, 500);
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const s of pending.filter((p) => ids.includes(p.id))) {
        const { data: row, error: insErr } = await admin.from("shop_outreach")
          .insert({ panel_shop_id: s.id, email: s.email.trim(), sent_by: u.user.id, status: "sending" })
          .select("opt_out_token").single();
        if (insErr) { results.push({ id: s.id, ok: false, error: insErr.message }); continue; }
        const { subject, html } = buildEmail(s, row.opt_out_token);
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM, to: [s.email.trim()], reply_to: REPLY_TO, subject, html,
            headers: { "List-Unsubscribe": `<${SITE}/outreach/unsubscribe?token=${row.opt_out_token}>` },
          }),
        });
        const txt = r.ok ? "" : await r.text();
        await admin.from("shop_outreach").update({ status: r.ok ? "sent" : "failed", error: txt.slice(0, 500) })
          .eq("panel_shop_id", s.id);
        results.push({ id: s.id, ok: r.ok, error: txt || undefined });
        await new Promise((res) => setTimeout(res, 600));
      }
      return json({ results });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
