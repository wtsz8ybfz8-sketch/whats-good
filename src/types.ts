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
  regional: string | null;
  capacity: string | null;
  searchQuery: string;
  locationMode: LocationMode;
}

export type ActiveTab = 'mood' | 'happy-hour' | 'random' | 'saved-recipes' | 'saved-eateries';
