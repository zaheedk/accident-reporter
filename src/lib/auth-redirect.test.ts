import { describe, expect, it } from 'vitest';
import { isProtectedRoute, oauthReturnUrl } from './auth-redirect';

describe('sign-in return addresses', () => {
  it('returns the public site root for every origin', () => {
    expect(oauthReturnUrl('https://www.savo.co.nz')).toBe('https://www.savo.co.nz/');
    expect(oauthReturnUrl('https://savo.co.nz/')).toBe('https://savo.co.nz/');
    expect(oauthReturnUrl('http://localhost:8080')).toBe('http://localhost:8080/');
  });

  it('never points at a page that requires sign-in', () => {
    for (const origin of ['https://www.savo.co.nz', 'http://localhost:8080']) {
      const returnedPath = new URL(oauthReturnUrl(origin)).pathname;
      expect(isProtectedRoute(returnedPath)).toBe(false);
    }
  });

  it('flags signed-in pages so they cannot be used as return addresses', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true);
    expect(isProtectedRoute('/claims/CLM-0394/edit')).toBe(true);
    expect(isProtectedRoute('/admin/seo')).toBe(true);
    expect(isProtectedRoute('/fault-quiz')).toBe(false);
    expect(isProtectedRoute('/account-deletion')).toBe(false);
    expect(isProtectedRoute('/blog?page=2')).toBe(false);
  });
});
