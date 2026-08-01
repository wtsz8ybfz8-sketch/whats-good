---
name: judge
description: Adversarial pre-ship review for whats-good, scored against real street usage, the customer journey, product coherence, engineering rigour and Apple HIG. Run BEFORE telling the user something is ready, done, shippable or good — and before any deploy. Produces a blocking verdict with named evidence, not an opinion. Use whenever work is about to be presented as finished.
---

# judge — the review that is allowed to say no

`inspect` stops you deceiving yourself about facts. **`judge` stops you shipping something
true but bad.** It is adversarial on purpose: its job is to find the reason this is not
ready, and to state it before the user has to.

**A judge that never fails is theatre.** If a run produces no BLOCK and no CONCERN, you
have not judged — say so and run it properly.

## How to run it

Score all five dimensions. Every finding cites **evidence you personally obtained this
session** — a measurement, a screenshot you looked at, a command's output. A finding whose
evidence is "I read the code" is marked `UNVERIFIED` and cannot clear a gate.

Verdict per dimension: **BLOCK** (must not ship), **CONCERN** (ship with it named to the
user), **PASS** (evidence held).

---

## 1. Real street usage — the actual conditions

The user is standing outside, one-handed, on a mid-range phone, on mobile data, possibly
in sunlight, possibly at 23:40 deciding where to eat.

- Does the first screen answer "where do I go **now**" without a tap? Not "is it pretty."
- Reachable one-handed? Bottom third of a 390×844 screen holds the primary action?
- What happens on 3G, on a dead zone, with location denied, at 02:00 when everything is
  shut? **"Nothing is open" is a real answer and must be a good screen.**
- Does anything move, zoom, or reflow after first paint? *(iOS focus-zoom shipped for this
  project's entire life and reached the user as "padding is weird and things move.")*
- Would you bet a 25-minute walk across a strange city on what this screen says?

**Auto-BLOCK:** any invented fact presented as real. A fabricated price, time, or opening
hour sends a person somewhere for nothing. This project has shipped synthesised menus,
invented nutrition science, and prep times derived from the user's own filter setting.

## 2. Customer journey (CLAUDE.md §5)

Orient → express intent → choose → **trust** → explore → act → **recover**.

Name the stage the change moved, and prove no other stage regressed.

- **Trust** and **Recover** are the two that decide whether this beats Google Maps, and
  they are the two consistently skipped.
- Every dead end must offer a way forward. *(Happy Hour was an apology screen in every
  city but one, for a month.)*
- Does an error state tell the user something they can act on, or does it blame them?

**Auto-BLOCK:** a state with no way forward. A retry button that provably cannot help.

## 3. Product coherence

- Does this make the product **more itself**, or just add surface? CLAUDE.md §1: a
  prettier directory of generic metadata is a failure, and so is raw data with no
  judgement in it.
- Would you demo this screen to a stranger without apologising for something on it?
- Is there a decision layer — *why this place, for this person, now* — or only fields?
- Does the copy sound like a warm editorial voice or like an assistant? (§7)

**Auto-CONCERN:** any screen whose value is "we have data" rather than "here is what to do."

## 4. Engineering

- What is the **blast radius** if this is wrong in production? Who notices, and how?
- Is it observable? *(This project has no telemetry at all. Nobody would know it broke
  except by opening it — and that is how every defect so far was found: by the user.)*
- Can it fail **loudly** rather than silently? Silent degradation is the worst outcome and
  this codebase's speciality — a stylesheet rule that never applied, a photo attribute
  that disabled a security control, a red CI that deployed anyway.
- Is there a check that would catch the regression? If not, say so in those words.
- Does it add cost per user? Is that cost bounded?

**Auto-BLOCK:** shipping code no gate covers *and* not telling the user that.

## 5. Apple HIG and platform truth

- **Deference:** does the interface get out of the way of the content?
- **Clarity:** legible at arm's length, in sun, at the smallest supported size.
- **Feedback:** every tap acknowledged within 100ms.
- Hit targets ≥44pt via invisible bounding boxes — **never by growing the visible ink**.
- Respects `prefers-reduced-motion`, Dynamic Type, dark mode, safe areas, landscape.
- No unintended zoom. No `100vh`. `viewport-fit=cover` present. `theme-color` correct in
  both schemes.
- Does back **restore** rather than reset?

**Platform truths headless Chromium cannot test — never claim them from a local render:**
safe-area insets, focus-zoom behaviour, rubber-band overscroll, real Dynamic Type.
Say "not verified on device" and mean it.

---

## Output format

```
JUDGE — <what was judged> — <date>

1 Street usage      PASS | CONCERN | BLOCK — <evidence>
2 Customer journey  PASS | CONCERN | BLOCK — <stage moved, stages checked>
3 Product coherence PASS | CONCERN | BLOCK — <evidence>
4 Engineering       PASS | CONCERN | BLOCK — <blast radius, gate coverage>
5 Apple HIG         PASS | CONCERN | BLOCK — <measured, and what was NOT measurable here>

VERDICT: SHIP | SHIP WITH NAMED CONCERNS | DO NOT SHIP
UNVERIFIED CLAIMS: <every finding without first-hand evidence, or "none">
NEVER-INSPECTED SURFACES TOUCHED: <from INSPECTION-LEDGER.md, or "none">
WHAT THE USER WILL FIND THAT I DID NOT: <answer honestly — this is the point>
```

The last line is mandatory. **Every significant defect in this project's history was found
by the user, not by a check.** If you cannot name a plausible candidate, you have not
looked hard enough — go back to §1 and try to break it.
