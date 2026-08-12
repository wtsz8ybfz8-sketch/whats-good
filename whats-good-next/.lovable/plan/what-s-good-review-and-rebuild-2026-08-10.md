# What's Good — review and rebuild

Rebuild the app in this project on TanStack Start, carrying over the product idea and the good parts of the existing design, while fixing the structural problems in the current repo.

## What the current version gets right

- Clear, opinionated product: mood + location food discovery, not a map directory.
- Three genuine modes (eat out, cook, happy hour) with a saved-recipes memory.
- Careful details already solved: in-flight request dedup, locale-aware opening hours, self-hosted fonts, PWA manifest and icons, an error boundary.

## Ranked problems, and what the rebuild does about them

### 1. Security and cost (highest)

| Problem | Fix in the rebuild |
|---|---|
| The Google Places key ships in the browser bundle (`VITE_GOOGLE_PLACES_KEY`). Anyone can read it from devtools and spend your billing quota. Referrer restrictions are trivially spoofed. | Move every Places call to server functions. The key becomes a server-only secret, never sent to the browser. |
| No spend ceiling. Every keystroke-debounced search is a billable Places call, per visitor, with only a short in-memory cache that dies on reload. | Cache search results in the database keyed by query + location bucket + language, with a TTL. Repeat searches across all users are then free. |
| Places responses request more fields than the UI shows; Places bills per field mask. | Trim the field mask to exactly what the cards and detail view render. |
| No abuse ceiling on the search endpoint. | Per-session throttle plus a daily global call budget; past the budget the app degrades to cached results instead of billing. |

### 2. Code health

- `src/App.tsx` is 2,211 lines with 22 `useState` calls holding search, results, tab, city, filters and detail state in one component. Split into route-level state: `/` (find), `/eat`, `/cook`, `/out`, `/saved`, `/venue/$id`, each owning its own data.
- `src/index.css` is 62KB of hand-written CSS with layout rules that select by `> div:first-child` and `:nth-of-type(2)` — the handover file itself flags these as breaking on any reorder. Replace with a semantic token set in `src/styles.css` plus Tailwind utilities; no positional selectors.
- Data fetching is hand-rolled `fetch` + abort signals + a bespoke dedup/cache map. Replace with TanStack Query over server functions: caching, dedup, retries and loading states come for free, and the custom cache layer disappears.
- No tests, and `build` runs no typecheck. Add typecheck to the build path and unit tests for the pure logic (distance, cuisine matching, opening-hours parsing, recipe utils).
- The repo carries a large custom verification harness (`verify/`, 40KB `checks.mjs`) and a 52KB `CLAUDE.md` process document. Not carried over.

### 3. Product and UX

- The Find hero uses `clamp(4rem, 8vw, 8.5rem)` type and leaves roughly 40% of a 1440px screen empty — the handover names this as the live complaint. Rebuild it as a two-column hero: headline and mood picker left, search and refine controls right, with results appearing in place rather than after a mode switch.
- Reduced-motion is only honoured on the venue detail page; the global CSS rule cannot stop JS-driven inline transforms. Put the motion config at the root so it covers everything.
- Saved items live only in `localStorage`, so they vanish across devices and in private browsing. Keep local-first behaviour, and add optional sign-in that syncs saves to an account.
- Only 2 `<img>` tags in the main file and no image sizing discipline; venue photos are the heaviest thing on screen. Serve sized, lazy-loaded photos with proper alt text and aspect-ratio boxes so cards don't shift.
- Add real per-page metadata. The current app is one SPA route, so a shared venue link previews as the generic app.

## Technical approach

- TanStack Start, file-based routes under `src/routes/`, TanStack Query for all reads.
- Lovable Cloud for the database (cached place results, saved items, accounts) and for the Places secret.
- Places and TheMealDB are called from server functions only; the browser talks to our own endpoints.
- Design system as semantic tokens in `src/styles.css` (Schibsted Grotesk kept), Tailwind utilities in components, motion via `motion` with a root reduced-motion config.
- Shared venue and recipe pages get their own routes and their own head metadata.

## Build order

1. Design tokens, layout shell, routes, and the reworked Find hero with mock data.
2. Lovable Cloud: schema for cached places, saved items, and accounts.
3. Server functions for Places and TheMealDB, with the key server-side, field mask trimmed, DB-backed cache and call budget.
4. Eat / Cook / Out views, venue detail, saved sync.
5. Metadata, images, accessibility pass, tests on the pure logic.

## Notes

- You'll need to supply the Google Places key once, as a server secret. Revoke the existing browser key afterwards — it should be treated as already leaked, since it has been in a public bundle.
- This is a rebuild in this project, not a migration of the existing repo. The old repo stays as-is for reference.
