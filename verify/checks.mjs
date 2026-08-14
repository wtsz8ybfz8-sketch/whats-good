/**
 * The regression suite. Run this before claiming anything works.
 *
 * Every check here exists because the corresponding bug SHIPPED, was reported by the
 * user, and was found by looking rather than by reasoning. They are ordered by how
 * expensive the failure was, not by how clever the check is.
 *
 *   node verify/checks.mjs            # against a dev server on :3000
 *
 * Exit code 0 only when every check passes. Anything else is a failure you must report
 * as a failure — a check that "did not complete" is not a check that passed.
 */

import { ENGINE, launchBrowser } from './browser.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AREA_LIST_RESPONSE, PNG_1X1, randomResponse, searchResponse } from './fixtures/mealdb.mjs';
import { NEARBY_RESPONSE, SEARCH_TEXT_RESPONSE } from './fixtures/places.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000/';

/**
 * TheMealDB and Places, answered locally. Extracted from main() so every context this
 * suite opens gets the same fixtures — a second context that quietly lacked them would
 * report an empty app as a failing app.
 */
async function installFixtures(page) {
  await page.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1')) return r.continue();
    if (u.includes('themealdb.com')) {
      const U = new URL(u);
      if (U.pathname.endsWith('/list.php')) return r.fulfill(json(AREA_LIST_RESPONSE));
      if (U.pathname.endsWith('/search.php')) return r.fulfill(json(searchResponse(U.searchParams.get('s'))));
      if (U.pathname.endsWith('/random.php')) return r.fulfill(json(randomResponse()));
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    }
    if (u.includes('places.googleapis.com')) {
      if (u.includes(':searchText')) return r.fulfill(json(SEARCH_TEXT_RESPONSE));
      if (u.includes(':searchNearby')) return r.fulfill(json(NEARBY_RESPONSE));
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    }
    return r.abort();
  });
}
const json = (b) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

/* `removed(...)` marks a check that asserted a feature of the OLD React app which the
 * prototype does not have — the venue action-pillar row, the rating-count format, the
 * all-week hours disclosure, the recipe plate-scaler. They are not skips (a skip is a
 * hole in evidence about a feature that exists); the feature is gone on purpose, so the
 * check is retired and says so out loud rather than sitting red forever. */
const removed = (name) => console.log(`  · ${name} — RETIRED: asserted a React-app feature the prototype does not have`);

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
};

/**
 * A check whose PRECONDITION could not be met — not a pass and not a failure.
 *
 * There is exactly one honest way to report a check that did not get to run, and it is
 * not "✓". A skip is louder than a pass on purpose: it is a hole in the evidence, and
 * the summary line counts it separately so it can never be read as coverage.
 */
const skip = (name, why) => {
  results.push({ name, pass: true, skipped: true, detail: why });
  console.log(`  ⚠ SKIPPED  ${name}  — ${why}`);
};

// ── Static checks: things a browser cannot tell you ────────────────────────────
//
// These are the iOS defects. They CANNOT be caught by rendering in this container:
// Chromium reports safe-area insets of 0 whatever the meta tag says, so a page with a
// broken viewport tag renders identically to a correct one here. That is exactly how
// they shipped. Read the source instead.
function staticChecks() {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  check(
    'viewport-fit=cover present',
    /viewport-fit\s*=\s*cover/.test(html),
    'without it every env(safe-area-inset-*) is 0 on iOS',
  );

  // The typeface is this product's identity (§7) and must come from our own origin.
  // A Google Fonts link means: a flash of fallback text and a reflow on every cold
  // load, two extra round trips to a third origin before any text is right, and the
  // user's IP handed to Google on every visit. Self-hosted via
  // @fontsource-variable/schibsted-grotesk; this check is what keeps it that way.
  // Comments are stripped first. The comment in index.html EXPLAINS the Google Fonts
  // bug and therefore names the host; a check that reads its own documentation as a
  // violation is the §13.3 trap, and it fired here on the first run.
  check(
    'no third-party font request',
    !/fonts\.(googleapis|gstatic)\.com/.test(html.replace(/<!--[\s\S]*?-->/g, '')),
    'a webfont from another origin means a FOUT reflow on every cold load',
  );

  /**
   * EVERY source file, enumerated — never a hardcoded list.
   *
   * This was `['src/App.tsx', 'src/index.css', 'src/components/ErrorBoundary.tsx']`, so
   * Sidebar, EateryView, RecipeView, HappyHourView and StatusStates were never scanned
   * by any static check. That is how h-[46vh]/[56vh]/[60vh] and max-h-[85vh] survived
   * the entire life of a rule that bans them in bold: the check was green because it
   * never opened the files. A check that cannot see the violation cannot fail.
   *
   * Walking the tree means a new component is covered the moment it exists, rather than
   * when someone remembers to add it here.
   */
  const srcFiles = (function walk(dir, acc = []) {
    for (const e of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, acc);
      else if (/\.(tsx|ts|css)$/.test(e.name)) acc.push(rel);
    }
    return acc;
  })('src');
  // Strip comments before matching, or the note explaining why a pattern is banned
  // trips the check that bans it — a false positive that teaches you to ignore the suite.
  const cssRaw = readFileSync(resolve(ROOT, 'src/prototype.css'), 'utf8');
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  check(
    'html has a background (canvas painted in every safe area)',
    /(^|\n)html\s*\{[^}]*background\s*:/.test(css),
    'unpainted canvas = see-through band against the browser chrome',
  );
  check(
    'no background-attachment: fixed',
    !/background-attachment:\s*fixed/.test(css),
    'iOS Safari paints it unreliably and leaves the safe area bare',
  );
  check(
    'theme-color follows both colour schemes',
    (html.match(/name="theme-color"/g) || []).length >= 2 && /theme-color[^>]*media=/.test(html),
    'one hardcoded value tints the browser chrome the wrong colour in one mode',
  );
  check(
    'color-scheme declared',
    /name="color-scheme"/.test(html) && /color-scheme:/.test(css),
    'otherwise scrollbars and overscroll render light inside a dark app',
  );

  check(
    'no hardcoded languageCode in the Places request',
    !/languageCode:\s*'[a-z]{2}/.test(readFileSync(resolve(ROOT, 'src/placesService.ts'), 'utf8')),
    'a hardcoded language is the same class of bug as a hardcoded country',
  );
  /*
   * NO NUMBER FORMATTED BY HAND, ANYWHERE EXCEPT locale.ts.
   *
   * This check used to read `/toFixed\(1\)\}\s*km/` — a regex that only matches the
   * TEMPLATE-LITERAL spelling, `${d.toFixed(1)} km`. The live code was written with
   * string concatenation, `d.toFixed(1) + ' km'`, which has no closing brace. So the
   * check reported green over the exact line it existed to catch, and the distance under
   * the slider read "2.0 km" to every reader who writes "2,0" — and read kilometres to
   * everyone who thinks in miles — for as long as the check has existed. It was a check
   * that could not fail, which CLAUDE.md §6 names as the thing to hunt for.
   *
   * A rule shaped like ONE SPELLING of a bug only ever catches that spelling. The actual
   * rule is "locale.ts is the only module allowed to know how the user reads", so that is
   * what is asserted now: every source file, every spelling, nowhere to hide. locale.ts
   * is exempt because it is where the Intl calls and their last-resort fallbacks live.
   *
   * A comment containing `.toFixed(` would trip this. That is deliberate — a false RED is
   * cheap to see and cheap to fix, and it is the failure this project can afford. A false
   * GREEN is the one that ships.
   */
  const handFormatted = readdirSync(resolve(ROOT, 'src'))
    .filter((f) => f.endsWith('.ts') && f !== 'locale.ts')
    .filter((f) => /\.toFixed\(/.test(readFileSync(resolve(ROOT, 'src', f), 'utf8')));
  check(
    'no number formatted by hand outside locale.ts',
    handFormatted.length === 0,
    handFormatted.length
      ? `toFixed() still in ${handFormatted.join(', ')} — use formatDistance/formatQuantity`
      : 'toFixed serialises, it does not format — locale.ts owns every Intl call',
  );

  /* The Out tab must query the SELECTED city, never fall back to a hardcoded one. The
     component this used to read is gone with the React app; the same rule now applies to
     prototype.ts, which is the only thing issuing the query. */
  check(
    'Out tab has no fixed city dataset dependency',
    !/CAPE_TOWN|HAPPY_HOUR_CITY|hasHappyHourData/.test(
      readFileSync(resolve(ROOT, 'src/prototype.ts'), 'utf8'),
    ),
    'the tab must query the selected city, not silently fall back to Cape Town',
  );

  check(
    'landscape insets consumed (safe-area-inset-left/right)',
    /safe-area-inset-left/.test(css) && /safe-area-inset-right/.test(css),
    'landscape notch is ~59px; unconsumed puts content under it',
  );

  const vh = srcFiles
    .filter((f) => existsSync(resolve(ROOT, f)))
    .flatMap((f) =>
      readFileSync(resolve(ROOT, f), 'utf8')
        .split('\n')
        .map((l, i) => ({ f, i: i + 1, l }))
        .filter((x) => /(?<![dsl])\d+vh\b|min-h-screen/.test(x.l)),
    );
  check(
    // ANY bare vh, not just 100vh. On iOS Safari every `vh` unit resolves against the
    // viewport with the browser chrome HIDDEN, so `46vh` is as wrong as `100vh` — just
    // less obviously. This check tested only /100vh|min-h-screen/ for its whole life,
    // while the venue hero shipped h-[46vh]/[56vh]/[60vh] and the filter sheet
    // max-h-[85vh]. §6 says "never use 100vh"; the rule is the unit, not the number.
    'no bare vh units / min-h-screen (use dvh)',
    vh.length === 0,
    vh.length ? vh.map((x) => `${x.f}:${x.i}`).join(', ') : 'dvh tracks iOS browser chrome',
  );
}

// ── Rendered checks ───────────────────────────────────────────────────────────
async function main() {
  console.log(`\n▶ regression checks — ${BASE}  [engine: ${ENGINE}]\n`);
  staticChecks();

  const browser = await launchBrowser();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: 'en-GB',
    geolocation: { latitude: 51.5136, longitude: -0.1385 },
    permissions: ['geolocation'],
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('whats_good_city', 'London'); } catch {}
  });
  const page = await ctx.newPage();
  await installFixtures(page);

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  // The app intentionally requires a destination before searching. The browser context
  // already has London in storage; fire the same user-visible trigger so the venue
  // assertions test the app rather than an unstarted search.
  //
  // That trigger USED to be a fixed "Find a place" CTA bar. It is gone: selecting an
  // occasion is now the query, exactly as the prototype has it, so the harness drives
  // the app the way a user does — tap a tile. Tapping the FIRST tile rather than a
  // named one keeps this honest across the three period sets (the six occasions differ
  // by time of day, so hardcoding "Date night" would pass at 8pm and fail at 9am).
  //
  // Scoped to `.occasion-grid`, NOT to a bare `[aria-pressed]`: the period switcher
  // (Morning/Midday/Evening) sets aria-pressed too and comes first in the DOM, so the
  // unscoped version clicked "Morning" and never ran a search at all — which showed up
  // as the venue checks skipping for a "fixture gap" that did not exist.
  await page.locator('.grid .tile').first().click({ timeout: 10000 });
  await page.waitForTimeout(2500);

  check('no Vite error overlay', (await page.locator('vite-error-overlay').count()) === 0);

  /* --- the two "chrome is flush" checks have been REMOVED, not silenced ---------
   *
   * They asserted that the fixed action bar sat flush on the fixed bottom tab bar,
   * once at rest and once at a simulated 34px home-indicator inset. Both bars are
   * gone: the tab bar is now a pill row under the header, and the "Find a place" CTA
   * was deleted outright (App.tsx).
   *
   * Both checks were written as `gap === null || gap === 0` — null meaning "not
   * rendered in this state" — so with the bars removed they would have gone on
   * reporting PASS forever while measuring nothing at all. That is precisely the
   * "check that cannot fail" §13.2 exists to name, and leaving two of them green in
   * the summary would have made this change look better-verified than it is.
   *
   * Nothing docks to the viewport floor on the browse surface any more, so there is
   * no flush relationship left to assert here. The venue and recipe detail views DO
   * still have docked bars deriving from --tabbar-h; they are not covered by these
   * two checks and never were (§6: "a viewport measured on the wrong SCREEN is not
   * covered"). That gap is real, it is now the ONLY docked-bar geometry in the app,
   * and it is recorded as open in HANDOVER.md rather than papered over here.
   */

  /**
   * The header must carry an opaque fill ABOVE itself.
   *
   * This is a structural check, and it is honest about being one: it asserts the
   * MITIGATION is installed, not that the bug is gone. The bug cannot be reproduced
   * here at all. `position: fixed; top: 0` anchors to the layout viewport; when iOS
   * Safari collapses its URL bar mid-scroll the visual viewport grows upward and page
   * content paints in the strip that opens above the header. Chromium never opens that
   * strip, and every check in this file measures the page at rest, where it does not
   * exist even on a real device.
   *
   * It was found by a user photographing their own phone — three separate screens with
   * the cuisine rail, a venue address and a venue name drawn over the status-bar clock.
   * So the one thing a machine CAN hold is that the fill is still there.
   */
  /* The 'header fills the strip above itself' check is GONE with the thing it measured.
   * It asserted a `::before` fill on `.chrome-bar`, a FIXED header. The app is now the
   * prototype, whose header is in normal flow and scrolls away with the page, so the
   * iOS URL-bar-collapse strip it mitigated cannot open above it. Left in place it would
   * have returned null for `.chrome-bar` and reported a mitigation that no longer exists.
   *
   * The same removal applies to 'primary nav clears the fixed header': with no fixed
   * header there is nothing for the nav to clear. The prototype's `.tabs` row sits in
   * flow directly under the header and is covered by the per-tab hit-target sweep below.
   */
  /* The simulated-34px-inset check was removed with its sibling above — same reason,
   * same failure mode: with no `.action-bar` in the DOM it returned null and passed. */

  /* The nav must be REACHABLE, which the old bottom tab bar got for free by being
   * fixed to the viewport. It is now an in-flow pill row near the top of the document,
   * so it can be scrolled away from — and, more to the point, it can be pushed off by
   * a header whose height is wrong. Assert it is on screen and inside the viewport on
   * first paint, which is the property that actually changed. */
  /* The first version of this check asserted `top >= 0 && bottom <= innerHeight` and
   * PASSED while the nav sat at top:20, entirely underneath the 72px fixed header —
   * rendered, painted, and invisible. It could not fail for the one thing that had
   * actually broken, which is the §13 rule in miniature: name the red result first.
   *
   * The red result here is "the nav's top edge is above the header's bottom edge", so
   * that is what is measured — against the header's real geometry, not a hardcoded 72. */
  // --- scroll restoration on back ---------------------------------------------
  check(
    'history.scrollRestoration is manual',
    (await page.evaluate(() => history.scrollRestoration)) === 'manual',
    'otherwise the browser overrides restoration on popstate',
  );

  /**
   * PREFLIGHT, not a check: no venue card means the HARNESS is misconfigured.
   *
   * This cost a full session. The dev server had been started without
   * VITE_GOOGLE_PLACES_KEY, so fetchVenues returns [] before any request is made —
   * the Places fixture is never even consulted. The symptom was
   * "no venue card to test", which reads as a fixture gap, so it was recorded as a
   * permanent limitation of the environment, the check was downgraded to a SKIP, and
   * the venue detail view — §8's first-class product surface — went unrendered and
   * unmeasured while its action bar was actively being changed.
   *
   * A misconfigured harness must never degrade into a softer verdict about the app.
   * Exit 3, say exactly which lever is missing.
   */
  const cardCount = await page.locator('[role="button"][aria-label^="View "]').count();
  if (cardCount === 0) {
    console.error(
      '\nNo venue card rendered. The fixture supplies venues, so this means the dev\n' +
      'server was started WITHOUT a Places key and the app short-circuits to an empty\n' +
      'list before any request reaches the fixture.\n\n' +
      '  Restart it as:  VITE_GOOGLE_PLACES_KEY=k npx vite --port 3000\n\n' +
      'This is NOT a fixture gap and NOT a reason to skip the venue checks.',
    );
    process.exit(3);
  }
  const card = page.locator('[role="button"][aria-label^="View "]:visible').first();
  let restored = null;
  if (await card.count()) {
    /*
     * Scroll to where the LIST is, not to a hardcoded 400px.
     *
     * 400 happened to land on a venue card while tapping an occasion also collapsed
     * the decision panel. The panel now stays open (that collapse hid the selected
     * tile and the un-dimming refine block — the app's entire response to the tap),
     * so the list starts lower and 400px landed above it. The check then found no
     * card in its safe band and SKIPPED, reporting a "fixture gap" that did not
     * exist — the fixture was fine and the venues were rendering.
     *
     * Deriving the offset from the first card keeps the check measuring the thing it
     * is for — that going back restores a NON-ZERO scroll offset — instead of
     * measuring where the layout happened to be on the day it was written.
     */
    await page.evaluate(() => {
      const c = document.querySelector('[role="button"][aria-label^="View "]');
      const y = c ? window.scrollY + c.getBoundingClientRect().top - 180 : 400;
      window.scrollTo(0, Math.max(240, Math.round(y)));
    });
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => Math.round(window.scrollY));
    /*
     * THIS CHECK COULD NOT PASS, AND THAT IS WHY A REAL BUG HID BEHIND IT.
     *
     * It used to take `:visible` .first() and click its box centre. Playwright's
     * `:visible` means "has a non-empty box", NOT "inside the viewport" — so after
     * scrolling to 400 the first card is above the fold with a NEGATIVE y, and the
     * click landed on the fixed header instead. No detail ever opened, no history
     * entry was pushed, so `goBack()` left the app entirely and read scrollY on
     * about:blank. The reported "returned to 0px" was measuring a blank page.
     *
     * Pick a card actually inside the safe band, and assert the detail opened — a
     * check that silently measures the wrong page is worse than no check.
     */
    const cards = page.locator('[role="button"][aria-label^="View "]:visible');
    const vh = page.viewportSize()?.height ?? 844;
    let box = null;
    for (let i = 0; i < (await cards.count()); i++) {
      const bb = await cards.nth(i).boundingBox();
      if (bb && bb.y > 96 && bb.y + 60 < vh - 140) { box = bb; break; }
    }
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 60));
      await page.waitForTimeout(900);
      const opened = await page.evaluate(() => !!document.querySelector('.dhero h2'));
      if (!opened) {
        console.error(
          '\nThe venue card click did not open a detail view, so back-restores-scroll\n' +
          'cannot be measured. Previously this fell through to goBack() on the list\n' +
          'entry and reported the resulting 0px as an app failure.\n',
        );
        process.exit(3);
      }
      await page.goBack().catch(() => {});
      await page.waitForTimeout(1400);
      const after = await page.evaluate(() => Math.round(window.scrollY));
      restored = { before, after, ok: Math.abs(after - before) <= 24 };
    }
  }
  // No card means the venue list was empty, which is a harness gap, not an app defect:
  // neither the agent container nor a CI runner reaches Google Places, and the fixture
  // does not currently produce a clickable card on this view. Reporting that as a
  // FAILURE made the suite permanently red; reporting it as a PASS would be a lie about
  // a bug the user has already been burned by once. So it skips, loudly, and the gap is
  // recorded in HANDOVER.md until the fixture can render a card.
  if (!restored) {
    skip('browser back restores list scroll position',
         'no venue card rendered — fixture gap, this check did NOT run');
  } else check(
    'browser back restores list scroll position',
    !!restored.ok,
    `left at ${restored.before}px, returned to ${restored.after}px`,
  );

  /**
   * A venue Places knows nothing about beyond its address (fixture `pl-6`).
   *
   * Two shipped defects, both invisible until the fixture could express absence:
   * the Call pillar rendered unconditionally, so a venue with no published number got
   * an action wired to `tel:` with an accessible name of "Call " — an action that
   * cannot act; and `externalLink` falls back to a Google Maps *search* URL, which was
   * labelled "Official website" and "See the full menu and photos". Neither is a thing
   * we were told. §5 Trust: a label that overclaims its destination is the same
   * category of failure as an invented fact, just cheaper to miss.
   *
   * What would be red: restore the ungated pillar and `tel:` reappears; restore either
   * hardcoded label and the wording assertions fail.
   */
  const thin = page.locator('[role="button"][aria-label^="View Hoxton Steam Buns"]').first();
  await thin.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await thin.count())) {
    console.error(
      '\nFixture venue "Hoxton Steam Buns" (pl-6) did not render a card. It is the only\n' +
      'fixture with no phone and no website, so the venue-action checks below cannot\n' +
      'run. This is a harness gap, not a pass.',
    );
    process.exit(3);
  }
  await thin.click();
  await page.waitForTimeout(900);
  const thinActions = await page.evaluate(() => {
    const txt = document.body.innerText;
    const labels = [...document.querySelectorAll('a[href],button')]
      .map((el) => el.getAttribute('aria-label') || '');
    return {
      telLinks: document.querySelectorAll('a[href^="tel:"]').length,
      claimsWebsite: labels.some((l) => /official website/i.test(l)) || /full menu and photos/i.test(txt),
      offersMaps: /open in google maps/i.test(txt),
      onVenuePage: /Hoxton Steam Buns/.test(txt),
      /**
       * An "at a glance" tile must never be a label over nothing.
       *
       * The Spend tile was the only one of the three built ungated, and
       * `priceTierLabel` returns '' when Places published no band — so a venue Google
       * holds no price for rendered a "SPEND" heading above empty space. It reached a
       * real device and the user photographed it. Nothing here could have failed it,
       * because the fixture factory defaulted a band onto every venue; that default is
       * now removed and `pl-6` carries none.
       *
       * Counts a tile as empty when its label is present but no non-whitespace text
       * follows it inside the same tile.
       */
      emptyGlanceTiles: [...document.querySelectorAll('*')]
        .filter((el) => /^(SPEND|STATUS|DISTANCE)$/i.test((el.textContent || '').trim()))
        .map((label) => {
          const tile = label.closest('div');
          const rest = (tile?.textContent || '').replace((label.textContent || '').trim(), '').trim();
          return rest.length === 0 ? (label.textContent || '').trim() : null;
        })
        .filter(Boolean),
    };
  });
  check('venue with no phone renders no Call action', thinActions.onVenuePage && thinActions.telLinks === 0,
    thinActions.onVenuePage ? `${thinActions.telLinks} tel: link(s)` : 'not on the venue page');
  check('a Maps fallback is not labelled "Official website"', !thinActions.claimsWebsite);
  removed('a Maps fallback says so', thinActions.offersMaps);
  check(
    'no "at a glance" tile is a label over nothing',
    thinActions.onVenuePage && thinActions.emptyGlanceTiles.length === 0,
    thinActions.emptyGlanceTiles.length
      ? `empty: ${thinActions.emptyGlanceTiles.join(', ')}`
      : 'all tiles carry a value',
  );
  await page.goBack().catch(() => {});
  await page.waitForTimeout(900);

  /**
   * The venue action pillars divide the row evenly.
   *
   * They are `flex-1`, so they can only be unequal if their container has no width to
   * divide — which is exactly what happened: the sidebar carries `self-start` for the
   * desktop sticky column, and once the mobile container became a flex column, that
   * shrank the whole column to content width. The pillars came out 78/44/57px, bunched
   * left with their labels running together, while all 46 checks stayed green and the
   * page looked fine at the top where the reorder had been eyeballed. A user found it.
   *
   * What would be red: restore `self-start` without the `lg:` prefix.
   */
  const anyCard = page.locator('[role="button"][aria-label^="View "]:visible').first();
  await anyCard.click();
  await page.waitForTimeout(1000);
  const pillars = await page.evaluate(() => {
    const first = document.querySelector('a[aria-label="Get directions"]');
    if (!first || !first.parentElement) return null;
    const row = first.parentElement;
    const widths = [...row.children].map((c) => Math.round(c.getBoundingClientRect().width));
    return { widths, rowWidth: Math.round(row.getBoundingClientRect().width) };
  });
  if (!pillars || pillars.widths.length < 2) {
    removed('venue action pillars share the row evenly', false, 'action row not found');
  } else {
    const spread = Math.max(...pillars.widths) - Math.min(...pillars.widths);
    // The row width includes its own horizontal padding (px-5 = 40px at this viewport),
    // so an evenly divided row lands near 0.9 of rowWidth/n, not 1.0. The failure this
    // guards is shrink-to-content — 78/44/57 in a 219px row, i.e. ~0.6 — so the
    // threshold sits between the two, not flush against the healthy value.
    const share = Math.min(...pillars.widths) / (pillars.rowWidth / pillars.widths.length);
    check(
      'venue action pillars share the row evenly',
      spread <= 2 && share >= 0.8,
      `${pillars.widths.join('/')}px in a ${pillars.rowWidth}px row`,
    );
  }
  await page.goBack().catch(() => {});
  await page.waitForTimeout(900);

  /**
   * Rating enrichment — optional rating, its count, and the weekly-hours disclosure.
   *
   * The fixture is uneven on purpose (verify/fixtures/places.mjs): pl-3 Maison Verte has
   * NO rating, pl-1 Trattoria is rated AND counted with a full week of hours, pl-6 Hoxton
   * has no hours at all. Each assertion below names the venue whose absence or presence
   * makes it fall.
   *
   * What would be red, per check:
   *   no orphan star        — pl-3 has no rating; a star with nothing beside it =>
   *                           the invented 4.0 default came back, or the guard was dropped
   *   rating count renders   — pl-1 publishes 1284 ratings; missing "(1,284)" =>
   *                           userRatingCount was not requested or not mapped
   *   weekly hours present   — pl-1 has 7 lines; no <details> => the disclosure regressed
   *   no hours, no module    — pl-6 has none; a Today line or an All-week door => a hours
   *                           block rendered on a venue that published no hours
   */
  const starsOn = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('svg')].filter((s) =>
        /star/i.test(s.getAttribute('class') || ''),
      ).length,
    );

  const unrated = page.locator('[role="button"][aria-label^="View Maison Verte"]').first();
  await unrated.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await unrated.count())) {
    skip('venue detail: no star icon without a rating beside it', 'Maison Verte card not found');
  } else {
    await unrated.click();
    await page.waitForTimeout(900);
    const stars = await starsOn();
    check('venue detail: no star icon without a rating beside it', stars === 0,
      `pl-3 publishes no rating; found ${stars} star icon(s) — the invented 4.0 default was removed`);
    await page.goBack().catch(() => {});
    await page.waitForTimeout(900);
  }

  const rated = page.locator('[role="button"][aria-label^="View Trattoria Sorella"]').first();
  await rated.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await rated.count())) {
    skip('venue detail: rating count renders beside the rating', 'Trattoria Sorella card not found');
  } else {
    await rated.click();
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const txt = document.body.innerText;
      return {
        hasCount: /\(1,284\)/.test(txt),
        hasWeekly: !!document.querySelector('details'),
        allWeek: /All week/i.test(txt),
      };
    });
    removed('venue detail: rating count renders beside the rating', info.hasCount,
      'pl-1 publishes userRatingCount 1284; expected "(1,284)" in en-GB');
    removed('venue detail: full-week hours disclosure present',
      info.hasWeekly && info.allWeek, 'expected a <details> "All week" holding the 7 weekday lines');
    await page.goBack().catch(() => {});
    await page.waitForTimeout(900);
  }

  const noHours = page.locator('[role="button"][aria-label^="View Hoxton Steam Buns"]').first();
  await noHours.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await noHours.count())) {
    skip('venue detail: no hours module for a venue with no hours', 'Hoxton Steam Buns card not found');
  } else {
    await noHours.click();
    await page.waitForTimeout(900);
    const hours = await page.evaluate(() => {
      const onPage = /Hoxton Steam Buns/.test(document.body.innerText);
      // Scope to the venue detail: a <details> here would be the hours disclosure.
      return { onPage, hasWeekly: !!document.querySelector('details'), allWeek: /All week/i.test(document.body.innerText) };
    });
    check('venue detail: no hours module for a venue with no hours',
      hours.onPage && !hours.hasWeekly && !hours.allWeek,
      hours.onPage ? `weekly=${hours.hasWeekly} allWeek=${hours.allWeek}` : 'not on the venue page');
    await page.goBack().catch(() => {});
    await page.waitForTimeout(900);
  }

  // --- layout + hit targets, every view ---------------------------------------
  const MEASURE = () => {
    const miss = [];
    document.querySelectorAll('button,a[href],[role="button"],input,select').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.top < 0 || r.bottom > innerHeight) return;
      if (getComputedStyle(el).visibility === 'hidden') return;
      const cx = r.left + r.width / 2;
      const hit = (y) => { const h = document.elementFromPoint(cx, y); return !!h && (h === el || el.contains(h)); };
      if (r.height >= 44 || hit(r.top - 1) || hit(r.bottom + 1)) return;
      miss.push(((el.getAttribute('aria-label') || el.textContent || '').trim()).slice(0, 24));
    });
    return { over: document.body.scrollWidth > innerWidth, miss };
  };

  // Tab wording follows docs/design/occasion-prototype.html: Eat out / Out / Cook / Saved.
  for (const label of ['Eat out', 'Out', 'Cook', 'Saved']) {
    // Same two-nav ambiguity as the de-DE check below — target the rendered one.
    await page.locator(`#tabs button:has-text("${label}"):visible`).first().click().catch(() => {});
    await page.waitForTimeout(900);
    const r = await page.evaluate(MEASURE);
    check(`${label}: no overflow, all targets >=44pt`, !r.over && r.miss.length === 0,
      r.miss.length ? r.miss.join(', ') : '');

    /*
     * NO FIELD UNDER 16px ON A PHONE.
     *
     * Mobile Safari zooms the whole page when you focus an input whose COMPUTED
     * font-size is under 16px, and never zooms back out — the user is left scaled in
     * and panned, which reads as three unrelated bugs at once: random zooming, wrong
     * padding, and content moving around.
     *
     * The rule to prevent it existed in `index.css` for this project's entire life and
     * NEVER APPLIED: it was written inside `@layer base`, and Tailwind's utilities sit
     * in a later cascade layer, so `text-sm` beat it every time. Nothing could catch
     * that, because nothing measured a COMPUTED font-size — the rule was present in the
     * stylesheet and provably not in effect. Measured, not read: 14px on #place-search.
     *
     * The user found this on their own phone. Again.
     */
    const zoomers = await page.evaluate(() =>
      [...document.querySelectorAll('input,select,textarea')]
        .filter((el) => !['range', 'checkbox', 'radio', 'hidden'].includes(el.type))
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => `${el.id || el.getAttribute('aria-label') || el.type}@${getComputedStyle(el).fontSize}`),
    );
    check(`${label}: no field under 16px (iOS focus-zoom)`, zoomers.length === 0, zoomers.join(', '));
  }

  /*
   * PICKING A DIFFERENT OCCASION MUST SEARCH FOR A DIFFERENT THING.
   *
   * `fetchVenues` took a `kind`, and for `kind === 'bar'` it threw the query away and
   * asked for "bars in <city>" no matter what. `BAR_KEYS` covers seven occasions —
   * Drinks, Happy hour, Cocktails, Live music, Dancing, Quiet drink, Rooftop — which is
   * every tile on the Out tab. So all seven returned the same twenty venues in the same
   * order, and the owner reported it exactly as it behaved: "I click on the moods and I
   * get the same list of restaurants, no difference whatsoever."
   *
   * Nothing could have caught that. Every existing check asserted that results RENDER,
   * and they did — the same results, every time. Rendering is not relevance.
   *
   * So this asserts the thing the product actually promises (§5, Express intent): the
   * request that leaves the browser changes when the occasion changes. It reads the real
   * `textQuery` off the intercepted Places call, which cannot be satisfied by a component
   * that merely redraws.
   */
  const sentQueries = [];
  page.on('request', (r) => {
    if (r.url().includes(':searchText') && r.method() === 'POST') {
      try { sentQueries.push(JSON.parse(r.postData() || '{}').textQuery); } catch { /* not JSON */ }
    }
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  /* `:has-text("Out")` is a CASE-INSENSITIVE SUBSTRING match, so it selects "Eat out"
     first and this check silently measured the wrong tab — it passed on two restaurant
     occasions, which always differed, while the bar bug it exists for sat untouched.
     `:text-is()` is the exact match. Caught by reading the check's own output rather
     than its exit code: it printed "brunch" vs "cafe with wifi", which are Eat-out
     queries, on a check whose whole subject is the Out tab. */
  await page.locator('#tabs button:text-is("Out")').first().click();
  await page.waitForTimeout(500);

  const tiles = page.locator('#grid .tile');
  sentQueries.length = 0;
  await tiles.nth(0).click();
  await page.waitForTimeout(1400);
  const firstOccasion = sentQueries[0];

  sentQueries.length = 0;
  await tiles.nth(1).click();
  await page.waitForTimeout(1400);
  const secondOccasion = sentQueries[0];

  check(
    'Out tab: a different occasion searches for a different thing',
    Boolean(firstOccasion) && Boolean(secondOccasion) && firstOccasion !== secondOccasion,
    firstOccasion === secondOccasion
      ? `both occasions sent "${firstOccasion}" — the tile changes nothing`
      : `"${firstOccasion}" vs "${secondOccasion}"`,
  );

  // --- deep links and titles --------------------------------------------------
  //
  // Nothing was in the URL, so no screen in this product could be shared, bookmarked or
  // survive a refresh, and every history entry had the same title.
  await page.goto(BASE + '?tab=happy-hour&city=Lisbon', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const deep = await page.evaluate(() => ({
    title: document.title,
    hh: /Happy Hour/i.test(document.body.innerText),
    city: /Lisbon/.test(document.body.innerText),
    theme: document.querySelector('meta[name="theme-color"]:not([media])')?.getAttribute('content'),
    /**
     * PRECEDENCE, not just presence.
     *
     * A browser uses the FIRST theme-color whose media matches. index.html declares two
     * keyed to prefers-color-scheme; App.tsx maintains a third, live one driven from the
     * MANUAL dark class. For years that live tag was appendChild'd to the end of <head>,
     * where the media tags always won it — a silent no-op for the only case it exists to
     * handle. On a phone set to dark with the app toggled light, Safari painted near-black
     * chrome around a bone-white page: a hard band welded to the top of the screen beside
     * the Dynamic Island, reported for several sessions as a "gap behind the header".
     *
     * "Present" could never fail that, because it WAS present. Only its position was
     * wrong. So this asserts the winner, which is the only thing the browser reads.
     */
    firstThemeColorHasNoMedia: !document
      .querySelector('meta[name="theme-color"]')
      ?.hasAttribute('media'),
  }));
  /* THE THREE ROUTING CHECKS ARE REMOVED, AND THIS IS A REAL LOSS — recorded, not hidden.
   *
   * `?tab=`, `?city=` and a per-screen `document.title` were asserted against the React
   * app, which seeded and validated both params and renamed the document per screen. The
   * app is now the prototype verbatim, and the prototype holds ALL navigation in local
   * variables: no URL state, no history entries, one title for every screen. So nothing
   * is shareable, bookmarkable, or survives a refresh, and the back gesture does not
   * close the venue detail.
   *
   * Keeping the checks would have made the suite permanently red for a deliberate
   * decision; keeping them and softening them would have been worse. They are removed
   * and the capability is logged as the top open item in HANDOVER.md, because it is the
   * one thing the previous app did better and it will have to come back.
   */
  check('live theme-color meta present', !!deep.theme, deep.theme || 'missing');
  check(
    'live theme-color WINS (first in head, no media)',
    deep.firstThemeColorHasNoMedia,
    'a media-keyed tag precedes it, so the browser chrome follows the SYSTEM scheme and '
      + 'can disagree with the app: black chrome around a light app. Use prepend, not appendChild.',
  );

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // --- a German in London -----------------------------------------------------
  //
  // Every render check in this suite ran as en-GB, so no locale bug could ever fail it.
  // This runs the same app as de-DE and asserts the formatting a German actually reads.
  {
    const de = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
    });
    const dp = await de.newPage();
    const fmt = await dp.evaluate(() => ({
      dist: new Intl.NumberFormat(navigator.language, {
        style: 'unit', unit: 'kilometer', unitDisplay: 'short', maximumFractionDigits: 1,
      }).format(1.4),
      lang: navigator.language,
    }));
    check('de-DE distance uses a comma', fmt.dist.includes(','), `${fmt.lang} -> ${fmt.dist}`);
    await de.close();
  }

  /**
   * The scaled-recipe chip, in a comma-decimal locale, with its colours read off the
   * rendered element.
   *
   * This exists because the chip was the single thing in a whole session's diff that
   * nothing had ever looked at: it only renders when `plates !== defaultPlates`, so no
   * screenshot in the sweep reached it, and it was shipped twice on "the markup is
   * token-bound" — which is a reading of the source, not a verification.
   *
   * Red when: the quantity comes back "x1.5" (toFixed is back, or Intl was bypassed),
   * or any colour resolves to a raw hex instead of the token.
   */
  {
    const de = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });
    const dp = await de.newPage();
    await installFixtures(dp);
    await dp.goto(BASE, { waitUntil: 'domcontentloaded' });
    /* `:visible` is load-bearing, not decoration. Since the desktop workspace landed
       there are TWO buttons matching this selector — the `.desktop-nav-link` (hidden
       below `md`) and the mobile tab bar's. At this context's 390px, `.first()`
       resolved to the desktop one, which is correctly invisible, so the click spun for
       30s and took the whole suite down. This picks whichever nav actually renders at
       the viewport under test, so the check keeps working at every width instead of
       silently depending on DOM order. */
    await dp.locator('#tabs button:has-text("Cook"):visible').first().click();
    await dp.waitForTimeout(1500);
    const card = dp.locator('[role="button"][aria-label^="View "]:visible').first();
    let chip = null;
    if (await card.count()) {
      await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await dp.waitForTimeout(300);
      const box = await card.boundingBox();
      if (box) {
        await dp.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200));
        await dp.waitForTimeout(1200);
        const plus = dp.locator('button[aria-label*="ncrease"], button:has-text("+")').first();
        if (await plus.count()) { await plus.click(); await dp.waitForTimeout(500); }
        const el = dp.locator('span:has-text("Scaled x")').first();
        if (await el.count()) {
          chip = await el.evaluate((n) => {
            const c = getComputedStyle(n);
            return { text: n.textContent.trim(), color: c.color, bg: c.backgroundColor };
          });
        }
      }
    }
    removed('scaled chip renders at all', !!chip, chip ? chip.text : 'never reached — recipe fixture or stepper changed');
    removed('scaled quantity uses the locale decimal separator',
      !!chip && /x\d+,\d/.test(chip.text), chip ? chip.text : 'n/a');
    removed('scaled chip colour comes from the accent token',
      !!chip && chip.color === 'rgb(124, 45, 18)', chip ? chip.color : 'n/a');
    await de.close();
  }

  // Clock rewriting and day-label stripping, run against the real module.
  {
    // A silent catch here would skip three checks and still print a green total — the
    // exact "check that cannot fail" this suite exists to prevent. Import failure is a
    // hard failure. (Node strips TS types natively on 22+; tsx also works.)
    let mod = null, importErr = '';
    try { mod = await import('../src/locale.ts'); } catch (e) { importErr = String(e).split('\n')[0]; }
    check('locale module importable', !!mod, importErr);
    if (mod) {
      check('12h hours rewritten to 24h for de', mod.localiseHours('9:00 AM – 10:00 PM', 'de-DE') === '09:00 – 22:00',
        mod.localiseHours('9:00 AM – 10:00 PM', 'de-DE'));
      check('day label stripped in a non-Latin script', mod.stripDayPrefix('月曜日: 12:00 – 22:00') === '12:00 – 22:00',
        mod.stripDayPrefix('月曜日: 12:00 – 22:00'));
      check('a bare time is not mistaken for a day label', mod.stripDayPrefix('12:00 – 22:00') === '12:00 – 22:00');
    }
  }

  // --- landscape and desktop -------------------------------------------------
  //
  // Neither was ever measured. Landscape is where the notch insets become non-zero and
  // where the unpainted-canvas bug was visible; desktop is where a clipped rail, 36px
  // targets and a duplicated headline shipped unseen. Both run on every check now.
  // 393x852 is the iPhone 15/16 Pro — the device the user actually holds, and a size
  // this suite had NEVER measured. Everything was checked at 390x844 (iPhone 12/13/14),
  // 3px narrower and 8px shorter. 430x932 is the Pro Max, 40px wider than anything that
  // had ever been rendered. A viewport you do not measure is a viewport you ship blind,
  // and "close enough to 390" is not a measurement.
  for (const [w, h, name] of [
    [393, 852, 'iPhone 15/16 Pro 393x852'],
    [430, 932, 'iPhone Pro Max 430x932'],
    [844, 390, 'landscape 844x390'],
    [1440, 900, 'desktop 1440x900'],
  ]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-GB' });
    await c.addInitScript(() => { try { localStorage.setItem('whats_good_city', 'London'); } catch {} });
    const pg = await c.newPage();
    await pg.route('**/*', (r) =>
      r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(1800);
    const r = await pg.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);

      /**
       * §11.5 — content never hugs the bezel.
       *
       * This check exists because the header logo shipped at x=0, flush against the
       * screen edge, on every device in portrait, and the user found it. `.safe-x`
       * was unlayered CSS setting `padding-left: max(0px, env(safe-area-inset-left))`,
       * and unlayered beats Tailwind's `@layer utilities` in the cascade — so it
       * REPLACED the header's `px-6` with 0. Nothing could fail: no overflow, no hit
       * target missed, canvas painted, six viewports green, and a screenshot that a
       * reader glances past. Only the distance from the edge says it.
       *
       * Measured on the real chrome — the header and the mobile tab bar — since those
       * are the two full-bleed fixed surfaces, and the ones a person looks at first.
       * The floor is 16px rather than §11.5's 20px so a deliberately tighter chrome
       * gutter is allowed; touching the bezel is not.
       */
      const edges = [];
      for (const [sel, what] of [['header', 'header'], ['[class*="tabbar-h"]', 'tab bar']]) {
        const bar = document.querySelector(sel);
        if (!bar) continue;
        const kids = [...bar.querySelectorAll('button, a')].filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0;
        });
        if (!kids.length) continue;
        const left = Math.min(...kids.map((el) => el.getBoundingClientRect().left));
        const right = Math.max(...kids.map((el) => el.getBoundingClientRect().right));
        edges.push({ what, left: Math.round(left), rightGap: Math.round(innerWidth - right) });
      }

      return {
        over: document.body.scrollWidth > innerWidth,
        htmlBg: cs.backgroundColor,
        painted: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent',
        edges,
      };
    });
    check(`${name}: no overflow`, !r.over);
    check(`${name}: canvas painted`, r.painted, r.htmlBg);
    const tooTight = r.edges.filter((e) => e.left < 16 || e.rightGap < 16);
    check(
      `${name}: chrome clears the bezel`,
      r.edges.length > 0 && tooTight.length === 0,
      r.edges.length === 0
        ? 'no chrome found to measure — selector drift, not a pass'
        : r.edges.map((e) => `${e.what} L${e.left}/R${e.rightGap}`).join('  '),
    );
    await pg.screenshot({ path: resolve(HERE, 'out', `${name.split(' ')[0]}.png`) });
    await c.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  const skipped = results.filter((r) => r.skipped);
  const ran = results.length - skipped.length;
  console.log(`\n${ran - failed.length}/${ran} checks passed` +
    (skipped.length ? `, ${skipped.length} SKIPPED (did not run — not evidence)` : '') + '.\n');
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
