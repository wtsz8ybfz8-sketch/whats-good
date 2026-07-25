/**
 * SELF-DESTRUCTING SERVICE WORKER — a kill switch, not a feature.
 *
 * Do not delete this file, and do not "clean it up" because the app has no service
 * worker. That is exactly why it has to stay.
 *
 * History: the app once shipped vite-plugin-pwa, which installed a precaching worker at
 * this URL. Removing the plugin stopped NEW installs but did nothing about the workers
 * already installed on real devices — those kept serving a cached index.html and a
 * cached bundle, so deploys were invisible on the live site. Phones were worst hit,
 * because a phone browser is rarely hard-refreshed and an iOS home-screen shortcut keeps
 * its worker across app switches.
 *
 * The obvious fix (unregister from app code in main.tsx) cannot work on its own: the old
 * worker serves the OLD bundle, so the new code containing the unregister call is never
 * the code that runs. The eviction has to arrive through the one channel the old worker
 * can't intercept — the browser's own periodic update check of this script.
 *
 * That check has a hard requirement: the response must have a JavaScript MIME type. For
 * one deploy this path returned `text/html` (the SPA catch-all rewrite in vercel.json was
 * swallowing it), the update check failed, and the stale worker survived. `vercel.json`
 * now excludes this path from the rewrite and pins `Content-Type: application/javascript`
 * plus `Cache-Control: no-store`, so every visit re-fetches it.
 *
 * Sequence once a device hits this: byte-diff against the old worker -> install ->
 * skipWaiting -> activate -> delete every Cache Storage entry -> unregister self ->
 * force every open tab to re-navigate. Those tabs then fetch index.html from the network
 * (no worker left to intercept) and land on the current build. Runs once per device;
 * afterwards there is no worker and this file is simply never requested again.
 */

self.addEventListener('install', () => {
  // Don't wait for existing tabs to close — the whole point is to replace a worker that
  // is actively serving stale content right now.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Drop every cache, including the precache the old worker was serving from.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Storage may be denied (private mode, quota). Unregistering still helps.
      }

      // 2. Take control of open tabs so step 3 can reach them.
      try {
        await self.clients.claim();
      } catch {}

      // 3. Remove ourselves. After this there is no worker on the device at all.
      try {
        await self.registration.unregister();
      } catch {}

      // 4. Re-navigate open tabs. They now bypass Cache Storage entirely and fetch the
      //    real index.html, which points at the current hashed bundle.
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        await Promise.all(clients.map((c) => c.navigate(c.url).catch(() => {})));
      } catch {}
    })(),
  );
});

// Belt and braces: until the activate handler finishes, never answer a request from
// cache. A pass-through fetch handler means even the transitional state serves the
// network copy rather than the stale precache.
self.addEventListener('fetch', () => {
  // Intentionally empty — not calling event.respondWith() lets the browser handle the
  // request normally, straight to the network.
});
