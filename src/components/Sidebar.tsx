import React from'react';
import { createPortal } from'react-dom';
import { Dimensions } from'../types';
import {
  Search, SlidersHorizontal, X, type LucideIcon,
  Sunrise, Coffee, Soup, Zap, Compass, Salad, Flame, Sparkles, Moon, Wine, Store, Utensils,
} from'lucide-react';
import { cuisineIcon } from'../cuisineIcon';
import { formatQuantity, userLocale } from'../locale';

/* The Spend slider's stops. Values are the Places price tier already understood by
   fetchVenues — index 0 is "no filter", so the slider has a real off position rather
   than forcing a budget on someone who has not chosen one. */
const SPEND: { label: string; value: string | null }[] = [
  { label: 'Any', value: null },
  { label: 'Cheap', value: '1' },
  { label: 'Mid', value: '2' },
  { label: 'Higher', value: '3' },
  { label: 'Top', value: '4' },
];

interface SidebarProps {
 dimensions: Dimensions;
 onChange: (dims: Dimensions) => void;
 onTriggerMatch: () => void;
 isLoading: boolean;
 /**
  * Cuisine types actually present in the current Places results. Used to SUPPLEMENT
  * the curated baseline, never to replace it — if you open the app in a strip-mall
  * suburb, deriving the whole list from what is adjacent leaves you with "Burgers,
  * Burgers, Fried chicken" and kills discovery. Baseline first, local extras after.
  */
 nearbyCuisines?: string[];
 /**
  * The resolved city, for the hero kicker. The prototype's kicker is live context —
  * `CAPE TOWN · 19:40 SAST` — not a tagline, which is what makes the hero read as
  * "here, now" rather than as marketing (docs/design/occasion-prototype.html `#ctx`).
  */
 city?: string;
 /** Neighbourhoods in the current city — the prototype's `Nearby` chips (`#areas`). */
 areas?: string[];
}

/**
 * ONE chip. Every filter on this screen — mood, cuisine, diet — is the same control,
 * because they are the same kind of decision: pick one, or none.
 *
 * Optionally carries a glyph. Only Cuisine passes one; see `../cuisineIcon` for why the
 * icons came back and what was actually wrong with the old set. Mood and Diet stay
 * text-only on purpose — abstract categories have no honest glyph, and the contrast
 * between a picture row and a word row is what stops this reading as three identical
 * blocks. The icon is `aria-hidden`: the label already names the thing.
 */
const Chip: React.FC<{
 label: string;
 selected: boolean;
 onClick: () => void;
 icon?: LucideIcon;
 /**
  * True when this category is actually present in the CURRENT result set.
  *
  * The curated baseline stays visible either way — asking for sushi where none came
  * back is a legitimate thing to do, and hiding the chip would silently shrink the
  * app's vocabulary based on one query. But a chip that will definitely produce
  * results is marked, so "what can I find here?" is answerable by looking rather than
  * by tapping and being disappointed. Never inferred: it is derived from the venues
  * already in hand (see `availableValues`), so it costs no request and can never claim
  * a category the data does not support.
  */
 available?: boolean;
}> = ({ label, selected, onClick, icon: Icon, available }) => (
 <button
 type="button"
 aria-pressed={selected}
 onClick={onClick}
 className={`press tap-44 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium border transition-colors duration-150 cursor-pointer whitespace-nowrap ${
 selected
 ? 'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
 : 'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 {Icon && (
 <Icon
 aria-hidden="true"
 strokeWidth={1.75}
 className={`w-[14px] h-[14px] flex-shrink-0 ${selected ?'' :'text-[var(--accent-terracotta)]'}`}
 />
 )}
 {label}
 {available && !selected && (
 // The result-backed cue the count ("N available here") refers to, restored:
 // this venue category is actually in the current results. aria-hidden — the
 // count already names how many, and a per-chip announcement would be noise.
 <span
 aria-hidden="true"
 className="w-1.5 h-1.5 rounded-full bg-[var(--accent-terracotta)] flex-shrink-0"
 />
 )}
 </button>
);

/** Section header — same treatment everywhere so the eye learns the rhythm once. */
const FilterGroup: React.FC<{
 title: string;
 optional?: boolean;
 /**
  * Apple Maps pattern: one row that scrolls sideways instead of a two-row wall of
  * pills. The row bleeds to the screen edge (-mx) while the content keeps the page's
  * outer margin via matching padding.
  *
  * The affordance is the gradient mask on `.chip-rail` in index.css — and unlike the
  * previous version of this comment, that mask now actually exists. This block used to
  * claim the clipped chip at the right edge was the cue; it was not, because
  * scroll-snap parks chips flush instead of clipped, so the row ended clean and looked
  * complete. Nine cuisines were unreachable unless you guessed to swipe. Do not delete
  * the mask, and do not re-describe this as self-evident: verify the CSS before
  * trusting any claim made here (.claude/skills/perceive).
  *
  * EXACTLY ONE group on any screen may set this. Three stacked rails was carousel
  * hell: the eye can't tell which axis is the real one, and a rail whose contents
  * happen to fit (Diet, 4 chips) renders as a static row that looks identical to a
  * scrollable one and is therefore a lie. Cuisine is the primary axis and the only
  * list long enough to earn it. Everything else wraps, or lives in the sheet.
  */
 scroll?: boolean;
 /**
  * A truthful, result-backed count rendered beside the title. Optional because a
  * group with nothing to say must say nothing — "0 available" is worse than silence,
  * and a count that is not derived from real results would be exactly the invented
  * metadata this product refuses to render.
  */
 note?: string;
 children: React.ReactNode;
}> = ({ title, optional, scroll, note, children }) => {
 return (
 <div className="flex flex-col gap-3">
 <span className="text-xs font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 {title}
 {optional && <span className="font-normal text-[var(--text-muted)]"> — optional</span>}
 {note && (
 <span className="font-normal text-[var(--accent-terracotta)]"> · {note}</span>
 )}
 </span>
 {scroll ? (
 // Scroll on phones only. At 1440 the rail still scrolled inside a fixed-width
 // card, so the last chip was sliced mid-word ("Burger…") against the card edge
 // with no fade, no arrow and nothing suggesting more existed — hidden content
 // with zero affordance. Two rules point the same way: prefer wrapping over
 // truncation, and a swipe/scroll region must advertise itself. There is room to
 // wrap at this width, so it wraps and nothing is hidden; below lg it stays the
 // single horizontal rail the design permits, where a rail is the right pattern.
 // The scroll affordance is a mask on `.chip-rail` itself (see index.css) —
 // background-agnostic, so it is right on this card in both colour schemes.
 // py-1.5 replaces pb-1 because overflow-x:auto computes overflow-y to auto
 // too, and 4px clipped the focus ring off the top and bottom of every chip.
 // Below lg this is a single horizontal rail (Apple Maps pattern) instead of the
 // ragged multi-row wrap it used to render as; at lg the card is wide enough to
 // wrap with nothing hidden, so it wraps and index.css drops the fade there.
 <div className="chip-rail flex flex-wrap gap-2 overflow-visible">
 {children}
 </div>
 ) : (
 <div className="flex flex-wrap gap-2">{children}</div>
 )}
 </div>
 );
};

/**
 * Native-style bottom sheet. Granular filters live here, not on the canvas.
 *
 * HIG shape: it enters from the bottom edge it will return to, carries a grabber so
 * the gesture affordance is visible before the gesture, dismisses on scrim tap and on
 * Escape, and traps the page behind a scroll lock so the canvas doesn't drift under
 * it. The action bar is pinned to the bottom above the home indicator — a "Done" you
 * have to scroll to find is not a Done.
 *
 * On desktop it centres as a card rather than pretending a 1440px screen has a bottom
 * edge worth sliding from.
 */
const FilterSheet: React.FC<{
 open: boolean;
 onClose: () => void;
 activeCount: number;
 onClear: () => void;
 children: React.ReactNode;
}> = ({ open, onClose, activeCount, onClear, children }) => {
 React.useEffect(() => {
 if (!open) return;
 const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
 const prev = document.body.style.overflow;
 document.body.style.overflow = 'hidden';
 window.addEventListener('keydown', onKey);
 return () => {
 document.body.style.overflow = prev;
 window.removeEventListener('keydown', onKey);
 };
 }, [open, onClose]);

 if (!open) return null;

 // PORTALED TO BODY, and it must stay that way. Rendered in place, this sheet
 // measured at top:844 on a 390×844 viewport — i.e. entirely below the fold, with
 // no way to reach it. Two ancestors do it: the filter panel's `overflow-hidden`
 // collapse wrapper clips it, and the tab-transition wrapper's `transform` creates
 // a containing block, so `position: fixed` stops resolving against the viewport
 // and resolves against that element instead. A portal escapes both.
 return createPortal(
 <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center">
 <div
 className="absolute inset-0 bg-black/50"
 onClick={onClose}
 aria-hidden="true"
 />
 <div
 role="dialog"
 aria-modal="true"
 aria-label="Adjust filters"
 // NO ENTRANCE TRANSFORM ON THIS ELEMENT. It previously carried
 // `animate-[sheetUp_…_forwards]` and measured, on the deployed build at 390×844,
 // stuck at translateY(717px)/opacity:0 — the animation held its `from` state and
 // never advanced, so the sheet was rendered, focus-trapping and body-locked, and
 // completely invisible. That is the dead-end-screen failure this project has
 // shipped before. Reachability must not be contingent on an animation completing.
 // Motion here is the scrim fade only: opacity can fail safe, transform cannot.
 // OPAQUE, not `.surface`. `.surface` is a translucent fill tuned to sit ON the
 // page canvas — behind a modal it let the whole home screen read straight
 // through the sheet, so the mood chips sat on top of the hero copy and neither
 // was legible. A sheet is a separate plane and has to be one: page canvas token
 // for the fill, surface border and shadow kept for the edge and lift.
 className="relative w-full sm:max-w-[460px] rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col sm:m-6 bg-[var(--bg-warm)] border border-[var(--border-color)] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
 >
 {/* Grabber — the affordance for the drag, visible before the drag */}
 <div className="pt-2.5 pb-1 flex justify-center flex-shrink-0 sm:hidden">
 <span className="w-9 h-1 rounded-full bg-[var(--rule)]" />
 </div>

 <div className="flex items-center justify-between px-6 pt-3 pb-4 flex-shrink-0">
 <h2 className="font-serif text-xl font-semibold text-[var(--heading-color)]">
 Adjust filters
 </h2>
 <button
 type="button"
 onClick={onClose}
 aria-label="Close filters"
 className="tap-44 -mr-2 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--charcoal)] cursor-pointer transition-colors"
 >
 <X className="w-5 h-5" strokeWidth={1.75} />
 </button>
 </div>

 <div className="px-6 pb-6 flex flex-col gap-7 overflow-y-auto overscroll-contain">
 {children}
 </div>

 {/* Pinned action bar. `env(safe-area-inset-bottom)` keeps Done clear of the
 home indicator on a notched device. */}
 <div
 className="flex-shrink-0 flex items-center gap-3 px-6 pt-4 border-t border-[var(--rule)]"
 style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
 >
 {/* Rendered unconditionally and hidden with `invisible`, not unmounted. Mounting it
 on the first selection changed the row's contents mid-interaction and pushed Done
 sideways under the thumb that had just moved there — the user's next tap landed
 somewhere else. Reserving the slot costs nothing and makes Done a fixed target. */}
 <button
 type="button"
 onClick={onClear}
 disabled={activeCount === 0}
 aria-hidden={activeCount === 0}
 className={`tap-44 flex items-center px-1 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] cursor-pointer transition-colors ${
 activeCount === 0 ? 'invisible pointer-events-none' : ''
 }`}
 >
 Clear all
 </button>
 <button
 type="button"
 onClick={onClose}
 className="press tap-44 ml-auto px-7 rounded-full bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] text-sm font-semibold cursor-pointer"
 >
 {activeCount > 0 ? `Done · ${activeCount}` : 'Done'}
 </button>
 </div>
 </div>
 </div>,
 document.body,
);
};

interface SliderStop {
 label: string;
 sub?: string;
 value: string | null;
}

/**
 * Budget is the one filter that is genuinely a range rather than a set of unrelated
 * options, so it stays a slider — different control for a different kind of choice.
 */
const GlassSlider: React.FC<{
 stops: SliderStop[];
 selectedValue: string | null;
 onSelect: (value: string | null) => void;
 ariaLabel: string;
}> = ({ stops, selectedValue, onSelect, ariaLabel }) => {
 const rawIdx = stops.findIndex((s) => s.value === selectedValue);
 const idx = rawIdx === -1 ? 0 : rawIdx;
 const pct = stops.length > 1 ? (idx / (stops.length - 1)) * 100 : 0;
 return (
 <div className="bg-black/[0.04] dark:bg-black/60 px-5 pt-4 pb-2 rounded-2xl select-none border border-black/5 dark:border-white/5">
 <input
 type="range"
 min={0}
 max={stops.length - 1}
 step={1}
 value={idx}
 aria-label={ariaLabel}
 aria-valuetext={stops[idx].label}
 onChange={(e) => onSelect(stops[Number(e.target.value)].value)}
 className="glass-range"
 style={{ '--fill': `${pct}%` } as React.CSSProperties}
 />
 <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(${stops.length}, 1fr)` }}>
 {stops.map((s, i) => (
 <button
 key={s.label}
 type="button"
 onClick={() => onSelect(s.value)}
 className={`flex flex-col items-center gap-0.5 py-1.5 cursor-pointer transition-colors duration-200 ${
 i === idx
 ?'text-[var(--charcoal)]'
 :'text-[var(--text-subtle)] hover:text-[var(--charcoal)]'
 }`}
 >
 <span className={`text-xs font-semibold leading-tight ${i === idx ?'scale-105' :''}`}>
 {s.label}
 </span>
 {s.sub && (
 <span className={`text-xs leading-tight ${i === idx ?'text-[var(--accent-terracotta)]' :'opacity-60'}`}>
 {s.sub}
 </span>
)}
 </button>
))}
 </div>
 </div>
);
};

/**
 * The dine-out filter panel. It is ONLY dine-out now.
 *
 * It used to carry its own "Find a Place / Stay In" segmented control, which duplicated
 * the Find/Stay In tabs in the header and the mobile tab bar — two competing controls for
 * the same decision, on the same screen, that could disagree. That is why "Stay In" felt
 * identical to the home page: it *was* the home page with one field swapped. Cooking now
 * lives entirely in its own tab with its own controls; mode is owned by navigation.
 */
/**
 * The curated baseline. These are aspirational anchors — the reason someone opens a
 * food app rather than a map — and they stay on screen whatever happens to be within
 * 2km. Local reality gets appended to them, not substituted for them.
 */
const BASELINE_CUISINES: { label: string; value: string }[] = [
 { label:'Seafood', value:'Seafood' },
 { label:'Grill', value:'Grill' },
 { label:'Fine dining', value:'Fine dining' },
 { label:'Italian', value:'Italian' },
 { label:'Sushi', value:'Sushi' },
 { label:'Tapas', value:'Tapas' },
 { label:'Brunch', value:'Brunch' },
 { label:'Burgers', value:'Burger' },
 { label:'Curry', value:'Curry' },
 { label:'Cocktails', value:'Cocktail bar' },
];

/** Places hands back strings like "Hamburger restaurant" — strip the noun. */
const tidyCuisine = (raw: string) =>
 raw
 .replace(/\brestaurants?\b/gi, '')
 .replace(/\s+/g, ' ')
 .trim();

/**
 * Google's category data mixes real cuisines with generic venue types
 * ("Fast food", "Meal takeaway", "Bar") and near-synonyms of our own labels —
 * "Hamburger" is Burgers. Rendered raw, that put a "Hamburger" chip on the rail
 * directly beside "Burgers", the exact nonsense reported on the live app. These
 * three tables resolve a raw string to ONE curated chip: junk is dropped,
 * synonyms fold onto the matching baseline, and a genuine new cuisine (Ramen,
 * Turkish) passes through with a clean label. Nothing raw becomes a chip of its
 * own — the vocabulary on screen stays one we own (CLAUDE.md §7, §8).
 */
const CUISINE_JUNK = new Set([
 '', 'food', 'fast food', 'meal takeaway', 'meal delivery', 'meal', 'takeaway',
 'delivery', 'store', 'grocery', 'grocery store', 'supermarket', 'market',
 'convenience store', 'bakery', 'cafe', 'café', 'coffee shop', 'coffee', 'tea house',
 'bar', 'pub', 'night club', 'deli', 'delicatessen', 'diner', 'buffet', 'canteen',
 'american', 'point of interest', 'establishment', 'lodging', 'hotel',
]);

// key (lowercased, 'restaurant' already stripped) -> the baseline VALUE it folds into
const CUISINE_SYNONYM: Record<string, string> = {
 'hamburger':'Burger', 'burger':'Burger',
 'pizza':'Italian', 'pizzeria':'Italian', 'trattoria':'Italian',
 'steak house':'Grill', 'steakhouse':'Grill', 'steak':'Grill', 'barbecue':'Grill',
 'bbq':'Grill', 'churrascaria':'Grill', 'bar and grill':'Grill',
 'fish':'Seafood', 'fish and chips':'Seafood', 'oyster bar':'Seafood', 'oyster':'Seafood',
 'indian':'Curry',
 'wine bar':'Cocktail bar', 'wine':'Cocktail bar', 'cocktail':'Cocktail bar',
 'breakfast':'Brunch',
};

const BASELINE_BY_KEY = new Map<string, { label: string; value: string }>();
for (const c of BASELINE_CUISINES) {
 BASELINE_BY_KEY.set(c.value.toLowerCase(), c);
 BASELINE_BY_KEY.set(c.label.toLowerCase(), c);
}

/** Resolve a raw Places cuisine string to a curated chip, or null to drop it.
 *  Exported so the result list can narrow by the SAME folding the chips use — a venue
 *  Places typed "Pizza restaurant" matches the Italian chip, not just a literal string. */
export const resolveCuisine = (raw: string): { label: string; value: string } | null => {
 const tidy = tidyCuisine(raw || '');
 if (!tidy || tidy.length > 22) return null;
 const key = tidy.toLowerCase();
 if (CUISINE_JUNK.has(key)) return null;
 const syn = CUISINE_SYNONYM[key];
 if (syn) return BASELINE_BY_KEY.get(syn.toLowerCase()) ?? null;
 const base = BASELINE_BY_KEY.get(key);
 if (base) return base;
 const label = tidy.replace(/\b\w/g, (ch) => ch.toUpperCase());
 return { label, value: label };
};

export const Sidebar: React.FC<SidebarProps> = ({ dimensions, onChange, onTriggerMatch, nearbyCuisines = [], city, areas = [] }) => {
 const moods = [
 { label:'Cosy', value:'tired & cosy' },
 { label:'Comfort food', value:'need comfort food' },
 { label:'Adventurous', value:'feeling adventurous' },
 { label:'Treating myself', value:'treating myself' },
 { label:'Fresh & light', value:'something fresh & light' },
 { label:'Quick bite', value:'stressed, need quick and easy' },
 { label:'Bold & spicy', value:'craving something bold & spicy' },
 { label:'Lazy Sunday', value:'lazy Sunday energy' },
 { label:'Feeling fancy', value:'feeling fancy' },
 ];

 /* OCCASIONS — the primary selector.
    One axis only: the occasion. Party size, budget and diet stay in the sheet below,
    because "quick" and "just me" and "big group" can all be true at once and were
    never moods (CLAUDE.md §7, docs/design/README.md).

    Every tile maps onto an existing `vibe` value, so selecting one runs the SAME
    Places query the mood sheet always ran. This is a new way into the existing data
    layer, not a second one — nothing here invents a venue fact (§8).

    The set is generated from the local hour under three periods. A fixed six is wrong
    at every hour but the one it was designed for: at 09:00 "Late night" is noise and
    breakfast is the whole product. */
 const OCCASIONS: Record<string, { label: string; note: string; value: string; Icon: LucideIcon }[]> = {
 am: [
 { label:'Slow morning', note:'Nowhere to be', value:'lazy Sunday energy', Icon: Sunrise },
 { label:'Coffee & work', note:'A plug, no rush', value:'stressed, need quick and easy', Icon: Coffee },
 { label:'Fresh & light', note:'Start it well', value:'something fresh & light', Icon: Salad },
 { label:'Comfort', note:'Warm, filling, no fuss', value:'need comfort food', Icon: Soup },
 { label:'Neighbourhood', note:'Close, easy, reliable', value:'tired & cosy', Icon: Store },
 { label:'Something new', note:'Not been before', value:'feeling adventurous', Icon: Compass },
 ],
 mid: [
 { label:'Quick lunch', note:'In and out, still good', value:'stressed, need quick and easy', Icon: Zap },
 { label:'Long lunch', note:'No hurry at all', value:'lazy Sunday energy', Icon: Utensils },
 { label:'Fresh & light', note:'Nothing heavy', value:'something fresh & light', Icon: Salad },
 { label:'Bold & spicy', note:'Wake yourself up', value:'craving something bold & spicy', Icon: Flame },
 { label:'Neighbourhood', note:'Close, easy, reliable', value:'tired & cosy', Icon: Store },
 { label:'Something new', note:'Not been before', value:'feeling adventurous', Icon: Compass },
 ],
 pm: [
 { label:'Date night', note:'Low light, worth it', value:'feeling fancy', Icon: Wine },
 { label:'Comfort', note:'Warm, filling, no fuss', value:'need comfort food', Icon: Soup },
 { label:'Celebrating', note:'Push the boat out', value:'treating myself', Icon: Sparkles },
 { label:'Bold & spicy', note:'Something with heat', value:'craving something bold & spicy', Icon: Flame },
 { label:'Late night', note:"Kitchen's still open", value:'tired & cosy', Icon: Moon },
 { label:'Something new', note:'Not been before', value:'feeling adventurous', Icon: Compass },
 ],
 };
 const PERIODS = [
 { key:'am', name:'Morning', span:'05–11' },
 { key:'mid', name:'Midday', span:'11–17' },
 { key:'pm', name:'Evening', span:'17–late' },
 ];

 /* Derived from the device clock on the client. A time-derived UI cannot be rendered
    server-side and cached without going stale within the hour. */
 const nowPeriod = React.useMemo(() => {
 const h = new Date().getHours();
 return h < 11 ?'am' : h < 17 ?'mid' :'pm';
 }, []);
 const [period, setPeriod] = React.useState<string>(nowPeriod);
 const periodIndex = PERIODS.findIndex((p) => p.key === period);

 // Baseline, then whatever is genuinely nearby that the baseline doesn't already
 // cover. A German in London gets Italian AND the Lebanese place down the road.
 /* Ten cuisines wrapped to five rows and swallowed the phone screen before the user
    had scrolled once. Five is the preview; the rest are one tap away. NOT a horizontal
    scroll rail — a row that scrolls sideways hides its own contents (§11.4). */
 const CUISINE_PREVIEW = 5;
 const [showAllCuisines, setShowAllCuisines] = React.useState(false);

 const cuisines = React.useMemo(() => {
 const seen = new Set(BASELINE_CUISINES.map((c) => c.value.toLowerCase()));
 const extras: { label: string; value: string }[] = [];
 for (const raw of nearbyCuisines) {
 const c = resolveCuisine(raw);
 if (!c) continue; // junk / generic venue type — never a chip
 const key = c.value.toLowerCase();
 if (seen.has(key)) continue; // already a baseline chip; only its availability changes
 seen.add(key);
 extras.push(c);
 if (extras.length >= 6) break;
 }
 return [...BASELINE_CUISINES, ...extras];
 }, [nearbyCuisines]);

 /**
  * Which categories the CURRENT results actually contain.
  *
  * `nearbyCuisines` is already computed in App.tsx from the venues in hand, so this
  * whole feature is free: no extra Places request, no new field, no photo. It is the
  * difference between a rail that lists a catalogue and a rail that answers "what can
  * I find HERE?" — the Discovery stage of the customer journey.
  */
 const availableValues = React.useMemo(() => {
 const set = new Set<string>();
 for (const raw of nearbyCuisines) {
 const c = resolveCuisine(raw);
 if (c) set.add(c.value.toLowerCase());
 }
 return set;
 }, [nearbyCuisines]);

 const isAvailable = React.useCallback(
 (c: { label: string; value: string }) => availableValues.has(c.value.toLowerCase()),
 [availableValues],
 );

 /* Order is deliberately NOT changed by availability, and that is a fix rather than an
    omission. Promoting result-backed chips to the front PREPENDS them, and the rail
    then sat scrolled right by the width of what was inserted — measured 613px, hiding
    the very chips the count above it advertises. The obvious repair, resetting
    scrollLeft when the set changes, fights the browser's own scroll-into-view and made
    a suite check time out trying to reach a chip.

    Extras append, so the base order never shifts under the user. Availability is
    carried by the dot and the count, which say the same thing and cannot move anything. */

 const availableCount = React.useMemo(
 () => cuisines.reduce((n, c) => (isAvailable(c) ? n + 1 : n), 0),
 [cuisines, isAvailable],
 );

 /* A cuisine selected from the expanded set has to survive collapsing, or the active
    filter vanishes from the canvas while still filtering the results — the user would
    see a narrowed list with no visible cause and no way to clear it. */
 const visibleCuisines = React.useMemo(() => {
 if (showAllCuisines) return cuisines;
 const head = cuisines.slice(0, CUISINE_PREVIEW);
 // Any SELECTED cuisine sitting past the preview is pinned on so collapsing never
 // hides a filter that is still narrowing the list (multi-select — there can be
 // several). The list would otherwise shrink with no visible, clearable cause.
 const selectedExtras = cuisines.filter(
 (c) => dimensions.cuisines.includes(c.value) && !head.some((h) => h.value === c.value),
 );
 return [...head, ...selectedExtras];
 }, [cuisines, showAllCuisines, dimensions.cuisines]);

 const [sheetOpen, setSheetOpen] = React.useState(false);

 // Mood and Diet are single-select: tapping the active one clears it.
 const toggle = (key: 'vibe' | 'diet', val: string) =>
 onChange({ ...dimensions, [key]: dimensions[key] === val ? null : val });

 // Cuisine is MULTI-select: a tap adds or removes, so "Italian AND Sushi" is one gesture.
 const toggleCuisine = (val: string) =>
 onChange({
 ...dimensions,
 cuisines: dimensions.cuisines.includes(val)
 ? dimensions.cuisines.filter((v) => v !== val)
 : [...dimensions.cuisines, val],
 });

 const clearAll = () =>
 onChange({ ...dimensions, vibe: null, cuisines: [], diet: null, capacity: null });

 const activeCount =
 dimensions.cuisines.length +
 [dimensions.vibe, dimensions.diet, dimensions.capacity].filter(Boolean).length;
 // Only what the sheet actually owns. A badge counting a Cuisine chip the user can
 // see on the canvas makes the button look wrong the moment they tap it.
 const sheetCount = [dimensions.vibe, dimensions.diet, dimensions.capacity].filter(Boolean).length;

 // Distance and party size have no home in Dimensions because nothing downstream can
 // act on them yet (see the note by the sliders). Local state keeps the control honest
 // and responsive without inventing a filter that does not filter.
 const [distKm, setDistKm] = React.useState(2);
 const [party, setParty] = React.useState(2);

 /* The hero kicker, per the prototype's `#ctx`: PLACE · LOCAL TIME · ZONE. It ticks,
    because a clock that is wrong by an hour is worse than no clock — and because the
    period selector below it is derived from the same hour, so the two must agree.
    Time and zone come from Intl, never hand-formatted: a reader on a 12-hour locale
    gets 7:40 pm and a reader on a 24-hour one gets 19:40, from the same code. */
 /* FREEFORM INTENT — the prototype's `.parsed` line and its RULES table.
    "Freeform beats the tiles when the tiles don't fit": someone who already knows they
    want vegan ramen should not have to find the tile that nearly means that.

    This reads the typed text and reports what it UNDERSTOOD, which is the whole point
    of the line — it is a receipt, not a suggestion. Every rule therefore resolves to a
    filter this app can genuinely apply (an existing `vibe` or `diet` value), so the
    line never claims an understanding the query cannot act on (§8). Text that matches
    nothing says so plainly and is still passed to Places verbatim, which is the honest
    outcome — Google may well know "Nando's" even though no rule here does. */
 const INTENT_RULES: { re: RegExp; note: string; vibe?: string; diet?: string }[] = [
 { re: /vegan/i, note:'vegan', diet:'Vegan' },
 { re: /vegetarian|veggie|plant[- ]based/i, note:'vegetarian', diet:'Vegetarian' },
 { re: /halaal|halal/i, note:'halaal', diet:'Halaal' },
 { re: /seafood|fish|oyster|sushi/i, note:'seafood', diet:'Seafood' },
 { re: /date|romantic|anniversary/i, note:'date night', vibe:'feeling fancy' },
 { re: /birthday|celebrat|treat/i, note:'celebrating', vibe:'treating myself' },
 { re: /quick|fast|in a hurry|grab/i, note:'quick', vibe:'stressed, need quick and easy' },
 { re: /cosy|cozy|quiet|tucked away|catch up/i, note:'quiet and cosy', vibe:'tired & cosy' },
 { re: /spicy|hot|chilli|chili|curry/i, note:'bold and spicy', vibe:'craving something bold & spicy' },
 { re: /comfort|hearty|filling|stodge/i, note:'comfort food', vibe:'need comfort food' },
 { re: /light|fresh|salad|healthy/i, note:'fresh and light', vibe:'something fresh & light' },
 { re: /new|never been|somewhere different|adventur/i, note:'something new', vibe:'feeling adventurous' },
 { re: /slow|long lunch|no rush|lazy/i, note:'no hurry', vibe:'lazy Sunday energy' },
 ];
 const intent = React.useMemo(() => {
 const q = dimensions.searchQuery.trim();
 if (!q) return null;
 const hits = INTENT_RULES.filter((r) => r.re.test(q));
 return { notes: Array.from(new Set(hits.map((h) => h.note))), hits };
 }, [dimensions.searchQuery]);

 const [now, setNow] = React.useState(() => new Date());
 React.useEffect(() => {
 const id = setInterval(() => setNow(new Date()), 30000);
 return () => clearInterval(id);
 }, []);
 const kicker = React.useMemo(() => {
 // No city, no kicker. The line's job is to say WHERE and WHEN you are; a bare
 // "6:22 PM UTC" tells the user their own clock back, which they already have, and
 // reads as a debug readout above the headline. The place is the half that carries
 // the information, so the time is only shown once there is a place to attach it to.
 if (!city) return '';
 let stamp = '';
 try {
 stamp = new Intl.DateTimeFormat(userLocale(), {
 hour: 'numeric',
 minute: '2-digit',
 timeZoneName: 'short',
 }).format(now);
 } catch { /* an exotic locale tag: the city alone is still true */ }
 return [city, stamp].filter(Boolean).join(' · ');
 }, [city, now]);
 const spendIndex = Math.max(0, SPEND.findIndex((s) => s.value === dimensions.capacity));

 // The label of the mood currently set, so the collapsed state still tells the user
 // what is on. Progressive disclosure that hides state is just hiding.
 const activeMoodLabel = moods.find((m) => m.value === dimensions.vibe)?.label;
 const sheetSummary = [activeMoodLabel, dimensions.diet, dimensions.capacity]
 .filter(Boolean)
 .join(' · ');

 return (
 <aside className="editorial-search-panel bg-transparent px-5 py-6 lg:px-12 lg:py-14 flex flex-col gap-8 lg:gap-10 overflow-y-visible">
 {/* HERO — the prototype's `.hero`: an image frame carrying the headline, centred,
     with a blinking live dot on the kicker. The old block was left-aligned type on
     bare canvas with no frame, which is why the live page and the prototype read as
     two different products. Photography drops into this frame (docs/design/README.md);
     it stays a neutral surface until it does, never a gradient standing in for a photo. */}
 <div className="relative flex min-h-[230px] items-end justify-center overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-quiet-bg)] px-6 py-7 text-center">
 <div className="relative z-10 mx-auto max-w-[32ch]">
 {/* Live context, not a tagline. The dot only earns its accent next to something
     that is actually live; with no city resolved yet there is no claim to make,
     so the whole line is withheld rather than shown half-true (§8). */}
 {kicker && (
 <p className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
 <span aria-hidden="true" className="h-[5px] w-[5px] animate-pulse rounded-full bg-[var(--accent-terracotta)]" />
 {kicker}
 </p>
 )}
 <h1 className="text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[0.98] tracking-[-0.042em] text-balance text-[var(--heading-color)]">
 What's <span className="text-[var(--accent-terracotta)]">good</span> right now?
 </h1>
 <p className="mx-auto mt-2.5 max-w-[40ch] text-[13.5px] leading-[1.5] text-[var(--text-muted)]">
 Pick the occasion, or just tell us what you're after.
 </p>
 </div>
 </div>

 {/* Search first: someone who already knows what they want shouldn't have to
 answer three mood questions to get there. */}
 <div className="flex flex-col gap-2">
 <label htmlFor="place-search" className="sr-only">
 Search
 </label>
 {/* A real form: pressing Enter (or the phone keyboard's "Search" key) submits and
 re-queries Places for the typed term, rather than doing nothing. The list also
 filters live as you type — see App's displayedRecipes — so the box narrows the
 results whether or not you ever hit Enter. */}
 <form
 onSubmit={(e) => {
 e.preventDefault();
 // Apply whatever the parse line said it understood, so the receipt above the
 // results and the query behind them cannot disagree. Only fills fields the
 // user has not already set by hand — a typed word must never silently
 // overwrite a tile they deliberately tapped.
 const first = intent?.hits[0];
 if (first) {
 onChange({
 ...dimensions,
 vibe: dimensions.vibe ?? first.vibe ?? null,
 diet: dimensions.diet ?? first.diet ?? null,
 });
 }
 onTriggerMatch();
 }}
 role="search"
 /* Full-width pill with a FILLED submit button, per docs/design/occasion-prototype.html
    `.search` (surface fill, 1px rule, accent button inside the same radius). The old
    bare underlined input read as a form field on a page that has no other form fields;
    the pill reads as the primary way in, which is what it is. */
 className="relative flex items-center gap-2 rounded-full bg-[var(--surface-bg)] border border-[var(--border-color)] pl-4 pr-1.5 py-1.5 transition-colors focus-within:border-[var(--accent-terracotta)]"
 >
 <Search className="w-4 h-4 flex-none text-[var(--text-muted)]" />
 <input
 id="place-search"
 type="search"
 enterKeyHint="search"
 autoComplete="off"
 value={dimensions.searchQuery}
 onChange={(e) => onChange({ ...dimensions, searchQuery: e.target.value })}
 placeholder="Somewhere quiet for two"
 className="min-w-0 flex-1 bg-transparent border-0 rounded-none py-2.5 text-[16px] text-[var(--charcoal)] focus:outline-none focus:ring-0 placeholder:text-[var(--text-subtle)] [&::-webkit-search-cancel-button]:appearance-none"
 />
 {dimensions.searchQuery && (
 <button
 type="button"
 onClick={() => onChange({ ...dimensions, searchQuery:'' })}
 className="flex-none px-2 py-1 text-[12px] text-[var(--text-muted)] font-semibold hover:text-[var(--charcoal)] transition-colors cursor-pointer"
 >
 Clear
 </button>
)}
 <button
 type="submit"
 /* px-4, not px-5. The input must stay at 16px or iOS zooms the page on focus
    (checks.mjs enforces it), which costs ~1.5px per character against the
    prototype's 14.5px — enough that "Somewhere quiet for two" was clipped to
    "…quiet for t" at 390px. The room comes back off the button's padding
    rather than off the type size, since only one of the two is negotiable. */
 className="hit-44 relative flex-none rounded-full bg-[var(--accent-terracotta)] px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-contrast)] cursor-pointer transition-opacity hover:opacity-90"
 >
 Search
 </button>
 </form>

 {/* The receipt. Reserves its own height so typing does not shunt the occasion
     grid down a line on every keystroke — a layout shift on the primary
     decision, for a line that is often one word long. */}
 <p
 className="flex min-h-[22px] flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--text-subtle)]"
 aria-live="polite"
 >
 {intent && (intent.notes.length > 0 ? (
 <>
 <b className="font-semibold text-[var(--text-muted)]">Reading that as</b>
 {intent.notes.map((n) => (
 <span key={n} className="rounded-full bg-[var(--surface-quiet-bg)] px-2.5 py-1 font-medium text-[var(--text-muted)]">
 {n}
 </span>
 ))}
 </>
 ) : (
 <span>Searching for that exactly — try &ldquo;vegan&rdquo;, &ldquo;quiet&rdquo;, &ldquo;spicy&rdquo; to narrow it.</span>
 ))}
 </p>
 </div>

 {/* THE OCCASION — the primary decision, and the only one on this axis.
     Selecting a tile sets `vibe`, which is the same field the mood sheet sets, and
     immediately re-queries Places: the selection IS the query, so there is no Search
     button standing between intent and results. */}
 <div className="flex flex-col gap-4">
 {/* Three periods. Auto-set from the device clock, switchable in one tap so
     planning dinner at 10am does not need a hidden control.

     ORDER MATTERS, and it was wrong: the label sat above this row, which read as
     though "The occasion" named the Morning/Midday/Evening switch. It does not —
     the period chooses WHICH SIX occasions exist, and the label belongs to the grid
     underneath. Prototype order is time, then label, then grid. */}
 <div className="relative flex rounded-full bg-[var(--surface-quiet-bg)] p-1">
 <span
 aria-hidden="true"
 className="absolute top-1 bottom-1 rounded-full bg-[var(--surface-bg)] shadow-sm transition-transform duration-500 ease-out"
 style={{ width:'calc((100% - 0.5rem) / 3)', transform:`translateX(${periodIndex * 100}%)` }}
 />
 {PERIODS.map((p) => (
 <button
 key={p.key}
 type="button"
 onClick={() => setPeriod(p.key)}
 aria-pressed={period === p.key}
 className={`relative z-10 flex-1 hit-44 rounded-full px-2 py-2.5 text-center transition-colors duration-300 cursor-pointer ${
 period === p.key ?'text-[var(--charcoal)]' :'text-[var(--text-muted)]'
 }`}
 >
 <span className="block text-[9.5px] font-semibold tracking-[0.14em] opacity-70 tabular-nums">{p.span}</span>
 <span className="block text-[13.5px] font-semibold tracking-[-0.02em]">
 {p.name}
 {p.key === nowPeriod && <span className="ml-1.5 text-[9.5px] tracking-[0.12em] text-[var(--accent-terracotta)]">Now</span>}
 </span>
 </button>
))}
 </div>

 <div className="flex items-baseline justify-between gap-3">
 <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">The occasion</span>
 <span className="text-[11px] text-[var(--text-subtle)]">
 {period === nowPeriod ?'set by the clock' :'you chose this'}
 </span>
 </div>

 {/* Two up, always. This grid lives inside a narrow editorial column, so a
     viewport-keyed `sm:grid-cols-3` widened the GRID while the COLUMN stayed
     put and wrapped every label onto two lines. Column width, not screen
     width, is what this layout answers to. */}
 {/* `md:grid-cols-3` matches the prototype's own 760px rule, and it is keyed on
     screen width HERE only because between md and lg the panel genuinely IS the
     full page width — the narrow 320px rail does not exist until lg. Without it a
     phone in landscape (≥768px wide, §6) rendered two tiles per row at ~400px
     each, so a single occasion took a quarter of a 390px-tall viewport. */}
 <div className="occasion-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2.5">
 {OCCASIONS[period].map((o) => {
 const active = dimensions.vibe === o.value;
 return (
 <button
 key={o.label}
 type="button"
 onClick={() => {
 onChange({ ...dimensions, vibe: active ? null : o.value });
 if (!active) onTriggerMatch();
 }}
 aria-pressed={active}
 className={`group relative overflow-hidden rounded-2xl border text-left transition-colors duration-300 cursor-pointer ${
 active
 ?'border-[var(--accent-terracotta)]'
 :'border-[var(--rule)] hover:border-[var(--text-subtle)]'
 }`}
 >
 {/* Image frame. Real photography drops in here — a curated, self-hosted
     set, one image per occasion (docs/design/README.md). Neutral until
     it does, rather than a gradient pretending to be a photograph. */}
 <span className="block aspect-[16/10] w-full bg-[var(--surface-quiet-bg)]" aria-hidden="true" />
 <span className={`block px-3 py-2.5 transition-colors duration-300 ${
 active ?'bg-[var(--accent-terracotta)]' :'bg-[var(--surface-bg)]'
 }`}>
 <o.Icon
 className={`mb-1.5 h-[18px] w-[18px] transition-transform duration-500 ${
 active ?'text-[var(--accent-contrast)] scale-110' :'text-[var(--text-muted)]'
 }`}
 strokeWidth={1.5}
 />
 <span className={`block text-[14.5px] font-semibold leading-tight tracking-[-0.025em] ${
 active ?'text-[var(--accent-contrast)]' :'text-[var(--charcoal)]'
 }`}>{o.label}</span>
 <span className={`mt-0.5 block text-[11px] leading-snug ${
 active ?'text-[var(--accent-contrast)]/75' :'text-[var(--text-subtle)]'
 }`}>{o.note}</span>
 </span>
 </button>
);
})}
 </div>
 </div>

 {/* REFINE — the prototype's `.sliders`, sitting directly under the occasion grid.
     Spend is the only one of the three the Places API can actually honour: it maps to
     the priceTier already threaded through fetchVenues. Distance and party size are
     held here and shown, but Text Search takes no radius and no party argument, so
     they are labelled as preferences rather than being dressed up as filters — §8,
     never imply a constraint the data cannot keep.

     Held back until an occasion is picked, per the prototype's `.refine` / `.refine.on`.
     This is the sequence the whole screen is arguing for — occasion FIRST, refinement
     after — and showing five live controls at full strength before the primary decision
     flattens that into "here are eight filters, good luck". `inert` rather than opacity
     alone: a dimmed control that still takes focus and still answers a tap is a trap
     for anyone arriving by keyboard or screen reader. */}
 <div
 className={`flex flex-col gap-4 transition-opacity duration-400 ${
 dimensions.vibe ? 'opacity-100' : 'opacity-40'
 }`}
 inert={dimensions.vibe ? undefined : true}
 >
 <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
 <div>
 <label htmlFor="sl-dist" className="mb-2.5 flex items-baseline justify-between gap-2">
 <b className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">How far</b>
 <span className="text-[13px] font-semibold tabular-nums text-[var(--accent-terracotta)]">
 {distKm === 6 ? 'Any' : formatQuantity(distKm) + ' km'}
 </span>
 </label>
 <input
 id="sl-dist"
 type="range"
 min={0}
 max={6}
 step={1}
 value={distKm}
 onChange={(e) => setDistKm(Number(e.target.value))}
 className="block w-full cursor-pointer accent-[var(--accent-terracotta)]"
 />
 </div>

 <div>
 <label htmlFor="sl-spend" className="mb-2.5 flex items-baseline justify-between gap-2">
 <b className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Spend</b>
 <span className="text-[13px] font-semibold text-[var(--accent-terracotta)]">
 {SPEND[spendIndex].label}
 </span>
 </label>
 <input
 id="sl-spend"
 type="range"
 min={0}
 max={4}
 step={1}
 value={spendIndex}
 onChange={(e) => onChange({ ...dimensions, capacity: SPEND[Number(e.target.value)].value })}
 className="block w-full cursor-pointer accent-[var(--accent-terracotta)]"
 />
 </div>

 <div>
 <label htmlFor="sl-party" className="mb-2.5 flex items-baseline justify-between gap-2">
 <b className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Table for</b>
 <span className="text-[13px] font-semibold tabular-nums text-[var(--accent-terracotta)]">{party}</span>
 </label>
 <input
 id="sl-party"
 type="range"
 min={1}
 max={8}
 step={1}
 value={party}
 onChange={(e) => setParty(Number(e.target.value))}
 className="block w-full cursor-pointer accent-[var(--accent-terracotta)]"
 />
 </div>
 </div>

 {/* NEARBY — the prototype's `#areas` chips. Single-select: these are places, and
     you are in one of them at a time. The value is folded into the Places text
     query (App.tsx `placesSearchTerms`), so this narrows real results rather than
     decorating the panel. Withheld entirely when we have no neighbourhoods for
     the current city — an empty chip row is worse than no row. */}
 {areas.length > 0 && (
 <div className="flex flex-col gap-3">
 <div className="flex items-baseline justify-between gap-3">
 <b className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[var(--text-muted)]">Nearby</b>
 {city && <span className="text-[11.5px] text-[var(--text-subtle)]">in {city}</span>}
 </div>
 <div className="flex flex-wrap gap-1.5">
 {areas.map((a) => {
 const on = dimensions.area === a;
 return (
 <button
 key={a}
 type="button"
 aria-pressed={on}
 onClick={() => {
 onChange({ ...dimensions, area: on ? null : a });
 onTriggerMatch();
 }}
 className={`hit-44 relative rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer ${
 on
 ? 'border-[var(--accent-terracotta)] bg-[var(--accent-terracotta)] text-[var(--accent-contrast)]'
 : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-muted)] hover:border-[var(--text-subtle)] hover:text-[var(--charcoal)]'
 }`}
 >
 {a}
 </button>
 );
 })}
 </div>
 </div>
 )}
 </div>

 {/* Everything the prototype does not have has been removed from this surface, on
 the owner's instruction (2026-08-13): the "Or narrow it down" divider, the
 Cuisine rail, the "Mood, diet & budget" sheet row and the filter sheet behind
 it. The prototype answers those with freeform search plus the occasion grid,
 and this is meant to BE the prototype, not to keep the old controls beside it.
 The Chip / FilterGroup / FilterSheet / GlassSlider components and the cuisine
 helpers above are left in the file, unrendered, so nothing else that imports
 them breaks and so restoring any of this is one JSX block, not a rewrite. */}
 {false && (
 <FilterGroup title="Cuisine" optional scroll>
 {visibleCuisines.map((c) => (
 <Chip
 key={c.value}
 label={c.label}
 selected={dimensions.cuisines.includes(c.value)}
 onClick={() => toggleCuisine(c.value)}
 icon={cuisineIcon(c.label)}
 available={isAvailable(c)}
 />
 ))}
 {false && (
 /* Dashed and muted so it reads as a disclosure control, not another cuisine to
    filter by. Its own line of text says how many are behind it — "more" alone
    doesn't tell you whether it is worth the tap. */
 <button
 type="button"
 onClick={() => setShowAllCuisines((v) => !v)}
 aria-expanded={showAllCuisines}
 className="hit-44 inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--rule)] px-3.5 py-2 text-[13px] font-medium text-[var(--text-muted)] hover:border-[var(--accent-terracotta)] hover:text-[var(--accent-terracotta)] transition-colors cursor-pointer"
 >
 {showAllCuisines ? 'Show fewer' : `+${cuisines.length - CUISINE_PREVIEW} more`}
 </button>
 )}
 </FilterGroup>
 )}

 {false && (<>
 {/* ONE affordance for everything granular. Mood, Diet and Budget are secondary:
 useful, not what gets someone out the door. Stacking them on the canvas as
 more rails made three competing scroll axes and buried Budget below the fold.
 The row reads as a native list row — label left, current state right — so the
 collapsed state still says what is set. */}
 <button
 type="button"
 onClick={() => setSheetOpen(true)}
 aria-haspopup="dialog"
 aria-expanded={sheetOpen}
 className="surface-quiet surface-hover tap-44 w-full flex items-center gap-3 px-4 rounded-none border-x-0 border-y border-[var(--rule)] text-left cursor-pointer transition-colors"
 >
 <SlidersHorizontal className="w-4 h-4 flex-shrink-0 text-[var(--accent-terracotta)]" strokeWidth={1.75} aria-hidden="true" />
 <span className="text-sm font-medium text-[var(--charcoal)]">
 Mood, diet &amp; budget
 </span>
 <span className="ml-auto text-xs text-[var(--text-muted)] truncate max-w-[45%] text-right">
 {sheetSummary || 'Any'}
 </span>
 {sheetCount > 0 && (
 <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] text-xs font-bold flex items-center justify-center">
 {sheetCount}
 </span>
 )}
 </button>

 {/* Escape hatch on the canvas too. Filters that can't be undone in one tap are a
 trap — after four taps most people don't remember what they set. */}
 {activeCount > 0 && (
 <button
 type="button"
 onClick={clearAll}
 className="tap-44 self-start flex items-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] underline underline-offset-4 cursor-pointer transition-colors"
 >
 Clear {activeCount} filter{activeCount > 1 ?'s' :''}
 </button>
 )}

 <FilterSheet
 open={sheetOpen}
 onClose={() => setSheetOpen(false)}
 activeCount={activeCount}
 onClear={clearAll}
 >
 <FilterGroup title="Mood" optional>
 {moods.map((m) => (
 <Chip key={m.value} label={m.label} selected={dimensions.vibe === m.value} onClick={() => toggle('vibe', m.value)} />
 ))}
 </FilterGroup>

 <FilterGroup title="Diet" optional>
 {['Vegan','Vegetarian','Halaal','Seafood'].map((d) => (
 <Chip key={d} label={d} selected={dimensions.diet === d} onClick={() => toggle('diet', d)} />
 ))}
 </FilterGroup>

 <div className="flex flex-col gap-3">
 <span className="text-xs font-semibold tracking-[-0.005em] text-[var(--charcoal)]">Budget</span>
 <GlassSlider
 ariaLabel="Budget"
 // Bands, not currency. These were 'R' | 'RR' | 'RRR' | 'RRRR' — the Rand glyph
 // repeated — which survived the regional pass because this file never says
 // "Rand" or "Cape Town" anywhere. The value is the Places tier (1-4); the dots
 // are how it is drawn, and they mean the same thing in every country.
 stops={[
 { label:'Any', value: null },
 { label:'\u25CF\u25CB\u25CB\u25CB', sub:'Inexpensive', value:'1' },
 { label:'\u25CF\u25CF\u25CB\u25CB', sub:'Moderate', value:'2' },
 { label:'\u25CF\u25CF\u25CF\u25CB', sub:'Expensive', value:'3' },
 { label:'\u25CF\u25CF\u25CF\u25CF', sub:'Very expensive', value:'4' },
 ]}
 selectedValue={dimensions.capacity}
 onSelect={(value) => onChange({ ...dimensions, capacity: value })}
 />
 </div>
 </FilterSheet>
 </>)}
 </aside>
);
};
