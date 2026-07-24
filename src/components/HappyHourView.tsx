/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { getVenueExtras, getHappyHourStatus, compareHappyHour, formatDays, type HappyHourStatus, type HappyHour } from '../venueExtras';
import { MapPin, Clock, ChevronRight, Martini } from 'lucide-react';

interface HappyHourViewProps {
  recipes: ParsedRecipe[];
  onSelectRecipe: (recipe: ParsedRecipe) => void;
}

interface Entry {
  recipe: ParsedRecipe;
  hh: HappyHour;
  status: HappyHourStatus;
}

/**
 * The one question this screen answers: "where can I get a drink deal right now, and
 * how long have I got." Everything sorts and styles by time remaining — a venue whose
 * window closes in 20 minutes is a different proposition to one starting Thursday, and
 * the interface has to say so at a glance rather than making you read every card.
 */
export const HappyHourView: React.FC<HappyHourViewProps> = ({ recipes, onSelectRecipe }) => {
  // Re-tick every minute so countdowns stay honest without a render storm.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const entries = useMemo<Entry[]>(() => {
    return recipes
      .map((recipe) => {
        const raw = (recipe as any).rawEatery;
        const extras = getVenueExtras(recipe.id, raw?.priceSymbol, raw?.signatureOrder, raw?.signatureDescription);
        if (!extras.happyHour) return null;
        return { recipe, hh: extras.happyHour, status: getHappyHourStatus(extras.happyHour, now) };
      })
      .filter((e): e is Entry => e !== null)
      .sort((a, b) => compareHappyHour(a.status, b.status));
  }, [recipes, now]);

  const liveCount = entries.filter((e) => e.status.state === 'live').length;

  if (entries.length === 0) {
    return (
      <div className="px-6 sm:px-10 py-20 text-center">
        <Martini className="w-8 h-8 mx-auto mb-4 text-[var(--text-subtle)]" strokeWidth={1.5} />
        <p className="font-serif text-2xl mb-2">No happy hours yet</p>
        <p className="font-mono text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
          Run a search first — happy hours are pulled from whichever venues come back.
        </p>
      </div>
    );
  }

  return (
    // Desktop gets the width it has. A single 820px column of short rows on a 1440px
    // screen is most of the screen doing nothing.
    <div className="max-w-[820px] xl:max-w-[1180px] mx-auto w-full px-6 sm:px-10 pb-[120px] md:pb-16">

      {/* Status header — the focal element is the live count, nothing else competes */}
      <div className="pt-2 pb-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <p className="font-mono text-[10px] uppercase tracking-[0.09em] text-[var(--text-subtle)]">
            Happy Hour
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.07em] px-2 py-0.5 rounded-full border border-[var(--rule)] text-[var(--text-subtle)]">
            Sample data
          </span>
        </div>
        {liveCount > 0 ? (
          <h2 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            <span className="text-[var(--accent-terracotta)]">{liveCount} live</span> right now
          </h2>
        ) : (
          <h2 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            Nothing pouring yet
          </h2>
        )}
        <p className="font-mono text-[11px] text-[var(--text-muted)] mt-3">
          {entries.length} venue{entries.length === 1 ? '' : 's'} with a regular window ·
          updates every minute
        </p>
      </div>

      {/* Two columns from xl. Rows stay full-width below that so the deal list never
          gets squeezed into an unreadable measure. */}
      <ul className="stagger flex flex-col xl:grid xl:grid-cols-2 xl:gap-x-12">
        {entries.map(({ recipe, hh, status }) => {
          const isLive = status.state === 'live';
          const isSoon = status.state === 'starting-soon';
          const urgent = isLive && status.minutes <= 45;

          return (
            <li key={recipe.id}>
              <button
                onClick={() => onSelectRecipe(recipe)}
                className="w-full text-left py-5 border-b border-[var(--row-border)] flex items-start gap-4 group cursor-pointer press"
              >
                {/* Time column — fixed width so every row's status aligns and scans vertically */}
                <div className="w-[78px] flex-shrink-0 pt-0.5">
                  {isLive ? (
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="absolute inline-flex w-full h-full rounded-full bg-[var(--accent-terracotta)] opacity-60 motion-safe:animate-ping" />
                        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[var(--accent-terracotta)]" />
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--accent-terracotta)] font-bold">
                        Live
                      </span>
                    </span>
                  ) : (
                    // Left column carries URGENCY only; the exact time is on the right and the
                    // day range sits in the metadata row. Showing "Wed–Fri" here read as a
                    // contradiction next to "Tomorrow" once today's window had closed.
                    <span className={`font-mono text-[10px] uppercase tracking-[0.07em] ${isSoon ? 'text-[var(--charcoal)]' : 'text-[var(--text-subtle)]'}`}>
                      {isSoon ? 'Soon' : status.state === 'later-today' ? 'Today' : 'Upcoming'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-lg leading-tight truncate group-hover:text-[var(--accent-terracotta)] transition-colors">
                      {recipe.name}
                    </h3>
                    <span
                      className={`font-mono text-[10px] tabular-nums whitespace-nowrap ${
                        urgent ? 'text-[var(--accent-terracotta)] font-bold' : isLive ? 'text-[var(--charcoal)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--text-subtle)] mt-1.5 mb-2.5">
                    {hh.headline}
                  </p>

                  {/* Deals — the actual reason to go, so they get real weight not a tooltip */}
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {hh.deals.map((d) => (
                      <li key={d} className="font-mono text-[11px] text-[var(--charcoal)] flex items-center gap-1.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--accent-terracotta)] flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--text-subtle)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDays(hh.days)}
                    </span>
                    {recipe.tags[1] && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {recipe.tags[1]}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1 text-[var(--text-subtle)] group-hover:text-[var(--accent-terracotta)] group-hover:translate-x-0.5 transition-all" />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="font-mono text-[10px] text-[var(--text-subtle)] mt-6 leading-relaxed">
        These windows are illustrative placeholders, not real listings — Google Places publishes no
        happy-hour data. Treat none of them as confirmed until a real source is wired in.
      </p>
    </div>
  );
};
