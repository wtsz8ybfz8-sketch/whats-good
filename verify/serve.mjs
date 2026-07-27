/**
 * The dev server, started once and stopped on purpose.
 *
 * Two failures this replaces, both of which cost the user real money:
 *
 * 1. Every session ran a bare `npx vite --port 3000 &`, and nothing ever stopped it.
 *    A detached Vite tree is ~250MB of RSS that outlives the task, the turn, and
 *    often the session. Several accumulated in a single sitting.
 * 2. That bare command omitted VITE_GOOGLE_PLACES_KEY, so `fetchVenues` returned []
 *    before any request reached the Places fixture, every venue view came up empty,
 *    and the resulting "no venue card" was recorded as a permanent limitation of the
 *    environment rather than a missing env var. The venue detail page went unrendered
 *    and unmeasured for an entire session because of it.
 *
 * So the key is baked in here and the lifecycle is explicit:
 *
 *   node verify/serve.mjs up     # idempotent — reuses a healthy server, else starts one
 *   node verify/serve.mjs down   # stops whatever is on the port
 *
 * `up` is safe to call repeatedly; it never starts a second server. Always pair it
 * with `down`, and note that .claude/settings.json also runs `down` on SessionEnd so
 * a forgotten server cannot outlive the session.
 */
import { spawn, execSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const URL_ = `http://127.0.0.1:${PORT}/`;

/** The proxy 403s everything, including localhost, so it must be bypassed here. */
async function healthy() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1500);
    const r = await fetch(URL_, { signal: c.signal });
    clearTimeout(t);
    return r.status === 200;
  } catch {
    return false;
  }
}

function pids() {
  try {
    return execSync(`lsof -t -iTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true`, { encoding: 'utf8' })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function up() {
  if (await healthy()) {
    console.log(`reusing the server already on :${PORT}`);
    return 0;
  }
  // A listener that is not answering 200 is worse than none — clear it first.
  if (pids().length) { await down(true); }

  const log = openSync(`${ROOT}/verify/out/dev.log`, 'a');
  const child = spawn('npx', ['vite', '--port', String(PORT)], {
    cwd: ROOT,
    // The key gate must pass before the app will call Places at all. Without it the
    // fixtures are never consulted and every venue view is empty (see header).
    env: { ...process.env, VITE_GOOGLE_PLACES_KEY: process.env.VITE_GOOGLE_PLACES_KEY || 'k' },
    detached: true,
    stdio: ['ignore', log, log],
  });
  child.unref();

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await healthy()) { console.log(`server up on :${PORT} (pid ${child.pid})`); return 0; }
  }
  console.error(`server did NOT come up on :${PORT} within 20s — see verify/out/dev.log`);
  return 1;
}

async function down(quiet = false) {
  const found = pids();
  if (!found.length) { if (!quiet) console.log(`nothing listening on :${PORT}`); return 0; }
  // The tree is npm exec -> sh -> node; killing the process group takes all three.
  for (const pid of found) {
    try { process.kill(-Number(pid), 'SIGTERM'); } catch { /* not a group leader */ }
    try { process.kill(Number(pid), 'SIGTERM'); } catch { /* already gone */ }
  }
  await new Promise((r) => setTimeout(r, 400));
  for (const pid of pids()) { try { process.kill(Number(pid), 'SIGKILL'); } catch { /* gone */ } }
  // npm/sh wrappers can survive the listener; sweep this repo's strays too.
  try { execSync(`pkill -f "${ROOT}/node_modules/.bin/vite" 2>/dev/null || true`); } catch { /* none */ }
  if (!quiet) console.log(`stopped ${found.length} listener(s) on :${PORT}`);
  return 0;
}

const cmd = process.argv[2];
if (cmd === 'up') process.exit(await up());
else if (cmd === 'down') process.exit(await down());
else { console.error('usage: node verify/serve.mjs up|down'); process.exit(2); }
