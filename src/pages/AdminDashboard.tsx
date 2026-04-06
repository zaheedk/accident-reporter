import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Navigate, Link } from 'react-router-dom';
import { Car, FileText, Users, ChevronRight, Search, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [claimSearch, setClaimSearch] = useState('');

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name').order('created_at');
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['admin-all-vehicles'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['admin-all-claims'],
    queryFn: async () => {
      const { data } = await supabase.from('claims').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.display_name || 'Unknown user';
  };

  const filteredVehicles = vehicles.filter(v => {
    const s = vehicleSearch.toLowerCase();
    return !s || `${v.year} ${v.make} ${v.model} ${v.rego_number}`.toLowerCase().includes(s) ||
      getUserName(v.user_id).toLowerCase().includes(s);
  });

  const filteredClaims = claims.filter(c => {
    const s = claimSearch.toLowerCase();
    return !s || (c.incident_location || '').toLowerCase().includes(s) ||
      (c.description || '').toLowerCase().includes(s) ||
      getUserName(c.user_id).toLowerCase().includes(s);
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Administration</p>
          <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">Admin Overview</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link to="/users" className="card-surface text-center hover:shadow-md transition-shadow">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <div className="text-2xl font-extrabold tabular-nums text-foreground">{profiles.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Users</div>
          </Link>
          <div className="card-surface text-center">
            <Car className="w-5 h-5 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <div className="text-2xl font-extrabold tabular-nums text-foreground">{vehicles.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Vehicles</div>
          </div>
          <div className="card-surface text-center">
            <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <div className="text-2xl font-extrabold tabular-nums text-foreground">{claims.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Reports</div>
          </div>
        </div>

        {/* Admin links */}
        <Link to="/admin/insurance-companies" className="card-surface flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Building2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Insurance Companies</div>
              <div className="text-xs text-muted-foreground mt-0.5">Manage dropdown options</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
        </Link>

        <Tabs defaultValue="vehicles" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="vehicles" className="flex-1">Vehicles</TabsTrigger>
            <TabsTrigger value="claims" className="flex-1">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search vehicles..." value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} className="pl-9" />
            </div>
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No vehicles found</div>
            ) : (
              <div className="space-y-2">
                {filteredVehicles.map(v => (
                  <div key={v.id} className="card-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{v.year} {v.make} {v.model}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground tabular-nums">{v.rego_number}</span>
                          <span className="text-[10px] text-muted-foreground/60">•</span>
                          <span className="text-xs text-muted-foreground truncate">{getUserName(v.user_id)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center">{filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}</p>
          </TabsContent>

          <TabsContent value="claims" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search reports..." value={claimSearch} onChange={e => setClaimSearch(e.target.value)} className="pl-9" />
            </div>
            {filteredClaims.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No reports found</div>
            ) : (
              <div className="space-y-2">
                {filteredClaims.map(c => (
                  <div key={c.id} className="card-surface">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.status === 'draft' ? 'bg-muted' : 'bg-primary/8'}`}>
                        <FileText className={`w-4 h-4 ${c.status === 'draft' ? 'text-muted-foreground' : 'text-primary'}`} strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{c.incident_location || 'Untitled report'}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground tabular-nums">{c.incident_date || 'No date'}</span>
                          <Badge variant={c.status === 'draft' ? 'secondary' : 'default'} className="text-[10px]">
                            {c.status === 'draft' ? 'Draft' : 'Saved'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">{getUserName(c.user_id)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center">{filteredClaims.length} report{filteredClaims.length !== 1 ? 's' : ''}</p>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
