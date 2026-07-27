/**
 * TheMealDB fixtures.
 *
 * This container cannot reach themealdb.com — the agent proxy refuses every outbound
 * host — so before this file existed the entire cooking journey rendered its empty
 * state and no recipe detail page had ever been looked at by anyone. These fixtures
 * are shaped exactly like the real API responses (search.php, list.php, random.php)
 * so the app's own parsing runs unchanged; only the transport is replaced.
 *
 * They are FIXTURES, not content. Nothing here is ever shipped to a user, so the
 * "never invent a fact" rule (§8) is not in tension: the point is to exercise the
 * renderer, and the values are obviously synthetic.
 */

function meal(id, name, category, area, extra = {}) {
  const base = {
    idMeal: String(id),
    strMeal: name,
    strCategory: category,
    strArea: area,
    strInstructions:
      'Heat a heavy pan over a medium flame and add the oil.\r\n' +
      'Soften the onion and garlic until translucent, about six minutes.\r\n' +
      'Add the spices and toast for thirty seconds so they bloom.\r\n' +
      'Stir in the remaining ingredients, cover, and simmer for twenty-five minutes.\r\n' +
      'Taste, adjust the salt, and rest for five minutes before serving.',
    strMealThumb: `https://www.themealdb.com/images/media/meals/${id}.jpg`,
    strTags: `${category},Weeknight`,
    strYoutube: 'https://www.youtube.com/watch?v=fixture',
    strSource: 'https://example.invalid/fixture-recipe',
    ...extra,
  };
  const ingredients = [
    ['Olive oil', '2 tbsp'],
    ['Onion', '1 large, diced'],
    ['Garlic', '3 cloves'],
    ['Tomatoes', '400 g tinned'],
    ['Paprika', '1 tsp'],
    ['Chickpeas', '1 tin, drained'],
    ['Coriander', 'a small handful'],
    ['Salt', 'to taste'],
  ];
  ingredients.forEach(([ing, meas], i) => {
    base[`strIngredient${i + 1}`] = ing;
    base[`strMeasure${i + 1}`] = meas;
  });
  for (let i = ingredients.length + 1; i <= 20; i++) {
    base[`strIngredient${i}`] = '';
    base[`strMeasure${i}`] = '';
  }
  return base;
}

/** The area list list.php?a=list returns. Intentionally multi-region — the rail is
 *  derived from whatever the source says, never from a list we hardcode (Phase 1). */
export const AREAS = [
  'American', 'British', 'Chinese', 'French', 'Greek', 'Indian', 'Italian',
  'Japanese', 'Mexican', 'Moroccan', 'Spanish', 'Thai', 'Turkish', 'Vietnamese',
];

export const MEALS = [
  meal(52771, 'Spicy Arrabiata Penne', 'Vegetarian', 'Italian'),
  meal(52772, 'Teriyaki Chicken Casserole', 'Chicken', 'Japanese'),
  meal(52785, 'Dal Fry', 'Vegetarian', 'Indian'),
  meal(52802, 'Fish Stew with Rouille', 'Seafood', 'French'),
  meal(52813, 'Big Mac Style Burger', 'Beef', 'American'),
  meal(52820, 'Katsu Chicken Curry', 'Chicken', 'Japanese'),
  meal(52844, 'Lasagne', 'Pasta', 'Italian'),
  meal(52977, 'Corba', 'Side', 'Turkish'),
];

export const AREA_LIST_RESPONSE = { meals: AREAS.map((strArea) => ({ strArea })) };

/** search.php?s=<term> — the real API matches on the meal name, so we do too. */
export function searchResponse(term) {
  const t = (term || '').trim().toLowerCase();
  if (!t) return { meals: MEALS };
  const hits = MEALS.filter(
    (m) =>
      m.strMeal.toLowerCase().includes(t) ||
      m.strArea.toLowerCase().includes(t) ||
      m.strCategory.toLowerCase().includes(t),
  );
  // The real endpoint returns `null`, not `[]`, when nothing matches. Preserving that
  // matters: `data.meals || []` in App.tsx only works because of it.
  return { meals: hits.length ? hits : null };
}

export function randomResponse() {
  return { meals: [MEALS[0]] };
}

/** 1x1 transparent PNG, for every strMealThumb / photo request. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
