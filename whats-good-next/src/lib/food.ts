/** Client-safe domain types and vocabulary shared by routes and server functions. */

export type Mood = {
  id: string;
  label: string;
  blurb: string;
  /** Search terms handed to the venue provider. */
  placeTerms: string;
  /** Search term handed to the recipe provider. */
  recipeTerm: string;
  /** lucide icon name, resolved in the UI layer. */
  icon: string;
};

export const MOODS: Mood[] = [
  {
    id: "burgers",
    icon: "Beef",
    label: "Burgers & wings",
    blurb: "Messy, hot, hands-on",
    placeTerms: "burger restaurant",
    recipeTerm: "burger",
  },
  {
    id: "pizza",
    icon: "Pizza",
    label: "Pizza & pasta",
    blurb: "Italian, share a table",
    placeTerms: "pizza restaurant",
    recipeTerm: "pasta",
  },
  {
    id: "curry",
    icon: "Flame",
    label: "Curry & spice",
    blurb: "Indian, Thai, chilli forward",
    placeTerms: "indian curry restaurant",
    recipeTerm: "curry",
  },
  {
    id: "noodles",
    icon: "Soup",
    label: "Noodles & sushi",
    blurb: "Ramen, pho, Japanese",
    placeTerms: "ramen sushi restaurant",
    recipeTerm: "noodles",
  },
  {
    id: "grill",
    icon: "Drumstick",
    label: "Steak & grill",
    blurb: "Fire, meat, proper plates",
    placeTerms: "steakhouse grill restaurant",
    recipeTerm: "beef",
  },
  {
    id: "brunch",
    icon: "Croissant",
    label: "Brunch & coffee",
    blurb: "Eggs, pastries, daylight",
    placeTerms: "brunch cafe breakfast",
    recipeTerm: "breakfast",
  },
  {
    id: "healthy",
    icon: "Salad",
    label: "Salads & bowls",
    blurb: "Light, fresh, no regrets",
    placeTerms: "healthy salad bowls restaurant",
    recipeTerm: "salad",
  },
  {
    id: "seafood",
    icon: "Fish",
    label: "Seafood",
    blurb: "Oysters, line fish, cold wine",
    placeTerms: "seafood restaurant",
    recipeTerm: "fish",
  },
  {
    id: "tacos",
    icon: "Sandwich",
    label: "Tacos & tostadas",
    blurb: "Mexican, hot sauce, cold beer",
    placeTerms: "mexican taqueria restaurant",
    recipeTerm: "mexican",
  },
  {
    id: "plant",
    icon: "Leaf",
    label: "Plant-based",
    blurb: "Vegan and vegetarian kitchens",
    placeTerms: "vegan vegetarian restaurant",
    recipeTerm: "vegetarian",
  },
  {
    id: "bakery",
    icon: "Wheat",
    label: "Bakery & pastry",
    blurb: "Sourdough, croissants, tarts",
    placeTerms: "bakery patisserie",
    recipeTerm: "bread",
  },
  {
    id: "sweet",
    icon: "Cookie",
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
    icon: "Martini",
    label: "Cocktail bar",
    blurb: "Proper drinks, low light",
    placeTerms: "cocktail bar",
    recipeTerm: "cocktail",
  },
  {
    id: "pub",
    icon: "Beer",
    label: "Pub",
    blurb: "Pints, no fuss",
    placeTerms: "pub",
    recipeTerm: "beer",
  },
  {
    id: "wine",
    icon: "Wine",
    label: "Wine bar",
    blurb: "Small plates, big list",
    placeTerms: "wine bar",
    recipeTerm: "wine",
  },
  {
    id: "livemusic",
    icon: "Music",
    label: "Live music",
    blurb: "Bands, jazz, something on",
    placeTerms: "live music venue bar",
    recipeTerm: "cocktail",
  },
  {
    id: "club",
    icon: "Disc3",
    label: "Late & loud",
    blurb: "Dancing until it's tomorrow",
    placeTerms: "nightclub",
    recipeTerm: "cocktail",
  },
  {
    id: "rooftop",
    icon: "Building2",
    label: "Rooftop & views",
    blurb: "Outside, up high",
    placeTerms: "rooftop bar",
    recipeTerm: "cocktail",
  },
  {
    id: "happyhour",
    icon: "Clock",
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
 * Budget bands are WORDS, not repeated currency symbols.
 *
 * Two reasons, both found on a real phone in Cape Town. Intl returns a
 * currency CODE rather than a symbol for plenty of currencies — ZAR, THB and
 * TRY among them — so repeating it rendered the band buttons as "ZAR",
 * "ZARZAR", "ZARZARZAR". And even where a symbol exists, "RRR" or "£££" is a
 * convention a visitor has to decode; Google's price level is an abstract
 * tier, not a real amount, so we cannot honestly print a price range instead.
 * Plain words say the same thing to a local and a tourist.
 */
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

const PRICE_WORDS: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "Cheap eats",
  PRICE_LEVEL_MODERATE: "Mid-range",
  PRICE_LEVEL_EXPENSIVE: "Big night",
  PRICE_LEVEL_VERY_EXPENSIVE: "Blowout",
};

export function priceLabel(price: string | null): string | null {
  return price ? (PRICE_WORDS[price] ?? null) : null;
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
