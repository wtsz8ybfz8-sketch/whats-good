/**
 * Google Places API (New) integration for What's Good Cape Town.
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
  photos?: PlacePhoto[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: PlaceOpeningHours;
}

interface PlacesSearchResponse {
  places?: Place[];
}

interface NearbySearchResponse {
  places?: { displayName?: PlaceDisplayName }[];
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
          `${query} restaurant ${city} South Africa`,
          `best ${query} places to eat in ${city}`,
        ]
      : [
          `best restaurants in ${city} South Africa`,
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
      const address = place.formattedAddress ?? 'Cape Town, South Africa';
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
        cuisine: `${city} Restaurant`,
        vibeMatch: 'feeling adventurous',
        fallbackDistance: city,
        rating,
        priceSymbol,
        signatureOrder: `House specialty at ${name}`,
        signatureDescription: `A featured dining experience at ${name}, located at ${address}.`,
        signatureIngredients: [],
        digestiveNote: `${name} is a Cape Town restaurant. Always check current menus and allergens directly with the venue. General wellness info — not medical advice.`,
        externalLink: website,
        latitude: place.location?.latitude ?? -33.9249,
        longitude: place.location?.longitude ?? 18.4241,
        phone,
        estimatedWait: 'Check with venue',
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
): Promise<string | null> {
  const key = getGooglePlacesKey();
  if (!key) return null;

  try {
    const response = await fetch(`${PLACES_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName',
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
    return data.places?.[0]?.displayName?.text ?? null;
  } catch {
    return null;
  }
}
