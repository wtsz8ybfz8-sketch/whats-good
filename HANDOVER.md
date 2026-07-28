# HANDOVER

## Status

**`main` is at `243c7f5`, pushed, and deployed to production.** Working tree clean, no
dev server running.

`verify/checks.mjs` **43/43, 0 skipped, exit 0** on chromium. `npm run build` exit 0.
WebKit ran the suite in CI and passed **38/38** (run 30331903951, before the four bezel
checks existed).

**The iOS Simulator workflow is real and captures correctly, but its output is not yet
readable from the agent container.** Run 2 succeeded end to end (9 screenshots). Run 3
captured perfectly and then failed on both delivery routes. Run 4, carrying the fixes
for both, was **still in progress when this session ended — its result is unknown and
must be read, not assumed.**

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
| iOS Simulator boot + capture | run 2, run 3 | **success — 9 screenshots both times** |
| iOS artifact download | `curl` the artifact URL | **403 from the agent proxy** |
| Probe reported its numbers | run 3 | **NO — "no PROBE_RESULT"** |
| Probe channels, locally | GET + POST beacons | 200 / 204, both logged `PROBE_RESULT` |
| iOS run 4 (both fixes) | — | **IN PROGRESS, result unknown** |

**Never observed, by anyone:** the device's actual safe-area insets, and any iOS Safari
screenshot of this app. The capture works; delivery is what is unproven. Do not describe
any iOS behaviour as verified until run 4's log and screenshots have been read.

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

1. **Read iOS run 4** (`.github/workflows/ios-safari.yml`, branch `main`). If green:
   `git fetch origin ci/ios-shots` and **Read the PNGs** — that is the first look at this
   app in real Mobile Safari. Grep the job log for `PROBE_RESULT` for the device's real
   insets and `100vh` vs `100dvh`. If red, the two failures already fixed were
   `permissions: contents: write` and the probe beacon; anything else is new.
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
  gradient over most of the first screen. Only seen where images cannot load; unknown
  whether real photo-less venues hit it. Check once the Places key is live.
- **`ci/ios-shots` is force-pushed and orphaned every run.** History is discarded on
  purpose so PNGs cannot accumulate. Never put anything there you want to keep.
- **Commit `243c7f5`'s message is slightly mangled** — unescaped backticks in the shell
  quoting ran a substitution. Cosmetic; not worth force-pushing `main` to fix.
- **Hex ratchet is 71**, unchanged. The remainder has no exact token.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
