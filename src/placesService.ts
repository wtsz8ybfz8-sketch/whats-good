/**
 * Google Places API (New) integration for What's Good.
 * Falls back silently to hardcoded data on any failure.
 */

import { Venue } from './venue';
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

/**
 * The whole week, localised, rotated so the venue's today comes first.
 *
 * Built from the SAME `weekdayDescriptions` array `todaysHours` reads — no new field is
 * requested, so this costs nothing extra. Each line keeps its own day label (localiseHours
 * rewrites only the clock, not the prefix), so the list is self-describing: index 0 is
 * today and the reader never has to be told which row is "now". Today resolved in the
 * VENUE's timezone (venueDayIndex), not the phone's — the same rule as todaysHours.
 * Returns undefined unless Google gave a full seven lines, so the render site falls back
 * to the single today line rather than drawing a partial week.
 */
function weeklyHours(hours?: PlaceOpeningHours, utcOffsetMinutes?: number): string[] | undefined {
  const lines = hours?.weekdayDescriptions;
  if (!lines || lines.length !== 7) return undefined;
  const today = venueDayIndex(utcOffsetMinutes);
  return Array.from({ length: 7 }, (_, i) => localiseHours(lines[(today + i) % 7]));
}

/** Returns a direct photo URL for a Google Places photo reference. */
/**
 * NEVER put `referrerPolicy="no-referrer"` on an <img> that loads one of these URLs.
 *
 * It was on all five venue images in this app, and it quietly disabled the single most
 * valuable protection this project has been told to apply for several sessions. The key
 * is embedded in this URL and therefore public — it is in the page source of every venue
 * card — so the only thing standing between a scraped key and an unbounded bill is an
 * HTTP-referrer restriction in the Google Cloud console. That restriction works by
 * checking the `Referer` header. `no-referrer` strips it. So the moment the owner
 * followed the advice in HANDOVER.md and restricted the key, **every venue photo in the
 * app would have started 403-ing**, with nothing connecting the cause to the effect.
 *
 * Removed everywhere. Restrict the key first, then confirm photos still load.
 *
 * `maxWidthPx=800` does NOT affect billing — Place Photos is charged per request, not
 * per pixel — but it is still ~3x oversized for the 64-80px list thumbnail, which costs
 * the user mobile data on a street. Fixing that properly means two widths per venue and
 * is not done here.
 */
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

/**
 * Why a venue search produced no venues.
 *
 * Every one of these used to be the same value: `[]`. `searchTextOnce` returned it on
 * `!response.ok`, `fetchVenues` caught everything into it, and `App` caught again — so
 * an invalid key, an exhausted quota, a disabled API, a dead connection and a search
 * that genuinely matched nothing all rendered the same empty state. Only the first of
 * those is the user's problem to act on, and only the last means "try something else",
 * yet the UI could not tell them apart and neither could anyone debugging it.
 *
 * `ok` with an empty array is a real, honest answer and must stay distinct from failure.
 */
export type VenueSearchFailure =
  | { status: 'unconfigured' }
  /** 401/403 — bad key, Places API not enabled, or a referrer/IP restriction. */
  | { status: 'denied'; code: number }
  /** 429 or RESOURCE_EXHAUSTED — the key works, the budget does not. */
  | { status: 'quota' }
  | { status: 'http'; code: number }
  /** fetch itself threw: offline, DNS, TLS, or a proxy refusing the connection. */
  | { status: 'network' }
  /** Superseded by a newer search before it finished. Never user-visible. */
  | { status: 'aborted' };

export type VenueSearchResult = { status: 'ok'; venues: Venue[] } | VenueSearchFailure;

type PlacesFetch = { status: 'ok'; places: Place[] } | VenueSearchFailure;

/**
 * Most-actionable failure wins when the two queries disagree. A user whose key is
 * rejected needs to hear that, not "network problem" from the other call timing out.
 */
const FAILURE_RANK: Record<VenueSearchFailure['status'], number> = {
  denied: 5,
  quota: 4,
  http: 3,
  network: 2,
  unconfigured: 1,
  aborted: 0,
};

async function searchTextOnce(
  key: string,
  textQuery: string,
  priceLevels: string[] | undefined,
  signal: AbortSignal,
): Promise<PlacesFetch> {
  let response: Response;
  try {
    response = await fetch(`${PLACES_BASE}/places:searchText`, {
    signal,
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
        // Same Enterprise SKU as places.rating above, which is already requested — so
        // this adds a data point, not a billing tier. Verified against the Places
        // (New) SKU tables before adding. Absent for venues with no ratings.
        'places.userRatingCount',
        'places.priceLevel',
        'places.photos',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.regularOpeningHours',
        // Lets us resolve "today" where the venue is rather than where the phone is.
        'places.utcOffsetMinutes',
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
  } catch (err) {
    // An aborted request is not a failure — it is a search the user replaced.
    return (err as Error)?.name === 'AbortError' ? { status: 'aborted' } : { status: 'network' };
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { status: 'denied', code: response.status };
    }
    if (response.status === 429) return { status: 'quota' };
    // Places answers 400 with RESOURCE_EXHAUSTED when billing is the problem rather
    // than the request, so the body decides before the code does.
    const body = await response.text().catch(() => '');
    if (/RESOURCE_EXHAUSTED|quota/i.test(body)) return { status: 'quota' };
    if (/PERMISSION_DENIED|API_KEY|not enabled/i.test(body)) {
      return { status: 'denied', code: response.status };
    }
    return { status: 'http', code: response.status };
  }

  try {
    const data: PlacesSearchResponse = await response.json();
    return { status: 'ok', places: data.places ?? [] };
  } catch {
    return { status: 'network' };
  }
}

/**
 * In-flight deduplication. NOT a cache: the entry is dropped the moment the request
 * settles, so nothing is ever served from storage and no result outlives its request.
 *
 * Two identical searches can be in the air at once for ordinary reasons — a filter
 * toggled off and back on, a re-render, the two browse tabs sharing a term. Each one
 * was a billed API call for an answer already on its way.
 */
const inFlight = new Map<
  string,
  { promise: Promise<PlacesFetch>; controller: AbortController; waiters: number }
>();

/**
 * SETTLED-RESULT CACHE — the single biggest cost lever in this file.
 *
 * `inFlight` only ever deduplicated CONCURRENT identical requests, and deleted its entry
 * the instant the promise settled. So the overwhelmingly common real behaviour — tap
 * Italian, tap back, tap Italian again; switch tabs and return; pull to refresh — re-fired
 * and re-billed the identical Text Search every time, seconds apart, for a result that
 * cannot meaningfully have changed. Two charged Enterprise calls per repeat.
 *
 * Results now survive for TTL_MS after settling. Same key, same answer, no request.
 *
 * TEN MINUTES IS A DELIBERATE CEILING, not a round number. This app's promise is "what is
 * open near me RIGHT NOW", and `openNow` is baked into the cached payload — so the cache
 * is also caching an open/closed flag that decays. Ten minutes is short enough that a
 * venue's open state cannot drift far, and long enough to absorb the whole
 * browse-back-browse loop. Do not raise it without moving `openNow` out of the cache.
 *
 * Google's terms permit temporary caching for performance; this is minutes, in memory,
 * never written to disk, and gone on reload.
 */
const TTL_MS = 10 * 60 * 1000;
const settled = new Map<string, { at: number; value: PlacesFetch }>();

/** Only ever cache a real answer. Failures must stay retryable. */
function remember(cacheKey: string, value: PlacesFetch) {
  if (value.status !== 'ok') return;
  settled.set(cacheKey, { at: Date.now(), value });
  // Unbounded growth is a leak in a long session. The map is tiny, but bound it anyway.
  if (settled.size > 60) {
    const oldest = [...settled.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) settled.delete(oldest[0]);
  }
}

/**
 * One shared request per identical query, cancelled only when the LAST caller lets go.
 * A shared AbortController that any single caller could fire would cancel a request
 * another caller is still waiting on.
 */
function searchTextShared(
  key: string,
  textQuery: string,
  priceLevels: string[] | undefined,
  signal: AbortSignal,
): Promise<PlacesFetch> {
  const cacheKey = JSON.stringify([textQuery, priceLevels ?? null, placesLanguageCode()]);

  const hit = settled.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  if (hit) settled.delete(cacheKey);

  let entry = inFlight.get(cacheKey);

  if (!entry) {
    const controller = new AbortController();
    const created: { promise: Promise<PlacesFetch>; controller: AbortController; waiters: number } = {
      controller,
      waiters: 0,
      promise: Promise.resolve({ status: 'aborted' } as PlacesFetch),
    };
    created.promise = searchTextOnce(key, textQuery, priceLevels, controller.signal)
      .then((r) => {
        remember(cacheKey, r);
        return r;
      })
      .finally(() => {
        inFlight.delete(cacheKey);
      });
    inFlight.set(cacheKey, created);
    entry = created;
  }

  const held = entry;
  held.waiters += 1;
  const release = () => {
    held.waiters -= 1;
    if (held.waiters <= 0) held.controller.abort();
  };

  // A listener added to an already-aborted signal never fires.
  if (signal.aborted) release();
  else signal.addEventListener('abort', release, { once: true });

  const detach = () => signal.removeEventListener('abort', release);
  return held.promise.then(
    (r) => {
      detach();
      return r;
    },
    (err) => {
      detach();
      throw err;
    },
  );
}

/**
 * Fetches restaurants via the Google Places Text Search API.
 * Runs two differently-phrased queries in parallel and merges the deduped
 * results (each call caps at the API's 20-result ceiling, so phrasing
 * variety is how we widen the pool). Price is filtered server-side via
 * priceLevels so all 20 slots per call hold matching venues.
 *
 * Returns a discriminated result, never a bare array: "we found nothing" and "we could
 * not look" are different answers to the user and were previously the same value.
 * Pass `signal` from the caller's effect so a superseded search stops costing money.
 */
/** What kind of place a search is looking for. Drives the phrasing sent to Google. */
export type VenueKind = 'restaurant' | 'bar';

/** Enough results that a second phrasing adds variety rather than necessity. */
const ENOUGH_RESULTS = 12;

export async function fetchVenues(
  query: string,
  city: string,
  priceTier?: number | null,
  signal?: AbortSignal,
  kind: VenueKind = 'restaurant',
): Promise<VenueSearchResult> {
  const key = getGooglePlacesKey();

  if (!key) return { status: 'unconfigured' };

  const controller = new AbortController();
  const abortSignal = signal ?? controller.signal;

  try {
    const priceLevels = tierToPriceLevels(priceTier);
    /*
     * Bars were being asked for as "cocktail bar restaurant in Paris", because the only
     * phrasings this function knew were restaurant-shaped and the Happy Hour tab passed
     * its kind in as a search TERM. Google is forgiving enough that it returned bars, but
     * the word "restaurant" was in there biasing every result toward places that serve
     * food. A bar search now reads like a bar search.
     */
    const queries: string[] =
      kind === 'bar'
        ? [`bars in ${city}`, `cocktail bars and pubs in ${city}`]
        : query
          ? [`${query} restaurant in ${city}`, `best ${query} places to eat in ${city}`]
          : [`best restaurants in ${city}`, `popular local eateries in ${city}`];

    /*
     * The second phrasing is now CONDITIONAL, and that is a straight halving of Text
     * Search spend in the common case.
     *
     * Both were previously fired in parallel, always, on the reasoning that the API caps
     * a call at 20 results so variety is the only way to widen the pool. True — but only
     * WORTH PAYING FOR when the first call came back thin. A first query returning 20
     * venues does not need a second charged Enterprise call to append more; the user is
     * never going to reach the bottom of that list. So: fire one, and only reach for the
     * second when the first genuinely underdelivers.
     */
    const first = await searchTextShared(key, queries[0], priceLevels, abortSignal).catch(
      (): PlacesFetch => ({ status: 'network' }),
    );

    const needsMore =
      first.status !== 'ok' || first.places.length < ENOUGH_RESULTS;

    const outcomes: PlacesFetch[] = needsMore
      ? [
          first,
          await searchTextShared(key, queries[1], priceLevels, abortSignal).catch(
            (): PlacesFetch => ({ status: 'network' }),
          ),
        ]
      : [first];

    const succeeded = outcomes.filter(
      (o): o is { status: 'ok'; places: Place[] } => o.status === 'ok',
    );

    // One phrasing succeeding is enough to answer the user. Only report a failure when
    // nothing came back at all, and report the most actionable one.
    if (succeeded.length === 0) {
      const failures = outcomes as VenueSearchFailure[];
      return failures.reduce((worst, f) =>
        FAILURE_RANK[f.status] > FAILURE_RANK[worst.status] ? f : worst,
      );
    }

    const seen = new Set<string>();
    const places = succeeded
      .flatMap((o) => o.places)
      .filter((p) => {
        const id = p.id ?? p.displayName?.text ?? '';
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    // A real, sourced "nothing matched that combination" — not a failure.
    if (places.length === 0) return { status: 'ok', venues: [] };

    const venues = places.map((place, index): Venue => {
      const name = place.displayName?.text ?? 'Restaurant';
      const address = place.formattedAddress ?? city;
      /* No `?? 4.0`. That default gave every unrated venue a 4.0 and rendered it beside a
         star as though it had been earned — an invented fact, and one the sort read back.
         Undefined stays undefined; the render sites guard on `typeof rating === 'number'`. */
      const rating =
        typeof place.rating === 'number' ? Math.round(place.rating * 10) / 10 : undefined;
      const priceTier = priceLevelToTier(place.priceLevel);
      const phone = place.nationalPhoneNumber ?? '';
      // A Maps search is a fair fallback destination, but it is not the venue's site,
      // and the difference has to travel with the URL or the label will overclaim it.
      const hasOwnWebsite = Boolean(place.websiteUri);
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
        hasOwnWebsite,
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
        // Undefined when Google published no rating; the star render is guarded on it.
        userRatingCount: place.userRatingCount,
        // Built from the weekdayDescriptions already fetched for hoursToday — no new field.
        hoursWeekly: weeklyHours(place.regularOpeningHours, place.utcOffsetMinutes),
      };
    });

    return { status: 'ok', venues };
  } catch (err) {
    // Reached only if the mapping above throws — the fetches classify their own
    // failures. Previously this swallowed everything into `[]`, which is how a broken
    // key and an empty neighbourhood became the same screen.
    return (err as Error)?.name === 'AbortError' ? { status: 'aborted' } : { status: 'network' };
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
