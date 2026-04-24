import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ArrowLeft, Phone, CheckCircle2, PowerOff, Search, X, ShieldAlert, FileWarning, CalendarClock } from 'lucide-react';
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

  return (
    <AppLayout>
      <div className="theme-dashboard-dark">
        <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
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
              <h1 className="text-[15px] font-bold uppercase tracking-[0.18em] text-foreground truncate">
                Garage
              </h1>
            </div>
            <Link
              to="/vehicles/new"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-semibold rounded-xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform flex-shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} /> New
            </Link>
          </motion.div>

          {/* Stat tiles */}
          {vehicles.length > 0 && (
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
                className={`text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                  filter === 'active'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    filter === 'active' ? 'bg-primary-foreground/15' : 'bg-muted'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                    filter === 'active' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>Active</span>
                </div>
                <div className="text-2xl font-extrabold tabular-nums leading-none">{activeCount}</div>
              </button>
              <button
                onClick={() => setFilter(filter === 'inactive' ? 'all' : 'inactive')}
                className={`text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                  filter === 'inactive'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card border-border hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    filter === 'inactive' ? 'bg-background/10' : 'bg-muted'
                  }`}>
                    <PowerOff className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                    filter === 'inactive' ? 'text-background/60' : 'text-muted-foreground'
                  }`}>Inactive</span>
                </div>
                <div className="text-2xl font-extrabold tabular-nums leading-none">{inactiveCount}</div>
              </button>
            </motion.div>
          )}

          {/* Search */}
          {vehicles.length > 0 && (
            <motion.div variants={fadeUp} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search rego, make, model..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
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
            <motion.div variants={fadeUp} className="rounded-2xl bg-card border border-border p-8 text-center">
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
            <motion.div variants={fadeUp} className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No vehicles match your filters</p>
              <button
                onClick={() => { setSearch(''); setFilter('all'); }}
                className="mt-3 text-xs font-semibold text-primary hover:opacity-80"
              >
                Clear filters
              </button>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <p className="eyebrow">
                  {filter === 'all' ? 'All vehicles' : filter === 'active' ? 'Active' : 'Inactive'}
                </p>
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehicle' : 'vehicles'}
                </span>
              </div>
              {filteredVehicles.map((v) => {
                const today = new Date().toISOString().slice(0, 10);
                const isExpired = (v.wofExpiry && v.wofExpiry < today) || (v.regoExpiry && v.regoExpiry < today) || (v.insuranceExpiry && v.insuranceExpiry < today);
                const insurerPhone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';
                const isInactive = v.isActive === false;

                return (
                  <div
                    key={v.id}
                    className={`group rounded-2xl border overflow-hidden transition-colors ${
                      isInactive
                        ? 'bg-muted/20 border-dashed border-border opacity-70'
                        : isExpired
                          ? 'bg-card border-destructive/40 hover:border-destructive/60'
                          : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-stretch">
                      <Link to={`/vehicles/${v.slug || v.id}/edit`} className="flex flex-1 min-w-0 gap-3.5 p-2.5">
                        {/* Photo */}
                        <div className="w-[88px] h-[88px] flex-shrink-0 bg-muted overflow-hidden rounded-xl relative">
                          {v.photoUrl ? (
                            <img
                              src={v.photoUrl}
                              alt={`${v.make} ${v.model}`}
                              className={`w-full h-full object-cover ${isInactive ? 'grayscale' : ''}`}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-9 h-9 text-muted-foreground/30" strokeWidth={1.2} />
                            </div>
                          )}
                          {isInactive && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider text-foreground">
                              Inactive
                            </div>
                          )}
                          {!isInactive && isExpired && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[9px] font-bold uppercase tracking-wider">
                              Expired
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                          <div className="min-w-0">
                            <p className="text-[17px] font-extrabold text-foreground tracking-wide leading-tight truncate tabular-nums">
                              {v.regoNumber}
                            </p>
                            <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                              {v.year} {v.make} {v.model}
                            </p>
                          </div>

                          {insurerPhone && !isInactive ? (
                            <a
                              href={`tel:${insurerPhone.replace(/\s/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-background bg-foreground hover:bg-foreground/90 whitespace-nowrap transition-colors w-fit"
                            >
                              <Phone className="w-3 h-3" strokeWidth={2.4} />
                              Call insurer
                            </a>
                          ) : (
                            <div className="h-[22px] mt-1.5" />
                          )}
                        </div>
                      </Link>

                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(v); }}
                        aria-label="Delete vehicle"
                        className="flex items-center justify-center w-11 border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
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
