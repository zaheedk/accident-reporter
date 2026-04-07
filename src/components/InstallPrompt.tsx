import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;

  useEffect(() => {
    if (isInStandaloneMode) return;

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem('install-prompt-dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSince < 72) {
        setDismissed(true);
        return;
      }
    }

    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isInStandaloneMode || dismissed) return null;
  if (!deferredPrompt && !showIOSPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('install-prompt-dismissed', String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xl max-w-sm mx-auto">
        <button onClick={handleDismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <img src="/savo-icon.svg" alt="SAVO" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">Install SAVO</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {showIOSPrompt
                ? <>Tap <Share className="w-3 h-3 inline -mt-0.5" /> then <strong>"Add to Home Screen"</strong></>
                : 'Add to your home screen for quick access — works offline!'
              }
            </p>
            {!showIOSPrompt && (
              <button
                onClick={handleInstall}
                className="mt-2.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                style={{ boxShadow: '0 2px 8px hsla(22, 90%, 52%, 0.3)' }}
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
