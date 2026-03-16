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
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Accident reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All your incident reports.</p>
          </div>
          <Link to="/claims/new" className="btn-primary h-8 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            New
          </Link>
        </div>

        {claims.length === 0 ? (
          <div className="card-surface text-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">File a report when you need to document an incident.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {claims.map(c => (
              <div key={c.id} className="card-surface flex items-center justify-between hover:border-primary/30 transition-colors">
                <Link to={c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.incidentLocation || 'Untitled report'}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground tabular-nums">{c.incidentDate || 'No date'}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-primary/8 text-primary'
                      }`}>{c.status === 'draft' ? 'Draft' : 'Submitted'}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
