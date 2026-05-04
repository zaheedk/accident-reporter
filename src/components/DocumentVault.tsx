import { useState, useEffect, useRef } from 'react';
import { FileText, UploadCloud, Trash2, Loader2, Eye, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  { value: 'insurance_policy', label: 'Insurance policy', icon: '🛡️' },
  { value: 'registration', label: 'Registration', icon: '📋' },
  { value: 'wof_certificate', label: 'WOF certificate', icon: '✅' },
  { value: 'drivers_license', label: "Driver's licence", icon: '🪪' },
  { value: 'purchase_receipt', label: 'Purchase receipt', icon: '🧾' },
  { value: 'service_record', label: 'Service record', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📄' },
];

interface DocumentVaultProps {
  vehicleId?: string | null;
  title?: string;
  showCategories?: string[];
}

export default function DocumentVault({ vehicleId = null, showCategories }: DocumentVaultProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = showCategories
    ? CATEGORIES.filter(c => showCategories.includes(c.value))
    : CATEGORIES;

  const activeCategory = categories.find(c => c.value === selectedCategory);

  useEffect(() => {
    if (user) loadDocuments();
  }, [user, vehicleId]);

  // Reset selected category when context changes
  useEffect(() => {
    setSelectedCategory('');
  }, [vehicleId]);

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);
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

    if (!selectedCategory) {
      toast.error('Please choose a document type first');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
      setSelectedCategory('');
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

  const handleView = async (doc: Document) => {
    try {
      // Open the tab synchronously so mobile/in-app browsers don't block it
      const win = window.open('about:blank', '_blank');

      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(doc.file_path, 60 * 10); // 10 minutes

      if (error || !data?.signedUrl) throw error || new Error('No signed URL');

      if (win && !win.closed) {
        win.location.href = data.signedUrl;
      } else {
        // Popup blocked — navigate the current tab/webview instead of forcing download
        window.location.href = data.signedUrl;
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not open document');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryInfo = (val: string) =>
    CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <div className="space-y-5">
      {/* Upload zone with inline document type selector */}
      <div className="dashed-zone px-6 py-7 flex flex-col items-center text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border bg-card text-sm font-semibold text-foreground hover:border-foreground/30 transition-colors">
              {activeCategory ? (
                <>
                  <span className="text-base leading-none">{activeCategory.icon}</span>
                  <span>{activeCategory.label}</span>
                </>
              ) : (
                <span className="text-muted-foreground font-medium">Choose document type</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="rounded-xl min-w-[220px]">
            {categories.map(c => (
              <DropdownMenuItem
                key={c.value}
                onClick={() => setSelectedCategory(c.value)}
                className="py-2"
              >
                <span className="text-base mr-2">{c.icon}</span>
                <span>{c.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center mb-3 mt-6">
          <UploadCloud className="w-7 h-7" strokeWidth={1.75} />
        </div>
        <p className="text-[15px] font-bold text-foreground tracking-tight">Tap to upload</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
          PDF, images or documents up to 10 MB
        </p>
        <button
          onClick={() => {
            if (!selectedCategory) {
              toast.error('Please choose a document type first');
              return;
            }
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          className="mt-5 inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl border border-foreground/20 bg-card text-sm font-semibold text-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </>
          ) : (
            'Browse files'
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={handleUpload}
        />
      </div>

      {/* Document list / empty state */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="card-soft flex flex-col items-center text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <FileText className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-bold text-foreground tracking-tight">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            {vehicleId
              ? 'Uploaded files for this vehicle will appear here'
              : 'Your personal uploads will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="field-label">Your files</p>
          {documents.map(doc => {
            const cat = getCategoryInfo(doc.category);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 card-soft !p-3 hover:border-foreground/20 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{doc.file_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {cat.label} · {formatSize(doc.file_size)} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => handleView(doc)}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
                    aria-label="View"
                  >
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} />
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
