/**
 * Native deep-link handler for the Capacitor shell.
 *
 * Handles URLs of the form:
 *   savo://quick-capture     -> /claims/quick-capture
 *   savo://claim/<id>        -> /claims/<id>
 *   savo://dashboard         -> /dashboard
 *
 * Mounted once from <App /> when running on a native platform.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appUrlOpen', (event) => {
          try {
            const url = new URL(event.url);
            // savo://quick-capture -> host=quick-capture
            const host = url.host || url.pathname.replace(/^\/+/, '').split('/')[0];
            const segments = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);

            if (host === 'quick-capture') {
              navigate('/claims/quick-capture');
            } else if (host === 'dashboard') {
              navigate('/dashboard');
            } else if (host === 'claim' && segments[0]) {
              navigate(`/claims/${segments[0]}`);
            } else if (host === 'claims') {
              navigate('/claims');
            }
          } catch (e) {
            console.warn('deep-link parse failed', event.url, e);
          }
        });
        cleanup = () => handle.remove();
      } catch (e) {
        console.warn('Capacitor App plugin unavailable', e);
      }
    })();

    return () => cleanup?.();
  }, [navigate]);

  return null;
}
