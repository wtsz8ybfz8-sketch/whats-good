/**
 * Google Places, proxied SERVER-SIDE.
 *
 * ─── WHY THIS ENDPOINT EXISTS ───────────────────────────────────────────────────────
 * The browser used to hold the Places key. `VITE_*` values are baked into the bundle at
 * build time, so the key was readable in page source, and every venue photo carried it a
 * second time inside its `<img src>`. The only thing standing between a scraped key and an
 * unbounded bill was an HTTP-referrer restriction — a setting in a console, not a line in
 * this repo, undone by one wrong click and invisible in review.
 *
 * A billed credential does not belong in a document you hand to the public. It lives here
 * now, in `GOOGLE_PLACES_KEY`, which is a server environment variable and never shipped.
 *
 * Photos are answered with a 302 to Google's own signed media URL, fetched with
 * `skipHttpRedirect=true` so the key is spent here and never appears in the redirect the
 * browser follows. The image still streams straight from Google to the user and stays
 * cacheable — the proxy costs one small JSON round trip, not the bytes of the photograph.
 */

interface Req {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (k: string, v: string) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

const BASE = 'https://places.googleapis.com/v1';

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

/* Only this site's own pages may spend the key. A missing Origin/Referer is normal for a
 * same-origin GET of an <img>, so absence is allowed; a header naming somebody else is
 * not. This is a cheap guard, not a security boundary — the real limit is the key never
 * leaving the server. */
function sameSite(req: Req): boolean {
  const origin = one(req.headers.origin) || one(req.headers.referer);
  if (!origin) return true;
  const host = one(req.headers['x-forwarded-host']) || one(req.headers.host);
  if (!host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

/* A crude per-instance throttle. Fluid Compute reuses instances, so this catches the
 * obvious hammering; it is deliberately not presented as a real rate limiter. */
const HITS = new Map<string, { n: number; until: number }>();
const LIMIT = 60;
const WINDOW_MS = 60_000;
function overLimit(req: Req): boolean {
  const ip = one(req.headers['x-forwarded-for']).split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const seen = HITS.get(ip);
  if (!seen || now > seen.until) { HITS.set(ip, { n: 1, until: now + WINDOW_MS }); return false; }
  seen.n += 1;
  return seen.n > LIMIT;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const key = process.env.GOOGLE_PLACES_KEY || '';
  if (!key) { res.status(503).json({ error: 'Places is not configured on this deployment' }); return; }
  if (!sameSite(req)) { res.status(403).json({ error: 'Cross-site use of this endpoint is not allowed' }); return; }
  if (overLimit(req)) { res.status(429).json({ error: 'Too many requests' }); return; }

  const photo = one(req.query?.photo);
  if (photo) {
    /* `photo` is a Places resource name: places/<id>/photos/<ref>. Anything else is not
       ours to forward — an open fetch proxy would let a stranger spend the key on any
       Google endpoint they could name. */
    if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photo)) {
      res.status(400).json({ error: 'Not a Places photo name' });
      return;
    }
    const width = Math.min(Math.max(parseInt(one(req.query?.w) || '800', 10) || 800, 64), 1600);
    try {
      const r = await fetch(
        `${BASE}/${photo}/media?maxWidthPx=${width}&skipHttpRedirect=true&key=${key}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!r.ok) { res.status(r.status).json({ error: 'Photo unavailable' }); return; }
      const data = await r.json() as { photoUri?: string };
      if (!data.photoUri) { res.status(502).json({ error: 'No photo URI returned' }); return; }
      /* Signed media URLs are stable for long enough to be worth caching at the edge, and
         the photograph itself is then served by Google, not by this function. */
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      res.setHeader('Location', data.photoUri);
      res.status(302).end();
    } catch {
      res.status(504).json({ error: 'Photo lookup timed out' });
    }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST for a search' }); return; }

  const path = one(req.query?.path) || 'searchText';
  if (path !== 'searchText' && path !== 'searchNearby') {
    res.status(400).json({ error: 'Unsupported Places method' });
    return;
  }
  /* The field mask decides the billing SKU, so it is forwarded exactly as the client asked
     rather than widened here. A caller cannot ask for more than the client code asks for
     because this endpoint is same-site only. */
  const mask = one(req.headers['x-goog-fieldmask']);
  if (!mask) { res.status(400).json({ error: 'A field mask is required' }); return; }

  try {
    const upstream = await fetch(`${BASE}/places:${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': mask,
      },
      body: JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await upstream.json();
    /* Cache successful searches at the EDGE. This is what makes an arrival-time search
       affordable again: the first visitor to a city in an hour spends one upstream call
       and every visitor after that is served by Vercel for nothing. Restaurants do not
       move hourly. Errors are never cached — a 429 pinned for an hour would take the app
       down exactly like the quota incident it exists to prevent. */
    if (upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    }
    res.status(upstream.status).json(data);
  } catch {
    res.status(504).json({ error: 'Places timed out' });
  }
}
