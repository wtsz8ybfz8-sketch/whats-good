import React from'react';
import { Dimensions, LocationMode } from'../types';
import { 
 Search, Moon, Heart, Compass, Sparkles, Leaf, 
 Clock, Flame, Sun, Crown, Globe, Utensils, Dices, ChevronRight,
 MapPin, Store, ChefHat, Map
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

 const eatPriceFilters = [
 { label:'Any Price', value: null },
 { label:'R (Budget)', value:'R' },
 { label:'RR (Moderate)', value:'RR' },
 { label:'RRR (Fine)', value:'RRR' },
 { label:'RRRR (Luxury)', value:'RRRR' },
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

 const handleSelectEffort = (val: string) => {
 onChange({
 ...dimensions,
 capacity: dimensions.capacity === val ? null : val, // toggle
 });
 };

 const handleLocationModeSwitch = (mode: LocationMode) => {
 onChange({
 ...dimensions,
 locationMode: mode,
 // Reset incompatible fields if switching to keep flow organic
 capacity: mode ==='gourmet' ? dimensions.capacity ||'medium effort, around 30 minutes' : null,
 regional: mode ==='dineout' ? null : dimensions.regional,
 });
 };

 const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 onChange({
 ...dimensions,
 searchQuery: e.target.value,
 });
 };

 const isFormValid =
 dimensions.locationMode !=='gourmet' || 
 dimensions.searchQuery.trim().length > 0 ||
 (dimensions.vibe && dimensions.regional && dimensions.capacity);

 return (
 <aside className="bg-transparent p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-visible">
 <div>
 <h1 className="font-serif text-3xl lg:text-[38px] font-extrabold leading-[1.12] text-[#1A1A1A] dark:text-[#f5f5f5] tracking-tight">
 What are you<br />
 <span className="italic font-normal text-[#7C2D12] dark:text-[#fca5a5]">feeling today?</span>
 </h1>
 </div>

 {/* CURATION CONTEXT SEGMENTED CONTROL (Apple HIG & Brutalist Mix) */}
 <div className="flex flex-col gap-2.5">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium block">
 Curation Context
 </span>
 <div className="grid grid-cols-2 bg-black dark:bg-[#222222] p-1 rounded-2xl select-none">
 <button
 onClick={() => handleLocationModeSwitch('dineout')}
 className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all cursor-pointer text-center ${
 dimensions.locationMode ==='dineout'
 ?'bg-white dark:bg-[#1a1a1a] shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-[#7C2D12] dark:text-[#fca5a5]'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 <MapPin className={`w-4 h-4 mb-1 ${dimensions.locationMode ==='dineout' ?'text-[#7C2D12] dark:text-[#fca5a5]' :'text-[#6E6A64] dark:text-[#a3a3a3]'}`} />
 <span className="text-[10px] font-sans font-bold leading-tight">Dine Out</span>
 </button>
 <button
 onClick={() => handleLocationModeSwitch('gourmet')}
 className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all cursor-pointer text-center ${
 dimensions.locationMode ==='gourmet'
 ?'bg-white dark:bg-[#1a1a1a] shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-[#7C2D12] dark:text-[#fca5a5]'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 <ChefHat className={`w-4 h-4 mb-1 ${dimensions.locationMode ==='gourmet' ?'text-[#7C2D12] dark:text-[#fca5a5]' :'text-[#6E6A64] dark:text-[#a3a3a3]'}`} />
 <span className="text-[10px] font-sans font-bold leading-tight">Home Gourmet</span>
 </button>
 </div>
 </div>

 {/* Direct Search Option */}
 <div className="flex flex-col gap-2">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] flex items-center gap-2">
 Search by dish or ingredient
 </span>
 <div className="relative">
 <input
 type="text"
 value={dimensions.searchQuery}
 onChange={handleTextChange}
 placeholder={
 dimensions.locationMode ==='gourmet'
 ?"Search by dish or ingredient (ie: curry, beef)..."
 :"Search South African dishes or eateries..."
 }
 className="w-full bg-white dark:bg-[#1a1a1a] border border-[#e6e4e0] dark:border-white/10 rounded-2xl py-3 pl-10 pr-12 font-sans text-sm text-[#1A1A1A] dark:text-[#f5f5f5] focus:outline-none focus:border-[#7C2D12] focus:ring-1 focus:ring-[#7C2D12] placeholder:text-[#a2a8a8] transition-all shadow-sm"
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
 <span>OR TELL US YOUR MOOD</span>
 <span className="h-[1px] flex-1 bg-black dark:bg-[#222222]" />
 </div>

 {/* Your Current Vibe */}
 <div className="flex flex-col gap-3">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
 How are you feeling?
 </span>
 <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 -mx-1 px-1 no-scrollbar">
 {vibes.map((v) => {
 const isSelected = dimensions.vibe === v.value;
 return (
 <button
 key={v.value}
 onClick={() => handleSelectVibe(v.value)}
 className={`flex-none px-3.5 py-2.5 rounded-full font-sans text-xs font-semibold border transition-all duration-200 ease-out cursor-pointer flex items-center gap-2 shadow-sm whitespace-nowrap ${
 isSelected
 ?'bg-[#1A1A1A] dark:bg-[#2a2a2a] border-[#1A1A1A] text-white'
 :'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20'
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
 Eatery Price Budget
 </span>
 <div className="grid grid-cols-5 bg-black dark:bg-[#222222] p-1 rounded-2xl">
 {eatPriceFilters.map((p, idx) => {
 const isSelected = dimensions.capacity === p.value;
 return (
 <button
 key={idx}
 onClick={() => onChange({ ...dimensions, capacity: p.value })}
 className={`py-2 px-0.5 rounded-xl transition-all cursor-pointer text-center text-[10px] font-bold font-sans ${
 isSelected
 ?'bg-white dark:bg-[#1a1a1a] shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[#7C2D12] dark:text-[#fca5a5]'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 {p.value ||'All'}
 </button>
);
 })}
 </div>
 </div>

 {/* Cuisine Coordinates for South African Eateries */}
 <div className="flex flex-col gap-3">
 <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] font-medium">
 What are you craving?
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
 :'bg-white dark:bg-[#1a1a1a] border-black dark:border-[#444] text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:bg-[#FAF2F0] dark:bg-[#7C2D12]/20'
 }`}
 >
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ?'bg-white dark:bg-[#1a1a1a]' :'bg-[#FAF2F0] dark:bg-[#7C2D12]/20'}`}>
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
 What are you craving?
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
 :'bg-white dark:bg-[#1a1a1a] border-black dark:border-[#444] text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:bg-[#FAF2F0] dark:bg-[#7C2D12]/20'
 }`}
 >
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ?'bg-white dark:bg-[#1a1a1a]' :'bg-[#FAF2F0] dark:bg-[#7C2D12]/20'}`}>
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
 <div className="grid grid-cols-3 bg-black dark:bg-[#222222] p-1 rounded-2xl">
 {effortLevels.map((e) => {
 const isSelected = dimensions.capacity === e.value;
 return (
 <button
 key={e.value}
 onClick={() => handleSelectEffort(e.value)}
 className={`flex flex-col py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
 isSelected
 ?'bg-white dark:bg-[#1a1a1a] shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[#7C2D12] dark:text-[#fca5a5]'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 <span className="text-xs font-bold font-sans leading-tight block">
 {e.label}
 </span>
 <span className="text-[9px] font-mono text-[#6E6A64] dark:text-[#a3a3a3] leading-tight block mt-0.5 font-bold">
 {e.time}
 </span>
 </button>
);
 })}
 </div>
 </div>
 </>
)}

 {/* Action button intentionally removed — rendered as fixed bottom CTA in App.tsx */}
 </aside>
);
};
