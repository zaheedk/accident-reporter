import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Mail, Copy, X, Loader2, LogOut, Car } from 'lucide-react';

interface Fleet { id: string; manager_user_id: string; name: string }
interface Member { id: string; user_id: string; role: string; joined_at: string; display_name?: string; email?: string }
interface Invite { id: string; code: string; email: string | null; status: string; created_at: string; expires_at: string; accepted_at: string | null }
interface Vehicle { id: string; rego_number: string; make: string; model: string; user_id: string }
interface Assignment { id: string; vehicle_id: string; driver_user_id: string | null }

const getInviteStatus = (i: Invite) => (i.status === 'pending' && new Date(i.expires_at) < new Date()) ? 'expired' : i.status;

const inviteStatusStyles: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  accepted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  revoked: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/15 text-destructive',
};
const inviteStatusLabel: Record<string, string> = {
  pending: 'Pending invite', accepted: 'Joined', revoked: 'Revoked', expired: 'Expired',
};

export default function Fleet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [acceptCode, setAcceptCode] = useState(searchParams.get('code') || '');
  const [busy, setBusy] = useState(false);

  const isManager = !!fleet && !!user && fleet.manager_user_id === user.id;

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const { data: m } = await supabase.from('fleet_members').select('*').eq('user_id', user.id).maybeSingle();
    setMyMembership(m as Member | null);

    if (m) {
      const { data: f } = await supabase.from('fleets').select('*').eq('id', m.fleet_id).maybeSingle();
      setFleet(f as Fleet);

      const { data: roster } = await supabase.from('fleet_members').select('*').eq('fleet_id', m.fleet_id);
      const memberRows = (roster || []) as Member[];

      const ids = memberRows.map(r => r.user_id);
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles').select('user_id, display_name, email').in('user_id', ids);
        const byId = new Map((profiles || []).map(p => [p.user_id, p]));
        memberRows.forEach(r => {
          const p = byId.get(r.user_id);
          r.display_name = p?.display_name || '';
          r.email = p?.email || '';
        });
      }
      setMembers(memberRows);

      const isMgr = f && f.manager_user_id === user.id;
      if (isMgr) {
        const [{ data: inv }, { data: veh }, { data: asg }] = await Promise.all([
          supabase.from('fleet_invites').select('*').eq('fleet_id', m.fleet_id).order('created_at', { ascending: false }),
          supabase.from('vehicles').select('id, rego_number, make, model, user_id').eq('user_id', user.id).eq('is_active', true),
          supabase.from('fleet_vehicle_assignments').select('id, vehicle_id, driver_user_id').eq('fleet_id', m.fleet_id),
        ]);
        setInvites((inv || []) as Invite[]);
        setVehicles((veh || []) as Vehicle[]);
        setAssignments((asg || []) as Assignment[]);
      } else {
        // Driver: load their assigned vehicles
        const { data: asg } = await supabase
          .from('fleet_vehicle_assignments')
          .select('id, vehicle_id, driver_user_id')
          .eq('driver_user_id', user.id);
        setAssignments((asg || []) as Assignment[]);
        const vIds = (asg || []).map(a => a.vehicle_id);
        if (vIds.length) {
          const { data: veh } = await supabase
            .from('vehicles').select('id, rego_number, make, model, user_id').in('id', vIds);
          setVehicles((veh || []) as Vehicle[]);
        } else {
          setVehicles([]);
        }
      }
    } else {
      setFleet(null); setMembers([]); setInvites([]); setVehicles([]); setAssignments([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Auto-accept invite from URL or localStorage
  useEffect(() => {
    if (!user) return;
    let code = searchParams.get('code') || '';
    if (!code) { try { code = localStorage.getItem('pending_fleet_invite') || ''; } catch {} }
    if (!code) return;
    if (myMembership) { try { localStorage.removeItem('pending_fleet_invite'); } catch {} return; }
    (async () => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('fleet-invite', {
        body: { action: 'accept', code: code.trim() },
      });
      setBusy(false);
      try { localStorage.removeItem('pending_fleet_invite'); } catch {}
      if (error || (data as any)?.error) {
        toast({ title: 'Could not accept invite', description: (data as any)?.error || error?.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Welcome to the fleet!' });
      setAcceptCode(''); setSearchParams({}); load();
    })();
  }, [user?.id, myMembership]);

  const createInvite = async (withEmail: boolean) => {
    if (withEmail && !inviteEmail.trim()) {
      toast({ title: 'Email required', variant: 'destructive' }); return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('fleet-invite', {
      body: { action: 'create', ...(withEmail ? { email: inviteEmail.trim() } : {}) },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not create invite', description: (data as any)?.error || error?.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Invite created', description: withEmail ? `Sent to ${inviteEmail}` : `Code: ${(data as any).code}` });
    setInviteEmail(''); load();
  };

  const acceptInvite = async () => {
    if (!acceptCode.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('fleet-invite', {
      body: { action: 'accept', code: acceptCode.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not accept', description: (data as any)?.error || error?.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Welcome to the fleet!' });
    setAcceptCode(''); setSearchParams({}); load();
  };

  const revokeInvite = async (id: string) => {
    await supabase.from('fleet_invites').update({ status: 'revoked' }).eq('id', id); load();
  };

  const removeDriver = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your fleet? They'll lose access to assigned vehicles.`)) return;
    // Unassign their vehicles first
    await supabase.from('fleet_vehicle_assignments').update({ driver_user_id: null })
      .eq('fleet_id', fleet!.id).eq('driver_user_id', members.find(m => m.id === id)?.user_id || '');
    await supabase.from('fleet_members').delete().eq('id', id);
    toast({ title: 'Driver removed' });
    load();
  };

  const leaveFleet = async () => {
    if (!myMembership) return;
    if (!confirm('Leave this fleet? You will lose access to assigned vehicles.')) return;
    await supabase.from('fleet_members').delete().eq('id', myMembership.id);
    load();
  };

  const assignVehicle = async (vehicleId: string, driverUserId: string | null) => {
    if (!fleet || !user) return;
    const existing = assignments.find(a => a.vehicle_id === vehicleId);
    if (existing) {
      await supabase.from('fleet_vehicle_assignments')
        .update({ driver_user_id: driverUserId, assigned_by: user.id, assigned_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('fleet_vehicle_assignments').insert({
        fleet_id: fleet.id, vehicle_id: vehicleId, driver_user_id: driverUserId, assigned_by: user.id,
      });
    }
    load();
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast({ title: 'Code copied' }); };

  const drivers = members.filter(m => m.role === 'driver');

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Fleet</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Fleet managers invite drivers and assign vehicles to them. Drivers see only the vehicles assigned to them — they can also add their own personal vehicles.
        </p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {!fleet && (
              <>
                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Start a fleet</h2>
                  <p className="text-sm text-muted-foreground">Invite a driver by email or generate a share code.</p>
                  <div className="flex gap-2">
                    <Input type="email" placeholder="driver@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                    <Button onClick={() => createInvite(true)} disabled={busy}><Mail className="w-4 h-4" /> Invite</Button>
                  </div>
                  <Button variant="outline" onClick={() => createInvite(false)} disabled={busy} className="w-full">
                    Or generate a share code
                  </Button>
                </Card>

                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Have an invite code?</h2>
                  <div className="flex gap-2">
                    <Input placeholder="ABCD1234" value={acceptCode}
                      onChange={e => setAcceptCode(e.target.value.toUpperCase())}
                      maxLength={8} className="uppercase tracking-widest font-mono" />
                    <Button onClick={acceptInvite} disabled={busy}>Join</Button>
                  </div>
                </Card>
              </>
            )}

            {fleet && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{fleet.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {isManager ? "You're the fleet manager" : 'You are a driver'}
                    </p>
                  </div>
                  {!isManager && (
                    <Button variant="ghost" size="sm" onClick={leaveFleet}>
                      <LogOut className="w-4 h-4" /> Leave
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div>
                        <div className="text-sm font-medium">
                          {m.display_name || m.email || 'Driver'}
                          {m.role === 'manager' && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Manager</span>}
                        </div>
                        {m.email && <div className="text-xs text-muted-foreground">{m.email}</div>}
                      </div>
                      {isManager && m.role === 'driver' && (
                        <Button variant="ghost" size="sm" onClick={() => removeDriver(m.id, m.display_name || m.email || 'this driver')}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {isManager && invites.filter(inv => getInviteStatus(inv) === 'pending').map(inv => {
                    const status = getInviteStatus(inv);
                    return (
                      <div key={inv.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-dashed border-border">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{inv.email || 'Share code invite'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inviteStatusStyles[status]}`}>
                              {inviteStatusLabel[status]}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{inv.code}</div>
                        </div>
                        <div className="flex items-center shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => copyCode(inv.code)} title="Copy code">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)} title="Revoke">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {isManager && (
              <Card className="p-5 space-y-3">
                <h2 className="font-semibold">Invite a driver</h2>
                <div className="flex gap-2">
                  <Input type="email" placeholder="driver@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  <Button onClick={() => createInvite(true)} disabled={busy}><Mail className="w-4 h-4" /> Send</Button>
                </div>
                <Button variant="outline" onClick={() => createInvite(false)} disabled={busy} className="w-full">
                  Generate share code only
                </Button>
              </Card>
            )}

            {isManager && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Vehicle assignments</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Assign each fleet vehicle to a driver. Unassigned vehicles stay in your pool and aren't visible to drivers.
                </p>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">Add vehicles to your garage first — they'll appear here.</p>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map(v => {
                      const current = assignments.find(a => a.vehicle_id === v.id)?.driver_user_id || '';
                      return (
                        <div key={v.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {v.rego_number || '—'} <span className="text-muted-foreground font-normal">{v.make} {v.model}</span>
                            </div>
                          </div>
                          <select
                            className="h-9 text-sm rounded-md border border-input bg-background px-2"
                            value={current}
                            onChange={e => assignVehicle(v.id, e.target.value || null)}
                          >
                            <option value="">Unassigned</option>
                            {drivers.map(d => (
                              <option key={d.user_id} value={d.user_id}>
                                {d.display_name || d.email || 'Driver'}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {!isManager && fleet && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Your assigned vehicles</h2>
                </div>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">No vehicles assigned to you yet. Your fleet manager will assign them.</p>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map(v => (
                      <div key={v.id} className="p-3 rounded-lg bg-muted/40">
                        <div className="text-sm font-medium">
                          {v.rego_number || '—'} <span className="text-muted-foreground font-normal">{v.make} {v.model}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
