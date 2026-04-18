import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Camera, Loader2, User, Phone, MapPin, Mail, ShieldOff, Trash2, CheckCircle, AlertCircle, Send, Lock, Eye, EyeOff, Bell, CreditCard, CalendarDays } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import DocumentVault from '@/components/DocumentVault';

interface ProfileData {
  display_name: string;
  phone_number: string;
  address: string;
  avatar_url: string;
  email: string;
  email_verified: boolean;
  license_number: string;
  license_expiry: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
    display_name: '', phone_number: '', address: '', avatar_url: '', email: '', email_verified: false, license_number: '', license_expiry: '',
  });

  // Detect if user signed in via phone (fake email pattern)
  const isPhoneUser = user?.email?.endsWith('@savo.phone.local(') || false;

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, phone_number, address, avatar_url, email, email_verified, license_number, license_expiry')
      .eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile({
            display_name: data.display_name || '', phone_number: data.phone_number || '',
            address: data.address || '', avatar_url: data.avatar_url || '',
            email: (data as any).email || '', email_verified: (data as any).email_verified || false,
            license_number: (data as any).license_number || '', license_expiry: (data as any).license_expiry || '',
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
      license_number: profile.license_number, license_expiry: profile.license_expiry,
    };
    // For phone users, also save email (but don't change verified status here)
    if (isPhoneUser) {
      updateData.email = profile.email;
    }
    // Check if email was added/changed (for phone users) to auto-send verification
    const emailChanged = isPhoneUser && profile.email && profile.email.includes('@') && !profile.email_verified;
    
    const { error } = await supabase.from('profiles').update(updateData as any).eq('user_id', user.id);
    setSaving(false);
    if (error) { toast.error('Failed to save profile'); return; }
    
    toast.success('Profile updated');
    
    // Auto-send verification email if phone user just added/changed their email
    if (emailChanged) {
      try {
        const { data, error: verifyErr } = await supabase.functions.invoke('verify-email', {
          body: { email: profile.email },
        });
        if (verifyErr) throw new Error(verifyErr.message);
        if (data?.error) throw new Error(data.error);
        toast.success('Verification email sent to ' + profile.email);
      } catch (err: any) {
        console.error('Auto-verification email failed:', err);
        toast.info('Save successful. Click Verify to send a verification email.');
      }
    }
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
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
    setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
    setUploading(false);
    toast.success('Photo updated');
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
            <p className="text-sm text-muted-foreground">Settings</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">Profile</h1>
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
            <p className="text-sm font-semibold text-foreground">{profile.display_name || 'No name set'}</p>
            <p className="text-xs text-muted-foreground">{isPhoneUser ? profile.phone_number : user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="card-surface space-y-4">
          <div>
            <label className="form-label flex items-center gap-1.5"><User className="w-3.5 h-3.5" strokeWidth={1.5} />Full name</label>
            <input className="form-input" placeholder="Your full name" value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
          </div>

          {isPhoneUser ? (
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                Email
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
              <label className="form-label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" strokeWidth={1.5} />Email</label>
              <input className="form-input opacity-60" value={user?.email || ''} disabled />
            </div>
          )}

          <div>
            <label className="form-label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" strokeWidth={1.5} />Phone number</label>
            <input className="form-input" type="tel" placeholder="e.g. 021 123 4567" value={profile.phone_number} onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))} />
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />Address</label>
            <textarea className="form-input min-h-[80px] resize-none" placeholder="Your home or postal address" value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="border-t border-border/50 pt-4 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Driver License</p>
            <div className="space-y-4">
              <div>
                <label className="form-label flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />License Number</label>
                <input className="form-input" placeholder="e.g. AB123456" value={profile.license_number} onChange={e => setProfile(p => ({ ...p, license_number: e.target.value }))} />
              </div>
              <div>
                <label className="form-label flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />License Expiry Date</label>
                <input className="form-input" type="date" value={profile.license_expiry} onChange={e => setProfile(p => ({ ...p, license_expiry: e.target.value }))} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full h-11">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
          </button>
        </form>

        {isSupported && (
          <div className="card-surface space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" strokeWidth={1.5} /> Push Notifications
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Expiry reminders</p>
                <p className="text-[11px] text-muted-foreground">Get alerts when your rego, WOF or insurance is expiring</p>
              </div>
              <Switch
                checked={isSubscribed}
                disabled={pushLoading}
                onCheckedChange={async (checked) => {
                  const success = checked ? await subscribe() : await unsubscribe();
                  if (success) {
                    toast.success(checked ? 'Push notifications enabled' : 'Push notifications disabled');
                  } else {
                    toast.error('Failed to update push notification settings');
                  }
                }}
              />
            </div>
          </div>
        )}

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

        <div className="card-surface">
          <DocumentVault
            title="My Documents"
            showCategories={['drivers_license', 'other']}
          />
        </div>

        <div className="pt-4 space-y-3">
          <h2 className="text-[13px] font-semibold text-destructive">Danger Zone</h2>
          <button onClick={() => setShowDeactivate(true)} className="w-full card-surface flex items-center gap-3 text-left hover:border-foreground/20 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><ShieldOff className="w-4 h-4 text-muted-foreground" /></div>
            <div>
              <div className="text-sm font-semibold text-foreground">Deactivate Account</div>
              <div className="text-xs text-muted-foreground">Temporarily disable your account</div>
            </div>
          </button>
          <button onClick={() => setShowDelete(true)} className="w-full card-surface flex items-center gap-3 text-left hover:shadow-md transition-shadow border border-destructive/20">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4 text-destructive" /></div>
            <div>
              <div className="text-sm font-semibold text-destructive">Delete Account</div>
              <div className="text-xs text-muted-foreground">Permanently remove all your data</div>
            </div>
          </button>
        </div>
      </div>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
            <AlertDialogDescription>Your account will be deactivated and you won't be able to access the app until an administrator reactivates it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                const { error } = await supabase.functions.invoke('account-actions', { body: { action: 'deactivate' } });
                setActionLoading(false);
                if (error) { toast.error('Failed to deactivate account'); return; }
                toast.success('Account deactivated');
                setShowDeactivate(false);
                await signOut();
              }}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setDeleteConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">This will permanently delete your account and all associated data including vehicles, claims, and profile information. This action cannot be undone.</span>
              <span className="block text-sm font-medium text-foreground">Type DELETE to confirm:</span>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" className="mt-1" />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || deleteConfirmText !== 'DELETE'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (deleteConfirmText !== 'DELETE') return;
                setActionLoading(true);
                const { error } = await supabase.functions.invoke('account-actions', { body: { action: 'delete' } });
                setActionLoading(false);
                if (error) { toast.error('Failed to delete account'); return; }
                toast.success('Account deleted');
                setShowDelete(false);
                await signOut();
                navigate('/auth');
              }}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
