// EP / 2.1 / 13.1: service worker de la PWA SINAPVE. Cachea el shell de la app
// y ofrece fallback offline. La captura offline de reportes (cifrada) vive en
// IndexedDB del lado del cliente; este SW solo asegura que la app cargue sin red.
const CACHE = "sinapve-shell-v1";
const SHELL = ["/", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // los POST (reportes) los maneja la cola offline

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, luego cache, luego pagina offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline")))
    );
    return;
  }

  // Estáticos: cache primero.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (url.pathname.startsWith("/_next/") || url.pathname === "/manifest.webmanifest")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});

// Permite que la app dispare una sincronización manual tras reconectar.
self.addEventListener("message", (event) => {
  if (event.data === "sinapve-sync") {
    self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage("sinapve-sync-drafts")));
  }
});
