import { describe, it, expect } from 'vitest';
import { goalProgress, pctChange, MONTHLY_CLICK_GOAL } from './seo-progress';

describe('seo progress', () => {
  it('goal is 1,000 monthly visitors', () => expect(MONTHLY_CLICK_GOAL).toBe(1000));
  it('250 clicks is 25% of goal', () => expect(goalProgress(250)).toBe(25));
  it('caps at 100%', () => expect(goalProgress(1500)).toBe(100));
  it('change with no baseline is null', () => expect(pctChange(10, 0)).toBeNull());
  it('100 -> 150 is +50%', () => expect(pctChange(150, 100)).toBe(50));
});
