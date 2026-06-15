# What's Good — Session Handover

> Last updated: 2026-06-16. Three commits on `main` from this session.

---

## 1. What Was Built and Changed in This Session

The project was scaffolded from a Google AI Studio React template and rebuilt into a working recipe discovery app. All meaningful product code was written or rewritten in this session.

### Features built from scratch

| Feature | Description |
|---|---|
| **Recipe search** | Fixed broken search — replaced vague keyword queries with TheMealDB's `filter.php` area/category endpoints. Mood → category mapping, cuisine → area passthrough, results intersected when both are selected, top 9 shuffled, full detail fetched via `lookup.php`. |
| **Mood sidebar** | 9 vibe pills, 25-cuisine dropdown (all exact TheMealDB area names), 3-way effort toggle, 500ms debounced text search with clear button, submit button flushes debounce immediately. |
| **Surprise Me tab** | Calls `random.php`, auto-selects the single result, shows landing screen with call-to-action when idle. |
| **Save Recipe** | `useSavedRecipes` hook backed by localStorage. Bookmark button on cards and detail view. Saved tab in header with live count badge. Full detail view from saved, unsave from detail view. |
| **Health Profile overlay** | First-load gate stored in localStorage. 12 health conditions + 4 dietary preferences, select one from each. Pill badge in header with "change" link. Hook returns `condition`, `dietary`, `pillLabel`. |
| **Recipe detail view** | Full ingredient checklist (tap to cross off), numbered steps, prep/cook time, serves, gut-health tip block, YouTube + source links, back navigation. |
| **Recipe card grid** | Multi-result grid with image, category badge, area label, time stats, bookmark button. |
| **Wellness tip copy** | Replaced pseudoscientific gutTip text with accurate 1-sentence ingredient notes + standard disclaimer on every tip. |
| **Tone overhaul** | Stripped all invented jargon ("Matrix", "Coordinates", "Serendipity Engine", "Gastro", "Culinary Canvas", "Wildcard", "Motility", "FODMAP" in copy) across all four UI files. Replaced with plain, direct language. |
| **Safety hardening** | Search input sanitised (`/[^a-zA-Z0-9 -]/g`). No `dangerouslySetInnerHTML`. No API keys in source. Removed misleading "Low-FODMAP Compliant" badge from recipe cards. |

---

## 2. File Structure

```
/
├── index.html                  # App shell — sets <title> to "What's Good"
├── vite.config.ts              # Vite + React + Tailwind v4 config
├── tsconfig.json               # TS strict mode
├── package.json                # name is still "react-example" — should rename
├── src/
│   ├── main.tsx                # React root mount
│   ├── index.css               # Tailwind entry + revealUp keyframe animation
│   ├── types.ts                # Shared interfaces: ParsedRecipe, Meal, Dimensions, ActiveTab
│   ├── App.tsx                 # Root component — tab state, fetch orchestration, layout
│   ├── recipeUtils.ts          # All TheMealDB fetch logic + parseMealToRecipe
│   ├── useSavedRecipes.ts      # localStorage hook for bookmark persistence
│   └── components/
│       ├── Sidebar.tsx         # Left panel — search input, vibes, cuisine, effort
│       ├── RecipeView.tsx      # Detail view + card grid (rendered on right)
│       ├── StatusStates.tsx    # LoadingState, ErrorState, EmptyState
│       └── HealthProfile.tsx   # First-load overlay + useHealthProfile hook
```

### Key data flow

```
Sidebar (dimensions state) → App.handleTriggerMatch()
  → recipeUtils.fetchMealsByCoordinates() or search.php
  → parseMealToRecipe() for each result
  → RecipeView (grid or detail)
```

### localStorage keys

| Key | Value |
|---|---|
| `whats-good-health-profile` | `{ condition: string, dietary: string }` JSON |
| `whats-good-saved-recipes` | `ParsedRecipe[]` JSON array |

---

## 3. What Is Still Broken or Incomplete

### Critical

- **Health profile has no effect on recipe results.** The profile is stored and shown in the pill badge, but nothing in `fetchMealsByCoordinates` or `parseMealToRecipe` reads `condition` or `dietary` to filter or re-rank recipes. The UI implies personalisation that doesn't exist. This is the biggest gap between what the product promises and what it delivers.

### Minor / polish

- `package.json` still has `name: "react-example"` from the Google AI Studio scaffold.
- Three unused dependencies from the AI Studio template are in `package.json` but never imported: `@google/genai`, `express`, `dotenv`. They don't affect the bundle but slow down `npm install`.
- The card fallback description (`'An exquisite composition using matching fresh ingredients.'`) was never updated to plain language — it wasn't in the original spec replacements list.
- The comment labels in App.tsx still say `// MOOD CORNER CANVAS`, `// SERENDIPITY ENGINE CANVAS`, `// SAVED RECIPES CANVAS`. Internal-only but inconsistent with the rename.
- No error boundary at the app level — an uncaught render error will blank the whole page.
- No loading skeleton on recipe cards — the grid just appears suddenly after the loading spinner.
- The `dist/` directory is committed to git (should be in `.gitignore`).

---

## 4. Next Recommended Tasks (Priority Order)

### 1. Connect health profile to actual filtering
The profile currently does nothing after being saved. Options, from simplest to most useful:
- **Re-rank results** based on condition — e.g. push Seafood and Vegetarian categories higher for "high-cholesterol" or "vegetarian" users.
- **Add a warning flag** to gutTip when a recipe likely conflicts with the user's condition (e.g. garlic for IBS/FODMAP users).
- **Filter categories differently** per profile — swap the vibe→category map to use a profile-aware variant.

### 2. Fix `dist/` in git
Add `dist/` to `.gitignore`. Vercel builds from source so the committed build artifacts are noise.

### 3. Clean up package.json
- Rename `"name"` from `"react-example"` to `"whats-good"`.
- Remove `@google/genai`, `express`, `dotenv` from dependencies (run `npm uninstall`).

### 4. Update card fallback text
`RecipeView.tsx` line 336: change `'An exquisite composition using matching fresh ingredients.'` to something like `'A recipe from the TheMealDB archive.'`

### 5. Add an app-level error boundary
Wrap the root in a React error boundary so a component crash shows a recovery UI instead of a blank screen.

### 6. Loading skeletons on cards
Replace the full-page spinner with card-shaped skeleton placeholders in the grid. Better perceived performance.

### 7. Ingredient quantity display
Currently ingredients and measures are joined as a single string per item. Consider splitting them — quantity on the left in a muted font, ingredient name on the right — for better readability.

---

## 5. Important Technical Decisions Made and Why

**`filter.php` + `lookup.php` instead of `search.php`**
The original code used `search.php?s=keyword` with vague English words like "stir" or "kebap" — these almost never matched a meal name, so search returned nothing. Replaced with: `filter.php?a=area` and `filter.php?c=category` which return complete lists of meals in that area/category. When both vibe and cuisine are selected, the results are intersected (AND logic). Top 9 are shuffled to avoid always showing the same meals, then each is fetched individually via `lookup.php?i=id` to get full ingredient data (the filter endpoints only return id/name/thumbnail).

**Native `<select>` for the cuisine dropdown**
With 25 cuisine options, a scrollable pill grid would be unusable. A native `<select>` with `appearance-none` + a `ChevronDown` overlay matches the design system while being accessible and mobile-friendly.

**Inlined JSX instead of `OptionCard` component in HealthProfile**
React 19 treats `key` as a regular prop in strict TypeScript JSX type-checking, not a reserved one. Passing `key` to a sub-component function caused a TS2322 error. Fixed by removing the `OptionCard` component entirely and inlining the card JSX directly in `.map()`, using plain helper functions (`cardClass`, `labelClass`, `subClass`) that return className strings rather than JSX.

**localStorage for all persistence**
Saves and the health profile are stored in localStorage rather than a backend. This keeps the app completely zero-backend — no server, no auth, no database. The trade-off is that saves don't sync across devices. Fine for an MVP.

**500ms debounce on search + immediate flush on submit**
The search input debounces `onChange` by 500ms to avoid firing an API call on every keystroke. But the submit button needs to fire immediately with whatever is currently typed. Solved by passing `localSearch` directly to `onTriggerMatch(localSearch.trim() || undefined)`, bypassing the debounced value in the parent.

---

## 6. Deployment Setup

| | |
|---|---|
| **GitHub repo** | https://github.com/wtsz8ybfz8-sketch/whats-good |
| **Branch** | `main` (auto-deploys to Vercel on push) |
| **Vercel project** | Connected in the previous session — check your Vercel dashboard for the live URL |
| **Build command** | `npm run build` (runs `vite build`) |
| **Output directory** | `dist/` |
| **Environment variables** | None required — TheMealDB is a public API with no auth |
| **Node version** | Not pinned — Vercel will use its default; the project has no `.nvmrc` |

To deploy: `git push` to `main` triggers Vercel automatically.

---

## 7. Known Limitations of TheMealDB

**Coverage**
- Approximately 250–300 meals in the free public dataset. This is a small corpus — users will see the same recipes repeatedly.
- Strong Western European and British bias in the dataset. Categories like "British" and "American" have far more entries than "Filipino" or "Tunisian".
- No vegetarian/vegan/gluten-free tags — dietary filtering at the API level is not possible. The health profile therefore can't filter results reliably.

**API design**
- `filter.php` returns only `idMeal`, `strMeal`, `strMealThumb` — no ingredients, instructions, or tags. A second lookup call (`lookup.php?i=id`) is required per meal to get full data. With up to 9 meals shown, that's up to 9 sequential or parallel requests.
- `search.php?s=` matches against meal names only — not ingredients or tags. Searching "garlic" returns nothing; searching "Garlic Bread" returns the specific dish.
- No pagination — filter endpoints return all matching meals at once (can be 50–100+ items for popular categories).
- `random.php` returns exactly 1 meal. There is no "random from category" endpoint on the free tier.
- Ingredient + measure data is stored as 20 parallel flat fields (`strIngredient1`…`strIngredient20`, `strMeasure1`…`strMeasure20`). These must be zipped together and filtered for non-empty values.
- `strInstructions` is a single wall of text. The app splits it on double-newlines and numbered patterns to produce step arrays — this is heuristic and sometimes produces odd splits.

**Reliability**
- The API is free and community-maintained. It has no SLA. Occasional downtime or slow responses are normal.
- Meal images are hosted on TheMealDB's own CDN. Some older images return 404 or fail cross-origin — `referrerPolicy="no-referrer"` helps but doesn't fully prevent broken images.
- The free API (v1) has informal rate limiting. Heavy usage (e.g. 9 parallel `lookup.php` calls repeatedly) may occasionally get throttled.

**What the API cannot do (without a paid plan)**
- Search by ingredient
- Filter by dietary property (vegan, gluten-free, etc.)
- Return nutritional data
- Return more than 1 random meal at a time
