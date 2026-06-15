/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dimensions } from '../types';
import { Search, ChevronDown } from 'lucide-react';

interface SidebarProps {
  dimensions: Dimensions;
  onChange: (dims: Dimensions) => void;
  onTriggerMatch: (query?: string) => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  dimensions,
  onChange,
  onTriggerMatch,
  isLoading,
}) => {
  const [localSearch, setLocalSearch] = useState(dimensions.searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input if the parent clears searchQuery externally
  useEffect(() => {
    setLocalSearch(dimensions.searchQuery);
  }, [dimensions.searchQuery]);
  const vibes = [
    { label: '🛋️ Tired & cosy', value: 'tired & cosy' },
    { label: '🫶 Need comfort', value: 'need comfort food' },
    { label: '🌍 Adventurous', value: 'feeling adventurous' },
    { label: '✨ Treating myself', value: 'treating myself' },
    { label: '🌿 Fresh & light', value: 'something fresh & light' },
    { label: '⚡ Stressed', value: 'stressed, need quick and easy' },
    { label: '🔥 Bold & spicy', value: 'craving something bold & spicy' },
    { label: '☀️ Lazy Sunday', value: 'lazy Sunday energy' },
    { label: '🥂 Feeling fancy', value: 'feeling fancy' },
  ];

  const cuisines = [
    'American', 'British', 'Chinese', 'Croatian', 'Dutch',
    'Egyptian', 'Filipino', 'French', 'Greek', 'Indian',
    'Irish', 'Italian', 'Jamaican', 'Japanese', 'Malaysian',
    'Moroccan', 'Polish', 'Portuguese', 'Russian', 'South African',
    'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Vietnamese',
  ];

  const effortLevels = [
    { label: 'Low', time: '~15m', value: 'low effort, under 20 minutes' },
    { label: 'Med', time: '~30m', value: 'medium effort, around 30 minutes' },
    { label: 'High', time: '45m+', value: 'high effort, I want to properly cook today' },
  ];

  const handleSelectVibe = (val: string) => {
    onChange({
      ...dimensions,
      vibe: dimensions.vibe === val ? null : val, // toggle
    });
  };

  const handleSelectCuisine = (val: string | null) => {
    onChange({ ...dimensions, regional: val });
  };

  const handleSelectEffort = (val: string) => {
    onChange({
      ...dimensions,
      capacity: dimensions.capacity === val ? null : val, // toggle
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...dimensions, searchQuery: val });
    }, 500);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalSearch('');
    onChange({ ...dimensions, searchQuery: '' });
  };

  const isFormValid =
    localSearch.trim().length > 0 ||
    (dimensions.vibe && dimensions.regional && dimensions.capacity);

  return (
    <aside className="bg-white border-r border-[#e6e4e0] p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 overflow-y-auto lg:h-[calc(100vh-70px)] sticky top-[70px]">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-[#6E6A64] block mb-2">
          Personalized Gastronomy
        </span>
        <h1 className="font-serif text-3xl lg:text-4xl font-extrabold leading-[1.15] text-[#1A1A1A]">
          What are you<br />
          <span className="italic font-normal text-[#7C2D12]">feeling today?</span>
        </h1>
      </div>

      {/* Direct Search Option */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] flex items-center gap-2">
          Search Recipe Name
        </span>
        <div className="relative">
          <input
            type="text"
            value={localSearch}
            onChange={handleTextChange}
            placeholder="e.g. Chicken, Pasta, Pie, Chocolate..."
            className="w-full bg-[#FAF9F6] border border-[#e6e4e0] rounded-xl py-3 pl-10 pr-4 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#7C2D12] placeholder:text-[#a2a8a8] transition-colors"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#6E6A64]" />
          {localSearch && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-3 text-xs text-[#6E6A64] hover:text-[#1A1A1A]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Or Coordinates Section */}
      <div className="flex items-center gap-4 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64]">
        <span className="h-[1px] flex-1 bg-[#e6e4e0]" />
        <span>OR CHOOSE COORDINATES</span>
        <span className="h-[1px] flex-1 bg-[#e6e4e0]" />
      </div>

      {/* Your Current Vibe */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-[#6E6A64]">
          Your Current Vibe
        </span>
        <div className="flex flex-wrap gap-2">
          {vibes.map((v) => {
            const isSelected = dimensions.vibe === v.value;
            return (
              <button
                key={v.value}
                onClick={() => handleSelectVibe(v.value)}
                className={`px-3 py-2 rounded-full font-sans text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                    : 'bg-[#FAF9F6] border-[#e6e4e0] text-[#1A1A1A] hover:border-[#7C2D12] hover:bg-[#FAF2F0]'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuisine Coordinates */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-[#6E6A64]">
          Cuisine Coordinates
        </span>
        <div className="relative">
          <select
            value={dimensions.regional ?? ''}
            onChange={(e) => handleSelectCuisine(e.target.value || null)}
            className="w-full appearance-none bg-[#FAF9F6] border border-[#e6e4e0] rounded-xl py-3 pl-4 pr-9 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#7C2D12] transition-colors cursor-pointer"
          >
            <option value="">Any cuisine</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 w-4 h-4 text-[#6E6A64]" />
        </div>
      </div>

      {/* Kitchen Energy Configuration */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-[#6E6A64]">
          Kitchen Energy Configuration
        </span>
        <div className="grid grid-cols-3 bg-[#f0ede9] p-1 rounded-xl">
          {effortLevels.map((e) => {
            const isSelected = dimensions.capacity === e.value;
            return (
              <button
                key={e.value}
                onClick={() => handleSelectEffort(e.value)}
                className={`flex flex-col py-2 px-1 rounded-lg transition-all cursor-pointer text-center ${
                  isSelected
                    ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[#7C2D12]'
                    : 'text-[#6E6A64] hover:text-[#1A1A1A]'
                }`}
              >
                <span className="text-xs font-bold font-sans leading-tight block">
                  {e.label}
                </span>
                <span className="text-[9px] text-[#6E6A64] leading-tight block mt-0.5">
                  {e.time}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onTriggerMatch(localSearch.trim() || undefined)}
        disabled={!isFormValid || isLoading}
        className={`w-full py-4 mt-auto rounded-xl font-serif text-lg font-semibold transition-all cursor-pointer ${
          isFormValid
            ? 'bg-[#7C2D12] text-white hover:bg-[#5E220E] hover:shadow-[0_14px_35px_rgba(124,45,18,0.12)]'
            : 'bg-[#e6e4e0] text-[#a2a8a8] cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : localSearch.trim() ? (
          'Search Real Recipe Matrix →'
        ) : (
          'Analyze Coordinates & Match Menu →'
        )}
      </button>
    </aside>
  );
};
