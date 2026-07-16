const CACHE_NAME = 'lababidi-math-cache-v1';

// الملفات الأساسية التي سيتم حفظها في جهاز الطالب ليعمل التطبيق بدون إنترنت
const ASSETS_TO_CACHE = [
  './',               // حفظ المسار الرئيسي لضمان فتح التطبيق مباشرة أوفلاين
  './index.html',
  './login1.html',
  './all.min.css',
  './logo.png',
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

// 3. اعتراض الطلبات وتطبيق استراتيجيات مخصصة (تجاوز حظر الـ VPN للمكتبة)
self.addEventListener('fetch', event => {
  // استثناء طلبات قاعدة بيانات Firebase و Green-API من الكاش لضمان دقتها وقبول طلبات GET فقط
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firebaseio.com') || 
    event.request.url.includes('api.green-api.com')
  ) {
    return;
  }

  // التحقق مما إذا كان الطلب يخص صفحة المكتبة أو الملفات الثابتة المخزنة بالكاش
  const isLibraryOrStatic = ASSETS_TO_CACHE.some(asset => {
    // تحويل المسار النسبي ليتطابق مع رابط الطلب الكامل
    const cleanAsset = asset.replace('./', '');
    return event.request.url.includes(cleanAsset) || event.request.url.endsWith('.pdf');
  });

  if (isLibraryOrStatic) {
    // أ) استراتيجية (الكاش أولاً): لصفحة المكتبة وملفاتها لمنع تعليق الصفحة بدون VPN
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // تسليم الصفحة فوراً من ذاكرة هاتف الطالب
        }
        // إذا لم تكن مخزنة، يتم جلبها من الشبكة وحفظها للمرات القادمة
        return fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  } else {
    // ب) استراتيجية (الشبكة أولاً): لباقي الصفحات التفاعلية لضمان تحديث البيانات
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // عند انقطاع الإنترنت أو فشل الاتصال (حجب الشبكة)
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // التحقق الآمن من نوع الملف لتجنب توقف السيرفس وركر (TypeError)
            const acceptHeader = event.request.headers.get('accept');
            if (acceptHeader && acceptHeader.includes('text/html')) {
              return caches.match('./index.html');
            }
          });
        })
    );
  }
});
