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

## What has NOT been verified

`npm install` has not been run and this app has not been built or started. The file tree
is complete; that it compiles is unconfirmed.

## Relationship to the app at the repo root

This directory is self-contained and independent — its own `package.json`, `tsconfig.json`
and `vite.config.ts`. Nothing at the repo root imports it, and none of the root gates see
it: root `tsconfig.json` includes only `src` and `vite.config.ts`, `verify/ledger-check.mjs`
walks `src/`, and every ratchet in `.github/workflows/ci.yml` greps `src/`.

Where it ends up — promoted to the repo root, or kept alongside — is still an open
decision, deliberately.
