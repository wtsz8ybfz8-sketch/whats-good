/**
 * Google Places API (New) integration for What's Good.
 * Falls back silently to hardcoded data on any failure.
 */

import { Venue } from './venue';

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

/**
 * Whether venue discovery is configured at all.
 *
 * Without a key `fetchVenues` returns [] and the caller cannot tell "we searched and
 * found nothing" from "we never searched". Those are different answers and the user
 * deserves the real one: the app's primary tab promised "real places near you" and
 * then rendered a generic empty state, with no way forward (§5, Recover).
 */
export function isPlacesConfigured(): boolean {
  return getGooglePlacesKey().length > 0;
}

function getGooglePlacesKey(): string {
  return (
    (import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    ''
  );
}

/**
 * Places' priceLevel enum -> a tier count, 1-4.
 *
 * This used to return 'R'|'RR'|'RRR'|'RRRR' — the South African Rand glyph, repeated,
 * with the tier recovered downstream via `.length`. An unknown level defaulted to 'RR',
 * which invented a mid-range price band for a venue that had published none. Unknown is
 * now `undefined` and the render sites omit the field, per §8: a field is a real value
 * or it is absent.
 */
function priceLevelToTier(level?: string): 1 | 2 | 3 | 4 | undefined {
  switch (level) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1;
    case 'PRICE_LEVEL_MODERATE':
      return 2;
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4;
    default:
      return undefined;
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

/** Maps a price tier (1-4) to the Places API priceLevels filter. */
export function tierToPriceLevels(tier?: number | null): string[] | undefined {
  switch (tier) {
    case 1:
      return ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'];
    case 2:
      return ['PRICE_LEVEL_MODERATE'];
    case 3:
      return ['PRICE_LEVEL_EXPENSIVE'];
    case 4:
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
export async function fetchVenues(
  query: string,
  city: string,
  priceTier?: number | null,
): Promise<Venue[]> {
  const key = getGooglePlacesKey();

  if (!key) return [];

  try {
    const priceLevels = tierToPriceLevels(priceTier);
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

    return places.map((place, index): Venue => {
      const name = place.displayName?.text ?? 'Restaurant';
      const address = place.formattedAddress ?? city;
      const rating = Math.round((place.rating ?? 4.0) * 10) / 10;
      const priceTier = priceLevelToTier(place.priceLevel);
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
        priceTier,
        /* Empty on purpose. These four fields used to be filled with template strings
           built from the venue's own name — `House specialty at ${name}`, `A featured
           dining experience at ${name}, located at ${address}` — which EateryView then
           rendered as a "Known for" row and a lead paragraph. The result was that every
           restaurant Google returned claimed a house specialty it had never told us about.
           A template is not data. Google's Places API does not publish a signature dish,
           so we do not have one, and the render sites already omit an empty value. An
           empty section beats a confident lie; see the "never render invented data" rule
           in CLAUDE.md. */
        signatureOrder: '',
        signatureDescription: '',
        signatureIngredients: [],
        digestiveNote: '',
        externalLink: website,
        /* No coordinate fallback. This was `?? -33.9249, 18.4241` — Cape Town's City
           Hall — so a venue with no published location silently claimed to be in South
           Africa and then sorted by a distance computed from that lie. NaN propagates
           into a hidden distance, which is the honest outcome. */
        latitude: place.location?.latitude as number,
        longitude: place.location?.longitude as number,
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
 * scoped to type "locality". Same key, same API family as fetchVenues — no new
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
 * A price band, rendered.
 *
 * The old pair of helpers here mapped a country code to a currency glyph through a
 * fourteen-entry hardcoded table, defaulted to 'R' when the country was unknown, and
 * fell back to '€' for everywhere not in the table. So an undetected user saw South
 * African Rand and a user in Lagos saw Euros. Replacing that table with a longer table
 * would be the same mistake with more rows.
 *
 * Google Places does not publish prices — only a 1-4 band. A currency glyph on a band
 * is decoration that reads as fact, and a wrong one is worse than none. So the band is
 * rendered as what it is: a count, out of four, with a word for screen readers and for
 * anyone who has never met the dot convention. No country, no currency, no assumption.
 */
const TIER_WORDS = ['Inexpensive', 'Moderate', 'Expensive', 'Very expensive'] as const;

/** e.g. tier 2 -> '●●○○'. Returns '' when the venue published no price band. */
export function formatPriceTier(tier?: number | null): string {
  if (!tier || tier < 1 || tier > 4) return '';
  return '\u25CF'.repeat(tier) + '\u25CB'.repeat(4 - tier);
}

/** The same band in words, for aria-label and for the detail page's utility block. */
export function priceTierLabel(tier?: number | null): string {
  if (!tier || tier < 1 || tier > 4) return '';
  return `${TIER_WORDS[tier - 1]} \u00B7 ${tier} of 4`;
}
