/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags?: string;
  strYoutube?: string;
  strSource?: string;
  [key: string]: string | undefined; // to support dynamic string index for strIngredient/strMeasure
}

export interface ParsedRecipe {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  image: string;
  tags: string[];
  youtube?: string;
  source?: string;
  ingredients: string[];
  steps: string[];
  prepTime: string;
  cookTime: string;
  serves: string;
}

export type LocationMode = 'dineout' | 'gourmet';
// Auto-detected from the user's location (Google Places reverse geocode) — not a fixed list.
// Empty until detected or typed. There is no default city — a seeded one told users
// they were somewhere they had never been. See App.tsx.
export type City = string;

export interface Dimensions {
  vibe: string | null;
  /** Single-select diet filter. Deliberately one row of 4 — see Sidebar. */
  diet: string | null;
  /**
   * Stay In (gourmet) kitchen/area, single-select. Feeds the recipe search terms
   * (mapCoordinatesToQueries) and the Stay In cuisine chips. Kept separate from the
   * Find tab's `cuisines` so a browse-mode choice on one tab can't silently filter the
   * other — the two were conflated on a single field, which is why selecting a Find
   * cuisine had to fight the recipe search.
   */
  regional: string | null;
  /**
   * Find (dine-out) cuisine filter, MULTI-select. A venue must match ANY of these to
   * stay in the list. Empty means "no cuisine filter". This drives both the Places
   * query seed and the client-side narrowing of the result list (see App.tsx).
   */
  cuisines: string[];
  capacity: string | null;
  /**
   * A neighbourhood within the current city, single-select — the prototype's `Nearby`
   * chips (docs/design/occasion-prototype.html `.chips` / `#areas`). It is folded into
   * the Places text query alongside the city, which is a real narrowing: "sushi Sea
   * Point Cape Town" returns a different set to "sushi Cape Town". It is NOT a radius
   * — Text Search takes none — so it is labelled as a place, never as a distance.
   */
  area: string | null;
  searchQuery: string;
  locationMode: LocationMode;
}

export type ActiveTab = 'mood' | 'happy-hour' | 'random' | 'saved-recipes' | 'saved-eateries';
