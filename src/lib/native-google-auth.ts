import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from '@/integrations/supabase/client';

let initialized = false;

export const isNativeApp = () => Capacitor.isNativePlatform();

async function ensureInit() {
  if (initialized) return;
  await GoogleAuth.initialize({
    clientId: '801226493928-0uq06s4htaufogc6ra2h1t9j1tog2rfl.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
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
  try {
    result = await GoogleAuth.signIn();
    console.log('[GoogleAuth] signIn raw result:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    // Surface every available field so we can see DEVELOPER_ERROR / 10 / 12501 etc.
    console.error('[GoogleAuth] signIn threw:', err);
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
        : err?.code === '12501' || err?.message?.includes('12501')
        ? 'Sign-in cancelled by user.'
        : err?.code === '7' || err?.message?.includes('NETWORK_ERROR')
        ? 'Network error — check internet connection.'
        : err?.message || err?.errorMessage || err?.error || JSON.stringify(detail);
    throw new Error(`Google sign-in failed: ${human}`);
  }

  const idToken = result?.authentication?.idToken;
  if (!idToken) {
    console.error('[GoogleAuth] no idToken in result:', result);
    throw new Error('Google sign-in failed: no ID token returned (check serverClientId is the WEB client ID, not Android).');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) {
    console.error('[GoogleAuth] supabase exchange failed:', error);
    throw new Error(`Google sign-in failed (Supabase): ${error.message}`);
  }
  return data;
}

export async function signOutGoogleNative() {
  if (!initialized) return;
  try {
    await GoogleAuth.signOut();
  } catch {
    /* ignore */
  }
}
