/**
 * Google Places (New) fixtures.
 *
 * places.googleapis.com is unreachable from this container, and the app needs an API
 * key present before it will even try. Between those two facts, no venue list and no
 * venue detail page had ever been rendered here. The driver supplies a dummy key via
 * VITE_GOOGLE_PLACES_KEY and this file answers the request.
 *
 * The venues are deliberately NOT in one country: the regression these fixtures exist
 * to catch is the app assuming a country (Phase 1), and a single-country fixture set
 * would hide exactly that bug.
 */

/**
 * `rating` and every profile field below are spread from `opts` ONLY when present.
 *
 * That matters more than it looks. Google omits these keys entirely for venues nobody
 * has surveyed — which is most of them — so a fixture where every venue carries every
 * field would exercise only the happy path and could never fail a fallback bug. The
 * venues below are therefore deliberately uneven: one fully profiled, one with explicit
 * `false` values, one with no rating at all, one attributes-only, one bare. If a render
 * site ever starts assuming a field is present, one of those five turns red.
 */
function place(id, name, address, lat, lng, opts = {}) {
  return {
    id,
    displayName: { text: name, languageCode: 'en' },
    formattedAddress: address,
    location: { latitude: lat, longitude: lng },
    // No `?? 4.4` default: `rating: undefined` must be reachable, because the app used
    // to invent 4.0 here and nothing could catch it.
    ...(opts.rating !== undefined ? { rating: opts.rating } : {}),
    ...(opts.userRatingCount !== undefined ? { userRatingCount: opts.userRatingCount } : {}),
    ...(opts.editorialSummary !== undefined
      ? { editorialSummary: { text: opts.editorialSummary, languageCode: 'en' } }
      : {}),
    ...(opts.profile ?? {}),
    priceLevel: opts.priceLevel ?? 'PRICE_LEVEL_MODERATE',
    primaryType: opts.primaryType ?? 'italian_restaurant',
    primaryTypeDisplayName: { text: opts.cuisine ?? 'Italian restaurant' },
    photos: [{ name: `places/${id}/photos/fixture` }],
    nationalPhoneNumber: opts.phone ?? '020 7946 0018',
    websiteUri: opts.website ?? 'https://example.invalid/venue',
    regularOpeningHours: {
      openNow: opts.openNow,
      weekdayDescriptions: [
        'Monday: 12:00 – 22:00',
        'Tuesday: 12:00 – 22:00',
        'Wednesday: 12:00 – 22:00',
        'Thursday: 12:00 – 23:00',
        'Friday: 12:00 – 23:30',
        'Saturday: 11:00 – 23:30',
        'Sunday: 11:00 – 21:00',
      ],
    },
  };
}

export const PLACES = [
  // FULLY PROFILED — every new field present. The only venue that exercises the complete
  // detail card: editorial summary, six confirmed meals, a full attribute set.
  place('pl-1', 'Trattoria Sorella', '18 Rupert Street, London W1D 6DE, UK', 51.5119, -0.1341, {
    openNow: true,
    rating: 4.4,
    userRatingCount: 1284,
    editorialSummary:
      'Handmade pasta and Italian classics served in a snug, low-lit room off Rupert Street.',
    profile: {
      servesBreakfast: true,
      servesBrunch: true,
      servesLunch: true,
      servesDinner: true,
      servesDessert: true,
      servesCoffee: true,
      dineIn: true,
      takeout: true,
      delivery: false,
      outdoorSeating: true,
      reservable: true,
      servesVegetarianFood: true,
      goodForChildren: true,
      goodForGroups: true,
    },
  }),
  // TRI-STATE — explicit `false` values mixed with `true` and with absent keys. This is
  // the venue that fails if anything filters these on truthiness instead of `=== true`,
  // or renders a confirmed-no as a confirmed-yes.
  place('pl-2', 'Kaya Ramen Bar', '4 Newburgh Street, London W1F 7RF, UK', 51.5136, -0.1385, {
    cuisine: 'Ramen restaurant',
    primaryType: 'ramen_restaurant',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    openNow: false,
    rating: 4.6,
    userRatingCount: 96,
    // No editorialSummary — that module must disappear rather than fall back to prose.
    profile: {
      servesBreakfast: false,
      servesBrunch: false,
      servesLunch: true,
      servesDinner: true,
      // servesDessert / servesCoffee absent: unknown, and must not render as either.
      dineIn: true,
      takeout: true,
      reservable: false,
      goodForGroups: false,
    },
  }),
  // NO RATING AT ALL — Google holds none. Exercises the removal of the invented 4.0 and
  // the guarded star in both EateryView and RecipeView; an unguarded render puts a star
  // beside nothing here.
  place('pl-3', 'Maison Verte', '77 Rue Oberkampf, 75011 Paris, France', 48.8649, 2.3765, {
    cuisine: 'French restaurant',
    primaryType: 'french_restaurant',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    // openNow deliberately absent — §8 says undefined is a real third state and must
    // not be collapsed into "Closed" by a truthy check.
    // rating deliberately absent for the same reason.
    phone: '01 43 57 12 90',
  }),
  // ATTRIBUTES BUT NO MEALS — the "Good to know" block must render with one half only,
  // not draw an empty "Confirmed meals" heading above nothing.
  place('pl-4', 'Casa Lolita', 'Carrer de Blai 22, 08004 Barcelona, Spain', 41.3736, 2.1637, {
    cuisine: 'Tapas restaurant',
    primaryType: 'tapas_restaurant',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    openNow: true,
    rating: 4.3,
    userRatingCount: 7,
    profile: { outdoorSeating: true, goodForGroups: true, servesVegetarianFood: true },
  }),
  // BARE — no profile fields whatsoever, which is what most real venues return. The
  // detail page for this one must still be complete and honest: every new module absent,
  // nothing invented to fill the space.
  place('pl-5', 'Aoyama Soba House', '3 Chome Minamiaoyama, Minato City, Tokyo, Japan', 35.6654, 139.7126, {
    cuisine: 'Japanese restaurant',
    primaryType: 'japanese_restaurant',
    priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE',
    openNow: true,
    rating: 4.7,
  }),
];

export const SEARCH_TEXT_RESPONSE = { places: PLACES };

/** searchNearby, used by detectCityFromCoords — returns a locality + country code. */
export const NEARBY_RESPONSE = {
  places: [
    {
      displayName: { text: 'Soho' },
      addressComponents: [
        { shortText: 'London', types: ['locality'] },
        { shortText: 'GB', types: ['country'] },
      ],
    },
  ],
};
