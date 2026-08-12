/** Client-safe domain types and vocabulary shared by routes and server functions. */

export type Mood = {
  id: string;
  label: string;
  blurb: string;
  /** Search terms handed to the venue provider. */
  placeTerms: string;
  /** Search term handed to the recipe provider. */
  recipeTerm: string;
};

export const MOODS: Mood[] = [
  {
    id: "burgers",
    label: "Burgers & wings",
    blurb: "Messy, hot, hands-on",
    placeTerms: "burger restaurant",
    recipeTerm: "burger",
  },
  {
    id: "pizza",
    label: "Pizza & pasta",
    blurb: "Italian, share a table",
    placeTerms: "pizza restaurant",
    recipeTerm: "pasta",
  },
  {
    id: "curry",
    label: "Curry & spice",
    blurb: "Indian, Thai, chilli forward",
    placeTerms: "indian curry restaurant",
    recipeTerm: "curry",
  },
  {
    id: "noodles",
    label: "Noodles & sushi",
    blurb: "Ramen, pho, Japanese",
    placeTerms: "ramen sushi restaurant",
    recipeTerm: "noodles",
  },
  {
    id: "grill",
    label: "Steak & grill",
    blurb: "Fire, meat, proper plates",
    placeTerms: "steakhouse grill restaurant",
    recipeTerm: "beef",
  },
  {
    id: "brunch",
    label: "Brunch & coffee",
    blurb: "Eggs, pastries, daylight",
    placeTerms: "brunch cafe breakfast",
    recipeTerm: "breakfast",
  },
  {
    id: "healthy",
    label: "Salads & bowls",
    blurb: "Light, fresh, no regrets",
    placeTerms: "healthy salad bowls restaurant",
    recipeTerm: "salad",
  },
  {
    id: "sweet",
    label: "Dessert",
    blurb: "Cake, gelato, doughnuts",
    placeTerms: "dessert bakery",
    recipeTerm: "dessert",
  },
];

/** Going-out categories for the /out section — drinks and night, not dinner. */
export const OUT_MOODS: Mood[] = [
  {
    id: "cocktails",
    label: "Cocktail bar",
    blurb: "Proper drinks, low light",
    placeTerms: "cocktail bar",
    recipeTerm: "cocktail",
  },
  {
    id: "pub",
    label: "Pub",
    blurb: "Pints, no fuss",
    placeTerms: "pub",
    recipeTerm: "beer",
  },
  {
    id: "wine",
    label: "Wine bar",
    blurb: "Small plates, big list",
    placeTerms: "wine bar",
    recipeTerm: "wine",
  },
  {
    id: "livemusic",
    label: "Live music",
    blurb: "Bands, jazz, something on",
    placeTerms: "live music venue bar",
    recipeTerm: "cocktail",
  },
  {
    id: "club",
    label: "Late & loud",
    blurb: "Dancing until it's tomorrow",
    placeTerms: "nightclub",
    recipeTerm: "cocktail",
  },
  {
    id: "rooftop",
    label: "Rooftop & views",
    blurb: "Outside, up high",
    placeTerms: "rooftop bar",
    recipeTerm: "cocktail",
  },
  {
    id: "happyhour",
    label: "Happy hour",
    blurb: "Cheap rounds, early doors",
    placeTerms: "happy hour bar",
    recipeTerm: "cocktail",
  },
];


/** Cities to explore when you don't want to type — the usual global food capitals. */
export const CITIES = [
  "London",
  "Paris",
  "New York",
  "Tokyo",
  "Barcelona",
  "Rome",
  "Lisbon",
  "Berlin",
  "Mexico City",
  "Bangkok",
  "Istanbul",
  "Cape Town",
] as const;

/**
 * Guide-led searches. There is no public API that returns Michelin / 50 Best
 * listings, so we query the venue provider for places described that way and
 * label the results as unverified rather than pretending they're certified.
 */
export const GUIDE_PICKS = [
  { id: "michelin", label: "Michelin listed", terms: "michelin star restaurant" },
  { id: "fifty", label: "World's 50 Best", terms: "world's 50 best restaurant" },
  { id: "bib", label: "Bib Gourmand", terms: "bib gourmand restaurant" },
  { id: "critics", label: "Critics' favourites", terms: "award winning restaurant" },
] as const;




/**
 * The currency belongs to the place, not to the reader's phone. Showing "£££"
 * against a Tokyo izakaya is simply a false statement about what dinner costs,
 * and it was hardcoded into every price band and every card.
 */
const CITY_CURRENCY: Record<string, string> = {
  London: "GBP",
  Paris: "EUR",
  "New York": "USD",
  Tokyo: "JPY",
  Barcelona: "EUR",
  Rome: "EUR",
  Lisbon: "EUR",
  Berlin: "EUR",
  "Mexico City": "MXN",
  Bangkok: "THB",
  Istanbul: "TRY",
  "Cape Town": "ZAR",
};

/**
 * Null for anywhere we cannot name the currency honestly — a typed-in town we
 * have no country for. Callers fall back to words rather than guessing a symbol.
 */
export function currencySymbol(city: string, locale?: string): string | null {
  const currency = CITY_CURRENCY[city.trim()];
  if (!currency) return null;
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? null;
}

export const PRICE_LEVELS = [
  { id: "cheap", tier: 1, word: "Cheap eats", levels: ["PRICE_LEVEL_INEXPENSIVE"] },
  { id: "mid", tier: 2, word: "Mid-range", levels: ["PRICE_LEVEL_MODERATE"] },
  {
    id: "high",
    tier: 3,
    word: "Big night",
    levels: ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"],
  },
] as const;

/** The band's own label: repeated local currency symbol, or plain words. */
export function priceBandLabel(tier: number, word: string, symbol: string | null): string {
  return symbol ? symbol.repeat(tier) : word;
}

export type PriceBand = (typeof PRICE_LEVELS)[number]["id"];

export type Venue = {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  rating: number | null;
  ratingCount: number | null;
  price: string | null;
  openNow: boolean | null;
  hours: string[];
  phone: string | null;
  website: string | null;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  area: string;
  thumbnail: string | null;
  instructions: string;
  ingredients: { item: string; measure: string }[];
  source: string | null;
  video: string | null;
};

export type SearchResult<T> = {
  items: T[];
  /** Where the data came from — surfaced in the UI so nothing pretends to be live. */
  source: "live" | "cache" | "sample";
  notice?: string;
};

export function moodById(id: string | undefined): Mood | undefined {
  return MOODS.find((m) => m.id === id);
}

const PRICE_TIERS: Record<string, { tier: number; word: string }> = {
  PRICE_LEVEL_INEXPENSIVE: { tier: 1, word: "Cheap eats" },
  PRICE_LEVEL_MODERATE: { tier: 2, word: "Mid-range" },
  PRICE_LEVEL_EXPENSIVE: { tier: 3, word: "Big night" },
  PRICE_LEVEL_VERY_EXPENSIVE: { tier: 4, word: "Blowout" },
};

export function priceLabel(price: string | null, symbol: string | null): string | null {
  if (!price) return null;
  const tier = PRICE_TIERS[price];
  if (!tier) return null;
  return priceBandLabel(tier.tier, tier.word, symbol);
}

/** Ratings are numbers and belong to Intl — "4.5" is "4,5" for most of the world. */
export function formatRating(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/** Deterministic warm placeholder so cards never collapse when a photo is missing. */
export function placeholderTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${hash} 45% 82%)`;
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
