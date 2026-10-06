import type { FaultResult } from './fault-rules';

const KEY = 'savo:fault-assessment';

/** Maps a fault-checker verdict onto the claim form's "Who is at fault?" value. */
export function verdictToAtFault(v: FaultResult['verdict']): '' | 'me' | 'other_party' | 'shared' {
  if (v === 'not_at_fault') return 'other_party';
  if (v === 'at_fault') return 'me';
  if (v === 'shared') return 'shared';
  return '';
}

export function saveFaultHandoff(r: FaultResult) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      atFault: verdictToAtFault(r.verdict),
      blameDescription: `${r.explanation}\n\nApplicable rule: ${r.rule.citation} — ${r.rule.text}\n(SAVO fault guide — general information, not legal advice.)`,
    }));
  } catch { /* ignore */ }
}

export function takeFaultHandoff(): { atFault: string; blameDescription: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    return JSON.parse(raw);
  } catch { return null; }
}
