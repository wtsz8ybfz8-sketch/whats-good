/**
 * Google Places (New) access. The API key never leaves the server, the field
 * mask is trimmed to what the UI renders, and every call passes the cache and
 * daily budget first.
 */
import type { PriceBand, Venue } from "./food";
import { PRICE_LEVELS } from "./food";
import { readCache, withinBudget, writeCache } from "./cache.server";

const PLACES_BASE = "https://places.googleapis.com/v1";
const SEARCH_TTL = 60 * 60 * 6; // 6 hours
const DETAIL_TTL = 60 * 60 * 24; // 1 day
const DAILY_LIMIT = 500;

/** Exactly the fields the cards and the detail view render — Places bills per field. */
const SEARCH_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.primaryTypeDisplayName",
  "places.photos.name",
  "places.location",
  "places.regularOpeningHours.openNow",
].join(",");

const DETAIL_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "priceLevel",
  "primaryTypeDisplayName",
  "photos.name",
  "location",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours.openNow",
  "regularOpeningHours.weekdayDescriptions",
].join(",");

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text?: string };
  photos?: { name?: string }[];
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
};

function photoUrl(place: RawPlace, key: string, width: number): string | null {
  const name = place.photos?.[0]?.name;
  if (!name) return null;
  return `${PLACES_BASE}/${name}/media?maxWidthPx=${width}&key=${key}&skipHttpRedirect=false`;
}

function toVenue(place: RawPlace, key: string, width = 800): Venue {
  return {
    id: place.id ?? "",
    name: place.displayName?.text ?? "Unnamed place",
    address: place.formattedAddress ?? "",
    cuisine: place.primaryTypeDisplayName?.text ?? "Restaurant",
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    price: place.priceLevel ?? null,
    openNow: place.regularOpeningHours?.openNow ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    photoUrl: photoUrl(place, key, width),
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
  };
}

/** Open places first. Closed ones stay in the list — you may be planning ahead. */
function openFirst(venues: Venue[]): Venue[] {
  return [...venues].sort((a, b) => Number(b.openNow === true) - Number(a.openNow === true));
}

/**
 * The key this app was built to read is GOOGLE_PLACES_KEY, but the project this
 * deploys into already carries the browser app's VITE_GOOGLE_PLACES_KEY. Accept
 * either so one key serves both, and read it lazily — Nitro populates
 * process.env per request, not at module load.
 */
export function placesKey(): string | null {
  return process.env["GOOGLE_PLACES_KEY"] ?? process.env["VITE_GOOGLE_PLACES_KEY"] ?? null;
}

export async function searchPlaces(args: {
  query: string;
  city: string;
  price: PriceBand | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ venues: Venue[]; source: "live" | "cache" | "sample"; notice?: string }> {
  const key = placesKey();
  if (!key) return { venues: [], source: "sample", notice: "no-key" };

  // Never paste a location word into the query. This used to default the city
  // to the literal string "near me", so an empty city sent Google
  // "dessert in near me" — which it geocodes to a real place, in Texas. When we
  // have coordinates we bias the search properly; when we have neither, we ask
  // rather than guessing somewhere on the user's behalf.
  const hasCoords = typeof args.lat === "number" && typeof args.lng === "number";
  if (!args.city.trim() && !hasCoords) {
    return { venues: [], source: "sample", notice: "no-location" };
  }

  const textQuery = (args.city.trim() ? `${args.query} in ${args.city}` : args.query).trim();
  const priceLevels = args.price
    ? [...(PRICE_LEVELS.find((p) => p.id === args.price)?.levels ?? [])]
    : undefined;
  const bias = hasCoords ? `${args.lat!.toFixed(3)},${args.lng!.toFixed(3)}` : "none";
  const cacheKey = `places:search:${textQuery.toLowerCase()}:${priceLevels?.join("|") ?? "any"}:${bias}`;

  const cached = await readCache<RawPlace[]>(cacheKey);
  if (cached) return { venues: openFirst(cached.map((p) => toVenue(p, key))), source: "cache" };

  if (!(await withinBudget("places", DAILY_LIMIT))) {
    return { venues: [], source: "sample", notice: "budget" };
  }

  const response = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": SEARCH_MASK,
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 18,
      ...(priceLevels ? { priceLevels } : {}),
      // 10km around the phone, so "dessert" with no city means dessert here.
      ...(hasCoords
        ? {
            locationBias: {
              circle: {
                center: { latitude: args.lat, longitude: args.lng },
                radius: 10000,
              },
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    console.error(`Places search failed [${response.status}]: ${await response.text()}`);
    return { venues: [], source: "sample", notice: "provider-error" };
  }

  const body = (await response.json()) as { places?: RawPlace[] };
  const places = body.places ?? [];
  await writeCache(cacheKey, "places", places, SEARCH_TTL);
  return { venues: openFirst(places.map((p) => toVenue(p, key))), source: "live" };
}

/**
 * Turns coordinates into a place name to show the user. Uses the Geocoding API,
 * which is a separate product from Places and may not be enabled on the key —
 * so a failure here is expected and returns null. Callers say "Near you"
 * instead; the search itself is biased by the coordinates either way and does
 * not depend on this succeeding.
 */
export async function reverseCity(lat: number, lng: number): Promise<string | null> {
  const key = placesKey();
  if (!key) return null;

  const cacheKey = `geocode:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = await readCache<string>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("result_type", "locality|postal_town|administrative_area_level_2");
    url.searchParams.set("key", key);

    const response = await fetch(url);
    if (!response.ok) return null;

    const body = (await response.json()) as {
      status?: string;
      results?: { address_components?: { long_name?: string; types?: string[] }[] }[];
    };
    if (body.status !== "OK") {
      console.error(`Geocode returned ${body.status ?? "no status"}`);
      return null;
    }

    for (const type of ["locality", "postal_town", "administrative_area_level_2"]) {
      for (const result of body.results ?? []) {
        const hit = result.address_components?.find((c) => c.types?.includes(type));
        if (hit?.long_name) {
          await writeCache(cacheKey, "geocode", hit.long_name, DETAIL_TTL);
          return hit.long_name;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("reverse geocode failed", error);
    return null;
  }
}

export async function placeDetails(id: string): Promise<Venue | null> {
  const key = placesKey();
  if (!key) return null;

  const cacheKey = `places:detail:${id}`;
  const cached = await readCache<RawPlace>(cacheKey);
  if (cached) return toVenue(cached, key, 1400);

  if (!(await withinBudget("places", DAILY_LIMIT))) return null;

  const response = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(id)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": DETAIL_MASK },
  });
  if (!response.ok) {
    console.error(`Places detail failed [${response.status}]: ${await response.text()}`);
    return null;
  }
  const place = (await response.json()) as RawPlace;
  await writeCache(cacheKey, "places", place, DETAIL_TTL);
  return toVenue(place, key, 1400);
}
