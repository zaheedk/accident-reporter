import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CheckCircle2, XCircle, Scale, Share2, ChevronRight, Trophy } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  loadProgress,
  recordAnswer,
  scenarioForDate,
  todayKey,
  type QuizProgress,
} from '@/lib/fault-quiz';

export default function FaultQuiz() {
  const scenario = useMemo(() => scenarioForDate(), []);
  const [progress, setProgress] = useState<QuizProgress>(() => loadProgress());
  const [choice, setChoice] = useState<string | null>(null);

  const alreadyPlayed = progress.lastPlayed === todayKey();

  useEffect(() => {
    if (alreadyPlayed && progress.lastChoice) setChoice(progress.lastChoice);
  }, [alreadyPlayed, progress.lastChoice]);

  const revealed = choice !== null;
  const isCorrect = choice === scenario.answerId;

  const handleChoose = (id: string) => {
    if (revealed) return;
    setChoice(id);
    setProgress((prev) => recordAnswer(prev, id === scenario.answerId, id));
  };

  const handleShare = async () => {
    const text = `Who's at fault? ${scenario.scenario} — test yourself on SAVO`;
    const url = 'https://www.savo.co.nz/fault-quiz';
    try {
      if (navigator.share) {
        await navigator.share({ title: "Who's at fault?", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">Who's at fault?</h1>
          <p className="text-[13px] text-muted-foreground">
            A new real-world NZ scenario every day. Learn the rules before you need them.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={<Flame className="w-4 h-4 text-orange-500" />} label="Streak" value={`${progress.streak}`} />
          <StatTile icon={<Trophy className="w-4 h-4 text-amber-500" />} label="Best" value={`${progress.best}`} />
          <StatTile
            icon={<Scale className="w-4 h-4 text-primary" />}
            label="Correct"
            value={progress.played ? `${Math.round((progress.correct / progress.played) * 100)}%` : '—'}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 space-y-4"
        >
          <p className="text-[15px] leading-relaxed text-foreground font-medium">{scenario.scenario}</p>

          <div className="space-y-2">
            {scenario.options.map((opt) => {
              const selected = choice === opt.id;
              const correct = opt.id === scenario.answerId;
              const state = !revealed
                ? 'border-border hover:border-foreground/30'
                : correct
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : selected
                    ? 'border-destructive bg-destructive/10'
                    : 'border-border opacity-60';
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChoose(opt.id)}
                  disabled={revealed}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-[14px] font-medium text-foreground transition-all active:scale-[0.99] flex items-center gap-2 ${state}`}
                >
                  <span className="flex-1">{opt.label}</span>
                  {revealed && correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {revealed && selected && !correct && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-1">
              <div className={`text-[13px] font-semibold ${isCorrect ? 'text-emerald-600' : 'text-destructive'}`}>
                {isCorrect ? 'Correct — nice work.' : 'Not quite.'}
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{scenario.explanation}</p>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{scenario.rule}</div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" /> Challenge a mate
                </button>
                <Link
                  to="/fault-guide"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[13px] font-semibold text-foreground"
                >
                  Fault guide <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-[12px] text-muted-foreground pt-1">
                New scenario tomorrow — come back to keep your streak alive.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border px-3 py-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold text-foreground tabular-nums leading-none">{value}</div>
    </div>
  );
}
