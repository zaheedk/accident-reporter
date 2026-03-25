import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Trash2, ChevronRight, Search, X } from 'lucide-react';
import { getClaims, deleteClaim, getVehicles } from '@/lib/storage';
import { ClaimReport, Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

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
          <div className="space-y-2">
            {filteredClaims.map(c => {
              const rego = getRegoForClaim(c);
              const cn = claimNumbers[c.id];
              return (
                <div key={c.id} className="card-surface flex items-center justify-between hover:shadow-md transition-shadow">
                  <Link to={c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.status === 'draft' ? 'bg-muted' : 'bg-primary/8'}`}>
                      <FileText className={`w-4 h-4 ${c.status === 'draft' ? 'text-muted-foreground' : 'text-primary'}`} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{c.incidentLocation || t('dashboard.untitledReport')}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {rego && <span className="text-[11px] font-semibold text-primary bg-primary/8 px-1.5 py-0.5 rounded-md">{rego}</span>}
                        <span className="text-xs text-muted-foreground tabular-nums">{c.incidentDate || t('claims.noDate')}</span>
                        {cn && <span className="text-[11px] text-muted-foreground">#{cn}</span>}
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-primary/8 text-primary'}`}>
                          {c.status === 'draft' ? t('common.draft') : c.status === 'saved' ? 'Saved' : t('common.submitted')}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors">
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
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
