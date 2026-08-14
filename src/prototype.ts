/**
 * docs/design/occasion-prototype.html — its <script> block, as the application.
 *
 * The prototype IS the product now. Its markup lives verbatim in index.html, its CSS
 * verbatim in prototype.css, and its logic verbatim below. Every structure the prototype
 * had — the four tabs, the three periods, the six occasions per period per tab, the
 * sliding time pill, the freeform parse line, the area chips, the sliders, the results
 * column, the venue detail with its gallery/facts/hours/socials, the Saved email gate —
 * is here and working.
 *
 * WHAT IS DIFFERENT, AND ONLY THIS:
 *
 * 1. Venues are REAL. `NAMES`/`BLURB` were fourteen invented restaurants; the results
 *    column and the detail view now come from Google Places via `fetchVenues`, using the
 *    key this project already pays for.
 * 2. Photographs are REAL. `.ph` panels were procedural gradients standing in for
 *    photography. They now carry Places photos, and fall back to the prototype's own
 *    neutral panel when Google has no image for a venue.
 * 3. Recipes are REAL, from TheMealDB, which this project already integrates.
 * 4. Two invented-fact blocks are rendered ONLY from confirmed data, and omitted
 *    entirely when it is absent, rather than being filled in: the "Known for" dish list
 *    (the prototype hardcoded four dishes WITH PRICES) and the "Plan B" line (the
 *    prototype asserted "usually full by 20:00" about places it invented). A fake price
 *    sends someone across town for something that does not exist — that is the one rule
 *    in this codebase that outranks matching the prototype pixel for pixel, and the
 *    prototype's own note calls its content "illustrative only".
 */
import './prototype.css';
import { fetchVenues } from './placesService';
/*
 * The app reads numbers to a person, so it never serialises one by hand.
 *
 * `toFixed` is a serialiser: it always emits a `.` and always pads to a fixed width.
 * The distance readout under the slider said "2.0 km" to every reader on earth,
 * including the half who write "2,0", and it said kilometres to readers who think in
 * miles. Both of these helpers already existed in locale.ts, fully tested — nothing
 * imported them, which is the only reason the bug survived (CLAUDE.md §6).
 */
import { formatDistance, formatQuantity } from './locale';
import {
  isAuthConfigured, sendMagicLink, captureSessionFromUrl, restoreSession, signOut,
  type AuthSession,
} from './auth';
import {
  readLocal, writeLocal, addRemote, removeRemote, mergeLocalIntoRemote,
} from './savedStore';
import type { Venue } from './venue';

/* ── verbatim: brand glyph paths ─────────────────────────────────────────────── */
const IG = "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077";
const WA = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";
const GM = "M19.527 4.799c1.212 2.608.937 5.678-.405 8.173-1.101 2.047-2.744 3.74-4.098 5.614-.619.858-1.244 1.75-1.669 2.727-.141.325-.263.658-.383.992-.121.333-.224.673-.34 1.008-.109.314-.236.684-.627.687h-.007c-.466-.001-.579-.53-.695-.887-.284-.874-.581-1.713-1.019-2.525-.51-.944-1.145-1.817-1.79-2.671L19.527 4.799zM8.545 7.705l-3.959 4.707c.724 1.54 1.821 2.863 2.871 4.18.247.31.494.622.737.936l4.984-5.925-.029.01c-1.741.601-3.691-.291-4.392-1.987a3.377 3.377 0 0 1-.209-.716c-.063-.437-.077-.761-.004-1.198l.001-.007zM5.492 3.149l-.003.004c-1.947 2.466-2.281 5.88-1.117 8.77l4.785-5.689-.058-.05-3.607-3.035zM14.661.436l-3.838 4.563a.295.295 0 0 1 .027-.01c1.6-.551 3.403.15 4.22 1.626.176.319.323.683.377 1.045.068.446.085.773.012 1.22l-.003.016 3.836-4.561A8.382 8.382 0 0 0 14.67.439l-.009-.003zM9.466 5.868L14.162.285l-.047-.012A8.31 8.31 0 0 0 11.986 0a8.439 8.439 0 0 0-6.169 2.766l-.016.018 3.665 3.084z";
const TA = "M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.072 1.598 6 6 0 0 0 6-5.998 5.982 5.982 0 0 0-1.957-4.432L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.255c1.531 0 3.063.303 4.504.903C13.943 8.138 12 10.43 12 13.1c0-2.671-1.942-4.962-4.504-5.942A11.72 11.72 0 0 1 12 6.256zM6.002 9.157a4.059 4.059 0 1 1 0 8.118 4.059 4.059 0 0 1 0-8.118zm11.992.002a4.057 4.057 0 1 1 .003 8.115 4.057 4.057 0 0 1-.003-8.115zm-11.992 1.93a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256zm11.992 0a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256z";

/* ── verbatim: icon set ──────────────────────────────────────────────────────── */
const I: Record<string, string> = {
  cup: '<path d="M4 8h13v5a5 5 0 0 1-10 0V8Z"/><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17"/><path d="M6 4c0-.8.8-1 .8-2M10 4c0-.8.8-1 .8-2"/>',
  laptop: '<rect x="4" y="5" width="16" height="10" rx="1.5"/><path d="M2 19h20"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1 1-1.4 1-2.4S8 3 8 3M12 6.5c0-1 1-1.4 1-2.4S12 2.6 12 2.6"/>',
  candle: '<path d="M8 21h8M12 21v-6"/><path d="M9 9.5C9 12 10.3 15 12 15s3-3 3-5.5S12.8 4 12 3c-.8 1-3 4-3 6.5Z"/>',
  spark: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m6.7 6.7 3 3M14.3 14.3l3 3M17.3 6.7l-3 3M9.7 14.3l-3 3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',
  shop: '<path d="M4 9h16v11H4z"/><path d="M3 9l1.5-5h15L21 9"/><path d="M9 20v-6h6v6"/>',
  seed: '<path d="M12 20v-7"/><path d="M12 13c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7Z"/><path d="M12 15c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5Z"/>',
  glass: '<path d="M5 4h14l-7 8z"/><path d="M12 12v7M8.5 19h7"/>',
  kids: '<circle cx="9" cy="7" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="11" r="2.2"/><path d="M14.5 20c0-2 1.1-3.5 2.5-3.5s2.5 1.5 2.5 3.5"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2"/>',
  sundown: '<path d="M3 19h18M6.5 19a5.5 5.5 0 0 1 11 0"/><path d="M12 4v2.5M4.9 7.4l1.8 1.8M19.1 7.4l-1.8 1.8"/>',
  fire: '<path d="M12 21c3.3 0 6-2.4 6-5.5 0-4-4-5.5-3-9.5-3 1-6 4.2-6 8 0 1.2.5 2.3 1.3 3-.2-2 .7-3.5 1.7-4.3-.6 3 3 3.6 3 6.3 0 1-.9 2-2 2Z"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',
  note2: '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  disco: '<circle cx="12" cy="13" r="6.5"/><path d="M12 6.5V3"/><path d="M5.5 13h13M12 6.5c2 2 2 11 0 13M12 6.5c-2 2-2 11 0 13"/>',
  roof: '<path d="M3 20h18"/><path d="M5 20V9l7-5 7 5v11"/><path d="M10 20v-5h4v5"/>',
  quiet: '<path d="M4 8h4l5-4v16l-5-4H4z"/><path d="M17 9.5a4 4 0 0 1 0 5"/>',
  pot: '<path d="M4 9h16v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z"/><path d="M2 11h2M20 11h2M9 5.5c0-1 1-1.3 1-2.3M14 5.5c0-1 1-1.3 1-2.3"/>',
  knife: '<path d="M4 20 20 4"/><path d="M14 4h6v6"/><path d="M4 14v6h6"/>',
  clock2: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  leaf: '<path d="M4 20c0-8 6-14 16-14 0 10-6 14-16 14Z"/><path d="M9 15c1.5-3 4-5 7-6"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 5.5v15"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.5 12 20 12 20Z"/>',
  star: '<path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8Z"/>',
};

/* ── verbatim: cities, their local words and their neighbourhoods ────────────── */
const CITY: Record<string, { tz: string; areas: string[]; v: Record<string, string> }> = {
  'Cape Town': {
    tz: 'SAST', areas: ['Sea Point', 'Long Street', 'City Bowl', 'Woodstock', 'V&A', 'Observatory'],
    v: { coffee: 'Coffee & a laptop', brunch: 'Slow morning', cheap: 'Cheap & cheerful', drinks: 'Sundowners', local: 'Neighbourhood', lunchdeal: 'Quick lunch', fire: 'Braai', late: 'Late night', happy: 'Sundowner specials' },
  },
  London: {
    tz: 'GMT', areas: ['Soho', 'Shoreditch', 'Peckham', 'Borough', 'Hackney', 'Marylebone'],
    v: { coffee: 'Coffee & a laptop', brunch: 'Slow morning', cheap: 'Cheap & cheerful', drinks: 'After work', local: 'Local', lunchdeal: 'Long lunch', fire: 'Sunday roast', late: 'Late night', happy: 'Happy hour' },
  },
  Paris: {
    tz: 'CET', areas: ['Le Marais', 'Belleville', 'Pigalle', 'Canal St-Martin', 'Bastille', 'Montmartre'],
    v: { coffee: 'Café & travail', brunch: 'Matinée tranquille', cheap: 'Petits prix', drinks: 'Apéro', local: 'Le quartier', lunchdeal: 'Formule midi', fire: 'Terrasse', late: 'Service tardif', happy: "L'apéro" },
  },
  'New York': {
    tz: 'EST', areas: ['Lower East Side', 'Williamsburg', 'West Village', 'Harlem', 'Astoria', 'Bed-Stuy'],
    v: { coffee: 'Coffee & a laptop', brunch: 'Slow morning', cheap: 'Cheap & cheerful', drinks: 'Happy hour', local: 'The neighborhood', lunchdeal: 'Quick lunch', fire: 'Sunday spread', late: 'Late slice', happy: 'Happy hour' },
  },
};

/* ── verbatim: occasion glyph + one-line description ─────────────────────────── */
const D: Record<string, [string, string]> = {
  coffee: ['laptop', 'Wifi, a plug, no rush'], brunch: ['cup', 'Eggs, sun, nowhere to be'],
  cheap: ['wallet', 'Cheap, and still good'], drinks: ['sundown', 'Eat later, maybe'],
  local: ['shop', 'Close, easy, reliable'], lunchdeal: ['plate', 'On the board today'],
  fire: ['fire', 'Long, slow, outdoors'], late: ['moon', "Kitchen's still open"],
  comfort: ['bowl', 'Warm, filling, no fuss'], date: ['candle', 'Low light, worth dressing up'],
  celebrate: ['spark', 'Push the boat out'], nu: ['seed', 'Opened this year'],
  family: ['kids', 'Loud is fine here'], happy: ['clock2', 'On now, ends soon'],
  cocktails: ['glass', 'Made by someone who can'], live: ['note2', 'Playing tonight'],
  dance: ['disco', 'Late, loud, no seats'], quietdrink: ['quiet', 'You can hear each other'],
  roof: ['roof', 'Outside, up high'],
  quick30: ['clock2', 'On the table in 30'], onepot: ['pot', 'One pan, one wash-up'],
  pantry: ['knife', "From what you've got"], veg: ['leaf', 'No meat, no effort'],
  batch: ['plate', 'Cook once, eat thrice'], baking: ['fire', 'Weekend project'],
  recent: ['clock2', 'Seen lately'], loved: ['heart', 'You saved these'],
  lists: ['book', 'Your lists'], been: ['star', 'Been and rated'],
};

/**
 * NOT in the prototype, and required to make it work: what each occasion actually ASKS
 * Google. The prototype never issued a query — it filtered an array of invented names —
 * so this is the mapping that turns each tile into a real search.
 */
const QUERY: Record<string, string> = {
  coffee: 'cafe with wifi', brunch: 'brunch', cheap: 'cheap eats', drinks: 'bar',
  local: 'neighbourhood restaurant', lunchdeal: 'lunch', fire: 'grill barbecue',
  late: 'late night restaurant', comfort: 'comfort food', date: 'romantic restaurant',
  celebrate: 'fine dining', nu: 'new restaurant', family: 'family friendly restaurant',
  happy: 'happy hour bar', cocktails: 'cocktail bar', live: 'live music bar',
  dance: 'nightclub', quietdrink: 'quiet bar', roof: 'rooftop bar',
};

/** Which occasions are bars rather than restaurants — drives `fetchVenues`' phrasing. */
const BAR_KEYS = new Set(['drinks', 'happy', 'cocktails', 'live', 'dance', 'quietdrink', 'roof']);

/** Cook occasions → a TheMealDB search term. Replaces the prototype's six fake recipes. */
const COOK_QUERY: Record<string, string> = {
  quick30: 'chicken', onepot: 'stew', pantry: 'pasta', veg: 'vegetarian', batch: 'curry', baking: 'cake',
};

/* ── verbatim: tabs, their heroes, their periods and their occasions ─────────── */
const TABS = [
  {
    k: 'eat', n: 'Eat out', h: "What's <em>good</em> right now?", s: 'Pick the occasion, or just tell us what you\'re after.',
    per: [{ k: 'am', n: 'Morning', t: '05–11', keys: ['brunch', 'coffee', 'local', 'cheap', 'family', 'nu'] },
      { k: 'mid', n: 'Midday', t: '11–17', keys: ['lunchdeal', 'local', 'fire', 'cheap', 'family', 'coffee'] },
      { k: 'pm', n: 'Evening', t: '17–late', keys: ['date', 'comfort', 'drinks', 'celebrate', 'local', 'late'] }],
  },
  {
    k: 'out', n: 'Out', h: "Where's <em>good</em> tonight?", s: 'Same idea, different night. Pick the kind of evening.',
    per: [{ k: 'am', n: 'Early', t: '12–17', keys: ['quietdrink', 'roof', 'local', 'cheap', 'coffee', 'live'] },
      { k: 'mid', n: 'Sundown', t: '17–21', keys: ['happy', 'drinks', 'roof', 'cocktails', 'live', 'quietdrink'] },
      { k: 'pm', n: 'Late', t: '21–late', keys: ['dance', 'cocktails', 'live', 'late', 'drinks', 'quietdrink'] }],
  },
  {
    k: 'cook', n: 'Cook', h: "What's <em>good</em> to cook?", s: "By how much time and effort you've actually got.",
    per: [{ k: 'am', n: 'Breakfast', t: '05–11', keys: ['quick30', 'onepot', 'pantry', 'veg', 'batch', 'baking'] },
      { k: 'mid', n: 'Lunch', t: '11–17', keys: ['quick30', 'pantry', 'veg', 'batch', 'onepot', 'baking'] },
      { k: 'pm', n: 'Dinner', t: '17–late', keys: ['onepot', 'quick30', 'veg', 'batch', 'baking', 'pantry'] }],
  },
  {
    k: 'saved', n: 'Saved', h: 'What you <em>kept</em>.', s: 'Everything you kept, and what it says about you.',
    per: [{ k: 'am', n: 'Recent', t: '7 days', keys: ['recent', 'loved', 'lists', 'been', 'local', 'nu'] },
      { k: 'mid', n: 'Lists', t: 'all', keys: ['lists', 'loved', 'been', 'recent', 'local', 'nu'] },
      { k: 'pm', n: 'Been', t: 'history', keys: ['been', 'loved', 'lists', 'recent', 'local', 'nu'] }],
  },
];

/* ── verbatim: freeform intent parsing ───────────────────────────────────────── */
const RULES: [RegExp, { occ: string; party?: number; price?: number; note: string }][] = [
  [/stag|bachelor|hen|bucks/i, { occ: 'drinks', party: 8, note: 'big group · drinks · late' }],
  [/hotel/i, { occ: 'cocktails', note: 'hotel bars' }],
  [/park|garden|outside|outdoor|terrace/i, { occ: 'local', note: 'outdoor seating' }],
  [/vegan|vegetarian|plant/i, { occ: 'veg', note: 'vegan · vegetarian' }],
  [/ramen|noodle|sushi|japanese/i, { occ: 'comfort', note: 'japanese' }],
  [/cheap|budget|broke|affordable/i, { occ: 'cheap', price: 0, note: 'low spend' }],
  [/birthday|anniversary|celebrat/i, { occ: 'celebrate', note: 'celebrating' }],
  [/quiet|talk|catch up/i, { occ: 'quietdrink', note: 'quiet enough to talk' }],
  [/late|after midnight|2am/i, { occ: 'late', note: 'open late' }],
  [/kid|child|family|baby/i, { occ: 'family', party: 5, note: 'family friendly' }],
  [/date|romantic/i, { occ: 'date', party: 2, note: 'date night' }],
  [/coffee|work|laptop|wifi/i, { occ: 'coffee', note: 'laptop friendly' }],
];

const $ = (id: string) => document.getElementById(id)!;
const LS = {
  get: (k: string) => { try { return JSON.parse(localStorage.getItem('wg_' + k) || 'null'); } catch { return null; } },
  set: (k: string, v: unknown) => { try { localStorage.setItem('wg_' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
/* The list on screen. Its BACKING STORE depends on whether anyone is signed in: this
   browser's localStorage when they are not, their account when they are (see
   savedStore.ts). The variable is the same either way so every Save button stays one
   line of code. */
const saved: { places: string[]; recipes: string[] } = readLocal();
/** Null until a session is restored or a magic link is followed. */
let session: AuthSession | null = null;
let savedSeg: 'places' | 'recipes' = 'places';
const isSaved = (t: 'places' | 'recipes', n: string) => saved[t].includes(n);
function toggleSave(t: 'places' | 'recipes', n: string, el?: HTMLElement) {
  /* Saving used to bounce you to a sign-in gate that could not save anything anywhere.
     It saves. */
  const i = saved[t].indexOf(n);
  const adding = i < 0;
  if (adding) saved[t].push(n); else saved[t].splice(i, 1);
  writeLocal(saved);
  if (el) el.setAttribute('aria-pressed', String(adding));
  /* Optimistic: the button flips now and the account catches up. A save that waits on a
     round trip on a phone outside a restaurant feels broken. */
  if (session) {
    (adding ? addRemote(session, t, n) : removeRemote(session, t, n))
      .catch(() => { /* the local copy still holds it; the next sign-in merges it up */ });
  }
}
const PR = ['Low', 'Mid', 'High', 'Top'];
const DIST: (number | 'any')[] = [0.5, 1, 2, 3, 5, 8, 'any'];

/* The prototype hardcoded `hour=19` so it could be demoed at any time of day. The select
   stays exactly as it was — it is one of the parts — but it now OPENS on the real local
   hour, because an app that always thinks it is 19:00 is not working. */
let hour = new Date().getHours();
let city = 'Cape Town', tab = 'eat', period = 'pm', picked: string | null = null, manual = false;

/** Live venues for the current query. The prototype's `NAMES`/`BLURB` arrays are gone. */
let venues: Venue[] = [];
/** The TheMealDB records behind the cards on screen — search.php returns the full
 *  record, so opening one costs no second request. */
interface Meal {
  strMeal: string; strMealThumb: string; strCategory: string; strArea: string;
  strInstructions?: string; strTags?: string; strYoutube?: string; strSource?: string;
}
let recipes: Meal[] = [];
let loadSeq = 0;

Object.keys(CITY).forEach((c) => { const o = document.createElement('option'); o.textContent = c; $('city').appendChild(o); });
for (let h = 0; h < 24; h++) {
  const o = document.createElement('option');
  o.value = String(h);
  o.textContent = String(h).padStart(2, '0') + ':00';
  if (h === hour) o.selected = true;
  $('hour').appendChild(o);
}

const auto = (h: number) => (h < 11 ? 'am' : h < 17 ? 'mid' : 'pm');
const T = () => TABS.find((t) => t.k === tab)!;
const icon = (k: string) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + I[k] + '</svg>';
const FALL: Record<string, string> = {
  comfort: 'Comfort', date: 'Date night', celebrate: 'Celebrating', nu: 'Something new', family: 'With the kids',
  cocktails: 'Cocktails', live: 'Live music', dance: 'Dancing', quietdrink: 'Quiet drink', roof: 'Rooftop',
  quick30: 'Under 30 min', onepot: 'One pot', pantry: 'Pantry raid', veg: 'Vegetarian', batch: 'Batch cook', baking: 'Baking',
  recent: 'Recent', loved: 'Loved', lists: 'Lists', been: 'Been',
};
const label = (k: string) => CITY[city].v[k] || FALL[k] || k;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** A `.ph` that carries a real photograph, or the prototype's neutral panel if none. */
/* The URL sits inside a double-quoted style attribute, so it MUST be wrapped in single
   quotes — JSON.stringify used double quotes, which closed the attribute at the first
   character of the URL. Every photo in the app rendered as an empty grey panel because
   of it: the class landed (so the "Image" caption was suppressed) but the
   background-image never did. Percent-encode the two characters that could still break
   out. */
const phStyle = (url?: string) =>
  (url ? " has-photo\" style=\"background-image:url('" + url.replace(/'/g, '%27').replace(/"/g, '%22') + "')" : '');

/* The no-photo state. Google returns venues with no photograph at all, and TheMealDB has
   gaps too — so this is a state the product is in regularly, not an edge case. The old
   answer was the word "Image", which reads as an unfinished build. Gradients are banned
   (§7) and documentation shots from OSM/Wikimedia were rejected by name, so the honest
   move is typographic: the venue's own monogram, set in the neutral palette, treated as
   a deliberate plate rather than a hole where a picture failed. */
const monogram = (name?: string) => (name || '')
  .replace(/^(the|le|la|el)\s+/i, '')
  .split(/[\s&·-]+/).filter(Boolean).slice(0, 2)
  .map((w) => w[0]).join('').toUpperCase() || '·';

/* The landing screen used to be the ONE screen with no photograph — the hero only took
   one once results arrived, so the first impression of a product whose whole pitch is
   photography was a flat dark box. One Places search per city, cached for the session, is
   enough to dress it: a real place in the city you are actually in, not stock. */
const heroCache: Record<string, string> = {};
async function heroPreview() {
  const k = city + '|' + tab;
  if (heroCache[k]) { heroPhoto(heroCache[k]); return; }
  const out = await fetchVenues(
    tab === 'out' ? 'popular bar' : 'well reviewed restaurant',
    city, undefined, undefined, tab === 'out' ? 'bar' : 'restaurant',
  );
  if (out.status !== 'ok') return;
  const url = out.venues.find((v) => v.photoUrl)?.photoUrl;
  /* Only if the user has not since picked an occasion — its own photo outranks this one. */
  if (url && !picked) { heroCache[k] = url; heroPhoto(url); }
}

/** Dresses the hero with a photograph, or returns it to its plain plate. */
function heroPhoto(url?: string) {
  const h = $('hero');
  if (url) {
    h.classList.add('has-photo');
    h.style.backgroundImage = "url('" + url.replace(/'/g, '%27') + "')";
  } else {
    h.classList.remove('has-photo');
    h.style.backgroundImage = '';
  }
}

/** Every `.ph` panel in the app: a real photograph, or its monogram plate. */
const phAttrs = (url?: string, name?: string, extra = '') =>
  'class="' + (extra ? extra + ' ' : '') + 'ph' + phStyle(url) + '"'
  + (url ? '' : ' data-mono="' + esc(monogram(name)) + '"');

function tabs() {
  $('tabs').innerHTML = '';
  TABS.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'tab'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(t.k === tab));
    b.textContent = t.n;
    b.onclick = () => { tab = t.k; manual = false; period = auto(hour); build(); };
    $('tabs').appendChild(b);
  });
}

function periods() {
  const P2 = T().per, now = auto(hour), i = P2.findIndex((p) => p.k === period);
  const el = $('time');
  [...el.querySelectorAll('.per')].forEach((n) => n.remove());
  P2.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'per'; b.type = 'button';
    b.setAttribute('aria-pressed', String(p.k === period));
    b.innerHTML = '<u>' + p.t + '</u><b>' + p.n + (p.k === now ? ' <em>Now</em>' : '') + '</b>';
    b.onclick = () => { period = p.k; manual = (p.k !== now); build(); };
    el.appendChild(b);
  });
  ($('glide') as HTMLElement).style.transform = 'translateX(' + (i * 100) + '%)';
}

function build() {
  const t = T(), C = CITY[city], P2 = t.per.find((p) => p.k === period) || t.per[0];
  document.body.dataset.view = 'browse';
  /* Two clocks used to disagree on screen: the header select said 23:00 while this line
     said 23:24 — because it spliced the SELECTED hour onto the LIVE minutes. Now it is one
     or the other, and it says which: the live time when the app set the period itself, and
     an explicit "planning for" when the hour was chosen by hand. */
  const nowT = new Date();
  $('ctx').textContent = manual
    ? city + ' · planning for ' + String(hour).padStart(2, '0') + ':00 ' + C.tz
    : city + ' · ' + String(nowT.getHours()).padStart(2, '0') + ':'
      + String(nowT.getMinutes()).padStart(2, '0') + ' ' + C.tz;
  $('h1').innerHTML = t.h;
  $('hsub').textContent = t.s;
  $('why').textContent = manual ? 'you chose this' : 'set by the clock';
  $('geo').textContent = 'detected in ' + city;
  $('lbl').textContent = tab === 'cook' ? 'How much effort' : 'The occasion';
  tabs();
  if (tab === 'saved') { renderSaved(); return; }
  const sw = document.getElementById('savedwrap'); if (sw) sw.style.display = 'none';
  ($('refine') as HTMLElement).style.display = tab === 'cook' ? 'none' : '';
  ($('time') as HTMLElement).style.display = '';
  ($('stage') as HTMLElement).style.display = '';
  (document.querySelector('.search') as HTMLElement).style.display = '';
  ($('parsed') as HTMLElement).style.display = '';
  periods();
  picked = null; venues = []; heroPhoto(undefined);
  /* heroPreview() is DELIBERATELY NOT CALLED ON ARRIVAL any more. It cost one billed
     Places search per tab switch and per city change, purely to dress the hero before the
     user had asked for anything — and on 2026-08-14 the project hit
     "Quota exceeded ... SearchTextRequest per day", which takes the whole app down. A
     decorative request must never compete with the request the user is waiting for. The
     hero still takes a photograph, from the results of the search they actually trigger. */
  $('refine').classList.remove('on');
  $('rt').textContent = 'Nothing picked yet';
  $('rc').textContent = '';
  $('list').innerHTML = '<p class="empty">' + (tab === 'cook' ? "Pick how much effort you've got." : "Pick an occasion, or just type what you're after.") + '</p>';
  $('grid').innerHTML = '';
  P2.keys.forEach((k, i) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    /* The tile plate carries the occasion's own monogram, so the top half is composed
       rather than void — the same plate the venue cards use, one system. */
    b.innerHTML = '<span ' + phAttrs(undefined, label(k)) + '></span><span class="ring"></span>'
      + '<span class="bd">' + icon(D[k][0]) + '<span><span class="nm">' + esc(label(k)) + '</span><span class="ds">' + esc(D[k][1]) + '</span></span></span>';
    b.onclick = () => pick(k, b);
    $('grid').appendChild(b);
    setTimeout(() => b.classList.add('in'), 60 + i * 44);
  });
  const A = $('areas'); A.innerHTML = '';
  C.areas.forEach((a) => {
    const c = document.createElement('button');
    c.className = 'chip'; c.type = 'button';
    c.textContent = a; c.setAttribute('aria-pressed', 'false');
    c.onclick = () => { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); render(); };
    A.appendChild(c);
  });
}

function renderSaved() {
  ($('time') as HTMLElement).style.display = 'none';
  ($('stage') as HTMLElement).style.display = 'none';
  (document.querySelector('.search') as HTMLElement).style.display = 'none';
  ($('parsed') as HTMLElement).style.display = 'none';
  let h = document.getElementById('savedwrap');
  if (!h) { h = document.createElement('div'); h.id = 'savedwrap'; $('time').parentNode!.insertBefore(h, $('time')); }
  h.style.display = '';
  /* Three states, and each one says only what is true of it.
     The old gate said "They stay on your account, on every device" while accepting any
     string with an @ in it and writing to localStorage — an account that did not exist.
     Now: no credentials configured → device-only, said plainly. Configured and signed
     out → a REAL magic link, and saving still works meanwhile. Signed in → the account is
     the source of truth and the list follows you. Signing in is an upgrade, never a toll
     gate: nothing is withheld until you do it. */
  const total = saved.places.length + saved.recipes.length;
  const head = session
    ? '<div class="who"><b>' + esc(session.email) + '</b>'
        + '<span>' + total + ' saved · synced to your account, on every device</span>'
        + '<button class="savebtn" id="so">Sign out</button></div>'
    : isAuthConfigured()
      ? '<div class="who"><b>Kept on this device</b>'
          + '<span>' + total + ' saved · sign in to carry them to your phone</span>'
          + '<form id="sif" class="siform"><input id="em" type="email" required '
          + 'placeholder="you@email.com" autocomplete="email" aria-label="Email address">'
          + '<button id="si" type="submit">Email me a link</button></form>'
          + '<span id="simsg" class="simsg" role="status"></span></div>'
      : '<div class="who"><b>Kept on this device</b>'
          + '<span>' + total + ' saved · this browser only, nothing sent anywhere</span></div>';
  const list = saved[savedSeg];
  h.innerHTML = head
    + '<div class="segs" style="margin-top:16px">'
      + '<button class="seg" data-s="places" aria-pressed="' + (savedSeg === 'places') + '">Places · ' + saved.places.length + '</button>'
      + '<button class="seg" data-s="recipes" aria-pressed="' + (savedSeg === 'recipes') + '">Recipes · ' + saved.recipes.length + '</button></div>'
    + (list.length ? '<div class="grid">' + list.map((n) =>
        '<button class="tile in" type="button" aria-pressed="false"><span ' + phAttrs(undefined, n) + '></span><span class="ring"></span>'
        + '<span class="bd"><span><span class="nm">' + esc(n) + '</span><span class="ds">' + (savedSeg === 'places' ? 'Saved place' : 'Saved recipe') + '</span></span></span></button>').join('') + '</div>'
      : '<p class="empty">Nothing saved under ' + savedSeg + ' yet. Tap Save on anything and it lands here.</p>');
  h.querySelectorAll('.seg').forEach((b) => { (b as HTMLElement).onclick = () => { savedSeg = (b as HTMLElement).dataset.s as 'places' | 'recipes'; renderSaved(); }; });

  const form = document.getElementById('sif') as HTMLFormElement | null;
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = ($('em') as HTMLInputElement).value.trim();
      const btn = $('si') as HTMLButtonElement;
      const msg = $('simsg');
      btn.disabled = true; msg.textContent = 'Sending…';
      const out = await sendMagicLink(email);
      btn.disabled = false;
      /* The confirmation names the address, because "check your email" is useless if the
         typo is the reason nothing arrives. */
      msg.textContent = out.ok
        ? 'Link sent to ' + email + '. Open it on any device and your list comes with you.'
        : (out.error || 'That did not send. Try again in a moment.');
      msg.className = 'simsg' + (out.ok ? ' ok' : ' bad');
    };
  }
  const so = document.getElementById('so');
  if (so) {
    so.onclick = () => {
      signOut(); session = null;
      /* The list stays on the device it was signed out on — it is still theirs, and it is
         still on the account. Wiping it here would look like a punishment for signing out. */
      renderSaved();
    };
  }
}

/** True while `parse()` is choosing the tile, so `pick` knows not to clear the query. */
let parseDriven = false;

function pick(k: string, el: HTMLElement) {
  document.querySelectorAll('.tile').forEach((t) => t.setAttribute('aria-pressed', 'false'));
  el.setAttribute('aria-pressed', 'true');
  el.classList.remove('pop'); void (el as HTMLElement).offsetWidth; el.classList.add('pop');
  /* Tapping a tile is a NEW intent. Now that the typed words drive the query, a stale
     search box would silently override the tile the user just chose. Clearing it — unless
     the parse line is what selected this tile in the first place — keeps the two paths
     from fighting. */
  if (!parseDriven) { ($('q') as HTMLInputElement).value = ''; $('parsed').innerHTML = ''; }
  picked = k; $('refine').classList.add('on'); render();
}

/** Distance and spend read straight off the prototype's sliders. */
const sliderState = () => ({
  d: DIST[+($('dist') as HTMLInputElement).value],
  p: PR[+($('price') as HTMLInputElement).value],
  tier: +($('price') as HTMLInputElement).value + 1,
  party: +($('party') as HTMLInputElement).value,
});

async function render() {
  if (!picked) return;
  const areas = [...document.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.textContent!);
  const { d, p, party } = sliderState();
  $('o-dist').textContent = d === 'any' ? 'anywhere' : formatDistance(d as number);
  $('o-price').textContent = p;
  $('o-party').textContent = party === 8 ? '8+' : String(party);
  const typedNow = ($('q') as HTMLInputElement).value.trim();
  $('rt').textContent = (typedNow || label(picked))
    + ' · ' + (areas.length ? areas.slice(0, 2).join(', ') : city);

  if (tab === 'cook') return renderRecipes();

  const seq = ++loadSeq;
  $('rc').textContent = '';
  $('list').innerHTML = '<p class="empty">Looking…</p>';

  const kind = BAR_KEYS.has(picked) ? 'bar' : 'restaurant';
  /* What the user TYPED outranks the tile the parse line happened to land on. Typing
     "vegan ramen near a park" used to set the sliders, print "vegan · japanese · outdoor
     seating", then search the occasion label "Neighbourhood" — which returned a café with
     the word Neighbour in its name and no ramen anywhere. The parse line was describing an
     understanding the query never carried. Now the typed words ARE the query, the tile's
     terms only add to it, and the parse line is a readout of a search that really ran. */
  const typed = ($('q') as HTMLInputElement).value.trim();
  const terms = [typed, typed ? '' : (QUERY[picked] || label(picked)), ...areas]
    .filter(Boolean).join(' ');
  const out = await fetchVenues(terms, city, sliderState().tier, undefined, kind);
  if (seq !== loadSeq) return;

  if (out.status !== 'ok') {
    /* A daily quota cap is NOT a transient network blip, and telling someone to "try
       again in a moment" when the answer is "not until tomorrow" is the Recover stage
       lying to them (§5). Google returns 429 for it, so it gets its own sentence. */
    $('list').innerHTML = '<p class="empty">' + (
      out.status === 'unconfigured'
        ? 'No Places key is configured, so live venues cannot be loaded.'
        : out.status === 'http' && out.code === 429
          ? "Today's Google Places allowance is used up, so venues can't load until it resets. Cook still works."
          : 'Could not reach Google Places just now. Try again in a moment.') + '</p>';
    return;
  }
  venues = out.venues;
  if (!venues.length) {
    $('list').innerHTML = '<p class="empty">Nothing came back for that in ' + esc(city) + '. Try another occasion, or widen the spend.</p>';
    return;
  }
  /* Say where the list came from when it is NOT Google. The user is owed the provenance:
     these cards have no photographs and no ratings for a reason, and "from OpenStreetMap"
     explains it in three words instead of looking like a broken page. */
  const fromOsm = venues[0]?.id.startsWith('osm-');
  $('rc').textContent = venues.length + (kind === 'bar' ? ' bars' : ' places')
    + (fromOsm ? ' · from OpenStreetMap' : '');
  /* The hero was a flat panel on every screen — the single largest surface in the app,
     carrying no photograph, on a product whose selling point is photography. It now
     borrows the top result's own Places photo: real, already fetched for the card below
     it, costs no extra request, and it is a picture OF the thing being recommended
     rather than stock. It changes as the occasion changes, which is the point. */
  heroPhoto(venues.find((v) => v.photoUrl)?.photoUrl);
  $('list').innerHTML = '';
  venues.forEach((v, i) => {
    /* A <button>, not the prototype's <div>. The prototype made result cards clickable
       divs, which no keyboard or screen-reader user can reach or activate — the same
       shape its own recipe card (`.rc`) already avoids by being a real button. Identical
       rendering, since `.card` supplies every visual property. */
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'card';
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', 'View ' + v.name);
    /* openNow is compared against undefined, never truthiness: `false` is a real answer
       and a truthy check swallows it (CLAUDE.md §8.3). */
    const status = v.openNow === undefined
      ? ''
      : v.openNow
        ? '<span class="st"><i></i>Open now</span>'
        : '<span class="st w"><i></i>Closed</span>';
    const meta = [v.fallbackDistance, typeof v.priceTier === 'number' ? PR[v.priceTier - 1] : null]
      .filter(Boolean).join(' · ');
    c.innerHTML = '<div ' + phAttrs(v.photoUrl, v.name, 'th') + '></div><div style="min-width:0;flex:1">'
      + '<h3>' + esc(v.name) + '</h3><p>' + esc(v.cuisine || v.address) + '</p><div class="exit">'
      + status
      + (meta ? '<span class="mt">' + esc(meta) + '</span>' : '')
      + '<button class="savebtn" aria-pressed="' + isSaved('places', v.name) + '">Save</button></div>'
      + '</div>';
    c.querySelector('.savebtn')!.addEventListener('click', (e) => {
      e.stopPropagation(); toggleSave('places', v.name, e.currentTarget as HTMLElement);
    });
    c.onclick = () => venue(i);
    $('list').appendChild(c);
    setTimeout(() => c.classList.add('in'), 35 + i * 58);
  });
}

async function renderRecipes() {
  const seq = ++loadSeq;
  $('list').innerHTML = '<p class="empty">Looking…</p>';
  let meals: Meal[] = [];
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s='
      + encodeURIComponent(COOK_QUERY[picked!] || picked!));
    meals = res.ok ? ((await res.json()).meals || []) : [];
  } catch { meals = []; }
  if (seq !== loadSeq) return;
  if (!meals.length) {
    $('list').innerHTML = '<p class="empty">No recipes came back for that. Try another kind of effort.</p>';
    return;
  }
  meals = meals.slice(0, 6);
  recipes = meals;
  heroPhoto(meals.find((m) => m.strMealThumb)?.strMealThumb);
  $('rc').textContent = meals.length + ' recipes';
  $('list').innerHTML = '';
  meals.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'rc'; b.type = 'button';
    b.setAttribute('aria-label', 'Open ' + m.strMeal);
    /* The card was a <button> that did nothing: six recipes you could look at and not
       open. Cook was the only tab with no second screen. */
    b.addEventListener('click', () => recipe(i));
    b.innerHTML = '<div ' + phAttrs(m.strMealThumb, m.strMeal) + '></div><div class="bd2"><h3>' + esc(m.strMeal) + '</h3>'
      + '<p>' + esc([m.strArea, m.strCategory].filter(Boolean).join(' · ')) + '</p>'
      + '<div class="meta"><button class="savebtn" aria-pressed="' + isSaved('recipes', m.strMeal) + '">Save</button></div></div>';
    b.querySelector('.savebtn')!.addEventListener('click', (e) => {
      e.stopPropagation(); toggleSave('recipes', m.strMeal, e.currentTarget as HTMLElement);
    });
    $('list').appendChild(b);
    setTimeout(() => b.classList.add('in'), 35 + i * 55);
  });
}

/* The recipe screen. Every field on it comes straight off the TheMealDB record — the
   ingredients with their measures, the method as the source wrote it, the video and the
   original page. No cook time, no difficulty, no serving count: TheMealDB does not
   publish them, and a computed guess dressed as a fact is the same failure as a fake
   dish price (§8). */
function recipe(idx: number) {
  const m = recipes[idx];
  if (!m) return;
  const ing: [string, string][] = [];
  for (let n = 1; n <= 20; n++) {
    const name = (m as unknown as Record<string, string>)['strIngredient' + n];
    const measure = (m as unknown as Record<string, string>)['strMeasure' + n];
    if (name && name.trim()) ing.push([name.trim(), (measure || '').trim()]);
  }
  const steps = (m.strInstructions || '')
    .split(/\r?\n+/).map((s) => s.replace(/^\s*(STEP\s*)?\d+[.)]?\s*/i, '').trim())
    .filter((s) => s.length > 1);
  const tags = (m.strTags ? m.strTags.split(',') : [])
    .map((t) => t.trim()).filter(Boolean).slice(0, 4);

  $('detail').innerHTML =
    '<button class="back" id="bk">← Back to ' + esc(label(picked || 'local')) + '</button>'
    + '<div ' + phAttrs(m.strMealThumb, m.strMeal, 'dhero') + '><div class="in"><h2>' + esc(m.strMeal) + '</h2>'
      + '<p class="sub">' + esc([m.strArea, m.strCategory].filter(Boolean).join(' · ')) + '</p></div></div>'
    + (tags.length ? '<div class="rtags">' + tags.map((t) => '<span class="pz">' + esc(t) + '</span>').join('') + '</div>' : '')
    + '<div class="dgrid"><div>'
      + (steps.length
          ? '<h4>Method</h4><ol class="steps">' + steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>'
          : '')
    + '</div><div><div class="side">'
      + (ing.length
          ? '<h4 class="sh">Ingredients</h4><div class="ings">' + ing.map(([n2, q]) =>
              '<div class="ing"><span>' + esc(n2) + '</span><b>' + esc(q) + '</b></div>').join('') + '</div>'
          : '')
      + (m.strYoutube
          ? '<a class="cta" style="text-align:center;text-decoration:none" href="' + esc(m.strYoutube) + '" target="_blank" rel="noopener noreferrer">Watch it made</a>'
          : '')
      + (m.strSource
          ? '<a class="cta2" style="text-align:center;text-decoration:none" href="' + esc(m.strSource) + '" target="_blank" rel="noopener noreferrer">Original recipe</a>'
          : '')
      + '<button class="cta2" id="sv" aria-pressed="' + isSaved('recipes', m.strMeal) + '">Save</button>'
    + '</div></div></div>';

  listScrollY = window.scrollY;
  document.body.dataset.view = 'detail';
  history.pushState({ wgDetail: true }, '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('bk').onclick = () => history.back();
  const sv = document.getElementById('sv');
  if (sv) sv.onclick = () => toggleSave('recipes', m.strMeal, sv);
}

function venue(idx: number) {
  const v = venues[idx];
  if (!v) return;
  const soc: [string, string, string | null][] = [
    ['Instagram', IG, null],
    ['WhatsApp', WA, v.phone ? 'https://wa.me/' + v.phone.replace(/[^\d]/g, '') : null],
    ['Directions', GM, v.latitude && v.longitude
      ? 'https://www.google.com/maps/search/?api=1&query=' + v.latitude + ',' + v.longitude
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.name + ' ' + v.address)],
    ['Reviews', TA, v.externalLink || null],
  ];
  const gal = (v.galleryUrls || []).slice(0, 4);
  const facts = [
    v.openNow === undefined ? null : ['Today', v.openNow ? 'Open' : 'Closed', v.hoursToday || ''],
    typeof v.priceTier === 'number' ? ['Spend', PR[v.priceTier - 1], 'per head'] : null,
    typeof v.rating === 'number'
      ? ['Rating', formatQuantity(v.rating, 1),
        v.userRatingCount ? formatQuantity(v.userRatingCount, 0) + ' ratings' : '']
      : null,
    v.cuisine ? ['Kind', v.cuisine, ''] : null,
  ].filter(Boolean) as [string, string, string][];

  $('detail').innerHTML =
    '<button class="back" id="bk">← Back to ' + esc(label(picked || 'local')) + '</button>'
    + '<div ' + phAttrs(v.photoUrl, v.name, 'dhero') + '><div class="in"><h2>' + esc(v.name) + '</h2>'
      + '<p class="sub">' + esc([v.cuisine, v.address].filter(Boolean).join(' · ')) + '</p></div></div>'
    + (gal.length ? '<div class="gal">' + gal.map((u) => '<div ' + phAttrs(u, v.name) + '></div>').join('') + '</div>' : '')
    + '<div class="dgrid"><div>'
      + (facts.length ? '<div class="facts">' + facts.map((f) =>
          '<div class="fact"><u>' + esc(f[0]) + '</u><b>' + esc(f[1]) + '</b>'
          + (f[2] ? '<span>' + esc(f[2]) + '</span>' : '') + '</div>').join('') + '</div>' : '')
      /* "Known for" renders ONLY from a confirmed signature dish. The prototype shipped
         four hardcoded dishes WITH PRICES; a fake price sends someone across town for
         something that does not exist, so when there is nothing confirmed this module is
         absent and the venue's own link is the answer instead (§8.4). */
      + (v.signatureOrder
          ? '<h4>Known for</h4><div class="known"><div class="dish"><div><b>' + esc(v.signatureOrder) + '</b>'
            + (v.signatureDescription ? '<p>' + esc(v.signatureDescription) + '</p>' : '') + '</div></div></div>'
          : '')
      + '<h4>Find them</h4><div class="socials">' + soc.map(([n, path, href]) => (href
          ? '<a class="soc" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="' + n + '" aria-label="' + n + '"><svg viewBox="0 0 24 24"><path d="' + path + '"/></svg></a>'
          : '')).join('') + '</div>'
    + '</div><div><div class="side">'
      + '<a class="cta" style="text-align:center;text-decoration:none" href="' + esc(soc[2][2]!) + '" target="_blank" rel="noopener noreferrer">Directions</a>'
      + (v.phone ? '<a class="cta2" style="text-align:center;text-decoration:none" href="tel:' + esc(v.phone) + '">Call</a>' : '')
      + (v.externalLink ? '<a class="cta2" style="text-align:center;text-decoration:none" href="' + esc(v.externalLink) + '" target="_blank" rel="noopener noreferrer">Menu &amp; details</a>' : '')
      + '<button class="cta2" id="sv" aria-pressed="' + isSaved('places', v.name) + '">Save</button>'
      + ((v.hoursWeekly && v.hoursWeekly.length)
          ? '<div class="hours">' + v.hoursWeekly.map((h, i) =>
              '<div' + (i === 0 ? ' class="now"' : '') + '><span>' + esc(h) + '</span></div>').join('') + '</div>'
          : '')
    + '</div></div></div>';
  /* A history entry, so the phone's BACK GESTURE closes the venue instead of leaving the
     app — and so the list comes back where it was. The prototype had neither: it swapped
     a data attribute, so back exited the site and scroll reset to 0. */
  listScrollY = window.scrollY;
  document.body.dataset.view = 'detail';
  history.pushState({ wgDetail: true }, '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('bk').onclick = () => history.back();
  const sv = document.getElementById('sv');
  if (sv) sv.onclick = () => toggleSave('places', v.name, sv);
}

/* ── verbatim: the parse line ────────────────────────────────────────────────── */
function parse() {
  const q = ($('q') as HTMLInputElement).value.trim();
  const P3 = $('parsed');
  if (!q) { P3.innerHTML = ''; return; }
  const hits = RULES.filter((r) => r[0].test(q)).map((r) => r[1]);
  if (!hits.length) {
    P3.innerHTML = '<b>No match yet</b> — searching for that exactly. Try "rooftop", "vegan", "open late", "table for six".';
    picked = picked || 'local';
    $('refine').classList.add('on');
    render();
    return;
  }
  const h = hits[0];
  if (h.party) ($('party') as HTMLInputElement).value = String(h.party);
  if (h.price !== undefined) ($('price') as HTMLInputElement).value = String(h.price);
  const all = [...new Set(hits.map((x) => x.note))];
  P3.innerHTML = '<b>Reading that as</b>' + all.map((n) => '<span class="pz">' + esc(n) + '</span>').join('');
  const tile = [...document.querySelectorAll('.tile')].find((t) => t.querySelector('.nm')?.textContent === label(h.occ));
  parseDriven = true;
  if (tile) pick(h.occ, tile as HTMLElement);
  else { picked = h.occ; $('refine').classList.add('on'); render(); }
  parseDriven = false;
}

/* ── verbatim: the rotating placeholder ──────────────────────────────────────── */
const PH = ['Somewhere quiet for two', 'Ramen, walking distance', 'Rooftop with a view',
  'Vegan, open now', 'Table for six tonight', 'Still serving after 11', 'Good coffee, plug sockets', 'Outside, in the sun'];
let phi = 0;
const phEl = $('q') as HTMLInputElement;
setInterval(() => {
  if (document.activeElement === phEl || phEl.value) return;
  phi = (phi + 1) % PH.length;
  phEl.style.transition = 'opacity .3s'; phEl.style.opacity = '.35';
  setTimeout(() => { phEl.placeholder = PH[phi]; phEl.style.opacity = '1'; }, 300);
}, 3800);

$('go').onclick = parse;
$('q').addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') parse(); });
['dist', 'price', 'party'].forEach((id) => $(id).addEventListener('input', () => { void render(); }));
($('city') as HTMLSelectElement).onchange = (e) => { city = (e.target as HTMLSelectElement).value; build(); };
($('hour') as HTMLSelectElement).onchange = (e) => {
  hour = +(e.target as HTMLSelectElement).value;
  if (!manual) period = auto(hour);
  build();
};

function ti() { $('tico').innerHTML = document.documentElement.dataset.theme === 'dark' ? I.sun : I.moon; }
$('t').onclick = () => {
  const d = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = d ? 'dark' : 'light';
  ti();
  syncThemeColor();
};

/**
 * NOT in the prototype, and required on a phone: `theme-color` tints the bar iOS Safari
 * draws around the page. The prototype never set it, so a dark app would sit inside light
 * browser chrome. The live tag must be FIRST in <head> — the browser uses the first tag
 * whose media matches, so appending it is a silent no-op (CLAUDE.md §12).
 */
function syncThemeColor() {
  let el = document.getElementById('tc-live') as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.id = 'tc-live';
    el.name = 'theme-color';
  }
  el.content = document.documentElement.dataset.theme === 'dark' ? '#0E0E0D' : '#F5F4F2';
  if (document.head.firstChild !== el) document.head.prepend(el);
}

/* Back must restore, not reset. The prototype never touched history, so the browser
   reset scroll on every back gesture. Manual restoration plus a saved offset keeps the
   list where the user left it when they come back from a venue. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let listScrollY = 0;
addEventListener('popstate', () => {
  if (document.body.dataset.view !== 'detail') return;
  document.body.dataset.view = 'browse';
  window.scrollTo(0, listScrollY);
});
document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
period = auto(hour);
ti();
syncThemeColor();
build();

/* Sign-in resolves AFTER first paint, deliberately: the app is fully usable while it is
   happening, and nothing on screen waits for a network round trip. When a session turns
   up — either from the link just followed or from a previous visit — anything saved on
   this device is merged up, and only then does the Saved tab redraw. */
(async () => {
  if (!isAuthConfigured()) return;
  session = (await captureSessionFromUrl()) || (await restoreSession());
  if (!session) return;
  const merged = await mergeLocalIntoRemote(session);
  saved.places = merged.places;
  saved.recipes = merged.recipes;
  if (tab === 'saved') renderSaved();
})();
