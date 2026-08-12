/**
 * Spoonacular access. Server-only: the key is read from the environment and
 * never reaches the browser, which is the whole reason this app has server
 * functions at all.
 *
 * Recipe ids are prefixed "sp-" so the router can tell a Spoonacular recipe
 * from a TheMealDB one. Bare numeric ids stay TheMealDB, so anything already
 * saved keeps working.
 */
import type { Recipe } from "./food";
import { readCache, withinBudget, writeCache } from "./cache.server";

const BASE = "https://api.spoonacular.com";
const SEARCH_TTL = 60 * 60 * 24 * 7; // a week — recipes do not change
const DETAIL_TTL = 60 * 60 * 24 * 30;
const DAILY_LIMIT = 100;

export const SPOONACULAR_PREFIX = "sp-";

export function spoonacularKey(): string | null {
  return process.env["SPOONACULAR_KEY"] ?? null;
}

type RawRecipe = {
  id?: number;
  title?: string;
  image?: string;
  sourceUrl?: string;
  instructions?: string;
  dishTypes?: string[];
  cuisines?: string[];
  extendedIngredients?: { original?: string; nameClean?: string; name?: string }[];
  analyzedInstructions?: { steps?: { number?: number; step?: string }[] }[];
};

/**
 * Spoonacular returns instructions as HTML. This is rendered as text, so the
 * markup is stripped here rather than trusted downstream — never dangerouslySet
 * anything that came off a third-party API.
 */
function plainText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|ol|ul|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function steps(raw: RawRecipe): string {
  const analyzed = raw.analyzedInstructions?.[0]?.steps ?? [];
  if (analyzed.length > 0) {
    return analyzed
      .map((s, index) => `${s.number ?? index + 1}. ${(s.step ?? "").trim()}`)
      .filter((line) => line.length > 3)
      .join("\n\n");
  }
  return raw.instructions ? plainText(raw.instructions) : "";
}

function toRecipe(raw: RawRecipe): Recipe {
  return {
    id: `${SPOONACULAR_PREFIX}${raw.id ?? ""}`,
    name: raw.title ?? "Untitled",
    category: raw.dishTypes?.[0] ? titleish(raw.dishTypes[0]) : "",
    area: raw.cuisines?.[0] ?? "",
    thumbnail: raw.image ?? null,
    instructions: steps(raw),
    ingredients: (raw.extendedIngredients ?? [])
      .map((ing) => ({
        // "original" is the human line ("2 tbsp olive oil"). The UI shows the
        // measure beside the item, so the readable line goes in the measure
        // slot and the clean name identifies the ingredient.
        item: ing.nameClean || ing.name || (ing.original ?? ""),
        measure: ing.original ?? "",
      }))
      .filter((ing) => ing.item),
    source: raw.sourceUrl || null,
    video: null,
  };
}

function titleish(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function searchSpoonacular(term: string): Promise<Recipe[] | null> {
  const key = spoonacularKey();
  if (!key) return null;

  const q = term.trim().toLowerCase();
  if (!q) return [];

  const cacheKey = `spoon:search:${q}`;
  const cached = await readCache<RawRecipe[]>(cacheKey);
  if (cached) return cached.map(toRecipe);

  if (!(await withinBudget("spoonacular", DAILY_LIMIT))) return null;

  const url = new URL(`${BASE}/recipes/complexSearch`);
  url.searchParams.set("query", q);
  url.searchParams.set("number", "18");
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("fillIngredients", "true");
  url.searchParams.set("instructionsRequired", "true");
  url.searchParams.set("sort", "popularity");
  url.searchParams.set("apiKey", key);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Spoonacular search failed [${response.status}]: ${await response.text()}`);
    return null;
  }

  const body = (await response.json()) as { results?: RawRecipe[] };
  const results = body.results ?? [];
  await writeCache(cacheKey, "spoonacular", results, SEARCH_TTL);
  return results.map(toRecipe);
}

export async function spoonacularById(prefixedId: string): Promise<Recipe | null> {
  const key = spoonacularKey();
  if (!key) return null;

  const id = prefixedId.slice(SPOONACULAR_PREFIX.length);
  if (!/^\d+$/.test(id)) return null;

  const cacheKey = `spoon:recipe:${id}`;
  const cached = await readCache<RawRecipe>(cacheKey);
  if (cached) return toRecipe(cached);

  if (!(await withinBudget("spoonacular", DAILY_LIMIT))) return null;

  const url = new URL(`${BASE}/recipes/${id}/information`);
  url.searchParams.set("includeNutrition", "false");
  url.searchParams.set("apiKey", key);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Spoonacular detail failed [${response.status}]: ${await response.text()}`);
    return null;
  }

  const raw = (await response.json()) as RawRecipe;
  await writeCache(cacheKey, "spoonacular", raw, DETAIL_TTL);
  return toRecipe(raw);
}

export async function randomSpoonacular(): Promise<Recipe | null> {
  const key = spoonacularKey();
  if (!key) return null;
  if (!(await withinBudget("spoonacular", DAILY_LIMIT))) return null;

  const url = new URL(`${BASE}/recipes/random`);
  url.searchParams.set("number", "1");
  url.searchParams.set("apiKey", key);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Spoonacular random failed [${response.status}]`);
    return null;
  }
  const body = (await response.json()) as { recipes?: RawRecipe[] };
  const raw = body.recipes?.[0];
  return raw ? toRecipe(raw) : null;
}
