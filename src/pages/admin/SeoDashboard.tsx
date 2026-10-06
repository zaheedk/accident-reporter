import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RefreshCw, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { MONTHLY_CLICK_GOAL, goalProgress, pctChange } from '@/lib/seo-progress';

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };
type Totals = { clicks: number; impressions: number; ctr: number; position: number };
type Snapshot = {
  created_at: string;
  site_url: string;
  data: {
    range: { start: string; end: string };
    totals: Totals; prevTotals: Totals;
    daily: { date: string; clicks: number; impressions: number; position: number }[];
    topQueries: Row[]; topPages: Row[];
    pagesWithImpressions90d: number;
    sitemap: { error?: string; lastDownloaded?: string | null; errors?: number; warnings?: number; submitted?: number };
  };
};
type Resp = { snapshot: Snapshot | null; selection_required?: string[]; error?: string };

async function call(body: Record<string, unknown>): Promise<Resp> {
  const { data, error } = await supabase.functions.invoke('seo-dashboard', { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    throw new Error(details);
  }
  return data as Resp;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

function Stat({ label, value, prev, invert, suffix = '' }: { label: string; value: number; prev: number; invert?: boolean; suffix?: string }) {
  const change = pctChange(value, prev);
  const good = change !== null && (invert ? change < 0 : change > 0);
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-foreground tabular-nums mt-1">{value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{suffix}</div>
      {change !== null && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${good ? 'text-success' : 'text-destructive'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change > 0 ? '+' : ''}{change}% vs previous 28 days
        </div>
      )}
    </Card>
  );
}

function Table({ title, rows, pages }: { title: string; rows: Row[]; pages?: boolean }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold text-foreground mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-muted-foreground text-xs text-left">
              <th className="py-1 pr-2">{pages ? 'Page' : 'Search'}</th><th className="text-right px-2">Clicks</th><th className="text-right px-2">Impr.</th><th className="text-right pl-2">Pos.</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-1.5 pr-2 max-w-[260px] truncate text-foreground">{pages ? r.key.replace(/^https?:\/\/[^/]+/, '') || '/' : r.key}</td>
                  <td className="text-right px-2 tabular-nums">{fmt(r.clicks)}</td>
                  <td className="text-right px-2 tabular-nums">{fmt(r.impressions)}</td>
                  <td className="text-right pl-2 tabular-nums">{r.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function SeoDashboard() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['seo-dashboard'],
    queryFn: () => call({ action: 'get' }),
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000,
  });


  const refresh = async (siteUrl?: string) => {
    setRefreshing(true);
    try {
      const res = await call({ action: 'refresh', siteUrl });
      qc.setQueryData(['seo-dashboard'], res);
      toast.success('Search data updated');
    } catch (e) {
      toast.error(`Could not refresh: ${(e as Error).message}`);
    } finally { setRefreshing(false); }
  };

  const snap = data?.snapshot;
  const d = snap?.data;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
        <Link to="/admin" className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Admin</Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif text-foreground">SEO progress</h1>
            <p className="text-sm text-muted-foreground">Google Search Console data for savo.co.nz{d ? ` · ${d.range.start} to ${d.range.end}` : ''}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {!isAdmin && <p className="text-sm text-muted-foreground">This page is for admins only.</p>}
        {isAdmin && isLoading && <p className="text-sm text-muted-foreground">Loading search data…</p>}
        {error && <Card className="p-4 text-sm text-destructive">{(error as Error).message}</Card>}

        {data?.selection_required && (
          <Card className="p-4 space-y-2">
            <p className="text-sm text-foreground">Several Search Console properties cover savo.co.nz. Choose one:</p>
            <div className="flex flex-wrap gap-2">
              {data.selection_required.map((s) => <Button key={s} size="sm" variant="outline" onClick={() => refresh(s)}>{s}</Button>)}
            </div>
          </Card>
        )}

        {d && (
          <>
            <Card className="p-5">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-xs text-muted-foreground">Goal: {MONTHLY_CLICK_GOAL.toLocaleString()} visitors from Google per month</div>
                  <div className="text-3xl font-bold text-foreground tabular-nums">{fmt(d.totals.clicks)} <span className="text-base font-normal text-muted-foreground">in the last 28 days</span></div>
                </div>
                <div className="text-xl font-bold text-primary tabular-nums">{goalProgress(d.totals.clicks)}%</div>
              </div>
              <Progress value={goalProgress(d.totals.clicks)} />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Clicks (28d)" value={d.totals.clicks} prev={d.prevTotals.clicks} />
              <Stat label="Impressions (28d)" value={d.totals.impressions} prev={d.prevTotals.impressions} />
              <Stat label="Avg. position" value={Number(d.totals.position.toFixed(1))} prev={d.prevTotals.position} invert />
              <Stat label="Click rate" value={Number((d.totals.ctr * 100).toFixed(1))} prev={d.prevTotals.ctr * 100} suffix="%" />
            </div>

            <Card className="p-4">
              <h2 className="font-semibold text-foreground mb-3">Last 90 days</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.daily}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" minTickGap={30} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                    <Line yAxisId="l" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} name="Clicks" />
                    <Line yAxisId="r" type="monotone" dataKey="impressions" stroke="hsl(var(--accent))" dot={false} strokeWidth={2} name="Impressions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Pages showing in Google (90 days)</div>
                <div className="text-2xl font-bold text-foreground tabular-nums mt-1">{fmt(d.pagesWithImpressions90d)}</div>
                <p className="text-xs text-muted-foreground mt-1">Pages that appeared in at least one search. A page can be indexed without showing up here yet.</p>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Sitemap</div>
                {d.sitemap.error ? (
                  <p className="text-sm text-muted-foreground mt-1">Sitemap not submitted to this property yet.</p>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground tabular-nums mt-1">{fmt(d.sitemap.submitted ?? 0)} <span className="text-sm font-normal text-muted-foreground">pages submitted</span></div>
                    <p className={`text-xs mt-1 ${d.sitemap.errors ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {d.sitemap.errors ?? 0} errors · {d.sitemap.warnings ?? 0} warnings{d.sitemap.lastDownloaded ? ` · last read ${new Date(d.sitemap.lastDownloaded).toLocaleDateString()}` : ''}
                    </p>
                  </>
                )}
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Table title="Top searches" rows={d.topQueries} />
              <Table title="Top pages" rows={d.topPages} pages />
            </div>

            <p className="text-xs text-muted-foreground">Updated {new Date(snap!.created_at).toLocaleString()} · Google data runs about 2–3 days behind · Property {snap!.site_url}</p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
