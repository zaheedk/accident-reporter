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
  await ensureInit();
  const result = await GoogleAuth.signIn();
  const idToken = result.authentication?.idToken;
  if (!idToken) throw new Error('No ID token returned from Google');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
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
