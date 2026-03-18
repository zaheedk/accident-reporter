import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Camera, Loader2, User, Phone, MapPin, Mail, ShieldOff, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ProfileData {
  display_name: string;
  phone_number: string;
  address: string;
  avatar_url: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    phone_number: '',
    address: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, phone_number, address, avatar_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            display_name: data.display_name || '',
            phone_number: data.phone_number || '',
            address: data.address || '',
            avatar_url: data.avatar_url || '',
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name,
        phone_number: profile.phone_number,
        address: profile.address,
      })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Upload failed');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', user.id);

    setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
    setUploading(false);
    toast.success('Photo updated');
  };

  const initials = profile.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Settings</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">Profile</h1>
          </div>
        </div>

        {/* Avatar */}
        <div className="card-surface flex flex-col items-center gap-3 py-6">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-foreground text-card flex items-center justify-center shadow-sm hover:bg-foreground/90 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{profile.display_name || 'No name set'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="card-surface space-y-4">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" strokeWidth={1.5} />
              Full name
            </label>
            <input
              className="form-input"
              placeholder="Your full name"
              value={profile.display_name}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
              Email
            </label>
            <input
              className="form-input opacity-60"
              value={user?.email || ''}
              disabled
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
              Phone number
            </label>
            <input
              className="form-input"
              type="tel"
              placeholder="e.g. 021 123 4567"
              value={profile.phone_number}
              onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
              Address
            </label>
            <textarea
              className="form-input min-h-[80px] resize-none"
              placeholder="Your home or postal address"
              value={profile.address}
              onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full h-11">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
          </button>

        {/* Danger Zone */}
        <div className="pt-4 space-y-3">
          <h2 className="text-[13px] font-semibold text-destructive">Danger Zone</h2>
          <button
            onClick={() => setShowDeactivate(true)}
            className="w-full card-surface flex items-center gap-3 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <ShieldOff className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Deactivate Account</div>
              <div className="text-xs text-muted-foreground">Temporarily disable your account</div>
            </div>
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="w-full card-surface flex items-center gap-3 text-left hover:shadow-md transition-shadow border border-destructive/20"
          >
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <div className="text-sm font-semibold text-destructive">Delete Account</div>
              <div className="text-xs text-muted-foreground">Permanently remove all your data</div>
            </div>
          </button>
        </div>
      </div>

      {/* Deactivate Confirmation */}
      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be deactivated and you won't be able to access the app until an administrator reactivates it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                const { error } = await supabase.functions.invoke('account-actions', {
                  body: { action: 'deactivate' },
                });
                setActionLoading(false);
                if (error) {
                  toast.error('Failed to deactivate account');
                  return;
                }
                toast.success('Account deactivated');
                setShowDeactivate(false);
                await signOut();
              }}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setDeleteConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will permanently delete your account and all associated data including vehicles, claims, and profile information. This action cannot be undone.
              </span>
              <span className="block text-sm font-medium text-foreground">
                Type <strong>DELETE</strong> to confirm:
              </span>
              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="mt-1"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || deleteConfirmText !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (deleteConfirmText !== 'DELETE') return;
                setActionLoading(true);
                const { error } = await supabase.functions.invoke('account-actions', {
                  body: { action: 'delete' },
                });
                setActionLoading(false);
                if (error) {
                  toast.error('Failed to delete account');
                  return;
                }
                toast.success('Account deleted');
                setShowDelete(false);
                await signOut();
                navigate('/auth');
              }}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
