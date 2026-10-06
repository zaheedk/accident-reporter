import { describe, it, expect } from 'vitest';
import { verdictToAtFault } from './fault-handoff';

describe('verdictToAtFault', () => {
  it('not at fault means the other party is at fault', () => expect(verdictToAtFault('not_at_fault')).toBe('other_party'));
  it('at fault means me', () => expect(verdictToAtFault('at_fault')).toBe('me'));
  it('shared stays shared', () => expect(verdictToAtFault('shared')).toBe('shared'));
  it('unclear leaves the field blank', () => expect(verdictToAtFault('unclear')).toBe(''));
});
