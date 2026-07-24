/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Menus, specials, and happy-hour windows.
 *
 * Google Places does not expose menus, specials, or happy-hour times — no tier of the
 * API returns them. Getting real data here means a per-venue source (the venue's own
 * site, or an aggregator like Zomato/Dineplan). Until that exists, this module
 * synthesises plausible content so the surface can be designed, reviewed, and used.
 *
 * Everything is DETERMINISTIC — derived from the venue id, so a given restaurant shows
 * the same menu on every render and every reload. Nothing here is random. That matters:
 * a menu that reshuffles on re-render is unusable for judging the design, and would be
 * actively dishonest in front of a user.
 *
 * Every generated value carries `isPlaceholder: true`. The UI MUST surface that — see
 * `MenuSection` in EateryView. Do not quietly render invented prices as real ones.
 */

export interface MenuItem {
  name: string;
  description: string;
  price: number;
  tags?: string[];
}

export interface MenuCourse {
  course: string;
  items: MenuItem[];
}

export interface Special {
  title: string;
  detail: string;
  /** 0 = Sunday, matching Date.getDay() */
  days: number[];
  badge?: string;
}

export interface HappyHour {
  /** 0 = Sunday, matching Date.getDay() */
  days: number[];
  startHour: number;
  endHour: number;
  headline: string;
  deals: string[];
}

export interface VenueExtras {
  isPlaceholder: true;
  menu: MenuCourse[];
  specials: Special[];
  happyHour: HappyHour | null;
}

/** Stable 32-bit hash of a string — same input always yields the same output. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pick from a list, varied by `salt` so different fields differ. */
function pick<T>(list: T[], id: string, salt: string): T {
  return list[hash(id + salt) % list.length];
}

/** Deterministic integer in [min, max]. */
function pickInt(min: number, max: number, id: string, salt: string): number {
  return min + (hash(id + salt) % (max - min + 1));
}

/**
 * Price bands in Rand, by the app's existing R/RR/RRR/RRRR tier.
 * Keeps generated prices consistent with the venue's actual price symbol.
 */
const PRICE_BANDS: Record<string, { starter: [number, number]; main: [number, number]; dessert: [number, number]; drink: [number, number] }> = {
  R:    { starter: [35, 65],   main: [70, 120],  dessert: [35, 55],  drink: [25, 45] },
  RR:   { starter: [65, 110],  main: [130, 210], dessert: [55, 85],  drink: [40, 75] },
  RRR:  { starter: [110, 165], main: [220, 340], dessert: [80, 130], drink: [65, 120] },
  RRRR: { starter: [160, 240], main: [340, 520], dessert: [110, 180], drink: [95, 180] },
};

/** Rounds to the nearest 5 — real menus don't price things at R187. */
function roundPrice(n: number): number {
  return Math.round(n / 5) * 5;
}

const STARTERS = [
  { name: 'Burrata & Heirloom Tomato', description: 'Stone-fruit vinaigrette, torn basil, olive oil from Franschhoek.' },
  { name: 'Wood-Fired Flatbread', description: 'Confit garlic, rosemary, cultured butter.' },
  { name: 'Cape Malay Fish Cakes', description: 'Smoked snoek, apricot sambal, lime.' },
  { name: 'Charred Padrón Peppers', description: 'Maldon salt, lemon, smoked aioli.' },
  { name: 'Beef Tartare', description: 'Hand-cut fillet, cured yolk, sourdough crisps.' },
  { name: 'Roasted Marrow Bone', description: 'Parsley salad, caper berries, grilled bread.' },
];

const DESSERTS = [
  { name: 'Malva Pudding', description: 'Apricot caramel, crème anglaise, burnt honey.' },
  { name: 'Dark Chocolate Tart', description: 'Salted praline, olive oil, Maldon.' },
  { name: 'Buttermilk Panna Cotta', description: 'Poached quince, toasted almond.' },
  { name: 'Amarula Basque Cheesecake', description: 'Burnt top, thick cream, nothing else.' },
];

const DRINKS = [
  { name: 'House Negroni', description: 'Batched, stirred down, orange oils.' },
  { name: 'Stellenbosch Chenin', description: 'By the glass — dry, citrus, saline finish.' },
  { name: 'Rooibos Old Fashioned', description: 'Rooibos-infused bourbon, cape gooseberry bitters.' },
  { name: 'Cold-Pressed Granadilla', description: 'No sugar added, served over crushed ice.' },
];

const SPECIAL_TEMPLATES: Omit<Special, 'days'>[] = [
  { title: 'Two-for-One Pizza', detail: 'All wood-fired pizzas, dine-in only.', badge: 'Popular' },
  { title: 'Half-Price Wine', detail: 'Every bottle under R400 on the list.', badge: 'Best value' },
  { title: 'Sunset Set Menu', detail: 'Three courses, R295 per person, seated before 18:30.' },
  { title: "Chef's Table Thursday", detail: 'Six courses at the pass, twelve seats.', badge: 'Limited' },
  { title: 'Steak & Wine Night', detail: '300g sirloin plus a glass of red, R245.' },
  { title: 'Locals Discount', detail: '20% off with a local address, all day.' },
];

const HH_HEADLINES = [
  'Sundowner Hour', 'Golden Hour', 'After Work', 'The Late Pour', 'Half-Price Hour',
];

const HH_DEALS = [
  'R45 house spirits & mixer',
  'Half-price draught',
  'R30 off every cocktail',
  'Two-for-one on the wine list by the glass',
  'R25 oysters',
  'Free bar snacks with any two drinks',
  'R60 espresso martinis',
];

/**
 * Builds the extras for a venue. Deterministic in `id`.
 *
 * `signature` / `signatureDescription` come from the venue's real data when available —
 * that dish is genuine, so it leads the menu and is the one item that is NOT invented.
 */
export function getVenueExtras(
  id: string,
  priceSymbol: string = 'RR',
  signature?: string,
  signatureDescription?: string,
): VenueExtras {
  const band = PRICE_BANDS[priceSymbol] ?? PRICE_BANDS.RR;

  const starterA = pick(STARTERS, id, 'sa');
  const starterB = pick(STARTERS.filter((s) => s.name !== starterA.name), id, 'sb');
  const dessert = pick(DESSERTS, id, 'd');
  const drinkA = pick(DRINKS, id, 'ka');
  const drinkB = pick(DRINKS.filter((d) => d.name !== drinkA.name), id, 'kb');

  const mains: MenuItem[] = [];
  if (signature) {
    mains.push({
      name: signature,
      description: signatureDescription ?? '',
      price: roundPrice(pickInt(band.main[0], band.main[1], id, 'm0')),
      tags: ['Signature'],
    });
  }
  mains.push(
    {
      name: pick(['Line Fish of the Day', 'Dry-Aged Sirloin', 'Slow Lamb Shoulder', 'Cape Malay Curry'], id, 'm1'),
      description: pick(
        ['Whatever came off the boat this morning, grilled over coals.',
         'Thirty-day aged, bone-in, salt and fire only.',
         'Six hours in the oven, falls off the bone, rosemary jus.',
         'Slow-cooked, fragrant not fiery, yellow rice and sambals.'],
        id, 'm1d',
      ),
      price: roundPrice(pickInt(band.main[0], band.main[1], id, 'm1p')),
    },
    {
      name: pick(['Roast Cauliflower Steak', 'Wild Mushroom Risotto', 'Charred Aubergine'], id, 'm2'),
      description: pick(
        ['Tahini, pomegranate, dukkah — the vegetarian dish people order on purpose.',
         'Slow-stirred, aged parmesan, truffle oil at the table.',
         'Miso glaze, sesame, spring onion.'],
        id, 'm2d',
      ),
      price: roundPrice(pickInt(band.main[0], band.main[1] - 40, id, 'm2p')),
      tags: ['Vegetarian'],
    },
  );

  const menu: MenuCourse[] = [
    {
      course: 'To Start',
      items: [starterA, starterB].map((s, i) => ({
        ...s,
        price: roundPrice(pickInt(band.starter[0], band.starter[1], id, 's' + i)),
      })),
    },
    { course: 'Mains', items: mains },
    {
      course: 'Sweet',
      items: [{ ...dessert, price: roundPrice(pickInt(band.dessert[0], band.dessert[1], id, 'dp')) }],
    },
    {
      course: 'Drinks',
      items: [drinkA, drinkB].map((d, i) => ({
        ...d,
        price: roundPrice(pickInt(band.drink[0], band.drink[1], id, 'k' + i)),
      })),
    },
  ];

  // 1–2 specials, on deterministic days.
  const specialCount = 1 + (hash(id + 'sc') % 2);
  const specials: Special[] = [];
  for (let i = 0; i < specialCount; i++) {
    const tpl = pick(SPECIAL_TEMPLATES, id, 'sp' + i);
    if (specials.some((s) => s.title === tpl.title)) continue;
    const startDay = hash(id + 'spd' + i) % 7;
    specials.push({ ...tpl, days: [startDay, (startDay + 3) % 7] });
  }

  // ~70% of venues run a happy hour.
  const hasHH = hash(id + 'hh') % 10 < 7;
  let happyHour: HappyHour | null = null;
  if (hasHH) {
    const startHour = pickInt(15, 18, id, 'hhs');
    const dealA = pick(HH_DEALS, id, 'hha');
    const dealB = pick(HH_DEALS.filter((d) => d !== dealA), id, 'hhb');
    happyHour = {
      days: pick([[1, 2, 3, 4, 5], [3, 4, 5], [4, 5, 6], [0, 1, 2, 3, 4, 5, 6], [2, 3, 4, 5]], id, 'hhd'),
      startHour,
      endHour: startHour + pickInt(2, 3, id, 'hhe'),
      headline: pick(HH_HEADLINES, id, 'hhh'),
      deals: [dealA, dealB],
    };
  }

  return { isPlaceholder: true, menu, specials, happyHour };
}

export interface HappyHourStatus {
  state: 'live' | 'starting-soon' | 'later-today' | 'another-day';
  /** Minutes until it ends (live) or starts (upcoming). */
  minutes: number;
  label: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtHour(h: number): string {
  const hh = h % 24;
  return `${String(hh).padStart(2, '0')}:00`;
}

/** Human summary of which days a window runs, e.g. "Mon–Fri" or "Thu, Fri, Sat". */
export function formatDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) {
    return `${DAY_NAMES[sorted[0]]}–${DAY_NAMES[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
}

/**
 * Where a happy hour sits relative to `now`.
 *
 * This is the core of the Happy Hour tab's UX: the only question that matters is
 * "can I get there in time", so everything resolves to minutes remaining.
 */
export function getHappyHourStatus(hh: HappyHour, now: Date = new Date()): HappyHourStatus {
  const day = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const startMin = hh.startHour * 60;
  const endMin = hh.endHour * 60;
  const runsToday = hh.days.includes(day);

  if (runsToday && minutesNow >= startMin && minutesNow < endMin) {
    const left = endMin - minutesNow;
    return {
      state: 'live',
      minutes: left,
      label: left >= 60
        ? `Ends ${fmtHour(hh.endHour)} · ${Math.floor(left / 60)}h ${left % 60}m left`
        : `Ends in ${left} min`,
    };
  }

  if (runsToday && minutesNow < startMin) {
    const until = startMin - minutesNow;
    if (until <= 90) {
      return { state: 'starting-soon', minutes: until, label: `Starts in ${until} min` };
    }
    return { state: 'later-today', minutes: until, label: `Today ${fmtHour(hh.startHour)}–${fmtHour(hh.endHour)}` };
  }

  // Next day it runs.
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (hh.days.includes(d)) {
      return {
        state: 'another-day',
        minutes: i * 24 * 60,
        label: `${i === 1 ? 'Tomorrow' : DAY_NAMES[d]} ${fmtHour(hh.startHour)}–${fmtHour(hh.endHour)}`,
      };
    }
  }
  return { state: 'another-day', minutes: Infinity, label: formatDays(hh.days) };
}

/** Sort order for the Happy Hour tab: live first (ending soonest last), then soonest upcoming. */
const STATE_RANK: Record<HappyHourStatus['state'], number> = {
  live: 0, 'starting-soon': 1, 'later-today': 2, 'another-day': 3,
};

export function compareHappyHour(a: HappyHourStatus, b: HappyHourStatus): number {
  const r = STATE_RANK[a.state] - STATE_RANK[b.state];
  if (r !== 0) return r;
  // Within "live", show the ones with most time left first — you can still make those.
  return a.state === 'live' ? b.minutes - a.minutes : a.minutes - b.minutes;
}
