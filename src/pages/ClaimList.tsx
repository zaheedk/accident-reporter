import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Search, X, Calendar, Car, ArrowLeft, Trash2, AlertTriangle, FileEdit, CheckCircle2, Phone, Shield } from 'lucide-react';
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
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claimMeta, setClaimMeta] = useState<Record<string, { claimNumber: number | null; reportNumber: string | null }>>({});
  const [claimPhotos, setClaimPhotos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { user } = useAuth();

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
  const getDisplayRef = (c: ClaimReport): { label: 'Claim' | 'Policy' | 'Report'; value: string } => {
    if (c.userClaimNumber) return { label: 'Claim', value: c.userClaimNumber };
    const policy = (vehicleMap[c.vehicleId] as any)?.insurancePolicyNumber || '';
    if (policy) return { label: 'Policy', value: policy };
    const reportNum = claimMeta[c.id]?.reportNumber || '';
    return { label: 'Report', value: reportNum };
  };

  const draftCount = useMemo(() => claims.filter(c => c.status === 'draft').length, [claims]);
  const savedCount = useMemo(() => claims.filter(c => c.status !== 'draft').length, [claims]);

  // Recent activity — newest 4
  const recent = useMemo(() => {
    return [...claims]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 4);
  }, [claims]);

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
      const userClaim = (c.userClaimNumber || '').toLowerCase();
      const policy = ((vehicleMap[c.vehicleId] as any)?.insurancePolicyNumber || '').toLowerCase();
      const location = (c.incidentLocation || '').toLowerCase();
      return rego.includes(q) || date.includes(q) || claimNumStr.includes(q) || reportNum.includes(q) || userClaim.includes(q) || policy.includes(q) || location.includes(q);
    });
  }, [claims, search, vehicleMap, claimMeta, filter]);

  const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

  return (
    <AppLayout>
      <div className="theme-dashboard relative">
        <motion.div className="relative space-y-8" variants={stagger} initial="hidden" animate="visible">
          {/* Header — Apple/Linear */}
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
                <h1 className="text-[28px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate">Incidents</h1>
                {claims.length > 0 && (
                  <p className="text-[13px] text-muted-foreground tabular-nums mt-1">
                    {claims.length} {claims.length === 1 ? 'report' : 'reports'}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/claims/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} /> New
            </Link>
          </motion.div>

          {/* Body */}
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 lg:grid-cols-[260px_1fr] lg:gap-8 space-y-6 md:space-y-0">
            {/* Left rail */}
            <motion.aside variants={fadeUp} className="space-y-4">
              {/* Filter tiles */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                <button
                  onClick={() => setFilter(filter === 'draft' ? 'all' : 'draft')}
                  className={`text-left rounded-xl p-3.5 border transition-all ${
                    filter === 'draft'
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card border-border hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-medium ${filter === 'draft' ? 'text-background/70' : 'text-muted-foreground'}`}>Drafts</span>
                    <FileEdit className={`w-3.5 h-3.5 ${filter === 'draft' ? 'text-background/60' : 'text-muted-foreground/60'}`} strokeWidth={2} />
                  </div>
                  <div className="text-[22px] font-semibold tabular-nums leading-none mt-2 tracking-tight">{draftCount}</div>
                </button>
                <button
                  onClick={() => setFilter(filter === 'saved' ? 'all' : 'saved')}
                  className={`text-left rounded-xl p-3.5 border transition-all ${
                    filter === 'saved'
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card border-border hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-medium ${filter === 'saved' ? 'text-background/70' : 'text-muted-foreground'}`}>Submitted</span>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${filter === 'saved' ? 'text-background/60' : 'text-muted-foreground/60'}`} strokeWidth={2} />
                  </div>
                  <div className="text-[22px] font-semibold tabular-nums leading-none mt-2 tracking-tight">{savedCount}</div>
                </button>
              </div>

              {/* Quick actions — desktop/tablet */}
              <div className="hidden md:block rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Quick actions</div>
                <div className="divide-y divide-border">
                  <Link to="/claims/new" className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground">New report</div>
                      <div className="text-[11px] text-muted-foreground">Start a fresh claim</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </Link>
                  <a href="tel:111" className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground">Call police</div>
                      <div className="text-[11px] text-muted-foreground">Emergency 111</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </a>
                  <Link to="/vehicles" className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                      <Car className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground">Garage</div>
                      <div className="text-[11px] text-muted-foreground">Manage your vehicles</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </Link>
                </div>
              </div>

              {/* Recent activity — desktop/tablet */}
              {recent.length > 0 && (
                <div className="hidden md:block rounded-xl bg-card border border-border overflow-hidden">
                  <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Recent activity</div>
                  <div className="divide-y divide-border">
                    {recent.map(c => {
                      const meta = claimMeta[c.id];
                      const reportNum = meta?.reportNumber || '';
                      const slug = reportNum || c.id;
                      const href = c.status === 'draft' ? `/claims/${slug}/edit` : `/claims/${slug}`;
                      const isDraft = c.status === 'draft';
                      const dot = isDraft ? 'bg-amber-500' : 'bg-emerald-500';
                      const ref = getDisplayRef(c);
                      return (
                        <Link key={c.id} to={href} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
                          <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate">
                              {ref.value ? `#${ref.value}` : (isDraft ? 'Draft' : 'Report')} <span className="opacity-60">· {getRegoForClaim(c) || 'No vehicle'}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{c.incidentDate || 'No date'}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.aside>

            {/* Right column */}
            <div className="space-y-3">
              {/* Search */}
              {claims.length > 0 && (
                <motion.div variants={fadeUp} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                  <input
                    type="text"
                    placeholder="Search rego, claim #, policy, date..."
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
              {claims.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-xl bg-card border border-border p-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto mb-4 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" strokeWidth={1.6} />
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">No reports yet</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    File a report when you need to document an incident — it only takes a couple of minutes.
                  </p>
                  <Link
                    to="/claims/new"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 mt-4 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.2} /> File first report
                  </Link>
                </motion.div>
              ) : filteredClaims.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-xl bg-card border border-border p-8 text-center">
                  <p className="text-[13px] text-muted-foreground">No reports match your filters</p>
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
                      {filter === 'all' ? 'All reports' : filter === 'draft' ? 'Drafts' : 'Submitted'}
                    </p>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {filteredClaims.length}
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
                    const dotTone = isDraft ? 'bg-amber-500' : 'bg-emerald-500';
                    const statusTone = isDraft
                      ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10'
                      : 'text-foreground/70 bg-muted/60';
                    const ref = getDisplayRef(c);
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl bg-card border border-border overflow-hidden hover:border-foreground/20 transition-colors group"
                      >
                        <Link to={href} className="block p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
                              {photoUrl ? (
                                <img src={photoUrl} alt="Damage" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <Car className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-[13px] font-semibold text-foreground truncate tabular-nums">
                                  {rego || (ref.value ? `${ref.label} #${ref.value}` : 'No vehicle')}
                                </div>
                              </div>
                              <div className="text-[12px] text-muted-foreground truncate flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" strokeWidth={2} />
                                {c.incidentDate || 'No date'}
                                {ref.value && rego && <span className="opacity-50">· {ref.label} #{ref.value}</span>}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(c.id); }}
                              aria-label="Delete report"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusTone}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotTone}`} />
                              <span className="opacity-70">Status</span>
                              <span>{isDraft ? 'Draft' : 'Submitted'}</span>
                            </span>
                            {c.incidentLocation && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-foreground/70 bg-muted/60 truncate max-w-[200px]">
                                <span className="opacity-70">Location</span>
                                <span className="truncate">{c.incidentLocation}</span>
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="flex border-t border-border divide-x divide-border">
                          <Link
                            to={href}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                          >
                            {isDraft ? (<><FileEdit className="w-3.5 h-3.5" strokeWidth={2} /> Continue</>) : (<><ChevronRight className="w-3.5 h-3.5" strokeWidth={2} /> Open</>)}
                          </Link>
                          <a
                            href="tel:111"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" strokeWidth={2} /> Police
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
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
