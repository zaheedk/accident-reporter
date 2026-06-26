import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '@/integrations/supabase/client';

const WEB_CLIENT_ID = '801226493928-0uq06s4htaufogc6ra2h1t9j1tog2rfl.apps.googleusercontent.com';
const IOS_CLIENT_ID = '801226493928-qfmd617k557j8ktmrgp3mvbk36rgl7ao.apps.googleusercontent.com';

let initialized = false;

export const isNativeApp = () => Capacitor.isNativePlatform();

function createNonce(length = 64) {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, value => charset[value % charset.length]).join('');
}

async function sha256Hex(message: string) {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createNoncePair() {
  const rawNonce = createNonce();
  const nonceDigest = await sha256Hex(rawNonce);
  return { rawNonce, nonceDigest };
}

function getJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getTokenString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object' && 'token' in value) {
    const token = (value as { token?: unknown }).token;
    if (typeof token === 'string' && token.length > 0) return token;
  }
  return undefined;
}

function isNonceExistenceError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return message.includes('Passed nonce and nonce in id_token should either both exist or not');
}

async function ensureInit() {
  if (initialized) return;
  await SocialLogin.initialize({
    google: {
      webClientId: WEB_CLIENT_ID,
      iOSClientId: IOS_CLIENT_ID,
      iOSServerClientId: WEB_CLIENT_ID,
      mode: 'online',
    },
  });
  initialized = true;
}

/**
 * Native Google sign-in (Android/iOS). Uses the native account picker
 * and exchanges the Google ID token for a Supabase session — no browser redirect.
 */
export async function signInWithGoogleNative() {
  try {
    await ensureInit();
  } catch (err: any) {
    console.error('[GoogleAuth] init failed:', err);
    throw new Error(`Google init failed: ${err?.message || JSON.stringify(err)}`);
  }

  let result: any;
  const { rawNonce, nonceDigest } = await createNoncePair();
  try {
    result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile', 'openid'],
        nonce: nonceDigest,
        forcePrompt: true,
      },
    });
    console.log('[GoogleAuth] login completed:', {
      provider: result?.provider,
      hasIdToken: !!(result?.result?.idToken || result?.idToken),
      hasAccessToken: !!(result?.result?.authentication?.accessToken || result?.accessToken),
    });
  } catch (err: any) {
    console.error('[GoogleAuth] login threw:', err);
    const detail = {
      message: err?.message,
      code: err?.code,
      errorMessage: err?.errorMessage,
      error: err?.error,
      stack: err?.stack,
      raw: (() => { try { return JSON.stringify(err); } catch { return String(err); } })(),
    };
    console.error('[GoogleAuth] error detail:', JSON.stringify(detail));
    const human =
      err?.code === '10' || err?.message?.includes('DEVELOPER_ERROR')
        ? 'DEVELOPER_ERROR — the SHA-1 fingerprint or package name registered in Google Cloud does not match this APK. Check your Android OAuth client.'
        : err?.code === '12501' || err?.message?.includes('12501') || err?.message?.toLowerCase?.().includes('cancel')
        ? 'Sign-in cancelled by user.'
        : err?.code === '7' || err?.message?.includes('NETWORK_ERROR')
        ? 'Network error — check internet connection.'
        : err?.message || err?.errorMessage || err?.error || JSON.stringify(detail);
    throw new Error(`Google sign-in failed: ${human}`);
  }

  const idToken = getTokenString(result?.result?.idToken || result?.idToken);
  const accessToken = getTokenString(
    result?.result?.accessToken ||
    result?.result?.authentication?.accessToken ||
    result?.accessToken
  );
  if (!idToken) {
    console.error('[GoogleAuth] no idToken in result:', result);
    throw new Error('Google sign-in failed: no ID token returned (check webClientId is the WEB client ID, not Android).');
  }

  const tokenPayload = getJwtPayload(idToken);
  const tokenHasNonce = typeof tokenPayload?.nonce === 'string' && tokenPayload.nonce.length > 0;
  if (tokenHasNonce && tokenPayload?.nonce !== nonceDigest) {
    console.error('[GoogleAuth] nonce mismatch:', { tokenHasNonce, expectedDigest: nonceDigest });
    throw new Error('Google sign-in failed: nonce mismatch. Please try again.');
  }

  const exchangeToken = (includeNonce: boolean) => supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    ...(accessToken ? { access_token: accessToken } : {}),
    ...(includeNonce ? { nonce: rawNonce } : {}),
  });

  let { data, error } = await exchangeToken(tokenHasNonce);

  // Some iOS Google SDK/plugin combinations return a token whose nonce claim
  // cannot be decoded reliably in the WebView before exchange. If the backend
  // says the nonce presence is opposite to what we detected locally, retry once
  // with the other shape; nonce value mismatches are still rejected.
  if (error && isNonceExistenceError(error)) {
    ({ data, error } = await exchangeToken(!tokenHasNonce));
  }

  if (error) {
    console.error('[GoogleAuth] supabase exchange failed:', error);
    throw new Error(`Google sign-in failed (Supabase): ${error.message}`);
  }
  return data;
}

export async function signOutGoogleNative() {
  if (!initialized) return;
  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    /* ignore */
  }
}
