# Handover

## Status
**`claude/pin-sizes-padding-fixes-59sze8` is at `<unstamped>`, pushed. `main` == this branch (fast-forwarded each step).**

Local `main` was a stale, unrelated history (`ded4827`); it has been repointed at `origin/main`. There is now one main.

## Objective
Reconcile the two divergent Vercel lines (pin-size fixes vs padding fixes) onto one branch, fix the desktop defects the user reported, and put the project's research discipline on a permanent footing.

## What changed
- Combined the cuisine-chip/dot + header un-crush (from `app-branch-assessment`) onto main's padding/Share line.
- **Fixed the desktop filter-panel bleed** (`md:` force-open removed) — the real cause of "restaurant/Happy Hour loads way down"; every tab and the venue detail now paint at the top on desktop.
- **Desktop venue-detail redesign** — controls moved off the image into a toolbar, hero contained to the content column, square corners. Mobile byte-identical.
- **Removed the stray desktop "Find a place" CTA** (mobile-only now).
- Two mobile web-standard guards (`-webkit-tap-highlight-color`, `text-size-adjust`).
- **CLAUDE.md §2A THE BENCHMARK LAW** + **BENCHMARKS.md** — no work on thin research, ever; cited HIG + market teardown, with a split-view spec for the detail.

## Customer journey impact
Desktop **Act** improved (utility/actions no longer buried under bled-over filters; controls legible). **Explore still regressed on desktop**: selecting a venue destroys the list (phone push-nav) — the split-view fix (below) is what closes it. **Recover** unchanged and strong (Happy Hour empty state). Mobile journey untouched.

## Verification and actual results
- **qa-gate:** `checks.mjs` **58/58 exit 0**; **`tsc --noEmit` exit 0**; **`vite build` exit 0**; driver 6 views light+dark rendered and read.
- **perceive (7/7 by eye):** 2 MAJOR — (a) desktop "open now/hours" below the 440px hero; (b) desktop push-nav destroys the list. Cuisine rail wraps (no hidden-scroll); Happy Hour recovery strong.
- **judge:** SHIP WITH NAMED CONCERNS. Engineering CONCERN — the filter-bleed and stray-CTA fixes shipped with **no regression check**.
- **NOT verified (honest):** hero over a **real photograph** (only a flat fixture gradient), **landscape** detail, the **1024–1199** width band, **measured contrast** of the new toolbar. On-device iOS never verifiable here.

## Protected decisions
- Reject Liquid Glass / heavy translucency on content — `.glass` stays on the 2 chrome surfaces only (§7).
- Square (non-rounded) hero on desktop — explicit user preference; de-rounding elsewhere is an open, tokens-first decision.
- Mobile venue detail is unchanged and must stay so (all desktop work is `lg:`-gated).

## Next session: first three actions
1. **Re-architect the desktop venue detail as a master-detail split view** per BENCHMARKS.md §3.1 (persistent list ⅓ + detail ≥⅔, 1pt divider, `lg+` only). This is the root fix for "feels like a phone." Founded, not started.
2. **Add regression checks** to `checks.mjs`: (a) a venue detail / non-mood tab renders at the top on desktop (no filter bleed); (b) no stray CTA below the footer at `md+`. qa-gate's own rule — a fix ships with its check.
3. **Verify honestly:** render the detail over a real photo, in landscape, and across 1024–1199; **measure** the toolbar Share/Save contrast to WCAG 2.2 AA.

## Known risks and open questions
- **Public API key** (ledger open #2), **no privacy policy/terms** (open #3, GDPR/CCPA), **red CI still deploys** (open #4), **zero telemetry** — the real launch-readiness blockers, none about looks.
- `EateryView.tsx`, `Sidebar.tsx`, `App.tsx` are only **partially** inspected (see ledger) — none has had a full audit.
- BENCHMARKS.md is **snippet-level** for the Apple HIG primary docs (SPA won't render for `WebFetch`) and for competitor pages (403s) — the open research debts are listed there; close them with a JS-capable browser.
