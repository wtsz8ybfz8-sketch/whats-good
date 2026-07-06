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

/** Returns a direct photo URL for a Google Places photo reference. */
export function getPlacePhotoUrl(photoName: string): string {
  const key = getGooglePlacesKey();
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&key=${key}`;
}

/**
 * Fetches Cape Town restaurants via the Google Places Text Search API.
 * Maps each result to SouthAfricanEatery format.
 * Returns an empty array on any failure so callers can silently fall back.
 */
export async function fetchCapeTownEateries(
  query: string,
  city = 'Cape Town',
): Promise<SouthAfricanEatery[]> {
  const key = getGooglePlacesKey();

  if (!key) return [];

  try {
    const textQuery = query
      ? `${query} restaurant ${city} South Africa`
      : `restaurant ${city} South Africa`;

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
      }),
    });

    if (!response.ok) return [];

    const data: PlacesSearchResponse = await response.json();
    const places = data.places ?? [];

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
      };
    });
  } catch {
    // Silently fall back — never surface API errors to the user
    return [];
  }
}
