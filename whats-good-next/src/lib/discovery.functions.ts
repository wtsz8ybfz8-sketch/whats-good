import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Recipe, SearchResult, Venue } from "./food";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).default(""),
  price: z.enum(["cheap", "mid", "high"]).nullable().default(null),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
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
      city: data.city,
      price: data.price,
      lat: data.lat,
      lng: data.lng,
    }).catch((error: unknown) => {
      console.error("places search threw", error);
      return { venues: [] as Venue[], source: "sample" as const, notice: "provider-error" };
    });

    if (result.venues.length > 0) {
      return { items: result.venues, source: result.source };
    }

    const notice =
      result.notice === "no-location"
        ? "Tell us where you are — tap Near me, or pick a city."
      : result.notice === "no-key"
        ? "Live venue search is not connected yet — showing sample places."
        : result.notice === "budget"
          ? "Today's live search budget is used up — showing sample places."
          : result.notice === "provider-error"
            ? "The venue service is not responding — showing sample places."
            : undefined;

    // A missing location is answerable — ask for it. Filling the screen with
    // sample venues would bury the one thing the user needs to do.
    if (result.notice === "no-location") return { items: [], source: "sample", notice };
    if (notice) return { items: SAMPLE_VENUES, source: "sample", notice };
    return { items: [], source: result.source };
  });

/** Coordinates in, a place name out. Never the other way round. */
export const cityFromCoords = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ city: string | null }> => {
    const { reverseCity } = await import("./places.server");
    return { city: await reverseCity(data.lat, data.lng) };
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

/**
 * Encyclopaedia + guide facts for one venue. Separate from getVenue so a
 * Wikipedia outage can never take the venue page down with it — this resolves
 * to null and the page simply shows one section fewer.
 */
export const venueGuide = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().min(1).max(200), city: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { guideFacts } = await import("./guides.server");
    return guideFacts(data.name, data.city).catch(() => null);
  });

export const searchRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }): Promise<SearchResult<Recipe>> => {
    const { searchAnyRecipes } = await import("./recipes.server");
    return { items: await searchAnyRecipes(data.query), source: "live" };
  });

export const getRecipe = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data }): Promise<Recipe | null> => {
    const { anyRecipeById } = await import("./recipes.server");
    return anyRecipeById(data.id);
  });

export const surpriseRecipe = createServerFn({ method: "POST" }).handler(
  async (): Promise<Recipe | null> => {
    const { anyRandomRecipe } = await import("./recipes.server");
    return anyRandomRecipe();
  },
);
