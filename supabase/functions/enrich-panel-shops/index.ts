// Admin-only: fills opening hours, review counts, ratings, website and description
// for panel shops from Google Places. Only touches shops whose hours are still empty.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const u = await requireUser(req);
    if ("error" in u) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const LK = Deno.env.get("LOVABLE_API_KEY"), MK = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LK || !MK) return json({ error: "Google Maps not connected" }, 500);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 100);

    const { data: shops, error } = await admin.from("panel_shops")
      .select("id,name,address,city,website,description")
      .gte("google_rating", 4.5).eq("opening_hours", "")
      .order("google_rating", { ascending: false }).limit(limit);
    if (error) throw error;

    let updated = 0, notFound = 0;
    const failures: string[] = [];
    for (const s of shops ?? []) {
      const r = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LK}`, "X-Connection-Api-Key": MK, "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.displayName,places.rating,places.userRatingCount,places.regularOpeningHours.weekdayDescriptions,places.editorialSummary,places.websiteUri",
        },
        body: JSON.stringify({ textQuery: `${s.name}, ${s.address}, ${s.city}, New Zealand`, regionCode: "NZ", pageSize: 1 }),
      });
      if (r.status === 403 || r.status === 429) { failures.push(`${s.name}: stopped (${r.status})`); break; }
      if (!r.ok) { failures.push(`${s.name}: ${r.status}`); continue; }
      const p = (await r.json()).places?.[0];
      if (!p) { notFound++; continue; }
      const patch: Record<string, unknown> = {
        opening_hours: (p.regularOpeningHours?.weekdayDescriptions ?? []).join("\n") || "Hours not published on Google — call ahead.",
      };
      if (p.userRatingCount) patch.review_count = p.userRatingCount;
      if (p.rating) patch.google_rating = p.rating;
      if (!s.website && p.websiteUri) patch.website = p.websiteUri;
      if (!s.description && p.editorialSummary?.text) patch.description = p.editorialSummary.text;
      const { error: ue } = await admin.from("panel_shops").update(patch).eq("id", s.id);
      if (ue) failures.push(`${s.name}: ${ue.message}`); else updated++;
    }
    return json({ checked: shops?.length ?? 0, updated, notFound, failures });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
