import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
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
  // Server-rendered like /eat, so a recipe search is in the HTML on first
  // paint and a shared link opens with the food already on screen.
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }) => {
    if (!deps.q.trim()) return { result: null };
    return { result: await searchRecipes({ data: { query: deps.q } }) };
  },
  component: CookPage,
});

function CookPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/cook" });
  const surprise = useServerFn(surpriseRecipe);
  const [query, setQuery] = useState(search.q);
  const { result } = Route.useLoaderData();
  const isLoading = useRouterState({ select: (state) => state.isLoading });

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

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Looking…</p>
      ) : !search.q.trim() ? (
        <p className="mt-10 text-muted-foreground">Search an ingredient or a dish to begin.</p>
      ) : result && result.items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No recipes matched that. Try one ingredient.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result?.items.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      )}
    </div>
  );
}
