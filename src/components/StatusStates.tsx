/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface LoadingProps {
  title?: string;
  subtitle?: string;
}

export const LoadingState: React.FC<LoadingProps> = ({
  title = 'Formulating Aromatic Menu Matrix',
  subtitle = 'Cross-analyzing dietary profiles with low-FODMAP gastric-motility indexes...',
}) => {
  return (
    <div className="max-w-[450px] mx-auto text-center py-16 sm:py-24 px-4 flex flex-col items-center justify-center animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
      <div className="relative mb-8">
        <div className="w-14 h-14 border-4 border-[#FAF2F0] border-t-[#7C2D12] rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs">🍲</span>
        </div>
      </div>
      <h4 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-3">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-[#6E6A64] leading-relaxed max-w-[340px]">
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
  title = 'Culinary Index Connection Halted',
  message = 'We could not reach the global recipe archives. Please check your network connection and try again.',
  onRetry,
}) => {
  return (
    <div className="max-w-[400px] mx-auto text-center py-16 sm:py-24 px-6 flex flex-col items-center justify-center animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-6 border border-red-100">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] mb-3">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-[#6E6A64] leading-relaxed mb-8">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white rounded-xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Re-execute Matrix Search
      </button>
    </div>
  );
};

interface EmptyProps {
  onSearchRandom: () => void;
}

export const EmptyState: React.FC<EmptyProps> = ({ onSearchRandom }) => {
  return (
    <div className="max-w-[500px] mx-auto text-center py-16 sm:py-24 px-4 flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-full bg-[#F2F1EE] flex items-center justify-center mb-6">
        <span className="text-2xl" role="img" aria-label="canvas empty">🗺️</span>
      </div>
      <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A] mb-3 leading-snug">
        Culinary Canvas Awaiting Dimensions
      </h3>
      <p className="text-xs sm:text-sm text-[#6E6A64] leading-relaxed max-w-[380px] mb-8">
        Configure your real-time gastric, regional, and energy coordinates inside the dashboard or search for a specific dish by title above to match real culinary menus.
      </p>
      <button
        onClick={onSearchRandom}
        className="px-6 py-3.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white rounded-xl font-sans text-xs font-bold transition-all cursor-pointer"
      >
        Surprise Me with Random Wildcard
      </button>
    </div>
  );
};
