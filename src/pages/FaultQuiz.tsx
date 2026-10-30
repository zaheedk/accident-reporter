import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Share2, ChevronRight, Bell, BellOff, ArrowLeft, ArrowRight, RotateCcw, ExternalLink } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import QuizDiagram from '@/components/QuizDiagram';
import LegalDisclaimer from '@/components/LegalDisclaimer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { QUESTIONS_PER_DAY, QUIZ_TOPICS, quizScenarios, loadProgress, recordAnswer, scenariosForDate, practiceQuestions, type QuizTopic, type QuizProgress, type QuizScenario } from '@/lib/fault-quiz';

export default function FaultQuiz() {
  const daily = useMemo(() => scenariosForDate(), []);
  const [progress, setProgress] = useState<QuizProgress>(() => loadProgress());
  const [mode, setMode] = useState('daily');
  const [topic, setTopic] = useState<QuizTopic | 'all'>('all');
  const [practice, setPractice] = useState(() => practiceQuestions('all'));
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const { isSubscribed, isSupported, loading, subscribe, unsubscribe, errorMessage } = usePushNotifications('quiz');
  const scenarios = mode === 'daily' ? daily : practice;
  const answers = mode === 'daily' ? progress.dayAnswers : practiceAnswers;
  const answered = scenarios.filter(q => answers[q.id]).length;
  const allDone = answered === scenarios.length;
  const score = scenarios.filter(q => answers[q.id] === q.answerId).length;
  const current = scenarios[index];

  const restartPractice = (nextTopic = topic) => {
    setTopic(nextTopic);
    setPractice(practiceQuestions(nextTopic));
    setPracticeAnswers({});
    setIndex(0);
  };
  const handleChoose = (scenario: QuizScenario, optionId: string) => {
    if (answers[scenario.id]) return;
    if (mode === 'daily') setProgress(prev => recordAnswer(prev, scenario.id, optionId, optionId === scenario.answerId));
    else setPracticeAnswers(prev => ({ ...prev, [scenario.id]: optionId }));
  };
  const handleShare = async () => {
    const text = `${QUESTIONS_PER_DAY} NZ driving and claims questions today — test yourself on SAVO`;
    const url = 'https://www.savo.co.nz/fault-quiz';
    try {
      if (navigator.share) await navigator.share({ title: 'NZ road & rights quiz', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast.success('Link copied'); }
    } catch { /* cancelled */ }
  };
  const handleReminderToggle = async () => {
    if (isSubscribed) { if (await unsubscribe()) toast.success('Daily quiz reminders off'); return; }
    const ok = await subscribe();
    toast[ok ? 'success' : 'error'](ok ? "Daily quiz reminders on" : 'Could not enable notifications');
  };

  return <AppLayout>
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-primary">{quizScenarios.length} questions · New Zealand</p>
        <h1 className="text-3xl font-display text-foreground">NZ road & rights quiz</h1>
        <p className="text-sm text-muted-foreground">Driving rules, accidents, privacy and insurance.</p>
      </header>
      <dl className="grid grid-cols-3 gap-3 border-y border-border py-4">
        {[['Daily streak', progress.streak], ['Best streak', progress.best], ['Daily accuracy', progress.played ? `${Math.round(progress.correct / progress.played * 100)}%` : '—']].map(([label, value]) => <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold text-foreground tabular-nums">{value}</dd>
        </div>)}
      </dl>
      <Tabs value={mode} onValueChange={value => { setMode(value); setIndex(0); }}>
        <TabsList className="w-full"><TabsTrigger value="daily" className="flex-1">Daily quiz</TabsTrigger><TabsTrigger value="practice" className="flex-1">Practice by topic</TabsTrigger></TabsList>
      </Tabs>
      {mode === 'practice' ? <div className="space-y-2">
        <label className="text-xs text-muted-foreground" id="quiz-topic-label">Topic</label>
        <Select value={topic} onValueChange={value => restartPractice(value as QuizTopic | 'all')}>
          <SelectTrigger aria-labelledby="quiz-topic-label"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All topics ({quizScenarios.length})</SelectItem>
            {Object.entries(QUIZ_TOPICS).map(([key, label]) => <SelectItem key={key} value={key}>{label} ({quizScenarios.filter(q => q.category === key).length})</SelectItem>)}
          </SelectContent>
        </Select>
      </div> : isSupported && <Button variant="ghost" className="w-full justify-start whitespace-normal h-auto py-2" onClick={handleReminderToggle} disabled={loading}>
        {isSubscribed ? <Bell /> : <BellOff />} {isSubscribed ? 'Daily reminders on' : 'Remind me daily'}
      </Button>}
      {mode === 'daily' && errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground"><span>{answered} of {scenarios.length} answered{mode === 'daily' ? ' today' : ''}</span><span>{score} correct</span></div>
        <progress className="w-full h-1.5 accent-primary" value={answered} max={scenarios.length} aria-label="Quiz progress" />
      </div>
      {current && <QuestionCard key={`${mode}-${current.id}`} index={index} scenario={current} choice={answers[current.id] ?? null} onChoose={optionId => handleChoose(current, optionId)} />}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(i => i - 1)} aria-label="Previous question"><ArrowLeft /><span className="hidden sm:inline">Previous</span></Button>
        <span className="text-sm text-muted-foreground tabular-nums">{index + 1} / {scenarios.length}</span>
        <Button disabled={!current || !answers[current.id] || index === scenarios.length - 1} onClick={() => setIndex(i => i + 1)} aria-label="Next question">Next<ArrowRight /></Button>
      </div>
      {allDone && <section className="border-t border-border pt-6 space-y-4" aria-label="Quiz results">
        <h2 className="font-display text-2xl text-foreground">{score} / {scenarios.length} — {mode === 'daily' ? "today’s set complete" : 'practice complete'}</h2>
        <div className="flex flex-wrap gap-2">
          {mode === 'practice' ? <Button onClick={() => restartPractice()}><RotateCcw />New practice set</Button> : <Button onClick={handleShare}><Share2 />Challenge a mate</Button>}
          <Button asChild variant="outline"><Link to="/fault-guide">Fault guide<ChevronRight /></Link></Button>
        </div>
        {mode === 'daily' && <p className="text-sm text-muted-foreground">Three new questions tomorrow.</p>}
      </section>}
      <footer className="space-y-3 pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">Original practice questions based on NZ guidance, not an official NZTA test. Insurance answers depend on your policy. References checked October 2026; rules can change.</p>
        <LegalDisclaimer compact />
      </footer>
    </div>
  </AppLayout>;
}

function QuestionCard({ index, scenario, choice, onChoose }: { index: number; scenario: QuizScenario; choice: string | null; onChoose: (optionId: string) => void }) {
  const revealed = choice !== null;
  const isCorrect = choice === scenario.answerId;
  return <section className="space-y-4" aria-label={`Question ${index + 1}`}>
    {scenario.diagramId && <QuizDiagram id={scenario.diagramId} description={scenario.imageAlt} />}
    <div className="text-xs font-semibold text-primary">Question {index + 1} · {QUIZ_TOPICS[scenario.category ?? 'fault']}</div>
    <h2 className="text-lg leading-relaxed font-semibold text-foreground">{scenario.scenario}</h2>
    <div className="space-y-2">
      {scenario.options.map(opt => {
        const selected = choice === opt.id;
        const correct = opt.id === scenario.answerId;
        const state = !revealed ? 'border-border hover:border-primary' : correct ? 'border-primary bg-secondary' : selected ? 'border-destructive bg-destructive/10' : 'border-border';
        return <Button key={opt.id} variant="unstyled" size="unstyled" onClick={() => onChoose(opt.id)} disabled={revealed} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border-2 bg-card text-sm font-medium text-foreground disabled:opacity-100 ${state}`}>
          <span className="flex-1">{opt.label}</span>
          {revealed && correct && <CheckCircle2 className="text-primary shrink-0" />}
          {revealed && selected && !correct && <XCircle className="text-destructive shrink-0" />}
        </Button>;
      })}
    </div>
    {revealed && <div className="space-y-2 border-l-2 border-primary pl-4 py-2" role="status">
      <p className={`text-sm font-semibold ${isCorrect ? 'text-primary' : 'text-destructive'}`}>{isCorrect ? 'Correct — nice work.' : 'Not quite.'}</p>
      <p className="text-sm leading-relaxed text-foreground">{scenario.explanation}</p>
      <p className="text-xs text-muted-foreground">{scenario.rule}</p>
      {scenario.sourceUrl && <a href={scenario.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline text-primary">Read the source<ExternalLink className="w-3 h-3" /></a>}
    </div>}
  </section>;
}
