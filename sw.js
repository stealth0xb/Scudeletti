const CACHE = 'scudeletti-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo-header.png', './apple-touch-icon.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    await Promise.allSettled(LIBS.map((u) => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;

  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then((r) => {
        if (r && r.ok) c.put(req, r.clone());
        return r;
      }).catch(() => null);
      if (hit) { net.catch(() => {}); return hit; }
      const r = await net;
      if (r) return r;
      if (req.mode === 'navigate') return c.match('./index.html');
      return new Response('', { status: 504 });
    })());
    return;
  }

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
      return r;
    } catch (err) {
      return new Response('', { status: 504 });
    }
  })());
});
