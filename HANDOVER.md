# Handover — 2026-07-25

Live: **https://whats-good-nu.vercel.app** · Vercel project `whats-good` (`nizzle-s-projects`)
Repo: `github.com/wtsz8ybfz8-sketch/whats-good`

Read `CLAUDE.md` first — stack, design tokens, and the working agreement live there.

---

## ⚠️ How to deploy (read this first — the normal path is broken)

- **`git push` does NOT work from this machine.** There is no GitHub auth configured
  (no token in keychain, no SSH keys), and GitHub dropped password auth years ago. So
  the usual "push → Vercel auto-builds" flow fails at the push.
- **Deploy goes straight to Vercel instead.** The Vercel CLI is installed and already
  logged in (a valid session lives in `~/Library/Application Support/com.vercel.cli/`).
  From the repo root:
  ```bash
  vercel deploy --prod --yes
  ```
  This uploads the working dir, builds on Vercel, and updates the `whats-good-nu` alias.
  Builds take a few minutes; the CLI buffers output until done.
- To get `git push` working later (one-time): `brew install gh && gh auth login`, then
  push normally and Vercel auto-deploys from GitHub.
- **`npm run lint` (`tsc --noEmit`) is pathologically slow here** (~60s+ wall at ~0% CPU
  — local I/O, not the code; Vercel builds fine). Budget for it. Gate every change on it.

## Current state

Everything below is committed and clean (`git status` empty). The last commit `5d09d3b`
was deploying when this was written — if `whats-good-nu.vercel.app` doesn't yet show the
new Mood/Cuisine chips, run `vercel deploy --prod --yes` again to be sure it's current.

## What this session did (commits, newest first)

- `5d09d3b` **Conversion pass** — hero value-prop subheadline (was a bare form); results
  now rank **open venues first** then nearest; **mobile venue pages get a sticky
  Directions/Call bar** (`lg:hidden`; desktop keeps sidebar actions); **Mood + Cuisine
  redesigned** — unified with Diet into one bordered/accent-fill chip system, removed the
  cheap tinted icon-squares and shadows, `VibeIcon`/`CuisineIcon` refactored to lookup
  maps forwarding a 1.75 stroke.
- `b49304a` **UX/UI pro pass** — fixed a real bug: mobile "Saved" routed to an empty
  "Basket coming soon" placeholder, so saved items were unreachable on phones. Both navs
  now hit the working `saved-recipes` view; removed the dead "Basket" desktop tab and its
  off-brand navy. Contrast fixes (footer disclaimer, "Closed", placeholder), killed
  vaporware copy + fake "market" prices, added a global `:focus-visible` ring.
- `9e8a229` **Dark accent standardised to pink `#fca5a5`** (user's choice over coral
  `#F07858`) via the `--accent-terracotta` dark token. Light mode unchanged.
- `ffe3902` Dark-mode status screens, distance sanity (no more "9341 km away" for remote
  cities), keyboard a11y (recipe cards, ingredient checklist, input labels).
- `c9eda70` Replaced `▼` glyph-icons with lucide `ChevronDown`; fixed a light-only
  "Good to know" block; `prefers-reduced-motion` respected (CSS + `<MotionConfig>`).
- `a4210c1` **EateryView desktop fix** — hero no longer overflows/clips on wide screens
  (dropped the `w-screen`/`left-1/2` breakout); two-column layout (menu + sticky sidebar);
  added motion (fade, ken-burns hero, scroll-reveal menu).
- `b0da6cf` **Real Happy Hour** — `src/happyHourData.ts` has 9 real Cape Town venues with
  actual public happy-hour windows + sources (confirmed July 2026), replacing the
  hash-synthesised data. City destination picker (search a city you're not in). Lighter
  light-mode glass.
- `a275ede` Synced the working tree that was live on Vercel but never committed; moved old
  notes into `docs/`; gitignored the cloned `anti-slop-main/` kit.

## Verified vs NOT verified

- **Verified on screen:** value prop, Mood/Cuisine redesign (desktop), pink accent (dark),
  the Saved-tab fix, clean desktop nav, real Happy Hour tab, results grid.
- **NOT visually verified:** the **desktop two-column EateryView** and the **mobile sticky
  action bar** — the in-app preview pane is capped ~678–800px wide and often glitches, so
  the `lg:` desktop breakpoint and true mobile can't both be seen here. Typechecks clean
  and uses standard patterns, but **look at these on a real desktop browser + phone.**

## Open items / decisions (nothing here is a known bug)

1. **Neutral-colour token migration.** The app still mixes hardcoded hex (RecipeView,
   StatusStates, Sidebar, App header) with CSS tokens. The *accent* is now consistent
   (both resolve to pink in dark), but neutral darks still differ (`#f5f5f5` vs
   `--charcoal #EDE8E1`). A blind migration would change the dark mode — do it with eyes
   on dark mode at desktop width. See memory `color-system-inconsistency`.
2. **Per-venue "gut / digestive wellness" notes** (`digestiveNote` → "Good to know" block).
   Reads as a bolted-on tangent for a restaurant finder; recommend removing or reframing.
   A product/strategy call, left untouched.
3. **Menus are still sample data** (`src/venueExtras.ts`, labelled "Sample"). No aggregator
   publishes menus; real ones need per-venue scraping or manual curation.
4. **Dead code:** the `saved-eateries` "Basket" branch in App.tsx's saved view is now
   unreachable (harmless) — safe to delete for tidiness.

## Key gotchas

- **Preview pane** maxes ~678–800px and is flaky (screenshots go black, `navigate` times
  out). `get_page_text` / `read_page` / `scroll_to ref` are the reliable tools; real
  desktop/mobile verification must happen in a real browser.
- **Places API** returns ~30 real Cape Town eateries when the key is set; falls back to
  `src/campusData.ts` (photoless) otherwise. `.env.local` is read only at dev-server start.
- **Two saved "tabs"** existed (`saved-recipes` = real, `saved-eateries` = dead Basket).
  Only `saved-recipes` is wired now; `savedRecipes` holds both eateries and recipes.

## Memory (persists across sessions, already written)

- `works-decisively-minimal-prompting` — make the call, execute, be economical.
- `loves-current-dark-mode` — don't change dark mode or the font; scope visual work to light.
- `color-system-inconsistency` — two colour systems (pink vs coral); don't blind-migrate.
