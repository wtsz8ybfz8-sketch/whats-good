# HANDOVER

## Status

**Green and deployed at the user's real device size for the first time.**
`verify/checks.mjs` **38/38, 0 skipped, exit 0**; `verify/driver.mjs` **6/6 views, 0
unreachable**, light and dark. Working tree clean.

The suite now measures **393×852 (iPhone 15/16 Pro — the user's actual phone)** and
**430×932 (Pro Max)**. Before this it measured only 390×844, so the user's viewport had
never been rendered or measured, at all, in the project's history.

Outstanding lever: **`VITE_GOOGLE_PLACES_KEY` in Vercel**. Without it the deployed Find
tab shows its missing-configuration state, correctly and by design. No key exists in
this container, and reachability cannot be checked from here (§6: the proxy 403s every
outbound host).

## Objective

Close the gap between what CLAUDE.md *claims* is guaranteed and what a machine actually
refuses to let through — then fix what that gap was hiding, without ever reporting a
check as evidence when it did not run.

## What changed

**Three checks that could not fail, made able to fail.**
1. The static checks read a **hardcoded list of three files** (`App.tsx`, `index.css`,
   `ErrorBoundary.tsx`). `Sidebar`, `EateryView`, `RecipeView`, `HappyHourView` and
   `StatusStates` were never scanned by anything. The suite now walks `src/` so a new
   component is covered the moment it exists.
2. The viewport rule tested `/100vh|min-h-screen/`. **Every bare `vh` unit** resolves
   against the URL-bar-hidden viewport on iOS Safari, so `46vh` is as wrong as `100vh`.
   The venue hero shipped `h-[46vh]/[56vh]/[60vh]` and the filter sheet `max-h-[85vh]`
   for the project's whole life. All converted to `dvh`; the check now catches any `vh`.
3. `.glass` was capped at a **count** of 2, so moving it from the header onto a card
   passed. It now checks **placement**: 0 in `components/`, ≤2 in `App.tsx`.

**The see-through chrome the user reported.** The header carried `.glass` —
`rgba(255,255,255,0.60)` light and **`rgba(255,255,255,0.055)` dark, i.e. 94%
transparent** — relying on `backdrop-filter`, which iOS Safari drops while scrolling.
When it is dropped, 6% white over moving content is a window. New opaque `.chrome-bar`;
EateryView's `/90 + backdrop-blur` action bar converted to the opaque `.action-bar` the
main CTA bar already used. **Zero translucent chrome remains.**

**Earlier in the session.** CI's browser checks had never executed (pinned Chromium path
absent on the runner) — `chromePath.mjs` resolves and **exits 3 rather than skipping**.
The "fixture gap" was a missing `VITE_GOOGLE_PLACES_KEY` on the dev server, which had
been written into the docs as a permanent environment limitation; `checks.mjs` now exits
3 naming the command. Bottom chrome derives from `--tabbar-h`; `formatQuantity()`
replaced both `toFixed` calls; `border-black` (fixed once on Saved, left in ten other
places) bound to `--rule`; hex 211 → 71. `verify/serve.mjs up|down` is idempotent, bakes
in the key, and verifies termination; SessionStart/SessionEnd hooks install deps and stop
the server.

## Customer journey impact

**Trust** and **Orient**. Chrome you can see through while scrolling reads as broken
software before any content is judged — that was the user\'s first-named complaint and it
is now structurally impossible rather than tuned away. **Explore**: the venue hero and
filter sheet no longer size themselves against a viewport taller than the visible one on
iOS. **Choose**: the recipe page\'s hierarchy was inverted by black rules louder than the
headline above them.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite | `node verify/checks.mjs` | **38/38, 0 skipped, exit 0** |
| Render sweep | `node verify/driver.mjs` (+`--dark`) | **6/6 views, 0 unreachable**, exit 0 |
| `vh` check *can fail* | injected `max-h-[85vh]` | **✗ red, named `Sidebar.tsx:161`**, exit 1; restored |
| Header opacity @393×852 | measured, scrolled to y=400 | `rgb(244,242,239)`, **alpha 1**, `backdrop-filter: none` |
| Tab bar geometry @393×852 | measured | top 795, bottom 852, **gap below = 0** |
| Scaled chip | in-suite | `Scaled x1,5`; `rgb(124, 45, 18)` = `--accent-terracotta` |

Screenshots read, not merely measured: 393×852 light and dark scrolled (header cuts
content cleanly), `venue-detail`, `recipe-detail` both modes.

**NOT verified — and this is the honest core of the user\'s question.** Everything above
is **headless Chromium**. WebKit could not be installed (`npx playwright install webkit`
fails: the proxy blocks the CDN), and the deployed URL is unreachable from here. So no
statement in this document is an observation of Safari. iOS-specific behaviour —
safe-area insets (reported as 0 here, which is also the correct value), rubber-band
overscroll, `theme-color` chrome tint, `backdrop-filter` scheduling, and the visual-vs-
layout viewport that produces the user\'s reported bottom gap — remains **inferred, not
seen**. §13.2 stands.

## Protected decisions

- **Static checks walk `src/`; never reintroduce a hardcoded file list.** Three files
  scanned is how four `vh` violations survived a bold rule.
- **The `vh` ban is about the unit, not the number.** `46vh` is as wrong as `100vh`.
- **Chrome that content passes under is opaque.** Never put `backdrop-filter` back on
  the header or a docked bar; iOS drops it exactly when it matters.
- **`chromePath.mjs` exits 3; it never falls back to "no browser."**
- **No `openNow` ratchet** — all four sites are guarded; a grep would fire on correct code.
- **Never start a bare `npx vite`** — use `serve.mjs up`/`down`.
- **§7 is decided.** Do not invoke the design skills listed in §14.3.
- **Never state a check count from prose** — quote what the run printed.

## Next session: first three actions

1. **Get a real-device observation.** Everything about iOS is inference. Either the user
   confirms the bottom gap on the deployed build, or a WebKit-capable runner is added to
   CI (GitHub runners can `playwright install webkit`; this container cannot). Until one
   of those exists, no iOS claim should be made in either direction.
2. **Set `VITE_GOOGLE_PLACES_KEY` in Vercel** (user action). Until then no venue
   behaviour is confirmable in production.
3. **Hex 71 → 0.** What remains has no exact token — status tints (emerald/amber), a few
   one-off greys. Add the token to `:root` and `html.dark` first, then bind. Lower the
   ratchet each time; never raise it.

## Known risks and open questions

- **The user\'s reported bottom gap is NOT confirmed fixed.** The `vh` → `dvh` conversion
  is a real and likely-relevant cause (the layout sizing itself against the taller,
  chrome-hidden viewport), but the gap was never reproduced here and cannot be. Treat it
  as open until seen on the device.
- **`.chrome-bar` drops the header\'s frosted look** — a deliberate trade of material for
  reliability. If the frosted look is wanted back, it needs an opaque base layer with the
  blur as pure decoration, never as the thing providing opacity.
- **`--charcoal` dark is `#EDE8E1`; the hex it replaced was `#f5f5f5`.** A slight warm
  shift across dark-mode body text. Accepted; flag it if it reads wrong on a real screen.
- **The scaled-chip check depends on the serves stepper\'s markup.** Restyling that
  control will fail it — fix the selector, do not delete the check.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
