import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import welcomeImg from '@/assets/onboarding/welcome.png';
import garageImg from '@/assets/onboarding/garage.png';
import reportImg from '@/assets/onboarding/report.png';
import photosImg from '@/assets/onboarding/photos.png';
import callImg from '@/assets/onboarding/call.png';
import vaultImg from '@/assets/onboarding/vault.png';
import notificationsImg from '@/assets/onboarding/notifications.png';

interface Step {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    image: welcomeImg,
    eyebrow: 'Welcome',
    title: 'Welcome to SAVO',
    body: "Let's take a quick tour so you can get the most out of your accident reporting toolkit. It only takes 30 seconds.",
  },
  {
    image: garageImg,
    eyebrow: 'Step 1 · Garage',
    title: 'Add your vehicles',
    body: "Start in the Garage. Add your rego, WOF, insurance and policy details — we'll remind you before anything expires.",
  },
  {
    image: reportImg,
    eyebrow: 'Step 2 · Reports',
    title: 'Lodge an incident',
    body: 'Tap Reports → New to capture an accident step-by-step. We guide you through location, third parties, witnesses and damage.',
  },
  {
    image: photosImg,
    eyebrow: 'Step 3 · Photos',
    title: 'Snap photos on the scene',
    body: "Take multiple photos of your vehicle, the other driver's vehicle and licence. Photos save offline and auto-upload when you're back online.",
  },
  {
    image: callImg,
    eyebrow: 'Step 4 · Contacts',
    title: 'Call insurers & tow trucks',
    body: 'Tap Call insurer right from the dashboard, or open Shops to find the closest panel beater or tow company.',
  },
  {
    image: vaultImg,
    eyebrow: 'Step 5 · Vault',
    title: 'Keep documents handy',
    body: 'Use the Vault to store licence scans, insurance certificates and rego papers — accessible whenever you need them.',
  },
  {
    image: notificationsImg,
    eyebrow: "You're all set",
    title: 'Stay in the loop',
    body: 'Enable notifications so we can alert you about expiring documents and insurer messages. Welcome aboard!',
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
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-md p-0 sm:p-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={close}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={close}
            aria-label="Skip tour"
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-card/90 backdrop-blur ring-1 ring-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Hero image area showing real app screenshots */}
          <div
            className="relative h-64 sm:h-72 w-full overflow-hidden flex items-start justify-center"
            style={{
              background:
                'linear-gradient(180deg, hsl(var(--muted) / 0.6) 0%, hsl(var(--muted) / 0.2) 100%)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={step}
                src={current.image}
                alt=""
                width={390}
                height={844}
                loading="lazy"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full w-auto object-contain object-top pt-6 drop-shadow-xl"
                style={{ maxWidth: '70%' }}
              />
            </AnimatePresence>

            {/* Progress bar — top edge */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-border/30">
              <motion.div
                className="h-full bg-primary"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pt-6 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
                  {current.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-foreground leading-tight tracking-tight">
                  {current.title}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {current.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step indicator */}
            <div className="flex items-center justify-between mt-6 mb-5">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? 'w-6 bg-primary'
                        : i < step
                          ? 'w-1.5 bg-primary/40'
                          : 'w-1.5 bg-border hover:bg-muted-foreground/40'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {step + 1} / {STEPS.length}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isFirst ? (
                <button
                  onClick={prev}
                  className="h-11 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <button
                  onClick={close}
                  className="h-11 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tour
                </button>
              )}
              <button
                onClick={next}
                className="flex-1 h-11 px-5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-colors text-primary-foreground bg-primary hover:bg-primary/90"
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
