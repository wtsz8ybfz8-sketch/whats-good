import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { VenueCard } from "@/components/food-cards";
import { NearMeButton, type Located } from "@/components/near-me";
import { searchVenues } from "@/lib/discovery.functions";
import {
  CITIES,
  GUIDE_PICKS,
  MOODS,
  PRICE_LEVELS,
  currencySymbol,
  priceBandLabel,
  type PriceBand,
} from "@/lib/food";

const searchSchema = z.object({
  q: z.string().catch(""),
  city: z.string().catch(""),
  price: z.enum(["cheap", "mid", "high"]).optional().catch(undefined),
  // Kept in the URL so a located search is shareable and survives a refresh.
  lat: z.coerce.number().min(-90).max(90).optional().catch(undefined),
  lng: z.coerce.number().min(-180).max(180).optional().catch(undefined),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/eat")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Places to eat tonight — What's Good" },
      {
        name: "description",
        content: "Search restaurants, cafés and bars by mood, area and price band.",
      },
      { property: "og:title", content: "Places to eat tonight — What's Good" },
      {
        property: "og:description",
        content: "Search restaurants, cafés and bars by mood, area and price band.",
      },
    ],
  }),
  // Searched on the server so the places are in the HTML of the first paint.
  // A shared link opens on someone else's phone showing real venues, not a
  // "Looking…" placeholder waiting on a second round trip.
  loaderDeps: ({ search }) => ({
    q: search.q,
    city: search.city,
    price: search.price ?? null,
    lat: search.lat ?? null,
    lng: search.lng ?? null,
  }),
  loader: async ({ deps }) => {
    if (!deps.q.trim()) return { result: null };
    return {
      result: await searchVenues({
        data: {
          query: deps.q,
          city: deps.city,
          price: deps.price,
          lat: deps.lat,
          lng: deps.lng,
        },
      }),
    };
  },
  component: EatPage,
});

function EatPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/eat" });
  const { result } = Route.useLoaderData();
  const isLoading = useRouterState({ select: (state) => state.isLoading });

  const [query, setQuery] = useState(search.q);
  const [city, setCity] = useState(search.city);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const data = result;
  const symbol = currencySymbol(search.city);
  const activeFilters = (search.city ? 1 : 0) + (search.price ? 1 : 0);

  const go = (next: Partial<SearchParams>) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...next }) });

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:py-10">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Somewhere to eat</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          // A typed city wins over a previous fix on the map.
          go({ q: query, city, ...(city !== search.city ? { lat: undefined, lng: undefined } : {}) });
        }}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ramen, wine bar, Sunday roast…"
          aria-label="What you fancy"
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring"
        />
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Where"
          aria-label="Where"
          className="rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring sm:w-56"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {/*
        One rail, and it is the cuisine one. Everything else is behind Filters:
        twelve city chips, four guide chips and a two-line disclaimer used to
        stack above the results, so a phone showed a full screen of controls
        before a single restaurant.
      */}
      <div className="-mx-5 mt-4 overflow-x-auto px-5">
        <div className="flex w-max gap-2">
          {MOODS.map((mood) => {
            const active = search.q === mood.placeTerms;
            return (
              <button
                key={mood.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const q = active ? "" : mood.placeTerms;
                  setQuery(q);
                  go({ q });
                }}
                className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                }`}
              >
                {mood.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <NearMeButton
          auto={!search.city && search.lat === undefined}
          onLocated={(located: Located) => {
            setCity(located.city);
            go({ city: located.city, lat: located.lat, lng: located.lng });
          }}
        />
        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
          className="min-h-[44px] rounded-full border border-border px-4 text-sm transition-colors hover:bg-secondary"
        >
          Filters{activeFilters ? ` · ${activeFilters}` : ""}
        </button>
        {search.city ? (
          <span className="text-sm text-muted-foreground">in {search.city}</span>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className="mt-3 space-y-5 rounded-2xl border border-border bg-card p-4">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Where</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CITIES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={search.city === name}
                  onClick={() => {
                    setCity(name);
                    go({ city: name, lat: undefined, lng: undefined });
                  }}
                  className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors ${
                    search.city === name
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Budget</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRICE_LEVELS.map((band) => {
                const active = search.price === band.id;
                return (
                  <button
                    key={band.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => go({ price: active ? undefined : (band.id as PriceBand) })}
                    className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors ${
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {priceBandLabel(band.tier, band.word, symbol)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Guide picks
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {GUIDE_PICKS.map((pick) => {
                const active = search.q === pick.terms;
                return (
                  <button
                    key={pick.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const q = active ? "" : pick.terms;
                      setQuery(q);
                      go({ q });
                    }}
                    className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors ${
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {pick.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              These search for places described as award-listed. Check the guide itself before you
              book.
            </p>
          </div>
        </div>
      ) : null}

      {data?.notice ? (
        <p className="mt-5 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          {data.notice}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Looking…</p>
      ) : !search.q.trim() ? (
        <p className="mt-10 text-muted-foreground">Tell us what you fancy to get started.</p>
      ) : data && data.items.length === 0 && !data.notice ? (
        <p className="mt-10 text-muted-foreground">
          Nothing came back for that. Try a broader search or a different area.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((venue) => (
            <VenueCard key={venue.id} venue={venue} currency={symbol} />
          ))}
        </div>
      )}
    </div>
  );
}
