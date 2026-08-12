import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Recipe, SearchResult, Venue } from "./food";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).default(""),
  price: z.enum(["cheap", "mid", "high"]).nullable().default(null),
});

export const searchVenues = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }): Promise<SearchResult<Venue>> => {
    const { searchPlaces } = await import("./places.server");
    const { SAMPLE_VENUES } = await import("./sample-venues");

    // This now runs inside a route loader, so an unhandled throw here is a 500
    // on the whole page rather than one failed query. A network fault degrades
    // to the same sample fallback as a missing key.
    const result = await searchPlaces({
      query: data.query,
      city: data.city || "near me",
      price: data.price,
    }).catch((error: unknown) => {
      console.error("places search threw", error);
      return { venues: [] as Venue[], source: "sample" as const, notice: "provider-error" };
    });

    if (result.venues.length > 0) {
      return { items: result.venues, source: result.source };
    }

    const notice =
      result.notice === "no-key"
        ? "Live venue search is not connected yet — showing sample places."
        : result.notice === "budget"
          ? "Today's live search budget is used up — showing sample places."
          : result.notice === "provider-error"
            ? "The venue service is not responding — showing sample places."
            : undefined;

    if (notice) return { items: SAMPLE_VENUES, source: "sample", notice };
    return { items: [], source: result.source };
  });

export const getVenue = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }): Promise<Venue | null> => {
    if (data.id.startsWith("sample-")) {
      const { sampleVenue } = await import("./sample-venues");
      return sampleVenue(data.id);
    }
    const { placeDetails } = await import("./places.server");
    return placeDetails(data.id);
  });

export const searchRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }): Promise<SearchResult<Recipe>> => {
    const { searchMeals } = await import("./recipes.server");
    return { items: await searchMeals(data.query), source: "live" };
  });

export const getRecipe = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data }): Promise<Recipe | null> => {
    const { mealById } = await import("./recipes.server");
    return mealById(data.id);
  });

export const surpriseRecipe = createServerFn({ method: "POST" }).handler(
  async (): Promise<Recipe | null> => {
    const { randomMeal } = await import("./recipes.server");
    return randomMeal();
  },
);
