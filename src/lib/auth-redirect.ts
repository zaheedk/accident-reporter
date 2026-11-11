// OAuth return addresses must point at a page anyone can open. A signed-in-only
// page runs its guard before the sign-in code in the URL has been swapped for a
// session, so the user gets bounced straight back to the sign-in screen.
const PROTECTED_ROUTE_PREFIXES = [
  '/admin',
  '/broker',
  '/claims',
  '/dashboard',
  '/delete-account',
  '/delete-data-request',
  '/documents',
  '/family',
  '/fleet',
  '/hazard-radar',
  '/profile',
  '/rental-partner',
  '/shop',
  '/users',
  '/vehicles',
  '/widget-setup',
];

export function isProtectedRoute(path: string): boolean {
  const clean = (path.split('?')[0] ?? '/').split('#')[0] || '/';
  return PROTECTED_ROUTE_PREFIXES.some(
    prefix => clean === prefix || clean.startsWith(`${prefix}/`),
  );
}

// Full same-origin public URL the provider is allowed to bring people back to.
// The signed-in redirect happens in the app once the session is confirmed.
export function oauthReturnUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/`;
}
