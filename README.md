# whats-good

Mood-and-location-driven food discovery — an elevated, human alternative to a map
directory. Find somewhere to eat or something to cook, based on how you feel and where
you are.

**Working on this project? Read [CLAUDE.md](CLAUDE.md) first** — it is the single
authoritative instruction file (operating mode, validation ladder, design system, hard
rules). This README only covers running it.

## Run locally

```bash
npm install
npm run dev
```

Serves on http://localhost:3000. Place lookups in `src/placesService.ts` read an API key
from `.env.local` — set it there if you need live venue data.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server, port 3000 |
| `npm run lint` | `tsc --noEmit` — the type gate. Very slow on some machines. |
| `npm run build` | `vite build`. **Bundles only — runs no typecheck.** |
| `npm run preview` | Serve the built `dist/` |
| `npm run clean` | `rm -rf dist` |

## Stack

Vite 6 · React 19 · TypeScript 5.8 · Tailwind v4 (CSS-first, no config file) ·
lucide-react · motion v12. Deploys to Vercel. No test runner, no backend.

## Where the code lives

```
src/
  App.tsx            main.tsx         index.css
  placesService.ts   campusData.ts    happyHourData.ts
  recipeUtils.ts     useSavedRecipes.ts   types.ts
  components/
    EateryView.tsx   RecipeView.tsx   HappyHourView.tsx
    Sidebar.tsx      StatusStates.tsx
```
