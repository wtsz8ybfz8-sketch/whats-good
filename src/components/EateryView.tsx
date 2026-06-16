/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { ChevronLeft, Heart, Star, MapPin, Phone, Navigation, Sparkles, Activity, Clock, ExternalLink, ShoppingBag } from 'lucide-react';

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const r = selectedRecipe;
  const rawEatery = (r as any).rawEatery;

  if (!rawEatery) return null;

  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(rawEatery.address)}`;
  const isSaved = savedIds.includes(r.id);

  const triggerToast = (msg: string) => setToastMsg(msg);

  return (
    <div className="max-w-[820px] mx-auto w-full animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">

      {/* Hero — edge-to-edge, focal point */}
      <div className="relative w-full h-[62vh] sm:h-[74vh] overflow-hidden group">
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
            <span className="text-white/25">·</span>
            <span>{r.tags[1]}</span>
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
      <div className="px-6 sm:px-10">
        <p className="font-mono text-[9px] uppercase tracking-[2.5px] text-[#9E9A94] dark:text-[#555] mb-5">Visit Details</p>
        <div className="flex flex-col">
          <div className="flex items-center justify-between py-3.5 border-b border-[#F0EDE8] dark:border-[#1a1a1a]">
            <span className="flex items-center gap-2 font-mono text-[11px] text-[#6E6A64] dark:text-[#a3a3a3]">
              <Clock className="w-3.5 h-3.5" /> Estimated Wait
            </span>
            <span className="font-mono text-[11px] font-bold text-[#1A1A1A] dark:text-[#f5f5f5]">{rawEatery.estimatedWait}</span>
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-[#F0EDE8] dark:border-[#1a1a1a]">
            <span className="flex items-center gap-2 font-mono text-[11px] text-[#6E6A64] dark:text-[#a3a3a3]">
              <MapPin className="w-3.5 h-3.5" /> Distance
            </span>
            <span className="font-mono text-[11px] font-bold text-[#7C2D12] dark:text-[#fca5a5]">{r.tags[1]}</span>
          </div>
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

      {/* Featured Deal */}
      <div className="px-6 sm:px-10 pt-10 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-mono text-[9px] uppercase tracking-[2.5px] text-[#7C2D12] dark:text-[#fca5a5]">Featured Deal</span>
        </div>
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] mb-2">
          Claim This Offer
        </h3>
        <p className="text-xs text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed mb-7">
          Show this screen at the venue before payment to claim your exclusive deal.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 px-4 py-3.5 text-center font-mono font-bold text-sm text-[#7C2D12] dark:text-[#fca5a5] bg-[#FAF2F0] dark:bg-[#7C2D12]/10 rounded-md select-all">
            {rawEatery.voucherOffer}
          </div>
          <button
            onClick={() => triggerToast(`Show this screen at ${rawEatery.name} to claim your deal.`)}
            className="px-6 py-3.5 bg-[#1A1A1A] dark:bg-[#f5f5f5] hover:bg-[#7C2D12] dark:hover:bg-[#7C2D12] text-white dark:text-[#1A1A1A] dark:hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            Activate Offer
          </button>
        </div>
      </div>

      {/* Good to Know — editorial left-border callout */}
      <div className="mx-6 sm:mx-10 mb-10 border-l-[2px] border-[#7C2D12] dark:border-[#7C2D12]/50 pl-5 py-0.5 flex items-start gap-3">
        <Activity className="w-4 h-4 text-[#7C2D12] dark:text-[#fca5a5] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[2.5px] text-[#7C2D12] dark:text-[#fca5a5] mb-2">Good to Know</p>
          <p className="text-sm text-[#4A4741] dark:text-[#a3a3a3] leading-relaxed font-sans">
            {rawEatery.digestiveNote}
          </p>
        </div>
      </div>

      {/* Delivery Partners */}
      <div className="px-6 sm:px-10 pb-10">
        <p className="font-mono text-[9px] uppercase tracking-[2.5px] text-[#9E9A94] dark:text-[#555] mb-4">Order Delivery</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`https://www.checkers.co.za/sixty60/restaurants?search=${encodeURIComponent(rawEatery.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 text-[11px] font-sans font-bold text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:text-[#7C2D12] dark:hover:text-[#fca5a5] transition-all duration-200 cursor-pointer text-center"
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            Checkers Sixty60
          </a>
          <a
            href={`https://www.woolworths.co.za/wwd?search=${encodeURIComponent(rawEatery.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 text-[11px] font-sans font-bold text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:text-[#7C2D12] dark:hover:text-[#fca5a5] transition-all duration-200 cursor-pointer text-center"
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            Woolworths Dash
          </a>
          <a
            href={`https://www.pnpnow.co.za?search=${encodeURIComponent(rawEatery.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 text-[11px] font-sans font-bold text-[#1A1A1A] dark:text-[#f5f5f5] hover:border-[#7C2D12] hover:text-[#7C2D12] dark:hover:text-[#fca5a5] transition-all duration-200 cursor-pointer text-center"
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            PnP asap!
          </a>
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

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white py-3.5 px-5 rounded-2xl shadow-xl font-sans text-xs font-semibold flex items-center gap-3 border border-white/10 max-w-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7C2D12] animate-pulse flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
