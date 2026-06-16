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
}

export const EmptyState: React.FC<EmptyProps> = ({ onSearchRandom }) => {
 return (
 <div className="max-w-[500px] mx-auto text-center py-16 sm:py-24 px-8 glass rounded-3xl flex flex-col items-center justify-center animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="w-14 h-14 rounded-full bg-[#FAF2F0] dark:bg-[#7C2D12]/20 border border-[#F5D1C9] dark:border-[#7C2D12]/40 flex items-center justify-center mb-6">
 <Compass className="w-6 h-6 text-[#7C2D12] dark:text-[#fca5a5]" />
 </div>
 <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A] dark:text-[#f5f5f5] mb-3 leading-snug">
 Let's find something good
 </h3>
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed max-w-[380px] mb-8">
 Pick a mood, a cuisine, and how much time you have — or just search for something specific.
 </p>
 <button
 onClick={onSearchRandom}
 className="px-6 py-3.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white rounded-2xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-lg"
 >
 Surprise me
 </button>
 </div>
);
};
