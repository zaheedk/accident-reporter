import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Auth() {
  const { session, loading } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Send welcome email
        supabase.functions.invoke('send-email', {
          body: { type: 'welcome', to: email },
        }).catch(err => console.error('Welcome email failed:', err));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('');
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) setError(error.message || 'OAuth sign-in failed');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero section */}
      <div className="px-6 pt-12 pb-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Savo</span>
        </div>

        {/* Headline */}
        <h1 className="text-[32px] leading-[1.1] tracking-tight text-foreground mb-4" style={{ textWrap: 'balance' as any }}>
          <span className="font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>Capture the scene.</span>
          <br />
          <span className="font-bold italic text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Protect your claim.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[15px] leading-relaxed text-muted-foreground max-w-xs">
          Savo helps you record accident data instantly — photos, GPS, witness info, and reports — so your claim is airtight from minute one.
        </p>

        {/* Stats row */}
        <div className="flex items-start gap-8 mt-8">
          <div>
            <div className="text-2xl font-extrabold text-foreground tabular-nums">4×</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Faster Claims</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary tabular-nums">98%</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Success Rate</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-foreground tabular-nums">120k+</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Incidents Logged</div>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="flex-1 bg-card rounded-t-3xl px-6 pt-7 pb-8 border-t border-border/40" style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.04)' }}>
        <div className="max-w-sm mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-1">
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {mode === 'login' ? 'Sign in to continue to Savo' : 'Create your free account'}
          </p>

          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-5">
            <button onClick={() => handleOAuth('google')}
              className="w-full h-11 px-4 bg-card border border-border rounded-xl text-sm font-medium text-foreground transition-all hover:bg-muted hover:border-border active:scale-[0.98] inline-flex items-center justify-center gap-3 shadow-sm">
              <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('auth.continueGoogle')}
            </button>
            <button onClick={() => handleOAuth('apple')}
              className="w-full h-11 px-4 rounded-xl text-sm font-medium transition-all active:scale-[0.98] inline-flex items-center justify-center gap-3"
              style={{ background: 'hsl(220, 20%, 18%)', color: 'white', boxShadow: '0 2px 8px hsla(220, 20%, 18%, 0.3)' }}>
              <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {t('auth.continueApple')}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">{t('auth.orEmail')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <input className="form-input pl-10" placeholder={t('auth.fullName')} value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <input type="email" className="form-input pl-10" placeholder={t('auth.email')} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <input type="password" className="form-input pl-10" placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <p className="text-xs text-destructive font-medium bg-destructive/5 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            {mode === 'login' ? t('auth.noAccount') + ' ' : t('auth.hasAccount') + ' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="text-primary font-semibold hover:underline">
              {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
            </button>
          </p>

          <div className="mt-4">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-muted-foreground">
            <a href="/about" className="hover:text-foreground transition-colors">{t('auth.about')}</a>
            <span>·</span>
            <a href="/how-it-works" className="hover:text-foreground transition-colors">{t('nav.howItWorks')}</a>
            <span>·</span>
            <a href="/faq" className="hover:text-foreground transition-colors">{t('auth.faq')}</a>
            <span>·</span>
            <a href="/legal" className="hover:text-foreground transition-colors">{t('nav.termsPrivacy')}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
