import React from'react';
import { Dimensions } from'../types';
import { Search } from'lucide-react';

interface SidebarProps {
 dimensions: Dimensions;
 onChange: (dims: Dimensions) => void;
 onTriggerMatch: () => void;
 isLoading: boolean;
}

/**
 * ONE chip. Every filter on this screen — mood, cuisine, diet — is the same control,
 * because they are the same kind of decision: pick one, or none.
 *
 * No icons. The previous version put a lucide glyph in every mood and cuisine chip and
 * it was the single cheapest-looking thing in the app, for three reasons:
 *  1. The icons were redundant — a pill that says "Italian" next to a pizza slice, or
 *     "Burgers" next to a sandwich, tells you nothing the word didn't. Redundant icons
 *     are decoration, and decoration at 16px reads as clip-art.
 *  2. They were dishonest — the set had no 1:1 mapping, so `Flame` did duty for "Bold &
 *     Spicy", "Flame Grill" AND "Latin American", `Soup` meant "Pan-Asian", `Globe` meant
 *     "South African", `Dices` meant "Surprise Me". The user has to decode, not scan.
 *  3. They broke the rhythm — nine chips of differing widths each with a glyph makes a
 *     ragged, busy block. Text-only chips wrap into clean lines you read in one pass.
 * Hierarchy here comes from weight, size and the accent fill on the selected state.
 */
const Chip: React.FC<{
 label: string;
 selected: boolean;
 onClick: () => void;
}> = ({ label, selected, onClick }) => (
 <button
 type="button"
 aria-pressed={selected}
 onClick={onClick}
 className={`press px-4 py-2.5 rounded-full text-[13px] font-medium border transition-colors duration-150 cursor-pointer whitespace-nowrap ${
 selected
 ? 'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
 : 'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
 }`}
 >
 {label}
 </button>
);

/** Section header — same treatment everywhere so the eye learns the rhythm once. */
const FilterGroup: React.FC<{
 title: string;
 optional?: boolean;
 children: React.ReactNode;
}> = ({ title, optional, children }) => (
 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">
 {title}
 {optional && <span className="font-normal text-[var(--text-muted)]"> — optional</span>}
 </span>
 <div className="flex flex-wrap gap-2">{children}</div>
 </div>
);

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
 <span className={`text-[11px] font-semibold leading-tight ${i === idx ?'scale-105' :''}`}>
 {s.label}
 </span>
 {s.sub && (
 <span className={`text-[10px] leading-tight ${i === idx ?'text-[var(--accent-terracotta)]' :'opacity-60'}`}>
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
export const Sidebar: React.FC<SidebarProps> = ({ dimensions, onChange }) => {
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

 const cuisines = [
 { label:'Seafood', value:'Seafood' },
 { label:'Grill', value:'Grill' },
 { label:'Fine dining', value:'Fine dining' },
 { label:'Tapas', value:'Tapas' },
 { label:'Brunch', value:'Brunch' },
 { label:'Burgers', value:'Burger' },
 { label:'Sushi', value:'Sushi' },
 { label:'Italian', value:'Italian' },
 { label:'Curry', value:'Curry' },
 { label:'Cocktails', value:'Cocktail bar' },
 ];

 // Every chip toggles: tapping the active one clears it. No "Any" option needed.
 const toggle = (key: 'vibe' | 'regional' | 'diet', val: string) =>
 onChange({ ...dimensions, [key]: dimensions[key] === val ? null : val });

 const activeCount = [dimensions.vibe, dimensions.regional, dimensions.diet, dimensions.capacity].filter(Boolean).length;

 return (
 <aside className="bg-transparent p-4 lg:p-8 flex flex-col gap-7 overflow-y-visible">
 <div>
 <h1 className="font-serif text-3xl lg:text-[38px] font-semibold leading-[1.12] text-[var(--heading-color)] tracking-tight">
 Where are we<br />
 <span className="italic font-normal text-[var(--accent-terracotta)]">eating?</span>
 </h1>
 <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] max-w-[420px]">
 Real places near you — matched to your mood and budget, sorted by what's{' '}
 <span className="text-[var(--charcoal)] font-medium">open right now</span>.
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
 className="w-full bg-white/70 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl py-3 pl-10 pr-14 text-sm text-[var(--charcoal)] focus:outline-none focus:border-[var(--accent-terracotta)] focus:ring-1 focus:ring-[var(--accent-terracotta)] placeholder:text-[var(--text-subtle)] transition-all"
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

 <div className="flex items-center gap-4 text-[12px] font-medium text-[var(--text-muted)] select-none">
 <span className="h-px flex-1 bg-[var(--rule)]" />
 <span>or narrow it down</span>
 <span className="h-px flex-1 bg-[var(--rule)]" />
 </div>

 <FilterGroup title="Mood" optional>
 {moods.map((m) => (
 <Chip key={m.value} label={m.label} selected={dimensions.vibe === m.value} onClick={() => toggle('vibe', m.value)} />
 ))}
 </FilterGroup>

 <FilterGroup title="Cuisine" optional>
 {cuisines.map((c) => (
 <Chip key={c.value} label={c.label} selected={dimensions.regional === c.value} onClick={() => toggle('regional', c.value)} />
 ))}
 </FilterGroup>

 <FilterGroup title="Diet" optional>
 {['Vegan','Vegetarian','Halaal','Seafood'].map((d) => (
 <Chip key={d} label={d} selected={dimensions.diet === d} onClick={() => toggle('diet', d)} />
 ))}
 </FilterGroup>

 <div className="flex flex-col gap-3">
 <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--charcoal)]">Budget</span>
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

 {/* Escape hatch. Filters that can't be undone in one tap are a trap — after four
 taps most people don't remember what they set. */}
 {activeCount > 0 && (
 <button
 type="button"
 onClick={() => onChange({ ...dimensions, vibe: null, regional: null, diet: null, capacity: null })}
 className="self-start text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] underline underline-offset-4 cursor-pointer transition-colors"
 >
 Clear {activeCount} filter{activeCount > 1 ?'s' :''}
 </button>
 )}
 </aside>
);
};
