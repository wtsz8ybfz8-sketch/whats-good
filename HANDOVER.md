# HANDOVER

## Status

**`main` is at `590055a`, pushed, and GREEN.** `verify/checks.mjs` **51/51, 0 skipped,
exit 0**; `npm run build` exit 0. This is the consistent slate — production is safe.

**The result-backed cuisine count SHIPPED** and is on `main`: the rail title reads
"Cuisine — optional · 6 in these results", derived from venues already fetched, omitted
at zero. The per-chip availability dot is deliberately NOT shipped — see "What changed".

**Vercel Authentication is now OFF** (`ssoProtection.enabled: false`). Every
`.vercel.app` URL is publicly readable. Done deliberately at the user's request so the
app could be shared. Revisit before the app holds anything private.

Public URL: `https://whats-good-git-main-nizzle-s-projects.vercel.app`

## Objective

Get a shareable, functional build live before a domain purchase, and find the cause of
the "gap at the Dynamic Island" that no local render had ever reproduced.

## What changed

**1. Eleven unmerged commits reached `main` (`9aab341`).** All of
`claude/branch-comparison-merge-plan-xtv9e1`: chrome retraction on scroll, list-state
restore on back/forward, truthful rating counts and weekly hours, the "why this place"
decision layer, un-squished venue actions, no phantom phone numbers. **Production had
never served any of it.** The user reported these as regressions; they were unmerged
work sitting on a branch. Merged clean; checks went 43 → 51.

**2. The black band at the Dynamic Island — found and fixed (`f376a2d`).** Not a gap,
and the header's safe-area model was never wrong. A browser uses the FIRST `theme-color`
whose media matches. `index.html` declares two at the top of `<head>` keyed to
`prefers-color-scheme`; `App.tsx` maintained a third live one driven from the manual dark
class and **`appendChild`d it to the END of `<head>`, where it was never reached** — a
no-op for exactly the case it existed to handle. On a phone set to dark with the app
toggled light, Safari painted near-black chrome around a white page. Now `prepend`ed.
Verified by a probe (`colorScheme: dark` + stored light preference) reporting order
`[0] (no media) #F4F2EF`, `[1] light`, `[2] dark`, winner `#F4F2EF`. That probe fails
against the previous code.

**3. `.action-bar::before` deleted (`f376a2d`).** Its 24px gradient faded to
`--bg-warm`, the page canvas — invisible against the canvas, a washed band with a hard
edge elsewhere. In `ci/ios-shots/light-find.png` it renders over the "Mood, diet &
budget" row, greying out a live control so it reads as disabled.

**4. PWA installability (`ee70b25`).** Manifest plus 192/512/maskable/apple-touch icons
built from the existing header mark. Icons live under `/assets/` because `vercel.json`
rewrites every other path to `/`; `-vN` filenames because that directory is cached
immutable for a year.

## Customer journey impact

**Trust** and **Orient**: the browser chrome no longer disagrees with the app's own
theme, and venue pages finally carry the decision layer written for them.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite on `main` | `node verify/checks.mjs` | **51/51, 0 skipped, exit 0** |
| Build on `main` | `npm run build` | **exit 0** |
| theme-color precedence | probe: dark system + light app | **`#F4F2EF` wins** |
| iOS Simulator capture | `ci/ios-shots`, 8 PNGs | **all hashes distinct — genuine** |
| Device probe | `PROBE.txt` | 402×678, dpr 3, vh 760 / dvh 678, insets all 0 |
| Suite on `cuisine-count` | `node verify/checks.mjs` | **exit 1 — click timeout** |
| `tsc --noEmit` | — | **NOT RUN.** CI runs it on push. |

**Insets read 0 in Safari portrait and that is CORRECT** — Safari's own toolbar occupies
that space. They are non-zero only in the installed home-screen app (top 59px Dynamic
Island, bottom 34px home indicator).

## Protected decisions

- **The live `theme-color` must stay FIRST in `<head>`.** Appending it is a silent no-op.
- **No new Places requests.** The cuisine count derives from venues already fetched.
- **Icons stay under `/assets/` with `-vN` filenames.**
- **`ci/ios-shots` is the way to see this app on iOS.** `git fetch origin ci/ios-shots`,
  extract the PNGs, **read them** — and md5 them first: runs 4–7 were all the same screen.

## Next session: first three actions

1. **Trigger `ios-safari.yml` on `main` and read `ci/ios-shots/dark-find.png`.** The
   theme-color fix has never rendered on a device. Expect light app + light chrome, or
   dark + dark — never black chrome around a white page. `md5sum` the four light tabs
   first; runs 4–7 were all the same screen behind a permission dialog.
2. **Restore the per-chip availability dot properly.** It needs `relative` on the chip
   button (Tailwind `sr-only` is `position: absolute` and escapes an unpositioned
   parent), or the supplementary text moved off the accessible name via
   `aria-describedby`. Add a check that fails when it regresses — this one cost four
   runs.
3. **Reconcile `kqu3fy`** if real Google rating data is wanted; it re-solves what
   `xtv9e1` already did, with 7 conflicts, 5 in source.

**How to debug this suite, learned the hard way:** run it to a file and read the tail
UNFILTERED. Grepping for `✗|Error` hides every `✓`, so the last passing check is
invisible and the failure looks like it happened somewhere it did not. Three hypotheses
were "disproved" against that hidden log and all three conclusions were worthless.
`grep -c "✓\|✗"` gives the check number it died on; `main` alone is the control.

**Exact starting point:**
```bash
cd /home/user/whats-good && git checkout main && git pull origin main
node verify/serve.mjs up && sleep 5
cd verify && NO_PROXY='*' node checks.mjs; cd .. && node verify/serve.mjs down
```

## Known risks and open questions

- **The theme-color fix has not rendered on a device.** Two iOS runs were queued against
  `9aab341`; neither has been read, and neither contains `f376a2d`. Trigger
  `ios-safari.yml` on `main` and read `ci/ios-shots/dark-find.png` — the app should now
  be light with light chrome, or dark with dark.
- **`kqu3fy` (4 commits) and `rz1d3f` (5) remain unmerged.** `kqu3fy` has **7 conflicts**,
  5 in real source, because it re-solves rating data a second way against `xtv9e1`'s
  version. `rz1d3f` conflicts only in docs but deletes `verify/devices.mjs`.
- **`RecipeView` still prints `recipes.length` while gating on `some(isEatery)`**, so a
  mixed list announces recipes as eateries. A fix exists on
  `claude/three-layer-restaurant-model-jncy93`; not merged.
- **Vercel Authentication is OFF.** Deliberate, but a live security posture change.
- **`tsc` has not run locally this session.** CI runs it on every push.
