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
  gutTip: string;
}

export interface Dimensions {
  vibe: string | null;
  regional: string | null;
  capacity: string | null;
  searchQuery: string;
}

export type ActiveTab = 'mood' | 'random';
