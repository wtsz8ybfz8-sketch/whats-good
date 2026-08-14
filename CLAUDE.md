# whats-good — authoritative project instructions

**This file is the single source of truth.** Where anything else disagrees with it — a
handover, a README, a code comment, an older session's reasoning — this file wins.
**The latest request in the live conversation overrides this file and every handover.**
Handovers are a record of what happened, never a mandate for what to do next.

---

## 0. READ THIS FIRST — what the codebase actually is

**There is no React app. There have been zero `.tsx` files in this repo since `206fe11`,
"Transplant the prototype: it is now the app".**

The deployed application is **`src/prototype.ts`** — a single ~830-line vanilla TypeScript
module that renders into the static markup in `index.html`, styled by `src/prototype.css`.
`index.html` loads it directly: `<script type="module" src="/src/prototype.ts">`.

What that means for anything you are about to read below:

| The document used to say | What is actually there |
|---|---|
| `App.tsx`, `EateryView`, `RecipeView`, `HappyHourView`, `Sidebar`, `StatusStates` | **None of these exist.** One module, `prototype.ts` |
| `src/components/` | **Does not exist** |
| `src/index.css` with `@theme` tokens | **Does not exist.** Tokens live on `:root` in `prototype.css` |
| `.glass`, `.surface`, `.page-grid`, `.bleed`, `.hit-44`, `.safe-x`, `--tabbar-h` | **None of these classes or tokens exist** |
| Tailwind utility classes | **None.** Tailwind is still wired into `vite.config.ts` but no stylesheet imports it, so it emits nothing |

**This section was added on 2026-08-14 because that mismatch had already done real damage.**
Four CI checks and one regression check were grepping paths that no longer existed —
`grep` on a missing path prints nothing, `|| true` swallowed the exit code, and every one
of them reported green while measuring an empty set. Under that cover, a hand-formatted
distance shipped and read **"2.0 km" to every user who writes "2,0"**, and kilometres to
every user who thinks in miles.

**The rules in this file are still the rules.** Almost every law below was earned by a real
defect and still applies — the iOS Safari truths, the honesty contract, the trap register,
the benchmark law. What changed is the *subject* they apply to. Where a rule names a file
that no longer exists, the rule survives and the filename does not. Fix the subject; never
quietly drop the rule.

**What still exists and is still load-bearing:** `placesService.ts` (Places + the OSM
fallback), `osmFallback.ts`, `locale.ts` (the only module allowed to format for a human),
`auth.ts`, `savedStore.ts`, `venue.ts`, `happyHourSources.ts`, `cuisineRail.ts`,
`cuisineIcon.ts`, `recipeUtils.ts`, `telemetry.ts`, and the whole `verify/` harness.

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

## 2A. THE BENCHMARK LAW — no work on thin research, EVER. Read this every session.

**This is the highest-priority rule in this file after the safety rules (§3, §4). It was
added because a session shipped a "desktop-native" redesign it called "grounded in macOS
research" when the research was two shallow searches, sources cited but never opened
(including a 2007 Leopard-era HIG), and ZERO market research. That must never happen
again.**

**It does NOT conflict with FAST MODE (§2) — the two are orthogonal and you must obey both.
FAST MODE governs how CHEAPLY YOU VALIDATE a change (the §6 ladder). This law governs how
you DECIDE what to build. Cheapest check to VERIFY; primary, current sources to DECIDE.
FAST MODE is never a licence to skip research — validation economy and design grounding
are different axes.**

**The law:** every UI, UX, interaction, layout, copy or functionality decision MUST be
grounded in a **named, current, primary industry benchmark that you actually read this
session**, and that benchmark MUST be cited with its source in your response. Memory,
"standard practice", pattern-matching, a blog's summary, or a source you did not open is
**not** grounding. If you cannot cite a current primary source for a decision, you have not
earned the decision — say so out loud and go get it before writing code.

**What counts as real grounding (primary, current, cited):**

- **Apple HIG** — the LIVE guidelines at `developer.apple.com/design/human-interface-guidelines`.
  Name the exact component/page you used (e.g. Split Views, Sidebars, Layout, Materials,
  Typography). Never a dated mirror, never a third party's summary standing in for it. If
  the HIG SPA will not render for your fetch tool, say **"reached snippets only"** — never
  dress a search snippet as the primary document.
- **Accessibility** — WCAG 2.2 AA. Contrast, focus order and hit targets are **measured**,
  never eyeballed (ties to §11.7).
- **Performance** — Core Web Vitals, as numbers you measured: **LCP < 2.5s, CLS < 0.1,
  INP < 200ms.** "Feels fast" is not a measurement.
- **Market benchmark** — for anything touching the discovery or venue surfaces, tear down
  how the category leaders build it *right now*: **Google Maps, The Infatuation, Resy,
  OpenTable, Eater.** State explicitly what you steal and what you reject against §7. The
  product is positioned as an elevated alternative to Google Maps (§1); you cannot beat a
  benchmark you have not looked at.

**The pre-work gate — before the first line of any UI/UX/functionality change, state in the
response, in this order:**

1. the primary benchmark(s) consulted, each with its exact page/source;
2. what they prescribe for THIS specific decision;
3. where the current app deviates from that;
4. anything you could only reach as a snippet, marked as such.

**No gate, no code.** A change that skips the gate is not "fast", it is unfounded, and it is
the exact failure this section exists to stop.

**Worked example — the session that made this a law (2026-08-03).** A "desktop-native"
restaurant redesign was shipped as macOS-grounded. In truth: sources were cited but never
opened (a 2007 Leopard HIG among them), no market research was done at all, and the actual
Mac-native browse→detail pattern — a **split view** (a persistent list beside the detail,
per Apple HIG *Split Views*) — was never even considered, so the "fix" reproduced the iOS
push-navigation model on a 1440px screen and still felt like a phone. It was verified only
over a fixture's flat gradient, never a real photo; contrast was eyeballed; the mandatory
gates (`qa-gate`/`judge`/`perceive`) were skipped; LCP/CLS were never measured. Every one of
those is now, explicitly, a violation of this section.

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
typecheck your work.** `.github/workflows/ci.yml` is supposed to cover that gap — it runs
`tsc --noEmit`, the build, and the full browser suite on every push. **For anything you
have pushed, read the Actions tab rather than guessing.** Read it *properly*: open the
failing job and find which STEP died.

**CI HAD NOT TYPECHECKED OR BUILT ANYTHING FOR AT LEAST TWO DAYS, AND NOTHING SAID SO.**
On 2026-08-14 every one of the last eight runs on `main` was **red**, going back to
2026-08-13 — and every one died at the same place: *"Every source file is declared in the
inspection ledger"*. That step is **second in the workflow**. Typecheck is third, Build is
fourth, the regression suite is seventh. **None of them ran on any of those pushes.** Four
source files — including `src/prototype.ts`, which is the entire deployed application —
had been added without a ledger row.

The lesson is not "declare your files". It is that **a red pipeline reports the FIRST thing
that broke, and everything after it is silence, not success.** This file asserted for two
days that CI typechecks every push, while the typecheck step was never reached. If a run is
red, you know nothing about any step below the failure — say so in those words, and never
quote an earlier green run as if it covered code that landed after it.

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

**NEVER grep a failing suite for the failure.** `checks.mjs | grep -E '✗|Error'` filters
out every `✓`, so the last check that PASSED is invisible and the abort appears to have
happened wherever your pattern happened to match. A session ran three separate "fixes"
against a log read that way, reported all three as *disproved hypotheses*, and wrote them
into a handover as findings. Every one of those conclusions was worthless: the suite
throws before `check()` prints, so there is no `✗` to find at all. Instead:

```bash
cd verify && NO_PROXY='*' node checks.mjs > /tmp/full.log 2>&1; echo "EXIT: $?"
grep -c "✓\|✗" /tmp/full.log     # which check number it died on
tail -20 /tmp/full.log            # UNFILTERED — Playwright names the intercepting element
```

**Run the control BEFORE the hypothesis.** `checks.mjs` on `main` alone is one command
and tells you whether the suite is green without your change. The same session deferred
that single run to "the next session" while spending four runs guessing, then found on
finally running it that `main` was 51/51 and the change was the cause all along.

**Fetch before asserting anything about git.** A container's remote-tracking refs are a
CACHE and can be arbitrarily stale; `git log origin/main` will report the old SHA with no
error. Run `git fetch --all --prune` first, or read the SHA from `git ls-remote`. A
session asserted "only two branches", "`main` is at `5fa9c12`", "20 commits ahead" and
"your fixes are not live" — all four false, all four from a clone that had never
re-fetched — and on that basis publicly accused a CORRECT `HANDOVER.md` of lying.

**A feature you cannot grep for is not a feature that does not exist.** Before concluding
work is missing, read the SUBJECTS: `git log --oneline origin/main..origin/<branch>`.
A session searched every branch for one UI string, did not find it, concluded the feature
had never been built, and rebuilt it — while eleven commits of the user's own work
(scroll retraction, back/forward restore, rating counts, the venue decision layer) sat
unmerged on a branch whose commit subjects name every one of them in plain English.

**Never `git checkout <branch> -- <file>` while that file has uncommitted work.** It
overwrites from the branch with no warning and no reflog entry for the lost content. It
destroyed a just-written `HANDOVER.md` in this repo.

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

**A PHONE IN LANDSCAPE IS ≥768px WIDE. It takes every `sm:` and `md:` rule you wrote for
a tablet, while having LESS vertical room than the portrait layout those rules replaced.**
This is the single most productive source of "it looks fine here and broken on my phone"
in this project, because every local portrait render passes and the desktop render passes
too. Three consequences, all of which shipped and were found by the user on a real device:

1. **An offset derived from mobile-only chrome must be zeroed where that chrome is gone.**
   `--tabbar-h` was a flat `64px` at every width while `.tabbar` is `md:hidden`. On a
   rotated phone the tab bar does not exist and every bar docking above it still reserved
   64px, so EateryView's Directions bar floated mid-screen across the photo and the
   address. Fixed at the token — `@media (min-width: 768px) { :root { --tabbar-h: 0px } }`
   — which corrects EateryView and both RecipeView bars at once. Never patch one call site.
2. **A `dvh` height tuned in portrait is absurd in landscape.** `md:h-[60dvh]` is a
   considered 60% of an 844px screen and 60% of a 430px one. Height-based sizing needs a
   short-landscape cap: `@media (orientation: landscape) and (max-height: 560px)`. Key it
   on HEIGHT as well as orientation so a real tablet keeps the full treatment.
3. **A `md:` type step lands on a rotated phone.** `md:text-[5.5rem]` put an 88px venue
   name on a 430px-tall viewport; it wrapped to two lines, overflowed the photo and ran
   through the translucent Back/Share chips — which is what a user reports as "see-through
   elements", not a transparency bug.

**Bottom-anchored overlays grow UPWARD.** Shortening a hero moves its `absolute bottom-0`
caption INTO whatever is pinned at `top-*` of the same box. Any change to a hero's height
must re-check the overlay against the controls above it.

**`checks.mjs` renders 844×390 landscape but did not catch any of the above**, because the
landscape pass never opened a venue detail — it measured the list surfaces only. A viewport
that is measured on the wrong SCREEN is not covered. When adding a landscape check, open
the detail view too, and assert a docked bar's bottom edge is flush with the viewport
floor, not merely that it exists.

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

**NEVER run an unbounded search, and never leave a long command running.** On 2026-08-14
a `grep -rl "sb_publishable_" ~/Documents ~/Downloads` — hunting for an API key — never
finished, was backgrounded, and burned ~5 HOURS of compute, contributing to the user
nearly exhausting a week's usage. Scope every search to the repo (`git grep`, or
`grep -r --include=... .`), and cap it. A secret is in the repo, in `vercel env ls`, or in
a dashboard — widening the radius to the home directory finds nothing and costs everything.
The same applies to any command you background: bound it, watch it, or do not start it.

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

**Feel:** editorial, quiet, confident. Reference points the owner named on 2026-08-13:
Apple, Nike, The Row, Jacquemus, AKJP, Villa 47. A true-neutral ground with generous air
and **one** accent that is spent deliberately — selection, live state, and the single
emotional word in a headline ("What's **good** right now?"). Everything else is neutral,
which is the only reason the accent lands.

**Cream is retired, and must not come back.** `#F4F2EF` read as peach on a real screen,
made every muted tone look muddy, and was rejected outright in review. Neither is the
answer black-and-white minimalism — colour matters, especially for food; it is simply
*rationed*. Gradients as decoration or as image stand-ins are banned: they read cheap and
were rejected by name.

**Photography carries the colour, not the interface.** Venue photos come from the Google
Places Photo API (already paid for; cache resolved URLs in Supabase). Occasion and hero
imagery is a curated set we own — roughly 20 images total, licensed from Pexels or
Unsplash, chosen deliberately and self-hosted. Occasion imagery is editorial, so it is
never fetched dynamically. Never OpenStreetMap or Wikimedia photos: they are documentation
shots, not food photography.

**Tokens live on `:root` in `src/prototype.css`.** Bind to them. Never hardcode a hex;
never add a colour without adding the token first. The palette survived the transplant with
its VALUES intact and its NAMES changed — the hexes below are the same ones the React app
used, so the design decision is unbroken even though every token identifier moved.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F5F4F2` | `#0E0E0D` | Page canvas |
| `--surf` | `#FFFFFF` | `#181817` | Raised surfaces — cards, sheets |
| `--surf2` | `#ECEBE8` | `#222220` | Recessed surfaces — quiet controls |
| `--ink` | `#111110` | `#F5F4F2` | Body text and headings |
| `--ink2` | `#5C5B57` | `#A8A7A2` | Metadata, captions |
| `--ink3` | `#8D8C87` | `#787771` | Small labels — the quietest readable tone |
| `--line` | `#E3E2DE` | `#282826` | Hairlines and rules |
| `--line2` | `#CAC9C4` | `#3B3B38` | Stronger borders |
| `--accent` | `#C8371C` | `#FF5A3C` | The single accent |
| `--on-accent` | `#FFFFFF` | `#170502` | Text/icons **on** the accent |
| `--r` / `--r2` / `--r3` | `20px` / `14px` / `999px` | same | Corner radii |
| `--grain` | `.05` | `.07` | Grain overlay opacity |
| `--sans` | system stack | same | The only font family |

**Dark mode is declared THREE times and all three must agree** — `@media
(prefers-color-scheme: dark)`, `:root[data-theme="dark"]`, and `:root[data-theme="light"]`.
The media query serves the default "follow the system" state; the two attribute selectors
serve the manual toggle and must win in both directions. **A token added to only one of the
three blocks is the bug this structure exists to prevent**: it renders correctly for
whichever state you happened to test and wrongly for the other two. Nothing checks this
today (§13.2).

**Contrast is not carried over — it must be re-measured.** The AA figures this file used to
quote were measured against the React app's token set. `--ink2` and `--ink3` are new names
at values that were never all verified together on this canvas. **`--ink3` (`#8D8C87` on
`#F5F4F2`) is the one to check first** — it is the quietest tone in the palette and the most
likely to sit under 4.5:1. Measure, don't assume, and don't repeat the old numbers as if
they were about these tokens (§11.7).

**Type: the app currently renders in a SYSTEM font stack** — `--sans` is
`-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, system-ui`.
Schibsted Grotesk is **not** applied anywhere: no `@font-face` declares it and no rule
references it. But `index.html` still `preload`s two of its `.woff2` files at highest
priority on every single page load, so the browser fetches them, blocks bandwidth on the
critical path for them, and never draws a glyph with them. That is a live performance bug
on the exact device this app is for — a mid-range phone on a street (§13.3).

Either apply the face or drop the preloads. **Do not do it silently**: the typeface is a
design decision the owner has opinions about, and a system stack was explicitly criticised
as feeling generic. Raise it, decide it, then implement it.

**Surfaces:** there is no `.glass`. Translucent chrome does not exist in this codebase and
`backdrop-filter` appears zero times — CI now holds that at zero (§13.1), because the cost
of translucency on a scrolling list is the reason the rule was written. Content sits on
`--surf`; recessed controls on `--surf2`.

**Layout:** there is no `.page-grid` and no `.bleed`. `prototype.css` lays out with a
`.wrap` container and a `.stage` grid that changes composition between mobile and desktop.
The durable rule survives its primitives: **never reintroduce negative-margin breakouts,
`w-screen` + `-translate-x-1/2`, or `overflow-x-hidden`** — the last of these silently ate
a Back button's left overhang once already (§12).

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
across town for something that doesn't exist. Happy Hour now searches the selected city
through Google Places for real bars and their published opening status. Places does not
publish promotional windows, so the tab must never call opening hours a deal or imply a
promotion without a separately verified source. **If it isn't confirmed, don't render it.**

**The primary content never depends on an animation.** The venue name shipped stranded at
`opacity: 0` on a delayed entrance — a venue page with no venue name. Decoration may
animate; identity, facts and actions must be present on first paint.

---

## 9. Stack

- **Vanilla TypeScript 5.8** + **Vite 6** — `npm run dev`, port 3000. **No framework.**
- **The whole UI is `src/prototype.ts`** (~830 lines) rendering into the static markup in
  `index.html`, styled by `src/prototype.css`. There are no components and no component
  files. Structure comes from functions inside that one module.
- **Icons are inline SVG path strings** in a constant map at the top of `prototype.ts`
  (`glass`, `note2`, …). That is the deliberate choice for this codebase — it ships no
  icon library and no runtime cost. Never emoji-as-icon.
- **No test runner.** The `verify/` harness is the test suite: `verify/checks.mjs` drives a
  real Chromium over the app at four viewports in both colour schemes.
- **No backend of our own.** `src/placesService.ts` fetches Google Places and falls back to
  `src/osmFallback.ts` (OpenStreetMap via Overpass) when Places refuses. `api/log.ts` is
  the one Vercel function; production deploys report `lambdaRuntimeStats: {"nodejs":1}`, so
  serverless functions do work here if a task needs one.
- **`src/locale.ts` is the only module allowed to format a number, date or distance.**
  Import `formatDistance` / `formatQuantity`; never call `toFixed` anywhere else.

**Dead weight, deliberately recorded rather than silently removed:** `react`, `react-dom`,
`lucide-react`, `motion`, `@vitejs/plugin-react` and `@tailwindcss/vite` are all still in
`package.json`, and Tailwind is still wired into `vite.config.ts` — but nothing imports any
of them and no stylesheet imports Tailwind, so they contribute nothing to the bundle.
Removing them is a real, small cleanup; do it deliberately as its own change, and re-run
the build, rather than as a side effect of unrelated work.

- Don't add dependencies without saying why. The list is small on purpose.

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

**Most of these were sprung on the React app (§0). The FILENAMES below are historical; the
MECHANISMS are not.** Every one is a browser or platform behaviour that does not care which
framework is on top, and several would re-appear identically in `prototype.ts`. Read each
for the mechanism, map it onto the current code yourself, and do not dismiss one because it
names a file that is gone — that reasoning is what let the checks in 13.1 rot.

- **A `transform` on an ancestor makes it the containing block, so `position: fixed`
  stops being fixed to the viewport.** In the React app this was the tab-transition
  wrapper, and the fix was portalling the overlay to `document.body`. There is no portal
  API here, so the equivalent is simpler and stricter: **any fixed overlay must be a direct
  child of `<body>`, never nested inside an animated container.** The trap is the CSS, not
  React.
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
- **`sr-only` is `position: absolute`, and inside an unpositioned interactive element it
  escapes.** Tailwind's `.sr-only` is `position:absolute; width:1px; height:1px;
  margin:-1px; clip:rect(0,0,0,0)`. Put it inside a `<button>` with no positioning
  context and it resolves against some ancestor instead, where it can sit over unrelated
  content and swallow pointer events. A screen-reader hint added to a cuisine chip made
  `checks.mjs` die at check 15 of 51 with `locator.click Timeout 30000ms` on a VENUE CARD
  on the other side of the layout — Playwright naming an `<h1>` and an `<h2>` as
  "subtree intercepts pointer events". If a control needs hidden text, give the control
  `relative`, or move the text off the accessible name with `aria-describedby`.
- **`theme-color` is decided by ORDER, and only the winner matters.** The browser uses
  the FIRST tag whose `media` matches. The live tag driven from the manual dark class
  must be FIRST in `<head>` — `prepend`, never `appendChild`. Appending it is a silent
  no-op for the exact case it exists to handle, and `checks.mjs` now fails on it (proven
  by sabotage: the check goes red on `appendChild` and green on `prepend`).
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
| No bare `vh` / `min-h-screen` (use `dvh`) | `checks.mjs` | Either appears in CSS or TS |
| `html` canvas is painted | `checks.mjs` | `html` has no background |
| No `background-attachment: fixed` | `checks.mjs` | It reappears in CSS |
| Two `theme-color` tags with `media=` + a live one that **wins** | `checks.mjs` | Back to one tint, or the live tag stops being first in `<head>` |
| `color-scheme` declared (meta + CSS) | `checks.mjs` | Either half missing |
| No third-party font request | `checks.mjs` | A webfont host reappears |
| `history.scrollRestoration === 'manual'`, and back restores list scroll | `checks.mjs` | Browser back resets scroll again |
| No horizontal overflow + hit targets ≥44pt + no field under 16px — on **all four tabs**, at **393×852, 430×932, 844×390, 1440×900**, light and dark | `checks.mjs` | Any combination regresses |
| Locale: comma decimals, 24h rewrite, non-Latin day labels, `de-DE` distance | `checks.mjs` | A locale assumption returns |
| **No number formatted by hand outside `locale.ts`** | `checks.mjs` **and** CI ratchet | `toFixed` appears in any `src/*.ts` but `locale.ts` |
| No hardcoded `languageCode` in the Places request | `checks.mjs` | A language is pinned |
| Venue truthfulness: no Call action without a phone, no star without a rating, no hours module without hours, no "at a glance" label over an empty value | `checks.mjs` | A module renders over absent data |
| A Maps fallback is not labelled "Official website" | `checks.mjs` | The link lies about its destination |
| Out tab queries the selected city | `checks.mjs` | A hardcoded city dataset returns |
| No Vite error overlay | `checks.mjs` | Runtime error on load |
| Types | GH Actions `tsc --noEmit` | Any type error |
| Bundling | GH Actions `vite build` | Bad import / asset path |
| No `backdrop-filter` anywhere in `src/` | GH Actions grep | Translucent chrome drifts back in |
| Hardcoded hex outside token definitions ≤ **4** | GH Actions ratchet | A colour is written instead of tokenised |
| No `vite-plugin-pwa` wired in | GH Actions grep | The invisible-deploy bug returns |
| Handover names a real, current commit | GH Actions | The stamped SHA is not an ancestor of HEAD |
| Every source file declared in the inspection ledger | GH Actions | A new file is added without a coverage entry |

**On 2026-08-14 four of these rows were fiction and one was actively harmful.** The
`.glass` check, and the `toFixed`, hex and `border-black` ratchets, all grepped
`src/App.tsx`, `src/components/` or `--include='*.tsx'`. None has existed since `206fe11`.
`grep` on a missing path prints nothing, `|| true` swallowed the exit code, the count came
back `0`, and every one reported green forever. The `checks.mjs` distance check was worse
than absent: it tested `/toFixed\(1\)\}\s*km/`, which matches only the template-literal
spelling, while the live bug was written with string concatenation — so it printed a green
tick directly over the line it existed to catch, and **"2.0 km" shipped to every locale
that writes "2,0"**. All five are repaired and each was sabotage-tested to confirm it now
goes red. **The lesson is the row, not the fix: a check whose failure you have never
witnessed is a decoration.**

**Never state a check count in prose.** This file and `qa-gate/SKILL.md` have each carried
a hardcoded count ("11", then "18", then "31") and each has drifted, because checks are
added inside loops over six viewport/mode combinations. `checks.mjs` prints its own total.
Quote what it printed on the run you actually did, or say nothing.

### 13.2 Rules with NO enforcement — agent discipline is the only gate

Every one of these is stated as an absolute above and nothing on any machine can fail it.
Treat each as unverified on every change until you have checked it by hand and said so.

- **`openNow` compared against `undefined`, never truthiness** (§8.3). Nothing greps for it,
  and nothing should — see the worked false positive in 13.3.
- **Every screen needs a URL and a title** (§6). **This is now a live regression, not a
  theoretical gap.** The prototype holds all navigation in local variables: no `?tab=`, no
  `?city=`, no `replaceState`, one `document.title` for every screen. Nothing is
  shareable, bookmarkable or survives a refresh. The three routing checks were removed
  from `checks.mjs` rather than softened, and the removal is documented in place at
  `verify/checks.mjs:704`.
- **The three dark-mode blocks agree** (§7). A token added to `@media (prefers-color-scheme:
  dark)` but not to `:root[data-theme="dark"]` renders correctly for whoever tested it and
  wrongly for everyone else. Nothing compares the three blocks.
- **Contrast** (§11.7). No check measures a ratio. `--ink3` on `--bg` is the one most likely
  to fail AA and has not been measured on this palette.
- **Never invent a restaurant fact; no placeholder content** (§8). Unfalsifiable by machine.
  This is the rule with the highest cost of failure in the entire document.
- **Primary content never depends on an animation** (§8). A headless render at default
  settings can pass while `opacity: 0` strands the venue name on a real device.
- **44pt targets via invisible boxes, never grown ink** (§11.3). `checks.mjs` proves the
  target is live; nothing proves the *ink* did not grow to get there.
- **iOS Safari behaviour of any kind.** Headless Chromium reports every
  `env(safe-area-inset-*)` as 0, which is also the correct value here. A green safe-area
  result on this machine is not evidence about iOS. It never has been.
- **Reachability of any deployment, and the OSM fallback end to end.** This container's
  egress proxy blocks Overpass outright — `EGRESS_BLOCKED` from the fetch tool, `000` from
  curl to all three mirrors (measured 2026-08-14). The OSM path cannot be exercised here by
  any method: not curl, not Chromium, not the dev server. Real device, or the Vercel
  runtime logs, or nothing.

### 13.3 Open items — the state of `src/` on 2026-08-14

The audit that produced §0 and rewrote 13.1. Everything below was measured on this tree,
not inferred from a rule.

**Fixed in the same pass, because leaving them would have made the repaired checks red:**

1. ~~**Hand-formatted distance.**~~ **FIXED.** `prototype.ts:488` read
   `(d as number).toFixed(1) + ' km'` — the slider readout said "2.0 km" to every reader
   who writes "2,0", and said kilometres to everyone who thinks in miles. It now calls
   `formatDistance()`, which was already in `locale.ts`, already tested, and **imported by
   nothing**. That is the whole anatomy of the bug: the correct code existed and the call
   site never reached for it.
2. ~~**Hand-formatted rating.**~~ **FIXED.** `prototype.ts:683` used `.toFixed(1)` for the
   rating and raw concatenation for the review count. Both now go through
   `formatQuantity()`, so a four-figure count gets its locale's grouping separator.

**Open, and each one is a real defect with a named cost:**

3. **Two font files are preloaded and never used.** `index.html` preloads
   `schibsted-grotesk-latin-wght-normal.woff2` and `…-italic.woff2` at highest priority on
   every page load. No `@font-face` declares Schibsted Grotesk and no rule references it —
   `--sans` is a system stack. So every visitor pays two high-priority font fetches on the
   critical path and sees not one glyph rendered in that face. Fix by applying the family
   or dropping the preloads; it is a design decision, so raise it rather than picking (§7).
4. **`prototype.ts:809` hardcodes the theme-color tint**, `'#0E0E0D' : '#F5F4F2'` — the same
   two values as `--bg` in each mode, written again by hand. Change the canvas token and the
   browser chrome keeps the old tint, which rebuilds from parts the exact "band of the wrong
   colour welded to the screen edge" bug in §12. Read the token, don't restate it.
5. **`prototype.css:337,347` use `color:#FFF`** for headings over photo heroes. Should be a
   token; there is no `--on-photo`.
6. **Nothing is addressable** — see the routing entry in 13.2. This is the largest
   functional regression from the React app and it is not tracked anywhere else.
7. **Tailwind, React, `react-dom`, `lucide-react`, `motion` and `@vitejs/plugin-react` are
   installed and unused.** Tailwind is still wired into `vite.config.ts`, but no stylesheet
   imports it, so it emits nothing. Dead weight in `package.json` and in every install.

**The false positive worth keeping, because it is the lesson:** an earlier audit flagged
four `openNow` truthiness violations. All four sat inside an outer
`openNow !== undefined` guard — the grep saw the inner ternary and not the guard. **No
ratchet was added**, because no grep can tell a guarded ternary from a bare one; it would
have fired on correct code forever. A grep written from a rule catches the *shape* of a
violation, never the *fact* of one. Every ratchet in `ci.yml` is a tripwire that tells you
where to look; none of them is a verdict. **Read the site before you believe the check.**

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

- **`inspect`** (project skill, `.claude/skills/inspect/`) — **mandatory before the words
  in §13.4, before any deploy, and before answering "does X work?"** `qa-gate` proves the
  SUITE is green; `inspect` is what stops a green suite being reported as a working
  product. It carries the four laws below and the surface coverage rules.
- **`qa-gate`** (project skill, `.claude/skills/qa-gate/`) — the mechanical gate. Run it,
  then apply `inspect` to what it did and did not cover.
- **`judge`** (project skill, `.claude/skills/judge/`) — **the adversarial pre-ship review,
  mandatory before calling anything ready, done, shippable or good, and before any deploy.**
  `inspect` stops you deceiving yourself about facts; `judge` stops you shipping something
  true but bad. Scores street usage, the §5 customer journey, product coherence,
  engineering blast radius and Apple HIG, and is allowed to return DO NOT SHIP. A run that
  finds nothing is not a pass — it means the review was not performed.

**SECURITY POSTURE — settled, do not re-litigate at 1am.** The Places key is inlined into
the client bundle by Vite. That is the NORMAL architecture for a browser Places app; the
key is not in git (`.env*` is ignored, verified 2026-08-01) and Google's designed
mitigation for a browser key is an **HTTP-referrer restriction plus a daily quota**, both
console-side. A serverless proxy is real defence-in-depth and is worth building — but
`vite dev` does not serve `/api`, so it CANNOT be verified from this container, and
shipping an unverifiable rewrite of the data layer is how this project breaks itself.
Build it deliberately, with the user present, never as a late-night "quick fix".

### 14.1.1 The four laws — memorise these, they are the whole failure history

Every defect this project shipped was one of these. Every one was found by the USER.

1. **Presence is not effect.** A rule in a file is not a rule applying. The anti-zoom rule
   sat in `@layer base` under a comment claiming it was safe there; Tailwind utilities are
   a later layer and beat it. **Measured 14px where the file promised 16px**, for the
   project's whole life. Read computed values from a browser, never `grep`.
2. **A document is a claim, not evidence.** `HANDOVER.md` insisted the Places key was
   unset and was the one blocker. A user screenshot showed 33 live Paris bars. Cite
   provenance; mark disagreements CONTESTED.
3. **An unopened surface is not a working surface.** Read `INSPECTION-LEDGER.md` before
   reporting on anything. If it says NEVER INSPECTED, say those words to the user.
4. **Validate the test before believing it.** A cost script reported the cache broken; the
   script was wrong. Before accepting a number, say what a *working* system would have
   produced — if the test cannot tell the two apart, it is not a test.

**"Impossible" requires a command and its output.** "I can't see the app, send a
screenshot" was false for weeks while Chromium sat pre-installed. See the register at the
foot of `INSPECTION-LEDGER.md`.

**`INSPECTION-LEDGER.md` must be updated whenever a surface is inspected** — with the
date, the method, and what was NOT checked. It is not optional and it is not a summary of
the handover; it is the coverage map that makes "I have never looked at this" visible
before a claim rather than after a user complaint.

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
