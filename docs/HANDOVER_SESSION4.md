# What's Good — Session 4 Handover

**Date:** 2026-06-28
**Live URL:** https://whats-good-nu.vercel.app
**Repo:** https://github.com/wtsz8ybfz8-sketch/whats-good (branch `main`)
**Stack:** Vite 6 + React + TypeScript + Tailwind v4 + vite-plugin-pwa. Deploys on Vercel from `main`.

---

## What this session did

Worked through a 5-task brief to fix the restaurant (eatery) experience and apply Apple-style polish.

| # | Task | Status |
|---|------|--------|
| 1 | Rewrite restaurant **list cards** → minimal (name, cuisine tag, rating, price tier, distance). No food photos, no signature dish/plate copy. | ✅ Done |
| 2 | Restaurant **detail page** → remove Signature Dish panel; keep deal + wellness note. Route `eat-*` IDs to `EateryView`. | ✅ Done |
| 3 | **Google Places API** wiring (`fetchCapeTownEateries`, `getPlacePhotoUrl`, fallback to hardcoded list). | ✅ Already implemented in prior session; verified wired in `App.tsx`. |
| 4 | **Delivery partner buttons** (Checkers Sixty60 / Woolworths Dash / PnP asap!) at bottom of restaurant detail, above back button. Not shown for recipes. | ✅ Done |
| 5 | **Apple visual polish** (glass header, soft shadows, rounded-2xl/3xl, dark mode). | 🟡 Largely already in place from prior session; light-touch only. |

---

## Files changed this session (UNCOMMITTED — see ⚠️ below)

- **`src/components/RecipeView.tsx`**
  - Rewrote the eatery list card (the `if (isRestaurant && rawEatery)` branch inside the results grid) to a minimal text card: cuisine tag → name → `rating · priceSymbol · distance`. Removed image banner, "Featured" badge, "Plate:" line, voucher strip, wait-time row.
  - Removed the now-**dead restaurant detail block** (the first `if (selectedRecipe)` block that only handled `eat-` IDs) — that path is now owned entirely by `EateryView`.
  - Cleaned unused icon imports (removed `Users, Phone, Navigation, Sparkles, AlertCircle`).
  - Updated results subheading copy (no longer promises "chef-recommended signature plates").
- **`src/components/EateryView.tsx`**
  - Removed the full-bleed "Signature Dish" dark panel.
  - Added a **Delivery Partners** section (3 links) just above the footer/back button.
  - Added `ShoppingBag` to imports.

Already committed earlier in session: `1fd0864` (EateryView editorial teardown).

---

## ⚠️ Current status / open issue

- **TypeScript is clean:** `npx tsc --noEmit` passes with **zero errors**. The code changes are valid.
- **`npm run build` (vite) could NOT be verified in this environment** — every `vite build` invocation was killed with SIGTERM (exit 144 / no output), which is an environment/sandbox resource issue, not a code error. The original build at session start worked, and tsc passing is strong evidence the bundle will build.
- **Changes are NOT yet committed or pushed.** Vercel has NOT redeployed. The live site still reflects commit `1fd0864`.

### To finish (next session, in a normal terminal)
```bash
cd "/Users/lunikaphillip/Documents/whats-good claude project"
npm run build            # confirm it completes locally (env here was killing it)
git add src/components/RecipeView.tsx src/components/EateryView.tsx
git commit -m "Restaurant list/detail redesign + delivery partner buttons"
git push                 # triggers Vercel redeploy (~60s)
```
Then verify on https://whats-good-nu.vercel.app:
- List cards are clean (no photos/recipe language).
- Tapping a restaurant → detail with address, phone (`tel:`), directions, deal, wellness note.
- Delivery buttons appear on restaurant detail, NOT on recipes.
- Real Cape Town restaurants load from Google Places (key `VITE_GOOGLE_PLACES_KEY` in `.env.local`; must also be set in Vercel env for prod).

---

## Architecture quick-reference

- **`src/App.tsx`** — root. Holds all state (tabs, dimensions/filters, saved list, geolocation, dark mode). `handleTriggerMatch()` does the search: in `dineout` mode it calls `fetchCapeTownEateries()` (Places) and falls back to `SOUTH_AFRICAN_EATERIES`; in `gourmet` mode it hits TheMealDB. Routing: `selectedRecipe.id.startsWith('eat-')` → `EateryView`, else → `RecipeView`.
- **`src/components/RecipeView.tsx`** — recipe detail + the results grid (both recipe cards and the minimal eatery cards).
- **`src/components/EateryView.tsx`** — restaurant detail page (hero, contact, deal, wellness, delivery partners).
- **`src/components/Sidebar.tsx`** — filter UI (vibe / region / price / mode).
- **`src/placesService.ts`** — Google Places (New) Text Search; maps to `SouthAfricanEatery`; silent fallback.
- **`src/campusData.ts`** — `SouthAfricanEatery` interface + hardcoded fallback list.
- **`src/types.ts`** — `ParsedRecipe`, `Dimensions`, `ActiveTab`, `LocationMode`.

**Note:** eateries are shoehorned into the `ParsedRecipe` shape with a `rawEatery` field carried on the object. This is the main piece of tech debt — see ideas doc.

---

## Known rough edges / tech debt
- Eateries reuse the `ParsedRecipe` type (`rawEatery as any`). A dedicated eatery type/flow would be cleaner.
- `VITE_GOOGLE_PLACES_KEY` is a client-side key — it ships in the bundle. Fine for a hackathon/MVP; lock it down (HTTP referrer restrictions) or proxy it server-side before real launch.
- Delivery partner links are search-URL deep links only (no basket integration yet) — by design for v1.
- Distance only shows when the user grants geolocation; otherwise falls back to a generic label.
