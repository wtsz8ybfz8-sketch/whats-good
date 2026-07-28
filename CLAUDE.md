# whats-good — authoritative project instructions

**This file is the single source of truth.** Where anything else disagrees with it — a
handover, a README, a code comment, an older session's reasoning — this file wins.
**The latest request in the live conversation overrides this file and every handover.**
Handovers are a record of what happened, never a mandate for what to do next.

---

## 1. What this product is

Mood-and-location-driven food discovery: find somewhere to eat, or something to cook,
based on how you feel and where you are.

**Position it as an elevated, human alternative to Google Maps.** That means both halves,
always:

- **Keep the practical utility.** Real place identity, opening hours, price band,
  distance, address, menu, directions, phone. When a true field is available, it stays.
  Never trade away usefulness for elegance.
- **Add a truthful decision layer** on top: why *this* place suits *this* person, mood and
  moment. That layer is the product.

**A prettier directory of generic metadata is a failure**, even if it looks beautiful.
So is a wall of raw data with no judgement in it.

---

## 2. FAST MODE — the default operating mode

**Baseline engineering is not a feature request.** The user should never have to ask for
mobile AND desktop, light AND dark, portrait AND landscape, or a locale that is not the
author's. These are the job, not an enhancement, and `verify/checks.mjs` enforces every
one of them on every run — in CI as well, so it holds whether or not an agent remembers.
If a request says "fix X", it means fix X across every viewport, both colour schemes and
any locale. Do not ship half of that and wait to be told.

One task = **one diagnosis, one focused implementation, one proportionate validation.**

- Use the **cheapest check that can actually detect the changed behaviour.** A parse check
  beats a typecheck; a typecheck beats a build; a build beats a browser journey. Pick the
  lowest rung on §6 that covers what you changed, and stop there.
- **Do not** run full browser journeys, production builds, research, refactors, commits,
  deploys or package installs unless *this* task requires them.
- **Do not inspect the whole repository** when targeted inspection is enough. Read the file
  you are changing and its immediate callers.
- **Do not widen scope.** If you notice the restaurant page or the customer journey could be
  better while doing something unrelated, assess the impact, say so in one line, and change
  only what the task requires (§4, §9).
- **Use only the skills and tools that materially help this task.** "Use every relevant
  skill" never means invoke every available skill.

---

## 3. HARD STOP — stop and hand over

**Stop immediately, at the first occurrence of any of these:**

- a browser renderer times out or hangs;
- any tool fails **twice**;
- a context or usage warning appears;
- the session may end before the result is visible to the user.

**On a hard stop, in this order:**

1. **Save the current code** (write the files; leave the working tree intact).
2. **Do not** retry the browser, run another probe, commit, deploy, refactor, install
   anything, or delete Git lock files.
3. **Create or update root-level `HANDOVER.md`** to the contract in §10.
4. **End the session.** Say plainly what is verified and what is not.

A partial change plus an honest handover is a good outcome. A stranded session with no
handover is the only real failure.

---

## 4. Git — ask first, every time

**Never commit, amend, push, tag, deploy, or delete Git lock files (`.git/*.lock`) unless
the user explicitly asks in the live conversation.** Deleting a lock file to force a commit
through is specifically forbidden — it risks the user's repository to save you a step.
Leaving work uncommitted in the working tree is the correct default.

---

## 5. The acceptance test is the customer journey

Every change is judged against the whole path, not the screen it lives on:

**Orient → express intent → choose → trust → explore → act → recover.**

| Stage | The question it must answer |
|---|---|
| Orient | Where am I, what is this, what can it do for me right now? |
| Express intent | Can I say what I want in one gesture? |
| Choose | Are the options comparable, and is the difference between them legible? |
| **Trust** | Is this true, current, and sourced? Would I bet a trip across town on it? |
| Explore | Can I go deeper without losing my place? |
| Act | Is the next step obvious and one tap away — directions, call, menu, save? |
| **Recover** | If it's closed, empty, wrong or offline, am I given a way forward? |

**Trust and Recover are the two most often skipped and the two that decide whether this
beats Google Maps.** A change that improves one stage while breaking another is a
regression. Name the stage you moved.

---

## 6. Validation ladder — climb only as high as the change demands

| Rung | Command / method | Detects |
|---|---|---|
| 1 | `npx esbuild <file> --outfile=/dev/null` (~20ms) | Syntax, unbalanced JSX, bad imports |
| 2 | `npm run lint` (`tsc --noEmit`) | Types. **The named gate — but see below.** |
| 3 | `npm run build` (`vite build`) | Bundling. **Runs NO typecheck.** |
| 4 | 390×844 browser measurement | Layout, contrast, real rendered geometry |

**`npm run lint` and `tsc --noEmit` are pathologically slow on this machine** — many
minutes at ~0% CPU, and they frequently exceed a 7-minute timeout. That is local I/O, not
your code. **A timed-out typecheck is not a pass and not a failure — report it as
"did not complete."** When it won't finish, rung 1 plus a stated caveat is the honest
outcome. Never silently downgrade.

**`npm run build` is `vite build`. It does not run `tsc`, so a Vercel deploy does not
typecheck your work.** But **GitHub Actions now does** — `.github/workflows/ci.yml` runs
`tsc --noEmit` plus the build on every push, green in ~30s (first run 2026-07-27). So for
**anything you have pushed**, read the Actions tab instead of guessing; the local
"did not complete" caveat applies only to work still sitting in the tree.

**Never diagnose an external service from inside this container.** The agent proxy returns
**403 for every outbound URL** — `example.com` included. A 403 from a deployment tells you
nothing about that deployment. A session burned real user trust reporting a proxy 403 as
"Vercel Deployment Protection is on" and sending the user to change a setting that may
never have been set. Reachability is checked from a real device, or not at all.

**A handover sentence is not evidence — it is a claim with an author and a date.** When
you repeat one to the user, say where it came from. `HANDOVER.md` asserted for several
sessions that the Places key was unset; a session with a live browser reported the
opposite, having watched real venues render. Both were stated as fact, neither carried its
provenance, and the contradiction only surfaced because the user remembered. **Record how
a thing was established, not just what was concluded** — and when two records disagree,
mark the item CONTESTED rather than picking the one that fits your plan.

**Don't let a pipe swallow an exit code.** `npm run build | tail -20` reports `tail`'s
status. Check `${PIPESTATUS[0]}`.

**Anything visible must be looked at before you claim it works.** Types passing has let
broken layout reach the user in every session so far.

**BEFORE reporting anything as working, run the QA gate — `/qa-gate`, or by hand:**

```bash
cd verify && npm install                      # playwright-core lives HERE, never in root
cd .. && VITE_GOOGLE_PLACES_KEY=k npx vite --port 3000 &
sleep 5 && cd verify && NO_PROXY='*' node checks.mjs      # 31 checks; exit 0 = pass
NO_PROXY='*' node driver.mjs && NO_PROXY='*' node driver.mjs --dark
```

`NO_PROXY='*'` is required or localhost returns 000. **CI runs `checks.mjs` too** — but verify that it *reached the browser*:
from the day it was added until 2026-07-27 the step pinned this container's Chromium
build path, which does not exist on a GitHub runner, so it threw at launch on every run.
The nine static checks ran; the browser half never did. `verify/chromePath.mjs` now
resolves a binary and **exits 3 rather than skipping**, because a suite that silently
drops its browser reports green while measuring nothing. Every check in it exists because that bug
shipped and *the user* found it.

**A skip is not a pass**, and a misconfigured harness must never degrade into a softer
verdict about the app. `checks.mjs` prints `⚠ SKIPPED` and counts skips separately in its
summary line — read that line, not the exit code alone. It currently skips nothing.

**The venue checks need a key on the DEV SERVER, and their failure mode lies to you.**
Start it as `VITE_GOOGLE_PLACES_KEY=k npx vite --port 3000` — with no key, `fetchVenues`
returns `[]` *before any request is made*, so the Places fixture is never consulted and
every venue view reports "no venue card present". That reads as a fixture gap. It is not.
A whole session recorded it as a permanent limitation of this container, downgraded the
back-restores-scroll check to a skip, and left the venue detail view — §8's first-class
product surface — unrendered and unmeasured while its action bar was being changed.
`checks.mjs` now **exits 3 with the exact command** rather than skipping.

**A check that cannot fail is not evidence.** Before trusting a green result, name the
result that would have been red. Rendering at 390px in headless Chromium cannot fail an
iOS safe-area bug. `tsc` could not fail a React prop error while `@types/react` was
missing — which it was, for this project's entire history.

**Two platform truths that no local render can check:**

- **`viewport-fit=cover` must stay in the viewport meta tag.** Without it iOS Safari
  reports every `env(safe-area-inset-*)` as **0**, so every safe-area rule silently does
  nothing — while rendering perfectly here, where 0 is the correct value. It was missing
  for this project's whole life.
- **Never use `100vh` or `min-h-screen`.** On iOS Safari `100vh` is the viewport with the
  browser chrome *hidden*, so the layout is taller than the visible area whenever the URL
  bar shows, and fixed bottom chrome separates from the browser edge. Use `dvh`.
  `checks.mjs` fails the build if either regresses.

**Bottom-chrome offsets come from `--tabbar-h`, never a number.** The action bar sat at a
hardcoded `bottom-[64px]` against a 57px tab bar: 7px of scrolling page visible between
two opaque bars. Content padding guessed too (`pb-[120px]` against 142px of chrome), so
list rows sat under the bars unreachable. One token, all sites.

**Back must restore, not reset.** `scrollTo(0)` keyed on the detail id fired when the id
became `null`, so every browser/swipe back threw the user to the top of the list.
Forward starts at top; back restores the saved offset; `history.scrollRestoration` is
`'manual'` so the browser does not fight it.

**THE CANVAS MUST BE PAINTED — this one took four attempts to see.** `html` carried no
`background` at all; only `body` did, and with `background-attachment: fixed`, which iOS
Safari paints unreliably. Survivable until `viewport-fit=cover` let the layout reach the
screen edges — then the safe-area regions had nothing painting them and the user looked
straight through the app to black: a see-through band between Safari's chrome and the
app's own background. **`html { background: var(--bg-warm); }` is not optional and never
comes out.** Never use `background-attachment: fixed`. `checks.mjs` fails on both.

**Landscape is a device, not an afterthought.** `env(safe-area-inset-left/right)` is ~59px
on a notched iPhone in landscape and 0 everywhere else. `.page-grid` absorbs it, and
full-bleed fixed chrome uses `.safe-x` so the FILL stays edge-to-edge while the CONTENT
clears the notch. The bug that made this visible was only ever reproducible in landscape.

**The browser's own chrome is part of your app.** `theme-color` tints the bar iOS Safari
draws around the page. It was one hardcoded terracotta, so a dark app sat inside brown
browser chrome — another band of the wrong colour welded to the screen edge. Two tags with
`prefers-color-scheme` media queries, PLUS a live one driven from the dark-mode class,
because this app's dark mode is a manual toggle that can disagree with the system. And
declare `color-scheme` (meta + CSS) or the UA renders scrollbars and the iOS rubber-band
overscroll in light mode inside a dark app.

**Every screen needs a URL and a title.** All navigation lived in React state, so nothing
could be shared, bookmarked or survive a refresh, and all nine history entries read
"What's Good". `?tab=` and `?city=` are seeded on load, validated against the known set,
and written with `replaceState` — never `pushState`, which would make the back gesture
chew through tab switches before it could close a detail view. Venue ids come from a
Places query and are not stable, so they are deliberately NOT addressable yet.

**NEVER hardcode a locale, and never format a number, a date or a distance by hand.**
`src/locale.ts` is the only place allowed to know how the user reads. The country
assumptions (Cape Town, Rand) were removed and the same bug simply changed costume:
`languageCode: 'en'` hardcoded into the Places request, `toFixed(1)` producing "1.4 km"
for the half of the world that writes "1,4 km", 12-hour AM/PM hours shown to readers of a
24-hour clock, and a day-label regex that only matched ASCII letters so any non-Latin
script rendered "月曜日:" raw. Use `Intl`. Derive from `navigator.language`. And resolve
"today" from the venue's `utcOffsetMinutes`, not the phone's clock — a phone still on
Berlin time in London shows tomorrow's opening hours after 23:00.

**Measure BOTH, EVERY TIME — mobile and desktop, portrait and landscape, light and dark.**
That is 390×844, 844×390 and 1440×900, in both modes; `checks.mjs` runs all of them.
An entire session measured only 390px light and shipped a rail clipped mid-word, 36px tab
targets and a duplicated headline to 1440. A viewport you do not measure is a viewport
you are shipping blind.

**NEVER leave a dev server running, and never start one by hand.** `node verify/serve.mjs up`
is idempotent — it reuses a healthy server on :3000 and never starts a second — and it
bakes in `VITE_GOOGLE_PLACES_KEY`, which a bare `npx vite` omits (that omission hid the
entire venue surface for a session). Pair every `up` with a `down`. A detached Vite tree
is ~250MB that outlives the task, the turn and usually the session, and it is billed to
the user for nothing; several accumulated in one sitting before this rule existed.
`.claude/settings.json` also runs `down` on `SessionEnd`, so a forgotten server cannot
survive the session — but the hook is the backstop, not the plan.

**THE WAY TO SEE THIS APP — drive a real browser yourself. Never ask the user for a
screenshot.** Verified working 2026-07-27. It takes about 90 seconds end to end.

```bash
npm install                                  # ~15s
node verify/serve.mjs up      # idempotent: reuses a healthy server, never starts a 2nd
# ... work ...
node verify/serve.mjs down    # ALWAYS. See below.
sleep 6 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # expect 200

# playwright-core goes in a scratch dir, NEVER in package.json (§9: deps stay small)
cd "$SCRATCH" && npm init -y && npm i playwright-core
```

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',  // pre-installed
  args: ['--no-sandbox'],                                                // required here
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:3000/');
await page.screenshot({ path: `${SCRATCH}/view.png` });   // then Read the png — you can see it
```

This gives a **true 390px CSS viewport** — `innerWidth === 390`, `body.scrollWidth === 390`.
It supersedes the old iframe workaround and its 384px correction; that was only needed
because we did not own the browser. **Read the screenshot file** — do not reason about
layout from `getBoundingClientRect` alone. Measure geometry AND look at the picture.

- **Chromium is pre-installed** at `/opt/pw-browsers/`. Never run `playwright install`.
- **This container cannot reach `themealdb.com` or Google Places** — outbound is proxied.
  Recipe and venue lists render their empty state (`Nothing matched that combination`).
  **That is a network artifact, not a bug.** Chrome shows `ERR_TUNNEL_CONNECTION_FAILED`.
  Anything seeded from local constants — the Kitchen rail, chrome, tabs — renders fully
  and IS measurable. Know which of the two you are looking at before drawing a conclusion.
- Tab labels are **"Find a Place" / "Stay In" / "Happy Hour" / "Saved"**. The cooking tab
  is `Stay In` — targeting `/cook/i` finds nothing.
- **The in-app preview pane does not work in this project.** `preview_start` reports
  success, then every read returns "Policy check in progress for this tab; retry."
  forever. Don't attempt it.
- **`resize_window` does not change the CSS viewport** — it resizes the OS window;
  `innerWidth` stays ~1440 and every media query stays desktop.
- **If the renderer times out, that is a hard stop — §3.** Do not re-probe.
- **If you have not seen it, say you have not seen it.**

**Auditing hit targets: probe, never measure.** `.hit-44` (§11.3) puts the 44px target on
an invisible `::before`, so the element's own `getBoundingClientRect().height` stays 42
and a rect-based audit reports a false failure — then "fixes" it with padding, which grows
the visual ink and breaks the rule. Probe the point instead:

```js
const r = el.getBoundingClientRect(), cx = r.left + r.width / 2;
const hits = (y) => { const h = document.elementFromPoint(cx, y); return h === el || el.contains(h); };
hits(r.top - 1) && hits(r.bottom + 1);   // true => the 44px target is live
```

A `false` on one side where another control sits directly adjacent is normal — the
neighbour legitimately owns that pixel. Also: an audit that reads only `textContent` /
`aria-label` will wrongly flag inputs labelled by `<label htmlFor>`. Check for an
associated label before adding an `aria-label`.

---

## 7. Design direction — decided, hold to it

**Feel:** warm editorial. A good food magazine, not a SaaS dashboard. Off-white paper,
serif headlines, generous air, one warm accent. Cooler, flatter or more generically
"clean" is wrong.

**Tokens live in `src/index.css`** on `:root` and `html.dark`. Bind to them. Never
hardcode a hex; never add a colour without adding the token first.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-warm` | `#F4F2EF` | `#0F0C0A` | Page canvas |
| `--charcoal` | `#1A1A1A` | `#EDE8E1` | Body text |
| `--heading-color` | `#100C08` | `#F5F0E8` | Headings |
| `--accent-terracotta` | `#7C2D12` | `#fca5a5` | The single accent |
| `--accent-tint` | `#FAF2F0` | `rgba(252,165,165,.13)` | Accent-tinted fills |
| `--accent-tint-border` | `#F5D1C9` | `rgba(252,165,165,.24)` | Borders on tinted fills |
| `--accent-contrast` | `#FFFFFF` | `#1A0B04` | Text/icons **on** the accent |
| `--text-muted` | `#6E6A64` | `#9A9088` | Metadata, captions |
| `--text-subtle` | `#716B63` | `#8A8078` | Small labels |
| `--rule` / `--row-border` | `#E8E4DF` / `#F0EDE8` | white @ .10 / .06 | Rules / list rows |
| `--border-color` | `rgba(26,26,26,.07)` | `rgba(255,255,255,.07)` | Hairlines |

**Type:** one family, Schibsted Grotesk. All three `@theme` font tokens point at it.
Hierarchy comes from weight, size and colour — never from switching typeface. Headings are
`600` (`700` only to shout), set globally in `@layer base`. The font is `preload`ed in
`index.html`; never reintroduce an `@import`.

**Surfaces:** `.glass` is on exactly **two** chrome surfaces — the fixed header and the
mobile CTA bar. Everything holding content uses `.surface`; small recessed controls use
`.surface-quiet`; hover lift is opt-in via `.surface-hover`. **Never put `.glass` back on a
card** — that's the regression these classes exist to prevent, and it puts backdrop-filter
cost on every card in a scrolling list.

**Layout:** `.page-grid` / `.bleed` in `src/index.css` is the full-bleed primitive. A
`.bleed` child spans the physical viewport (`x === 0`, `width === scrollWidth`) at every
width. Gutters are `minmax(0,1fr)` because each child owns its own horizontal padding.
Never reintroduce negative-margin breakouts, `w-screen` + `-translate-x-1/2`, or
`overflow-x-hidden` on `<main>`.

**Dark mode is class-based** (`html.dark`) and **the user likes it as it is** — check both
modes, change neither the dark palette nor the font without being asked.

---

## 8. Restaurant pages are a first-class product surface

When a restaurant/venue page is in scope, it must carry all six. Each is a real field or
it is absent — never a placeholder.

1. **A specific recommendation thesis** — why this place, for this person, right now. One
   sentence with a point of view.
2. **Evidence-backed Vibe Match** — tied to a real signal (`vibeMatch`, cuisine, confirmed
   attributes). Never a vibe asserted from nothing.
3. **Truthful Utility Block** — distance, spend band, live open/closed, hours today.
   Compare `openNow` against `undefined`, never truthiness: `false` is a real answer
   ("Closed") and a truthy check swallows it.
4. **Real Signature Directive, or an honest menu link.** No dish, no module — link out.
5. **One useful distinctive detail** — the thing a directory would not tell you.
6. **One clear next action** — directions, call, menu or save. Unmistakable.

**Never invent a restaurant fact and never add decorative filler.** Menus, prices and
"specials" were once synthesised from a hash of the venue id and rendered under a small
grey disclaimer. The disclaimer protected us, not the user — a fake price sends someone
across town for something that doesn't exist. `happyHourData.ts` (human-confirmed) is the
standard: **if it isn't confirmed, don't render it.**

**The primary content never depends on an animation.** The venue name shipped stranded at
`opacity: 0` on a delayed entrance — a venue page with no venue name. Decoration may
animate; identity, facts and actions must be present on first paint.

---

## 9. Stack

- **React 19** + **TypeScript 5.8** + **Vite 6** — `npm run dev`, port 3000.
- **Tailwind v4** via `@tailwindcss/vite`. **There is no `tailwind.config.js`** and never
  will be; v4 is CSS-first and all theme config lives in `src/index.css` under `@theme`.
- **lucide-react** for icons. Never emoji-as-icon, never inline hand-drawn SVG paths.
- **motion** v12 — import from `motion/react`.
- No test runner. No backend; `src/placesService.ts` handles external data.
- Don't add dependencies without saying why. The list is small on purpose.
- Components: `EateryView`, `RecipeView`, `HappyHourView`, `Sidebar`, `StatusStates`.
  **Reuse `StatusStates.tsx`** for loading/empty/error — don't write new ones.

---

## 10. HANDOVER.md contract

Root-level `HANDOVER.md`, and **only these sections, in this order**:

```
Status
Objective
What changed
Customer journey impact
Verification and actual results
Protected decisions
Next session: first three actions
Known risks and open questions
```

No narrative history, no re-litigating past sessions, no duplicating this file. Durable
engineering knowledge belongs here in CLAUDE.md; the handover carries only live state.
Verification records **actual observed results**, including "did not complete."

**Never type the commit hash. Stamp it: `npm run handover:stamp`.** Status must open
with ``**`<branch>` is at `<sha>`, pushed.**`` — that exact shape, because a machine
reads it. The file once claimed `main` was at `b6027f9` while HEAD was two commits
further on, which is the worst kind of wrong: authoritative, specific and stale, so the
next session re-does finished work or reconciles a contradiction it cannot see. CI runs
`npm run handover:check`, which **fails** when the named commit does not exist or is not
an ancestor of HEAD, and **warns** when code landed after it. Stamp last, after the code
commit, so the hash names the state the handover actually describes.

---

## 11. Non-negotiable UX rules

1. **Elite iOS HIG.** Architect every view with progressive disclosure, spatial hierarchy
   and optical balance.
2. **No brute-force scripting for UI.** Never `sed` or Python `replace()` for structural
   UI change. Component-level React refactoring only.
3. **Optical, not mathematical, scaling.** Enforce 44×44pt hit targets with invisible
   bounding boxes (`p-2`, transparent wrappers, `min-w-[44px] min-h-[44px]`). **Never
   expand the visual ink** — backgrounds, borders, icons — of a small control to reach 44.
4. **No carousel hell.** One horizontal rail maximum (primary categories, e.g. Cuisine).
   Granular secondary filters live behind a single "Filters" affordance opening a
   native-style sheet.
5. **Breathing room.** Mobile wrappers keep a minimum `px-5`. Content never hugs the
   bezel. **One owner of the horizontal margin per branch** — never nested padding.
6. **Mobile-first.** This is used standing on a street, one-handed, on a mid-range phone.
7. **Contrast is not optional.** `--text-muted` passes AA in both modes (5.2:1 light,
   6.3:1 dark). Any new tone is measured, not eyeballed — especially over photos and glass,
   where the effective background is whatever is behind it.

---

## 12. Traps already sprung — do not re-enter

- **`position: fixed` does not work inside tab content.** The tab-transition wrapper
  carries a `transform`, making it the containing block. **Portal overlays to
  `document.body`** (`createPortal`), as `FilterSheet` does.
- **Never let an entrance `transform` position an overlay.** The filter sheet once shipped
  stuck on its keyframe's `from` state — mounted, scroll-locked, unreachable. Opacity fails
  safe; transform strands the user.
- **`.surface` is translucent — it is not a modal fill.** Overlays use `--bg-warm`.
- **`overflow-x-hidden` silently eats left overhang.** It clipped the venue Back button.
  The `.page-grid` cannot overflow horizontally, so it isn't needed.
- **Never reintroduce a service worker.** `vite-plugin-pwa` with `registerType:
  'autoUpdate'` precached `index.html`, so **every deploy was invisible on the live URL**
  — three sessions of work shipped and never appeared. `src/main.tsx` now unregisters any
  survivor and purges caches; `vercel.json` keeps `index.html` on `must-revalidate` and
  only hashed `/assets/*` immutable. An app whose value is "what's open near me right now"
  gains nothing from offline precaching.
- **All of the above passed `tsc` clean.** Types are a gate, never verification.

---

## 13. The structural check ledger — what is enforced, what is not, what is open

**Why this section exists.** Every rule above this line is prose. Prose is obeyed by an
agent that read it carefully and broken by one that skimmed. This audit went looking for
the gap between what CLAUDE.md *claims* is guaranteed and what any machine actually
refuses to let through — and found live violations of §6 and §8 sitting in `src/` right
now, on rules written in bold, passing every gate the project has.

**The rule this section adds: a claim of "verified" must name the check that produced it.**
"I read the rule and complied" is not verification. If no row below covers what you
changed, you have not been checked — say so in those words.

### 13.1 Enforced by machine (CI + `verify/checks.mjs`)

These can turn red without an agent's cooperation. They are the only claims you may make
flatly.

| Rule | Enforced by | Fails when |
|---|---|---|
| `viewport-fit=cover` in the meta tag | `checks.mjs` | Tag edited or dropped |
| No `100vh` / `min-h-screen` | `checks.mjs` | Either appears in CSS or TSX |
| `html` canvas is painted | `checks.mjs` | `html` has no background |
| No `background-attachment: fixed` | `checks.mjs` | It reappears in CSS |
| Two `theme-color` tags with `media=` + a live one | `checks.mjs` | Back to one hardcoded tint |
| `color-scheme` declared (meta + CSS) | `checks.mjs` | Either half missing |
| Action bar flush on the tab bar, incl. a simulated 34px inset | `checks.mjs` | A hardcoded offset drifts from `--tabbar-h` |
| `history.scrollRestoration === 'manual'` | `checks.mjs` | Browser back resets scroll again |
| `?tab=` / `?city=` deep links, `document.title` per screen | `checks.mjs` | Navigation returns to pure state |
| No horizontal overflow, hit targets ≥44pt — **390×844, 844×390, 1440×900, light + dark** | `checks.mjs` | Any of the six combinations regresses |
| Locale: comma decimals, 24h rewrite, non-Latin day labels | `checks.mjs` | A locale assumption returns |
| No Vite error overlay | `checks.mjs` | Runtime error on load |
| Types | GH Actions `tsc --noEmit` | Any type error |
| Bundling | GH Actions `vite build` | Bad import / asset path |
| `.glass` on ≤2 surfaces | GH Actions grep | A third surface gets it |
| No `vite-plugin-pwa` wired in | GH Actions grep | The invisible-deploy bug returns |

**Never state a check count in prose.** This file and `qa-gate/SKILL.md` have each carried
a hardcoded count ("11", then "18", then "31") and each has drifted, because checks are
added inside loops over six viewport/mode combinations. `checks.mjs` prints its own total.
Quote what it printed on the run you actually did, or say nothing.

### 13.2 Rules with NO enforcement — agent discipline is the only gate

Every one of these is stated as an absolute above and nothing on any machine can fail it.
Treat each as unverified on every change until you have checked it by hand and said so.

- **Bottom offsets from `--tabbar-h`, never a number** (§6). `checks.mjs` measures the
  *one* action bar it knows about. Three other hardcoded offsets exist (13.3).
- **`openNow` compared against `undefined`, never truthiness** (§8.3). Nothing greps for it.
- **No number, date or distance formatted by hand** (§6). `checks.mjs` covers `locale.ts`;
  nothing covers `toFixed` called anywhere else.
- **Colour from tokens, never a hex** (§7). CI counts and reports; it does not fail, and it
  does not ratchet — the count can climb back to its worst-ever value silently.
- **Never invent a restaurant fact; no placeholder content** (§8). Unfalsifiable by machine.
  This is the rule with the highest cost of failure in the entire document.
- **Primary content never depends on an animation** (§8). A headless render at default
  settings can pass while `opacity: 0` strands the venue name on a real device.
- **No `.glass` on a card** is enforced only as a *count* — swapping the header's `.glass`
  onto a card keeps the count at 1 and passes.
- **`position: fixed` inside tab content** (§12). Portalling is prose only.
- **44pt targets via invisible boxes, never grown ink** (§11.3). The probe proves the
  target is live; nothing proves the *ink* did not grow to get there.
- **iOS Safari behaviour of any kind.** Headless Chromium at 390px reports every
  `env(safe-area-inset-*)` as 0, which is also the correct value here. A green safe-area
  result on this machine is not evidence about iOS. It never has been.
- **Reachability of any deployment.** The agent proxy 403s every outbound URL (§6). There
  is no check, and there must not be one. Real device or nothing.

### 13.3 Open violations found by this audit — live in `src/` today

Found by grep against the rules in this file, on the commit that introduced this section.
None of them fail any existing gate. They are recorded here rather than fixed in the same
pass, so that the ledger and the fix are separately reviewable.

1. ~~**`openNow` truthiness.**~~ **FALSE POSITIVE — the code was already correct.**
   All four sites sit inside an outer `rawEatery.openNow !== undefined` guard; the grep
   saw the inner ternary and not the guard. **Left unchanged, and no ratchet was added**,
   because no grep can tell a guarded ternary from a bare one — it would have fired on
   correct code forever. This is now the worked example for §13.2: read the site before
   you believe the check.
2. ~~Hardcoded bottom offsets.~~ **FIXED.** `EateryView.tsx` and `RecipeView.tsx` (×2)
   now use `bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]`, and `App.tsx`'s
   content clearance derives from the same token. The safe-area inset lives in the
   *offset* only — EateryView's own `paddingBottom` inset was removed, since counting it
   in both places doubles it. `index.css:207` was a third false positive: the string
   `bottom-[64px]` there is inside the comment explaining the original bug. Ratchet is
   now **0**, with comment lines excluded so the docs don't count as violations.
3. ~~Hand-formatted numbers.~~ **FIXED.** New `formatQuantity()` in `locale.ts` (Intl,
   `maximumFractionDigits`) replaces both `toFixed` calls in `RecipeView.tsx`. Ingredient
   quantities and the plate multiplier now read "0,5" and "x1,5" where that is correct.
   `Intl` drops trailing zeros itself, so the `.replace(/\.0$/,'')` hacks are gone.
   Ratchet is now **0** for `toFixed` in `src/**/*.tsx`.
4. **Hardcoded hex: 211 → 203.** The Scaled chip's three hardcoded values
   (`#7C2D12`/`#fca5a5`/`#FAF2F0`) and the toast's now use `--accent-terracotta`,
   `--accent-tint`, `--accent-tint-border`, `--charcoal` and `--bg-warm`. The toast also
   gains a real dark mode: it was `bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white`, i.e. dark
   grey on dark with white text; the tokens invert it correctly in both schemes.
   **Ratchet lowered to 203 — the remainder is Phase 2 and is still open.**
5. **Doc drift on `.glass` — still open.** §7 says two surfaces; there is exactly one
   (`App.tsx:890`, the header). The mobile CTA bar dropped it (see `index.css:124`).
   The CI ceiling of 2 therefore still permits one card to take it silently.
6. **`pushState` at `App.tsx:831`** — the code is right; §6's rule was written too
   broadly. Fixed by the clarification in this file, not by a code change.

**Three of the six were false positives.** That is the finding, not a footnote: a grep
written from a rule catches the shape of a violation, never the fact of one. Every ratchet
in `ci.yml` is a tripwire that tells you where to *look*; none of them is a verdict.

### 13.4 The honesty contract for reporting

Before writing **verified, working, fixed, clean, passing** or **done**, all four:

1. Name the rung of §6 you actually reached, and the command's real exit code.
2. Name the specific result that would have been **red**. If you cannot, you ran a check
   that cannot fail — say "not verified" instead.
3. Name anything in 13.2 your change touched that nothing checked, in those words.
4. If a check timed out, say **"did not complete."** Never "passed."

A timed-out typecheck, an unrun browser sweep and a rule in 13.2 are three different kinds
of "unknown", and all three must be reported as unknown. The failure mode this project has
actually shipped, every session, is not a wrong claim — it is a confident one.

---

## 14. Skills — what to use, what to ignore, and why

**"Use every relevant skill" never means invoke every skill** (§2). Loading a skill costs
context and, worse, an aesthetic skill will confidently redirect §7's decided design
direction. The list below is the standing decision; it overrides a skill's own
self-description of when it should trigger.

### 14.1 Always

- **`qa-gate`** (project skill, `.claude/skills/qa-gate/`) — mandatory before the words in
  §13.4, and before any deploy. It is the only skill that gates a claim.

### 14.2 Use when the task calls for it

- **`simplify`** — after a refactor, to review the diff for reuse and dead code. Quality
  only; it does not hunt bugs.
- **`security-review`** / **`code-review`** — before any change touching `placesService.ts`,
  keys, or `.env*`.
- **`full-output-enforcement`** — when editing `src/App.tsx` (63KB) or
  `RecipeView`/`EateryView` (25–28KB). Truncation and `// ... rest unchanged` placeholders
  are a real failure mode at that file size and would destroy working code.
- **`stop-slop`** — for user-facing copy inside the product. The voice is warm editorial
  (§7), not assistant-speak.
- **`update-config`** / **`fewer-permission-prompts`** — to keep the QA gate from dying on
  permission prompts (see 14.4).

### 14.3 Deliberately NOT used — do not invoke these, and say so if asked

These are installed and relevant-sounding. They are refused on purpose:

- **`ui-ux-pro-max`, `frontend-design`, `redesign-existing-projects`, `minimalist-ui`,
  `industrial-brutalist-ui`, `stitch-design-taste`, `design`, `brandkit`, `canvas-design`,
  `banner-design…`, `brand-identity-governance…`** — §7 is a *decided* direction (warm
  editorial, Schibsted Grotesk, one terracotta accent, tokens in `index.css`). Every one of
  these proposes its own palette, type system and layout language. Invoking one does not
  add taste to this project; it starts a fight with §7 that the skill wins because it is
  the more recent instruction. **If a design change is wanted, change §7 first, on purpose.**
- **`dataviz`** — no charts in this product. If one is ever added, this becomes 14.2.
- **`web-artifacts-builder`, `artifact-design`, `strategic-slide-presentation-designer`** —
  this is a Vite app, not an artifact or a deck.
- **`docx`, `pptx`, `xlsx`, `pdf`, `email-marketing*`, `ad-creative`, `internal-comms`,
  `learn`, `morning`, `firecrawl`** — unrelated to this codebase.
- **`run`** — superseded by §6's exact, verified launch recipe and by `qa-gate`. A generic
  launcher will not know about `NO_PROXY='*'`, the pre-installed Chromium path, or the
  fixtures, and will draw wrong conclusions from the proxy's 403s.
- **`loop`** — never poll from inside a session. §3 is a hard stop, not a retry loop.

### 14.4 What the user needs to do — this is the ask

Nothing here needs downloading; these are switches only you can throw:

1. **A `SessionStart` hook** (skill: `session-start-hook`) that runs `npm install` and
   `npm --prefix verify install`. The QA gate's install step is the most common reason a
   session skips it and reports from a cheap check instead. **Highest-value item on this
   list.**
2. **Permission allowances** so the gate runs unattended — `Bash(node verify/checks.mjs)`,
   `Bash(node driver.mjs*)`, `Bash(NO_PROXY=* *)`, `Bash(npx esbuild *)`, `Bash(grep *)`.
   `.claude/settings.local.json` currently allows commits and pushes but **not the checks**,
   which is exactly backwards given §4.
3. **Delete the stale entry** in `.claude/settings.local.json` permitting
   `rm .../.git/index.lock`. §4 forbids that action outright; a standing permission for it
   contradicts the hardest rule in this file.
4. **`VITE_GOOGLE_PLACES_KEY` in Vercel.** Still the one blocker on venue discovery. No key
   exists in this container to set, and reachability cannot be confirmed from here.
