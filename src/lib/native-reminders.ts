import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';
import { DAILY_QUIZ_ID, expiryReminderPlan, readReminderPreferences, type ExpiryAsset } from './reminder-plan';

export async function cancelNativeReminders() {
  const { notifications } = await LocalNotifications.getPending();
  const owned = notifications.filter(n => n.id >= DAILY_QUIZ_ID && n.id <= DAILY_QUIZ_ID + 60);
  if (owned.length) await LocalNotifications.cancel({ notifications: owned });
}

let revision = 0;
let queue: Promise<void> = Promise.resolve();
export function refreshNativeReminders(userId: string | null) {
  const current = ++revision;
  const next = queue.catch(() => {}).then(async () => {
    if (current !== revision) return;
    const preferences = userId ? readReminderPreferences(userId) : { quiz: false, expiry: false };
    const assets: ExpiryAsset[] = [];
    if (userId && preferences.expiry) {
      const [vehicles, profile] = await Promise.all([
        supabase.from('vehicles').select('rego_number,wof_expiry,rego_expiry,insurance_expiry').eq('user_id', userId),
        supabase.from('profiles').select('license_expiry').eq('user_id', userId).maybeSingle(),
      ]);
      if (vehicles.error) throw vehicles.error;
      if (profile.error) throw profile.error;
      for (const vehicle of vehicles.data || []) {
        for (const [label, expiry] of [['WOF', vehicle.wof_expiry], ['Registration', vehicle.rego_expiry], ['Insurance', vehicle.insurance_expiry]]) {
          if (expiry) assets.push({ label: `${label} (${vehicle.rego_number})`, expiry, url: '/vehicles' });
        }
      }
      if (profile.data?.license_expiry) assets.push({ label: 'Driver licence', expiry: profile.data.license_expiry, url: '/profile' });
    }
    if (current !== revision) return;
    await cancelNativeReminders();
    if (!userId || (await LocalNotifications.checkPermissions()).display !== 'granted') return;
    const notifications = expiryReminderPlan(assets).map((item, index) => ({
      id: DAILY_QUIZ_ID + index + 1, title: item.title, body: item.body,
      schedule: { at: item.at, allowWhileIdle: true }, extra: { url: item.url }, isExactNotification: false,
    }));
    if (preferences.quiz) {
      await LocalNotifications.schedule({ notifications: [{
        id: DAILY_QUIZ_ID, title: 'Your daily NZ road & rights quiz',
        body: 'Three new questions are ready.', schedule: { on: { hour: 8, minute: 0 }, repeats: true },
        extra: { url: '/fault-quiz' }, isExactNotification: false,
      }] });
    }
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  });
  queue = next;
  return next;
}