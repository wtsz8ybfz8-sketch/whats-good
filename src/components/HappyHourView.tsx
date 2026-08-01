/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ParsedRecipe } from '../types';
import { getHappyHourStatus, compareHappyHour, formatDays, type HappyHourStatus } from '../venueExtras';
import { CAPE_TOWN_HAPPY_HOURS, HAPPY_HOUR_CITY, mapsUrl, type CuratedHappyHour } from '../happyHourData';
import { fetchVenues, formatPriceTier, isPlacesConfigured } from '../placesService';
import type { Venue } from '../venue';
import { LoadingState, ErrorState } from './StatusStates';
import { MapPin, Clock, Navigation, Martini, Star } from 'lucide-react';

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
/** Directions for a live Places result. NOT `mapsUrl` — that one appends "Cape Town". */
const barMapsUrl = (name: string, address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

/**
 * Live bars for a city we have no curated windows for.
 *
 * Every field rendered here is one Google actually returned. There is no price band
 * invented, no "vibe", and above all no drinks deal — the whole point is that this is
 * the truthful thing we CAN say everywhere, sitting where an apology used to be.
 */
const BarList: React.FC<{ bars: Venue[]; city?: string }> = ({ bars, city }) => {
  const openCount = bars.filter((b) => b.openNow === true).length;

  if (bars.length === 0) {
    return (
      <div className="mt-8 text-center py-10">
        <p className="font-serif text-2xl mb-2">No bars came back for {city}</p>
        <p className="text-sm text-[var(--text-muted)]">
          Google returned nothing for that search. Try the Find tab for places to eat instead.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
          Bars in {city}
        </p>
        <span className="font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] text-[var(--accent-terracotta)] font-bold">
          Live from Google
        </span>
      </div>

      <h2 className="font-serif text-3xl sm:text-4xl leading-[1.05] tracking-tight">
        {openCount > 0 ? (
          <>
            <span className="text-[var(--accent-terracotta)]">{openCount} open</span> right now
          </>
        ) : (
          <>Nothing open right now</>
        )}
      </h2>

      {/* The honest caveat, stated once and plainly. These are bars, not confirmed
          deals — saying otherwise is the exact harm the curated list exists to avoid. */}
      <p className="text-sm leading-relaxed text-[var(--text-muted)] mt-3 max-w-[520px]">
        Open hours are live from Google. <strong className="font-semibold text-[var(--charcoal)]">
        No happy-hour prices are confirmed in {city}</strong> — these are bars, not deals.
        Ask at the bar what is on.
      </p>

      <ul className="stagger flex flex-col xl:grid xl:grid-cols-2 xl:gap-x-12 mt-5">
        {bars.map((b) => {
          const price = formatPriceTier(b.priceTier);
          return (
            <li key={b.id}>
              <a
                href={barMapsUrl(b.name, b.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left py-5 border-b border-[var(--row-border)] flex flex-col sm:flex-row items-start gap-1.5 sm:gap-4 group cursor-pointer press min-h-[44px]"
              >
                {/* `undefined` is not `false`. Google publishes no hours for some venues,
                    and claiming "Closed" for those would be inventing a fact. */}
                <div className="w-auto sm:w-[78px] flex-shrink-0 pt-0.5">
                  {b.openNow === true ? (
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[var(--accent-terracotta)]" />
                      <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold">
                        Open
                      </span>
                    </span>
                  ) : b.openNow === false ? (
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
                      Closed
                    </span>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
                      Hours n/a
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                    <h3 className="font-serif text-lg leading-tight sm:truncate group-hover:text-[var(--accent-terracotta)] transition-colors">
                      {b.name}
                    </h3>
                    {b.hoursToday && (
                      <span className="font-mono text-xs tabular-nums whitespace-nowrap sm:flex-shrink-0 text-[var(--text-muted)]">
                        {b.hoursToday}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-subtle)] flex-wrap mt-2">
                    {typeof b.rating === 'number' && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        <span className="tabular-nums">{b.rating}</span>
                        {typeof b.userRatingCount === 'number' && (
                          <span className="tabular-nums">({b.userRatingCount})</span>
                        )}
                      </span>
                    )}
                    {price && <span className="tabular-nums">{price}</span>}
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {b.address}
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
    </div>
  );
};

export const HappyHourView: React.FC<HappyHourViewProps> = ({ city }) => {
  // Re-tick every minute so countdowns stay honest without a render storm.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  /**
   * A way OUT of the uncovered state.
   *
   * The tab was a dead end for everyone outside one city: an honest sentence, and then
   * nothing to do. §5's Recover stage is explicit that "closed, empty, wrong or offline"
   * must still offer a way forward, and a New Yorker opening this got a wall.
   *
   * The escape is deliberately not a search and not a guess — it shows the one city whose
   * windows are actually confirmed, on request, labelled as that city throughout. Google
   * publishes no happy-hour data at any pricing tier, so there is nothing to fetch and
   * this costs no request. Opt-in, never automatic: browsing another city's list because
   * you asked is useful, being silently shown it is the "asserted-as-local" failure the
   * coverage model above exists to prevent.
   */
  const [showCoveredCity, setShowCoveredCity] = useState(false);

  const rawCoverage = happyHourCoverage(city);
  const coverage = rawCoverage === 'not-covered' && showCoveredCity ? 'unknown-city' : rawCoverage;
  const covered = coverage !== 'not-covered';
  const browsingOtherCity = rawCoverage === 'not-covered' && showCoveredCity;

  /**
   * The one filter this screen actually needs. Standing on a street at 18:40, "what
   * can I still get to" and "what is on later" are different questions, and the tab
   * previously answered neither — it printed nine rows in one undifferentiated list.
   * Filtering real, human-confirmed windows by their live state is a real preference
   * acting on real data: the count in the headline moves with it.
   */
  const [when, setWhen] = useState<'all' | 'live' | 'today'>('all');

  /**
   * THE ANSWER FOR EVERY CITY THAT IS NOT THE ONE CURATED CITY.
   *
   * Happy-hour PRICING cannot be had for an arbitrary city: Google publishes none at any
   * tier, so the only truthful source is a human typing it in, and that is why coverage
   * is one city. What Google DOES publish, everywhere on earth, is which bars exist, if
   * they are open right now, and until when. That is most of the question someone
   * standing on a street is actually asking, and it was being withheld from everyone
   * outside Cape Town in favour of an apology.
   *
   * So the uncovered state now offers real, live bars nearby. It is deliberately NOT
   * called a happy hour and carries no prices — presenting a bar listing as a drinks
   * deal would be the invented-fact failure (§8) wearing a new costume. The copy says
   * what it is: open now, ask at the bar.
   *
   * OPT-IN, one tap, never automatic. Two Text Search calls fire only when the button is
   * pressed, which is the same cost as one ordinary search on the Find tab and nothing
   * at all for a user who never opens this tab.
   */
  const [bars, setBars] = useState<Venue[] | null>(null);
  const [barsState, setBarsState] = useState<'idle' | 'loading' | 'error' | 'unconfigured'>('idle');

  const loadBars = async () => {
    if (!city) return;
    setBarsState('loading');
    const outcome = await fetchVenues('cocktail bar', city);
    if (outcome.status === 'ok') {
      // Open now first — the only ordering that matches why someone opened this tab.
      // `=== true` and not truthiness: `false` is a real answer and `undefined` means
      // Google published no hours, and those two must not collapse into each other.
      const openFirst = [...outcome.venues].sort(
        (a, b) => Number(b.openNow === true) - Number(a.openNow === true),
      );
      setBars(openFirst);
      setBarsState('idle');
    } else {
      setBars(null);
      setBarsState(outcome.status === 'unconfigured' ? 'unconfigured' : 'error');
    }
  };

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
          {/* The way forward. Named city, named count — so the tap is a decision, not a
              mystery — and it reveals data already in the bundle, so it costs nothing. */}
          {/* The primary way forward, and the one that works in this user's own city.
              Listed FIRST because it is about where they are actually standing. */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {isPlacesConfigured() && (
              <button
                type="button"
                onClick={loadBars}
                disabled={barsState === 'loading'}
                className="hit-44 press inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] border border-[var(--accent-terracotta)] cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Martini className="w-4 h-4" strokeWidth={1.75} />
                {barsState === 'loading' ? 'Finding bars…' : `Bars open now in ${city}`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCoveredCity(true)}
              className="hit-44 press inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] text-[var(--accent-terracotta)] cursor-pointer transition-colors hover:border-[var(--accent-terracotta)]"
            >
              See {HAPPY_HOUR_CITY}&rsquo;s {CAPE_TOWN_HAPPY_HOURS.length} confirmed windows
            </button>
          </div>
        </div>

        {barsState === 'loading' && (
          <div className="mt-6">
            <LoadingState count={3} />
          </div>
        )}

        {barsState === 'error' && (
          <div className="mt-6">
            <ErrorState
              title="Could not reach Google just then"
              message="The bar search did not come back. Your connection or Google's — either way, trying again is worth a tap."
              onRetry={loadBars}
            />
          </div>
        )}

        {barsState === 'unconfigured' && (
          <div className="mt-6">
            <ErrorState
              tone="notice"
              showRetry={false}
              title="Live bar search is not switched on"
              message="This build has no Google Places key, so nearby bars cannot be looked up. The confirmed windows above still work."
              onRetry={loadBars}
            />
          </div>
        )}

        {bars !== null && barsState === 'idle' && <BarList bars={bars} city={city} />}
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
        {/* Two different reasons to be looking at another city's list, and they must not
            share a sentence. "We do not know where you are" is false once the user has
            explicitly asked for this city — they told us where they are, we simply have
            no data for it. Saying otherwise would be the app misreporting its own state. */}
        {browsingOtherCity ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-4 max-w-[520px]">
            Showing {HAPPY_HOUR_CITY} — nothing is confirmed in {city} yet. These windows
            are real, they are just not near you.{' '}
            <button
              type="button"
              onClick={() => setShowCoveredCity(false)}
              className="underline underline-offset-2 text-[var(--accent-terracotta)] cursor-pointer bg-transparent border-0 p-0 font-inherit"
            >
              Back to {city}
            </button>
          </p>
        ) : coverage === 'unknown-city' ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-4 max-w-[520px]">
            You are seeing {HAPPY_HOUR_CITY} because we do not know where you are yet.
            Set your location in the header to check your own city.
          </p>
        ) : null}
        {liveCount > 0 ? (
          <h2 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            <span className="text-[var(--accent-terracotta)]">{liveCount} live</span> right now
          </h2>
        ) : (
          <h2 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            Nothing pouring yet
          </h2>
        )}
        {/* "updates every minute" was not true and was the most dangerous kind of untrue.

            `CAPE_TOWN_HAPPY_HOURS` is a static, hand-curated array. Nothing about the
            listings updates, ever — no feed, no fetch, no revalidation. What recomputes
            each minute is the live/soon/later STATUS, derived from the reader's clock
            against times a human wrote down.

            Saying "updates every minute" over that invites someone to cross town on the
            strength of a price that was confirmed at an unknown date, which is exactly
            the harm §8 describes. The caption now names both halves for what they are:
            the times are human-confirmed, the status is computed live. */}
        <p className="font-mono text-xs text-[var(--text-muted)] mt-3">
          Showing {entries.length} of {allEntries.length} hand-confirmed venue
          {allEntries.length === 1 ? '' : 's'} · live status
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
