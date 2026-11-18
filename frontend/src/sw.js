/* FR-20, FR-21. Service worker for the storefront.
   Built in injectManifest mode, so vite-plugin-pwa replaces self.__WB_MANIFEST with
   every hashed asset and the self-hosted fonts (designtokens D10).

   Caching policy (blueprint 6.1):
   - Shell and static assets: cache first, so a repeat visit works offline.
   - Catalog, announcements and content: stale-while-revalidate.
   - Orders and /me: network first with the last response as fallback.
   - Auth, payments, chat, push and health: never cached, always network only. */

const VERSION = "v7";
const SHELL_CACHE = `agrimart-shell-${VERSION}`;
const DATA_CACHE = `agrimart-data-${VERSION}`;
const TILE_CACHE = "agrimart-tiles-v1";
const MEDIA_CACHE = "agrimart-media-v1";
const KEEP = [SHELL_CACHE, DATA_CACHE, TILE_CACHE, MEDIA_CACHE];

/* Leaflet reads OpenStreetMap raster tiles. Caching what the customer actually
   looked at keeps the store map useful on a weak connection without bulk-downloading
   tiles (OSM's tile policy). Product photos use the media cache the same way. */
const TILE_HOST = /(^|\.)tile\.openstreetmap\.org$/i;
const TILE_LIMIT = 300;
const MEDIA_LIMIT = 120;

const PRECACHE = (self.__WB_MANIFEST || []).map((entry) =>
  typeof entry === "string" ? entry : entry.url,
);

const NEVER_CACHE = [
  /^\/api\/auth\b/,
  /^\/api\/payments?\b/,
  /^\/api\/paymongo\b/,
  /^\/api\/chat\b/,
  /^\/api\/push\b/,
  /^\/api\/health\b/,
];

const NETWORK_FIRST = [/^\/api\/orders(\/|$)/, /^\/api\/me(\/|$)/];

const STALE_REVALIDATE = [
  /^\/api\/products(\/|$)/,
  /^\/api\/categories$/,
  /^\/api\/brands$/,
  /^\/api\/announcements(\/|$)/,
  /^\/api\/content$/,
  /^\/api\/store-location$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // One failed URL must not abort the whole install.
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("agrimart-") && !KEEP.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/* Cached orders and /me belong to the signed-in customer, so logging out drops them. */
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE") {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

/* Static hosts commonly answer with `Vary: Origin`, but module scripts (which are
   CORS requests) carry an Origin header while the install-time precache requests did
   not. Matching strictly would miss every cached chunk and fail offline, so the
   cache ignores Vary: URLs are either content-hashed or intentionally shared. */
async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/* A tile or a product photo is immutable enough for cache-first. Opaque responses
   (status 0) are valid for <img> and Leaflet, so they are stored too. */
async function assetFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (!response.ok && response.type !== "opaque") return response;

  await cache.put(request, response.clone());

  const keys = await cache.keys();
  if (keys.length > limit) {
    await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
  }

  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });

  const update = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    update.catch(() => undefined);
    return cached;
  }

  return update;
}

function offlineResponse() {
  return new Response(JSON.stringify({ error: "You are offline. Reconnect to load this." }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/* A reachable browser with an unreachable API is a server problem, not an offline
   one: only claim offline when the browser itself reports no connection. */
function networkFailure(error) {
  if (self.navigator.onLine === false) return offlineResponse();
  throw error;
}

async function handleApi(request, pathname) {
  if (NEVER_CACHE.some((pattern) => pattern.test(pathname))) return fetch(request);

  if (NETWORK_FIRST.some((pattern) => pattern.test(pathname))) {
    try {
      return await networkFirst(request);
    } catch (error) {
      return networkFailure(error);
    }
  }

  if (STALE_REVALIDATE.some((pattern) => pattern.test(pathname))) {
    try {
      return await staleWhileRevalidate(request);
    } catch (error) {
      return networkFailure(error);
    }
  }

  return fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApi(request, url.pathname));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.status < 500) return response;

          /* A proxy or host answering 5xx is just as unusable as an offline network.
             Keep the installed shell usable and let the page show its own errors. */
          const cache = await caches.open(SHELL_CACHE);
          const fallback =
            (await cache.match("/index.html", { ignoreVary: true })) ??
            (await cache.match("/", { ignoreVary: true }));
          return fallback ?? response;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match("/index.html", { ignoreVary: true })) ??
            (await cache.match("/", { ignoreVary: true })) ??
            offlineResponse()
          );
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    if (TILE_HOST.test(url.hostname)) {
      event.respondWith(assetFirst(request, TILE_CACHE, TILE_LIMIT));
      return;
    }

    if (request.destination === "image") {
      event.respondWith(assetFirst(request, MEDIA_CACHE, MEDIA_LIMIT));
    }
    return;
  }

  event.respondWith(cacheFirst(request));
});

/* FR-21. Order status and announcement pushes (blueprint 6.3). */
self.addEventListener("push", (event) => {
  let payload;

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "AgriMart";

  event.waitUntil(
    (async () => {
      /* A serverless API cannot know whether the thread is on screen, so chat pushes
         are decided here: with a visible AgriMart window the live channel already
         updates the thread and the unread badge, and a system notification on top of
         that is just noise. Order, stock and announcement pushes still show. */
      if (String(payload.tag || "").startsWith("chat-")) {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (windows.some((client) => client.visibilityState === "visible")) return;
      }

      await self.registration.showNotification(title, {
        body: payload.body ?? "You have an update from the store.",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: payload.tag || undefined,
        data: { url: payload.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url === target);
      if (open) return open.focus();
      return self.clients.openWindow(target);
    })(),
  );
});
