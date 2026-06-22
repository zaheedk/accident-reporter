/**
 * Build-time validator for /panel-beaters/{slug} BreadcrumbList JSON-LD.
 *
 * Pulls live city slugs from Supabase (same source the sitemap uses), runs the
 * pure breadcrumb builder against each, and asserts:
 *   - Schema.org BreadcrumbList shape (correct @type, item URLs, names)
 *   - All `item` URLs use the canonical origin (SAVO_ORIGIN)
 *   - URL order is strict: Home → /panel-beaters → /panel-beaters/{slug}
 *   - `position` values are 1, 2, 3 with no gaps and no duplicates
 *   - The terminal item URL matches the page URL for that slug
 *
 * Wired into `prebuild` so a bad breadcrumb fails the build before deploy.
 * Exits 0 on success, 1 on any violation (with a per-slug report).
 */

import { createClient } from '@supabase/supabase-js';
import { SAVO_ORIGIN, buildPanelBeatersBreadcrumb } from '../src/lib/panel-beaters-jsonld';
import { slugifyLocation } from '../src/lib/location-slug';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// A static smoke-test set we always validate, even if Supabase is unreachable.
const FALLBACK_CITIES = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
  'Dunedin', 'Palmerston North', 'Napier', 'Nelson', 'Rotorua',
];

type Violation = { slug: string; message: string };

async function fetchLiveCities(): Promise<{ slug: string; name: string }[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('panel_shops')
      .select('city')
      .gte('google_rating', 4.5);
    if (error || !data) return [];
    const seen = new Map<string, string>();
    for (const row of data as { city: string }[]) {
      if (!row.city) continue;
      const slug = slugifyLocation(row.city);
      if (!seen.has(slug)) seen.set(slug, row.city);
    }
    return Array.from(seen, ([slug, name]) => ({ slug, name }));
  } catch {
    return [];
  }
}

function validate(slug: string, name: string): string[] {
  const errors: string[] = [];
  const bc = buildPanelBeatersBreadcrumb(slug, name);
  const expectedPageUrl = `${SAVO_ORIGIN}/panel-beaters/${slug}`;

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
    { position: 2, name: 'Panel Beaters', item: `${SAVO_ORIGIN}/panel-beaters` },
    { position: 3, name, item: expectedPageUrl },
  ];

  for (let i = 0; i < expected.length; i++) {
    const got = items[i];
    const want = expected[i];
    if (got['@type'] !== 'ListItem') errors.push(`item ${i + 1}: @type must be "ListItem"`);
    if (got.position !== want.position) {
      errors.push(`item ${i + 1}: position must be ${want.position} (got ${got.position})`);
    }
    if (got.name !== want.name) {
      errors.push(`item ${i + 1}: name must be "${want.name}" (got "${got.name}")`);
    }
    if (got.item !== want.item) {
      errors.push(`item ${i + 1}: url must be "${want.item}" (got "${got.item}")`);
    }
    if (!got.item.startsWith(SAVO_ORIGIN)) {
      errors.push(`item ${i + 1}: url must use canonical origin "${SAVO_ORIGIN}"`);
    }
  }

  // Sanity: positions strictly 1..N, no duplicates
  const positions = items.map((it) => it.position);
  const uniq = new Set(positions);
  if (uniq.size !== positions.length) errors.push(`duplicate positions: ${positions.join(',')}`);

  return errors;
}

async function main() {
  const live = await fetchLiveCities();
  const liveSlugs = new Set(live.map((c) => c.slug));
  const fallback = FALLBACK_CITIES
    .map((c) => ({ slug: slugifyLocation(c), name: c }))
    .filter((c) => !liveSlugs.has(c.slug));
  const cities = [...live, ...fallback];

  if (cities.length === 0) {
    console.error('[jsonld-validator] no cities to validate (Supabase unreachable and fallback empty)');
    process.exit(1);
  }

  const violations: Violation[] = [];
  for (const { slug, name } of cities) {
    for (const err of validate(slug, name)) {
      violations.push({ slug, message: err });
    }
  }

  if (violations.length > 0) {
    console.error(`[jsonld-validator] ${violations.length} violation(s) across ${cities.length} city pages:`);
    for (const v of violations) console.error(`  /panel-beaters/${v.slug} — ${v.message}`);
    process.exit(1);
  }

  console.log(`[jsonld-validator] ✓ ${cities.length} city BreadcrumbList JSON-LD validated (origin: ${SAVO_ORIGIN})`);
}

main().catch((err) => {
  console.error('[jsonld-validator] unexpected failure:', err);
  process.exit(1);
});
