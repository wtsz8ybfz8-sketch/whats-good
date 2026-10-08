/**
 * Foursquare Places proxy — the primary venue source.
 *
 * Google Places needs a billing account this project no longer has, and OpenStreetMap carries
 * no photographs, ratings or prices. Foursquare's Places API returns all of those (plus hours,
 * phone, website and tips) for the exact venue. The key is a server secret,
 * `FOURSQUARE_API_KEY`, and never reaches the browser.
 *
 * Same-site only and allow-listed: this forwards one search shape, never an arbitrary URL.
 */
interface Req {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (k: string, v: string) => void;
  json: (body: unknown) => void;
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

const FIELDS = [
  'fsq_place_id', 'name', 'location', 'categories', 'tel', 'website', 'hours', 'rating',
  'stats', 'price', 'photos', 'latitude', 'longitude', 'distance', 'description',
].join(',');

function sameSite(req: Req): boolean {
  const origin = one(req.headers.origin) || one(req.headers.referer);
  if (!origin) return true;
  const host = one(req.headers['x-forwarded-host']) || one(req.headers.host);
  if (!host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const key = process.env.FOURSQUARE_API_KEY || '';
  if (!key) { res.status(503).json({ error: 'Foursquare is not configured on this deployment' }); return; }
  if (!sameSite(req)) { res.status(403).json({ error: 'Cross-site use of this endpoint is not allowed' }); return; }

  const q = req.query || {};
  const params = new URLSearchParams({ fields: FIELDS, limit: '30', sort: 'RELEVANCE' });
  const query = one(q.query).slice(0, 120);
  if (query) params.set('query', query);
  const ll = one(q.ll);
  const near = one(q.near).slice(0, 80);
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(ll)) { params.set('ll', ll); params.set('radius', '5000'); }
  else if (near) params.set('near', near);
  else { res.status(400).json({ error: 'A city or coordinates are required' }); return; }
  for (const k of ['min_price', 'max_price']) {
    const v = one(q[k]);
    if (/^[1-4]$/.test(v)) params.set(k, v);
  }
  if (one(q.open_now) === 'true') params.set('open_now', 'true');

  try {
    const upstream = await fetch(`https://places-api.foursquare.com/places/search?${params}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
        'X-Places-Api-Version': '2025-06-17',
      },
      signal: AbortSignal.timeout(15_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('fsq: upstream', upstream.status, JSON.stringify(data).slice(0, 400));
      res.status(upstream.status).json({ error: 'Foursquare refused the search' });
      return;
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch {
    res.status(504).json({ error: 'Foursquare timed out' });
  }
}
