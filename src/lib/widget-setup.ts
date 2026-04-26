/**
 * Helpers for issuing & sharing the long-lived widget token with the
 * Android home-screen widget. Web-only callers can also use issueWidgetToken
 * to render a QR / copy-to-clipboard fallback.
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const SHARED_PREFS_FILE = 'savo_widget_prefs';

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function issueWidgetToken(label = 'Phone'): Promise<string> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not signed in');

  const token = randomToken();
  const { error } = await supabase.from('widget_tokens').insert({
    user_id: userId,
    token,
    device_label: label,
  });
  if (error) throw error;
  return token;
}

/**
 * On Android, push the widget token + supabase URL into a SharedPreferences
 * file so the native Glance widget can pick it up. This calls a tiny
 * custom plugin we register at runtime via WebView -> Android bridge,
 * but if the bridge is not present we silently no-op.
 */
export async function writeWidgetCredentialsToDevice(token: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const w = window as any;
    if (w.SavoWidgetBridge?.setCredentials) {
      w.SavoWidgetBridge.setCredentials(
        token,
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      );
      return true;
    }
  } catch (e) {
    console.warn('widget bridge failed', e);
  }
  return false;
}

export async function setupWidget(): Promise<{ token: string; pushed: boolean }> {
  const token = await issueWidgetToken(
    Capacitor.getPlatform() === 'android' ? 'Android phone' : 'iPhone',
  );
  const pushed = await writeWidgetCredentialsToDevice(token);
  return { token, pushed };
}
