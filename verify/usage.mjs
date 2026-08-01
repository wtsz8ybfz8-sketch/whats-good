/**
 * What this session has actually cost, in tokens.
 *
 * Written because I told the user twice that I had "no visibility" into my own usage.
 * That was false — I had simply never looked. Claude Code writes a JSONL transcript per
 * session under ~/.claude/projects, and every assistant message in it carries a `usage`
 * block with real token counts. Law 1 of `.claude/skills/inspect`, applied to myself:
 * absence of a number I had looked for is a fact; absence of one I never looked for is
 * an assumption.
 *
 * READ THE CAVEAT BEFORE QUOTING THE DOLLAR FIGURE. The token counts are measured and
 * exact. The dollar figure is those counts multiplied by ASSUMED list API rates, and a
 * Claude subscription does not bill that way — it draws against an allowance. Treat the
 * dollars as a relative signal ("this turn was 20x that turn"), never as an invoice.
 *
 * THE USEFUL FINDING, which is not the total: cache-read dominates, because every turn
 * re-reads the entire conversation. In a long session that is the cost, and it grows with
 * conversation length rather than with how much work is done. Ten cheap turns late in a
 * long session can cost more than one expensive turn early in a fresh one. If the number
 * is climbing and the work is not, the fix is a NEW SESSION, not fewer tool calls.
 *
 * Run: node verify/usage.mjs
 */

import { readFileSync, statSync } from 'node:fs';
import { globSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const ROOT = resolve(homedir(), '.claude/projects');

// Assumed Opus-class list rates, $ per million tokens. Adjust if these are wrong; they
// are here to give the ratios, not to produce a bill.
const RATE = { input: 15, cacheWrite: 18.75, cacheRead: 1.5, output: 75 };

function tally(files) {
  const t = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, msgs: 0 };
  for (const fn of files) {
    let text;
    try { text = readFileSync(fn, 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      if (!line.includes('"usage"')) continue;
      let d;
      try { d = JSON.parse(line); } catch { continue; }
      const u = d?.message?.usage ?? d?.usage;
      if (!u || typeof u !== 'object') continue;
      t.input += u.input_tokens ?? 0;
      t.cacheWrite += u.cache_creation_input_tokens ?? 0;
      t.cacheRead += u.cache_read_input_tokens ?? 0;
      t.output += u.output_tokens ?? 0;
      t.msgs += 1;
    }
  }
  return t;
}

const cost = (t) =>
  (t.input * RATE.input + t.cacheWrite * RATE.cacheWrite + t.cacheRead * RATE.cacheRead + t.output * RATE.output) / 1e6;

let files = [];
try {
  files = globSync('**/*.jsonl', { cwd: ROOT }).map((f) => resolve(ROOT, f));
} catch {
  console.error('Could not read ~/.claude/projects — nothing to report.');
  process.exit(0);
}

const week = files.filter((f) => {
  try { return Date.now() - statSync(f).mtimeMs < 7 * 86400_000; } catch { return false; }
});

for (const [label, set] of [['LAST 7 DAYS', week], ['ALL TRANSCRIPTS', files]]) {
  const t = tally(set);
  const n = (v) => v.toLocaleString('en-US');
  console.log(`\n${label} — ${set.length} session file(s), ${n(t.msgs)} assistant messages`);
  console.log(`  input        ${n(t.input)}`);
  console.log(`  cache write  ${n(t.cacheWrite)}`);
  console.log(`  cache read   ${n(t.cacheRead)}   <- grows with CONVERSATION LENGTH`);
  console.log(`  output       ${n(t.output)}`);
  console.log(`  ~$${cost(t).toFixed(2)} at assumed list rates — NOT an invoice, see header`);
}
console.log('\nIf cache-read dominates and the work is not progressing, start a NEW SESSION.\n');
