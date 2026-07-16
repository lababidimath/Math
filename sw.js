const CACHE_NAME = 'lababidi-math-cache-v1';

const ASSETS_TO_CACHE = [
  './index.html',
  './login1.html',
  './all.min.css',
  './logo.png',
  './library.html',
  './profile.html',
  './settings.html'
];

// 1. تثبيت الـ Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. تنظيف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. اعتراض الطلبات
self.addEventListener('fetch', event => {
  // استثناء طلبات API الخارجية
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firebaseio.com') || 
    event.request.url.includes('api.green-api.com')
  ) {
    return;
  }

  // --- الحل الجذري لمشكلة الـ index ---
  // إذا كان الطلب عبارة عن تنقل (Navigation)، اجبره على استخدام index.html من الكاش
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // التحقق من الملفات الثابتة (Library & Assets)
  const isLibraryOrStatic = ASSETS_TO_CACHE.some(asset => {
    const cleanAsset = asset.replace('./', '');
    return event.request.url.includes(cleanAsset) || event.request.url.endsWith('.pdf');
  });

  if (isLibraryOrStatic) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
           if (networkResponse.status === 200) {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
           }
           return networkResponse;
        });
      })
    );
  } else {
    // استراتيجية الشبكة أولاً لباقي الصفحات
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
