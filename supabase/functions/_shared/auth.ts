// Shared auth helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Require a valid Supabase JWT and return the authenticated user. */
export async function requireUser(req: Request): Promise<
  | { user: { id: string; email?: string }; client: ReturnType<typeof createClient> }
  | { error: Response }
> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { user: { id: data.user.id, email: data.user.email ?? undefined }, client };
}

/** Require the request to carry the service-role bearer token. */
export function requireServiceRole(req: Request): Response | null {
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;
  if (!expected || req.headers.get("Authorization") !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

/** Verify a Twilio webhook signature. */
export async function verifyTwilioSignature(
  req: Request,
  rawBody: string,
  fullUrl: string,
): Promise<boolean> {
  const signature = req.headers.get("x-twilio-signature");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!signature || !authToken) return false;
  // Twilio expects: HMAC-SHA1(url + sorted form params concatenated as key+value)
  const params = new URLSearchParams(rawBody);
  const sortedKeys = Array.from(params.keys()).sort();
  let data = fullUrl;
  for (const k of sortedKeys) data += k + (params.get(k) ?? "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return signature === expected;
}

/** Verify a Resend / Svix webhook signature (Svix-Signature header). */
export async function verifySvixSignature(
  req: Request,
  rawBody: string,
): Promise<boolean> {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") || Deno.env.get("SVIX_WEBHOOK_SECRET");
  if (!secret) return false;
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  // Reject stale timestamps (>5 min)
  const ts = parseInt(svixTimestamp, 10);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;
  const secretBytes = secret.startsWith("whsec_")
    ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // Header format: "v1,sig1 v1,sig2 ..."
  return svixSignature.split(" ").some((part) => {
    const [, value] = part.split(",");
    return value === expected;
  });
}
