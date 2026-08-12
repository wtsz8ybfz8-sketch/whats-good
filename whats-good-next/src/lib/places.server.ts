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

export function placesKey(): string | null {
  return process.env["GOOGLE_PLACES_KEY"] ?? null;
}

export async function searchPlaces(args: {
  query: string;
  city: string;
  price: PriceBand | null;
}): Promise<{ venues: Venue[]; source: "live" | "cache" | "sample"; notice?: string }> {
  const key = placesKey();
  if (!key) return { venues: [], source: "sample", notice: "no-key" };

  const textQuery = `${args.query} in ${args.city}`.trim();
  const priceLevels = args.price
    ? [...(PRICE_LEVELS.find((p) => p.id === args.price)?.levels ?? [])]
    : undefined;
  const cacheKey = `places:search:${textQuery.toLowerCase()}:${priceLevels?.join("|") ?? "any"}`;

  const cached = await readCache<RawPlace[]>(cacheKey);
  if (cached) return { venues: cached.map((p) => toVenue(p, key)), source: "cache" };

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
    }),
  });

  if (!response.ok) {
    console.error(`Places search failed [${response.status}]: ${await response.text()}`);
    return { venues: [], source: "sample", notice: "provider-error" };
  }

  const body = (await response.json()) as { places?: RawPlace[] };
  const places = body.places ?? [];
  await writeCache(cacheKey, "places", places, SEARCH_TTL);
  return { venues: places.map((p) => toVenue(p, key)), source: "live" };
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
