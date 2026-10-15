/* The build fills in the hashed assets. Scope-relative paths also work on GitHub Pages. */
const VERSION = __VERSION__;
const PREFIX = `mahjong-${self.registration.scope}-`;
const CACHE = `${PREFIX}${VERSION}`;
const ASSETS = __PRECACHE__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request, { ignoreVary: true })).then(cached => {
    if (cached) return cached;
    return fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') return caches.open(CACHE).then(cache => cache.match(new URL('./index.html', self.registration.scope)));
      return Response.error();
    });
  }));
});
