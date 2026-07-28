# AUDIT_HISTORY — historical, NOT policy

**Nothing in this file is a rule.** It is the record of bugs that shipped, audits that were
run, and violations that were found and closed. It exists so that the reasoning behind a
check is recoverable without that reasoning living inside the authoritative instruction
file.

**Authority order:** the live conversation, then `CLAUDE.md`, then the machine checks
(`verify/checks.mjs`, `.github/workflows/ci.yml`). `HANDOVER.md` is live session state.
This file is below all of them and can be ignored entirely when doing the work.

**Read this only when** you want to know *why* a rule or a check exists, or you are about
to argue that one is unnecessary. Entries are historical snapshots; the counts, dates and
file:line references in them were true when written and are not maintained.

---

## Why the instruction layer was split (2026-07-28)

`CLAUDE.md` had grown to ~650 lines and mixed four different kinds of statement with no
visual distinction between them:

- durable rules,
- forensic narratives of individual bugs,
- an audit ledger with open violations and false positives,
- environment facts with a short shelf life (container paths, dates, check counts).

The failure mode: an agent skimming it could not tell a rule from a war story, and several
claims had drifted out of date while still reading as authoritative — most consequentially
a claim that `checks.mjs` enforced light **and** dark across every viewport, which it did
not and does not.

The split: `CLAUDE.md` (durable rules, each labelled with whether a machine enforces it),
`HANDOVER.md` (live state only), this file (history).

---

## Bugs that shipped, and the check each one earned

Every entry below reached the user. That is why the corresponding rule is written as an
absolute rather than a preference.

### iOS / platform

- **`viewport-fit=cover` was missing for the project's entire life.** Without it iOS Safari
  reports every `env(safe-area-inset-*)` as `0`, so every safe-area rule silently did
  nothing — while rendering perfectly in headless Chromium, where `0` is also the correct
  value. Nothing local could ever have failed it. → static check in `checks.mjs`.

- **The canvas was never painted, and it took four attempts to see.** `html` carried no
  `background`; only `body` did, with `background-attachment: fixed`, which iOS Safari
  paints unreliably. Survivable until `viewport-fit=cover` let the layout reach the screen
  edges — then the safe-area regions had nothing painting them and the user looked straight
  through the app to black. → two static checks plus a per-viewport `canvas painted` check.

- **`vh` units.** The rule was written as "never `100vh`", so the check tested
  `/100vh|min-h-screen/` for its whole life while the venue hero shipped `h-[46vh]`,
  `[56vh]`, `[60vh]` and the filter sheet `max-h-[85vh]`. The rule is the *unit*, not the
  number. → check now matches any bare `vh`.

- **Static checks scanned a hardcoded list of three files.** `Sidebar`, `EateryView`,
  `RecipeView`, `HappyHourView` and `StatusStates` were never scanned by anything. That is
  how the `vh` violations survived. → `checks.mjs` now walks `src/` recursively.

- **`theme-color` was one hardcoded terracotta**, so a dark app sat inside brown browser
  chrome. Two tags with `prefers-color-scheme` media queries plus a live one driven from
  the dark-mode class, because dark mode here is a manual toggle that can disagree with the
  system. `color-scheme` was undeclared, so the UA rendered scrollbars and the iOS
  rubber-band overscroll in light mode inside a dark app.

- **The header logo shipped at `x=0`, flush against the bezel, on every phone in portrait.**
  `.safe-x` was unlayered CSS setting `padding-left: max(0px, env(safe-area-inset-left))`,
  and unlayered CSS beats Tailwind's `@layer utilities` whatever the specificity — so it
  *replaced* the header's `px-6` with `0` (the inset is `0` on any phone in portrait).
  Nothing could fail: no overflow, no missed hit target, canvas painted, every viewport
  green. Only the distance from the edge said it. → `chrome clears the bezel` check.

### Chrome, layout, navigation

- **Hardcoded bottom offsets.** The action bar sat at `bottom-[64px]` against a 57px tab
  bar: 7px of scrolling page visible between two opaque bars. Content padding guessed too
  (`pb-[120px]` against 142px of chrome), so list rows sat under the bars, unreachable.
  Migrated to `--tabbar-h` on 2026-07-27; CI ratchet at 0.

- **Back reset instead of restoring.** `scrollTo(0)` was keyed on the detail id and fired
  when the id became `null`, so every browser/swipe back threw the user to the top of the
  list.

- **Nothing was in the URL.** All navigation lived in React state: no screen could be
  shared, bookmarked or survive a refresh, and all nine history entries read "What's Good".

- **`overflow-x-hidden` silently ate left overhang** and clipped the venue Back button.

- **The filter sheet shipped stuck on its entrance keyframe's `from` state** — mounted,
  scroll-locked, unreachable — because a `transform` was positioning it. `position: fixed`
  also does not work inside tab content: the tab-transition wrapper carries a `transform`
  and becomes the containing block.

### Data, locale, truth

- **Fake menus and prices** were synthesised from a hash of the venue id and rendered under
  a small grey disclaimer. The disclaimer protected us, not the user — a fake price sends
  someone across town for something that does not exist.

- **The venue name shipped stranded at `opacity: 0`** on a delayed entrance: a venue page
  with no venue name.

- **Locale assumptions changed costume rather than dying.** Cape Town and Rand were removed;
  then `languageCode: 'en'` was hardcoded into the Places request, `toFixed(1)` produced
  "1.4 km" for the half of the world that writes "1,4 km", 12-hour AM/PM hours were shown to
  readers of a 24-hour clock, and a day-label regex matched only ASCII letters so any
  non-Latin script rendered "月曜日:" raw.

- **Every render check ran as `en-GB`**, so no locale bug could ever fail one. → a `de-DE`
  context was added.

- **The scaled-recipe chip** only renders when `plates !== defaultPlates`, so no screenshot
  in any sweep ever reached it, and it shipped twice on "the markup is token-bound" — a
  reading of the source, not a verification.

- **`@types/react` was missing for the project's entire history**, so `tsc` could not fail a
  React prop error. Types were a gate over nothing.

### Deploys

- **`vite-plugin-pwa` with `registerType: 'autoUpdate'` precached `index.html`**, so every
  deploy was invisible on the live URL — three sessions of work shipped and never appeared.
  `src/main.tsx` now unregisters any survivor and purges caches.

- **CI ran the regression suite against a browser path that does not exist on a runner.**
  From the day the step was added until 2026-07-27 it pinned the agent container's Chromium
  build path, so the launch threw on every run: the static checks ran, the browser half
  never did, and the claim that the suite runs "whether or not an agent remembers" was false
  for the life of the file. → `verify/chromePath.mjs` now resolves a binary and exits 3
  rather than skipping.

- **A session reported an agent-proxy 403 as "Vercel Deployment Protection is on"** and sent
  the user to change a setting that may never have been set. The proxy 403s every outbound
  URL, `example.com` included.

- **A session started the dev server without `VITE_GOOGLE_PLACES_KEY`**, so `fetchVenues`
  returned `[]` before any request was made and the Places fixture was never consulted. The
  symptom read as a fixture gap, so it was recorded as a permanent limitation of the
  container, the back-restores-scroll check was downgraded to a skip, and the venue detail
  view went unrendered and unmeasured while its action bar was being changed. → `checks.mjs`
  now exits 3 with the exact command instead of skipping.

- **The typeface was never loading.** It came from `fonts.googleapis.com` at runtime.
  Self-hosted from `public/fonts/` since 2026-07-28. Importing
  `@fontsource-variable/...` registers the family as "Schibsted Grotesk **Variable**", which
  does not match the `@theme` tokens, so the app silently rendered in the fallback — with
  every check green and `document.fonts.check()` returning `true`, because it counts
  fallbacks.

---

## The structural check audit (2026-07-27) — closed

An audit compared what `CLAUDE.md` *claimed* was guaranteed against what any machine
actually refused to let through. Six findings; **three were false positives.**

| # | Finding | Outcome |
|---|---|---|
| 1 | `openNow` compared truthily (4 sites) | **False positive.** All four sit inside an outer `rawEatery.openNow !== undefined` guard; the grep saw the inner ternary, not the guard. Left unchanged, and **no ratchet was added** — no grep can distinguish a guarded ternary from a bare one, so it would have fired on correct code forever. |
| 2 | Hardcoded bottom offsets | **Fixed.** `EateryView`/`RecipeView`/`App` migrated to `calc(var(--tabbar-h) + env(safe-area-inset-bottom))`; the safe-area inset lives in the *offset* only, since counting it twice doubles it. `index.css:207` was a false positive — the string was inside the comment explaining the bug. Ratchet 0, comment lines excluded. |
| 3 | Hand-formatted numbers (`toFixed`) | **Fixed.** `formatQuantity()` added to `locale.ts`; both call sites in `RecipeView` migrated. Ratchet 0. |
| 4 | Hardcoded hex | **Reduced over several passes:** 233 → 211 → 203 → 81 (after collapsing light/dark hex *pairs* onto their token) → 71 (black borders bound to `--rule`). Ratchet tracks the real count; the remainder has no exact token. |
| 5 | `.glass` doc drift | **Fixed in CI.** The check counted occurrences and capped at 2, which could not fail the thing the rule is about — moving `.glass` off the header onto a card keeps the count at 1. It now checks *placement*: none in `src/components/`, at most 2 in `App.tsx`. |
| 6 | `pushState` in `App.tsx` | **False positive.** The code was right; the rule had been written too broadly. Fixed by clarifying the rule. |

**The finding, not a footnote: three of six were false positives.** A grep written from a
rule catches the shape of a violation, never the fact of one. Every ratchet in `ci.yml` is a
tripwire telling you where to *look*; none of them is a verdict.

---

## Retired claims — believed, then found untrue

Recorded so they are not re-derived.

- *"`checks.mjs` measures light and dark across every viewport."* It never has. The suite
  runs one dark-mode-agnostic sweep; dark rendering is covered only by
  `verify/driver.mjs --dark`, which produces screenshots a human or agent must look at.
- *"A green safe-area result here is evidence about iOS."* Headless Chromium reports every
  inset as `0`, which is also the correct value in this container. It has never been
  evidence.
- *"Deployment reachability can be checked from the container."* It cannot. Every outbound
  URL returns 403 from the agent proxy.
- **Check counts in prose.** `CLAUDE.md` and `qa-gate/SKILL.md` each carried a hardcoded
  total — "11", then "18", then "31", while the suite was at 43 — and each drifted, because
  checks are added inside loops over viewport combinations. The suite prints its own total.
- *"`resize_window` changes the CSS viewport."* It resizes the OS window; `innerWidth` stays
  ~1440 and every media query stays desktop.
- *"The in-app preview pane works here."* `preview_start` reports success, then every read
  returns "Policy check in progress for this tab; retry." indefinitely.
