// TODO WAR service worker.
// Phase 1 (local/now): makes the app installable as a PWA. Caching is intentionally
// minimal so dev changes always show. The real remote Web Push handlers below are
// already wired so that, once VAPID + a push backend (Supabase edge fn) are added on
// deploy, lock-screen notifications work with no further service-worker changes.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Remote Web Push (active after deploy + push subscription).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'TODO WAR', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'TODO WAR'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'todo-war',
      data: { url: data.url || '/' },
      vibrate: [80, 40, 80],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
