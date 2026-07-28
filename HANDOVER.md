# HANDOVER

## Status

**WebKit — the engine on the user's phone — now renders and measures this app in CI. It
never had, on any machine, in the project's history.**

Local suite unchanged and green: `verify/checks.mjs` **38/38, 0 skipped, exit 0** on
chromium. Working tree committed and pushed to `claude/handover-immediate-fixes-nwcsf6`.

Two blockers to *seeing* the app were removed this session; one remains and is a user
action (`VITE_GOOGLE_PLACES_KEY` in Vercel).

## Objective

Remove what prevents this app being seen as the user sees it — on WebKit, at phone width
— rather than inferred from headless Chromium.

## What changed

**1. `verify/serve.mjs up` was broken on every fresh clone.** `verify/out/` is
gitignored, so `openSync('verify/out/dev.log')` threw ENOENT before Vite was ever
spawned. That is the *first command* of §6's "way to see this app", and it failed in
this container today. Now `mkdirSync(..., { recursive: true })` first.

**2. New `verify/browser.mjs` — the harness picks an ENGINE, not a binary.**
`PW_ENGINE=chromium` (default) or `webkit`. `checks.mjs` and `driver.mjs` both call
`launchBrowser()`; neither knows about a browser path any more. WebKit launches through
playwright-core's own registry. An absent WebKit or an unknown engine **exits 3** — it
never falls back to Chromium, because a suite that quietly swaps engines while claiming
to have measured WebKit is worse than one that does not run (same contract as
`chromePath.mjs`).

**3. CI runs the full suite on WebKit and uploads WebKit screenshots** at 393×852, light
and dark, as a downloadable artifact. `driver.mjs` puts the engine in the filename, so a
WebKit shot can never overwrite the Chromium shot of the same view.

**Why the WebKit steps are `continue-on-error`.** This engine has never rendered this
app, so its arrival state is unknown; a step red on arrival for unknown reasons is the
kind that teaches everyone to ignore the pipeline. It is an **observation channel until
one green run exists, then it becomes a gate** — the comment in `ci.yml` says so and
says to delete itself. A WebKit that fails to *launch* is still recorded as a failure.

## Customer journey impact

None directly — no `src/` change. **Trust**, indirectly and structurally: every
iOS-shaped defect this app has shipped (`vh` against the chrome-hidden viewport,
`env(safe-area-inset-*)`, `backdrop-filter` dropped mid-scroll) is one Chromium reports
the *correct* value for and can never fail. Those checks could not fail. Now they can.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Chromium path unbroken by the refactor | `node verify/checks.mjs` | **38/38, 0 skipped, exit 0** |
| Parse of all three edited harness files | `npx esbuild` | clean |
| `serve.mjs up` on a dir-less clone | before / after | **ENOENT crash** → `server up on :3000` |
| WebKit path *can fail* | `PW_ENGINE=webkit node verify/checks.mjs` | **exit 3**, named the install command, no fallback |
| Unknown engine | `PW_ENGINE=firefox …` | **exit 3** |
| Dev server stopped | `node verify/serve.mjs down` | `0 vite processes remain` |

**NOT verified.** The WebKit suite itself has **not been run** — it cannot be, here
(`npx playwright install webkit` fails at the CDN behind the proxy, re-confirmed
2026-07-28 with that exact error). Whether it passes, and what it says, is unknown until
the first Actions run on this branch. **Read the Actions tab; do not assume.** The CI
change is untested end-to-end for the same reason.

WebKit-on-Linux is not Safari-on-iOS: same engine, same viewport/safe-area/
backdrop-filter semantics, different OS, no device chrome. Say "WebKit", never "iOS".
§13.2 still stands for genuine device behaviour.

## Protected decisions

- **`browser.mjs` never falls back.** Absent WebKit or unknown engine = exit 3.
- **The engine belongs in the screenshot filename.** Silent overwrite is how "we looked
  at it" becomes looking at the wrong picture.
- **Flip the WebKit steps to blocking after the first green run** and delete the
  paragraph that says so. Do not leave `continue-on-error` there indefinitely.
- Everything carried forward: static checks walk `src/`; the `vh` ban is about the unit;
  chrome that content passes under is opaque; no `openNow` ratchet; never a bare
  `npx vite`; §7 is decided; never state a check count from prose.

## Next session: first three actions

1. **Read the Actions run for this branch.** Specifically the WebKit step's summary
   block. Every red line there is a real difference between the engine we have been
   measuring and the one the user holds. Fix them, then flip the step to a gate.
2. **Download the `webkit-screenshots` artifact and LOOK at it.** First true picture of
   this app in the user's engine.
3. **Set `VITE_GOOGLE_PLACES_KEY` in Vercel** (user action; unchanged, still the one
   blocker on venue discovery in production).

## Known risks and open questions

- **The user's reported bottom gap is still not confirmed fixed.** The `vh` → `dvh`
  conversion remains the likely cause. WebKit in CI may now be able to *show* it —
  that is the point of this change — but nothing has been observed yet.
- **The WebKit suite may be red on arrival** for reasons that are harness artifacts
  (WebKit lacks some Chromium launch/route behaviour) rather than app defects. Read each
  failure before believing it; §13.3's finding was that three of six grep-found
  violations were false positives.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
