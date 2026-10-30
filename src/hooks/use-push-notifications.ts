import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { readReminderPreferences, type ReminderKind } from '@/lib/reminder-plan';
import { refreshNativeReminders } from '@/lib/native-reminders';

const VAPID_PUBLIC_KEY = 'BOo-qOvBG11PGO37UZBZ15RN0h9cdY1I9Xt3HkNHT204DnQGw53LQ7ucwfC-lggDXLSLG5Fx2hqH0khSF_Y2nxY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function pushRegistration() {
  // Reuse the production offline worker, or explicitly register the push-only worker
  // on opt-in. Never wait forever for an unregistered worker.
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing?.active) return existing;
  if (!existing) await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => setTimeout(() => reject(new Error('Notifications could not start. Please refresh and try again.')), 10000)),
  ]);
}

export function usePushNotifications(kind: ReminderKind = 'expiry') {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    const supported = native || ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    setIsSupported(supported);
    if (!user) setIsSubscribed(false);
    if (supported && user) {
      checkSubscription();
    }
    const update = () => { if (supported && user) void checkSubscription(); };
    window.addEventListener('savo:reminders-changed', update);
    return () => window.removeEventListener('savo:reminders-changed', update);
  }, [user?.id, kind]);

  const checkSubscription = async () => {
    try {
      if (!user) { setIsSubscribed(false); return; }
      if (native) {
        const permission = await LocalNotifications.checkPermissions();
        setIsSubscribed(permission.display === 'granted' && readReminderPreferences(user.id)[kind]);
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription || Notification.permission !== 'granted') { setIsSubscribed(false); return; }
      const { data, error } = await supabase.from('push_subscriptions')
        .select('quiz_enabled,expiry_enabled').eq('user_id', user.id).eq('endpoint', subscription.endpoint).maybeSingle();
      if (error) throw error;
      setIsSubscribed(kind === 'quiz' ? data?.quiz_enabled === true : data?.expiry_enabled === true);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = async () => {
    if (!user || !isSupported) { setErrorMessage('Sign in to enable reminders on a supported device.'); return false; }
    setLoading(true);
    setErrorMessage('');
    try {
      if (native) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') throw new Error('Notifications are blocked. Allow SAVO notifications in your phone Settings.');
        const previous = readReminderPreferences(user.id);
        localStorage.setItem(`savo:reminders:${user.id}`, JSON.stringify({ ...previous, [kind]: true }));
        try { await refreshNativeReminders(user.id); }
        catch (error) { localStorage.setItem(`savo:reminders:${user.id}`, JSON.stringify(previous)); throw error; }
      } else {
      if (await Notification.requestPermission() !== 'granted') throw new Error('Notifications are blocked. Allow notifications in your browser settings. On iPhone, open SAVO from your Home Screen.');
      const registration = await pushRegistration();
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Could not register this device for notifications.');
      const { data: previous, error: readError } = await supabase.from('push_subscriptions').select('quiz_enabled,expiry_enabled')
        .eq('user_id', user.id).eq('endpoint', json.endpoint).maybeSingle();
      if (readError) throw readError;
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        quiz_enabled: kind === 'quiz' || previous?.quiz_enabled === true,
        expiry_enabled: kind === 'expiry' || previous?.expiry_enabled === true,
      }, { onConflict: 'user_id,endpoint' });
      if (error) throw error;
      }

      setIsSubscribed(true);
      window.dispatchEvent(new Event('savo:reminders-changed'));
      return true;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not enable reminders. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user) return false;
    setLoading(true);
    setErrorMessage('');
    try {
      if (native) {
        const previous = readReminderPreferences(user.id);
        localStorage.setItem(`savo:reminders:${user.id}`, JSON.stringify({ ...previous, [kind]: false }));
        try { await refreshNativeReminders(user.id); }
        catch (error) { localStorage.setItem(`savo:reminders:${user.id}`, JSON.stringify(previous)); throw error; }
      } else {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { error } = await supabase.from('push_subscriptions')
          .update(kind === 'quiz' ? { quiz_enabled: false } : { expiry_enabled: false })
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
        if (error) throw error;
      }
      }
      setIsSubscribed(false);
      window.dispatchEvent(new Event('savo:reminders-changed'));
      return true;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not disable reminders. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isSubscribed, isSupported, loading, subscribe, unsubscribe, errorMessage };
}
