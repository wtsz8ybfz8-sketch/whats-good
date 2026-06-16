/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from'react';
import { Dimensions, ActiveTab, ParsedRecipe, Meal } from'./types';
import { mapCoordinatesToQueries, parseMealToRecipe } from'./recipeUtils';
import { Sidebar } from'./components/Sidebar';
import { RecipeView } from'./components/RecipeView';
import { LoadingState, ErrorState, EmptyState } from'./components/StatusStates';
import { Sparkles, Dices, Heart, Trash2, ArrowRight, Search, Compass, MapPin, Navigation } from'lucide-react';
import { SOUTH_AFRICAN_EATERIES } from'./campusData';

export const EATERY_IMAGES: Record<string, string> = {
'eat-kloof-house':'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80',
'eat-kloof-street-house':'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80', // Aliased
'eat-nandos-rondebosch':'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
'eat-oceanbasket-claremont':'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
'eat-hudsons-claremont':'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
'eat-chefswarehouse':'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
'eat-roxy-latenight':'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80',
'eat-bellybeast':'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
'eat-cocoawah':'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
'eat-codfather-campsbay':'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
'eat-fyn-dining':'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
'eat-jonkershuis-constantia':'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
'eat-truth-coffee':'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
'eat-jerrys-gardens':'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
'eat-gold-restaurant':'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&q=80',
'eat-pot-luck-club':'https://images.unsplash.com/photo-1582163628468-b30f81d86f78?auto=format&fit=crop&w=800&q=80',
'eat-baia-seafood':'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
'eat-mzansi':'https://images.unsplash.com/photo-1627907228181-ed85d8363a0a?auto=format&fit=crop&w=800&q=80',
'eat-test-kitchen':'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?auto=format&fit=crop&w=800&q=80',
'eat-arnolds':'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80',
'eat-clarkes':'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
'eat-rust-en-vrede':'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
'eat-tokara':'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=80',
'eat-volkskombuis':'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=800&q=80',
};

// Haversine formula to compute actual spherical distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
 const R = 6371; // radius of Earth in km
 const dLat = (lat2 - lat1) * Math.PI / 180;
 const dLon = (lon2 - lon1) * Math.PI / 180;
 const a = 
 Math.sin(dLat/2) * Math.sin(dLat/2) +
 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
 Math.sin(dLon/2) * Math.sin(dLon/2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
 return R * c;
}

export default function App() {
 const [activeTab, setActiveTab] = useState<ActiveTab>('mood');
 const [prevTab, setPrevTab] = useState<ActiveTab>('mood');
 const [dimensions, setDimensions] = useState<Dimensions>({
 vibe: null,
 regional: null,
 capacity: null,
 searchQuery:'',
 locationMode:'dineout',
 });

 const [recipes, setRecipes] = useState<ParsedRecipe[]>([]);
 const [selectedRecipe, setSelectedRecipe] = useState<ParsedRecipe | null>(null);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Premium tactical geolocation tracking
 const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
 const [locState, setLocState] = useState<'idle' |'requesting' |'granted' |'denied'>('idle');

 // Trigger position query cleanly
 const requestUserLocation = () => {
 if (!navigator.geolocation) {
 setLocState('denied');
 return;
 }
 setLocState('requesting');
 navigator.geolocation.getCurrentPosition(
 (position) => {
 setUserCoords({
 latitude: position.coords.latitude,
 longitude: position.coords.longitude,
 });
 setLocState('granted');
 },
 (err) => {
 console.warn("Client geolocation denied or timed out:", err);
 setLocState('denied');
 },
 { timeout: 6000 }
);
 };

 // Initialize saved recipes from localStorage
 const [savedRecipes, setSavedRecipes] = useState<ParsedRecipe[]>(() => {
 try {
 const stored = localStorage.getItem('whats_good_saved_v1');
 return stored ? JSON.parse(stored) : [];
 } catch {
 return [];
 }
 });

 const savedIds = savedRecipes.map((r) => r.id);

 const handleToggleSave = (recipe: ParsedRecipe) => {
 setSavedRecipes((prev) => {
 const isSaved = prev.some((r) => r.id === recipe.id);
 let updated;
 if (isSaved) {
 updated = prev.filter((r) => r.id !== recipe.id);
 } else {
 updated = [...prev, recipe];
 }
 localStorage.setItem('whats_good_saved_v1', JSON.stringify(updated));
 return updated;
 });
 };

 const handleClearAllSaved = () => {
 setSavedRecipes([]);
 localStorage.removeItem('whats_good_saved_v1');
 };

 // Switch tabs and clean up states
 const handleTabSwitch = (tab: ActiveTab) => {
 setPrevTab(activeTab);
 setActiveTab(tab);
 setRecipes([]);
 setSelectedRecipe(null);
 setError(null);
 };

 const resetHome = () => {
 handleTabSwitch('mood');
 setDimensions({
 vibe: null,
 regional: null,
 capacity: null,
 searchQuery:'',
 locationMode:'dineout',
 });
 };

 // Synchronously update results when coordinate selections change to create a fluid real-time reaction
 useEffect(() => {
 // Only auto-trigger when on the Main Mood tab to avoid hijacking Saved or Serendipity views
 if (activeTab ==='mood') {
 handleTriggerMatch();
 }
 }, [dimensions.locationMode, dimensions.vibe, dimensions.regional, dimensions.capacity, userCoords]);

 // Perform fetching from TheMealDB or local structures
 const handleTriggerMatch = async (customQuery?: string, customMode?:'dineout' |'gourmet') => {
 setIsLoading(true);
 setError(null);
 setRecipes([]);
 setSelectedRecipe(null);

 try {
 const activeMode = customMode || dimensions.locationMode;
 if (activeMode ==='dineout') {
 const tempRecipes: ParsedRecipe[] = [];
 SOUTH_AFRICAN_EATERIES.forEach((eatery) => {
 // Price filter (stored in capacity) - bypass if a specific customQuery is provided
 const priceFilter = customQuery ? null : dimensions.capacity;
 if (priceFilter && eatery.priceSymbol !== priceFilter) return;

 // Cuisine Focus filter - bypass if customQuery is provided
 const cuisineFilter = customQuery ? null : dimensions.regional;
 if (cuisineFilter && eatery.cuisine.toLowerCase().indexOf(cuisineFilter.toLowerCase()) === -1) return;

 // Vibe Filter - bypass if customQuery is provided
 const vibeFilter = customQuery ? null : dimensions.vibe;
 if (vibeFilter && eatery.vibeMatch !== vibeFilter) return;

 // Search query filter
 const query = (customQuery !== undefined ? customQuery : dimensions.searchQuery).trim().toLowerCase();
 if (query) {
 const nameMatch = eatery.name.toLowerCase().includes(query);
 const addrMatch = eatery.address.toLowerCase().includes(query);
 const signatureMatch = eatery.signatureOrder.toLowerCase().includes(query);
 const cuisineMatch = eatery.cuisine.toLowerCase().includes(query);
 if (!nameMatch && !addrMatch && !signatureMatch && !cuisineMatch) return;
 }

 // Real distance computation if coordinates are available
 let distanceStr = eatery.fallbackDistance;
 let distVal = 999999;
 if (userCoords) {
 const dist = getDistance(userCoords.latitude, userCoords.longitude, eatery.latitude, eatery.longitude);
 distVal = dist;
 distanceStr = `${dist.toFixed(1)} km away`;
 }

 // Image URL heuristics
 const imgUrl = EATERY_IMAGES[eatery.id] ||'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80';

 tempRecipes.push({
 id: eatery.id,
 name: eatery.name,
 category: eatery.cuisine,
 area:'Cape Town, ZA',
 instructions: `${eatery.signatureDescription}\n\nDining Notes: Located at ${eatery.address}. Proximity distance from you is ${distanceStr}. Double check active partner deals below!`,
 image: imgUrl,
 tags: [
 eatery.vibeMatch,
 distanceStr,
 eatery.priceSymbol,
'Partner special'
 ],
 ingredients: eatery.signatureIngredients,
 steps: [
 `Determine spatial transit down to ${eatery.address} (${distanceStr}).`,
 `Present What's Good app deal on arrival: ${eatery.voucherOffer}`,
 `Savor our high-vibe recommended plate order: ${eatery.signatureOrder}.`,
 `Confirm ingredients align with digestive needs: ${eatery.signatureIngredients.join(',')}.`,
 `Lock in seating reservation or order dispatch below.`
 ],
 prepTime: eatery.estimatedWait,
 cookTime: eatery.priceSymbol,
 serves:'South African Serve',
 gutTip: eatery.digestiveNote,
 source: eatery.externalLink,
 distanceVal: distVal,
 rawEatery: eatery,
 distanceStr,
 } as any);
 });

 // Sort by key coordinate proximity if user location is allowed
 if (userCoords) {
 tempRecipes.sort((a: any, b: any) => (a.distanceVal || 0) - (b.distanceVal || 0));
 }

 setRecipes(tempRecipes);
 if (tempRecipes.length === 1) {
 setSelectedRecipe(tempRecipes[0]);
 }
 } else {
 // GOURMET RECIPES FROM THEMEALDB
 let finalMeals: Meal[] = [];
 const directSearchText = customQuery !== undefined ? customQuery : dimensions.searchQuery.trim();

 if (directSearchText) {
 const res = await fetch(
 `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(directSearchText)}`
);
 const data = await res.json();
 finalMeals = data.meals || [];
 } else {
 const terms = mapCoordinatesToQueries(dimensions.vibe, dimensions.regional);
 const fetchPromises = terms.slice(0, 3).map(async (term) => {
 try {
 const res = await fetch(
 `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`
);
 const data = await res.json();
 return (data.meals as Meal[]) || [];
 } catch {
 return [];
 }
 });

 const resultsArray = await Promise.all(fetchPromises);
 const aggregated = resultsArray.flat();

 const seenIds = new Set<string>();
 finalMeals = aggregated.filter((m) => {
 if (!m.idMeal || seenIds.has(m.idMeal)) return false;
 seenIds.add(m.idMeal);
 return true;
 });

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
 const parsed = finalMeals.map((m) => parseMealToRecipe(m, dimensions.capacity));
 setRecipes(parsed);
 
 if (parsed.length === 1) {
 setSelectedRecipe(parsed[0]);
 } else {
 setSelectedRecipe(null);
 }
 }
 }
 } catch (err) {
 console.error('Error fetching recipes:', err);
 setError('Connection disrupted. We were unable to safely retrieve the requested real recipe metrics.');
 } finally {
 setIsLoading(false);
 }
 };

 // Finds South African restaurants matching the flavor profile / category of a selected recipe
 const handleFindCorrespondingRestaurants = (recipe: ParsedRecipe) => {
 const nameLower = recipe.name.toLowerCase();
 const catLower = (recipe.category ||'').toLowerCase();
 const ingredientsLower = recipe.ingredients.map(i => i.toLowerCase());

 let matchedQuery ='';

 // Check key cuisine pairings
 if (
 catLower.includes('chicken') || 
 nameLower.includes('chicken') || 
 nameLower.includes('peri') || 
 ingredientsLower.some(i => i.includes('chicken') || i.includes('poultry'))
) {
 matchedQuery ='chicken';
 } else if (
 catLower.includes('seafood') || 
 catLower.includes('fish') || 
 nameLower.includes('fish') || 
 nameLower.includes('seafood') || 
 nameLower.includes('squid') || 
 nameLower.includes('prawn') || 
 nameLower.includes('shrimp') || 
 nameLower.includes('tuna') || 
 nameLower.includes('salmon') ||
 ingredientsLower.some(i => i.includes('fish') || i.includes('shrimp') || i.includes('prawn') || i.includes('tuna') || i.includes('salmon') || i.includes('seafood'))
) {
 matchedQuery ='seafood';
 } else if (
 catLower.includes('burger') || 
 nameLower.includes('burger') || 
 nameLower.includes('patty') ||
 ingredientsLower.some(i => i.includes('burger') || i.includes('patty'))
) {
 matchedQuery ='burger';
 } else if (
 catLower.includes('beef') || 
 nameLower.includes('beef') || 
 nameLower.includes('steak') || 
 nameLower.includes('meat') || 
 nameLower.includes('rib') || 
 nameLower.includes('lamb') || 
 nameLower.includes('fillet') ||
 ingredientsLower.some(i => i.includes('beef') || i.includes('lamb') || i.includes('steak') || i.includes('meat') || i.includes('fillet'))
) {
 matchedQuery ='beef';
 } else if (
 catLower.includes('dessert') || 
 nameLower.includes('dessert') || 
 nameLower.includes('cake') || 
 nameLower.includes('sweet') || 
 nameLower.includes('chocolate') || 
 nameLower.includes('cocoa') ||
 ingredientsLower.some(i => i.includes('chocolate') || i.includes('sugar') || i.includes('sweet'))
) {
 matchedQuery ='sweet';
 } else if (
 nameLower.includes('cheese') || 
 nameLower.includes('toast') || 
 nameLower.includes('bread') || 
 nameLower.includes('sandwich') ||
 ingredientsLower.some(i => i.includes('cheese') || i.includes('bread') || i.includes('toast'))
) {
 matchedQuery ='cheese';
 } else {
 // Fallback: Use some ingredient or first word of the recipe name
 matchedQuery = recipe.ingredients[0] || recipe.name.split('')[0] ||'';
 }

 // Now update dimensions, switch mode to dineout, and trigger the match immediately
 const updatedDims: Dimensions = {
 ...dimensions,
 locationMode:'dineout',
 vibe: null,
 regional: null,
 capacity: null,
 searchQuery: matchedQuery,
 };

 setDimensions(updatedDims);
 setActiveTab('mood');
 setSelectedRecipe(null);
 handleTriggerMatch(matchedQuery,'dineout');
 };

 // Serendipity engine random match fetcher
 const handleRandomWildcard = async () => {
 setIsLoading(true);
 setError(null);
 setRecipes([]);
 setSelectedRecipe(null);

 try {
 if (dimensions.locationMode ==='dineout') {
 const randomEatery = SOUTH_AFRICAN_EATERIES[Math.floor(Math.random() * SOUTH_AFRICAN_EATERIES.length)];
 
 const imgUrl = EATERY_IMAGES[randomEatery.id] ||'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80';

 let distanceStr = randomEatery.fallbackDistance;
 if (userCoords) {
 const dist = getDistance(userCoords.latitude, userCoords.longitude, randomEatery.latitude, randomEatery.longitude);
 distanceStr = `${dist.toFixed(1)} km away`;
 }

 const parsed: ParsedRecipe = {
 id: randomEatery.id,
 name: randomEatery.name,
 category: randomEatery.cuisine,
 area:'Cape Town, ZA',
 instructions: `${randomEatery.signatureDescription}\n\nRecommended Order: ${randomEatery.signatureOrder}`,
 image: imgUrl,
 tags: [
 randomEatery.vibeMatch,
 distanceStr,
 randomEatery.priceSymbol,
'Eatery'
 ],
 ingredients: randomEatery.signatureIngredients,
 steps: [
 `Determine spatial coordinates towards ${randomEatery.address} (${distanceStr}).`,
 `Redeem exclusive deal Voucher: ${randomEatery.voucherOffer}`,
 `Dine premium with delicious choice: ${randomEatery.signatureOrder}`
 ],
 prepTime: randomEatery.estimatedWait,
 cookTime: randomEatery.priceSymbol,
 serves:'Custom Plate',
 gutTip: randomEatery.digestiveNote,
 source: randomEatery.externalLink,
 };

 setRecipes([parsed]);
 setSelectedRecipe(parsed);
 } else {
 // Gourmet Wildcard Search
 const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
 const data = await res.json();
 const meals = (data.meals as Meal[]) || [];
 
 if (meals.length > 0) {
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
 }
 } catch (err) {
 console.error('Error fetching random recipe:', err);
 setError('Connection disrupted. Unable to find a recipe.');
 } finally {
 setIsLoading(false);
 }
 };

 const tabOrder: ActiveTab[] = ['mood','random','saved-recipes','saved-eateries'];
 const isSlideRight = tabOrder.indexOf(activeTab) >= tabOrder.indexOf(prevTab);

 if (selectedRecipe) {
 return (
 <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#111111] text-[#1A1A1A] dark:text-[#f5f5f5] antialiased">
 <main className="p-6 sm:p-10 lg:p-16 flex flex-col justify-start overflow-y-auto min-h-screen bg-[#FAF9F6] dark:bg-[#111111] relative overflow-x-hidden max-w-7xl mx-auto">
 <RecipeView
 recipes={recipes.length > 0 ? recipes : savedRecipes}
 selectedRecipe={selectedRecipe}
 onSelectRecipe={setSelectedRecipe}
 onRegenerate={activeTab ==='random' ? handleRandomWildcard : () => handleTriggerMatch()}
 isRandomMode={activeTab ==='random'}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 isSavedTab={activeTab ==='saved-recipes' || activeTab ==='saved-eateries'}
 onFindCorrespondingRestaurants={handleFindCorrespondingRestaurants}
 />
 </main>
 </div>
);
 }

 return (
 <div className="min-h-screen flex flex-col relative bg-[#FAF9F6] dark:bg-[#111111] text-[#1A1A1A] dark:text-[#f5f5f5] antialiased">
 {/* Global Header */}
 <header className="h-[70px] bg-[#FAF9F6] dark:bg-[#111111] backdrop-blur-md flex items-center justify-between px-6 lg:px-12 fixed top-0 left-0 right-0 z-50 border-b border-black dark:border-[#444] select-none">
 {/* Logo */}
 <div 
 className="flex items-center gap-2.5 cursor-pointer group hover:opacity-80 transition-opacity" 
 onClick={resetHome}
 role="button"
 tabIndex={0}
 >
 <div className="w-6.5 h-6.5 bg-[#1A1A1A] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center transform transition-transform group-hover:scale-105">
 <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
 <path
 d="M12 3C8 3 5 7 5 11c0 3 1.5 5.5 4 7v2h6v-2c2.5-1.5 4-4 4-7 0-4-3-8-7-8z"
 fill="white"
 />
 </svg>
 </div>
 <div className="font-serif text-xl sm:text-[22px] font-extrabold tracking-tight flex items-center gap-1.5 select-none">
 <span>What's</span> <span className="text-[#7C2D12] dark:text-[#fca5a5] italic font-normal">Good</span>
 <span className="text-[10px] bg-black dark:bg-[#222222] text-white px-1.5 py-0.5 rounded-lg font-mono tracking-wider font-bold ml-1">Cape Town</span>
 </div>
 </div>

 {/* Header Right Segment with GPS Sorting & Tab Selector */}
 <div className="flex items-center gap-3">
 <button
 id="location-header-toggle"
 onClick={requestUserLocation}
 className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-mono font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer select-none active:scale-95 ${
 locState ==='granted'
 ?'bg-emerald-50/60 border-emerald-500/20 text-emerald-800'
 : locState ==='requesting'
 ?'bg-amber-50/60 border-amber-500/20 text-amber-800 animate-pulse'
 : locState ==='denied'
 ?'bg-red-50/60 border-red-500/20 text-red-800'
 :'bg-black dark:bg-[#222222] border-black dark:border-[#444] hover:bg-black dark:bg-[#222222] text-[#6E6A64] dark:text-[#a3a3a3]'
 }`}
 >
 <MapPin className={`w-3.5 h-3.5 ${locState ==='granted' ?'text-emerald-600 animate-pulse' :'text-[#6E6A64] dark:text-[#a3a3a3]'}`} />
 <span>{locState ==='granted' ?'GPS Active' : locState ==='requesting' ?'GPS...' :'Sort Nearby'}</span>
 </button>

 <nav className="flex bg-[#F2F1EE] dark:bg-[#222222] p-1 rounded-full sm:gap-0.5 whitespace-nowrap overflow-x-auto no-scrollbar max-w-[50vw]">
 <button
 onClick={() => handleTabSwitch('mood')}
 className={`px-3 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer ${
 activeTab ==='mood'
 ?'bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white shadow-sm'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 Find
 </button>
 <button
 onClick={() => handleTabSwitch('random')}
 className={`px-3 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer ${
 activeTab ==='random'
 ?'bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white shadow-sm'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 Surprise Me
 </button>
 <button
 onClick={() => handleTabSwitch('saved-recipes')}
 className={`px-3 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
 activeTab ==='saved-recipes'
 ?'bg-blue-900 text-white shadow-sm'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 <Heart className={`w-3 h-3 ${activeTab ==='saved-recipes' ?'text-white fill-current' :'text-blue-900'}`} />
 <span>Recipes ({savedRecipes.filter((r) => !r.id.startsWith('eat')).length})</span>
 </button>
 <button
 onClick={() => handleTabSwitch('saved-eateries')}
 className={`px-3 sm:px-[18px] py-1.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
 activeTab ==='saved-eateries'
 ?'bg-[#7C2D12] text-white shadow-sm'
 :'text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#1A1A1A] dark:text-[#f5f5f5]'
 }`}
 >
 <Heart className={`w-3 h-3 ${activeTab ==='saved-eateries' ?'text-white fill-current' :'text-[#7C2D12] dark:text-[#fca5a5]'}`} />
 <span>Eateries ({savedRecipes.filter((r) => r.id.startsWith('eat')).length})</span>
 </button>
 </nav>
 </div>
 </header>

 {/* Main Layout Grid wrapper */}
 <div className="flex-1 pt-[70px] flex flex-col relative w-full items-center">
 {/* Sidebar as a drop-down/high-end legend filter section */}
 <div 
 className={`transition-all duration-500 overflow-hidden w-full max-w-4xl mx-auto ${
 activeTab ==='mood' && recipes.length === 0 ?'max-h-[1500px] opacity-100 mt-6' :'max-h-0 opacity-0 pointer-events-none hover:max-h-[1500px] hover:opacity-100 hover:pointer-events-auto hover:mt-6'
 }`}
 >
 <div className="bg-white dark:bg-[#1a1a1a] border border-black dark:border-[#444] rounded-3xl shadow-sm p-2 mb-6">
 <Sidebar
 dimensions={dimensions}
 onChange={setDimensions}
 onTriggerMatch={() => handleTriggerMatch()}
 isLoading={isLoading && activeTab ==='mood'}
 />
 </div>
 </div>

 {/* Hover area to trigger filters */}
 {activeTab ==='mood' && recipes.length > 0 && (
 <div className="w-full h-8 flex justify-center -mt-4 z-40 relative group cursor-pointer" onClick={() => setRecipes([])}>
 <div className="bg-white dark:bg-[#1a1a1a] border border-black dark:border-[#444] shadow-sm rounded-full px-4 py-1 flex items-center gap-2 group-hover:bg-[#FAF2F0] dark:bg-[#7C2D12]/20 group-hover:border-[#F5D1C9] dark:border-[#7C2D12]/40 transition-all transform -translate-y-2 group-hover:translate-y-0">
 <span className="text-[10px] uppercase font-mono font-bold text-[#6E6A64] dark:text-[#a3a3a3] group-hover:text-[#7C2D12] dark:text-[#fca5a5]">Hover to Adjust Filters</span>
 </div>
 </div>
)}

 {/* Right detailed journal screen content pane */}
 <main className="p-6 sm:p-10 lg:p-16 flex flex-col justify-start overflow-y-auto min-h-[calc(100vh-70px)] w-full max-w-7xl mx-auto relative overflow-x-hidden">

 <div
 key={activeTab}
 className={`w-full flex-1 flex flex-col justify-start ${
 isSlideRight ?'animate-ios-slide-in-right' :'animate-ios-slide-in-left'
 }`}
 >
 {activeTab ==='mood' ? (
 // MOOD CORNER CANVAS
 isLoading ? (
 <LoadingState />
) : error ? (
 <ErrorState title="Something went wrong" message={error} onRetry={() => handleTriggerMatch()} />
) : recipes.length > 0 ? (
 <RecipeView
 recipes={recipes}
 selectedRecipe={selectedRecipe}
 onSelectRecipe={setSelectedRecipe}
 onRegenerate={() => handleTriggerMatch()}
 isRandomMode={false}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 onFindCorrespondingRestaurants={handleFindCorrespondingRestaurants}
 />
) : dimensions.searchQuery ? (
 <div className="max-w-[450px] mx-auto text-center py-16 px-8 bg-white dark:bg-[#1a1a1a] backdrop-blur-md rounded-3xl border border-black dark:border-[#444]">
 <div className="w-12 h-12 rounded-full bg-[#FAF2F0] dark:bg-[#7C2D12]/20 border border-[#F5D1C9] dark:border-[#7C2D12]/40 flex items-center justify-center mx-auto mb-4">
 <Search className="w-5 h-5 text-[#7C2D12] dark:text-[#fca5a5]" />
 </div>
 <h3 className="font-serif text-xl font-bold mb-2 text-[#1A1A1A] dark:text-[#f5f5f5]">No Matching Recipes</h3>
 <p className="text-xs text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed mb-6">
 We scanned the entire index for"{dimensions.searchQuery}" but returned zero active matches. Try searching simpler tags like"Pasta","Egg","Pie", or"Curry".
 </p>
 <button
 onClick={() => handleTriggerMatch('Chicken')}
 className="px-5 py-2.5 bg-[#7C2D12] hover:bg-[#5E220E] text-white text-xs font-bold rounded-2xl cursor-pointer shadow-sm transition-transform active:scale-95"
 >
 Try searching"Chicken"
 </button>
 </div>
) : (
 <EmptyState onSearchRandom={() => { handleTabSwitch('random'); }} />
)
) : activeTab ==='random' ? (
 // SERENDIPITY ENGINE CANVAS
 isLoading ? (
 <LoadingState
 title="Finding something good..."
 subtitle="Let fate decide."
 />
) : error ? (
 <ErrorState title="That didn't work" message={error} onRetry={handleRandomWildcard} />
) : recipes.length > 0 && selectedRecipe ? (
 <RecipeView
 recipes={recipes}
 selectedRecipe={selectedRecipe}
 onSelectRecipe={setSelectedRecipe}
 onRegenerate={handleRandomWildcard}
 isRandomMode={true}
 savedIds={savedIds}
 onToggleSave={handleToggleSave}
 onFindCorrespondingRestaurants={handleFindCorrespondingRestaurants}
 />
) : (
 <div className="max-w-[620px] mx-auto text-center py-12 sm:py-20 px-8 bg-[#1A1A1A] dark:bg-[#2a2a2a] text-white rounded-2xl shadow-[0_20px_50px_rgba(124,45,18,0.15)] my-auto animate-[revealUp_0.6s_cubic-bezier(0.15,1,0.3,1)_forwards] border border-black dark:border-[#444]">
 <div className="w-12 h-12 bg-white dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-6">
 <Dices className="w-6 h-6 text-[#FAF2F0]" />
 </div>
 <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
 Not sure what you want?
 </h2>
 <p className="text-[#6E6A64] dark:text-[#a3a3a3] text-sm leading-relaxed max-w-[440px] mx-auto mb-8">
 Let us just pick something for you. No filters, no overthinking — just good food.
 </p>
 <button
 onClick={handleRandomWildcard}
 className="bg-white dark:bg-[#1a1a1a] text-[#1A1A1A] dark:text-[#f5f5f5] hover:bg-[#FAF2F0] dark:bg-[#7C2D12]/20 active:scale-95 transition-all px-8 py-4 rounded-xl font-serif text-base font-semibold shadow-md cursor-pointer inline-flex items-center gap-2"
 >
 <Sparkles className="w-4 h-4 text-[#7C2D12] dark:text-[#fca5a5]" /> Surprise me
 </button>
 </div>
)
) : (
 // SAVED RECIPES OR EATERIES COLLECTION TAB
 <div className="max-w-[720px] mx-auto w-full animate-[revealUp_0.5s_cubic-bezier(0.15,1,0.3,1)_forwards]">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black dark:border-[#444] pb-6 mb-8 gap-4">
 <div>
 <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#7C2D12] dark:text-[#fca5a5] font-bold block mb-1">
 Pantry Archives
 </span>
 <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] dark:text-[#f5f5f5]">
 {activeTab ==='saved-recipes' ?'Saved Recipes' :'Saved Eateries'}
 </h2>
 <p className="text-[#6E6A64] dark:text-[#a3a3a3] font-sans text-sm mt-1">
 A personalized selection of your saved {activeTab ==='saved-recipes' ?'dishes for home cooking' :'local restaurants'}.
 </p>
 </div>
 {(activeTab ==='saved-recipes' ? savedRecipes.filter(r => !r.id.startsWith('eat')) : savedRecipes.filter(r => r.id.startsWith('eat'))).length > 0 && (
 <button
 onClick={handleClearAllSaved}
 className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
 >
 <Trash2 className="w-3.5 h-3.5" /> Clear All
 </button>
)}
 </div>

 {(activeTab ==='saved-recipes' ? savedRecipes.filter(r => !r.id.startsWith('eat')) : savedRecipes.filter(r => r.id.startsWith('eat'))).length === 0 ? (
 <div className="text-center py-16 sm:py-24 px-4 flex flex-col items-center justify-center border border-dashed border-black dark:border-[#444] bg-white dark:bg-[#1a1a1a] rounded-2xl">
 <div className="w-14 h-14 rounded-full bg-[#FAF2F0] dark:bg-[#7C2D12]/20 flex items-center justify-center mb-6 border border-[#F5D1C9] dark:border-[#7C2D12]/40">
 <Heart className="w-6 h-6 text-[#7C2D12] dark:text-[#fca5a5]" />
 </div>
 <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#f5f5f5] mb-2 leading-tight">
 Your Vault Awaits
 </h3>
 <p className="text-xs sm:text-sm text-[#6E6A64] dark:text-[#a3a3a3] leading-relaxed max-w-[360px] mb-8">
 You haven't saved any {activeTab ==='saved-recipes' ?'recipes' :'eateries'} yet.
 </p>
 <button
 onClick={() => handleTabSwitch('mood')}
 className="inline-flex items-center gap-2 px-6 py-3 bg-[#7C2D12] hover:bg-[#5E220E] text-white rounded-xl font-sans text-xs font-bold shadow-md transition-all cursor-pointer"
 >
 Explore Mood Interface
 </button>
 </div>
) : (
 <div className="flex flex-col gap-4">
 {(activeTab ==='saved-recipes' ? savedRecipes.filter(r => !r.id.startsWith('eat')) : savedRecipes.filter(r => r.id.startsWith('eat'))).map((r) => (
 <div
 key={r.id}
 onClick={() => setSelectedRecipe(r)}
 className="bg-white dark:bg-[#1a1a1a] border border-black dark:border-[#444] hover:border-black dark:border-[#444] hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] cursor-pointer rounded-2xl p-4 flex items-center gap-4 group transition-all duration-300 transform hover:-translate-y-0.5"
 >
 {/* Thumbnail image */}
 <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#F2F1EE] dark:bg-[#222222] flex-shrink-0 border border-black dark:border-[#444]">
 <img
 src={r.image}
 alt={r.name}
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
 />
 </div>

 {/* Title and metadata details */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-mono text-[9px] uppercase tracking-wider bg-[#FAF2F0] dark:bg-[#7C2D12]/20 text-[#7C2D12] dark:text-[#fca5a5] px-2 py-0.5 rounded font-bold">
 {r.id.startsWith('eat') ? (r as any).rawEatery?.cuisine : r.category}
 </span>
 <span className="font-mono text-[9px] text-[#6E6A64] dark:text-[#a3a3a3] uppercase">
 {r.id.startsWith('eat') ? r.tags[1] : r.area} Culture
 </span>
 </div>
 <h4 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-[#f5f5f5] truncate group-hover:text-[#7C2D12] dark:text-[#fca5a5] transition-colors leading-tight">
 {r.id.startsWith('eat') ? (r as any).rawEatery?.name || r.name : r.name}
 </h4>
 </div>

 {/* Action column */}
 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleToggleSave(r);
 }}
 className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6E6A64] dark:text-[#a3a3a3] hover:text-[#7C2D12] dark:text-[#fca5a5] hover:bg-[#FAF2F0] dark:bg-[#7C2D12]/20 transition-colors"
 title="Remove from saved"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
))}
 </div>
)}
 </div>
)}
 </div>
 </main>
 </div>

 {/* Persistent Geolocation FAB / Quick Toggle Indicator */}
 <div 
 id="location-quick-toggle"
 className="fixed bottom-6 right-6 z-[100] transition-all duration-300 transform hover:scale-[1.03]"
 >
 <button
 onClick={requestUserLocation}
 disabled={locState ==='requesting'}
 className={`flex items-center gap-2.5 px-4.5 py-3 rounded-full shadow-[0_12px_30px_rgba(0,0,0,0.12)] border text-xs font-bold transition-all duration-300 cursor-pointer select-none active:scale-95 ${
 locState ==='granted'
 ?'bg-white dark:bg-[#1a1a1a] border-black dark:border-[#444] hover:border-emerald-500 text-emerald-800'
 : locState ==='requesting'
 ?'bg-white dark:bg-[#1a1a1a] border-black dark:border-[#444] text-[#6E6A64] dark:text-[#a3a3a3]'
 : locState ==='denied'
 ?'bg-[#FAF2F0] dark:bg-[#7C2D12]/20 border-red-200/50 hover:border-red-300 text-red-800'
 :'bg-[#1A1A1A] dark:bg-[#2a2a2a] border-[#1A1A1A] hover:bg-neutral-800 text-white'
 }`}
 >
 {locState ==='granted' ? (
 <>
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
 </span>
 <MapPin className="w-4 h-4 text-emerald-600" />
 <div className="text-left text-xs">
 <div className="font-sans font-extrabold leading-none">Sorted Nearby</div>
 <div className="text-[9px] font-mono font-normal opacity-70 mt-0.5">Location Access On</div>
 </div>
 </>
) : locState ==='requesting' ? (
 <>
 <svg className="animate-spin h-3.5 w-3.5 text-[#7C2D12] dark:text-[#fca5a5]" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
 </svg>
 <div className="text-left text-xs">
 <div className="font-sans font-extrabold leading-none text-[#1A1A1A] dark:text-[#f5f5f5]">Pinging GPS...</div>
 <div className="text-[9px] font-mono font-normal text-[#6E6A64] dark:text-[#a3a3a3] mt-0.5">Requesting coordinate access</div>
 </div>
 </>
) : locState ==='denied' ? (
 <>
 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
 <MapPin className="w-4 h-4 text-red-500 opacity-60" />
 <div className="text-left text-xs">
 <div className="font-sans font-extrabold leading-none">Location Disabled</div>
 <div className="text-[9px] font-mono font-normal opacity-75 mt-0.5">Click to try again</div>
 </div>
 </>
) : (
 <>
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C2D12]/20 opacity-50"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5D1C9]"></span>
 </span>
 <Navigation className="w-4 h-4 text-[#F5D1C9]" />
 <div className="text-left text-xs text-white">
 <div className="font-sans font-extrabold leading-none">Enable Location</div>
 <div className="text-[9px] text-[#A2A8A8] font-mono font-normal mt-0.5">Sort eateries by proximity</div>
 </div>
 </>
)}
 </button>
 </div>
 </div>
);
}
