/**
 * Venues from our own city files — `public/data/<city>.json`, built weekly by
 * `scripts/build_venues.py` (GitHub Actions) from Overture Maps Places plus each venue's own
 * website share image. No key, no quota, no bill, answers instantly from our own domain.
 *
 * Returns [] when the city has no file, so `fetchVenues` falls through to Google, then OSM.
 */
import { Venue } from './venue';

interface CityVenue {
  id: string; name: string; category: string; confidence?: number;
  website?: string; phone?: string; address?: string; lat: number; lon: number;
  photo?: string; social?: string;
}

const FILES: Record<string, string> = {
  'cape town': 'cape-town', 'kaapstad': 'cape-town',
  johannesburg: 'johannesburg', joburg: 'johannesburg',
  durban: 'durban',
};
const BOXES: [string, number, number, number, number][] = [
  ['cape-town', 18.30, -34.15, 18.75, -33.75],
  ['johannesburg', 27.85, -26.35, 28.20, -26.00],
  ['durban', 30.90, -29.95, 31.10, -29.75],
];
const cache: Record<string, Promise<CityVenue[]>> = {};

function fileFor(city: string, coords?: [number, number] | null): string | undefined {
  /* The city the reader TYPED wins. Coordinates used to be checked first, so a phone in Cape
     Town searching "New York" was served the Cape Town file. GPS only decides when no city
     is named. */
  const named = city.trim().toLowerCase();
  if (named) return FILES[named];
  if (coords) {
    const [lat, lon] = coords;
    const hit = BOXES.find(([, x0, y0, x1, y1]) => lon > x0 && lon < x1 && lat > y0 && lat < y1);
    if (hit) return hit[0];
  }
  return undefined;
}

function load(slug: string): Promise<CityVenue[]> {
  return (cache[slug] ??= fetch(`/data/${slug}.json`)
    .then((r) => (r.ok ? r.json() : { venues: [] }))
    .then((d: { venues?: CityVenue[] }) => d.venues || [])
    .catch(() => []));
}

const BARISH = /bar|pub|lounge|brewery|winery|night_club|cocktail/;
const STOP = new Set(['restaurant', 'restaurants', 'best', 'places', 'place', 'food', 'with', 'and',
  'the', 'for', 'eat', 'local', 'popular', 'eateries', 'somewhere', 'good', 'nearby', 'bars', 'pubs']);

/* Venue share images are full-size originals (often megabytes). wsrv.nl — a free, open-source
   image CDN — resizes and re-encodes them to ~40KB WebP at card size, cached at its edge. */
const sized = (u: string, w: number) =>
  `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=${w}&h=${Math.round(w * 0.75)}&fit=cover&a=attention&output=webp&q=72`;

const label = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

function km(a: [number, number], lat: number, lon: number): number {
  const r = Math.PI / 180, dLat = (lat - a[0]) * r, dLon = (lon - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export async function fetchCityVenues(
  query: string,
  city: string,
  kind: 'restaurant' | 'bar',
  coords?: [number, number] | null,
): Promise<Venue[]> {
  const slug = fileFor(city, coords);
  if (!slug) return [];
  const all = await load(slug);
  /* A chain publishes ONE share image for every branch. Count how often each photo recurs: a
     photo used once is that venue's own; a shared one is brand art and is dropped, so a list
     never opens on six identical Ocean Basket cards. Delivery depots are not places to eat. */
  const uses = new Map<string, number>();
  for (const v of all) if (v.photo) uses.set(v.photo, (uses.get(v.photo) || 0) + 1);
  const pool = all
    .filter((v) => !/delivery|shipping|catering/.test(v.category))
    .filter((v) => (kind === 'bar') === BARISH.test(v.category))
    .map((v) => (v.photo && (uses.get(v.photo) || 0) > 1 ? { ...v, photo: undefined } : v));
  /* The occasion IS the search: its words are matched against the venue's real category and
     name, so different tiles return different venues. No match → the whole kind, never empty. */
  const words = query.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const stem = (w: string) => w.replace(/(es|s)$/, '');
  const hits = words.length
    ? pool.filter((v) => words.some((w) => `${v.category} ${v.name}`.toLowerCase().includes(stem(w))))
    : [];
  const chosen = hits.length ? hits : pool;
  /* Photographed venues lead: a decision is easier over a picture. Then nearest, then confidence. */
  const ranked = chosen
    .map((v) => ({ v, d: coords ? km(coords, v.lat, v.lon) : 0 }))
    .sort((a, b) => Number(!!b.v.photo) - Number(!!a.v.photo) || a.d - b.d
      || (b.v.confidence ?? 0) - (a.v.confidence ?? 0))
    .slice(0, 40);
  return ranked.map(({ v }) => ({
    id: `eat-ov-${v.id}`,
    name: v.name,
    address: v.address || '',
    cuisine: label(v.category),
    externalLink: v.website || `https://www.google.com/maps/search/${encodeURIComponent(`${v.name} ${v.address || ''}`)}`,
    hasOwnWebsite: Boolean(v.website),
    latitude: v.lat,
    longitude: v.lon,
    phone: v.phone || '',
    photoUrl: v.photo ? sized(v.photo, 720) : undefined,
  }));
}
