/*
 * The answer when Google says no.
 *
 * On 2026-08-14 the Places project hit its daily cap — `429 RESOURCE_EXHAUSTED, quota
 * metric SearchTextRequest ... per day` — and the entire discovery half of the app died
 * with it. One console-side number, and the product is a blank column. That is an
 * unacceptable single point of failure for the thing the app is FOR.
 *
 * So: OpenStreetMap via the Overpass API. No key, no billing, no account. It publishes
 * exactly the fields the result cards need — name, address parts, cuisine, opening_hours,
 * phone, website — for real venues, in any city.
 *
 * What it deliberately does NOT do:
 *
 * - **No photographs.** OSM imagery is documentation, not food photography, and it was
 *   rejected by name (CLAUDE.md 7). These venues render on the monogram plate instead.
 * - **No invented facts.** No rating, no price tier, no wait estimate — OSM does not
 *   publish them, so the cards simply omit those modules (CLAUDE.md 8).
 * - **No pretending to be Google.** `openNow` is computed only from a published
 *   `opening_hours` tag we can actually parse, and left undefined otherwise, so the card
 *   says nothing rather than guessing.
 *
 * It is a fallback, not a replacement: Places is still tried first, because its data is
 * richer and it carries the photography this product is built on.
 */
import type { Venue } from './venue';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Which OSM amenities answer this app's two venue kinds. */
const AMENITY: Record<'restaurant' | 'bar', string> = {
  restaurant: 'restaurant|cafe|fast_food|ice_cream',
  bar: 'bar|pub|biergarten|nightclub',
};

/*
 * A RADIUS, NOT AN AREA NAME.
 *
 * The first version of this asked Overpass for
 * `area["name"="Cape Town"]["boundary"="administrative"]`. It returned zero elements —
 * verified by curl, not assumed — because that city's administrative relation does not
 * carry the plain name as an exact match. An area lookup that silently resolves to
 * nothing is the worst kind of failure: the fallback reports "no venues" and looks like
 * the fallback is broken.
 *
 * A bounding radius around the city centre cannot fail that way. The coordinates are the
 * four cities this app ships, so no geocoder is called — one fewer service to be rate
 * limited by. An unknown city falls back to a name search, which is imperfect but is the
 * only honest option without geocoding.
 */
const CENTRES: Record<string, [number, number]> = {
  'Cape Town': [-33.9249, 18.4241],
  London: [51.5072, -0.1276],
  Paris: [48.8566, 2.3522],
  'New York': [40.7128, -74.0060],
};

function query(city: string, kind: 'restaurant' | 'bar'): string {
  const centre = CENTRES[city];
  const filter = `["amenity"~"^(${AMENITY[kind]})$"]["name"]`;
  if (centre) {
    /* 6km covers a city's eating districts without pulling in a whole metro area. */
    const around = `(around:6000,${centre[0]},${centre[1]})`;
    return `[out:json][timeout:25];
(
  node${filter}${around};
  way${filter}${around};
);
out center tags 60;`;
  }
  const safe = city.replace(/["\\]/g, '');
  return `[out:json][timeout:25];
area["name"="${safe}"]->.a;
(
  node${filter}(area.a);
  way${filter}(area.a);
);
out center tags 60;`;
}

/**
 * Is the venue open right now, per its published `opening_hours`?
 *
 * Only the common grammar is handled — `Mo-Fr 08:00-22:00; Sa 10:00-16:00`, `24/7`, and
 * comma-separated day lists. Anything with holidays, months, sunset offsets or `off`
 * rules returns **undefined**, which renders as no status at all. A half-understood
 * opening rule presented as "Open now" is exactly the kind of confident wrong answer this
 * codebase refuses to ship (CLAUDE.md 8).
 */
export function openFromOsm(spec: string | undefined, now = new Date()): boolean | undefined {
  if (!spec) return undefined;
  const s = spec.trim();
  if (/^24\/7$/.test(s)) return true;
  if (/PH|SH|sunset|sunrise|off|week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(s)) return undefined;

  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const today = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  let understood = false;

  for (const rule of s.split(';')) {
    const m = rule.trim().match(/^([A-Za-z,\-]+)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    understood = true;

    const applies = m[1].split(',').some((part) => {
      const range = part.split('-');
      const from = DAYS.indexOf(range[0]);
      if (from < 0) return false;
      if (range.length === 1) return from === today;
      const to = DAYS.indexOf(range[1]);
      if (to < 0) return false;
      /* A range can wrap the week — Fr-Mo is Friday, Saturday, Sunday, Monday. */
      return from <= to ? today >= from && today <= to : today >= from || today <= to;
    });
    if (!applies) continue;

    const open = +m[2] * 60 + +m[3];
    let close = +m[4] * 60 + +m[5];
    /* 18:00-02:00 closes after midnight; treat it as the next day. */
    if (close <= open) close += 24 * 60;
    if (minutes >= open && minutes <= close) return true;
    if (minutes + 24 * 60 >= open && minutes + 24 * 60 <= close) return true;
  }
  return understood ? false : undefined;
}

function address(tags: Record<string, string>): string {
  const line = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [line, tags['addr:suburb'] || tags['addr:city'], tags['addr:postcode']]
    .filter(Boolean).join(', ');
}

/** `cuisine=italian;pizza` → "Italian · Pizza". */
function cuisine(tags: Record<string, string>): string {
  const raw = tags.cuisine;
  if (!raw) return '';
  return raw.split(';').slice(0, 2)
    .map((c) => c.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase()))
    .join(' · ');
}

function toVenue(el: OsmElement): Venue | null {
  const tags = el.tags || {};
  if (!tags.name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  return {
    id: `osm-${el.type}-${el.id}`,
    name: tags.name,
    address: address(tags),
    cuisine: cuisine(tags),
    externalLink: tags.website || tags['contact:website']
      || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tags.name)}`,
    hasOwnWebsite: Boolean(tags.website || tags['contact:website']),
    latitude: lat,
    longitude: lon,
    phone: tags.phone || tags['contact:phone'] || '',
    openNow: openFromOsm(tags.opening_hours),
    hoursToday: tags.opening_hours,
    /* No photoUrl, no rating, no priceTier — OSM publishes none of them, so nothing is
       set and every render site already omits what is absent. */
  };
}

/**
 * Venues for a city from OpenStreetMap. Returns an empty array rather than throwing —
 * the caller is already in a failure path and a second exception helps nobody.
 */
/*
 * Words that describe the OCCASION rather than the food, plus the scaffolding every
 * query carries. Matching on these would match everything — `restaurant` appears in the
 * phrasing of every single Eat-tab search — so narrowing on them is the same as not
 * narrowing at all, while looking like it worked.
 */
const NOT_A_CUISINE = new Set([
  'restaurant', 'restaurants', 'bar', 'bars', 'pub', 'pubs', 'place', 'places', 'eat',
  'in', 'the', 'a', 'and', 'best', 'popular', 'local', 'good', 'great', 'near', 'me',
  'with', 'for', 'to', 'food', 'spot', 'spots', 'night', 'out', 'somewhere', 'venue',
]);

/**
 * Narrow an OSM result set by what the user actually asked for.
 *
 * THE PROBLEM THIS SOLVES. `fetchOsmVenues` took only a city and a kind, so on the
 * fallback path EVERY occasion issued the same Overpass query and got the same sixty
 * venues in the same order. Tapping "Coffee & a laptop", "Braai" and "With the kids"
 * produced three identical lists. That is the exact defect the owner reported twice —
 * "I click on the moods and I get the same list of restaurants, no difference
 * whatsoever" — and the previous fix only ever touched the Google path, which in
 * production was not the path being taken.
 *
 * WHAT THIS DOES AND DOES NOT DO. It matches the query's meaningful words against the
 * `cuisine` tag and the venue name that OSM already returned. It invents nothing and
 * fetches nothing extra. It is genuinely weaker than a Places text search: OSM publishes
 * a cuisine tag, not a notion of "romantic" or "good for kids", so an occasion with no
 * food word in it cannot be narrowed at all.
 *
 * WHEN NOTHING MATCHES, THE FULL LIST STANDS. A narrowed-to-empty screen would be a
 * worse answer than a broad one — the user asked where to eat, and "nothing" is not a
 * more honest reply than "here is everything open nearby". The caller says which of the
 * two happened, so the screen never implies a filter that did not run.
 */
export function narrowByQuery(elements: OsmElement[], query: string): OsmElement[] {
  const words = query.toLowerCase().split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !NOT_A_CUISINE.has(w));
  if (!words.length) return elements;

  const matches = elements.filter((el) => {
    const t = el.tags || {};
    /* `amenity` is in the haystack because it is the only tag that answers the
       occasions phrased as a venue type rather than a food. "Coffee & a laptop" asks
       for `cafe with wifi`, and a cafe's cuisine tag is `coffee_shop` — the two strings
       share no substring, so matching on cuisine and name alone silently returned the
       unfiltered list. The amenity vocabulary is not guessed: it is the same set this
       file already sends to Overpass in AMENITY above. */
    const hay = [t.cuisine, t.name, t.amenity].filter(Boolean).join(' ')
      .toLowerCase().replace(/_/g, ' ');
    return words.some((w) => hay.includes(w));
  });
  return matches.length ? matches : elements;
}

/* NOT named `query`: this module already has a top-level `query(city, kind)` that builds
   the Overpass request, and a parameter of that name shadows it inside this function —
   which is a call to a string, caught by tsc, not by esbuild. */
export async function fetchOsmVenues(
  city: string,
  kind: 'restaurant' | 'bar',
  terms = '',
): Promise<Venue[]> {
  /*
   * THROUGH OUR OWN ENDPOINT, NOT STRAIGHT AT OVERPASS.
   *
   * Both browser-side attempts were blocked in production — a POST tripped a preflight
   * Overpass would not answer, and a plain GET came back 403 with no CORS headers at all.
   * `api/osm.ts` makes the same call server-side, where CORS does not apply, and caches
   * the answer at the edge. The direct call stays as a second attempt purely so the dev
   * server (which serves no /api) can still exercise this path.
   */
  const routes = [
    `/api/osm?city=${encodeURIComponent(city)}&kind=${encodeURIComponent(kind)}`,
    ...ENDPOINTS.map((e) => `${e}?data=${encodeURIComponent(query(city, kind))}`),
  ];

  for (const url of routes) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OsmElement[] };
      /* Narrowed on the RAW TAGS, before mapping: `amenity` is the tag that answers
         type-shaped occasions and it is deliberately not carried onto Venue. */
      const venues = narrowByQuery(data.elements || [], terms)
        .map(toVenue).filter((v): v is Venue => v !== null);
      if (venues.length) {
        /* Open venues first — the app's whole question is "what's good RIGHT NOW" — then
           the ones whose hours are unknown, then the closed. Within a group, OSM's own
           order stands; there is no rating to sort by and inventing one is forbidden. */
        const rank = (v: Venue) => (v.openNow === true ? 0 : v.openNow === undefined ? 1 : 2);
        return venues.sort((a, b) => rank(a) - rank(b)).slice(0, 20);
      }
    } catch {
      /* Try the next route. */
    }
  }
  return [];
}
