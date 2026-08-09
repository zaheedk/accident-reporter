/**
 * Build-time prerender for the SEO directory routes.
 *
 * The React app fetches operators from Supabase at runtime, so the HTML a
 * crawler first receives contains no operator names, no addresses and no
 * counts. This script runs after `vite build`, pulls the directory data once,
 * and writes a static crawl seed for each directory URL:
 *
 *   dist/tow-trucks/{region|city}/index.html
 *   dist/panel-beaters/{city|region}/index.html
 *
 * Each file carries the real <h1>, intro copy, an operator list as plain HTML,
 * the title/description/canonical and the JSON-LD graph. The React bundle still
 * boots on top and takes over — the static copy is only for crawlers.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { config as loadEnv } from 'dotenv';
import { SAVO_ORIGIN, buildPanelBeatersBreadcrumb } from '../src/lib/panel-beaters-jsonld';
import { buildTowTrucksBreadcrumb } from '../src/lib/tow-trucks-jsonld';
import { slugifyLocation, titleizeSlug } from '../src/lib/location-slug';
import { TOW_CITIES, matchCity, cityIntro, type TowCity } from '../src/lib/tow-cities';
import { regionIntro } from '../src/lib/tow-intros';

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DIST = resolve('dist');
/** Hard cap so the published output can never approach the platform file limit. */
const MAX_PRERENDER_PAGES = Number(process.env.MAX_PRERENDER_PAGES ?? 400);

type Tow = { name: string; address: string; phone: string; region: string };
type Shop = { name: string; address: string; phone: string; city: string; region: string; google_rating: number | null };

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchRows<T>(table: string, query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[prerender] fetch ${table} failed: ${res.status}`);
    return [];
  }
  return res.json();
}

type Page = {
  path: string; // e.g. /tow-trucks/auckland
  title: string;
  description: string;
  h1: string;
  intro: string;
  listHeading: string;
  items: { name: string; address: string; phone: string }[];
  jsonLd: unknown;
  links: { href: string; label: string }[];
};

function renderBody(p: Page): string {
  const items = p.items
    .map(
      (i) => `        <li>
          <h3>${esc(i.name)}</h3>
          ${i.address ? `<p>${esc(i.address)}</p>` : ''}
          ${i.phone ? `<p><a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></p>` : ''}
        </li>`
    )
    .join('\n');
  const links = p.links.map((l) => `        <li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('\n');
  return `    <main id="prerender-seed">
      <h1>${esc(p.h1)}</h1>
      <p>${esc(p.intro)}</p>
      <h2>${esc(p.listHeading)}</h2>
      <ul>
${items}
      </ul>
      <h2>Related directories</h2>
      <ul>
${links}
      </ul>
    </main>`;
}

function writePage(template: string, p: Page) {
  const canonical = `${SAVO_ORIGIN}${p.path}`;
  const head = `    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(p.jsonLd)}</script>`;

  let html = template;
  // Strip the template's own title so we don't ship two.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  html = html.replace(/<link rel="canonical"[^>]*>/gi, '');
  // Drop the template's sitewide description/OG tags so each page ships exactly one set.
  html = html.replace(/<meta name="description"[^>]*>/gi, '');
  html = html.replace(/<meta property="og:(title|description|url|type)"[^>]*>/gi, '');
  html = html.replace(/<meta name="twitter:(card|title|description)"[^>]*>/gi, '');
  html = html.replace('</head>', `${head}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">\n${renderBody(p)}\n    </div>`);

  const outDir = resolve(DIST, p.path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'index.html'), html);
}

async function main() {
  const templatePath = resolve(DIST, 'index.html');
  if (!existsSync(templatePath)) {
    console.warn('[prerender] dist/index.html missing — skipping');
    return;
  }
  const template = readFileSync(templatePath, 'utf8');

  const pages: Page[] = [];

  // ---------- Tow trucks ----------
  const tows = await fetchRows<Tow>('tow_companies', 'select=name,address,phone,region&order=name');

  const byRegion = new Map<string, Tow[]>();
  const byCity = new Map<string, Tow[]>();
  for (const t of tows) {
    if (t.region) {
      const k = slugifyLocation(t.region);
      byRegion.set(k, [...(byRegion.get(k) ?? []), t]);
    }
    const c = matchCity(t.address, t.region);
    if (c) byCity.set(c.slug, [...(byCity.get(c.slug) ?? []), t]);
  }

  const towJsonLd = (path: string, name: string, list: Tow[], breadcrumbName: string, slug: string) => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `${SAVO_ORIGIN}${path}#operators`,
        name,
        numberOfItems: list.length,
        itemListElement: list.slice(0, 20).map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'AutomotiveBusiness',
            name: t.name,
            ...(t.phone ? { telephone: t.phone } : {}),
            address: {
              '@type': 'PostalAddress',
              streetAddress: t.address,
              addressRegion: t.region,
              addressCountry: 'NZ',
            },
          },
        })),
      },
      buildTowTrucksBreadcrumb(slug, breadcrumbName),
    ],
  });

  for (const [slug, list] of byRegion) {
    const regionName = list[0]?.region ?? titleizeSlug(slug);
    const path = `/tow-trucks/${slug}`;
    const cities = TOW_CITIES.filter((c) => c.region === regionName && byCity.has(c.slug));
    pages.push({
      path,
      title: `Tow Trucks in ${regionName} — ${list.length} 24/7 Towing Operators NZ (2026)`,
      description: `Compare ${list.length} tow truck operators serving ${regionName}, New Zealand. Contact details, pricing guidance and your right to choose after an accident or breakdown.`,
      h1: `Tow Trucks in ${regionName}`,
      intro: regionIntro(regionName, slug, list.length),
      listHeading: `Towing operators in ${regionName}`,
      items: list,
      jsonLd: towJsonLd(path, `Tow Trucks in ${regionName}`, list, regionName, slug),
      links: [
        ...cities.map((c: TowCity) => ({ href: `/tow-trucks/${c.slug}`, label: `Tow trucks in ${c.name}` })),
        { href: `/panel-beaters/${slug}`, label: `Panel beaters in ${regionName}` },
        { href: '/tow-trucks', label: 'All New Zealand regions' },
      ],
    });
  }

  for (const [slug, list] of byCity) {
    const city = TOW_CITIES.find((c) => c.slug === slug)!;
    const path = `/tow-trucks/${slug}`;
    pages.push({
      path,
      title: `Tow Trucks in ${city.name} — 24/7 Towing (${list.length} Operators)`,
      description: `24/7 tow trucks in ${city.name}. Compare ${list.length} towing operators, call directly, and know your right to choose the tow after an accident or breakdown.`,
      h1: `Tow Trucks in ${city.name} — 24/7 Towing`,
      intro: cityIntro(city, list.length),
      listHeading: `Towing operators in ${city.name}`,
      items: list,
      jsonLd: towJsonLd(path, `Tow Trucks in ${city.name}`, list, city.name, slug),
      links: [
        { href: `/tow-trucks/${slugifyLocation(city.region)}`, label: `All tow trucks in ${city.region}` },
        { href: `/panel-beaters/${slug}`, label: `Panel beaters in ${city.name}` },
        { href: '/tow-trucks', label: 'All New Zealand regions' },
      ],
    });
  }

  // ---------- Panel beaters ----------
  const shops = await fetchRows<Shop>(
    'panel_shops',
    'select=name,address,phone,city,region,google_rating&google_rating=gte.4.5&order=google_rating.desc'
  );
  const byLocation = new Map<string, { name: string; list: Shop[] }>();
  for (const s of shops) {
    for (const label of [s.city, s.region]) {
      if (!label) continue;
      const k = slugifyLocation(label);
      const bucket = byLocation.get(k) ?? { name: label, list: [] };
      bucket.list.push(s);
      byLocation.set(k, bucket);
    }
  }

  for (const [slug, { name, list }] of byLocation) {
    const path = `/panel-beaters/${slug}`;
    pages.push({
      path,
      title: `Panel Beaters in ${name} — ${list.length} Top-Rated Repairers (2026)`,
      description: `Compare ${list.length} highly rated panel beaters and collision repairers in ${name}, New Zealand. Contact details, ratings and how to lodge your claim.`,
      h1: `Panel Beaters in ${name}`,
      intro: `We list ${list.length} highly rated panel beaters and collision repair shops serving ${name}. Every listed repairer holds a Google rating of 4.5 or above. You choose your repairer in New Zealand — your insurer can recommend one, but the decision is yours. Get a written quote and confirm the repair timeline before you authorise work.`,
      listHeading: `Panel beaters in ${name}`,
      items: list.map((s) => ({ name: s.name, address: s.address, phone: s.phone })),
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': `${SAVO_ORIGIN}${path}#repairers`,
            name: `Panel Beaters in ${name}`,
            numberOfItems: list.length,
            itemListElement: list.slice(0, 20).map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'AutoBodyShop',
                name: s.name,
                ...(s.phone ? { telephone: s.phone } : {}),
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: s.address,
                  addressLocality: s.city,
                  addressRegion: s.region,
                  addressCountry: 'NZ',
                },
              },
            })),
          },
          buildPanelBeatersBreadcrumb(slug, name),
        ],
      },
      links: [
        { href: `/tow-trucks/${slug}`, label: `Tow trucks in ${name}` },
        { href: '/panel-beaters', label: 'Panel beaters by city' },
        { href: '/blog/courtesy-cars-not-at-fault-accidents-nz', label: 'Courtesy car rights in NZ' },
      ],
    });
  }

  if (pages.length > MAX_PRERENDER_PAGES) {
    console.warn(`[prerender] capping ${pages.length} pages at ${MAX_PRERENDER_PAGES}`);
    pages.length = MAX_PRERENDER_PAGES;
  }

  for (const p of pages) writePage(template, p);
  console.log(`[prerender] wrote ${pages.length} static pages into ${DIST}`);
}

main().catch((err) => {
  console.error('[prerender] failed', err);
  process.exit(0); // never break the build on a data-fetch failure
});
