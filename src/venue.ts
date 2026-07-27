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
  vibeMatch: string;
  fallbackDistance: string; // shown when geolocation is denied
  rating: number;
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
