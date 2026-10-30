export const REMINDER_DAYS = [30, 14, 7, 3, 1];
export const DAILY_QUIZ_ID = 700000;
export type ReminderKind = 'quiz' | 'expiry';
export type ReminderPreferences = { quiz: boolean; expiry: boolean };
export type ExpiryAsset = { label: string; expiry: string; url: string };

export function expiryReminderPlan(assets: ExpiryAsset[], now = new Date()) {
  return assets.flatMap(asset => REMINDER_DAYS.flatMap(days => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asset.expiry)) return [];
    const at = new Date(`${asset.expiry}T08:00:00`);
    at.setDate(at.getDate() - days);
    if (!Number.isFinite(at.getTime()) || at <= now) return [];
    return [{ title: `${asset.label} expires ${days === 1 ? 'tomorrow' : `in ${days} days`}`,
      body: `Expiry date: ${asset.expiry}. Please arrange renewal.`, at, url: asset.url, days }];
  })).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}

export function readReminderPreferences(userId: string): ReminderPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(`savo:reminders:${userId}`) || '{}');
    return { quiz: value.quiz === true, expiry: value.expiry === true };
  } catch { return { quiz: false, expiry: false }; }
}