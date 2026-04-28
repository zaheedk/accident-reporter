/**
 * Helpers for issuing & sharing the long-lived widget token with the
 * Android home-screen widget. Web-only callers can also use issueWidgetToken
 * to render a QR / copy-to-clipboard fallback.
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { getCached } from '@/lib/offline-cache';
import type { Vehicle } from '@/types';

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

function normaliseWidgetVehicle(row: any) {
  const make = row.make ?? '';
  const model = row.model ?? '';
  return {
    rego: row.regoNumber ?? row.rego_number ?? '',
    make,
    model,
    nickname: [make, model].filter(Boolean).join(' ').trim(),
    regoExpiry: row.regoExpiry ?? row.rego_expiry ?? '',
    wofExpiry: row.wofExpiry ?? row.wof_expiry ?? '',
    insuranceExpiry: row.insuranceExpiry ?? row.insurance_expiry ?? '',
    roadsideName: row.roadsideProvider ?? row.roadside_provider ?? 'Roadside',
    roadsidePhone: row.roadsidePhone ?? row.roadside_phone ?? '',
    isDefault: Boolean(row.isDefault ?? row.is_default),
  };
}

export async function writeWidgetVehiclesToDevice(vehicles: any[]): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const mapped = vehicles
      .filter((v) => (v.isActive ?? v.is_active ?? true) !== false)
      .map(normaliseWidgetVehicle)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    const w = window as any;
    if (w.SavoWidgetBridge?.setVehicles) {
      w.SavoWidgetBridge.setVehicles(JSON.stringify(mapped));
      return true;
    }
  } catch (e) {
    console.warn('widget vehicle bridge failed', e);
  }
  return false;
}

export async function syncWidgetVehiclesFromStorage(userId: string): Promise<boolean> {
  const cached = await getCached<Array<Vehicle | Record<string, unknown>>>(`vehicles:${userId}`);
  if (!cached) return false;
  return writeWidgetVehiclesToDevice(cached);
}

/**
 * Asks Android to pin the SAVO widget on the user's home screen. Returns the
 * status string from the native bridge ("ok" | "unsupported" | "old_os" |
 * "error:..."), or "no_bridge" when called outside the native app.
 */
export function requestPinWidget(): string {
  if (!Capacitor.isNativePlatform()) return 'no_bridge';
  try {
    const w = window as any;
    if (w.SavoWidgetBridge?.requestPinWidget) {
      return w.SavoWidgetBridge.requestPinWidget();
    }
  } catch (e) {
    console.warn('requestPinWidget failed', e);
    return 'error';
  }
  return 'no_bridge';
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
    if (pushed) void syncWidgetVehiclesFromStorage(userRes.user.id);
    if (pushed) localStorage.setItem(AUTO_SETUP_FLAG, '1');
  } catch (e) {
    console.warn('widget auto-setup failed', e);
  }
}
