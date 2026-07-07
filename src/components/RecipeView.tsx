/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from'react';
import { ParsedRecipe } from'../types';
import { Clock, Flame, ChevronLeft, Check, Compass, ExternalLink, Heart, ShoppingBag, Store, Activity, MapPin, Star } from'lucide-react';

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
 // Format to max 2 decimal places if needed
 return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(2).replace(/\.00$/,'');
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
 return (
 <div className="max-w-[820px] mx-auto w-full animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards] px-2 sm:px-4 py-4">
 {/* Navigation back header if we have other recipes in list */}
 {(recipes.length > 1 || isSavedTab) && (
 <button
 onClick={() => onSelectRecipe(null)}
 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:hover:text-[#f5f5f5] mb-6 transition-colors bg-none border-none cursor-pointer"
 >
 <ChevronLeft className="w-3.5 h-3.5" />
 {isSavedTab ? (
 <span>Back to Saved Recipes ({recipes.length} saved)</span>
) : (
 <span>Back to results ({recipes.length} found)</span>
)}
 </button>
)}

 <div className="flex flex-col gap-6 sm:gap-8">
 {/* Badge row & Save Action */}
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div className="flex flex-wrap gap-2">
 <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-[#FAF2F0] dark:bg-[#7C2D12]/20 text-[#7C2D12] dark:text-[#fca5a5]">
 #{r.category}
 </span>
 <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-[#f0f4f8] dark:bg-[#5b7993]/20 text-[#5b7993]">
 {r.area} Culture
 </span>
 </div>

 <button
 onClick={() => onToggleSave(r)}
 className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
 savedIds.includes(r.id)
 ?'bg-[#7C2D12] text-white border-[#7C2D12] hover:bg-[#5E220E] hover:border-[#5E220E]'
 :'glass text-[#7C2D12] dark:text-[#fca5a5] border-[#F5D1C9] dark:border-[#7C2D12]/40 hover:border-[#7C2D12]/60'
 }`}
 >
 <Heart className={`w-3.5 h-3.5 transition-transform ${savedIds.includes(r.id) ?'fill-current scale-110' :''}`} />
 {savedIds.includes(r.id) ?'Recipe Saved' :'Save Special Recipe'}
 </button>
 </div>

 {/* Heading */}
 <div>
 <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-[#1A1A1A] dark:text-[#f5f5f5]">
 {r.name}
 </h2>
 {r.tags && r.tags.length > 0 && (
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] font-sans mt-3 italic">
 A classic dish representing {r.tags.slice(0, 4).join(',')}.
 </p>
)}
 </div>

 {/* Hero Recipe Image */}
 <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden border border-black dark:border-[#444] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.05)] relative group bg-[#F2F1EE] dark:bg-[#222222]">
 <img
 src={r.image}
 alt={r.name}
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
 />
 {/* Premium aesthetic overlay */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-40" />
 </div>

 {/* Structured Ticket Stats */}
 <div className="grid grid-cols-3 border-t border-b border-dashed border-black dark:border-[#444] py-5 my-2 max-w-[500px]">
 <div className="text-center">
 <span className="font-mono text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] block">
 {r.prepTime}
 </span>
 <span className="text-[10px] uppercase tracking-wider text-[#6E6A64] dark:text-[#a3a3a3] block mt-1">
 Prep Clock
 </span>
 </div>
 <div className="text-center border-l border-r border-[#e6e4e0] dark:border-white/10">
 <span className="font-mono text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] block">
 {r.cookTime}
 </span>
 <span className="text-[10px] uppercase tracking-wider text-[#6E6A64] dark:text-[#a3a3a3] block mt-1">
 Active Cook
 </span>
 </div>
 <div className="text-center flex flex-col items-center justify-center">
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => handleAdjustPlates(-1)}
 disabled={plates <= 1}
 className="w-6 h-6 rounded-full border border-black dark:border-[#444] flex items-center justify-center text-[#1A1A1A] dark:text-[#f5f5f5] hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20 hover:text-[#7C2D12] dark:hover:text-[#fca5a5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
 >
 -
 </button>
 <span className="font-mono text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] block min-w-[1.5rem]">
 {plates}
 </span>
 <button
 type="button"
 onClick={() => handleAdjustPlates(1)}
 className="w-6 h-6 rounded-full border border-black dark:border-[#444] flex items-center justify-center text-[#1A1A1A] dark:text-[#f5f5f5] hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20 hover:text-[#7C2D12] dark:hover:text-[#fca5a5] cursor-pointer transition-colors"
 >
 +
 </button>
 </div>
 <span className="text-[10px] uppercase tracking-wider text-[#6E6A64] dark:text-[#a3a3a3] block mt-1">
 Yield (Plates)
 </span>
 </div>
 </div>

 {/* Clinical Insight Highlight Accent Block */}
 <div className="bg-gradient-to-r from-[#FAF2F0] to-[#FFF9F7] border-l-4 border-[#7C2D12] rounded-r-3xl p-6 flex gap-4 items-start shadow-[0_4px_20px_rgba(124,45,18,0.02)]">
 <Activity className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5] mt-0.5 flex-shrink-0 animate-pulse" />
 <div className="flex-1">
 <strong className="block text-sm font-extrabold text-[#1A1A1A] dark:text-[#f5f5f5] mb-1 font-serif tracking-tight">
 Good to know
 </strong>
 <p className="text-xs sm:text-sm text-[#3c3830] leading-relaxed font-sans">
 {r.gutTip}
 </p>
 </div>
 </div>

 {/* Ingredients & Preparation Lists */}
 <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
 {/* Ingredients Side */}
 <details className="md:col-span-5 group w-full" open>
 <summary className="list-none flex items-baseline justify-between cursor-pointer md:cursor-text md:pointer-events-none pb-2 border-b border-black dark:border-[#444] select-none outline-none">
 <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5]">
 Ingredients
 {plates !== defaultPlates && (
 <span className="ml-3 text-[10px] font-mono text-[#7C2D12] dark:text-[#fca5a5] uppercase tracking-wider bg-[#FAF2F0] dark:bg-[#7C2D12]/20 px-2 py-0.5 rounded-md align-middle">Scaled x{(plates/defaultPlates).toFixed(1).replace(/\.0$/,'')}</span>
)}
 </h3>
 <span className="md:hidden text-[#1A1A1A] dark:text-[#f5f5f5] font-bold opacity-50 ml-2 group-open:rotate-180 transition-transform">▼</span>
 </summary>
 <div className="flex flex-col gap-4 pt-4">
 <p className="text-xs text-[#6E6A64] dark:text-[#a3a3a3] font-mono uppercase tracking-wider">
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
 onClick={() => toggleIngredient(r.id, idx)}
 className={`py-3 flex items-start gap-3 cursor-pointer transition-all ${
 isDone ?'opacity-35 line-through' :'opacity-100'
 }`}
 >
 <div
 className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
 isDone
 ?'bg-[#7C2D12] border-[#7C2D12] text-white'
 :'border-[#F5D1C9] dark:border-[#7C2D12]/40 bg-[#FAF9F6] dark:bg-[#111111]'
 }`}
 >
 {isDone && <Check className="w-3 h-3 stroke-[3]" />}
 </div>
 <span className="font-sans text-sm text-[#1A1A1A] dark:text-[#f5f5f5] leading-tight select-none">
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
 <summary className="list-none flex items-baseline justify-between cursor-pointer md:cursor-text md:pointer-events-none pb-2 border-b border-black dark:border-[#444] select-none outline-none">
 <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5]">
 How to make it
 </h3>
 <span className="md:hidden text-[#1A1A1A] dark:text-[#f5f5f5] font-bold opacity-50 ml-2 group-open:rotate-180 transition-transform">▼</span>
 </summary>
 <div className="flex flex-col gap-6 pt-4">
 {r.steps.map((step, idx) => (
 <div key={idx} className="flex gap-4 group/step">
 <div className="font-mono text-xs font-bold w-7 h-7 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-[#1A1A1A] dark:text-[#f5f5f5] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 transition-colors group-hover/step:border-[#7C2D12] group-hover/step:text-[#7C2D12] dark:group-hover/step:text-[#fca5a5]">
 {idx + 1}
 </div>
 <p className="font-sans text-sm sm:text-[15px] leading-relaxed text-[#1A1A1A] dark:text-[#f5f5f5] pt-0.5">
 {step}
 </p>
 </div>
))}
 </div>
 </details>
 </div>

 {/* Links Row */}
 {(r.youtube || r.source) && (
 <div className="border-t border-black dark:border-[#444] pt-6 flex flex-wrap gap-6">
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
 <div className="border-t border-black dark:border-[#444] pt-8 mt-4 select-none">
 <span className="font-mono text-[9px] uppercase tracking-[2px] text-[#7C2D12] dark:text-[#fca5a5] font-bold block mb-4">
 Get it sorted
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <>
 {/* Grocery Delivery Integration */}
 <div className="glass p-6 sm:p-8 rounded-[2rem] flex flex-col gap-5 transition-shadow">
 <div>
 <h4 className="font-serif text-2xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] mb-2 flex items-center gap-2">
 <ShoppingBag className="w-6 h-6 text-[#7C2D12] dark:text-[#fca5a5]" />
 Get Ingredients Delivered
 </h4>
 <p className="text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed">
 Skip the store trips. Automatically package all items needed for <strong>{r.name}</strong> and deliver in under 60 minutes.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
 {/* Checkers Sixty60 */}
 <button 
 onClick={() => {
 const q = encodeURIComponent(r.ingredients.join(''));
 window.open('https://www.checkers.co.za/search/all?q=' + q,'_blank');
 triggerToast(`Opening Checkers Sixty60 with ${r.ingredients.length} items...`);
 }}
 className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-transparent bg-[#0ABFBC]/10 hover:bg-[#0ABFBC]/20 hover:border-[#0ABFBC]/30 transition-all cursor-pointer group active:scale-95"
 >
 <div className="bg-[#0ABFBC] text-white font-extrabold text-sm px-4 py-1.5 rounded-full mb-3 shadow-sm transform group-hover:-translate-y-1 transition-transform">
 Sixty60
 </div>
 <span className="font-sans text-xs font-bold text-[#1a5b5a] dark:text-[#5eead4]">Order via Checkers</span>
 </button>

 {/* Woolies Dash */}
 <button 
 onClick={() => {
 const q = encodeURIComponent(r.ingredients.join(''));
 window.open('https://www.woolworths.co.za/search?searchTerm=' + q,'_blank');
 triggerToast(`Opening Woolies Dash with ${r.ingredients.length} items...`);
 }}
 className="flex flex-col items-center justify-center p-5 rounded-2xl border border-black dark:border-[#444] bg-black dark:bg-[#222222] hover:bg-zinc-900 transition-all cursor-pointer group active:scale-95 shadow-sm"
 >
 <div className="bg-white dark:bg-[#1a1a1a] text-black dark:text-[#f5f5f5] font-serif font-black text-xs px-4 py-1.5 rounded-sm mb-3 transform group-hover:-translate-y-1 transition-transform">
 W. DASH
 </div>
 <span className="font-sans text-xs font-bold text-white">Order via Woolies</span>
 </button>

 {/* PnP Asap */}
 <button 
 onClick={() => {
 const q = encodeURIComponent(r.ingredients.join(''));
 window.open('https://www.pnp.co.za/search?q=' + q,'_blank');
 triggerToast(`Opening PnP Asap! with ${r.ingredients.length} items...`);
 }}
 className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-[#1264A3]/10 glass-subtle hover:border-[#1264A3]/30 transition-all cursor-pointer group active:scale-95"
 >
 <div className="flex gap-1 mb-3 transform group-hover:-translate-y-1 transition-transform">
 <span className="bg-[#1264A3] text-white font-extrabold text-sm px-2.5 py-1 rounded-l-md">PnP</span>
 <span className="bg-[#E03A3E] text-white font-black text-sm px-2 py-1 rounded-r-md italic">asap!</span>
 </div>
 <span className="font-sans text-xs font-bold text-[#1264A3] dark:text-[#93c5fd]">Order via PnP</span>
 </button>
 </div>
 </div>

 <div className="glass p-6 rounded-3xl flex flex-col justify-between hover:shadow-[0_16px_40px_rgba(0,0,0,0.15)] group transition-all duration-300">
 <div>
 <div className="w-10 h-10 rounded-2xl bg-white/30 dark:bg-white/10 border border-white/20 dark:border-white/10 flex items-center justify-center mb-4 text-[#5b7993]">
 <Store className="w-5 h-5" />
 </div>
 <h4 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-[#f5f5f5] mb-1.5">Dine Out Nearby</h4>
 <p className="text-xs text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed mb-6">
 Craving this flavor profile right now without kitchen chore? Find local South African restaurants preparing this cuisine style.
 </p>
 </div>
 <button
 onClick={() => {
 if (onFindCorrespondingRestaurants) {
 onFindCorrespondingRestaurants(r);
 } else {
 triggerToast(`Looking for restaurants serving ${r.category} dishes...`);
 }
 }}
 className="w-full py-3 bg-transparent border border-black dark:border-[#444] hover:border-[#7C2D12] hover:text-[#7C2D12] dark:hover:text-[#fca5a5] text-black dark:text-[#f5f5f5] text-xs font-bold rounded-2xl transition-all cursor-pointer active:scale-95"
 >
 Find Nearby Restaurants
 </button>
 </div>
 </>
 </div>
 </div>
)}

 {/* Alternative action buttons */}
 <div className="pt-8 border-t border-black dark:border-[#444] flex items-center justify-start gap-4">
 <button
 onClick={onRegenerate}
 className="px-6 py-3.5 bg-transparent border border-[#7C2D12] text-[#7C2D12] dark:text-[#fca5a5] hover:bg-[#7C2D12] hover:text-white rounded-xl font-sans text-sm font-bold transition-all cursor-pointer"
 >
 {isRandomMode ?'Surprise me again' :'Find different recipes'}
 </button>
 {recipes.length > 1 && (
 <button
 onClick={() => onSelectRecipe(null)}
 className="px-6 py-3.5 bg-none border-none text-[#5b7993] hover:text-[#1A1A1A] dark:hover:text-[#f5f5f5] font-sans text-sm font-bold transition-all cursor-pointer"
 >
 See other matches ({recipes.length - 1} more)
 </button>
)}
 </div>
 </div>
 {toastMsg && (
 <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white py-3.5 px-5 rounded-2xl shadow-xl font-sans text-xs font-semibold flex items-center gap-3 border border-white/10 max-w-sm">
 <div className="w-2.5 h-2.5 rounded-full bg-[#7C2D12] animate-pulse flex-shrink-0" />
 <span>{toastMsg}</span>
 </div>
)}
 </div>
);
 }

 // Showcase grid if multiple matches are returned and none are explicitly active
 return (
 <div className="max-w-[1000px] mx-auto w-full px-2 sm:px-4 py-4 animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="flex flex-col gap-2 mb-8 sm:mb-12">
 <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#7C2D12] dark:text-[#fca5a5] font-bold">
 Here's what we found
 </span>
 <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] dark:text-[#f5f5f5]">
 {recipes.some((r) => r.id.startsWith('eat'))
 ? `We found ${recipes.length} local Cape Town eateries for you`
 : `We found ${recipes.length} recipes for you`}
 </h2>
 <p className="text-[#6E6A64] dark:text-[#a3a3a3] font-sans text-sm sm:text-base max-w-[600px] mt-2 leading-relaxed">
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
 onClick={() => onSelectRecipe(r)}
 className="glass rounded-2xl p-5 sm:p-6 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 cursor-pointer group flex flex-col h-full transition-all duration-200 ease-out relative"
 >
 {/* Save button */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onToggleSave(r);
 }}
 className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
 savedIds.includes(r.id)
 ?'bg-[#7C2D12] text-white'
 :'text-[#9E9A94] dark:text-[#666] hover:text-[#7C2D12] dark:hover:text-[#fca5a5] hover:bg-black/5 dark:hover:bg-white/5'
 }`}
 title={savedIds.includes(r.id) ?'Remove from saved' :'Save eatery'}
 >
 <Heart className={`w-4 h-4 ${savedIds.includes(r.id) ?'fill-current' :''}`} />
 </button>

 {/* Cuisine tag */}
 <span className="inline-flex self-start font-mono text-[9px] font-bold uppercase tracking-[1.5px] px-2.5 py-1 rounded-full bg-[#FAF2F0] dark:bg-[#7C2D12]/20 text-[#7C2D12] dark:text-[#fca5a5] mb-4 max-w-[70%] truncate">
 {rawEatery.cuisine}
 </span>

 {/* Name */}
 <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] group-hover:text-[#7C2D12] dark:group-hover:text-[#fca5a5] transition-colors leading-snug mb-4 pr-8">
 {rawEatery.name}
 </h3>

 {/* Rating · price · distance · open now */}
 <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-mono text-[#6E6A64] dark:text-[#a3a3a3]">
 <span className="flex items-center gap-1 text-[#1A1A1A] dark:text-[#f5f5f5] font-bold">
 <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rawEatery.rating}
 </span>
 <span className="opacity-30">·</span>
 <span className="font-bold text-[#1A1A1A] dark:text-[#f5f5f5]">{rawEatery.priceSymbol}</span>
 <span className="opacity-30">·</span>
 <span className="flex items-center gap-1 text-[#7C2D12] dark:text-[#fca5a5] font-bold">
 <MapPin className="w-3 h-3" /> {r.tags[1]}
 </span>
 {rawEatery.openNow !== undefined && (
 <>
 <span className="opacity-30">·</span>
 <span className={`font-bold ${rawEatery.openNow ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#9E9A94] dark:text-[#666]'}`}>
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
 onClick={() => onSelectRecipe(r)}
 className="glass rounded-3xl overflow-hidden hover:shadow-[0_20px_48px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_20px_48px_rgba(0,0,0,0.55)] hover:-translate-y-1 cursor-pointer group flex flex-col h-full transition-all duration-300 ease-out relative"
 >
 {/* Image banner */}
 <div className="w-full h-52 sm:h-60 bg-[#F2F1EE] dark:bg-[#222222] overflow-hidden relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
 <img
 src={r.image}
 alt={r.name}
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
 />
 {/* Premium gradient overlay for depth */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-60 mix-blend-multiply pointer-events-none transition-opacity duration-300 group-hover:opacity-40" />
 
 <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
 <span className="bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-md text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-full text-[#7C2D12] dark:text-[#fca5a5]">
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
 className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm border transition-all ${
 savedIds.includes(r.id)
 ?'bg-[#7C2D12] text-white border-[#7C2D12] hover:bg-[#5E220E]'
 :'bg-white/80 dark:bg-black/50 backdrop-blur-md text-[#7C2D12] dark:text-[#fca5a5] border-white/40 dark:border-white/20 hover:scale-110'
 }`}
 title={savedIds.includes(r.id) ?'Remove Recipe' :'Save Recipe'}
 >
 <Heart className={`w-4 h-4 ${savedIds.includes(r.id) ?'fill-current' :''}`} />
 </button>
 </div>
 </div>

 {/* Core copy */}
 <div className="p-6 flex flex-col flex-1 gap-2.5">
 <span className="font-mono text-[10px] text-[#6E6A64] dark:text-[#a3a3a3] uppercase tracking-wider block">
 {r.area} Cuisine
 </span>
 <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] group-hover:text-[#7C2D12] dark:group-hover:text-[#fca5a5] transition-colors leading-snug line-clamp-2">
 {r.name}
 </h3>
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] line-clamp-3 leading-relaxed mt-1 mb-3">
 {r.instructions ||'An exquisite composition using matching fresh ingredients.'}
 </p>
 
 <div className="mt-auto pt-4 border-t border-[#f3f1ed] flex items-center justify-between text-[#6E6A64] dark:text-[#a3a3a3]">
 <span className="flex items-center gap-1 text-[11px] font-mono">
 <Clock className="w-3.5 h-3.5 text-[#7C2D12] dark:text-[#fca5a5]" /> {r.prepTime}
 </span>
 <span className="flex items-center gap-1 text-[11px] font-mono">
 <Flame className="w-3.5 h-3.5 text-amber-600" /> {r.cookTime}
 </span>
 </div>
 </div>
 </div>
);
 })}
 </div>

 <div className="mt-12 text-center pt-8 border-t border-black dark:border-[#444]">
 <p className="text-xs text-[#6E6A64] dark:text-[#a3a3a3] font-sans mb-4">
 Not quite right?
 </p>
 <button
 onClick={onRegenerate}
 className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white hover:bg-[#7C2D12] rounded-xl font-sans text-xs font-bold transition-all cursor-pointer"
 >
 <Compass className="w-4 h-4" /> Try something different
 </button>
 </div>
 {toastMsg && (
 <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white py-3.5 px-5 rounded-2xl shadow-xl font-sans text-xs font-semibold flex items-center gap-3 border border-white/10 max-w-sm">
 <div className="w-2.5 h-2.5 rounded-full bg-[#7C2D12] animate-pulse flex-shrink-0" />
 <span>{toastMsg}</span>
 </div>
)}
 </div>
);
};
