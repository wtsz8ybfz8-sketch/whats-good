import React from'react';
import { createPortal } from'react-dom';
import { Dimensions } from'../types';
import { Search, SlidersHorizontal, X, type LucideIcon } from'lucide-react';
import { cuisineIcon } from'../cuisineIcon';

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

/** Resolve a raw Places cuisine string to a curated chip, or null to drop it. */
const resolveCuisine = (raw: string): { label: string; value: string } | null => {
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

export const Sidebar: React.FC<SidebarProps> = ({ dimensions, onChange, nearbyCuisines = [] }) => {
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
 if (dimensions.regional && !head.some((c) => c.value === dimensions.regional)) {
 const selected = cuisines.find((c) => c.value === dimensions.regional);
 if (selected) return [...head, selected];
 }
 return head;
 }, [cuisines, showAllCuisines, dimensions.regional]);

 const [sheetOpen, setSheetOpen] = React.useState(false);

 // Every chip toggles: tapping the active one clears it. No "Any" option needed.
 const toggle = (key: 'vibe' | 'regional' | 'diet', val: string) =>
 onChange({ ...dimensions, [key]: dimensions[key] === val ? null : val });

 const clearAll = () =>
 onChange({ ...dimensions, vibe: null, regional: null, diet: null, capacity: null });

 const activeCount = [dimensions.vibe, dimensions.regional, dimensions.diet, dimensions.capacity].filter(Boolean).length;
 // Only what the sheet actually owns. A badge counting a Cuisine chip the user can
 // see on the canvas makes the button look wrong the moment they tap it.
 const sheetCount = [dimensions.vibe, dimensions.diet, dimensions.capacity].filter(Boolean).length;

 // The label of the mood currently set, so the collapsed state still tells the user
 // what is on. Progressive disclosure that hides state is just hiding.
 const activeMoodLabel = moods.find((m) => m.value === dimensions.vibe)?.label;
 const sheetSummary = [activeMoodLabel, dimensions.diet, dimensions.capacity]
 .filter(Boolean)
 .join(' · ');

 return (
 <aside className="editorial-search-panel bg-transparent px-5 py-6 lg:px-12 lg:py-14 flex flex-col gap-8 lg:gap-10 overflow-y-visible">
 <div className="max-w-3xl">
 <p className="editorial-eyebrow mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-terracotta)]">
 A considered guide to eating well
 </p>
 <h1 className="font-serif text-[clamp(2.5rem,5vw,5.75rem)] font-semibold leading-[0.94] text-[var(--heading-color)] tracking-[-0.045em]">
 Where are we<br />
 <span className="italic font-normal text-[var(--accent-terracotta)]">eating?</span>
 </h1>
 <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.65] text-[var(--text-muted)]">
 Places worth leaving the house for — chosen around your mood, your appetite and your budget, then sorted by what is <span className="text-[var(--charcoal)] font-medium">open now</span>.
 </p>
 </div>

 {/* Search first: someone who already knows what they want shouldn't have to
 answer three mood questions to get there. */}
 <div className="flex flex-col gap-2">
 <label htmlFor="place-search" className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 Search
 </label>
 <div className="relative">
 <input
 id="place-search"
 type="text"
 value={dimensions.searchQuery}
 onChange={(e) => onChange({ ...dimensions, searchQuery: e.target.value })}
 placeholder="A place, a dish, or an area…"
 className="w-full bg-transparent border-0 border-b border-[var(--charcoal)]/25 dark:border-white/20 rounded-none py-4 pl-9 pr-14 text-[16px] text-[var(--charcoal)] focus:outline-none focus:border-[var(--accent-terracotta)] focus:ring-0 placeholder:text-[var(--text-subtle)] transition-all"
 />
 <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
 {dimensions.searchQuery && (
 <button
 onClick={() => onChange({ ...dimensions, searchQuery:'' })}
 className="absolute right-3 top-2.5 px-2 py-1 text-[12px] text-[var(--accent-terracotta)] font-semibold hover:underline transition-colors cursor-pointer"
 >
 Clear
 </button>
)}
 </div>
 </div>

 <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] select-none">
 <span className="h-px w-10 bg-[var(--accent-terracotta)]" />
 <span>Or refine the feeling</span>
 </div>

 {/* THE one horizontal rail on this screen. Cuisine is the primary axis — it is
 the decision most people arrive already holding ("I want sushi"), and it is
 the only list long enough that a rail beats a wrap. */}
 <FilterGroup
 title="Cuisine"
 optional
 scroll
 note={availableCount > 0 ? `${availableCount} available here` : undefined}
 >
 {visibleCuisines.map((c) => (
 <Chip
 key={c.value}
 label={c.label}
 selected={dimensions.regional === c.value}
 onClick={() => toggle('regional', c.value)}
 icon={cuisineIcon(c.label)}
 available={isAvailable(c)}
 />
 ))}
 {cuisines.length > CUISINE_PREVIEW && (
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
 </aside>
);
};
