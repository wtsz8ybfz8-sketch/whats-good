/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Dimensions, ActiveTab, ParsedRecipe, Meal } from './types';
import { fetchMealsByCoordinates, parseMealToRecipe } from './recipeUtils';
import { useSavedRecipes } from './useSavedRecipes';
import { Sidebar } from './components/Sidebar';
import { RecipeView } from './components/RecipeView';
import { LoadingState, ErrorState, EmptyState } from './components/StatusStates';
import { HealthProfile, useHealthProfile } from './components/HealthProfile';
import { Sparkles, Dices, Bookmark } from 'lucide-react';

export default function App() {
  const { condition, dietary, setProfile, clearProfile, pillLabel } = useHealthProfile();
  const { savedRecipes, saveRecipe, unsaveRecipe, isSaved } = useSavedRecipes();

  const [activeTab, setActiveTab] = useState<ActiveTab>('mood');
  const [dimensions, setDimensions] = useState<Dimensions>({
    vibe: null,
    regional: null,
    capacity: null,
    searchQuery: '',
  });

  const [recipes, setRecipes] = useState<ParsedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<ParsedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch tabs and clean up states
  const handleTabSwitch = (tab: ActiveTab) => {
    setActiveTab(tab);
    setRecipes([]);
    setSelectedRecipe(null);
    setError(null);
  };

  // Perform fetching from TheMealDB
  const handleTriggerMatch = async (customQuery?: string) => {
    setIsLoading(true);
    setError(null);
    setRecipes([]);
    setSelectedRecipe(null);

    try {
      let finalMeals: Meal[] = [];

      // Check if direct name search query exists; sanitise to letters, numbers, spaces, hyphens only
      const raw = customQuery !== undefined ? customQuery : dimensions.searchQuery.trim();
      const directSearchText = raw.replace(/[^a-zA-Z0-9 -]/g, '').trim();

      if (directSearchText) {
        // Query search by name
        const res = await fetch(
          `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(directSearchText)}`
        );
        const data = await res.json();
        finalMeals = data.meals || [];
      } else {
        // Find recipes by mood coordinates using area/category filter endpoints
        finalMeals = await fetchMealsByCoordinates(dimensions.vibe, dimensions.regional);

        // Sort based on capacity if chosen
        if (dimensions.capacity) {
          finalMeals.sort((a, b) => {
            const aIngCount = Object.keys(a).filter(k => k.startsWith('strIngredient') && a[k]?.trim()).length;
            const bIngCount = Object.keys(b).filter(k => k.startsWith('strIngredient') && b[k]?.trim()).length;

            if (dimensions.capacity?.includes('low')) {
              return aIngCount - bIngCount;
            } else if (dimensions.capacity?.includes('high')) {
              return bIngCount - aIngCount;
            }
            return 0;
          });
        }
      }

      if (finalMeals.length === 0) {
        setRecipes([]);
        setSelectedRecipe(null);
      } else {
        // Parse all meals using utility
        const parsed = finalMeals.map((m) => parseMealToRecipe(m, dimensions.capacity));
        setRecipes(parsed);
        
        // If there is only one match, auto-select it. Otherwise render compilation list.
        if (parsed.length === 1) {
          setSelectedRecipe(parsed[0]);
        } else {
          setSelectedRecipe(null);
        }
      }
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Connection disrupted. We were unable to safely retrieve the requested real recipe metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  // Serendipity engine random match fetcher
  const handleRandomWildcard = async () => {
    setIsLoading(true);
    setError(null);
    setRecipes([]);
    setSelectedRecipe(null);

    try {
      const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
      const data = await res.json();
      const meals = (data.meals as Meal[]) || [];
      
      if (meals.length > 0) {
        // Set randomized metadata capacities to feel premium and tailored
        const pooledCapacities = [
          'low effort, under 20 minutes',
          'medium effort, around 30 minutes',
          'high effort, I want to properly cook today',
        ];
        const randomCapacity = pooledCapacities[Math.floor(Math.random() * pooledCapacities.length)];
        
        const parsed = parseMealToRecipe(meals[0], randomCapacity);
        setRecipes([parsed]);
        setSelectedRecipe(parsed);
      } else {
        setError('Zero random meals were returned from the recipe archive.');
      }
    } catch (err) {
      console.error('Error fetching random recipe:', err);
      setError('Connection disrupted. The serendipity wildcard pipeline was unable to resolve a recipe.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#FAF9F6] text-[#1A1A1A] antialiased">
      {condition === null && <HealthProfile onSave={setProfile} />}

      {/* Global Header */}
      <header className="h-[70px] bg-[#FAF9F6]/85 backdrop-blur-md flex items-center justify-between px-6 lg:px-12 fixed top-0 left-0 right-0 z-50 border-b border-black/[0.08] select-none">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6.5 h-6.5 bg-[#1A1A1A] rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path
                d="M12 3C8 3 5 7 5 11c0 3 1.5 5.5 4 7v2h6v-2c2.5-1.5 4-4 4-7 0-4-3-8-7-8z"
                fill="white"
              />
            </svg>
          </div>
          <div className="font-serif text-xl sm:text-[22px] font-extrabold tracking-tight">
            What's <span className="text-[#7C2D12] italic font-normal">Good</span>
          </div>
        </div>

        {/* Tab switcher + health profile pill */}
        <div className="flex items-center gap-3">
          <nav className="flex bg-[#F2F1EE] p-1 rounded-full">
            <button
              onClick={() => handleTabSwitch('mood')}
              className={`px-4 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'mood'
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'text-[#6E6A64] hover:text-[#1A1A1A]'
              }`}
            >
              Mood Interface
            </button>
            <button
              onClick={() => handleTabSwitch('random')}
              className={`px-4 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'random'
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'text-[#6E6A64] hover:text-[#1A1A1A]'
              }`}
            >
              Serendipity Engine
            </button>
            <button
              onClick={() => handleTabSwitch('saved')}
              className={`px-4 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'text-[#6E6A64] hover:text-[#1A1A1A]'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              Saved
              {savedRecipes.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-[#7C2D12]/10 text-[#7C2D12]'
                }`}>
                  {savedRecipes.length}
                </span>
              )}
            </button>
          </nav>

          {pillLabel && (
            <div className="hidden sm:flex items-center gap-2 bg-[#F2F1EE] px-3 py-1.5 rounded-full">
              <span className="font-sans text-xs font-bold text-[#1A1A1A]">{pillLabel}</span>
              <button
                onClick={clearProfile}
                className="font-sans text-[10px] font-bold text-[#7C2D12] hover:underline cursor-pointer leading-none"
              >
                change
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout Grid wrapper */}
      <div className="flex-1 pt-[70px] grid grid-cols-1 lg:grid-cols-[450px_1fr] relative">
        {/* Sidebar Dashboard Left Panel */}
        <div
          className={`transition-all duration-300 ${
            activeTab !== 'mood' ? 'opacity-30 pointer-events-none' : 'opacity-100'
          }`}
        >
          <Sidebar
            dimensions={dimensions}
            onChange={setDimensions}
            onTriggerMatch={(q) => handleTriggerMatch(q)}
            isLoading={isLoading && activeTab === 'mood'}
          />
        </div>

        {/* Right detailed journal screen content pane */}
        <main className="p-6 sm:p-10 lg:p-16 flex flex-col justify-start overflow-y-auto min-h-[calc(100vh-70px)] bg-[#FAF9F6]">
          {activeTab === 'mood' ? (
            // MOOD CORNER CANVAS
            isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState title="Matrix Resolution Failed" message={error} onRetry={() => handleTriggerMatch()} />
            ) : recipes.length > 0 ? (
              <RecipeView
                recipes={recipes}
                selectedRecipe={selectedRecipe}
                onSelectRecipe={setSelectedRecipe}
                onRegenerate={() => handleTriggerMatch()}
                isRandomMode={false}
                isSaved={isSaved}
                onSave={saveRecipe}
                onUnsave={unsaveRecipe}
              />
            ) : dimensions.searchQuery ? (
              <div className="max-w-[450px] mx-auto text-center py-16">
                <span className="text-3xl mb-4 block">🔍</span>
                <h3 className="font-serif text-xl font-bold mb-2">No Matching Recipes</h3>
                <p className="text-xs text-[#6E6A64] leading-relaxed mb-6">
                  We scanned the entire index for "{dimensions.searchQuery}" but returned zero active matches. Try searching simpler culinary tags like "Pasta", "Egg", "Pie", or "Curry".
                </p>
                <button
                  onClick={() => handleTriggerMatch('Chicken')}
                  className="px-5 py-2.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Try searching "Chicken"
                </button>
              </div>
            ) : (
              <EmptyState onSearchRandom={() => { handleTabSwitch('random'); }} />
            )
          ) : activeTab === 'random' ? (
            // SERENDIPITY ENGINE CANVAS
            isLoading ? (
              <LoadingState
                title="Formulating Aromatic Wildcard Match"
                subtitle="Bypassing choice paradox routines... Isolating volatile compounds for metabolic optimization."
              />
            ) : error ? (
              <ErrorState title="Serendipity Failure" message={error} onRetry={handleRandomWildcard} />
            ) : recipes.length > 0 && selectedRecipe ? (
              <RecipeView
                recipes={recipes}
                selectedRecipe={selectedRecipe}
                onSelectRecipe={setSelectedRecipe}
                onRegenerate={handleRandomWildcard}
                isRandomMode={true}
                isSaved={isSaved}
                onSave={saveRecipe}
                onUnsave={unsaveRecipe}
              />
            ) : (
              <div className="max-w-[620px] mx-auto text-center py-12 sm:py-20 px-8 bg-[#1A1A1A] text-white rounded-2xl shadow-[0_20px_50px_rgba(124,45,18,0.15)] my-auto animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards] border border-black/[0.08]">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Dices className="w-6 h-6 text-[#FAF2F0]" />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
                  Bypass the Paradox<br />of Culinary Choice
                </h2>
                <p className="text-[#6E6A64] text-sm leading-relaxed max-w-[440px] mx-auto mb-8">
                  Bypassing structural decision loops entirely. Instantly triggers a randomized wildcard selection tailored seamlessly against your flavor metrics.
                </p>
                <button
                  onClick={handleRandomWildcard}
                  className="bg-white text-[#1A1A1A] hover:bg-[#FAF2F0] active:scale-95 transition-all px-8 py-4 rounded-xl font-serif text-base font-semibold shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#7C2D12]" /> Roll Kitchen Dice
                </button>
              </div>
            )
          ) : (
            // SAVED RECIPES CANVAS
            savedRecipes.length > 0 || selectedRecipe ? (
              <RecipeView
                recipes={savedRecipes}
                selectedRecipe={selectedRecipe}
                onSelectRecipe={setSelectedRecipe}
                onRegenerate={() => {}}
                isRandomMode={false}
                isSaved={isSaved}
                onSave={saveRecipe}
                onUnsave={(id) => { unsaveRecipe(id); setSelectedRecipe(null); }}
                isSavedMode={true}
              />
            ) : (
              <div className="max-w-[460px] mx-auto text-center py-16 sm:py-24 px-4 flex flex-col items-center justify-center animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
                <div className="w-14 h-14 rounded-full bg-[#F2F1EE] flex items-center justify-center mb-6">
                  <Bookmark className="w-6 h-6 text-[#6E6A64]" />
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-extrabold text-[#1A1A1A] mb-3">
                  Nothing saved yet
                </h3>
                <p className="text-sm text-[#6E6A64] leading-relaxed max-w-[320px]">
                  Find something good and bookmark it — your saved recipes will appear here.
                </p>
                <button
                  onClick={() => handleTabSwitch('mood')}
                  className="mt-8 px-6 py-3 bg-[#7C2D12] hover:bg-[#5E220E] text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Find Something Good
                </button>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
