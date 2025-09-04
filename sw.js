// Ikdao Calendar PWA sw.js
const CACHE_NAME = 'pwa-cache-v1.00.111';
const OFFLINE_URL = "/tool/calendar/offline.html";
const PRECACHE_ASSETS = [
OFFLINE_URL,
  '/tool/calendar/calendar-logo.png',
  '/tool/calendar/calendar-logo.svg'
];

// Utility: check if response is cacheable
function isCacheable(response) {
  if (!response || !response.ok) return false;
  const vary = response.headers.get("Vary");
  if (vary && vary.includes("*")) return false;
  return true;
}

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        PRECACHE_ASSETS.map(url =>
          fetch(url).then(response => {
            if (isCacheable(response)) {
              return cache.put(url, response);
            } else {
              console.warn("Not cacheable (install):", url);
            }
          }).catch(err => console.warn("Failed to fetch:", url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// ACTIVATE - clear old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          let requestUrl = new URL(event.request.url);
          // Check if the request is for the base URL with or without a trailing slash
          const isBaseUrl = requestUrl.pathname === '/tool/calendar' || requestUrl.pathname === '/tool/calendar/';
          
          if (isBaseUrl) {
            // Serve the OFFLINE_URL when the base URL is requested offline
            return caches.match(OFFLINE_URL);
          } else {
            // Fallback for other requests
            return caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL));
          }
        })
    );
  } else {
    // Static assets: cache-first strategy
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});


// Notification click handler
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/tool/calendar/"));
});