// اسم الكاش الخاص بمنصتك (يمكنك تغييره عند إجراء تحديثات جذرية)
const CACHE_NAME = 'lababidi-platform-cache-v1';

// الملفات الأساسية التي يجب حفظها ليعمل الموقع أوفلاين بشكله الكامل
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/library.html',
    '/profile.html',
    '/logo.png', // تأكد من مطابقة اسم اللوغو الخاص بك
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. مرحلة التثبيت: حفظ الملفات الأساسية في كاش الهاتف لأول مرة
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('تم حفظ الهيكل الأساسي للموقع في الكاش بنجاح!');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// 2. مرحلة التنشيط: حذف أي كاش قديم إذا قمت بتغيير اسم الـ CACHE_NAME مستقبلاً
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('تم تنظيف الكاش القديم:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. مرحلة جلب البيانات (الاستراتيجية الذكية): الإنترنت أولاً، وإذا انقطع فمن الكاش
self.addEventListener('fetch', (event) => {
    // نتحقق فقط من الطلبات العادية (GET) لتجنب مشاكل طلبات الـ POST وغيرها
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // إذا نجح الاتصال بالإنترنت، نحدث النسخة المخزنة في الكاش تلقائياً
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // في حال فشل الاتصال بالإنترنت تماماً، نقوم بالبحث عن الملف في الكاش
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // إذا كان الطلب لصفحة HTML غير مسجلة صراحة، نعيده للصفحة الرئيسية
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
