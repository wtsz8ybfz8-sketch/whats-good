---
name: inspect
description: MANDATORY before claiming any part of whats-good works, is fixed, is safe, or is impossible. Enforces evidence-over-assertion — presence in a file is never proof of effect, a document is never evidence, and an unopened surface is never "fine". Use before writing "verified/working/fixed/clean/done/impossible", before any deploy, and whenever asked whether something works.
---

# inspect — the anti-self-deception gate

`qa-gate` proves the suite is green. **This skill exists because green suites have sat
on top of broken products all day.** It targets the four ways this project has actually
been misled, every one of them observed, not hypothesised.

## The Four Laws

### 1. PRESENCE IS NOT EFFECT

A rule existing in a file is not the rule applying. Measure the *result*, never the
*source*.

> `index.css` carried an anti-zoom rule under a comment saying it was fixed "so a new
> input can't reintroduce it." It sat in `@layer base`; Tailwind utilities sit in a later
> cascade layer and beat it. **Measured: 14px, not the 16px the file claimed.** The rule
> was present and provably inert for the project's entire life. The user found it on
> their phone.

Same class: `.safe-x` replacing padding it meant to add. `referrerPolicy="no-referrer"`
silently disabling the key restriction the docs kept recommending.

**Rule:** for anything with a computed result — CSS, layout, headers, network — read the
computed value from a live browser. `getComputedStyle`, `getBoundingClientRect`,
`elementFromPoint`, the actual request. Never `grep`.

### 2. A DOCUMENT IS A CLAIM, NOT EVIDENCE

`HANDOVER.md`, `CLAUDE.md`, code comments and previous sessions are **testimony with an
author and a date**. They are wrong regularly.

> The handover asserted for several sessions that the Places key was unset and that this
> was the one blocker. A user screenshot showed 33 live Paris bars. It had been set the
> whole time.

**Rule:** when repeating a claim from a document, say where it came from and when. When
two records disagree, mark it **CONTESTED** — never pick the one that fits the plan.

### 3. AN UNOPENED SURFACE IS NOT A WORKING SURFACE

"I have never looked at this" and "this is fine" are different sentences. Say the first
one out loud.

> Recipes had never been inspected. First look found prep/cook times fabricated from a
> step-count heuristic and rendered as the three biggest numbers on the screen — and when
> an effort filter was set, the times were derived FROM THE FILTER. The app told the user
> what they had just asked to hear, dressed as a fact about the dish.

**Rule:** consult `INSPECTION-LEDGER.md` before reporting on any surface. If it says
NEVER INSPECTED, either inspect it or say those words to the user. Update the ledger with
date and method whenever you inspect something.

### 4. VALIDATE THE TEST BEFORE BELIEVING THE RESULT

Your own harness lies too.

> A cost script reported the result cache as broken. The cache was fine — the script
> counted the Find tab's own search as a cache miss. Instrumenting instead of trusting
> the number caught it. Believing it would have meant hunting a bug that did not exist.

**Rule:** before accepting a measurement, state what result would have been produced if
the thing under test were *working*. If your test cannot distinguish the two, it is not a
test. Prove a new check can go red (sabotage it, watch it fail, restore).

## The Impossible Register

**"Impossible" requires a command and its output. No exceptions.**

Things this project once treated as impossible that were merely un-attempted:

| Claimed | Reality |
|---|---|
| "Send me a screenshot, I can't see the app" | Chromium is pre-installed. A true 390px viewport takes ~90s. Sessions asked the user for photos of their own phone for weeks. |
| "The venue tab can't be tested here" | It could — the dev server needed a key, not a different container. |
| "Deployment is unreachable / protection is on" | The proxy 403s *everything*. That says nothing about the deployment. |

Genuinely impossible **and verified so**: setting a Google Cloud quota — checked
`which gcloud`, `~/.config/gcloud`, and the env; no credential exists in this session.
That is what a verified impossibility looks like: a command, an output, a date.

**Rule:** before saying you cannot do something, run the check that proves it and quote
it. "I don't have access" without a command is a guess.

## Before writing verified / working / fixed / done / safe / impossible

1. Name the **measurement** and its literal output. Not the file you read.
2. Name what would have been **red**. If nothing could have failed, say "not verified".
3. Name every surface your change touched that is **NEVER INSPECTED** in the ledger, in
   those words.
4. A timeout is **"did not complete"** — never "passed".
5. If the user found it before you did, say so. That is the metric that matters.

## Cheapest honest inspection of a new surface

Roughly ten minutes, in this order — stop as soon as you find something real:

1. **Where does the data come from, and is any of it invented?** Grep the type, then
   trace every field to its origin. A field with no upstream source is fabricated.
   (This is how the recipe timings were found.)
2. **Open it in a real browser** at 390×844, light and dark. Look at the screenshot.
3. **Computed styles on anything interactive** — font-size ≥16px on phones, hit targets,
   contrast.
4. **What happens when it is empty, offline, or wrong?** Recover is the stage that gets
   skipped.
5. **Legal surface** — invented facts, missing attribution, data sent to third parties.
6. **Write what you found in `INSPECTION-LEDGER.md`, including what you did NOT check.**
