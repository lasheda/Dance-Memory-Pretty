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
  const url = new URL(e.request.url);

  // Solo interceptar peticiones http(s) dentro del mismo origen
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
