# What's Good app improvement prompt

You are improving a Vite + React + TypeScript food discovery app called "What's Good".

Goal: make the app easier to maintain while preserving the current visual direction and user-facing behavior.

## Current app shape

- `src/App.tsx` currently owns too much: tabs, filters, geolocation, theme, saved recipes/eateries, restaurant matching, recipe fetching, and rendering flow.
- Saved recipes/eateries should be treated as full saved snapshots for now, because external recipe or restaurant APIs can change.
- Restaurant/eatery records can be detected by IDs that start with `eat-`.
- The app has local fallback Cape Town eateries in `src/campusData.ts`.
- The app may use Places API results through `src/placesService.ts`.
- Recipes come from TheMealDB and are parsed in `src/recipeUtils.ts`.

## What to change first

1. Keep behavior the same, but move logic out of `App.tsx` into small focused files.
2. Create a shared persistent-state helper that reads from localStorage during initial render, validates loaded data, and safely ignores corrupted values.
3. Keep saved recipe/eatery data in one hook only. Do not create a second localStorage key for the same saved items.
4. Extract restaurant matching/search logic into a feature or service file.
5. Extract recipe search/random logic into a feature or service file.
6. Keep theme state separate from food/search state.
7. Avoid a large app-wide context until there are multiple distant components that need the same state.

## Suggested structure

```txt
src/
  state/
    usePersistentState.ts
    useTheme.ts
    useSavedRecipes.ts
  services/
    eateryMatcher.ts
    recipeSearch.ts
    geo.ts
  features/
    discovery/
    recipes/
    eateries/
    saved/
  components/
```

## Design constraints

- Keep the app as the first screen, not a marketing landing page.
- Preserve the tactile editorial feel, but reduce nested cards and overly rounded containers where possible.
- Make mobile header/navigation more resilient so labels do not overflow.
- Use existing lucide icons for actions.
- Do not add new dependencies unless they clearly remove complexity.

## Acceptance criteria

- `npm run lint` passes.
- `npm run build` passes.
- Saved recipes and saved eateries survive refresh.
- Existing saved items under the old `whats_good_saved_v1` key are still loaded.
- Searching, random match, save/unsave, clear saved, dark mode, and location sorting still work.
- No unrelated visual redesign unless explicitly requested.
