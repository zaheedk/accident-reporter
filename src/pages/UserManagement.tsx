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
import { Search, Shield, ShieldOff, UserCheck, UserX, Mail, Phone, Calendar } from 'lucide-react';
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
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    name: string;
    action: 'activate' | 'deactivate';
  } | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, email, phone_number, is_active, created_at')
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
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: profiles.length,
    admins: profiles.filter(p => getUserRole(p.user_id) === 'admin').length,
    active: profiles.filter(p => p.is_active).length,
    deactivated: profiles.filter(p => !p.is_active).length,
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

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users and their access
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
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

              return (
                <Card key={profile.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {profile.display_name || 'Unnamed User'}
                        </span>
                        {isSelf && (
                          <Badge variant="outline" className="text-[10px] shrink-0">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
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
                      </div>
                      {profile.phone_number && (
                        <p className="text-[11px] text-muted-foreground mt-1">{profile.phone_number}</p>
                      )}
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
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
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
