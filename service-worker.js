self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('dance-memory-coach').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './styles.css',
        './script.js',
        './manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  // No interceptar archivos locales ni blobs
  if (e.request.url.startsWith('file:') || e.request.url.startsWith('blob:')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
