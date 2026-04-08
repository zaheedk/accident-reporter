// Push notification handler for service worker
self.addEventListener('push', (event) => {
  let data = { title: 'SAVO Reminder', body: 'You have a new notification', icon: '/app-icon-192.png' };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/app-icon-192.png',
      badge: '/app-icon-192.png',
      vibrate: [200, 100, 200],
      data: data.url ? { url: data.url } : undefined,
      tag: data.tag || 'savo-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
