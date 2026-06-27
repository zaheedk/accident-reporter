// Inbound email -> document vault webhook.
//
// Users email info@savo.co.nz from their registered email address.
// - Subject line MAY contain a rego (e.g. "PNG34 insurance renewal").
// - Any file attachments are saved to the `user-documents` bucket and
//   recorded in the `user_documents` table.
// - If a matching rego is found on the sender's account, documents are
//   linked to that vehicle. Otherwise they are saved as general
//   profile documents.
// - Sender must match the user's profile email OR auth email.
// - The category is auto-detected from the filename and subject keywords.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySvixSignature } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const ACCEPTED_MIME_PREFIXES = ["image/", "application/pdf"];
const ACCEPTED_OFFICE_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const ACCEPTED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "heic", "heif", "gif",
  "pdf",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB, matches Document Vault

function extractString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const e = extractString(item);
      if (e) return e;
    }
    return "";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.address === "string" && obj.address.trim()) return obj.address.trim();
    if (typeof obj.email === "string" && obj.email.trim()) return obj.email.trim();
    for (const k of ["text", "plain_text", "plain", "body", "value", "content"]) {
      const e = extractString(obj[k]);
      if (e) return e;
    }
  }
  return "";
}

function firstNonEmpty(...values: unknown[]): string {
  for (const v of values) {
    const e = extractString(v);
    if (e) return e;
  }
  return "";
}

function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

/** Find a NZ-style rego in the subject. */
function extractRego(subject: string): string | null {
  if (!subject) return null;
  // Look for 5-7 char alphanumeric tokens (letters + digits).
  const tokens = subject.toUpperCase().match(/\b[A-Z0-9]{2,8}\b/g) || [];
  for (const t of tokens) {
    if (/[A-Z]/.test(t) && /\d/.test(t) && t.length >= 4 && t.length <= 7) {
      return t;
    }
    // Pure-digit plates also exist (less common); accept 4-6 digits.
    if (/^\d{4,6}$/.test(t)) return t;
  }
  return null;
}

function detectCategory(filename: string, subject: string): string {
  const hay = `${filename} ${subject}`.toLowerCase();
  if (/\binsur|policy|cover\b/.test(hay)) return "insurance";
  if (/\bwof\b/.test(hay)) return "wof";
  if (/\brego|registration\b/.test(hay)) return "rego";
  if (/\blicen[cs]e|driver\b/.test(hay)) return "license";
  return "other";
}

function safeFilename(name: string): string {
  const cleaned = (name || "attachment").replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return cleaned || "attachment";
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isAcceptedFile(filename: string, mime: string): boolean {
  const m = (mime || "").toLowerCase();
  if (ACCEPTED_MIME_PREFIXES.some((p) => m.startsWith(p))) return true;
  if (ACCEPTED_OFFICE_MIMES.has(m)) return true;
  return ACCEPTED_EXTENSIONS.has(extOf(filename));
}

async function fetchReceivedEmailAttachments(emailId: string): Promise<unknown[]> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!emailId || !resendApiKey) return [];

  const response = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`,
    { headers: { Authorization: `Bearer ${resendApiKey}` } },
  );

  if (!response.ok) {
    console.error("attachment list fetch failed", response.status, await response.text());
    return [];
  }

  const result = await response.json();
  return Array.isArray(result?.data) ? result.data : [];
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

interface NormalizedAttachment {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

async function normalizeAttachments(raw: unknown): Promise<NormalizedAttachment[]> {
  const out: NormalizedAttachment[] = [];
  if (!Array.isArray(raw)) return out;

  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const obj = a as Record<string, unknown>;
    const filename = safeFilename(
      String(obj.filename || obj.name || obj.file_name || "attachment"),
    );
    const contentType = String(obj.content_type || obj.contentType || obj.type || "");

    let bytes: Uint8Array | null = null;
    const content = obj.content ?? obj.data ?? obj.body;
    if (typeof content === "string" && content.length > 0) {
      try {
        bytes = base64ToBytes(content);
      } catch (_) {
        bytes = new TextEncoder().encode(content);
      }
    } else if (typeof obj.url === "string" && obj.url.length > 0) {
      try {
        const r = await fetch(obj.url);
        if (r.ok) bytes = new Uint8Array(await r.arrayBuffer());
      } catch (_) { /* ignore */ }
    } else if (typeof obj.download_url === "string" && obj.download_url.length > 0) {
      try {
        const r = await fetch(obj.download_url);
        if (r.ok) bytes = new Uint8Array(await r.arrayBuffer());
      } catch (_) { /* ignore */ }
    }

    if (!bytes || bytes.length === 0) continue;
    if (bytes.length > MAX_FILE_BYTES) continue;
    if (!isAcceptedFile(filename, contentType)) continue;

    out.push({ filename, contentType: contentType || "application/octet-stream", bytes });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Svix-signed webhook from Resend, or service-role internal forwarding.
  const rawBody = await req.text();
  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const isInternal = !!serviceKey && authHeader === `Bearer ${serviceKey}`;
  if (!isInternal) {
    const sigOk = await verifySvixSignature(req, rawBody);
    if (!sigOk) {
      console.warn("Rejecting inbound-document-webhook: invalid Svix signature");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey2);

    const payload = JSON.parse(rawBody || "{}");
    const data = (payload?.data || payload || {}) as Record<string, unknown>;


    const fromRaw = firstNonEmpty(
      data.from,
      data.sender,
      data.from_email,
      (data.envelope as Record<string, unknown> | undefined)?.from,
    );
    const fromEmail = extractEmail(fromRaw);
    console.log("inbound-document-webhook: parsed sender", {
      fromRaw,
      fromEmail,
      subject: data.subject,
      envelope: data.envelope,
      keys: Object.keys(data),
    });
    if (!fromEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_sender" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Loop guard
    if (fromEmail.includes("info@savo.co.nz")) {
      return new Response(JSON.stringify({ skipped: true, reason: "self_loop" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = firstNonEmpty(data.subject, "(No subject)");

    // Collect attachments from common provider shapes. Resend's inbound webhook
    // sends metadata only, so fetch temporary download URLs using email_id.
    const emailId = firstNonEmpty(data.email_id, data.id, payload?.email_id);
    let rawAttachments =
      (data.attachments as unknown) ||
      (data.Attachments as unknown) ||
      ((data.email as Record<string, unknown> | undefined)?.attachments) ||
      [];

    if (emailId && Array.isArray(rawAttachments) && rawAttachments.length > 0) {
      const fetchedAttachments = await fetchReceivedEmailAttachments(emailId);
      if (fetchedAttachments.length > 0) rawAttachments = fetchedAttachments;
    }
    const attachments = await normalizeAttachments(rawAttachments);
    console.log("inbound-document-webhook: attachments parsed", {
      emailId,
      metadataCount: Array.isArray(rawAttachments) ? rawAttachments.length : 0,
      acceptedCount: attachments.length,
    });

    if (attachments.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_attachments" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Resolve sender to a user (profile email OR auth email) ---
    let userId: string | null = null;

    const { data: profileMatch } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", fromEmail)
      .maybeSingle();
    if (profileMatch?.user_id) userId = profileMatch.user_id;

    if (!userId) {
      // Fallback: scan auth users (paged) for a matching email.
      let page = 1;
      while (page <= 20 && !userId) {
        const { data: list, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error || !list?.users?.length) break;
        const hit = list.users.find(
          (u) => (u.email || "").toLowerCase() === fromEmail,
        );
        if (hit) userId = hit.id;
        if (list.users.length < 200) break;
        page++;
      }
    }

    if (!userId) {
      console.log("inbound-document-webhook: unknown sender", fromEmail);
      return new Response(
        JSON.stringify({ skipped: true, reason: "unknown_sender" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Try to match a rego from the subject to a user vehicle ---
    const subjectRego = extractRego(subject);
    let vehicleId: string | null = null;
    let matchedRego: string | null = null;

    if (subjectRego) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, rego_number")
        .eq("user_id", userId);
      const norm = (v: string) => v.replace(/\s+/g, "").toUpperCase();
      const target = norm(subjectRego);
      const match = (vehicles || []).find(
        (v) => norm(v.rego_number || "") === target,
      );
      if (match) {
        vehicleId = match.id;
        matchedRego = match.rego_number;
      }
    }

    // --- Upload each attachment ---
    const inserted: Array<{ name: string; path: string; vehicle_id: string | null }> = [];
    for (const att of attachments) {
      const ext = extOf(att.filename) || "bin";
      const path = `${userId}/inbound/${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const category = detectCategory(att.filename, subject);

      const { error: upErr } = await supabase.storage
        .from("user-documents")
        .upload(path, att.bytes, {
          contentType: att.contentType,
          upsert: false,
        });
      if (upErr) {
        console.error("upload error", upErr);
        continue;
      }

      const { error: insErr } = await supabase.from("user_documents").insert({
        user_id: userId,
        vehicle_id: vehicleId,
        file_name: att.filename,
        file_path: path,
        file_size: att.bytes.length,
        category,
        notes: `Received via email. Subject: ${subject}`,
      });
      if (insErr) {
        console.error("insert error", insErr);
        // Best-effort cleanup
        await supabase.storage.from("user-documents").remove([path]);
        continue;
      }

      inserted.push({ name: att.filename, path, vehicle_id: vehicleId });
    }

    // --- Notify the user ---
    if (inserted.length > 0) {
      const fileWord = inserted.length === 1 ? "document" : "documents";
      const title = vehicleId
        ? `${inserted.length} ${fileWord} added to ${matchedRego}`
        : `${inserted.length} ${fileWord} added to your vault`;
      const message = vehicleId
        ? `We saved ${inserted.length} ${fileWord} from your email against vehicle ${matchedRego}.`
        : subjectRego
          ? `We couldn't find a vehicle matching "${subjectRego}" on your account, so the ${fileWord} were saved to your general document vault. You can move them to a vehicle from the Documents page.`
          : `Your email didn't include a vehicle rego in the subject, so the ${fileWord} were saved to your general document vault.`;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "inbound_document",
        title,
        message,
        vehicle_id: vehicleId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        matchedRego,
        vehicleId,
        savedCount: inserted.length,
        receivedCount: attachments.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("inbound-document-webhook error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
