import { chromium, webkit } from 'playwright-core';
import { resolveChrome } from './chromePath.mjs';

/**
 * Choose the rendering ENGINE, not just the binary.
 *
 * Every measurement this project has ever made was headless Chromium. The user's phone
 * runs WebKit. That gap is not a detail — it is precisely where this app's shipped bugs
 * live: `100vh` against the URL-bar-hidden viewport, `env(safe-area-inset-*)` reported
 * as 0, `backdrop-filter` dropped mid-scroll, rubber-band overscroll painting the canvas.
 * Chromium reports the CORRECT value for all of them and can never fail one. CLAUDE.md
 * §7 says so in those words: "A green safe-area result on this machine is not
 * evidence about iOS. It never has been."
 *
 * WebKit cannot be installed in the agent container — `npx playwright install webkit`
 * fails at the CDN behind the proxy, verified again 2026-07-28. A GitHub runner installs
 * it in seconds. So the engine is selected by env var and the harness runs unchanged on
 * both: chromium locally, webkit in CI.
 *
 * WebKit is not Safari-on-iOS. It is the same engine with the same viewport,
 * safe-area and backdrop-filter semantics, on a desktop OS. It closes most of the gap;
 * it does not close all of it. Say "WebKit", never "iOS".
 */
export const ENGINE = (process.env.PW_ENGINE || 'chromium').toLowerCase();

export async function launchBrowser() {
  if (ENGINE === 'webkit') {
    // No executablePath: playwright-core resolves WebKit from its own registry, which
    // is what `playwright install webkit` populates. If it is absent we exit 3 — the
    // same contract as chromePath.mjs. A harness that quietly falls back to Chromium
    // while claiming to have measured WebKit is worse than one that does not run.
    try {
      return await webkit.launch();
    } catch (err) {
      console.error(
        'PW_ENGINE=webkit but no WebKit build is available.\n' +
        String(err && err.message) +
        '\n\nInstall it with `npx playwright install webkit`. Do NOT fall back to ' +
        'Chromium — the entire point of this engine is the checks Chromium cannot fail.',
      );
      process.exit(3);
    }
  }
  if (ENGINE !== 'chromium') {
    console.error(`Unknown PW_ENGINE="${ENGINE}". Use "chromium" or "webkit".`);
    process.exit(3);
  }
  // --no-sandbox is required in this container and harmless on a runner. It is a
  // Chromium flag only; passing it to WebKit throws, which is why this is branched.
  return chromium.launch({ executablePath: resolveChrome(), args: ['--no-sandbox'] });
}
