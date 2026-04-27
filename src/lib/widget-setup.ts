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

const AUTO_SETUP_FLAG = 'savo_widget_auto_setup_done';

/**
 * Runs once per device: when the user first signs in on the native app, issue
 * a widget token and push it into native storage so the home-screen widget
 * works without the user ever visiting /widget-setup.
 */
export async function ensureWidgetAutoSetup(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (localStorage.getItem(AUTO_SETUP_FLAG) === '1') return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user?.id) return;

    // Reuse an existing valid token if one exists for this user
    const { data: existing } = await supabase
      .from('widget_tokens')
      .select('token, expires_at')
      .eq('user_id', userRes.user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let token = existing?.token as string | undefined;
    if (!token) {
      token = await issueWidgetToken(
        Capacitor.getPlatform() === 'android' ? 'Android phone' : 'iPhone',
      );
    }
    const pushed = await writeWidgetCredentialsToDevice(token);
    if (pushed) localStorage.setItem(AUTO_SETUP_FLAG, '1');
  } catch (e) {
    console.warn('widget auto-setup failed', e);
  }
}
