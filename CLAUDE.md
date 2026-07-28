# whats-good — operating contract

**Scope of this file: current, durable rules only.** It does not carry history, session
state, or audit findings.

| Layer | File | Authority |
|---|---|---|
| The live request | the conversation | **Highest. Overrides everything below.** |
| Rules | `CLAUDE.md` (this file) | Authoritative for *how to work*. |
| Machine truth | `verify/checks.mjs`, `.github/workflows/ci.yml` | **Authoritative for what is actually enforced.** Where this file and a check disagree about enforcement, the check is right and this file is stale — fix it. |
| Live state | `HANDOVER.md` | What the last session left. A record, never a mandate. |
| History | `AUDIT_HISTORY.md` | Why rules exist. **Not policy.** Ignorable. |
| Background | `IDEATION_BRIEF.md` | Original product intent. Not instruction. |

**Every rule below is labelled:**

- **[ENFORCED_BY_CI]** — a machine can turn this red without an agent's cooperation. These
  are the only rules you may report as verified flatly, and only after quoting the run.
- **[HUMAN_DECISION]** — product, design or judgement. **Nothing checks it.** If your change
  touched one, say so in those words: *"nothing checked X."*

---

## 1. What this product is — [HUMAN_DECISION]

Mood-and-location-driven food discovery: find somewhere to eat, or something to cook, based
on how you feel and where you are.

Position it as an elevated, human alternative to a map directory. Both halves, always:

- **Keep the practical utility.** Real place identity, opening hours, price band, distance,
  address, menu, directions, phone. When a true field is available, it stays. Never trade
  usefulness for elegance.
- **Add a truthful decision layer** on top: why *this* place suits *this* person, mood and
  moment. That layer is the product.

A prettier directory of generic metadata is a failure, however beautiful. So is a wall of
raw data with no judgement in it.

---

## 2. Operating mode — [HUMAN_DECISION]

One task = **one diagnosis, one focused implementation, one proportionate validation.**

- **Scope is the request, at full width.** "Fix X" means fix X wherever X occurs — every
  viewport, both colour schemes, any locale. Shipping half of that and waiting to be told
  is not narrow scope, it is incomplete work.
- **Do not widen the request.** If you notice an unrelated improvement, say so in one line
  and leave it. Do not refactor, upgrade, reformat or redesign anything the task did not
  ask for.
- **Inspect proportionally, not minimally.** Start from the file you are changing and its
  immediate callers. When the symptom is cross-file — a cascade conflict, a token used in
  several components, a rule that could be violated anywhere — widen the *reading* until
  you can actually see the problem. Reading is cheap; guessing is what costs a session.
  Narrow scope applies to what you **change**, not to what you look at.
- **Climb the validation ladder only as far as the change demands** (§6).
- **Use only the skills and tools that materially help.** "Use every relevant skill" never
  means invoke every available skill (§13).

---

## 3. Hard stop — [HUMAN_DECISION]

**Stop at the first occurrence of any of these:**

- a browser renderer times out or hangs;
- any tool fails **twice**;
- a context or usage warning appears;
- the session may end before the result is visible to the user.

**Then, in order:** save the current code (leave the working tree intact) → do **not** retry
the browser, run another probe, commit, deploy, refactor, install anything, or delete Git
lock files → update `HANDOVER.md` (§9) → end the session, saying plainly what is verified
and what is not.

A partial change plus an honest handover is a good outcome. A stranded session with no
handover is the only real failure.

---

## 4. Git — ask first, every time — [HUMAN_DECISION]

**Never commit, amend, push, tag, deploy, or delete Git lock files (`.git/*.lock`) unless
the user explicitly asks in the live conversation.** Deleting a lock file to force a commit
through is forbidden outright — it risks the user's repository to save you a step. Leaving
work uncommitted in the working tree is the correct default.

---

## 5. The acceptance test is the customer journey — [HUMAN_DECISION]

Every change is judged against the whole path, not the screen it lives on:

| Stage | The question it must answer |
|---|---|
| Orient | Where am I, what is this, what can it do for me right now? |
| Express intent | Can I say what I want in one gesture? |
| Choose | Are the options comparable, and is the difference between them legible? |
| **Trust** | Is this true, current, and sourced? Would I bet a trip across town on it? |
| Explore | Can I go deeper without losing my place? |
| Act | Is the next step obvious and one tap away — directions, call, menu, save? |
| **Recover** | If it's closed, empty, wrong or offline, am I given a way forward? |

Trust and Recover are the two most often skipped. A change that improves one stage while
breaking another is a regression. **Name the stage you moved.**

---

## 6. Validation — what each rung can actually detect

| Rung | Command | Detects | Note |
|---|---|---|---|
| 1 | `npx esbuild <file> --outfile=/dev/null` | Syntax, unbalanced JSX, bad imports | ~20ms |
| 2 | `npm run lint` (`tsc --noEmit`) | Types | Often **does not complete** locally — see below |
| 3 | `npm run build` (`vite build`) | Bundling | **Runs no typecheck** |
| 4 | `node verify/checks.mjs` | Everything in §7 | Needs the preconditions below |
| 5 | `node verify/driver.mjs [--dark]` + **read the PNGs** | Anything visual | The only thing that sees dark mode |

**Preconditions for rungs 4–5. If one is unmet the run is not evidence:**

- `npm install` **and** `npm --prefix verify install` — `playwright-core` lives in
  `verify/`, never in the root `package.json`.
- The dev server must be started with `node verify/serve.mjs up`. It is idempotent, and it
  bakes in `VITE_GOOGLE_PLACES_KEY`. **A bare `npx vite` omits the key**, and without it
  `fetchVenues` returns `[]` before any request is made, so the Places fixture is never
  consulted and every venue view comes up empty. `checks.mjs` exits **3** with the exact
  command rather than skipping. **Pair every `up` with a `down` — never leave a dev server
  running, never start one by hand.**
- `NO_PROXY='*'` on anything hitting localhost, or requests go through the agent proxy and
  return `000`.
- Chromium is pre-installed at `/opt/pw-browsers/`; `verify/chromePath.mjs` resolves it.
  **Never run `playwright install`** locally — the proxy blocks the CDN. CI installs its
  own.

**Honest reporting of results:**

- **`tsc --noEmit` is pathologically slow here** — minutes at ~0% CPU, frequently past a
  7-minute timeout. That is local I/O, not your code. A timed-out typecheck is
  **"did not complete"** — never "passed", never "failed". For anything you have **pushed**,
  read the Actions tab instead of guessing: CI runs the real typecheck.
- **SKIPPED is not PASS.** `checks.mjs` prints `⚠ SKIPPED` and counts skips separately in
  its summary. Read the summary line, not the exit code alone.
- **A misconfigured harness must never soften into a verdict about the app.** Exit 3 means
  the harness is wrong; it means nothing about the code.
- **Never state a check count from prose.** Quote the total the suite printed on the run you
  actually did, or say nothing. Every hardcoded count in this repo's docs has drifted.
- **Don't let a pipe swallow an exit code.** `npm run build | tail -20` reports `tail`'s
  status. Check `${PIPESTATUS[0]}`.
- **Never diagnose an external service from here.** The agent proxy returns **403 for every
  outbound URL**, `example.com` included. A 403 tells you nothing about the target.
  Deployment reachability is checked from a real device, or not at all.
- **A check that cannot fail is not evidence.** Before trusting a green result, name the
  result that would have been red.

**Before writing verified / working / fixed / clean / passing / done, all four:**

1. Name the rung reached and the command's real exit code.
2. Name the specific result that would have been **red**.
3. Name anything your change touched that is **[HUMAN_DECISION]** — nothing checked it.
4. If a check timed out, say **"did not complete."**

Run the `qa-gate` skill before any of those words, and before any deploy.

---

## 7. What the machine actually enforces — [ENFORCED_BY_CI]

This table is descriptive, not aspirational. If it disagrees with `verify/checks.mjs` or
`.github/workflows/ci.yml`, **the code is right and this table is stale.**

### `verify/checks.mjs` — static (source is read; no browser needed)

| Rule | Fails when |
|---|---|
| `viewport-fit=cover` in the viewport meta tag | Tag edited or dropped |
| No third-party font request (`fonts.googleapis/gstatic`) | A webfont is loaded from another origin |
| `html` has a `background` | The canvas is unpainted |
| No `background-attachment: fixed` | It reappears in CSS |
| ≥2 `theme-color` tags, at least one with `media=` | Back to one hardcoded tint |
| `color-scheme` declared in **both** the meta tag and CSS | Either half missing |
| No hardcoded `languageCode` in the Places request | A locale assumption returns |
| No `toFixed(1)} km` distance formatting in `App.tsx` | Hand-formatted distance returns |
| `safe-area-inset-left` **and** `-right` consumed in CSS | Landscape notch left unhandled |
| **No bare `vh` unit or `min-h-screen`** anywhere under `src/` (`dvh` is fine) | Any `46vh`, `85vh`, `100vh`… appears. The whole tree is walked, so new files are covered on creation |

### `verify/checks.mjs` — rendered (browser required)

| Rule | Fails when |
|---|---|
| No Vite error overlay | A runtime error on load |
| Action bar sits flush on the tab bar | A gap opens between the two bars |
| **Still flush at a simulated 34px inset** (`--tabbar-h` forced to 91px) | A hardcoded offset drifts from the token |
| `history.scrollRestoration === 'manual'` | Browser back resets scroll |
| Browser back restores the list scroll offset | Back throws the user to the top |
| Per tab (Find / Stay In / Happy Hour / Saved): no horizontal overflow, every visible control ≥44pt **by point probe** | Either regresses |
| `?tab=` and `?city=` deep links open the right screen | Navigation returns to pure state |
| `document.title` names the screen | Every entry reads the same |
| A live (non-`media`) `theme-color` meta exists | The dark toggle stops tinting browser chrome |
| `de-DE` distance uses a comma | A locale assumption returns |
| Scaled-recipe chip renders, uses the locale decimal separator, takes its colour from the accent token | `toFixed` returns, or a raw hex replaces the token |
| `src/locale.ts` imports; 12h→24h rewrite; non-Latin day label stripped; a bare time is not mistaken for a day label | Any locale helper regresses |
| Per viewport — **390×844, 393×852, 430×932, 844×390 landscape, 1440×900 desktop**: no overflow, canvas painted, and header + tab bar keep ≥16px from both bezels | Any one of them regresses |

### `.github/workflows/ci.yml`

| Rule | Mechanism |
|---|---|
| Types | `tsc --noEmit` — **blocking** |
| Bundling | `vite build` — **blocking** |
| The regression suite on Chromium | `node verify/checks.mjs` — **blocking** |
| The same suite on **WebKit** + WebKit screenshots at 393×852 | **`continue-on-error` — observation only, not a gate.** Read the step summary; a green pipeline does not mean WebKit passed |
| `.glass` placement: none in `src/components/`, ≤2 in `App.tsx` | Blocking. Checks *placement*, not just count |
| No `vite-plugin-pwa` wired into `vite.config.ts` | Blocking |
| **Ratchets** (current count is the ceiling; a *new* violation is red): hardcoded `bottom-`/`pb-[Npx]` = 0 · `toFixed(` in `src/**/*.tsx` = 0 · hardcoded hex = 71 · `border-black` = 0 | Lower a ceiling whenever you remove a violation. **Never raise one.** A ratchet tells you where to look; it is not a verdict |

### Not enforced anywhere — assume unverified

Say so explicitly whenever your change touches one:

- **Dark mode.** `checks.mjs` does **not** sweep dark. Only `driver.mjs --dark` renders it,
  and only into PNGs someone must open.
- **iOS Safari behaviour of any kind.** Headless Chromium reports every
  `env(safe-area-inset-*)` as `0`, which is also the correct value here. A green safe-area
  result on this machine has never been evidence about iOS. WebKit-on-Linux in CI closes
  most of that gap, not all of it — and it is not a gate. Say "WebKit", never "iPhone".
- **Deployment reachability.** No check exists and none should. Real device or nothing.
- **`openNow` compared against `undefined`** (§8). Deliberately not greppable — see
  `AUDIT_HISTORY.md`.
- **Invented restaurant facts / placeholder content** (§8). Unfalsifiable by machine, and
  the rule with the highest cost of failure in this document.
- **Primary content stranded behind an animation** (§8).
- **44pt targets built from invisible boxes rather than grown ink** (§10.3). The probe
  proves the target is live; nothing proves the ink did not grow to get there.
- **`position: fixed` inside tab content** (§11).
- **Colour tokens beyond the hex ratchet**, and every §11 trap not listed above.

---

## 8. Restaurant pages are a first-class surface — [HUMAN_DECISION]

When a venue page is in scope it carries all six. Each is a real field or it is absent —
never a placeholder.

1. **A specific recommendation thesis** — why this place, for this person, right now. One
   sentence with a point of view.
2. **Evidence-backed Vibe Match** — tied to a real signal (`vibeMatch`, cuisine, confirmed
   attributes). Never a vibe asserted from nothing.
3. **Truthful utility block** — distance, spend band, live open/closed, hours today.
   **Compare `openNow` against `undefined`, never truthiness:** `false` is a real answer
   ("Closed") and a truthy check swallows it.
4. **A real signature directive, or an honest menu link.** No dish, no module — link out.
5. **One useful distinctive detail** — the thing a directory would not tell you.
6. **One clear next action** — directions, call, menu or save. Unmistakable.

**Never invent a restaurant fact and never add decorative filler.** A disclaimer under
synthesised data protects us, not the user; a fake price sends someone across town for
something that does not exist. `happyHourData.ts` (human-confirmed) is the standard: **if it
isn't confirmed, don't render it.**

**Primary content never depends on an animation.** Decoration may animate; identity, facts
and actions are present on first paint.

---

## 9. Design direction — decided, hold to it — [HUMAN_DECISION]

**Feel:** warm editorial. A good food magazine, not a SaaS dashboard. Off-white paper,
generous air, one warm accent. Cooler, flatter or more generically "clean" is wrong.

**Tokens live in `src/index.css`** on `:root` and `html.dark`. Bind to them. Never hardcode
a hex; never add a colour without adding the token first.

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

**Type:** one family, Schibsted Grotesk, **self-hosted from `public/fonts/`** and preloaded
with `font-display: optional`. Hierarchy comes from weight, size and colour — never from
switching typeface. Headings are `600` (`700` only to shout), set globally in `@layer base`.
Never reintroduce a webfont `@import` or a third-party font host. Declare the faces by hand:
importing `@fontsource-variable/...` registers the family as "Schibsted Grotesk *Variable*",
which does not match the `@theme` tokens, and the app silently renders the fallback.
`/fonts/*` is served immutable with stable filenames — **a font change renames the file,
never overwrites it.**

**Surfaces:** `.glass` is chrome only — the fixed header and the mobile CTA bar, both in
`App.tsx`. Content uses `.surface`; small recessed controls use `.surface-quiet`; hover lift
is opt-in via `.surface-hover`. **Never put `.glass` on a card** — it puts backdrop-filter
cost on every row of a scrolling list.

**Layout:** `.page-grid` / `.bleed` in `src/index.css` is the full-bleed primitive. A
`.bleed` child spans the physical viewport at every width; gutters are `minmax(0,1fr)`
because each child owns its own horizontal padding. Never reintroduce negative-margin
breakouts, `w-screen` + `-translate-x-1/2`, or `overflow-x-hidden` on `<main>`.
**`.safe-x` composes, never replaces** — it is unlayered CSS, which beats Tailwind's
`@layer utilities` whatever the specificity, so a bare `padding-*` there silently deletes
the element's gutter. Use `max(var(--safe-gutter), env(...))`, a floor, not a competitor.

**Bottom-chrome offsets come from `--tabbar-h`, never a number.** The safe-area inset lives
in the *offset* only; counting it in the padding as well doubles it.

**Dark mode is class-based** (`html.dark`) and **the user likes it as it is** — check both
modes; change neither the dark palette nor the font without being asked.

**Locale:** `src/locale.ts` is the only module allowed to know how the user reads. Never
hardcode a locale; never format a number, date or distance by hand. Use `Intl`, derive from
`navigator.language`, and resolve "today" from the venue's `utcOffsetMinutes`, not the
phone's clock.

**Every screen needs a URL and a title.** `?tab=` and `?city=` are seeded on load, validated
against the known set, and written with `replaceState` for tab/city changes — `pushState`
there would make the back gesture chew through tab switches before it could close a detail
view. Venue ids come from a Places query and are not stable, so they are deliberately not
addressable yet.

---

## 10. Non-negotiable UX rules — [HUMAN_DECISION]

1. **Elite iOS HIG.** Progressive disclosure, spatial hierarchy, optical balance.
2. **No brute-force scripting for UI.** Never `sed` or Python `replace()` for structural UI
   change. Component-level React refactoring only.
3. **Optical, not mathematical, scaling.** Reach 44×44pt hit targets with invisible bounding
   boxes (`.hit-44`, transparent wrappers, `min-w-[44px] min-h-[44px]`). **Never expand the
   visual ink** — background, border, icon — of a small control to get there.
   *Auditing them: probe, never measure.* `.hit-44` puts the target on an invisible
   `::before`, so `getBoundingClientRect().height` stays 42 and a rect-based audit reports a
   false failure — then "fixes" it with padding, which grows the ink. Probe the point:
   ```js
   const r = el.getBoundingClientRect(), cx = r.left + r.width / 2;
   const hits = (y) => { const h = document.elementFromPoint(cx, y); return h === el || el.contains(h); };
   hits(r.top - 1) && hits(r.bottom + 1);   // true => the 44px target is live
   ```
   A `false` on the side where another control sits adjacent is normal — the neighbour owns
   that pixel. And an audit reading only `textContent`/`aria-label` wrongly flags inputs
   labelled by `<label htmlFor>`; check for an associated label before adding an
   `aria-label`.
4. **No carousel hell.** One horizontal rail maximum (primary categories). Granular
   secondary filters live behind a single "Filters" affordance opening a native-style sheet.
5. **Breathing room.** Mobile wrappers keep a minimum `px-5`; content never hugs the bezel.
   **One owner of the horizontal margin per branch** — never nested padding.
6. **Mobile-first.** Used standing on a street, one-handed, on a mid-range phone.
7. **Contrast is not optional.** `--text-muted` passes AA in both modes. Any new tone is
   measured, not eyeballed — especially over photos and glass, where the effective
   background is whatever is behind it.

---

## 11. Traps — do not re-enter — [HUMAN_DECISION]

- **`position: fixed` does not work inside tab content.** The tab-transition wrapper carries
  a `transform` and becomes the containing block. **Portal overlays to `document.body`**
  (`createPortal`), as `FilterSheet` does.
- **Never let an entrance `transform` position an overlay.** Opacity fails safe; transform
  strands the user on the keyframe's `from` state.
- **`.surface` is translucent — it is not a modal fill.** Overlays use `--bg-warm`.
- **`overflow-x-hidden` silently eats left overhang.** `.page-grid` cannot overflow
  horizontally, so it isn't needed.
- **Never reintroduce a service worker.** `public/sw.js` is a self-destructing kill switch
  and stays; what must never come back is a plugin registering a new worker.
  `vercel.json` keeps `index.html` on `must-revalidate` and only hashed `/assets/*`
  immutable.
- **All of the above passed `tsc` clean.** Types are a gate, never verification.

---

## 12. Stack — [HUMAN_DECISION]

- **React 19** + **TypeScript 5.8** + **Vite 6** — `npm run dev`, port 3000.
- **Tailwind v4** via `@tailwindcss/vite`. **There is no `tailwind.config.js`** and never
  will be; v4 is CSS-first and all theme config lives in `src/index.css` under `@theme`.
- **lucide-react** for icons. Never emoji-as-icon, never inline hand-drawn SVG paths.
- **motion** v12 — import from `motion/react`.
- No test runner. No backend; `src/placesService.ts` handles external data.
- Don't add dependencies without saying why. The list is small on purpose. `playwright-core`
  belongs in `verify/`, never the root.
- Components: `EateryView`, `RecipeView`, `HappyHourView`, `Sidebar`, `StatusStates`.
  **Reuse `StatusStates.tsx`** for loading/empty/error — don't write new ones.

**Container facts** (verified 2026-07-28; treat as stale if anything behaves differently —
check, don't assume):

- Outbound is proxied: `themealdb.com` and Google Places are unreachable, so recipe and
  venue lists render their empty state in a plain browser session. That is a network
  artifact, not a bug. `checks.mjs` supplies fixtures for both, so **the suite is not
  subject to this**; an ad-hoc browser run is.
- Tab labels are **"Find a Place" / "Stay In" / "Happy Hour" / "Saved"**. The cooking tab is
  `Stay In` — targeting `/cook/i` finds nothing.

---

## 13. HANDOVER.md contract — [HUMAN_DECISION]

Root-level `HANDOVER.md`, **only these sections, in this order**:

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

Live state only. No narrative history, no re-litigating past sessions, no restating this
file. Durable knowledge belongs here in `CLAUDE.md`; forensic history belongs in
`AUDIT_HISTORY.md`. Verification records **actual observed results**, including
"did not complete."

---

## 14. Skills — [HUMAN_DECISION]

**"Use every relevant skill" never means invoke every skill.** Loading one costs context
and, worse, an aesthetic skill will confidently redirect §9's decided design direction. This
list overrides a skill's own description of when it should trigger.

**Always:** `qa-gate` — mandatory before the words in §6, and before any deploy.

**When the task calls for it:** `simplify` (post-refactor quality review, not bug hunting) ·
`security-review` / `code-review` (anything touching `placesService.ts`, keys, `.env*`) ·
`full-output-enforcement` (editing `src/App.tsx` or `RecipeView`/`EateryView` — truncation
placeholders at that file size destroy working code) · `stop-slop` (user-facing product
copy; the voice is warm editorial, not assistant-speak) · `update-config` /
`fewer-permission-prompts` (keeping the QA gate from dying on permission prompts).

**Deliberately not used — say so if asked:**

- `ui-ux-pro-max`, `frontend-design`, `redesign-existing-projects`, `minimalist-ui`,
  `industrial-brutalist-ui`, `stitch-design-taste`, `design`, `brandkit`, `canvas-design`,
  `banner-design…`, `brand-identity-governance…` — §9 is a *decided* direction. Each of
  these proposes its own palette, type system and layout language, and wins the argument by
  being the more recent instruction. **If a design change is wanted, change §9 first, on
  purpose.**
- `dataviz` — no charts in this product.
- `web-artifacts-builder`, `artifact-design`,
  `strategic-slide-presentation-designer` — this is a Vite app, not an artifact or a deck.
- `docx`, `pptx`, `xlsx`, `pdf`, `email-marketing*`, `ad-creative`, `internal-comms`,
  `learn`, `morning`, `firecrawl` — unrelated to this codebase.
- `run` — superseded by §6 and `qa-gate`. A generic launcher does not know about
  `NO_PROXY='*'`, the Chromium path or the fixtures, and draws wrong conclusions from the
  proxy's 403s.
- `loop` — never poll from inside a session. §3 is a hard stop, not a retry loop.

---

## 15. Outstanding asks for the user

Switches only the user can throw. Not agent work:

1. **Permission allowances** so the QA gate runs unattended — `Bash(node verify/checks.mjs)`,
   `Bash(node driver.mjs*)`, `Bash(NO_PROXY=* *)`, `Bash(npx esbuild *)`, `Bash(grep *)`.
2. **Delete any standing permission for `rm .../.git/index.lock`** in
   `.claude/settings.local.json` — §4 forbids that action outright.
3. **Nothing outstanding on the Places key.** It is set in Vercel (Production, Preview,
   Development) and **confirmed working in production on 2026-07-28** — all
   `places.googleapis.com` requests returned 200 and real venues rendered. Docs called it
   "the one blocker" for weeks without anyone checking. If venue discovery looks broken
   again, note that `placesService.ts` swallows API errors (`.catch(() => []`), so the UI
   cannot distinguish a rejected key from an empty area: read the browser Network tab on
   the live site, or conclude nothing.
