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

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)))
  );
  self.clients.claim();
});

// 3. اعتراض الطلبات (النسخة المحسنة)
self.addEventListener('fetch', event => {
  // استثناء طلبات API (لا نلمسها أبداً)
  if (event.request.method !== 'GET' || event.request.url.includes('firebaseio.com') || event.request.url.includes('api.green-api.com')) {
    return;
  }

  // --- الحل الجذري: Cache-First لكل شيء ---
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. إذا وجدنا الملف في الكاش، نعيده فوراً (سرعة فائقة + أوفلاين)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. إذا لم نجد الملف، نحاول جلبه من الشبكة
      return fetch(event.request).then(networkResponse => {
        // إذا نجح الجلب، نخزنه في الكاش للمرة القادمة
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // 3. إذا فشل كل شيء، نعيد الصفحة الرئيسية كحل أخير (تمنع الشاشة البيضاء)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
         // إذا فشل كل شيء، حاول عرض الـ index من الكاش كخطة أخيرة
         return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data.type === 'PING') {
    // لا تفعل شيئاً، فقط لضمان بقاء الـ Service Worker نشطاً
  }
});
