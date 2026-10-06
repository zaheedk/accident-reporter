import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export default function OutreachUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const confirm = async () => {
    setState('busy');
    const { data, error } = await supabase.functions.invoke('shop-outreach', { body: { action: 'optout', token } });
    setState(!error && data?.ok ? 'done' : 'error');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">SAVO emails</h1>
        {state === 'done' ? (
          <p className="text-sm">Done. We won't contact your business by email again.</p>
        ) : state === 'error' ? (
          <p className="text-sm text-destructive">This link isn't valid. Reply to our email and we'll remove you manually.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Confirm you don't want SAVO to contact your business again.</p>
            <Button onClick={confirm} disabled={state === 'busy' || !token}>Don't contact me again</Button>
          </>
        )}
        <Link to="/" className="block text-xs text-muted-foreground underline">savo.co.nz</Link>
      </div>
    </div>
  );
}
