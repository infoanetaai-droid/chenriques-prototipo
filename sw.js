const CACHE_NAME = 'chenriques-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => { /* alguns ficheiros podem não existir ainda — não bloqueia a instalação */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Cache-first para o essencial da app; para tudo o resto (incluindo os modelos do
// Whisper/MediaPipe vindos de CDN), tenta a rede primeiro e guarda uma cópia para
// a próxima vez que não houver internet.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;

  const url = event.request.url;
  const isAppShell = APP_SHELL.some((path) => url.endsWith(path.replace('./', '/')) || url.endsWith(path));

  if(isAppShell){
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copy).catch(() => {});
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
