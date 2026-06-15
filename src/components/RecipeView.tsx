/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { Clock, Users, Flame, ChevronLeft, Check, Compass, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';

interface RecipeViewProps {
  recipes: ParsedRecipe[];
  selectedRecipe: ParsedRecipe | null;
  onSelectRecipe: (recipe: ParsedRecipe | null) => void;
  onRegenerate: () => void;
  isRandomMode: boolean;
  isSaved: (id: string) => boolean;
  onSave: (recipe: ParsedRecipe) => void;
  onUnsave: (id: string) => void;
  isSavedMode?: boolean;
}

export const RecipeView: React.FC<RecipeViewProps> = ({
  recipes,
  selectedRecipe,
  onSelectRecipe,
  onRegenerate,
  isRandomMode,
  isSaved,
  onSave,
  onUnsave,
  isSavedMode = false,
}) => {
  // Local state to keep track of checked ingredients for checklist interaction
  const [completedIngredients, setCompletedIngredients] = useState<Record<string, boolean>>({});

  // Reset checked ingredients whenever the selected recipe changes
  useEffect(() => {
    setCompletedIngredients({});
  }, [selectedRecipe]);

  const toggleIngredient = (id: string, idx: number) => {
    const key = `${id}-${idx}`;
    setCompletedIngredients((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If a specific recipe is selected, show its glorious detailed page
  if (selectedRecipe) {
    const r = selectedRecipe;
    return (
      <div className="max-w-[820px] mx-auto w-full animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards] px-2 sm:px-4 py-4">
        {/* Top bar: back nav + save button */}
        <div className="flex items-center justify-between mb-6">
          {recipes.length > 1 ? (
            <button
              onClick={() => onSelectRecipe(null)}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] text-[#6E6A64] hover:text-[#1A1A1A] transition-colors bg-none border-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {isSavedMode ? `Back to Saved (${recipes.length})` : `Back to Match Selection (${recipes.length} found)`}
            </button>
          ) : <span />}

          <button
            onClick={() => isSaved(r.id) ? onUnsave(r.id) : onSave(r)}
            className={`flex items-center gap-1.5 font-sans text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              isSaved(r.id)
                ? 'bg-[#7C2D12] border-[#7C2D12] text-white'
                : 'bg-white border-[#e6e4e0] text-[#6E6A64] hover:border-[#7C2D12] hover:text-[#7C2D12]'
            }`}
          >
            {isSaved(r.id)
              ? <><BookmarkCheck className="w-3.5 h-3.5" /> Saved</>
              : <><Bookmark className="w-3.5 h-3.5" /> Save Recipe</>
            }
          </button>
        </div>

        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Badge row */}
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-[#FAF2F0] text-[#7C2D12]">
              #{r.category}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-[#f0f4f8] text-[#5b7993]">
              {r.area} Culture
            </span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-[#1A1A1A]">
              {r.name}
            </h2>
            {r.tags && r.tags.length > 0 && (
              <p className="text-xs sm:text-sm text-[#6E6A64] font-sans mt-3 italic">
                A classic aromatic dish representing {r.tags.slice(0, 4).join(', ')}.
              </p>
            )}
          </div>

          {/* Hero Recipe Image */}
          <div className="w-full h-64 sm:h-96 rounded-2xl overflow-hidden border border-[#e6e4e0] shadow-sm relative group bg-[#F2F1EE]">
            <img
              src={r.image}
              alt={r.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          {/* Structured Ticket Stats */}
          <div className="grid grid-cols-3 border-t border-b border-dashed border-black/[0.08] py-5 my-2 max-w-[500px]">
            <div className="text-center">
              <span className="font-mono text-lg sm:text-xl font-bold text-[#1A1A1A] block">
                {r.prepTime}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#6E6A64] block mt-1">
                Prep Clock
              </span>
            </div>
            <div className="text-center border-l border-r border-[#e6e4e0]">
              <span className="font-mono text-lg sm:text-xl font-bold text-[#1A1A1A] block">
                {r.cookTime}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#6E6A64] block mt-1">
                Active Cook
              </span>
            </div>
            <div className="text-center">
              <span className="font-mono text-lg sm:text-xl font-bold text-[#1A1A1A] block">
                {r.serves}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#6E6A64] block mt-1">
                Yield
              </span>
            </div>
          </div>

          {/* Clinical Insight Highlight Accent Block */}
          <div className="bg-gradient-to-r from-[#FAF2F0] to-[#FFF9F7] border-l-4 border-[#7C2D12] rounded-r-2xl p-5 flex gap-4 items-start">
            <span className="text-2xl mt-0.5 select-none" role="img" aria-label="medical badge">🩺</span>
            <div className="flex-1">
              <strong className="block text-sm font-bold text-[#1A1A1A] mb-1">
                Clinical Motility Insight
              </strong>
              <p className="text-xs sm:text-sm text-[#3d4a3f] leading-relaxed">
                {r.gutTip}
              </p>
            </div>
          </div>

          {/* Ingredients & Preparation Lists */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Ingredients Side */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] pb-2 border-b border-black/[0.08]">
                Pantry Matrix
              </h3>
              <p className="text-xs text-[#6E6A64] font-mono uppercase tracking-wider">
                Click items to collect & cross out
              </p>
              <ul className="flex flex-col divide-y divide-[#f3f1ed]">
                {r.ingredients.map((ing, idx) => {
                  const itemKey = `${r.id}-${idx}`;
                  const isDone = !!completedIngredients[itemKey];
                  return (
                    <li
                      key={idx}
                      onClick={() => toggleIngredient(r.id, idx)}
                      className={`py-3 flex items-start gap-3 cursor-pointer transition-all ${
                        isDone ? 'opacity-35 line-through' : 'opacity-100'
                      }`}
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isDone
                            ? 'bg-[#7C2D12] border-[#7C2D12] text-white'
                            : 'border-[#F5D1C9] bg-[#FAF9F6]'
                        }`}
                      >
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="font-sans text-sm text-[#1A1A1A] leading-tight select-none">
                        {ing}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Steps Side */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] pb-2 border-b border-black/[0.08]">
                Preparation Sequence
              </h3>
              <div className="flex flex-col gap-6">
                {r.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="font-mono text-xs font-bold w-7 h-7 rounded-full border border-[#e6e4e0] bg-white text-[#1A1A1A] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 transition-colors group-hover:border-[#7C2D12] group-hover:text-[#7C2D12]">
                      {idx + 1}
                    </div>
                    <p className="font-sans text-sm sm:text-[15px] leading-relaxed text-[#1A1A1A] pt-0.5">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Links Row */}
          {(r.youtube || r.source) && (
            <div className="border-t border-black/[0.08] pt-6 flex flex-wrap gap-4">
              {r.youtube && (
                <a
                  href={r.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-sans text-xs font-bold text-red-700 hover:text-red-900 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View video reference in new window
                </a>
              )}
              {r.source && (
                <a
                  href={r.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-sans text-xs font-bold text-[#5b7993] hover:text-[#1A1A1A] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Source recipe documentation page
                </a>
              )}
            </div>
          )}

          {/* Alternative action buttons */}
          <div className="pt-8 border-t border-black/[0.08] flex items-center justify-start gap-4 flex-wrap">
            {isSavedMode ? (
              <button
                onClick={() => { onUnsave(r.id); onSelectRecipe(null); }}
                className="px-6 py-3.5 bg-transparent border border-[#e6e4e0] text-[#6E6A64] hover:border-red-300 hover:text-red-600 rounded-xl font-sans text-sm font-bold transition-all cursor-pointer"
              >
                Remove from Saved
              </button>
            ) : (
              <>
                <button
                  onClick={onRegenerate}
                  className="px-6 py-3.5 bg-transparent border border-[#7C2D12] text-[#7C2D12] hover:bg-[#7C2D12] hover:text-white rounded-xl font-sans text-sm font-bold transition-all cursor-pointer"
                >
                  {isRandomMode ? 'Roll Kitchen Dice Again' : 'Formulate Alternative Menu'}
                </button>
                {recipes.length > 1 && (
                  <button
                    onClick={() => onSelectRecipe(null)}
                    className="px-6 py-3.5 bg-none border-none text-[#5b7993] hover:text-[#1A1A1A] font-sans text-sm font-bold transition-all cursor-pointer"
                  >
                    Choose from alternative matches ({recipes.length - 1} more)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Showcase grid if multiple matches are returned and none are explicitly active
  return (
    <div className="max-w-[1000px] mx-auto w-full px-2 sm:px-4 py-4 animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards]">
      <div className="flex flex-col gap-2 mb-8 sm:mb-12">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#7C2D12] font-bold">
          The Seasonal Menu Matches
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1A1A1A]">
          We found {recipes.length} tailored selections
        </h2>
        <p className="text-[#6E6A64] font-sans text-sm sm:text-base max-w-[600px] mt-2 leading-relaxed">
          These real recipes closely match your customized gastro-coordinates. Select any option to view the detailed pantry ingredients matrix and cooking layout.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {recipes.map((r) => (
          <div
            key={r.id}
            onClick={() => onSelectRecipe(r)}
            className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden hover:shadow-[0_14px_35px_rgba(124,45,18,0.08)] cursor-pointer group flex flex-col h-full transition-all duration-300"
          >
            {/* Image banner */}
            <div className="w-full h-48 sm:h-56 bg-[#F2F1EE] overflow-hidden relative">
              <img
                src={r.image}
                alt={r.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className="bg-white/95 backdrop-blur-sm shadow-sm text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded text-[#7C2D12]">
                  {r.category}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); isSaved(r.id) ? onUnsave(r.id) : onSave(r); }}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all cursor-pointer ${
                  isSaved(r.id)
                    ? 'bg-[#7C2D12] text-white'
                    : 'bg-white/95 backdrop-blur-sm text-[#6E6A64] hover:text-[#7C2D12]'
                }`}
                aria-label={isSaved(r.id) ? 'Remove from saved' : 'Save recipe'}
              >
                {isSaved(r.id)
                  ? <BookmarkCheck className="w-3.5 h-3.5" />
                  : <Bookmark className="w-3.5 h-3.5" />
                }
              </button>
            </div>

            {/* Core copy */}
            <div className="p-5 flex flex-col flex-1 gap-2.5">
              <span className="font-mono text-[10px] text-[#6E6A64] uppercase tracking-wider block">
                {r.area} Cuisine
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] group-hover:text-[#7C2D12] transition-colors leading-snug line-clamp-2">
                {r.name}
              </h3>
              <p className="text-xs sm:text-sm text-[#6E6A64] line-clamp-3 leading-relaxed mt-1 mb-3">
                {r.instructions || 'An exquisite composition using matching fresh ingredients.'}
              </p>
              
              <div className="mt-auto pt-4 border-t border-[#f3f1ed] flex items-center justify-between text-[#6E6A64]">
                <span className="flex items-center gap-1 text-[11px] font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#7C2D12]" /> {r.prepTime}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono">
                  <Flame className="w-3.5 h-3.5 text-amber-600" /> {r.cookTime}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center pt-8 border-t border-black/[0.08]">
        <p className="text-xs text-[#6E6A64] font-sans mb-4">
          Not seeing the ideal flavor coordinates you wanted today?
        </p>
        <button
          onClick={onRegenerate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white hover:bg-[#7C2D12] rounded-xl font-sans text-xs font-bold transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4" /> Try Fresh Wildcard Search
        </button>
      </div>
    </div>
  );
};
