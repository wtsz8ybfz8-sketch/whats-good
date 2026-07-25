/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from'react';
import { AlertCircle, RotateCcw, Compass, Sparkles } from'lucide-react';

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
 <div className="w-16 h-16 border-4 border-[var(--accent-tint)] border-t-[var(--accent-terracotta)] rounded-full animate-spin" />
 <div className="absolute inset-0 flex items-center justify-center">
 <Sparkles className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5] animate-pulse" />
 </div>
 </div>
 <h4 className="font-serif text-xl sm:text-2xl text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 leading-snug">
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
 <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-300 mb-6 border border-red-100 dark:border-red-900/50">
 <AlertCircle className="w-6 h-6" />
 </div>
 <h4 className="font-serif text-lg sm:text-xl text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 leading-snug">
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

/**
 * The "Featured Match / Best fit" card that used to sit beside this one is gone.
 *
 * It was never a match. It rendered `SOUTH_AFRICAN_EATERIES[0]` — the first item of the
 * hardcoded Cape Town fallback list — to every user in Cape Town, before they had searched
 * for anything, while labelling itself "Best fit" with a filled star. Its "Menu highlights"
 * were `signatureOrder` plus two `signatureIngredients`, so on any Places-sourced venue it
 * would have listed "House specialty at …" as a dish.
 *
 * So: a fixed venue, presented as a personalised recommendation, with a fabricated menu,
 * appearing for no reason the reader could infer. The user's read — "just sitting there
 * randomly and appears when there's no reason for it to" — was exactly right, and it broke
 * both standing rules in CLAUDE.md at once. Don't rebuild it. A genuine featured slot needs
 * a real signal (their saves, their filters, confirmed editorial picks); until there is one,
 * the honest empty state is the invitation on its own.
 */
interface EmptyProps {
  onSearchRandom: () => void;
  city?: string;
}

export const EmptyState: React.FC<EmptyProps> = ({
 onSearchRandom,
 city = 'Cape Town',
}) => {
 return (
 <div className="max-w-2xl mx-auto animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="text-left py-10 sm:py-14 px-7 sm:px-9 glass rounded-3xl flex flex-col justify-center">
 <div className="w-12 h-12 rounded-2xl bg-[#FAF2F0] dark:bg-[#7C2D12]/20 border border-[#F5D1C9] dark:border-[#7C2D12]/40 flex items-center justify-center mb-6">
 <Compass className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5]" />
 </div>
 <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#7C2D12] dark:text-[#fca5a5] font-bold mb-3">
 What's Good {city}
 </p>
 <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1A1A1A] dark:text-[#f5f5f5] mb-4 leading-tight">
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
  </div>
);
};
