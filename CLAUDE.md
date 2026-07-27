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

**Don't let a pipe swallow an exit code.** `npm run build | tail -20` reports `tail`'s
status. Check `${PIPESTATUS[0]}`.

**Anything visible must be looked at before you claim it works.** Types passing has let
broken layout reach the user in every session so far.

**BEFORE reporting anything as working, run the QA gate — `/qa-gate`, or by hand:**

```bash
cd verify && npm install                      # playwright-core lives HERE, never in root
cd .. && VITE_GOOGLE_PLACES_KEY=k npx vite --port 3000 &
sleep 5 && cd verify && NO_PROXY='*' node checks.mjs      # 18 checks; exit 0 = pass
NO_PROXY='*' node driver.mjs && NO_PROXY='*' node driver.mjs --dark
```

`NO_PROXY='*'` is required or localhost returns 000. **CI runs `checks.mjs` too**, so it
runs whether or not an agent remembers. Every check in it exists because that bug
shipped and *the user* found it.

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

**Measure BOTH, EVERY TIME — mobile and desktop, portrait and landscape, light and dark.**
That is 390×844, 844×390 and 1440×900, in both modes; `checks.mjs` runs all of them.
An entire session measured only 390px light and shipped a rail clipped mid-word, 36px tab
targets and a duplicated headline to 1440. A viewport you do not measure is a viewport
you are shipping blind.

**THE WAY TO SEE THIS APP — drive a real browser yourself. Never ask the user for a
screenshot.** Verified working 2026-07-27. It takes about 90 seconds end to end.

```bash
npm install                                  # ~15s
nohup npx vite --port 3000 > /tmp/dev.log 2>&1 &
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
