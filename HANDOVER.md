# Handover — 2026-07-26 (session 4)

Live (production, **old build**): `https://whats-good-nu.vercel.app`
Preview (this session's work, verified): `https://whats-good-olvct3pqp-nizzle-s-projects.vercel.app`
Vercel project `whats-good` (`nizzle-s-projects`) · Repo `github.com/wtsz8ybfz8-sketch/whats-good`

Read `CLAUDE.md` first — stack, design tokens, working agreement, standing rules.

Everything below was verified first-hand in the user's Chrome against a live deploy, not inferred
from a typecheck. Where something was **not** verified, it says so. Keep that habit.

---

## 0. NON-NEGOTIABLE — how you are expected to work

**Use the skills. All of them, in combination, every session.** Marketing, engineering and UX/UI
design skills are installed and available — `design`, `design-system`, `design:design-critique`,
`interface-design`, `mobile-design`, `ui-styling`, `design-taste-frontend`, `senior-frontend`,
`senior-architect`, `software-architecture`, `brand`, `brand-dna`, `marketing:*`, `stop-slop`,
`ui-ux-pro-max`. Invoke them with the `Skill` tool. They exist to make the work **swift and
efficient** — reaching for them is not optional and not a last resort. The user has said this
directly and it is not up for renegotiation.

**Always prioritise the consumer journey.** Not the component, not the token, not the diff. The
person using this is standing on a street, one-handed, on a mid-range phone, hungry. Judge every
change by whether it moves that person forward. A page they can enter and cannot leave is a worse
bug than anything visual — and that exact defect shipped and survived multiple sessions (§2)
because sessions kept ending at `tsc --noEmit`.

**Hold the vision the user and Gemini ideated.** It is recorded in §5. Do not re-litigate it, do
not drift from it, do not substitute your own taste. Where a point in it collides with a standing
`CLAUDE.md` rule, §5 flags it as **the user's call** — surface it, don't decide it silently in
either direction.

---

## 1. Where things stand

**Working tree is dirty. Nothing is committed.** Last commit `b9ae70e`. Modified: `CLAUDE.md`,
`HANDOVER.md`, `src/App.tsx`, `src/components/RecipeView.tsx`, `src/components/StatusStates.tsx`,
`src/index.css`.

**Production has not been touched.** Promoting is `vercel deploy --prod` and needs the user's
explicit go-ahead.

### Shipped to the preview this session

- **Glass discipline.** New `--surface-*` tokens and `.surface` / `.surface-quiet` /
  `.surface-hover` in `src/index.css`. `.glass` now survives on exactly **two** surfaces, both
  chrome: the fixed header and the mobile CTA bar. All content — result cards, filter panel, status
  panels — is `.surface` (solid fill, hairline, soft shadow, **no** backdrop-filter). This closes
  the known issue that headed `CLAUDE.md`; that entry is now marked fixed. **Do not put `.glass`
  back on a card.**
- **Skeleton loader.** `LoadingState` in `StatusStates.tsx` is a card-shaped skeleton with no copy;
  the three bespoke loading sentences are gone. Its block dimensions mirror the eatery card in
  `RecipeView` — if that card changes, change these too.
- **Header declutter.** The GPS control was a pill flipping emerald/amber/red and pulsing twice;
  now a quiet icon (accent when granted, `MapPinOff` when denied, dimmed while resolving). Theme
  toggle kept but stripped of its glass — the user likes dark mode, and removing the switch with
  nowhere to put it is worse.
- **The back-navigation fix** — see §2.

Dark mode was deliberately left alone: the dark `--surface-*` values are the exact fill and border
the dark glass card already had, minus the blur. **The user likes dark mode as it is. Don't touch
it, and don't touch the font.**

---

## 2. The bug that mattered, and why it survived

User's report: *"I can't go back to my initial starting point once I've viewed a restaurant and/or
recipe."*

Root cause in `RecipeView.tsx`: the back button was gated on `recipes.length > 1 || isSavedTab`.
Every single-result path — Stay In, "Surprise me", any one-dish landing — rendered a detail page
with **no exit at all**. On a home-screen web app there is no browser chrome either
(`apple-mobile-web-app-capable` is set in `index.html`), so that button was the only way out in
existence.

Fixed: back is unconditional, label degrades to plain "Back" when a count would be meaningless.
Added a `popstate` handler in `App.tsx` so hardware back and iOS edge-swipe close the detail view,
with a balanced history entry so Back doesn't need pressing twice after an in-app close.

**Both exits verified in Chrome on the live deploy.**

**The real handover here:** this was ten seconds of tapping away, and it survived multiple sessions
because each one ended at `tsc --noEmit` and called that verification. It isn't. See §4.

---

## 3. Confirmed bugs — seen on screen, in priority order

**1. Happy Hour is hardcoded to Cape Town and ignores the detected city. SHIP-BLOCKING.**
`CAPE_TOWN_HAPPY_HOURS` drives both the tab's live-count dot (`App.tsx`, `liveHappyHourCount`) and
the entire view (`HappyHourView.tsx`). Observed live: header reads **London**, page renders "REAL
LISTINGS · CAPE TOWN" with nine Cape Town venues priced in Rand (R70, R35, R20) — Woodstock
Brewery, Cargo on Kloof St, Café Extrablatt in Green Point. Same failure class as the fabricated
menus already torn out; breaks the "never render invented data as real" rule. Minimum fix: gate the
tab and the dot to the detected city with an honest empty state elsewhere. `happyHourData.ts` is
human-confirmed real data — that standard stays.

**2. Cuisine and Kitchen lists are static arrays, unrelated to `city`.** `Sidebar.tsx` (`cuisines`,
~line 147) and the Stay In "Kitchen" row. Observed live in London: `Italian · Middle Eastern ·
Pan-Asian · South African · Latin American`. The user's framing — *"A German wouldn't want to see
SA cuisine when in London"* — is exactly right. Places already returns real cuisine types per city;
derive the list from what is actually nearby.

**3. `npm run dev` is broken on the user's machine.** PostCSS parse error on `src/index.css`
("Unknown word `as`"), served as a blank white page. Production builds fine (different CSS
pipeline), which is why the deploy works. Local dev is dead until fixed. Related and lower
priority: the Vercel build emits one CSS warning where the minifier misreads the long `.tap-44`
prose comment in `index.css` as a selector.

**4. `"We found 1 recipes for you"`** — unpluralized on the single-result path.

**5. Requested, not started:** make the restaurant/venue pages genuinely interesting; convert the
wall of filter pills into a horizontally-scrolling chip row (§5).

---

## 4. How to verify — this project's hard-won rules

- **`tsc --noEmit` is not verification.** It is a gate. Broken layout and dead-end pages have
  reached the user in every session that stopped there.
- **The in-app preview pane does not work here.** Four sessions have proved it. Don't try it.
- **Use Claude in Chrome instead — it works.** `mcp__claude-in-chrome__*`, loaded with one batched
  `ToolSearch` call. It reaches the Vercel preview through the SSO wall because the user's Chrome
  is already signed in. Click by `ref` from `find`/`read_page`, never by coordinate — the viewport
  rescales between screenshots and coordinate clicks miss.
- **Do not run the dev server on the user's laptop.** They are short on space and said so plainly.
  Deploy a preview and inspect that: `vercel deploy --yes` builds remotely in ~40s, and the project
  is already linked and authed.
- **Open caveat:** Chrome would not shrink the viewport below ~942 CSS px, so **true phone width
  has still not been inspected.** Everything seen so far is desktop. Find a way — or say plainly
  that you haven't seen it. Never claim a width you didn't look at.

---

## 5. The vision — the user's and Gemini's, to be held

This came out of a critique the user ran past Gemini and endorsed. It is **not** a rejection of
`CLAUDE.md`'s warm-editorial direction; it is restraint applied within it.

**Adopted, continue:**

- **Ruthless restraint over kitchen-sink styling.** The failure mode being designed away is
  "prompted UI" — every visual trend applied at once. When everything floats, nothing does.
- **Glass is for transient chrome only** — header and bottom bar. Content sits on solid, defined
  surfaces. **Done. Hold it.**
- **Progressive disclosure for filters.** The user specifically liked **the horizontally-scrolling
  chip row for cuisine/taste** (Apple Maps pattern) over the current two-row wall of pills.
  Granular controls belong behind a single "Adjust" affordance in a bottom sheet. **Not built yet —
  the user asked for this by name.**
- **Skeletons, never conversational loading copy.** Clever text is tedious by the third use and is
  a hallmark of generated UI. **Done.**
- **Quiet, functional motion only.** Motion explains state change; it is felt, not watched. The
  user floated a slot-machine city-name animation; Gemini pushed back, the user accepted — it adds
  friction for a hungry person and would display cities you are not in, breaking the invented-data
  rule. Agreed replacement: a soft shimmer cross-fading into the detected city.
- **Apple HIG as the standard:** one clear focus per view, predictable placement, no attention
  hijacking, real touch targets, two independent ways out of any detail view.

**Two points from Gemini's critique that collide with standing rules — the user's call, not
yours.** Raise them; don't decide them:

- **A real serif face** (Playfair/New York) for headings. `CLAUDE.md` commits to one family with
  hierarchy from weight/size/colour, and the user has separately said not to change the font.
  Deliberately not done.
- **Stripping the grain texture and canvas gradient.** That warmth *is* the editorial direction;
  removing it produces the cooler, flatter, generic feel `CLAUDE.md` warns against. Deliberately
  not done.

Gemini's sample markup hardcoded hexes (`#F9F9F9`, `bg-white`, `text-gray-900`, `amber-50`).
Anything adopted from it goes through the tokens in `src/index.css` first. Never hardcode a colour.

---

## 6. Suggested order for the next session

1. Gate Happy Hour to the detected city — honesty bug, ship-blocking.
2. Derive cuisine/kitchen lists from real Places data per city.
3. Fix the local dev PostCSS break so `npm run dev` works again.
4. The horizontally-scrolling cuisine chip row + "Adjust" bottom sheet (asked for by name).
5. Make the venue page genuinely interesting.
6. Pluralization, and the `.tap-44` comment CSS warning.

Verify in Chrome against a fresh Vercel preview before claiming any of it done. Get the user's
explicit go-ahead before `vercel deploy --prod`.
