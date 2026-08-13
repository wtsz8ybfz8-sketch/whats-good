/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from'react';
import { type Dimensions, ActiveTab, ParsedRecipe, Meal, type City } from'./types';
import { mapCoordinatesToQueries, parseMealToRecipe } from'./recipeUtils';
import { FALLBACK_AREAS, fetchAreas, orderAreasForCountry } from'./cuisineRail';
import { Sidebar, resolveCuisine } from'./components/Sidebar';
import { RecipeView } from'./components/RecipeView';
import { EateryView } from'./components/EateryView';
import { LoadingState, ErrorState, EmptyState } from'./components/StatusStates';
import { HappyHourView } from'./components/HappyHourView';
import { Sparkles, Dices, Heart, Trash2, Search, MapPin, MapPinOff, ChevronRight, Sun, Moon, X } from'lucide-react';
import type { Venue } from'./venue';
import { fetchVenues, detectCityFromCoords, formatPriceTier, isPlacesConfigured, type VenueSearchFailure } from'./placesService';
import { formatDistance } from'./locale';
import { useSavedRecipes } from'./useSavedRecipes';
import { cuisineIcon } from'./cuisineIcon';
import { AuthPanel } from'./components/AuthPanel';

/**
 * Honest placeholder for venues without a real photo (hardcoded fallback list only).
 * A warm branded gradient with the venue's initials — never a stock photo of
 * unrelated food pretending to be the restaurant. Places-sourced results always
 * carry a real `photoUrl` which takes precedence.
 */
export function eateryPlaceholderImage(name: string): string {
 const initials = name
 .split(/\s+/)
 .filter((w) => w && !['the','a','of','&','and'].includes(w.toLowerCase()))
 .slice(0, 2)
 .map((w) => w[0].toUpperCase())
 .join('');
 // Deterministic warm hue per venue so cards stay distinguishable
 let hash = 0;
 for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
 const hue = 14 + (Math.abs(hash) % 26); // 14–40: terracotta → amber band
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},48%,26%)"/><stop offset="1" stop-color="hsl(${hue + 18},42%,14%)"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="670" cy="90" r="180" fill="hsl(${hue},50%,32%)" opacity="0.35"/><circle cx="110" cy="520" r="140" fill="hsl(${hue},45%,20%)" opacity="0.5"/><text x="400" y="316" font-family="Georgia, serif" font-size="150" font-weight="bold" fill="rgba(255,245,238,0.92)" text-anchor="middle" dominant-baseline="middle">${initials}</text><text x="400" y="430" font-family="ui-monospace, monospace" font-size="22" letter-spacing="6" fill="rgba(255,245,238,0.45)" text-anchor="middle">NO PHOTO YET</text></svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * A venue search that could not run, told truthfully.
 *
 * All five of these used to render "Nothing matched that combination" — an answer that
 * blames the user's filters for a problem with the key, the budget or the connection,
 * and offers a next step (widen your search) that provably cannot work. §5's Recover
 * stage asks whether the user is given a way forward; a wrong diagnosis is not one.
 * `canRetry` is false wherever pressing the button changes nothing.
 */
function venueFailureNotice(
 failure: VenueSearchFailure,
): { title: string; message: string; canRetry: boolean } {
 switch (failure.status) {
 case'unconfigured':
 return {
 title:'Venue search is not switched on',
 message:
'This deployment has no Google Places key, so there are no places to look through. ' +
'Nothing is broken and retrying will not help. Stay In needs no key and works now.',
 canRetry: false,
 };
 case'denied':
 return {
 title:'Google turned the search down',
 message:
'The key this app uses was rejected, which usually means it is restricted to another ' +
'site or the Places API is not enabled for it. Nothing you can do from here will fix ' +
'it, and Stay In still works.',
 canRetry: false,
 };
 case'quota':
 return {
 title:'Venue search has hit its limit for now',
 message:
'The key is valid but its Places budget is spent, so Google is refusing new searches. ' +
'This usually clears on its own. Stay In does not use it and works now.',
 canRetry: false,
 };
 case'network':
 return {
 title:'Could not reach Google',
 message:
'The search never left the building — that is usually a dropped connection rather ' +
'than anything to do with what you searched for. Worth another try.',
 canRetry: true,
 };
 case'http':
 return {
 title:'Google answered, but not with venues',
 message:
`The Places API returned an unexpected response (${failure.code}). That is on our side, ` +
'not yours. Trying again sometimes clears it.',
 canRetry: true,
 };
 default:
 // 'aborted' — a superseded search. The caller returns before rendering anything,
 // so this exists to keep the switch total rather than to be seen.
 return { title:'Search cancelled', message:'A newer search replaced this one.', canRetry: true };
 }
}

/**
 * How long the filters must settle before a search is worth paying for.
 *
 * Long enough that dragging through cuisines does not bill a search per chip, short
 * enough that a deliberate single change still feels immediate. Not a user-facing
 * setting; if it needs tuning, tune it here.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Whether a venue's Places cuisine string satisfies a selected cuisine chip.
 *
 * Lenient on purpose, and it reuses the SAME folding the chips themselves use
 * (resolveCuisine): "Pizza restaurant" resolves to the Italian chip, "Hamburger" to
 * Burgers. A direct substring match ("Italian restaurant" contains "italian") covers
 * the common case; the resolver catches the synonyms. A venue Places gave no type is
 * dropped when a cuisine filter is on — that's the honest behaviour the user asked for
 * ("Italian filters, or a real empty state"), and the cuisine term also seeds the Places
 * query so most returned venues do carry a matching type.
 */
function venueMatchesCuisine(rawCuisine: string, target: string): boolean {
 const vc = (rawCuisine || '').toLowerCase();
 const t = target.toLowerCase();
 if (!vc || !t) return false;
 if (vc.includes(t)) return true;
 const resolved = resolveCuisine(rawCuisine);
 return resolved ? resolved.value.toLowerCase() === t : false;
}

// Mood values are conversational ("tired & cosy") — map them to terms Google
// Places actually understands so the vibe widens the search instead of muddying it.
const VIBE_PLACE_TERMS: Record<string, string> = {
'tired & cosy':'cozy',
'need comfort food':'comfort food',
'feeling adventurous':'hidden gem',
'treating myself':'upmarket',
'something fresh & light':'healthy',
'stressed, need quick and easy':'quick casual',
'craving something bold & spicy':'spicy',
'lazy Sunday energy':'brunch',
'feeling fancy':'fine dining',
};

// Haversine formula to compute actual spherical distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
 const R = 6371; // radius of Earth in km
 const dLat = (lat2 - lat1) * Math.PI / 180;
 const dLon = (lon2 - lon1) * Math.PI / 180;
 const a = 
 Math.sin(dLat/2) * Math.sin(dLat/2) +
 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
 Math.sin(dLon/2) * Math.sin(dLon/2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
 return R * c;
}

function createEateryResult(
 eatery: Venue,
 city: City,
 userCoords: { latitude: number; longitude: number } | null,
): ParsedRecipe {
 let distanceStr = eatery.fallbackDistance;
 let distVal = 999999;

 if (userCoords && typeof eatery.latitude === 'number' && typeof eatery.longitude === 'number') {
 const dist = getDistance(userCoords.latitude, userCoords.longitude, eatery.latitude, eatery.longitude);
 distVal = Number.isFinite(dist) ? dist : 999999;
 // Only show a distance when the venue is plausibly local. Pinning a remote
 // destination (e.g. searching Paris from Cape Town) otherwise renders a
 // nonsensical "9341 km away"; past ~150km we drop it rather than mislead.
 // Intl, not toFixed: half the world writes "1,4 km", not "1.4 km".
 distanceStr = Number.isFinite(dist) && dist <= 150 ? `${formatDistance(dist)} away` : '';
 }

 const imgUrl = eatery.photoUrl || eateryPlaceholderImage(eatery.name);

 return {
 id: eatery.id,
 name: eatery.name,
 category: eatery.cuisine,
 area: city,
 // signatureDescription is empty for every Places-sourced venue now (it used to be a
 // template built from the venue's own name). Only prefix it when it's real content,
 // otherwise this string opens with two blank lines.
 instructions: [
 eatery.signatureDescription,
 `Located at ${eatery.address}${distanceStr ? ` — ${distanceStr}` : ''}.`,
 ]
 .filter(Boolean)
 .join('\n\n'),
 image: imgUrl,
 tags: [
 eatery.vibeMatch,
 distanceStr,
 formatPriceTier(eatery.priceTier),
 'Restaurant'
 ],
 ingredients: eatery.signatureIngredients,
 // Each step is dropped rather than emitted empty. Without the guards a Places-sourced
 // venue renders "Order the recommended plate: ." — the punctuation is the giveaway that
 // the sentence was built around data we never had.
 steps: [
 `Head to ${eatery.address}${distanceStr ? ` (${distanceStr})` : ''}.`,
 `Ask about today's menu highlights and availability.`,
 eatery.signatureOrder ? `Order the recommended plate: ${eatery.signatureOrder}.` : '',
 eatery.signatureIngredients.length
 ? `Check ingredients against your preferences: ${eatery.signatureIngredients.join(', ')}.`
 : '',
 ].filter(Boolean),
 prepTime: eatery.estimatedWait,
 cookTime: formatPriceTier(eatery.priceTier),
 serves:'Table booking',
 source: eatery.externalLink,
 distanceVal: distVal,
 rawEatery: eatery,
 distanceStr,
 } as ParsedRecipe & { distanceVal: number; rawEatery: Venue; distanceStr: string };
}

export default function App() {
 /* Seed from the URL so a shared or bookmarked link opens where it says it does.
    Validated against the known set — a hand-edited ?tab=nonsense must land on Find,
    not render an empty shell. */
 const initialTab = ((): ActiveTab => {
 try {
 const t = new URLSearchParams(window.location.search).get('tab');
 const valid: ActiveTab[] = ['mood','happy-hour','random','saved-recipes','saved-eateries'];
 return valid.includes(t as ActiveTab) ? (t as ActiveTab) :'mood';
 } catch { return 'mood'; }
 })();
 const initialParams = new URLSearchParams(window.location.search);
 const initialSharedMeal = initialParams.get('meal')?.trim() || '';
 const initialSharedVenue = initialParams.get('venue')?.trim() || '';
 const initialSharedVenueName = initialParams.get('name')?.trim() || '';
 const hasSharedDetail = Boolean(initialSharedMeal || initialSharedVenue);
 const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
 const [prevTab, setPrevTab] = useState<ActiveTab>(initialTab);
 // City is auto-detected from the user's location, or typed. There is deliberately no
 // default city: this app began as a Cape Town product and 'Cape Town' sat here as the
 // seed value, so a user in London was greeted by another hemisphere and offered South
 // African cuisine before they had touched anything. An empty string renders as
 // "Set location" and asks — which is honest, and one tap from correct (§5, Orient).
 // Cached in localStorage so a resolved city doesn't flash away on reload while a
 // fresh detection runs in the background.
 const [city, setCity] = useState<City>(() => {
 try {
 // A ?city= in the link wins over this device's last city: the point of sending
 // someone "what's good in Lisbon" is that they see Lisbon.
 const fromUrl = new URLSearchParams(window.location.search).get('city');
 return (fromUrl && fromUrl.trim()) || localStorage.getItem('whats_good_city') || '';
 } catch {
 return '';
 }
 });
 // When the user types a destination ("Paris while in CPT"), we pin the city and
 // stop the background geolocation detect from stomping it. A ref mirrors the flag
 // so the async detect callback reads the current value, not a stale closure.
 const [cityIsManual, setCityIsManual] = useState<boolean>(() => {
 try { return localStorage.getItem('whats_good_city_manual') ==='true'; } catch { return false; }
 });
 const cityManualRef = useRef(cityIsManual);
 useEffect(() => {
 cityManualRef.current = cityIsManual;
 try { localStorage.setItem('whats_good_city_manual', String(cityIsManual)); } catch {}
 }, [cityIsManual]);
 const [cityMenuOpen, setCityMenuOpen] = useState(false);
 const [cityDraft, setCityDraft] = useState('');
 const [dimensions, setDimensions] = useState<Dimensions>({
 vibe: null,
 diet: null,
 regional: null,
 cuisines: [],
 capacity: null,
 searchQuery:'',
 locationMode: initialSharedMeal ? 'gourmet' : 'dineout',
 });

 const [recipes, setRecipes] = useState<ParsedRecipe[]>([]);
 const [availableCuisines, setAvailableCuisines] = useState<string[]>([]);
 const [selectedRecipe, setSelectedRecipe] = useState<ParsedRecipe | null>(null);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 /**
  * A state the user can act on but cannot retry away — no API key, no location. Kept
  * separate from `error` because they read differently on screen: an error says
  * something failed, a notice says something has not been set up yet. Collapsing the
  * two shipped "Something went wrong / Try again" over a missing configuration, where
  * pressing the button provably changes nothing.
  */
 const [notice, setNotice] = useState<{ title: string; message: string; canRetry: boolean } | null>(null);
 const [filtersOpen, setFiltersOpen] = useState(true);

 /**
  * The filters currently narrowing the search, each with the means to drop it.
  *
  * Derived from state the app already holds, so an empty result can say which
  * constraint to relax instead of "nothing matched that combination" — an answer that
  * makes the user re-guess the whole set. Empty when nothing is set, which is how the
  * zero-result screen tells "you have narrowed too far" apart from "you have not asked
  * for anything yet" and shows the opening invitation instead.
  */
 const activeConstraints = useMemo(() => {
 const set = (patch: Partial<Dimensions>) => () => setDimensions((prev) => ({ ...prev, ...patch }));
 return [
 dimensions.searchQuery.trim()
 ? { key:'q', label:'Search', value: dimensions.searchQuery.trim(), clear: set({ searchQuery:'' }) }
 : null,
 dimensions.cuisines.length > 0
 ? { key:'cuisine', label:'Cuisine', value: dimensions.cuisines.join(', '), clear: set({ cuisines: [] }) }
 : null,
 dimensions.vibe
 ? { key:'vibe', label:'Mood', value: dimensions.vibe, clear: set({ vibe: null }) }
 : null,
 dimensions.diet
 ? { key:'diet', label:'Diet', value: dimensions.diet, clear: set({ diet: null }) }
 : null,
 dimensions.capacity && Number.isInteger(Number(dimensions.capacity))
 ? {
 key:'price',
 label:'Budget',
 value: formatPriceTier(Number(dimensions.capacity) as 1 | 2 | 3 | 4),
 clear: set({ capacity: null }),
 }
 : null,
 ].filter(Boolean) as { key: string; label: string; value: string; clear: () => void }[];
 }, [dimensions.searchQuery, dimensions.cuisines, dimensions.vibe, dimensions.diet, dimensions.capacity]);

 /**
  * The result list actually shown, narrowed live from the fetched pool by the free-text
  * search and the selected cuisine(s). This is deliberately a CLIENT-SIDE filter on top
  * of whatever Places returned, not a re-query: the promise is that typing "sushi" shows
  * sushi or an honest empty state — never the untouched list — and that a cuisine chip
  * visibly removes what doesn't match, the instant it's tapped, with no billed round trip.
  * Google's text search only loosely scopes results, so relying on it alone (the previous
  * behaviour) is exactly why the list didn't move. Recipes (Stay In) carry no rawEatery
  * and pass through untouched — these two controls belong to the Find tab.
  */
 const displayedRecipes = useMemo(() => {
 const q = dimensions.searchQuery.trim().toLowerCase();
 const cuisines = dimensions.cuisines;
 if (!q && cuisines.length === 0) return recipes;
 return recipes.filter((r) => {
 const raw = (r as ParsedRecipe & { rawEatery?: Venue }).rawEatery;
 if (!raw) return true;
 if (q) {
 // Name, area (address) and cuisine — the three fields a person types into a
 // "a place, a dish, or an area" box actually means.
 const haystack = `${raw.name} ${raw.address} ${raw.cuisine}`.toLowerCase();
 if (!haystack.includes(q)) return false;
 }
 if (cuisines.length > 0 && !cuisines.some((c) => venueMatchesCuisine(raw.cuisine, c))) {
 return false;
 }
 return true;
 });
 }, [recipes, dimensions.searchQuery, dimensions.cuisines]);

 /**
  * Search lifecycle. `searchRunIdRef` is the generation counter that decides which
  * response is still wanted; `searchAbortRef` cancels the requests of the search it
  * replaced. Refs, not state — a render must never be triggered by either.
  */
 const searchRunIdRef = useRef(0);
 const searchAbortRef = useRef<AbortController | null>(null);

 // Premium tactical geolocation tracking
 const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
 // Drives the price symbol. Venue data was authored in Rand; detection is global,
 // so the symbol has to follow the detected country or foreign venues render as "R".
 const [countryCode, setCountryCode] = useState<string | null>(() => {
 try { return localStorage.getItem('whats_good_country'); } catch { return null; }
 });
 useEffect(() => {
 try { if (countryCode) localStorage.setItem('whats_good_country', countryCode); } catch {}
 }, [countryCode]);

 // The Cooking tab's "Kitchen" rail. Derived, never hardcoded: the names come from
 // TheMealDB's own area list so we can only offer a cuisine it can actually serve, and
 // the order follows the detected country so a user in London leads with British and
 // Indian rather than the app's original Cape Town defaults. See cuisineRail.ts.
 // Seeded from the fallback so the rail has chips on first paint (CLAUDE.md §8: the
 // primary content never waits on a network round trip), then replaced once resolved.
 const [areas, setAreas] = useState<string[]>(FALLBACK_AREAS);
 useEffect(() => {
 let alive = true;
 fetchAreas().then((a) => { if (alive) setAreas(a); });
 return () => { alive = false; };
 }, []);
 // Six is the cap: enough to feel like a real choice, few enough to stay one wrapped
 // row on a 384px viewport rather than becoming the carousel §11.4 forbids.
 const kitchens = useMemo(
 () => orderAreasForCountry(areas, countryCode).slice(0, 6),
 [areas, countryCode],
 );
 const [locState, setLocState] = useState<'idle' |'requesting' |'granted' |'denied'>('idle');

 // Trigger position query cleanly. `userInitiated` distinguishes the explicit
 // "Sort Nearby / use my location" tap (which resets a manual destination) from
 // the silent detect on load (which must NOT stomp a pinned destination).
 const requestUserLocation = (userInitiated = false) => {
 if (!navigator.geolocation) {
 setLocState('denied');
 return;
 }
 setLocState('requesting');
 navigator.geolocation.getCurrentPosition(
 (position) => {
 const coords = {
 latitude: position.coords.latitude,
 longitude: position.coords.longitude,
 };
 setUserCoords(coords);
 setLocState('granted');

 // Detect the city from real coordinates. Skip the overwrite when the user
 // has pinned a destination — unless they explicitly asked for their location.
 detectCityFromCoords(coords.latitude, coords.longitude).then((detected) => {
 if (detected) {
 setCountryCode(detected.countryCode);
 if (userInitiated || !cityManualRef.current) {
 setCity(detected.city);
 setCityIsManual(false);
 }
 }
 });
 },
 (err) => {
 // A 6s high-accuracy-by-default request fails constantly indoors and on
 // desktop — that's why this sat on RETRY LOCATION. Coarse position is
 // plenty for "restaurants near me", a cached fix is fine, and 15s is a
 // realistic ceiling.
 console.warn('Geolocation unavailable:', err.code, err.message);
 setLocState('denied');
 },
 { timeout: 15000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
);
 };

 /**
  * THEME_KEY is deliberately NOT the old `whats_good_dark_mode`, and that rename is the
  * entire fix rather than a tidy-up.
  *
  * The old key is unusable because its stored values are not trustworthy: the previous
  * apply-effect called setItem in its body, so it ran on MOUNT and stamped a preference
  * for every visitor who had never touched the toggle. Nothing distinguishes "the user
  * chose light" from "the bug wrote light on first paint" — the two are byte-identical.
  * Repairing the writer (done in the previous commit) therefore fixed nothing for anyone
  * who had already loaded the app once, which is everybody. The user's report was exact:
  * "when I switch the toggle on my phone to light mode, the app doesn't change."
  *
  * Moving to a fresh key discards every poisoned value in one step. Absent = no
  * preference = follow the OS, which is the correct default and what a returning user
  * gets. The old key is deleted rather than read, so it can never resurrect this.
  */
 const THEME_KEY = 'whats_good_theme'; // 'dark' | 'light'; absent = follow the system

 const [isDark, setIsDark] = useState<boolean>(() => {
 // Guard the whole body: Safari private mode throws on localStorage access itself,
 // not just on write, and a theme that throws takes the entire app down with it.
 try {
 localStorage.removeItem('whats_good_dark_mode'); // one-way migration; never read again
 const stored = localStorage.getItem(THEME_KEY);
 const dark =
 stored !== null
 ? stored === 'dark'
 : window.matchMedia('(prefers-color-scheme: dark)').matches;
 document.documentElement.classList.toggle('dark', dark);
 return dark;
 } catch {
 /* Was `return false` — a hardcoded light default that ignored a dark OS for anyone
    with storage blocked. matchMedia needs no storage, so it still answers here. */
 const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
 document.documentElement.classList.toggle('dark', dark);
 return dark;
 }
 });

 /**
  * Scroll restoration.
  *
  * This effect used to be `scrollTo(0)` on every change of `selectedRecipe?.id`, which
  * includes the change TO null — so closing a detail, or swiping back in Safari, threw
  * you to the top of the list every time. You would scroll through twenty venues, open
  * the last one, come back, and start again from the first. That is the single thing
  * that makes a web app feel like a web page instead of an app.
  *
  * Forward into a detail starts at the detail's top (a pushed view always does).
  * Backward restores exactly where the list was. `scrollRestoration = 'manual'` stops
  * the browser applying its own guess on popstate and fighting this.
  */
 const listScrollY = useRef(0);
 const lastListScrollY = useRef(0);
 const prevDetailId = useRef<string | null>(null);

 /**
  * Directional chrome — the top header and the mobile tab bar retract on a deliberate
  * downward scroll and return on the way up, near the top, or near the bottom. One
  * passive, rAF-throttled scroll listener drives both; the transform lives in CSS
  * (.chrome-bar / .tabbar .is-hidden), so the fixed-chrome content padding never
  * changes and nothing reflows. The detail action bar (.action-bar) is a SEPARATE
  * surface and is never toggled here — primary nav and detail actions are distinct.
  *
  * `syncChromeBaseline` re-seats the direction accumulators after a PROGRAMMATIC scroll
  * (a tab switch, or the back-restore below), so that jump is not misread as a user
  * gesture that yanks the chrome away the instant the list returns — check #8.
  */
 const headerRef = useRef<HTMLElement>(null);
 const [chromeHidden, setChromeHidden] = useState(false);
 const chromeHiddenRef = useRef(false);
 const chromeLastY = useRef(0);
 const chromeDown = useRef(0);
 const chromeUp = useRef(0);
 const chromeSuppressUntil = useRef(0);
 const detailOpenRef = useRef(false);
 const cityMenuRef = useRef(false);
 detailOpenRef.current = !!selectedRecipe;
 cityMenuRef.current = cityMenuOpen;

 const shareUrl = (recipe: ParsedRecipe) => {
 const raw = (recipe as ParsedRecipe & { rawEatery?: Venue }).rawEatery;
 const shareCity = city || recipe.area || '';
 const url = new URL(window.location.href);
 if (shareCity) url.searchParams.set('city', shareCity);
 else url.searchParams.delete('city');
 url.searchParams.set('tab', raw ? 'mood' : 'random');
 url.searchParams.delete('venue');
 url.searchParams.delete('name');
 url.searchParams.delete('meal');
 if (raw) {
 url.searchParams.set('venue', raw.id);
 url.searchParams.set('name', raw.name);
 } else {
 url.searchParams.set('meal', recipe.id);
 }
 return url.toString();
 };

 const shareRecipe = async (recipe: ParsedRecipe) => {
 const url = shareUrl(recipe);
 try {
 if (navigator.share) {
 await navigator.share({ title: recipe.name, text: `See ${recipe.name} on What's Good`, url });
 return;
 }
 await navigator.clipboard?.writeText(url);
 } catch {
 // Share cancellation or an unavailable clipboard is a normal user action.
 }
 };

 const selectRecipeFromList = (recipe: ParsedRecipe | null) => {
   if (recipe && !selectedRecipe) {
     /* Capture the offset HERE, synchronously, while the list is still mounted at its
        full height. This is the only moment the true position is knowable.

        It used to be `Math.max(listScrollY.current, lastListScrollY.current, scrollY)`,
        which broke twice over. Including the STALE `listScrollY.current` made the restore
        point monotonically increasing — once you had been deep in a list you could never
        return to a shallower position again (measured: saved 400, restored 548). And
        leaning on `lastListScrollY` alone is unreliable because the scroll listener is
        rAF-throttled, so scrolling and tapping inside one frame leaves it at 0 (measured:
        saved 400, restored 0 — the failing regression check).

        Writing both refs keeps the throttled listener from later overwriting this with a
        clamped value. */
     const y = Math.max(0, window.scrollY);
     listScrollY.current = y;
     lastListScrollY.current = y;
   }
   setSelectedRecipe(recipe);
 };

 const setChrome = (hidden: boolean) => {
 if (chromeHiddenRef.current === hidden) return;
 chromeHiddenRef.current = hidden;
 setChromeHidden(hidden);
 };
 // Re-seat the direction accumulators to a position and show the chrome. No timer.
 const seatChrome = (y: number) => {
 chromeLastY.current = Math.max(0, y);
 chromeDown.current = 0;
 chromeUp.current = 0;
 setChrome(false);
 };
 // Seat AND briefly suppress the direction logic. A programmatic scroll (tab switch,
 // back-restore, opening a menu) arrives as a burst of scroll events — including the
 // remount settling from 0 up to the restored offset — and without this that burst
 // reads as a deliberate downward gesture and retracts the chrome the instant the list
 // returns (#8). For a few frames after the jump, every scroll event just re-seats the
 // baseline and keeps the chrome visible, so direction tracking resumes from the
 // settled position rather than mid-burst.
 const syncChromeBaseline = (y: number) => {
 chromeSuppressUntil.current = performance.now() + 320;
 seatChrome(y);
 };

 useEffect(() => {
 const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
 const DOWN = 12; // deliberate downward travel before the chrome retracts
 const UP = 8;    // eager to bring it back — a smaller threshold on the way up
 const TOP = 8;   // always visible within a hair of the top
 const BOTTOM = 24; // …and within a hair of the very bottom
 let raf = 0;

 const evaluate = () => {
 raf = 0;
 const y = Math.max(0, window.scrollY); // clamp iOS rubber-band overscroll (negative)
    if (!detailOpenRef.current && y > 0) lastListScrollY.current = y;
 const maxY = document.documentElement.scrollHeight - window.innerHeight;
 const headerFocused =
 !!headerRef.current && headerRef.current.contains(document.activeElement);

 // Pin the chrome — reduced motion, a detail page, an open city menu, a focused
 // header control, or being near either end of the scroll range.
 if (
 reduceMQ.matches ||
 detailOpenRef.current ||
 cityMenuRef.current ||
 headerFocused ||
 y <= TOP ||
 y >= maxY - BOTTOM
 ) {
 seatChrome(y);
 return;
 }

 // Inside the post-jump window a programmatic scroll burst must not read as a gesture.
 if (performance.now() < chromeSuppressUntil.current) {
 seatChrome(y);
 return;
 }

 const dy = y - chromeLastY.current;
 if (dy > 0) { chromeDown.current += dy; chromeUp.current = 0; }
 else if (dy < 0) { chromeUp.current -= dy; chromeDown.current = 0; }
 chromeLastY.current = y;

 if (chromeDown.current > DOWN) setChrome(true);
 else if (chromeUp.current > UP) setChrome(false);
 };

 const onScroll = () => { if (!raf) raf = requestAnimationFrame(evaluate); };
 window.addEventListener('scroll', onScroll, { passive: true });
 chromeLastY.current = Math.max(0, window.scrollY);
 lastListScrollY.current = chromeLastY.current;
 return () => {
 window.removeEventListener('scroll', onScroll);
 if (raf) cancelAnimationFrame(raf);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Opening the city menu must never leave the header retracted (check #5). The detail
 // page is pinned by detailOpenRef inside the listener; this covers the no-scroll case.
 useEffect(() => {
 if (cityMenuOpen) syncChromeBaseline(Math.max(0, window.scrollY));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [cityMenuOpen]);

 useEffect(() => {
 if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
 }, []);

 useEffect(() => {
 const venueId = new URLSearchParams(window.location.search).get('venue');
 if (!venueId || recipes.length === 0 || selectedRecipe) return;
 const match = recipes.find((recipe) => {
 const raw = (recipe as ParsedRecipe & { rawEatery?: Venue }).rawEatery;
 return raw?.id === venueId || recipe.id === venueId;
 });
 if (match) selectRecipeFromList(match);
 }, [recipes, selectedRecipe]);

 useEffect(() => {
 const id = selectedRecipe?.id ?? null;
 const prev = prevDetailId.current;
 prevDetailId.current = id;

 if (id && !prev) {
 // Entering a detail — remember the list position before the list unmounts.
 // This effect runs AFTER the detail has committed and shrunk the document, so
 // `window.scrollY` here is already clamped down by up to a viewport — reading it
 // loses the true list offset. `chromeLastY` is the position the scroll listener
 // tracked while the list was still mounted, so it is the exact place to return to.
 // NOT max'd with window.scrollY: by the time this effect runs the detail has
 // committed and the document has shrunk, so scrollY is already clamped and is a
 // SMALLER, wrong number. selectRecipeFromList has normally captured the real value
 // synchronously at click time; this covers the paths that bypass it (deep link,
 // history forward, single-result auto-select), where the last tracked list offset
 // is the best available answer.
 listScrollY.current = lastListScrollY.current;
 window.scrollTo({ top: 0, behavior:'instant' as ScrollBehavior });
 } else if (id && prev) {
 // Detail to a different detail; still a forward move.
 window.scrollTo({ top: 0, behavior:'instant' as ScrollBehavior });
 } else if (!id && prev !== null) {
 // Back to the list. Two frames: the first lets the list re-mount, the second runs
 // after layout, so the target offset actually exists to scroll to.
 const target = Math.max(0, listScrollY.current);
 const root = document.documentElement;
 const prevAnchor = root.style.overflowAnchor;
 /* SCROLL ANCHORING FIGHTS THE RESTORE, and that is the whole bug.

    Landing on the right offset was never the hard part — traced with a scroll log, the
    restore hit 400 on the first frame and was then dragged to 888 over the next ~500ms
    while `scrollHeight` grew 2771 -> 3558. The re-mounted list's images carry no
    reserved height, so the document keeps growing after paint, and the browser slides
    scrollY to keep the anchored element still. A one-shot scrollTo — or a retry that
    stops the moment it "lands", which is what the first version of this fix did — exits
    right before the drift starts and reports success.

    So: disable anchoring for the restore window only, and keep re-asserting the target
    until the document height has held steady for a few frames. Bounded at 700ms so a
    genuinely shorter list (an item was unsaved while we were away) can never spin. */
 root.style.overflowAnchor = 'none';
 const deadline = performance.now() + 700;
 let lastHeight = -1;
 let stableFrames = 0;
 const settle = () => {
 const h = root.scrollHeight;
 if (h !== lastHeight) { lastHeight = h; stableFrames = 0; } else { stableFrames += 1; }
 window.scrollTo({ top: target, behavior:'instant' as ScrollBehavior });
 const landed = Math.abs(window.scrollY - target) <= 2;
 if ((!landed || stableFrames < 3) && performance.now() < deadline) {
 requestAnimationFrame(settle);
 return;
 }
 root.style.overflowAnchor = prevAnchor;
 // Re-seat the chrome to this restored position so the jump is not read as a
 // downward gesture and the header/tab bar are not retracted on return (#8).
 syncChromeBaseline(window.scrollY);
 };
 requestAnimationFrame(() => requestAnimationFrame(settle));
 }
 }, [selectedRecipe?.id]);

 // Switching tabs IS a fresh context, so it starts at the top — unlike going back.
 useEffect(() => {
 window.scrollTo({ top: 0, behavior:'instant' as ScrollBehavior });
 }, [activeTab]);

 /**
  * Follow the system while the user has expressed no preference of their own.
  *
  * The persist below used to live in the apply-effect, so it ran on MOUNT — before any
  * tap, on the very first visit ever. That converted "no preference, follow the system"
  * into a stored explicit choice on first paint, and since the initialiser only consults
  * `matchMedia` when `stored === null`, the system was read exactly once in the app's
  * lifetime and then frozen. A user whose phone was light at first visit and dark
  * afterwards got a light app for good, with the toggle as the only way out. Reported
  * as "I'm on dark mode and the site opened on light mode".
  *
  * Storage is now written ONLY by the toggle (see the header button). No stored value
  * means no preference, so the OS stays authoritative — including while the app is
  * open, which the old code could not do at all: there was no change listener, so
  * flipping the system theme did nothing until a reload.
  */
 useEffect(() => {
 const mq = window.matchMedia('(prefers-color-scheme: dark)');
 const follow = (e: MediaQueryListEvent) => {
 // Re-read on every event: the user may have tapped the toggle since mount, and a
 // value captured at subscribe time would keep overriding their explicit choice.
 try {
 if (localStorage.getItem(THEME_KEY) === null) setIsDark(e.matches);
 } catch {
 setIsDark(e.matches);
 }
 };
 mq.addEventListener('change', follow);
 return () => mq.removeEventListener('change', follow);
 }, []);

 useEffect(() => {
 document.documentElement.classList.toggle('dark', isDark);

 /* The two <meta name="theme-color"> tags key off prefers-color-scheme, but this app's
    dark mode is a manual class — so a user on a light phone who taps the moon gets a
    dark app and a light browser chrome, which is the same "band of the wrong colour at
    the screen edge" by another route. Drive the live value from the actual state. */
 const el = document.querySelector('meta[name="theme-color"]:not([media])')
 ?? Object.assign(document.createElement('meta'), { name:'theme-color' });
 el.setAttribute('content', isDark ?'#0E0E0D' :'#F5F4F2');
 /* FIRST in <head>, not last, and that ordering is the whole fix.

    A browser picks the FIRST theme-color whose media matches. The two media tags are
    at the top of index.html, so on a phone set to dark the `prefers-color-scheme: dark`
    tag matched and won at #0F0C0A — and this live tag, appended at the END of head,
    was never reached. Appending it was a no-op for the exact case it exists to handle.

    The visible result on a dark-system phone with the app in light mode: Safari painted
    its chrome near-black around a bone-white page, a hard black band welded to the top
    of the screen beside the Dynamic Island. Reported repeatedly as a "gap" behind the
    header. It is not a gap and there was never anything wrong with the header's
    safe-area model — checks measured that correctly all along.

    Unreproducible in headless Chromium at default settings, because the app's manual
    dark class and the emulated system scheme agree there. It took a real Mobile Safari
    frame (ci/ios-shots, dark-find.png) to see it: black system chrome, light app. */
 if (document.head.firstChild !== el) document.head.prepend(el);
 }, [isDark]);

 /**
  * The document title never changed. Every screen, every venue, every recipe was
  * "What's Good — Find your next great meal": in the tab bar, in browser history, in
  * the iOS share sheet and in anything a user saves to their home screen. A real app
  * names where you are. This is also what makes browser history usable at all — a back
  * menu of nine identical entries is not navigation.
  */
 useEffect(() => {
 const base = "What's Good";
 const tabName: Record<string, string> = {
'mood':'Find a place',
'random':'Stay in',
'happy-hour':'Happy hour',
'saved-recipes':'Saved',
'saved-eateries':'Saved',
 };
 document.title = selectedRecipe
 ? `${selectedRecipe.name} · ${base}`
 : `${tabName[activeTab] ?? base}${city ? ` in ${city}` : ''} · ${base}`;
 }, [selectedRecipe, activeTab, city]);

 /**
  * Deep links. The app kept every bit of navigation in React state and nothing in the
  * URL, so a refresh dropped you back on Find, and no screen in the product could be
  * shared, bookmarked or reopened — the tab you sent someone was always the tab THEY
  * last used. `?tab=` and `?city=` are the two pieces of state that are stable enough
  * to be addressable (venue ids come from a Places query and are not).
  *
  * replaceState, not push: a tab switch should not add a history entry that the back
  * gesture then has to chew through before it can close a detail view.
  */
 useEffect(() => {
 const url = new URL(window.location.href);
 activeTab ==='mood' ? url.searchParams.delete('tab') : url.searchParams.set('tab', activeTab);
 city ? url.searchParams.set('city', city) : url.searchParams.delete('city');
 if (url.toString() !== window.location.href) {
 window.history.replaceState(window.history.state, '', url);
 }
 }, [activeTab, city]);

 useEffect(() => {
 // Guarded like every other localStorage write in this file — Safari private mode
 // throws on setItem, and an uncaught throw here surfaces the ErrorBoundary on load.
 try { localStorage.setItem('whats_good_city', city); } catch {}
 }, [city]);

 // Detect the user's real city automatically on first load — no manual picker.
 // If they deny or the browser has no geolocation, we quietly keep the cached/default city.
 //
 // EXCEPT when the link already named a city. `?city=` wins over everything (see the
 // useState above), so asking the OS for a position we are then going to discard buys
 // nothing and costs the user a permission dialog over the first screen they ever see.
 // Someone opening "what's good in Lisbon" is asking about Lisbon, not about where they
 // are standing. The explicit "Sort nearby" control still requests it (userInitiated),
 // so nothing is taken away — it just stops being the app's opening move.
 //
 // This also unblocks the iOS capture: every screenshot the workflow has ever produced
 // was Safari's location prompt sitting on top of the Find tab, because CI loads
 // `?tab=…&city=London`. Denying the permission at the simulator level did NOT fix that
 // — `simctl privacy` governs Safari's own access, while the per-site web prompt is
 // separate. This does fix it, and is the right behaviour regardless of CI.
 useEffect(() => {
 const cityFromUrl = (() => {
 try { return new URLSearchParams(window.location.search).get('city')?.trim() || ''; }
 catch { return ''; }
 })();
 if (cityFromUrl) return;
 requestUserLocation();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const { savedRecipes, toggleSavedRecipe, clearSavedRecipes } = useSavedRecipes();
 const savedIds = savedRecipes.map((r) => r.id);

 const handleToggleSave = (recipe: ParsedRecipe) => {
 toggleSavedRecipe(recipe);
 };

 const handleClearAllSaved = () => {
 clearSavedRecipes();
 };

 // Switch tabs and clean up states.
 //
 // Navigation owns the mode. The filter panel used to carry its own Find/Stay In
 // segmented control that duplicated these tabs and could disagree with them — that is
 // why Stay In looked like the home page. `capacity` is the field that has to be
 // scrubbed here: it holds a PRICE tier in dine-out and an EFFORT string in cooking, so
 // leaking one into the other silently filters everything out.
 const DEFAULT_EFFORT = 'medium effort, around 30 minutes';
 const handleTabSwitch = (tab: ActiveTab) => {
 setPrevTab(activeTab);
 setActiveTab(tab);
 setRecipes([]);
 setSelectedRecipe(null);
 setError(null);
 setFiltersOpen(tab ==='mood');
 if (tab === 'random') {
 setDimensions((prev) => ({
 ...prev,
 locationMode: 'gourmet',
 searchQuery: '',
 regional: null,
 cuisines: [],
 capacity: prev.capacity?.includes('effort') ? prev.capacity : DEFAULT_EFFORT,
 }));
 } else if (tab === 'mood') {
 setDimensions((prev) => ({
 ...prev,
 locationMode: 'dineout',
 regional: null,
 cuisines: [],
 capacity: prev.capacity?.includes('effort') ? null : prev.capacity,
 }));
 }
 };

 const resetHome = () => {
 handleTabSwitch('mood');
 setAvailableCuisines([]);
 setDimensions({
 vibe: null,
 diet: null,
 regional: null,
 cuisines: [],
 capacity: null,
 searchQuery:'',
 locationMode:'dineout',
 });
 };

 // Pin a typed destination (e.g. search Paris while standing in Cape Town). We
 // Title-Case it so "paris" reads as "Paris" in the badge, and mark it manual so
 // the background geolocation detect leaves it alone until they reset.
 const handleCitySubmit = () => {
 const next = cityDraft.trim().replace(/\s+/g,' ');
 if (!next) return;
 const titled = next.replace(/\b\w/g, (c) => c.toUpperCase());
 setCity(titled);
 setCityIsManual(true);
 setCityDraft('');
 setCityMenuOpen(false);
 };

 // Drop the pinned destination and go back to real geolocation.
 const resetToMyLocation = () => {
 setCityMenuOpen(false);
 setCityIsManual(false);
 requestUserLocation(true);
 };

 // Re-run the search whenever a filter changes, on both browse tabs. Stay In gets the
 // same live-filtering behaviour as Find — it's a browse surface now, not a slot machine,
 // so landing on it should already show food rather than an empty pitch card.
 //
 // Debounced, because this fires on every filter keystroke and toggle. Choosing a
 // cuisine, then a vibe, then a price used to be three full searches — six billed Places
 // calls — for two answers nobody ever read. The delay is short enough to feel immediate
 // when the user stops, and the cleanup cancels a search the user has already replaced.
 useEffect(() => {
 if (hasSharedDetail) return;
 if (activeTab !=='mood' && activeTab !=='random') return;
 const timer = setTimeout(() => { handleTriggerMatch(); }, SEARCH_DEBOUNCE_MS);
 return () => clearTimeout(timer);
 }, [activeTab, dimensions.locationMode, dimensions.vibe, dimensions.diet, dimensions.regional, dimensions.cuisines, dimensions.capacity, userCoords, city, hasSharedDetail]);

 // Perform fetching from TheMealDB or local structures
 const handleTriggerMatch = async (customQuery?: string, customMode?:'dineout' |'gourmet') => {
 // Every search takes a ticket. Only the holder of the newest one is allowed to write
 // state, so a slow first response can no longer land on top of a fast second and show
 // results for a filter the user has already moved off. The previous search's requests
 // are aborted rather than left to finish unread — they cost money either way.
 const runId = ++searchRunIdRef.current;
 searchAbortRef.current?.abort();
 const abortController = new AbortController();
 searchAbortRef.current = abortController;
 const isCurrent = () => runId === searchRunIdRef.current;

 setIsLoading(true);
 setError(null);
 setNotice(null);
 setRecipes([]);
 setSelectedRecipe(null);

 try {
 const activeMode = customMode || dimensions.locationMode;
 if (activeMode ==='dineout') {
 // Two failures used to look identical on screen: "we searched and found nothing"
 // and "we never searched at all". Both rendered the generic empty state under a
 // heading promising real places nearby, which is the Recover stage skipped (§5).
 // Name them instead — each one has a different next step for the user.
 if (!isPlacesConfigured()) {
 setRecipes([]);
 setNotice(venueFailureNotice({ status:'unconfigured' }));
 setIsLoading(false);
 return;
 }
 if (!city && !userCoords) {
 // The query would have been "best restaurants in " — a real request, sent to a
 // real API, guaranteed to be meaningless. Ask for the one thing that is missing.
 setRecipes([]);
 setNotice({
 title:'Where are you?',
 message:
'Tap "Set location" in the header, or allow location access, and we will find ' +
'places near you.',
 canRetry: true,
 });
 setIsLoading(false);
 return;
 }
 // `capacity` carries the price band here and a cook-effort string on Stay In, so it
 // is parsed rather than trusted: anything non-numeric is "no price filter", never a
 // NaN handed to the API. Until React types were installed this string was passed
 // straight into a `number` parameter and compared with `!==` against a number — both
 // silently always-false, so the budget filter did nothing at all.
 const parsedTier = Number(dimensions.capacity);
 const priceFilter =
 customQuery || !Number.isInteger(parsedTier) || parsedTier < 1 || parsedTier > 4
 ? null
 : parsedTier;

 // Build a Places API search string from available filters.
 // Vibe is translated to a dining keyword; price is passed separately so
 // Places filters it server-side (keeps all 20 result slots useful).
 const placesSearchTerms = [
 customQuery !== undefined ? customQuery : dimensions.searchQuery.trim(),
 customQuery === undefined && dimensions.cuisines.length > 0 ? dimensions.cuisines.join(' ') : null,
 customQuery === undefined && dimensions.vibe ? VIBE_PLACE_TERMS[dimensions.vibe] : null,
 customQuery === undefined ? dimensions.diet : null,
 ].filter(Boolean).join(' ');

 // No local fallback venue set. This used to seed the list with the app's original
 // South African venues whenever the city happened to be Cape Town, which meant the
 // fallback path served real-looking venues from one specific country while the rest
 // of the world got nothing. An empty list lands on the honest empty state, which
 // tells the user what went wrong and offers a way forward (§5, Recover). Showing
 // someone a venue 9,000 km away is worse than showing them none.
 let eateryList: Venue[] = [];
 let usingPlacesApi = false;
 const outcome = await fetchVenues(placesSearchTerms, city, priceFilter, abortController.signal);

 // A search the user has already replaced must not write anything — not results, not
 // a notice, not even the loading flag, which the newer search now owns.
 if (!isCurrent()) return;

 if (outcome.status ==='ok') {
 eateryList = outcome.venues;
 usingPlacesApi = outcome.venues.length > 0;
 } else if (outcome.status ==='aborted') {
 return;
 } else {
 // Each of these was previously an empty list under "Nothing matched that
 // combination" — an answer that blames the user's filters for the app's
 // configuration or Google's budget, and offers a next step that cannot work.
 const failure = venueFailureNotice(outcome);
 setRecipes([]);
 setNotice(failure);
 setIsLoading(false);
 return;
 }

 if (dimensions.cuisines.length === 0 && customQuery === undefined) {
 const nextCuisines = Array.from(new Set(
 eateryList.map((eatery) => eatery.cuisine.trim()).filter(Boolean),
 ));
 setAvailableCuisines(nextCuisines);
 }

 const tempRecipes: ParsedRecipe[] = [];
 eateryList.forEach((eatery) => {
 // Price filter client-side only for the hardcoded list — Places results
 // were already filtered server-side via priceLevels.
 if (!usingPlacesApi && priceFilter && eatery.priceTier !== priceFilter) return;

 // Vibe filter only applies to the (now non-existent) hardcoded list — Places
 // results are scoped server-side by the query and narrowed client-side for display
 // by `displayedRecipes`. Cuisine and free-text live there now, not here, so both
 // tabs filter from the same single source of truth instead of two that can disagree.
 if (!usingPlacesApi) {
 const cuisineFilters = customQuery ? [] : dimensions.cuisines;
 if (cuisineFilters.length > 0 && !cuisineFilters.some((c) => eatery.cuisine.toLowerCase().includes(c.toLowerCase()))) return;

 const vibeFilter = customQuery ? null : dimensions.vibe;
 if (vibeFilter && eatery.vibeMatch !== vibeFilter) return;
 }

 tempRecipes.push(createEateryResult(eatery, city, userCoords));
 });

 // Open venues first — someone searching at 9pm needs somewhere they can
 // actually go; a closed spot ranking above an open one is a dead end.
 // Within each group, nearest first (when we have the user's location).
 // openNow can be undefined (unknown hours) — treat that as open rather
 // than burying venues we simply lack data for.
 tempRecipes.sort((a: any, b: any) => {
 const aClosed = a.rawEatery?.openNow === false ? 1 : 0;
 const bClosed = b.rawEatery?.openNow === false ? 1 : 0;
 if (aClosed !== bClosed) return aClosed - bClosed;
 return userCoords ? (a.distanceVal || 0) - (b.distanceVal || 0) : 0;
 });

 if (!isCurrent()) return;
 setRecipes(tempRecipes);
 if (tempRecipes.length === 1) {
 setSelectedRecipe(tempRecipes[0]);
 }
 } else {
 // GOURMET RECIPES FROM THEMEALDB
 let finalMeals: Meal[] = [];
 const directSearchText = customQuery !== undefined ? customQuery : dimensions.searchQuery.trim();

 if (directSearchText) {
 // Signal threaded so a superseded search is aborted (and lands in the isCurrent()
 // guard) rather than running to completion; res.ok guarded so an HTML/error body
 // is an empty result, not a JSON parse throw.
 const res = await fetch(
 `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(directSearchText)}`,
 { signal: abortController.signal }
);
 const data = res.ok ? await res.json() : { meals: [] };
 finalMeals = data.meals || [];
 } else {
 const terms = mapCoordinatesToQueries(dimensions.vibe, dimensions.regional);
 // Fetch a wide slice of terms in parallel — TheMealDB's pool is small
 // (~300 meals), so more terms is the only way to surface variety.
 const fetchPromises = terms.slice(0, 8).map(async (term) => {
 try {
 const res = await fetch(
 `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`,
 { signal: abortController.signal }
);
 if (!res.ok) return [];
 const data = await res.json();
 return (data.meals as Meal[]) || [];
 } catch {
 return [];
 }
 });

 const resultsArray = await Promise.all(fetchPromises);
 const aggregated = resultsArray.flat();

 const seenIds = new Set<string>();
 finalMeals = aggregated.filter((m) => {
 if (!m.idMeal || seenIds.has(m.idMeal)) return false;
 seenIds.add(m.idMeal);
 return true;
 });

 if (dimensions.capacity) {
 // Count ingredients ONCE per meal. The comparator used to run Object.keys()+filter
 // over both operands on every comparison — O(n log n) recomputes of the same counts.
 const ingCount = (m: Meal) =>
 Object.keys(m).filter((k) => k.startsWith('strIngredient') && m[k]?.trim()).length;
 const counts = new Map<Meal, number>(finalMeals.map((m) => [m, ingCount(m)] as const));
 const dir = dimensions.capacity.includes('low') ? 1 : dimensions.capacity.includes('high') ? -1 : 0;
 if (dir !== 0) {
 finalMeals.sort((a, b) => dir * ((counts.get(a) ?? 0) - (counts.get(b) ?? 0)));
 }
 } else {
 // No effort sort — shuffle so the same few meals don't lead every search
 for (let i = finalMeals.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 [finalMeals[i], finalMeals[j]] = [finalMeals[j], finalMeals[i]];
 }
 }
 }

 if (!isCurrent()) return;
 if (finalMeals.length === 0) {
 setRecipes([]);
 setSelectedRecipe(null);
 } else {
 const parsed = finalMeals.map((m) => parseMealToRecipe(m, dimensions.capacity));
 setRecipes(parsed);

 if (parsed.length === 1) {
 setSelectedRecipe(parsed[0]);
 } else {
 setSelectedRecipe(null);
 }
 }
 }
 } catch (err) {
 if (!isCurrent()) return;
 console.error('Error fetching recipes:', err);
 setError('Something went wrong while fetching results. Check your connection and try again.');
 } finally {
 // The newest search owns the loading flag. Clearing it from a superseded run puts
 // the app back to "done" while the search the user is waiting for is still running.
 if (isCurrent()) setIsLoading(false);
 }
 };

 // Finds restaurants matching the flavor profile / category of a selected recipe
 const handleFindCorrespondingRestaurants = (recipe: ParsedRecipe) => {
 const nameLower = recipe.name.toLowerCase();
 const catLower = (recipe.category ||'').toLowerCase();
 const ingredientsLower = recipe.ingredients.map(i => i.toLowerCase());

 let matchedQuery ='';

 // Check key cuisine pairings
 if (
 catLower.includes('chicken') || 
 nameLower.includes('chicken') || 
 nameLower.includes('peri') || 
 ingredientsLower.some(i => i.includes('chicken') || i.includes('poultry'))
) {
 matchedQuery ='chicken';
 } else if (
 catLower.includes('seafood') || 
 catLower.includes('fish') || 
 nameLower.includes('fish') || 
 nameLower.includes('seafood') || 
 nameLower.includes('squid') || 
 nameLower.includes('prawn') || 
 nameLower.includes('shrimp') || 
 nameLower.includes('tuna') || 
 nameLower.includes('salmon') ||
 ingredientsLower.some(i => i.includes('fish') || i.includes('shrimp') || i.includes('prawn') || i.includes('tuna') || i.includes('salmon') || i.includes('seafood'))
) {
 matchedQuery ='seafood';
 } else if (
 catLower.includes('burger') || 
 nameLower.includes('burger') || 
 nameLower.includes('patty') ||
 ingredientsLower.some(i => i.includes('burger') || i.includes('patty'))
) {
 matchedQuery ='burger';
 } else if (
 catLower.includes('beef') || 
 nameLower.includes('beef') || 
 nameLower.includes('steak') || 
 nameLower.includes('meat') || 
 nameLower.includes('rib') || 
 nameLower.includes('lamb') || 
 nameLower.includes('fillet') ||
 ingredientsLower.some(i => i.includes('beef') || i.includes('lamb') || i.includes('steak') || i.includes('meat') || i.includes('fillet'))
) {
 matchedQuery ='beef';
 } else if (
 catLower.includes('dessert') || 
 nameLower.includes('dessert') || 
 nameLower.includes('cake') || 
 nameLower.includes('sweet') || 
 nameLower.includes('chocolate') || 
 nameLower.includes('cocoa') ||
 ingredientsLower.some(i => i.includes('chocolate') || i.includes('sugar') || i.includes('sweet'))
) {
 matchedQuery ='sweet';
 } else if (
 nameLower.includes('cheese') || 
 nameLower.includes('toast') || 
 nameLower.includes('bread') || 
 nameLower.includes('sandwich') ||
 ingredientsLower.some(i => i.includes('cheese') || i.includes('bread') || i.includes('toast'))
) {
 matchedQuery ='cheese';
 } else {
 // Fallback: Use some ingredient or first word of the recipe name
 matchedQuery = recipe.ingredients[0] || recipe.name.split('')[0] ||'';
 }

 // Now update dimensions, switch mode to dineout, and trigger the match immediately
 const updatedDims: Dimensions = {
 ...dimensions,
 locationMode:'dineout',
 vibe: null,
 regional: null,
 cuisines: [],
 capacity: null,
 searchQuery: matchedQuery,
 };

 setDimensions(updatedDims);
 setActiveTab('mood');
 setSelectedRecipe(null);
 handleTriggerMatch(matchedQuery,'dineout');
 };

 // Serendipity engine random match fetcher
 const handleRandomWildcard = async () => {
 setIsLoading(true);
 setError(null);
 setNotice(null);
 setRecipes([]);
 setSelectedRecipe(null);

 try {
 if (dimensions.locationMode ==='dineout') {
 // "Surprise me" used to roll a die over the hardcoded South African venue list, so
 // on this tab it returned a Cape Town restaurant to everyone, everywhere, regardless
 // of the city in the header. With no local list there is nothing to roll against and
 // nothing to invent: re-run the real search and let the live results answer.
 setIsLoading(false);
 handleTriggerMatch(undefined,'dineout');
 return;
 } else {
 // Gourmet Wildcard Search
 const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
 const data = await res.json();
 const meals = (data.meals as Meal[]) || [];
 
 if (meals.length > 0) {
 const pooledCapacities = [
'low effort, under 20 minutes',
'medium effort, around 30 minutes',
'high effort, I want to properly cook today',
 ];
 const randomCapacity = pooledCapacities[Math.floor(Math.random() * pooledCapacities.length)];
 
 const parsed = parseMealToRecipe(meals[0], randomCapacity);
 setRecipes([parsed]);
 setSelectedRecipe(parsed);
 } else {
 setError('Zero random meals were returned from the recipe archive.');
 }
 }
 } catch (err) {
 console.error('Error fetching random recipe:', err);
 setError('Connection disrupted. Unable to find a recipe.');
 } finally {
 setIsLoading(false);
 }
 };

 // Hardware / browser / swipe back closes the detail view.
 //
 // On iOS Safari the edge-swipe fires popstate, and on a home-screen web app there is
 // no browser chrome at all — so without this the ONLY exit from a detail page is the
 // in-app Back button. That button was itself conditional until now (see RecipeView),
 // which is how the app ended up with pages you could enter and not leave. Two
 // independent exits is the Apple HIG expectation, not a nicety.
 //
 // We push ONE history entry on open and retire it on in-app close, so the stack stays
 // balanced and Back never needs a second press after a normal close.
 //
 // The pushed entry carries minimal, serialisable state — the item id (which is also the
 // truthy `whatsGoodDetail` marker), the tab it was opened from, and the list scroll
 // offset. That is what lets browser FORWARD re-open the same detail: `detailItemRef`
 // still holds the item object within the session (venue ids are not addressable across
 // a refresh by design — a refreshed detail URL simply lands on the list, never a wrong
 // screen), and popstate reconciles `selectedRecipe` to whatever the current entry says
 // rather than always closing. The scroll engine above keys off `selectedRecipe?.id`:
 // opening starts the detail at the top, going back restores the list offset.
 const pushedDetailEntry = useRef(false);
 const detailItemRef = useRef<ParsedRecipe | null>(null);
 useEffect(() => {
 if (selectedRecipe && !pushedDetailEntry.current) {
 detailItemRef.current = selectedRecipe;
 window.history.pushState(
 { whatsGoodDetail: selectedRecipe.id, tab: activeTab, listScrollY: listScrollY.current },
 '',
 );
 pushedDetailEntry.current = true;
 } else if (!selectedRecipe && pushedDetailEntry.current) {
 // Closed from inside the app — retire the entry we added, which keeps the in-app
 // Back button behaviourally identical to a browser Back (#5).
 pushedDetailEntry.current = false;
 if (window.history.state?.whatsGoodDetail) window.history.back();
 }
 }, [selectedRecipe, activeTab]);

 useEffect(() => {
 const onPop = () => {
 const st = window.history.state as { whatsGoodDetail?: string } | null;
 if (st?.whatsGoodDetail) {
 // Forward into (or onto) a detail entry — reopen the same item if we still hold
 // it. Set the flag first so the open effect does not push a duplicate entry (#6).
 pushedDetailEntry.current = true;
 const item = detailItemRef.current;
 if (item && item.id === st.whatsGoodDetail) setSelectedRecipe(item);
 } else {
 // Back to the list entry.
 pushedDetailEntry.current = false;
 setSelectedRecipe(null);
 }
 };
 window.addEventListener('popstate', onPop);
 return () => window.removeEventListener('popstate', onPop);
 }, []);

 const sharedDetailLoaded = useRef(false);
 useEffect(() => {
 if (sharedDetailLoaded.current || !hasSharedDetail) return;
 if (initialSharedMeal) {
 sharedDetailLoaded.current = true;
 fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(initialSharedMeal)}`)
 .then((response) => response.json())
 .then((data) => {
 const meal = data.meals?.[0] as Meal | undefined;
 if (!meal) {
 setError('This recipe link has expired or is unavailable.');
 return;
 }
 const parsed = parseMealToRecipe(meal);
 setActiveTab('random');
 setRecipes([parsed]);
 setSelectedRecipe(parsed);
 })
 .catch(() => setError('This recipe link could not be opened right now.'));
 return;
 }
 if (!initialSharedVenue) return;
 if (!city) {
 setError('This restaurant link needs a location before it can open.');
 return;
 }
 sharedDetailLoaded.current = true;
 setIsLoading(true);
 fetchVenues(initialSharedVenueName, city, null, undefined)
 .then((outcome) => {
 if (outcome.status !== 'ok') {
 setError('This restaurant link could not be opened right now.');
 return;
 }
 const wantedId = initialSharedVenue;
 const wantedName = initialSharedVenueName.toLowerCase();
 const venue = outcome.venues.find((item) => item.id === wantedId)
 || (wantedName ? outcome.venues.find((item) => item.name.toLowerCase() === wantedName) : undefined);
 if (!venue) {
 setError('This restaurant was not returned by Google for that location.');
 return;
 }
 const parsed = createEateryResult(venue, city, userCoords);
 setActiveTab('mood');
 setRecipes([parsed]);
 setSelectedRecipe(parsed);
 })
 .catch(() => setError('This restaurant link could not be opened right now.'))
 .finally(() => setIsLoading(false));
 }, [city, hasSharedDetail, initialSharedMeal, initialSharedVenue, initialSharedVenueName, userCoords]);

 // Cuisine suggestions come from the last unfiltered venue set and stay stable while
 // a cuisine is selected. Recomputing them from filtered results made new chips appear
 // after tapping Italian, which shifted the user's choices and implied that tapping a
 // second chip was a hidden multi-step action. A cuisine change replaces the current
 // cuisine filter; it does not rewrite the menu underneath the user's finger.
 const nearbyCuisines = availableCuisines;

 const tabOrder: ActiveTab[] = ['mood','happy-hour','random','saved-recipes','saved-eateries'];
 const isSlideRight = tabOrder.indexOf(activeTab) >= tabOrder.indexOf(prevTab);
 /* At lg+ the filter panel stops being a collapsing accordion and becomes a persistent
    left rail. When there is no rail to show, <main> spans BOTH grid columns — otherwise
    it would be placed into the 320px track and the results would render 320px wide. */
 const showRail = activeTab === 'mood' && !selectedRecipe;
 // featuredEatery/featuredResult removed with the "Best fit" card — they pinned
 // SOUTH_AFRICAN_EATERIES[0] as everyone's recommendation. See StatusStates.tsx.

 return (
 <div className="min-h-dvh flex flex-col relative text-[var(--charcoal)] antialiased">
 {/* Global Header */}
 {/* HIG: index.html sets apple-mobile-web-app-capable, so once this is added to the
 home screen the web view runs full-bleed and content sits UNDER the status bar /
 Dynamic Island. Padding the fixed header by the top inset keeps the logo and the
 controls clear of it; in a normal browser tab the inset is 0 and nothing moves. */}
 <header
 ref={headerRef}
 className={`chrome-bar safe-x safe-x-wide flex items-center justify-between fixed top-0 left-0 right-0 z-50 select-none !rounded-none${chromeHidden ? ' is-hidden' : ''}`}
 style={{ height:'calc(72px + env(safe-area-inset-top))', paddingTop:'env(safe-area-inset-top)' }}
 >
 {/* Logo */}
 <div 
 className="flex items-center gap-2.5 group"
 >
 {/*
   This whole row used to be one `div role="button" tabIndex={0}` with an onClick and
   no aria-label — and the city button lived INSIDE it. Three defects in one element:
   a button nested in a button, which is invalid and makes a tap near the badge
   ambiguous; a control announced to screen readers as an unlabelled "button"; and a
   28px target that no amount of .hit-44 could fix, because its own child was
   stopPropagation-ing the clicks back out.

   The home affordance is now a real <button> around the mark and wordmark only. The
   city badge is its sibling, not its descendant, so each owns its own hit area.
 */}
 <button
 type="button"
 onClick={resetHome}
 aria-label="What's Good — back to the start"
 className="tap-44 flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
 >
 <span className="w-6.5 h-6.5 bg-[var(--charcoal)] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center transform transition-transform group-hover:scale-105">
 <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
 <path
 d="M12 3C8 3 5 7 5 11c0 3 1.5 5.5 4 7v2h6v-2c2.5-1.5 4-4 4-7 0-4-3-8-7-8z"
 fill="white"
 />
 </svg>
 </span>
 <span className="font-serif text-xl sm:text-[22px] font-semibold tracking-tight flex items-center gap-1.5 select-none whitespace-nowrap">
 <span>What's</span> <span className="text-[var(--accent-terracotta)] italic font-normal">Good</span>
 </span>
 </button>

 <div className="font-serif text-xl sm:text-[22px] font-semibold tracking-tight flex items-center gap-1.5 select-none">
 {/* City badge doubles as a destination picker — search a city you're not in. */}
 <span className="relative ml-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
 <button
 type="button"
 onClick={() => setCityMenuOpen((o) => !o)}
 title="Search another city"
 aria-label={city ? `Location: ${city}. Tap to search another city.` : 'No location set. Tap to choose a city.'}
 // Measured 28px. The note that used to sit here called that "the honest
 // compromise" for a badge that doubles as a button — fair when the app
 // defaulted to a city and this was a nicety. It is not a nicety now: with no
 // default city, this is the primary control for the one piece of state the
 // whole Find journey depends on, and it was the smallest target on screen.
 // `.hit-44` buys the reach without drawing a 44px slab beside the wordmark,
 // which is the thing that note was right to refuse.
 className="hit-44 flex items-center gap-1 text-xs bg-black dark:bg-[#222222] text-white pl-2.5 pr-2 py-1.5 rounded-lg tracking-wide font-semibold cursor-pointer hover:opacity-85 transition-opacity whitespace-nowrap"
 >
 {cityIsManual && <MapPin className="w-2.5 h-2.5" />}
 <span>{city || 'Set location'}</span>
 <ChevronRight className={`w-2.5 h-2.5 opacity-70 transition-transform ${cityMenuOpen ?'rotate-90' :''}`} />
 </button>
 {cityMenuOpen && (
 <>
 <div className="fixed inset-0 z-[55]" onClick={() => setCityMenuOpen(false)} />
 <div className="absolute left-0 top-full mt-2 w-64 p-2 rounded-2xl bg-[var(--bg-warm)] border border-[var(--border-color)] shadow-[0_16px_44px_rgba(0,0,0,0.20)] z-[60] font-sans">
 <form onSubmit={(e) => { e.preventDefault(); handleCitySubmit(); }} className="flex items-center gap-1.5">
 <input
 autoFocus
 value={cityDraft}
 onChange={(e) => setCityDraft(e.target.value)}
 aria-label="Search another city"
 placeholder="Search another city…"
 className="flex-1 min-w-0 bg-transparent text-[13px] font-normal text-[var(--charcoal)] placeholder:text-[var(--text-muted)] px-2 py-1.5 rounded-lg border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-tint-border)]"
 />
 <button type="submit" aria-label="Search this city" className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer">
 <Search className="w-3.5 h-3.5" />
 </button>
 </form>
 {cityIsManual ? (
 <button type="button" onClick={resetToMyLocation} className="mt-1.5 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] text-[var(--text-muted)] hover:text-[var(--charcoal)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
 <MapPin className="w-3 h-3 flex-shrink-0" /> Reset to my location
 </button>
 ) : (
 <p className="mt-1.5 px-2 text-xs leading-snug text-[var(--text-muted)]">Choose a city to see places near you, or search another destination.</p>
 )}
 </div>
 </>
 )}
 </span>
 </div>
 </div>

 {/* Header Right Segment with GPS Sorting & Tab Selector */}
 <div className="flex items-center gap-1">
 <button
 id="location-header-toggle"
 onClick={() => requestUserLocation(true)}
 disabled={locState ==='requesting'}
 title={
 locState ==='granted' ?'Location on — results sorted by distance'
 : locState ==='denied' ?'Location denied — tap to try again'
 :'Sort results by distance to you'
 }
 aria-label="Sort nearby using your location"
 // Was a colour-flipping pill — emerald when granted, amber and *pulsing* while
 // locating, red when denied — with a second pulse on the icon inside it. Three
 // saturated colours that appear nowhere else in the palette, animating, in the
 // one bar that should sit still. State rides on the icon alone now: accent when
 // it's on, MapPinOff once denied, dimmed while it resolves. The full sentence
 // stays in the tooltip and the aria-label, where it costs nothing to read.
 className="hit-44 flex w-10 h-10 items-center justify-center rounded-full transition-colors cursor-pointer flex-shrink-0 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:cursor-default"
 >
 {locState ==='denied' ? (
 <MapPinOff className="w-4 h-4 text-[var(--text-muted)]" />
) : (
 <MapPin
 className={`w-4 h-4 ${
 locState ==='granted'
 ?'text-[var(--accent-terracotta)]'
 : locState ==='requesting'
 ?'text-[var(--text-muted)] opacity-40'
 :'text-[var(--text-muted)]'
 }`}
 />
)}
 </button>

 <button
 /* The ONLY writer of the stored preference. Persisting anywhere else (it used to
    happen in the apply-effect, i.e. on mount) records a choice the user never made
    and pins the app away from their system setting for good. */
 onClick={() => setIsDark((d) => {
 const next = !d;
 try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* private mode: session-only, still correct */ }
 return next;
 })}
 className="hit-44 flex w-10 h-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer flex-shrink-0"
 aria-label={isDark ?'Switch to light mode' :'Switch to dark mode'}
 >
 {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
 </button>

 {/* Desktop nav. On mobile this is replaced by the bottom tab bar below — five
 tabs in a horizontally-scrolling 50vw strip was unusable and hid Saved entirely. */}
 {/* Pill row, per docs/design/occasion-prototype.html `.tabs` — a recessed track with
 the selected tab lifted onto a raised surface. Text links top-right gave the four
 destinations no shared container and no visible selected state beyond ink colour. */}
 <nav className="desktop-nav hidden md:flex items-center gap-1 whitespace-nowrap rounded-full bg-[var(--surface-quiet-bg)] p-1" aria-label="Primary">
 <button
 onClick={() => handleTabSwitch('mood')}
 aria-current={activeTab === 'mood' ? 'page' : undefined}
 className={`desktop-nav-link hit-44 relative rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-200 ease-out cursor-pointer ${
 activeTab === 'mood'
 ? 'bg-[var(--surface-bg)] text-[var(--charcoal)] shadow-sm'
 : 'text-[var(--text-muted)] hover:text-[var(--charcoal)]'
 }`}
 >
 Eat out
 </button>
 <button
 onClick={() => handleTabSwitch('happy-hour')}
 aria-current={activeTab === 'happy-hour' ? 'page' : undefined}
 className={`desktop-nav-link hit-44 relative rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-200 ease-out cursor-pointer flex items-center gap-1.5 ${
 activeTab === 'happy-hour'
 ? 'bg-[var(--surface-bg)] text-[var(--charcoal)] shadow-sm'
 : 'text-[var(--text-muted)] hover:text-[var(--charcoal)]'
 }`}
 >
 <span>Out</span>
 </button>
 <button
 onClick={() => {
 setDimensions((prev) => ({ ...prev, locationMode: 'gourmet' }));
 handleTabSwitch('random');
 }}
 aria-current={activeTab === 'random' ? 'page' : undefined}
 className={`desktop-nav-link hit-44 relative rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-200 ease-out cursor-pointer ${
 activeTab === 'random'
 ? 'bg-[var(--surface-bg)] text-[var(--charcoal)] shadow-sm'
 : 'text-[var(--text-muted)] hover:text-[var(--charcoal)]'
 }`}
 >
 Cook
 </button>
 <button
 onClick={() => handleTabSwitch('saved-recipes')}
 aria-current={activeTab === 'saved-recipes' ? 'page' : undefined}
 className={`desktop-nav-link hit-44 relative rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-200 ease-out cursor-pointer flex items-center gap-1.5 ${
 activeTab === 'saved-recipes'
 ? 'bg-[var(--surface-bg)] text-[var(--charcoal)] shadow-sm'
 : 'text-[var(--text-muted)] hover:text-[var(--charcoal)]'
 }`}
 >
 <Heart className={`w-3 h-3 ${activeTab === 'saved-recipes' ? 'text-[var(--accent-terracotta)] fill-current' : 'text-[var(--accent-terracotta)]'}`} />
 <span>Saved{savedRecipes.length > 0 ? ` (${savedRecipes.length})` : ''}</span>
 </button>
 </nav>
 </div>
 </header>

 {/* Mobile tab bar — this is an app, so navigation lives at the thumb, not the
 forehead. Safe-area padding keeps it clear of the iOS home indicator. */}
 <nav
 className={`tabbar md:hidden safe-x fixed bottom-0 left-0 right-0 z-50 min-h-[var(--tabbar-h)] bg-[var(--bg-warm)] border-t border-[var(--rule)]${chromeHidden ? ' is-hidden' : ''}`}
 style={{ paddingBottom:'env(safe-area-inset-bottom)' }}
 aria-label="Primary"
 >
 <ul className="flex items-stretch">
 {([
 { tab:'mood' as ActiveTab, label:'Eat out', Icon: Search },
 { tab:'happy-hour' as ActiveTab, label:'Out', Icon: Sparkles },
 { tab:'random' as ActiveTab, label:'Cook', Icon: Dices },
 { tab:'saved-recipes' as ActiveTab, label:'Saved', Icon: Heart },
 ]).map(({ tab, label, Icon }) => {
 const active = activeTab === tab;
 return (
 <li key={tab} className="flex-1">
 <button
 onClick={() => {
 if (tab ==='random') setDimensions((prev) => ({ ...prev, locationMode:'gourmet' }));
 handleTabSwitch(tab);
 }}
 aria-current={active ?'page' : undefined}
 className="w-full min-h-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors press"
 >
 <span className="relative">
 <Icon
 className={`w-[18px] h-[18px] transition-colors ${active ?'text-[var(--accent-terracotta)]' :'text-[var(--text-subtle)]'}`}
 strokeWidth={active ? 2.2 : 1.8}
 />
 </span>
 <span
 className={`text-xs leading-none tracking-[-0.005em] ${
 active ?'text-[var(--accent-terracotta)] font-semibold' :'text-[var(--text-subtle)] font-medium'
 }`}
 >
 {label}
 </span>
 </button>
 </li>
 );
 })}
 </ul>
 </nav>

 {/* Main Layout Grid wrapper */}
 <div
 /* Content clearance for the fixed tab bar, from --tabbar-h + the home-indicator
    inset. A hardcoded 76px was a guess against 57px of chrome; when it ran short the
    last list row sat under the bar, unreachable. */
 /* `find-layout` flips the column proportions for the Find tab ONLY — wide
    decision column, narrow results column, per docs/design. It is scoped to this
    tab on purpose: the sidebar is `lg:hidden` everywhere else, so applying the
    flip globally leaves a dead 380px column on Stay In / Out / Saved and squeezes
    their grids. Class, not a blanket CSS override, for exactly that reason. */
 className={`flex-1 flex flex-col lg:grid lg:grid-cols-[320px_1fr] lg:gap-8 lg:items-start lg:max-w-[1440px] lg:mx-auto relative w-full items-center pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.25rem)] md:pb-0 desktop-shell${
 showRail ?' find-layout' :''
 }`}
 style={{ paddingTop:'calc(72px + env(safe-area-inset-top))' }}
 >
 {/* Sidebar as a drop-down/high-end legend filter section */}
 <div
 /* Mobile keeps the accordion (max-h collapse). At lg+ the accordion is switched OFF
    — a rail that animates to max-h-0 would leave a dead 320px column — so the panel
    is pinned open and sticky, or removed from the grid entirely on other tabs. */
 className={`transition-all duration-500 overflow-hidden w-full max-w-7xl mx-auto px-5 lg:px-8 desktop-filter-region ${
 activeTab ==='mood' && !selectedRecipe && filtersOpen ?'max-h-[1500px] opacity-100 mt-6' :'max-h-0 opacity-0 pointer-events-none'
 } ${showRail ?'lg:max-h-none lg:opacity-100 lg:pointer-events-auto lg:overflow-visible lg:mt-6' :'lg:hidden'}`}
 >
 {/* Single owner of the horizontal margin is the px-5 wrapper above. This card
 carries no padding of its own; the Sidebar owns only its inner rhythm. The old
 wrapper px-4 + card p-2 + aside px-6 stack put content 48px in on a 390px
 device and starved the Cuisine rail. */}
 <div className="surface filter-panel overflow-hidden mb-10 lg:mb-14 desktop-editorial-panel">
 <Sidebar
 dimensions={dimensions}
 nearbyCuisines={nearbyCuisines}
 onChange={setDimensions}
 onTriggerMatch={() => { handleTriggerMatch(); setFiltersOpen(false); }}
 isLoading={isLoading && activeTab ==='mood'}
 />
 </div>
 </div>

 {/* Tap to reveal filters — always visible once results exist, works on touch */}
 {activeTab ==='mood' && !selectedRecipe && (recipes.length > 0 || !filtersOpen) && (
 <button
 type="button"
 onClick={() => setFiltersOpen((v) => !v)}
 aria-expanded={filtersOpen}
 // Full-width, 44pt tall hit area; the pill inside stays small. The button is
 // the touch target, the pill is the ink — they are not the same rectangle.
 // lg:hidden — the rail is persistent on desktop, so a show/hide toggle has nothing
 // to do there, and as a third grid child it would consume a cell and displace <main>.
 className="w-full min-h-[44px] flex items-center justify-center -mt-4 z-40 relative group cursor-pointer lg:hidden"
 >
 <div className="surface-quiet filter-toggle px-4 py-1.5 flex items-center gap-2 transition-all transform group-hover:border-[#F5D1C9] dark:group-hover:border-[#7C2D12]/40">
 <span className="text-xs font-semibold tracking-[-0.005em] text-[var(--text-muted)] group-hover:text-[var(--accent-terracotta)]">
 {filtersOpen ? 'Hide filters' : 'Adjust filters'}
 </span>
 </div>
 </button>
)}

 {/* Right detailed journal screen content pane */}
 {/* page-grid, not flex + padding + max-w-7xl. The horizontal inset now lives in
 the grid's gutter columns and in each child's own px-5, never on <main> itself —
 padding on <main> is exactly what stopped the hero photo from reaching the
 viewport edge. `overflow-x-hidden` goes with it: it was silently clipping left
 overhang (that's what ate the Back button), and a grid cannot overflow
 horizontally, so it has nothing left to guard. */}
 <main className={`page-grid py-8 sm:py-12 lg:py-16 min-h-[calc(100dvh-72px)] w-full relative${showRail ?'' :' lg:col-span-2'}`}>

 {selectedRecipe ? (
 selectedRecipe.id.startsWith('eat-') ? (
 <EateryView
 recipes={displayedRecipes.length > 0 ? displayedRecipes : savedRecipes}
 selectedRecipe={selectedRecipe}
 onSelectRecipe={selectRecipeFromList}
 onRegenerate={activeTab ==='random' ? handleRandomWildcard : () => handleTriggerMatch()}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 onShare={shareRecipe}
 isSavedTab={activeTab ==='saved-recipes' || activeTab ==='saved-eateries'}
 // What the user actually asked for. The venue page can then say why THIS place
 // is in front of them without inventing a single fact about it. Omitted on the
 // saved tabs, where the filters on screen are not the ones that found the venue.
 intent={
 activeTab ==='saved-recipes' || activeTab ==='saved-eateries'
 ? undefined
 : {
 vibe: dimensions.vibe,
 cuisine: dimensions.cuisines.length === 1 ? dimensions.cuisines[0] : null,
 diet: dimensions.diet,
 priceTier: Number.isInteger(Number(dimensions.capacity))
 ? Number(dimensions.capacity)
 : null,
 query: dimensions.searchQuery.trim(),
 }
 }
 />
) : (
 <RecipeView
 recipes={displayedRecipes.length > 0 ? displayedRecipes : savedRecipes}
 selectedRecipe={selectedRecipe}
 onSelectRecipe={selectRecipeFromList}
 onRegenerate={activeTab ==='random' ? handleRandomWildcard : () => handleTriggerMatch()}
 isRandomMode={activeTab ==='random'}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 isSavedTab={activeTab ==='saved-recipes' || activeTab ==='saved-eateries'}
 onFindCorrespondingRestaurants={handleFindCorrespondingRestaurants}
 onShare={shareRecipe}
 />
)
) : (
 <div
 key={activeTab}
 // Sole owner of the mobile gutter for every tab's content now that <main> has
 // none. One place, so RecipeView / HappyHourView / the Stay In pane / the status
 // states all share a single left edge with the filter card above them.
 className={`w-full flex-1 flex flex-col justify-start px-5 sm:px-0 ${
 isSlideRight ?'animate-ios-slide-in-right' :'animate-ios-slide-in-left'
 }`}
 >
 {activeTab ==='mood' ? (
 // MOOD CORNER CANVAS
 isLoading ? (
 <LoadingState />
) : notice ? (
 <ErrorState
 tone="notice"
 title={notice.title}
 message={notice.message}
 showRetry={notice.canRetry}
 onRetry={() => handleTriggerMatch()}
 />
) : error ? (
 <ErrorState title="Something went wrong" message={error} onRetry={() => handleTriggerMatch()} />
) : displayedRecipes.length > 0 ? (
 <>
 {/* Active-filters bar — always visible above the results, so what is narrowing the
     list is never hidden and is removable in one tap even while the filter panel is
     collapsed (the count itself lives in the grid header just below). Mirrors the
     removable chips the empty-state recovery already uses. */}
 {activeConstraints.length > 0 && (
 <div className="max-w-[1200px] mx-auto w-full px-5 sm:px-8 lg:px-10 mb-5 flex flex-wrap items-center gap-2">
 <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mr-0.5">
 Filtering by
 </span>
 {activeConstraints.map((c) => (
 <button
 key={c.key}
 onClick={c.clear}
 aria-label={`Remove the ${c.label} filter, ${c.value}`}
 className="hit-44 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] px-3 py-1.5 cursor-pointer transition-colors hover:border-[var(--accent-terracotta)]"
 >
 <span className="font-sans text-[13px] font-medium text-[var(--accent-terracotta)] max-w-[16ch] truncate">
 {c.value}
 </span>
 <X className="w-3 h-3 flex-shrink-0 text-[var(--accent-terracotta)]" aria-hidden="true" />
 </button>
 ))}
 </div>
 )}
 <RecipeView
 recipes={displayedRecipes}
 selectedRecipe={selectedRecipe}
 onSelectRecipe={selectRecipeFromList}
 onRegenerate={() => handleTriggerMatch()}
 isRandomMode={false}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 onFindCorrespondingRestaurants={handleFindCorrespondingRestaurants}
 // The live filters, for the card grid's vibe pills — same shape EateryView's
 // detail page already builds from `dimensions`. Always defined here: this
 // branch only renders under the mood tab, never the saved tabs.
 intent={{
 vibe: dimensions.vibe,
 cuisine: dimensions.cuisines.length === 1 ? dimensions.cuisines[0] : null,
 diet: dimensions.diet,
 priceTier: Number.isInteger(Number(dimensions.capacity))
 ? Number(dimensions.capacity)
 : null,
 query: dimensions.searchQuery.trim(),
 }}
 />
 </>
) : activeConstraints.length > 0 ? (
 /* Contextual recovery (§5, the stage this app most often skipped). "Nothing matched
    that combination" is true and useless: it does not say WHICH part of the
    combination emptied the list, so the only way forward is to guess and re-guess.
    The constraints are the app's own state — naming them costs nothing and each one
    is removable in a tap, which re-runs the search through the normal debounced
    path. Nothing here claims anything about venues; it describes the query. */
 <div className="max-w-[520px] mx-auto py-14 px-7 sm:px-9 surface rounded-3xl">
 <div className="w-12 h-12 rounded-2xl bg-[var(--accent-tint)] border border-[var(--accent-tint-border)] flex items-center justify-center mb-6">
 <Search className="w-5 h-5 text-[var(--accent-terracotta)]" />
 </div>
 <h3 className="font-serif text-2xl sm:text-3xl text-[var(--heading-color)] mb-3 leading-tight">
 Nothing in {city ||'this area'} matched all of that
 </h3>
 <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 max-w-[44ch]">
 {activeConstraints.length === 1
 ?'One filter is doing the narrowing. Drop it and the search runs again:'
 :'These are the filters narrowing the search. Drop whichever matters least:'}
 </p>
 <ul className="flex flex-wrap gap-2.5">
 {activeConstraints.map((c) => (
 <li key={c.key}>
 <button
 onClick={c.clear}
 aria-label={`Remove the ${c.label} filter, ${c.value}`}
 className="hit-44 inline-flex items-center gap-2 rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] px-4 py-2.5 cursor-pointer transition-colors hover:border-[var(--accent-terracotta)]"
 >
 <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
 {c.label}
 </span>
 <span className="font-sans text-[14px] font-semibold text-[var(--accent-terracotta)]">
 {c.value}
 </span>
 <X className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent-terracotta)]" aria-hidden="true" />
 </button>
 </li>
))}
 </ul>
 {activeConstraints.length > 1 && (
 <button
 onClick={() => setDimensions((prev) => ({
 ...prev,
 vibe: null,
 diet: null,
 regional: null,
 cuisines: [],
 capacity: null,
 searchQuery:'',
 }))}
 className="hit-44 mt-6 font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--charcoal)] cursor-pointer transition-colors"
 >
 Clear all filters
 </button>
)}
 </div>
) : (
 <EmptyState
 city={city}
 onSearchRandom={() => {
 setDimensions((prev) => ({ ...prev, locationMode:'gourmet' }));
 handleTabSwitch('random');
 }}
 />
)
) : activeTab ==='happy-hour' ? (
 // HAPPY HOUR — time-sensitive drink deals across the current result set
 isLoading ? (
 <LoadingState count={4} />
) : (
 <HappyHourView
 city={city}
 />
)
) : activeTab ==='random' ? (
 // STAY IN — a cooking browse surface, deliberately NOT the Find layout.
 //
 // This used to render a black "Staying in tonight? → Find a recipe" card that was
 // dead on arrival: the branch it competed with required `selectedRecipe`, which is
 // always null here (the detail view is handled one level up), so the card showed
 // 100% of the time and the only way through was a random roll. You landed on an
 // empty pitch, gambled, and got one dish with no way to browse. Now the tab loads
 // real recipes immediately and filters live; "Surprise me" is demoted to what it
 // actually is — a shortcut, not the product.
 <div className="w-full max-w-[1120px] mx-auto">
 <div className="mb-10 lg:mb-12">
 <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--heading-color)]">
 Cooking tonight
 </h2>
 <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed max-w-[520px]">
 Pick something, scale it to your table, and send the ingredient list straight to a
 delivery basket.
 </p>

 {/* Time first — on a weeknight, "how long have I got" decides more than cuisine. */}
 <div className="mt-6 flex flex-col gap-4">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-[12px] font-semibold text-[var(--charcoal)] mr-1">Time</span>
 {[
 { label:'Under 20 min', value:'low effort, under 20 minutes' },
 { label:'About 30', value: DEFAULT_EFFORT },
 { label:'45+ min', value:'high effort, I want to properly cook today' },
 ].map((t) => (
 <button
 key={t.value}
 type="button"
 aria-pressed={dimensions.capacity === t.value}
 onClick={() => setDimensions((p) => ({ ...p, capacity: t.value }))}
 className={`press hit-44 px-4 py-2.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
 dimensions.capacity === t.value
 ?'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
 :'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 {t.label}
 </button>
 ))}
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <span className="text-[12px] font-semibold text-[var(--charcoal)] mr-1">Kitchen</span>
 {kitchens.map((c) => (
 <button
 key={c}
 type="button"
 aria-pressed={dimensions.regional === c}
 onClick={() => setDimensions((p) => ({ ...p, regional: p.regional === c ? null : c }))}
 className={`press hit-44 px-4 py-2.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
 dimensions.regional === c
 ?'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
 :'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 {c}
 </button>
 ))}
 <button
 type="button"
 onClick={handleRandomWildcard}
 className="press hit-44 ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] cursor-pointer transition-colors"
 >
 <Dices className="w-4 h-4" /> Surprise me
 </button>
 </div>
 </div>
 </div>

 {isLoading ? (
 <LoadingState />
) : error ? (
 <ErrorState title="That didn't work" message={error} onRetry={() => handleTriggerMatch()} />
) : recipes.length > 0 ? (
 <RecipeView
 recipes={recipes}
 selectedRecipe={null}
 onSelectRecipe={selectRecipeFromList}
 onRegenerate={() => handleTriggerMatch()}
 isRandomMode={false}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 onFindCorrespondingRestaurants={handleFindCorrespondingRestaurants}
 onShare={shareRecipe}
 />
) : (
 <p className="sm:px-4 py-16 text-sm text-[var(--text-muted)]">
 Nothing matched that combination. Try clearing the kitchen filter.
 </p>
)}
 </div>
) : (
 // SAVED RECIPES OR EATERIES COLLECTION TAB
 <div className="max-w-[720px] mx-auto w-full animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 {/* Sign-in sits ABOVE the list, as in the prototype: it is the answer to "what
 happens to this list", which is the question the Saved tab raises. */}
 {activeTab ==='saved-recipes' && <AuthPanel />}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--rule)] pb-6 mb-8 gap-4">
 <div>
 <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold block mb-1">
 {activeTab ==='saved-recipes' ?'Your shortlist' :'Grocery basket'}
 </span>
 <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--charcoal)]">
 {activeTab ==='saved-recipes' ?'Saved Places & Recipes' :'Basket'}
 </h2>
 <p className="text-[var(--text-muted)] font-sans text-sm mt-1">
 {activeTab ==='saved-recipes'
 ?'Restaurants first, recipes when you are staying in.'
 :'Ingredients from Stay In recipes will collect here later.'}
 </p>
 </div>
 {activeTab ==='saved-recipes' && savedRecipes.length > 0 && (
 <button
 onClick={handleClearAllSaved}
 className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
 >
 <Trash2 className="w-3.5 h-3.5" /> Clear All
 </button>
)}
 </div>

 {(activeTab ==='saved-recipes' ? savedRecipes : []).length === 0 ? (
 <div className="text-center py-16 sm:py-24 px-4 flex flex-col items-center justify-center surface rounded-2xl border-dashed">
 <div className="w-14 h-14 rounded-full bg-[var(--accent-tint)] flex items-center justify-center mb-6 border border-[var(--accent-tint-border)]">
 <Heart className="w-6 h-6 text-[var(--accent-terracotta)]" />
 </div>
 <h3 className="font-serif text-xl sm:text-2xl text-[var(--charcoal)] mb-2 leading-tight">
 {activeTab ==='saved-recipes' ?'Your shortlist is empty' :'Basket is coming next'}
 </h3>
 <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-[360px] mb-8">
 {activeTab ==='saved-recipes'
 ?"Save restaurants you want to try, plus recipes for nights in."
 :"Once the grocery basket is wired, ingredients from Stay In recipes will appear here."}
 </p>
 <button
 onClick={() => activeTab ==='saved-recipes' ? handleTabSwitch('mood') : handleTabSwitch('random')}
 className="hit-44 inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-terracotta)] hover:opacity-90 text-[var(--accent-contrast)] rounded-xl font-sans text-xs font-bold shadow-md transition-all cursor-pointer"
 >
 {activeTab ==='saved-recipes' ?'Eat out' :'Go to Cook'}
 </button>
 </div>
) : (
 <div className="flex flex-col gap-4">
 {(activeTab ==='saved-recipes' ? savedRecipes : []).map((r) => (
 <div
 key={r.id}
 onClick={() => setSelectedRecipe(r)}
 className="surface surface-hover cursor-pointer rounded-2xl p-4 flex items-center gap-4 group transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(26,15,10,0.12)]"
 >
 {/* Thumbnail image */}
 <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--surface-quiet-bg)] flex-shrink-0 border border-[var(--rule)]">
 {/* `loading="lazy"` is a BILLING control here, not only a perf one. Every Places
 photo URL hit is a separately charged request, and this list renders up to ~40
 rows of which a phone shows about four. This was the ONLY <img> in the app
 without it — the FREE MealDB images were lazy and the PAID Google ones were
 eager, which is exactly backwards. `referrerPolicy` removed: see the note on
 getPlacePhotoUrl in placesService.ts, it was disabling the key restriction. */}
 <img
 src={r.image}
 alt={r.name}
 loading="lazy"
 decoding="async"
 className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
 />
 </div>

 {/* Title and metadata details */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider bg-[var(--accent-tint)] text-[var(--accent-terracotta)] px-2 py-0.5 rounded font-bold">
 {React.createElement(
 cuisineIcon(r.id.startsWith('eat') ? (r as any).rawEatery?.cuisine : r.category),
 { 'aria-hidden':'true', strokeWidth: 2, className:'w-3 h-3 flex-shrink-0' },
)}
 {r.id.startsWith('eat') ? (r as any).rawEatery?.cuisine : r.category}
 </span>
 <span className="font-mono text-xs text-[var(--text-muted)] uppercase">
 {r.id.startsWith('eat') ? r.tags[1] : r.area} Culture
 </span>
 </div>
 <h4 className="font-serif text-lg text-[var(--charcoal)] truncate group-hover:text-[#7C2D12] dark:group-hover:text-[#fca5a5] transition-colors leading-tight">
 {r.id.startsWith('eat') ? (r as any).rawEatery?.name || r.name : r.name}
 </h4>
 </div>

 {/* Action column */}
 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleToggleSave(r);
 }}
 className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[#7C2D12] dark:hover:text-[#fca5a5] hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20 transition-colors"
 title="Remove from saved"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
))}
 </div>
)}
 </div>
)}
 </div>
 )}
 {/* Footer disclaimer */}
 <footer className="mt-12 pb-24 text-center">
 <p className="text-xs text-[var(--text-subtle)] font-sans leading-relaxed max-w-xs mx-auto">
 Restaurant info is for reference only — always confirm details with the venue directly.
 </p>
 {/*
   REQUIRED ATTRIBUTION, not decoration.
   Google's Places API policy requires a "Powered by Google" credit wherever Places
   content — names, ratings, opening hours, price bands, photos — is displayed
   without a Google map alongside it. This app shows all five and had no attribution
   anywhere in the tree, which is a terms violation on every venue view rather than a
   styling omission. It costs one line and removes a real launch blocker.
 */}
 <p className="mt-3 text-[11px] text-[var(--text-subtle)] font-sans">
 Place data powered by Google
 </p>
 </footer>
 </main>
 </div>

 {/* Fixed Bottom CTA — mood tab, whenever filters are open. MOBILE ONLY.
     It is a thumb-reach affordance pinned above the tab bar. On desktop it used
     to go `md:static`, but this block is a sibling of <main>, so static dropped it
     at the very END of the document — a lone terracotta button stranded below the
     footer, under the results, attached to nothing. Desktop does not need it:
     results auto-load from the debounced search, and the "Hide filters / Adjust
     filters" toggle already collapses the panel. So it is simply hidden at md+. */}
 {activeTab ==='mood' && !selectedRecipe && filtersOpen && !isLoading && (
 <div className={`filter-cta action-bar fixed bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] left-0 right-0 z-[60] px-5 pb-4 pt-3 flex justify-center md:hidden${chromeHidden ? ' is-hidden' : ''}`}>
 <button
 onClick={() => { handleTriggerMatch(); setFiltersOpen(false); }}
 className="w-full max-w-md py-4 rounded-2xl font-sans font-semibold text-base tracking-[-0.01em] transition-all duration-200 ease-out cursor-pointer flex items-center justify-center gap-2 shadow-md bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] hover:opacity-90 hover:shadow-[0_12px_32px_rgba(124,45,18,0.15)] active:scale-[0.97]"
 >
 {isLoading ? (
 <span className="flex items-center justify-center gap-2">
 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Searching...
 </span>
) : (
 <>
 <span>{dimensions.searchQuery.trim() ?'Search places' :'Find a place'}</span>
 <ChevronRight className="w-5 h-5" />
 </>
)}
 </button>
 </div>
)}

 </div>
);
}
