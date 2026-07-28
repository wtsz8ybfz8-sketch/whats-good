# HANDOVER

## Status

**`claude/codebase-analysis-priorities-h4cvnv` is at `6643499`, pushed.** Working tree
clean, no dev server running. Not merged to `main`; no PR opened (none was asked for).

`verify/checks.mjs` **46/46, 0 skipped, exit 0** on chromium (43 before this session; the
three new ones are the venue-action checks below). `npx tsc --noEmit` **exit 0 — it
completed this time**, in contrast to the usual local timeout. `npx vite build` exit 0.
`driver.mjs` 6/6 views light and dark, 0 unreachable, 0 console errors.

**`VITE_GOOGLE_PLACES_KEY` in Vercel — still CONTESTED, do not repeat either claim as
fact.** An earlier handover asserted flatly that the key was unset; a later session
reported having loaded the production URL, filtered 30 → 25 results and opened a venue
page with real hours. Neither is checkable from this container — **every outbound URL
403s here** (§6). Resolve it by opening the deployed Find tab on a real device, then
write down the answer *and how it was obtained*.

**No iOS run has yet executed against `b6027f9`'s geolocation fix.** Unchanged from the
previous handover: every iOS capture (runs 4–7) showed Safari's location prompt covering
the app, and two "different tabs" were byte-identical. The fix is in; it has never run.

## Objective

Act on a user-supplied codebase analysis. The user selected one item of the six: the
labels that promise more than the data supports. The handover-drift item was handled as
process work under a standing instruction not to leave future sessions hindered.

## What changed

**1. The Call pillar is gated on a real number.** `EateryView.tsx` rendered it
unconditionally, so a venue with no published phone got `href="tel:"` and
`aria-label="Call "` — an action that cannot act, with an empty accessible name. The
mobile CTA bar 280 lines below was already gated correctly; only the pillar was not.

**2. A Google Maps search URL is no longer labelled "Official website".**
`placesService.ts` falls back to `google.com/maps/search/<name>` when Places publishes no
`websiteUri` — a fair destination, but not the venue's site. It was labelled "Official
website" and "See the full menu and photos". `Venue.hasOwnWebsite` is now set only when
Places returned a site, and both render sites branch on it: the action reads
**Website / "See the full menu and photos"** with a real site and **Maps / "Open in
Google Maps"** without one. Venues saved to localStorage before the field existed read
the destination URL instead, since defaulting them to "no site" would mislabel a real one.

**3. The fixture can now express absence.** `verify/fixtures/places.mjs`'s `place()`
defaulted a phone and a website onto every venue, so both branches above were unreachable
from the suite. It honours `null` as "Places published no such field", and **`pl-6`
Hoxton Steam Buns** is the thin listing Places returns constantly — an address and
nothing else. Three new checks ride on it.

**4. HANDOVER.md's commit hash is stamped, not typed.** `verify/handover-commit.mjs`
with `--stamp` and `--check`; `npm run handover:stamp` / `handover:check`. CI runs
`--check` (and now checks out full history, which the ancestry test needs). It **fails**
when the named commit does not exist or is not an ancestor of HEAD, and **warns** when
code landed after it — a passing rule cannot demand the handover name the commit that
carries it. `--strict` fails on that too, for a pre-push gate. CLAUDE.md §10 documents it.

## Customer journey impact

**Trust**, and **Act**. A label that overclaims its destination is the same category of
failure as an invented fact — it is just cheaper to miss, because tapping is what
disproves it. A dead Call button is an Act-stage promise the page cannot keep. Nothing
else moved; no stage regressed.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite | `NO_PROXY='*' node checks.mjs` | **46/46, 0 skipped, exit 0** |
| The three new checks, **red first** | same suite, `src/` stashed | **43/46 — 1 tel: link, "Official website" present, no Maps wording** |
| Handover check catches real drift | `--check` before the fix | **⚠ named `b6027f9`, 1 later commit changed code** |
| Handover check, bogus hash | hash edited to `deadbee` | **exit 1** |
| Handover check, `--strict` | `--check --strict` | **exit 1** |
| Typecheck | `npx tsc --noEmit` | **exit 0, completed** |
| Build | `npx vite build` | **exit 0** (`BUILD_EXIT` read directly, not through a pipe) |
| Views rendered | `driver.mjs`, `--dark` | **6/6 each, 0 unreachable, 0 console errors** |
| Phoneless venue, **looked at** | scratch script → PNG, light + dark | **DIRECTIONS + MAPS only, no Call; "Open in Google Maps" renders** |

**Not checked, in those words** (CLAUDE.md §13.2): the labels were verified in headless
Chromium at 390px, which says **nothing about iOS Safari**. `hasOwnWebsite` on legacy
saved items was reasoned about and unit-tested by nothing — the URL-shape fallback has no
check because the fixture cannot produce a pre-migration localStorage entry. And no
machine can fail the rule this change is really about — "never state a venue fact you
were not told"; the three new checks cover these two labels only.

## Protected decisions

- **`hasOwnWebsite` is authoritative when present, inferred only when absent.** A venue
  could legitimately publish a Maps link as its own site; the flag must win over the
  URL-shape guess.
- **The fixture's `null` means "Places published no such field".** Distinct from an
  omitted option. Do not "simplify" it back to `??` defaults — that is what made both
  branches untestable.
- **The handover check warns, not fails, on later code commits.** Failing would make CI
  red on every code push until a second commit landed. Deliberate; `--strict` exists.
- Carried forward: `browser.mjs` never falls back (exit 3); declare font faces by hand;
  `font-display: optional` + preload together; `/fonts/*` immutable with stable
  filenames; `.safe-x` composes and never replaces; iOS CI does not `cancel-in-progress`;
  say "WebKit" / "iOS Simulator", never "iPhone"; no `openNow` ratchet; never a bare
  `npx vite`; §7 is decided; never state a check count from prose.

## Next session: first three actions

1. **The analysis's item 2, still open and the most operationally expensive:** every
   venue search fires two Places text-search requests (`placesService.ts`, deliberate —
   the API caps at 20 results per call), and `App.tsx:572` awaits them in an effect with
   **no `AbortController`, no request-generation counter and no debounce**. A slow first
   response can overwrite a fast second, and rapid filter changes multiply API calls
   against a metered key. Fix the cancellation and the stale-write ordering; keep the two
   queries.
2. **The analysis's item 3:** `searchTextOnce` returns `[]` on `!response.ok`,
   `fetchVenues` catches everything to `[]`, and `App.tsx` catches again — so an invalid
   key, a 429 quota, a disabled API and a genuine zero-result search are indistinguishable
   at the UI. Return a discriminated result and let `StatusStates` tell them apart. Note
   this also means the app currently cannot distinguish a real quota failure from **this
   container's proxy 403**.
3. **Trigger `ios-safari.yml` and read the PNGs** — `md5sum` the four light tabs first;
   if any two match, the tabs are still not navigating and a green tick means nothing.

## Known risks and open questions

- **The venue enrichment model is undefined and is the actual product gap.** The analysis
  is right that the page is thin, but the framing "the fields are intentionally empty"
  understates why: they were filled with strings built from the venue's own name, and
  deleting that was correct. The gap is a missing *source*, not a missing permission.
  **The cheapest truthful source is already available and unused:** the Places field mask
  in `placesService.ts` does not request `editorialSummary`, `reviews`, or the attribute
  booleans (`servesVegetarianFood`, `outdoorSeating`, `goodForGroups`, `servesBreakfast`).
  Those are venue-specific, sourced, and would need no invention. Decide the content model
  before writing render code.
- **Directions and Maps are near-neighbours on a phoneless venue.** Both go to Google,
  one to turn-by-turn and one to the listing. Defensible — they answer different
  questions — but it is two of three actions pointing at the same app. Product call, not
  made.
- **CLAUDE.md is 668 lines** and the analysis is right that it costs context every
  session. It was **not** split this session: most of the bulk is §13's ledger and the
  trap list, which is the part that has actually prevented regressions, and splitting it
  wrong would strand the reason each rule exists. If it is split, move the incident
  detail to a referenced file and delete none of it.
- **The venue hero has no photo fallback** — a flat pink→black gradient over most of the
  first screen. Seen again this session in the `pl-6` capture, which has no real photo:
  name, address and both actions are present and correct on first paint, on that slab.
- **`ci/ios-shots` is force-pushed and orphaned every run.** Never put anything there you
  want to keep.
- **Hex ratchet is 71**, unchanged this session.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
