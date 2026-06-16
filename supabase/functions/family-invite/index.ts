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

const CreateSchema = z.object({
  action: z.literal("create"),
  email: z.string().email().max(255).optional(),
});

const AcceptSchema = z.object({
  action: z.literal("accept"),
  code: z.string().trim().min(4).max(32),
});

const Schema = z.discriminatedUnion("action", [CreateSchema, AcceptSchema]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // ----- CREATE INVITE -----
    if (parsed.data.action === "create") {
      // Ensure family exists for this user (they become head)
      let { data: family } = await admin
        .from("families")
        .select("id, head_user_id")
        .eq("head_user_id", user.id)
        .maybeSingle();

      if (!family) {
        // If user is already a member of someone else's family, refuse
        const { data: existingMembership } = await admin
          .from("family_members")
          .select("id, role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingMembership && existingMembership.role !== "head") {
          return json({ error: "You are already a member of another family. Leave first to start your own." }, 400);
        }

        const { data: newFamily, error: famErr } = await admin
          .from("families")
          .insert({ head_user_id: user.id, name: "My Family" })
          .select("id, head_user_id")
          .single();
        if (famErr) return json({ error: famErr.message }, 500);
        family = newFamily;
      }

      const code = generateCode();
      const { data: invite, error: invErr } = await admin
        .from("family_invites")
        .insert({
          family_id: family.id,
          invited_by: user.id,
          email: parsed.data.email?.toLowerCase() ?? null,
          code,
        })
        .select("*")
        .single();
      if (invErr) return json({ error: invErr.message }, 500);

      // Optionally send email
      if (parsed.data.email && RESEND_API_KEY) {
        const acceptUrl = `https://www.savo.co.nz/family?code=${code}`;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "SAVO <noreply@savo.co.nz>",
              to: [parsed.data.email],
              subject: "You've been invited to a SAVO family",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff">
                  <h1 style="color:#1e3a5f;font-size:22px;margin:0 0 16px">You're invited to join a family on SAVO</h1>
                  <p style="color:#555;font-size:14px;line-height:1.6">
                    Family members can share vehicles, claims, documents and expiry reminders.
                  </p>
                  <p style="color:#555;font-size:14px">Your invite code:</p>
                  <p style="font-size:24px;font-weight:700;letter-spacing:2px;color:#1e3a5f;background:#f5f5f5;padding:12px 16px;border-radius:8px;text-align:center">${code}</p>
                  <p style="margin:24px 0">
                    <a href="${acceptUrl}" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Accept invitation</a>
                  </p>
                  <p style="color:#999;font-size:12px">This invite expires in 14 days.</p>
                </div>`,
            }),
          });
        } catch (e) {
          console.error("Email send failed", e);
        }
      }

      return json({ invite, code });
    }

    // ----- ACCEPT INVITE -----
    if (parsed.data.action === "accept") {
      const code = parsed.data.code.toUpperCase();
      const { data: invite } = await admin
        .from("family_invites")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!invite) return json({ error: "Invalid code" }, 404);
      if (invite.status !== "pending") return json({ error: "Invite already used or revoked" }, 400);
      if (new Date(invite.expires_at) < new Date()) {
        await admin.from("family_invites").update({ status: "expired" }).eq("id", invite.id);
        return json({ error: "Invite has expired" }, 400);
      }

      // Make sure the user isn't already in any family
      const { data: existing } = await admin
        .from("family_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) return json({ error: "You are already in a family. Leave it first." }, 400);

      const { error: memErr } = await admin.from("family_members").insert({
        family_id: invite.family_id,
        user_id: user.id,
        role: "member",
      });
      if (memErr) return json({ error: memErr.message }, 500);

      await admin
        .from("family_invites")
        .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return json({ success: true, family_id: invite.family_id });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("family-invite error", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
