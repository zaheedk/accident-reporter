import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Trash2, ChevronRight } from 'lucide-react';
import { getClaims, deleteClaim } from '@/lib/storage';
import { ClaimReport } from '@/types';
import AppLayout from '@/components/AppLayout';

export default function ClaimList() {
  const [claims, setClaims] = useState<ClaimReport[]>(getClaims());

  const handleDelete = (id: string) => {
    deleteClaim(id);
    setClaims(getClaims());
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Accident Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">All your incident reports.</p>
          </div>
          <Link
            to="/claims/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ boxShadow: '0 2px 8px hsl(245 58% 60% / 0.3)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Link>
        </div>

        {claims.length === 0 ? (
          <div className="card-surface text-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">File a report when you need to document an incident.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map(c => (
              <div key={c.id} className="card-surface flex items-center justify-between transition-all hover:shadow-md">
                <Link to={c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.incidentLocation || 'Untitled Report'}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground tabular-nums">{c.incidentDate || 'No date'}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                        c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                      }`}>{c.status}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
