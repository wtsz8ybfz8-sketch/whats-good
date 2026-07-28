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
    rating: opts.rating ?? 4.4,
    priceLevel: opts.priceLevel ?? 'PRICE_LEVEL_MODERATE',
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
  place('pl-1', 'Trattoria Sorella', '18 Rupert Street, London W1D 6DE, UK', 51.5119, -0.1341, {
    openNow: true,
  }),
  place('pl-2', 'Kaya Ramen Bar', '4 Newburgh Street, London W1F 7RF, UK', 51.5136, -0.1385, {
    cuisine: 'Ramen restaurant',
    primaryType: 'ramen_restaurant',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    openNow: false,
    rating: 4.6,
  }),
  place('pl-3', 'Maison Verte', '77 Rue Oberkampf, 75011 Paris, France', 48.8649, 2.3765, {
    cuisine: 'French restaurant',
    primaryType: 'french_restaurant',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    // openNow deliberately absent — §8 says undefined is a real third state and must
    // not be collapsed into "Closed" by a truthy check.
    rating: 4.8,
    phone: '01 43 57 12 90',
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
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    openNow: true,
    rating: 4.5,
    phone: null,
    website: null,
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
