import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Trash2, ChevronRight, Search, X, Calendar } from 'lucide-react';
import { getClaims, deleteClaim, getVehicles } from '@/lib/storage';
import { ClaimReport, Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ClaimList() {
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claimNumbers, setClaimNumbers] = useState<Record<string, number | null>>({});
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    getClaims().then(setClaims);
    getVehicles().then(setVehicles);
    supabase.from('claims').select('id, claim_number').then(({ data }) => {
      if (data) {
        const map: Record<string, number | null> = {};
        data.forEach((c: any) => { map[c.id] = c.claim_number; });
        setClaimNumbers(map);
      }
    });
  }, []);

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
      const cn = claimNumbers[c.id];
      const claimNumStr = cn ? String(cn) : '';
      const location = (c.incidentLocation || '').toLowerCase();
      return rego.includes(q) || date.includes(q) || claimNumStr.includes(q) || location.includes(q);
    });
  }, [claims, search, vehicleMap, claimNumbers]);

  const handleDelete = async (id: string) => {
    await deleteClaim(id);
    setClaims(await getClaims());
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('claims.reports')}</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">{t('claims.accidentReports')}</h1>
          </div>
          <Link to="/claims/new" className="btn-primary h-8 px-3.5 text-xs rounded-lg">
            <Plus className="w-3.5 h-3.5" /> {t('common.new')}
          </Link>
        </div>

        {claims.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by rego, date, or claim #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {claims.length === 0 ? (
          <div className="card-surface text-center py-14">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.2} />
            <p className="text-sm font-semibold text-foreground">{t('claims.noReports')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('claims.noReportsHint')}</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="card-surface text-center py-10">
            <p className="text-sm text-muted-foreground">No reports match your search</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClaims.map(c => {
              const rego = getRegoForClaim(c);
              const cn = claimNumbers[c.id];
              const href = c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`;
              const isDraft = c.status === 'draft';
              const statusLabel = isDraft ? t('common.draft') : c.status === 'saved' ? 'Saved' : t('common.submitted');
              return (
                <div key={c.id} className="card-surface overflow-hidden hover:shadow-md transition-all group">
                  <Link to={href} className="block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isDraft ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                            {statusLabel}
                          </span>
                          {cn && <span className="text-[11px] font-medium text-muted-foreground">#{cn}</span>}
                        </div>
                        <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">
                          {c.incidentLocation || t('dashboard.untitledReport')}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          {rego && (
                            <span className="text-[12px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md tracking-wide">
                              {rego}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {c.incidentDate || t('claims.noDate')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30 mt-1 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                  <div className="flex items-center justify-end px-4 pb-3 -mt-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Delete
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete report?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. This will permanently delete this accident report.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
