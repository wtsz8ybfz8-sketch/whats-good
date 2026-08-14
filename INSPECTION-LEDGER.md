# Inspection ledger

**What this is for.** Every significant defect in this project was found by the USER, and
each time the session reacted with surprise. Surprise is not bad luck — it is what
happens when nobody tracks which surfaces have ever been opened. This file makes
"I have never looked at this" a thing you must read before you can claim otherwise.

**How to use it.** Before reporting on any surface, find its row. If it says
**NEVER INSPECTED**, either inspect it or tell the user those exact words. After
inspecting, update the row with the date, the method, and — critically — what you did
**not** check.

**Rules that make this worth keeping:**
- "Inspected" means a real browser or a real measurement. Reading the source is `grep`,
  not inspection. See `.claude/skills/inspect` Law 1.
- Never delete a finding. Mark it FIXED with the commit.
- Downgrade a row to NEVER INSPECTED if it is substantially rewritten.

---

## Surfaces

| Surface | Last inspected | Method | Verdict |
|---|---|---|---|
| `HappyHourView.tsx` | 2026-08-03 | Chromium regression suite + source/data trace | **INSPECTED** — 59/59 checks; city-neutral live bar search; no fixed-city dataset; promotional limitation is explicit. **NOT checked: real Google response, screen reader, or on-device iOS.**
| `happyHourData.ts` / `venueExtras.ts` | 2026-08-03 | Source audit | **REMOVED** — the Cape Town-only curated dataset and Happy Hour-specific status helpers are no longer part of the app. Any future promotion source must be independently verified and multi-city.
| `placesService.ts` — cost & keys | 2026-08-01 | Source trace + intercepted requests | **5 findings, 3 fixed** — see `HANDOVER.md` audit table |
| Photo loading / `<img>` | 2026-08-01 | Source + computed | **FIXED** — paid images eager, free ones lazy; `no-referrer` disabled key restriction |
| Input focus zoom (iOS) | 2026-08-01 | **Computed** font-size, 390px | **FIXED** — rule was in the wrong cascade layer and never applied. Guard added to `checks.mjs` |
| `recipeUtils.ts` | 2026-08-01 | Source trace of every field | **FINDING, PARTIALLY FIXED** — see below |
| Google attribution (ToS) | 2026-08-01 | Grep — absent everywhere | **FIXED** — "Place data powered by Google" added to footer |
| **`RecipeView.tsx` rendering** | **NEVER INSPECTED** | — | Only the timings block was touched. Never opened in a browser. |
| **`EateryView.tsx`** | 2026-08-03 (partial) | Browser 1440 light+dark + 390, over FIXTURE gradient | **PARTIALLY INSPECTED** — desktop redesign (toolbar off image, contained hero) looked at. **NOT checked: real photograph (only flat gradient), landscape, 1024–1199 band, measured contrast of the new Share/Save toolbar. Still NOT a full §8 six-requirement audit.** |
| **`Sidebar.tsx`** | 2026-08-13 (partial) | Browser 390×844 light+dark, 844×390, 1440×900, with Places fixtures and a resolved city | **PARTIALLY INSPECTED** — prototype-parity pass: hero copy/kicker, search + parse line, period-then-label order, occasion grid, refine dimming. Screenshots read, not just measured. Selected-tile accent state confirmed visible after tap (it never was before — the panel used to collapse on selection). **NOT checked: the Nearby chip row (built but not rendered — no real neighbourhood source, see HANDOVER), the parse rules against real user phrasing, screen-reader pass, FilterSheet (now unrendered), iOS Safari anything.** |
| **Accessibility** | **NEVER INSPECTED** | — | Beyond hit targets. No contrast audit, focus order, landmarks, screen-reader pass. Real legal exposure. |
| **Saved tab / `useSavedRecipes`** | **NEVER INSPECTED** | — | localStorage. Never tested for quota failure or corrupt data. |
| **The recipe search / TheMealDB path** | **NEVER INSPECTED** | — | Unreachable from this container; needs fixtures. |
| **Privacy / legal / data flow** | **NEVER INSPECTED** | — | No privacy policy, no terms. IP + location go to Google. GDPR/CCPA. |
| **Error handling / observability** | **NEVER INSPECTED** | — | No telemetry of any kind. Console is the only record. |
| **`App.tsx`** | **NEVER INSPECTED AS A WHOLE** | Individual lines only | 80KB, the core of the app: routing, city detection, search, the venue list, the footer. Only ever touched line-by-line for specific bugs. 2026-08-03: edited the header (un-crush), removed the `md:` filter-panel force-open (fixed the detail/tab bleed on desktop), and made the mood CTA `md:hidden` (killed the stray desktop button) — all browser-verified at 1440+390, but the file as a whole remains un-audited. **Neither the filter-bleed nor the stray-CTA fix has a regression check in `checks.mjs` — judge CONCERN, must be added.** 2026-08-13: header rebuilt (wordmark, grouped right controls), both navs replaced by one in-flow pill row, the fixed "Find a place" CTA deleted, `--tabbar-h` zeroed. Browser-verified at 390×844 (light+dark), 844×390 and 1440×900. Two defects found by looking and fixed: the new nav rendered at top:20 *underneath* the fixed header, and a 21px results-load reflow retracted the header on the user's first tap. **The file as a whole is still un-audited.** |
| `telemetry.ts` | 2026-08-01 | Browser, sendBeacon spy | **VERIFIED CLIENT-SIDE** — cap, dedupe and scrubbing measured. Server half see below |
| `api/log.ts` | 2026-08-01 | Source only — **outside tsconfig, no gate covers it** | Body parsing hardened for all four runtime shapes. **NEVER EXERCISED IN PRODUCTION** |
| `main.tsx` | 2026-08-01 | Browser boot | Telemetry installs before render; app boots clean |
| `ErrorBoundary.tsx` | 2026-08-01 | Source + reasoning | Raw exception moved behind a disclosure; reports to telemetry. **Not re-opened in a browser after the copy change** |
| `locale.ts` / `cuisineRail.ts` / `cuisineIcon.ts` / `venue.ts` / `types.ts` / `useSavedRecipes.ts` / `StatusStates.tsx` | **NEVER INSPECTED** | — | Declared so the gate passes. None has been opened in a browser on its own terms. |
| `happyHourSources.ts` | **NEVER INSPECTED** | — | Added by an earlier session and never registered, which failed the ledger gate on every push until 2026-08-13. Declared here so the gate passes. Not opened, not traced; its data has not been checked against §8's "never invent a restaurant fact". |
| **Design tokens — palette retune** | 2026-08-13 | Source edit + measured contrast ratios | Cream ground and brown-red accent retired for a true neutral + vermilion (CLAUDE.md §7). Contrast computed for every new tone: all AA. **NOT checked: rendering at any viewport, either scheme, on any device.** |
| **Real-device iOS** | Partial, 2026-07-27 | `ci/ios-shots` screenshots | At-rest only. Never interacted with. |
| **`prototype.ts` — THE ENTIRE DEPLOYED APP** | 2026-08-14 (partial) | Chromium via `checks.mjs` at 393×852, 430×932, 844×390, 1440×900, light + dark; plus a targeted locale render at `en-GB`/`en-US`/`de-DE`/`fr-FR` | **PARTIALLY INSPECTED.** ~830 lines; the whole UI. This file was **undeclared until 2026-08-14, and its absence failed the ledger gate — which is step 2 of the workflow — so the typecheck, the build and the regression suite never ran in CI on any push.** Inspected this session: the four tabs at four viewports in both schemes (no overflow, ≥44pt targets, no field under 16px), and the distance/rating readouts, which were hand-formatted and are fixed. **NOT checked: the freeform parse rules against real phrasing, the venue detail against a real Places response (fixtures only), the occasion grid's time-of-day generation across a full day, screen reader, iOS Safari anything.** |
| `osmFallback.ts` | 2026-08-14 | Source trace only | **NEVER EXERCISED.** Declared 2026-08-14. The Overpass path **cannot be run from this container** — egress is blocked (`EGRESS_BLOCKED` from the fetch tool, `000` from curl to all three mirrors). Its opening-hours parser, its mirror failover and its `openNow` derivation have never produced a value that anyone has looked at. Verify from a real device or from Vercel runtime logs. |
| `api/osm.ts` | **NEVER INSPECTED** | — | Added by the server-side OSM commit (`26eeb03`) and declared here on 2026-08-14. A Vercel function, so it is **outside `tsconfig` and no local gate covers it**, exactly like `api/log.ts`. Never invoked in production, never invoked locally — `vite dev` does not serve `/api`. |
| `auth.ts` | **NEVER INSPECTED** | — | Declared 2026-08-14 so the gate passes. Supabase magic-link sign-in. Never opened, never traced; the failure paths (expired link, wrong email, no publishable key) have never been rendered. |
| `savedStore.ts` | **NEVER INSPECTED** | — | Declared 2026-08-14 so the gate passes. Local + remote saved items and the merge between them. Never tested for quota failure, corrupt data, or a merge conflict between local and remote. |
| ~~`App.tsx`, `main.tsx`, `ErrorBoundary.tsx`, `EateryView.tsx`, `RecipeView.tsx`, `HappyHourView.tsx`, `Sidebar.tsx`, `StatusStates.tsx`, `useSavedRecipes.ts`~~ | — | — | **DELETED at `206fe11`** ("Transplant the prototype: it is now the app"). Their rows above are kept as history, not as live coverage. Do not read them as statements about the current app — see CLAUDE.md §0. |

---

## Open findings

### 1. Recipe timings were invented — REVERTED, still OPEN
`prepTime` / `cookTime` were fabricated from a step-count heuristic and rendered as the
three largest numbers on the recipe. With an effort filter set they were derived **from
the filter** — pick "low effort" and a bourguignon became 10 min prep. `serves: '2 Plates'`
was hardcoded and was the baseline the ingredient scaler divided by, so "x1.5" meant 1.5x
an invented serving of 2.

A fix was written, accidentally shipped in `7f470b5` unverified, and **reverted in the
telemetry commit** — because `checks.mjs` went 57/58: the locale check proves decimal
separators via the scale chip, and with a baseline of 1 the chip reads "x2" with no
decimal in it. `main` was RED and nobody had noticed.

**The finding stands; the fix does not.** Doing it properly means deciding what the
scaler's honest baseline is without breaking the locale check — likely by pointing that
check at an ingredient quantity instead of the multiplier. Needs a browser and a clear
head, not a budget ceiling.

### 2. The API key is public — OPEN, highest severity
In the bundle and in every photo URL. Only real fix is a serverless proxy. Note
`vercel.json`'s rewrite currently swallows `/api/*` and must exclude it first.

### 3. No privacy policy or terms — OPEN, legal
The app sends IP and location to Google and stores data in localStorage. Fonts were
self-hosted specifically for GDPR reasons, then no policy was ever written.

### 4. Red CI does not block deploys — OPEN, process
Proven twice on 2026-08-01: CI went red and Vercel deployed anyway, because
`npm run build` is `vite build` and never typechecks. Needs a required status check.

---

## Things claimed impossible, and whether that was true

| Claim | Status |
|---|---|
| "I can't see the app, send a screenshot" | **FALSE.** Chromium is pre-installed; a true 390px viewport takes ~90s. Weeks of asking the user for photos of their own phone. |
| "Venue surfaces can't be tested here" | **FALSE.** The dev server needed a key, not a different container. |
| "The deployment is unreachable / protected" | **FALSE.** The proxy 403s every URL; that says nothing about the deployment. |
| "I cannot set a Google Cloud quota" | **TRUE, and verified** — `which gcloud`, `~/.config/gcloud`, env all empty on 2026-08-01. This is what a verified impossibility looks like. |
