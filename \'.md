# What's Good — Session 3 Handover

> Last updated: 2026-06-16. Working tree is clean. All changes committed and pushed.

---

## 1. LIVE URL

**Check your Vercel dashboard** — the project is connected to auto-deploy from `main` on push, but no `.vercel/project.json` was found in the local repo, so the exact URL is not stored in the codebase.

Go to: https://vercel.com/dashboard → find project `whats-good` → copy the Production URL.

It will look like: `https://whats-good-[hash].vercel.app` or a custom domain if one was assigned.

---

## 2. GITHUB REPO

https://github.com/wtsz8ybfz8-sketch/whats-good

- Branch: `main`
- Auto-deploys to Vercel on every push to `main`
- Build command: `npm run build` → `vite build`
- Output directory: `dist/`

---

## 3. WHAT WAS COMPLETED (ALL SESSIONS)

### Session 3 — This session (commit `f98382b` + `9a5bf11`)

| File | What changed |
|---|---|
| `src/App.tsx` | Removed early `if (selectedRecipe) { return }` block that was rendering a layout without the header. Header now always visible on every view. Added `EateryView` import. Main content area now routes `selectedRecipe.id.startsWith('eat-')` to `<EateryView>` and everything else to `<RecipeView>`. |
| `src/components/EateryView.tsx` | **New file.** Purpose-built restaurant detail page. Shows: name, cuisine badge, rating, price tier, full-width hero image, Get Directions link (`maps.google.com/?q={address}`), phone as `tel:` link, estimated wait time, signature dish (name + description), featured deal offer with activation button, wellness note, Back to results + Find other eateries footer buttons. Zero recipe concepts (no ingredients list, no prep time, no cook time, no steps). |
| `src/components/RecipeView.tsx` | Changed eatery card image badge from `Partner Deal` → `Featured`. |
| `src/campusData.ts` | Replaced all 24 `digestiveNote` fields. Old values were pseudoscientific ("stimulates peptide digestive hormones", "gastro motility", "cellular lining rest"). New values are honest 1–2 sentences about the cuisine type or key ingredients, each ending with `⚕️ General wellness info — not medical advice.` |
| `src/components/Sidebar.tsx` | Updated with Places API integration hooks (committed in `9a5bf11`). |
| `src/placesService.ts` | **New file** (committed in `9a5bf11`). Google Places API (New) client — fetches live photos, ratings, and contact info for each eatery. Falls back silently to hardcoded `campusData.ts` data on any API failure. |
| `vite.config.ts` | PWA plugin (`vite-plugin-pwa`) already added — `VitePWA` configured with manifest: name, theme colour `#7C2D12`, standalone display, icons at `/icon-192.png` and `/icon-512.png`. |
| `index.html` | Minor updates (committed in `9a5bf11`). |
| `package.json` / `package-lock.json` | Dependency updates (committed in `9a5bf11`). |

---

### Session 2 — Major eateries + GPS + dark mode (commit `b1006f9`, restructured in `7f63404`)

| File | What changed |
|---|---|
| `src/App.tsx` | Added South African eateries mode (`locationMode: 'dineout'`), Haversine GPS distance sorting, dual Save tabs (Recipes / Eateries), dark mode toggle, `EATERY_IMAGES` map of Unsplash URLs, `handleFindCorrespondingRestaurants` to pivot from a recipe to matching Cape Town restaurants. |
| `src/campusData.ts` | **New file.** 24 hardcoded Cape Town eateries with full data: address, cuisine, vibe match, GPS coordinates, rating, price symbol, voucher offer, signature order/description/ingredients, digestive note, phone, estimated wait, external link. |
| `src/components/RecipeView.tsx` | Added eatery card grid and eatery detail view (inline within RecipeView at the time — later separated into EateryView in Session 3). Added `Partner Deal` badge, star rating overlay, price symbol, distance tag, voucher strip, GPS/phone/website action bar. |
| `src/components/Sidebar.tsx` | Added `locationMode` toggle (Dine Out / Gourmet), price tier filter, vibe pills updated to match eatery vibes, search integrated for both modes. |
| `src/index.css` | Dark mode CSS variables, `no-scrollbar` utility, `animate-ios-slide-in` keyframes. |

---

### Session 1 — Core product build (commits `df15a94`, `573660b`, `489d33a`)

| File | What changed |
|---|---|
| `src/App.tsx` | Built from scratch over the AI Studio scaffold: tab state machine (Find / Surprise Me / Saved), fetch orchestration via TheMealDB, Sidebar–RecipeView data flow, Surprise Me random fetch, health profile integration hook. |
| `src/recipeUtils.ts` | All TheMealDB fetch logic: `filter.php` by area/category, `lookup.php` for full data, `parseMealToRecipe` mapper, `mapCoordinatesToQueries` vibe→category/area lookup table. |
| `src/types.ts` | `ParsedRecipe`, `Meal`, `Dimensions`, `ActiveTab`, `LocationMode` interfaces. |
| `src/useSavedRecipes.ts` | localStorage hook for bookmark persistence. |
| `src/components/HealthProfile.tsx` | First-load health profile gate: 12 conditions + 4 dietary preferences. Stores to `whats-good-health-profile` in localStorage. `useHealthProfile` hook exported. |
| `src/components/RecipeView.tsx` | Recipe card grid + detail view: ingredient checklist (tap to cross off), scaled portion counts, numbered steps, prep/cook/serves stats, wellness tip block, YouTube + source links, back navigation. |
| `src/components/Sidebar.tsx` | Vibe pills, cuisine dropdown (25 TheMealDB areas), effort toggle, debounced text search, submit button. |
| `src/components/StatusStates.tsx` | `LoadingState`, `ErrorState`, `EmptyState` components. |
| `HANDOVER.md` | Session 1 handover doc (now superseded by this file). |

---

## 4. WHAT STILL NEEDS DOING (Priority Order)

### P0 — In progress / partially built

1. **Google Places API live data** (`src/placesService.ts` exists, needs wiring into `App.tsx`)
   - `placesService.ts` is built and committed but not yet called from `App.tsx`
   - When connected, it should enrich eatery cards with live photos, current ratings, and verified phone numbers
   - `VITE_GOOGLE_PLACES_KEY` is already in `.env.local` and needs to be added to Vercel env vars for production
   - The service already has a graceful fallback to hardcoded data on failure

2. **PWA icons missing** (vite.config.ts references `/icon-192.png` and `/icon-512.png` but they don't exist in `public/`)
   - The PWA manifest will fail validation until these are created
   - Add two PNG files to the `public/` folder: 192×192 and 512×512, with the app logo/icon

### P1 — Planned (from original Cowork session brief)

3. **Apple HIG visual overhaul** (Session 2 from Cowork prompt)
   - Apply iOS-style design tokens: SF Pro-style typography scale, tighter spacing, bottom sheet patterns for filter panel on mobile, spring animations on card interactions
   - Replace Tailwind arbitrary values with a consistent spacing/radius scale in `index.css`

4. **PWA install confirmation + offline shell** (Session 4 from Cowork prompt)
   - `vite-plugin-pwa` is already configured — verify the service worker registers correctly in production
   - Add an in-app "Add to Home Screen" prompt (the browser prompt fires automatically but a custom nudge improves conversion)
   - Test offline: the app should show cached eateries when offline rather than a blank screen

5. **Health profile has no effect on results**
   - `useHealthProfile` hook stores and reads the profile, but nothing in `handleTriggerMatch` or `parseMealToRecipe` reads it
   - Minimum viable: re-rank results for the user's dietary preference (e.g. push vegetarian options up for "vegetarian" users)
   - Better: show a small warning flag on eateries/recipes that conflict with their condition

### P2 — Cleanup

6. **`package.json` still named `react-example`** — rename to `whats-good`
7. **Unused AI Studio dependencies**: `@google/genai`, `express`, `dotenv` are in `package.json` but never imported — run `npm uninstall @google/genai express dotenv @types/express` to slim the bundle
8. **`dist/` is committed to git** — add `dist/` to `.gitignore`; Vercel builds from source
9. **No app-level React error boundary** — an uncaught render error blanks the whole page with no recovery UI

### Build status

- `tsc --noEmit` — **0 errors, 0 warnings** (verified this session)
- `vite build` — **clean build**, 1679 modules, 326 kB JS (92 kB gzip), 57 kB CSS (10 kB gzip)

---

## 5. HOW TO RESUME

```bash
# Open terminal in the project directory
cd "/Users/lunikaphillip/Documents/whats-good claude project"

# Pull latest (in case anything was pushed from another machine)
git pull

# Start Claude Code
claude

# Or if you prefer VS Code + Claude Code extension:
code .
```

When Claude opens, say:
> "Read HANDOVER_SESSION3.md and then continue from where we left off."

The first thing to tackle next session is wiring `placesService.ts` into `App.tsx` so live Google Places data flows through.

---

## 6. ENVIRONMENT VARIABLES

| Variable | Location | Purpose |
|---|---|---|
| `VITE_GOOGLE_PLACES_KEY` | `.env.local` (local only, not committed) | Google Places API (New) — fetches live photos, ratings, contact info for Cape Town eateries |
| `GEMINI_API_KEY` | `.env.example` only (template placeholder, not used in app) | Left over from Google AI Studio scaffold — not connected to any code |
| `APP_URL` | `.env.example` only (template placeholder, not used in app) | Left over from Google AI Studio scaffold — not connected to any code |

**Important for production deployment:**
- `VITE_GOOGLE_PLACES_KEY` must be added to Vercel → Project Settings → Environment Variables for the live site to use real Places data
- Without it, `placesService.ts` will silently fall back to `campusData.ts` hardcoded values
- Never commit `.env.local` — it is in `.gitignore`
- The Google Places API key visible in `.env.local` is restricted to this project's domain — if the app goes public, restrict it further in Google Cloud Console to the Vercel production URL

---

## 7. DATA SOURCES

### TheMealDB (https://www.themealdb.com/api.php)
- Free public API, no key required
- Used for the **Gourmet / recipe mode** (when `locationMode === 'gourmet'`)
- Endpoints used:
  - `search.php?s=term` — text search by meal name
  - `filter.php?a=area` / `filter.php?c=category` — browse by cuisine area or category
  - `lookup.php?i=id` — full recipe detail including ingredients and steps
  - `random.php` — random single meal (Surprise Me tab)
- Limitations: ~300 meals, Western-biased, no dietary filtering, no ingredient search on free tier

### Google Places API (New)
- Key stored in `VITE_GOOGLE_PLACES_KEY` (`.env.local` locally, Vercel env var in production)
- Used to enrich eatery cards with live data: current ratings, real photos, phone numbers
- Service file: `src/placesService.ts`
- **Not yet wired into the app** — `placesService.ts` exists but `App.tsx` has not been updated to call it
- Falls back silently to hardcoded data on any error or missing key

### campusData.ts (hardcoded)
- File: `src/campusData.ts`
- 24 hand-curated Cape Town eateries with full static data
- This is the **primary data source** for `locationMode === 'dineout'` right now
- Each entry includes: name, address, GPS coordinates (latitude/longitude), cuisine type, vibe match string, price symbol (R/RR/RRR/RRRR), signature order + description, voucher/deal offer, phone, estimated wait, external website link, and a digestive wellness note
- Google Places data will augment (not replace) this list when wired in

---

## 8. PRODUCT VISION NOTES

### Core concept
**What's Good** is a mood-first food discovery app for Cape Town. The user does not type what they want to eat — they pick a vibe ("feeling fancy", "tired & cosy", "craving something bold & spicy") and the app surfaces matching restaurants or home recipes. The mood acts as the primary search dimension, with cuisine type and effort/price as secondary filters.

### Two parallel modes
1. **Dine Out** — Cape Town restaurants from `campusData.ts` (to be enriched by Google Places). Shows real distance if GPS is granted, sorts by proximity, surfaces a featured deal/voucher for each venue.
2. **Gourmet / Cook at Home** — Recipes sourced live from TheMealDB. Full ingredient checklist, portion scaling, step-by-step instructions, grocery delivery shortcuts (Checkers Sixty60, Woolies Dash, PnP asap!).

### Health personalisation
The health profile (`HealthProfile.tsx`) lets users declare a condition (e.g. diabetes, IBS, lactose intolerant) and a dietary preference (e.g. vegetarian, halal). Currently this data is stored but **not used to filter or re-rank results** — this is the biggest gap between the UI promise and actual behaviour.

### Geographic focus
Cape Town only, for now. The eatery list is hand-curated for quality. The intent is depth-over-breadth: fewer restaurants with richer data (deals, signature dishes, GPS routing) rather than a thin directory of hundreds. Expansion to other SA cities (Joburg, Durban) is a future concern.

### Planned monetisation
- **Delivery affiliate links** — the grocery delivery buttons (Sixty60, Woolies Dash, PnP asap!) on recipe detail pages are candidates for affiliate commission when users click through and order
- **Restaurant partner deals** — the voucher/deal shown on each eatery card is positioned as a partner integration; restaurants could pay for featured placement or exclusive deals
- **"Featured" badge** — already in the UI (renamed from "Partner Deal" in Session 3); reserved for paid/highlighted listings

### Design language
Dark serif headings, warm off-white backgrounds (`#FAF9F6`), deep red accent (`#7C2D12`), black borders, gold/amber for ratings. Full dark mode. The aesthetic is editorial / premium food magazine rather than a utility directory. Currently Tailwind + Lucide icons. The Apple HIG overhaul (Session 2 from Cowork brief) will push this further toward a native iOS feel on mobile.
