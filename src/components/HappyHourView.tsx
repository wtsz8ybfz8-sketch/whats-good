import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Moon, Sparkles } from 'lucide-react';
import { CAPE_TOWN_HAPPY_HOURS, type CuratedHappyHour } from '../happyHourData';
import type { ParsedRecipe } from '../types';

interface HappyHourViewProps {
  recipes: ParsedRecipe[];
  onSelectRecipe: (recipe: ParsedRecipe) => void;
  city: string;
  onExploreLateNight?: () => void; 
}

interface ProcessedHappyHour extends CuratedHappyHour {
  minutesRemaining?: number;
  isLive: boolean;
  isUpcoming: boolean;
  timeDisplay: string;
}

export function HappyHourView({ recipes, onSelectRecipe, city, onExploreLateNight }: HappyHourViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentDay = currentTime.getDay();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const absoluteMinutes = currentHour * 60 + currentMinute;

  const processedHours: ProcessedHappyHour[] = CAPE_TOWN_HAPPY_HOURS.filter((hh) => hh.days.includes(currentDay)).map((hh) => {
    const startMinutes = hh.startHour * 60;
    const endMinutes = hh.endHour * 60;
    
    const isLive = absoluteMinutes >= startMinutes && absoluteMinutes < endMinutes;
    const isUpcoming = absoluteMinutes < startMinutes;
    
    let minutesRemaining = 0;
    let timeDisplay = `${hh.startHour}:00 - ${hh.endHour}:00`;

    if (isLive) {
      minutesRemaining = endMinutes - absoluteMinutes;
      timeDisplay = minutesRemaining < 60 
        ? `Ends in ${minutesRemaining}m` 
        : `Ends at ${hh.endHour}:00`;
    } else if (isUpcoming) {
      const minutesUntil = startMinutes - absoluteMinutes;
      timeDisplay = minutesUntil < 60 
        ? `Starts in ${minutesUntil}m` 
        : `Starts at ${hh.startHour}:00`;
    }

    return { ...hh, isLive, isUpcoming, minutesRemaining, timeDisplay };
  });

  const liveDeals = processedHours.filter((hh) => hh.isLive).sort((a, b) => (a.minutesRemaining || 0) - (b.minutesRemaining || 0));
  const upcomingDeals = processedHours.filter((hh) => hh.isUpcoming).sort((a, b) => a.startHour - b.startHour);

  if (liveDeals.length === 0 && upcomingDeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-[revealUp_0.4s_ease-out]">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-quiet-bg)] flex items-center justify-center mb-6 border border-[var(--rule)]">
          <Moon className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-[var(--heading-color)] mb-3">
          Happy Hours have wrapped up.
        </h2>
        <p className="text-[var(--text-muted)] max-w-[40ch] mb-8 leading-relaxed">
          The deals in {city || 'this area'} are done for the day, but the night isn't. Let's pivot to late-night dining and drinks.
        </p>
        <button
          onClick={onExploreLateNight}
          className="hit-44 inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] rounded-xl font-sans font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Sparkles className="w-4 h-4" /> Find Late Night Spots
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto pb-12 animate-[revealUp_0.4s_ease-out]">
      <div className="mb-8 px-4 sm:px-0">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--heading-color)] tracking-tight">
          Active Deals
        </h2>
        <p className="text-[var(--text-muted)] mt-2">
          Curated specials in {city || 'your area'}, calculated for right now.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {liveDeals.length > 0 && (
          <section>
            <div className="flex flex-col gap-4">
              {liveDeals.map((deal, idx) => (
                <div key={idx} className="surface rounded-2xl p-5 border border-[var(--accent-tint-border)] shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent-terracotta)]" />
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[var(--charcoal)]">{deal.venue}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{deal.area.split('·')[0].trim()}</span>
                      </div>
                    </div>
                    <div className="bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm motion-safe:animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      {deal.timeDisplay}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-2">{deal.headline}</p>
                    <ul className="flex flex-col gap-1.5">
                      {deal.deals.map((d, i) => (
                        <li key={i} className="text-[15px] text-[var(--charcoal)] flex items-start gap-2">
                          <span className="text-[var(--accent-terracotta)] mt-0.5">•</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {upcomingDeals.length > 0 && (
          <section className="mt-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-4 px-4 sm:px-0">
              Starting Later
            </h3>
            <div className="flex flex-col gap-3">
              {upcomingDeals.map((deal, idx) => (
                <div key={idx} className="surface-quiet rounded-xl p-4 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity border border-[var(--rule)]">
                  <div>
                    <h4 className="font-serif text-lg font-medium text-[var(--charcoal)]">{deal.venue}</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{deal.headline}</p>
                  </div>
                  <div className="text-sm font-medium text-[var(--charcoal)] bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
                    {deal.timeDisplay}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
