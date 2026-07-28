# whats-good

Mood-and-location-driven food discovery — an elevated, human alternative to a map
directory. Find somewhere to eat or something to cook, based on how you feel and where
you are.

**Working on this project? Read [CLAUDE.md](CLAUDE.md) first** — the operating contract
(how to work, what is enforced, the design system). This README only covers running it.

This folder is ONE project: the **What's Good** app. It is unrelated to the `work-os` /
"Claude Code" folder, which is a separate app.

## Where things are

| File | Holds | Authority |
|---|---|---|
| [CLAUDE.md](CLAUDE.md) | How to work on this project. Every rule labelled [ENFORCED_BY_CI] or [HUMAN_DECISION]. | **Rules.** Start here. |
| [verify/checks.mjs](verify/checks.mjs) · [.github/workflows/ci.yml](.github/workflows/ci.yml) | The regression suite and the pipeline. | **What is actually enforced.** Beats any document. |
| [HANDOVER.md](HANDOVER.md) | Live state of the last session only. | A record, never a mandate. |
| [AUDIT_HISTORY.md](AUDIT_HISTORY.md) | Bugs that shipped, closed audits, retired claims. | **Historical. Not policy.** |
| [IDEATION_BRIEF.md](IDEATION_BRIEF.md) | Original product intent. | Background, not instruction. |
| [.claude/skills/qa-gate/](.claude/skills/qa-gate/SKILL.md) | The gate to run before claiming anything works. | Procedure. |

## Verify it

```bash
npm install && npm --prefix verify install   # playwright-core lives in verify/, not root
node verify/serve.mjs up                     # idempotent; bakes in the Places key
NO_PROXY='*' node verify/checks.mjs          # the regression suite
NO_PROXY='*' node verify/driver.mjs --dark   # screenshots -> verify/out/ (the only dark pass)
node verify/serve.mjs down                   # always
```

`checks.mjs` reports **PASS / FAIL / SKIPPED**, exits **3** on an unmet precondition (a
misconfigured harness — not a verdict about the app), and prints what it does *not* cover.
Read its summary line rather than quoting a count from any document.

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
  recipeUtils.ts     cuisineRail.ts   useSavedRecipes.ts   types.ts
  components/
    EateryView.tsx   RecipeView.tsx   HappyHourView.tsx
    Sidebar.tsx      StatusStates.tsx
```
