// Service Worker for IP Location Tool PWA
const CACHE_NAME = 'ip-location-v1.0.0';
const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

// 静态资源列表 - 需要缓存的文件
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/privacy.html',
  '/css/style.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/ui.js',
  '/manifest.json'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // 立即激活新的 Service Worker
      return self.skipWaiting();
    })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // 立即控制所有页面
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 对于 API 请求，直接走网络
  if (url.origin === 'https://ipinfo.io') {
    event.respondWith(
      fetch(request).catch(() => {
        // API 请求失败，返回离线提示
        return new Response(
          JSON.stringify({ error: '网络连接失败，请检查网络设置' }),
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 对于导航请求，使用 Network First 策略
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 动态缓存 HTML 页面
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // 网络失败，尝试从缓存获取
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 对于静态资源（CSS、JS、图片），使用 Cache First 策略
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          // 缓存新获取的资源
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // 其他请求使用 Network Only
  event.respondWith(fetch(request));
});

// 后台同步（可选功能）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-history') {
    event.waitUntil(
      // 这里可以添加同步逻辑
      Promise.resolve()
    );
  }
});

// 推送通知（可选功能）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '新通知',
      icon: '/manifest.json',
      badge: '/manifest.json',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'IP查询工具', options)
    );
  }
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
