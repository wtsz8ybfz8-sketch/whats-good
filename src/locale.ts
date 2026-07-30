/**
 * One place that knows where the user is and how they read.
 *
 * This module exists because the app kept making the same mistake in new costumes.
 * First it assumed a country (Cape Town venues, Rand prices). Those were removed — and
 * `languageCode: 'en'` was still hardcoded into the Places request, distance was still
 * formatted with `toFixed(1)`, and opening hours were still rendered in whatever format
 * an English API response happened to use. A German standing in London got "1.4 km" for
 * what they read as "1,4 km", and "9:00 AM – 10:00 PM" for what they read as
 * "09:00–22:00". Nothing was wrong, and every line of it was slightly foreign.
 *
 * The rule: never hardcode a locale, a separator, a clock format or a language. Derive
 * from the browser, which already knows.
 */

/** The user's resolved locale, e.g. "de-DE". Falls back to the browser default. */
export function userLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.languages?.[0] || navigator.language || 'en';
}

/**
 * A BCP-47 language tag for the Places `languageCode` field.
 *
 * Google localises `primaryTypeDisplayName` and `weekdayDescriptions` from this, so it is
 * the difference between "Italian restaurant" and "Italienisches Restaurant" for a user
 * whose phone is in German.
 */
export function placesLanguageCode(): string {
  return userLocale();
}

/**
 * Distance, formatted the way the reader writes numbers.
 *
 * `${dist.toFixed(1)} km` produces "1.4 km" for everyone, including the ~half the world
 * that writes "1,4". Intl also picks the unit's correct spacing and short form per locale.
 */
/**
 * Regions that read road distance in miles.
 *
 * The US, Liberia and Myanmar are imperial outright; the UK is metric on paper and
 * miles on every road sign and in every "how far is it" conversation, so a British
 * reader gets miles too. Everywhere else: kilometres.
 *
 * `Intl` will not choose this for you — `style: 'unit'` formats whatever unit you name,
 * so a hardcoded 'kilometer' stays kilometres in New York no matter how correct the
 * surrounding locale plumbing is. That was the bug: the NUMBER was localised from
 * navigator.language and the UNIT never was, so a New Yorker was told a place was
 * "1.4 km" away. §6 bans hardcoding how the user reads; a unit is part of that.
 */
const MILE_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);
const KM_PER_MILE = 1.609344;

function usesMiles(locale: string): boolean {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return !!region && MILE_REGIONS.has(region);
  } catch {
    return false; // Unknown locale: metric, which is most of the world.
  }
}

export function formatDistance(km: number, locale = userLocale()): string {
  if (!Number.isFinite(km)) return '';
  try {
    const miles = usesMiles(locale);
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: miles ? 'mile' : 'kilometer',
      unitDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(miles ? km / KM_PER_MILE : km);
  } catch {
    // Intl unit style is well supported but not universal; never let formatting throw
    // away a real fact.
    return `${km.toFixed(1)} km`;
  }
}

/**
 * A plain number for a human to read: ingredient quantities, scale multipliers.
 *
 * `toFixed` is a serialiser, not a formatter — it always emits a `.` and always pads to
 * a fixed width, so a scaled recipe read "0.5 tsp" and "Scaled x1.5" to the half of the
 * world that writes "0,5" and "x1,5". `Intl` picks the right decimal separator, and
 * `maximumFractionDigits` drops the trailing zeros that the old `.replace(/\.0$/,'')`
 * had to strip by hand.
 */
export function formatQuantity(n: number, maxDecimals = 2, locale = userLocale()): string {
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDecimals }).format(n);
  } catch {
    return String(Math.round(n * 100) / 100);
  }
}

/** True when this locale reads a 24-hour clock. Germany does; the US does not. */
export function prefersH24(locale = userLocale()): boolean {
  try {
    const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).formatToParts(
      new Date(2020, 0, 1, 13, 0),
    );
    return !parts.some((p) => p.type === 'dayPeriod');
  } catch {
    return true;
  }
}

/**
 * Rewrites the clock times inside a Places hours string to the reader's convention.
 *
 * Google returns `weekdayDescriptions` already localised when `languageCode` is set, but
 * the CLOCK format follows the language, not the user — an en-GB response is 12-hour
 * even though Britain reads 24. Rather than re-implement time parsing, this rewrites only
 * the recognisable `h:mm AM/PM` tokens and leaves everything else — dashes, "Closed",
 * "Open 24 hours", any script — exactly as the API sent it.
 */
export function localiseHours(text: string, locale = userLocale()): string {
  if (!text || !prefersH24(locale)) return text;
  return text.replace(/\b(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?/g, (_m, h, min, ap) => {
    let hour = parseInt(h, 10) % 12;
    if (ap.toLowerCase() === 'p') hour += 12;
    return `${String(hour).padStart(2, '0')}:${min}`;
  });
}

/**
 * Strips the leading day name from a Places `weekdayDescriptions` line.
 *
 * The old expression anchored on one-or-more ASCII letters followed by a colon, which
 * worked only while the request was hardcoded to English. It matches "Monday:" and "Montag:", but not "月曜日:" or
 * "الاثنين:" — so localising the request would have left the day name rendered raw in
 * every non-Latin script. Everything before the first colon is the day label in every
 * language Google returns.
 */
export function stripDayPrefix(line: string): string {
  const i = line.indexOf(':');
  // A bare "12:00 – 22:00" has a colon too, so only strip when what precedes it contains
  // no digits — i.e. it is a word, not a time.
  if (i > 0 && !/\d/.test(line.slice(0, i))) return line.slice(i + 1).trim();
  return line;
}

/**
 * "Today" in the VENUE's timezone, as a Monday-first index.
 *
 * `new Date().getDay()` is the device's timezone. A German whose phone is still on
 * Europe/Berlin, standing in London at 23:30, is on tomorrow's date in Berlin and would
 * have been shown tomorrow's opening hours for a pub they are looking at. Places returns
 * `utcOffsetMinutes` per place; when we have it, the day is computed where the venue is.
 */
export function venueDayIndex(utcOffsetMinutes?: number): number {
  const now = new Date();
  const jsDay =
    typeof utcOffsetMinutes === 'number'
      ? new Date(now.getTime() + (utcOffsetMinutes + now.getTimezoneOffset()) * 60_000).getDay()
      : now.getDay();
  return (jsDay + 6) % 7; // Google's weekdayDescriptions array is Monday-first.
}
