import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ArrowLeft, Phone, CheckCircle2, PowerOff, Search, X, ShieldAlert, FileWarning, CalendarClock, Pencil, FileText, AlertOctagon, Star } from 'lucide-react';
// (ProgressRing removed — Apple/Linear style favours flat squircle thumbnails)
import { getVehicles, deleteVehicle, setDefaultVehicle } from '@/lib/storage';
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

// Status chip — Apple/Linear style: soft pill, no uppercase shouting.
function StatusChip({ label, days }: { label: string; days: number | null }) {
  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground bg-muted/60">
        <span className="opacity-60">{label}</span>
        <span className="opacity-40">—</span>
      </span>
    );
  }
  const tone =
    days < 0 ? 'text-destructive bg-destructive/10' :
    days <= 30 ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10' :
    'text-foreground/70 bg-muted/60';
  const dot =
    days < 0 ? 'bg-destructive' :
    days <= 30 ? 'bg-amber-500' :
    'bg-emerald-500';
  const display = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `${days}d`;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{display}</span>
    </span>
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

  const handleSetDefault = async (vehicle: Vehicle) => {
    if (vehicle.isDefault) return;
    try {
      await setDefaultVehicle(vehicle.id);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (e) {
      console.error(e);
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
        <motion.div className="relative space-y-8" variants={stagger} initial="hidden" animate="visible">
          {/* Header — Apple/Linear: large display title, fine eyebrow, no uppercase shouting */}
          <motion.div variants={fadeUp} className="flex items-end justify-between gap-3 pt-2">
            <div className="flex items-start gap-2 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                aria-label="Back"
                className="w-9 h-9 -ml-1 mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[28px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate">
                  {firstName ? `${firstName}’s Garage` : 'Garage'}
                </h1>
                {vehicles.length > 0 && (
                  <p className="text-[13px] text-muted-foreground tabular-nums mt-1">
                    {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/vehicles/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} /> New
            </Link>
          </motion.div>

          {/* Body */}
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 lg:grid-cols-[260px_1fr] lg:gap-8 space-y-6 md:space-y-0">
            {/* Left rail — clean cards, hairline borders */}
            <motion.aside variants={fadeUp} className="space-y-4">
              {vehicles.length > 0 && (
                <>
                  {/* Filter tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                    <button
                      onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
                      className={`text-left rounded-xl p-3.5 border transition-all ${
                        filter === 'active'
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card border-border hover:border-foreground/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[12px] font-medium ${filter === 'active' ? 'text-background/70' : 'text-muted-foreground'}`}>Active</span>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${filter === 'active' ? 'text-background/60' : 'text-muted-foreground/60'}`} strokeWidth={2} />
                      </div>
                      <div className="text-[22px] font-semibold tabular-nums leading-none mt-2 tracking-tight">{activeCount}</div>
                    </button>
                    <button
                      onClick={() => setFilter(filter === 'inactive' ? 'all' : 'inactive')}
                      className={`text-left rounded-xl p-3.5 border transition-all ${
                        filter === 'inactive'
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card border-border hover:border-foreground/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[12px] font-medium ${filter === 'inactive' ? 'text-background/70' : 'text-muted-foreground'}`}>Inactive</span>
                        <PowerOff className={`w-3.5 h-3.5 ${filter === 'inactive' ? 'text-background/60' : 'text-muted-foreground/60'}`} strokeWidth={2} />
                      </div>
                      <div className="text-[22px] font-semibold tabular-nums leading-none mt-2 tracking-tight">{inactiveCount}</div>
                    </button>
                  </div>

                  {/* Alerts panel — desktop */}
                  <div className="hidden md:block rounded-xl bg-card border border-border overflow-hidden">
                    <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Alerts</div>
                    <div className="divide-y divide-border">
                      {[
                        { label: 'WOF expired', count: wofExpiredCount, icon: FileWarning, urgent: wofExpiredCount > 0, tone: 'destructive' as const },
                        { label: 'Rego expired', count: regoExpiredCount, icon: ShieldAlert, urgent: regoExpiredCount > 0, tone: 'destructive' as const },
                        { label: 'Insurance < 30d', count: insuranceExpiringCount, icon: CalendarClock, urgent: insuranceExpiringCount > 0, tone: 'warn' as const },
                      ].map(({ label, count, icon: Icon, urgent, tone }) => (
                        <div key={label} className="flex items-center gap-3 px-3.5 py-2.5">
                          <Icon className={`w-3.5 h-3.5 ${urgent ? (tone === 'destructive' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400') : 'text-muted-foreground/60'}`} strokeWidth={2} />
                          <p className="flex-1 min-w-0 text-[13px] text-foreground">{label}</p>
                          <span className={`text-[13px] font-medium tabular-nums ${urgent ? (tone === 'destructive' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400') : 'text-muted-foreground'}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.aside>

            {/* Right column */}
            <div className="space-y-3">
              {/* Search */}
              {vehicles.length > 0 && (
                <motion.div variants={fadeUp} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                  <input
                    type="text"
                    placeholder="Search rego, make, model"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-9 h-10 rounded-lg bg-card border border-border text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/40 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </motion.div>
              )}

              {/* List */}
              {vehicles.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-xl bg-card border border-border p-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto mb-4 flex items-center justify-center">
                    <Car className="w-6 h-6" strokeWidth={1.6} />
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">No vehicles yet</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    Add your vehicles to speed up incident reporting.
                  </p>
                  <Link
                    to="/vehicles/new"
                    className="inline-flex items-center gap-1.5 h-9 px-4 mt-5 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.2} /> Add first vehicle
                  </Link>
                </motion.div>
              ) : filteredVehicles.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-xl bg-card border border-border p-10 text-center">
                  <p className="text-[13px] text-muted-foreground">No vehicles match your filters</p>
                  <button
                    onClick={() => { setSearch(''); setFilter('all'); }}
                    className="mt-3 text-[12px] font-medium text-accent hover:opacity-80"
                  >
                    Clear filters
                  </button>
                </motion.div>
              ) : (
                <motion.div variants={fadeUp} className="space-y-2">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {filter === 'all' ? 'All vehicles' : filter === 'active' ? 'Active' : 'Inactive'}
                    </p>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {filteredVehicles.length}
                    </span>
                  </div>
                  {filteredVehicles.map((v) => {
                    const wofDays = daysUntil(v.wofExpiry);
                    const regoDays = daysUntil(v.regoExpiry);
                    const insDays = daysUntil(v.insuranceExpiry);
                    const isExpired = (wofDays !== null && wofDays < 0) || (regoDays !== null && regoDays < 0) || (insDays !== null && insDays < 0);
                    const insurerPhone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';
                    const isInactive = v.isActive === false;

                    return (
                      <div
                        key={v.id}
                        className={`rounded-xl bg-card border overflow-hidden hover:border-foreground/20 transition-colors group ${
                          isInactive ? 'border-dashed border-border opacity-65' : 'border-border'
                        }`}
                      >
                        <Link to={`/vehicles/${v.slug || v.id}/edit`} className="block p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
                              {v.photoUrl ? (
                                <img
                                  src={v.photoUrl}
                                  alt={`${v.make} ${v.model}`}
                                  className={`w-full h-full object-cover ${isInactive ? 'grayscale' : ''}`}
                                  loading="lazy"
                                />
                              ) : (
                                <Car className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-[13px] font-semibold text-foreground truncate tabular-nums">{v.regoNumber}</div>
                                {v.isDefault && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded px-1.5 py-px flex-shrink-0">
                                    <Star className="w-2.5 h-2.5 fill-current" /> Default
                                  </span>
                                )}
                                {isInactive && (
                                  <span className="text-[10px] font-medium text-muted-foreground border border-border rounded px-1.5 py-px flex-shrink-0">Inactive</span>
                                )}
                                {v.isRental && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white rounded px-1.5 py-px flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>
                                    Hire
                                  </span>
                                )}
                              </div>
                              <div className="text-[12px] text-muted-foreground truncate">
                                {v.year} {v.make} {v.model}
                                {v.isRental && v.hireEndDate && <span className="ml-2 text-amber-600 dark:text-amber-400">· Return by {v.hireEndDate}</span>}
                              </div>
                            </div>
                            {!isInactive && vehicles.length > 1 && !v.isDefault && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSetDefault(v); }}
                                aria-label="Set as default vehicle"
                                title="Set as default"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/10 transition-colors shrink-0"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!v.isRental && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(v); }}
                                aria-label="Delete vehicle"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {!isInactive && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              <StatusChip label="WOF" days={wofDays} />
                              <StatusChip label="Rego" days={regoDays} />
                              <StatusChip label="Insurance" days={insDays} />
                            </div>
                          )}
                        </Link>
                        {!isInactive && (
                          <div className="flex border-t border-border divide-x divide-border">
                            <Link
                              to="/claims/new"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" strokeWidth={2} /> Report
                            </Link>
                            {insurerPhone ? (
                              <a
                                href={`tel:${insurerPhone.replace(/\s/g, '')}`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" strokeWidth={2} /> Insurer
                              </a>
                            ) : (
                              <Link
                                to={`/vehicles/${v.slug || v.id}/edit`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Insurer
                              </Link>
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
