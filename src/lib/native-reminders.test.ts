import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  schedule: vi.fn(), cancel: vi.fn(), pending: vi.fn(), permissions: vi.fn(), from: vi.fn(),
}));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  schedule: mocks.schedule, cancel: mocks.cancel, getPending: mocks.pending, checkPermissions: mocks.permissions,
} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { refreshNativeReminders } from './native-reminders';
import { DAILY_QUIZ_ID } from './reminder-plan';

describe('native notification delivery preparation', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    mocks.pending.mockResolvedValue({ notifications: [] });
    mocks.permissions.mockResolvedValue({ display: 'granted' });
    mocks.schedule.mockResolvedValue({}); mocks.cancel.mockResolvedValue({});
    mocks.from.mockImplementation((table: string) => {
      const result = table === 'vehicles' ? { data: [{ rego_number: 'ABC123', wof_expiry: '2099-12-31', rego_expiry: '', insurance_expiry: '' }], error: null }
        : { data: { license_expiry: '' }, error: null };
      return { select: () => ({ eq: () => Object.assign(Promise.resolve(result), { maybeSingle: () => Promise.resolve(result) }) }) };
    });
  });
  it('schedules the opted-in quiz daily at 8am without expiry reminders', async () => {
    localStorage.setItem('savo:reminders:alice', JSON.stringify({ quiz: true, expiry: false }));
    await refreshNativeReminders('alice');
    expect(mocks.schedule).toHaveBeenCalledWith({ notifications: [expect.objectContaining({ id: DAILY_QUIZ_ID, schedule: { on: { hour: 8, minute: 0 }, repeats: true }, extra: { url: '/fault-quiz' } })] });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('schedules vehicle expiries with quiz off and reads only the signed-in user', async () => {
    localStorage.setItem('savo:reminders:alice', JSON.stringify({ quiz: false, expiry: true }));
    await refreshNativeReminders('alice');
    const scheduled = mocks.schedule.mock.calls[0][0].notifications;
    expect(scheduled).toHaveLength(5);
    expect(scheduled.every((n: { id: number }) => n.id !== DAILY_QUIZ_ID)).toBe(true);
    expect(scheduled[0].title).toContain('ABC123');
  });
  it('cancels reminders on sign-out without cancelling unrelated notifications', async () => {
    mocks.pending.mockResolvedValue({ notifications: [{ id: DAILY_QUIZ_ID }, { id: DAILY_QUIZ_ID + 1 }, { id: 12 }] });
    await refreshNativeReminders(null);
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: DAILY_QUIZ_ID }, { id: DAILY_QUIZ_ID + 1 }] });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('does not schedule notifications when the phone denies permission', async () => {
    localStorage.setItem('savo:reminders:alice', JSON.stringify({ quiz: true, expiry: false }));
    mocks.permissions.mockResolvedValue({ display: 'denied' });
    await refreshNativeReminders('alice');
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
});