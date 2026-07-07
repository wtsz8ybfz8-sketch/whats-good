import React from'react';
import { Dimensions, LocationMode } from'../types';
import { 
 Search, Moon, Heart, Compass, Sparkles, Leaf, 
 Clock, Flame, Sun, Crown, Globe, Utensils, Dices,
 MapPin, ChefHat
} from'lucide-react';

interface SidebarProps {
 dimensions: Dimensions;
 onChange: (dims: Dimensions) => void;
 onTriggerMatch: () => void;
 isLoading: boolean;
}

const VibeIcon = ({ name, className ="w-3.5 h-3.5" }: { name: string; className?: string }) => {
 switch (name) {
 case'Moon': return <Moon className={className} />;
 case'Heart': return <Heart className={className} />;
 case'Compass': return <Compass className={className} />;
 case'Sparkles': return <Sparkles className={className} />;
 case'Leaf': return <Leaf className={className} />;
 case'Clock': return <Clock className={className} />;
 case'Flame': return <Flame className={className} />;
 case'Sun': return <Sun className={className} />;
 case'Crown': return <Crown className={className} />;
 default: return <Sparkles className={className} />;
 }
};

const CuisineIcon = ({ name, className ="w-4 h-4" }: { name: string; className?: string }) => {
 switch (name) {
 case'Globe': return <Globe className={className} />;
 case'Dices': return <Dices className={className} />;
 default: return <Utensils className={className} />;
 }
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
 <div className="bg-black/80 dark:bg-black/60 backdrop-blur-xl px-5 pt-4 pb-2 rounded-2xl select-none">
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
 i === idx ?'text-white' :'text-[#b3aea8] hover:text-white'
 }`}
 >
 <span className={`text-[10px] font-bold font-sans leading-tight transition-transform duration-200 ${i === idx ?'scale-110' :''}`}>
 {s.label}
 </span>
 {s.sub && (
 <span className={`text-[8px] font-mono leading-tight ${i === idx ?'text-[#f6a892]' :'opacity-60'}`}>
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
 { label:'Italian', iconName:'Utensils', value:'Italian' },
 { label:'Middle Eastern', iconName:'Utensils', value:'Middle Eastern' },
 { label:'Pan-Asian', iconName:'Utensils', value:'Pan-Asian' },
 { label:'S. African', iconName:'Globe', value:'South African' },
 { label:'Latin American', iconName:'Utensils', value:'Latin American' },
 { label:'Surprise Me', iconName:'Dices', value:'surprise me' },
 ];

 const dineoutCuisines = [
 { label:'Seafood', iconName:'Utensils', value:'Seafood' },
 { label:'Flame Grill / Spicy', iconName:'Flame', value:'Grill' },
 { label:'Fine Brasserie', iconName:'Crown', value:'Brasserie' },
 { label:'Premium Tapas', iconName:'Sparkles', value:'Tapas' },
 { label:'Comfort Café', iconName:'Moon', value:'Comfort' },
 { label:'Artisan Burgers', iconName:'Utensils', value:'Burger' },
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
 <h1 className="font-serif text-3xl lg:text-[38px] font-extrabold leading-[1.12] text-[#1A1A1A] dark:text-[#f5f5f5] tracking-tight">
 Where are we<br />
 <span className="italic font-normal text-[#7C2D12] dark:text-[#fca5a5]">eating?</span>
 </h1>
 </div>

 {/* CURATION CONTEXT SEGMENTED CONTROL (Apple HIG & Brutalist Mix) */}
 <div className="flex flex-col gap-2.5">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium block">
 Plan
 </span>
 <div className="grid grid-cols-2 bg-black/80 dark:bg-black/60 backdrop-blur-xl p-1 rounded-2xl select-none">
 <button
 onClick={() => handleLocationModeSwitch('dineout')}
 className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all cursor-pointer text-center ${
 dimensions.locationMode ==='dineout'
 ?'glass shadow-sm text-[#7C2D12] dark:text-[#fca5a5]'
 :'text-[#b3aea8] hover:text-white'
 }`}
 >
 <MapPin className={`w-4 h-4 mb-1 ${dimensions.locationMode ==='dineout' ?'text-[#7C2D12] dark:text-[#fca5a5]' :'text-[#6E6A64] dark:text-[#a3a3a3]'}`} />
 <span className="text-[10px] font-sans font-bold leading-tight">Find a Place</span>
 </button>
 <button
 onClick={() => handleLocationModeSwitch('gourmet')}
 className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all cursor-pointer text-center ${
 dimensions.locationMode ==='gourmet'
 ?'glass shadow-sm text-[#7C2D12] dark:text-[#fca5a5]'
 :'text-[#b3aea8] hover:text-white'
 }`}
 >
 <ChefHat className={`w-4 h-4 mb-1 ${dimensions.locationMode ==='gourmet' ?'text-[#7C2D12] dark:text-[#fca5a5]' :'text-[#6E6A64] dark:text-[#a3a3a3]'}`} />
 <span className="text-[10px] font-sans font-bold leading-tight">Stay In</span>
 </button>
 </div>
 </div>

 {/* Direct Search Option */}
 <div className="flex flex-col gap-2">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] flex items-center gap-2">
 {dimensions.locationMode ==='gourmet' ?'Search by dish or ingredient' :'Search restaurants, areas, or cravings'}
 </span>
 <div className="relative">
 <input
 type="text"
 value={dimensions.searchQuery}
 onChange={handleTextChange}
 placeholder={
 dimensions.locationMode ==='gourmet'
 ?"Search by dish or ingredient, like curry or beef"
 :"Italian, brunch, cocktails, steak, Sea Point..."
 }
 className="w-full bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl py-3 pl-10 pr-12 font-sans text-sm text-[#1A1A1A] dark:text-[#f5f5f5] focus:outline-none focus:border-[#7C2D12] focus:ring-1 focus:ring-[#7C2D12] placeholder:text-[#a2a8a8] transition-all"
 />
 <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#6E6A64] dark:text-[#a3a3a3]" />
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
 <div className="flex items-center gap-4 py-2 font-mono text-[9px] uppercase tracking-[2px] text-[#6E6A64] dark:text-[#a3a3a3] select-none">
 <span className="h-[1px] flex-1 bg-black dark:bg-[#222222]" />
 <span>{dimensions.locationMode ==='gourmet' ?'OR TELL US YOUR MOOD' :'OR SET THE NIGHT'}</span>
 <span className="h-[1px] flex-1 bg-black dark:bg-[#222222]" />
 </div>

 {/* Your Current Vibe */}
 <div className="flex flex-col gap-3">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
 Mood
 </span>
 <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 -mx-1 px-1 no-scrollbar">
 {vibes.map((v) => {
 const isSelected = dimensions.vibe === v.value;
 return (
 <button
 key={v.value}
 onClick={() => handleSelectVibe(v.value)}
 className={`flex-none px-3.5 py-3 rounded-full font-sans text-xs font-semibold border transition-all duration-200 ease-out cursor-pointer flex items-center gap-2 shadow-sm whitespace-nowrap ${
 isSelected
 ?'bg-[#1A1A1A] dark:bg-[#2a2a2a] border-[#1A1A1A] text-white'
 :'bg-white/60 dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:bg-white/80 dark:hover:bg-[#7C2D12]/20'
 }`}
 >
 <VibeIcon name={v.iconName} className={`w-3.5 h-3.5 ${isSelected ?'text-white' :'text-[#7C2D12] dark:text-[#fca5a5]'}`} />
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
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
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
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
 Cuisine
 </span>
 <div className="grid grid-cols-2 gap-2">
 {dineoutCuisines.map((c) => {
 const isSelected = dimensions.regional === c.value;
 return (
 <button
 key={c.value}
 onClick={() => handleSelectCuisine(c.value)}
 className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left shadow-sm ${
 isSelected
 ?'bg-[#1A1A1A] dark:bg-[#2a2a2a] border-[#1A1A1A] text-white'
 :'glass-subtle border-white/20 dark:border-white/10 text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] dark:hover:border-[#7C2D12]/50'
 }`}
 >
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ?'bg-white/20' :'bg-white/30 dark:bg-[#7C2D12]/20'}`}>
 <CuisineIcon name={c.iconName} className={isSelected ?'text-white' :'text-[#7C2D12] dark:text-[#fca5a5]'} />
 </div>
 <span className="text-xs font-bold font-sans">{c.label}</span>
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
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
 Cuisine
 </span>
 <div className="grid grid-cols-2 gap-2">
 {gourmetCuisines.map((c) => {
 const isSelected = dimensions.regional === c.value;
 return (
 <button
 key={c.value}
 onClick={() => handleSelectCuisine(c.value)}
 className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left shadow-sm ${
 isSelected
 ?'bg-[#1A1A1A] dark:bg-[#2a2a2a] border-[#1A1A1A] text-white'
 :'glass-subtle border-white/20 dark:border-white/10 text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] dark:hover:border-[#7C2D12]/50'
 }`}
 >
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ?'bg-white/20' :'bg-white/30 dark:bg-[#7C2D12]/20'}`}>
 <CuisineIcon name={c.iconName} className={isSelected ?'text-white' :'text-[#7C2D12] dark:text-[#fca5a5]'} />
 </div>
 <span className="text-xs font-bold font-sans">{c.label}</span>
 </button>
);
 })}
 </div>
 </div>

 {/* Kitchen Energy Configuration */}
 <div className="flex flex-col gap-3">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
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
