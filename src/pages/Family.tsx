import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Mail, Copy, X, Loader2, LogOut } from 'lucide-react';

interface Family { id: string; head_user_id: string; name: string }
interface Member { id: string; user_id: string; role: string; joined_at: string; display_name?: string; email?: string }
interface Invite { id: string; code: string; email: string | null; status: string; created_at: string; expires_at: string }

export default function Family() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [acceptCode, setAcceptCode] = useState(searchParams.get('code') || '');
  const [busy, setBusy] = useState(false);

  const isHead = family && user && family.head_user_id === user.id;

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Find membership
    const { data: m } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setMyMembership(m as Member | null);

    if (m) {
      const { data: f } = await supabase.from('families').select('*').eq('id', m.family_id).maybeSingle();
      setFamily(f as Family);

      const { data: roster } = await supabase.from('family_members').select('*').eq('family_id', m.family_id);
      const memberRows = (roster || []) as Member[];

      // Enrich with profile names
      const ids = memberRows.map(r => r.user_id);
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', ids);
        const byId = new Map((profiles || []).map(p => [p.user_id, p]));
        memberRows.forEach(r => {
          const p = byId.get(r.user_id);
          r.display_name = p?.display_name || '';
          r.email = p?.email || '';
        });
      }
      setMembers(memberRows);

      // Invites visible only to head
      if (f && f.head_user_id === user.id) {
        const { data: inv } = await supabase
          .from('family_invites')
          .select('*')
          .eq('family_id', m.family_id)
          .order('created_at', { ascending: false });
        setInvites((inv || []) as Invite[]);
      }
    } else {
      setFamily(null);
      setMembers([]);
      setInvites([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const createInvite = async (withEmail: boolean) => {
    if (withEmail && !inviteEmail.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('family-invite', {
      body: { action: 'create', ...(withEmail ? { email: inviteEmail.trim() } : {}) },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not create invite', description: (data as any)?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invite created', description: withEmail ? `Sent to ${inviteEmail}` : `Code: ${(data as any).code}` });
    setInviteEmail('');
    load();
  };

  const acceptInvite = async () => {
    if (!acceptCode.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('family-invite', {
      body: { action: 'accept', code: acceptCode.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not accept', description: (data as any)?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Welcome to the family!' });
    setAcceptCode('');
    setSearchParams({});
    load();
  };

  const revokeInvite = async (id: string) => {
    await supabase.from('family_invites').update({ status: 'revoked' }).eq('id', id);
    load();
  };

  const removeMember = async (id: string) => {
    await supabase.from('family_members').delete().eq('id', id);
    load();
  };

  const leaveFamily = async () => {
    if (!myMembership) return;
    if (!confirm('Leave this family? You will lose access to shared vehicles and reports.')) return;
    await supabase.from('family_members').delete().eq('id', myMembership.id);
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied' });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Family</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Share vehicles, claims, documents and expiry reminders with people in your household.
          The head of family invites others — members can view shared vehicles and lodge incident reports.
        </p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* No family — show both options */}
            {!family && (
              <>
                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Start a family</h2>
                  <p className="text-sm text-muted-foreground">Invite someone by email or generate a share code.</p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                    <Button onClick={() => createInvite(true)} disabled={busy}>
                      <Mail className="w-4 h-4" /> Invite
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => createInvite(false)} disabled={busy} className="w-full">
                    Or generate a share code
                  </Button>
                </Card>

                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Have an invite code?</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ABCD1234"
                      value={acceptCode}
                      onChange={e => setAcceptCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      className="uppercase tracking-widest font-mono"
                    />
                    <Button onClick={acceptInvite} disabled={busy}>Join</Button>
                  </div>
                </Card>
              </>
            )}

            {/* In a family — show roster */}
            {family && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{family.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {isHead ? "You're the head of family" : 'You are a member'}
                    </p>
                  </div>
                  {!isHead && (
                    <Button variant="ghost" size="sm" onClick={leaveFamily}>
                      <LogOut className="w-4 h-4" /> Leave
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div>
                        <div className="text-sm font-medium">
                          {m.display_name || m.email || 'Member'}
                          {m.role === 'head' && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Head</span>}
                        </div>
                        {m.email && <div className="text-xs text-muted-foreground">{m.email}</div>}
                      </div>
                      {isHead && m.role !== 'head' && (
                        <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Head — invite controls + pending invites */}
            {isHead && (
              <>
                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Invite a family member</h2>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                    <Button onClick={() => createInvite(true)} disabled={busy}>
                      <Mail className="w-4 h-4" /> Send
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => createInvite(false)} disabled={busy} className="w-full">
                    Generate share code only
                  </Button>
                </Card>

                {invites.length > 0 && (
                  <Card className="p-5 space-y-3">
                    <h2 className="font-semibold">Invitation history</h2>
                    {invites.map(inv => {
                      const isExpired = inv.status === 'pending' && new Date(inv.expires_at) < new Date();
                      const effectiveStatus = isExpired ? 'expired' : inv.status;
                      const statusStyles: Record<string, string> = {
                        pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                        accepted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                        revoked: 'bg-muted text-muted-foreground',
                        expired: 'bg-destructive/15 text-destructive',
                      };
                      const statusLabel: Record<string, string> = {
                        pending: 'Pending',
                        accepted: 'Joined',
                        revoked: 'Revoked',
                        expired: 'Expired',
                      };
                      return (
                        <div key={inv.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{inv.email || 'Share code'}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[effectiveStatus]}`}>
                                {statusLabel[effectiveStatus]}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{inv.code}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {effectiveStatus === 'pending' && `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                              {effectiveStatus === 'accepted' && inv.accepted_at && `Joined ${new Date(inv.accepted_at).toLocaleDateString()}`}
                              {effectiveStatus === 'expired' && `Expired ${new Date(inv.expires_at).toLocaleDateString()}`}
                              {effectiveStatus === 'revoked' && 'Invite cancelled'}
                            </div>
                          </div>
                          {effectiveStatus === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => copyCode(inv.code)} title="Copy code">
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)} title="Revoke">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
