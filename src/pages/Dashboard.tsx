import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, Clock, ArrowUpRight, LogOut, User, Users } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Vehicle, ClaimReport } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    getVehicles().then(setVehicles);
    getClaims().then(setClaims);
    if (user) {
      supabase.from('profiles').select('avatar_url, display_name').eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url || '');
          setDisplayName(data.display_name || '');
        }
      });
    }
  }, [user]);

  const drafts = claims.filter(c => c.status === 'draft');
  const submitted = claims.filter(c => c.status === 'submitted');

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overview</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <Avatar className="w-9 h-9">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                  {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </Link>
            <button onClick={signOut} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Sign out">
              <LogOut className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface">
            <div className="flex items-center justify-between mb-3">
              <Car className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">{vehicles.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Vehicles</div>
          </div>
          <div className="card-surface">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">{claims.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Reports</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/claims/new" className="card-surface group hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center mb-3">
              <AlertTriangle className="w-4 h-4 text-card" />
            </div>
            <div className="text-sm font-bold text-foreground">Report incident</div>
            <div className="text-xs text-muted-foreground mt-0.5">File a new claim</div>
          </Link>
          <Link to="/vehicles/new" className="card-surface group hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-sm font-bold text-foreground">Add vehicle</div>
            <div className="text-xs text-muted-foreground mt-0.5">Register to garage</div>
          </Link>
        </div>

        {/* Drafts */}
        {drafts.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-muted-foreground mb-2">Drafts</h2>
            <div className="space-y-2">
              {drafts.map(claim => (
                <Link key={claim.id} to={`/claims/${claim.id}/edit`}
                  className="card-surface flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{claim.incidentLocation || 'Untitled report'}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate || 'No date set'}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Submitted */}
        {submitted.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-muted-foreground mb-2">Submitted reports</h2>
            <div className="space-y-2">
              {submitted.slice(0, 5).map(claim => (
                <Link key={claim.id} to={`/claims/${claim.id}`}
                  className="card-surface flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{claim.incidentLocation || 'Report'}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
