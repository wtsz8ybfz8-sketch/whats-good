import {
  Amphora,
  Beer,
  ChefHat,
  Coffee,
  CookingPot,
  Croissant,
  Drumstick,
  Fish,
  Flame,
  IceCream,
  Martini,
  Pizza,
  Salad,
  Sandwich,
  Shell,
  Soup,
  UtensilsCrossed,
  Wheat,
  Wine,
  type LucideIcon,
} from 'lucide-react';

/**
 * One glyph per kitchen, so a list of venues can be scanned by shape instead of read
 * word by word.
 *
 * A previous session stripped every icon out of the filters and cards. Two of the three
 * reasons it gave were right and are fixed here rather than repeated:
 *
 *  - **Non-injective.** The old set reused a glyph across unrelated categories — `Flame`
 *    did duty for "Bold & Spicy", "Flame Grill" *and* "Latin American". That forces you to
 *    decode instead of scan, which is worse than no icon. The mapping below is injective
 *    across the ten cuisine chips; near-neighbours only share a glyph out in the long tail
 *    of free-text Google categories, where the label always sits right beside it.
 *  - **Ragged.** Nine chips of differing widths each carrying a glyph made a busy block.
 *    Fixed by layout — a fixed 14px icon and a consistent gap, so the chips still wrap into
 *    even lines.
 *
 * The third reason — that an icon beside the word "Italian" is redundant — was wrong.
 * Redundancy is the entire point. Nobody reads a wall of identical pills; they spot a shape
 * and use the word to confirm it. Strip the shapes and browsing feels like sitting an exam.
 *
 * **Mood and Diet stay text-only, deliberately.** "Lazy Sunday" and "Treating myself" have
 * no honest glyph, and inventing one is exactly where clip-art creeps in. Giving Cuisine
 * shape and leaving Mood typographic also separates the two rows, instead of three
 * identical blocks stacked down the page.
 */

/** Ordered — first match wins, so put the specific before the general. */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/sushi|sashimi|japanese/, Fish],
  [/ramen|noodle|pho\b|soup|asian|chinese|dim sum|korean|vietnamese|wok/, Soup],
  [/seafood|fish|oyster|shellfish|sea food/, Shell],
  [/burger|patty|diner/, Sandwich],
  [/pizza|pizzeria/, Pizza],
  [/italian|pasta|trattoria/, Wheat],
  [/steak|grill|barbecue|bbq|braai|churrasc|smokehouse/, Flame],
  [/curry|indian|thai|balti|tandoor/, CookingPot],
  [/brewery|beer|taproom|brewpub/, Beer],
  [/wine|winery|vineyard|wine bar/, Wine],
  [/cafe|café|coffee|espresso|roaster/, Coffee],
  [/cocktail|\bbar\b|pub|lounge|tavern|speakeasy/, Martini],
  [/bakery|patisserie|pastry|brunch|breakfast|croissant/, Croissant],
  [/deli|sandwich|bagel|sub\b/, Sandwich],
  [/dessert|ice cream|gelato|creamery|frozen yog/, IceCream],
  [/vegan|vegetarian|salad|health|juice|plant.based/, Salad],
  [/chicken|wing|rotisserie|peri/, Drumstick],
  [/tapas|spanish|greek|mediterranean|portuguese|meze/, Amphora],
  [/fine dining|french|contemporary|fusion|tasting menu/, ChefHat],
];

/**
 * Resolve a kitchen label to an icon. Takes free text because most labels come straight
 * from Google's `primaryTypeDisplayName` ("Hamburger restaurant", "Asian restaurant"),
 * not from our own chip list. Falls back to a neutral fork-and-knife rather than guessing.
 */
export function cuisineIcon(label?: string | null): LucideIcon {
  if (!label) return UtensilsCrossed;
  const text = label.toLowerCase();
  for (const [pattern, icon] of RULES) {
    if (pattern.test(text)) return icon;
  }
  return UtensilsCrossed;
}
