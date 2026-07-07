/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Meal, ParsedRecipe } from './types';

/**
 * Maps the coordinates (Vibe + Regional Cuisine) to real search terms for TheMealDB
 */
export function mapCoordinatesToQueries(vibe: string | null, regional: string | null): string[] {
  const regionalTerms: string[] = [];
  const vibeTerms: string[] = [];

  // Regional mapping
  if (regional) {
    switch (regional) {
      case 'Italian':
        regionalTerms.push('pasta', 'tomato', 'risotto', 'basil');
        break;
      case 'Middle Eastern':
        regionalTerms.push('couscous', 'lamb', 'lentil', 'kebap', 'chickpea');
        break;
      case 'Pan-Asian':
        regionalTerms.push('rice', 'noodle', 'stir', 'teriyaki', 'curry', 'ginger');
        break;
      case 'South African':
        regionalTerms.push('stew', 'beef', 'curry', 'bobotie');
        break;
      case 'Latin American':
        regionalTerms.push('taco', 'chili', 'lime', 'tortilla', 'fajitas');
        break;
      case 'surprise me':
      default:
        regionalTerms.push('chicken', 'salmon', 'beef', 'pie', 'soup', 'salad');
        break;
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

  // 4. Generate dynamic gut tip based on typical ingredients
  let gutTip = 'A balanced, whole-ingredient meal that supports optimal digestive pacing and micro-nutrient absorption without heavy culinary emulsifier lipids.';
  
  const lowerInstructions = (meal.strInstructions || '').toLowerCase();
  const lowerIngredients = ingredients.map(i => i.toLowerCase()).join(' ');

  if (lowerIngredients.includes('ginger')) {
    gutTip = 'Fresh ginger root active components possess powerful natural prokinetic properties that dramatically optimize upper digestive tract clearing and soothe gut mucosa.';
  } else if (lowerIngredients.includes('rice') || lowerIngredients.includes('jasmine')) {
    gutTip = 'Utilizing highly digestible polished starches like jasmine rice provides rapid caloric absorption channels, minimizing bloating profiles by avoiding taxing fibrous outer hulls.';
  } else if (lowerIngredients.includes('pasta') || lowerIngredients.includes('noodle') || lowerIngredients.includes('spaghetti')) {
    gutTip = 'Boiling regional pasta varieties al dente keeps starch matrices structurally cohesive, creating slow-release carbohydrates that avoid spike loops and support continuous tract energy.';
  } else if (lowerIngredients.includes('mint') || lowerIngredients.includes('peppermint')) {
    gutTip = 'Inclusion of mint leaves releases natural menthol oils which soothe local tissue boundaries, acting as a functional tool to relax cramping or stomach bloating loops.';
  } else if (lowerIngredients.includes('lemon') || lowerIngredients.includes('lime') || lowerIngredients.includes('citrus')) {
    gutTip = 'Inbuilt pure citrus citric acids aid primary stomach enzyme cycles, improving broad protein digestion rates while keeping stomach acidity profiles nicely regulated.';
  } else if (lowerIngredients.includes('turmeric') || lowerIngredients.includes('curry') || lowerIngredients.includes('cumin')) {
    gutTip = 'Warm anti-inflammatory spice blends containing curcumin stimulate metabolic heat while supporting liver detoxification steps and relaxed gastrointestinal flow.';
  } else if (lowerIngredients.includes('coconut milk') || lowerIngredients.includes('coconut amino')) {
    gutTip = 'Medium-chain fats present in organic coconut liquids offer instant fuel source availability, bypassing complex processing cycles in the gall bladder for easy assimilation.';
  } else if (lowerIngredients.includes('oat') || lowerIngredients.includes('porridge')) {
    gutTip = 'Soluble beta-glucan fibers form a protective gel barrier along GI pathways, slowing nutrient uptake gently while lubricating active motility loops.';
  }

  // 5. Parse tags
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
    gutTip,
  };
}
