const CACHE_NAME = 'study-dashboard-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js'
];

// Install — cache all files
self.addEventListener('install', e => {
  console.log('[SW] Installing…');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
     .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  console.log('[SW] Activating…');
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n!==CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache first, then network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cached version OR fetch from network
      return cached || fetch(e.request).then(res => {
        // Cache new files
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, res.clone());
          return res;
        });
      });
    })
  );
});