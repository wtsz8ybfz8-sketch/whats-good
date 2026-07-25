import React from'react';
import { Dimensions, LocationMode } from'../types';
import {
 Search, Moon, Heart, Compass, Sparkles, Leaf,
 Clock, Flame, Sun, Crown, Globe, Utensils, Dices,
 MapPin, ChefHat, Fish, Wine, UtensilsCrossed, Coffee,
 Sandwich, Soup, Pizza, Martini, CookingPot
} from'lucide-react';
import type { LucideIcon } from'lucide-react';

interface SidebarProps {
 dimensions: Dimensions;
 onChange: (dims: Dimensions) => void;
 onTriggerMatch: () => void;
 isLoading: boolean;
}

const VIBE_ICONS: Record<string, LucideIcon> = {
 Moon, Heart, Compass, Sparkles, Leaf, Clock, Flame, Sun, Crown,
};
const VibeIcon = ({ name, className = 'w-3.5 h-3.5', strokeWidth = 2 }: { name: string; className?: string; strokeWidth?: number }) => {
 const Icon = VIBE_ICONS[name] ?? Sparkles;
 return <Icon className={className} strokeWidth={strokeWidth} />;
};

const CUISINE_ICONS: Record<string, LucideIcon> = {
 Globe, Dices, Fish, Flame, Wine, UtensilsCrossed, Coffee, Sandwich, Soup, Pizza, Martini, CookingPot,
};
const CuisineIcon = ({ name, className = 'w-4 h-4', strokeWidth = 2 }: { name: string; className?: string; strokeWidth?: number }) => {
 const Icon = CUISINE_ICONS[name] ?? Utensils;
 return <Icon className={className} strokeWidth={strokeWidth} />;
};

interface SliderStop {
 label: string;
 sub?: string;
 value: string | null;
}

/**
 * Draggable snap-to-stop slider inside the dark glass bar — replaces the
 * discrete button grids for continuous-feeling ranges (budget, effort).
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
 <div className="bg-black/[0.06] dark:bg-black/60 backdrop-blur-xl px-5 pt-4 pb-2 rounded-2xl select-none border border-black/5 dark:border-white/5">
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
 ?'text-[#1A1A1A] dark:text-white'
 :'text-[#8B857E] dark:text-[#b3aea8] hover:text-[#1A1A1A] dark:hover:text-white'
 }`}
 >
 <span className={`text-[10px] font-bold font-sans leading-tight transition-transform duration-200 ${i === idx ?'scale-110' :''}`}>
 {s.label}
 </span>
 {s.sub && (
 <span className={`text-[10px] font-mono leading-tight ${i === idx ?'text-[#7C2D12] dark:text-[#f6a892]' :'opacity-60'}`}>
 {s.sub}
 </span>
)}
 </button>
))}
 </div>
 </div>
);
};

export const Sidebar: React.FC<SidebarProps> = ({
 dimensions,
 onChange,
 onTriggerMatch,
 isLoading,
}) => {
 const vibes = [
 { label:'Cozying Up', iconName:'Moon', value:'tired & cosy' },
 { label:'Need Comfort', iconName:'Heart', value:'need comfort food' },
 { label:'Adventurous Vibe', iconName:'Compass', value:'feeling adventurous' },
 { label:'Treating Myself', iconName:'Sparkles', value:'treating myself' },
 { label:'Fresh & Light', iconName:'Leaf', value:'something fresh & light' },
 { label:'Quick Bite', iconName:'Clock', value:'stressed, need quick and easy' },
 { label:'Bold & Spicy', iconName:'Flame', value:'craving something bold & spicy' },
 { label:'Lazy Sunday', iconName:'Sun', value:'lazy Sunday energy' },
 { label:'Feeling Fancy', iconName:'Crown', value:'feeling fancy' },
 ];

 const gourmetCuisines = [
 { label:'Italian', iconName:'Pizza', value:'Italian' },
 { label:'Middle Eastern', iconName:'UtensilsCrossed', value:'Middle Eastern' },
 { label:'Pan-Asian', iconName:'Soup', value:'Pan-Asian' },
 { label:'S. African', iconName:'Globe', value:'South African' },
 { label:'Latin American', iconName:'Flame', value:'Latin American' },
 { label:'Surprise Me', iconName:'Dices', value:'surprise me' },
 ];

 const dineoutCuisines = [
 { label:'Seafood', iconName:'Fish', value:'Seafood' },
 { label:'Flame Grill', iconName:'Flame', value:'Grill' },
 { label:'Fine Dining', iconName:'Wine', value:'Fine dining' },
 { label:'Tapas & Small Plates', iconName:'UtensilsCrossed', value:'Tapas' },
 { label:'Café & Brunch', iconName:'Coffee', value:'Brunch' },
 { label:'Burgers', iconName:'Sandwich', value:'Burger' },
 { label:'Sushi & Pan-Asian', iconName:'Soup', value:'Sushi' },
 { label:'Italian', iconName:'Pizza', value:'Italian' },
 { label:'Curry & Spice', iconName:'CookingPot', value:'Curry' },
 { label:'Cocktails & Bites', iconName:'Martini', value:'Cocktail bar' },
 ];

 const effortLevels = [
 { label:'Low Effort', time:'~15m', value:'low effort, under 20 minutes' },
 { label:'Med Effort', time:'~30m', value:'medium effort, around 30 minutes' },
 { label:'High Effort', time:'45m+', value:'high effort, I want to properly cook today' },
 ];

 const handleSelectVibe = (val: string) => {
 onChange({
 ...dimensions,
 vibe: dimensions.vibe === val ? null : val, // toggle
 });
 };

 const handleSelectCuisine = (val: string) => {
 onChange({
 ...dimensions,
 regional: dimensions.regional === val ? null : val, // toggle
 });
 };

 const handleLocationModeSwitch = (mode: LocationMode) => {
 onChange({
 ...dimensions,
 locationMode: mode,
 // Reset incompatible fields if switching to keep flow organic.
 // capacity holds price tiers in dineout and effort levels in gourmet —
 // never let one leak into the other.
 capacity:
 mode ==='gourmet'
 ? (dimensions.capacity?.includes('effort') ? dimensions.capacity :'medium effort, around 30 minutes')
 : null,
 regional: mode ==='dineout' ? null : dimensions.regional,
 });
 };

 const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 onChange({
 ...dimensions,
 searchQuery: e.target.value,
 });
 };

 return (
 <aside className="bg-transparent p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-visible">
 <div>
 <h1 className="font-serif text-3xl lg:text-[38px] font-semibold leading-[1.12] text-[#1A1A1A] dark:text-[#f5f5f5] tracking-tight">
 Where are we<br />
 <span className="italic font-normal text-[#7C2D12] dark:text-[#fca5a5]">eating?</span>
 </h1>
 <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] max-w-[420px]">
 Real spots near you — matched to your mood and budget, sorted by what's <span className="text-[var(--charcoal)] font-medium">open right now</span>. Or grab a recipe for a night in.
 </p>
 </div>

 {/* CURATION CONTEXT SEGMENTED CONTROL (Apple HIG & Brutalist Mix) */}
 <div className="flex flex-col gap-2.5">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)] block">
 Plan
 </span>
 <div className="grid grid-cols-2 bg-black/[0.06] dark:bg-black/60 backdrop-blur-xl p-1 rounded-2xl select-none border border-black/5 dark:border-white/5">
 <button
 onClick={() => handleLocationModeSwitch('dineout')}
 className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all cursor-pointer text-center ${
 dimensions.locationMode ==='dineout'
 ?'bg-white dark:bg-white/10 shadow-sm text-[#7C2D12] dark:text-[#fca5a5] border border-black/5 dark:border-white/10'
 :'text-[var(--text-muted)] dark:text-[#b3aea8] hover:text-[#1A1A1A] dark:hover:text-white'
 }`}
 >
 <MapPin className="w-4 h-4 mb-1" />
 <span className="text-[10px] font-sans font-bold leading-tight">Find a Place</span>
 </button>
 <button
 onClick={() => handleLocationModeSwitch('gourmet')}
 className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all cursor-pointer text-center ${
 dimensions.locationMode ==='gourmet'
 ?'bg-white dark:bg-white/10 shadow-sm text-[#7C2D12] dark:text-[#fca5a5] border border-black/5 dark:border-white/10'
 :'text-[var(--text-muted)] dark:text-[#b3aea8] hover:text-[#1A1A1A] dark:hover:text-white'
 }`}
 >
 <ChefHat className="w-4 h-4 mb-1" />
 <span className="text-[10px] font-sans font-bold leading-tight">Stay In</span>
 </button>
 </div>
 </div>

 {/* Direct Search Option */}
 <div className="flex flex-col gap-2">
 <span className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-2">
 {dimensions.locationMode ==='gourmet' ?'Search by dish or ingredient' :'Search restaurants, areas, or cravings'}
 </span>
 <div className="relative">
 <input
 type="text"
 value={dimensions.searchQuery}
 onChange={handleTextChange}
 aria-label={dimensions.locationMode ==='gourmet' ?'Search by dish or ingredient' :'Search restaurants, areas, or cravings'}
 placeholder={
 dimensions.locationMode ==='gourmet'
 ?"Search by dish or ingredient, like curry or beef"
 :"Italian, brunch, cocktails, steak, Sea Point..."
 }
 className="w-full bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl py-3 pl-10 pr-12 font-sans text-sm text-[#1A1A1A] dark:text-[#f5f5f5] focus:outline-none focus:border-[var(--accent-terracotta)] focus:ring-1 focus:ring-[var(--accent-terracotta)] placeholder:text-[var(--text-subtle)] transition-all"
 />
 <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
 {dimensions.searchQuery && (
 <button
 onClick={() => onChange({ ...dimensions, searchQuery:'' })}
 className="absolute right-3.5 top-3.5 text-xs text-[#7C2D12] dark:text-[#fca5a5] font-bold hover:text-[#5E220E] transition-colors cursor-pointer"
 >
 Clear
 </button>
)}
 </div>
 </div>

 {/* Or Coordinates Section */}
 <div className="flex items-center gap-4 py-2 text-[12px] font-medium text-[var(--text-muted)] select-none">
 <span className="h-px flex-1 bg-[var(--rule)]" />
 <span>Or pick a mood</span>
 <span className="h-px flex-1 bg-[var(--rule)]" />
 </div>

{/* Diet — ONE row, single-select, no icons. Four options covers the real
 need (the meat/no-meat split plus the two common restrictions) without
 turning the first screen into a form. Tapping the active chip clears it. */}
 <div className="flex flex-col gap-3 mb-6">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 Diet <span className="font-normal text-[var(--text-muted)]">— optional</span>
 </span>
 <div className="flex flex-wrap gap-2">
 {['Vegan','Vegetarian','Halaal','Seafood'].map((d) => {
 const on = dimensions.diet === d;
 return (
 <button
 key={d}
 type="button"
 aria-pressed={on}
 onClick={() => onChange({ ...dimensions, diet: dimensions.diet === d ? null : d })}
 className={`press px-4 py-2.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
 on
 ? 'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
 : 'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)]'
 }`}
 >
 {d}
 </button>
 );
 })}
 </div>
 </div>

 {/* Your Current Vibe */}
 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 Mood
 </span>
 <div className="flex flex-wrap gap-2">
 {vibes.map((v) => {
 const isSelected = dimensions.vibe === v.value;
 return (
 <button
 key={v.value}
 onClick={() => handleSelectVibe(v.value)}
 className={`flex-none px-4 py-2.5 rounded-full font-sans text-[13px] font-medium border transition-all duration-200 ease-out cursor-pointer flex items-center gap-2 whitespace-nowrap ${
 isSelected
 ?'bg-[var(--accent-terracotta)] border-[var(--accent-terracotta)] text-[var(--accent-contrast)]'
 :'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 <VibeIcon name={v.iconName} className={`w-4 h-4 ${isSelected ?'text-[var(--accent-contrast)]' :'text-[var(--accent-terracotta)]'}`} strokeWidth={1.75} />
 <span>{v.label}</span>
 </button>
);
 })}
 </div>
 </div>

 {/* Conditional Sidebar sections depending on Curation Mode */}
 {dimensions.locationMode ==='dineout' && (
 <>
 {/* Price Curation Filter for South African Rand Tiers */}
 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 Budget
 </span>
 <GlassSlider
 ariaLabel="Budget"
 stops={[
 { label:'Any', value: null },
 { label:'R', sub:'Budget', value:'R' },
 { label:'RR', sub:'Moderate', value:'RR' },
 { label:'RRR', sub:'Fine', value:'RRR' },
 { label:'RRRR', sub:'Luxury', value:'RRRR' },
 ]}
 selectedValue={dimensions.capacity}
 onSelect={(value) => onChange({ ...dimensions, capacity: value })}
 />
 </div>

 {/* Cuisine Coordinates for South African Eateries */}
 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 Cuisine
 </span>
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
 {dineoutCuisines.map((c) => {
 const isSelected = dimensions.regional === c.value;
 return (
 <button
 key={c.value}
 onClick={() => handleSelectCuisine(c.value)}
 className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
 isSelected
 ?'bg-[var(--accent-terracotta)] border-[var(--accent-terracotta)] text-[var(--accent-contrast)]'
 :'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 <CuisineIcon name={c.iconName} className={`w-[18px] h-[18px] flex-shrink-0 ${isSelected ?'text-[var(--accent-contrast)]' :'text-[var(--accent-terracotta)]'}`} strokeWidth={1.75} />
 <span className="text-[13px] font-semibold font-sans">{c.label}</span>
 </button>
);
 })}
 </div>
 </div>
 </>
)}

 {dimensions.locationMode ==='gourmet' && (
 <>
 {/* Cuisine Coordinates */}
 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 Cuisine
 </span>
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
 {gourmetCuisines.map((c) => {
 const isSelected = dimensions.regional === c.value;
 return (
 <button
 key={c.value}
 onClick={() => handleSelectCuisine(c.value)}
 className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
 isSelected
 ?'bg-[var(--accent-terracotta)] border-[var(--accent-terracotta)] text-[var(--accent-contrast)]'
 :'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 <CuisineIcon name={c.iconName} className={`w-[18px] h-[18px] flex-shrink-0 ${isSelected ?'text-[var(--accent-contrast)]' :'text-[var(--accent-terracotta)]'}`} strokeWidth={1.75} />
 <span className="text-[13px] font-semibold font-sans">{c.label}</span>
 </button>
);
 })}
 </div>
 </div>

 {/* Kitchen Energy Configuration */}
 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 How much time do you have?
 </span>
 <GlassSlider
 ariaLabel="Cooking effort"
 stops={effortLevels.map((e) => ({ label: e.label.replace(' Effort',''), sub: e.time, value: e.value }))}
 selectedValue={dimensions.capacity}
 onSelect={(value) => onChange({ ...dimensions, capacity: value ?? effortLevels[0].value })}
 />
 </div>
 </>
)}

 {/* Action button intentionally removed — rendered as fixed bottom CTA in App.tsx */}
 </aside>
);
};
