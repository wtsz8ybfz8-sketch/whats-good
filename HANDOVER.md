# Handover — 2026-07-26 (session 5)

Live (production, **old build**): `https://whats-good-nu.vercel.app`
Preview (this session, verified at 390×844): `https://whats-good-kzarr47ms-nizzle-s-projects.vercel.app`
Vercel project `whats-good` (`nizzle-s-projects`) · Repo `github.com/wtsz8ybfz8-sketch/whats-good`

Read `CLAUDE.md` first. It now ends with **NON-NEGOTIABLE UX, ARCHITECTURE & WORKFLOW RULES** —
six numbered rules the user added this session. They are not suggestions and not yours to soften.

**Working tree is clean.** Everything below is committed as `ba5165b`. Production has not been
touched; promoting is `vercel deploy --prod` and needs the user's explicit go-ahead.

---

## 0. READ THIS FIRST — the verification method finally works

Four sessions claimed "true phone width has not been inspected." That is now solved, and if you
skip this paragraph you will repeat the same dead end.

- The **in-app preview pane does not work here.** Don't try it.
- **`resize_window` in Claude-in-Chrome does not change the CSS viewport.** It resizes the OS
  window; `innerWidth` stays ~1440 and every media query stays desktop. This is what defeated the
  previous sessions. Resizing and screenshotting proves nothing about mobile.
- **What works: render the deployment inside a 390×844 iframe** and inspect *that*. Media queries
  resolve against the iframe's own width. Verified: `contentWindow.innerWidth === 390`.

```js
// via mcp__claude-in-chrome__javascript_tool, on a tab already at the preview URL
document.documentElement.innerHTML = '';
const s = document.createElement('style');
s.textContent = 'html,body{margin:0;background:#555;display:flex;justify-content:center}iframe{width:390px;height:844px;border:0}';
document.head.appendChild(s);
const f = document.createElement('iframe');
f.id = 'mob'; f.src = location.href;
document.body.appendChild(f);
await new Promise(r => f.onload = r);
await new Promise(r => setTimeout(r, 2500));
const d = f.contentDocument;      // query this, not `document`
```

Then measure with `getBoundingClientRect()` and `getComputedStyle` against `d`. A screenshot of the
tab shows the iframe, so it is a genuine phone-width screenshot. Toggle dark with
`d.documentElement.classList.remove('dark')`.

Deploy first (`vercel deploy --yes`, ~40s remote) and inspect the deploy — do **not** run the dev
server on the user's laptop, they are short on space.

---

## 1. What shipped this session (`ba5165b`)

**Happy Hour no longer lies about your city.** `hasHappyHourData(city)` in `HappyHourView.tsx`
gates both the view and the pulsing tab dot in `App.tsx`. Outside Cape Town you get an honest
empty state. Verified live with the city forced to London. This was the ship-blocker in the last
handover.

**Cuisine list: curated baseline + real local supplement.** `BASELINE_CUISINES` in `Sidebar.tsx`
always renders; `nearbyCuisines` (derived in `App.tsx` from `recipe.category`, deduped, "restaurant"
stripped, capped at 8) is appended. Deriving the list *purely* from Places was rejected — in a
fast-food suburb it deletes discovery.

**Carousel hell killed.** Mood, Diet and Budget now live in a bottom sheet (`FilterSheet` in
`Sidebar.tsx`) behind one row that displays its own state. **Cuisine is the only horizontal rail
on the screen** and must stay that way — `FilterGroup`'s `scroll` prop is documented as
single-use. Three stacked rails was the failure: Diet had 4 chips, never overflowed, and rendered
as a static row identical in styling to a scrollable one.

**Typography floor: 12px.** No `text-[9px]/[10px]/[11px]` anywhere in `src/`. Verified by grep.

**Touch targets.** `.tap-44` is no longer wrapped in `@media (pointer: coarse)` — that gate made
the rule unverifiable in a browser and failed touchscreen laptops. New `.tap-target` lays an
invisible 44×44 `::after` over a control **without growing its ink** — used on the plate stepper,
which is back to 24px drawn.

**`npm run dev` root cause found and fixed.** `src/index.css` had a stray `*/` closing the 44pt
comment block early (old line 94), leaving prose as live CSS. The next word was
"Implemented **as** a plain min-size" — that is the exact `Unknown word "as"` PostCSS error.
**Unconfirmed:** `npx vite` produces no output and binds no port in the agent sandbox, so it could
not be run. **First thing to do: run `npm run dev` and report whether it works.**

---

## 2. Known defects and unfinished work, in priority order

**1. Eyebrow-label tracking was never retuned after the type bump.** 59 sites went 10/11px → 12px
via `Edit(replace_all)` — a mechanical token swap, not per-site judgement. Labels styled
`font-mono uppercase tracking-[0.07–0.09em]` are now heavier relative to body text than designed.
Pull the widest tracking in (0.09 → ~0.06) and check the eyebrow no longer competes with the
heading beneath it. Largest visual debt outstanding.

**2. Nested horizontal padding wastes a quarter of the screen.** Wrapper `px-4` + card `p-2` +
`aside px-6` puts content 48px in on a 390px device. It satisfies the breathing-room rule by
accident of stacking, and it is why the Cuisine rail only reveals ~2.5 chips. Collapse to one
owner of the margin.

**3. `Chip` uses `.tap-44`, which grows the pill 41.5 → 44px.** That is expanding ink, which rule 3
forbids. Defensible for a pill (iOS controls sit at 44) but it is a deliberate exception the user
has not blessed. Either get it agreed or convert `Chip` to `.tap-target`.

**4. The city badge wraps to two lines at 390px.** "Cape Town" breaks across two rows in the fixed
header. Cosmetic, visible on first paint, easy.

**5. Venue page is still not built to the agreed framework.** The user and Gemini specified three
modules: **Vibe Match** (is this place right for my mood), **Utility Block** (distance, price, open
status), **Signature Directive** (what to order). `EateryView.tsx` is currently none of these. This
is the biggest *product* gap, as opposed to the polish items above.

**6. Two levels of filter disclosure.** App-level "Adjust filters" reveals the panel; the panel
holds "Mood, diet & budget" which opens the sheet. Names don't collide and the panel also holds
search + Cuisine, so it is defensible — but a stricter reading of rule 4 would collapse it to one.
Raise it; don't decide it silently.

---

## 3. Traps this codebase has already sprung — do not re-enter

**`position: fixed` does not work inside the tab content in this app.** The tab-transition wrapper
carries a `transform`, which makes it the containing block, and the filter panel adds
`overflow-hidden`. The filter sheet first shipped measuring `top: 844` on an 844px-tall viewport —
completely below the fold. **Portal any overlay to `document.body`** (`createPortal`), as
`FilterSheet` now does.

**Never let an entrance `transform` be the thing that positions an overlay.** After the portal fix
the sheet was *still* invisible: stuck on its keyframe's `from` state at `translateY(717px)`,
`opacity: 0` — mounted, scroll-locked, unreachable. Opacity fails safe; transform strands the
user. The sheet now carries no entrance transform at all. Same defect class as the missing back
button that survived three sessions.

**`.surface` is translucent — it is not a modal fill.** Used on the sheet, the entire home screen
read through it and the mood chips sat on top of the hero headline. Overlays use `--bg-warm`.

**All three of the above shipped green on `tsc --noEmit`.** Types passing is a gate, never
verification. Every one was caught by looking at 390px.

**Still true:** no service worker, ever (`CLAUDE.md`). Never render invented data as real. Don't
touch dark mode or the font — the user has said so repeatedly and it is settled.

---

## 4. Decisions already made — do not reopen

- **Typography: Schibsted Grotesk, one family, weight-led hierarchy.** Gemini's critique pushed for
  a real serif (Playfair/New York). The user has twice said don't change the font, and `CLAUDE.md`
  commits to one family. **Committed to the grotesk.** Only the user reopens this.
- **Grain texture and canvas gradient stay.** That warmth is the editorial direction; stripping it
  produces the cooler, flatter feel `CLAUDE.md` explicitly warns against.
- **No slot-machine city animation.** It would display cities you are not in — invented data — and
  adds friction for someone hungry. Agreed replacement is a soft shimmer cross-fade.
- **Skeletons, never conversational loading copy.** Already done in `StatusStates.tsx`.
- **Any colour goes through the tokens in `src/index.css`.** Never hardcode a hex.

---

## 5. Suggested order for the next session

1. Run `npm run dev`. Confirm or deny the PostCSS fix — everything is faster if local dev is alive.
2. Eyebrow tracking retune (§2.1) — largest visual debt.
3. Collapse the nested padding (§2.2) — buys back a quarter of the screen width.
4. Venue page modules: Vibe Match / Utility Block / Signature Directive (§2.5) — the product gap.
5. City badge wrap (§2.4), then raise §2.3 and §2.6 with the user.

Verify at 390×844 in an iframe against a fresh Vercel preview before claiming anything is done.
If you have not seen it, say you have not seen it.
