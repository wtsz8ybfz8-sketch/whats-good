import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// NO SERVICE WORKER. vite-plugin-pwa used to live here with registerType:'autoUpdate',
// which precached index.html + the hashed JS bundle. The effect on production was that
// anyone who had ever loaded the site kept being served the OLD build from Cache Storage
// — deploys went out fine and the live URL still showed the previous version, forever.
// For a app whose whole value is "what's open near me RIGHT NOW", offline precaching buys
// nothing and cost us every shipped change. Do not reintroduce it without a kill switch.
// `public/registerSW.js` exists so stale cached pages can still fetch the
// self-destructing `public/sw.js` and unregister old workers. There is no
// `src/main.tsx` in this repo and there has not been one for some time.
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
