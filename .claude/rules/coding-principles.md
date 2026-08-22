# Coding principles

Purpose: standing engineering guardrails for any code written, reviewed, or refactored.
These are operating rules, not a reading list. Apply them by default. When a rule conflicts
with a clearer outcome, favour the clearer outcome and say why.

## Complexity is the thing to minimise

- Treat complexity as the enemy. Its symptoms: a change forces edits in many places, you
  must hold too much in your head to change something safely, or it is not obvious what to
  modify.
- Design deep modules: a simple interface over substantial functionality. Distrust shallow
  modules whose interface is nearly as complex as their implementation.
- Pull complexity downward. Better for the implementer to absorb it than to expose it to
  every caller.
- Define errors out of existence where feasible. Fewer special cases beat more handlers.

## Clarity over cleverness

- Optimise for the reader. Code is read far more often than written.
- Name for intent and behaviour, not mechanism. A name that needs a comment to be
  understood is the wrong name.
- Comments carry the why and the design intent the code cannot state itself. Do not strip a
  comment that holds intent; do not add one that restates the line.
- Match surrounding conventions unless there is a reason to break them. Consistency lowers
  reading cost.

## Change and abstraction

- Duplicate until the third occurrence, then extract. A wrong abstraction is harder to
  unwind than a little repetition.
- Make illegal states unrepresentable through types, enums, and constrained inputs, rather
  than validating them at runtime.
- Fail fast and loudly. Surface an error at its cause, not three layers away.
- Keep refactors in separate commits from behaviour changes, so review can tell them apart.

## Cohesion over brevity

- Judge a function by cohesion, not line count. A function should do one conceptual thing;
  that thing may take twenty lines.
- Reject the reflex to split code into tiny methods to hit a length target. Scattering one
  idea across five names raises reading cost.

## The Clean Code caution

- Do not apply Robert Martin's Clean Code rules as written. Its function-length dogma and
  extract-till-you-drop guidance reliably produce over-fragmented, harder-to-read code.
  Where it conflicts with clarity and cohesion above, the rules above win.

## Guardrails are not enforcement

- This file shapes behaviour; it does not guarantee it. Anything non-negotiable (coverage
  thresholds, security scans, linter config) belongs in CI, pre-commit hooks, or tests, not
  in prose here.

## Project-specific corrections (earned from live sessions)

Rules taken from real failures, so they stop recurring.

- A guard must be exercised against the exact case it names, or it is decoration. Write the
  failing test first. A check that has never seen its own failure case is not a safeguard,
  however much its name promises.
- Verify the failure path and the return leg, not just the happy path. A redirect that
  reaches the provider proves nothing until the callback that persists the session is
  tested. Half a flow verified is a flow not verified.
- Root-cause before patching. Three symptoms in one family are one cause. Stop and find the
  shared root rather than shipping a third patch on top of two reactive ones.
- Reconcile docs, ledgers, and comments against live reality before trusting them. Stale
  state has cost whole cycles here, including an API key marked "public" that production had
  already proxied.
- No regression net means every fix is free to break another. Pin current behaviour with
  characterisation tests before changing inherited code (Feathers, *Working Effectively with
  Legacy Code*).
- Do not compress out the verify step under time pressure. The step skipped when rushed is
  the one whose absence keeps getting paid for.

Sources drawn on: *A Philosophy of Software Design* (Ousterhout); *The Pragmatic
Programmer* (Hunt and Thomas); *Working Effectively with Legacy Code* (Feathers);
*Test-Driven Development by Example* (Beck). Kept deliberately short: the model already
holds these texts, so this file exists to select and enforce, not to teach.
