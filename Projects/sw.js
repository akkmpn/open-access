// Enhanced Service Worker for Supabase Integration
const CACHE_NAME = 'taskpro-supabase-v9-cache';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './TaskPro_Supabase.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Quota monitoring
let supabaseRequests = 0;
let localRequests = 0;
let lastLogTime = Date.now();

self.addEventListener('install', (event) => {
  console.log('SW Installed for Supabase TaskPro');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW Activated for Supabase TaskPro');
  
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
  
  // Skip Supabase and external APIs - go to network
  if (url.origin.includes('supabase') || 
      url.origin.includes('supabase.co') ||
      url.origin.includes('googleapis') ||
      url.origin.includes('gstatic') ||
      !url.protocol.startsWith('http')) {
    
    // Monitor Supabase requests
    supabaseRequests++;
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
    console.log(`📊 Quota Stats - Supabase: ${supabaseRequests}, Local: ${localRequests}, Cache: ${CACHE_NAME}`);
    lastLogTime = now;
  }
}
