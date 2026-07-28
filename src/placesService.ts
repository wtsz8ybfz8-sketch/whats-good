/**
 * Google Places API (New) integration for What's Good.
 * Falls back silently to hardcoded data on any failure.
 */

import { Venue, MealKey, VenueAttributeKey } from './venue';
import { localiseHours, placesLanguageCode, stripDayPrefix, venueDayIndex } from './locale';

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
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  photos?: PlacePhoto[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: PlaceOpeningHours;
  utcOffsetMinutes?: number;
  editorialSummary?: { text?: string; languageCode?: string };
  /* All optional booleans below are ABSENT when Google has no answer — never false.
     Keep them optional here so the tri-state survives into Venue; see venue.ts MealKey. */
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesDessert?: boolean;
  servesCoffee?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  outdoorSeating?: boolean;
  reservable?: boolean;
  servesVegetarianFood?: boolean;
  goodForChildren?: boolean;
  goodForGroups?: boolean;
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
function todaysHours(hours?: PlaceOpeningHours, utcOffsetMinutes?: number): string | undefined {
  const lines = hours?.weekdayDescriptions;
  if (!lines || lines.length !== 7) return undefined;
  // The day is resolved in the VENUE's timezone, not the phone's — see venueDayIndex.
  const line = lines[venueDayIndex(utcOffsetMinutes)];
  if (!line) return undefined;
  // Day label stripped script-agnostically, clock rewritten to the reader's convention.
  return localiseHours(stripDayPrefix(line));
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
        // Lets us resolve "today" where the venue is rather than where the phone is.
        'places.utcOffsetMinutes',
        'places.userRatingCount',
        /* BILLING NOTE — everything below this line is the Enterprise + Atmosphere SKU.
           id/photos/location are Essentials; displayName/priceLevel/primaryType are Pro;
           rating/websiteUri/phone/openingHours are Enterprise. The serving and atmosphere
           booleans and editorialSummary sit in the highest tier, so adding them raises the
           per-request cost of EVERY text search this app makes — and fetchVenues fires two
           searches per query. Worth it for the detail card, but it is a real cost change,
           not a free field. If the bill matters more than the depth, this block is the
           thing to cut, and the render sites already degrade cleanly to nothing. */
        'places.editorialSummary',
        'places.servesBreakfast',
        'places.servesBrunch',
        'places.servesLunch',
        'places.servesDinner',
        'places.servesDessert',
        'places.servesCoffee',
        'places.dineIn',
        'places.takeout',
        'places.delivery',
        'places.outdoorSeating',
        'places.reservable',
        'places.servesVegetarianFood',
        'places.goodForChildren',
        'places.goodForGroups',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 20,
      // Was hardcoded 'en'. Google localises the venue type and the weekday lines from
      // this, so it is the difference between "Italian restaurant" and
      // "Italienisches Restaurant" for a phone set to German.
      languageCode: placesLanguageCode(),
      ...(priceLevels ? { priceLevels } : {}),
    }),
  });

  if (!response.ok) return [];
  const data: PlacesSearchResponse = await response.json();
  return data.places ?? [];
}

/**
 * Copies only the keys Google actually answered.
 *
 * `false` is kept — it is a real finding ("does not serve breakfast"). `undefined` is
 * dropped, because Google omits these entirely when nobody has surveyed the venue.
 * Returns `undefined` when NOTHING was answered, so the caller stores no object at all
 * and the render site collapses the whole module rather than drawing an empty heading.
 * That is the graceful fallback: most venues answer none of these.
 */
function definedBooleans<K extends string>(
  entries: [K, boolean | undefined][],
): Partial<Record<K, boolean>> | undefined {
  const out: Partial<Record<K, boolean>> = {};
  let answered = false;
  for (const [key, value] of entries) {
    // Explicitly typeof, NOT truthiness — `false` must survive. See venue.ts MealKey.
    if (typeof value === 'boolean') {
      out[key] = value;
      answered = true;
    }
  }
  return answered ? out : undefined;
}

/**
 * The whole week, localised, rotated so the venue's today comes first.
 *
 * Rotating rather than shipping a day index means the list is self-describing: each line
 * still carries its own day label, so nothing downstream has to be told which row is
 * "now" or re-derive it from a timezone it does not have. Day resolved in the VENUE's
 * timezone (venueDayIndex), not the phone's.
 */
function weeklyHours(hours?: PlaceOpeningHours, utcOffsetMinutes?: number): string[] | undefined {
  const lines = hours?.weekdayDescriptions;
  if (!lines || lines.length !== 7) return undefined;
  const today = venueDayIndex(utcOffsetMinutes);
  // localiseHours keeps the day label and rewrites only the clock, so a 24-hour reader
  // sees "Monday: 09:00 – 22:00" rather than the AM/PM Google returns.
  return Array.from({ length: 7 }, (_, i) => localiseHours(lines[(today + i) % 7]));
}

/**
 * Query phrasings, as a pool rather than a fixed pair.
 *
 * Places caps a text search at 20 results and ranks them its own way, so one phrasing
 * returns substantially the same venues every time — the "same ten restaurants dominate
 * every cycle" problem. Two levers, and deliberately neither of them costs an extra
 * billed request:
 *
 *   1. ROTATE which phrasings are used, from this pool, so different cycles reach
 *      different corners of Google's ranking.
 *   2. INTERLEAVE the result sets instead of concatenating them (see fetchVenues).
 *
 * Widening to more simultaneous queries would also work and is the obvious move — it is
 * not taken because it multiplies the per-cycle cost of an already Enterprise-tier field
 * mask. Two requests in, more variety out.
 */
const CUISINE_QUERY_TEMPLATES = [
  (q: string, city: string) => `${q} restaurant in ${city}`,
  (q: string, city: string) => `best ${q} places to eat in ${city}`,
  (q: string, city: string) => `popular ${q} spots in ${city}`,
  (q: string, city: string) => `highly rated ${q} dining in ${city}`,
  (q: string, city: string) => `local favourite ${q} in ${city}`,
  (q: string, city: string) => `where to eat ${q} in ${city}`,
];

const GENERIC_QUERY_TEMPLATES = [
  (_q: string, city: string) => `best restaurants in ${city}`,
  (_q: string, city: string) => `popular local eateries in ${city}`,
  (_q: string, city: string) => `highly rated places to eat in ${city}`,
  (_q: string, city: string) => `neighbourhood favourite restaurants in ${city}`,
  (_q: string, city: string) => `well reviewed dining in ${city}`,
  (_q: string, city: string) => `where locals eat in ${city}`,
];

/**
 * Which slice of the phrasing pool this call gets.
 *
 * Module-level and monotonic, NOT random and NOT clock-derived. That matters twice: the
 * first fetch of a fresh page load is always offset 0, so the verify harness sees a
 * deterministic first screen; and every subsequent call — which in practice means the
 * user pressing "Find other eateries" — advances to genuinely different phrasings rather
 * than reshuffling the same response.
 */
let queryCycle = 0;

/**
 * Round-robin merge, preserving each set's internal ranking.
 *
 * `.flat()` put all 20 results of query one ahead of query two, so under any downstream
 * cap the second query was decorative: billed for, fetched, never seen. Taking one from
 * each in turn means both phrasings reach the user, and the top hit of each is on the
 * first screen.
 */
function interleave<T>(sets: T[][]): T[] {
  const merged: T[] = [];
  const longest = Math.max(0, ...sets.map((s) => s.length));
  for (let i = 0; i < longest; i++) {
    for (const set of sets) {
      if (i < set.length) merged.push(set[i]);
    }
  }
  return merged;
}

/**
 * Fetches restaurants via the Google Places Text Search API.
 * Runs two differently-phrased queries in parallel — rotated per cycle from a pool — and
 * merges the deduped results by round-robin rather than concatenation, so both phrasings
 * reach the first screen. Price is filtered server-side via priceLevels so all 20 slots
 * per call hold matching venues.
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
    const templates = query ? CUISINE_QUERY_TEMPLATES : GENERIC_QUERY_TEMPLATES;
    // Two adjacent phrasings from the pool, advancing one full pair per cycle.
    const offset = (queryCycle * 2) % templates.length;
    queryCycle++;
    const queries = [
      templates[offset](query, city),
      templates[(offset + 1) % templates.length](query, city),
    ];

    const resultSets = await Promise.all(
      queries.map((q) => searchTextOnce(key, q, priceLevels).catch(() => [] as Place[])),
    );

    // Dedupe AFTER interleaving, so a venue both phrasings return keeps the better of its
    // two positions instead of being pinned to whichever set happened to be concatenated
    // first.
    const seen = new Set<string>();
    const places = interleave(resultSets).filter((p) => {
      const id = p.id ?? p.displayName?.text ?? '';
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (places.length === 0) return [];

    return places.map((place, index): Venue => {
      const name = place.displayName?.text ?? 'Restaurant';
      const address = place.formattedAddress ?? city;
      /* No `?? 4.0`. That default gave every unrated venue a 4.0 and rendered it beside a
         star as though it had been earned — an invented fact, and one that also fed the
         sort. Undefined stays undefined; the render sites omit the field. */
      const rating =
        typeof place.rating === 'number' ? Math.round(place.rating * 10) / 10 : undefined;
      const priceTier = priceLevelToTier(place.priceLevel);
      const phone = place.nationalPhoneNumber ?? '';
      const website =
        place.websiteUri ?? `https://www.google.com/maps/search/${encodeURIComponent(name)}`;
      const photoUrl = place.photos?.[0]?.name
        ? getPlacePhotoUrl(place.photos[0].name)
        : undefined;
      const openNow = place.regularOpeningHours?.openNow;
      const hoursToday = todaysHours(place.regularOpeningHours, place.utcOffsetMinutes);

      return {
        id: `eat-places-${place.id ?? index}`,
        name,
        address,
        cuisine: cuisineFromType(place.primaryType, place.primaryTypeDisplayName?.text),
        /* Empty, not 'feeling adventurous'. That string was stamped on every single
           venue Google returned, then rendered under a "VIBE & ATMOSPHERE" heading as
           though it were a finding about that restaurant. It is the same failure as the
           synthesised menus: a template presented as knowledge. CLAUDE.md 8 requires a
           Vibe Match to be tied to a real signal — Places publishes no such field, so
           there is none, and the render site already omits an empty value. */
        vibeMatch: '',
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
           Africa and sorted by a distance computed from that lie. The first fix cast the
           undefined away with `as number`, which was no better: getDistance returned NaN,
           and while NaN <= 150 is false so the distance hid itself, NaN also poisoned the
           sort comparator and made result ordering arbitrary. Optional is the truth. */
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        phone,
        estimatedWait: '', // Not published by Places. "Check with venue" is filler, not a wait time.
        photoUrl,
        openNow,
        hoursToday,
        userRatingCount: place.userRatingCount,
        /* Google's own words, not ours. Absent for most venues — the render site drops
           the module rather than substituting a generated sentence, which is the whole
           point of §8: no dish, no module. */
        editorialSummary: place.editorialSummary?.text,
        hoursWeekly: weeklyHours(place.regularOpeningHours, place.utcOffsetMinutes),
        meals: definedBooleans<MealKey>([
          ['breakfast', place.servesBreakfast],
          ['brunch', place.servesBrunch],
          ['lunch', place.servesLunch],
          ['dinner', place.servesDinner],
          ['dessert', place.servesDessert],
          ['coffee', place.servesCoffee],
        ]),
        attributes: definedBooleans<VenueAttributeKey>([
          ['dineIn', place.dineIn],
          ['takeout', place.takeout],
          ['delivery', place.delivery],
          ['outdoorSeating', place.outdoorSeating],
          ['reservable', place.reservable],
          ['servesVegetarianFood', place.servesVegetarianFood],
          ['goodForChildren', place.goodForChildren],
          ['goodForGroups', place.goodForGroups],
        ]),
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
