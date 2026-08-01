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
| `happyHourData.ts` | 2026-08-01 | Browser + sabotage test | **FIXED** — `{}` row killed the whole tab; validator added |
| `HappyHourView.tsx` | 2026-08-01 | Browser, 4 viewports, light+dark | **FIXED** — one-city dead end; live bars added; CT demoted |
| `placesService.ts` — cost & keys | 2026-08-01 | Source trace + intercepted requests | **5 findings, 3 fixed** — see `HANDOVER.md` audit table |
| Photo loading / `<img>` | 2026-08-01 | Source + computed | **FIXED** — paid images eager, free ones lazy; `no-referrer` disabled key restriction |
| Input focus zoom (iOS) | 2026-08-01 | **Computed** font-size, 390px | **FIXED** — rule was in the wrong cascade layer and never applied. Guard added to `checks.mjs` |
| `recipeUtils.ts` | 2026-08-01 | Source trace of every field | **FINDING, PARTIALLY FIXED** — see below |
| Google attribution (ToS) | 2026-08-01 | Grep — absent everywhere | **FIXED** — "Place data powered by Google" added to footer |
| **`RecipeView.tsx` rendering** | **NEVER INSPECTED** | — | Only the timings block was touched. Never opened in a browser. |
| **`EateryView.tsx`** | **NEVER INSPECTED** | — | 39KB. The §8 first-class surface. Never audited against its own six requirements. |
| **`Sidebar.tsx`** | **NEVER INSPECTED** | — | 24KB. Contains two of the three inputs in the app. |
| **Accessibility** | **NEVER INSPECTED** | — | Beyond hit targets. No contrast audit, focus order, landmarks, screen-reader pass. Real legal exposure. |
| **Saved tab / `useSavedRecipes`** | **NEVER INSPECTED** | — | localStorage. Never tested for quota failure or corrupt data. |
| **The recipe search / TheMealDB path** | **NEVER INSPECTED** | — | Unreachable from this container; needs fixtures. |
| **Privacy / legal / data flow** | **NEVER INSPECTED** | — | No privacy policy, no terms. IP + location go to Google. GDPR/CCPA. |
| **Error handling / observability** | **NEVER INSPECTED** | — | No telemetry of any kind. Console is the only record. |
| **`App.tsx`** | **NEVER INSPECTED AS A WHOLE** | Individual lines only | 80KB, the core of the app: routing, city detection, search, the venue list, the footer. Only ever touched line-by-line for specific bugs. Caught by `ledger-check.mjs` on its first run — it had never been declared. |
| `telemetry.ts` | 2026-08-01 | Browser, sendBeacon spy | **VERIFIED CLIENT-SIDE** — cap, dedupe and scrubbing measured. Server half see below |
| `api/log.ts` | 2026-08-01 | Source only — **outside tsconfig, no gate covers it** | Body parsing hardened for all four runtime shapes. **NEVER EXERCISED IN PRODUCTION** |
| `main.tsx` | 2026-08-01 | Browser boot | Telemetry installs before render; app boots clean |
| `ErrorBoundary.tsx` | 2026-08-01 | Source + reasoning | Raw exception moved behind a disclosure; reports to telemetry. **Not re-opened in a browser after the copy change** |
| `locale.ts` / `cuisineRail.ts` / `cuisineIcon.ts` / `venue.ts` / `types.ts` / `useSavedRecipes.ts` / `venueExtras.ts` / `StatusStates.tsx` | **NEVER INSPECTED** | — | Declared so the gate passes. None has been opened in a browser on its own terms. |
| **Real-device iOS** | Partial, 2026-07-27 | `ci/ios-shots` screenshots | At-rest only. Never interacted with. |

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
