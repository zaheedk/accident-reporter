import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle } from 'lucide-react';
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
          <h1 className="section-title text-xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your vehicles and accident reports.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{vehicles.length}</div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vehicles</div>
            </div>
          </div>
          <div className="card-surface flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{claims.length}</div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reports</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-surface space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/claims/new"
              className="flex items-center gap-2.5 p-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              Report Incident
            </Link>
            <Link
              to="/vehicles/new"
              className="flex items-center gap-2.5 p-3 rounded-lg bg-accent text-accent-foreground text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Link>
          </div>
        </div>

        {/* Drafts */}
        {drafts.length > 0 && (
          <div className="card-surface space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Drafts</h2>
            {drafts.map(claim => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}/edit`}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {claim.incidentLocation || 'Untitled Report'}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {claim.incidentDate || 'No date set'}
                  </div>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">Draft</span>
              </Link>
            ))}
          </div>
        )}

        {/* Recent submitted */}
        {submitted.length > 0 && (
          <div className="card-surface space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Submitted Reports</h2>
            {submitted.slice(0, 5).map(claim => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {claim.incidentLocation || 'Report'}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {claim.incidentDate}
                  </div>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">Submitted</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
