import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Check, X, Mail, Plus } from 'lucide-react';
import { toast } from 'sonner';

type Partner = { id: string; owner_user_id: string; company_name: string; inbound_alias: string; contact_email: string; phone: string };
type Application = { id: string; user_id: string; status: string; company_name: string; contact_email: string; phone: string; admin_notes: string; created_at: string };
type Profile = { user_id: string; display_name: string | null; email: string | null };

export default function RentalPartnersAdmin() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rental-partners'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-rental-partner', { body: { action: 'list' } });
      if (error) throw error;
      return data as { partners: Partner[]; applications: Application[] };
    },
    enabled: isAdmin,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-overview');
      if (error) throw error;
      return (data?.profiles || []) as Profile[];
    },
    enabled: isAdmin,
  });

  const [busy, setBusy] = useState<string>('');
  const [revoke, setRevoke] = useState<{ userId: string; name: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ company_name: '', owner_email: '', contact_email: '', phone: '', inbound_alias: '' });
  const [editing, setEditing] = useState<Partner | null>(null);
  const [editAlias, setEditAlias] = useState('');

  const partners = data?.partners || [];
  const applications = data?.applications || [];
  const pending = applications.filter(a => a.status === 'pending');

  if (!isAdmin) return <Navigate to="/" replace />;

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke('admin-rental-partner', { body });
    if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
    return data;
  };

  const handleCreate = async () => {
    if (!form.company_name || !form.owner_email) { toast.error('Company name and owner email are required'); return; }
    setBusy('create');
    try {
      await invoke({ action: 'create_partner', ...form });
      toast.success('Rental partner created');
      setShowCreate(false);
      setForm({ company_name: '', owner_email: '', contact_email: '', phone: '', inbound_alias: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-rental-partners'] });
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setBusy(''); }
  };

  const handleReview = async (id: string, action: 'approve_application' | 'reject_application', notes?: string) => {
    setBusy(id);
    try {
      await invoke({ action, application_id: id, notes });
      toast.success(action === 'approve_application' ? 'Approved' : 'Rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-rental-partners'] });
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setBusy(''); }
  };

  const handleRevoke = async () => {
    if (!revoke) return;
    setBusy(revoke.userId);
    try {
      await invoke({ action: 'revoke_partner', target_user_id: revoke.userId });
      toast.success('Rental partner revoked');
      setRevoke(null);
      queryClient.invalidateQueries({ queryKey: ['admin-rental-partners'] });
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setBusy(''); }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Administration</p>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>Rental Partners</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage rental partner accounts, review applications, and attach hire vehicles to customer accounts.</p>
        </div>

        {pending.length > 0 && (
          <Card className="p-4 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Pending applications ({pending.length})</h2>
            </div>
            <div className="space-y-2">
              {pending.map(app => {
                const applicant = profiles.find(p => p.user_id === app.user_id);
                return (
                  <div key={app.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{app.company_name}</p>
                      <p className="text-[11px] text-muted-foreground">{applicant?.display_name || applicant?.email || app.contact_email}</p>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {app.phone && <span>{app.phone}</span>}
                        {app.contact_email && <span className="truncate">{app.contact_email}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1.5" disabled={busy === app.id}
                        onClick={() => handleReview(app.id, 'approve_application')}>
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" disabled={busy === app.id}
                        onClick={() => {
                          const notes = prompt('Reason for rejection (optional)?') || '';
                          handleReview(app.id, 'reject_application', notes);
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

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Add rental partner</h2>
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowCreate(v => !v)}>
              <Plus className="w-3 h-3" /> {showCreate ? 'Cancel' : 'New partner'}
            </Button>
          </div>
          {showCreate && (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <Input placeholder="Company name" value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })} />
              <Input placeholder="Owner email (login for partner dashboard)" type="email" value={form.owner_email}
                onChange={e => setForm({ ...form, owner_email: e.target.value })} />
              <Input placeholder="Contact email (optional)" type="email" value={form.contact_email}
                onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              <Input placeholder="Phone (optional)" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
              <div className="space-y-1">
                <Input placeholder="Inbound email alias (optional, e.g. acmehire)" value={form.inbound_alias}
                  onChange={e => setForm({ ...form, inbound_alias: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">
                  Partners email rental agreement PDFs to this address for parsing. Leave blank to auto-generate. Final address: <code>{(form.inbound_alias.trim().split('@')[0] || 'auto').toLowerCase().replace(/[^a-z0-9+._-]/g, '')}@hires.savo.co.nz</code>
                </p>
              </div>
              <Button size="sm" className="h-8" onClick={handleCreate} disabled={busy === 'create'}>
                {busy === 'create' ? 'Creating...' : 'Create partner'}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                If the owner email doesn't have a SAVO account yet, one will be created. They can sign in and access their partner dashboard at /rental-partner.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Active partners ({partners.length})</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rental partners yet.</p>
          ) : (
            <div className="space-y-2">
              {partners.map(p => {
                const owner = profiles.find(u => u.user_id === p.owner_user_id);
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{p.company_name}</span>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Building2 className="w-2.5 h-2.5" /> Partner
                          </Badge>
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          {owner && <p>Owner: {owner.display_name || owner.email}</p>}
                          <p className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 shrink-0" />{p.inbound_alias}
                          </p>
                          {p.contact_email && <p className="truncate">Contact: {p.contact_email}</p>}
                          {p.phone && <p>{p.phone}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => { setEditing(p); setEditAlias(p.inbound_alias.split('@')[0] || ''); }}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => setRevoke({ userId: p.owner_user_id, name: p.company_name })}>
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={!!revoke} onOpenChange={(open) => !open && setRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke rental partner?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {revoke?.name} as a rental partner. Their fleet roster and inbound email alias will be deleted. Vehicles and rental agreements already attached to customer accounts are preserved as historical records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRevoke(); }}
              disabled={!!busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? 'Working...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
