/**
 * Foursquare → Venue. The primary venue source: real photographs, ratings, price, hours,
 * phone and website for the exact place, via the same-site `/api/fsq` proxy.
 *
 * Returns [] on any failure so `fetchVenues` falls through to Google, then OpenStreetMap.
 * Every field is mapped only when Foursquare published it — absent stays absent (§8).
 */
import { Venue } from './venue';

interface FsqPhoto { prefix?: string; suffix?: string }
interface FsqPlace {
  fsq_place_id?: string; fsq_id?: string;
  name?: string;
  location?: { formatted_address?: string; address?: string; locality?: string };
  categories?: { name?: string }[];
  tel?: string; website?: string;
  hours?: { display?: string; open_now?: boolean };
  rating?: number;
  stats?: { total_ratings?: number };
  price?: number;
  photos?: FsqPhoto[];
  latitude?: number; longitude?: number;
  geocodes?: { main?: { latitude?: number; longitude?: number } };
}

const photoUrl = (p?: FsqPhoto, size = '800x600') =>
  p?.prefix && p?.suffix ? `${p.prefix}${size}${p.suffix}` : undefined;

function toVenue(p: FsqPlace, i: number): Venue | null {
  if (!p.name) return null;
  const id = p.fsq_place_id || p.fsq_id || String(i);
  const photos = (p.photos || []).map((ph) => photoUrl(ph)).filter((u): u is string => !!u);
  const lat = p.latitude ?? p.geocodes?.main?.latitude;
  const lon = p.longitude ?? p.geocodes?.main?.longitude;
  return {
    id: `eat-fsq-${id}`,
    name: p.name,
    address: p.location?.formatted_address || p.location?.address || p.location?.locality || '',
    cuisine: p.categories?.[0]?.name || '',
    /* Foursquare rates out of 10; the app's star renders out of 5. Halved, not invented. */
    rating: typeof p.rating === 'number' ? Math.round(p.rating * 5) / 10 : undefined,
    userRatingCount: p.stats?.total_ratings,
    priceTier: p.price && p.price >= 1 && p.price <= 4 ? (p.price as 1 | 2 | 3 | 4) : undefined,
    externalLink: p.website || `https://www.google.com/maps/search/${encodeURIComponent(p.name)}`,
    hasOwnWebsite: Boolean(p.website),
    latitude: lat,
    longitude: lon,
    phone: p.tel || '',
    photoUrl: photos[0],
    galleryUrls: photos.slice(1, 5),
    openNow: p.hours?.open_now,
    hoursToday: p.hours?.display || undefined,
  };
}

export async function fetchFoursquareVenues(
  query: string,
  city: string,
  priceTier?: number | null,
  coords?: [number, number] | null,
  openNow?: boolean,
  signal?: AbortSignal,
): Promise<Venue[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (coords) params.set('ll', `${coords[0]},${coords[1]}`);
  else params.set('near', city);
  if (priceTier && priceTier >= 1 && priceTier <= 4) {
    params.set('min_price', String(priceTier));
    params.set('max_price', String(priceTier));
  }
  if (openNow) params.set('open_now', 'true');
  try {
    const r = await fetch(`/api/fsq?${params}`, { signal });
    if (!r.ok) return [];
    const data = (await r.json()) as { results?: FsqPlace[] };
    return (data.results || []).map(toVenue).filter((v): v is Venue => !!v);
  } catch {
    return [];
  }
}
