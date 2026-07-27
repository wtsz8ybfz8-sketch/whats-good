# HANDOVER

## Status

**Latest session — §13.3 violations fixed, shipped.** Three of the six flagged items were
**false positives** and were left alone: `openNow` was already guarded by
`!== undefined` at every site, and two "hardcoded offsets" were the comments *describing*
the original bug. Fixed for real: the four bottom-chrome offsets now derive from
`--tabbar-h` (`EateryView`, `RecipeView` ×2, `App` content clearance), both `toFixed`
calls became `formatQuantity()` in `locale.ts` via `Intl`, and the Scaled chip + toast
moved off hex onto tokens (211 → 203), which also gave the toast a real dark mode.
CI ratchets updated to the measured truth: offsets 0, toFixed 0, hex 203, and the
openNow ratchet deleted rather than left firing on correct code.

**Verification actually run:** `verify/checks.mjs` **30/31**, and the one failure
(`browser back restores list scroll position — no card to test`) was confirmed
**pre-existing** by re-running with the changes stashed — identical 30/31. It is a
fixture artifact: no venue cards render in this container. `driver.mjs` light + dark,
6 views each, screenshots read. `npx esbuild` clean on all four touched files.
**`tsc --noEmit` was NOT run** — read the Actions tab for the type verdict.
**Not visually confirmed:** the Scaled chip's new tokens, which only render when
`plates !== defaultPlates`, a state no screenshot in the sweep reaches.

**This session (structural checks audit) — docs + CI only, no `src/` change.** Added
CLAUDE.md **§13 (the structural check ledger)** and **§14 (skills policy)**, replaced the
non-blocking hex report in `.github/workflows/ci.yml` with four **ratchets**, and extended
`qa-gate/SKILL.md` with the §13.4 honesty contract. Ratchet baselines were measured on
this tree, not assumed: openNow-truthiness 3, bottom-offsets 5, toFixed-in-tsx 2, hex 211.
`checks.mjs`, the typecheck and the browser sweep were **NOT run** — nothing in `src/`
changed, so §2 puts the cheapest sufficient check at YAML parse (passed) plus the greps
that produced the baselines. **§13.3 records six live rule violations found by the audit
and left unfixed on purpose**, so the ledger and the fixes stay separately reviewable.
Fixing §13.3 item 1 (`openNow` truthiness, a Trust defect) is the first action below.

Phase 0 (verification harness) and Phase 1 (regional de-hardcoding) are complete,
browser-verified and pushed. **Phase 2 (hardcoded hex → tokens) was not started** — the
45-minute budget was spent. The hex count is unchanged at **233** and the CI step
correctly remains advisory (`continue-on-error` still present, as it must be at 233).

Merged to `main` and **deployed to production** at the user's explicit request:
Vercel deployment `dpl_7HoZPVDg9Nbsdzn4RLJQFu3oketh`, commit `d74f9b2`, state READY,
target production. Production domain `whats-good-nu.vercel.app`. Reachability was NOT
checked from this container and must not be — the agent proxy 403s every outbound URL
(§6). READY is Vercel's own report via the MCP transport.

`tsc --noEmit` DID complete this session, locally, exit 0 — the first clean local run
recorded. GitHub Actions is green on every pushed commit.

**One blocker remains and it needs a lever this session does not have:**
`VITE_GOOGLE_PLACES_KEY` is not set in the Vercel project as far as anything here can
tell, and no key exists to set. Without it there are no venues — the Find a Place tab
now says so explicitly instead of rendering a silent blank, and Stay In / Happy Hour /
Saved are unaffected. Setting that env var in Vercel and redeploying is what turns
venue discovery on.

## Objective

Build a harness that can actually see the app, then remove the Cape Town origin that was
still hardcoded through the product.

## What changed

**`verify/`** (new, committed; `verify/node_modules/` and `verify/out/` gitignored)

- `driver.mjs` — Playwright driver on the pre-installed Chromium, 390×844, `--no-sandbox`,
  locale `en-GB` / `Europe/London`.
- `fixtures/mealdb.mjs`, `fixtures/places.mjs` — TheMealDB and Google Places intercepted
  via `page.route`, answered with responses shaped like the real ones. Images are a 1×1
  PNG. Fixture venues span four countries on purpose.
- Output: `verify/out/<view>[-dark].png` plus `report[-dark].json` per run — scrollWidth
  vs innerWidth, first text element's left edge, hit-target probes, headings, console
  errors. Exit code 2 if any view is unreachable, so "it ran" cannot be read as "it passed".
- Hit targets use `document.elementFromPoint` probes, never rect heights.

**`src/` — Phase 1**

- No default city. `city` seeds to `''`; the header badge reads "Set location".
- `campusData.ts` → `venue.ts`. The 460-line South African venue array is deleted; only
  the (country-neutral) `Venue` interface remains. `SouthAfricanEatery` → `Venue`.
- `priceSymbol: 'R'|'RR'|'RRR'|'RRRR'` → `priceTier?: 1|2|3|4`. Rendered as a band
  (`●●○○`) by `formatPriceTier`, with `priceTierLabel` supplying words for `aria-label`.
  An unpublished price is now `undefined` and omitted, not silently "moderate".
- `currencyForCountry` deleted, not extended.
- `fetchCapeTownEateries` → `fetchVenues`; `city` is now a required argument.
- Venue coordinate fallback (Cape Town City Hall) removed.
- "Surprise me" on the dine-out tab re-runs the real search instead of rolling a die over
  the South African list.
- `EmptyState` no longer defaults `city` to `'Cape Town'`.
- `vite-plugin-pwa` removed from devDependencies. `public/sw.js` and
  `public/registerSW.js` untouched — they are the kill switch and must stay.
- `.tap-target` deleted from `index.css`; its three call sites in `RecipeView.tsx` now use
  `.hit-44`. `.tap-44` is a different rule and was left alone.

## Customer journey impact

**Trust** is the stage that moved. The header no longer asserts a city the user is not in,
the venue list no longer contains venues on another continent, and the price band no
longer wears a currency Google never published. **Recover** improved as a consequence: the
failure path is now the honest empty state rather than a plausible-looking wrong answer.
**Orient** shifted from confidently wrong to explicitly unset, which is one tap from right.

## Verification and actual results

Harness run against `vite` on :3000 with `VITE_GOOGLE_PLACES_KEY` set to a dummy value
(the key gate must pass before the app will call Places at all).

Light and dark, after Phase 1 — **6/6 views captured, 0 unreachable, 0 horizontal overflow**:

| view | scrollWidth/innerWidth | firstTextLeft | hit probe misses |
|---|---|---|---|
| find-a-place | 390/390 | 58.4 | 0 |
| stay-in | 390/390 | 58.4 | 0 |
| happy-hour | 390/390 | 58.4 | 0 |
| saved | 390/390 | 58.4 | 1 |
| recipe-detail | 390/390 | 58.4 | 2 |
| venue-detail | 390/390 | 58.4 | 2 |

- **Screenshots were read, not just measured.** Venue detail confirmed: header "Set
  location", London address, band `●●○○`, identity and actions present on first paint.
  Recipe detail confirmed rendering with real content. Dark mode compared against the
  Phase 0 baseline — palette identical, no change beyond the intended city/price strings.
- **The recipe detail page and the venue detail page had never been rendered in this
  container before this session.** Both now render.
- One console error per run: `net::ERR_FAILED` from the blocked `fonts.googleapis.com`
  stylesheet request. Pre-existing and unrelated to these changes — `index.html` preloads
  the font, and the harness blocks all unmocked external hosts.
- Parse checks (rung 1) pass on every modified file.
- **`tsc --noEmit` completed locally, exit 0.** `vite build` also passes (3.7s, 439 kB JS).
  GitHub Actions green on all pushed commits.
- **Re-run against a KEYLESS dev server** (production's actual configuration) found the
  real defect: 5/6 views, `venue-detail` unreachable because there are no venues at all.
  That path now renders a named explanation, confirmed by screenshot, instead of a
  generic empty state under a heading promising real places nearby.
- The three hit-probe misses are on detail pages where an adjacent control legitimately
  owns the neighbouring pixel. They were NOT "fixed" with padding (§11.3). Not
  individually confirmed — see risks.

## Protected decisions

- Price is a band, not a currency. Places publishes a 1–4 enum and no prices; a glyph
  would be decoration that reads as fact.
- No default city, ever. A seeded city is the bug, and a different seeded city is the
  same bug.
- `happyHourData.ts` stays Cape Town-only. It is human-confirmed, gated by
  `hasHappyHourData`, and the UI says so. A disclosed limit is not a hidden assumption.
- `verify/` deps stay in `verify/package.json`. playwright-core never enters the root
  `package.json` (§9).
- `verify/out/` is gitignored. Screenshots are regenerated per run, not source.
- The hex CI step stays `continue-on-error` while the count is above zero. Making it
  blocking at 233 would make the pipeline red on arrival and teach everyone to ignore it.

## Next session: first three actions

1. **Fix §13.3 item 1 — the `openNow` Trust defect.** `EateryView.tsx:70,72` and
   `RecipeView.tsx:563,564` render "Closed" when `openNow` is `undefined`, asserting an
   opening state Google never published. Compare `=== false` (as `App.tsx:596` already
   does) and omit the tile entirely when the value is `undefined` — an absent field is
   absent, never a placeholder (§8). Then lower the CI ratchet to 0.
2. **§13.3 item 2 — the five hardcoded bottom offsets.** `EateryView.tsx:486`,
   `RecipeView.tsx:446` and `:675`, `App.tsx:1129`, `index.css:207` all guess against
   `--tabbar-h`. One token, all sites; lower the ratchet as they go.
3. **Phase 2: hex → tokens**, highest-traffic first (`RecipeView.tsx`, `App.tsx`,
   `EateryView.tsx`); `RecipeView.tsx:253` alone hardcodes three values that have tokens.
   Add any missing token to both `:root` and `html.dark` first; do not change the palette.
   Lower the hex ratchet from 211 as you go — never raise it.

All three change `src/`, so all three need the full `/qa-gate` run in both modes, and a
§13.4 report naming what was still unchecked.

## Known risks and open questions

- **The rename was not typechecked locally.** `SouthAfricanEatery` → `Venue` and
  `priceSymbol` → `priceTier` touched `App.tsx`, `placesService.ts`, `venue.ts`,
  `EateryView.tsx`, `RecipeView.tsx`. Parse checks pass and all six views render, but a
  type error that does not affect these paths would not have been caught. CI is the gate.
- **`src/venueExtras.ts` still contains Rand-priced synthetic menu constants**
  (`PRICE_BANDS`, `'R60 espresso martinis'`). `getVenueExtras` is dead — no caller — but
  the data is still in the tree. Removing it was out of budget; it renders nothing today.
- **The Phase 0 vs Phase 3 comparison was same-session only.** Baselines live in
  `/tmp/phase0-baseline` and this container is ephemeral, so it cannot be re-run later.
  Consider committing a baseline set if visual regression matters.
- **The harness proves rendering, not correctness of live data.** Fixtures are shaped like
  the real APIs but are not them. Nothing here says the real Places response still parses.
- The `fonts.googleapis.com` request in `index.html` fails in any blocked environment.
  Harmless, but it makes every harness run report one console error.
