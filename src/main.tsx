import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Defensive patch to prevent third-party scripts from crashing when trying to assign to window.fetch
if (typeof window !== 'undefined') {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (descriptor && !descriptor.set && descriptor.configurable) {
      let currentFetch = descriptor.value || descriptor.get?.();
      Object.defineProperty(window, 'fetch', {
        get() { return currentFetch; },
        set(val) { currentFetch = val; },
        configurable: true,
        enumerable: descriptor.enumerable
      });
    }
  } catch (e) {
    // Ignore defensive patch errors
  }
}

// Evict the old service worker. Builds before this one shipped a precaching worker that
// kept serving a stale index.html from Cache Storage, so deploys were invisible on the
// live URL. Removing the plugin only stops NEW installs — devices that already have the
// worker keep it until something unregisters it. This does, once, then hard-reloads so
// the user lands on the real current build instead of the cached ghost.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (regs) => {
    if (!regs.length) return;
    await Promise.all(regs.map((r) => r.unregister()));
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    window.location.reload();
  }).catch(() => {});
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    
      <App />
    
  </StrictMode>,
);
