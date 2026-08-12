import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { RecipeCard } from "@/components/food-cards";
import { searchRecipes, surpriseRecipe } from "@/lib/discovery.functions";

const searchSchema = z.object({ q: z.string().catch("") });
type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/cook")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Something to cook tonight — What's Good" },
      {
        name: "description",
        content: "Search recipes by ingredient, cuisine or craving, with full method and shopping list.",
      },
      { property: "og:title", content: "Something to cook tonight — What's Good" },
      {
        property: "og:description",
        content: "Search recipes by ingredient, cuisine or craving.",
      },
    ],
  }),
  component: CookPage,
});

function CookPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/cook" });
  const runSearch = useServerFn(searchRecipes);
  const surprise = useServerFn(surpriseRecipe);
  const [query, setQuery] = useState(search.q);

  const results = useQuery({
    queryKey: ["recipes", search.q],
    queryFn: () => runSearch({ data: { query: search.q } }),
    enabled: search.q.trim().length > 0,
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-4xl tracking-tight">Something to cook</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ search: (prev: SearchParams) => ({ ...prev, q: query }) });
        }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chicken, curry, pasta…"
          aria-label="Recipe search"
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
        <button
          type="button"
          onClick={async () => {
            const recipe = await surprise();
            if (recipe) navigate({ to: "/recipe/$id", params: { id: recipe.id } });
          }}
          className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-secondary"
        >
          Surprise me
        </button>
      </form>

      {results.isLoading ? (
        <p className="mt-10 text-muted-foreground">Looking…</p>
      ) : !search.q.trim() ? (
        <p className="mt-10 text-muted-foreground">Search an ingredient or a dish to begin.</p>
      ) : results.data && results.data.items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No recipes matched that. Try one ingredient.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.data?.items.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      )}
    </div>
  );
}
