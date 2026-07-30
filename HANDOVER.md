# HANDOVER

## Status

**Branch `claude/three-layer-restaurant-model-jncy93`, last commit `ee70b25` (== `origin/main`).**
**Working tree is DIRTY and UNCOMMITTED — 4 modified files, deliberately not committed.**
The user authorises commits explicitly; none was given for this patch.

`verify/checks.mjs` **43/43, 0 skipped, exit 0**. `npm run build` **exit 0**.
`tsc --noEmit` **NOT RUN** (see Verification). No dev server left running.

**Defect 2 of the three requested (mobile header safe-area gap + mobile logo lock-up)
was NOT implemented.** Defects 1 and 3 are complete and verified. See "Next session".

## Objective

Three user-reported defects: (1) the Cuisine rail does not say which categories the
current area actually has; (2) a gap behind the mobile header at the Dynamic Island;
(3) a glossy line from the fixed chrome, plus a venue count that disagreed with the grid.

## What changed

**1. Result-backed cuisine availability (`src/components/Sidebar.tsx`).**
`nearbyCuisines` — already derived in `App.tsx:869` from venues in hand — was used only
to append extra chips. It now also marks which chips the CURRENT results contain:
a terracotta dot per chip (with an `sr-only` "— in these results", because colour alone
fails WCAG 1.4.1), result-backed chips ordered first, and a truthful count beside the
title ("· 5 in these results"), omitted entirely when the count is 0. **Zero new Places
requests** — no new field, fetch or photo.

**2. The rail scrolled past its own new chips (`src/index.css`, `Sidebar.tsx`).**
Promoting chips to the front made the row re-target to its previously snapped chip:
measured `scrollLeft` **613px**, so all five available cuisines started off-screen while
the count above them said "5 in these results". `overflow-anchor: none` alone did **not**
fix it (still 613) — the re-target is scroll-SNAP, not scroll anchoring. Fixed with an
explicit `scrollLeft = 0` keyed to the chip set (`resetKey`). Now **4px**.

**3. Rail clipping and affordance (`Sidebar.tsx`, `index.css`).**
`pb-1` → `py-1.5`: `overflow-x:auto` computes `overflow-y` to auto, so 4px clipped every
chip's focus ring. The scroll affordance is a **mask** on `.chip-rail`, not an overlay.
The first attempt was an overlay fading to `--bg-warm`, which was the wrong tone against
the `.surface` card it sits on — and no single colour is right in both schemes, since
`--surface-bg` is `#FDFCFA` light but *translucent* in dark. A mask is background-agnostic
and cannot intercept a tap. Tradeoff accepted: the fade persists at the scroll end.

**4. The glossy line (`src/index.css`, `src/App.tsx`).**
`.action-bar` drew **three** treatments at one seam: `border-top`, `box-shadow:
0 -8px 24px`, and a `::before` 24px gradient. Invisible against the canvas (the gradient's
end colour IS the canvas), banded and shiny over a `.surface` card. The `::before` is
deleted and the shadow tightened to `0 -1px 10px`. `App.tsx` loses `md:before:hidden`,
which was a cover-up for that pseudo escaping when the bar goes `static` at md.

**5. Truthful venue count (`src/components/RecipeView.tsx`).**
The headline gated on `recipes.some(isEatery)` but printed `recipes.length`, so one venue
in a list of recipes announced them all as eateries. Now counts venues only; `city` is
guarded so an unresolved city no longer renders "near " with a dangling preposition.

## Customer journey impact

**Discovery** — the rail answers "what can I find here?" before the user experiments.
**Trust** — the headline number now describes the grid beneath it, and the availability
dot is never asserted from anything but returned venues.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite | `node verify/checks.mjs` | **43/43, 0 skipped, exit 0** |
| Build | `npm run build` | **exit 0** |
| Whitespace | `git diff --check` | **clean** |
| Rail scroll on load | probe | **613px → 4px** |
| Chip order | probe | Italian, Tapas, French, Japanese, Ramen **first**, all 5 dotted |
| Count line | probe | "Cuisine — optional · 5 in these results" |
| Headline vs grid | probe | **claims 5, 5 cards rendered** |
| Chips clipped vertically | probe, 390/393/1440 | **0 clipped** (rail 56px / chip 44px) |
| `.action-bar::before` | probe on `tab=mood` | `content: none` — seam gone |
| Desktop fade removed | probe | `::after display: none` at 1440 |
| Chips keyboard-focusable | probe, light + dark | **13/13, tabIndex ≥ 0** |
| Deep link | `?city=Cape+Town&tab=mood` and `&tab=random` | loads, **0 console errors** |
| Screenshots read | 390 light + dark, 1440 | **yes — both defects below were found this way** |
| `tsc --noEmit` | — | **NOT RUN.** Pathologically slow here; CI runs it on push. |

**Two defects were found ONLY by looking at a screenshot**, after every assertion was
green: the wrong-coloured fade, and the 613px scroll. Both would have shipped.

**`?tab=random` is the "Stay In" COOKING tab, not restaurant discovery.** The Cuisine
rail lives on `tab=mood` ("Find a Place"). The reference URL supplied points at cooking.

## Protected decisions

- **No new Places requests.** Every value derives from venues already fetched.
- **The rail affordance is a mask, never an overlay** — an overlay must know the colour
  behind it, and no colour is right in both schemes on a `.surface`.
- **Curated baseline chips are never hidden** when absent from results. Asking for sushi
  where none returned is legitimate; the dot marks availability without shrinking the
  vocabulary.
- **The count is omitted at 0**, never rendered as "0 available".

## Next session: first three actions

1. **Implement defect 2 — the mobile header safe-area gap and the mobile logo lock-up.**
   NOT started. The header model at `App.tsx:907-909` (`height: calc(60px +
   env(safe-area-inset-top))`, `paddingTop: env(...)`) with `.chrome-bar`'s
   `background: var(--bg-warm)` appears correct by specification, and **this container
   cannot reproduce the gap** — headless Chromium reports every inset as 0, which is also
   the correct value here. Start by asking the user whether the gap appears in Safari, in
   the installed Home-Screen app, or both: `apple-mobile-web-app-status-bar-style:
   black-translucent` (`index.html:25`) behaves differently in standalone mode and is the
   strongest untested hypothesis. Do not guess at a fix that cannot be seen.
2. **Get the user's authorisation to commit this patch**, then commit and push.
3. **Investigate "near your area" vs the header's "Cape Town".** With `?city=Cape+Town`
   the header chip reads "Cape Town" while the headline reads "near your area" — the
   `city` reaching `RecipeView` differs from the header's. Not in this pass's scope;
   observed, not diagnosed.

**Exact starting point:**
```bash
cd /home/user/whats-good && git status --short     # 4 modified files, uncommitted
node verify/serve.mjs up && sleep 5
cd verify && NO_PROXY='*' node checks.mjs && cd .. && node verify/serve.mjs down
```

## Known risks and open questions

- **Nothing in this patch is verified on a real iOS device.** Chromium at 390px cannot
  fail a safe-area bug. Do not claim otherwise.
- **The mask fade persists when the rail is scrolled fully right**, so the last chip
  stays soft, mildly implying more content. Removing it needs scroll-driven animation.
- **`overflow-anchor: none` was kept although it did not fix the scroll jump**, because
  both anchoring and snapping can move a scroller on insertion and only snapping is now
  handled explicitly.
- **`tsc` did not run.** Two `.tsx` files changed, so unlike the PWA pass this is a real
  gap, not a check that cannot fail. CI will run it on push.
- Carried forward: the Find tab still opens on a form, not on food; the hex ratchet is
  unchanged; `?tab=random` naming does not match the surface it opens.
