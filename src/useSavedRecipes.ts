/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ParsedRecipe } from './types';

const STORAGE_KEY = 'whats-good-saved-recipes';
const LEGACY_STORAGE_KEY = 'whats_good_saved_v1';

function load(): ParsedRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ParsedRecipe[]) : [];
  } catch {
    return [];
  }
}

export function useSavedRecipes() {
  const [savedRecipes, setSavedRecipes] = useState<ParsedRecipe[]>(load);

  const persist = (next: ParsedRecipe[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedRecipes(next);
  };

  const saveRecipe = (recipe: ParsedRecipe) => {
    if (savedRecipes.some((r) => r.id === recipe.id)) return;
    persist([...savedRecipes, recipe]);
  };

  const unsaveRecipe = (id: string) => {
    persist(savedRecipes.filter((r) => r.id !== id));
  };

  const isSaved = (id: string) => savedRecipes.some((r) => r.id === id);

  const toggleSavedRecipe = (recipe: ParsedRecipe) => {
    if (isSaved(recipe.id)) {
      unsaveRecipe(recipe.id);
      return;
    }

    saveRecipe(recipe);
  };

  const clearSavedRecipes = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setSavedRecipes([]);
  };

  return {
    savedRecipes,
    saveRecipe,
    unsaveRecipe,
    isSaved,
    toggleSavedRecipe,
    clearSavedRecipes,
  };
}
