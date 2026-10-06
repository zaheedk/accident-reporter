// Admin-only Search Console dashboard. Reads a cached snapshot; refreshes from
// Google at most every 12h (or on explicit admin "refresh").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TARGET_URL = "https://www.savo.co.nz/";
const SITEMAP_URL = "https://www.savo.co.nz/sitemap.xml";
const STALE_MS = 12 * 60 * 60 * 1000;

function gwHeaders() {
  const lk = Deno.env.get("LOVABLE_API_KEY");
  const ck = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lk || !ck) throw new Error("Missing Search Console credentials");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck, "Content-Type": "application/json" };
}

async function gw(path: string, init: RequestInit = {}) {
  const r = await fetch(`${GATEWAY}${path}`, { ...init, headers: gwHeaders() });
  const text = await r.text();
  if (!r.ok) throw new Error(`Search Console [${r.status}]: ${text}`);
  return text ? JSON.parse(text) : {};
}

function covers(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const d = siteUrl.slice(10).toLowerCase();
    const h = target.hostname.toLowerCase();
    return h === d || h.endsWith(`.${d}`);
  }
  try { return target.href.startsWith(new URL(siteUrl).href); } catch { return false; }
}

async function resolveSite(selected?: string) {
  const { siteEntry = [] } = await gw("/webmasters/v3/sites");
  const target = new URL(TARGET_URL);
  const matches = (siteEntry as { siteUrl: string; permissionLevel?: string }[])
    .filter((e) => e.permissionLevel !== "siteUnverifiedUser" && covers(e.siteUrl, target))
    .map((e) => e.siteUrl);
  if (selected) {
    if (!matches.includes(selected)) throw new Error("Selected property is not verified for savo.co.nz");
    return { status: "selected" as const, siteUrl: selected };
  }
  if (matches.length === 0) throw new Error("No verified Search Console property covers savo.co.nz");
  if (matches.length === 1) return { status: "selected" as const, siteUrl: matches[0] };
  return { status: "selection_required" as const, candidates: matches };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function buildSnapshot(siteUrl: string) {
  const enc = encodeURIComponent(siteUrl);
  // GSC data lags ~2-3 days.
  const end = new Date(Date.now() - 2 * 86400000);
  const start28 = new Date(end.getTime() - 27 * 86400000);
  const start90 = new Date(end.getTime() - 89 * 86400000);
  const prevEnd = new Date(start28.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - 27 * 86400000);
  const q = (body: Record<string, unknown>) =>
    gw(`/webmasters/v3/sites/${enc}/searchAnalytics/query`, { method: "POST", body: JSON.stringify(body) });

  const [daily, totals, prevTotals, queries, pages, pageCount, sitemap] = await Promise.all([
    q({ startDate: iso(start90), endDate: iso(end), dimensions: ["date"], rowLimit: 100 }),
    q({ startDate: iso(start28), endDate: iso(end) }),
    q({ startDate: iso(prevStart), endDate: iso(prevEnd) }),
    q({ startDate: iso(start28), endDate: iso(end), dimensions: ["query"], rowLimit: 25 }),
    q({ startDate: iso(start28), endDate: iso(end), dimensions: ["page"], rowLimit: 25 }),
    q({ startDate: iso(start90), endDate: iso(end), dimensions: ["page"], rowLimit: 5000 }),
    gw(`/webmasters/v3/sites/${enc}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`).catch((e) => ({ error: String(e) })),
  ]);

  return {
    range: { start: iso(start28), end: iso(end) },
    totals: totals.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    prevTotals: prevTotals.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    daily: (daily.rows ?? []).map((r: any) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position })),
    topQueries: (queries.rows ?? []).map((r: any) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    topPages: (pages.rows ?? []).map((r: any) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pagesWithImpressions90d: (pageCount.rows ?? []).length,
    sitemap: sitemap.error
      ? { error: sitemap.error }
      : {
          lastDownloaded: sitemap.lastDownloaded ?? null,
          lastSubmitted: sitemap.lastSubmitted ?? null,
          errors: Number(sitemap.errors ?? 0),
          warnings: Number(sitemap.warnings ?? 0),
          submitted: (sitemap.contents ?? []).reduce((n: number, c: any) => n + Number(c.submitted ?? 0), 0),
        },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const force = body?.action === "refresh";
    const selected = typeof body?.siteUrl === "string" ? body.siteUrl : undefined;

    const { data: latest } = await admin.from("seo_snapshots").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const fresh = latest && Date.now() - new Date(latest.created_at).getTime() < STALE_MS;
    if (latest && fresh && !force) return json({ snapshot: latest });

    const res = await resolveSite(selected ?? latest?.site_url);
    if (res.status === "selection_required") return json({ selection_required: res.candidates, snapshot: latest ?? null });

    const data = await buildSnapshot(res.siteUrl);
    const { data: saved, error } = await admin.from("seo_snapshots").insert({ site_url: res.siteUrl, data }).select().single();
    if (error) throw error;
    return json({ snapshot: saved });
  } catch (e) {
    console.error("seo-dashboard failed:", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
