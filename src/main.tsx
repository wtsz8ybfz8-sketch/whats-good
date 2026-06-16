import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {APIProvider} from '@vis.gl/react-google-maps';

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

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <App />
    </APIProvider>
  </StrictMode>,
);
