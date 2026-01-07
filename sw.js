// Clean Service Worker for TaskPro
const CACHE_NAME = 'taskpro-v9-cache';

self.addEventListener('install', (event) => {
  console.log('SW Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW Activated');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache static assets
  if (url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.json') || 
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
  
  // For API calls, just fetch
  event.respondWith(fetch(event.request));
});
  
  // Skip Firebase and external APIs - go to network
  if (url.origin.includes('firebase') || 
      url.origin.includes('firestore') || 
      url.origin.includes('googleapis') ||
      url.origin.includes('gstatic') ||
      !url.protocol.startsWith('http')) {
    
    // Monitor Firebase requests
    firebaseRequests++;
    logQuotaStats();
    
    event.respondWith(fetch(event.request).catch(() => {
      return new Response('Network error', { status: 503 });
    }));
    return;
  }
  
  // Monitor local requests
  localRequests++;
  logQuotaStats();
  
  // For local files, try network first, then cache
  event.respondWith(
    fetch(event.request).then(response => {
      // Only cache successful responses
      if (response.ok && response.type === 'basic') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // If network fails, try cache
      return caches.match(event.request).then(cached => {
        if (cached) {
          console.log('Serving from cache:', event.request.url);
          return cached;
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Log quota statistics every 30 seconds
function logQuotaStats() {
  const now = Date.now();
  if (now - lastLogTime > 30000) { // 30 seconds
    console.log(`📊 Quota Stats - Firebase: ${firebaseRequests}, Local: ${localRequests}, Cache: ${CACHE_NAME}`);
    lastLogTime = now;
  }
}
