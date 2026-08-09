// Regenerates public/sitemap.xml with static routes + dynamic SEO location pages
// (panel beaters by city/region, tow trucks by region). Runs on `predev` and `prebuild`.

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { matchCity } from '../src/lib/tow-cities';

loadEnv();

const BASE_URL = 'https://www.savo.co.nz';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Entry = { path: string; changefreq?: string; priority?: string; lastmod?: string };

const TODAY = new Date().toISOString().slice(0, 10);

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const staticEntries: Entry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/how-it-works', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.6' },
  { path: '/legal', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/panel-shops', changefreq: 'weekly', priority: '0.7' },
  { path: '/tow-companies', changefreq: 'weekly', priority: '0.7' },
  { path: '/panel-beaters', changefreq: 'weekly', priority: '0.8' },
  { path: '/panel-beaters-for', changefreq: 'weekly', priority: '0.8' },
  { path: '/tow-trucks', changefreq: 'weekly', priority: '0.8' },
  { path: '/fault-guide', changefreq: 'monthly', priority: '0.6' },
  { path: '/not-at-fault-car-hire', changefreq: 'monthly', priority: '0.9' },
  { path: '/auth', changefreq: 'monthly', priority: '0.4' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
];

const blogSlugs = [
  'why-capturing-accident-details-matters-nz',
  'step-by-step-guide-filing-car-insurance-claim-nz',
  'common-mistakes-nz-drivers-insurance-claims',
  'understanding-car-insurance-types-new-zealand',
  'what-to-do-after-car-accident-new-zealand',
  'winter-driving-accidents-new-zealand',
  'dashcam-phone-evidence-insurance-claims-nz',
  'parking-lot-accidents-nz-what-to-do',
  'understanding-insurance-excess-new-zealand',
  'courtesy-cars-not-at-fault-accidents-nz',
  'roadside-assistance-nz-what-to-know',
  'renewing-car-insurance-nz-tips',
  'right-of-way-rules-nz-intersections',
  'car-insurance-guide-young-drivers-nz',
  'how-to-talk-to-your-insurer-after-accident-nz',
  'how-to-report-car-accident-police-insurance-nz',
  'car-written-off-nz-what-happens-next',
  'comprehensive-vs-third-party-insurance-nz',
  'hit-and-run-accident-nz-what-to-do',
  'towing-rights-nz-choosing-tow-company',
  'multi-vehicle-pile-up-nz-fault-claims',
  'who-pays-hire-car-not-at-fault-accident-nz',
  'how-to-get-replacement-car-nz-after-accident',
];

async function fetchRows<T>(table: string, query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[sitemap] fetch ${table} failed: ${res.status}`);
    return [];
  }
  return res.json();
}

function xml(entries: Entry[]) {
  const urls = entries
    .map((e) => {
      const parts = [`  <url>`, `    <loc>${BASE_URL}${e.path}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
      parts.push(`  </url>`);
      return parts.join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const entries: Entry[] = [...staticEntries];
  for (const slug of blogSlugs) entries.push({ path: `/blog/${slug}`, changefreq: 'monthly', priority: '0.6' });

  // Panel beaters: city + region pages
  const shops = await fetchRows<{ city: string; region: string }>(
    'panel_shops',
    'select=city,region&google_rating=gte.4.5'
  );
  const cities = new Set<string>();
  const regions = new Set<string>();
  for (const s of shops) {
    if (s.city) cities.add(s.city);
    if (s.region) regions.add(s.region);
  }
  const panelSlugs = new Set<string>();
  for (const c of cities) panelSlugs.add(slugify(c));
  for (const r of regions) panelSlugs.add(slugify(r));
  for (const slug of panelSlugs) entries.push({ path: `/panel-beaters/${slug}`, changefreq: 'weekly', priority: '0.8', lastmod: TODAY });

  // Tow trucks: region pages + city pages
  const tows = await fetchRows<{ region: string; address: string }>('tow_companies', 'select=region,address');
  const towRegions = new Set<string>();
  for (const t of tows) if (t.region) towRegions.add(slugify(t.region));
  for (const slug of towRegions) entries.push({ path: `/tow-trucks/${slug}`, changefreq: 'weekly', priority: '0.8', lastmod: TODAY });

  const towCitySlugs = new Set<string>();
  for (const t of tows) {
    const c = matchCity(t.address, t.region);
    if (c) towCitySlugs.add(c.slug);
  }
  for (const slug of towCitySlugs) entries.push({ path: `/tow-trucks/${slug}`, changefreq: 'weekly', priority: '0.9', lastmod: TODAY });

  // Panel beaters by vehicle make
  const makeSlugs = [
    'toyota','ford','holden','mazda','nissan','hyundai','mitsubishi','honda','kia',
    'subaru','suzuki','volkswagen','bmw','mercedes-benz','audi','tesla','isuzu',
  ];
  for (const slug of makeSlugs) entries.push({ path: `/panel-beaters-for/${slug}`, changefreq: 'monthly', priority: '0.7' });

  const out = xml(entries);
  writeFileSync(resolve('public/sitemap.xml'), out);
  console.log(`[sitemap] wrote ${entries.length} entries (panel-beaters: ${panelSlugs.size}, makes: ${makeSlugs.length}, tow-trucks: ${towRegions.size} regions + ${towCitySlugs.size} cities)`);
}

main().catch((err) => {
  console.error('[sitemap] failed', err);
  process.exit(0); // don't break the build if Supabase is unreachable
});
