/**
 * Build-time validator for directory BreadcrumbList JSON-LD.
 *
 * Validates two route families:
 *   - /panel-beaters/{slug}  (cities, sourced from panel_shops)
 *   - /tow-trucks/{slug}     (regions, sourced from tow_companies)
 *
 * Pulls live slugs from Supabase (same source the sitemap uses), runs the
 * pure breadcrumb builders against each, and asserts:
 *   - Schema.org BreadcrumbList shape (correct @type, item URLs, names)
 *   - All `item` URLs use the canonical origin (SAVO_ORIGIN)
 *   - URL order is strict: Home → /{root} → /{root}/{slug}
 *   - `position` values are 1, 2, 3 with no gaps and no duplicates
 *   - The terminal item URL matches the page URL for that slug
 *
 * Wired into `prebuild` so a bad breadcrumb fails the build before deploy.
 * Exits 0 on success, 1 on any violation (with a per-slug report).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SAVO_ORIGIN, buildPanelBeatersBreadcrumb } from '../src/lib/panel-beaters-jsonld';
import { buildTowTrucksBreadcrumb } from '../src/lib/tow-trucks-jsonld';
import { slugifyLocation } from '../src/lib/location-slug';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type BreadcrumbBuilder = (slug: string, name: string) => ReturnType<typeof buildPanelBeatersBreadcrumb>;

type RouteSpec = {
  label: string;
  root: string; // e.g. "panel-beaters"
  breadcrumbRootName: string; // e.g. "Panel Beaters"
  fallback: string[];
  build: BreadcrumbBuilder;
  fetchLive: (sb: SupabaseClient) => Promise<{ slug: string; name: string }[]>;
};

type Violation = { route: string; slug: string; message: string };

const ROUTES: RouteSpec[] = [
  {
    label: 'panel-beaters',
    root: 'panel-beaters',
    breadcrumbRootName: 'Panel Beaters',
    build: buildPanelBeatersBreadcrumb,
    fallback: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Palmerston North', 'Napier', 'Nelson', 'Rotorua'],
    fetchLive: async (sb) => {
      const { data, error } = await sb.from('panel_shops').select('city').gte('google_rating', 4.5);
      if (error || !data) return [];
      const seen = new Map<string, string>();
      for (const row of data as { city: string }[]) {
        if (!row.city) continue;
        const slug = slugifyLocation(row.city);
        if (!seen.has(slug)) seen.set(slug, row.city);
      }
      return Array.from(seen, ([slug, name]) => ({ slug, name }));
    },
  },
  {
    label: 'tow-trucks',
    root: 'tow-trucks',
    breadcrumbRootName: 'Tow Trucks',
    build: buildTowTrucksBreadcrumb,
    fallback: ['Auckland', 'Wellington', 'Canterbury', 'Waikato', 'Bay of Plenty', 'Otago', 'Manawatu-Wanganui', 'Northland', "Hawke's Bay", 'Southland'],
    fetchLive: async (sb) => {
      const { data, error } = await sb.from('tow_companies').select('region');
      if (error || !data) return [];
      const seen = new Map<string, string>();
      for (const row of data as { region: string }[]) {
        if (!row.region) continue;
        const slug = slugifyLocation(row.region);
        if (!seen.has(slug)) seen.set(slug, row.region);
      }
      return Array.from(seen, ([slug, name]) => ({ slug, name }));
    },
  },
];

function validate(route: RouteSpec, slug: string, name: string): string[] {
  const errors: string[] = [];
  const bc = route.build(slug, name);
  const expectedPageUrl = `${SAVO_ORIGIN}/${route.root}/${slug}`;

  if (bc['@type'] !== 'BreadcrumbList') {
    errors.push(`@type must be "BreadcrumbList" (got "${bc['@type']}")`);
  }
  if (bc['@id'] !== `${expectedPageUrl}#breadcrumb`) {
    errors.push(`@id mismatch — expected "${expectedPageUrl}#breadcrumb", got "${bc['@id']}"`);
  }

  const items = bc.itemListElement;
  if (!Array.isArray(items) || items.length !== 3) {
    errors.push(`itemListElement must have exactly 3 entries (got ${items?.length ?? 0})`);
    return errors;
  }

  const expected = [
    { position: 1, name: 'Home', item: `${SAVO_ORIGIN}/` },
    { position: 2, name: route.breadcrumbRootName, item: `${SAVO_ORIGIN}/${route.root}` },
    { position: 3, name, item: expectedPageUrl },
  ];

  for (let i = 0; i < expected.length; i++) {
    const got = items[i];
    const want = expected[i];
    if (got['@type'] !== 'ListItem') errors.push(`item ${i + 1}: @type must be "ListItem"`);
    if (got.position !== want.position) errors.push(`item ${i + 1}: position must be ${want.position} (got ${got.position})`);
    if (got.name !== want.name) errors.push(`item ${i + 1}: name must be "${want.name}" (got "${got.name}")`);
    if (got.item !== want.item) errors.push(`item ${i + 1}: url must be "${want.item}" (got "${got.item}")`);
    if (!got.item.startsWith(SAVO_ORIGIN)) errors.push(`item ${i + 1}: url must use canonical origin "${SAVO_ORIGIN}"`);
  }

  const positions = items.map((it) => it.position);
  if (new Set(positions).size !== positions.length) errors.push(`duplicate positions: ${positions.join(',')}`);

  return errors;
}

async function main() {
  const sb = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
  const violations: Violation[] = [];
  let totalChecked = 0;

  for (const route of ROUTES) {
    let live: { slug: string; name: string }[] = [];
    if (sb) {
      try { live = await route.fetchLive(sb); } catch { live = []; }
    }
    const liveSlugs = new Set(live.map((c) => c.slug));
    const fallback = route.fallback
      .map((c) => ({ slug: slugifyLocation(c), name: c }))
      .filter((c) => !liveSlugs.has(c.slug));
    const all = [...live, ...fallback];

    if (all.length === 0) {
      console.error(`[jsonld-validator] no slugs to validate for /${route.root} (Supabase unreachable and fallback empty)`);
      process.exit(1);
    }

    for (const { slug, name } of all) {
      for (const err of validate(route, slug, name)) {
        violations.push({ route: route.root, slug, message: err });
      }
    }
    totalChecked += all.length;
    console.log(`[jsonld-validator] /${route.root}: ${all.length} slugs checked (live: ${live.length}, fallback: ${fallback.length})`);
  }

  if (violations.length > 0) {
    console.error(`[jsonld-validator] ${violations.length} violation(s) across ${totalChecked} pages:`);
    for (const v of violations) console.error(`  /${v.route}/${v.slug} — ${v.message}`);
    process.exit(1);
  }

  console.log(`[jsonld-validator] ✓ ${totalChecked} BreadcrumbList JSON-LD nodes validated (origin: ${SAVO_ORIGIN})`);
}

main().catch((err) => {
  console.error('[jsonld-validator] unexpected failure:', err);
  process.exit(1);
});
