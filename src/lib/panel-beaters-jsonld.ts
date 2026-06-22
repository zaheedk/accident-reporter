// Pure builders for /panel-beaters/{slug} JSON-LD.
// Kept free of React/Supabase imports so the build-time validator
// (scripts/validate-jsonld.ts) can import and execute them in Node.

/** Canonical origin used in BreadcrumbList item URLs. MUST match src/components/SEO.tsx. */
export const SAVO_ORIGIN = 'https://www.savo.co.nz';

export type BreadcrumbItem = {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
};

export type BreadcrumbList = {
  '@type': 'BreadcrumbList';
  '@id': string;
  itemListElement: BreadcrumbItem[];
};

/** Build the BreadcrumbList node for a city page. */
export function buildPanelBeatersBreadcrumb(slug: string, locationName: string): BreadcrumbList {
  const pageUrl = `${SAVO_ORIGIN}/panel-beaters/${slug}`;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SAVO_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Panel Beaters', item: `${SAVO_ORIGIN}/panel-beaters` },
      { '@type': 'ListItem', position: 3, name: locationName, item: pageUrl },
    ],
  };
}
