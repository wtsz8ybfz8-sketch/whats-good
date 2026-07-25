/**
 * Companion to the self-destructing `public/sw.js`. See that file for the full story.
 *
 * The stale `index.html` still cached on people's phones contains a
 * `<script src="/registerSW.js">` tag left over from vite-plugin-pwa. If this path 404s,
 * that cached page simply never asks for a worker, and eviction has to wait for the
 * browser's own background update check. Shipping a real file here makes the kill switch
 * fire on the very next page load instead.
 *
 * Current builds do NOT reference this file — nothing in index.html points at it any
 * more. It exists purely to be found by old cached pages. It can be deleted once we're
 * confident no stale clients remain in the wild.
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function () {
    // Registration failing is fine — it means there's nothing to evict.
  });
}
