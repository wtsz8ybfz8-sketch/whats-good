/**
 * The shape of a venue.
 *
 * This file used to be `campusData.ts` and carried a 460-line hardcoded list of Cape
 * Town restaurants — the app's origin, still being served as "fallback data" to every
 * user on earth. That list is gone: a user in London does not want a Gardens brasserie,
 * and a venue nobody can walk to is not a fallback, it is a wrong answer wearing a
 * confident face. What remains is the type, which is genuinely country-neutral.
 *
 * Every field here is populated from what Google Places actually returns. Nothing in
 * this file assumes a country, a currency or a hemisphere.
 */

/**
 * The meals a venue is confirmed to serve.
 *
 * Tri-state on purpose, and it must stay that way. Google publishes these as booleans
 * that are ABSENT when unknown, so `false` ("does not serve breakfast") and `undefined`
 * ("nobody has said") are different answers — the same distinction §8.3 already forces
 * on `openNow`. Collapsing them with a truthiness check would quietly turn "unknown"
 * into "no" across every venue that has never been surveyed, which is most of them.
 * Render sites show the confirmed-true meals and say so; they never render a `false`
 * as an absence or an `undefined` as a denial.
 */
export type MealKey =
  | 'breakfast'
  | 'brunch'
  | 'lunch'
  | 'dinner'
  | 'dessert'
  | 'coffee';

/** Atmosphere/service attributes, same tri-state contract as MealKey above. */
export type VenueAttributeKey =
  | 'dineIn'
  | 'takeout'
  | 'delivery'
  | 'outdoorSeating'
  | 'reservable'
  | 'servesVegetarianFood'
  | 'goodForChildren'
  | 'goodForGroups';

export interface Venue {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  vibeMatch: string;
  fallbackDistance: string; // shown when geolocation is denied
  /**
   * Optional, and that is the fix — this was `rating: number` fed by
   * `place.rating ?? 4.0`, so a venue Google holds no rating for was given a 4.0 and
   * rendered it beside a star as though it had been earned. An invented rating is the
   * §8 failure the synthesised menus were: a template presented as knowledge, and this
   * one sorts and ranks. Unknown is now absent and the render sites omit the field.
   */
  rating?: number;
  /** How many ratings the average is built from. A 4.9 from 3 people is not a 4.9. */
  userRatingCount?: number;
  /** Google's own one-line description of the place. Absent for most venues. */
  editorialSummary?: string;
  /** Confirmed meals, tri-state. See MealKey. */
  meals?: Partial<Record<MealKey, boolean>>;
  /** Service/atmosphere attributes, tri-state. See VenueAttributeKey. */
  attributes?: Partial<Record<VenueAttributeKey, boolean>>;
  /** The whole week, localised, venue-local day order. Powers the hours disclosure. */
  hoursWeekly?: string[];
  /**
   * Price band as a tier count, 1–4, mirroring the Google Places priceLevel enum.
   * Was `'R' | 'RR' | 'RRR' | 'RRRR'` — the Rand glyph repeated, with the tier read
   * back out via `.length`. The count is the signal and it means the same thing
   * everywhere; the glyph is a presentation decision made at render time.
   */
  priceTier?: 1 | 2 | 3 | 4;
  signatureOrder: string;
  signatureDescription: string;
  signatureIngredients: string[];
  digestiveNote: string;
  externalLink: string;
  /** Optional: Places does not guarantee a location. Callers must handle absence
   *  rather than cast it away — a NaN distance sorts unpredictably. */
  latitude?: number;
  longitude?: number;
  phone: string;
  estimatedWait: string;
  photoUrl?: string; // Optional override for dynamic sources (e.g. Google Places)
  openNow?: boolean; // Live from Google Places; undefined for hardcoded fallback entries
  hoursToday?: string; // e.g. "9:00 AM – 10:00 PM"; from Google Places
}
