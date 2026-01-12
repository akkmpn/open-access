self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
  // This helps the app load correctly on mobile data
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
