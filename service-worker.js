const CACHE_NAME = 'main-cache';
const toCache = [
  '/',
  '/index.html',
  '/settings.html',
  '/css/style.css',
  '/css/settings.css',
  '/resources/bootstrap-icons-1.7.0/bootstrap-icons.css',
  '/resources/bootstrap-icons-1.7.0/fonts/bootstrap-icons.woff2',
  '/resources/bootstrap-icons-1.7.0/fonts/bootstrap-icons.woff',
  '/images/favicon.ico',
  '/images/nav_logo.png',
  '/js/main.js',
  '/js/settings.js',
  '/js/jquery.min.js',
  '/js/status.js',
  '/js/scan/html5-qrcode.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(toCache)
      })
      .then(self.skipWaiting())
  )
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.open(CACHE_NAME)
          .then((cache) => {
            return cache.match(event.request)
          })
      })
  )
})

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key)
            return caches.delete(key)
          }
        }))
      })
      .then(() => self.clients.claim())
  )
})