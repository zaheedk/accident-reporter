/** Monthly visitor goal the SEO dashboard measures progress against. */
export const MONTHLY_CLICK_GOAL = 1000;

/** Percentage of the monthly goal reached by 28-day clicks, capped at 100. */
export function goalProgress(clicks28d: number, goal = MONTHLY_CLICK_GOAL): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((clicks28d / goal) * 100));
}

/** Percent change between periods; null when there's no previous baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
