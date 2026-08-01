/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Meal, ParsedRecipe } from './types';
import { AREA_TERMS } from './cuisineRail';

/**
 * Maps the coordinates (Vibe + Regional Cuisine) to real search terms for TheMealDB
 */
export function mapCoordinatesToQueries(vibe: string | null, regional: string | null): string[] {
  const regionalTerms: string[] = [];
  const vibeTerms: string[] = [];

  // Regional mapping.
  //
  // This was a switch over five invented labels ('Pan-Asian', 'South African', …), none
  // of which TheMealDB actually indexes. The rail now comes from the API's own area list
  // (see cuisineRail.ts), so the lookup has to be open: any area the API serves must map
  // to something, including areas that did not exist when this line was written.
  //
  // An area with no curated terms falls back to its own name as the search term rather
  // than to the generic list — searching 'Croatian' is a weak query but it is still a
  // query about Croatian food, whereas 'chicken, salmon, beef' silently serves the user
  // a different cuisine than the one they tapped.
  if (regional) {
    if (regional === 'surprise me') {
      regionalTerms.push('chicken', 'salmon', 'beef', 'pie', 'soup', 'salad');
    } else {
      regionalTerms.push(...(AREA_TERMS[regional] ?? [regional.toLowerCase()]));
    }
  }

  // Vibe mapping — kept separate from regional so both dimensions contribute
  // terms even when the caller caps how many it fetches (interleaved below).
  if (vibe) {
    switch (vibe) {
      case 'tired & cosy':
        vibeTerms.push('soup', 'stew', 'potato');
        break;
      case 'need comfort food':
        vibeTerms.push('cheese', 'pie', 'lasagna');
        break;
      case 'feeling adventurous':
        vibeTerms.push('curry', 'spicy', 'seafood');
        break;
      case 'treating myself':
        vibeTerms.push('steak', 'chocolate', 'cake', 'tart');
        break;
      case 'something fresh & light':
        vibeTerms.push('salad', 'lemon', 'fish', 'avocado');
        break;
      case 'stressed, need quick and easy':
        vibeTerms.push('egg', 'noodle', 'quick');
        break;
      case 'craving something bold & spicy':
        vibeTerms.push('chili', 'curry', 'spicy');
        break;
      case 'lazy Sunday energy':
        vibeTerms.push('roast', 'chicken', 'pancake', 'bake');
        break;
      case 'feeling fancy':
        vibeTerms.push('salmon', 'duck', 'risotto');
        break;
    }
  }

  // Interleave regional and vibe terms (r0, v0, r1, v1, …) so a truncated
  // slice still samples BOTH dimensions instead of ANDing down to one.
  const interleaved: string[] = [];
  const maxLen = Math.max(regionalTerms.length, vibeTerms.length);
  for (let i = 0; i < maxLen; i++) {
    if (regionalTerms[i]) interleaved.push(regionalTerms[i]);
    if (vibeTerms[i]) interleaved.push(vibeTerms[i]);
  }

  const unique = Array.from(new Set(interleaved));
  return unique.length > 0 ? unique : ['chicken'];
}

/**
 * Parsed helper to transform meal response into editorial layout structure
 */
export function parseMealToRecipe(meal: Meal, requestedCapacity?: string | null): ParsedRecipe {
  // 1. Extract ingredients and measures
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const meas = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      const formattedMeasure = meas && meas.trim() ? `${meas.trim()} ` : '';
      ingredients.push(`${formattedMeasure}${ing.trim()}`);
    }
  }

  // 2. Extract steps from instructions
  let steps = meal.strInstructions
    ? meal.strInstructions
        .split(/[\r\n]+/)
        .map(step => step.trim())
        .filter(step => step.length > 8 && !/^[0-9]+\.?$/.test(step))
    : [];

  // If instruction splitting yielded only a single block of text, try splitting by sentences
  if (steps.length <= 1 && meal.strInstructions) {
    steps = meal.strInstructions
      .split(/(?<=\.)\s+/)
      .map(step => step.trim())
      .filter(step => step.length > 8);
  }

  // 3. Heuristic to estimate prep & cook times and effort level
  const stepCount = steps.length;
  const ingCount = ingredients.length;
  let computedPrep = '12 Min';
  let computedCook = '15 Min';
  let level = 'Medium';

  if (requestedCapacity) {
    if (requestedCapacity.includes('low')) {
      level = 'Low';
      computedPrep = '10 Min';
      computedCook = '12 Min';
    } else if (requestedCapacity.includes('high')) {
      level = 'High';
      computedPrep = '20 Min';
      computedCook = '35 Min';
    } else {
      level = 'Medium';
      computedPrep = '15 Min';
      computedCook = '25 Min';
    }
  } else {
    // Determine from complexity
    if (stepCount <= 4 && ingCount <= 8) {
      level = 'Low';
      computedPrep = '10 Min';
      computedCook = '14 Min';
    } else if (stepCount <= 8 && ingCount <= 14) {
      level = 'Medium';
      computedPrep = '15 Min';
      computedCook = '22 Min';
    } else {
      level = 'High';
      computedPrep = '25 Min';
      computedCook = '40 Min';
    }
  }

  /* A "gut tip" used to be generated here: a keyword match on the ingredient list picked
     one of nine paragraphs of invented nutrition science ("powerful natural prokinetic
     properties", "beta-glucan fibers form a protective gel barrier"). It was rendered on
     every recipe under a "Good to know" heading, which framed a hash-lookup as dietary
     advice. Removed at the user's request, and it should stay removed — see the note at
     the old render site in RecipeView.tsx. */

  // 4. Parse tags
  const tags = meal.strTags
    ? meal.strTags.split(',').map(t => t.trim()).filter(Boolean)
    : [meal.strCategory, meal.strArea].filter(Boolean);

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    category: meal.strCategory || 'General',
    area: meal.strArea || 'International',
    instructions: meal.strInstructions || '',
    image: meal.strMealThumb,
    tags,
    youtube: meal.strYoutube,
    source: meal.strSource,
    ingredients,
    steps,
    prepTime: computedPrep,
    cookTime: computedCook,
    serves: '2 Plates', // default
  };
}
