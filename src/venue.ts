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

export interface Venue {
  id: string;
  name: string;
  address: string;
  cuisine: string;
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
  photoUrl?: string; // Optional override for dynamic sources (e.g. Google Places)
  /**
   * Additional Places photos, hero excluded, for the venue page's gallery strip
   * (prototype `.gal`). Empty or absent whenever Google published fewer than two
   * photos — the strip is omitted rather than padded with placeholders.
   */
  galleryUrls?: string[];
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
