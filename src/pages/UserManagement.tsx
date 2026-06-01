import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, ShieldOff, UserCheck, UserX, Mail, Phone, Calendar, Link2, Briefcase, ShieldCheck, Check, X, Building2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

type UserProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  source: string;
};

type UserRole = {
  user_id: string;
  role: string;
};

export default function UserManagement() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'direct' | 'jamesblond'>('all');
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    name: string;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [fleetAction, setFleetAction] = useState<{
    userId: string;
    name: string;
    action: 'assign' | 'revoke';
  } | null>(null);
  const [fleetBusy, setFleetBusy] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-overview');
      if (error) throw error;
      const rows = (data?.profiles || []) as UserProfile[];
      return [...rows].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: isAdmin,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: isAdmin,
  });

  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    roles.forEach(r => m.set(r.user_id, r.role));
    return m;
  }, [roles]);

  const { data: fleets = [] } = useQuery({
    queryKey: ['admin-fleets'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-fleet-manager', {
        body: { action: 'list', target_user_id: '00000000-0000-0000-0000-000000000000' },
      });
      if (error) throw error;
      return (data?.fleets || []) as Array<{ id: string; name: string; manager_user_id: string }>;
    },
    enabled: isAdmin,
  });

  const { data: brokerData } = useQuery({
    queryKey: ['admin-brokers'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-broker', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return data as {
        brokerages: Array<{ id: string; owner_user_id: string; company_name: string }>;
        applications: Array<{ id: string; user_id: string; status: string; company_name: string; license_number: string; phone: string; contact_email: string; admin_notes: string; created_at: string }>;
      };
    },
    enabled: isAdmin,
  });

  const { data: rentalData } = useQuery({
    queryKey: ['admin-rental-partners'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-rental-partner', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return data as {
        partners: Array<{ id: string; owner_user_id: string; company_name: string; inbound_alias: string }>;
        applications: Array<{ id: string; user_id: string; status: string; company_name: string; contact_email: string; phone: string; admin_notes: string; created_at: string }>;
      };
    },
    enabled: isAdmin,
  });

  const brokerages = brokerData?.brokerages || [];
  const applications = brokerData?.applications || [];
  const pendingApplications = applications.filter(a => a.status === 'pending');
  const brokerSet = useMemo(() => new Set(brokerages.map(b => b.owner_user_id)), [brokerages]);
  const [brokerBusy, setBrokerBusy] = useState<string>('');
  const [revokeBroker, setRevokeBroker] = useState<{ userId: string; name: string } | null>(null);

  const rentalPartners = rentalData?.partners || [];
  const rentalApplications = rentalData?.applications || [];
  const pendingRentalApplications = rentalApplications.filter(a => a.status === 'pending');
  const rentalPartnerSet = useMemo(() => new Set(rentalPartners.map(p => p.owner_user_id)), [rentalPartners]);
  const [rentalBusy, setRentalBusy] = useState<string>('');
  const [revokeRental, setRevokeRental] = useState<{ userId: string; name: string } | null>(null);
  const [showCreateRental, setShowCreateRental] = useState(false);
  const [newRental, setNewRental] = useState({ company_name: '', owner_email: '', contact_email: '', phone: '' });

  const createRentalPartner = async () => {
    if (!newRental.company_name || !newRental.owner_email) {
      toast.error('Company name and owner email are required');
      return;
    }
    setRentalBusy('create');
    try {
      const { data, error } = await supabase.functions.invoke('admin-rental-partner', {
        body: { action: 'create_partner', ...newRental },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success('Rental partner created');
      setShowCreateRental(false);
      setNewRental({ company_name: '', owner_email: '', contact_email: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-rental-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setRentalBusy('');
    }
  };


  const reviewRentalApplication = async (applicationId: string, action: 'approve_application' | 'reject_application', notes?: string) => {
    setRentalBusy(applicationId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-rental-partner', {
        body: { action, application_id: applicationId, notes },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(action === 'approve_application' ? 'Rental partner approved' : 'Application rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-rental-partners'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setRentalBusy('');
    }
  };

  const handleRevokeRental = async () => {
    if (!revokeRental) return;
    setRentalBusy(revokeRental.userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-rental-partner', {
        body: { action: 'revoke_partner', target_user_id: revokeRental.userId },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success('Rental partner revoked');
      setRevokeRental(null);
      queryClient.invalidateQueries({ queryKey: ['admin-rental-partners'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setRentalBusy('');
    }
  };


  const reviewApplication = async (applicationId: string, action: 'approve_application' | 'reject_application', notes?: string) => {
    setBrokerBusy(applicationId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-broker', {
        body: { action, application_id: applicationId, notes },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(action === 'approve_application' ? 'Broker approved' : 'Application rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-brokers'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBrokerBusy('');
    }
  };

  const handleRevokeBroker = async () => {
    if (!revokeBroker) return;
    setBrokerBusy(revokeBroker.userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-broker', {
        body: { action: 'revoke_broker', target_user_id: revokeBroker.userId },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success('Broker access revoked');
      setRevokeBroker(null);
      queryClient.invalidateQueries({ queryKey: ['admin-brokers'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBrokerBusy('');
    }
  };

  const fleetManagerSet = useMemo(
    () => new Set(fleets.map(f => f.manager_user_id)),
    [fleets]
  );

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const getUserRole = (userId: string) => roleMap.get(userId) || 'user';

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    const name = (p.display_name || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const phone = (p.phone_number || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || phone.includes(q) || p.user_id.toLowerCase().includes(q);
    const role = getUserRole(p.user_id);
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && p.is_active)
      || (statusFilter === 'deactivated' && !p.is_active);
    const matchesSource = sourceFilter === 'all' || p.source === sourceFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesSource;
  });

  const stats = {
    total: profiles.length,
    admins: profiles.filter(p => getUserRole(p.user_id) === 'admin').length,
    active: profiles.filter(p => p.is_active).length,
    deactivated: profiles.filter(p => !p.is_active).length,
    jamesblond: profiles.filter(p => p.source === 'jamesblond').length,
    direct: profiles.filter(p => p.source !== 'jamesblond').length,
  };

  const handleToggleActive = async () => {
    if (!confirmAction) return;
    const newStatus = confirmAction.action === 'activate';
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('user_id', confirmAction.userId);
    if (error) {
      toast.error(`Failed to ${confirmAction.action} user`);
      return;
    }
    toast.success(`User ${confirmAction.action}d`);
    setConfirmAction(null);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const handleFleetAction = async () => {
    if (!fleetAction) return;
    setFleetBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-fleet-manager', {
        body: { action: fleetAction.action, target_user_id: fleetAction.userId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(fleetAction.action === 'assign' ? 'Fleet manager assigned' : 'Fleet manager revoked');
      setFleetAction(null);
      queryClient.invalidateQueries({ queryKey: ['admin-fleets'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update fleet manager');
    } finally {
      setFleetBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} total · {stats.jamesblond} via James Blond · {stats.direct} direct · {stats.admins} admin
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}
            className="card-surface text-center p-3 hover:border-foreground/20 transition-colors"
          >
            <div className="text-lg font-extrabold tabular-nums text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Total</div>
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className="card-surface text-center p-3 hover:border-foreground/20 transition-colors"
          >
            <div className="text-lg font-extrabold tabular-nums text-foreground">{stats.admins}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Admins</div>
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className="card-surface text-center p-3 hover:border-foreground/20 transition-colors"
          >
            <div className="text-lg font-extrabold tabular-nums text-foreground">{stats.active}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Active</div>
          </button>
          <button
            onClick={() => setStatusFilter('deactivated')}
            className="card-surface text-center p-3 hover:border-foreground/20 transition-colors"
          >
            <div className="text-lg font-extrabold tabular-nums text-destructive">{stats.deactivated}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Inactive</div>
          </button>
        </div>

        {pendingApplications.length > 0 && (
          <Card className="p-4 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Pending broker applications ({pendingApplications.length})</h2>
            </div>
            <div className="space-y-2">
              {pendingApplications.map(app => {
                const applicant = profiles.find(p => p.user_id === app.user_id);
                return (
                  <div key={app.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{app.company_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {applicant?.display_name || applicant?.email || app.contact_email}
                        </p>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          {app.license_number && <span>Lic: {app.license_number}</span>}
                          {app.phone && <span>{app.phone}</span>}
                          {app.contact_email && <span className="truncate">{app.contact_email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        disabled={brokerBusy === app.id}
                        onClick={() => reviewApplication(app.id, 'approve_application')}
                      >
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        disabled={brokerBusy === app.id}
                        onClick={() => {
                          const notes = prompt('Reason for rejection (optional)?') || '';
                          reviewApplication(app.id, 'reject_application', notes);
                        }}
                      >
                        <X className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Rental partners ({rentalPartners.length})</h2>
            </div>
            <Button size="sm" className="h-7 text-xs" onClick={() => setShowCreateRental(v => !v)}>
              {showCreateRental ? 'Cancel' : 'Add rental partner'}
            </Button>
          </div>
          {showCreateRental && (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <Input placeholder="Company name" value={newRental.company_name}
                onChange={e => setNewRental({ ...newRental, company_name: e.target.value })} />
              <Input placeholder="Owner email (login for partner dashboard)" type="email" value={newRental.owner_email}
                onChange={e => setNewRental({ ...newRental, owner_email: e.target.value })} />
              <Input placeholder="Contact email (optional)" type="email" value={newRental.contact_email}
                onChange={e => setNewRental({ ...newRental, contact_email: e.target.value })} />
              <Input placeholder="Phone (optional)" value={newRental.phone}
                onChange={e => setNewRental({ ...newRental, phone: e.target.value })} />
              <Button size="sm" className="h-8" onClick={createRentalPartner} disabled={rentalBusy === 'create'}>
                {rentalBusy === 'create' ? 'Creating...' : 'Create partner'}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                If the owner email doesn't have a SAVO account yet, one will be created. They can sign in and access their rental partner dashboard at /rental-partner.
              </p>
            </div>
          )}
        </Card>

        {pendingRentalApplications.length > 0 && (
          <Card className="p-4 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Pending rental partner applications ({pendingRentalApplications.length})</h2>
            </div>
            <div className="space-y-2">
              {pendingRentalApplications.map(app => {
                const applicant = profiles.find(p => p.user_id === app.user_id);
                return (
                  <div key={app.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{app.company_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {applicant?.display_name || applicant?.email || app.contact_email}
                      </p>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {app.phone && <span>{app.phone}</span>}
                        {app.contact_email && <span className="truncate">{app.contact_email}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1.5" disabled={rentalBusy === app.id}
                        onClick={() => reviewRentalApplication(app.id, 'approve_application')}>
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" disabled={rentalBusy === app.id}
                        onClick={() => {
                          const notes = prompt('Reason for rejection (optional)?') || '';
                          reviewRentalApplication(app.id, 'reject_application', notes);
                        }}>
                        <X className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}


        {/* Search + filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="direct">Direct signup</SelectItem>
                <SelectItem value="jamesblond">James Blond</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(search || roleFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); setSourceFilter('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No users found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(profile => {
              const role = getUserRole(profile.user_id);
              const isSelf = profile.user_id === user?.id;
              const isFleetManager = fleetManagerSet.has(profile.user_id);
              const isBroker = brokerSet.has(profile.user_id);
              
              const joined = new Date(profile.created_at).toLocaleDateString();

              return (
                <Card key={profile.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {profile.display_name || 'Unnamed User'}
                        </span>
                        {isSelf && (
                          <Badge variant="outline" className="text-[10px] shrink-0">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant={role === 'admin' ? 'default' : 'secondary'}
                          className="text-[10px] gap-1"
                        >
                          {role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : <ShieldOff className="w-2.5 h-2.5" />}
                          {role}
                        </Badge>
                        <Badge
                          variant={profile.is_active ? 'secondary' : 'destructive'}
                          className="text-[10px] gap-1"
                        >
                          {profile.is_active ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                          {profile.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Link2 className="w-2.5 h-2.5" />
                          {profile.source === 'jamesblond' ? 'James Blond' : 'Direct'}
                        </Badge>
                        {isFleetManager && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <Briefcase className="w-2.5 h-2.5" />
                            Fleet manager
                          </Badge>
                        )}
                        {isBroker && (
                          <Badge variant="default" className="text-[10px] gap-1 bg-primary/15 text-primary border-primary/30">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Broker
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {profile.email && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 shrink-0" />{profile.email}
                          </p>
                        )}
                        {profile.phone_number && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0" />{profile.phone_number}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 shrink-0" />Joined {joined}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant={isFleetManager ? 'outline' : 'secondary'}
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setFleetAction({
                            userId: profile.user_id,
                            name: profile.display_name || 'this user',
                            action: isFleetManager ? 'revoke' : 'assign',
                          })}
                        >
                          <Briefcase className="w-3 h-3" />
                          {isFleetManager ? 'Revoke fleet manager' : 'Make fleet manager'}
                        </Button>
                        {isBroker && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => setRevokeBroker({ userId: profile.user_id, name: profile.display_name || 'this user' })}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Revoke broker
                          </Button>
                        )}
                      </div>
                    </div>

                    {!isSelf && (
                      <div className="shrink-0">
                        <Switch
                          checked={profile.is_active}
                          onCheckedChange={(checked) => {
                            setConfirmAction({
                              userId: profile.user_id,
                              name: profile.display_name || 'this user',
                              action: checked ? 'activate' : 'deactivate',
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          Showing {filtered.length} of {stats.total} user{stats.total !== 1 ? 's' : ''}
        </p>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'} user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'deactivate'
                ? `Are you sure you want to deactivate ${confirmAction.name}? They will no longer be able to access the app.`
                : `Reactivate ${confirmAction?.name}? They will regain access to the app.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={confirmAction?.action === 'deactivate'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
              }
            >
              {confirmAction?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!fleetAction} onOpenChange={(open) => !open && !fleetBusy && setFleetAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fleetAction?.action === 'assign' ? 'Make fleet manager?' : 'Revoke fleet manager?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fleetAction?.action === 'assign'
                ? `Create a fleet for ${fleetAction.name}. They will be able to invite drivers and assign vehicles from the Fleet section.`
                : `Remove ${fleetAction?.name} as fleet manager. Their fleet, drivers and vehicle assignments will be deleted. Driver accounts and vehicles themselves are not deleted.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={fleetBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleFleetAction(); }}
              disabled={fleetBusy}
              className={fleetAction?.action === 'revoke'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
              }
            >
              {fleetBusy ? 'Working...' : fleetAction?.action === 'assign' ? 'Make manager' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revokeBroker} onOpenChange={(open) => !open && setRevokeBroker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke broker access?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {revokeBroker?.name} as an approved broker. Their brokerage, client links and pending invites will be deleted. Client accounts and their data are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!brokerBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRevokeBroker(); }}
              disabled={!!brokerBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {brokerBusy ? 'Working...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
