/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { ChevronLeft, Heart, Star, MapPin, Phone, Navigation, Sparkles, Activity, Clock, ExternalLink } from 'lucide-react';

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
    <div className="max-w-[820px] mx-auto w-full animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards] px-2 sm:px-4 py-4">
      {/* Back button */}
      <button
        onClick={() => onSelectRecipe(null)}
        className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:hover:text-[#f5f5f5] mb-6 transition-colors bg-none border-none cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        {isSavedTab ? (
          <span>Back to Saved Eateries ({recipes.length} saved)</span>
        ) : (
          <span>Back to results ({recipes.length} found)</span>
        )}
      </button>

      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Badge row & Save action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-[#FAF2F0] dark:bg-[#7C2D12]/20 text-[#7C2D12] dark:text-[#fca5a5]">
              {rawEatery.cuisine}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-[#FFFBEB] dark:bg-[#D97706]/20 text-[#D97706] flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-amber-500" /> {rawEatery.rating}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-black dark:bg-[#222222] text-white">
              {rawEatery.priceSymbol} Tier
            </span>
          </div>

          <button
            onClick={() => onToggleSave(r)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
              isSaved
                ? 'bg-[#7C2D12] text-white border-[#7C2D12] hover:bg-[#5E220E] hover:border-[#5E220E]'
                : 'bg-white dark:bg-[#1a1a1a] text-[#7C2D12] dark:text-[#fca5a5] border-[#F5D1C9] dark:border-[#7C2D12]/40 hover:bg-[#FAF2F0] dark:hover:bg-[#7C2D12]/20'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 transition-transform ${isSaved ? 'fill-current scale-110' : ''}`} />
            {isSaved ? 'Saved' : 'Save Eatery'}
          </button>
        </div>

        {/* Name & address */}
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-[#1A1A1A] dark:text-[#f5f5f5]">
            {rawEatery.name}
          </h2>
          <div className="flex flex-wrap items-center text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] font-sans mt-3 gap-2">
            <MapPin className="w-4 h-4 text-[#7C2D12] dark:text-[#fca5a5]" />
            <span>{rawEatery.address}</span>
            <span className="opacity-40">•</span>
            <span className="font-mono font-bold text-[#7C2D12] dark:text-[#fca5a5]">{r.tags[1]}</span>
          </div>
        </div>

        {/* Hero image — full width */}
        <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden border border-black dark:border-[#444] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.05)] relative group bg-[#F2F1EE] dark:bg-[#222222]">
          <img
            src={r.image}
            alt={rawEatery.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-40" />
        </div>

        {/* Contact actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-[#1a1a1a] p-3 rounded-2xl border border-black dark:border-[#444] shadow-sm">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#7C2D12] hover:bg-[#5E220E] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95 text-center shadow-sm"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </a>
          <a
            href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#FAF9F6] dark:bg-[#111111] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] text-black dark:text-[#f5f5f5] border border-black dark:border-[#444] text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95 text-center"
          >
            <Phone className="w-4 h-4 text-[#7C2D12] dark:text-[#fca5a5]" />
            {rawEatery.phone}
          </a>
          <a
            href={rawEatery.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#FAF9F6] dark:bg-[#111111] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] text-[#5b7993] border border-black dark:border-[#444] text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95 text-center"
          >
            <ExternalLink className="w-4 h-4" />
            Official Website
          </a>
        </div>

        {/* Visit details */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black dark:border-[#444] p-5 rounded-2xl shadow-sm flex flex-col gap-3">
          <h4 className="font-serif text-sm font-bold text-[#1A1A1A] dark:text-[#f5f5f5] pb-2 border-b border-black dark:border-[#444]">
            Visit Details
          </h4>
          <div className="flex items-center justify-between text-xs font-mono py-1">
            <span className="text-[#6E6A64] dark:text-[#a3a3a3] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Estimated Wait
            </span>
            <span className="font-bold text-[#1A1A1A] dark:text-[#f5f5f5]">{rawEatery.estimatedWait}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono py-1">
            <span className="text-[#6E6A64] dark:text-[#a3a3a3] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Distance
            </span>
            <span className="font-bold text-[#7C2D12] dark:text-[#fca5a5]">{r.tags[1]}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono py-1">
            <span className="text-[#6E6A64] dark:text-[#a3a3a3] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </span>
            <a
              href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
              className="font-bold text-[#1A1A1A] dark:text-[#f5f5f5] hover:text-[#7C2D12] transition-colors"
            >
              {rawEatery.phone}
            </a>
          </div>
        </div>

        {/* Signature dish */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2C2C2C] p-7 sm:p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] flex flex-col gap-4 relative overflow-hidden">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-amber-400 font-bold">
            Signature Dish
          </span>
          <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            {rawEatery.signatureOrder}
          </h4>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans">
            {rawEatery.signatureDescription}
          </p>
        </div>

        {/* Featured deal */}
        <div className="bg-gradient-to-r from-[#FFF9F7] to-[#FAF2F0] dark:from-[#1a1a1a] dark:to-[#1a1a1a] border border-[#F5D1C9] dark:border-[#7C2D12]/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-start relative shadow-[0_8px_30px_rgba(124,45,18,0.03)] border-dashed">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#7C2D12] dark:text-[#fca5a5] font-semibold">
              Featured Deal
            </span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-extrabold text-[#1A1A1A] dark:text-[#f5f5f5] mb-3">
            Claim This Offer
          </h3>
          <p className="text-xs sm:text-sm text-[#3c3830] dark:text-[#a3a3a3] leading-relaxed mb-6">
            Show this screen at the venue before payment to claim your exclusive deal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1 bg-white dark:bg-[#111111] border border-[#F5D1C9] dark:border-[#7C2D12]/40 rounded-xl px-4 py-3.5 text-center font-sans font-bold text-sm text-[#7C2D12] dark:text-[#fca5a5] select-all shadow-inner border-dashed">
              {rawEatery.voucherOffer}
            </div>
            <button
              onClick={() => triggerToast(`Show this screen at ${rawEatery.name} to claim your deal.`)}
              className="px-6 py-3.5 bg-black dark:bg-[#222222] hover:bg-[#7C2D12] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              Activate Offer
            </button>
          </div>
        </div>

        {/* Good to know */}
        <div className="bg-[#FFFDFB] dark:bg-[#1a1a1a] border border-[#F5D1C9] dark:border-[#7C2D12]/40 rounded-[2rem] p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF2F0] dark:bg-[#7C2D12]/20 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5]" />
            </div>
            <div>
              <strong className="block text-xs font-black text-[#7C2D12] dark:text-[#fca5a5] uppercase tracking-[1px] mb-1">
                Good to Know
              </strong>
              <p className="text-sm text-[#4A4741] dark:text-[#a3a3a3] leading-relaxed font-sans">
                {rawEatery.digestiveNote}
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-8 border-t border-black dark:border-[#444] flex items-center justify-between">
          <button
            onClick={() => onSelectRecipe(null)}
            className="px-5 py-3 bg-transparent border border-black dark:border-[#444] text-black dark:text-[#f5f5f5] hover:bg-[#FAF9F6] dark:hover:bg-[#1a1a1a] rounded-xl font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            Back to results
          </button>
          <button
            onClick={onRegenerate}
            className="px-5 py-3 bg-transparent border border-[#7C2D12] text-[#7C2D12] dark:text-[#fca5a5] hover:bg-[#7C2D12] hover:text-white rounded-xl font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            Find other eateries
          </button>
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
};
