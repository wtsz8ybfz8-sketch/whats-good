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
}

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];
const MON_THU = [1, 2, 3, 4];

const CTM = 'https://www.capetownmagazine.com/happy-hours';
const CTM_LABEL = 'Cape Town Magazine';

export const CAPE_TOWN_HAPPY_HOURS: CuratedHappyHour[] = [
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
  },
  {
    venue: 'Cargo',
    area: 'Tamboerskloof · 158 Kloof St',
    days: MON_THU,
    startHour: 16,
    endHour: 18,
    headline: 'After Work',
    deals: ['R20 house red, white, rosé or beer', 'R20 tequila shots'],
    source: CTM,
    sourceLabel: CTM_LABEL,
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
  },
];

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
