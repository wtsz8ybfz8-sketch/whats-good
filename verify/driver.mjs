/**
 * The verification harness.
 *
 * Why this exists: every session before this one shipped changes it could not see.
 * `tsc` passing has let broken layout reach the user repeatedly (CLAUDE.md §6), and
 * the two data sources the app depends on — TheMealDB and Google Places — are both
 * unreachable from this container, so the recipe and venue journeys had literally
 * never been rendered here. Intercepting both at the network layer turns "untestable"
 * into "screenshotted".
 *
 * Run:  node verify/driver.mjs            (expects a dev server on :3000)
 *       node verify/driver.mjs --dark     (same views in dark mode)
 *
 * Output: verify/out/<view>.png and verify/out/report.json
 */

import { ENGINE, launchBrowser } from './browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AREA_LIST_RESPONSE, PNG_1X1, randomResponse, searchResponse } from './fixtures/mealdb.mjs';
import { NEARBY_RESPONSE, SEARCH_TEXT_RESPONSE } from './fixtures/places.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'out');
const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000/';
const DARK = process.argv.includes('--dark');
// The engine is part of the filename, not just the log line. A WebKit screenshot that
// silently overwrites the Chromium one of the same name is how "we looked at it" turns
// into looking at the wrong picture.
const SUFFIX = `${ENGINE === 'chromium' ? '' : `-${ENGINE}`}${DARK ? '-dark' : ''}`;


const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function installRoutes(page) {
  // Order matters and is the opposite of what it reads like: Playwright matches routes
  // in REVERSE registration order, so the catch-all has to be registered FIRST or it
  // swallows every fixture below it.
  //
  // Anything that tries to leave the box would otherwise hang on the agent proxy for a
  // full navigation timeout, making a mundane blocked request look like a renderer hang
  // (§3). Fail it fast and loudly instead.
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('http://localhost')) return route.continue();
    if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    console.warn(`  ! blocked unmocked external request: ${url.slice(0, 90)}`);
    return route.abort();
  });

  // --- TheMealDB -----------------------------------------------------------
  await page.route('**themealdb.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/list.php')) return route.fulfill(json(AREA_LIST_RESPONSE));
    if (url.pathname.endsWith('/search.php')) {
      return route.fulfill(json(searchResponse(url.searchParams.get('s'))));
    }
    if (url.pathname.endsWith('/random.php')) return route.fulfill(json(randomResponse()));
    // Everything else on that host is an image (/images/media/meals/...).
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
  });

  // --- Google Places -------------------------------------------------------
  await page.route('**places.googleapis.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes(':searchText')) return route.fulfill(json(SEARCH_TEXT_RESPONSE));
    if (url.includes(':searchNearby')) return route.fulfill(json(NEARBY_RESPONSE));
    // Photo media endpoint.
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
  });
}

/**
 * Everything measured in-page, in one pass.
 *
 * Hit targets are probed with elementFromPoint, never with getBoundingClientRect
 * heights: the 44px target lives on an invisible pseudo-element, so a rect-based
 * audit reports a false failure and then "fixes" it with padding — which grows the
 * visual ink and breaks §11.3. The probe asks the only question that matters: if a
 * thumb lands one pixel outside the visible control, does this element receive it?
 */
const MEASURE = () => {
  const doc = document.documentElement;

  const firstTextLeft = (() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      const el = node.parentElement;
      if (!el) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      return { text: node.nodeValue.trim().slice(0, 40), left: Math.round(r.left * 10) / 10 };
    }
    return null;
  })();

  const controls = Array.from(
    document.querySelectorAll('button, a[href], [role="button"], input, select'),
  ).filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      r.top >= 0 &&
      r.bottom <= window.innerHeight &&
      s.visibility !== 'hidden' &&
      s.pointerEvents !== 'none'
    );
  });

  const hitTargets = controls.map((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const owns = (y) => {
      const h = document.elementFromPoint(cx, y);
      return !!h && (h === el || el.contains(h) || el.contains(h.parentElement));
    };
    // A false on one side is legitimate when a neighbouring control owns that pixel,
    // so record both sides and let the reader judge rather than asserting a verdict.
    const above = owns(r.top - 1);
    const below = owns(r.bottom + 1);
    return {
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 34),
      h: Math.round(r.height * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      reach44: r.height >= 44 || above || below,
      probe: [above, below],
    };
  });

  return {
    innerWidth: window.innerWidth,
    scrollWidth: document.body.scrollWidth,
    docScrollWidth: doc.scrollWidth,
    overflowsHorizontally: document.body.scrollWidth > window.innerWidth,
    dark: doc.classList.contains('dark'),
    firstText: firstTextLeft,
    controlCount: hitTargets.length,
    hitTargetFailures: hitTargets.filter((t) => !t.reach44),
    headings: Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((h) => h.textContent.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 8),
    bodyTextSample: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 240),
  };
};

async function capture(page, name, report) {
  await page.waitForTimeout(650); // let entrance animations settle before measuring
  const data = await page.evaluate(MEASURE);
  const file = `${name}${SUFFIX}.png`;
  await page.screenshot({ path: resolve(OUT, file) });
  report[name] = { ...data, screenshot: file };
  const flag = data.overflowsHorizontally ? ' OVERFLOW' : '';
  const miss = data.hitTargetFailures.length;
  console.log(
    `  ✓ ${name.padEnd(16)} ${data.scrollWidth}/${data.innerWidth}px` +
      `${flag}  firstTextLeft=${data.firstText?.left ?? 'n/a'}  hitMisses=${miss}`,
  );
  return data;
}

/**
 * Navigate by the mobile tab bar, scoped to nav[aria-label="Primary"].
 *
 * Two traps live here. The header tab strip and the bottom bar are both in the DOM at
 * once, so an unscoped locator picks the hidden desktop one and times out. And the
 * bottom bar's first label is "Find", not "Find a Place" — `:has-text()` is
 * case-insensitive and substring-based, so "Find a Place" silently matched the big
 * "Find a place" CTA on the home screen and then found nothing at all on a detail
 * page, which read as "this view does not exist".
 */
const TABS = { mood: 'Find', happyHour: 'Happy Hour', stayIn: 'Stay In', saved: 'Saved' };

async function goTab(page, label) {
  const btn = page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first();
  await btn.click({ timeout: 8000 });
  await page.waitForTimeout(900);
}

/**
 * Cards expose role="button"; the first one in the results region opens the detail view.
 *
 * scrollIntoViewIfNeeded alone is not enough: it parks the card under the fixed glass
 * header, Playwright sees the header as the hit-test owner and the click times out —
 * which reads as "this view does not exist" when the view is fine. So we scroll the
 * card into the middle band of the viewport and click there.
 */
async function openFirstCard(page) {
  // Both result cards (venue and recipe) are labelled `View <name>`. A bare
  // [role="button"] also matches the filter-sheet trigger, which sits above the results
  // and quietly opens the filter panel instead — a "detail page" screenshot that is
  // actually the filter card.
  const card = page.locator('[role="button"][aria-label^="View "]:visible').first();
  if ((await card.count()) === 0) return false;
  await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  const box = await card.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200));
  await page.waitForTimeout(1200);
  return true;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    // London. The point of a non-default locale is that a country assumption anywhere
    // in the app shows up as wrong currency or wrong cuisine rather than staying hidden.
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });
  // Seed a city the way a returning user has one. The app deliberately refuses to
  // search with no location — it would build "best restaurants in " — so without this
  // the venue journey is unreachable and reads as a broken view rather than a guard
  // working correctly.
  await context.addInitScript(() => {
    try { localStorage.setItem('whats_good_city', 'London'); } catch {}
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 160)}`));

  await installRoutes(page);

  const report = { base: BASE, mode: DARK ? 'dark' : 'light', views: {}, unreachable: [] };
  const views = report.views;

  console.log(`\n▶ verifying ${BASE} at 390x844 (${report.mode})\n`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);

  if (DARK) {
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(400);
  }

  // A Vite error overlay renders as a perfectly valid page and has been mistaken for
  // a working app before. Catch it before anything else is measured.
  if (await page.locator('vite-error-overlay').count()) {
    const text = await page.locator('vite-error-overlay').innerText();
    console.error('\n✗ Vite error overlay is on screen:\n' + text.slice(0, 600));
    await page.screenshot({ path: resolve(OUT, 'VITE-ERROR.png') });
    await browser.close();
    process.exit(1);
  }

  const plan = [
    ['find-a-place', TABS.mood],
    ['stay-in', TABS.stayIn],
    ['happy-hour', TABS.happyHour],
    ['saved', TABS.saved],
  ];

  for (const [name, label] of plan) {
    try {
      await goTab(page, label);
      await capture(page, name, views);
    } catch (err) {
      console.error(`  ✗ ${name}: NOT REACHED — ${String(err).split('\n')[0]}`);
      report.unreachable.push({ view: name, reason: String(err).split('\n')[0] });
    }
  }

  // --- detail pages: the two surfaces nobody has ever seen render here -------
  try {
    await goTab(page, TABS.stayIn);
    if (await openFirstCard(page)) await capture(page, 'recipe-detail', views);
    else throw new Error('no recipe card present to open');
  } catch (err) {
    console.error(`  ✗ recipe-detail: NOT REACHED — ${String(err).split('\n')[0]}`);
    report.unreachable.push({ view: 'recipe-detail', reason: String(err).split('\n')[0] });
  }

  try {
    await goTab(page, TABS.mood);
    if (await openFirstCard(page)) await capture(page, 'venue-detail', views);
    else throw new Error('no venue card present to open');
  } catch (err) {
    console.error(`  ✗ venue-detail: NOT REACHED — ${String(err).split('\n')[0]}`);
    report.unreachable.push({ view: 'venue-detail', reason: String(err).split('\n')[0] });
  }

  report.consoleErrors = consoleErrors;
  await writeFile(
    resolve(OUT, `report${SUFFIX}.json`),
    JSON.stringify(report, null, 2) + '\n',
  );

  console.log(
    `\n${Object.keys(views).length} view(s) captured, ` +
      `${report.unreachable.length} unreachable, ${consoleErrors.length} console error(s).`,
  );
  if (consoleErrors.length) consoleErrors.slice(0, 6).forEach((e) => console.log('  ! ' + e));

  await browser.close();
  // Unreachable views are a real result, not a crash — exit non-zero so CI or a human
  // cannot read "it ran" as "it passed".
  process.exit(report.unreachable.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
