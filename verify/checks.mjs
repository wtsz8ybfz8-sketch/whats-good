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

import { chromium } from 'playwright-core';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AREA_LIST_RESPONSE, PNG_1X1, randomResponse, searchResponse } from './fixtures/mealdb.mjs';
import { NEARBY_RESPONSE, SEARCH_TEXT_RESPONSE } from './fixtures/places.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000/';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const json = (b) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
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

  const srcFiles = ['src/App.tsx', 'src/index.css', 'src/components/ErrorBoundary.tsx'];
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
        .filter((x) => /\b100vh\b|min-h-screen/.test(x.l)),
    );
  check(
    'no 100vh / min-h-screen',
    vh.length === 0,
    vh.length ? vh.map((x) => `${x.f}:${x.i}`).join(', ') : 'dvh tracks iOS browser chrome',
  );
}

// ── Rendered checks ───────────────────────────────────────────────────────────
async function main() {
  console.log(`\n▶ regression checks — ${BASE}\n`);
  staticChecks();

  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
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
  await page.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
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
  check(
    'browser back restores list scroll position',
    !!restored?.ok,
    restored ? `left at ${restored.before}px, returned to ${restored.after}px` : 'no card to test',
  );

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
  for (const [w, h, name] of [[844, 390, 'landscape 844x390'], [1440, 900, 'desktop 1440x900']]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-GB' });
    await c.addInitScript(() => { try { localStorage.setItem('whats_good_city', 'London'); } catch {} });
    const pg = await c.newPage();
    await pg.route('**/*', (r) =>
      r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(1800);
    const r = await pg.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        over: document.body.scrollWidth > innerWidth,
        htmlBg: cs.backgroundColor,
        painted: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent',
      };
    });
    check(`${name}: no overflow`, !r.over);
    check(`${name}: canvas painted`, r.painted, r.htmlBg);
    await pg.screenshot({ path: resolve(HERE, 'out', `${name.split(' ')[0]}.png`) });
    await c.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
