const SHELL_CACHE = "kemi-shell-v2";
const STATIC_CACHE = "kemi-static-v2";
const NAV_CACHE = "kemi-nav-v2";
const MEDIA_CACHE = "kemi-media-v2";
const KEEP_CACHES = new Set([SHELL_CACHE, STATIC_CACHE, MEDIA_CACHE]);
const SHELL = ["/offline.html", "/icons/kemi-icon.svg", "/icons/kemi-maskable.svg"];

/** Test harness: skip network and answer from caches (WebKit cannot use Playwright setOffline). */
let forceOffline = false;

function isSessionNavigation(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/session/");
}

function sessionCacheKey(url) {
  return url.origin + url.pathname + url.search;
}

async function offlineFallback() {
  const shell = await caches.open(SHELL_CACHE);
  const offline = (await shell.match("/offline.html")) || (await caches.match("/offline.html"));
  // Never return undefined / Response.error() — that crashes WebKit navigations.
  return offline || new Response(
    "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Hors ligne | KEMI</title></head><body><main><h1>Hors ligne</h1><p>Ta seance reste enregistree sur cet appareil.</p></main></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function matchSessionDocument(url) {
  const cache = await caches.open(NAV_CACHE);
  const key = sessionCacheKey(url);
  return (await cache.match(key, { ignoreVary: true })) || (await cache.match(key));
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "KEMI_FORCE_OFFLINE") {
    forceOffline = Boolean(event.data.value);
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop navigation documents on every activate so a new deploy cannot keep
      // serving HTML that points at deleted Next.js chunks.
      await caches.delete(NAV_CACHE);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !KEEP_CACHES.has(key)).map((key) => caches.delete(key)));
    })(),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Hashed Next.js assets and icons may be cached safely (cache-first).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = (await cache.match(request, { ignoreVary: true })) || (await cache.match(request));
        if (cached) return cached;
        if (forceOffline) {
          return new Response("", { status: 503, statusText: "offline" });
        }
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  const isMedia = url.hostname === "liftmanual.com" || /\.(?:webp|gif|png|jpe?g|mp4)$/i.test(url.pathname);
  if (isMedia) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = (await cache.match(request, { ignoreVary: true })) || (await cache.match(request));
        if (forceOffline) return cached || new Response("", { status: 503, statusText: "offline" });
        const network = fetch(request).then((response) => {
          if (response.ok || response.type === "opaque") cache.put(request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Navigations: network-first so online always prefers the current deployment.
  // Only previously opened session documents are kept for offline resume.
  // Keys are URL-only because Next.js document responses Vary on RSC headers.
  // offline.html remains the last-resort fallback.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      if (forceOffline) {
        if (isSessionNavigation(url)) {
          const cached = await matchSessionDocument(url);
          if (cached) return cached;
        }
        return offlineFallback();
      }
      try {
        const response = await fetch(request);
        if (response.ok && isSessionNavigation(url)) {
          const cache = await caches.open(NAV_CACHE);
          await cache.put(sessionCacheKey(url), response.clone());
        }
        return response;
      } catch {
        if (isSessionNavigation(url)) {
          const cached = await matchSessionDocument(url);
          if (cached) return cached;
        }
        return offlineFallback();
      }
    })());
  }
});
