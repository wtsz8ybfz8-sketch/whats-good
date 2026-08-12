import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { VenueCard } from "@/components/food-cards";
import { searchVenues } from "@/lib/discovery.functions";
import {
  OUT_MOODS,
  PRICE_LEVELS,
  currencySymbol,
  priceBandLabel,
  type PriceBand,
} from "@/lib/food";

const searchSchema = z.object({
  q: z.string().catch(""),
  city: z.string().catch(""),
  price: z.enum(["cheap", "mid", "high"]).optional().catch(undefined),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/out")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Going out tonight — What's Good" },
      {
        name: "description",
        content: "Bars, pubs, wine lists and late nights near you, filtered by vibe and price.",
      },
      { property: "og:title", content: "Going out tonight — What's Good" },
      {
        property: "og:description",
        content: "Bars, pubs, wine lists and late nights near you, filtered by vibe and price.",
      },
    ],
  }),
  component: OutPage,
});

function OutPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/out" });
  const runSearch = useServerFn(searchVenues);
  const [city, setCity] = useState(search.city);

  const results = useQuery({
    queryKey: ["out", search.q, search.city, search.price ?? null],
    queryFn: () =>
      runSearch({ data: { query: search.q, city: search.city, price: search.price ?? null } }),
    enabled: search.q.trim().length > 0,
  });

  const data = results.data;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-4xl tracking-tight">Going out</h1>
      <p className="mt-2 text-muted-foreground">Drinks first, dinner optional.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ search: (prev: SearchParams) => ({ ...prev, city }) });
        }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Town, city or neighbourhood"
          aria-label="Where"
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Update area
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {OUT_MOODS.map((mood) => {
          const active = search.q === mood.placeTerms;
          return (
            <button
              key={mood.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                navigate({
                  search: (prev: SearchParams) => ({
                    ...prev,
                    q: active ? "" : mood.placeTerms,
                  }),
                })
              }
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
              }`}
            >
              {mood.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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
              {priceBandLabel(band.tier, band.word, currencySymbol(search.city))}
            </button>
          );
        })}
      </div>

      {data?.notice ? (
        <p className="mt-6 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          {data.notice}
        </p>
      ) : null}

      {results.isLoading ? (
        <p className="mt-10 text-muted-foreground">Looking…</p>
      ) : !search.q.trim() ? (
        <p className="mt-10 text-muted-foreground">Pick a vibe above to see what&apos;s open.</p>
      ) : data && data.items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nothing came back — try a wider area.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((venue) => (
            <VenueCard key={venue.id} venue={venue} currency={currencySymbol(search.city)} />
          ))}
        </div>
      )}
    </div>
  );
}
