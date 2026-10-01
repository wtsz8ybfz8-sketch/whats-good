/**
 * The reader's location — from the edge, free, with no key and no permission prompt.
 *
 * Vercel adds `x-vercel-ip-*` headers to every request that reaches a function: the city,
 * country and the lat/lon it derived from the caller's IP. That is enough to open the app
 * on the reader's OWN city, anywhere in the world, before (and whether or not) they grant
 * precise geolocation. It replaces the old default, where the browser timezone named the
 * nearest big city and a whole country collapsed onto one name (every South African got
 * Johannesburg). No hardcoded default, no SA assumption, no cost.
 */
interface Req {
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (k: string, v: string) => void;
  json: (body: unknown) => void;
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

export default function handler(req: Req, res: Res): void {
  const rawCity = one(req.headers['x-vercel-ip-city']);
  let city: string | null = null;
  try {
    city = rawCity ? decodeURIComponent(rawCity) : null;
  } catch {
    city = rawCity || null;
  }
  const country = one(req.headers['x-vercel-ip-country']) || null;
  const lat = Number(one(req.headers['x-vercel-ip-latitude']));
  const lon = Number(one(req.headers['x-vercel-ip-longitude']));

  /* Location is per-reader, so it must never be cached and served to someone else. */
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    city: city || null,
    country,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  });
}
