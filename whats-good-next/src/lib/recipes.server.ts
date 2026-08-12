/** TheMealDB access. Free, but still cached so a browse loop is not 40 requests. */
import type { Recipe } from "./food";
import { readCache, writeCache } from "./cache.server";

const BASE = "https://www.themealdb.com/api/json/v1/1";
const TTL = 60 * 60 * 24 * 7;

type RawMeal = Record<string, string | null> & {
  idMeal?: string;
  strMeal?: string;
  strCategory?: string;
  strArea?: string;
  strMealThumb?: string;
  strInstructions?: string;
  strSource?: string;
  strYoutube?: string;
};

export function toRecipe(meal: RawMeal): Recipe {
  const ingredients: { item: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const item = (meal[`strIngredient${i}`] ?? "").toString().trim();
    const measure = (meal[`strMeasure${i}`] ?? "").toString().trim();
    if (item) ingredients.push({ item, measure });
  }
  return {
    id: meal.idMeal ?? "",
    name: meal.strMeal ?? "Untitled",
    category: meal.strCategory ?? "",
    area: meal.strArea ?? "",
    thumbnail: meal.strMealThumb ?? null,
    instructions: meal.strInstructions ?? "",
    ingredients,
    source: meal.strSource || null,
    video: meal.strYoutube || null,
  };
}

async function getMeals(path: string, cacheKey: string): Promise<RawMeal[]> {
  const cached = await readCache<RawMeal[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    console.error(`TheMealDB failed [${response.status}]: ${await response.text()}`);
    return [];
  }
  const body = (await response.json()) as { meals?: RawMeal[] | null };
  const meals = body.meals ?? [];
  await writeCache(cacheKey, "mealdb", meals, TTL);
  return meals;
}

export async function searchMeals(term: string): Promise<Recipe[]> {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const meals = await getMeals(
    `/search.php?s=${encodeURIComponent(q)}`,
    `mealdb:search:${q}`,
  );
  return meals.map(toRecipe);
}

export async function mealById(id: string): Promise<Recipe | null> {
  const meals = await getMeals(
    `/lookup.php?i=${encodeURIComponent(id)}`,
    `mealdb:meal:${id}`,
  );
  const meal = meals[0];
  return meal ? toRecipe(meal) : null;
}

export async function randomMeal(): Promise<Recipe | null> {
  const response = await fetch(`${BASE}/random.php`);
  if (!response.ok) return null;
  const body = (await response.json()) as { meals?: RawMeal[] | null };
  const meal = body.meals?.[0];
  return meal ? toRecipe(meal) : null;
}
