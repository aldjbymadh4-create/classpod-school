const CACHE_NAME = 'classpod-v3-20261009';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/app2.js',
  '/app3.js',
  '/app4.js',
  '/app5.js',
  '/dm.js',
  '/pwa.js',
  '/v2.js',
  '/icon-192.png',
  '/icon-512.png'
];

// تثبيت الخدمة وتخزين الملفات أساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// تفعيل الخدمة وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// جلب الملفات حتى عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // في حال انقطاع الإنترنت وعدم وجود الملف في الكاش للصفحات
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
