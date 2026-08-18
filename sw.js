const CACHE_NAME = "pokajni-kanon-v15";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./izvor.js",
  "./manifest.json",
  "./pokrov-cover.jpg",
  "./manastir lesje 2.jpg",
  "./sveta tri jerarha.jpg",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isAppShell(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }
  const path = url.pathname;
  return (
    path.endsWith("/") ||
    path.endsWith(".html") ||
    path.endsWith(".js") ||
    path.endsWith(".css")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (isAppShell(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
