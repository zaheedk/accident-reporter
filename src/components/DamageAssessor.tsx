import { useEffect, useState } from 'react';
import { Sparkles, Loader2, ShieldCheck, AlertTriangle, RefreshCw, Share2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Zone = { part: string; severity: 'minor' | 'moderate' | 'severe'; description?: string };
type Assessment = {
  id: string;
  claim_id: string;
  overall_severity: string;
  zones_count: number;
  confidence: number;
  cost_low: number;
  cost_high: number;
  currency: string;
  zones: Zone[];
  notes: string;
  created_at: string;
};

const sevClass = (s: string) =>
  s === 'severe' ? 'bg-destructive/10 text-destructive'
  : s === 'moderate' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';

const sevLabel = (s: string) => s === 'severe' ? 'Severe' : s === 'moderate' ? 'Moderate' : 'Minor';

const fmtNZD = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-NZ');

interface Props {
  claimId: string;
  hasPhotos: boolean;
}

export default function DamageAssessor({ claimId, hasPhotos }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('damage_assessments')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (alive) {
        setAssessment(data as any);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [claimId]);

  const runAnalysis = async () => {
    if (!hasPhotos) { toast.error('Add damage photos first'); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('assess-damage', { body: { claimId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAssessment((data as any).assessment);
      toast.success('Damage assessment ready');
    } catch (e: any) {
      toast.error(e?.message || 'Assessment failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-2">Loading assessment…</div>;
  }

  if (!assessment) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center">
          <div className="w-11 h-11 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="text-sm font-semibold text-foreground mb-1">AI damage assessment</div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 max-w-xs mx-auto">
            Get an instant repair estimate from your damage photos — based on NZ panel-shop rates.
          </p>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!hasPhotos || running}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {running ? 'Analysing photos…' : 'Run AI assessment'}
          </button>
          {!hasPhotos && (
            <p className="text-[11px] text-muted-foreground mt-2">Upload damage photos above to enable.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <div className={`text-lg font-semibold ${assessment.overall_severity === 'severe' ? 'text-destructive' : assessment.overall_severity === 'moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {sevLabel(assessment.overall_severity)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Severity</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <div className="text-lg font-semibold text-foreground tabular-nums">{assessment.zones_count}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Zones</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <div className="text-lg font-semibold text-foreground tabular-nums flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {assessment.confidence}%
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Confidence</div>
        </div>
      </div>

      {/* Cost band */}
      <div className="rounded-xl border border-border bg-background p-3.5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Estimated repair range</div>
          <div className="text-base font-semibold text-foreground tabular-nums">
            {fmtNZD(assessment.cost_low)} – {fmtNZD(assessment.cost_high)} {assessment.currency}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground text-right max-w-[90px] leading-snug">
          Based on NZ panel-shop rates
        </div>
      </div>

      {/* Zone breakdown */}
      {assessment.zones.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-3.5">
          <div className="text-xs font-semibold text-foreground mb-2">Damage breakdown</div>
          <div className="divide-y divide-border">
            {assessment.zones.map((z, i) => (
              <div key={i} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground">{z.part}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${sevClass(z.severity)}`}>
                    {sevLabel(z.severity)}
                  </span>
                </div>
                {z.description && <div className="text-[11px] text-muted-foreground mt-0.5">{z.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {assessment.notes && (
        <div className="text-[11px] text-muted-foreground leading-relaxed px-1">
          <FileText className="w-3 h-3 inline mr-1 -mt-0.5" />
          {assessment.notes}
        </div>
      )}

      <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed px-1">
        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>AI-assisted estimate for guidance only. Actual repair costs may vary. A licensed assessor's quote is required for insurance claims.</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={runAnalysis}
          disabled={running}
          className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {running ? 'Re-analysing…' : 'Re-run assessment'}
        </button>
        {typeof navigator !== 'undefined' && (navigator as any).share && (
          <button
            type="button"
            onClick={async () => {
              try {
                await (navigator as any).share({
                  title: 'SAVO AI damage assessment',
                  text: `My SAVO AI damage assessment: ${sevLabel(assessment.overall_severity)} damage across ${assessment.zones_count} zone(s). Estimated repair: ${fmtNZD(assessment.cost_low)} – ${fmtNZD(assessment.cost_high)} NZD (${assessment.confidence}% confidence).`,
                });
              } catch {}
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}
