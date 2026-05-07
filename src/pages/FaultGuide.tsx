import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Download, FileText, RotateCcw, Scale, Info } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  determineFault,
  type FaultAnswers,
  type CollisionType,
  type Jurisdiction,
  type FaultResult,
} from '@/lib/fault-rules';

type Step = 'jurisdiction' | 'collision' | 'detail' | 'control' | 'context' | 'evasive' | 'result';

const STEP_ORDER: Step[] = ['jurisdiction', 'collision', 'detail', 'control', 'context', 'evasive', 'result'];

const COLLISION_OPTIONS: { value: CollisionType; label: string; svg: JSX.Element }[] = [
  {
    value: 'intersection',
    label: 'Intersection collision',
    svg: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <line x1="8" y1="0" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: 'rearend',
    label: 'Rear-end collision',
    svg: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="6" width="9" height="5" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="7" width="7" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'lanechange',
    label: 'Lane change / merge',
    svg: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M3 12 C3 8 13 8 13 4" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path d="M10 2 L13 4 L10 6" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    value: 'reversing',
    label: 'Reversing collision',
    svg: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M13 8 H4 M7 5 L4 8 L7 11" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    value: 'roundabout',
    label: 'Roundabout collision',
    svg: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
];

interface OptProps<T extends string> {
  value: T;
  selected?: T;
  onSelect: (v: T) => void;
  label: string;
  icon?: JSX.Element;
}

function Option<T extends string>({ value, selected, onSelect, label, icon }: OptProps<T>) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-card hover:border-foreground/30 hover:bg-muted/40'
      }`}
    >
      {icon && (
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}>{icon}</span>
      )}
      <span className="text-sm text-foreground font-medium leading-snug">{label}</span>
    </button>
  );
}

export default function FaultGuide() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Partial<FaultAnswers>>(() => {
    try {
      const stored = localStorage.getItem('savo_fault_jurisdiction') as Jurisdiction | null;
      return stored ? { jurisdiction: stored } : {};
    } catch { return {}; }
  });
  const [stepIdx, setStepIdx] = useState<number>(answers.jurisdiction ? 1 : 0);
  const [result, setResult] = useState<FaultResult | null>(null);

  const step = STEP_ORDER[stepIdx];
  const totalSteps = 6; // exclude 'result' from progress
  const progress = Math.min(100, Math.round((stepIdx / totalSteps) * 100));

  const set = <K extends keyof FaultAnswers>(key: K, value: FaultAnswers[K]) =>
    setAnswers((p) => ({ ...p, [key]: value }));

  const goNext = () => setStepIdx((i) => Math.min(STEP_ORDER.length - 1, i + 1));
  const goBack = () => {
    if (stepIdx === 0) { navigate(-1); return; }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const compute = () => {
    const r = determineFault(answers as FaultAnswers);
    setResult(r);
    setStepIdx(STEP_ORDER.length - 1);
    try { localStorage.setItem('savo_last_fault_result', JSON.stringify({ answers, result: r, at: Date.now() })); } catch {}
  };

  const restart = () => {
    setAnswers(answers.jurisdiction ? { jurisdiction: answers.jurisdiction } : {});
    setResult(null);
    setStepIdx(answers.jurisdiction ? 1 : 0);
  };

  // ---- Step gating ----
  const canContinue = useMemo(() => {
    switch (step) {
      case 'jurisdiction': return !!answers.jurisdiction;
      case 'collision': return !!answers.collision;
      case 'detail': {
        if (answers.collision === 'rearend') return !!answers.follower;
        if (answers.collision === 'lanechange') return !!answers.whoChanged;
        if (answers.collision === 'reversing') return !!answers.whoReversed;
        if (answers.collision === 'roundabout') return !!answers.alreadyInRoundabout;
        if (answers.collision === 'intersection') return !!answers.arrival;
        return false;
      }
      case 'control': {
        // Only required for intersections
        if (answers.collision !== 'intersection') return true;
        return !!answers.control;
      }
      case 'context': {
        if (answers.collision !== 'intersection') return true;
        return !!answers.thirdPartyAction && !!answers.yourAction;
      }
      case 'evasive': return !!answers.evasiveAction;
      default: return false;
    }
  }, [step, answers]);

  // Skip control/context for non-intersection collisions
  const handleNext = () => {
    if (step === 'evasive') { compute(); return; }
    let nextIdx = stepIdx + 1;
    if (answers.collision !== 'intersection') {
      const skip = STEP_ORDER[nextIdx];
      if (skip === 'control' || skip === 'context') {
        nextIdx = STEP_ORDER.indexOf('evasive');
      }
    }
    setStepIdx(nextIdx);
  };

  const visibleStepNumber = useMemo(() => {
    if (step === 'result') return totalSteps;
    let n = stepIdx + 1;
    if (answers.collision && answers.collision !== 'intersection') {
      // collapse: jurisdiction(1) collision(2) detail(3) evasive(4) -> show 4 total
      const map: Record<Step, number> = {
        jurisdiction: 1, collision: 2, detail: 3, control: 0, context: 0, evasive: 4, result: 4,
      };
      n = map[step] || n;
    }
    return n;
  }, [step, stepIdx, answers.collision]);

  const visibleTotal = answers.collision && answers.collision !== 'intersection' ? 4 : 6;

  const shareResult = async () => {
    if (!result) return;
    const text = `SAVO fault assessment\n\n${result.headline}\n${result.explanation}\n\nApplicable rule: ${result.rule.citation}\n\n${result.rule.text}\n\n— Generated by SAVO. This is a guide, not legal advice.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SAVO fault assessment', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Result copied to clipboard');
      }
    } catch {/* ignore */}
  };

  const downloadResult = () => {
    if (!result) return;
    const text = `SAVO Fault Assessment\nGenerated: ${new Date().toLocaleString()}\nJurisdiction: ${answers.jurisdiction}\n\nVerdict: ${result.headline}\n${result.explanation}\n\nApplicable rule:\n${result.rule.citation}\n${result.rule.text}\n\nClaim guidance:\n${result.claimGuidance}\n\nThis is a guide only — not legal advice. Fault is ultimately determined by insurers or a court.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'savo-fault-assessment.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const verdictBg: Record<NonNullable<FaultResult['verdict']>, string> = {
    not_at_fault: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-100',
    at_fault: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-100',
    shared: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100',
    unclear: 'bg-muted border-border text-foreground',
  };

  return (
    <AppLayout>
      <SEO
        title="Fault Determination Guide | SAVO"
        description="Step-by-step fault assessment for car accidents in NZ and Australia, citing the actual road rule. Use as supporting evidence for your claim."
      />
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} aria-label="Back" className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Fault determination guide</h1>
          </div>
        </div>

        {step !== 'result' && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Step {visibleStepNumber} of {visibleTotal}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Step content */}
        <div className="space-y-4">
          {step === 'jurisdiction' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Where did the accident happen?</h2>
              <p className="text-sm text-muted-foreground">Road rules differ between New Zealand and Australia. We'll cite the rule that applies to your jurisdiction.</p>
              <div className="space-y-2">
                <Option value="NZ" selected={answers.jurisdiction} onSelect={(v) => { set('jurisdiction', v); try { localStorage.setItem('savo_fault_jurisdiction', v); } catch {} }} label="New Zealand" />
                <Option value="AU" selected={answers.jurisdiction} onSelect={(v) => { set('jurisdiction', v); try { localStorage.setItem('savo_fault_jurisdiction', v); } catch {} }} label="Australia" />
              </div>
            </>
          )}

          {step === 'collision' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">What type of collision occurred?</h2>
              <p className="text-sm text-muted-foreground">Pick the scenario that best matches your situation.</p>
              <div className="space-y-2">
                {COLLISION_OPTIONS.map((c) => (
                  <Option key={c.value} value={c.value} selected={answers.collision} onSelect={(v) => set('collision', v)} label={c.label} icon={c.svg} />
                ))}
              </div>
            </>
          )}

          {step === 'detail' && answers.collision === 'intersection' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Which vehicle entered the intersection first?</h2>
              <p className="text-sm text-muted-foreground">A visual of the geometry helps map your scenario to the correct rule.</p>
              <Card className="p-3 bg-muted/40">
                <svg viewBox="0 0 240 90" className="w-full h-24">
                  <line x1="120" y1="0" x2="120" y2="90" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" />
                  <line x1="0" y1="45" x2="240" y2="45" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" />
                  <rect x="85" y="28" width="24" height="34" rx="5" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="1" />
                  <text x="97" y="48" textAnchor="middle" fontSize="9" fill="hsl(var(--primary))" fontWeight="600">You</text>
                  <rect x="132" y="28" width="24" height="34" rx="5" fill="hsl(var(--destructive)/0.18)" stroke="hsl(var(--destructive))" strokeWidth="1" />
                  <text x="144" y="48" textAnchor="middle" fontSize="9" fill="hsl(var(--destructive))" fontWeight="600">3P</text>
                </svg>
              </Card>
              <div className="space-y-2">
                <Option value="you_first" selected={answers.arrival} onSelect={(v) => set('arrival', v)} label="I arrived and was in the intersection first" />
                <Option value="they_first" selected={answers.arrival} onSelect={(v) => set('arrival', v)} label="The other vehicle arrived first" />
                <Option value="simultaneous" selected={answers.arrival} onSelect={(v) => set('arrival', v)} label="We arrived at roughly the same time" />
              </div>
            </>
          )}

          {step === 'detail' && answers.collision === 'rearend' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Were you the following vehicle?</h2>
              <p className="text-sm text-muted-foreground">The driver who rear-ends another vehicle is almost always considered at fault.</p>
              <div className="space-y-2">
                <Option value="them" selected={answers.follower} onSelect={(v) => set('follower', v)} label="No — I was hit from behind" />
                <Option value="you" selected={answers.follower} onSelect={(v) => set('follower', v)} label="Yes — I was following the other vehicle" />
              </div>
            </>
          )}

          {step === 'detail' && answers.collision === 'lanechange' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Who was changing lanes?</h2>
              <p className="text-sm text-muted-foreground">A driver changing lanes must give way to vehicles already in the destination lane.</p>
              <div className="space-y-2">
                <Option value="them" selected={answers.whoChanged} onSelect={(v) => set('whoChanged', v)} label="The other driver moved into my lane" />
                <Option value="you" selected={answers.whoChanged} onSelect={(v) => set('whoChanged', v)} label="I was changing lanes" />
              </div>
            </>
          )}

          {step === 'detail' && answers.collision === 'reversing' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Which vehicle was reversing?</h2>
              <p className="text-sm text-muted-foreground">The reversing driver must give way to all other road users.</p>
              <div className="space-y-2">
                <Option value="them" selected={answers.whoReversed} onSelect={(v) => set('whoReversed', v)} label="The other vehicle was reversing" />
                <Option value="you" selected={answers.whoReversed} onSelect={(v) => set('whoReversed', v)} label="I was reversing" />
                <Option value="both" selected={answers.whoReversed} onSelect={(v) => set('whoReversed', v)} label="Both vehicles were reversing" />
              </div>
            </>
          )}

          {step === 'detail' && answers.collision === 'roundabout' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Who was already in the roundabout?</h2>
              <p className="text-sm text-muted-foreground">Drivers entering a roundabout must give way to all vehicles already on it.</p>
              <div className="space-y-2">
                <Option value="you" selected={answers.alreadyInRoundabout} onSelect={(v) => set('alreadyInRoundabout', v)} label="I was already in the roundabout" />
                <Option value="them" selected={answers.alreadyInRoundabout} onSelect={(v) => set('alreadyInRoundabout', v)} label="The other vehicle was already in" />
                <Option value="neither" selected={answers.alreadyInRoundabout} onSelect={(v) => set('alreadyInRoundabout', v)} label="We both entered at the same time" />
              </div>
            </>
          )}

          {step === 'control' && answers.collision === 'intersection' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Were traffic signals or signs present?</h2>
              <p className="text-sm text-muted-foreground">This determines which rule applies.</p>
              <div className="space-y-2">
                <Option value="lights" selected={answers.control} onSelect={(v) => set('control', v)} label="Traffic lights" />
                <Option value="giveway" selected={answers.control} onSelect={(v) => set('control', v)} label="Give Way sign" />
                <Option value="stop" selected={answers.control} onSelect={(v) => set('control', v)} label="Stop sign" />
                <Option value="none" selected={answers.control} onSelect={(v) => set('control', v)} label="No signs or signals (uncontrolled)" />
              </div>
            </>
          )}

          {step === 'context' && answers.collision === 'intersection' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">What were both drivers doing?</h2>
              <p className="text-sm text-muted-foreground">Tell us your action and the other driver's action.</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">You were…</p>
                <div className="space-y-2">
                  <Option value="proceeding" selected={answers.yourAction} onSelect={(v) => set('yourAction', v)} label="Proceeding straight through" />
                  <Option value="turning_right" selected={answers.yourAction} onSelect={(v) => set('yourAction', v)} label="Turning right" />
                  <Option value="turning_left" selected={answers.yourAction} onSelect={(v) => set('yourAction', v)} label="Turning left" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-4">The other driver was…</p>
                <div className="space-y-2">
                  <Option value="turning_right" selected={answers.thirdPartyAction} onSelect={(v) => set('thirdPartyAction', v)} label="Turning right across my path" />
                  <Option value="running_red" selected={answers.thirdPartyAction} onSelect={(v) => set('thirdPartyAction', v)} label="Ran a red light or stop sign" />
                  <Option value="proceeding" selected={answers.thirdPartyAction} onSelect={(v) => set('thirdPartyAction', v)} label="Proceeding straight through" />
                  <Option value="unknown" selected={answers.thirdPartyAction} onSelect={(v) => set('thirdPartyAction', v)} label="Unclear / I'm not sure" />
                </div>
              </div>
            </>
          )}

          {step === 'evasive' && (
            <>
              <h2 className="text-lg font-semibold text-foreground leading-snug">Did you take any evasive action?</h2>
              <p className="text-sm text-muted-foreground">Braking, swerving, or horn use can support your version of events.</p>
              <div className="space-y-2">
                <Option value="braked" selected={answers.evasiveAction} onSelect={(v) => set('evasiveAction', v)} label="Yes — I braked hard" />
                <Option value="swerved" selected={answers.evasiveAction} onSelect={(v) => set('evasiveAction', v)} label="Yes — I swerved to avoid" />
                <Option value="no_time" selected={answers.evasiveAction} onSelect={(v) => set('evasiveAction', v)} label="No — there was no time to react" />
                <Option value="unaware" selected={answers.evasiveAction} onSelect={(v) => set('evasiveAction', v)} label="No — I was unaware until impact" />
              </div>
            </>
          )}

          {step !== 'result' && (
            <Button className="w-full mt-2" disabled={!canContinue} onClick={handleNext}>
              {step === 'evasive' ? 'See result' : 'Continue'}
            </Button>
          )}

          {step === 'result' && result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assessment complete</p>
              <Card className={`p-4 border ${verdictBg[result.verdict]}`}>
                <p className="text-base font-semibold leading-snug">{result.headline}</p>
                <p className="text-sm mt-1 leading-relaxed opacity-90">{result.explanation}</p>
              </Card>

              <Card className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Applicable rule</p>
                <p className="text-sm font-semibold text-foreground">{result.rule.citation}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.rule.text}</p>
              </Card>

              <Card className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">What this means for your claim</p>
                <p className="text-sm text-foreground leading-relaxed">{result.claimGuidance}</p>
              </Card>

              <Card className="p-3 bg-muted/40 border-dashed">
                <p className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>This is a guide based on the road rules — not legal advice. Final liability is determined by insurers or a court. Use this assessment as supporting evidence alongside photos, dashcam footage and witness details.</span>
                </p>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={shareResult}><Share2 className="w-4 h-4" />Share</Button>
                <Button variant="outline" onClick={downloadResult}><Download className="w-4 h-4" />Download</Button>
              </div>
              <Button asChild className="w-full">
                <Link to="/claims/new"><FileText className="w-4 h-4" />Add to a new report</Link>
              </Button>
              <Button variant="ghost" className="w-full" onClick={restart}><RotateCcw className="w-4 h-4" />Start over</Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
