/* Check-in desk offline shell cache.
 * Keeps the already-opened day page usable when Wi-Fi drops.
 * Does not cache authenticated API/RSC payloads aggressively.
 */
const CACHE = "bizcon-checkin-shell-v1";
const SHELL_PATHS = ["/", "/site.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_PATHS)).then(() => {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only navigate/document requests for event-day paths — network first, cache fallback
  const isDayNav =
    req.mode === "navigate" &&
    /\/events\/[^/]+\/day(\/|$)/.test(url.pathname);

  if (!isDayNav) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        void caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(
          "<!doctype html><title>Offline</title><body style='font-family:system-ui;padding:2rem'><h1>You are offline</h1><p>Keep this check-in tab open. If you refreshed, reconnect and reopen Event Day to restore the desk.</p></body>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }),
  );
});
