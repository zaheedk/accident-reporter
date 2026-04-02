import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, LogIn, Camera, MapPin, Users, FileText, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PhoneAuth from '@/components/PhoneAuth';

export default function Auth() {
  const { session, loading } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
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
    if (provider === 'google') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) setError(error.message || 'OAuth sign-in failed');
    } else {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) setError(error.message || 'OAuth sign-in failed');
    }
  };

  const features = [
    { icon: Camera, label: 'Photo capture' },
    { icon: MapPin, label: 'GPS tagging' },
    { icon: Users, label: 'Witness forms' },
    { icon: FileText, label: 'Auto reports' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Dark hero section */}
      <div className="bg-dark-surface px-6 pt-10 pb-10 relative overflow-hidden lg:w-1/2 lg:min-h-screen lg:flex lg:items-center lg:justify-center">
        {/* Subtle grid/line decoration */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(var(--dark-surface))] to-transparent lg:hidden" />

        <div className="relative z-10 lg:text-center lg:max-w-md">
          {/* Logo */}
          <div className="flex items-center mb-10 lg:justify-center">
            <img src="/savo-logo.svg" alt="Savo" className="h-20 lg:h-24" />
          </div>

          {/* Headline */}
          <h1 className="text-[34px] leading-[1.08] tracking-tight mb-4" style={{ textWrap: 'balance' as any }}>
            <span className="font-semibold text-dark-surface-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Capture the scene.
            </span>
            <br />
            <span className="font-bold italic text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              Protect your claim.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] leading-relaxed text-dark-surface-muted max-w-xs lg:max-w-sm lg:mx-auto">
            Savo helps you record accident data instantly — photos, GPS, witness info, and reports — so your claim is airtight from minute one.
          </p>

        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 bg-card px-6 pt-8 pb-8 -mt-3 rounded-t-3xl relative z-10 lg:mt-0 lg:rounded-none lg:flex lg:items-center lg:justify-center" style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>
        <div className="max-w-sm mx-auto">
          {/* Secure portal badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Secure Portal
            </span>
          </div>

          <h2 className="text-[22px] font-bold text-foreground mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            {mode === 'login' ? (
              <>Welcome back to <span className="italic text-primary">Savo</span></>
            ) : (
              <>Join <span className="italic text-primary">Savo</span> today</>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === 'login' ? 'Access your incidents, claims, and reports in one place.' : 'Create your free account to get started.'}
          </p>

          {/* OAuth buttons - side by side */}
          <button onClick={() => handleOAuth('google')}
            className="w-full h-12 px-4 bg-card border border-border rounded-xl text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] inline-flex items-center justify-center gap-2.5 shadow-sm mb-5">
            <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email / Phone toggle */}
          <div className="flex rounded-xl bg-muted p-1 mb-5">
            <button
              onClick={() => { setAuthMethod('email'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMethod === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              onClick={() => { setAuthMethod('phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMethod === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>

          {authMethod === 'phone' ? (
            <>
              <PhoneAuth onError={setError} />
              {error && <p className="text-xs text-destructive font-medium bg-destructive/5 px-3 py-2 rounded-lg mt-4">{error}</p>}
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                      <input className="form-input pl-10" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                    <input type="email" className="form-input pl-10" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                    <input type="password" className="form-input pl-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                      Keep me signed in
                    </label>
                    <button type="button" className="text-sm text-primary font-semibold hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <p className="text-xs text-destructive font-medium bg-destructive/5 px-3 py-2 rounded-lg">{error}</p>}

                <button type="submit" disabled={submitting}
                  className="btn-primary w-full h-12 text-[15px] rounded-xl"
                  style={{ boxShadow: '0 4px 20px hsla(22, 90%, 52%, 0.4)' }}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {mode === 'login' ? 'Sign in to Savo' : 'Create Account'}
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-5">
                {mode === 'login' ? 'New to Savo? ' : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="text-primary font-bold hover:underline">
                  {mode === 'login' ? 'Create a free account' : 'Sign in'}
                </button>
              </p>
            </>
          )}

          {/* Feature chips - hidden on mobile to save space */}
          <div className="hidden lg:flex flex-wrap items-center justify-center gap-2 mt-6">
            {features.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-5">
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
