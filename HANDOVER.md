# HANDOVER

## Status

**Merged to `main` and deployed to production.** Latest: `aefdc70`. Two things that made this app read as
unfinished are fixed, and the engine the user's phone runs now measures this app in CI
for the first time in the project's history.

`verify/checks.mjs` **39/39, 0 skipped, exit 0** on chromium locally, and **38/38 on
WebKit** in CI (run 30331903951, before the 39th check existed). `npm run build` exit 0.
Working tree clean.

One blocker remains and it is a user action: **`VITE_GOOGLE_PLACES_KEY` in Vercel.**

## Objective

Remove what prevents this app being seen as the user sees it — on WebKit, at phone width
— and then fix what looking actually revealed.

## What changed

**1. WebKit renders and measures this app.** New `verify/browser.mjs`: the harness picks
an ENGINE (`PW_ENGINE=chromium|webkit`), not a binary. WebKit cannot be installed in the
agent container (the proxy blocks the Playwright CDN, re-confirmed 2026-07-28) but a
GitHub runner installs it in seconds. CI runs the full suite on WebKit and uploads
393×852 light/dark screenshots as an artifact. An absent WebKit or an unknown engine
**exits 3** — it never falls back to Chromium.

**2. `verify/serve.mjs up` was broken on every fresh clone** — `verify/out/` is
gitignored, so the log file was opened before the directory existed and it threw ENOENT
before Vite was ever spawned. That is the *first command* of §6's "way to see this app".

**3. The typeface was never actually loading — it came from Google.** The app's entire
visual identity was a runtime request to `fonts.googleapis.com`. `display=swap`
guarantees a flash of fallback text and a re-wrap on every cold load; two extra round
trips to a third origin precede any correct text; and the user's IP reaches Google on
every visit. Now self-hosted from `public/fonts/`, declared in `index.css` with
`font-display: optional` and **preloaded** in `index.html`.

**The trap, recorded because it looks fine when broken.** Importing
`@fontsource-variable/schibsted-grotesk` registers the family as **"Schibsted Grotesk
Variable"**; the `@theme` tokens ask for **"Schibsted Grotesk"**. They do not match, so
the app renders in `ui-sans-serif` — with every check green, a plausible screenshot, and
`document.fonts.check('600 24px "Schibsted Grotesk"')` returning **true**, because
`check()` counts a fallback as satisfying the request. Caught only by reading
`document.fonts` directly: two faces, both `unloaded`, zero woff2 requests. Faces are
therefore declared by hand under the real family name, italic included — the display
headings set `italic`, and with no italic face the browser shears the upright.

**4. The logo was touching the screen edge — the user found this, on Safari.**
`.safe-x` REPLACED the horizontal padding of the two full-bleed fixed surfaces rather
than adding to it: `padding-left: max(0px, env(safe-area-inset-left))`. It is
*unlayered* CSS, and Tailwind's utilities live in `@layer utilities` — **unlayered
always beats layered in the cascade**, whatever the specificity or source order. So the
header's `px-6` was discarded and the winning value was 0, because
`env(safe-area-inset-left)` is 0 on any phone in portrait. Measured before the fix at
393x852: **header `padding-left: 0px`, logo left edge at `x=0`**. The gutter is now a
floor, not a competitor: `max(var(--safe-gutter), env(...))`. After: header 24px, tab
bar 20px, all four viewports. Landscape is unaffected — the ~59px notch inset still
wins, and the fill stays edge-to-edge because this is padding, not margin.

**5. A way to SEE this in real Mobile Safari, without asking the user.**
`.github/workflows/ios-safari.yml` runs the production build inside the **real iOS
Simulator** on a macOS runner and captures Mobile Safari's own framebuffer — four tabs
x light/dark, including Dynamic Island, status bar and home indicator. Real device
insets, not the zeros headless Chromium reports. `verify/safe-area-probe.html` is
captured first and prints the device's actual inset values and `100vh` vs `100dvh`,
with a painted band over each inset region. Free: Actions minutes are unmetered for
public repos on all runner types. **If this repo goes private, macOS bills at 10x** —
drop the push trigger and keep `workflow_dispatch`.

**6. A second accent on a first-class surface.** `--dusty-blue` coloured exactly one
control — the Website icon on the venue page — so it sat between a terracotta Directions
and a terracotta Call as the only blue thing on screen, with **no `html.dark` value**.
Deleted, along with `--blue-light`, which was referenced nowhere at all.

## Customer journey impact

**Orient** and **Trust**. The first paint is now the app's own typeface instead of the
system sans re-wrapping into it a moment later; that jolt is most of why this read as
unfinished. **Act**: the venue page's three actions are one visual set rather than two
terracotta and one blue.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite (chromium) | `node verify/checks.mjs` | **43/43, 0 skipped, exit 0** |
| Bezel clearance, before | measured at 393x852 | **header pad 0px, logo left edge 0** |
| Bezel clearance, after | new check, 4 viewports | header L24/R24, tab bar L20/R20 |
| Both workflows parse | `yaml.safe_load` | OK |
| Regression suite (**WebKit**, CI) | `PW_ENGINE=webkit …` | **38/38**, run 30331903951 |
| Build | `npm run build` | **exit 0**, four woff2 hashed into `/assets/` |
| Font actually loads | read `document.fonts` | 2 faces `loaded`, 2 same-origin woff2 requested |
| Font check *can fail* | first run, against my own comment | **✗ red**; now strips HTML comments |
| Screenshots | `driver.mjs`, re-read | real face, **true italic**, body copy re-wrapped |
| Dev server | `serve.mjs down` | `0 vite processes remain` |

**NOT verified.** WebKit-on-Linux is not Safari-on-iOS — same engine and same
viewport/safe-area/backdrop-filter semantics, different OS, no device chrome. Say
"WebKit", never "iOS". §13.2 stands for genuine device behaviour. The production URL's
reachability cannot be checked from here (§6: the proxy 403s every host).

## Protected decisions

- **`browser.mjs` never falls back.** Absent WebKit or unknown engine = exit 3.
- **Declare the font faces by hand.** Importing the fontsource package silently renders
  the whole app in the fallback; the family name does not match the theme tokens.
- **`font-display: optional` + preload, together.** `optional` alone loses its window on
  a cold load; `swap` alone guarantees the reflow. Neither half works on its own.
- **`/fonts/*` is cached immutable with stable filenames** — a future font change must
  **rename the file**, not overwrite it.
- **Flip the WebKit CI steps to blocking now that a green run exists**, and delete the
  paragraph in `ci.yml` that says so.
- Carried forward: static checks walk `src/`; the `vh` ban is about the unit; chrome that
  content passes under is opaque; no `openNow` ratchet; never a bare `npx vite`; §7 is
  decided; never state a check count from prose.

## Next session: first three actions

1. **Set `VITE_GOOGLE_PLACES_KEY` in Vercel** (user action). Until then the deployed Find
   tab shows its missing-configuration state, correctly and by design, and no venue
   behaviour is confirmable in production.
2. **Flip the WebKit steps from `continue-on-error` to a gate.** The arrival state is no
   longer unknown — it was 38/38.
3. **Download the `webkit-screenshots` artifact and look at it.** Nobody has yet.

## Known risks and open questions

- **The user's reported bottom gap is still not confirmed fixed.** Never reproduced here;
  WebKit in CI may now be able to show it, but nothing has been observed.
- **The Find tab opens on a form, not on food.** Nothing on the first screen answers
  "what's good right now" until the user fills something in and taps. Against §5's
  Orient stage that is the largest remaining product gap, and it is a design decision,
  not a bug — raised, deliberately not acted on.
- **The venue hero has no photo fallback.** With no image it renders as a large flat
  pink→black gradient occupying most of the first screen. Only observed in this
  container, where images cannot load, so it is unconfirmed whether real venues without
  a photo hit it. Worth checking once the Places key is live.
- **Hex ratchet is 71** and unchanged; the remainder has no exact token (status tints,
  one-off greys). Add the token first, then bind, then lower the ceiling.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
