/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from'react';
import { eateryPlaceholderImage } from '../App';
import { formatPriceTier, priceTierLabel } from '../placesService';
import { ParsedRecipe } from'../types';
import { formatQuantity } from '../locale';
import { Clock, Flame, ChevronLeft, ChevronDown, Check, Compass, ExternalLink, Heart, ShoppingBag, Store, MapPin, Star } from'lucide-react';
import { cuisineIcon } from'../cuisineIcon';

interface RecipeViewProps {
 recipes: ParsedRecipe[];
 selectedRecipe: ParsedRecipe | null;
 onSelectRecipe: (recipe: ParsedRecipe | null) => void;
 onRegenerate: () => void;
 isRandomMode: boolean;
 savedIds: string[];
 onToggleSave: (recipe: ParsedRecipe) => void;
 isSavedTab?: boolean;
 onFindCorrespondingRestaurants?: (recipe: ParsedRecipe) => void;
 city?: string;
}

export const RecipeView: React.FC<RecipeViewProps> = ({
 recipes,
 selectedRecipe,
 onSelectRecipe,
 onRegenerate,
 isRandomMode,
 savedIds,
 onToggleSave,
 isSavedTab,
 city = 'your area',
 onFindCorrespondingRestaurants,
}) => {
 // Local state to keep track of checked ingredients for checklist interaction
 const [completedIngredients, setCompletedIngredients] = useState<Record<string, boolean>>({});
 const [toastMsg, setToastMsg] = useState<string | null>(null);

 // Portion logic
 const [plates, setPlates] = useState<number>(1);
 const [defaultPlates, setDefaultPlates] = useState<number>(1);

 // Reset checked ingredients whenever the selected recipe changes
 useEffect(() => {
 setCompletedIngredients({});
 setToastMsg(null);
 if (selectedRecipe) {
 const match = selectedRecipe.serves.match(/(\d+)/);
 const m = match ? parseInt(match[1]) : 1;
 setDefaultPlates(m > 0 ? m : 1);
 setPlates(m > 0 ? m : 1);
 }
 }, [selectedRecipe]);

 const scaleIngredient = (ingredient: string): string => {
 if (plates === defaultPlates || defaultPlates === 0) return ingredient;
 const ratio = plates / defaultPlates;
 
 // Look for numbers at the start of the ingredient string like"1/2 cup" or"2" or"1.5"
 return ingredient.replace(/^([\d.\/]+)/, (match) => {
 // Evaluate basic fractions
 let val = 0;
 if (match.includes('/')) {
 const parts = match.split('/');
 if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
 val = Number(parts[0]) / Number(parts[1]);
 }
 } else {
 val = Number(match);
 }
 
 if (!isNaN(val) && val > 0) {
 const scaled = val * ratio;
 // Intl, not toFixed: toFixed always emits a "." and pads to a fixed width, so a
 // scaled recipe read "0.5 tsp" to everyone who writes "0,5". Intl drops the
 // trailing zeros itself, so the old .replace() is gone with it.
 return formatQuantity(scaled, 2);
 }
 return match;
 });
 };

 const handleAdjustPlates = (delta: number) => {
 setPlates(p => Math.max(1, p + delta));
 };

 // Handle toast timers
 useEffect(() => {
 if (toastMsg) {
 const t = setTimeout(() => setToastMsg(null), 4000);
 return () => clearTimeout(t);
 }
 }, [toastMsg]);

 const triggerToast = (msg: string) => {
 setToastMsg(msg);
 };

 const toggleIngredient = (id: string, idx: number) => {
 const key = `${id}-${idx}`;
 setCompletedIngredients((prev) => ({
 ...prev,
 [key]: !prev[key],
 }));
 };


 // If a specific recipe is selected, show its glorious detailed page
 if (selectedRecipe) {
 const r = selectedRecipe;
 // px-5 below is the BASE, not sm:. This shipped as `sm:px-8` alone, so padding only
 // began at 640px and every phone got none — recipe title, back link, Save button and
 // hero card all sat flush against the bezel (§11.5). Nothing above this element carries
 // horizontal padding either: <main> is .page-grid (vertical padding only), and the
 // tab-content wrapper that owns mobile px-5 is not an ancestor of the detail branch.
 // This is the single owner of the horizontal margin here — don't pad a child, and don't
 // remove it.
 return (
 <div className="max-w-[820px] mx-auto w-full animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards] px-5 sm:px-8 py-4">
 {/* Back is UNCONDITIONAL. It used to be gated on `recipes.length > 1 || isSavedTab`,
 which meant every single-result path — the Stay In random recipe, the wildcard,
 any deep link that lands on one dish — rendered a detail page with no way out.
 The user's report was "I can't go back to my starting point once I've viewed a
 restaurant or recipe", and this gate was it. A detail view ALWAYS needs an exit;
 if the count is uninteresting, drop the count, not the button. */}
 {(
 <button
 onClick={() => onSelectRecipe(null)}
 className="hit-44 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[#1A1A1A] dark:hover:text-[#f5f5f5] mb-6 transition-colors bg-none border-none cursor-pointer"
 >
 <ChevronLeft className="w-3.5 h-3.5" />
 {isSavedTab ? (
 <span>Back to Saved Recipes ({recipes.length} saved)</span>
) : recipes.length > 1 ? (
 <span>Back to results ({recipes.length} found)</span>
) : (
 <span>Back</span>
)}
 </button>
)}

 <div className="flex flex-col gap-6 sm:gap-8">
 {/* Title block. Two coloured mono "badges" (#Category and a navy "{area} Culture"
 chip that wasn't even in the palette) used to sit above the title, followed by an
 italic auto-generated line — "A classic dish representing Beef, Tag, Tag." — that
 said nothing and read as machine filler. A dish has a cuisine and an origin; that
 is one quiet line of metadata, not three competing chips. */}
 <div className="flex flex-wrap items-start justify-between gap-4">
 <div className="min-w-0">
 <p className="text-[12px] font-medium text-[var(--text-muted)] mb-2">
 {[r.area, r.category].filter(Boolean).join(' · ')}
 </p>
 <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-[var(--heading-color)]">
 {r.name}
 </h2>
 </div>

 <button
 onClick={() => onToggleSave(r)}
 aria-pressed={savedIds.includes(r.id)}
 className={`hit-44 flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-medium transition-colors cursor-pointer ${
 savedIds.includes(r.id)
 ?'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
 :'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 <Heart className={`w-4 h-4 ${savedIds.includes(r.id) ?'fill-current' :''}`} />
 {savedIds.includes(r.id) ?'Saved' :'Save'}
 </button>
 </div>

 {/* Hero Recipe Image */}
 <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden border border-[var(--rule)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.05)] relative group bg-[#F2F1EE] dark:bg-[#222222]">
 <img
 src={r.image}
 alt={r.name}
 decoding="async"
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
 />
 {/* Premium aesthetic overlay */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-40" />
 </div>

 {/* Structured Ticket Stats */}
 <div className="grid grid-cols-3 border-t border-b border-dashed border-[var(--rule)] py-5 my-2 max-w-[500px]">
 <div className="text-center">
 <span className="font-mono text-lg sm:text-xl font-bold text-[var(--charcoal)] block">
 {r.prepTime}
 </span>
 <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mt-1">
 Prep
 </span>
 </div>
 <div className="text-center border-l border-r border-[#e6e4e0] dark:border-white/10">
 <span className="font-mono text-lg sm:text-xl font-bold text-[var(--charcoal)] block">
 {r.cookTime}
 </span>
 <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mt-1">
 Cook
 </span>
 </div>
 <div className="text-center flex flex-col items-center justify-center">
 {/* Stepper. The ink stays 24px — a 44px drawn circle beside an 18px numeral is
 the "comically large button" failure. `.hit-44` lays an invisible 44×44
 box over each control instead, so the touch is HIG-legal and the drawing
 isn't. Gap widened to 4 (16px) so the two invisible boxes clear each other. */}
 <div className="flex items-center gap-4">
 <button
 type="button"
 aria-label="One fewer plate"
 onClick={() => handleAdjustPlates(-1)}
 disabled={plates <= 1}
 className="hit-44 w-6 h-6 rounded-full border border-[var(--rule)] flex items-center justify-center leading-none text-[var(--charcoal)] hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20 hover:text-[#7C2D12] dark:hover:text-[#fca5a5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
 >
 -
 </button>
 <span className="font-mono text-lg sm:text-xl font-bold text-[var(--charcoal)] block min-w-[1.5rem]">
 {plates}
 </span>
 <button
 type="button"
 aria-label="One more plate"
 onClick={() => handleAdjustPlates(1)}
 className="hit-44 w-6 h-6 rounded-full border border-[var(--rule)] flex items-center justify-center leading-none text-[var(--charcoal)] hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20 hover:text-[#7C2D12] dark:hover:text-[#fca5a5] cursor-pointer transition-colors"
 >
 +
 </button>
 </div>
 <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mt-1">
 Serves
 </span>
 </div>
 </div>

 {/* The "Good to know" gut-health block was removed here. It was invented health
 copy — generated from a keyword match on the ingredient list, then written in a
 register ("prokinetic properties", "slow-release carbohydrates that avoid spike
 loops") that reads as clinical fact. Nobody came to a recipe page for a digestion
 lecture, and dressing guesswork as nutrition advice is the same failure as the
 fabricated menus: confident, unsourced, and impossible for the reader to check.
 Do not reintroduce it. */}

 {/* Ingredients & Preparation Lists */}
 <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
 {/* Ingredients Side */}
 <details className="md:col-span-5 group w-full" open>
 <summary className="list-none flex items-baseline justify-between cursor-pointer md:cursor-text md:pointer-events-none pb-2 border-b border-[var(--rule)] select-none outline-none">
 <h3 className="font-serif text-xl sm:text-2xl text-[var(--charcoal)]">
 Ingredients
 {plates !== defaultPlates && (
 <span className="ml-3 text-xs font-mono text-[var(--accent-terracotta)] uppercase tracking-wider bg-[var(--accent-tint)] border border-[var(--accent-tint-border)] px-2 py-0.5 rounded-md align-middle">Scaled x{formatQuantity(plates / defaultPlates, 1)}</span>
)}
 </h3>
 <ChevronDown className="md:hidden w-4 h-4 text-[var(--charcoal)] opacity-50 ml-2 group-open:rotate-180 transition-transform flex-shrink-0" />
 </summary>
 <div className="flex flex-col gap-4 pt-4">
 <p className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
 Tap to check off as you go
 </p>
 <ul className="flex flex-col divide-y divide-[#f3f1ed]">
 {r.ingredients.map((ing, idx) => {
 const itemKey = `${r.id}-${idx}`;
 const isDone = !!completedIngredients[itemKey];
 const displayIngredient = scaleIngredient(ing);
 return (
 <li
 key={idx}
 role="checkbox"
 aria-checked={isDone}
 aria-label={displayIngredient}
 tabIndex={0}
 onClick={() => toggleIngredient(r.id, idx)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 toggleIngredient(r.id, idx);
 }
 }}
 className={`py-3 flex items-start gap-3 cursor-pointer transition-all rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--accent-terracotta)] focus-visible:outline-offset-2 ${
 isDone ?'opacity-35 line-through' :'opacity-100'
 }`}
 >
 <div
 className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
 isDone
 ?'bg-[#7C2D12] border-[#7C2D12] text-white'
 :'border-[var(--accent-tint-border)] bg-[#FAF9F6] dark:bg-[#111111]'
 }`}
 >
 {isDone && <Check className="w-3 h-3 stroke-[3]" />}
 </div>
 <span className="font-sans text-sm text-[var(--charcoal)] leading-tight select-none">
 {displayIngredient}
 </span>
 </li>
);
 })}
 </ul>
 </div>
 </details>

 {/* Steps Side */}
 <details className="md:col-span-7 group w-full" open>
 <summary className="list-none flex items-baseline justify-between cursor-pointer md:cursor-text md:pointer-events-none pb-2 border-b border-[var(--rule)] select-none outline-none">
 <h3 className="font-serif text-xl sm:text-2xl text-[var(--charcoal)]">
 How to make it
 </h3>
 <ChevronDown className="md:hidden w-4 h-4 text-[var(--charcoal)] opacity-50 ml-2 group-open:rotate-180 transition-transform flex-shrink-0" />
 </summary>
 <div className="flex flex-col gap-6 pt-4">
 {r.steps.map((step, idx) => (
 <div key={idx} className="flex gap-4 group/step">
 <div className="font-mono text-xs font-bold w-7 h-7 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-[var(--charcoal)] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 transition-colors group-hover/step:border-[#7C2D12] group-hover/step:text-[#7C2D12] dark:group-hover/step:text-[#fca5a5]">
 {idx + 1}
 </div>
 <p className="font-sans text-sm sm:text-[15px] leading-relaxed text-[var(--charcoal)] pt-0.5">
 {step}
 </p>
 </div>
))}
 </div>
 </details>
 </div>

 {/* Links Row */}
 {(r.youtube || r.source) && (
 <div className="border-t border-[var(--rule)] pt-6 flex flex-wrap gap-6">
 {r.youtube && (
 <a
 href={r.youtube}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1.5 font-sans text-xs font-bold text-red-700 hover:text-red-900 transition-colors"
 >
 <ExternalLink className="w-3.5 h-3.5" />
 View Video Tutorial
 </a>
)}
 {r.source && (
 <a
 href={r.source}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1.5 font-sans text-xs font-bold text-[#5b7993] hover:text-[#1A1A1A] dark:hover:text-[#f5f5f5] transition-colors"
 >
 <ExternalLink className="w-3.5 h-3.5" />
 Recipe Original Source
 </a>
)}
 </div>
)}

 {/* Grocery delivery & dine-out follow-ups — recipes only */}
 {!r.id.startsWith('eat') && (
 <div className="border-t border-[var(--rule)] pt-8 mt-4 select-none">
 <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold block mb-4">
 Get it sorted
 </span>
 {/* Three hand-drawn retailer logos in their own brand colours — a teal pill, a
 black "W. DASH" tile, a red/blue "PnP asap!" — pulled four foreign palettes
 into a warm editorial page and looked like counterfeit badges. They also
 didn't work: each one did `ingredients.join('')`, with an EMPTY separator, so
 "2 cups flour" + "1 tsp salt" became one string, `2 cups flour1 tsp salt`,
 which every one of those search engines returns nothing for. The claim
 "automatically package all items and deliver in under 60 minutes" was also
 untrue — we open a search box, we don't build a basket.

 What actually helps someone standing in a kitchen: put the list on their
 clipboard (so it can be pasted into any store app, or a note, or a message),
 then open the store. Same three retailers, our own typography, honest copy. */}
 <div className="flex flex-col gap-4">
 <div>
 <h4 className="font-serif text-xl text-[var(--heading-color)] mb-1.5 flex items-center gap-2">
 <ShoppingBag className="w-5 h-5 text-[var(--accent-terracotta)]" />
 Shop the ingredients
 </h4>
 <p className="text-sm text-[var(--text-muted)] leading-relaxed">
 Copies all {r.ingredients.length} items to your clipboard, then opens the store so you can paste and go.
 </p>
 </div>

 <div className="flex flex-wrap gap-2">
 {[
 { name:'Checkers Sixty60', url:'https://www.checkers.co.za/search/all?q=' },
 { name:'Woolworths Dash', url:'https://www.woolworths.co.za/search?searchTerm=' },
 { name:'Pick n Pay asap!', url:'https://www.pnp.co.za/search?q=' },
 ].map((store) => (
 <button
 key={store.name}
 onClick={async () => {
 const list = r.ingredients.map(scaleIngredient).join('\n');
 try {
 await navigator.clipboard.writeText(list);
 triggerToast(`${r.ingredients.length} ingredients copied — paste into ${store.name}.`);
 } catch {
 triggerToast(`Opening ${store.name}. Copy didn't work — your browser blocked it.`);
 }
 // Search the first ingredient so the store lands on something real
 // rather than a no-results page for the whole concatenated list.
 window.open(store.url + encodeURIComponent(r.ingredients[0] ?? ''),'_blank','noopener');
 }}
 className="press px-4 py-2.5 rounded-full border border-[var(--rule)] text-[13px] font-medium text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)] transition-colors cursor-pointer"
 >
 {store.name}
 </button>
 ))}
 </div>

 <div className="pt-4 mt-2 border-t border-[var(--rule)] flex flex-wrap items-center gap-3">
 <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
 <Store className="w-4 h-4 flex-shrink-0" />
 Not in the mood to cook after all?
 </p>
 <button
 onClick={() => onFindCorrespondingRestaurants?.(r)}
 className="press px-4 py-2.5 rounded-full border border-[var(--rule)] text-[13px] font-medium text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)] transition-colors cursor-pointer"
 >
 Find somewhere serving it
 </button>
 </div>
 </div>
 </div>
)}

 {/* Alternative action buttons */}
 <div className="pt-8 border-t border-[var(--rule)] flex items-center justify-start gap-4">
 <button
 onClick={onRegenerate}
 className="px-6 py-3.5 bg-transparent border border-[#7C2D12] text-[var(--accent-terracotta)] hover:bg-[#7C2D12] hover:text-white rounded-xl font-sans text-sm font-bold transition-all cursor-pointer"
 >
 {isRandomMode ?'Surprise me again' :'Find different recipes'}
 </button>
 {recipes.length > 1 && (
 <button
 onClick={() => onSelectRecipe(null)}
 className="hit-44 px-6 py-3.5 bg-none border-none text-[var(--text-muted)] hover:text-[var(--charcoal)] font-sans text-sm font-bold transition-all cursor-pointer"
 >
 See other matches ({recipes.length - 1} more)
 </button>
)}
 </div>
 </div>
 {toastMsg && (
 // Clears the tab bar via --tabbar-h + the home-indicator inset, never a guessed
 // number: 80px was 23px of luck against a 57px bar, and would have sat UNDER it
 // the moment the bar grew.
 <div className="fixed bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1rem)] md:bottom-6 right-4 md:right-6 z-50 bg-[var(--charcoal)] text-[var(--bg-warm)] py-3.5 px-5 rounded-2xl shadow-xl font-sans text-xs font-semibold flex items-center gap-3 border border-[var(--border-color)] max-w-sm">
 <div className="w-2.5 h-2.5 rounded-full bg-[#7C2D12] animate-pulse flex-shrink-0" />
 <span>{toastMsg}</span>
 </div>
)}
 </div>
);
 }

 // Showcase grid if multiple matches are returned and none are explicitly active
 return (
 <div className="max-w-[1000px] mx-auto w-full sm:px-8 py-4 animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="flex flex-col gap-2 mb-8 sm:mb-12">
 <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold">
 Here's what we found
 </span>
 <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--charcoal)]">
 {recipes.some((r) => r.id.startsWith('eat'))
 ? `We found ${recipes.length} ${recipes.length === 1 ?'eatery' :'eateries'} near ${city}`
 : `We found ${recipes.length} ${recipes.length === 1 ?'recipe' :'recipes'} for you`}
 </h2>
 <p className="text-[var(--text-muted)] font-sans text-sm sm:text-base max-w-[600px] mt-2 leading-relaxed">
 {recipes.some((r) => r.id.startsWith('eat'))
 ?'Tap any eatery for directions, contact details, and wait times.'
 :'Tap any recipe to see the full ingredients and step-by-step home cooking checklist.'}
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
 {recipes.map((r) => {
 const isRestaurant = r.id.startsWith('eat');
 const rawEatery = (r as any).rawEatery;

 if (isRestaurant && rawEatery) {
 // Minimal restaurant card — name, cuisine, rating, price tier, distance only.
 // No food photos, no signature dishes, no plate copy.
 return (
 <div
 key={r.id}
 role="button"
 tabIndex={0}
 aria-label={`View ${rawEatery.name}`}
 onClick={() => onSelectRecipe(r)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 onSelectRecipe(r);
 }
 }}
 className="surface surface-hover rounded-2xl p-5 sm:p-6 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 cursor-pointer group flex flex-col h-full transition-all duration-200 ease-out relative focus-visible:outline-2 focus-visible:outline-[#7C2D12] dark:focus-visible:outline-[#fca5a5]"
 >
 {/* Save button */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onToggleSave(r);
 }}
 // tap-44: drawn at 32px, tapped at 44px (HIG minimum) on touch devices.
 className={`tap-44 absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
 savedIds.includes(r.id)
 ?'bg-[#7C2D12] text-white'
 :'text-[var(--text-subtle)] hover:text-[var(--accent-terracotta)] hover:bg-black/5 dark:hover:bg-white/5'
 }`}
 title={savedIds.includes(r.id) ?'Remove from saved' :'Save eatery'}
 aria-label={savedIds.includes(r.id) ? `Remove ${rawEatery.name} from saved` : `Save ${rawEatery.name}`}
 aria-pressed={savedIds.includes(r.id)}
 >
 <Heart className={`w-4 h-4 ${savedIds.includes(r.id) ?'fill-current' :''}`} />
 </button>

 {/* Thumbnail — bleeds to the card edge. Places results carry a real photoUrl;
 the hardcoded fallback list gets the generated initials card, which is why
 photos only appear once the API is reachable. Aspect-locked so a slow or
 missing image never shifts the layout. */}
 <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6 mb-4 rounded-t-2xl overflow-hidden bg-[var(--rule)] h-[168px] sm:h-[180px]">
 <img
 src={r.image}
 alt={rawEatery.name}
 loading="lazy"
 decoding="async"
 referrerPolicy="no-referrer"
 onError={(e) => { (e.currentTarget as HTMLImageElement).src = eateryPlaceholderImage(rawEatery.name); }}
 className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
 />
 </div>

 {/* Cuisine tag */}
 {rawEatery.cuisine && (
 <span className="inline-flex self-start font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--accent-tint)] text-[var(--accent-terracotta)] mb-4 max-w-[70%] truncate">
 {rawEatery.cuisine}
 </span>
 )}

 {/* Name */}
 <h3 className="font-serif text-xl sm:text-2xl text-[var(--charcoal)] group-hover:text-[#7C2D12] dark:group-hover:text-[#fca5a5] transition-colors leading-snug mb-4 pr-8">
 {rawEatery.name}
 </h3>

 {/* Rating · price · distance · open now */}
 <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-mono text-[var(--text-muted)]">
 <span className="flex items-center gap-1 text-[var(--charcoal)] font-bold">
 <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rawEatery.rating}
 </span>
 <span className="opacity-30">·</span>
 <span className="font-bold text-[var(--charcoal)]" aria-label={priceTierLabel(rawEatery.priceTier)}>{formatPriceTier(rawEatery.priceTier)}</span>
 {typeof r.tags[1] ==='string' && r.tags[1].includes('km') && (
 <>
 <span className="opacity-30">·</span>
 <span className="flex items-center gap-1 text-[var(--accent-terracotta)] font-bold">
 <MapPin className="w-3 h-3" /> {r.tags[1]}
 </span>
 </>
)}
 {rawEatery.openNow !== undefined && (
 <>
 <span className="opacity-30">·</span>
 <span className={`font-bold ${rawEatery.openNow ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`}>
 {rawEatery.openNow ? 'Open now' : 'Closed'}
 </span>
 </>
 )}
 </div>
 </div>
);
 }

 return (
 <div
 key={r.id}
 role="button"
 tabIndex={0}
 aria-label={`View ${r.name}`}
 onClick={() => onSelectRecipe(r)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 onSelectRecipe(r);
 }
 }}
 className="surface surface-hover rounded-3xl overflow-hidden hover:shadow-[0_20px_48px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_20px_48px_rgba(0,0,0,0.55)] hover:-translate-y-1 cursor-pointer group flex flex-col h-full transition-all duration-300 ease-out relative focus-visible:outline-2 focus-visible:outline-[var(--accent-terracotta)] focus-visible:outline-offset-2"
 >
 {/* Image banner */}
 <div className="w-full h-52 sm:h-60 bg-[#F2F1EE] dark:bg-[#222222] overflow-hidden relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
 <img
 src={r.image}
 alt={r.name}
 loading="lazy"
 decoding="async"
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
 />
 {/* Premium gradient overlay for depth */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-60 mix-blend-multiply pointer-events-none transition-opacity duration-300 group-hover:opacity-40" />
 
 <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
 <span className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-md text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full text-[var(--accent-terracotta)]">
 {React.createElement(cuisineIcon(r.category), {
'aria-hidden':'true',
 strokeWidth: 2,
 className:'w-3 h-3 flex-shrink-0',
 })}
 {r.category}
 </span>
 </div>
 <div className="absolute top-3 right-3 z-10">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onToggleSave(r);
 }}
 className={`tap-44 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm border transition-all ${
 savedIds.includes(r.id)
 ?'bg-[#7C2D12] text-white border-[#7C2D12] hover:bg-[#5E220E]'
 :'bg-white/80 dark:bg-black/50 backdrop-blur-md text-[var(--accent-terracotta)] border-white/40 dark:border-white/20 hover:scale-110'
 }`}
 title={savedIds.includes(r.id) ?'Remove Recipe' :'Save Recipe'}
 >
 <Heart className={`w-4 h-4 ${savedIds.includes(r.id) ?'fill-current' :''}`} />
 </button>
 </div>
 </div>

 {/* Core copy */}
 <div className="p-6 flex flex-col flex-1 gap-2.5">
 <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider block">
 {r.area} Cuisine
 </span>
 <h3 className="font-serif text-lg sm:text-xl text-[var(--charcoal)] group-hover:text-[#7C2D12] dark:group-hover:text-[#fca5a5] transition-colors leading-snug line-clamp-2">
 {r.name}
 </h3>
 <p className="text-xs sm:text-sm text-[var(--text-muted)] line-clamp-3 leading-relaxed mt-1 mb-3">
 {r.instructions ||'A crowd-pleasing dish worth making at home.'}
 </p>
 
 <div className="mt-auto pt-4 border-t border-[#f3f1ed] flex items-center justify-between text-[var(--text-muted)]">
 {/* Venue cards carry an empty prepTime now that "Check with venue" is gone —
 Places doesn't publish a wait time. A lone clock icon with nothing beside it
 reads as a value that failed to load, so drop the whole pair. */}
 {r.prepTime && (
 <span className="flex items-center gap-1 text-xs font-mono">
 <Clock className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" /> {r.prepTime}
 </span>
 )}
 {r.cookTime && (
 <span className="flex items-center gap-1 text-xs font-mono">
 <Flame className="w-3.5 h-3.5 text-amber-600" /> {r.cookTime}
 </span>
 )}
 </div>
 </div>
 </div>
);
 })}
 </div>

 <div className="mt-12 text-center pt-8 border-t border-[var(--rule)]">
 <p className="text-xs text-[var(--text-muted)] font-sans mb-4">
 Not quite right?
 </p>
 <button
 onClick={onRegenerate}
 className="hit-44 inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white hover:bg-[#7C2D12] rounded-xl font-sans text-xs font-bold transition-all cursor-pointer"
 >
 <Compass className="w-4 h-4" /> Try something different
 </button>
 </div>
 {toastMsg && (
 // Clears the tab bar via --tabbar-h + the home-indicator inset, never a guessed
 // number: 80px was 23px of luck against a 57px bar, and would have sat UNDER it
 // the moment the bar grew.
 <div className="fixed bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1rem)] md:bottom-6 right-4 md:right-6 z-50 bg-[var(--charcoal)] text-[var(--bg-warm)] py-3.5 px-5 rounded-2xl shadow-xl font-sans text-xs font-semibold flex items-center gap-3 border border-[var(--border-color)] max-w-sm">
 <div className="w-2.5 h-2.5 rounded-full bg-[#7C2D12] animate-pulse flex-shrink-0" />
 <span>{toastMsg}</span>
 </div>
)}
 </div>
);
};
