import { describe, it, expect, beforeEach } from 'vitest';
import { expiryReminderPlan, readReminderPreferences } from './reminder-plan';

describe('expiry reminder dates', () => {
  it('schedules one-month notice at 8am and subsequent existing reminder windows', () => {
    const plan = expiryReminderPlan([{ label: 'WOF', expiry: '2026-11-30', url: '/vehicles' }], new Date(2026, 9, 29));
    expect(plan.map(p => p.days)).toEqual([30, 14, 7, 3, 1]);
    expect(plan[0].at.getDate()).toBe(31);
    expect(plan[0].at.getHours()).toBe(8);
    expect(plan[4].at.getDate()).toBe(29);
  });
  it('does not schedule expired dates or empty expiry strings', () => {
    expect(expiryReminderPlan([{ label: 'WOF', expiry: '', url: '/vehicles' }, { label: 'Rego', expiry: '2026-01-01', url: '/vehicles' }], new Date(2026, 9, 30))).toEqual([]);
  });
});
describe('separate reminder choices', () => {
  beforeEach(() => localStorage.clear());
  it('turning quiz off leaves expiry reminders on', () => {
    localStorage.setItem('savo:reminders:alice', JSON.stringify({ quiz: false, expiry: true }));
    expect(readReminderPreferences('alice')).toEqual({ quiz: false, expiry: true });
    expect(readReminderPreferences('bob')).toEqual({ quiz: false, expiry: false });
  });
});