import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Check, Copy, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { setupWidget } from '@/lib/widget-setup';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

export default function WidgetSetup() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [pushed, setPushed] = useState(false);
  const platform = Capacitor.getPlatform();

  const handleSetup = async () => {
    setBusy(true);
    try {
      const res = await setupWidget();
      setToken(res.token);
      setPushed(res.pushed);
      toast.success(res.pushed ? 'Widget connected to this device' : 'Widget token created');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to set up widget');
    } finally {
      setBusy(false);
    }
  };

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    toast.success('Token copied');
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <SEO title="Home-screen widget setup · SAVO" description="Set up the SAVO home-screen widget for instant access to your latest claim, expiry alerts and one-tap incident capture." />

      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-foreground hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Home-screen widget</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">SAVO widget</h2>
              <p className="text-xs text-muted-foreground">Latest claim, next expiry, one-tap capture</p>
            </div>
          </div>

          <ul className="text-sm text-foreground space-y-1.5 mt-3 ml-1">
            <li>• Quick Capture — start documenting a crash in one tap</li>
            <li>• Latest claim status at a glance</li>
            <li>• Next WOF / Rego / Insurance reminder</li>
            <li>• Tap-to-call your insurer or 111</li>
          </ul>
        </div>

        {!token ? (
          <button
            onClick={handleSetup}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? 'Setting up…' : 'Connect this device'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-foreground flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
              <div>
                {pushed ? (
                  <>Widget credentials saved to this device. Long-press your home screen → <strong>Widgets</strong> → search <strong>SAVO</strong> to add it.</>
                ) : (
                  <>Widget token created. Paste it into the SAVO widget configuration on your device.</>
                )}
              </div>
            </div>

            {!pushed && (
              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Widget token</div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] text-foreground break-all flex-1 font-mono">{token}</code>
                  <button onClick={copyToken} aria-label="Copy" className="w-9 h-9 flex-shrink-0 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {platform === 'web' && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4 leading-relaxed">
            You're using SAVO on the web. The home-screen widget only appears once you install the SAVO mobile app on your phone. You can still create the token here and paste it into the widget once installed.
          </div>
        )}

        {platform === 'ios' && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4 leading-relaxed">
            iOS widget support is rolling out — the iOS Widget Extension needs to be added to the Xcode project. Once shipped, this token will activate it automatically.
          </div>
        )}
      </main>
    </div>
  );
}
