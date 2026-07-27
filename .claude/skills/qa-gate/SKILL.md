---
name: qa-gate
description: Run before reporting ANY UI or behaviour change in whats-good as working, and before every deploy. Runs the regression suite (verify/checks.mjs), the typecheck, the build, and the four-way viewport/mode render sweep, then requires screenshots to be looked at. Use whenever a change touches src/, whenever the user asks whether something works, whenever a deploy is requested, and whenever you are about to write the words "verified", "working", "fixed" or "clean".
---

# QA gate

This exists because the same failure repeated across an entire session: a change was
made, a cheap check passed, the change was reported as working, and the user found the
defect. Every bug in `verify/checks.mjs` was found by the user, not by me.

**The rule this encodes: a check that cannot fail is not evidence.** Rendering at 390px
in headless Chromium cannot fail an iOS safe-area bug. `tsc` could not fail a React prop
bug while `@types/react` was missing. Before trusting a green result, say what result
would have been red.

## Run it

```bash
npm install                                                   # once
cd verify && npm install                                      # once — playwright-core lives HERE, never in root package.json
cd /home/user/whats-good && VITE_GOOGLE_PLACES_KEY=k npx vite --port 3000 &
sleep 5
cd verify && NO_PROXY='*' node checks.mjs                     # 11 checks, exit 0 = pass
NO_PROXY='*' node driver.mjs                                  # 6 views, screenshots -> verify/out/
NO_PROXY='*' node driver.mjs --dark                           # same, dark
cd .. && npx tsc --noEmit && npx vite build
```

`NO_PROXY='*'` is required — without it localhost requests go through the agent proxy
and return 000.

## Then LOOK

`checks.mjs` passing is necessary and not sufficient. **Read the PNGs in `verify/out/`
with the Read tool.** Every visual defect this project has shipped — the ghosted line
across the CTA, "UPCOMING" colliding with a venue name, a solid-black divider louder
than its heading, a duplicated headline, a chip sliced mid-word — was invisible to
measurement and obvious in the screenshot. Measure geometry AND look at the picture.

## Gate: do not report success unless all of these are true

- [ ] `verify/checks.mjs` exits 0 (11/11)
- [ ] `tsc --noEmit` exits 0 — and `@types/react` is installed, or it is checking nothing
- [ ] `vite build` exits 0 (check `${PIPESTATUS[0]}`, not the tail's status)
- [ ] All 6 views rendered, **light and dark**
- [ ] All 4 tabs measured at **390×844 (portrait), 844×390 (landscape) AND 1440×900** —
      desktop went unmeasured for a whole session (clipped rail, 36px tabs, duplicated
      headline) and landscape was where the unpainted-canvas bug was actually visible
- [ ] `html` has a background and nothing uses `background-attachment: fixed` — an
      unpainted canvas shows as a see-through band against the browser's own chrome
- [ ] Screenshots actually opened and read, not just written
- [ ] For anything iOS-specific: stated plainly as unverifiable here, because Chromium
      reports `env(safe-area-inset-*)` as 0 regardless of the meta tag

## Report honestly

State what was checked, what passed, and **what was not checked**. "Did not complete" is
a valid result; "verified" for something never looked at is not. If a fix is correct by
specification but unconfirmed on the target device, say exactly that.

## Adding a check

When the user reports a defect, add a check for it to `verify/checks.mjs` in the same
change that fixes it. A bug the user had to find twice is a process failure, not a
coding one.
