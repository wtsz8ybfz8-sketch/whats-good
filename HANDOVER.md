# HANDOVER

## Status

**Uncommitted, in the working tree, on branch `claude/instruction-verification-drift-rz1d3f`.**
Nothing committed or pushed — §4. No dev server running.

Docs-and-harness change only: **no `src/` behaviour was modified.** The only `src/` edits
are four comment lines whose `§` cross-references were renumbered.

`verify/checks.mjs` **43/43, PASSED 43 / FAILED 0 / SKIPPED 0, exit 0** on chromium, run
after every edit in this session.

**CLOSED: venue discovery works in production.** Observed by the user in the live site's
Network tab on 2026-07-28, after a clean no-cache redeploy: 21 requests to
`places.googleapis.com` (2 × `places:searchText`, 19 photo fetches), **all HTTP 200**, no
Google error body, the `key=` parameter present, and a real venue rendered on screen.

`VITE_GOOGLE_PLACES_KEY` was never missing — it has been set in Production, Preview and
Development since 2026-07-06. Every earlier handover called it "the one blocker on venue
discovery". Nobody had checked it; the claim survived on repetition. It is now retired.

## Objective

Remove drift between what the instruction layer claimed was enforced and what any machine
actually refuses to let through, and separate rules from history so a future session cannot
mistake a war story for a policy.

## What changed

**1. `CLAUDE.md` is now an operating contract, 651 → 469 lines** (and ~40% of the new file
is the enforcement table, which was previously absent or wrong). Every rule carries
**[ENFORCED_BY_CI]** or **[HUMAN_DECISION]**. The old §13 ledger, the forensic bug
narratives and the audit findings are gone from it. It no longer claims to be "the single
source of truth" over history or live state: an explicit authority table puts the live
conversation first, then rules, then **the checks themselves as authoritative for what is
enforced**, then this file, then history.

**2. `AUDIT_HISTORY.md` (new).** Bugs that shipped and the check each earned, the closed
2026-07-27 structural audit (including the three false positives), and a "retired claims"
list. Marked historical and non-authoritative at the top.

**3. The enforcement table is now descriptive.** It was rewritten by reading
`checks.mjs` and `ci.yml` rather than the old table. Corrections made:

- **Dark mode was never enforced.** The old text claimed `checks.mjs` measured "light +
  dark" across six combinations. It does not, and never did — only `driver.mjs --dark`
  renders dark, into PNGs someone must open. Now listed under "not enforced".
- **Viewports were wrong.** Claimed 390×844 / 844×390 / 1440×900; actually 390×844,
  393×852, 430×932, 844×390, 1440×900.
- **The WebKit CI steps are `continue-on-error`** — observation, not a gate. This was not
  stated anywhere.
- **`.glass` is a placement check now, not a count.** The old §13.2/§13.3 still described
  the count version and called the gap open.
- Ratchet ceilings and the font/`vh`/third-party-font checks were missing entirely.

**4. `verify/checks.mjs` reports four distinct outcomes, in words.** `✓ PASS` / `✗ FAIL` /
`⚠ SKIPPED … [NOT a pass: this check did not run]`; a new `precondition()` helper exits 3
naming the missing lever; an unhandled throw now prints `✗ DID NOT COMPLETE — the suite
threw after N check(s)`. The summary prints `PASSED n FAILED n SKIPPED n`, re-lists any
skips by name, and closes by naming what the suite does not cover. The header documents the
four preconditions. No check was added, removed or weakened.

**5. `HANDOVER.md` and `README.md`.** This file is live state only. The README gained a
file map with an authority column and a verify recipe.

**6. `qa-gate/SKILL.md`** lost its stale `31/31` and its dangling §13.2/§13.4 pointers.

**7. Section cross-references realigned** in `ci.yml`, `ios-safari.yml`, `verify/*.mjs` and
four `src/` comments (§13.x → §7, §11.x → §10.x, §12 → §11).

## Customer journey impact

**None — no product behaviour was touched.** Indirectly, **Trust**: the enforcement table
no longer tells a session that dark mode and three viewport claims are machine-checked when
they are not, which is the class of belief that ships defects.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite, after all edits | `node verify/checks.mjs` | **43/43, 0 SKIPPED, exit 0** |
| The new FAIL path can fire | first run of the font check, historically | red, then fixed |
| The new **DID NOT COMPLETE** path can fire | `VERIFY_BASE_URL=…:3999` | **exit 1**, printed "threw after 10 check(s)" |
| The new **PRECONDITION/exit 3** path can fire | bare `npx vite` on :3011, no key | **exit 3**, named the missing key and the fix |
| Changed `src/` comment files parse | `npx esbuild` (rung 1) | **exit 0** |
| Typecheck | — | **NOT RUN.** No TypeScript was changed; four comment lines only |
| Build | — | **NOT RUN.** Same reason |
| Dark-mode / screenshot sweep | — | **NOT RUN.** No rendered output changed |
| Every doc claim in the new §7 table | read against `checks.mjs` + `ci.yml` line by line | matches on 2026-07-28 |

**Not verified, and not verifiable here:** that CI still passes with the edited `ci.yml`
comments and `checks.mjs` (nothing was pushed, so no run exists); anything about iOS.

## Protected decisions

- **The checks are the authority on enforcement, not the prose.** When `CLAUDE.md` §7 and
  `checks.mjs` disagree, the code is right and the table is stale.
- **`CLAUDE.md` is authoritative for rules, not over history or live state.** The old
  "single source of truth over everything" framing let stale audit notes read as policy.
- **`AUDIT_HISTORY.md` is never policy** and can be ignored while doing the work.
- **No check count in prose, anywhere** — quote the summary line of the run you did.
- **SKIPPED ≠ PASS; exit 3 ≠ a verdict about the app; a throw = DID NOT COMPLETE.**
- **No `openNow` ratchet** — a grep cannot distinguish a guarded ternary from a bare one.
- Carried forward: `browser.mjs` never falls back; declare font faces by hand; `.safe-x`
  composes, never replaces; `/fonts/*` immutable with stable filenames; say "WebKit", never
  "iPhone"; never a bare `npx vite`; the design direction is decided.

## Next session: first three actions

1. **Read the CI runs for this branch.** Four commits were pushed and no Actions result has
   been read. That is the only thing that can confirm the typecheck, the build and the
   ratchets still pass — none of the three was run locally.
2. **Look at the cuisine rail fade on a real phone.** `mask-image` on a scrolling flex row
   is well supported in iOS Safari, but whether the fade reads as elegant or as a smudge
   over warm paper is a taste call nothing here can make. Revert the `@media` block in
   `src/index.css` if it reads badly.
3. **Fix the silent Places catch** (risks section) — a rejected key and an empty area are
   the same screen today. Then consider flipping the WebKit steps in `ci.yml` from
   `continue-on-error` to a gate, and deleting the paragraph that says to.

## Known risks and open questions

- **A rejected Places key is indistinguishable from "no results" in the UI.**
  `placesService.ts:231` does `.catch(() => [])` and line 302 says "Silently fall back —
  never surface API errors to the user". So `REQUEST_DENIED` (bad referrer restriction,
  Places API (New) not enabled, billing off) renders the same empty state as a genuine
  empty area. Against §5's **Recover** stage this is a real defect, and it is why the
  current deploy cannot be judged by looking at it. Diagnose from the browser Network tab
  (`places.googleapis.com`), not from the screen. Fixing it means distinguishing the two
  states in `StatusStates.tsx` — not yet done, and not in this session's scope.
- **The Find tab opens on a form, not on food.** Nothing on the first screen answers
  "what's good right now" until the user fills something in and taps. Against §5's Orient
  stage, the largest remaining product gap. A design decision, raised and not acted on.
- **Closed, do not re-chase: `VI is not defined` / `jw is not defined` in the live
  console.** ~99 of them were observed on production, then traced to the observer's own
  browser-automation helper injecting a script into the page; plain coordinate clicks
  produced zero. A production build loaded in a clean browser here threw **0**
  ReferenceErrors. Not our bundle, not an extension in a normal browser.
- **Not a bug: `?city=Cape+Town` with geolocation timing out.** `App.tsx:155` seeds city as
  `''` — there is deliberately no default (line 149). The value came from `localStorage` on
  that browser profile. The Cape Town default really was removed.
- **The user's reported bottom gap is still unconfirmed.** Never reproduced here.
- **The venue hero has no photo fallback** — with no image it is a large flat pink→black
  gradient over most of the first screen. Only seen where images cannot load; unknown
  whether real photo-less venues hit it. Check once the Places key is live.
- **iOS Simulator delivery was never proven.** Capture works; reading the artifacts from
  this container does not (the proxy 403s the artifact URL). No iOS Safari screenshot of
  this app has ever been looked at by anyone.
- **`ci/ios-shots` is force-pushed and orphaned every run.** Never put anything there you
  want to keep.
- **Hex ratchet is 71**, unchanged. The remainder has no exact token.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
- **The renumbered `§` cross-references are only as stable as the new headings.** If
  `CLAUDE.md`'s sections are reordered again, `ci.yml`, `verify/*.mjs` and four `src/`
  comments point at the wrong place, and nothing checks that.
