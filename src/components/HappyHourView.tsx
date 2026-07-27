/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { getHappyHourStatus, compareHappyHour, formatDays, type HappyHourStatus } from '../venueExtras';
import { CAPE_TOWN_HAPPY_HOURS, HAPPY_HOUR_CITY, mapsUrl, type CuratedHappyHour } from '../happyHourData';
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
 * Three states, not two. Rendering Cape Town venues to someone who has told us they
 * are in London is the failure this gate exists to prevent — but "we don't know where
 * you are yet" is NOT that. It was being treated as a mismatch, so with no city set
 * the tab rendered its empty state to everybody and the only real content in the app
 * became unreachable.
 *
 * Unknown city => show the listings, clearly labelled with the city they belong to.
 * Disclosed is honest; asserted-as-local is not.
 */
export type Coverage = 'covered' | 'unknown-city' | 'not-covered';

export const happyHourCoverage = (city?: string): Coverage => {
  const c = (city ?? '').trim();
  if (!c) return 'unknown-city';
  return c.toLowerCase() === HAPPY_HOUR_CITY.toLowerCase() ? 'covered' : 'not-covered';
};

/** True when there is something to show — used for the tab's live-deal dot. */
export const hasHappyHourData = (city?: string) => happyHourCoverage(city) !== 'not-covered';

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

  const coverage = happyHourCoverage(city);
  const covered = coverage !== 'not-covered';

  /**
   * The one filter this screen actually needs. Standing on a street at 18:40, "what
   * can I still get to" and "what is on later" are different questions, and the tab
   * previously answered neither — it printed nine rows in one undifferentiated list.
   * Filtering real, human-confirmed windows by their live state is a real preference
   * acting on real data: the count in the headline moves with it.
   */
  const [when, setWhen] = useState<'all' | 'live' | 'today'>('all');

  const allEntries = useMemo<Entry[]>(() => {
    if (!covered) return [];
    return CAPE_TOWN_HAPPY_HOURS
      .map((hh) => ({ hh, status: getHappyHourStatus(hh, now) }))
      .sort((a, b) => compareHappyHour(a.status, b.status));
  }, [now, covered]);

  const entries = useMemo<Entry[]>(() => {
    if (when === 'live') return allEntries.filter((e) => e.status.state === 'live');
    if (when === 'today') {
      return allEntries.filter((e) => e.status.state !== 'another-day');
    }
    return allEntries;
  }, [allEntries, when]);

  const liveCount = allEntries.filter((e) => e.status.state === 'live').length;
  // "On today" means anything not on another day — live, starting soon, or later this
  // evening. Excluding `later-today` made this filter identical to "Live now" in every
  // realistic case: two controls, one result, one of them pointless.
  const todayCount = allEntries.filter((e) => e.status.state !== 'another-day').length;

  const filters: { key: typeof when; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allEntries.length },
    { key: 'live', label: 'Live now', count: liveCount },
    { key: 'today', label: 'On today', count: todayCount },
  ];

  if (!covered) {
    return (
      <div className="max-w-[820px] mx-auto w-full sm:px-10 pb-[calc(var(--tabbar-h)+2rem+env(safe-area-inset-bottom))] md:pb-16">
        <div className="surface rounded-3xl px-7 py-12 text-center mt-2">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-tint)] border border-[var(--accent-tint-border)] flex items-center justify-center mx-auto mb-5">
            <Martini className="w-5 h-5 text-[var(--accent-terracotta)]" strokeWidth={1.75} />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl leading-[1.1] tracking-tight mb-3">
            No confirmed happy hours in {city} yet
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] max-w-[380px] mx-auto">
            Google publishes no happy-hour data, so every window here is confirmed by a
            human first. {HAPPY_HOUR_CITY} is covered today. We would rather show you
            nothing than send you across town for a deal that does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Desktop gets the width it has. A single 820px column of short rows on a 1440px
    // screen is most of the screen doing nothing.
    <div className="max-w-[820px] xl:max-w-[1180px] mx-auto w-full sm:px-10 pb-[calc(var(--tabbar-h)+2rem+env(safe-area-inset-bottom))] md:pb-16">

      {/* Status header — the focal element is the live count, nothing else competes */}
      <div className="pt-2 pb-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
            Happy Hour
          </p>
          <span className="font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] text-[var(--accent-terracotta)] font-bold">
            Real listings · {HAPPY_HOUR_CITY}
          </span>
        </div>
        {/* Shown only when we are guessing. The user gets the content AND the reason
            they are seeing this city rather than theirs — one tap from correcting it. */}
        {coverage === 'unknown-city' && (
          <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-4 max-w-[520px]">
            You are seeing {HAPPY_HOUR_CITY} because we do not know where you are yet.
            Set your location in the header to check your own city.
          </p>
        )}
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
          Showing {entries.length} of {allEntries.length} confirmed venue
          {allEntries.length === 1 ? '' : 's'} · updates every minute
        </p>

        {/* One row, three states — not the carousel CLAUDE.md 11.4 forbids. */}
        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by time">
          {filters.map((f) => {
            const active = when === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                disabled={f.count === 0 && f.key !== 'all'}
                onClick={() => setWhen(f.key)}
                className={`press hit-44 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border-[var(--accent-terracotta)]'
                    : 'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 tabular-nums ${active ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
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
                className="w-full text-left py-5 border-b border-[var(--row-border)] flex flex-col sm:flex-row items-start gap-1.5 sm:gap-4 group cursor-pointer press min-h-[44px]"
              >
                {/* Time column — fixed width so every row's status aligns and scans vertically */}
                <div className="w-auto sm:w-[78px] flex-shrink-0 pt-0.5">
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

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                    <h3 className="font-serif text-lg leading-tight sm:truncate group-hover:text-[var(--accent-terracotta)] transition-colors">
                      {hh.venue}
                    </h3>
                    <span
                      className={`font-mono text-xs tabular-nums whitespace-nowrap sm:flex-shrink-0 ${
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
          <p className="font-serif text-2xl mb-2">Nothing live right now</p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {allEntries.length} venue{allEntries.length === 1 ? '' : 's'} have a window later.
          </p>
          <button
            type="button"
            onClick={() => setWhen('all')}
            className="press hit-44 px-5 py-2.5 rounded-full text-[13px] font-medium border border-[var(--rule)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)] cursor-pointer"
          >
            Show all {allEntries.length}
          </button>
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
