// Pure builders for /tow-trucks/{slug} JSON-LD.
// Kept free of React/Supabase imports so the build-time validator
// (scripts/validate-jsonld.ts) can import and execute them in Node.

import { SAVO_ORIGIN, type BreadcrumbList } from './panel-beaters-jsonld';

export { SAVO_ORIGIN };

/** Build the BreadcrumbList node for a tow-trucks region page. */
export function buildTowTrucksBreadcrumb(slug: string, regionName: string): BreadcrumbList {
  const pageUrl = `${SAVO_ORIGIN}/tow-trucks/${slug}`;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SAVO_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Tow Trucks', item: `${SAVO_ORIGIN}/tow-trucks` },
      { '@type': 'ListItem', position: 3, name: regionName, item: pageUrl },
    ],
  };
}
