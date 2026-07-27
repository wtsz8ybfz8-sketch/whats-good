/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from'react';
import { AlertCircle, RotateCcw, Compass, Info } from'lucide-react';

interface LoadingProps {
 /** How many card skeletons to draw. Defaults to a full first row on desktop. */
 count?: number;
}

/**
 * Skeleton, not a sentence.
 *
 * This used to be a spinner with a Sparkles icon pulsing inside it, under a serif
 * headline and a subtitle, and each of the three call sites passed its own bit of
 * copy — "Finding a good table…", "Checking who's pouring…", "Pulling recipes…".
 * Cute exactly once. By the fourth search it is a paragraph standing between the
 * user and the thing they asked for, and it tells them nothing the layout can't:
 * the shape of the result is the honest progress indicator.
 *
 * The block dimensions below mirror the eatery card in RecipeView (the 168/180px
 * bleed image, the cuisine pill, the title, the rating·price·distance row) so the
 * page doesn't reflow when real results land. If that card's proportions change,
 * change these too — a skeleton that doesn't match is worse than none.
 */
export const LoadingState: React.FC<LoadingProps> = ({ count = 3 }) => {
 return (
 <div
 role="status"
 aria-busy="true"
 className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full"
 >
 <span className="sr-only">Loading results</span>
 {Array.from({ length: count }).map((_, i) => (
 <div
 key={i}
 aria-hidden="true"
 className="surface rounded-2xl p-5 sm:p-6 flex flex-col animate-pulse motion-reduce:animate-none"
 >
 {/* Image band — same bleed and height as the real card */}
 <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6 mb-4 rounded-t-2xl h-[168px] sm:h-[180px] bg-[var(--rule)]" />
 {/* Cuisine pill */}
 <div className="h-[22px] w-24 rounded-full bg-[var(--rule)] mb-4" />
 {/* Venue name, two lines */}
 <div className="h-[18px] w-4/5 rounded bg-[var(--rule)] mb-2" />
 <div className="h-[18px] w-1/2 rounded bg-[var(--rule)] mb-5" />
 {/* Rating · price · distance */}
 <div className="mt-auto flex items-center gap-3">
 <div className="h-3 w-10 rounded bg-[var(--rule)]" />
 <div className="h-3 w-6 rounded bg-[var(--rule)]" />
 <div className="h-3 w-16 rounded bg-[var(--rule)]" />
 </div>
 </div>
))}
 </div>
);
};

interface ErrorProps {
 title?: string;
 message?: string;
 onRetry: () => void;
 /**
  * 'notice' for a state the user can act on but cannot retry away — a missing API key,
  * a missing location. Shipping those under "Something went wrong" with a "Try again"
  * button was actively misleading: retrying changes nothing, and the red alert framing
  * blamed a fault for what is really a setup step.
  */
 tone?: 'error' | 'notice';
 /** Hide the retry button where pressing it provably cannot help. */
 showRetry?: boolean;
}

export const ErrorState: React.FC<ErrorProps> = ({
 title ="Can't reach our recipe source",
 message ='Check your connection and try again.',
 onRetry,
 tone = 'error',
 showRetry = true,
}) => {
 const isNotice = tone === 'notice';
 return (
 <div className="max-w-[420px] mx-auto text-center py-16 sm:py-24 px-8 surface rounded-3xl flex flex-col items-center justify-center animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div
 className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 border ${
 isNotice
 ?'bg-[var(--accent-tint)] border-[var(--accent-tint-border)] text-[var(--accent-terracotta)]'
 :'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-300'
 }`}
 >
 {isNotice ? <Info className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
 </div>
 <h4 className="font-serif text-lg sm:text-xl text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 leading-snug">
 {title}
 </h4>
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed mb-8 last:mb-0">
 {message}
 </p>
 {showRetry && (
 <button
 onClick={onRetry}
 className="hit-44 inline-flex items-center gap-2 px-6 py-3.5 bg-[var(--accent-terracotta)] hover:opacity-90 text-[var(--accent-contrast)] rounded-2xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-lg"
 >
 <RotateCcw className="w-3.5 h-3.5" /> Try again
 </button>
)}
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
 city = '',
}) => {
 return (
 <div className="max-w-2xl mx-auto animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="text-left py-10 sm:py-14 px-7 sm:px-9 surface rounded-3xl flex flex-col justify-center">
 <div className="w-12 h-12 rounded-2xl bg-[#FAF2F0] dark:bg-[#7C2D12]/20 border border-[#F5D1C9] dark:border-[#7C2D12]/40 flex items-center justify-center mb-6">
 <Compass className="w-5 h-5 text-[var(--accent-terracotta)]" />
 </div>
 <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold mb-3">
 What's Good{city ? ` ${city}` : ''}
 </p>
 <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--heading-color)] mb-4 leading-tight">
 Where are we eating?
 </h3>
 <p className="text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed max-w-[420px] mb-8">
 Pick a cuisine, budget, distance, and mood. We will surface the best nearby fit first, then keep recipes for nights in.
 </p>
 <button
 onClick={onSearchRandom}
 className="hit-44 self-start px-6 py-3.5 bg-[var(--accent-terracotta)] hover:opacity-90 text-[var(--accent-contrast)] rounded-2xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
 >
 Stay in tonight
 </button>
 </div>
  </div>
);
};
