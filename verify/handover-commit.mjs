/**
 * Keeps HANDOVER.md's Status line honest about which commit it describes.
 *
 * The defect this exists for: HANDOVER.md said "`main` is at `b6027f9`" while HEAD was
 * two commits further on. A handover is read by the next session as authoritative
 * state, so a stale hash sends it to re-do finished work, miss newer changes, or spend
 * the session reconciling a contradiction it has no way to detect. The hash was typed
 * by hand, and anything typed by hand drifts.
 *
 *   node verify/handover-commit.mjs --stamp   # rewrite the line to HEAD
 *   node verify/handover-commit.mjs --check   # exit 1 if it no longer describes HEAD
 *
 * The check is deliberately narrow. It fails on the two states that are unambiguously
 * wrong — a hash git has never heard of, and a hash that is not an ancestor of HEAD
 * (which is what a stale or wrong-branch handover looks like). Commits that land AFTER
 * the stamped one are reported, not failed: writing the handover necessarily precedes
 * committing it, so a passing rule cannot require the two to be the same commit.
 * `--strict` opts into failing on that too, for a pre-push gate.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'HANDOVER.md');

/** The Status line's hash. Kept as one pattern so the format has a single owner. */
const LINE = /^\*\*`(?<branch>[^`]+)` is at `(?<hash>[0-9a-f]{7,40})`/m;

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

const mode = process.argv.includes('--stamp')
  ? 'stamp'
  : process.argv.includes('--check')
    ? 'check'
    : null;
const strict = process.argv.includes('--strict');

if (!mode) {
  console.error('usage: node verify/handover-commit.mjs --stamp | --check [--strict]');
  process.exit(2);
}

let text;
try {
  text = readFileSync(FILE, 'utf8');
} catch {
  console.error('HANDOVER.md not found. Nothing to stamp or check.');
  process.exit(mode === 'check' ? 1 : 2);
}

const m = text.match(LINE);
if (!m) {
  console.error(
    'HANDOVER.md has no recognisable commit line. The Status section must open with:\n' +
    '  **`<branch>` is at `<short-sha>`, pushed.** ...\n' +
    'That line is what the next session trusts; without it there is nothing to verify.',
  );
  process.exit(1);
}

const head = git('rev-parse', '--short', 'HEAD');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');

if (mode === 'stamp') {
  const stamped = text.replace(LINE, (line) =>
    line.replace(m.groups.hash, head).replace(`\`${m.groups.branch}\``, `\`${branch}\``),
  );
  if (stamped === text) {
    console.log(`HANDOVER.md already names ${branch} @ ${head}.`);
  } else {
    writeFileSync(FILE, stamped);
    console.log(`HANDOVER.md stamped: ${m.groups.branch} @ ${m.groups.hash} -> ${branch} @ ${head}`);
  }
  process.exit(0);
}

const named = m.groups.hash;

let exists = true;
try {
  git('cat-file', '-e', `${named}^{commit}`);
} catch {
  exists = false;
}
if (!exists) {
  console.error(`✗ HANDOVER.md names commit ${named}, which does not exist in this repository.`);
  process.exit(1);
}

let ancestor = true;
try {
  git('merge-base', '--is-ancestor', named, 'HEAD');
} catch {
  ancestor = false;
}
if (!ancestor) {
  console.error(
    `✗ HANDOVER.md names ${named}, which is not an ancestor of HEAD (${head}).\n` +
    '  The handover describes a state this branch is not built on. Re-verify and stamp:\n' +
    '    node verify/handover-commit.mjs --stamp',
  );
  process.exit(1);
}

// Commits after the stamped one that changed anything other than the handover itself.
const after = git('rev-list', '--reverse', `${named}..HEAD`)
  .split('\n')
  .filter(Boolean)
  .filter((sha) => {
    const files = git('show', '--name-only', '--format=', sha).split('\n').filter(Boolean);
    return files.some((f) => f !== 'HANDOVER.md');
  });

if (after.length === 0) {
  console.log(`✓ HANDOVER.md describes ${named}; HEAD (${head}) adds no code beyond it.`);
  process.exit(0);
}

const list = after.map((sha) => `    ${git('log', '-1', '--format=%h %s', sha)}`).join('\n');
console.log(
  `${strict ? '✗' : '⚠'} HANDOVER.md describes ${named}, but ${after.length} later commit(s) ` +
  `changed code:\n${list}\n` +
  '  Re-verify, update the handover, then: node verify/handover-commit.mjs --stamp',
);
process.exit(strict ? 1 : 0);
