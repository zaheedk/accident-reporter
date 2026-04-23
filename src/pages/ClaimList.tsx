import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, FileText, ChevronRight, Search, X, Calendar, Car, ArrowLeft, Trash2, AlertTriangle, FileEdit, CheckCircle2 } from 'lucide-react';
import { getClaims, getVehicles, deleteClaim } from '@/lib/storage';
import { ClaimReport, Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getThumbnailUrl } from '@/lib/image-url';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

type FilterType = 'all' | 'draft' | 'saved';

export default function ClaimList() {
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claimMeta, setClaimMeta] = useState<Record<string, { claimNumber: number | null; reportNumber: string | null }>>({});
  const [claimPhotos, setClaimPhotos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteClaim(deleteId);
      setClaims(prev => prev.filter(c => c.id !== deleteId));
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete report');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [c, v] = await Promise.all([getClaims(user.id), getVehicles(user.id)]);
      setClaims(c);
      setVehicles(v);

      const meta: Record<string, { claimNumber: number | null; reportNumber: string | null }> = {};
      const claimIds = c.map(cl => cl.id).filter(Boolean);

      if (claimIds.length > 0) {
        const { data: metaData } = await supabase.from('claims').select('id, claim_number, report_number').in('id', claimIds);
        if (metaData) {
          metaData.forEach((m: any) => { meta[m.id] = { claimNumber: m.claim_number, reportNumber: m.report_number }; });
        }

        const { data: photoData } = await supabase.from('claim_photos').select('claim_id, file_path').in('claim_id', claimIds).order('created_at', { ascending: true });
        if (photoData && photoData.length > 0) {
          const photoMap: Record<string, string> = {};
          for (const p of photoData as any[]) {
            if (!photoMap[p.claim_id]) {
              photoMap[p.claim_id] = (await getThumbnailUrl('claim-photos', p.file_path)) || '';
            }
          }
          setClaimPhotos(photoMap);
        }
      }
      setClaimMeta(meta);
    };
    load();
  }, [user]);

  const vehicleMap = useMemo(() => {
    const m: Record<string, Vehicle> = {};
    vehicles.forEach(v => { m[v.id] = v; });
    return m;
  }, [vehicles]);

  const getRegoForClaim = (c: ClaimReport) => vehicleMap[c.vehicleId]?.regoNumber || '';

  const draftCount = useMemo(() => claims.filter(c => c.status === 'draft').length, [claims]);
  const savedCount = useMemo(() => claims.filter(c => c.status !== 'draft').length, [claims]);

  const filteredClaims = useMemo(() => {
    let list = claims;
    if (filter === 'draft') list = list.filter(c => c.status === 'draft');
    else if (filter === 'saved') list = list.filter(c => c.status !== 'draft');

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(c => {
      const rego = getRegoForClaim(c).toLowerCase();
      const date = (c.incidentDate || '').toLowerCase();
      const meta = claimMeta[c.id];
      const claimNumStr = meta?.claimNumber ? String(meta.claimNumber) : '';
      const reportNum = (meta?.reportNumber || '').toLowerCase();
      const location = (c.incidentLocation || '').toLowerCase();
      return rego.includes(q) || date.includes(q) || claimNumStr.includes(q) || reportNum.includes(q) || location.includes(q);
    });
  }, [claims, search, vehicleMap, claimMeta, filter]);

  const fadeUp = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  };

  return (
    <AppLayout>
      <div className="theme-dashboard-dark">
        <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => window.history.back()}
                className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-[15px] font-bold uppercase tracking-[0.18em] text-foreground truncate">
                Incidents
              </h1>
            </div>
            <Link
              to="/claims/new"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-semibold rounded-xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform flex-shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} /> New
            </Link>
          </motion.div>

          {/* Stat tiles */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFilter(filter === 'draft' ? 'all' : 'draft')}
              className={`text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                filter === 'draft'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card border-border hover:border-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  filter === 'draft' ? 'bg-background/10' : 'bg-muted'
                }`}>
                  <FileEdit className="w-4 h-4" strokeWidth={2} />
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                  filter === 'draft' ? 'text-background/60' : 'text-muted-foreground'
                }`}>Drafts</span>
              </div>
              <div className="text-2xl font-extrabold tabular-nums leading-none">{draftCount}</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'saved' ? 'all' : 'saved')}
              className={`text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                filter === 'saved'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  filter === 'saved' ? 'bg-primary-foreground/15' : 'bg-muted'
                }`}>
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                  filter === 'saved' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>Submitted</span>
              </div>
              <div className="text-2xl font-extrabold tabular-nums leading-none">{savedCount}</div>
            </button>
          </motion.div>

          {/* Search */}
          {claims.length > 0 && (
            <motion.div variants={fadeUp} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search rego, date, report #..."
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
          {claims.length === 0 ? (
            <motion.div variants={fadeUp} className="rounded-2xl bg-card border border-border p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <p className="text-base font-bold text-foreground">No reports yet</p>
              <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                File a report when you need to document an incident — it only takes a couple of minutes.
              </p>
              <Link
                to="/claims/new"
                className="inline-flex items-center gap-1.5 h-10 px-5 mt-5 text-[13px] font-semibold rounded-xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" strokeWidth={2.4} /> File first report
              </Link>
            </motion.div>
          ) : filteredClaims.length === 0 ? (
            <motion.div variants={fadeUp} className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No reports match your filters</p>
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
                  {filter === 'all' ? 'All reports' : filter === 'draft' ? 'Drafts' : 'Submitted'}
                </p>
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {filteredClaims.length} {filteredClaims.length === 1 ? 'report' : 'reports'}
                </span>
              </div>
              {filteredClaims.map(c => {
                const rego = getRegoForClaim(c);
                const meta = claimMeta[c.id];
                const reportNum = meta?.reportNumber || '';
                const slug = reportNum || c.id;
                const href = c.status === 'draft' ? `/claims/${slug}/edit` : `/claims/${slug}`;
                const isDraft = c.status === 'draft';
                const photoUrl = claimPhotos[c.id];
                return (
                  <div
                    key={c.id}
                    className="group rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-stretch">
                      <Link to={href} className="flex flex-1 min-w-0 gap-3.5 p-2.5">
                        {/* Photo */}
                        <div className="w-[88px] h-[88px] flex-shrink-0 bg-muted overflow-hidden rounded-xl relative">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Damage" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-9 h-9 text-muted-foreground/30" strokeWidth={1.2} />
                            </div>
                          )}
                          {isDraft && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider text-foreground">
                              Draft
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {reportNum && (
                                <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                                  #{reportNum}
                                </span>
                              )}
                              {!isDraft && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                  <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  Saved
                                </span>
                              )}
                            </div>
                            {rego ? (
                              <p className="text-[17px] font-extrabold text-foreground tracking-wide leading-tight truncate">
                                {rego}
                              </p>
                            ) : (
                              <p className="text-[15px] font-bold text-muted-foreground leading-tight">No vehicle</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
                            <Calendar className="w-3 h-3" strokeWidth={2} />
                            <span className="text-[12px] font-semibold text-foreground/80">
                              {c.incidentDate || 'No date'}
                            </span>
                          </div>
                        </div>

                        {/* Chevron */}
                        <div className="flex items-center pr-1 flex-shrink-0">
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                      </Link>

                      <button
                        onClick={(e) => { e.preventDefault(); setDeleteId(c.id); }}
                        className="flex items-center justify-center w-11 border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete report"
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

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this incident report? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
