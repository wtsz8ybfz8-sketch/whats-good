import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { VenueCard } from "@/components/food-cards";
import { NearMeButton, type Located } from "@/components/near-me";
import { PriceSlider } from "@/components/price-slider";
import { CuisineIcon } from "@/components/cuisine-icon";
import { searchVenues } from "@/lib/discovery.functions";
import { CITIES, GUIDE_PICKS, MOODS, MOOD_AXIS, type PriceBand } from "@/lib/food";

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
  const activeFilters = (search.city ? 1 : 0) + (search.price ? 1 : 0);

  const go = (next: Partial<SearchParams>) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...next }) });

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:py-10">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Decide in one move
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
        What&apos;s good right now?
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Tell us the mood and roughly where you are. We&apos;ll find a table worth leaving the house
        for.
      </p>

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
        Mood first — it is what this product is sold on. Six options fit without
        scrolling and without becoming a wall; cuisine is a filter underneath,
        not the headline act.
      */}
      <div className="mt-5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">The mood</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MOOD_AXIS.map((mood) => {
            const active = search.q === mood.terms;
            return (
              <button
                key={mood.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const q = active ? "" : mood.terms;
                  setQuery(q);
                  go({ q });
                }}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-foreground/25"
                }`}
              >
                <CuisineIcon name={mood.icon} className="size-5 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{mood.label}</span>
                  <span className="block text-xs text-muted-foreground">{mood.blurb}</span>
                </span>
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
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Cuisine</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((cuisine) => {
                const active = search.q === cuisine.placeTerms;
                return (
                  <button
                    key={cuisine.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const q = active ? "" : cuisine.placeTerms;
                      setQuery(q);
                      go({ q });
                    }}
                    className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <CuisineIcon name={cuisine.icon} />
                    {cuisine.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Explore</span>
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

          <PriceSlider
            value={search.price ?? null}
            onChange={(next) => go({ price: next ?? undefined })}
          />

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
              Guide picks search for places described as award-listed. Always double-check with
              the guide itself before booking.
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
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
