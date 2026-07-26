# whats-good

Mood-and-location-driven food discovery. Find somewhere to eat or something to cook, based on
how you feel and where you are.

## Stack

- **React 19** + **TypeScript 5.8** + **Vite 6** (`npm run dev`, port 3000)
- **Tailwind v4** via `@tailwindcss/vite` — **there is no `tailwind.config.js`.** v4 is CSS-first;
  all theme config lives in `src/index.css` under `@theme`. Do not create a config file.
- **lucide-react** for icons. Never emoji-as-icon, never inline hand-drawn SVG paths.
- **motion** (v12, the Framer Motion successor) for animation. Import from `motion/react`.
- No test runner. No backend — `placesService.ts` handles external data.

## Gate before claiming done

```bash
npm run lint
```

That's `tsc --noEmit`. It is the only automated gate; it must pass. For anything visible, also
run the dev server and actually look at the change at mobile and desktop widths before saying
it works. Report what you saw.

**Don't let a pipe swallow the exit code.** `npm run build | tail -20` reports `tail`'s status,
not the build's — a failed build reads as a success. Same shape as "tsc passed so it works."
If you need a real local build result, check `${PIPESTATUS[0]}`, or look at `dist/` timestamps.

## Design direction — already decided, hold to it

**Feel:** warm editorial. A good food magazine, not a SaaS dashboard. Off-white paper, serif
headlines, generous air, one warm accent. If a change makes it feel cooler, flatter, or more
generically "clean," it's wrong.

**Tokens live in `src/index.css`** as CSS custom properties on `:root` and `html.dark`.
Bind to them. Never hardcode a hex, and never introduce a new color without adding it here first.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-warm` | `#F4F2EF` | `#0F0C0A` | Page canvas |
| `--charcoal` | `#1A1A1A` | `#EDE8E1` | Body text |
| `--heading-color` | `#100C08` | `#F5F0E8` | Headings |
| `--accent-terracotta` | `#7C2D12` | `#fca5a5` | The single accent (dark = pink, chosen over coral `#F07858`) |
| `--accent-tint` | `#FAF2F0` | `rgba(252,165,165,.13)` | Accent-tinted fills |
| `--accent-tint-border` | `#F5D1C9` | `rgba(252,165,165,.24)` | Borders on tinted fills |
| `--accent-contrast` | `#FFFFFF` | `#1A0B04` | Text/icons **on** the accent |
| `--text-muted` | `#6E6A64` | `#9A9088` | Metadata, captions |
| `--text-subtle` | `#716B63` | `#8A8078` | Small labels |
| `--rule` / `--row-border` | `#E8E4DF` / `#F0EDE8` | white @ .10 / .06 | Section rules / list rows |
| `--border-color` | `rgba(26,26,26,.07)` | `rgba(255,255,255,.07)` | Hairlines |
| `--glass-*` | — | — | Card surfaces (see below) |

**Type:** one family — Schibsted Grotesk. All three `@theme` tokens (`--font-sans`, `--font-serif`,
`--font-mono`) point at it, so every existing call site resolves to the same face. Hierarchy comes
from weight, size and colour, never from switching typeface. Headings are `600` (`700` only where
something must shout), set globally in `@layer base` — don't re-declare per component. The font is
`preload`ed in `index.html`; do not reintroduce an `@import`.

**Surfaces are glass.** Cards use `--glass-bg`, `--glass-border`, `--glass-blur`,
`--glass-shadow`. This is the committed depth strategy — don't mix in flat borders-only cards or
hard drop shadows alongside it.

**Dark mode is class-based:** `@variant dark (&:where(.dark, .dark *))` on `html.dark`. Every
surface and text tier must be checked in both modes.

## Known issues — fix when you're in the area

- ~~Glass applied to too many surfaces at once~~ — **fixed.** `.glass` is now on exactly two
  surfaces, both of them chrome: the fixed header and the mobile CTA bar. Everything that holds
  content — result cards, the filter panel, status panels — uses `.surface` (solid fill, hairline,
  soft shadow, no backdrop-filter). Small recessed controls use `.surface-quiet`. Hover lift is
  opt-in via `.surface-hover`, so static panels don't brighten under the cursor. **Don't put
  `.glass` back on a card** — that's the regression these classes exist to prevent, and it also
  puts the backdrop-filter cost back on every card in a scrolling list.
- **`npm run build` and `tsc --noEmit` are pathologically slow on this machine** — minutes of wall
  time at ~0% CPU. It's local I/O, not the code (Vercel builds fine). Budget for it; don't assume
  a hang means a failure.

## Never reintroduce a service worker

`vite-plugin-pwa` used to be in `vite.config.ts` with `registerType: 'autoUpdate'`. It precached
`index.html` plus the hashed bundle, so **every deploy was invisible on the live URL** — anyone who
had loaded the site once kept getting the old build from Cache Storage forever. Three sessions of
work shipped and never appeared. `src/main.tsx` now actively unregisters any surviving worker and
purges caches. `vercel.json` keeps `index.html` on `must-revalidate` and only hashed `/assets/*`
immutable. An app whose value is "what's open near me right now" gains nothing from offline
precaching. Don't add one back.

## Never render invented data as real

Menus, prices and "specials" were once synthesised from a hash of the venue id and rendered as a
priced menu with a "Today" stamp, under a small grey disclaimer. That disclaimer protected us, not
the user — nobody reads the footnote under the thing they came for, and a fake price sends someone
across town for something that doesn't exist. Venue pages now show only true fields (real signature
dish, the price *band* Google publishes, cuisine) and link out for the actual menu. Real happy-hour
data (`happyHourData.ts`, human-confirmed) is the standard: if it isn't confirmed, don't render it.

## Working agreement

- Mobile-first. This gets used standing on a street, one-handed, on a mid-range phone.
- Use what's here before adding: check `src/components/` and the tokens above. `StatusStates.tsx`
  already handles loading/empty/error — reuse it rather than writing new ones.
- Contrast is not optional. `--text-muted` currently passes AA in both modes (5.2:1 light,
  6.3:1 dark). Any new tone must be measured, not eyeballed — especially over glass surfaces,
  where the effective background is whatever is behind it.
- Don't add dependencies without saying why. The dep list is small on purpose.

## Do NOT use the in-app preview pane. It does not work in this project.

Three consecutive sessions have burned calls on this with an identical outcome:
`preview_start` reports success, then every `get_page_text`, `read_page`, `navigate` and
`screenshot` returns **"Policy check in progress for this tab; retry."** forever. The tab
never loads. Retrying does not help. `preview_logs` shows vite started fine — the server is
not the problem, the pane is.

**So don't attempt it. Go straight to:**

1. `npm run dev`, then ask the user to open `localhost:3000` and send screenshots at phone
   and desktop width. They are willing — they are the one reporting the visual bugs.
2. If they can't, say so and ask how they want to proceed.

Never fall back to shipping on `tsc` alone. Types passing has let broken layout reach the
user in every session so far. If you have not seen it, say you have not seen it.

## NON-NEGOTIABLE UX, ARCHITECTURE & WORKFLOW RULES

1. **Elite iOS HIG Persona:** You must architect every view applying Apple HIG and elite
   customer journey mapping. Prioritize progressive disclosure, spatial hierarchy, and
   optical balance.
2. **No Brute-Force Scripting for UI:** Never use Python string replacements (`replace()`)
   or `sed` for structural UI changes. UI updates must be executed via deliberate,
   component-level React refactoring.
3. **Optical vs. Mathematical Scaling:** Enforce 44x44pt hit targets using invisible
   bounding boxes (e.g., `p-2`, transparent wrappers, or `min-w-[44px] min-h-[44px]`).
   You are strictly forbidden from expanding the visual "ink" (backgrounds, borders,
   icons) of small controls to achieve this.
4. **No Carousel Hell (Progressive Disclosure):** Do not stack multiple horizontal
   scrolling rails. Primary categories (e.g., Cuisine) may scroll horizontally. Granular
   secondary filters (e.g., Mood, Diet) must be hidden behind a single "Filters"
   affordance that triggers a native-style modal or bottom sheet.
5. **Screen Breathing Room:** Mobile wrappers must maintain strict outer margins
   (minimum `px-5` or `px-6`). Content must never hug the physical device bezel.
6. **Mobile-First Verification:** When verifying your work via your browser tool, you MUST
   configure your headless browser/Puppeteer to emulate a mobile viewport (e.g., width
   390px, height 844px) so you can actually verify mobile margins and breakpoints. Do NOT
   ask the user for screenshots.
