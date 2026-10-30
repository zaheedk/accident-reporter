import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { refreshNativeReminders } from '@/lib/native-reminders';

export default function ReminderLifecycle() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || loading) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void refreshNativeReminders(user?.id || null).catch(() => console.warn('Reminder refresh failed; retry on next app opening')); }, 500);
    };
    refresh();
    const resume = App.addListener('appStateChange', state => { if (state.isActive) refresh(); });
    const tap = LocalNotifications.addListener('localNotificationActionPerformed', action => {
      const url = action.notification.extra?.url;
      if (['/vehicles', '/profile', '/fault-quiz'].includes(url)) navigate(url);
    });
    const unsubscribe = queryClient.getMutationCache().subscribe(refresh);
    window.addEventListener('savo:reminders-changed', refresh);
    return () => {
      clearTimeout(timer); unsubscribe(); window.removeEventListener('savo:reminders-changed', refresh);
      void resume.then(handle => handle.remove()); void tap.then(handle => handle.remove());
    };
  }, [user?.id, loading, queryClient, navigate]);
  return null;
}