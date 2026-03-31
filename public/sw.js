/* Court Map — offline shell + cached data (Next.js) */
const CACHE = 'courtmap-v3-next';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(['/', '/manifest.json', '/icons/icon.svg'])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function sameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  if (req.method !== 'GET' || !sameOrigin(url)) return;

  const path = new URL(url).pathname;

  if (path === '/courts.json') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match('/courts.json'))
    );
    return;
  }

  if (path === '/' || path.endsWith('.html') || req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok && path.startsWith('/icons/')) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return response;
      });
    })
  );
});
