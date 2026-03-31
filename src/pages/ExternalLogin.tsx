import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ExternalLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing login token');
      setLoading(false);
      return;
    }

    exchangeToken(token);
  }, []);

  const exchangeToken = async (token: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/exchange-login-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token exchange failed');
      }

      // Set the session from the returned tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) throw sessionError;

      // Navigate to claim wizard with rego pre-filled
      navigate(`/claims/new?rego=${encodeURIComponent(data.rego_number)}`, { replace: true });
    } catch (err: any) {
      console.error('Token exchange error:', err);
      setError(err.message || 'Login failed. The link may have expired.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Login Failed</h1>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => navigate('/auth', { replace: true })}
          className="btn-primary w-full h-11 rounded-xl text-sm"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}
