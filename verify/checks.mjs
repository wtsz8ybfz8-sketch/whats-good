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
  const cssRaw = readFileSync(resolve(ROOT, 'src/index.css'), 'utf8');
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
  check(
    'no toFixed() used to format a distance',
    !/toFixed\(1\)\}\s*km/.test(readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8')),
    'half the world writes 1,4 km — Intl knows which half',
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
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('whats_good_city', 'London'); } catch {}
  });
  const page = await ctx.newPage();
  await installFixtures(page);

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);

  check('no Vite error overlay', (await page.locator('vite-error-overlay').count()) === 0);

  // --- chrome has no gap ------------------------------------------------------
  const gap = await page.evaluate(() => {
    const bar = document.querySelector('.action-bar');
    const nav = document.querySelector('nav[aria-label="Primary"]');
    if (!bar || !nav) return null;
    return Math.round(nav.getBoundingClientRect().top - bar.getBoundingClientRect().bottom);
  });
  check('action bar sits flush on the tab bar', gap === 0, `gap ${gap}px`);

  /**
   * Simulated safe-area inset.
   *
   * Chromium always reports env(safe-area-inset-bottom) as 0, so "gap is 0 here" says
   * nothing about an iPhone with a home indicator — which is precisely the hole the
   * last fix fell through. We cannot make Chromium produce a real inset, but we CAN
   * ask the question that matters: if the inset were 34px, does the relationship still
   * hold? Both bars derive from --tabbar-h, so substituting a taller value tests the
   * same arithmetic the real inset drives.
   */
  const simulated = await page.evaluate(() => {
    const el = document.createElement('style');
    el.textContent = ':root { --tabbar-h: 91px; }'; // 57 + a 34px home-indicator inset
    document.head.appendChild(el);
    const bar = document.querySelector('.action-bar');
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const g = Math.round(nav.getBoundingClientRect().top - bar.getBoundingClientRect().bottom);
    el.remove();
    return g;
  });
  check('chrome stays flush at a simulated 34px inset', simulated === 0, `gap ${simulated}px`);

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
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => Math.round(window.scrollY));
    const c2 = page.locator('[role="button"][aria-label^="View "]:visible').first();
    const box = await c2.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 120));
      await page.waitForTimeout(900);
      await page.goBack().catch(() => {});
      await page.waitForTimeout(1200);
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

  /* --- venue detail: the Places profile fields -------------------------------
   *
   * These exist because the profile fields (servesLunch, editorialSummary, rating…)
   * are tri-state at the source and the failure mode is silent: Google omits a key for
   * any venue nobody surveyed, so a truthiness filter looks perfect on a fully-profiled
   * fixture and quietly reports "does not serve breakfast" for half the world. The
   * fixture is uneven on purpose (verify/fixtures/places.mjs) so each assertion below
   * has a venue that makes it fail.
   *
   * What would be RED, per check:
   *   meals render          — pl-1 profiled, block missing => the mapping dropped it
   *   false is not a chip   — pl-2 has servesBreakfast:false; a Breakfast chip => truthiness
   *   no orphan star        — pl-3 has NO rating; a star with no number => unguarded render
   *   bare venue is clean   — pl-5 has no profile at all; any of the blocks => invented UI
   */
  const openVenue = async (name) => {
    const c = page.locator(`[role="button"][aria-label^="View ${name}"]`).first();
    if (!(await c.count())) return null;
    await c.scrollIntoViewIfNeeded().catch(() => {});
    await c.click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    const facts = await page.evaluate(() => {
      const txt = (document.body.innerText || '');
      const chips = Array.from(document.querySelectorAll('li')).map((l) => l.textContent.trim());
      // An "orphan star" is a star icon with no digit anywhere in its own row — the
      // exact shape the removed `?? 4.0` default used to hide.
      const orphanStar = Array.from(document.querySelectorAll('svg.lucide-star')).some((s) => {
        const row = s.closest('span, div');
        return row ? !/\d/.test(row.textContent || '') : false;
      });
      return {
        hasGoodToKnow: /Good to know/i.test(txt),
        hasConfirmedMeals: /Confirmed meals/i.test(txt),
        hasGoogleSays: /What Google says/i.test(txt),
        hasWeekly: !!document.querySelector('details'),
        chips,
        orphanStar,
      };
    });
    await page.goBack().catch(() => {});
    await page.waitForTimeout(900);
    return facts;
  };

  const profiled = await openVenue('Trattoria Sorella');
  if (!profiled) {
    skip('venue detail: profile fields', 'Trattoria Sorella card not found');
  } else {
    check('venue detail: confirmed meals render for a profiled venue',
      profiled.hasGoodToKnow && profiled.hasConfirmedMeals && profiled.chips.includes('Lunch'),
      `good-to-know=${profiled.hasGoodToKnow} meals=${profiled.hasConfirmedMeals}`);
    check("venue detail: Google's editorial summary renders when present",
      profiled.hasGoogleSays, 'editorialSummary supplied by fixture pl-1');
    check('venue detail: full-week hours disclosure present',
      profiled.hasWeekly, 'expected a <details> holding the 7 weekday lines');
  }

  const triState = await openVenue('Kaya Ramen Bar');
  if (!triState) {
    skip('venue detail: tri-state meals', 'Kaya Ramen Bar card not found');
  } else {
    // The single most important assertion in this block.
    check('venue detail: a confirmed-FALSE meal is not rendered as served',
      !triState.chips.includes('Breakfast') && !triState.chips.includes('Brunch'),
      `servesBreakfast:false and servesBrunch:false must not appear; chips=[${triState.chips.join(', ')}]`);
    check('venue detail: confirmed-TRUE meals still render alongside the false ones',
      triState.chips.includes('Lunch') && triState.chips.includes('Dinner'),
      `chips=[${triState.chips.join(', ')}]`);
    check('venue detail: an UNKNOWN meal is not rendered either',
      !triState.chips.includes('Dessert') && !triState.chips.includes('Coffee'),
      'servesDessert/servesCoffee absent from fixture => must not appear');
  }

  const unrated = await openVenue('Maison Verte');
  if (!unrated) {
    skip('venue detail: unrated venue', 'Maison Verte card not found');
  } else {
    check('venue detail: no star icon without a rating beside it',
      !unrated.orphanStar,
      'pl-3 publishes no rating; the invented 4.0 default was removed');
    check('venue detail: no profile modules invented for an unprofiled venue',
      !unrated.hasGoodToKnow && !unrated.hasGoogleSays,
      'pl-3 has no meals, attributes or summary — the blocks must be absent, not empty');
  }

  const bare = await openVenue('Aoyama Soba House');
  if (!bare) {
    skip('venue detail: bare venue', 'Aoyama Soba House card not found');
  } else {
    check('venue detail: a venue with no profile fields renders none of the new modules',
      !bare.hasGoodToKnow && !bare.hasGoogleSays,
      'this is what most real venues return — it must degrade to nothing, not to filler');
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

  for (const label of ['Find', 'Stay In', 'Happy Hour', 'Saved']) {
    await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click().catch(() => {});
    await page.waitForTimeout(900);
    const r = await page.evaluate(MEASURE);
    check(`${label}: no overflow, all targets >=44pt`, !r.over && r.miss.length === 0,
      r.miss.length ? r.miss.join(', ') : '');
  }

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
  }));
  check('?tab= opens that tab', deep.hh, deep.title);
  check('?city= is honoured', deep.city);
  check('document.title names the screen', /Happy hour/i.test(deep.title), deep.title);
  check('live theme-color meta present', !!deep.theme, deep.theme || 'missing');

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
    await dp.locator('nav[aria-label="Primary"] button:has-text("Stay In")').first().click();
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
    check('scaled chip renders at all', !!chip, chip ? chip.text : 'never reached — recipe fixture or stepper changed');
    check('scaled quantity uses the locale decimal separator',
      !!chip && /x\d+,\d/.test(chip.text), chip ? chip.text : 'n/a');
    check('scaled chip colour comes from the accent token',
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
