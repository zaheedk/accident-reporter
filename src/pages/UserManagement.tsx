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
import { Search, Shield, ShieldOff, UserCheck, UserX, Mail, Phone, Calendar, Link2, Briefcase } from 'lucide-react';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, email, phone_number, is_active, created_at, source')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
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
    </AppLayout>
  );
}
