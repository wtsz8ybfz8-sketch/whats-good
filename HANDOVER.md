# HANDOVER

> Written to be picked up by someone who has never seen this project. Read `CLAUDE.md`
> §1 for what the product is; this file is only live state.

## Status

**`main` is at `55a702b`, pushed, GREEN.** `verify/checks.mjs` **54/54, 0 skipped, exit 0**;
`npm run build` exit 0. Working tree clean. No dev server running.

**Live, public, no login: https://whats-good-git-main-nizzle-s-projects.vercel.app**
Vercel deploys `main` on push. Custom domains bypass auth entirely, so a purchased `.com`
pointed at this project is public from the first minute.

**Vercel Authentication (SSO) is OFF** (`ssoProtection.enabled: false`), set deliberately
so the app could be shared. **Turn it back on before this holds anything private.**

**THE FINDING THAT OUTRANKS EVERYTHING ELSE HERE.** Every capture this project takes —
`checks.mjs` and the iOS workflow both — photographs the page **at rest**. The user found
a defect on three separate screens that 52 green checks could not see: page content drawn
over the status-bar clock, above the app's own fixed header. That strip only opens after
Safari collapses its URL bar, which only happens after a **scroll**. A suite that never
scrolls can be entirely green while the app is visibly broken in the hand. It was.
`verify/ios-server.mjs` now honours `?__scrollY=`; `ios-safari.yml` captures scrolled
states. **Do not trust an at-rest result about chrome.**

## Objective

Ship a shareable, honest, functional build before a domain purchase, and find the cause of
the header defect the user had been reporting for several sessions.

## What changed (newest first)

1. **`c4da169` — the scrolled capture now reaches the condition it tests.** The first
   scrolled run worked mechanically and proved nothing: CI has no Places key, so the pages
   were barely taller than the viewport, Safari's URL bar stayed expanded (visible in the
   screenshots) and the strip never opened. `ios-server.mjs` pads the document so the
   requested scroll is reachable; the workflow asks for 1400px. Measured: scrollY 1400 in
   a 3592px document; control untouched at 0 / 1292px. Inert without the param.
2. **`856dc6d` — a fixture that can say "Google published no price", plus a check.**
   `priceLevel` defaulted a band onto every fixture venue, so the no-price path was
   unreachable. `null` now means absent, `pl-6` carries none, and a check fails when any
   "at a glance" tile is a label over nothing.
3. **`14730c6` — the header bleed, and three false claims.** See below.
4. **`6c08cc0` — theme-color precedence check + five process rules in `CLAUDE.md` §6/§12.**
5. **`590055a` — the result-backed cuisine count shipped.** Rail title reads "Cuisine —
   optional · N in these results", derived from venues already fetched, omitted at zero.
   **The per-chip availability dot is NOT shipped** — see Risks.
6. **`9aab341` — eleven unmerged commits reached `main`.** All of
   `claude/branch-comparison-merge-plan-xtv9e1`: chrome retraction on scroll, list-state
   restore on back/forward, rating counts and weekly hours, the "why this place" decision
   layer, un-squished venue actions, no phantom phone numbers. **Production had never
   served any of it** — the user reported these as regressions; they were unmerged work.
7. **`f376a2d` — the black band at the Dynamic Island.** A browser uses the FIRST
   `theme-color` whose media matches. `App.tsx` maintained a live one driven from the
   manual dark class and `appendChild`d it to the END of `<head>`, where the media-keyed
   tags always beat it — a no-op for the only case it existed for. Now `prepend`ed.
8. **`ee70b25` — PWA installability.** Manifest + 192/512/maskable/apple-touch icons from
   the existing header mark. Icons live under `/assets/` because `vercel.json` rewrites
   every other path to `/`; `-vN` filenames because that directory is immutable for a year.

### The header bleed (`14730c6`) — the main event

Page content rendered **above the fixed header, into the status bar**: the cuisine rail
over the clock, and on venue pages the address and the venue name. Cause is Safari's, not
this layout's — `position: fixed; top: 0` anchors to the LAYOUT viewport; when Safari
collapses its URL bar the VISUAL viewport grows upward and the page paints the strip that
opens between them. Apple developer forum threads **800798** and **773770**;
**mastodon#36144** is the identical report.

Fix: `.chrome-bar::before` carries an opaque 240px fill upward. It travels with the bar, so
a retracted header still uncovers correctly. **This is a MITIGATION** — it paints over the
strip, it does not stop the strip opening.

Three claims in the same commit that were not true:
- **"updates every minute"** sat above `CAPE_TOWN_HAPPY_HOURS`, a static hand-curated
  array. Nothing about the listings updates. Now "hand-confirmed venues · live status".
- **The Spend tile** was the only one of three built ungated; `priceTierLabel` returns `''`
  with no band, so it rendered as a heading over empty space.
- **`city = 'your area'`** was a default placeholder, so a phone whose header read
  "Cape Town" was told "25 eateries near your area".

## Customer journey impact

**Trust** above all: the headline count matches the grid, no tile is a label over nothing,
no caption claims live data over a static file. **Orient**: the chrome no longer disagrees
with the app's theme and content no longer bleeds into the status bar.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite | `node verify/checks.mjs` | **54/54, 0 skipped, exit 0** |
| Build | `npm run build` | **exit 0** |
| Header-fill check CAN fail | remove the fill | **✗ `bg rgba(0,0,0,0)`**, ✓ on restore |
| Empty-tile check CAN fail | ungate Spend | **✗ `empty: Spend, Spend, Spend`**, ✓ restore |
| theme-color check CAN fail | `prepend`→`appendChild` | **✗ exit 1**, ✓ on restore |
| Scroll injection | `?__scrollY=1400` vs control | **1400 / 3592px vs 0 / 1292px** |
| iOS Simulator capture | `ci/ios-shots`, 11 PNGs | all hashes distinct — genuine |
| Device probe | `PROBE.txt` | 402×678, dpr 3, vh 760 / dvh 678, insets all 0 |
| `tsc --noEmit` | — | **NOT RUN locally.** CI runs it on every push. |

**Insets read 0 in Safari portrait and that is CORRECT** — Safari's toolbar owns that
space. They are non-zero only in the installed home-screen app (top 59px, bottom 34px).

## Protected decisions

- **The live `theme-color` must stay FIRST in `<head>`.** Appending it is a silent no-op.
- **The header's upward fill must stay.** Nothing local can fail the bug it mitigates.
- **No new Places requests.** The cuisine count derives from venues already fetched.
- **A fixture must be able to express ABSENCE.** Two defects reached a real device this
  session because a fixture default made the missing-data branch invisible to every check.
- **Icons stay under `/assets/` with `-vN` filenames.**
- **`ci/ios-shots` is how to see this app on iOS.** `git fetch origin ci/ios-shots`,
  extract the PNGs, **look at them**; `md5sum` first — runs 4–7 were all the same screen.

## Next session: first three actions

1. **Read `ci/ios-shots/light-find-scrolled.png` from the run on `c4da169`.** It is the
   first capture that should actually collapse Safari's URL bar. **If the strip is still
   open**, the fill is not the answer and the next lever is pinning the header to the
   `visualViewport` API rather than the layout viewport. Do not guess without a scrolled
   screenshot in hand.
2. **Give `happyHourData.ts` a `lastVerified` date per entry and render it.** The listings
   are hand-curated with no freshness signal at all, so a venue that closed last month
   still shows with full confidence. Highest-cost remaining truthfulness gap.
3. **Restore the per-chip cuisine availability dot.** It needs `relative` on the chip
   button — Tailwind `sr-only` is `position: absolute` and escapes an unpositioned parent,
   which made a chip's hidden label intercept clicks on a venue card elsewhere in the
   layout — or move the text off the accessible name with `aria-describedby`. Add a check.

**How to debug this suite, learned the hard way:** run it to a file and read the tail
UNFILTERED. Grepping for `✗|Error` hides every `✓`, so the last passing check is invisible
and the failure looks like it happened somewhere it did not. Three hypotheses were
"disproved" that way and all three conclusions were worthless. `grep -c "✓\|✗"` gives the
check number it died on; `main` alone is the control, and it is one command.

**Exact starting point:**
```bash
cd /home/user/whats-good && git checkout main && git pull origin main
npm install && npm --prefix verify install
node verify/serve.mjs up && sleep 5
cd verify && NO_PROXY='*' node checks.mjs > /tmp/full.log 2>&1; echo "EXIT: $?"
grep -c "✓\|✗" /tmp/full.log; tail -20 /tmp/full.log
cd .. && node verify/serve.mjs down          # ALWAYS
```

## Budget, sharing, and what it costs — read before inviting anyone

**USAGE LIMITS ARE A HARD CONSTRAINT UNTIL SUNDAY.** Changes must be small, verified in
one pass, and committed. Do not start speculative refactors, broad audits, or repeated
browser loops. One diagnosis, one focused change, one proportionate check (CLAUDE.md §2).

**Can 80 people use this? Yes, and it is very likely free — but only because of a trial
credit that is running out.** Arithmetic from the user's own Cloud Console export (July,
confirmed): Text Search Enterprise $35/1000 after 1,000 free/month; Place Photos $7/1000
after 1,000 free/month. The app fires **2 Text Search calls per user search** and roughly
**5 photos per rendered card**.

- 80 people × 5 searches ≈ 400 searches → ~800 text calls (inside the free 1,000, **$0**)
  and ~4,000 photos (3,000 billable ≈ **$21**).
- 80 people × 20 searches ≈ 1,600 searches → ~3,200 text calls (≈ **$77**) and ~16,000
  photos (≈ **$105**). About **$180**.

$123.10 of free trial credit remained at the July export, expiring **15 September 2026**.
A launch-weekend demo lands inside it. Sustained use does not.

**The uncapped risk is the real one.** Both API keys are unrestricted — no application
restriction, no API restriction, no daily quota. A leaked or scraped key has no ceiling,
and the key is visible in the page: `getPlacePhotoUrl` embeds it in every photo `<img>`
URL. **A budget alert only warns. Only a per-API daily QUOTA caps spend.** This is
console-side and only the account owner can do it.

## Known risks and open questions

- **The header fill has not been confirmed on a device.** A run is queued on `c4da169`;
  until those PNGs are read it is correct-by-specification and nothing more.
- **Google cost is UNCHANGED by this session.** Still two Text Search calls per search;
  photos are still ~57% of the bill per the user's own billing export (15,426 photo
  requests, $100.98, July). `userRatingCount` added by the merge is Enterprise-tier, which
  was already being paid — no SKU escalation. **Nothing here reduced spend.**
- **API keys are still unrestricted.** Two identical keys, no application restrictions, no
  daily quota. A budget alert warns; only a **quota** caps volume. Console-side, user only.
- **You cannot share a link to a specific restaurant or recipe.** `App.tsx` uses
  `pushState(state, '')` — the venue id lives in history state, the URL never changes.
  Buildable: Place IDs are stable and are the one thing Google's ToS permits storing.
- **The cuisine count may UNDER-report on live data.** Matching is exact-string, so
  Google's "Hamburger restaurant" does not match the baseline chip value "Burger". It can
  never over-claim, so it stays truthful, but the real number may be higher.
- **The PWA icons have never been observed served.** Verified present in `dist/` and that
  `vercel.json` exempts `assets/`; never seen served. Open `/manifest.webmanifest` on the
  live site — JSON means correct, the app's HTML means the icons are dead.
- **`kqu3fy` (4 commits) and `rz1d3f` (5) remain unmerged.** `kqu3fy` has **7 conflicts**,
  5 in real source, because it re-solves rating data a second way against `xtv9e1`'s
  version. `rz1d3f` conflicts only in docs but deletes `verify/devices.mjs`.
- **CI has no Places key**, so every venue surface in CI renders "Google turned the search
  down". A harness fact, not an app defect — but CI cannot exercise a venue-data path
  without fixtures.
- **Happy Hour is Cape Town only, by construction.** `HAPPY_HOUR_CITY = 'Cape Town'` and
  `CAPE_TOWN_HAPPY_HOURS` is the only dataset; any other city resolves to `not-covered`
  and renders an honest empty state. A New Yorker gets a permanently empty tab — truthful,
  but dead weight. `HappyHourView.tsx:142` also shows Cape Town data when the city is
  unknown, captioned "You are seeing Cape Town because we do not know where you are yet";
  that caption is doing a lot of work and should be re-read before launch. Adding a city
  means adding a curated dataset by hand — Google publishes no happy-hour data at any tier.
- **A New Yorker can now use this.** `formatDistance` hardcoded `unit: 'kilometer'` and was
  fixed in `55a702b`: US/GB/LR/MM get miles, everywhere else kilometres. Everything else
  already derived from `navigator.language`. The one thing still Cape Town-shaped is
  Happy Hour, above.
- **`tsc` has not run locally this session.** CI runs it on every push.
