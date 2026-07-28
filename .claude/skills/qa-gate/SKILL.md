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
cd /home/user/whats-good && cd /home/user/whats-good && node verify/serve.mjs up          # idempotent; bakes in the key
sleep 5
cd verify && NO_PROXY='*' node checks.mjs                     # exit 0 = pass; quote the total IT prints, never a number from a doc
NO_PROXY='*' node driver.mjs                                  # 6 views, screenshots -> verify/out/
NO_PROXY='*' node driver.mjs --dark                           # same, dark
cd .. && npx tsc --noEmit && npx vite build
node verify/serve.mjs down                                    # ALWAYS — never leave it running
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

- [ ] `verify/checks.mjs` exits 0, with **0 SKIPPED** — quote the summary line it printed
      (`PASSED n FAILED n SKIPPED n`). SKIPPED is not PASSED; exit 3 is an unmet
      precondition and says nothing about the app
- [ ] `tsc --noEmit` exits 0 — and `@types/react` is installed, or it is checking nothing
- [ ] `vite build` exits 0 (check `${PIPESTATUS[0]}`, not the tail's status)
- [ ] All 6 views rendered, **light and dark**
- [ ] Every viewport in the suite measured — portrait phones, landscape **and** 1440×900
      desktop. Desktop went unmeasured for a whole session (clipped rail, 36px tabs,
      duplicated headline) and landscape was where the unpainted-canvas bug was visible.
      `checks.mjs` runs them; read its output rather than assuming the list
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


## If it says "no venue card"

That is the harness, not the app. Without `VITE_GOOGLE_PLACES_KEY` on the **dev server**,
`fetchVenues` returns `[]` before any request is made, so the fixtures are never
consulted and every venue view comes up empty. `checks.mjs` exits 3 and prints the
command. Do not read it as a fixture gap and do not skip the venue checks — a session
did exactly that and shipped the venue detail view unrendered and unmeasured.

## Then say what was NOT checked

Passing this gate is not the same as the change being safe, and the difference is written
down: **CLAUDE.md §7 lists what the machine enforces and, at the end, everything it does
not.** `openNow` truthiness, invented restaurant facts, content stranded behind an
animation, grown ink on a hit target, **dark mode**, and every iOS-Safari behaviour — a
green run says nothing about any of them. Everything CLAUDE.md labels
**[HUMAN_DECISION]** is unverified until you say you checked it by hand.

Before writing **verified / working / fixed / clean / done**, do all four (CLAUDE.md §6):

1. Name the rung reached and the real exit code.
2. Name the result that would have been **red**.
3. Name anything [HUMAN_DECISION] your change touched that nothing checked — in those words.
4. A timed-out typecheck is **"did not complete"**, never "passed".

Never quote a check count from prose — not from CLAUDE.md, and not from this file. Both
have carried totals that drifted (11, 18, 31, while the suite was at 43), because checks
are added inside loops over viewport combinations. Quote the summary line of the run you
actually did.
