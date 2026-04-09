import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Loader2, Eye, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  category: string;
  notes: string;
  created_at: string;
  vehicle_id: string | null;
}

const CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'insurance_policy', label: 'Insurance Policy', icon: '🛡️' },
  { value: 'registration', label: 'Registration', icon: '📋' },
  { value: 'wof_certificate', label: 'WOF Certificate', icon: '✅' },
  { value: 'drivers_license', label: "Driver's Licence", icon: '🪪' },
  { value: 'purchase_receipt', label: 'Purchase Receipt', icon: '🧾' },
  { value: 'service_record', label: 'Service Record', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📄' },
];

interface DocumentVaultProps {
  vehicleId?: string | null;
  title?: string;
  showCategories?: string[];
}

export default function DocumentVault({ vehicleId = null, title = 'Document Vault', showCategories }: DocumentVaultProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = showCategories
    ? CATEGORIES.filter(c => showCategories.includes(c.value))
    : CATEGORIES;

  useEffect(() => {
    if (user) loadDocuments();
  }, [user, vehicleId]);

  const loadDocuments = async () => {
    if (!user) return;
    let query = supabase
      .from('user_documents' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    } else {
      query = query.is('vehicle_id', null);
    }

    const { data } = await query;
    setDocuments((data || []) as unknown as Document[]);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${user.id}/${vehicleId || 'profile'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('user_documents' as any).insert({
        user_id: user.id,
        vehicle_id: vehicleId || null,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        category: selectedCategory,
      } as any);

      if (dbError) throw dbError;

      toast.success('Document uploaded');
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.storage.from('user-documents').remove([deleteTarget.file_path]);
      await supabase.from('user_documents' as any).delete().eq('id', deleteTarget.id);
      setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
      toast.success('Document deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Could not generate download link');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryInfo = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4" strokeWidth={1.5} /> {title}
        </h2>
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="form-input text-sm h-10 flex-1 min-w-0 truncate rounded-lg px-2.5 py-1"
          >
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary h-10 px-4 text-sm rounded-lg shrink-0 flex items-center gap-1.5"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">PDF, images, or documents up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={handleUpload}
        />
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.2} />
          <p className="text-xs text-muted-foreground">No documents yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {documents.map(doc => {
            const cat = getCategoryInfo(doc.category);
            return (
              <div key={doc.id} className="card-surface flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {cat.label} · {formatSize(doc.file_size)} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(doc)} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.file_name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
