/* Lueur — service worker
   Rôle : garder une copie des fichiers de l’application pour qu’elle s’ouvre sans réseau.
   Il ne lit, ne copie et n’envoie JAMAIS tes données personnelles : elles restent dans le
   stockage local (localStorage) de l’appareil, que ce fichier ne touche pas. */
const VERSION = 'lueur-1.1.0';
const LOCAL_FILES = ['./', './index.html', './app.js', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];
const EXTERNAL_FILES = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "https://cdn.tailwindcss.com/3.4.17",
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap"
];
const EXTERNAL_HOSTS = ['cdnjs.cloudflare.com', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(LOCAL_FILES.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(EXTERNAL_FILES.map(async u => { const r = await fetch(u, { mode: 'no-cors' }); await cache.put(u, r); }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('lueur-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page d’accueil : réseau d’abord (pour recevoir les mises à jour), copie locale si hors ligne.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try { const fresh = await fetch(req); if (fresh && fresh.ok) cache.put('./index.html', fresh.clone()); return fresh; }
      catch (e) { return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error(); }
    })());
    return;
  }

  // Fichiers de l’application : copie locale immédiate, mise à jour en arrière-plan.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  // Bibliothèques et polices : copie locale si elle existe, sinon réseau puis mise en cache.
  if (EXTERNAL_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }
      catch (e) { return Response.error(); }
    })());
  }
});
