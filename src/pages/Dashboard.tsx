import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, Clock, ArrowUpRight, LogOut, User, Users, Shield } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Vehicle, ClaimReport } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
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
  const firstName = displayName ? displayName.split(' ')[0] : 'there';

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Greeting row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <Avatar className="w-10 h-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </Link>
            <button onClick={signOut} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Sign out">
              <LogOut className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Hero CTA card */}
        <Link to="/claims/new" className="card-gradient block group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-lg font-bold text-white">Report an incident</div>
            <p className="text-sm text-white/70 mt-1">File a new claim report in minutes</p>
          </div>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/vehicles" className="card-surface-elevated group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">{vehicles.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Vehicles</div>
          </Link>
          <Link to="/claims" className="card-surface-elevated group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center" style={{ backgroundColor: 'hsla(250, 80%, 60%, 0.1)' }}>
                <FileText className="w-4.5 h-4.5" strokeWidth={1.8} style={{ color: 'hsl(250, 80%, 60%)' }} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">{claims.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Reports</div>
          </Link>
        </div>

        {/* Quick Action */}
        <Link to="/vehicles/new" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground">Add a vehicle</div>
            <div className="text-xs text-muted-foreground mt-0.5">Register to your garage</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" strokeWidth={1.5} />
        </Link>

        {/* Admin Actions */}
        {isAdmin && (
          <Link to="/admin" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsla(152, 60%, 42%, 0.1)' }}>
              <Shield className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground">Admin Overview</div>
              <div className="text-xs text-muted-foreground mt-0.5">Manage users, vehicles & reports</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" strokeWidth={1.5} />
          </Link>
        )}

        {/* Drafts */}
        {drafts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-warning" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Drafts</h2>
            </div>
            <div className="space-y-2">
              {drafts.map(claim => (
                <Link key={claim.id} to={`/claims/${claim.id}/edit`}
                  className="card-surface flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsla(38, 92%, 50%, 0.1)' }}>
                      <Clock className="w-4 h-4" strokeWidth={1.8} style={{ color: 'hsl(38, 92%, 50%)' }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{claim.incidentLocation || 'Untitled report'}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate || 'No date set'}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Submitted */}
        {submitted.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(152, 60%, 42%)' }} />
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Submitted</h2>
            </div>
            <div className="space-y-2">
              {submitted.slice(0, 5).map(claim => (
                <Link key={claim.id} to={`/claims/${claim.id}`}
                  className="card-surface flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{claim.incidentLocation || 'Report'}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
