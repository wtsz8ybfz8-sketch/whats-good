/**
 * Guide and encyclopaedia facts about a venue, from Wikipedia and Wikidata.
 *
 * Free, keyless, and — unlike the "Michelin listed" chips, which are only a
 * text search — actually verifiable: Wikidata records `award received` (P166)
 * as structured data with a source, so "One Michelin star" here is a claim
 * somebody can check rather than a guess from a description.
 *
 * The hard part is not fetching, it is NOT attaching the wrong article to a
 * restaurant. A search for "Prima Burgers" will happily return an article
 * about hamburgers. Everything below exists to refuse that.
 */
import { readCache, writeCache } from "./cache.server";

const TTL = 60 * 60 * 24 * 30; // a month; these facts barely move
const UA = "WhatsGood/1.0 (restaurant discovery app)";

export type GuideFacts = {
  extract: string;
  url: string;
  awards: string[];
};

/** Strips punctuation, branch suffixes and casing so "Le Bernardin" matches "Le Bernardin". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The article must actually be about THIS restaurant. One name has to contain
 * the other once both are normalised, and the venue name must carry at least
 * two words of signal — a one-word name like "Ocean" matches far too much.
 */
function isPlausibleMatch(venueName: string, articleTitle: string): boolean {
  const venue = normalise(venueName);
  const article = normalise(articleTitle);
  if (!venue || !article) return false;
  // Both sides need at least two words. One-word names match far too much in
  // either direction: a venue called "Ocean" grabs any article about oceans,
  // and "Aiko Sushi" would otherwise swallow the article titled "Sushi" —
  // which is how a generic encyclopaedia entry ends up presented as a fact
  // about somebody's restaurant.
  if (venue.split(" ").length < 2 || article.split(" ").length < 2) return false;
  return venue.includes(article) || article.includes(venue);
}

async function wikipedia(name: string, city: string) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "extracts|pageprops");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${name} ${city} restaurant`.trim());
  url.searchParams.set("gsrlimit", "1");

  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) return null;

  const body = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        { title?: string; extract?: string; pageprops?: { wikibase_item?: string } }
      >;
    };
  };
  const page = Object.values(body.query?.pages ?? {})[0];
  if (!page?.title || !page.extract) return null;
  if (!isPlausibleMatch(name, page.title)) return null;
  return { title: page.title, extract: page.extract, qid: page.pageprops?.wikibase_item ?? null };
}

/** Award labels from Wikidata's P166, kept only when they read as a guide listing. */
async function awards(qid: string): Promise<string[]> {
  const claimsUrl = new URL("https://www.wikidata.org/w/api.php");
  claimsUrl.searchParams.set("action", "wbgetclaims");
  claimsUrl.searchParams.set("format", "json");
  claimsUrl.searchParams.set("entity", qid);
  claimsUrl.searchParams.set("property", "P166");

  const claimsResponse = await fetch(claimsUrl, { headers: { "User-Agent": UA } });
  if (!claimsResponse.ok) return [];

  const claims = (await claimsResponse.json()) as {
    claims?: { P166?: { mainsnak?: { datavalue?: { value?: { id?: string } } } }[] };
  };
  const ids = (claims.claims?.P166 ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, 8);
  if (ids.length === 0) return [];

  const labelsUrl = new URL("https://www.wikidata.org/w/api.php");
  labelsUrl.searchParams.set("action", "wbgetentities");
  labelsUrl.searchParams.set("format", "json");
  labelsUrl.searchParams.set("ids", ids.join("|"));
  labelsUrl.searchParams.set("props", "labels");
  labelsUrl.searchParams.set("languages", "en");

  const labelsResponse = await fetch(labelsUrl, { headers: { "User-Agent": UA } });
  if (!labelsResponse.ok) return [];

  const labels = (await labelsResponse.json()) as {
    entities?: Record<string, { labels?: { en?: { value?: string } } }>;
  };
  return Object.values(labels.entities ?? {})
    .map((entity) => entity.labels?.en?.value)
    .filter((label): label is string => Boolean(label))
    .filter((label) => /michelin|bib gourmand|50 best|james beard|guide/i.test(label));
}

export async function guideFacts(name: string, city: string): Promise<GuideFacts | null> {
  const cacheKey = `guide:${normalise(name)}:${normalise(city)}`;
  const cached = await readCache<GuideFacts | { none: true }>(cacheKey);
  if (cached) return "none" in cached ? null : cached;

  try {
    const page = await wikipedia(name, city);
    if (!page) {
      // Cache the miss too: most restaurants are not in an encyclopaedia, and
      // without this every view of every ordinary venue re-runs the search.
      await writeCache(cacheKey, "wikipedia", { none: true }, TTL);
      return null;
    }

    const facts: GuideFacts = {
      extract: page.extract.split("\n")[0]!.slice(0, 400),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      awards: page.qid ? await awards(page.qid) : [],
    };
    await writeCache(cacheKey, "wikipedia", facts, TTL);
    return facts;
  } catch (error) {
    console.error("guide lookup failed", error);
    return null;
  }
}
