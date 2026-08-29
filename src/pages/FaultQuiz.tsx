import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CheckCircle2, XCircle, Scale, Share2, ChevronRight, Trophy, Bell, BellOff } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import {
  QUESTIONS_PER_DAY,
  loadProgress,
  recordAnswer,
  scenariosForDate,
  type QuizProgress,
  type QuizScenario,
} from '@/lib/fault-quiz';

export default function FaultQuiz() {
  const scenarios = useMemo(() => scenariosForDate(), []);
  const [progress, setProgress] = useState<QuizProgress>(() => loadProgress());
  const { isSubscribed, isSupported, loading, subscribe, unsubscribe } = usePushNotifications();

  const answered = Object.keys(progress.dayAnswers).length;
  const allDone = answered >= QUESTIONS_PER_DAY;

  const handleChoose = (scenario: QuizScenario, optionId: string) => {
    if (progress.dayAnswers[scenario.id]) return;
    setProgress((prev) => recordAnswer(prev, scenario.id, optionId, optionId === scenario.answerId));
  };

  const handleShare = async () => {
    const text = `3 new "Who's at fault?" scenarios today — test yourself on SAVO`;
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

  const handleReminderToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast.success('Daily quiz reminders off');
      return;
    }
    const ok = await subscribe();
    toast[ok ? 'success' : 'error'](
      ok ? "You'll get a reminder when the day's 3 questions are ready" : 'Could not enable notifications',
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">Who's at fault?</h1>
          <p className="text-[13px] text-muted-foreground">
            {QUESTIONS_PER_DAY} real-world NZ scenarios every day. Learn the rules before you need them.
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

        {isSupported && (
          <button
            onClick={handleReminderToggle}
            disabled={loading}
            className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left disabled:opacity-60"
          >
            {isSubscribed ? (
              <Bell className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className="flex-1 text-[13px] font-medium text-foreground">
              {isSubscribed ? 'Daily reminder on' : 'Remind me daily'}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {isSubscribed ? 'Tap to turn off' : `${QUESTIONS_PER_DAY} questions each morning`}
            </span>
          </button>
        )}

        <div className="text-[12px] font-medium text-muted-foreground">
          {answered} of {QUESTIONS_PER_DAY} answered today
        </div>

        {scenarios.map((scenario, index) => (
          <QuestionCard
            key={scenario.id}
            index={index}
            scenario={scenario}
            choice={progress.dayAnswers[scenario.id] ?? null}
            onChoose={(optionId) => handleChoose(scenario, optionId)}
          />
        ))}

        {allDone && (
          <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className="text-[14px] font-semibold text-foreground">That's today's set done.</div>
            <div className="flex flex-wrap gap-2">
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
            <p className="text-[12px] text-muted-foreground">
              3 new scenarios tomorrow — come back to keep your streak alive.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function QuestionCard({
  index,
  scenario,
  choice,
  onChoose,
}: {
  index: number;
  scenario: QuizScenario;
  choice: string | null;
  onChoose: (optionId: string) => void;
}) {
  const revealed = choice !== null;
  const isCorrect = choice === scenario.answerId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      <img
        src={scenario.image}
        alt={scenario.imageAlt}
        loading="lazy"
        width={1024}
        height={576}
        className="w-full h-40 object-cover"
      />
      <div className="p-5 space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Question {index + 1}
        </div>
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
                onClick={() => onChoose(opt.id)}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-1">
            <div className={`text-[13px] font-semibold ${isCorrect ? 'text-emerald-600' : 'text-destructive'}`}>
              {isCorrect ? 'Correct — nice work.' : 'Not quite.'}
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{scenario.explanation}</p>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{scenario.rule}</div>
          </motion.div>
        )}
      </div>
    </motion.div>
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
