/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * REAL Cape Town happy hours — curated, not synthesised.
 *
 * Google Places publishes no happy-hour data at any tier, so there is no live feed to
 * pull. These are real venues with their actual, publicly-listed happy-hour windows,
 * hand-collected from Cape Town Magazine's happy-hour guide and other local listings
 * (see `source` on each entry). Confirmed July 2026.
 *
 * Happy-hour times change — a venue can move or drop a window without updating a
 * listing. The UI says "confirm before you go" for exactly that reason. This is real
 * data, honestly caveated — not invented placeholders.
 *
 * Day numbers match Date.getDay(): 0 = Sunday … 6 = Saturday.
 */

import type { HappyHour } from './venueExtras';

export interface CuratedHappyHour extends HappyHour {
  venue: string;
  area: string;
  /** Where the listing came from, shown to the user so the claim is checkable. */
  source: string;
  sourceLabel: string;
  /**
   * `YYYY-MM` — the month this window was last checked against its source. Per-entry,
   * not a global string, so re-confirming one venue does not imply every other was.
   * Required (see `isUsable`): a new row cannot enter without stating its own freshness,
   * and `STALE_AFTER_MONTHS` turns an ageing date into a visible "confirm again" flag
   * instead of a silent, rotting claim.
   */
  verifiedOn: string;
}

/** A window last confirmed longer ago than this is shown with a staleness caveat. */
export const STALE_AFTER_MONTHS = 6;

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];
const MON_THU = [1, 2, 3, 4];

const CTM = 'https://www.capetownmagazine.com/happy-hours';
const CTM_LABEL = 'Cape Town Magazine';

/**
 * The city this curated set covers. Coverage is a property of the DATA, not a string
 * typed into a view — HappyHourView used to compare against a hardcoded 'cape town',
 * so when the app stopped defaulting the city to Cape Town the tab silently went
 * empty for every user on earth and nothing pointed at why.
 */
export const HAPPY_HOUR_CITY = 'Cape Town';

/**
 * Authored strictly, so `tsc` still refuses a malformed row at author time. The runtime
 * filter below is the SECOND gate, not a replacement for this one.
 */
const CURATED: CuratedHappyHour[] = [
  {
    venue: 'Woodstock Brewery',
    area: 'Woodstock · 252 Albert Rd',
    days: DAILY,
    startHour: 16,
    endHour: 18,
    headline: 'Brewery Hour',
    deals: ['R70 for two Born Slippy draughts', 'R35 a single draught'],
    source: CTM,
    sourceLabel: CTM_LABEL,
    verifiedOn: '2026-07',
  },
  {
    venue: 'Down South Food Bar',
    area: 'Rondebosch · Main Centre',
    days: DAILY,
    startHour: 17,
    endHour: 19,
    headline: 'The Late Pour',
    deals: ['R15 shots', 'R32 Black Label draught', 'Cocktails from R40'],
    source: CTM,
    sourceLabel: CTM_LABEL,
    verifiedOn: '2026-07',
  },
  {
    venue: 'Café Extrablatt',
    area: 'Green Point · Exhibition Building',
    days: MON_FRI,
    startHour: 17,
    endHour: 20,
    headline: 'Sundowner Hour',
    deals: ['R45 cocktails', 'R33 mocktails', 'Wine & beer specials'],
    source: CTM,
    sourceLabel: CTM_LABEL,
    verifiedOn: '2026-07',
  },
  {
    venue: 'Gusto Urban Italian',
    area: 'Century City · Bridgewater',
    days: MON_FRI,
    startHour: 17,
    endHour: 19,
    headline: 'Golden Hour',
    deals: ['2-for-1 beer & wine (Mon–Thu)', '2-for-1 cocktails (Fri)'],
    source: CTM,
    sourceLabel: CTM_LABEL,
    verifiedOn: '2026-07',
  },
  {
    venue: 'SurfaRosa',
    area: 'District Six · 61a Harrington St',
    days: DAILY,
    startHour: 15,
    endHour: 18,
    headline: 'Happy Hour',
    deals: ['Rotating daily drink specials'],
    source: CTM,
    sourceLabel: CTM_LABEL,
    verifiedOn: '2026-07',
  },
  {
    venue: 'The Slug & Lettuce',
    area: 'Gardens · Kloof St',
    days: DAILY,
    startHour: 17,
    endHour: 19,
    headline: 'Half-Price Hour',
    deals: ['R27 draughts', 'R20 bottled beer', 'R15 tequila', 'R25 wine'],
    source: 'https://secretcapetown.co.za/happy-hour-specials-in-cape-town/',
    sourceLabel: 'Secret Cape Town',
    verifiedOn: '2026-07',
  },
  {
    venue: 'Bossa',
    area: 'Multiple locations',
    days: DAILY,
    startHour: 16,
    endHour: 18,
    headline: 'Golden Hour',
    deals: ['R59 cocktails & jars'],
    source: 'https://www.food-blog.co.za/tag/happy-hour-specials-cape-town/',
    sourceLabel: 'Food Blog SA',
    verifiedOn: '2026-07',
  },
  {
    venue: 'Time Out Market Cape Town',
    area: 'Foreshore · Old Power Station',
    days: MON_FRI,
    startHour: 16,
    endHour: 18,
    headline: 'Market Hour',
    deals: ['30% off house beer, wine & selected cocktails'],
    source: 'https://www.timeout.com/time-out-market-cape-town/things-to-do/happy-hour',
    sourceLabel: 'Time Out Market',
    verifiedOn: '2026-07',
  },
];

/**
 * ONE MALFORMED ROW MUST NEVER TAKE DOWN THE TAB.
 *
 * This file is hand-edited — that is the point of it (§8: if it isn't confirmed, don't
 * render it), and it is edited directly on GitHub as often as in an editor. On
 * 2026-08-01 a venue that had permanently closed was removed by deleting its fields and
 * leaving `{}` behind in the array. Everything downstream dereferences those fields
 * without asking, so `mapsUrl` threw on `area.split` of undefined, the render died, and
 * the whole Happy Hour tab became the error boundary for every user.
 *
 * `tsc` DID catch it — CI went red on that commit and the one after it. It shipped
 * anyway, because `npm run build` is `vite build` and Vercel therefore deploys code the
 * typecheck has already rejected. A red CI run is not a deploy gate, and until it is,
 * the type gate cannot be the only thing standing between a hand-edit and a dead tab.
 *
 * So every row is validated before anything reads it. A row missing a field the UI
 * dereferences is dropped with a console warning naming the index and the fields; the
 * rest still render. Losing one venue is a bad afternoon. Losing the tab is what this
 * prevents.
 */
const REQUIRED_TEXT = ['venue', 'area', 'headline', 'source', 'sourceLabel', 'verifiedOn'] as const;

function isUsable(h: Partial<CuratedHappyHour>, i: number): h is CuratedHappyHour {
  const missing: string[] = [];

  if (!h || typeof h !== 'object') {
    console.warn(`[happyHourData] Dropping entry ${i}: not an object.`);
    return false;
  }
  for (const k of REQUIRED_TEXT) {
    if (typeof h[k] !== 'string' || !(h[k] as string).trim()) missing.push(k);
  }
  // `days` and `deals` are both mapped over directly in the view.
  if (!Array.isArray(h.days) || h.days.length === 0) missing.push('days');
  if (!Array.isArray(h.deals) || h.deals.length === 0) missing.push('deals');
  // Hours drive every status calculation; NaN would silently poison the sort.
  if (typeof h.startHour !== 'number' || !Number.isFinite(h.startHour)) missing.push('startHour');
  if (typeof h.endHour !== 'number' || !Number.isFinite(h.endHour)) missing.push('endHour');

  if (missing.length === 0) return true;
  console.warn(
    `[happyHourData] Dropping entry ${i} (${h.venue ?? 'unnamed'}) — missing or invalid: ${missing.join(', ')}`,
  );
  return false;
}

export const CAPE_TOWN_HAPPY_HOURS: CuratedHappyHour[] = CURATED.filter(isUsable);

/**
 * Months between a `YYYY-MM` verified date and now. Used to decide whether a window is
 * shown with a "confirm again" caveat. A malformed date returns Infinity — treated as
 * stale, never as fresh, because the safe failure here is to under-trust our own claim.
 */
export function monthsSinceVerified(verifiedOn: string, now: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})$/.exec(verifiedOn);
  if (!m) return Infinity;
  const then = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(then.getTime())) return Infinity;
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

/** True when a window is old enough that the user should re-check before travelling. */
export function isStale(h: CuratedHappyHour, now: Date = new Date()): boolean {
  return monthsSinceVerified(h.verifiedOn, now) >= STALE_AFTER_MONTHS;
}

/** Human month label for a `YYYY-MM` string, localised, e.g. "Jul 2026". Empty on junk. */
export function formatVerified(verifiedOn: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(verifiedOn);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d);
}

/** Google Maps directions link for a venue — a real, useful action from each row. */
export function mapsUrl(venue: string, area: string): string {
  const q = encodeURIComponent(`${venue} ${area.split('·')[0].trim()} Cape Town`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Case-insensitive lookup so a venue's own detail page can show its real window. */
export function findCuratedHappyHour(venueName: string): CuratedHappyHour | undefined {
  const n = venueName.trim().toLowerCase();
  return CAPE_TOWN_HAPPY_HOURS.find(
    (h) => n === h.venue.toLowerCase() || n.includes(h.venue.toLowerCase()) || h.venue.toLowerCase().includes(n),
  );
}
