// Cache-first service worker. The app shell is cached on install; the text reader files and
// sample images are cached the first time they are used, so they work offline after that.
const CACHE = 'answerable-v3';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/clean.js', 'js/parse.js', 'js/render.js',
  'manifest.webmanifest', 'icon.svg', 'samples/before-thumb.webp',
  'vendor/fonts/atkinson-hyperlegible-400.woff2', 'vendor/fonts/atkinson-hyperlegible-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
