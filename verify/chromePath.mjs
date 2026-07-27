import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolve a Chromium binary, or die saying so.
 *
 * Both harness entrypoints used to hardcode
 * `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — correct in the agent container
 * and absent everywhere else. The consequence was invisible and expensive: CI's
 * "Regression checks" step failed at browser launch on EVERY run, so the nine
 * static checks ran, the browser half never did, and CLAUDE.md's claim that these
 * checks run "whether or not an agent remembers" was false for the life of the file.
 *
 * The version number was the trap. `chromium-1194` becomes `chromium-1200` on the next
 * image rebuild and the whole suite stops running again, silently, in exactly the same
 * way. So: never pin a build number, and never fall back to "no browser" — a harness
 * that skips the browser must fail loudly, not pass quietly.
 */
export function resolveChrome() {
  const candidates = [];

  // 1. Explicit override — how CI passes the browser it just installed.
  if (process.env.PW_CHROMIUM) candidates.push(process.env.PW_CHROMIUM);

  // 2. Any chromium-* under the browsers root, newest build first. Survives the image
  //    bump that a pinned version number does not.
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(root)) {
    const builds = readdirSync(root)
      .filter((d) => d.startsWith('chromium'))
      .sort((a, b) => (parseInt(b.split('-')[1] || '0', 10) - parseInt(a.split('-')[1] || '0', 10)));
    for (const b of builds) {
      candidates.push(join(root, b, 'chrome-linux', 'chrome'));
      candidates.push(join(root, b, 'chrome-linux', 'headless_shell'));
    }
  }

  // 3. A system Chrome/Chromium, which is what a plain CI runner has.
  candidates.push(
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  );

  const found = candidates.find((p) => p && existsSync(p));
  if (!found) {
    console.error(
      'No Chromium binary found. Looked at:\n  ' + candidates.join('\n  ') +
      '\n\nThe browser checks CANNOT be skipped — a suite that silently drops them ' +
      'reports green while measuring nothing. Set PW_CHROMIUM, or install one with ' +
      '`npx playwright install chromium`.',
    );
    process.exit(3);
  }
  return found;
}
