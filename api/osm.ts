/**
 * Venue search from OpenStreetMap, run SERVER-SIDE.
 *
 * ─── WHY THIS ENDPOINT EXISTS ───────────────────────────────────────────────────────
 * The browser cannot call Overpass from this origin. Two attempts proved it, in
 * production, with the console open:
 *
 *   1. POST → the Content-Type header makes it a non-simple request, so Chrome sends a
 *      preflight; Overpass answered without `Access-Control-Allow-Origin`.
 *   2. GET (no custom headers, no preflight) → overpass-api.de answered **403 in ~540ms**
 *      with no CORS headers at all, which the browser surfaces as:
 *      "blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present".
 *
 * A public mirror is entitled to refuse an anonymous browser origin, and no amount of
 * client-side cleverness overrides that. Server-to-server has no CORS at all, sends a
 * proper User-Agent, and is what Overpass expects. So the call moves here.
 *
 * This is also the right place for it on cost grounds: one function response can be
 * cached at the edge and served to everyone, instead of every visitor hammering a
 * volunteer-run API.
 */

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const AMENITY: Record<string, string> = {
  restaurant: 'restaurant|cafe|fast_food|ice_cream',
  bar: 'bar|pub|biergarten|nightclub',
};

/** The cities this app ships. A radius beats an area-name lookup, which silently
 *  resolved to zero elements for Cape Town — verified by curl, not assumed. */
const CENTRES: Record<string, [number, number]> = {
  'Cape Town': [-33.9249, 18.4241],
  London: [51.5072, -0.1276],
  Paris: [48.8566, 2.3522],
  'New York': [40.7128, -74.006],
};

function buildQuery(city: string, kind: string): string | null {
  const centre = CENTRES[city];
  const amenity = AMENITY[kind];
  if (!centre || !amenity) return null;
  const filter = `["amenity"~"^(${amenity})$"]["name"]`;
  const around = `(around:6000,${centre[0]},${centre[1]})`;
  return `[out:json][timeout:25];\n(\n  node${filter}${around};\n  way${filter}${around};\n);\nout center tags 60;`;
}

interface Req { query?: Record<string, string | string[] | undefined> }
interface Res {
  status: (code: number) => Res;
  setHeader: (k: string, v: string) => void;
  json: (body: unknown) => void;
}

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

/* A second mode: the TAGS OpenStreetMap holds for one venue, looked up by position.
 *
 * This is the part Google will not tell you and OSM will, for free, because volunteers
 * walked in and recorded it: whether the kitchen does vegan, whether the door takes a
 * wheelchair, whether there is a table outside, whether they do takeaway. 60 metres is
 * tight enough that a match is the same building rather than its neighbour. */
function factsQuery(lat: number, lon: number): string {
  const filter = '["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"]';
  return `[out:json][timeout:20];\n(\n  node${filter}(around:60,${lat},${lon});\n  way${filter}(around:60,${lat},${lon});\n);\nout tags center 8;`;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const city = one(req.query?.city);
  const kind = one(req.query?.kind) || 'restaurant';
  const lat = Number(one(req.query?.lat));
  const lon = Number(one(req.query?.lon));

  /* Coordinates take precedence: this is the single-venue lookup, not the city sweep. */
  const query = Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)
    ? factsQuery(lat, lon)
    : buildQuery(city, kind);
  /* An unknown city is a client bug, not a server error, and it must not be cached. */
  if (!query) {
    res.status(400).json({ error: 'Unknown city or kind, and no coordinates given' });
    return;
  }

  for (const endpoint of ENDPOINTS) {
    try {
      const upstream = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        /* Overpass asks for a contactable User-Agent. Anonymous browser-shaped traffic is
           exactly what gets an IP rate-limited off the public mirrors. */
        headers: { 'User-Agent': 'whats-good/1.0 (+https://whats-good-nu.vercel.app)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!upstream.ok) continue;
      const data = await upstream.json();
      if (!Array.isArray((data as { elements?: unknown[] }).elements)) continue;

      /* Restaurants do not move hourly. One hour at the edge, a day of stale-while-
         revalidate: the next visitor to the same city gets an instant answer and Overpass
         gets one request instead of thousands. */
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      res.status(200).json(data);
      return;
    } catch {
      /* Next mirror. */
    }
  }

  res.status(502).json({ error: 'No Overpass mirror answered' });
}
