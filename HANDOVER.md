# HANDOVER

## Status

Phase 0 (verification harness) and Phase 1 (regional de-hardcoding) are complete,
browser-verified and pushed. **Phase 2 (hardcoded hex → tokens) was not started** — the
45-minute budget was spent. The hex count is unchanged at **233** and the CI step
correctly remains advisory (`continue-on-error` still present, as it must be at 233).

Pushed to `claude/verify-harness-regional-fixes-mkvr84`, **not `main`**. The session's
branch policy names that branch and forbids pushing elsewhere without permission; the
request said main. Merging to main is one PR away and is the user's call.

Local typecheck was NOT run — see Verification.

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
- **`npm run lint` / `tsc --noEmit` was not run** — the budget did not allow for a check
  that routinely exceeds seven minutes here. Not a pass and not a failure. Read the
  Actions tab for the pushed commits; that is where the real type gate lives.
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

1. Run `cd verify && npm i && NO_PROXY='*' node driver.mjs` (dev server on :3000 with
   `VITE_GOOGLE_PLACES_KEY` set to anything) to re-establish a baseline before touching
   anything.
2. Phase 2: migrate hardcoded hex in `src/**/*.tsx` to tokens, highest-traffic components
   first — `RecipeView.tsx`, `App.tsx`, `EateryView.tsx`. Add any missing token to both
   `:root` and `html.dark` first; do not change the palette. Re-run the harness in
   **both** modes and compare against the baseline. Delete `continue-on-error` from
   `.github/workflows/ci.yml` only when the count is 0.
3. Check CI on the pushed commits for type errors — the `Venue` / `priceTier` rename
   touched five files and was never typechecked locally.

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
