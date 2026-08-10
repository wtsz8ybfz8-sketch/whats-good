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
   * Google's own one-line description of the place (Places `editorialSummary`). Absent
   * for most venues — the render site drops the "What Google says" module rather than
   * substituting a generated sentence, which is the whole point of §8: no field, no
   * module. Attributed out loud at the render site, because unattributed it would read
   * as our recommendation thesis, which we have not earned.
   */
  editorialSummary?: string;
  /** Confirmed meals, tri-state. See MealKey. Absent when Google published none. */
  meals?: Partial<Record<MealKey, boolean>>;
  /** Service/atmosphere attributes, tri-state. See VenueAttributeKey. */
  attributes?: Partial<Record<VenueAttributeKey, boolean>>;
  /**
   * Optional on purpose. This was `rating: number` fed by `place.rating ?? 4.0`, so a
   * venue Google holds no rating for was handed a 4.0 and rendered it beside a star as
   * though it had been earned — an invented fact, and one the sort read back. Unknown is
   * now absent, and every render site guards on `typeof rating === 'number'`.
   */
  rating?: number;
  /**
   * How many ratings the average is built from. A 4.9 from 3 people is not a 4.9, and
   * Google publishes both. Same Enterprise SKU as `rating`, which the search already
   * requests, so this adds no billing tier. Absent when `rating` is.
   */
  userRatingCount?: number;
  /**
   * The whole week, localised, rotated so the venue's today is index 0. Built from
   * `regularOpeningHours.weekdayDescriptions`, which the search already fetches — no new
   * field, no billing change. Absent when Google returns no weekly hours; the render
   * site falls back to the single `hoursToday` line.
   */
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
  /**
   * True only when the venue published its own site. Places has no website for many
   * venues, so `externalLink` falls back to a Google Maps *search* for the name — a
   * useful link, but not the venue's site, and labelling it "Official website" told
   * the user something we had not been told. Render sites branch on this rather than
   * on the presence of a URL, because a URL is always present.
   */
  hasOwnWebsite?: boolean;
  /** Optional: Places does not guarantee a location. Callers must handle absence
   *  rather than cast it away — a NaN distance sorts unpredictably. */
  latitude?: number;
  longitude?: number;
  phone: string;
  estimatedWait: string;
  photoUrl?: string; // Optional override for dynamic sources (e.g. Google Places)
  openNow?: boolean; // Live from Google Places; undefined for hardcoded fallback entries
  /**
   * True when the venue is open now AND its published hours say it closes within the
   * next ~45 minutes (see `isClosingSoon` in placesService.ts). Always `false` when
   * `openNow` isn't `true` — render sites should still guard on `openNow` first, since
   * `false` here also covers "we don't know" for a closed or unconfigured venue.
   */
  closingSoon?: boolean;
  hoursToday?: string; // e.g. "9:00 AM – 10:00 PM"; from Google Places
  /**
   * "Quiet" / "Lively" / "Packed" — not currently populated. Google Places (New) does
   * not publish a live-popularity field, so nothing sets this today; the type exists so
   * a future data source can fill it without a render-site change. Cards must already
   * render nothing when it's absent, which is every venue right now.
   */
  busyLevel?: 'quiet' | 'lively' | 'packed';
}
