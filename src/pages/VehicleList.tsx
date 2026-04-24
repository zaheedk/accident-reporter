import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ArrowLeft, Phone, CheckCircle2, PowerOff, Search, X, ShieldAlert, FileWarning, CalendarClock, Pencil, FileText, AlertOctagon } from 'lucide-react';
import { getVehicles, deleteVehicle } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Vehicle } from '@/types';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { useQueryClient } from '@tanstack/react-query';

type FilterType = 'all' | 'active' | 'inactive';

// Compute days-until from an ISO yyyy-mm-dd date string. Returns null if missing/invalid.
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// Status chip — color-coded by days remaining.
function StatusChip({ label, days }: { label: string; days: number | null }) {
  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/40 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
        {label} —
      </span>
    );
  }
  const tone =
    days < 0 ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/25' :
    days <= 30 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30' :
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30';
  const display = days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'today' : `${days}d`;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider ${tone}`}>
      {label} {display}
    </span>
  );
}

// Circular progress ring. `progress` 0–1.
function ProgressRing({ progress, tone }: { progress: number; tone: 'good' | 'warn' | 'bad' | 'none' }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, progress)) * c;
  const stroke =
    tone === 'good' ? 'hsl(var(--primary))' :
    tone === 'warn' ? 'rgb(245 158 11)' :
    tone === 'bad' ? 'hsl(var(--destructive))' :
    'hsl(var(--muted))';
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3" opacity="0.5" />
      {tone !== 'none' && (
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      )}
    </svg>
  );
}

export default function VehicleList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<FilterType>('active');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useOfflineQuery<Vehicle[]>(
    ['vehicles', user?.id ?? ''],
    () => getVehicles(user!.id),
    { enabled: !!user }
  );

  const { data: insurerPhones = {} } = useOfflineQuery<Record<string, string>>(
    ['insurer-phones'],
    async () => {
      const { data } = await supabase.from('insurance_companies').select('name, phone');
      const map: Record<string, string> = {};
      data?.forEach((ic: any) => { if (ic.phone) map[ic.name] = ic.phone; });
      return map;
    },
    { enabled: !!user }
  );

  const { data: displayName = '' } = useOfflineQuery<string>(
    ['profile-display-name', user?.id ?? ''],
    async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user!.id).maybeSingle();
      return (data?.display_name || '').trim();
    },
    { enabled: !!user }
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVehicle(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const activeCount = useMemo(() => vehicles.filter(v => v.isActive !== false).length, [vehicles]);
  const inactiveCount = useMemo(() => vehicles.filter(v => v.isActive === false).length, [vehicles]);
  const wofExpiredCount = useMemo(() => vehicles.filter(v => v.isActive !== false && v.wofExpiry && v.wofExpiry < today).length, [vehicles, today]);
  const regoExpiredCount = useMemo(() => vehicles.filter(v => v.isActive !== false && v.regoExpiry && v.regoExpiry < today).length, [vehicles, today]);
  const insuranceExpiringCount = useMemo(() => vehicles.filter(v => v.isActive !== false && v.insuranceExpiry && v.insuranceExpiry >= today && v.insuranceExpiry <= soon).length, [vehicles, today, soon]);

  const filteredVehicles = useMemo(() => {
    let list = [...vehicles].sort((a, b) => Number(a.isActive === false) - Number(b.isActive === false));
    if (filter === 'active') list = list.filter(v => v.isActive !== false);
    else if (filter === 'inactive') list = list.filter(v => v.isActive === false);
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(v =>
      (v.regoNumber || '').toLowerCase().includes(q) ||
      (v.make || '').toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q) ||
      String(v.year || '').includes(q)
    );
  }, [vehicles, filter, search]);

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
  const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  const firstName = displayName ? displayName.split(' ')[0] : '';
  const garageEyebrow = firstName ? `${firstName}’s Garage` : 'Garage';

  return (
    <AppLayout>
      <div className="theme-garage relative">
        {/* Ambient glow backdrop — subtle in light, richer in dark */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-[480px] overflow-hidden">
          <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full blur-[130px] opacity-40 dark:opacity-60"
               style={{ background: 'hsl(var(--garage-tint-a) / 0.45)' }} />
          <div className="absolute -top-24 right-1/4 w-[460px] h-[460px] rounded-full blur-[130px] opacity-35 dark:opacity-50"
               style={{ background: 'hsl(var(--garage-tint-b) / 0.35)' }} />
        </div>

        <motion.div className="relative space-y-6" variants={stagger} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                aria-label="Back"
                className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-[15px] font-bold uppercase tracking-[0.18em] text-foreground truncate">
                  {garageEyebrow}
                </h1>
                {vehicles.length > 0 && (
                  <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} registered
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/vehicles/new"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-semibold rounded-xl bg-primary text-primary-foreground active:scale-[0.98] hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] transition-all flex-shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} /> New
            </Link>
          </motion.div>

          {/* Body: stacks on mobile, two-column rail+content on desktop */}
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6 space-y-6 lg:space-y-0">
            {/* Left rail */}
            <motion.aside variants={fadeUp} className="space-y-3">
              {vehicles.length > 0 && (
                <>
                  {/* Status filter tiles — glass */}
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    <button
                      onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
                      className={`relative overflow-hidden text-left rounded-2xl p-4 border backdrop-blur-xl transition-all active:scale-[0.98] ${
                        filter === 'active'
                          ? 'bg-primary/90 text-primary-foreground border-primary shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)]'
                          : 'garage-glass hover:border-primary/50 hover:bg-[hsl(var(--garage-glass)/0.95)]'
                      }`}
                    >
                      {filter === 'active' && (
                        <div aria-hidden className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
                      )}
                      <div className="relative flex items-center justify-between mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          filter === 'active' ? 'bg-primary-foreground/15' : 'bg-muted/60'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                          filter === 'active' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>Active</span>
                      </div>
                      <div className="relative text-2xl font-extrabold tabular-nums leading-none">{activeCount}</div>
                    </button>
                    <button
                      onClick={() => setFilter(filter === 'inactive' ? 'all' : 'inactive')}
                      className={`relative overflow-hidden text-left rounded-2xl p-4 border backdrop-blur-xl transition-all active:scale-[0.98] ${
                        filter === 'inactive'
                          ? 'bg-foreground/95 text-background border-foreground'
                          : 'garage-glass hover:border-foreground/30 hover:bg-[hsl(var(--garage-glass)/0.95)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          filter === 'inactive' ? 'bg-background/10' : 'bg-muted/60'
                        }`}>
                          <PowerOff className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                          filter === 'inactive' ? 'text-background/60' : 'text-muted-foreground'
                        }`}>Inactive</span>
                      </div>
                      <div className="text-2xl font-extrabold tabular-nums leading-none">{inactiveCount}</div>
                    </button>
                  </div>

                  {/* Alerts panel — desktop only */}
                  <div className="hidden lg:block rounded-2xl garage-glass overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
                    <div className="px-4 pt-3.5 pb-2 eyebrow">Alerts</div>
                    <div className="garage-divide">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${wofExpiredCount > 0 ? 'bg-destructive/20 text-destructive ring-1 ring-destructive/30' : 'bg-muted/40 text-muted-foreground'}`}>
                          <FileWarning className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground">WOF expired</p>
                        </div>
                        <span className={`text-base font-extrabold tabular-nums ${wofExpiredCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{wofExpiredCount}</span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${regoExpiredCount > 0 ? 'bg-destructive/20 text-destructive ring-1 ring-destructive/30' : 'bg-muted/40 text-muted-foreground'}`}>
                          <ShieldAlert className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground">Rego expired</p>
                        </div>
                        <span className={`text-base font-extrabold tabular-nums ${regoExpiredCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{regoExpiredCount}</span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${insuranceExpiringCount > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30' : 'bg-muted/40 text-muted-foreground'}`}>
                          <CalendarClock className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground">Insurance &lt; 30d</p>
                        </div>
                        <span className={`text-base font-extrabold tabular-nums ${insuranceExpiringCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>{insuranceExpiringCount}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.aside>

            {/* Right column */}
            <div className="space-y-4">
              {/* Search — glass */}
              {vehicles.length > 0 && (
                <motion.div variants={fadeUp} className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search rego, make, model..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-10 h-11 rounded-xl garage-glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </motion.div>
              )}

              {/* List */}
              {vehicles.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-2xl garage-glass p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto mb-4 flex items-center justify-center">
                    <Car className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-bold text-foreground">No vehicles yet</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                    Add your vehicles to speed up incident reporting.
                  </p>
                  <Link
                    to="/vehicles/new"
                    className="inline-flex items-center gap-1.5 h-10 px-5 mt-5 text-[13px] font-semibold rounded-xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.4} /> Add first vehicle
                  </Link>
                </motion.div>
              ) : filteredVehicles.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-2xl garage-glass p-8 text-center">
                  <p className="text-sm text-muted-foreground">No vehicles match your filters</p>
                  <button
                    onClick={() => { setSearch(''); setFilter('all'); }}
                    className="mt-3 text-xs font-semibold text-primary hover:opacity-80"
                  >
                    Clear filters
                  </button>
                </motion.div>
              ) : (
                <motion.div variants={fadeUp} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="eyebrow">
                      {filter === 'all' ? 'All vehicles' : filter === 'active' ? 'Active' : 'Inactive'}
                    </p>
                    <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                      {filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehicle' : 'vehicles'}
                    </span>
                  </div>
                  {filteredVehicles.map((v) => {
                    const wofDays = daysUntil(v.wofExpiry);
                    const regoDays = daysUntil(v.regoExpiry);
                    const insDays = daysUntil(v.insuranceExpiry);
                    const isExpired = (wofDays !== null && wofDays < 0) || (regoDays !== null && regoDays < 0) || (insDays !== null && insDays < 0);
                    const insurerPhone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';
                    const isInactive = v.isActive === false;

                    // Progress ring: based on most-urgent expiry within next 365d.
                    // Tone: bad if any expired, warn if any <=30d, good otherwise.
                    const allDays = [wofDays, regoDays, insDays].filter((d): d is number => d !== null);
                    const minDays = allDays.length ? Math.min(...allDays) : null;
                    const ringTone: 'good' | 'warn' | 'bad' | 'none' =
                      minDays === null ? 'none' :
                      minDays < 0 ? 'bad' :
                      minDays <= 30 ? 'warn' : 'good';
                    const ringProgress = minDays === null ? 0 : Math.max(0, Math.min(1, minDays / 365));

                    return (
                      <div
                        key={v.id}
                        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${
                          isInactive
                            ? 'bg-muted/20 border-dashed garage-hairline opacity-70'
                            : isExpired
                              ? 'garage-glass !border-destructive/40 hover:!border-destructive/60 hover:shadow-[0_12px_40px_-12px_hsl(var(--destructive)/0.4)]'
                              : 'garage-glass hover:border-primary/50 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.35)]'
                        }`}
                      >
                        <div className="flex items-stretch">
                          <Link to={`/vehicles/${v.slug || v.id}/edit`} className="flex flex-1 min-w-0 gap-3.5 p-3">
                            {/* Photo with progress ring */}
                            <div className="w-[92px] h-[92px] flex-shrink-0 relative">
                              <ProgressRing progress={ringProgress} tone={isInactive ? 'none' : ringTone} />
                              <div className="absolute inset-[6px] bg-muted overflow-hidden rounded-full">
                                {v.photoUrl ? (
                                  <img
                                    src={v.photoUrl}
                                    alt={`${v.make} ${v.model}`}
                                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isInactive ? 'grayscale' : ''}`}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Car className="w-9 h-9 text-muted-foreground/30" strokeWidth={1.2} />
                                  </div>
                                )}
                              </div>
                              {isInactive && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-background/90 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider text-foreground ring-1 garage-hairline">
                                  Inactive
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[17px] font-extrabold text-foreground tracking-wide leading-tight truncate tabular-nums">
                                  {v.regoNumber}
                                </p>
                                <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                                  {v.year} {v.make} {v.model}
                                </p>
                              </div>

                              {!isInactive && (
                                <div className="flex flex-wrap gap-1">
                                  <StatusChip label="WOF" days={wofDays} />
                                  <StatusChip label="REGO" days={regoDays} />
                                  <StatusChip label="INS" days={insDays} />
                                </div>
                              )}
                            </div>
                          </Link>

                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(v); }}
                            aria-label="Delete vehicle"
                            className="flex items-center justify-center w-11 border-l garage-hairline text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Multi-action footer */}
                        {!isInactive && (
                          <div className="flex items-stretch border-t garage-hairline divide-x garage-divide text-[11px] font-semibold">
                            <Link
                              to={`/vehicles/${v.slug || v.id}/edit`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </Link>
                            <Link
                              to="/documents"
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> Docs
                            </Link>
                            <Link
                              to="/claims/new"
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-amber-700 dark:text-amber-400 hover:bg-amber-500/5 transition-colors"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" /> Lodge
                            </Link>
                            {insurerPhone ? (
                              <a
                                href={`tel:${insurerPhone.replace(/\s/g, '')}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-foreground bg-foreground/5 hover:bg-foreground/10 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" strokeWidth={2.4} /> Call
                              </a>
                            ) : (
                              <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground/50">
                                <Phone className="w-3.5 h-3.5" /> Call
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.year} {deleteTarget?.make} {deleteTarget?.model}?</AlertDialogTitle>
            <AlertDialogDescription>This vehicle and its data will be permanently removed. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
