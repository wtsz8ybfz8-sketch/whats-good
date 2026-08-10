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

function place(id, name, address, lat, lng, opts = {}) {
  return {
    id,
    displayName: { text: name, languageCode: 'en' },
    formattedAddress: address,
    location: { latitude: lat, longitude: lng },
    // No `?? 4.4` default: `rating: undefined` must be reachable, because the app used to
    // invent 4.0 and nothing could catch it. `rating` and `userRatingCount` are spread
    // only when present, so a venue Google holds no rating for renders no star at all.
    ...(opts.rating !== undefined ? { rating: opts.rating } : {}),
    ...(opts.userRatingCount !== undefined ? { userRatingCount: opts.userRatingCount } : {}),
    /* `null` means Places published no band, exactly as it does for phone and website
       below. It defaulted to MODERATE on every fixture, so no venue in this suite could
       ever reach the no-price path — and the Spend tile, alone of the three "at a glance"
       tiles, was built ungated and rendered as a heading over empty space. A user
       photographed it on a real device. A fixture that cannot express absence hides the
       branch that handles absence. */
    ...(opts.priceLevel === null
      ? {}
      : { priceLevel: opts.priceLevel ?? 'PRICE_LEVEL_MODERATE' }),
    primaryType: opts.primaryType ?? 'italian_restaurant',
    primaryTypeDisplayName: { text: opts.cuisine ?? 'Italian restaurant' },
    photos: [{ name: `places/${id}/photos/fixture` }],
    // `null` means "Places published no such field", which is different from "the
    // fixture author did not override the default". Both are common in real responses
    // and the app must render differently for each, so the fixture has to be able to
    // express absence — until it could, every fixture venue had a phone and a site and
    // the phoneless/siteless branches were unreachable from the suite.
    ...(opts.phone === null ? {} : { nationalPhoneNumber: opts.phone ?? '020 7946 0018' }),
    ...(opts.website === null ? {} : { websiteUri: opts.website ?? 'https://example.invalid/venue' }),
    // `hours: null` drops the whole block — a venue Places has an address for but no
    // published hours. Then neither the today line nor the all-week disclosure renders,
    // and openNow falls to undefined (its own real third state). Otherwise a full seven
    // lines, which is what powers the weekly-hours disclosure.
    ...(opts.hours === null
      ? {}
      : {
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
        }),
    // editorialSummary + the serving/atmosphere booleans are absent by default, exactly
    // as they are for the many venues nobody has surveyed — so a fixture with neither
    // (pl-6) exercises the "What Google says" / "Good to know" modules NOT rendering. A
    // venue that wants them passes `editorial` (string) and/or `profile` (the raw Places
    // boolean keys). `profile` may carry a `false` on purpose — a confirmed "no" that must
    // NOT show as a chip, which is the tri-state the whole block is built to protect.
    ...(opts.editorial ? { editorialSummary: { text: opts.editorial, languageCode: 'en' } } : {}),
    ...(opts.profile ?? {}),
  };
}

export const PLACES = [
  // Rated AND counted: exercises the star + parenthesised rating-count render, and the
  // full-week hours disclosure.
  place('pl-1', 'Trattoria Sorella', '18 Rupert Street, London W1D 6DE, UK', 51.5119, -0.1341, {
    openNow: true,
    rating: 4.4,
    userRatingCount: 1284,
    // The full profile: exercises "What Google says" AND "Good to know". `servesBreakfast:
    // false` is deliberate — a confirmed "no" that must render NO chip, proving the block
    // reads `=== true` and never turns an unknown (or a false) into a claim.
    editorial: 'A snug Soho trattoria for handmade pasta and Barolo by the glass.',
    profile: {
      servesBreakfast: false,
      servesLunch: true,
      servesDinner: true,
      servesDessert: true,
      outdoorSeating: true,
      reservable: true,
      servesVegetarianFood: true,
      goodForGroups: true,
    },
  }),
  place('pl-2', 'Kaya Ramen Bar', '4 Newburgh Street, London W1F 7RF, UK', 51.5136, -0.1385, {
    cuisine: 'Ramen restaurant',
    primaryType: 'ramen_restaurant',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    openNow: false,
    rating: 4.6,
    // A small count on purpose: 4.6 from 12 is not 4.6 from 1200, and the count is how
    // the reader tells them apart.
    userRatingCount: 12,
  }),
  // NO RATING AT ALL — Google holds none. Exercises the removal of the invented 4.0 and
  // the guarded star in both EateryView and RecipeView: an unguarded render puts a star
  // beside nothing here. No userRatingCount either, since there is nothing to count.
  place('pl-3', 'Maison Verte', '77 Rue Oberkampf, 75011 Paris, France', 48.8649, 2.3765, {
    cuisine: 'French restaurant',
    primaryType: 'french_restaurant',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    // openNow deliberately absent — §8 says undefined is a real third state and must
    // not be collapsed into "Closed" by a truthy check.
    // rating deliberately absent for the same reason.
    phone: '01 43 57 12 90',
    // Editorial summary present, but NO profile booleans — a venue Google describes in
    // prose yet has surveyed no meals/attributes for. Proves "What Google says" and "Good
    // to know" are independent: the first renders, the second stays gone.
    editorial: 'A candlelit Oberkampf wine bar with a short, seasonal natural-wine list.',
  }),
  place('pl-4', 'Casa Lolita', 'Carrer de Blai 22, 08004 Barcelona, Spain', 41.3736, 2.1637, {
    cuisine: 'Tapas restaurant',
    primaryType: 'tapas_restaurant',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    openNow: true,
    rating: 4.3,
  }),
  place('pl-5', 'Aoyama Soba House', '3 Chome Minamiaoyama, Minato City, Tokyo, Japan', 35.6654, 139.7126, {
    cuisine: 'Japanese restaurant',
    primaryType: 'japanese_restaurant',
    priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE',
    openNow: true,
    rating: 4.7,
  }),
  /**
   * The thin listing: Places knows this venue exists and nothing else about how to
   * reach it. Real responses look like this constantly — small venues, new listings,
   * anywhere Google has an address but no claimed profile.
   *
   * It exists because the venue page shipped a Call pillar wired to `tel:` with an
   * empty number and an empty accessible name, and labelled a Google Maps *search*
   * URL "Official website". Both were invisible while every fixture venue carried a
   * phone and a site.
   */
  place('pl-6', 'Hoxton Steam Buns', '41 Kingsland Road, London E2 8AG, UK', 51.5285, -0.0765, {
    cuisine: 'Chinese restaurant',
    primaryType: 'chinese_restaurant',
    // No band either. This is the thin listing Places returns constantly — an address and
    // very little else — so it is the right venue to carry every absence at once.
    priceLevel: null,
    rating: 4.5,
    phone: null,
    website: null,
    // No hours at all — Places has the address and nothing else. Covers the no-hours path:
    // neither the today line nor the all-week disclosure may render, and openNow is left
    // undefined rather than forced to a value.
    hours: null,
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
