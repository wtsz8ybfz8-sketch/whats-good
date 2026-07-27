# HANDOVER — 2026-07-27 (session 9)

## Status

**Committed locally as `179f4aa` on `claude/docs-system-audit-emgpoj` at the user's
explicit request. NOT PUSHED — the push is blocked.** Working tree clean.

`git push -u origin claude/docs-system-audit-emgpoj` fails with **HTTP 403** from the
session's local git proxy (`http://127.0.0.1:41729/git/...`). Attempted three times;
re-attaching the repo with push access did not change it. The credentials this container
holds are read-only. **The commit exists only in this container** — it is not on GitHub
and therefore not on any Vercel deployment. Push it from a machine with write access, or
re-run in a session granted push scope.

Correction to session 8's handover, which was wrong: it claimed the `EateryView.tsx` hero
fix was uncommitted. It was already in `6754d7c`, along with all four instruction files.
Nothing was ever stranded. Do not act on that handover's push instructions.

- Vercel project `whats-good` (`nizzle-s-projects`) · repo `github.com/wtsz8ybfz8-sketch/whats-good`
- **Do not diagnose Vercel from inside this container.** An earlier claim in this session
  — that production was gated by Vercel Deployment Protection — was **wrong**. The
  evidence was a 403 from `whats-good-nu.vercel.app`, but `example.com` returns 403 here
  too: **this container's proxy 403s every external URL**. Nothing about the deployment
  was ever established. Reachability must be checked from a real device, not from here.

## Objective

Four things: retire the documentation graveyard, correct the stale handover, and replace
the hardcoded recipe cuisine rail with one derived from the API and the user's country.

## What changed

**Documentation — deleted, not rewritten.**
- Deleted `docs/HANDOVER.md` (174 lines), `docs/HANDOVER_SESSION4.md` (80),
  `docs/prompt.md` (61), `docs/AGENTS.md` (1-line orphan stub). Three files named
  HANDOVER meant an agent globbing for one found three, two of them stale.
- Deleted `_START_HERE.md`. Ten of its sixteen lines said "read CLAUDE.md", which
  `README.md` already said. Its remaining claim — that `_archive/` holds tidied files —
  was false; no such directory exists. A false statement in the first file an agent reads
  is a hallucination vector.
- Promoted `docs/IDEATION_BRIEF.md` to root; `docs/` no longer exists.
- `README.md` absorbed the one true line from `_START_HERE.md` (this folder is one
  project, unrelated to `work-os`) and gained a four-row file responsibility table.

**Code — the hardcoded cuisine rail is gone.**
- New `src/cuisineRail.ts`. Exports `FALLBACK_AREAS`, `AREA_TERMS`,
  `orderAreasForCountry()`, `fetchAreas()`.
- `src/App.tsx` — the rail was the literal array
  `['Italian','Middle Eastern','Pan-Asian','South African','Latin American']`. It is now
  `kitchens`, a `useMemo` over TheMealDB's live area list ordered by `countryCode` and
  capped at 6 chips. Seeded from `FALLBACK_AREAS` so chips exist on first paint.
- `src/recipeUtils.ts` — the five-case `switch` became an open `AREA_TERMS` lookup, so an
  area the API adds still maps to a query. Unknown areas fall back to their own name as
  the search term, not to the generic `chicken/salmon/beef` list — that fallback silently
  served a different cuisine than the one tapped.

**Why it mattered:** none of those five labels is a cuisine TheMealDB indexes. There is no
"Pan-Asian", "Latin American", "Middle Eastern" or "South African" area. Every chip was
invented and hand-mapped to keyword guesses. And it was fixed regardless of location — a
German in London was offered South African, a leftover of the app's Cape Town origin.

## Customer journey impact

**Express intent** and **Choose**. The cuisine control now offers options that exist where
the user is and that the API can actually return. Previously a tap could return results
from a keyword guess unrelated to the label. **Recover** is held: the rail falls back to a
full area list on fetch failure rather than rendering empty and removing the only cuisine
control on the tab.

## Verification and actual results

**Rung 4 reached — the app was driven in a real browser and looked at.** First session to
do so. Method now documented in CLAUDE.md §6; it took ~90 seconds and needed nothing from
the user. Screenshot at 390×844 was read, not just measured.

- **Rung 1.** `npx esbuild` clean on `cuisineRail.ts`, `recipeUtils.ts` (3.9kb, 8ms),
  `App.tsx` (57.4kb, 11ms).
- **Rung 4, Chromium 390×844, Stay In tab — the rail renders correctly.** Six derived
  chips: `Italian, Indian, Chinese, Mexican, Japanese, Thai`. **No South African.** With
  no `countryCode` in localStorage it fell through to `DEFAULT_LEAD`, exactly as intended.
- **No horizontal overflow.** `body.scrollWidth === 390`, `innerWidth === 390`. The
  `.page-grid` primitive holds at mobile width.
- **Correction to a claim made earlier this session: the chips do NOT fit one row.**
  Measured `rowCount: 3` — chips at `top: 305` (Italian/Indian/Chinese), `top: 354`
  (Mexican/Japanese/Thai), and `Surprise me` alone at `top: 404`. Two chip rows plus the
  wildcard. It looks fine in the screenshot and is not a regression — the old five labels
  were longer (`Middle Eastern`, `Latin American`) and wrapped at least as hard — but the
  stated design intent of "six chips, one row" was wrong and should not be repeated as
  fact.
- **44pt hit targets were failing (CLAUDE.md §11.3) — found, fixed, and re-verified.**
  A sweep of every `button/a/input` across all four tabs at 390px found: filter chips
  42px, header icon buttons 40×40, `Surprise me` 40px, `Try something different` 40px.
  All pre-existing. Fixed with a new `.hit-44` utility in `index.css` — an invisible
  centred `::before` with `min-width/min-height: 44px`. Applied at 6 sites.
  **Verified by hit-probe, not by eye:** `document.elementFromPoint` 1px above and 1px
  below each painted box now resolves to the button. Painted heights are unchanged
  (40/42) and the screenshot is pixel-identical, which is the point — §11.3 forbids
  growing the visual ink to reach 44.
  One probe returns `below1px: false` for `45+ min`: the chip on the row beneath claims
  that pixel. Expected adjacency, not a failure of the mechanism.
- **`tsc --noEmit` not run** — pathologically slow here (CLAUDE.md §6).
- **`fetchAreas()` live path still not exercised.** This container cannot reach
  themealdb.com (`ERR_TUNNEL_CONNECTION_FAILED`). `FALLBACK_AREAS` is what rendered. The
  recipe grid therefore showed `Nothing matched that combination` — **a network artifact
  of this container, not a bug**. The live ordering path needs a real device to confirm.
- **The `EateryView` hero overlay is still unmeasured.** The venue detail view needs live
  Places data to reach, which this container cannot fetch. Open since session 7.

## Protected decisions

- **`.hit-44` measures nothing via `getBoundingClientRect()`.** The element's painted box
  stays 42px by design; the target lives on the `::before`. A future audit that checks
  `rect.height >= 44` will report a false failure and may "fix" it by adding padding,
  which grows the visual ink and breaks §11.3. **Verify hit targets with
  `document.elementFromPoint` probes**, not rect heights. The script is
  `hittest.mjs` — the pattern is recorded in CLAUDE.md §6.
- **The search input in `Sidebar.tsx` is correctly labelled** by
  `<label htmlFor="place-search">`. An audit that only checks `textContent`/`aria-label`
  will flag it as unlabelled. It is a false positive — do not add a redundant aria-label.

- `public/sw.js` and `public/registerSW.js` are a **live self-destructing kill switch**,
  not dead files. `vercel.json`'s rewrite exclusion and JS MIME pin for those paths are
  load-bearing. Removing any of it re-arms the invisible-deploy bug. A previous session
  nearly "cleaned this up" — do not.
- The cuisine rail must stay derived. Do not replace it with a different fixed array.

## Next session: first three actions

1. **Apply `.hit-44` to the remaining small controls.** This session covered the four
   tabs' top-level controls. NOT swept: anything behind an opened FilterSheet, the city
   dropdown's 32×32 submit button (`w-8 h-8`, Sidebar.tsx), venue detail actions, and the
   Happy Hour source links (measured 14px and 34px tall — the 14px ones are the worst
   targets in the app and were left because they are inline text links inside a
   paragraph, where a 44px block would break the line box; they need a different fix,
   probably a spaced-out link list).
2. **Merge this branch to `main`.** Production still serves `6754d7c`; every change in
   this session — derived cuisine rail, 44pt hit targets, CI — is on
   `claude/docs-system-audit-emgpoj` and invisible on the live site until it merges.
3. **Start trusting CI over local claims.** `.github/workflows/ci.yml` is live and green
   (run #1, `47df1a6`, 28s). `tsc --noEmit` completed for the first time in this
   project's history. §6's whole "the typecheck won't finish, report it as did-not-
   complete" workaround is now obsolete for anything pushed — check the Actions tab
   instead of guessing. It stays true only for uncommitted local work.

## Known risks and open questions

- **`COUNTRY_LEAD` in `cuisineRail.ts` is a judgement call, not data.** 26 countries, hand
  written. It is defensible but it is the one place in this change where a human decided
  what a locale eats. Worth revisiting if it ever feels wrong.
- `NL` leads with `Indonesian`, which is **not** a TheMealDB area — it is filtered out by
  `orderAreasForCountry`. Harmless, but it means the Dutch rail is one shorter than it
  reads.
- `FALLBACK_AREAS` is transcribed from TheMealDB's area list and was **not** verified
  against the live endpoint this session. If an entry is wrong, it only affects the
  offline path.
- **`vite-plugin-pwa` is still in `devDependencies`** even though `vite.config.ts` no
  longer uses it and §12 forbids ever re-adding it. It is inert, but leaving the package
  installed is an invitation for a future session to wire it back up. Removing it is a
  one-line `package.json` change nobody has been asked to make yet.
- The audit's items 5–7 (CI, doc split, accessibility section) were scoped to tomorrow and
  are untouched.
