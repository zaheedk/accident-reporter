import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';

export default function Dashboard() {
  const vehicles = getVehicles();
  const claims = getClaims();
  const drafts = claims.filter(c => c.status === 'draft');
  const submitted = claims.filter(c => c.status === 'submitted');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your vehicles and accident reports.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
              <Car className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{vehicles.length}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Vehicles</div>
            </div>
          </div>
          <div className="card-surface flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{claims.length}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Reports</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/claims/new"
            className="card-surface flex items-center gap-3 p-4 transition-all hover:border-ring group"
          >
            <div className="w-9 h-9 rounded-md bg-foreground flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-background" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Report Incident</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">New claim</div>
            </div>
          </Link>
          <Link
            to="/vehicles/new"
            className="card-surface flex items-center gap-3 p-4 transition-all hover:border-ring group"
          >
            <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center">
              <Plus className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Add Vehicle</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">To garage</div>
            </div>
          </Link>
        </div>

        {/* Drafts */}
        {drafts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground px-1">Drafts</h2>
            {drafts.map(claim => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}/edit`}
                className="card-surface flex items-center justify-between transition-all hover:border-ring"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {claim.incidentLocation || 'Untitled Report'}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {claim.incidentDate || 'No date set'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground bg-accent px-2 py-0.5 rounded">Draft</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Recent submitted */}
        {submitted.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground px-1">Submitted Reports</h2>
            {submitted.slice(0, 5).map(claim => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}`}
                className="card-surface flex items-center justify-between transition-all hover:border-ring"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {claim.incidentLocation || 'Report'}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {claim.incidentDate}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-foreground bg-accent px-2 py-0.5 rounded">Submitted</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
