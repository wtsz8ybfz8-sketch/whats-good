/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { getHappyHourStatus, compareHappyHour, formatDays, type HappyHourStatus } from '../venueExtras';
import { CAPE_TOWN_HAPPY_HOURS, mapsUrl, type CuratedHappyHour } from '../happyHourData';
import { MapPin, Clock, Navigation, Martini } from 'lucide-react';

interface HappyHourViewProps {
  // Kept for API compatibility with the tab router; the happy-hour list is now real
  // curated data, not derived from the search results.
  recipes?: ParsedRecipe[];
  onSelectRecipe?: (recipe: ParsedRecipe) => void;
  /** The city the header is showing. Curated data only exists for some cities. */
  city?: string;
}

/**
 * The curated set is Cape Town only. Rendering nine Rand-priced Cape Town venues to
 * someone standing in London is the same failure as the fabricated menus we tore out:
 * it is invented-for-this-user data wearing a "REAL LISTINGS" badge. Until a city has
 * human-confirmed windows in `happyHourData.ts`, it gets an honest empty state.
 */
export const hasHappyHourData = (city?: string) =>
  (city ?? '').trim().toLowerCase() === 'cape town';

interface Entry {
  hh: CuratedHappyHour;
  status: HappyHourStatus;
}

/**
 * The one question this screen answers: "where can I get a drink deal right now, and
 * how long have I got." Everything sorts and styles by time remaining — a window that
 * closes in 20 minutes is a different proposition to one starting Thursday.
 *
 * The venues and windows are REAL (see `happyHourData.ts`), collected from local
 * happy-hour guides and confirmed July 2026. Times can still change, so each row links
 * to directions and the footer says to confirm before travelling.
 */
export const HappyHourView: React.FC<HappyHourViewProps> = ({ city }) => {
  // Re-tick every minute so countdowns stay honest without a render storm.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const covered = hasHappyHourData(city);

  const entries = useMemo<Entry[]>(() => {
    if (!covered) return [];
    return CAPE_TOWN_HAPPY_HOURS
      .map((hh) => ({ hh, status: getHappyHourStatus(hh, now) }))
      .sort((a, b) => compareHappyHour(a.status, b.status));
  }, [now, covered]);

  const liveCount = entries.filter((e) => e.status.state === 'live').length;

  if (!covered) {
    return (
      <div className="max-w-[820px] mx-auto w-full sm:px-10 pb-[120px] md:pb-16">
        <div className="surface rounded-3xl px-7 py-12 text-center mt-2">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-tint)] border border-[var(--accent-tint-border)] flex items-center justify-center mx-auto mb-5">
            <Martini className="w-5 h-5 text-[var(--accent-terracotta)]" strokeWidth={1.75} />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl leading-[1.1] tracking-tight mb-3">
            No confirmed happy hours in {city || 'this city'} yet
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] max-w-[380px] mx-auto">
            Google publishes no happy-hour data, so every window here is confirmed by a
            human first. Cape Town is covered today. We would rather show you nothing
            than send you across town for a deal that does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Desktop gets the width it has. A single 820px column of short rows on a 1440px
    // screen is most of the screen doing nothing.
    <div className="max-w-[820px] xl:max-w-[1180px] mx-auto w-full sm:px-10 pb-[120px] md:pb-16">

      {/* Status header — the focal element is the live count, nothing else competes */}
      <div className="pt-2 pb-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
            Happy Hour
          </p>
          <span className="font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] text-[var(--accent-terracotta)] font-bold">
            Real listings · Cape Town
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
        <p className="font-mono text-xs text-[var(--text-muted)] mt-3">
          {entries.length} real venue{entries.length === 1 ? '' : 's'} with a happy hour ·
          updates every minute
        </p>
      </div>

      {/* Two columns from xl. Rows stay full-width below that so the deal list never
          gets squeezed into an unreadable measure. */}
      <ul className="stagger flex flex-col xl:grid xl:grid-cols-2 xl:gap-x-12">
        {entries.map(({ hh, status }) => {
          const isLive = status.state === 'live';
          const isSoon = status.state === 'starting-soon';
          const urgent = isLive && status.minutes <= 45;

          return (
            <li key={hh.venue}>
              <a
                href={mapsUrl(hh.venue, hh.area)}
                target="_blank"
                rel="noopener noreferrer"
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
                      <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold">
                        Live
                      </span>
                    </span>
                  ) : (
                    <span className={`font-mono text-xs uppercase tracking-wider ${isSoon ? 'text-[var(--charcoal)]' : 'text-[var(--text-subtle)]'}`}>
                      {isSoon ? 'Soon' : status.state === 'later-today' ? 'Today' : 'Upcoming'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-lg leading-tight truncate group-hover:text-[var(--accent-terracotta)] transition-colors">
                      {hh.venue}
                    </h3>
                    <span
                      className={`font-mono text-xs tabular-nums whitespace-nowrap ${
                        urgent ? 'text-[var(--accent-terracotta)] font-bold' : isLive ? 'text-[var(--charcoal)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mt-1.5 mb-2.5">
                    {hh.headline}
                  </p>

                  {/* Deals — the actual reason to go, so they get real weight not a tooltip */}
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {hh.deals.map((d) => (
                      <li key={d} className="font-mono text-xs text-[var(--charcoal)] flex items-center gap-1.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--accent-terracotta)] flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-subtle)] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDays(hh.days)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {hh.area}
                    </span>
                    <span className="flex items-center gap-1 text-[var(--accent-terracotta)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Navigation className="w-3 h-3" /> Directions
                    </span>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      {entries.length === 0 && (
        <div className="py-16 text-center">
          <Martini className="w-8 h-8 mx-auto mb-4 text-[var(--text-subtle)]" strokeWidth={1.5} />
          <p className="font-serif text-2xl">No happy hours listed</p>
        </div>
      )}

      <p className="font-mono text-xs text-[var(--text-subtle)] mt-6 leading-relaxed">
        Real venues and windows, collected from local happy-hour guides and confirmed July 2026.
        Happy-hour times change without notice — tap a venue for directions and confirm before you travel.
        Sources: {' '}
        {[...new Map(CAPE_TOWN_HAPPY_HOURS.map((h) => [h.sourceLabel, h.source])).entries()].map(
          ([label, url], i, arr) => (
            <React.Fragment key={label}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent-terracotta)]">
                {label}
              </a>
              {i < arr.length - 1 ? ', ' : '.'}
            </React.Fragment>
          ),
        )}
      </p>
    </div>
  );
};
