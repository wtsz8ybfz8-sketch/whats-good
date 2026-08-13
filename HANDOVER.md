# HANDOVER

## Status

**`claude/version-prototype-mismatch-fjqtrx` is at `375faae`, pushed.**

Not a hard stop. The work below is complete, browser-verified in both colour schemes at
three viewports, and typechecks and builds clean.

## Objective

The owner reported that the version on `main` still carried "the same remnants as the
original that I didn't like", having asked for it to be made identical to
`docs/design/occasion-prototype.html`. Establish what actually still differed — by
rendering both and comparing, not from memory — and close the gap.

## What changed

The diff was taken from side-by-side renders of `/` and `/next.html` at 390×844 and
1440×900, not from reading the source. Six structural remnants of the original were
found still standing, and all six are gone:

- **The bottom tab bar.** The prototype has ONE nav — a text-only segmented pill row
  under the header, at every width. The app had that pill on desktop only, inside the
  header, `hidden md:flex`; the phone still ran the original's icon tab bar fixed to the
  viewport floor. Desktop matched the prototype and the phone did not, which is exactly
  the half a desktop reviewer never sees. Both are replaced by one in-flow `page-grid`
  nav.
- **The fixed "Find a place" CTA.** Deleted. Selecting an occasion already called
  `onTriggerMatch`, so the bar restated a decision made one tap earlier and covered the
  bottom of the grid to do it. The typed path keeps the Search button inside the search
  pill, which is where the prototype puts it.
- **Hero copy.** All three strings were the original's. Now the prototype's: kicker is
  live context (`LONDON · 18:28 UTC`, via `Intl`, ticking, withheld entirely until a city
  resolves), headline is *What's **good** right now?*, sub is *Pick the occasion, or just
  tell us what you're after.*
- **The header.** Logo mark and italic terracotta "Good" removed — the accent was being
  spent twice on one screen, competing with the word it exists for in the H1. The black
  `Set location` slab became the prototype's neutral `.sel`; both icon buttons became its
  `.icb`; all three controls are now grouped right per `.hctrl`.
- **Order.** The period switcher now precedes the "The occasion" label. The label sat
  above the switcher, so it read as naming Morning/Midday/Evening rather than the grid.
- **Missing elements.** Added the parse line under the search (a receipt — every rule
  resolves to a `vibe` or `diet` the app can actually apply, and it fills only fields the
  user has not set by hand) and the refine block's hold-back until an occasion is picked
  (`inert`, not opacity alone).

Two behavioural fixes fell out of the above:

- **The panel no longer collapses on selection.** It did, which meant the whole visible
  response to tapping an occasion was the panel vanishing — the selected tile's accent
  fill and the refine block un-dimming, both designed as the confirmation, were never
  seen by anyone.
- **`--tabbar-h` is 0 at every width.** The token stays because EateryView and
  RecipeView's docked bars derive from it; zeroing it collapses all of them to
  `env(safe-area-inset-bottom)` in one edit.

## Customer journey impact

**Orient** and **Express intent** moved most. One nav instead of two models, a hero that
says where and when you are instead of a tagline, and a single primary decision with the
refinement held back until it has been made. **Choose** improved by accident of the
collapse fix: the selection is now visibly acknowledged.

**Trust** and **Recover** are untouched. Nothing here invents a venue fact — see the
Nearby chips under Known risks for the one place that was declined on those grounds.

## Verification and actual results

- **`verify/checks.mjs`: 56/58, 0 skipped.** The two failures are `?tab= opens that tab`
  and `scaled chip colour comes from the accent token`.
- **Control run on `main`, stashed, before drawing any conclusion: 57/59, and the SAME
  two failures.** Both are pre-existing and neither is caused by this work. The count
  differs because two checks were removed and one added (below).
- **`tsc --noEmit`: exit 0.** It completed this session, which is unusual for this
  machine (§6). It caught one real error — a `Dimensions` literal missing the new `area`
  field — which is now fixed.
- **`npm run build`: exit 0**, 2091 modules.
- **Looked at, not just measured:** 390×844 light and dark, 844×390, 1440×900, each as a
  screenshot that was read. Plus a run with Places fixtures and a resolved city, so the
  results state and the selected-tile accent were seen rather than assumed.

**Two defects were found by looking and would have shipped otherwise:**

1. The new nav rendered at `top: 20` — entirely underneath the 72px fixed header.
   Present, painted, invisible. The clearance had to be margin, not padding, or the
   element's own box still began at 0.
2. Tapping an occasion reflowed the page by 21px, which the chrome-retraction logic read
   as deliberate downward travel and hid the header on the user's first action.
   `syncChromeBaseline` already existed for exactly this class of event; the results swap
   was simply never wired to it.

**Harness changes, declared because they gate this work:**

- Removed `action bar sits flush on the tab bar` and `chrome stays flush at a simulated
  34px inset`. Both were `gap === null || gap === 0`, so with both bars deleted they
  would have reported PASS forever while measuring nothing — §13.2's "check that cannot
  fail". Removed rather than silenced.
- Added `primary nav clears the fixed header and is hit-testable`. **Its first version
  was itself a check that could not fail** — it asserted `top >= 0` and passed while the
  nav was buried under the header. It now measures against the header's real bottom edge
  and hit-tests a point inside the nav. It has been observed RED twice (at `top=0` and
  `top=67`) and green at `top=88`, so it is known to be capable of failing.
- The suite's start trigger was the "Find a place" button. It now taps the first
  `.occasion-grid` tile — the way a user starts a search. A first attempt used a bare
  `[aria-pressed]`, which matched the period switcher and silently searched nothing.
- The scroll-restore check scrolled to a hardcoded 400px; it now derives the offset from
  the first card. It was skipping on a "fixture gap" that did not exist.

**NOT verified:** iOS Safari anything; real Places responses (fixtures only); the parse
rules against real phrasing; screen-reader pass; deployment reachability (§6 — the proxy
403s everything, so this cannot be checked here).

## Protected decisions

- **Cream stays retired**; palette untouched by this work.
- **One nav, in flow, at every width.** Do not reintroduce a fixed bottom tab bar.
- **No Search button between intent and results.** The occasion tap is the query.
- **The accent is spent once per screen.** That is why the wordmark is plain.
- **The decision panel stays open on selection.**

## Next session: first three actions

1. **Decide the Nearby chips.** The UI and the query path are built in `Sidebar.tsx` and
   render the moment `areas` is passed; nothing passes it. Places `addressComponents`
   carries `sublocality`, which is the honest source. This is a data-layer change.
2. **Fix the two pre-existing failures** — `?tab=` deep link and the scaled-chip colour
   assertion. Both predate this work; the chip check reports `rgb(200, 55, 28)`, which
   *is* `--accent-terracotta`, so suspect the check before the code (§13.3).
3. **Consider inverting the desktop sticky column.** The prototype makes the RESULTS
   column sticky and lets the decision column scroll with the page; the app does the
   opposite, so the occasion grid scrolls inside a 764px sticky scroller at 1440×900.
   Pre-existing, deliberate-looking, and not touched here.

## Known risks and open questions

- **The Nearby chips are the one prototype element deliberately not shipped.** The
  prototype hardcodes six neighbourhoods per city for four cities. This app resolves any
  city on earth, and its only `areas` state is TheMealDB's *cuisine* list — wiring that
  in would have labelled "Italian" a neighbourhood of Cape Town. Declined under §8.
- **Occasion tiles render an empty neutral frame** where photography goes. Honest, but on
  a light background it reads as a blank card. The curated image set (§7) closes this;
  until then the grid is emptier than the prototype looks.
- **The docked bars in EateryView and RecipeView are now the only viewport-floor geometry
  in the app, and nothing in `checks.mjs` measures them.** The two checks that used to
  live near this area measured the browse surface only. Real gap, recorded not papered.
- **`App.tsx` remains un-audited as a whole** despite heavy edits here.
