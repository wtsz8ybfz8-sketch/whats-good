/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Meal, ParsedRecipe } from './types';

interface FilterMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

async function fetchByArea(area: string): Promise<FilterMeal[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`);
    const data = await res.json();
    return (data.meals as FilterMeal[]) || [];
  } catch {
    return [];
  }
}

async function fetchByCategory(category: string): Promise<FilterMeal[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    return (data.meals as FilterMeal[]) || [];
  } catch {
    return [];
  }
}

async function lookupMealById(id: string): Promise<Meal | null> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
    const data = await res.json();
    const meals = data.meals as Meal[];
    return meals && meals.length > 0 ? meals[0] : null;
  } catch {
    return null;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function fetchMealsByCoordinates(vibe: string | null, regional: string | null): Promise<Meal[]> {
  let areaResults: FilterMeal[] = [];
  if (regional) {
    areaResults = await fetchByArea(regional);
  }

  let categoryResults: FilterMeal[] = [];
  if (vibe) {
    let categories: string[] = [];
    switch (vibe) {
      case 'tired & cosy':            categories = ['Soup']; break;
      case 'need comfort food':       categories = ['Pasta']; break;
      case 'feeling adventurous':     categories = ['Seafood']; break;
      case 'treating myself':         categories = ['Beef']; break;
      case 'something fresh & light': categories = ['Seafood', 'Vegetarian']; break;
      case 'stressed, need quick and easy': categories = ['Chicken']; break;
      case 'craving something bold & spicy': categories = ['Lamb']; break;
      case 'lazy Sunday energy':      categories = ['Chicken']; break;
      case 'feeling fancy':           categories = ['Seafood']; break;
    }
    const fetched = await Promise.all(categories.map(c => fetchByCategory(c)));
    categoryResults = fetched.flat();
  }

  let pool: FilterMeal[];
  if (regional && vibe && areaResults.length > 0 && categoryResults.length > 0) {
    const areaIds = new Set(areaResults.map(m => m.idMeal));
    const intersection = categoryResults.filter(m => areaIds.has(m.idMeal));
    pool = intersection.length >= 3 ? intersection : areaResults;
  } else if (areaResults.length > 0) {
    pool = areaResults;
  } else if (categoryResults.length > 0) {
    pool = categoryResults;
  } else {
    pool = await fetchByCategory('Chicken');
  }

  const seenIds = new Set<string>();
  const deduped = pool.filter(m => {
    if (!m.idMeal || seenIds.has(m.idMeal)) return false;
    seenIds.add(m.idMeal);
    return true;
  });

  const top9 = shuffleArray(deduped).slice(0, 9);
  const fullMeals = await Promise.all(top9.map(m => lookupMealById(m.idMeal)));
  return fullMeals.filter((m): m is Meal => m !== null);
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
  const DISCLAIMER = '⚕️ General wellness info only — not medical advice. Talk to a dietitian for guidance specific to you.';

  const lowerIngredients = ingredients.map(i => i.toLowerCase()).join(' ');

  let gutTip: string;

  if (lowerIngredients.includes('ginger')) {
    gutTip = `Ginger has well-documented anti-nausea properties and may support digestion. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('oat') || lowerIngredients.includes('porridge')) {
    gutTip = `Oats contain soluble fibre (beta-glucan), which supports digestion and keeps you fuller for longer. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('lemon') || lowerIngredients.includes('lime') || lowerIngredients.includes('citrus')) {
    gutTip = `Lemon and lime are good sources of vitamin C and add brightness to a dish without extra calories. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('turmeric')) {
    gutTip = `Turmeric contains curcumin, which has anti-inflammatory properties; pairing it with black pepper improves absorption. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('spinach') || lowerIngredients.includes('kale')) {
    gutTip = `Leafy greens like spinach and kale provide iron, folate, and fibre; light cooking can improve mineral absorption. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('salmon') || lowerIngredients.includes('mackerel')) {
    gutTip = `Oily fish like salmon and mackerel are rich in omega-3 fatty acids, linked to heart health and reduced inflammation. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('chickpea') || lowerIngredients.includes('lentil') || lowerIngredients.includes('bean')) {
    gutTip = `Legumes are a source of plant protein and fibre; their slow digestion helps maintain steady energy levels. ${DISCLAIMER}`;
  } else if (lowerIngredients.includes('garlic') || lowerIngredients.includes('onion')) {
    gutTip = `Garlic and onion contain prebiotic fibres that feed beneficial gut bacteria. ${DISCLAIMER}`;
  } else {
    gutTip = `This dish uses ${ingredients.length} whole ingredients. Cooking from scratch means less sodium and no hidden additives compared to packaged alternatives. ${DISCLAIMER}`;
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
