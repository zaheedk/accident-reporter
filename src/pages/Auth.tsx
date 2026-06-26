import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2, LogIn, Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

import { useAuth } from '@/contexts/AuthContext';
import PhoneAuth from '@/components/PhoneAuth';
import { isNativeApp, signInWithGoogleNative } from '@/lib/native-google-auth';

const SITE_URL = import.meta.env.PROD ? 'https://www.savo.co.nz' : window.location.origin;

export default function Auth() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: SITE_URL },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists. Please sign in instead.');
          setSubmitting(false);
          return;
        }
        setMode('login');
        setSuccess('Account created! Please check your email to verify, then sign in.');
        setEmail('');
        setPassword('');
        setName('');
        supabase.functions.invoke('send-email', {
          body: { type: 'welcome', to: email },
        }).catch(err => console.error('Welcome email failed:', err));
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${SITE_URL}/reset-password`,
        });
        if (error) throw error;
        setSuccess('Password reset link sent! Check your email.');
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

  const handleOAuth = async () => {
    setError('');
    if (isNativeApp()) {
      try {
        await signInWithGoogleNative();
      } catch (err: any) {
        setError(err?.message || 'Google sign-in failed');
      }
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${SITE_URL}/dashboard` },
    });
    if (error) setError(error.message || 'OAuth sign-in failed');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Sign In or Create Account | SAVO"
        description="Sign in to SAVO or create a free account to start documenting accidents, lodging insurance claims and managing your vehicles."
        path="/auth"
        noIndex
      />
      {/* Top bar */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
        <img src="/savo-logo.svg" alt="SAVO" className="h-10 w-auto" />
        <span className="w-12" />
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {mode === 'forgot' ? 'Reset password' : mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 mb-7">
            {mode === 'forgot'
              ? "Enter your email and we'll send you a reset link."
              : mode === 'login'
                ? 'Sign in to access your reports and vehicles.'
                : 'Free, no credit card required.'}
          </p>

          <button
            onClick={() => handleOAuth()}
            className="w-full h-11 px-4 bg-card border border-border rounded-xl text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.99] inline-flex items-center justify-center gap-2.5 mb-5"
          >
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
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex rounded-xl bg-muted p-1 mb-5 border border-border">
            <button
              onClick={() => { setAuthMethod('email'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                authMethod === 'email' ? 'bg-card text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              onClick={() => { setAuthMethod('phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                authMethod === 'phone' ? 'bg-card text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
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
                    <label className="form-label">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" strokeWidth={1.5} />
                      <input className="form-input pl-10" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                  </div>
                )}
                <div>
                  <label className="form-label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" strokeWidth={1.5} />
                    <input type="email" className="form-input pl-10" placeholder="name@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                {mode !== 'forgot' && (
                  <div>
                    <label className="form-label">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" strokeWidth={1.5} />
                      <input type={showPassword ? 'text' : 'password'} className="form-input pl-10 pr-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center justify-end">
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} className="text-sm text-foreground font-semibold hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                {success && <p className="text-xs text-foreground font-medium bg-muted px-3 py-2 rounded-lg border border-border">{success}</p>}
                {error && <p className="text-xs text-destructive font-medium bg-destructive/5 px-3 py-2 rounded-lg">{error}</p>}

                <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {mode === 'forgot' ? 'Send reset link' : mode === 'login' ? 'Sign in' : 'Create account'}
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-5">
                {mode === 'forgot' ? (
                  <>
                    Remember your password?{' '}
                    <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-foreground font-semibold hover:underline">Sign in</button>
                  </>
                ) : mode === 'login' ? (
                  <>New to SAVO?{' '}
                    <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="text-foreground font-semibold hover:underline">Create an account</button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-foreground font-semibold hover:underline">Sign in</button>
                  </>
                )}
              </p>
            </>
          )}

          <div className="flex items-center justify-center gap-3 mt-8 text-[11px] text-muted-foreground flex-wrap">
            <a href="/about" className="hover:text-foreground transition-colors">About</a>
            <span>·</span>
            <a href="/how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <span>·</span>
            <a href="/faq" className="hover:text-foreground transition-colors">FAQ</a>
            <span>·</span>
            <a href="/legal" className="hover:text-foreground transition-colors">Terms & Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
