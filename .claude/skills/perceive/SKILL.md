---
name: perceive
description: MANDATORY before shipping any UI change to whats-good. Audits an interface the way a stranger on a street actually perceives it — affordance, discoverability, cognitive load, scanning order, error recovery. Catches "the feature exists but nobody can find it", which is the failure mode this project ships most. Use whenever adding, changing or reviewing a control, a filter, a list, a card or an empty state.
---

# perceive — what the human eye and brain actually do with this screen

## Why this exists

Every UI defect this project has shipped passed `tsc`, passed `checks.mjs`, and looked
correct in a screenshot. They were not rendering bugs. They were **perception bugs**:
the pixels were right and the human could not use them.

The proof, found the day this skill was written: `Sidebar.tsx` carried a comment saying
*"The scroll affordance is a mask on `.chip-rail` itself (see index.css)"*. There was no
mask in `index.css`. The CSS explicitly set `scrollbar-width: none` and
`::-webkit-scrollbar { display: none }` and added nothing in their place. A horizontal
rail with nine cuisines scrolled with **zero** visual cue, for this project's whole life.
The user's words: *"If I didn't know that I'd have to scroll to see more cuisine options,
then I'd be fucked."*

Nothing on any machine could fail that. A comment described the feature; the feature was
absent; every gate was green. **This skill is the gate for that class of defect.**

`inspect` proves a thing EXISTS. `judge` decides if it is GOOD ENOUGH TO SHIP.
`perceive` asks the question between them: **can a stranger, in three seconds, on a
street, one-handed, tell that it is there and what it does?**

---

## The rule

> **Presence is not perception. A control the user cannot see, cannot reach, or cannot
> predict does not exist — no matter what the DOM says.**

Never write "added X" when what you can defend is "X is in the DOM". State whether a
first-time user would *find* it, and say how you know.

---

## The seven passes

Run every one. Each has a named failure this project actually shipped.

### 1. Affordance — does it look like what it does?

Hidden scroll, hidden tap, hidden state. If a region scrolls, it must **advertise** it:
a clipped element, a gradient mask, a scrollbar, an arrow, a peeking neighbour. A row
whose contents end flush at the container edge reads as complete.

- Scrollable region with no visible cue → **FAIL**
- Tappable thing drawn like static text → **FAIL**
- `scrollbar-width: none` with nothing replacing it → **FAIL**
- Shipped here: the cuisine rail (above). Also: `100vh` bottom chrome, and the filter
  sheet stranded on its keyframe's `from` state.

**Test:** cover the screen, uncover for 3 seconds, cover again. List what you believed
was interactive. Anything interactive you did not list has no affordance.

### 2. Discoverability — is the capability *knowable* without being told?

The strongest version of this failure: the app can do something valuable and never says
so. The user finds it by accident or never.

- Multi-select that looks single-select → **FAIL**
- A result category the user never asked for and cannot filter → **FAIL**
  (Shipped here: guest houses appearing in restaurant results with nothing naming them
  as a type and no way to include or exclude them. The data was fine; the silence was
  the defect.)
- A gesture with no visible entry point → **FAIL**

**Test:** name every capability of this screen. For each, name the pixel that reveals it.
No pixel → not discoverable.

### 3. Cognitive load — how much must be held in the head?

Miller: ~4 chunks in working memory, not 7. Hick: decision time grows with the log of
the number of options.

- More than ~5 competing choices at one level without grouping → reconsider
- The user must remember what they set on a previous screen → surface it
- Two controls that look alike but behave differently → merge or differentiate
- Ask: what does this screen make the user *compute*? Compute it for them.

### 4. Scanning order — does the eye land where the value is?

Latin-script readers scan F/Z; the eye goes to the largest, highest-contrast, most
isolated element first. Contrast and whitespace outrank position.

- Rank every element by visual weight. Does that ranking match importance?
- The single most valuable fact on a venue card is **can I go there right now** — open
  state and distance. If price or a photo outweighs those, the hierarchy is inverted.
- Isolation beats size: one chip alone in whitespace outranks a big chip in a crowd.

### 5. Feedback — does every action confirm itself within 100ms?

- Tap with no visual acknowledgement → **FAIL**
- Filter applied with no change in the result header → **FAIL** (the user cannot tell it
  worked; they tap again)
- Loading with no skeleton → the user assumes it broke
- State that changes off-screen with no signal → **FAIL**

### 6. Recovery — what happens when it goes wrong?

CLAUDE.md §5 names Trust and Recover as the two most-skipped stages. This pass is that
rule, enforced.

- Empty state that only says "nothing found" → **FAIL**. It must name *which* constraint
  emptied the list and let it be dropped in one tap.
- Error with no next action → **FAIL**
- A filter combination that can never return results → say so *before* the search

### 7. Thumb and posture — one hand, standing, mid-range phone, bright sun

- Everything primary in the bottom two-thirds. Top corners are for non-urgent things.
- 44×44pt minimum, via an invisible box — never by growing the visual ink (§11.3)
- Adjacent targets need clearance or the wrong one gets hit
- Does it survive a cracked screen at arm's length in sunlight? That is the real device.

---

## Output format

Report findings ranked by **how many users hit it × how stuck they get**. For each:

```
[pass] SEVERITY — what a real person experiences, in their words
  Evidence:  file:line, or the measurement/screenshot
  Why:       the perception principle it violates
  Fix:       the smallest change that removes the failure
```

Severities: **BLOCKER** (capability is unreachable) · **MAJOR** (findable only by
accident) · **MINOR** (friction).

End with the honest line, and never omit it:

> Passes run: N of 7. Not checked: <list>. Verified on: <viewports/modes, or "not
> rendered — no visual check was made">.

---

## Hard rules

1. **Never fight §7.** This skill governs *affordance, hierarchy and cognition* — never
   palette, typeface or aesthetic direction. Warm editorial, Schibsted Grotesk and the
   single terracotta accent are decided. If a finding requires changing them, the
   finding is wrong. This is exactly why §14.3 refuses the generic design skills.
2. **A comment is not a feature.** Grep for the thing the comment claims. The rail's
   missing mask was found this way and no other way.
3. **A green check is not perception.** `checks.mjs` measures overflow and hit targets.
   It cannot see that a control is invisible to a human. Say which passes were done by
   eye and which by machine.
4. **Never invent a fact to fill a gap** (§8). If a field is absent, the fix is to render
   nothing — never a placeholder, never a plausible guess.
5. **Report what you did not check**, in those words. An unrun pass is unknown, not fine.
