import { describe, expect, it } from 'vitest';
import { canDeleteClaim } from './claim-status';

describe('report deletion permissions', () => {
  it('does not allow deletion of submitted reports', () => expect(canDeleteClaim('submitted')).toBe(false));
  it('allows deletion after changing to draft', () => expect(canDeleteClaim('draft')).toBe(true));
  it('allows deletion after changing to saved', () => expect(canDeleteClaim('saved')).toBe(true));
  it('rejects unknown statuses', () => expect(canDeleteClaim('')).toBe(false));
});