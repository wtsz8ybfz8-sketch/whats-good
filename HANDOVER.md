# HANDOVER

## Status

**`main` is at `1b0a618`, pushed.** Uncommitted work in the tree — see "What changed";
nothing committed this session (§4). No dev server running.

**Do not trust a local `origin/main` ref in this container.** It was stale at `5fa9c12`
and `git fetch origin main` did NOT move it — the git proxy served a cached view. Both
`git ls-remote` and the GitHub API said `1b0a618`. Establish `main`'s SHA from one of
those two, never from `git log origin/main`. A whole set of premises this session started
from — "the fix is on the feature branch but not main", "the emulation merge still needs
doing" — came from that stale ref and were wrong.

`claude/ios-verify-branches-kqu3fy` **does not exist on the remote**; locally it points at
exactly `1b0a618`, i.e. the same commit as `main`.

`verify/checks.mjs` **52/52, 0 skipped, exit 0** on chromium (up from 43 — nine new venue
detail checks). `tsc --noEmit` exit 0. `npm run build` exit 0. `driver.mjs` 6/6 views,
0 unreachable, 0 console errors, light and dark.

**The iOS screenshots are readable from this container, and reading them is how both
capture bugs were found.** `git fetch origin ci/ios-shots` then `git show FETCH_HEAD:<f>.png`
into a scratch dir and Read the PNG. This works — done again on 2026-07-28.

**Runs 2–7: the location prompt.** Safari's "Allow this website to use your location?"
fired on first load and swallowed the tab navigations underneath. Fixed at the app in
`b6027f9`, and that fix is **confirmed working** — run 11 shows no prompt.

**Run 11 (`1b0a618`) is green, has a full artifact set, and verifies almost nothing.**
Two further harness bugs, both found by hashing then *reading* the PNGs:

1. **The tab slugs do not exist.** The workflow looped `find stay-in happy-hour saved`;
   `src/App.tsx` validates `?tab=` against
   `['mood','happy-hour','random','saved-recipes','saved-eateries']` and deliberately
   falls back to `mood` for anything else. Only `happy-hour` was real, so six of eight
   captures were the Find tab under another filename and `light-stay-in.png` /
   `light-saved.png` came out byte-identical *again* — same symptom, entirely different
   cause from runs 2–7. The app was correct; the harness asked for tabs that do not exist.
2. **The dark pass was never dark.** Appearance was switched under an already-running
   Safari, so live web content never repainted. All four "dark" PNGs show the app in light
   mode with only Safari's chrome dimmed, and `PROBE.txt` reports `"scheme":"light"` twice.

**The md5 check passed the dark set while all four showed the same wrong screen** — eight
unique hashes across nine files. Hashing catches byte-identical siblings and nothing more;
the status-bar clock alone makes two frames of one wrong screen differ. **Hash, then look.**

**`VITE_GOOGLE_PLACES_KEY` in Vercel — status CONTESTED, do not repeat either claim as
fact.** This handover previously stated flatly that the key was unset and that setting it
was the one remaining user action. A later session reported the opposite: that it had
loaded the production URL, applied a cuisine filter (30 → 25 results) and opened a venue
detail page with a real address, hours and working Directions/Call/Website buttons. Real
venues cannot render without the key, so that report, if grounded, means the key is live
and this line was stale.

Neither claim is checkable from the agent container: **every outbound URL 403s here**
(§6), so no session running without a browser connector can confirm or refute it. Resolve
it by opening the deployed Find tab on a real device — venues means live, the
missing-configuration state means unset — and only then write the answer down here.

## Objective

Stop inferring what this app looks like on the user's phone. Build a channel that shows
it, and fix what looking actually revealed.

## What changed

**1. WebKit renders and measures this app.** `verify/browser.mjs` — the harness selects
an ENGINE (`PW_ENGINE=chromium|webkit`), not a binary. WebKit cannot be installed in this
container (the proxy blocks the Playwright CDN, re-confirmed 2026-07-28); a GitHub runner
installs it in seconds. An absent WebKit or an unknown engine **exits 3**; it never falls
back to Chromium.

**2. Real Mobile Safari, on a real simulated iPhone.** `.github/workflows/ios-safari.yml`
runs the production build in the **iOS Simulator** on a `macos-15` runner and captures
Safari's own framebuffer — 4 tabs x light/dark, plus `verify/safe-area-probe.html`.
Actions minutes are unmetered for public repos on all runner types. **If this repo goes
private, macOS bills at 10x** — drop the push trigger and keep `workflow_dispatch`.

**3. The logo was touching the screen edge.** `.safe-x` *replaced* the horizontal padding
of the header and tab bar instead of adding to it. It is **unlayered CSS, and unlayered
always beats `@layer utilities`** whatever the specificity or source order — so the
header's `px-6` was discarded and the winner was `max(0px, env(safe-area-inset-left))`,
which is **0 on any phone in portrait**. Measured before the fix at 393x852: header
`padding-left: 0px`, logo left edge `x=0`. Now a floor, not a competitor:
`max(var(--safe-gutter), env(...))`.

**4. The typeface was never loading.** It came from `fonts.googleapis.com` at runtime.
Now self-hosted from `public/fonts/`, `font-display: optional`, **preloaded**.

**5. `--dusty-blue` deleted** — a second, cooler accent on exactly one control (the
venue page's Website icon), with no `html.dark` value. `--blue-light` was referenced
nowhere at all.

**6. `verify/serve.mjs up` was broken on every fresh clone** (ENOENT — `verify/out/` is
gitignored and the log file was opened before the directory existed).

**7. The app no longer asks for location when the link already named a city** (`b6027f9`,
`src/App.tsx`). `requestUserLocation()` ran unconditionally on first load, including when
`?city=` was present — and `?city=` already wins over every other city source, so the
position was requested and then discarded, at the cost of a permission dialog over the
first screen a user ever sees. The explicit "Sort nearby" control is untouched
(`userInitiated`). Correct on its own merits; it also unblocks the iOS capture, which
loads `?tab=…&city=London`.

**8. `simctl privacy deny location` was tried and does NOT work** (`7d667ea`, reverted in
`b6027f9`). It governs Safari's *own* location access; the per-site web prompt is a
separate permission. A note in `ios-safari.yml` says so — do not re-add it. This was
committed with a confident message claiming it worked, before any run had been read.

**9. UNCOMMITTED — the Places data model, the detail card, and the iOS harness.**
All in the working tree, nothing committed (§4).

- `ios-safari.yml`: real `?tab=` slugs via `FILE=SLUG` pairs; Safari terminated before the
  appearance switch and relaunched, plus a dark probe capture; and a **new step that fails
  the run if any two captures are byte-identical**. Not executed — only a macOS runner can.
- `placesService.ts`: field mask gains `editorialSummary`, `userRatingCount`, the six
  `serves*` meals and eight service attributes. **These are the Enterprise + Atmosphere
  SKU — this raises the per-request cost of every text search**, and `fetchVenues` makes
  two per cycle. It is the one thing here worth a second opinion on cost.
- **Diversification, at no extra request cost.** Query phrasings are now a pool of six,
  rotated two-at-a-time per cycle by a module-level counter (deterministic on first load,
  so the harness is stable; advances on every "Find other eateries"). Result sets are
  **interleaved rather than `.flat()`-ed** — concatenation put all 20 results of query one
  ahead of query two, so under any downstream cap the second query was billed for and
  never seen. That, not the phrasing, was the "same ten restaurants" bug.
- **`rating` is now optional.** It was `place.rating ?? 4.0`, which gave every unrated
  venue a 4.0 and rendered it beside a star as earned — an invented fact that also fed the
  sort. Both render sites are guarded, with their separators.
- `EateryView`: "What Google says" (attributed, absent when Google has none), "Good to
  know" (confirmed meals + attributes, `=== true` only), and a full-week hours `<details>`
  rotated so today is first. Native `<details>`, not `useState` — the component early-
  returns above, so a hook there would sit after a conditional return.
- `verify/fixtures/places.mjs`: **the five venues are deliberately uneven** — one fully
  profiled, one with explicit `false` values, one with no rating at all, one attributes-
  only, one bare. A fixture where every venue has every field can only exercise the happy
  path and could never fail a fallback bug.

## Customer journey impact

**Orient** and **Trust**. First paint is now the app's own typeface rather than the
system sans re-wrapping into it, and the two chrome surfaces no longer hug the bezel —
between them, most of what read as unfinished on the first screen. **Act**: the venue
page's three actions are one visual set.

**Trust**, again, and this is the one that matters in item 9. The detail page now carries
Google's own summary, confirmed meals, service attributes and the whole week's hours —
every one of them a real field, attributed, absent when unknown. And it stops asserting a
4.0 rating for venues nobody has rated. **Explore**: the week's hours open in place
without leaving the page.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite (chromium) | `node verify/checks.mjs` | **52/52, 0 skipped, exit 0** |
| Regression suite (WebKit, CI) | `PW_ENGINE=webkit` | **38/38** (run 30331903951, pre-dates the 9 new checks) |
| Build | `npm run build` | **exit 0** |
| **New checks CAN fail** | reintroduced the bugs, re-ran | **3 went red, exit 1** — unguarded star + invented summary |
| **Tri-state check CAN fail** | `=== true` → `!== undefined` | **red** — Breakfast/Brunch chips appeared for a confirmed-`false` venue |
| Detail card, looked at | 390x844 and 1440x900 PNGs | **read both.** Chips reflow, disclosure opens, `4.4 (1,284)` locale-formatted |
| iOS run 11 (`1b0a618`) | hashed then read 9 PNGs | **8 unique hashes / 9 files; 6 of 8 tab shots were the Find tab; all 4 "dark" shots were light** |
| Geolocation fix on iOS | run 11 PNGs | **CONFIRMED FIXED — no permission prompt** |
| Bezel, before | measured at 393x852 | **header pad 0px, logo left edge 0** |
| Bezel, after | new check, 4 viewports | header L24/R24, tab bar L20/R20 |
| Font actually loads | read `document.fonts` | 2 faces `loaded`, 2 same-origin woff2 |
| Font check *can* fail | first run, on my own comment | **red**, then fixed to strip comments |
| iOS artifact download | `curl` the artifact URL | **403 from the agent proxy** |
| iOS shots via git branch | `git fetch origin ci/ios-shots` | **WORKS — PNGs read 2026-07-28** |
| iOS runs 4-7 | read the PNGs | **all showed the location prompt, not the tabs** |
| `light-stay-in` vs `light-saved` | `md5sum` | **identical — two "tabs", one screen** |
| Device probe | `PROBE.txt` | 402x678, dpr 3, insets **all 0**, vh 760 / dvh 678 |
| Typecheck | `npx tsc --noEmit` | **exit 0** — after installing `@types/react` |
| Build | `npx vite build` | **exit 0** |
| Views rendered + read | `driver.mjs` | **6/6, 0 unreachable, 0 console errors**, light + dark |

**The device numbers are real and are not a bug.** Insets all 0 is *correct* for Safari
portrait — Safari's own toolbar occupies the bottom, and left/right are 0 on any phone in
portrait. `viewport-fit=cover` is present in both `index.html` and
`verify/safe-area-probe.html`; both were checked before concluding anything. `vh 760` vs
`dvh 678` is the 82px gap the existing `vh` ban already guards.

**Still never observed:** this app's four tabs in real Mobile Safari. The capture channel
works and delivery works; what was broken was the app raising a permission dialog over
everything. That is fixed but unrun.

**`@types/react` was in `package.json` but absent from `node_modules`**, so `tsc` was
silently checking nothing and reported errors in `ErrorBoundary.tsx` that vanished after
`npm install`. On any fresh clone or after a big sync, install before believing a
typecheck — green or red.

## Protected decisions

- **`browser.mjs` never falls back.** Absent WebKit or unknown engine = exit 3.
- **Declare the font faces by hand.** Importing `@fontsource-variable/...` registers the
  family as "Schibsted Grotesk **Variable**", which does not match the `@theme` tokens, so
  the app silently renders in the fallback — with every check green and
  `document.fonts.check()` returning **true**, because it counts fallbacks. Read
  `document.fonts` directly; `check()` is not a test of whether your font loaded.
- **`font-display: optional` + preload, together.** `optional` alone loses its window on
  a cold load; `swap` alone guarantees the reflow. Neither half works alone.
- **`/fonts/*` is immutable with stable filenames** — a font change must **rename** the
  file, never overwrite it.
- **`.safe-x` composes, never replaces.** Unlayered CSS beats Tailwind utilities; any
  bare `padding-*` there silently deletes the element's gutter.
- **iOS CI does not `cancel-in-progress`.** It killed run 1 mid-capture.
- **Say "WebKit" / "iOS Simulator", never "iPhone".** A simulator uses the Mac's GPU and
  has no radio: nothing it says about thermals or performance is real.
- Carried forward: static checks walk `src/`; the `vh` ban is about the unit; chrome that
  content passes under is opaque; no `openNow` ratchet; never a bare `npx vite`; §7 is
  decided; never state a check count from prose.

## Next session: first three actions

1. **Validate the expanded Places field mask against the real API.** This is the highest
   risk in the tree and nothing local can touch it. An invalid name in `X-Goog-FieldMask`
   makes Places return **400**, and `searchTextOnce` returns `[]` on any non-OK response —
   so a single typo among the sixteen added fields silently empties **every** venue list,
   looking exactly like "no results". The fixture cannot catch this: it never validates
   the mask, it just answers. Confirm from somewhere with real network — one `curl` to
   `places.googleapis.com/v1/places:searchText` with the mask from `placesService.ts`, or
   open the deployed Find tab and see venues. **Do not report the data-model work as
   working until this is done.**
2. **Get the uncommitted work committed** (§4 — it needs the user to ask). Then trigger
   `ios-safari.yml` and read the PNGs: hash them, then **look at them**, then read
   `PROBE.txt` for `"scheme"` on the dark pass. Run 11's slug and appearance bugs are
   fixed in the tree but **have never executed** — only a macOS runner can run them. If
   the four tabs finally differ AND the dark pass reports `dark`, this is the first real
   look at the app in Mobile Safari: check the bottom chrome for the user's reported gap.
3. **Establish whether `VITE_GOOGLE_PLACES_KEY` is actually set** before acting on it
   either way — see Status. Ask the user what the deployed Find tab shows; do not repeat
   this handover's earlier assertion that the key is missing, and do not assume it is
   present. Write down the answer and how it was obtained.

## Known risks and open questions

- **THE FIELD MASK IS UNVALIDATED AGAINST THE REAL API.** See "Next session" action 1.
  Sixteen field names were added from the Places documentation and **not one request has
  ever been made with them** — the proxy 403s every outbound URL from here. The failure
  mode is total and silent: a 400 becomes `[]` becomes an empty venue list. Highest-risk
  item in this handover by some distance.
- **The added fields are the Enterprise + Atmosphere SKU.** `editorialSummary`, the six
  `serves*` and the eight attribute booleans are Google's most expensive tier, and
  `fetchVenues` makes two requests per cycle. The per-request cost of venue discovery went
  up; nobody has priced it. If the bill matters more than the depth, that block in the
  field mask is the thing to cut and the UI already degrades to nothing without it.
- **Tri-state meals are only half-observable.** The data model preserves `false` vs
  absent, and the check proves the UI will not render a confirmed-`false` as served. But
  the UI renders **only** confirmed-`true`, so a user cannot tell "confirmed no breakfast"
  from "nobody has said" — both are simply absent. That is deliberate (an absent chip
  under a heading reading "Confirmed meals" is honest) but it means the distinction the
  data model protects is currently invisible to the person using the app.
- **The Find tab opens on a form, not on food.** Nothing on the first screen answers
  "what's good right now" until the user fills something in and taps. Against §5's Orient
  stage this is the largest remaining product gap. **A product decision, not a bug** —
  recorded as a UX gap to be addressed on its own, not folded into unrelated work.
- **Diversification is unproven against the real API.** Both fixture queries return the
  same five venues, so the interleave and the phrasing rotation are exercised for
  correctness but cannot demonstrate that results actually vary. That needs real network.
- **The user's reported bottom gap is still unconfirmed.** Never reproduced here. The
  iOS Simulator may now be able to show it.
- **The venue hero has no photo fallback** — with no image it is a large flat pink→black
  gradient over most of the first screen. **Seen again on 2026-07-28** in
  `verify/out/venue-detail.png`: name, address and all three actions are present and
  correct on first paint, sitting on that slab. Unknown whether real photo-less venues
  hit it. Check once the Places key question is settled.
- **`simctl privacy` is not a route to suppressing web permission prompts.** Recorded
  here because it looks like the obvious fix and is not; the note in `ios-safari.yml`
  will stop a re-add, but only if it is read.
- **`ci/ios-shots` is force-pushed and orphaned every run.** History is discarded on
  purpose so PNGs cannot accumulate. Never put anything there you want to keep.
- **Commit `243c7f5`'s message is slightly mangled** — unescaped backticks in the shell
  quoting ran a substitution. Cosmetic; not worth force-pushing `main` to fix.
- **Hex ratchet is 71**, unchanged. The remainder has no exact token.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
