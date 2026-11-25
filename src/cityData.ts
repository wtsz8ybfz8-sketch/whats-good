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
  /* From the venue's own site (weekly build): its description, schema.org hours in OSM
     grammar, price range, menu and booking links. */
  about?: string; hours?: string; price?: string; menu?: string; bookings?: boolean;
  /* From the matching OpenStreetMap node (same name within 150 m). */
  osm?: Record<string, string>;
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

/* `smoothie_juice_bar` and `salad_bar` are not bars; `bar_and_grill_restaurant` is food. */
const BARISH = /(^|_)(bar|pub|lounge|brewery|winery|night_club|cocktail|tavern|taproom|beer_garden)(_|$)/;
const NOT_BAR = /juice|salad|grill_restaurant|sushi|espresso|snack/;
const isBar = (c: string) => BARISH.test(c) && !NOT_BAR.test(c);
/* Food and drink only. Overture's coarse bucket once let post offices, couriers and a refuse
   service into the Durban file — "garbage" contains "bar". Same list as build_venues.py. */
const FOODISH = /restaurant|cafe|coffee|(^|_)bar(_|$)|pub|bakery|bistro|brewery|winery|diner|deli|gastropub|brasserie|food_truck|dessert|ice_cream|tea_room|lounge|night_club|juice|steakhouse|pizza|sushi|tavern|pancake|bagel|creperie|food_court|beer_garden|taproom/;
const NOT_FOODISH = /garbage|post_office|courier|shipping|delivery|catering|supply|utility|plaza|transit|barber/;

/* The occasion tile's Google type → the Overture category words that mean the same thing.
   Most names line up once the `_restaurant`/`_shop` suffix is dropped; these are the ones
   that don't. */
const TYPE_WORDS: Record<string, string[]> = {
  steak_house: ['steakhouse', 'steak'],
  hamburger_restaurant: ['burger'],
  breakfast_restaurant: ['breakfast', 'brunch', 'pancake'],
  brunch_restaurant: ['brunch', 'breakfast', 'pancake'],
  juice_shop: ['juice', 'smoothie'],
  sandwich_shop: ['sandwich', 'deli', 'bagel', 'cafe'],
  dessert_shop: ['dessert', 'ice_cream', 'bakery'],
  ice_cream_shop: ['ice_cream', 'dessert'],
  tea_house: ['tea'],
  beer_garden: ['beer', 'brewery', 'taproom'],
  lounge_bar: ['lounge', 'wine_bar'],
  tapas_restaurant: ['tapas', 'spanish'],
  fine_dining_restaurant: ['french', 'fine_dining', 'winery'],
  family_restaurant: ['family', 'pizza', 'burger', 'steakhouse'],
  food_court: ['food_court', 'fast_food'],
  buffet_restaurant: ['buffet'],
  bar: [],
  restaurant: [],
};
function typeWords(type?: string): string[] {
  if (!type) return [];
  if (type in TYPE_WORDS) return TYPE_WORDS[type];
  return [type.replace(/_(restaurant|shop|house)$/, '')];
}
/* A tile's own matches lead. Below this many, the rest of the city follows them, so an
   occasion with three matching venues is never a three-card screen. */
const FULL = 12;
const STOP = new Set(['restaurant', 'restaurants', 'best', 'places', 'place', 'food', 'with', 'and',
  'the', 'for', 'eat', 'local', 'popular', 'eateries', 'somewhere', 'good', 'nearby', 'bars', 'pubs']);

/* Venue share images are full-size originals (often megabytes). wsrv.nl — a free, open-source
   image CDN — resizes and re-encodes them to ~40KB WebP at card size, cached at its edge. */
const sized = (u: string, w: number) =>
  `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=${w}&h=${Math.round(w * 0.75)}&fit=cover&a=attention&output=webp&q=72`;

/* All three city files are South African, and SA keeps one clock all year (UTC+2, no DST).
   "Open now" is the venue's now, never the phone's: a visitor still on London time at 23:00
   would otherwise be told a Cape Town café is open at 01:00 (CLAUDE.md §6). */
const SA_OFFSET = 120;
function venueNow(): Date {
  return new Date(Date.now() + (SA_OFFSET + new Date().getTimezoneOffset()) * 60_000);
}
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
/** Simple OSM opening_hours ("Mo-Fr 08:00-17:00; Sa 09:00-13:00") → minutes per weekday.
 *  Returns undefined for anything richer (PH, months, sunset…) rather than guess at it. */
function spans(spec: string): [number, number][][] | undefined {
  if (/^24\/7$/.test(spec.trim())) return DAYS.map(() => [[0, 24 * 60]]);
  if (/PH|SH|sunset|sunrise|week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(spec)) return undefined;
  const out: [number, number][][] = DAYS.map(() => []);
  let understood = false;
  for (const rule of spec.split(';')) {
    const m = rule.trim().match(/^([A-Za-z,\-]+)\s+((?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*,?\s*)+)$/);
    if (!m) { if (rule.trim()) return undefined; continue; }
    const days = new Set<number>();
    for (const part of m[1].split(',')) {
      const [a, b] = part.split('-').map((d) => DAYS.indexOf(d));
      if (a < 0 || (b !== undefined && b < 0)) return undefined;
      if (b === undefined) days.add(a);
      else for (let d = a; ; d = (d + 1) % 7) { days.add(d); if (d === b) break; }
    }
    for (const t of m[2].matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)) {
      const o = +t[1] * 60 + +t[2];
      let c = +t[3] * 60 + +t[4];
      if (c <= o) c += 24 * 60;
      days.forEach((d) => out[d].push([o, c]));
    }
    understood = true;
  }
  return understood ? out : undefined;
}
const hhmm = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  const d = new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
};
const dayName = (i: number) => new Intl.DateTimeFormat(undefined, { weekday: 'long' })
  .format(new Date(2024, 0, 7 + i)); // 2024-01-07 was a Sunday
/** The hours fields of a Venue, worked out from a published spec. Absent when unparseable. */
function hoursFields(spec: string | undefined): Partial<Venue> {
  const week = spec ? spans(spec) : undefined;
  if (!week) return {};
  const now = venueNow();
  const today = now.getDay();
  const min = now.getHours() * 60 + now.getMinutes();
  const yesterday = week[(today + 6) % 7].map(([o, c]) => [o - 1440, c - 1440] as [number, number]);
  const live = [...yesterday, ...week[today]].find(([o, c]) => min >= o && min < c);
  const minutesToClose = live ? live[1] - min : undefined;
  const line = (d: number) => (week[d].length
    ? week[d].map(([o, c]) => hhmm(o) + '–' + hhmm(c)).join(', ') : 'Closed');
  return {
    openNow: Boolean(live),
    closingSoon: minutesToClose !== undefined && minutesToClose <= 45,
    minutesToClose,
    closesAt: live ? hhmm(live[1]) : undefined,
    opensNext: live ? undefined : (() => {
      const later = week[today].find(([o]) => o > min);
      if (later) return hhmm(later[0]);
      for (let k = 1; k < 7; k++) {
        const s = week[(today + k) % 7][0];
        if (s) return dayName((today + k) % 7) + ' ' + hhmm(s[0]);
      }
      return undefined;
    })(),
    hoursToday: line(today),
    hoursWeekly: Array.from({ length: 7 }, (_, k) => {
      const d = (today + k) % 7;
      return dayName(d) + ': ' + line(d);
    }),
  };
}

/* A chain's branches share one website domain. One branch per brand — the nearest, since
   the list is already ranked — or the screen reads like a mall directory. Social hosts are
   not brands. */
const SOCIAL = /facebook|instagram|twitter|x\.com|tiktok|linktr|wa\.me|google\./;
function hostOf(u: string): string | undefined {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return undefined; }
}
function brandKey(v: CityVenue): string {
  try {
    const h = new URL(v.website || '').hostname.replace(/^www\./, '');
    if (h && !SOCIAL.test(h)) return h;
  } catch { /* no site */ }
  return v.name.toLowerCase().replace(/[^a-z]/g, '');
}

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
  type?: string,
): Promise<Venue[]> {
  const slug = fileFor(city, coords);
  if (!slug) return [];
  const all = await load(slug);
  /* A chain publishes ONE share image for every branch. Count how often each photo recurs: a
     photo used once is that venue's own; a shared one is brand art and is dropped, so a list
     never opens on six identical Ocean Basket cards. Delivery depots are not places to eat. */
  const uses = new Map<string, number>();
  for (const v of all) if (v.photo) uses.set(v.photo, (uses.get(v.photo) || 0) + 1);
  /* The same rule for hours: a chain site's one schema.org block is the brand's hours, not
     this branch's. A site-published spec shared by several venues is not trusted; the
     branch's own OpenStreetMap hours always are. */
  const hourUses = new Map<string, number>();
  for (const v of all) if (v.hours) hourUses.set(v.hours, (hourUses.get(v.hours) || 0) + 1);
  const specFor = (v: CityVenue) => v.osm?.opening_hours
    || (v.hours && (hourUses.get(v.hours) || 0) === 1 ? v.hours : undefined);
  const pool = all
    .filter((v) => FOODISH.test(v.category) && !NOT_FOODISH.test(v.category))
    .filter((v) => (kind === 'bar') === isBar(v.category))
    .map((v) => (v.photo && (uses.get(v.photo) || 0) > 1 ? { ...v, photo: undefined } : v));
  /* The tile's category is matched against the venue's real Overture category; typed words
     and area names against category, name and address. Before this, "Quick lunch" matched
     only a venue NAMED Lunchworks and the screen showed one card. */
  const words = query.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const stem = (w: string) => w.replace(/(es|s)$/, '');
  const cats = typeWords(type);
  const score = (v: CityVenue) => {
    let n = cats.some((c) => v.category.includes(c)) ? 2 : 0;
    const hay = `${v.category} ${v.name} ${v.address || ''}`.toLowerCase();
    if (words.some((w) => hay.includes(stem(w)))) n += 1;
    return n;
  };
  /* With no position to sort by, the place that tells you more about itself leads. */
  const rich = (v: CityVenue) => Number(!!specFor(v)) + Number(!!v.about) + Number(!!v.menu);
  const rank = (list: CityVenue[]) => list
    .map((v) => ({ v, d: coords ? km(coords, v.lat, v.lon) : 0 }))
    /* Photographed venues lead: a decision is easier over a picture. Then nearest, then confidence. */
    .sort((a, b) => Number(!!b.v.photo) - Number(!!a.v.photo) || a.d - b.d
      || rich(b.v) - rich(a.v) || (b.v.confidence ?? 0) - (a.v.confidence ?? 0))
    .map((x) => x.v);
  const scored = pool.map((v) => ({ v, s: score(v) }));
  const matched = scored.filter((x) => x.s > 0).length;
  /* Best matches first (category AND words beat either alone), each band ranked. */
  const bands = [3, 2, 1].map((n) => rank(scored.filter((x) => x.s === n).map((x) => x.v)));
  const lead = bands.flat();
  const rest = matched >= FULL ? [] : rank(scored.filter((x) => x.s === 0).map((x) => x.v));
  const seen = new Set<string>();
  const one = [...lead, ...rest].filter((v) => {
    const k = brandKey(v);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return one.slice(0, 40).map((v): Venue => ({
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
    priceTier: /^[R$€£]{1,4}$/.test(v.price || '') ? (v.price!.length as 1 | 2 | 3 | 4) : undefined,
    about: v.about,
    aboutSource: v.about && v.website ? hostOf(v.website) : undefined,
    menuUrl: v.menu,
    bookable: v.bookings || v.osm?.reservation === 'yes' || v.osm?.reservation === 'recommended'
      || v.osm?.reservation === 'required' || undefined,
    hoursSource: specFor(v) ? (v.osm?.opening_hours ? 'OpenStreetMap' : hostOf(v.website || '')) : undefined,
    ...hoursFields(specFor(v)),
  }));
}
