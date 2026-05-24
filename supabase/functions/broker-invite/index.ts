import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const ApplySchema = z.object({
  action: z.literal("apply"),
  company_name: z.string().trim().min(1).max(120),
  license_number: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  contact_email: z.string().trim().email().max(255),
});
const InviteSchema = z.object({
  action: z.literal("invite"),
  client_email: z.string().trim().email().max(255),
  client_name: z.string().trim().max(120).optional().default(""),
  client_phone: z.string().trim().max(40).optional().default(""),
});
const AcceptSchema = z.object({
  action: z.literal("accept"),
  code: z.string().trim().min(4).max(32),
});
const RevokeClientSchema = z.object({
  action: z.literal("revoke_client"),
  client_id: z.string().uuid(),
});
const Schema = z.discriminatedUnion("action", [ApplySchema, InviteSchema, AcceptSchema, RevokeClientSchema]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    // --- Self-signup application
    if (parsed.data.action === "apply") {
      // Already a broker?
      const { data: existing } = await admin.from("brokerages").select("id").eq("owner_user_id", user.id).maybeSingle();
      if (existing) return json({ error: "You are already an approved broker." }, 400);

      const { data: pending } = await admin
        .from("broker_applications")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (pending) return json({ error: "You already have a pending application." }, 400);

      const { data: app, error } = await admin.from("broker_applications").insert({
        user_id: user.id,
        company_name: parsed.data.company_name,
        license_number: parsed.data.license_number,
        phone: parsed.data.phone,
        contact_email: parsed.data.contact_email.toLowerCase(),
      }).select("*").single();
      if (error) return json({ error: error.message }, 500);
      return json({ application: app });
    }

    // --- Broker invites a client
    if (parsed.data.action === "invite") {
      const { data: brokerage } = await admin.from("brokerages")
        .select("id, company_name, contact_email").eq("owner_user_id", user.id).maybeSingle();
      if (!brokerage) return json({ error: "You are not an approved broker." }, 403);

      const email = parsed.data.client_email.toLowerCase();

      // Create client row (invited) if none for this brokerage/email
      const { data: existingClient } = await admin.from("broker_clients")
        .select("id, status").eq("brokerage_id", brokerage.id).eq("client_email", email).maybeSingle();

      if (!existingClient) {
        await admin.from("broker_clients").insert({
          brokerage_id: brokerage.id,
          client_email: email,
          client_name: parsed.data.client_name,
          client_phone: parsed.data.client_phone,
          status: "invited",
        });
      } else if (existingClient.status === "revoked") {
        await admin.from("broker_clients").update({ status: "invited", invited_at: new Date().toISOString() })
          .eq("id", existingClient.id);
      }

      const code = generateCode();
      const { data: invite, error: invErr } = await admin.from("broker_invites").insert({
        brokerage_id: brokerage.id,
        invited_by: user.id,
        email,
        code,
      }).select("*").single();
      if (invErr) return json({ error: invErr.message }, 500);

      if (RESEND_API_KEY) {
        const acceptUrl = `https://www.savo.co.nz/broker?code=${code}`;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "SAVO <noreply@savo.co.nz>",
              to: [email],
              subject: `${brokerage.company_name || "Your insurance broker"} invited you to SAVO`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff">
                  <h1 style="color:#1e3a5f;font-size:22px;margin:0 0 16px">You're invited to SAVO</h1>
                  <p style="color:#555;font-size:14px;line-height:1.6">
                    <strong>${brokerage.company_name || "Your insurance broker"}</strong> uses SAVO to manage your vehicles, documents and incident reports in one place. Once you join, your broker can add your vehicles and share documents with you — and you can email signed incident reports straight back to them.
                  </p>
                  <p style="color:#555;font-size:14px">Your invite code:</p>
                  <p style="font-size:24px;font-weight:700;letter-spacing:2px;color:#1e3a5f;background:#f5f5f5;padding:12px 16px;border-radius:8px;text-align:center">${code}</p>
                  <p style="margin:24px 0">
                    <a href="${acceptUrl}" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Accept invitation</a>
                  </p>
                  <p style="color:#999;font-size:12px">This invite expires in 14 days. You can revoke your broker's access from your SAVO profile at any time.</p>
                </div>`,
            }),
          });
        } catch (e) { console.error("broker invite email failed", e); }
      }

      return json({ invite, code });
    }

    // --- Client accepts invite
    if (parsed.data.action === "accept") {
      const code = parsed.data.code.toUpperCase();
      const { data: invite } = await admin.from("broker_invites").select("*").eq("code", code).maybeSingle();
      if (!invite) return json({ error: "Invalid code" }, 404);
      if (invite.status !== "pending") return json({ error: "Invite already used or revoked" }, 400);
      if (new Date(invite.expires_at) < new Date()) {
        await admin.from("broker_invites").update({ status: "expired" }).eq("id", invite.id);
        return json({ error: "Invite has expired" }, 400);
      }

      // Find or create the client row for this email
      const userEmail = (user.email || "").toLowerCase();
      const inviteEmail = (invite.email || "").toLowerCase();

      // Prefer match by invite email, fall back to any row for this brokerage by user email
      let { data: clientRow } = await admin.from("broker_clients")
        .select("*").eq("brokerage_id", invite.brokerage_id)
        .eq("client_email", inviteEmail || userEmail).maybeSingle();

      if (!clientRow) {
        const { data: created, error: cErr } = await admin.from("broker_clients").insert({
          brokerage_id: invite.brokerage_id,
          client_email: userEmail || inviteEmail,
          client_name: "",
          status: "invited",
        }).select("*").single();
        if (cErr) return json({ error: cErr.message }, 500);
        clientRow = created;
      }

      const { error: linkErr } = await admin.from("broker_clients").update({
        client_user_id: user.id,
        status: "active",
        accepted_at: new Date().toISOString(),
      }).eq("id", clientRow!.id);
      if (linkErr) return json({ error: linkErr.message }, 500);

      await admin.from("broker_invites").update({
        status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString(),
      }).eq("id", invite.id);

      return json({ success: true, brokerage_id: invite.brokerage_id });
    }

    // --- Broker revokes a client link
    if (parsed.data.action === "revoke_client") {
      const { data: brokerage } = await admin.from("brokerages")
        .select("id").eq("owner_user_id", user.id).maybeSingle();
      if (!brokerage) return json({ error: "Not a broker" }, 403);
      const { error } = await admin.from("broker_clients").update({ status: "revoked" })
        .eq("id", parsed.data.client_id).eq("brokerage_id", brokerage.id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("broker-invite error", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
