# HANDOVER — 2026-07-26 (session 8)

## Status

**Working tree is NOT clean and nothing new is committed.** Do not commit without being
asked (CLAUDE.md §4).

- Committed earlier this session: `3d7cc07` — full-bleed `.page-grid` / `.bleed`.
- Deployed preview (that commit): https://whats-good-po6xd462f-nizzle-s-projects.vercel.app
- **Production is still the old build** — https://whats-good-nu.vercel.app — untouched.
- Uncommitted, application code: `src/components/EateryView.tsx` (hero name overlay).
- Uncommitted, instructions: `CLAUDE.md`, `README.md`, `_START_HERE.md`, `HANDOVER.md`.

Vercel project `whats-good` (`nizzle-s-projects`) · repo `github.com/wtsz8ybfz8-sketch/whats-good`

## Objective

Two things, in order: (1) make the venue hero photo reach the physical viewport edge at
every width — the requirement the user rejected the previous attempt over; (2) apply the
operating amendments to the project instruction files.

## What changed

**Committed (`3d7cc07`) — full-bleed layout primitive.**
- `src/index.css` — added `.page-grid` / `.bleed`. Gutters `minmax(0,1fr)`; a `.bleed`
  child spans `full-start → full-end`.
- `src/App.tsx` — `<main>` lost `px-*`, `max-w-7xl mx-auto` and `overflow-x-hidden` (the
  last was silently clipping left overhang and eating the Back button); now `.page-grid`
  plus vertical padding only. The tab-content wrapper is the single owner of mobile `px-5`.
- `src/components/EateryView.tsx` — root is `.page-grid .bleed`; hero is `.bleed`, no
  negative margins, no `w-screen`.
- `src/components/HappyHourView.tsx`, `RecipeView.tsx` — dropped their own mobile `px` so
  the results grid and the filter card share one left edge (was 44px vs 21px).

**Uncommitted — `EateryView.tsx` hero name overlay.**
- The venue name is no longer a `motion.div`. It was on a 0.22s-delayed
  `opacity 0→1 / y 16→0` entrance and was measured live at `opacity: 0` — a venue page with
  no venue name on it. Now a plain `div`, present on first paint.
- The rating / spend / distance row went `text-white/85` with `text-shadow`, star to full
  white with drop-shadow, separators `/45`. It was `/55` over a photograph — the same fix
  the cuisine label above it already had, which this row was left out of.

**Instruction files** — `CLAUDE.md` rewritten as the single authoritative file (FAST MODE,
hard-stop rule, Git rule, customer-journey acceptance test, Google-Maps positioning,
restaurant-page contract, validation ladder, consolidated traps). `README.md` stripped of
Google AI Studio boilerplate. `_START_HERE.md` reduced to a pointer. Old handover narrative
replaced by this contract shape.

## Customer journey impact

- **Orient / Choose** — the hero now behaves like a magazine opener rather than a card in a
  column; results and filters share one left edge, so the page reads as one system.
- **Trust** — the largest gain. A venue page that rendered without its venue name failed
  trust outright; identity and the three street-level facts (rating, spend, distance) are
  now present on first paint and legible over any photograph.
- **Act** — unchanged. Directions / Call / Website were already intact and were not touched.
- **Recover** — untouched, and still the weakest stage. See open questions.

## Verification and actual results

Measured on the deployed preview inside a 390×844 iframe (real CSS viewport **384**) and at
1440 (CSS **1434**):

| Check | 384 | 1434 |
|---|---|---|
| `.bleed` x | **0** | **0** |
| `.bleed` width | **384** | **1434** |
| Horizontal page scroll | none | none |

Venue page at 384: hero spans edge to edge; Back button at x=20 (not clipped); body content
at x=20, same left edge as the filter card. Screenshot taken and shown to the user.

**The name-overlay fix has NOT been seen rendered.** Evidence for it is a pre-fix
measurement of `opacity: 0, translateY(16px)` on that element, plus its absence from the
screenshot.

- `npx esbuild src/components/EateryView.tsx` — **clean, 19ms.** This caught a real defect:
  the first edit swapped `<motion.div>` for `<div>` and left `</motion.div>` closing it.
  Fixed and re-parsed clean.
- `npm run lint` (`tsc --noEmit`) — **did not complete.** Timed out at 7 minutes. Not a pass.
- The browser renderer timed out twice during measurement. Under the new hard-stop rule that
  is now a stop-and-hand-over condition.

**Session 8 (short, user-capped at ~4 minutes):**
- Re-read the uncommitted `EateryView.tsx` diff. It is exactly what session 7 described:
  name overlay demoted from `motion.div` to a plain `div` (present on first paint), and the
  rating / spend / distance row raised `text-white/55` → `/85` with a text-shadow, star to
  full white with drop-shadow, separators `/25` → `/45`. Rationale is now written into the
  code as comments so it survives without this handover.
- `npx esbuild src/components/EateryView.tsx --outfile=/dev/null` — **clean, 83ms.**
- **The rendered result is still UNSEEN.** The uncommitted fix exists only in the working
  tree, so the deployed preview does not contain it; the only honest way to see it is a dev
  server rendered inside a 390×844 iframe, which did not fit the session's time cap. Action 1
  of session 7's list is therefore **still open** — do not mark it done.
- Nothing committed, nothing deployed. Actions 2 (ask before committing) and 3 (mobile CTA
  bar overlapping "We found 31 eateries" at 384) are untouched.

**`npm run build` is `vite build` and runs no typecheck** — a deploy will not catch a type
error. An earlier claim in this session that Vercel would run the gate was wrong.

## Protected decisions

- Typography: Schibsted Grotesk, one family, weight-led hierarchy. The user has said twice:
  don't change the font.
- Dark mode as it stands — the user likes it. Don't touch the dark palette.
- Any colour goes through the tokens in `src/index.css`. Never hardcode a hex.
- `.glass` on chrome only (header, mobile CTA bar) — never on a card.
- No service worker, ever. Never render invented data as real.
- Grain texture and canvas gradient stay. Skeletons, never conversational loading copy.
- No slot-machine city animation — it would display cities you are not in.
- `.page-grid` / `.bleed` is the full-bleed mechanism. No negative-margin breakouts, no
  `w-screen` + `-translate-x-1/2`, no `overflow-x-hidden` on `<main>`.

## Next session: first three actions

1. **Look at the venue page at 384 and confirm the name renders** — "Kloof Street House",
   its rating row legible over the photo. One iframe measurement of that element's computed
   `opacity`; expect `1`.
   (Session 8 note: the user is pushing the working tree themselves, so this fix will be on
   the deployed preview — measure it there, no dev server needed.)
2. **Kill the hardcoded recipe cuisine rail** — `src/App.tsx:1142` /
   `src/recipeUtils.ts:27`. See the open question below; agree the source of truth with the
   user first. The user raised this directly and it is the live priority.
3. **Fix the mobile CTA bar overlapping the results heading** at 384 — "Find a place" sits
   on top of "We found 31 eateries". Either give the results section bottom padding equal to
   the bar, or hide the bar once results exist. Visible in session 7's screenshot.

## Known risks and open questions

- **Risk:** the `opacity: 0` reading may have been a throttled-iframe artifact (rAF never
  ran; the hero `<img>` also measured mid-scale-animation). The fix is correct either way —
  identity must not depend on an animation — but the *cause* is unconfirmed. If other motion
  entrances also strand, the problem is broader than this one element.
- **Risk:** no green typecheck exists for either the committed or the uncommitted work, and
  the build won't produce one.
- **I removed `rounded-b-[26px] md:rounded-b-[32px]`** from the hero. Square reads correct
  for a true bleed, but that was my call, not the user's. Confirm or revert.
- **Open:** should the results grid also run edge-to-edge on desktop, or is card-edge bleed
  correct there? Never assume — assuming this cost a previous session.
- **Open:** `Chip` uses `.tap-44`, growing the pill 41.5 → 44px. That expands visual ink,
  which CLAUDE.md §11.3 forbids. Defensible for a pill, never agreed. Get it blessed or
  convert to `.tap-target`.
- **Open:** two levels of filter disclosure ("Adjust filters" → panel → "Mood, diet &
  budget" → sheet). Raise it; don't silently collapse it.
- **Open:** the city badge wraps "Cape Town" onto two lines in the fixed header at 384.
- **Recover stage is thin** — no visible handling for "everything near you is closed."
- **Open (raised by the user, session 8): the Recipes side ships a hardcoded cuisine rail
  that ignores where the user actually is.** `src/App.tsx:1142` renders a literal array —
  `['Italian','Middle Eastern','Pan-Asian','South African','Latin American']` — and
  `src/recipeUtils.ts:27` branches on those same fixed strings. The list is a leftover of
  the app's Cape Town origin (see also `campusData.ts`, which is an all-South-African venue
  set, and `placesService.ts:321`, where price tiers are built around ZAR).
  The user's framing: *a German in London has no reason to be offered South African cuisine
  as a top-level option.* This is the same failure the venue side was corrected for — the
  product's premise is mood **and location**, and a fixed rail is neither. It reads as a
  template, which is precisely what §1 of CLAUDE.md calls a failure.
  **Do not just swap the hardcoded list for a different hardcoded list.** The rail should be
  derived from something true — the resolved locale/city, or the cuisines actually present
  in the recipe set — with an honest fallback when location is unknown. Decide with the user
  which source of truth before writing code; assuming this has cost a session before.
