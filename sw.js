const CACHE_NAME = 'lababidi-math-cache-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login1.html',
  './all.min.css',
  './logo.png',
  './library.html',
  './profile.html',
  './settings.html'
];

// 1. التثبيت: تحميل الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. التفعيل: تنظيف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
  self.clients.claim();
});

// 3. اعتراض الطلبات (المنطق الموحد والذكي)
self.addEventListener('fetch', event => {
  // استثناء طلبات API (لا نلمسها أبداً)
  if (event.request.method !== 'GET' || event.request.url.includes('firebaseio.com') || event.request.url.includes('api.green-api.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // جلب التحديث من الشبكة في الخلفية (Revalidate)
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // فشل الاتصال، لا تفعل شيئاً (نعتمد على الكاش)
        });

        // إذا وجدنا الملف في الكاش نعيده فوراً (سرعة)، وإذا لم نجد ننتظر الشبكة
        return cachedResponse || fetchPromise;
      });
    }).catch(() => {
      // الحل الأخير: إذا فشل كل شيء (أوفلاين تماماً)، نعيد الصفحة الرئيسية لمنع الشاشة البيضاء
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

// 4. الحفاظ على الخدمة نشطة (PING)
self.addEventListener('message', event => {
  if (event.data.type === 'PING') {
    // الرد على النبض لإبقاء الـ SW نشطاً
  }
});
