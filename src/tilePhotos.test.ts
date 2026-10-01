/* Regression test for the KFC-smeared-everywhere defect. Runs under plain Node 24 type
   stripping, no test framework or node_modules required:
       node src/tilePhotos.test.ts
*/
import assert from 'node:assert/strict';
import { assignTilePhotos } from './tilePhotos.ts';

const KFC = 'https://example/kfc.jpg';

// 1. The exact bug: a single photo (the common OSM-fallback case) must NOT be repeated
//    across the tiles. It lands on at most one plate; the rest keep their monogram.
{
  const plan = assignTilePhotos([KFC], 6);
  assert.equal(plan[0], KFC);
  assert.deepEqual(plan.slice(1), [undefined, undefined, undefined, undefined, undefined],
    'the one KFC photo must not be smeared across the other tiles');
}

// 2. Duplicate urls collapse: no url may be used by more than one tile (no venue's image
//    is silently reused for another).
{
  const plan = assignTilePhotos([KFC, KFC, KFC], 6);
  const used = plan.filter(Boolean) as string[];
  assert.equal(new Set(used).size, used.length, 'no url may appear on more than one tile');
  assert.equal(used.length, 1, 'three copies of one photo fill exactly one tile');
}

// 3. Distinct photos map one-to-one, in order, with no modulo wraparound.
{
  const plan = assignTilePhotos(['a', 'b', 'c'], 5);
  assert.deepEqual(plan, ['a', 'b', 'c', undefined, undefined]);
}

// 4. More photos than plates: never overflow, never reuse.
{
  const plan = assignTilePhotos(['a', 'b', 'c', 'd'], 2);
  assert.deepEqual(plan, ['a', 'b']);
}

console.log('tilePhotos: all 4 assertions passed');
