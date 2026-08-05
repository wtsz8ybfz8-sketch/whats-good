# Handover

## Status
**`claude/codebase-audit-sre-4vlto0` is at `436afae`, pushed.**

Four SRE fixes are committed and pushed. The desktop-layout and animation work below is
SPECIFIED BUT NOT WRITTEN — no `src/` file was changed for it. The user asked to see the code
before modification and to resume in a new session.

## Objective
1. (Done) Fix logic, robustness and performance faults found in an SRE audit.
2. (Specified, not built) Make the desktop layout structural rather than a scaled-up mobile
   screen, and adopt the already-installed `motion` library for one spring-based motion system.

This continues the "desktop master-detail redesign" that the previous handover recorded as
separate and unfinished. It is still unfinished, and it is still the top open item.

## What changed
Committed this session (`436afae`):
- `useSavedRecipes.ts:24,49` — `persist()` and `clearSavedRecipes()` localStorage writes are
  wrapped in try/catch and state is updated before the write. A blocked or over-quota store
  (Safari private mode) previously threw out of a click handler, which React does NOT route to
  the ErrorBoundary, so the Save control silently died.
- `App.tsx:749` — guarded the `whats_good_city` write, the only unguarded localStorage write
  left in the file. It could surface the ErrorBoundary on load.
- `App.tsx:1055` — ingredient counts are computed once into a Map instead of recomputing
  `Object.keys()+filter` on every sort comparison.
- `App.tsx:1024,1035` — the TheMealDB fetches now take the abort signal and check `res.ok`.

NOT changed: no layout, CSS, or animation code was written this session.

## Customer journey impact
- Trust / Recover: Save works for the whole session with storage blocked instead of appearing
  dead, and a blocked write no longer shows "This screen stopped working" on load.
- Choose: unchanged and still weak on desktop. The Find hero leaves roughly 40% of a 1440px
  screen empty. That is the live complaint.

## Verification and actual results
- `tsc --noEmit` — **exit 0**, completed (did not time out).
- `npx esbuild` parse on both edited files — **exit 0**.
- Rendered at true CSS viewports with playwright-core and `/opt/pw-browsers/chromium-1194`:
  **1440x900 and 390x844. `body.scrollWidth === innerWidth` at both — no horizontal overflow.**
  Screenshots were read, not only measured.
- NOT verified: dark mode, landscape 844x390, 1024 and 1280 widths, populated result grids,
  the venue detail page, the Out and Saved tabs. Places and TheMealDB are network-blocked in
  this container, so every result list rendered an empty or skeleton state.
- NOT run this session: `verify/checks.mjs`, `driver.mjs`, `qa-gate`, `judge`, `perceive`.
  Nothing visual changed, so the sweep was not required for what shipped. It IS required
  before any of the work specified below is called done. The previous session recorded
  `checks.mjs` at 59/59; quote the count from your own run, never that one.

## Protected decisions
- The "scaled-up mobile" diagnosis is true for ONE surface only. Measured: venue results are
  already `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` (`RecipeView.tsx:516`), the venue detail
  is already a desktop split view (`EateryView.tsx:384`), and there is no overflow at 1440.
  Do not "fix" those grids. The defect is the Find hero.
- Do NOT add GSAP. `motion` ^12.23.24 is already a dependency and §9 keeps the list small.
- Do NOT add a 4th results column. The content column caps at 1120px (`index.css:1080`), so a
  4th column pushes cards under ~340px.
- §8 stands: primary content (venue name, facts, actions) never gets an opacity-gated
  entrance. Transform-only, or none.
- The Find hero fix is to USE the width with a second column, not to enlarge the type. The
  current `font-size: clamp(4rem, 8vw, 8.5rem)` is the scaling this work exists to remove.

## Next session: first three actions
1. Move `<MotionConfig reducedMotion="user">` from `EateryView.tsx:204` to the root in
   `main.tsx`. Today the JS reduced-motion guard covers ONLY the venue detail page, and the
   global CSS reduced-motion rule at `index.css:956` cannot stop motion, because motion writes
   inline transforms from JS rather than CSS transitions — so `transition-duration: 0.01ms
   !important` is irrelevant to it. This is a live accessibility gap. It also makes the comment
   at `index.css:955` true; that comment currently claims MotionConfig is "in App", which is
   false.
2. Rewrite `index.css:1166-1197` as a 7fr/5fr grid — headline left, search and refine right —
   and REDUCE the h1 clamp from `clamp(4rem,8vw,8.5rem)` to about `clamp(3.25rem,5.5vw,6rem)`.
   Add explicit `.hero-headline` / `.hero-search` classes in `Sidebar.tsx` FIRST: the existing
   rules select by `> div:first-child` and `:nth-of-type(2)` and will break on any reorder.
3. Add `src/motionTokens.ts` (SPRING 240/30/0.9, SPRING_SNAP 420/34/0.7, plus pageVariants and
   itemVariants). When converting a surface, delete its competing CSS in the SAME commit:
   `hover:-translate-y-0.5` and `hover:-translate-y-1` (`RecipeView.tsx:539,702`), the md+ hover
   transforms (`index.css:1205-1208`), `.press:active` (`index.css:872`), and `.stagger`
   (`index.css:852`, which sets `opacity:0` AND runs `riseIn`). Leaving both means CSS and JS
   both own `transform` on the same element.

## Known risks and open questions
- CONTESTED: the premise that the whole desktop layout is a scaled-up mobile app. Measurement
  contradicts it for the result grids and the venue detail; it holds for the Find hero. The
  user may also be reacting to a surface that could not be populated here, since results are
  network-blocked. Confirm WHICH screen before rewriting anything beyond the hero.
- The §2A benchmark gate is UNMET for this work. The agent proxy returns 403 for every
  outbound URL, so Apple HIG, Google Maps, The Infatuation, Resy and OpenTable could not be
  opened this session. The design direction came from the user directly, which overrides this
  file — but the specific numbers (spring constants, the 7/5 split, the h1 clamp) are
  unvalidated proposals, not benchmark-derived values.
- There is no spring anywhere in this codebase today. All four existing motion calls are
  duration+bezier tweens (`EateryView.tsx:206-268`), so the spring constants above have never
  been seen in motion here. Expect to tune them.
- Whether the 7/5 hero split survives 1024-1280px is unmeasured. A 5fr column at 1024px is
  roughly 400px and may crowd the filters. Check 1024 and 1280 explicitly, not only 1440.
- `verify/checks.mjs` runs six viewport/mode combinations and must pass before any of this is
  reported as working.
