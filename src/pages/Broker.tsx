import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Mail, Loader2, X, UserPlus, Car, FileUp, ShieldCheck } from 'lucide-react';

interface Brokerage { id: string; owner_user_id: string; company_name: string; license_number: string; phone: string; contact_email: string }
interface Client { id: string; client_user_id: string | null; client_email: string; client_name: string; client_phone: string; status: string; invited_at: string; accepted_at: string | null }
interface Application { id: string; status: string; company_name: string; admin_notes: string; created_at: string }
interface LinkedBroker { id: string; brokerage_id: string; status: string; brokerage?: Brokerage }

export default function Broker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Broker state
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // Application form
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Invite client
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');

  // Client side
  const [linkedBrokers, setLinkedBrokers] = useState<LinkedBroker[]>([]);
  const [acceptCode, setAcceptCode] = useState(searchParams.get('code') || '');

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: bk }, { data: app }, { data: linked }] = await Promise.all([
      supabase.from('brokerages').select('*').eq('owner_user_id', user.id).maybeSingle(),
      supabase.from('broker_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('broker_clients').select('id, brokerage_id, status').eq('client_user_id', user.id).eq('status', 'active'),
    ]);

    setBrokerage(bk as Brokerage | null);
    setApplication(app as Application | null);
    if (bk) setContactEmail((bk as any).contact_email || user.email || '');
    else setContactEmail(user.email || '');

    if (bk) {
      const { data: cli } = await supabase.from('broker_clients')
        .select('*').eq('brokerage_id', (bk as any).id).order('invited_at', { ascending: false });
      setClients((cli || []) as Client[]);
    } else {
      setClients([]);
    }

    if (linked && linked.length) {
      const ids = linked.map((l: any) => l.brokerage_id);
      const { data: bks } = await supabase.from('brokerages').select('*').in('id', ids);
      const byId = new Map((bks || []).map((b: any) => [b.id, b]));
      setLinkedBrokers((linked as any[]).map(l => ({ ...l, brokerage: byId.get(l.brokerage_id) })));
    } else {
      setLinkedBrokers([]);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Auto-accept invite from URL / localStorage
  useEffect(() => {
    if (!user) return;
    let code = searchParams.get('code') || '';
    if (!code) { try { code = localStorage.getItem('pending_broker_invite') || ''; } catch {} }
    if (!code) return;
    (async () => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('broker-invite', {
        body: { action: 'accept', code: code.trim() },
      });
      setBusy(false);
      try { localStorage.removeItem('pending_broker_invite'); } catch {}
      if (error || (data as any)?.error) {
        toast({ title: 'Could not accept invite', description: (data as any)?.error || error?.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Broker linked!', description: 'Your broker can now help manage your account.' });
      setAcceptCode(''); setSearchParams({}); load();
    })();
  }, [user?.id]);

  const apply = async () => {
    if (!companyName.trim()) { toast({ title: 'Company name required', variant: 'destructive' }); return; }
    if (!contactEmail.trim()) { toast({ title: 'Contact email required', variant: 'destructive' }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('broker-invite', {
      body: { action: 'apply', company_name: companyName.trim(), license_number: licenseNumber.trim(), phone: phone.trim(), contact_email: contactEmail.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not submit', description: (data as any)?.error || error?.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Application submitted', description: 'An admin will review shortly.' });
    setCompanyName(''); setLicenseNumber(''); setPhone(''); load();
  };

  const inviteClient = async () => {
    if (!inviteEmail.trim()) { toast({ title: 'Email required', variant: 'destructive' }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('broker-invite', {
      body: { action: 'invite', client_email: inviteEmail.trim(), client_name: inviteName.trim(), client_phone: invitePhone.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not invite', description: (data as any)?.error || error?.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Invite sent', description: `${inviteEmail} will receive an email with a join code.` });
    setInviteEmail(''); setInviteName(''); setInvitePhone(''); load();
  };

  const revokeClient = async (id: string, name: string) => {
    if (!confirm(`Revoke access for ${name}? You will no longer be able to view or add to their account.`)) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke('broker-invite', {
      body: { action: 'revoke_client', client_id: id },
    });
    setBusy(false);
    if (error) { toast({ title: 'Failed', variant: 'destructive' }); return; }
    toast({ title: 'Client access revoked' });
    load();
  };

  const acceptInvite = async () => {
    if (!acceptCode.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('broker-invite', {
      body: { action: 'accept', code: acceptCode.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not accept', description: (data as any)?.error || error?.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Broker linked!' });
    setAcceptCode(''); load();
  };

  const revokeBroker = async (clientRowId: string, name: string) => {
    if (!confirm(`Revoke ${name}'s access to your account? They will no longer see your vehicles, documents or claims.`)) return;
    await supabase.from('broker_clients').update({ status: 'revoked' }).eq('id', clientRowId);
    toast({ title: 'Broker access revoked' });
    load();
  };

  const activeClients = clients.filter(c => c.status === 'active');
  const invitedClients = clients.filter(c => c.status === 'invited');

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Insurance Broker</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* CLIENT VIEW: linked brokers */}
            {linkedBrokers.length > 0 && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><h2 className="font-semibold">Your broker</h2></div>
                <p className="text-xs text-muted-foreground">These brokers can view your vehicles, documents and claims, and add new vehicles or documents on your behalf. You can revoke access at any time.</p>
                {linkedBrokers.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{l.brokerage?.company_name || 'Brokerage'}</div>
                      {l.brokerage?.contact_email && <div className="text-xs text-muted-foreground">{l.brokerage.contact_email}</div>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => revokeBroker(l.id, l.brokerage?.company_name || 'this broker')}>
                      <X className="w-4 h-4" /> Revoke
                    </Button>
                  </div>
                ))}
              </Card>
            )}

            {/* CLIENT VIEW: accept invite */}
            {!brokerage && (
              <Card className="p-5 space-y-3">
                <h2 className="font-semibold">Got an invite code from a broker?</h2>
                <div className="flex gap-2">
                  <Input placeholder="ABCD1234" value={acceptCode}
                    onChange={e => setAcceptCode(e.target.value.toUpperCase())}
                    maxLength={8} className="uppercase tracking-widest font-mono" />
                  <Button onClick={acceptInvite} disabled={busy}>Join</Button>
                </div>
              </Card>
            )}

            {/* APPROVED BROKER DASHBOARD */}
            {brokerage && (
              <>
                <Card className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">{brokerage.company_name}</h2>
                      <p className="text-xs text-muted-foreground">Approved broker · {brokerage.contact_email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /><h2 className="font-semibold">Invite a client</h2></div>
                  <p className="text-xs text-muted-foreground">They'll get an email with a join code. Once they accept, you'll see their vehicles, documents and claims, and can add new ones on their behalf.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Client name (optional)" value={inviteName} onChange={e => setInviteName(e.target.value)} />
                    <Input placeholder="Phone (optional)" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Input type="email" placeholder="client@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                    <Button onClick={inviteClient} disabled={busy}><Mail className="w-4 h-4" /> Send</Button>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Your clients ({activeClients.length})</h2>
                  {activeClients.length === 0 && invitedClients.length === 0 && (
                    <p className="text-sm text-muted-foreground py-3">No clients yet. Send an invite above to get started.</p>
                  )}
                  {activeClients.map(c => (
                    <div key={c.id} className="p-3 rounded-lg bg-muted/40 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.client_name || c.client_email}</div>
                          <div className="text-xs text-muted-foreground">{c.client_email}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">Active</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/vehicles/new?client=${c.client_user_id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs"><Car className="w-3.5 h-3.5" /> Add vehicle</Button>
                        </Link>
                        <Link to={`/documents?client=${c.client_user_id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs"><FileUp className="w-3.5 h-3.5" /> Upload document</Button>
                        </Link>
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => revokeClient(c.id, c.client_name || c.client_email)}>
                          <X className="w-3.5 h-3.5" /> Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                  {invitedClients.map(c => (
                    <div key={c.id} className="p-3 rounded-lg bg-muted/40 border border-dashed border-border flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.client_name || c.client_email}</div>
                        <div className="text-xs text-muted-foreground">{c.client_email}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium shrink-0">Pending</span>
                    </div>
                  ))}
                </Card>
              </>
            )}

            {/* APPLICATION FORM */}
            {!brokerage && (
              <Card className="p-5 space-y-3">
                <h2 className="font-semibold">Apply to become a broker</h2>
                <p className="text-xs text-muted-foreground">Submit your details and an admin will review your application. Once approved, you can invite clients and manage their accounts.</p>
                {application?.status === 'pending' && (
                  <div className="p-3 rounded-lg bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
                    Your application for <strong>{application.company_name}</strong> is awaiting admin review.
                  </div>
                )}
                {application?.status === 'rejected' && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                    Your application was not approved. {application.admin_notes && `Notes: ${application.admin_notes}`}
                  </div>
                )}
                {application?.status !== 'pending' && (
                  <div className="space-y-2">
                    <Input placeholder="Company name *" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <Input placeholder="License / FSPR number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
                    <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
                    <Input type="email" placeholder="Contact email *" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                    <Button onClick={apply} disabled={busy} className="w-full">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit application'}
                    </Button>
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
