# Handover — 2026-07-25 (session 2)

Live: **https://whats-good-nu.vercel.app** · Vercel project `whats-good` (`nizzle-s-projects`)
Repo: `github.com/wtsz8ybfz8-sketch/whats-good`

Read `CLAUDE.md` first — stack, design tokens, working agreement, and two standing rules
(no service worker, no invented data) live there.

---

## 🔴 START HERE. Do not write code first.

**Nobody has looked at this app in three sessions.** Every change across those sessions was
shipped on the strength of `tsc` passing and grepping the built bundle. That is why it keeps
reaching the user broken in ways a five-second look would have caught. The user's words:
*"I'm super worried about how you're saying you haven't had your eyes on the app."*

They are right, and it is the single most important thing to fix about how this work is done.

**Your first task is to see the app at 390px and at 1440px, and write down what is wrong.**
Not to implement the list below. The list below is the user's report; your own structural
analysis is what they actually asked for.

### Getting eyes on it — the in-app preview pane does NOT work here

It failed all session: `preview_start` reports success, then every `get_page_text`,
`read_page`, `navigate` and `screenshot` returns **"Policy check in progress for this tab;
retry."** forever, and `tabs_context` shows the tab with an empty origin — it never loaded.
Previous handover reported the same pane as flaky (black screenshots, ~678–800px cap).
**Assume it is unavailable and plan around it.** Options, in order:

1. Ask the user for screenshots at both widths. Cheapest, most reliable, and they are
   clearly willing — they are the one raising the visual problems.
2. Try `mcp__claude-in-chrome__*` (their real Chrome) rather than the in-app browser.
3. `npm run dev` and have the user open `localhost:3000` themselves.

If none work, **say so in the first message and ask how they want to proceed.** Do not
silently fall back to shipping unseen again.

---

## 🔴 The failure pattern to break: near-shipping broken code

Two examples from this session, both caught only by accident:

1. **I broke the fix with my own fix.** Session added `vercel.json` with an SPA catch-all
   rewrite `/(.*) → /`. That swallowed `/sw.js`, which then returned `text/html`. A service
   worker update check *rejects* a non-JS MIME type, so the stale worker could never be
   replaced — the exact bug the file was written to fix, made permanent. Only found because
   the user said "still broken on mobile" and I curled the live headers.
2. **A tap-target change that would have broken saving.** The 44pt hit area was first written
   as an expanded `::after`. It needed `position: relative`, which would have overridden the
   `absolute` those save buttons use to sit in the card corner, and its negative `z-index`
   would have put the overflow *behind the card* — so taps meant to save would have opened
   the recipe. Caught while re-reading, not by any tool.

**Neither would have been caught by `tsc`.** The gate in CLAUDE.md (`npm run lint`) proves
types, nothing else. Before claiming anything works: curl the live artifact, or look at it.

---

## Hardcoded / fabricated data — the user's top priority

They want a sweep for this class of bug. It is endemic. Known instances:

- **`src/placesService.ts:239-247` — the big one, and currently visible.** Every venue that
  comes from the Places API (i.e. nearly every real result) is assigned:
  - `signatureOrder: "House specialty at ${name}"`
  - `signatureDescription: "A featured dining experience at ${name}, located at ${address}."`
  - `digestiveNote: "Always check current menus..."`
  - `estimatedWait: 'Check with venue'`

  These are template strings, not data. `EateryView`'s new "What to expect" block renders
  `signatureOrder` as a **"Known for"** row and `signatureDescription` as the lead paragraph —
  so every restaurant claims a house specialty it does not have. This is the user's
  *"everything has 'house speciality' even when it doesn't exist. See?"* **The block should
  render nothing when the value is a template rather than real content.** Detect and omit;
  do not print a placeholder. An empty section beats a confident lie.
- **`src/venueExtras.ts`** still exports `getVenueExtras()`, which synthesises menus, prices
  and "specials" from a hash of the venue id. It is no longer called (removed this session)
  but the file remains and will tempt someone. The real happy-hour data in
  `src/happyHourData.ts` is human-confirmed and **is** trustworthy — that is the standard.
- **`src/campusData.ts`** is the hardcoded Cape Town fallback used when the Places key is
  absent. Its content is real-ish but photoless; verify before trusting any field.

---

## The user's outstanding list (their words, with what I know)

1. **Remove the health/gut facts from all recipes.** "Unnecessary." This is the
   `gutTip` → "Good to know" block in `RecipeView.tsx` (the `Activity` icon block), fed by
   `ParsedRecipe.gutTip`. Previous handover already flagged it as a bolted-on tangent. Remove
   the block, and ideally the field, from recipes. Note `digestiveNote` feeds the same field
   for eateries — check both paths.
2. **Recipe variety is poor.** Root cause is real: the app uses **TheMealDB**, whose entire
   pool is ~300 meals, and `App.tsx` already fans out across 8 search terms to scrape variety
   out of it. **This is a data-source problem and needs a product decision, not a tweak.**
   Bring the user options (a larger free recipe API, a curated set authored in-repo like
   `happyHourData.ts`, etc.) with trade-offs — do not silently swap dependencies.
3. **Images look cheap — "cut off, weirdly rounded".** They want **a full-bleed image
   somewhere**. Currently every image is a rounded, cropped box: recipe hero
   `h-64 sm:h-96 rounded-3xl`, cards `h-[168px]`/`h-52` with `object-cover`, thumbnails
   `w-16 h-16 rounded-xl`. Nothing ever touches the viewport edge. A real editorial layout
   would let the venue/recipe hero bleed edge-to-edge on mobile. Note the previous session
   *removed* a `w-screen`/`left-1/2` breakout from `EateryView` because it overflowed on
   desktop — so do it properly (bleed on mobile, contained on desktop), don't just revert.
4. **Padding, and glass cut off when scrolling.** Their example: *"why is the gloss/glass cut
   off between 'find a place' and the screen?"* The header is `position: fixed` with `.glass`
   (`backdrop-filter`), and the filter panel below is a separate `.glass` surface, and the
   content scrolls under both. CLAUDE.md's own "Known issues" already says **glass is applied
   to too many surfaces at once — pick two maximum**, and that `backdrop-filter` is the first
   suspect for jank. That known issue is now visibly biting. Fix the layering, don't patch
   the symptom.
5. **Use the design skills.** They are frustrated these are going unused. Available and
   relevant: `interface-design`, `design-taste-frontend`, `anthropic-skills:frontend-design`,
   `anthropic-skills:stop-slop`, `mobile-design`, `design:design-critique`,
   `design:accessibility-review`, `anthropic-skills:ui-ux-pro-max`. **Invoke them via the
   Skill tool** — they were not used in the last three sessions, which is a fair complaint.
6. **Apple HIG** is now an explicit design reference:
   https://developer.apple.com/design/human-interface-guidelines/ — a first pass shipped this
   session (below), but navigation model, type scale, and Dynamic Type are untouched.
7. **Watch usage limits.** Explicit instruction: don't burn the budget in one prompt. Scope
   deliberately, and say what you're leaving out.

---

## What session 2 actually did

All committed and deployed. `3b2d992` is the tip.

- **`439a622` Killed the stale-cache service worker.** `vite-plugin-pwa` had been precaching
  `index.html` + the bundle, so **three sessions of shipped work were invisible on the live
  URL** — the browser served the old cached app forever. Plugin removed; `src/main.tsx`
  unregisters and purges; `vercel.json` sets cache headers.
- **`439a622` Mood/Cuisine icons removed.** The user's repeated complaint. They were
  redundant ("Italian" beside a pizza glyph), non-injective (`Flame` served "Bold & Spicy",
  "Flame Grill" *and* "Latin American"; `Globe` meant "South African"), and made a ragged
  block. Diet/Mood/Cuisine are now one `Chip` component in `Sidebar.tsx`.
- **`439a622` "Stay In" made a real surface.** It looked identical to home because the filter
  panel carried its own Find/Stay In segmented control duplicating the header tabs — and the
  tab's own branch required `selectedRecipe`, always `null` there, so the black "Find a
  recipe" pitch card rendered **100% of the time**. Navigation now owns the mode; Stay In
  loads recipes on arrival and filters by time and kitchen.
- **`439a622` Removed fabricated menus and "specials"** from venue pages (see above).
- **`439a622` De-slopped recipe pages** — killed the mono badges, the auto-generated "A
  classic dish representing X, Y, Z", "Prep Clock"/"Yield (Plates)" jargon, a pulsing icon,
  and three hand-drawn retailer logos that were also *broken* (`ingredients.join('')` with an
  empty separator produced one unsearchable string).
- **`3b2d992` Fixed the mobile stale cache for real** — self-destructing `public/sw.js`, see
  the failure-pattern section.
- **`3b2d992` First Apple HIG pass** — inputs to 16px on mobile (below 16px Safari auto-zooms
  on focus and shifts the layout: every tap on Search yanked the page), `safe-area-inset` on
  the fixed header and body, 44pt hit targets on save hearts,
  `overscroll-behavior-y: none`.

### Verified vs NOT verified

- **Verified by curl against production:** `/sw.js` returns `application/javascript` +
  `no-store` and contains the kill switch; `index.html` is `must-revalidate`; `/assets/*` is
  `immutable`; deep links 200; new copy present in the live bundle and every old slop string
  (`Sample menu`, `classic dish representing`, `Yield (Plates)`, `W. DASH`, `Prep Clock`, …)
  returns zero hits.
- **NOT verified visually — none of it.** Every layout claim in this document is reasoned
  from source, not observed. Treat all of it as a hypothesis.

---

## Deploying (unchanged, still works)

`git push` does **not** work from this machine (no GitHub auth). Deploy straight to Vercel:

```bash
vercel deploy --prod --yes
```

- Takes ~1–2 min; the CLI buffers output, so run it backgrounded and poll the output file.
- **Do not delete `.vercelignore`** — without it the upload includes `node_modules` +
  `ai-system-build` (~65MB) and hangs silently at "Deploying…" forever.
- **Do not delete `public/sw.js` or `public/registerSW.js`**, and do not remove their
  exclusions from the `rewrites` regex in `vercel.json`. They are the kill switch for workers
  still installed on real devices. See the comments in `public/sw.js`.
- `npm run lint` (`tsc --noEmit`) takes ~60s+ at ~0% CPU — local I/O, not a hang. `npm run
  build` is worse (minutes). Budget for it. It is the only automated gate, and it only proves
  types.

## Memory (persists across sessions)

- `works-decisively-minimal-prompting` — make the call, execute, be economical.
- `loves-current-dark-mode` — don't change dark mode or the font; scope visual work to light.
- `color-system-inconsistency` — two colour systems (pink vs coral); don't blind-migrate.
