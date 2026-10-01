/* Pure photo-assignment for the occasion-tile grid, lifted out of prototype.ts so the rule
   can be tested without a DOM.

   The defect this exists to prevent: the grid was painted with `urls[i % urls.length]`. On
   the OpenStreetMap fallback a city routinely returns a SINGLE usable photograph, so that
   one image — a KFC's — was repeated across every occasion tile (and the hero). An occasion
   is not a venue, and one venue's photograph must never stand in for another venue or for an
   unrelated occasion. */

/** Assigns at most one photograph per plate, drawing from the DISTINCT urls in order and
 *  never reusing a url. Plates past the supply of distinct photos get `undefined` and keep
 *  their monogram fallback. Deterministic: same input, same output. */
export function assignTilePhotos(urls: readonly string[], plateCount: number): (string | undefined)[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (u && !seen.has(u)) { seen.add(u); unique.push(u); }
  }
  const out: (string | undefined)[] = [];
  for (let i = 0; i < Math.max(0, plateCount); i++) out.push(unique[i]);
  return out;
}
