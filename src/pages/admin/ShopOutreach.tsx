import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type Shop = { id: string; name: string; city: string; email: string; google_rating: number; outreach?: { status: string; sent_at: string; opted_out_at: string | null } };
type ListResp = { pending: Shop[]; sent: Shop[]; sample: { subject: string; html: string } | null; from: string; replyTo: string };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('shop-outreach', { body });
  if (error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
  return data as T;
}

export default function ShopOutreach() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['shop-outreach'], queryFn: () => call<ListResp>({ action: 'list' }) });
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [sending, setSending] = useState(false);
  const selected = picked ?? new Set((data?.pending ?? []).map((s) => s.id));

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setPicked(n);
  };

  const send = async () => {
    if (!selected.size || !confirm(`Send to ${selected.size} panel beaters? Each shop can only be emailed once.`)) return;
    setSending(true);
    try {
      const r = await call<{ results: { ok: boolean }[] }>({ action: 'send', ids: [...selected] });
      const ok = r.results.filter((x) => x.ok).length;
      toast.success(`Sent ${ok} of ${r.results.length}`);
      setPicked(null);
      qc.invalidateQueries({ queryKey: ['shop-outreach'] });
    } catch (e) {
      toast.error(String((e as Error).message));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Admin</Link>
        <h1 className="text-2xl font-bold">Panel beater outreach</h1>
        <p className="text-sm text-muted-foreground">Asks top-rated shops to link to their SAVO listing with the badge. Each shop is emailed once at most, and every email has a "don't contact me again" link.</p>
        {isLoading && <p className="text-sm">Loading…</p>}
        {error && <p className="text-sm text-destructive">{String((error as Error).message)}</p>}
        {data && (
          <>
            {data.sample && (
              <Card className="p-4 space-y-2">
                <div className="text-xs text-muted-foreground">From {data.from} · replies go to {data.replyTo}</div>
                <div className="text-sm font-bold">Subject: {data.sample.subject}</div>
                <iframe title="Email preview" srcDoc={data.sample.html} sandbox="" className="w-full h-[480px] rounded border bg-background" />
              </Card>
            )}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Ready to send ({data.pending.length})</div>
                <Button onClick={send} disabled={sending || !selected.size}><Send className="w-4 h-4 mr-1" />{sending ? 'Sending…' : `Send to ${selected.size}`}</Button>
              </div>
              {data.pending.length === 0 && <p className="text-sm text-muted-foreground">No shops left with a listed email.</p>}
              {data.pending.map((s) => (
                <label key={s.id} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                  <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <span className="flex-1"><b>{s.name}</b> · {s.city} · ★{s.google_rating}</span>
                  <span className="text-muted-foreground text-xs">{s.email}</span>
                </label>
              ))}
            </Card>
            {data.sent.length > 0 && (
              <Card className="p-4 space-y-1">
                <div className="text-sm font-bold mb-2">Already contacted ({data.sent.length})</div>
                {data.sent.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span>{s.name} · {s.city}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.outreach?.opted_out_at ? 'Opted out' : s.outreach?.status === 'failed' ? 'Failed' : `Sent ${new Date(s.outreach!.sent_at).toLocaleDateString()}`}
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
