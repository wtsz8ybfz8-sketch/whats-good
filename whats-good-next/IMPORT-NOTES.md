# Import notes

The complete Lovable project, exported by the user via Lovable's GitHub sync and copied
in from `wtsz8ybfz8-sketch/whats-good-624c8eea` at commit `117f656`.

**102 of its 103 files are here.** The one omission is `.env`, deliberately.

## The `.env` finding

`.env` is **tracked** in the exported repo and its `.gitignore` has no entry for it. It
holds `SUPABASE_PROJECT_ID`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (plus the
`VITE_`-prefixed copies).

The publishable/anon key is designed to be public — it ships inside the browser bundle of
every Supabase app, and Row Level Security, not secrecy, is what protects the data. So
nothing is currently exposed that wasn't already. But a tracked `.env` becomes a real leak
the moment a service-role key or a Places key is added to it. Worth adding `.env` to that
repo's `.gitignore`.

To run this app you will need to recreate `.env` locally from the export.

## Build — verified, with one required setting

`npm install` and `npm run build` both succeed here. Exit 0.

**`NITRO_PRESET=vercel` is required.** `@lovable.dev/vite-tanstack-config` wires nitro with
**Cloudflare** as its default target, so a plain `npm run build` produces a Cloudflare
Worker that Vercel cannot serve. With the preset set, the build emits
`.vercel/output/` — Vercel's Build Output API v3 — and deploys normally.

So any Vercel project built from this directory needs `NITRO_PRESET=vercel` in its
environment variables. Without it the build "succeeds" and the deployment does not work,
which is the worst kind of failure to debug.

Still unverified: the app has not been *run* — no page has been loaded from this build,
here or anywhere. Building is not serving.

## Relationship to the app at the repo root

This directory is self-contained and independent — its own `package.json`, `tsconfig.json`
and `vite.config.ts`. Nothing at the repo root imports it, and none of the root gates see
it: root `tsconfig.json` includes only `src` and `vite.config.ts`, `verify/ledger-check.mjs`
walks `src/`, and every ratchet in `.github/workflows/ci.yml` greps `src/`.

Where it ends up — promoted to the repo root, or kept alongside — is still an open
decision, deliberately.
