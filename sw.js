const CACHE_NAME = 'taskpro-v10-cache';

const ASSETS_TO_CACHE = [
  '/',
  '/Daily_Todo_Checklist.html',
  '/manifest.json',
  '/sw.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Playfair+Display:wght@400;700&family=Roboto+Mono:wght@400;700&family=Comic+Neue:wght@400;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (e) => {
  console.log('Service Worker: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell and resources');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.error('Cache Error:', err);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activating');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip Firebase requests - let them go to network
  if (url.origin.includes('firebase') || url.origin.includes('firestore') || url.origin.includes('googleapis')) {
    e.respondWith(fetch(request));
    return;
  }

  // Cache strategy for static assets (styles, scripts, fonts)
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    e.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          // Cache successful responses
          if (fetchResponse && fetchResponse.status === 200) {
            // IMPORTANT FIX: Clone response immediately for caching
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return fetchResponse;
        });
      }).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Network-first strategy for HTML pages
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request).then((response) => {
        // Cache successful HTML responses
        if (response && response.status === 200) {
          // IMPORTANT FIX: Clone response immediately for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback to cached version if network fails
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Default: try network first, then cache
  e.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          // IMPORTANT FIX: Clone response immediately for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request) || new Response('Offline', { status: 503 });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'You have a new notification',
    icon: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
    vibrate: [100, 50, 100],
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'open',
        title: 'Open TaskPro'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TaskPro', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Sync any pending offline actions
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await processOfflineAction(action);
        await removePendingAction(action.id);
      } catch (err) {
        console.error('Failed to sync action:', err);
      }
    }
  } catch (err) {
    console.error('Background sync failed:', err);
  }
}

// Storage helpers for offline actions
async function getPendingActions() {
  // This would integrate with IndexedDB for offline storage
  return [];
}

async function removePendingAction(id) {
  // Remove processed action from offline storage
}

async function processOfflineAction(action) {
  // Process offline action (e.g., sync to Firebase)
  console.log('Processing offline action:', action);
}
