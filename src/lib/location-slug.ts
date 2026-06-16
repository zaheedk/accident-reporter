/** Slugify a location string for URLs. e.g. "Lower Hutt" -> "lower-hutt", "Hawke's Bay" -> "hawkes-bay" */
export function slugifyLocation(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Title-case for display fallback when the page is hit with an unknown slug. */
export function titleizeSlug(slug: string): string {
  return (slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
