import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { setupWidget, requestPinWidget } from '@/lib/widget-setup';
import { toast } from 'sonner';

const STORAGE_PREFIX = 'savo_widget_prompt_seen_';

/**
 * One-time first-launch prompt that asks the user to add the SAVO widget to
 * their home screen.
 *
 * - Android 8+: triggers the system "pin widget" dialog. If the launcher
 *   doesn't support it, falls back to a short instruction.
 * - iOS: shows manual instructions (Apple has no programmatic API).
 * - Web / PWA: not shown.
 */
export default function WidgetInstallPrompt() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (loading || !user || !isNative) return;
    const key = STORAGE_PREFIX + user.id;
    if (localStorage.getItem(key)) return;
    // Delay slightly so it doesn't collide with the onboarding tour.
    const t = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(t);
  }, [user, loading, isNative]);

  const dismiss = (remember = true) => {
    if (remember && user) localStorage.setItem(STORAGE_PREFIX + user.id, '1');
    setOpen(false);
    setFallback(null);
  };

  const handleAdd = async () => {
    setBusy(true);
    try {
      // Provision the widget token first so the widget has data the moment
      // it lands on the home screen.
      await setupWidget();

      if (platform === 'android') {
        const result = requestPinWidget();
        if (result === 'ok') {
          toast.success('Confirm "Add automatically" to finish');
          dismiss();
        } else if (result === 'unsupported' || result === 'old_os') {
          setFallback(
            'Your launcher doesn\'t support one-tap install. Long-press an empty area on your home screen → Widgets → search for SAVO.',
          );
        } else {
          setFallback('Long-press your home screen → Widgets → search for SAVO.');
        }
      } else if (platform === 'ios') {
        setFallback(
          'On iOS, long-press your home screen → tap the + button (top-left) → search for SAVO → Add Widget.',
        );
      }
    } catch (e) {
      console.warn('widget install failed', e);
      toast.error('Could not set up the widget');
    } finally {
      setBusy(false);
    }
  };

  if (!open || !isNative) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={() => dismiss(false)}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => dismiss()}
            aria-label="Dismiss"
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-card/90 ring-1 ring-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 pt-8 pb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <LayoutGrid className="w-7 h-7 text-primary" />
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> One-tap setup
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground leading-tight tracking-tight">
              Add the SAVO widget
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Pin SAVO to your home screen for instant access to your rego,
              roadside assistance number and a one-tap incident report —
              right when you need it.
            </p>

            {fallback && (
              <div className="mt-4 p-3 rounded-xl bg-muted/60 border border-border text-xs text-foreground leading-relaxed">
                {fallback}
              </div>
            )}

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => dismiss()}
                className="h-11 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
              <button
                onClick={fallback ? () => dismiss() : handleAdd}
                disabled={busy}
                className="flex-1 h-11 px-5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-colors text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? 'Setting up…' : fallback ? 'Got it' : 'Add to home screen'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
