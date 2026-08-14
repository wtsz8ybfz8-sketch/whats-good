# HANDOVER

## Status

**`claude/direct-online-work-oec0va` is at `f39c899`, pushed.**

The app is still the prototype and that has not changed. What changed is that the
project's checks now measure it. Five gates were reporting green over a deleted codebase;
they are repaired and each was sabotage-tested. One live user-facing bug that they were
hiding is fixed.

**And the bigger one: CI had not typechecked or built anything since 13 August.** Every one
of the last eight runs on `main` was red, each dying at the ledger step — which is second
in the workflow, ahead of Typecheck, Build and the regression suite. None of those ran on
any of those pushes. Fixed; the local pipeline is green end to end.

`origin/main` was merged in at `26eeb03`, so this branch carries the server-side
`api/osm.ts` route.

## Objective

Reconcile `CLAUDE.md` with the codebase. The owner chose this over further data-layer or
design work, because sessions kept thrashing against a rulebook that described an app
deleted in `206fe11`.

## What changed

- **`src/prototype.ts`** — the distance readout used `(d).toFixed(1) + ' km'`; now
  `formatDistance()`. The rating and review count used `.toFixed(1)` and raw
  concatenation; now `formatQuantity()`. Both helpers already existed in `locale.ts`,
  already tested, and were **imported by nothing**.
- **`verify/checks.mjs`** — the distance check tested `/toFixed\(1\)\}\s*km/`, which
  matches only the template-literal spelling while the live bug used concatenation. It
  now asserts the rule itself — no number formatted by hand outside `locale.ts` — across
  every `src/*.ts`.
- **`.github/workflows/ci.yml`** — the `.glass` check and the `toFixed`, hex and
  `border-black` ratchets all grepped `src/App.tsx`, `src/components/` or
  `--include='*.tsx'`. None has existed since `206fe11`. Repointed at real files at
  measured ceilings (`toFixed` 0, hex 4); `.glass` became a `backdrop-filter` ceiling of
  0; the two Tailwind-syntax ratchets are retired in place with reasons.
- **`CLAUDE.md`** — new **§0** naming what the codebase is, with a table mapping every
  stale reference to reality. §7's token table replaced with the real one (`--bg`,
  `--surf`, `--ink`, `--accent`…). §9 rewritten for vanilla TS. §12 reframed: the
  filenames are historical, the mechanisms are not. §13 rebuilt entirely from measurement.

## Customer journey impact

**Trust** moved. A user in Berlin or Paris read "0.5 km" where their locale writes "0,5",
and a user in the US or UK read kilometres. The readout is now correct in both respects.
No other stage moved; no stage regressed.

## Verification and actual results

- **`verify/checks.mjs`: 46/46, exit 0, 0 failures, 0 skipped.**
- **`tsc --noEmit`: exit 0, clean.** It *completed* — CLAUDE.md §6's claim that it is
  pathologically slow on this machine did not hold this session.
- **`npx esbuild`** on both changed source files: exit 0.
- **`ci.yml` parses as valid YAML**, and the rewritten ratchet steps were executed
  locally: `toFixed` 0/0, hex 4/4, `backdrop-filter` absent — step exit 0.
- **Sabotage-tested, both directions.** The new `checks.mjs` check is GREEN on the fix and
  **RED** with the old line restored. The CI ratchet is **RED** with a violating file
  present and GREEN after removal.
- **Rendered and read in a real browser**, at the `0.5 km` slider stop, four locales:
  `de-DE` and `fr-FR` → `"0,5 km"`; `en-GB` and `en-US` → `"0.3 mi"`. All four previously
  read `"0.5 km"`.

**NOT verified:** iOS Safari anything; whether venues render on the live URL — this
container's egress proxy blocks Overpass outright (`EGRESS_BLOCKED` from the fetch tool,
`000` from curl to all three mirrors), so the OSM path cannot be exercised here by any
method; deployment reachability; screen reader.

**Established from outside the container, via the authenticated Vercel API:** `a0f19b7`
("Fix the fallback that CORS was blocking in production") built clean and reached
production **READY** at 09:08 on 2026-08-14, and the `whats-good-nu.vercel.app` alias
serves it. Whether it renders venues is still unconfirmed by anyone.

## Protected decisions

- The prototype is the product. Do not reintroduce the React UI.
- `src/locale.ts` is the only module allowed to format a number for a human.
- A check whose failure you have never witnessed is a decoration. Sabotage-test, or say
  the check is unproven.
- Retire a check in place, with its reason, rather than deleting it or softening it.

## Next session: first three actions

1. **Open the live URL and tap an occasion, then read the Vercel runtime logs.** Nobody has
   looked since the fixes deployed. `api/osm.ts` already exists (`26eeb03`), so the Overpass
   call is same-origin and CORS is gone as a class of bug — and the failure now lands in
   Vercel runtime logs, which an agent can read directly without the owner acting as
   messenger. **`api/osm.ts` has never been invoked**, in production or locally (`vite dev`
   does not serve `/api`), so it is unproven code on the critical path.
2. **Restore URL state.** Still the largest functional regression from the React app: no
   `?tab=`, no `?city=`, one `document.title` for every screen, nothing shareable or
   bookmarkable. The three routing checks were removed rather than softened —
   `verify/checks.mjs:704` documents the removal in place.
3. **Decide the typeface, then implement it.** Two Schibsted Grotesk `.woff2` files are
   preloaded at highest priority on every page load and referenced by no CSS — the app
   renders in a system stack. Apply the family or drop the preloads; it is a design
   decision the owner has opinions about, so raise it rather than picking.

## Known risks and open questions

- **`prototype.ts:809` hardcodes the theme-color tint** (`'#0E0E0D' : '#F5F4F2'`) — the
  same values as `--bg` in each mode, written again by hand. Change the canvas token and
  the browser chrome silently keeps the old tint, rebuilding §12's "band of the wrong
  colour welded to the screen edge" from parts.
- **`--ink3` has never been contrast-measured on this palette.** The AA figures CLAUDE.md
  used to quote were measured against the React app's token set. `--ink3` (`#8D8C87` on
  `#F5F4F2`) is the quietest tone and the most likely to sit under 4.5:1.
- **The three dark-mode blocks are unchecked.** `prototype.css` declares the palette in
  `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]` and
  `:root[data-theme="light"]`. A token added to one and not the others renders correctly
  for whoever tested it and wrongly for everyone else. Nothing compares them.
- **React, `react-dom`, `lucide-react`, `motion`, `@vitejs/plugin-react` and Tailwind are
  installed and unused.** Tailwind is still wired into `vite.config.ts` but no stylesheet
  imports it, so it emits nothing. A real, small cleanup — do it deliberately, not as a
  side effect.
- **`CLAUDE.md` §0 is prose, and prose is a claim with an author and a date.** It was
  written on 2026-08-14 from a tree at `75b3ab8`. Verify before trusting it.
