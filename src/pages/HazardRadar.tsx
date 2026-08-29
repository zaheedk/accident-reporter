import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  MapPin,
  Plus,
  ThumbsUp,
  Loader2,
  RefreshCw,
  Trash2,
  Radar,
  ChevronRight,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { distanceKm } from '@/lib/tow-cities';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const HAZARD_TYPES = [
  { id: 'pothole', label: 'Pothole', emoji: '🕳️' },
  { id: 'crash', label: 'Crash / blockage', emoji: '🚗' },
  { id: 'flooding', label: 'Flooding', emoji: '🌊' },
  { id: 'debris', label: 'Debris on road', emoji: '⚠️' },
  { id: 'ice', label: 'Ice / slippery', emoji: '❄️' },
  { id: 'roadworks', label: 'Roadworks', emoji: '🚧' },
] as const;

type Hazard = {
  id: string;
  user_id: string;
  hazard_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_label: string;
  region: string;
  created_at: string;
  expires_at: string;
};

export default function HazardRadar() {
  const { user } = useAuth();
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [confirmCounts, setConfirmCounts] = useState<Record<string, number>>({});
  const [myConfirms, setMyConfirms] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'pothole', description: '', label: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: hz }, { data: cf }] = await Promise.all([
      supabase
        .from('road_hazards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('hazard_confirmations').select('hazard_id, user_id'),
    ]);
    setHazards((hz as Hazard[]) || []);
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    (cf || []).forEach((row: { hazard_id: string; user_id: string }) => {
      counts[row.hazard_id] = (counts[row.hazard_id] || 0) + 1;
      if (user?.id && row.user_id === user.id) mine.add(row.hazard_id);
    });
    setConfirmCounts(counts);
    setMyConfirms(mine);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const sorted = useMemo(() => {
    if (!coords) return hazards;
    return [...hazards].sort(
      (a, b) =>
        distanceKm(coords.lat, coords.lng, a.latitude, a.longitude) -
        distanceKm(coords.lat, coords.lng, b.latitude, b.longitude),
    );
  }, [hazards, coords]);

  const handleReport = async () => {
    if (!user?.id) return;
    if (!coords) {
      toast.error('Location needed', { description: 'Enable location access to pin the hazard.' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('road_hazards').insert({
      user_id: user.id,
      hazard_type: form.type,
      description: form.description.trim().slice(0, 500),
      latitude: coords.lat,
      longitude: coords.lng,
      location_label: form.label.trim().slice(0, 120),
    });
    setSaving(false);
    if (error) {
      toast.error('Could not report hazard');
      return;
    }
    toast.success('Hazard reported — thanks for the heads up');
    setSheetOpen(false);
    setForm({ type: 'pothole', description: '', label: '' });
    load();
  };

  const toggleConfirm = async (hazardId: string) => {
    if (!user?.id) return;
    const has = myConfirms.has(hazardId);
    const next = new Set(myConfirms);
    const counts = { ...confirmCounts };
    if (has) {
      next.delete(hazardId);
      counts[hazardId] = Math.max(0, (counts[hazardId] || 1) - 1);
      await supabase.from('hazard_confirmations').delete().eq('hazard_id', hazardId).eq('user_id', user.id);
    } else {
      next.add(hazardId);
      counts[hazardId] = (counts[hazardId] || 0) + 1;
      await supabase.from('hazard_confirmations').insert({ hazard_id: hazardId, user_id: user.id });
    }
    setMyConfirms(next);
    setConfirmCounts(counts);
  };

  const removeHazard = async (hazardId: string) => {
    await supabase.from('road_hazards').delete().eq('id', hazardId);
    setHazards((prev) => prev.filter((h) => h.id !== hazardId));
    toast.success('Report removed');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Radar className="w-5 h-5 text-primary" /> Hazard radar
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Live road hazards reported by SAVO drivers near you. Reports expire after 48 hours.
            </p>
          </div>
          <button
            onClick={() => load()}
            aria-label="Refresh hazards"
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        <button
          onClick={() => setSheetOpen(true)}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          <Plus className="w-4 h-4" /> Report a hazard
        </button>

        {!coords && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-[12px] text-muted-foreground">
            Turn on location to sort hazards by how close they are to you.
          </div>
        )}

        {loading ? (
          <div className="py-10 flex justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">No active hazards nearby</p>
            <p className="text-[12px] text-muted-foreground">Be the first to warn other drivers.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((h) => {
              const meta = HAZARD_TYPES.find((t) => t.id === h.hazard_type);
              const dist = coords ? distanceKm(coords.lat, coords.lng, h.latitude, h.longitude) : null;
              return (
                <li key={h.id} className="rounded-2xl bg-card border border-border p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                      {meta?.emoji || '⚠️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-foreground">{meta?.label || h.hazard_type}</div>
                      <div className="text-[12px] text-muted-foreground truncate">
                        {h.location_label || 'Pinned location'}
                        {dist !== null && ` · ${dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`} away`}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {h.description && (
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{h.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => toggleConfirm(h.id)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                        myConfirms.has(h.id)
                          ? 'border-primary text-primary bg-primary/10'
                          : 'border-border text-foreground'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Still there · {confirmCounts[h.id] || 0}
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${h.latitude},${h.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-medium text-foreground"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Map
                    </a>
                    {user?.id === h.user_id && (
                      <button
                        onClick={() => removeHazard(h.id)}
                        aria-label="Remove my report"
                        className="ml-auto w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          to="/report-to-council"
          className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-foreground/20 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-foreground">Report it to the council too</div>
            <div className="text-[12px] text-muted-foreground">Get potholes and damaged signs fixed properly.</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </Link>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Report a hazard</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-3 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {HAZARD_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setForm((f) => ({ ...f, type: t.id }))}
                  className={`rounded-xl border px-2 py-3 text-[12px] font-medium flex flex-col items-center gap-1 ${
                    form.type === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Street or landmark (optional)"
              className="h-10 text-sm"
            />
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What should other drivers know?"
              rows={3}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {coords
                ? 'Your current location will be attached to this report.'
                : 'Location unavailable — enable location access to report.'}
            </p>
            <button
              onClick={handleReport}
              disabled={saving || !coords}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Post hazard
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
