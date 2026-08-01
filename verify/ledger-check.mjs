/**
 * Makes the inspection discipline ENFORCEABLE instead of aspirational.
 *
 * `CLAUDE.md` §13.2 is blunt about this: a rule written as prose is obeyed by an agent
 * that read it carefully and broken by one that skimmed. `INSPECTION-LEDGER.md` and the
 * `inspect` / `judge` skills were all prose — which made them exactly the kind of gate
 * that document says does not work. A senior engineer's first criticism, and a fair one.
 *
 * This is the smallest thing that turns it into a real gate: EVERY source file must
 * appear in the ledger's Surfaces table. Add a file and forget to declare whether it has
 * ever been inspected, and CI goes red. It cannot verify that an inspection happened —
 * nothing can — but it makes an UNTRACKED surface impossible, which is the failure that
 * actually kept happening: whole regions nobody had opened, discovered by the user.
 *
 * Deliberately NOT clever. No git history parsing, no staleness heuristics. One question:
 * is this file declared? Checks that cannot fail are worthless, and checks that fail for
 * subtle reasons get deleted by the next person in a hurry.
 *
 * Run: node verify/ledger-check.mjs   (exit 0 = every surface declared)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = resolve(ROOT, 'INSPECTION-LEDGER.md');

/** Files that carry no user-facing surface of their own. */
const EXEMPT = new Set(['vite-env.d.ts']);

function sourceFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name) && !EXEMPT.has(e.name)) out.push(p);
  }
  return out;
}

let ledger;
try {
  ledger = readFileSync(LEDGER, 'utf8');
} catch {
  console.error('✗ INSPECTION-LEDGER.md is missing. It is the coverage map; do not delete it.');
  process.exit(1);
}

const files = [
  ...sourceFiles(resolve(ROOT, 'src')),
  ...(statSync(resolve(ROOT, 'api'), { throwIfNoEntry: false }) ? sourceFiles(resolve(ROOT, 'api')) : []),
];

const undeclared = [];
for (const f of files) {
  const rel = relative(ROOT, f);
  const base = rel.split('/').pop();
  // Accept either the full path or the bare filename anywhere in the ledger.
  if (!ledger.includes(rel) && !ledger.includes(base)) undeclared.push(rel);
}

if (undeclared.length) {
  console.error('✗ Source files missing from INSPECTION-LEDGER.md:\n');
  undeclared.forEach((f) => console.error(`    ${f}`));
  console.error(
    '\n  Add a row to the Surfaces table for each. If you have not opened it in a\n' +
      '  browser, the honest verdict is NEVER INSPECTED — write that, do not guess.\n' +
      '  An untracked surface is how this project shipped a dead tab and invented\n' +
      '  recipe timings: nobody knew nobody had looked.\n',
  );
  process.exit(1);
}

console.log(`✓ all ${files.length} source files declared in INSPECTION-LEDGER.md`);
