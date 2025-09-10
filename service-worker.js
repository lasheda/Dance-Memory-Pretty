self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('dance-memory-coach').then((cache) => {
      return cache.addAll([
        '/Dance-Memory-Pretty/',
        '/Dance-Memory-Pretty/index.html',
        '/Dance-Memory-Pretty/styles.css',
        '/Dance-Memory-Pretty/script.js',
        '/Dance-Memory-Pretty/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Solo interceptar peticiones http(s) dentro del mismo origen
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
