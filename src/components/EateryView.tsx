/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ParsedRecipe } from '../types';
import { ChevronLeft, Heart, Star, MapPin, Phone, Navigation, Clock, ExternalLink } from 'lucide-react';

interface EateryViewProps {
  recipes: ParsedRecipe[];
  selectedRecipe: ParsedRecipe;
  onSelectRecipe: (recipe: ParsedRecipe | null) => void;
  onRegenerate: () => void;
  savedIds: string[];
  onToggleSave: (recipe: ParsedRecipe) => void;
  isSavedTab?: boolean;
}

export const EateryView: React.FC<EateryViewProps> = ({
  recipes,
  selectedRecipe,
  onSelectRecipe,
  onRegenerate,
  savedIds,
  onToggleSave,
  isSavedTab,
}) => {
  const r = selectedRecipe;
  const rawEatery = (r as any).rawEatery;

  if (!rawEatery) return null;

  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(rawEatery.address)}`;
  const isSaved = savedIds.includes(r.id);
  // Only show distance when it's a real measured value, not a city-name fallback
  const distanceLabel = r.tags[1];
  const hasRealDistance = typeof distanceLabel === 'string' && distanceLabel.includes('km');
  const hasRealWait = rawEatery.estimatedWait && rawEatery.estimatedWait !== 'Check with venue';

  return (
    <div className="max-w-[820px] mx-auto w-full animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">

      {/* Hero — true full-bleed: breaks out of the padded content column */}
      <div className="relative left-1/2 -translate-x-1/2 w-screen -mt-6 sm:-mt-10 lg:-mt-16 h-[62vh] sm:h-[74vh] overflow-hidden group">
        <img
          src={r.image}
          alt={rawEatery.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
        />
        {/* Gradient scrim for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/22 to-transparent" />

        {/* Back — top left */}
        <button
          onClick={() => onSelectRecipe(null)}
          className="absolute top-5 left-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1.5px] text-white/70 hover:text-white transition-colors cursor-pointer backdrop-blur-md bg-black/20 hover:bg-black/35 rounded-full px-3.5 py-2"
        >
          <ChevronLeft className="w-3 h-3" />
          {isSavedTab ? `Saved (${recipes.length})` : `Results (${recipes.length})`}
        </button>

        {/* Save — top right */}
        <button
          onClick={() => onToggleSave(r)}
          aria-label={isSaved ? 'Remove from saved' : 'Save eatery'}
          className={`absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
            isSaved
              ? 'bg-[#7C2D12] text-white'
              : 'bg-black/20 text-white hover:bg-black/35'
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isSaved ? 'fill-current scale-110' : ''}`} />
        </button>

        {/* Name overlay — bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-8 sm:pb-12">
          <span className="font-mono text-[9px] uppercase tracking-[2.5px] text-white/45 block mb-3">
            {rawEatery.cuisine}
          </span>
          <h2 className="font-serif text-5xl sm:text-6xl md:text-[5.5rem] font-bold text-white leading-[0.9] tracking-tight mb-5">
            {rawEatery.name}
          </h2>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-white/55">
            <span className="flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-white/80 text-white/80" />
              {rawEatery.rating}
            </span>
            <span className="text-white/25">·</span>
            <span>{rawEatery.priceSymbol}</span>
            {hasRealDistance && (
              <>
                <span className="text-white/25">·</span>
                <span>{distanceLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="px-6 sm:px-10 pt-5">
        <div className="flex items-center gap-2 text-[#6E6A64] dark:text-[#777] text-[11px] font-mono">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{rawEatery.address}</span>
        </div>
      </div>

      {/* Rule */}
      <div className="mx-6 sm:mx-10 my-7 h-px bg-[#E8E4DF] dark:bg-[#1e1e1e]" />

      {/* Contact — minimalist icon pillars */}
      <div className="px-6 sm:px-10 flex items-start">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get directions"
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full bg-[#7C2D12] text-white flex items-center justify-center group-hover:bg-[#5E220E] transition-colors">
            <Navigation className="w-4 h-4" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-[#9E9A94] dark:text-[#555]">Directions</span>
        </a>
        <a
          href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
          aria-label={`Call ${rawEatery.phone}`}
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full border border-[#DDD9D3] dark:border-[#2a2a2a] flex items-center justify-center group-hover:border-[#7C2D12] dark:group-hover:border-[#7C2D12] transition-colors">
            <Phone className="w-4 h-4 text-[#7C2D12] dark:text-[#fca5a5]" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-[#9E9A94] dark:text-[#555]">Call</span>
        </a>
        <a
          href={rawEatery.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Official website"
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full border border-[#DDD9D3] dark:border-[#2a2a2a] flex items-center justify-center group-hover:border-[#5b7993] dark:group-hover:border-[#5b7993] transition-colors">
            <ExternalLink className="w-4 h-4 text-[#5b7993]" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-[#9E9A94] dark:text-[#555]">Website</span>
        </a>
      </div>

      {/* Rule */}
      <div className="mx-6 sm:mx-10 my-7 h-px bg-[#E8E4DF] dark:bg-[#1e1e1e]" />

      {/* Visit Details — pure typography, no container */}
      <div className="px-6 sm:px-10 pb-10">
        <p className="font-mono text-[9px] uppercase tracking-[2.5px] text-[#9E9A94] dark:text-[#555] mb-5">Visit Details</p>
        <div className="flex flex-col">
          {rawEatery.openNow !== undefined && (
            <div className="flex items-center justify-between py-3.5 border-b border-[#F0EDE8] dark:border-[#1a1a1a]">
              <span className="flex items-center gap-2 font-mono text-[11px] text-[#6E6A64] dark:text-[#a3a3a3]">
                <Clock className="w-3.5 h-3.5" /> {rawEatery.openNow ? 'Open Now' : 'Closed Now'}
              </span>
              <span className={`font-mono text-[11px] font-bold ${rawEatery.openNow ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#9E9A94] dark:text-[#666]'}`}>
                {rawEatery.hoursToday ?? (rawEatery.openNow ? 'Open' : 'Closed')}
              </span>
            </div>
          )}
          {hasRealWait && (
            <div className="flex items-center justify-between py-3.5 border-b border-[#F0EDE8] dark:border-[#1a1a1a]">
              <span className="flex items-center gap-2 font-mono text-[11px] text-[#6E6A64] dark:text-[#a3a3a3]">
                <Clock className="w-3.5 h-3.5" /> Estimated Wait
              </span>
              <span className="font-mono text-[11px] font-bold text-[#1A1A1A] dark:text-[#f5f5f5]">{rawEatery.estimatedWait}</span>
            </div>
          )}
          {hasRealDistance && (
            <div className="flex items-center justify-between py-3.5 border-b border-[#F0EDE8] dark:border-[#1a1a1a]">
              <span className="flex items-center gap-2 font-mono text-[11px] text-[#6E6A64] dark:text-[#a3a3a3]">
                <MapPin className="w-3.5 h-3.5" /> Distance
              </span>
              <span className="font-mono text-[11px] font-bold text-[#7C2D12] dark:text-[#fca5a5]">{distanceLabel}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] text-[#6E6A64] dark:text-[#a3a3a3]">
              <Phone className="w-3.5 h-3.5" /> Phone
            </span>
            <a
              href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
              className="font-mono text-[11px] font-bold text-[#1A1A1A] dark:text-[#f5f5f5] hover:text-[#7C2D12] transition-colors"
            >
              {rawEatery.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 sm:px-10 pt-6 pb-12 flex items-center justify-between border-t border-[#E8E4DF] dark:border-[#1e1e1e]">
        <button
          onClick={() => onSelectRecipe(null)}
          className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:hover:text-[#f5f5f5] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> Back to results
        </button>
        <button
          onClick={onRegenerate}
          className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#7C2D12] dark:text-[#fca5a5] hover:opacity-60 cursor-pointer transition-opacity"
        >
          Find other eateries
        </button>
      </div>
    </div>
  );
};
