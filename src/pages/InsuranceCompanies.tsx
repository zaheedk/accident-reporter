import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Building2, ArrowLeft, X, Check, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type InsuranceCompany = { id: string; name: string; email: string; phone: string };

export default function InsuranceCompanies() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InsuranceCompany | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['insurance-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insurance_companies').select('*').order('name');
      if (error) throw error;
      return data as InsuranceCompany[];
    },
    enabled: isAdmin,
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('insurance_companies').insert({ name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim() });
    if (error) { toast.error('Failed to add'); return; }
    toast.success('Insurance company added');
    setNewName(''); setNewEmail(''); setNewPhone(''); setShowAdd(false);
    queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from('insurance_companies').update({ name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Updated');
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('insurance_companies').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    setDeleteTarget(null);
    queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
  };

  const startEdit = (c: InsuranceCompany) => {
    setEditingId(c.id); setEditName(c.name); setEditEmail(c.email); setEditPhone(c.phone || '');
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </button>
            <div>
              <p className="text-sm text-muted-foreground">Admin</p>
              <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">Insurance Companies</h1>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary h-8 px-3.5 text-xs rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {showAdd && (
          <div className="card-surface space-y-3">
            <h3 className="text-sm font-semibold text-foreground">New insurance company</h3>
            <Input placeholder="Company name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Email address" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <Input placeholder="Phone (e.g. 0800 123 456)" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                <Check className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewEmail(''); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="card-surface text-center py-14">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.2} />
            <p className="text-sm font-semibold text-foreground">No insurance companies</p>
            <p className="text-xs text-muted-foreground mt-1">Add companies for users to select from.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {companies.map(c => (
              <div key={c.id} className="card-surface">
                {editingId === c.id ? (
                  <div className="space-y-3">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Company name" />
                    <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" type="email" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(c.id)} disabled={!editName.trim()}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                        {c.email && <div className="text-xs text-muted-foreground truncate">{c.email}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(c)} className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors">
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}</p>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will remove this insurance company from the dropdown list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
