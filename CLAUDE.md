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

- **Glass is applied to too many surfaces at once** — header, search panel and cards all use it,
  so nothing reads as floating above anything. Pick two surfaces max. Related: `--glass-blur` is
  `blur(22px) saturate(180%)`; backdrop-filter is expensive, and it's the first suspect if
  scrolling gets janky on mid-range phones.
- **`npm run build` and `tsc --noEmit` are pathologically slow on this machine** — minutes of wall
  time at ~0% CPU. It's local I/O, not the code (Vercel builds fine). Budget for it; don't assume
  a hang means a failure.

## Working agreement

- Mobile-first. This gets used standing on a street, one-handed, on a mid-range phone.
- Use what's here before adding: check `src/components/` and the tokens above. `StatusStates.tsx`
  already handles loading/empty/error — reuse it rather than writing new ones.
- Contrast is not optional. `--text-muted` currently passes AA in both modes (5.2:1 light,
  6.3:1 dark). Any new tone must be measured, not eyeballed — especially over glass surfaces,
  where the effective background is whatever is behind it.
- Don't add dependencies without saying why. The dep list is small on purpose.
