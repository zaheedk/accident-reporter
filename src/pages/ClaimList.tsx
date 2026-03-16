import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Trash2 } from 'lucide-react';
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
            <h1 className="section-title text-xl">Accident Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">All your incident reports.</p>
          </div>
          <Link
            to="/claims/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New
          </Link>
        </div>

        {claims.length === 0 ? (
          <div className="card-surface text-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">File a report when you need to document an incident.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map(c => (
              <div key={c.id} className="card-surface flex items-center justify-between">
                <Link to={c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`} className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {c.incidentLocation || 'Untitled Report'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground tabular-nums">{c.incidentDate || 'No date'}</span>
                    <span className={`text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded ${
                      c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
