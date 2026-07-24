# What's Good — start here

**This folder is ONE project: the "What's Good" app.** It is not related to the
`work-os` / "Claude Code" folder, which is a completely separate app.

## What it is
A campus food app for browsing **eateries** and **recipes**.

## Stack
- Vite 6 + React 19 + TypeScript
- Tailwind CSS v4
- lucide-react (icons), motion (animation)
- Deploys to Vercel (`.vercel/` present)
- Originally exported from Google AI Studio

## Run it
```bash
npm install
# put your key in .env.local:  GEMINI_API_KEY=...
npm run dev      # http://localhost:3000
```
Other scripts: `npm run build`, `npm run preview`, `npm run lint` (tsc --noEmit), `npm run clean`.

## Where the code lives
```
src/
  App.tsx                 # root component
  main.tsx                # entry
  campusData.ts           # campus / eatery data
  placesService.ts        # places lookups
  recipeUtils.ts          # recipe helpers
  useSavedRecipes.ts      # saved-recipes hook
  types.ts
  index.css
  components/
    EateryView.tsx
    RecipeView.tsx
    Sidebar.tsx
    StatusStates.tsx
```

## Notes
- `_archive/` holds files tidied up on 2026-07-09 (a junk-named `'.md`, a duplicate
  `package-lock 2.json`, one-off scripts `fix.js` / `replace-colors.js`, and an old
  `restaurant-first-preview.html`). Nothing was deleted — delete `_archive/` yourself
  once you're sure you don't need any of it.
- Older working notes: `HANDOVER.md`, `HANDOVER_SESSION4.md`, `IDEATION_BRIEF.md`, `prompt.md`.
