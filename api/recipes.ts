/**
 * Recipes, assembled SERVER-SIDE from publishers' own schema.org Recipe JSON-LD.
 *
 * ─── WHY THIS ENDPOINT EXISTS ───────────────────────────────────────────────────────
 * The Cook tab used to read TheMealDB. TheMealDB is a hobby database: a few hundred meals,
 * documentation-grade thumbnails, no cook time, no serving count, and a single free key
 * shared by the whole internet. It was the fake-price problem in another costume — a
 * directory of generic metadata with no publisher behind it.
 *
 * Every serious recipe publisher already emits its recipe as schema.org `Recipe` JSON-LD in
 * the page head — that is how Google draws the rich result. That block is a public,
 * structured, keyless description of the dish: title, ingredients, method, cook time, and
 * the publisher's OWN food photography. This endpoint fetches a CURATED list of real recipe
 * pages, lifts that block out of each, normalises it, and hands the client a clean list.
 *
 * No key, no quota, no invented facts: every field on the card is a field the publisher
 * itself published, and every card links back to the original page it came from. The
 * curated list (`SOURCES`) is the editorial layer — we choose which publishers and which
 * dishes appear per occasion; we never synthesise a recipe.
 *
 * Results are cached hard at the edge, so a whole occasion costs one burst of upstream
 * fetches per hour across all visitors, not one per open.
 */

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (k: string, v: string) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

export interface Recipe {
  title: string;
  image: string;
  source: string;
  publisher: string;
  cuisine?: string;
  category?: string;
  timeLabel?: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  video?: string;
}

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

/* Same-site only, mirroring api/places.ts: a missing Origin/Referer is a normal same-origin
 * fetch and is allowed; a header naming another host is refused. Cheap guard, not a boundary. */
function sameSite(req: Req): boolean {
  const origin = one(req.headers.origin) || one(req.headers.referer);
  if (!origin) return true;
  const host = one(req.headers['x-forwarded-host']) || one(req.headers.host);
  if (!host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

/* Crude per-instance throttle; Fluid Compute reuses instances so this catches obvious
 * hammering. Not presented as a real rate limiter. */
const HITS = new Map<string, { n: number; until: number }>();
const LIMIT = 30;
const WINDOW_MS = 60_000;
function overLimit(req: Req): boolean {
  const ip = one(req.headers['x-forwarded-for']).split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const seen = HITS.get(ip);
  if (!seen || now > seen.until) { HITS.set(ip, { n: 1, until: now + WINDOW_MS }); return false; }
  seen.n += 1;
  return seen.n > LIMIT;
}

/**
 * The curated corpus. Keys are the Cook tab's six effort occasions (see COOK_QUERY in
 * prototype.ts). Each value is a hand-picked list of real recipe pages from publishers that
 * emit schema.org Recipe JSON-LD with their own photography. This is editorial, not a
 * search: to change what the Cook tab offers, change this list. A URL that stops resolving
 * is simply dropped from that occasion at request time; it never breaks the others.
 */
const SOURCES: Record<string, string[]> = {
  quick30: [
    'https://www.budgetbytes.com/dragon-noodles/',
    'https://www.budgetbytes.com/garlic-parmesan-pasta/',
    'https://www.recipetineats.com/carbonara/',
    'https://www.budgetbytes.com/vegetable-fried-rice/',
    'https://www.budgetbytes.com/black-bean-quesadilla/',
    'https://www.recipetineats.com/chinese-fried-rice/',
    'https://www.budgetbytes.com/egg-fried-rice/',
  ],
  onepot: [
    'https://www.recipetineats.com/beef-stew/',
    'https://www.recipetineats.com/one-pot-mac-and-cheese/',
    'https://www.budgetbytes.com/one-pot-creamy-cajun-chicken-pasta/',
    'https://www.recipetineats.com/chicken-and-rice/',
    'https://www.budgetbytes.com/homemade-chili-recipe/',
    'https://www.recipetineats.com/sausage-casserole/',
  ],
  pantry: [
    'https://www.budgetbytes.com/creamy-pesto-pasta/',
    'https://www.recipetineats.com/aglio-e-olio/',
    'https://www.loveandlemons.com/pasta-primavera/',
    'https://www.budgetbytes.com/garlic-parmesan-pasta/',
    'https://www.recipetineats.com/tuna-pasta/',
    'https://www.budgetbytes.com/tomato-herb-pasta/',
  ],
  veg: [
    'https://www.loveandlemons.com/vegetarian-chili/',
    'https://cookieandkate.com/best-vegetable-soup-recipe/',
    'https://www.loveandlemons.com/pasta-primavera/',
    'https://cookieandkate.com/spinach-artichoke-dip-recipe/',
    'https://www.loveandlemons.com/vegetable-stir-fry/',
    'https://cookieandkate.com/vegetarian-fried-rice-recipe/',
  ],
  batch: [
    'https://www.recipetineats.com/thai-red-curry/',
    'https://www.loveandlemons.com/vegetarian-chili/',
    'https://www.recipetineats.com/chicken-curry/',
    'https://www.budgetbytes.com/slow-cooker-coconut-curry-lentils/',
    'https://www.recipetineats.com/bolognese/',
    'https://www.budgetbytes.com/homemade-chili-recipe/',
  ],
  baking: [
    'https://sallysbakingaddiction.com/best-chocolate-cake/',
    'https://sallysbakingaddiction.com/vanilla-cake/',
    'https://cookieandkate.com/healthy-banana-bread-recipe/',
    'https://sallysbakingaddiction.com/chocolate-chip-cookies/',
    'https://www.kingarthurbaking.com/recipes/classic-birthday-cake-recipe',
    'https://sallysbakingaddiction.com/carrot-cake/',
  ],
};

const PUBLISHERS: Record<string, string> = {
  'budgetbytes.com': 'Budget Bytes',
  'recipetineats.com': 'RecipeTin Eats',
  'loveandlemons.com': 'Love & Lemons',
  'cookieandkate.com': 'Cookie and Kate',
  'sallysbakingaddiction.com': "Sally's Baking Addiction",
  'kingarthurbaking.com': 'King Arthur Baking',
};

function publisherFor(url: string): string {
  try {
    const host = new URL(url).host.replace(/^www\./, '');
    return PUBLISHERS[host] || host;
  } catch { return ''; }
}

/* ── JSON-LD extraction ──────────────────────────────────────────────────────────────
 * Publishers write the same standard three different ways: one object, an array, or an
 * `@graph`. Fields that "are a string" are routinely a string, an array, or an object with
 * a `.name`/`.url`. Every helper below tolerates all of those rather than assuming one. */

type Json = Record<string, unknown>;

function collectNodes(parsed: unknown, out: Json[]): void {
  if (Array.isArray(parsed)) { parsed.forEach((p) => collectNodes(p, out)); return; }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Json;
    if (Array.isArray(obj['@graph'])) collectNodes(obj['@graph'], out);
    out.push(obj);
  }
}

function isRecipe(node: Json): boolean {
  const t = node['@type'];
  if (typeof t === 'string') return t === 'Recipe';
  if (Array.isArray(t)) return t.some((x) => x === 'Recipe');
  return false;
}

function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(asText).filter(Boolean)[0] || '';
  if (v && typeof v === 'object') {
    const o = v as Json;
    return (typeof o.name === 'string' && o.name) || (typeof o.url === 'string' && o.url) || '';
  }
  return '';
}

function asList(v: unknown): string[] {
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.map(asText).map((s) => s.trim()).filter(Boolean);
  return [];
}

function pickImage(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) { for (const x of v) { const u = pickImage(x); if (u) return u; } return ''; }
  if (v && typeof v === 'object') {
    const o = v as Json;
    if (typeof o.url === 'string') return o.url;
  }
  return '';
}

/** recipeInstructions: a string, an array of HowToStep, or HowToSection groups holding steps. */
function pickSteps(v: unknown): string[] {
  if (typeof v === 'string') {
    return v.split(/\r?\n+/).map((s) => s.replace(/^\s*(step\s*)?\d+[.)]?\s*/i, '').trim()).filter((s) => s.length > 1);
  }
  if (Array.isArray(v)) {
    const steps: string[] = [];
    for (const item of v) {
      if (typeof item === 'string') { if (item.trim()) steps.push(item.trim()); continue; }
      if (item && typeof item === 'object') {
        const o = item as Json;
        if (o['@type'] === 'HowToSection' && Array.isArray(o.itemListElement)) {
          steps.push(...pickSteps(o.itemListElement));
        } else {
          const t = asText(o.text) || asText(o.name);
          if (t) steps.push(t.trim());
        }
      }
    }
    return steps;
  }
  return [];
}

/** ISO-8601 duration (PT1H30M) → "1 hr 30 min". Server-side only; the client just prints it. */
function durationLabel(iso: unknown): string | undefined {
  if (typeof iso !== 'string') return undefined;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!m) return undefined;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  if (!h && !min) return undefined;
  const parts: string[] = [];
  if (h) parts.push(h + ' hr');
  if (min) parts.push(min + ' min');
  return parts.join(' ');
}

function normalise(node: Json, url: string): Recipe | null {
  const title = asText(node.name);
  const image = pickImage(node.image);
  const ingredients = asList(node.recipeIngredient);
  const steps = pickSteps(node.recipeInstructions);
  if (!title || !image || !steps.length) return null;

  const video = (() => {
    const v = node.video;
    if (v && typeof v === 'object') {
      const o = v as Json;
      const u = asText(o.contentUrl) || asText(o.embedUrl);
      return u || undefined;
    }
    return undefined;
  })();

  return {
    title,
    image,
    source: url,
    publisher: publisherFor(url),
    cuisine: asList(node.recipeCuisine)[0],
    category: asList(node.recipeCategory)[0],
    timeLabel: durationLabel(node.totalTime) || durationLabel(node.cookTime),
    ingredients,
    steps,
    tags: asList(node.keywords).slice(0, 4),
    video,
  };
}

const LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extract(html: string, url: string): Recipe | null {
  let m: RegExpExecArray | null;
  while ((m = LD_RE.exec(html))) {
    let parsed: unknown;
    try { parsed = JSON.parse(m[1].trim()); } catch { continue; }
    const nodes: Json[] = [];
    collectNodes(parsed, nodes);
    for (const node of nodes) {
      if (isRecipe(node)) { const r = normalise(node, url); if (r) return r; }
    }
  }
  return null;
}

async function fetchRecipe(url: string): Promise<Recipe | null> {
  try {
    const r = await fetch(url, {
      headers: {
        /* A plain fetch UA gets soft-blocked by some CDNs; a browser-shaped one is served
           the same public HTML any reader gets. */
        'User-Agent': 'Mozilla/5.0 (compatible; WhatsGood/1.0; +https://whats-good-nu.vercel.app)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return null;
    return extract(await r.text(), url);
  } catch { return null; }
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (!sameSite(req)) { res.status(403).json({ error: 'Cross-site use of this endpoint is not allowed' }); return; }
  if (overLimit(req)) { res.status(429).json({ error: 'Too many requests' }); return; }

  const occasion = one(req.query?.occasion);
  const urls = SOURCES[occasion];
  if (!urls) { res.status(400).json({ error: 'Unknown occasion' }); return; }

  const results = await Promise.all(urls.map(fetchRecipe));
  const recipes = results.filter((x): x is Recipe => x !== null);

  if (recipes.length) {
    /* Recipe pages are effectively static — cache the assembled list hard so an occasion
       costs one burst of upstream fetches per hour across everyone, never one per open.
       An empty result is never cached: a transient upstream hiccup must not pin the tab
       blank for an hour. */
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  }
  res.status(200).json({ recipes });
}
