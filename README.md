# whats-good

Mood-and-location-driven food discovery — an elevated, human alternative to a map
directory. Find somewhere to eat or something to cook, based on how you feel and where
you are.

**Working on this project? Read [CLAUDE.md](CLAUDE.md) first** — it is the single
authoritative instruction file (operating mode, validation ladder, design system, hard
rules). This README only covers running it.

This folder is ONE project: the **What's Good** app. It is unrelated to the `work-os` /
"Claude Code" folder, which is a separate app.

| File | Holds |
|---|---|
| [CLAUDE.md](CLAUDE.md) | How to work on this project. Authoritative. Start and stay here. |
| [HANDOVER.md](HANDOVER.md) | Live state of the last session only. A record, never a mandate. |
| [IDEATION_BRIEF.md](IDEATION_BRIEF.md) | Original product intent. Background, not instruction. |
| README.md | How to run it. |

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
  placesService.ts   campusData.ts    types.ts
  recipeUtils.ts     cuisineRail.ts   useSavedRecipes.ts
  components/
    EateryView.tsx   RecipeView.tsx   HappyHourView.tsx
    Sidebar.tsx      StatusStates.tsx
```
