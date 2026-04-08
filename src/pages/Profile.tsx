import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Camera, Loader2, User, Phone, MapPin, Mail, ShieldOff, Trash2, CheckCircle, AlertCircle, Send, Lock, Eye, EyeOff, Bell } from 'lucide-react';
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
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface ProfileData {
  display_name: string;
  phone_number: string;
  address: string;
  avatar_url: string;
  email: string;
  email_verified: boolean;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isSubscribed, isSupported, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '', phone_number: '', address: '', avatar_url: '', email: '', email_verified: false,
  });

  // Detect if user signed in via phone (fake email pattern)
  const isPhoneUser = user?.email?.endsWith('@savo.phone.local') || false;

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, phone_number, address, avatar_url, email, email_verified')
      .eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile({
            display_name: data.display_name || '', phone_number: data.phone_number || '',
            address: data.address || '', avatar_url: data.avatar_url || '',
            email: (data as any).email || '', email_verified: (data as any).email_verified || false,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const updateData: Record<string, any> = {
      display_name: profile.display_name, phone_number: profile.phone_number, address: profile.address,
    };
    // For phone users, also save email (but don't change verified status here)
    if (isPhoneUser) {
      updateData.email = profile.email;
    }
    const { error } = await supabase.from('profiles').update(updateData).eq('user_id', user.id);
    setSaving(false);
    if (error) { toast.error(t('profile.profileFailed')); } else { toast.success(t('profile.profileUpdated')); }
  };

  const handleSendVerification = async () => {
    if (!profile.email || !profile.email.includes('@')) {
      toast.error('Please enter a valid email address first');
      return;
    }
    setSendingVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { email: profile.email },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t('profile.imageTooLarge')); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error(t('profile.uploadFailed')); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
    setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
    setUploading(false);
    toast.success(t('profile.photoUpdated'));
  };

  const initials = profile.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{t('profile.settings')}</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">{t('profile.title')}</h1>
          </div>
        </div>

        <div className="card-surface flex flex-col items-center gap-3 py-6">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-foreground text-card flex items-center justify-center shadow-sm hover:bg-foreground/90 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{profile.display_name || t('profile.noNameSet')}</p>
            <p className="text-xs text-muted-foreground">{isPhoneUser ? profile.phone_number : user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="card-surface space-y-4">
          <div>
            <label className="form-label flex items-center gap-1.5"><User className="w-3.5 h-3.5" strokeWidth={1.5} />{t('profile.fullName')}</label>
            <input className="form-input" placeholder={t('profile.fullNamePlaceholder')} value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
          </div>

          {isPhoneUser ? (
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                {t('profile.email')}
                {profile.email && (
                  profile.email_verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full ml-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full ml-1">
                      <AlertCircle className="w-3 h-3" /> Unverified
                    </span>
                  )
                )}
              </label>
              <div className="flex gap-2">
                <input
                  className="form-input flex-1"
                  type="email"
                  placeholder="your@email.com"
                  value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value, email_verified: false }))}
                />
                {profile.email && !profile.email_verified && (
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={sendingVerification}
                    className="btn-primary h-10 px-3 text-xs rounded-lg shrink-0 flex items-center gap-1.5"
                  >
                    {sendingVerification ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Verify
                  </button>
                )}
              </div>
              {profile.email && !profile.email_verified && (
                <p className="text-[11px] text-muted-foreground mt-1">Save your email first, then click Verify to receive a verification link.</p>
              )}
            </div>
          ) : (
            <div>
              <label className="form-label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{t('profile.email')}</label>
              <input className="form-input opacity-60" value={user?.email || ''} disabled />
            </div>
          )}

          <div>
            <label className="form-label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{t('profile.phoneNumber')}</label>
            <input className="form-input" type="tel" placeholder={t('profile.phonePlaceholder')} value={profile.phone_number} onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))} />
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />{t('profile.address')}</label>
            <textarea className="form-input min-h-[80px] resize-none" placeholder={t('profile.addressPlaceholder')} value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full h-11">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.saveChanges')}
          </button>
        </form>

        {!isPhoneUser && (
          <div className="card-surface space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" strokeWidth={1.5} /> Change password
            </h2>
            <div>
              <label className="form-label">New password</label>
              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirm password</label>
              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={!newPassword || newPassword.length < 6 || newPassword !== confirmPassword || changingPassword}
              onClick={async () => {
                setChangingPassword(true);
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                setChangingPassword(false);
                if (error) {
                  toast.error(error.message || 'Failed to update password');
                } else {
                  toast.success('Password updated successfully');
                  setNewPassword('');
                  setConfirmPassword('');
                }
              }}
              className="btn-primary w-full h-11"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
            </button>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <h2 className="text-[13px] font-semibold text-destructive">{t('profile.dangerZone')}</h2>
          <button onClick={() => setShowDeactivate(true)} className="w-full card-surface flex items-center gap-3 text-left hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><ShieldOff className="w-4 h-4 text-muted-foreground" /></div>
            <div>
              <div className="text-sm font-semibold text-foreground">{t('profile.deactivateAccount')}</div>
              <div className="text-xs text-muted-foreground">{t('profile.deactivateHint')}</div>
            </div>
          </button>
          <button onClick={() => setShowDelete(true)} className="w-full card-surface flex items-center gap-3 text-left hover:shadow-md transition-shadow border border-destructive/20">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4 text-destructive" /></div>
            <div>
              <div className="text-sm font-semibold text-destructive">{t('profile.deleteAccount')}</div>
              <div className="text-xs text-muted-foreground">{t('profile.deleteHint')}</div>
            </div>
          </button>
        </div>
      </div>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.deactivateConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('profile.deactivateDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                const { error } = await supabase.functions.invoke('account-actions', { body: { action: 'deactivate' } });
                setActionLoading(false);
                if (error) { toast.error(t('profile.deactivateFailed')); return; }
                toast.success(t('profile.deactivated'));
                setShowDeactivate(false);
                await signOut();
              }}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setDeleteConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">{t('profile.deleteDescription')}</span>
              <span className="block text-sm font-medium text-foreground">{t('profile.typeDelete')}</span>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={t('profile.typeDeletePlaceholder')} className="mt-1" />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || deleteConfirmText !== 'DELETE'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (deleteConfirmText !== 'DELETE') return;
                setActionLoading(true);
                const { error } = await supabase.functions.invoke('account-actions', { body: { action: 'delete' } });
                setActionLoading(false);
                if (error) { toast.error(t('profile.deleteFailed')); return; }
                toast.success(t('profile.deleted'));
                setShowDelete(false);
                await signOut();
                navigate('/auth');
              }}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.deleteForever')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
