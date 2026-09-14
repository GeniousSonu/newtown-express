// Newtown Express PWA Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Enforce NetworkOnly for all API routes and Firebase/Firestore operations
// to guarantee zero caching of dynamic order state or server responses
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (
    url.includes('/api/') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('firebaseio.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com')
  ) {
    // Strictly network only — bypass any service worker cache
    event.respondWith(fetch(event.request));
    return;
  }
});

// Handle FCM Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Newtown Express', body: event.data.text() };
    }
  }

  const title = data.title || data.notification?.title || '🚨 New Pantry Order!';
  const options = {
    body: data.body || data.notification?.body || 'A new order has been received at the kitchen!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'kitchen-new-order',
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 600],
    data: data.data || { url: '/admin' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
