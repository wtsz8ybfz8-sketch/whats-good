# HANDOVER

## Status

**`main` is at `7ee65be`, pushed.**

Session ended on a §3 hard stop: the browser renderer timed out mid-verification and
was not re-probed. All work is committed and pushed; nothing is stranded in the tree.
CI was still `in_progress` on `7ee65be` when the session ended — **read the Actions tab
before trusting anything below marked "CI is the gate".**

## Objective

Transplant the agreed design direction (`docs/design/occasion-prototype.html`) into the
live app so it ships on https://whats-good-nu.vercel.app/ rather than sitting in a
prototype nobody deploys.

## What changed

Six commits, in order:

- `080529a` — palette retune. Cream ground `#F4F2EF` → true neutral `#F5F4F2`; accent
  `#7C2D12` → `#C8371C`; dark `#0F0C0A` → `#0E0E0D` / `#FF5A3C`. Four hardcoded hexes
  predating the token system, plus both `theme-color` tags and their live JS twin.
  **CLAUDE.md §7 rewritten in the same commit** — it declared the old palette decided,
  so shipping without it would have left the repo contradicting its own rules.
- `c1d8103` — registered `happyHourSources.ts` in the inspection ledger. It had never
  been declared, and was failing `verify/ledger-check.mjs` on every push.
- `63d3951` — neutralised `--body-gradient`, which was washing a brown overlay across
  both schemes and reinstating the peach cast on top of the corrected ground.
- `628ac34` — `verify/checks.mjs`: added `:visible` to the two `nav[aria-label="Primary"]`
  selectors. Not a softened assertion; see Verification.
- `90dfd58` — **occasion tiles.** Six tiles are now the primary decision, generated from
  the device clock under three periods (Morning / Midday / Evening), auto-set and
  switchable. Each tile maps onto an existing `vibe` value, so a tap runs the same
  Places query the mood sheet always ran and re-queries immediately.
- `7ee65be` — occasion grid sized to its column, not the viewport.

## Customer journey impact

**Express intent** and **Choose** are the stages that moved. The app previously opened on
a search box plus a cuisine rail; the first decision is now a single tap on an occasion,
and the selection *is* the query — no Search button between intent and results. Party
size, diet and budget stayed in the sheet, because they can all be true at once and were
never moods; conflating them onto one row is why the old row never felt right.

**Trust** and **Recover** are untouched. Nothing here adds or invents a venue fact.

## Verification and actual results

- **esbuild (rung 1): clean** on `src/App.tsx` and `src/components/Sidebar.tsx`.
- **Typecheck / build: did not complete.** Both exceed this machine's timeout (§6). CI is
  the gate and was still running at session end.
- **Deployed page, looked at in a real browser** — 375×812 light and 1280×860 dark, via
  the Browser pane against the live URL. Palette lands; periods render with the `Now`
  marker on the current one; tiles render with labels on one line after `7ee65be`.
- **Places data confirmed live** — 20 real Cape Town venues with real photos rendered at
  1280×860 during this session.
- **NOT verified:** that clicking an occasion tile actually returns filtered results. The
  click timed out and triggered the §3 hard stop. **This is the single most important
  unverified claim in this handover** — the wiring is `onChange` + `onTriggerMatch`, which
  is the same path the mood sheet uses, but nobody has watched it work.
- **NOT verified:** 390×844 and 844×390 as `checks.mjs` measures them; contrast over
  photos; iOS Safari anything.
- **The `:visible` fix in `628ac34` needs a second opinion.** The selector matched two
  elements after the desktop workspace landed and `.first()` resolved to the hidden
  desktop nav inside a 390px context, so the click waited 30s and killed the suite.
  `:visible` targets whichever nav actually renders. It relaxes no expectation — but it
  is a change to the harness made by the same session whose work the harness was gating,
  which is exactly the shape that deserves review.

**Context for the CI history:** CI had been red on *every* push since at least 05:46 on
2026-08-13, dying at the ledger check in 13–27s. The browser half of the suite had not
executed in days. `c1d8103` let it run for the first time, which is why `628ac34` was
needed — that failure was pre-existing and merely unmasked.

## Protected decisions

- **Cream is retired and must not return.** CLAUDE.md §7 now records this with measured
  contrast for every tone. Do not "restore the warm palette".
- **One axis on the tiles.** Occasion only. Party size, speed, budget and diet are
  refinements. Re-merging them is the regression this work exists to undo.
- **The tile set is derived from the local hour.** A fixed six is wrong at every hour but
  one. Keep it client-derived; it cannot be server-rendered and cached without going stale.
- **Image frames stay neutral until real photography exists.** Gradients as image
  stand-ins were rejected by name. Venue photos come from the Places Photo API; occasion
  imagery is a curated self-hosted set of ~20. See `docs/design/README.md`.

## Next session: first three actions

1. **Read the Actions tab for `7ee65be`.** If `checks.mjs` is red, that is the first job.
2. **Open the deployed page and click an occasion tile.** Confirm the result list actually
   changes. This is the unverified claim that matters most.
3. **Run the full QA gate** at 390×844, 844×390 and 1440×900 in both schemes. No viewport
   in this session was measured by `checks.mjs`; all of it was eyeballed in a browser.

## Known risks and open questions

- **Tile → query is unproven.** See above.
- **Occasion labels are hardcoded English.** `docs/design/README.md` specifies per-city
  vocabulary (Braai / Sunday roast / Terrasse). Not implemented — the app currently reads
  translated rather than local outside South Africa.
- **Several occasions share a `vibe` value** (Neighbourhood and Late night both map to
  `tired & cosy`). Distinct labels, identical query. Honest for now, but the tiles promise
  a distinction the data layer does not yet make.
- **Two occasions per period are duplicated across periods** by design; if the set is ever
  reordered, keep slot order stable so muscle memory survives.
- **Photos did not render in one capture** where they had rendered minutes earlier.
  Changes were CSS-only, so this is most likely Places throttling on repeated reloads —
  but it was not confirmed.
- **`src/campusData.ts` is untracked** and trips `ledger-check.mjs` locally while CI never
  sees it. Either commit and declare it, or delete it.
