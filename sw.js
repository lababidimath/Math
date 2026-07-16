const CACHE_NAME = 'lababidi-math-cache-v1';

// الملفات الأساسية التي سيتم حفظها في جهاز الطالب ليعمل التطبيق بدون إنترنت
const ASSETS_TO_CACHE = [
  './index.html',
  './login1.html',
  './all.min.css',
  './logo.png',
  // أضف هنا أي صفحات أخرى تريد تفعيلها أوفلاين (مثل ملفات المكتبة أو الملفات التعريفية)
  './library.html',
  './profile.html',
  './settings.html'
];

// 1. تثبيت الـ Service Worker وحفظ الملفات الأساسية في الكاش
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('⏳ جاري حفظ ملفات المنصة في الذاكرة المؤقتة لعملها أوفلاين...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. تفعيل النظام وتنظيف أي كاش قديم عند تحديث التطبيق
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🧹 تم تنظيف الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. اعتراض الطلبات وتطبيق استراتيجية (الشبكة أولاً مع العودة للكاش عند الأوفلاين)
self.addEventListener('fetch', event => {
  // استثناء طلبات قاعدة بيانات Firebase و Green-API من الكاش لضمان دقتها
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firebaseio.com') || 
    event.request.url.includes('api.green-api.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // إذا كان هناك إنترنت، نقوم بتحديث الكاش بالنسخة الجديدة
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // عند انقطاع الإنترنت، يتم جلب الملف من الكاش فوراً ليعمل التطبيق بسلاسة
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // إذا طلب الطالب صفحة غير مسجلة بالكاش وهو أوفلاين، يتم توجيهه للرئيسية كاحتياط
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
