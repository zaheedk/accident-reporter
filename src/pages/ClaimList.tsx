import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, FileText, ChevronRight, Search, X, Calendar, Car, ArrowLeft, Trash2 } from 'lucide-react';
import { getClaims, getVehicles, deleteClaim } from '@/lib/storage';
import { ClaimReport, Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getThumbnailUrl } from '@/lib/image-url';
import { useQueryClient } from '@tanstack/react-query';

export default function ClaimList() {
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claimMeta, setClaimMeta] = useState<Record<string, { claimNumber: number | null; reportNumber: string | null }>>({});
  const [claimPhotos, setClaimPhotos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
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

      // Build metadata from claims data (already fetched)
      const meta: Record<string, { claimNumber: number | null; reportNumber: string | null }> = {};
      const claimIds = c.map(cl => cl.id).filter(Boolean);

      if (claimIds.length > 0) {
        const { data: metaData } = await supabase.from('claims').select('id, claim_number, report_number').in('id', claimIds);
        if (metaData) {
          metaData.forEach((m: any) => { meta[m.id] = { claimNumber: m.claim_number, reportNumber: m.report_number }; });
        }

        // Fetch first photo per claim (only for user's claims)
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

  const filteredClaims = useMemo(() => {
    if (!search.trim()) return claims;
    const q = search.toLowerCase().trim();
    return claims.filter(c => {
      const rego = getRegoForClaim(c).toLowerCase();
      const date = (c.incidentDate || '').toLowerCase();
      const meta = claimMeta[c.id];
      const claimNumStr = meta?.claimNumber ? String(meta.claimNumber) : '';
      const reportNum = (meta?.reportNumber || '').toLowerCase();
      const location = (c.incidentLocation || '').toLowerCase();
      return rego.includes(q) || date.includes(q) || claimNumStr.includes(q) || reportNum.includes(q) || location.includes(q);
    });
  }, [claims, search, vehicleMap, claimMeta]);

  return (
    <AppLayout>
      <div className="theme-dashboard-dark">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0" />
          </div>
          <Link to="/claims/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-xl bg-foreground text-background active:scale-[0.99] transition-transform flex-shrink-0">
            <Plus className="w-3.5 h-3.5" /> New
          </Link>
        </div>

        {claims.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by rego, date, or report #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {claims.length === 0 ? (
          <div className="card-soft text-center py-14">
            <div className="w-12 h-12 rounded-2xl bg-foreground text-background mx-auto mb-3 flex items-center justify-center">
              <FileText className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">File a report when you need to document an incident.</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="card-soft text-center py-10">
            <p className="text-sm text-muted-foreground">No reports match your search</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClaims.map(c => {
              const rego = getRegoForClaim(c);
              const meta = claimMeta[c.id];
              const reportNum = meta?.reportNumber || '';
              const slug = reportNum || c.id;
              const href = c.status === 'draft' ? `/claims/${slug}/edit` : `/claims/${slug}`;
              const isDraft = c.status === 'draft';
              const statusLabel = isDraft ? 'Draft' : 'Saved';
              const photoUrl = claimPhotos[c.id];
              return (
                <div key={c.id} className="card-soft overflow-hidden hover:border-foreground/20 transition-colors group !p-0">
                  <div className="flex">
                    <Link to={href} className="block flex-1 min-w-0">
                      <div className="flex gap-3">
                        {/* Photo thumbnail */}
                        <div className="w-24 h-24 flex-shrink-0 bg-muted overflow-hidden rounded-l-2xl">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Damage" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-8 h-8 text-muted-foreground/20" strokeWidth={1.2} />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDraft ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background'}`}>
                              {statusLabel}
                            </span>
                            {reportNum && (
                              <span className="text-[10px] font-mono font-medium text-muted-foreground">
                                {reportNum}
                              </span>
                            )}
                          </div>

                          {rego && (
                            <p className="text-lg font-extrabold text-foreground tracking-wide leading-tight">
                              {rego}
                            </p>
                          )}

                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">
                              {c.incidentDate || 'No date'}
                            </span>
                          </div>
                        </div>

                        {/* Centered chevron */}
                        <div className="flex items-center pr-2 flex-shrink-0">
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteId(c.id); }}
                      className="flex items-center justify-center w-12 border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
