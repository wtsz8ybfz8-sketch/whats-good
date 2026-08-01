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
/*
 * The venue-extras synthesiser used to live here: PRICE_BANDS in Rand, tables of
 * invented starters, desserts and drinks, and getVenueExtras(), which hashed a venue id
 * into a menu with prices and rendered it under a small grey disclaimer. That output was
 * removed from the UI, but the machinery and its Rand price tables stayed in the tree —
 * ~130 lines that compiled, shipped in the bundle, and sat one import away from being
 * switched back on by anyone who saw an exported function and assumed it was safe.
 *
 * Deleted. CLAUDE.md 8 is unambiguous: if it is not confirmed, do not render it. Code
 * whose only purpose is to fabricate a fact is not neutral just because nothing calls it
 * today. What remains in this file is the happy-hour status logic, which operates on
 * real, human-confirmed windows from happyHourData.ts.
 */

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
  const runsToday = hh.days?.includes(day) ?? false;

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
    if (hh.days?.includes(d)) {
      return {
        state: 'another-day',
        minutes: i * 24 * 60,
        label: `${i === 1 ? 'Tomorrow' : DAY_NAMES[d]} ${fmtHour(hh.startHour)}–${fmtHour(hh.endHour)}`,
      };
    }
  }
  return { state: 'another-day', minutes: Infinity, label: formatDays(hh.days ?? []) };
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
