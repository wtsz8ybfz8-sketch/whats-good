import React, { useEffect, useState } from 'react';
import { fetchVenues, formatPriceTier, isPlacesConfigured } from '../placesService';
import type { Venue } from '../venue';
import { ErrorState, LoadingState } from './StatusStates';
import { MapPin, Martini, Navigation, Star } from 'lucide-react';

interface HappyHourViewProps {
  city?: string;
}

const mapsUrl = (name: string, address: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

const BarList: React.FC<{ bars: Venue[]; city: string }> = ({ bars, city }) => {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const openCount = bars.filter((bar) => bar.openNow === true).length;
  const visibleBars = onlyOpen ? bars.filter((bar) => bar.openNow === true) : bars;

  if (bars.length === 0) {
    return (
      <div className="mt-8 py-12 text-center">
        <Martini className="mx-auto mb-4 h-8 w-8 text-[var(--text-subtle)]" strokeWidth={1.5} />
        <h2 className="font-serif text-2xl">No bars found in {city}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Google returned no bar or pub listings for this search. Try another nearby city or area.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
          Bars and pubs in {city}
        </p>
        <span className="rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-terracotta)]">
          Live from Google
        </span>
      </div>

      <h2 className="mt-3 font-serif text-3xl leading-[1.05] tracking-tight sm:text-4xl">
        {openCount > 0 ? (
          <><span className="text-[var(--accent-terracotta)]">{openCount} open</span> right now</>
        ) : (
          <>Nothing open right now</>
        )}
      </h2>

      <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-[var(--text-muted)]">
        This tab shows real places and their published hours for {city}. Google does not provide
        verified promotional deals here, so ask the venue what is on before you travel.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter bars">
        {[
          { value: false, label: 'All', count: bars.length },
          { value: true, label: 'Open now', count: openCount },
        ].map((filter) => {
          const active = onlyOpen === filter.value;
          return (
            <button
              key={String(filter.value)}
              type="button"
              aria-pressed={active}
              disabled={filter.value && filter.count === 0}
              onClick={() => setOnlyOpen(filter.value)}
              className={`press hit-44 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? 'border-[var(--accent-terracotta)] bg-[var(--accent-terracotta)] text-[var(--accent-contrast)]'
                  : 'border-[var(--rule)] text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]'
              }`}
            >
              {filter.label}<span className="ml-1.5 tabular-nums opacity-80">{filter.count}</span>
            </button>
          );
        })}
      </div>

      <ul className="stagger mt-5 flex flex-col xl:grid xl:grid-cols-2 xl:gap-x-12">
        {visibleBars.map((bar) => {
          const price = formatPriceTier(bar.priceTier);
          return (
            <li key={bar.id}>
              <a
                href={mapsUrl(bar.name, bar.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="press group flex min-h-[44px] w-full flex-col items-start gap-1.5 border-b border-[var(--row-border)] py-5 text-left sm:flex-row sm:gap-4"
              >
                <div className="w-auto flex-shrink-0 pt-0.5 sm:w-[78px]">
                  {bar.openNow === true ? (
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-terracotta)]">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-terracotta)]" /> Open
                    </span>
                  ) : bar.openNow === false ? (
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">Closed</span>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">Hours n/a</span>
                  )}
                </div>
                <div className="min-w-0 w-full flex-1">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <h3 className="font-serif text-lg leading-tight transition-colors group-hover:text-[var(--accent-terracotta)] sm:truncate">{bar.name}</h3>
                    {bar.hoursToday && <span className="whitespace-nowrap font-mono text-xs tabular-nums text-[var(--text-muted)] sm:flex-shrink-0">{bar.hoursToday}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--text-subtle)]">
                    {typeof bar.rating === 'number' && (
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /><span>{bar.rating}</span>{typeof bar.userRatingCount === 'number' && <span>({bar.userRatingCount})</span>}</span>
                    )}
                    {price && <span>{price}</span>}
                    <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" />{bar.address}</span>
                    <span className="flex items-center gap-1 text-[var(--accent-terracotta)] opacity-0 transition-opacity group-hover:opacity-100"><Navigation className="h-3 w-3" />Directions</span>
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
  const [bars, setBars] = useState<Venue[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!city) {
      setBars([]);
      setStatus('idle');
      return;
    }
    if (!isPlacesConfigured()) {
      setBars([]);
      setStatus('unconfigured');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    fetchVenues('', city, null, controller.signal, 'bar').then((outcome) => {
      if (outcome.status === 'aborted') return;
      if (outcome.status !== 'ok') {
        setBars([]);
        setStatus('error');
        return;
      }
      const sorted = [...outcome.venues].sort(
        (a, b) => Number(b.openNow === true) - Number(a.openNow === true),
      );
      setBars(sorted);
      setStatus('ready');
    });

    return () => controller.abort();
  }, [city, refreshKey]);

  if (!city) {
    return (
      <ErrorState
        tone="notice"
        showRetry={false}
        title="Set a city to find places for a drink"
        message="Choose a destination in the header and this tab will search that city."
        onRetry={() => undefined}
      />
    );
  }

  if (status === 'loading') return <LoadingState count={4} />;
  if (status === 'unconfigured') {
    return (
      <ErrorState
        tone="notice"
        showRetry={false}
        title="Live bar search is not switched on"
        message="This deployment has no Google Places key, so nearby bars cannot be looked up."
        onRetry={() => undefined}
      />
    );
  }
  if (status === 'error') {
    return (
      <ErrorState
        title="Could not reach Google just then"
        message={`The bar search for ${city} did not come back. Trying again is worth a tap.`}
        onRetry={() => setRefreshKey((value) => value + 1)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-[calc(var(--tabbar-h)+2rem+env(safe-area-inset-bottom))] md:pb-16">
      <div className="pt-2">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">Happy Hour</p>
        <h1 className="mt-2 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">Where can we go for a drink?</h1>
        <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-[var(--text-muted)]">
          Live bars and pubs in {city}, sorted by what is open now. Promotional deals are only shown when they have their own verified source.
        </p>
      </div>
      <BarList bars={bars} city={city} />
      <p className="mt-8 font-mono text-xs leading-relaxed text-[var(--text-subtle)]">
        Place names, ratings, prices and opening status are from Google Places. Opening hours can change; confirm directly with the venue.
      </p>
    </div>
  );
};
