const CACHE_NAME = 'taskpro-v9-released-cache';
const BASE_URL = 'https://akkmpn.github.io/open-access/released_access/taskpro_firebase/';

const ASSETS_TO_CACHE = [
  BASE_URL,
  BASE_URL + 'taskpro.html',
  BASE_URL + 'manifest.json',
  BASE_URL + 'sw.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Playfair+Display:wght@400;700&family=Roboto+Mono:wght@400;700&family=Comic+Neue:wght@400;700&display=swap'
];

self.addEventListener('install', (e) => {
  console.log('Service Worker: Installing');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.log('Cache Error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activating');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip Firebase
  if (url.origin.includes('firebase') || url.origin.includes('firestore')) {
    e.respondWith(fetch(request));
    return;
  }

  // Cache-first for assets
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font') {
    e.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      }).catch(() => new Response('Offline'))
    );
    return;
  }

  // Network-first for HTML
  e.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(() => caches.match(request) || new Response('Offline', { status: 503 }))
  );
});
