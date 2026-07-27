/**
 * The "Kitchen" rail on the Cooking tab.
 *
 * This used to be a literal array in App.tsx:
 *   ['Italian','Middle Eastern','Pan-Asian','South African','Latin American']
 * with recipeUtils.ts switching on those same five strings.
 *
 * Two things were wrong with it, and the second is the serious one:
 *
 * 1. Not one of those five labels is a cuisine TheMealDB actually indexes. It has no
 *    "Pan-Asian", no "Latin American", no "Middle Eastern" and no "South African" area.
 *    So every chip was a label we invented, mapped by hand to keyword guesses.
 *
 * 2. It was fixed regardless of where the user is. A German in London was offered South
 *    African — a leftover of the app's Cape Town origin. The product premise is mood AND
 *    location; a rail wired to neither is the template smell CLAUDE.md §1 calls a failure.
 *
 * The rail is now derived: the names come from TheMealDB's own area list at runtime, so
 * we can only ever offer a cuisine the API can actually serve, and the order is biased
 * toward the resolved country. Nothing here is invented.
 */

/**
 * Fallback area list, used only when the live fetch fails (offline, API down).
 * Mirrors TheMealDB's `list.php?a=list` response. If the API gains an area, the live
 * fetch picks it up without this needing to change.
 */
export const FALLBACK_AREAS = [
  'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 'Egyptian',
  'Filipino', 'French', 'Greek', 'Indian', 'Irish', 'Italian', 'Jamaican', 'Japanese',
  'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 'Polish', 'Portuguese', 'Russian',
  'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Ukrainian', 'Uruguayan', 'Vietnamese',
];

/**
 * Search terms per area, for TheMealDB's keyword search.
 *
 * Lifted from the old switch in recipeUtils.ts and extended to the areas the API really
 * has. An area with no entry here falls back to its own name as the search term, which
 * is why adding a new area to the rail never needs a code change — it degrades to a
 * plain-name search rather than returning nothing.
 */
export const AREA_TERMS: Record<string, string[]> = {
  American: ['burger', 'bbq', 'mac', 'cornbread'],
  British: ['pie', 'roast', 'pudding', 'crumble'],
  Canadian: ['salmon', 'maple', 'poutine'],
  Chinese: ['stir', 'noodle', 'dumpling', 'ginger'],
  Croatian: ['stew', 'pepper', 'strudel'],
  Dutch: ['stamppot', 'pancake', 'pea'],
  Egyptian: ['lentil', 'falafel', 'rice', 'okra'],
  Filipino: ['adobo', 'pork', 'rice', 'coconut'],
  French: ['gratin', 'tart', 'ratatouille', 'butter'],
  Greek: ['feta', 'lamb', 'olive', 'moussaka'],
  Indian: ['curry', 'masala', 'dal', 'paneer'],
  Irish: ['stew', 'potato', 'soda', 'beef'],
  Italian: ['pasta', 'tomato', 'risotto', 'basil'],
  Jamaican: ['jerk', 'chicken', 'rice', 'plantain'],
  Japanese: ['teriyaki', 'miso', 'ramen', 'katsu'],
  Kenyan: ['stew', 'beef', 'bean', 'ugali'],
  Malaysian: ['satay', 'laksa', 'coconut', 'curry'],
  Mexican: ['taco', 'chili', 'lime', 'tortilla'],
  Moroccan: ['tagine', 'couscous', 'apricot', 'harissa'],
  Polish: ['pierogi', 'cabbage', 'sausage', 'beetroot'],
  Portuguese: ['cod', 'piri', 'custard', 'chorizo'],
  Russian: ['borscht', 'beef', 'dill', 'blini'],
  Spanish: ['paella', 'chorizo', 'tortilla', 'garlic'],
  Thai: ['curry', 'coconut', 'lemongrass', 'pad'],
  Tunisian: ['harissa', 'couscous', 'chickpea'],
  Turkish: ['kebab', 'lamb', 'yoghurt', 'aubergine'],
  Ukrainian: ['borscht', 'cabbage', 'potato'],
  Uruguayan: ['beef', 'steak', 'empanada'],
  Vietnamese: ['pho', 'noodle', 'herb', 'lemongrass'],
};

/**
 * Which cuisines lead the rail for a given country.
 *
 * Deliberately NOT "the cuisine of the country you're in" alone — that would offer a
 * London user British and nothing else, which is not how anyone actually eats in London.
 * Each entry is the local kitchen plus the cuisines genuinely well represented on that
 * country's high streets. Countries absent here fall through to DEFAULT_LEAD.
 */
const COUNTRY_LEAD: Record<string, string[]> = {
  GB: ['British', 'Indian', 'Italian', 'Turkish', 'Chinese', 'Thai'],
  IE: ['Irish', 'British', 'Italian', 'Indian', 'Chinese'],
  US: ['American', 'Mexican', 'Italian', 'Chinese', 'Japanese'],
  CA: ['Canadian', 'American', 'Chinese', 'Italian', 'Indian'],
  ZA: ['Indian', 'Portuguese', 'British', 'Kenyan', 'Greek'],
  KE: ['Kenyan', 'Indian', 'British', 'Egyptian'],
  FR: ['French', 'Italian', 'Moroccan', 'Vietnamese', 'Spanish'],
  DE: ['Turkish', 'Italian', 'Polish', 'Greek', 'Vietnamese'],
  NL: ['Dutch', 'Indonesian', 'Turkish', 'Moroccan', 'Italian'],
  ES: ['Spanish', 'Moroccan', 'Italian', 'French'],
  IT: ['Italian', 'French', 'Greek', 'Tunisian'],
  PT: ['Portuguese', 'Spanish', 'Moroccan', 'Italian'],
  PL: ['Polish', 'Ukrainian', 'Italian', 'Turkish'],
  TR: ['Turkish', 'Greek', 'Egyptian', 'Italian'],
  MA: ['Moroccan', 'Tunisian', 'French', 'Egyptian'],
  EG: ['Egyptian', 'Moroccan', 'Turkish', 'Greek'],
  IN: ['Indian', 'Chinese', 'Thai', 'British'],
  JP: ['Japanese', 'Chinese', 'Malaysian', 'Italian'],
  TH: ['Thai', 'Chinese', 'Malaysian', 'Japanese'],
  VN: ['Vietnamese', 'Chinese', 'Thai', 'French'],
  MY: ['Malaysian', 'Chinese', 'Indian', 'Thai'],
  PH: ['Filipino', 'Chinese', 'American', 'Spanish'],
  MX: ['Mexican', 'American', 'Spanish', 'Italian'],
  BR: ['Uruguayan', 'Portuguese', 'Italian', 'Japanese'],
  AU: ['British', 'Thai', 'Italian', 'Chinese', 'Vietnamese'],
  NZ: ['British', 'Thai', 'Italian', 'Chinese'],
};

/** Used when we have no country, or one we have no lead list for. */
const DEFAULT_LEAD = ['Italian', 'Indian', 'Chinese', 'Mexican', 'Japanese', 'Thai'];

/**
 * Order the available areas so the ones plausible where the user actually is come first.
 * Anything in the lead list that the API doesn't serve is dropped rather than rendered
 * as a chip that returns nothing.
 */
export function orderAreasForCountry(areas: string[], countryCode: string | null): string[] {
  const available = new Set(areas);
  const lead = (countryCode && COUNTRY_LEAD[countryCode.toUpperCase()]) || DEFAULT_LEAD;
  const led = lead.filter((a) => available.has(a));
  const rest = areas.filter((a) => !led.includes(a)).sort((a, b) => a.localeCompare(b));
  return [...led, ...rest];
}

/**
 * Live area list from TheMealDB. Resolves to FALLBACK_AREAS on any failure — the rail
 * must never render empty, because an empty rail removes the only cuisine control on
 * the tab (CLAUDE.md §5, Recover).
 */
export async function fetchAreas(): Promise<string[]> {
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list');
    if (!res.ok) return FALLBACK_AREAS;
    const data = await res.json();
    const names = (data?.meals ?? [])
      .map((m: { strArea?: string }) => m.strArea)
      .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0);
    return names.length > 0 ? names : FALLBACK_AREAS;
  } catch {
    return FALLBACK_AREAS;
  }
}
