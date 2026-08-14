import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";

import { getRecipe } from "@/lib/discovery.functions";

export const Route = createFileRoute("/recipe/$id")({
  head: () => ({
    meta: [
      { title: "Recipe — What's Good" },
      { name: "description", content: "Ingredients, method and video for tonight's cook." },
      { property: "og:title", content: "Recipe — What's Good" },
      { property: "og:description", content: "Ingredients, method and video for tonight's cook." },
    ],
  }),
  // Loaded on the server: a recipe link sent to someone opens as the recipe,
  // not as "Loading…" followed by a round trip.
  loader: async ({ params }) => ({ recipe: await getRecipe({ data: { id: params.id } }) }),
  component: RecipePage,
});

function RecipePage() {
  const { recipe } = Route.useLoaderData();
  const isLoading = useRouterState({ select: (state) => state.isLoading });

  if (isLoading)
    return <p className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">Loading…</p>;
  if (!recipe)
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-muted-foreground">We couldn&apos;t load that recipe.</p>
        <Link to="/cook" search={{ q: "" }} className="mt-4 inline-block underline">
          Back to recipes
        </Link>
      </div>
    );

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      {recipe.thumbnail ? (
        <img
          src={recipe.thumbnail}
          alt={recipe.name}
          className="aspect-[16/9] w-full rounded-3xl object-cover"
        />
      ) : null}
      <h1 className="mt-8 font-display text-4xl tracking-tight">{recipe.name}</h1>
      <p className="mt-2 text-muted-foreground">
        {[recipe.area, recipe.category].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:items-start">
        <section>
          <h2 className="font-display text-2xl">Ingredients</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recipe.ingredients.map((ing) => (
              <li key={`${ing.item}-${ing.measure}`} className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
                <span>{ing.item}</span>
                <span className="text-muted-foreground">{ing.measure}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl">Method</h2>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
            {recipe.instructions
              .split(/\r?\n+/)
              .filter((line) => line.trim())
              .map((line) => (
                <p key={line.slice(0, 40)}>{line}</p>
              ))}
          </div>
          {recipe.video ? (
            <a
              href={recipe.video}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-block rounded-full border border-border px-5 py-2.5 text-sm hover:bg-secondary"
            >
              Watch the method
            </a>
          ) : null}
        </section>
      </div>
    </article>
  );
}
