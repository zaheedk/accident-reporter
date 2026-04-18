import { useEffect, useState } from 'react';
import { Car, FileText, Camera, Phone, FolderOpen, Bell, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Welcome to SAVO',
    body: "Let's take a quick tour so you can get the most out of your accident reporting toolkit. It only takes 30 seconds.",
    accent: 'from-primary to-primary/70',
  },
  {
    icon: Car,
    title: 'Add your vehicles',
    body: 'Start in the Garage. Add your rego, WOF, insurance and policy details — we\'ll remind you before anything expires.',
    accent: 'from-blue-600 to-blue-400',
  },
  {
    icon: FileText,
    title: 'Lodge an incident',
    body: 'Tap Reports → New to capture an accident step-by-step. We guide you through location, third parties, witnesses and damage.',
    accent: 'from-amber-600 to-amber-400',
  },
  {
    icon: Camera,
    title: 'Snap photos on the scene',
    body: 'Take multiple photos of your vehicle, the other driver\'s vehicle and licence. Photos are saved offline and auto-upload when you\'re back online.',
    accent: 'from-emerald-600 to-emerald-400',
  },
  {
    icon: Phone,
    title: 'Call insurers & tow trucks',
    body: 'Tap Call insurer right from the dashboard, or open Shops to find the closest panel beater or tow company.',
    accent: 'from-rose-600 to-rose-400',
  },
  {
    icon: FolderOpen,
    title: 'Keep documents handy',
    body: 'Use the Vault to store licence scans, insurance certificates and rego papers — accessible whenever you need them.',
    accent: 'from-violet-600 to-violet-400',
  },
  {
    icon: Bell,
    title: "You're all set",
    body: 'Enable notifications so we can alert you about expiring documents and insurer messages. Welcome aboard!',
    accent: 'from-primary to-primary/70',
  },
];

const STORAGE_PREFIX = 'savo_onboarding_seen_';

export default function OnboardingTour() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    const key = STORAGE_PREFIX + user.id;
    if (!localStorage.getItem(key)) {
      // Small delay so the dashboard renders first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user, loading]);

  const close = () => {
    if (user) localStorage.setItem(STORAGE_PREFIX + user.id, '1');
    setOpen(false);
    setStep(0);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={close}
      >
        <motion.div
          key={step}
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            aria-label="Skip tour"
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className={`bg-gradient-to-br ${current.accent} px-6 pt-10 pb-8 text-center`}>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
              <Icon className="w-8 h-8 text-white" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-white/70">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          <div className="px-6 pt-6 pb-6">
            <h2
              className="text-xl font-bold text-foreground mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {current.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>

            <div className="flex items-center justify-center gap-1.5 my-5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="h-11 px-4 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {isFirst && (
                <button
                  onClick={close}
                  className="h-11 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tour
                </button>
              )}
              <button
                onClick={next}
                className="flex-1 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                {isLast ? "Let's go" : 'Next'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
