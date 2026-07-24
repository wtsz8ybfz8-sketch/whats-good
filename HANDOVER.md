# Handover — 2026-07-22 (end of session)

Live: **https://whats-good-nu.vercel.app** · Vercel project `whats-good` (`nizzle-s-projects`)

Read `CLAUDE.md` first — stack, tokens, and the working agreement live there.

---

## Done this session

- Token refactor (`--text-subtle`, `--accent-contrast`, `--rule`, `--row-border`), two WCAG AA failures fixed, dark accent unified to one token.
- Happy Hour tab (live countdowns, sorted by urgency), restaurant menus/specials.
- Real Places photo thumbnails on result cards.
- Mobile bottom tab bar; scroll-to-top on navigation.
- Location copy de-hardcoded (see below).
- Diet filter (Vegan / Vegetarian / Halaal / Seafood).
- Deployed to production twice.

---

## 1. Colour + visual direction — THE BIG ONE, needs Lunika's input first

Repeatedly called "cheap". I have changed it three times and missed three times, so **do not guess a fourth time.** Get a decision before touching it.

Current: `--bg-warm: #F4F2EF` light / `#0F0C0A` dark, single terracotta accent `--accent-sage: #7C2D12` / `#F07858`, glass surfaces.

Two concrete suspects, both unaddressed:

- **The glass system is the real problem.** `--glass-blur: blur(22px) saturate(180%)` over `rgba(255,255,255,0.70)` is frosted plastic, not glass. Apple's version is a *lighter* blur over a *lower*-opacity surface with a bright 1px inner top edge doing the work. Worse, glass is currently applied to the header, the search panel, AND the cards simultaneously — so nothing reads as floating above anything. Pick two surfaces max.
- **`--accent-sage` is misnamed** — it is terracotta (`#7C2D12`), not sage. Rename to `--accent-terracotta` across `index.css` + consumers, or the next person inherits the confusion.

**Ask before starting:** warmer or cooler? One accent or an accent + a neutral secondary? Should the accent stay terracotta at all?

## 2. Font — three misses, stop guessing

Playfair+JetBrains Mono → Instrument Serif → Inter Tight → **currently Schibsted Grotesk**. All rejected ("expected and weird").

One-line swap, `src/index.css:19` — all three `@theme` tokens point at one family, so every call site follows:

```bash
sed -i '' 's/Schibsted Grotesk/General Sans/g' src/index.css && sed -i '' 's/Schibsted+Grotesk:wght@400..800/General+Sans:wght@400..700/' index.html
```

Untried candidates: General Sans, Switzer, Geist, Bricolage Grotesque. **Get a one-word direction first** (sharper / softer / more editorial / more technical).

## 3. Search a city you are not in ("Paris while in CPT")

Not started. `fetchCapeTownEateries(query, city, priceSymbol)` already takes `city` as a parameter and the query strings are now location-generic — so the service layer is ready. What's missing is UI: a destination input that sets `city` independently of geolocation, plus a visible "showing results for X · reset to my location" affordance so the user always knows which mode they're in.

Note `App.tsx` still has three `city === 'Cape Town'` branches gating the hardcoded `SOUTH_AFRICAN_EATERIES` fallback (lines ~288, ~590, ~900). Those are correct for now but will look odd once arbitrary cities are searchable.

## 4. Menus and Happy Hour are fabricated

`src/venueExtras.ts` synthesises menus, specials and happy-hour windows deterministically from the venue id. **Google Places publishes none of this at any tier** — no API key fixes it.

Now labelled "Sample data" on the Happy Hour tab and "Sample" on each venue block, plus the existing menu provenance note. Roughly 70% of venues get a happy hour (`hash(id + 'hh') % 10 < 7`).

Real options, in order of effort: venue website scrape → an aggregator (Zomato / Dineplan / EatOut for SA) → manual curation for a small launch set. **Until one of those exists, do not remove the sample labelling.**

## 5. Known issues not yet fixed

- **Buttons cut off on restaurant pages.** Partly addressed (EateryView footer now `pb-[110px] md:pb-12`, tab bar made opaque) but **not visually verified** — verify at 375px before closing it out.
- **Desktop layout unverified.** The preview pane reports `innerWidth: 594` no matter what viewport is set, so it always renders the mobile breakpoint. Every desktop change this session is typechecked but unseen. **Check at full width in a real browser.**
- **`npm run build` hangs locally** — 10+ min at 0.0% CPU, twice. Not caused by `ai-system-build/` (tested by moving it aside; still hung). Vercel's build succeeds, so it is machine-local I/O. `tsc --noEmit` takes ~64s wall for ~1.7s CPU — same cause. Worth investigating; it makes every verification loop painful.
- **Production is ahead of git.** Deploys went straight from the working directory via `vercel --prod`. Nothing has been committed this session.

## 6. Git state — needs a decision before any commit

Working tree has deletions of files nobody in this session touched: `AGENTS.md`, `HANDOVER_SESSION4.md`, `IDEATION_BRIEF.md`, `prompt.md`, `fix.js`, `replace-colors.js`, `restaurant-first-preview.html`, `package-lock 2.json`, `\'.md`. **Do not `git add -A`** — decide on those first.

`.gitignore` now excludes `ai-system-build/` and `_archive/`.

---

## Working notes

- Verify with the Places API directly (`curl` against `places:searchText`) before assuming a UI bug — twice this session the bug was environmental, not code.
- Vite reads `.env.local` **only at startup**. Editing it mid-session silently disables the API key and everything falls back to the photoless hardcoded list. Restart the dev server after touching env.
- `.claude/launch.json` drives the preview server (`npm run dev`, port 3000).
