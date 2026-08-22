# Product principles — psychology and marketing

Purpose: the product-side guardrails for What's Good. Engineering hygiene lives in
`coding-principles.md`; this file governs what gets built and why. Both auto-load together
from `.claude/rules/`. Apply these when choosing what a screen does, what a feature is for,
and whether a thing should exist at all.

## The product is a decision engine, not a directory

- Core job: reduce the cost of deciding, not maximise the options shown. If the output is a
  long list the user must sift, the product has failed at its one job.
- Default to a confident single recommendation with a stated reason. Let the user expand to
  alternatives; do not open with a wall of results. (Hick's Law: decision time rises with
  the number and complexity of choices. Schwartz, *The Paradox of Choice*: more options
  lower satisfaction and raise regret.)
- One clear next action per screen. Cognitive load at the moment of choice is the enemy.

## Trust is the currency; false confidence spends it

- Never assert an unverified fact with a confident glyph or definitive phrasing. A wrong
  "step-free" or "vegan" from a stale third-party tag does more damage than showing
  nothing, because a decision engine that misinforms has spent the only thing it sells.
  (Lee and See, appropriate reliance.)
- Mark third-party or uncertain facts as unconfirmed, and show provenance. Verified local
  truth is the moat.

## Positioning before features

- State what What's Good does that Google Maps and every other finder does not, in one
  sentence, before adding anything. A directory you search versus an engine that decides
  for you is a positioning choice, and it dictates every screen. (Dunford, *Obviously
  Awesome*.)
- Design around the job the user is hiring the app for in the moment — date night, a fast
  weeknight cook — not around a cuisine taxonomy. Occasions are jobs. (Christensen, *Jobs
  to Be Done*.)

## Intrinsic value over engagement tricks

- Retention comes from genuine usefulness, not streaks, variable-reward loops, or dark
  patterns. Surface intrinsic product qualities; no manipulative nudges.
- Uniqueness is earned through a real, defensible difference (better decisions, verified
  local facts), not novelty for its own sake.

References: Schwartz, *The Paradox of Choice*; Hick's Law; Dunford, *Obviously Awesome*;
Christensen, *Competing Against Luck* (Jobs to Be Done); Lee and See, *Trust in
Automation*. Kept short: select and enforce, not teach.
