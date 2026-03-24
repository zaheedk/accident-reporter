import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Trash2, ChevronRight } from 'lucide-react';
import { getClaims, deleteClaim } from '@/lib/storage';
import { ClaimReport } from '@/types';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from 'react-i18next';

export default function ClaimList() {
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const { t } = useTranslation();

  useEffect(() => { getClaims().then(setClaims); }, []);

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

        {claims.length === 0 ? (
          <div className="card-surface text-center py-14">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.2} />
            <p className="text-sm font-semibold text-foreground">{t('claims.noReports')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('claims.noReportsHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {claims.map(c => (
              <div key={c.id} className="card-surface flex items-center justify-between hover:shadow-md transition-shadow">
                <Link to={c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.status === 'draft' ? 'bg-muted' : 'bg-primary/8'}`}>
                    <FileText className={`w-4 h-4 ${c.status === 'draft' ? 'text-muted-foreground' : 'text-primary'}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{c.incidentLocation || t('dashboard.untitledReport')}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground tabular-nums">{c.incidentDate || t('claims.noDate')}</span>
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
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
