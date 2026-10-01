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
  Johannesburg: [-26.2041, 28.0473],
  'Cape Town': [-33.9249, 18.4241],
  Durban: [-29.8587, 31.0218],
  Pretoria: [-25.7479, 28.2293],
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

/* ── Free, real venue photographs ────────────────────────────────────────────────────
 *
 * Google Places photos are a paid tier the project will not buy, and NO free Places API
 * returns venue photos either (Foursquare's photo endpoint is premium-only; Geoapify and
 * Overture carry none). So photos are ASSEMBLED, not bought, from sources that are free:
 *
 *   1. the venue's own OSM `image` tag — the exact place, when a mapper added one;
 *   2. a Wikidata P18 photograph via `wikidata` / `brand:wikidata` — a real photo of the
 *      place or its brand (a KFC storefront, a Nando's branch), resolved in ONE batched
 *      call for every id at once;
 *   3. the og:image on the venue's own website — again the exact place.
 *
 * Logos (Wikidata P154) are deliberately refused: a grid of logos reads as advertising,
 * not as somewhere to eat. A venue with none of the three keeps its monogram plate, which
 * is a designed fallback, not a missing image. All of this runs server-side — where CORS,
 * a real User-Agent and the edge cache apply — and is cached with the venue list, so the
 * whole resolution happens once per city per hour, not once per visitor. */
interface OsmEl {
  type: string;
  id: number;
  tags?: Record<string, string>;
}

function commonsFile(filename: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=640`;
}

/** A usable image URL from an OSM `image` tag: an http(s) URL as-is, or a Commons file
 *  reference turned into a served URL. Anything else (a bare word, a dead scheme) is not
 *  an image and is ignored. */
function imageTagUrl(v?: string): string | null {
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const file = v.replace(/^(File|Image):/i, '').trim();
  return file && /\.(jpe?g|png|webp|gif)$/i.test(file) ? commonsFile(file) : null;
}

/** P18 photographs for many Wikidata entities in a single request. P154 (logo) is never
 *  read. Returns qid → served Commons URL; failures simply leave a qid out. */
async function wikidataPhotos(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!qids.length) return out;
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=claims&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'whats-good/1.0 (+https://whats-good-nu.vercel.app)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return out;
    const data = (await res.json()) as {
      entities?: Record<string, { claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>> }>;
    };
    for (const [qid, ent] of Object.entries(data.entities || {})) {
      const file = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (typeof file === 'string' && file) out.set(qid, commonsFile(file));
    }
  } catch {
    /* Leave whatever resolved; the rest fall through to website or monogram. */
  }
  return out;
}

/** The og:image (or twitter:image) a venue publishes on its own site. Short timeout and a
 *  capped read: this is a nicety, never worth holding the whole list for. */
async function ogImage(site: string): Promise<string | null> {
  const base = /^https?:\/\//i.test(site) ? site : `https://${site}`;
  try {
    const res = await fetch(base, {
      headers: { 'User-Agent': 'whats-good/1.0 (+https://whats-good-nu.vercel.app)', Accept: 'text/html' },
      signal: AbortSignal.timeout(2500),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);
    const m =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!m) return null;
    let img = m[1].trim();
    if (img.startsWith('//')) img = 'https:' + img;
    else if (img.startsWith('/')) img = new URL(base).origin + img;
    return /^https?:\/\//i.test(img) ? img : null;
  } catch {
    return null;
  }
}

/** Resolve a real photo for each named venue and write it back onto `tags.image`, so the
 *  cached Overpass response carries it and the client reads it with no extra round trip. */
async function addFreeImages(elements: OsmEl[]): Promise<void> {
  const named = elements.filter((e) => e.tags?.name);

  // 1) A direct image already on the venue wins — it is the exact place.
  const needsImage: OsmEl[] = [];
  for (const el of named) {
    const direct = imageTagUrl(el.tags!.image);
    if (direct) el.tags!.image = direct;
    else needsImage.push(el);
  }
  if (!needsImage.length) return;

  // 2) Wikidata P18 photographs, one batched call for every id present.
  const qidOf = new Map<OsmEl, string>();
  for (const el of needsImage) {
    const q = el.tags!.wikidata || el.tags!['brand:wikidata'];
    if (q && /^Q\d+$/.test(q)) qidOf.set(el, q);
  }
  const photos = await wikidataPhotos([...new Set(qidOf.values())]);
  const stillNeeds: OsmEl[] = [];
  for (const el of needsImage) {
    const q = qidOf.get(el);
    const img = q ? photos.get(q) : undefined;
    if (img) el.tags!.image = img;
    else stillNeeds.push(el);
  }
  if (!stillNeeds.length) return;

  // 3) The venue's own website og:image — capped, best-effort, never blocking for long.
  await Promise.allSettled(
    stillNeeds.slice(0, 16).map(async (el) => {
      const site = el.tags!.website || el.tags!['contact:website'];
      const og = site ? await ogImage(site) : null;
      if (og) el.tags!.image = og;
    }),
  );
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

      /* Fill in a real photograph for each venue from free sources, before caching, so the
         stored response already carries images for every later visitor to this city. */
      await addFreeImages((data as { elements?: OsmEl[] }).elements || []);

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
