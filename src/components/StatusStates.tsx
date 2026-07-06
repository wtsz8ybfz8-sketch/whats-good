/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from'react';
import { AlertCircle, RotateCcw, Compass, Sparkles, MapPin, Star } from'lucide-react';

interface LoadingProps {
 title?: string;
 subtitle?: string;
}

export const LoadingState: React.FC<LoadingProps> = ({
 title ='Finding your recipes...',
 subtitle ="This won't take long.",
}) => {
 return (
 <div className="max-w-[450px] mx-auto text-center py-16 sm:py-24 px-8 glass rounded-3xl flex flex-col items-center justify-center animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="relative mb-8">
 <div className="w-16 h-16 border-4 border-[#FAF2F0] border-t-[#7C2D12] rounded-full animate-spin" />
 <div className="absolute inset-0 flex items-center justify-center">
 <Sparkles className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5] animate-pulse" />
 </div>
 </div>
 <h4 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 leading-snug">
 {title}
 </h4>
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed max-w-[340px]">
 {subtitle}
 </p>
 </div>
);
};

interface ErrorProps {
 title?: string;
 message?: string;
 onRetry: () => void;
}

export const ErrorState: React.FC<ErrorProps> = ({
 title ="Can't reach our recipe source",
 message ='Check your connection and try again.',
 onRetry,
}) => {
 return (
 <div className="max-w-[420px] mx-auto text-center py-16 sm:py-24 px-8 glass rounded-3xl flex flex-col items-center justify-center animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-6 border border-red-100">
 <AlertCircle className="w-6 h-6" />
 </div>
 <h4 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 leading-snug">
 {title}
 </h4>
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed mb-8">
 {message}
 </p>
 <button
 onClick={onRetry}
 className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white rounded-2xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-lg"
 >
 <RotateCcw className="w-3.5 h-3.5" /> Try again
 </button>
 </div>
);
};

interface EmptyProps {
  onSearchRandom: () => void;
  onOpenFeatured?: () => void;
  city?: string;
  featured?: {
    name: string;
    area: string;
    price: string;
    distance: string;
    vibe: string;
    menu: string[];
  };
}

export const EmptyState: React.FC<EmptyProps> = ({
 onSearchRandom,
 onOpenFeatured,
 city = 'Cape Town',
 featured,
}) => {
 return (
 <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-10 items-stretch max-w-5xl mx-auto animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="text-left py-10 sm:py-14 px-7 sm:px-9 glass rounded-3xl flex flex-col justify-center">
 <div className="w-12 h-12 rounded-2xl bg-[#FAF2F0] dark:bg-[#7C2D12]/20 border border-[#F5D1C9] dark:border-[#7C2D12]/40 flex items-center justify-center mb-6">
 <Compass className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5]" />
 </div>
 <p className="font-mono text-[10px] uppercase tracking-[2px] text-[#7C2D12] dark:text-[#fca5a5] font-bold mb-3">
 What's Good {city}
 </p>
 <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] dark:text-[#f5f5f5] mb-4 leading-tight">
 Where are we eating?
 </h3>
 <p className="text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed max-w-[420px] mb-8">
 Pick a cuisine, budget, distance, and mood. We will surface the best nearby fit first, then keep recipes for nights in.
 </p>
 <button
 onClick={onSearchRandom}
 className="self-start px-6 py-3.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white rounded-2xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
 >
 Stay in tonight
 </button>
 </div>
 {featured && (
 <button
 type="button"
 onClick={onOpenFeatured}
 className="text-left glass rounded-3xl overflow-hidden group cursor-pointer transition-all hover:-translate-y-1 active:scale-[0.99]"
 >
 <div className="p-6 sm:p-8">
 <div className="flex items-center justify-between gap-4 mb-8">
 <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#6E6A64] dark:text-[#a3a3a3]">
 Featured Match
 </span>
 <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#7C2D12] dark:text-[#fca5a5] font-bold">
 <Star className="w-3.5 h-3.5 fill-current" /> Best fit
 </span>
 </div>
 <h4 className="font-serif text-3xl sm:text-4xl font-extrabold leading-tight text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 group-hover:text-[#7C2D12] dark:group-hover:text-[#fca5a5] transition-colors">
 {featured.name}
 </h4>
 <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#6E6A64] dark:text-[#a3a3a3] mb-4">
 <MapPin className="w-3.5 h-3.5" />
 <span>{featured.area}</span>
 <span>·</span>
 <span>{featured.price}</span>
 <span>·</span>
 <span>{featured.distance}</span>
 </div>
 <p className="text-sm text-[#4A4741] dark:text-[#a3a3a3] leading-relaxed mb-7">
 {featured.vibe}
 </p>
 <div className="border-t border-black/10 dark:border-white/10 pt-5">
 <p className="font-mono text-[10px] uppercase tracking-[2px] text-[#6E6A64] dark:text-[#a3a3a3] mb-3">
 Menu highlights
 </p>
 <div className="space-y-2.5">
 {featured.menu.map((item) => (
 <div key={item} className="flex items-center justify-between gap-4 text-sm">
 <span className="font-sans font-semibold text-[#1A1A1A] dark:text-[#f5f5f5]">{item}</span>
 <span className="font-mono text-[11px] text-[#7C2D12] dark:text-[#fca5a5]">market</span>
 </div>
))}
 </div>
 </div>
 </div>
 </button>
)}
 </div>
);
};
