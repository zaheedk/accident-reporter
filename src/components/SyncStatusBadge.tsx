import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { onSyncStatus, runSync, isOnline } from '@/lib/sync-engine';

/**
 * Tiny floating pill that shows offline / syncing / pending-write status.
 * Hidden when everything is in sync and the device is online.
 */
export function SyncStatusBadge() {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'offline' | 'error'>(
    isOnline() ? 'idle' : 'offline',
  );
  const [pending, setPending] = useState(0);

  useEffect(() => onSyncStatus((s, p) => { setStatus(s); setPending(p); }), []);

  if (status === 'idle' && pending === 0) return null;

  const label =
    status === 'offline' ? `Offline${pending ? ` · ${pending} queued` : ''}`
    : status === 'syncing' ? `Syncing${pending ? ` · ${pending}` : ''}…`
    : status === 'error' ? 'Sync failed — tap to retry'
    : pending ? `${pending} pending`
    : 'Synced';

  const icon =
    status === 'offline' ? <CloudOff className="w-3.5 h-3.5" />
    : status === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
    : <CheckCircle2 className="w-3.5 h-3.5" />;

  return (
    <button
      type="button"
      onClick={() => { void runSync(); }}
      className="fixed bottom-20 right-3 z-40 flex items-center gap-1.5 rounded-full bg-foreground/85 text-background text-[11px] font-medium px-2.5 py-1 shadow-md backdrop-blur-sm"
      aria-live="polite"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
