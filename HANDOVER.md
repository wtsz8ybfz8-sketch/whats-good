# HANDOVER

## Status

**`origin/main` is at `e6f1d65` — this handover's own commit — verified 2026-07-28 by
`git ls-remote origin refs/heads/main`, not by a tracking ref.** Everything from `aefdc70`
through `b6027f9` (bezel/`.safe-x`, self-hosted typeface, iOS Simulator workflow, the
`ci.yml` additions, the geolocation fix) IS on `main`. Working tree clean, no dev server
running.

**A previous session reported the opposite and was reading a stale ref.** It stated that
`main` and `origin/main` were both at `5fa9c12` and that this work existed only on a
feature branch. That was true when that session ran; `main` moved afterwards. A local
`origin/main` is a cached ref, and a clone that predates a push shows the old value with
no error. **`git fetch` before asserting where a branch is** — the same class of mistake
as trusting a green CI tick without checking what it measured.

**"On `main`" is not "in production", and nothing here establishes deployment.** No
session can check that from this container (every outbound URL 403s, §6). An earlier
version of this line said "deployed to production"; that was never evidence, and the claim
is withdrawn rather than restated. Confirm from a real device or leave it unknown.

`verify/checks.mjs` **43/43, 0 skipped, exit 0** on chromium. `tsc --noEmit` exit 0.
`npm run build` exit 0. `driver.mjs` 6/6 views, 0 unreachable, 0 console errors.
WebKit ran the suite in CI and passed **38/38** (run 30331903951, before the four bezel
checks existed).

**The iOS screenshots are readable from this container, and reading them is how the
capture bug was found.** `git fetch origin ci/ios-shots` then `git show FETCH_HEAD:<f>.png`
into a scratch dir and Read the PNG. This works — it was done on 2026-07-28.

**Every iOS screenshot from runs 2 through 7 shows the same blocked screen.** Safari's
"Allow this website to use your location?" prompt fired on first load, sat on top of the
Find tab and swallowed the tab navigations underneath. `light-stay-in.png` and
`light-saved.png` were byte-identical. Four green runs and thirty-six PNGs were evidence
of nothing. **A green workflow with a full artifact directory is not proof the artifact
shows what its filename says.**

Fixed at the app, not the simulator, in `b6027f9` — see "What changed". **No iOS run has
yet executed against that fix.** The next run is the first that should produce four
genuinely different tabs; verify that by hashing the PNGs before trusting them.

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

## Customer journey impact

**Orient** and **Trust**. First paint is now the app's own typeface rather than the
system sans re-wrapping into it, and the two chrome surfaces no longer hug the bezel —
between them, most of what read as unfinished on the first screen. **Act**: the venue
page's three actions are one visual set.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite (chromium) | `node verify/checks.mjs` | **43/43, 0 skipped, exit 0** |
| Regression suite (WebKit, CI) | `PW_ENGINE=webkit` | **38/38** (run 30331903951) |
| Build | `npm run build` | **exit 0** |
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
| Views rendered + read | `driver.mjs` | **6/6, 0 unreachable, 0 console errors** |
| Geolocation fix on iOS | — | **NOT RUN. `b6027f9` postdates every iOS run.** |

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

1. **Trigger `ios-safari.yml` on `main` and read the PNGs.** `b6027f9` postdates every
   iOS run, so the location-prompt fix has never executed. Dispatch it
   (`actions_run_trigger`, `workflow_id: ios-safari.yml`, `ref: main`), wait, then
   `git fetch origin ci/ios-shots`, extract the PNGs and **Read them**.
   **`md5sum` the four light tabs first.** If any two match, the tabs are still not
   navigating and the prompt is not the only blocker — do not report success on a green
   tick and a full directory, which is exactly what runs 4-7 produced while showing
   nothing. If they differ, this is the first real look at the app in Mobile Safari:
   check the bottom chrome for the user's reported gap.
2. **Establish whether `VITE_GOOGLE_PLACES_KEY` is actually set** before acting on it
   either way — see Status. Ask the user what the deployed Find tab shows; do not repeat
   this handover's earlier assertion that the key is missing, and do not assume it is
   present. Write down the answer and how it was obtained.
3. **Flip the WebKit steps in `ci.yml` from `continue-on-error` to a gate** — the arrival
   state is no longer unknown, it was 38/38 — and delete the paragraph that says to.

## Known risks and open questions

- **The Find tab opens on a form, not on food.** Nothing on the first screen answers
  "what's good right now" until the user fills something in and taps. Against §5's Orient
  stage this is the largest remaining product gap. A design decision, raised deliberately
  and not acted on.
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
- **One commit is off `main` and will be lost if nobody claims it.**
  `origin/claude/mobile-emulation-testing-57d26v` (`66c7037`) adds `verify/devices.mjs`,
  186 lines, a named-device emulation pass using Playwright device profiles. It is the
  only work anywhere in this repo that is not on `main`. Nothing references it, so `main`
  is not broken without it — but a session ran, measured with it, and left. Merge it or
  delete the branch deliberately; do not leave it as a third answer to "where is the work".
- **`ci/ios-shots` is force-pushed and orphaned every run.** History is discarded on
  purpose so PNGs cannot accumulate. Never put anything there you want to keep.
- **Commit `243c7f5`'s message is slightly mangled** — unescaped backticks in the shell
  quoting ran a substitution. Cosmetic; not worth force-pushing `main` to fix.
- **Hex ratchet is 71**, unchanged. The remainder has no exact token.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
