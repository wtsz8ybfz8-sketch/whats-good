/**
 * Google Places API (New) integration for What's Good.
 * Falls back silently to hardcoded data on any failure.
 */

import { SouthAfricanEatery } from './campusData';

const PLACES_BASE = 'https://places.googleapis.com/v1';

interface PlacePhoto {
  name: string;
}

interface PlaceDisplayName {
  text: string;
  languageCode?: string;
}

interface PlaceOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

interface Place {
  id?: string;
  displayName?: PlaceDisplayName;
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  priceLevel?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  photos?: PlacePhoto[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: PlaceOpeningHours;
}

interface PlacesSearchResponse {
  places?: Place[];
}

interface PlaceAddressComponent {
  shortText?: string;
  types?: string[];
}

interface NearbySearchResponse {
  places?: { displayName?: PlaceDisplayName; addressComponents?: PlaceAddressComponent[] }[];
}

export interface DetectedLocality {
  city: string;
  countryCode: string | null;
}

function getGooglePlacesKey(): string {
  return (
    (import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    ''
  );
}

function priceLevelToSymbol(level?: string): 'R' | 'RR' | 'RRR' | 'RRRR' {
  switch (level) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 'R';
    case 'PRICE_LEVEL_MODERATE':
      return 'RR';
    case 'PRICE_LEVEL_EXPENSIVE':
      return 'RRR';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 'RRRR';
    default:
      return 'RR';
  }
}

/**
 * Extracts today's opening-hours line from Places' weekdayDescriptions array.
 * Google orders this Monday-first (index 0); JS Date.getDay() is Sunday-first (0).
 */
function todaysHours(hours?: PlaceOpeningHours): string | undefined {
  const lines = hours?.weekdayDescriptions;
  if (!lines || lines.length !== 7) return undefined;
  const jsDay = new Date().getDay(); // 0 = Sunday
  const mondayFirstIndex = (jsDay + 6) % 7;
  const line = lines[mondayFirstIndex];
  // Lines look like "Monday: 9:00 AM – 10:00 PM" — strip the day prefix.
  return line?.replace(/^[A-Za-z]+:\s*/, '');
}

/** Returns a direct photo URL for a Google Places photo reference. */
export function getPlacePhotoUrl(photoName: string): string {
  const key = getGooglePlacesKey();
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&key=${key}`;
}

/** Maps the app's Rand price tier to the Places API priceLevels filter. */
function symbolToPriceLevels(symbol?: string | null): string[] | undefined {
  switch (symbol) {
    case 'R':
      return ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'];
    case 'RR':
      return ['PRICE_LEVEL_MODERATE'];
    case 'RRR':
      return ['PRICE_LEVEL_EXPENSIVE'];
    case 'RRRR':
      return ['PRICE_LEVEL_VERY_EXPENSIVE'];
    default:
      return undefined;
  }
}

/**
 * A cuisine label from Places' own type data. Previously this was `${city} Restaurant`,
 * which rendered as "Cape Town Restaurant" on every card — the city echoed back as if
 * it were a cuisine. Places returns primaryTypeDisplayName (localised) and primaryType
 * (an enum like `italian_restaurant`); either is a real signal. When neither is present
 * we return an empty string and the caller hides the field rather than inventing one.
 */
function cuisineFromType(primaryType?: string, displayName?: string): string {
  if (displayName && !/^restaurant$/i.test(displayName)) return displayName;
  if (!primaryType) return '';
  const cleaned = primaryType.replace(/_restaurant$/, '').replace(/_/g, ' ').trim();
  if (!cleaned || cleaned === 'restaurant' || cleaned === 'food') return '';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function searchTextOnce(
  key: string,
  textQuery: string,
  priceLevels?: string[],
): Promise<Place[]> {
  const response = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.priceLevel',
        'places.photos',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.regularOpeningHours',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 20,
      languageCode: 'en',
      ...(priceLevels ? { priceLevels } : {}),
    }),
  });

  if (!response.ok) return [];
  const data: PlacesSearchResponse = await response.json();
  return data.places ?? [];
}

/**
 * Fetches restaurants via the Google Places Text Search API.
 * Runs two differently-phrased queries in parallel and merges the deduped
 * results (each call caps at the API's 20-result ceiling, so phrasing
 * variety is how we widen the pool). Price is filtered server-side via
 * priceLevels so all 20 slots per call hold matching venues.
 * Returns an empty array on any failure so callers can silently fall back.
 */
export async function fetchCapeTownEateries(
  query: string,
  city = 'Cape Town',
  priceSymbol?: string | null,
): Promise<SouthAfricanEatery[]> {
  const key = getGooglePlacesKey();

  if (!key) return [];

  try {
    const priceLevels = symbolToPriceLevels(priceSymbol);
    const queries = query
      ? [
          `${query} restaurant in ${city}`,
          `best ${query} places to eat in ${city}`,
        ]
      : [
          `best restaurants in ${city}`,
          `popular local eateries in ${city}`,
        ];

    const resultSets = await Promise.all(
      queries.map((q) => searchTextOnce(key, q, priceLevels).catch(() => [] as Place[])),
    );

    const seen = new Set<string>();
    const places = resultSets.flat().filter((p) => {
      const id = p.id ?? p.displayName?.text ?? '';
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (places.length === 0) return [];

    return places.map((place, index): SouthAfricanEatery => {
      const name = place.displayName?.text ?? 'Restaurant';
      const address = place.formattedAddress ?? city;
      const rating = Math.round((place.rating ?? 4.0) * 10) / 10;
      const priceSymbol = priceLevelToSymbol(place.priceLevel);
      const phone = place.nationalPhoneNumber ?? '';
      const website =
        place.websiteUri ?? `https://www.google.com/maps/search/${encodeURIComponent(name)}`;
      const photoUrl = place.photos?.[0]?.name
        ? getPlacePhotoUrl(place.photos[0].name)
        : undefined;
      const openNow = place.regularOpeningHours?.openNow;
      const hoursToday = todaysHours(place.regularOpeningHours);

      return {
        id: `eat-places-${place.id ?? index}`,
        name,
        address,
        cuisine: cuisineFromType(place.primaryType, place.primaryTypeDisplayName?.text),
        vibeMatch: 'feeling adventurous',
        fallbackDistance: '',
        rating,
        priceSymbol,
        /* Empty on purpose. These four fields used to be filled with template strings
           built from the venue's own name — `House specialty at ${name}`, `A featured
           dining experience at ${name}, located at ${address}` — which EateryView then
           rendered as a "Known for" row and a lead paragraph. The result was that every
           restaurant Google returned claimed a house specialty it had never told us about.
           A template is not data. Google's Places API does not publish a signature dish,
           so we do not have one, and the render sites already omit an empty value. An
           empty section beats a confident lie; see the "never render invented data" rule
           in CLAUDE.md. Venues in campusData.ts carry real, human-written values here and
           still render normally. */
        signatureOrder: '',
        signatureDescription: '',
        signatureIngredients: [],
        digestiveNote: '',
        externalLink: website,
        latitude: place.location?.latitude ?? -33.9249,
        longitude: place.location?.longitude ?? 18.4241,
        phone,
        estimatedWait: '', // Not published by Places. "Check with venue" is filler, not a wait time.
        photoUrl,
        openNow,
        hoursToday,
      };
    });
  } catch {
    // Silently fall back — never surface API errors to the user
    return [];
  }
}

/**
 * Reverse-geocodes coordinates to a city name using Google Places API (New) Nearby Search,
 * scoped to type "locality". Same key, same API family as fetchCapeTownEateries — no new
 * dependency, no new data source. Returns null on any failure so callers can fall back.
 */
export async function detectCityFromCoords(
  latitude: number,
  longitude: number,
): Promise<DetectedLocality | null> {
  const key = getGooglePlacesKey();
  if (!key) return null;

  try {
    const response = await fetch(`${PLACES_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.addressComponents',
      },
      body: JSON.stringify({
        includedTypes: ['locality'],
        maxResultCount: 1,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: 25000,
          },
        },
      }),
    });

    if (!response.ok) return null;

    const data: NearbySearchResponse = await response.json();
    const place = data.places?.[0];
    const name = place?.displayName?.text ?? null;
    if (!name) return null;

    const country =
      place?.addressComponents?.find((c) => c.types?.includes('country'))?.shortText ?? null;

    return { city: name, countryCode: country };
  } catch {
    return null;
  }
}

/**
 * Currency symbol for a detected country.
 *
 * The venue data and price tiers were built around South African Rand. Detection is
 * global, so landing anywhere else used to render foreign venues priced in "R" —
 * incoherent, and the source of stray currency codes on screen. Price level from
 * Places is an enum (1–4), so the tier is meaningful anywhere; only the symbol has
 * to follow the country.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  ZA: 'R', KE: 'KSh', NG: '₦', GB: '£', US: '$', AU: 'A$', NZ: 'NZ$',
  IN: '₹', JP: '¥', CN: '¥', BR: 'R$', CA: 'C$', CH: 'CHF', AE: 'AED',
};

export function currencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return 'R';
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? '€';
}

/**
 * Renders a stored Rand price tier ('R'|'RR'|'RRR'|'RRRR') in the local currency.
 * The tier count is the signal; the glyph just has to match where the user is.
 */
export function formatPriceTier(priceSymbol: string | undefined, currency: string): string {
  const tier = Math.min(Math.max((priceSymbol ?? 'RR').length, 1), 4);
  return currency.repeat(tier);
}
