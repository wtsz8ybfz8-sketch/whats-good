import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { VenueCard } from "@/components/food-cards";
import { searchVenues } from "@/lib/discovery.functions";
import { CITIES, GUIDE_PICKS, PRICE_LEVELS, type PriceBand } from "@/lib/food";

const searchSchema = z.object({
  q: z.string().catch(""),
  city: z.string().catch(""),
  price: z.enum(["cheap", "mid", "high"]).optional().catch(undefined),
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
  }),
  loader: async ({ deps }) => {
    if (!deps.q.trim()) return { result: null };
    return {
      result: await searchVenues({
        data: { query: deps.q, city: deps.city, price: deps.price },
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

  const data = result;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-4xl tracking-tight">Somewhere to eat</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ search: (prev: SearchParams) => ({ ...prev, q: query, city }) });
        }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ramen, wine bar, Sunday roast…"
          aria-label="What you fancy"
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring"
        />
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Where"
          aria-label="Where"
          className="rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring sm:w-56"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="self-center text-xs uppercase tracking-wide text-muted-foreground">
          Explore
        </span>
        {CITIES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={search.city === name}
            onClick={() => {
              setCity(name);
              navigate({ search: (prev: SearchParams) => ({ ...prev, city: name }) });
            }}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              search.city === name
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-secondary"
            }`}
          >
            {name}
          </button>
        ))}
      </div>


      <div className="mt-4 flex flex-wrap gap-2">
        {GUIDE_PICKS.map((pick) => {
          const active = search.q === pick.terms;
          return (
            <button
              key={pick.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setQuery(active ? "" : pick.terms);
                navigate({
                  search: (prev: SearchParams) => ({
                    ...prev,
                    q: active ? "" : pick.terms,
                    city,
                  }),
                });
              }}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
              }`}
            >
              {pick.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Guide picks search for places described as award-listed. Always double-check with the guide
        itself before booking.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">

        {PRICE_LEVELS.map((band) => {
          const active = search.price === band.id;
          return (
            <button
              key={band.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                navigate({
                  search: (prev: SearchParams) => ({
                    ...prev,
                    price: active ? undefined : (band.id as PriceBand),
                  }),
                })
              }
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
              }`}
            >
              {band.label}
            </button>
          );
        })}
      </div>

      {data?.notice ? (
        <p className="mt-6 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          {data.notice}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Looking…</p>
      ) : !search.q.trim() ? (
        <p className="mt-10 text-muted-foreground">Tell us what you fancy to get started.</p>
      ) : data && data.items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Nothing came back for that. Try a broader search or a different area.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
        </div>
      )}
    </div>
  );
}
