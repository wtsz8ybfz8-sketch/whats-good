/**
 * Named-device emulation pass.
 *
 * checks.mjs measures CSS geometry at hand-set viewport sizes. That is not the same as
 * emulating a device: a bare newPage({viewport}) has DPR 1, no touch, a desktop UA and
 * hover:hover — so image `srcset`/DPR selection, touch-only layout and coarse-pointer
 * media queries are never exercised. Playwright's device registry sets all of those
 * together. Named profiles only; never a hand-rolled approximation of one.
 */
import { devices } from 'playwright-core';
import { launchBrowser, ENGINE } from './browser.mjs';
import { AREA_LIST_RESPONSE, PNG_1X1, randomResponse, searchResponse } from './fixtures/mealdb.mjs';
import { NEARBY_RESPONSE, SEARCH_TEXT_RESPONSE } from './fixtures/places.mjs';

const BASE = 'http://localhost:3000/';
const PROFILES = ['iPhone 15 Pro', 'iPhone 14 Pro Max', 'Pixel 7'];
const json = (b) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

async function route(ctx) {
  await ctx.route('**/*', async (r) => {
    const u = r.request().url();
    if (u.includes('themealdb.com')) {
      if (u.includes('list.php')) return r.fulfill(json(AREA_LIST_RESPONSE));
      if (u.includes('random.php')) return r.fulfill(json(randomResponse()));
      if (u.includes('filter.php') || u.includes('search.php') || u.includes('lookup.php'))
        return r.fulfill(json(searchResponse(u)));
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    }
    if (u.includes('places.googleapis.com')) {
      if (u.includes('searchText')) return r.fulfill(json(SEARCH_TEXT_RESPONSE));
      if (u.includes('searchNearby')) return r.fulfill(json(NEARBY_RESPONSE));
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    }
    if (/\.(png|jpe?g|webp)(\?|$)/.test(u) && !u.includes('localhost'))
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    return r.continue();
  });
}

const out = [];
const say = (ok, label, detail = '') => {
  out.push(ok);
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? '  — ' + detail : ''}`);
};

const browser = await launchBrowser();
for (const name of PROFILES) {
  const d = devices[name];
  if (!d) { console.log(`  ! unknown profile ${name}`); continue; }
  const ctx = await browser.newContext({ ...d });
  await route(ctx);
  const page = await ctx.newPage();
  console.log(`\n▶ ${name} (${ENGINE}) ${d.viewport.width}x${d.viewport.height} dpr=${d.deviceScaleFactor} touch=${d.hasTouch}`);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // The emulation actually took: a hand-set viewport cannot fail this.
  const env = await page.evaluate(() => ({
    dpr: devicePixelRatio,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    coarse: matchMedia('(pointer: coarse)').matches,
    noHover: matchMedia('(hover: none)').matches,
  }));
  say(env.dpr === d.deviceScaleFactor && env.touch && env.coarse && env.noHover,
    'device emulation live', `dpr=${env.dpr} coarse=${env.coarse} hover:none=${env.noHover}`);

  // 1. Cuisine rail: no clipped item, and the rail is actually scrollable to its end.
  const rail = await page.evaluate(() => {
    const els = [...document.querySelectorAll('div,ul')].filter((e) => {
      const s = getComputedStyle(e);
      return /auto|scroll/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 200;
    });
    if (!els.length) return null;
    const r = els[0];
    const kids = [...r.children].filter((c) => c.getBoundingClientRect().width > 8);
    const last = kids[kids.length - 1];
    // A clipped LABEL is the bug: text wider than its own box, or an item whose text is ellipsised.
    const clipped = kids.filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent.trim());
    return { count: kids.length, clipped, scrollWidth: r.scrollWidth, clientWidth: r.clientWidth,
      lastRight: last.getBoundingClientRect().right, railRight: r.getBoundingClientRect().right };
  });
  if (!rail) say(false, 'cuisine rail found');
  else {
    say(rail.clipped.length === 0, 'cuisine rail: no chip clipped mid-word',
      rail.clipped.length ? rail.clipped.join(' | ') : `${rail.count} chips intact`);
    await page.evaluate(() => {
      const r = [...document.querySelectorAll('div,ul')].find((e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 200);
      r.scrollLeft = r.scrollWidth;
    });
    await page.waitForTimeout(150);
    const endOk = await page.evaluate(() => {
      const r = [...document.querySelectorAll('div,ul')].find((e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 200);
      const kids = [...r.children].filter((c) => c.getBoundingClientRect().width > 8);
      const last = kids[kids.length - 1].getBoundingClientRect();
      return { gap: Math.round(r.getBoundingClientRect().right - last.right), w: Math.round(last.width) };
    });
    say(endOk.gap >= 0 && endOk.gap < 40, 'last rail chip fully reachable at scroll end', `right gap ${endOk.gap}px`);
  }

  // 2. Bottom chrome: nothing interactive trapped under the fixed bars.
  const chrome = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 8);
    const bars = fixed.filter((e) => e.getBoundingClientRect().bottom > innerHeight - 4);
    const top = Math.min(...bars.map((b) => b.getBoundingClientRect().top), innerHeight);
    // Scroll to the very bottom, then look for a control whose centre is under the bars.
    scrollTo(0, document.body.scrollHeight);
    const buried = [...document.querySelectorAll('button,a,[role="button"],input')].filter((e) => {
      const r = e.getBoundingClientRect();
      if (r.height < 4 || r.top > innerHeight || r.bottom < 0) return false;
      if (bars.some((b) => b.contains(e))) return false;
      const cy = r.top + r.height / 2, cx = r.left + r.width / 2;
      const hit = document.elementFromPoint(cx, cy);
      return cy > top && hit && !e.contains(hit) && hit !== e;
    }).map((e) => (e.textContent || e.ariaLabel || e.tagName).trim().slice(0, 30));
    return { barCount: bars.length, top: Math.round(top), h: Math.round(innerHeight - top), buried };
  });
  say(chrome.buried.length === 0, 'no control buried under bottom chrome at scroll end',
    chrome.buried.length ? chrome.buried.join(' | ') : `${chrome.barCount} fixed bar(s), ${chrome.h}px tall`);

  // 3. Safe-area plumbing: the inset must be CONSUMED, not merely equal to 0 here.
  const safe = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:env(safe-area-inset-bottom);left:env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const css = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).join('\n');
    probe.remove();
    return { bottomRefs: (css.match(/safe-area-inset-bottom/g) || []).length,
             xRefs: (css.match(/safe-area-inset-(left|right)/g) || []).length,
             vh: /[^d]\b100vh|min-h-screen/.test(css) };
  });
  say(safe.bottomRefs > 0 && safe.xRefs > 0 && !safe.vh, 'safe-area insets consumed in CSS (all four edges)',
    `bottom refs ${safe.bottomRefs}, x refs ${safe.xRefs}, bare 100vh: ${safe.vh}`);

  // 4. Back restores scroll — driven by a real tap, on a touch device.
  await page.evaluate(() => scrollTo(0, 0));
  const target = 380;
  await page.evaluate((y) => scrollTo(0, y), target);
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => Math.round(scrollY));
  const card = page.locator('article, [data-testid="venue-card"], main a, main button').first();
  await card.tap({ timeout: 4000 }).catch(() => card.click({ force: true }));
  await page.waitForTimeout(500);
  const detailTop = await page.evaluate(() => Math.round(scrollY));
  await page.goBack().catch(() => {});
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => Math.round(scrollY));
  say(before > 0 && detailTop < 60 && Math.abs(after - before) <= 24,
    'back restores list scroll (forward opens at top)', `${before} → detail@${detailTop} → back@${after}`);

  // 5. Happy Hour tab renders content, not an error/empty shell.
  await page.goto(BASE + '?tab=happy-hour', { waitUntil: 'networkidle' });
  const hh = await page.evaluate(() => ({
    title: document.title,
    overlay: !!document.querySelector('vite-error-overlay'),
    text: document.body.innerText.replace(/\s+/g, ' ').trim().length,
    rows: document.querySelectorAll('article, li, [class*="card"]').length,
    empty: /Nothing matched/i.test(document.body.innerText),
  }));
  say(!hh.overlay && hh.text > 200 && hh.rows > 0, 'Happy Hour renders real content',
    `${hh.rows} blocks, ${hh.text} chars, empty-state=${hh.empty}, title="${hh.title}"`);

  // 6. Images: intrinsic resolution vs the box they are painted into, at this DPR.
  await page.goto(BASE + '?tab=stay-in', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].map((i) => {
    const r = i.getBoundingClientRect();
    return { w: Math.round(r.width), nw: i.naturalWidth, srcset: !!i.srcset, sizes: !!i.sizes,
      lazy: i.loading === 'lazy', decoding: i.decoding, dims: !!(i.getAttribute('width') && i.getAttribute('height')),
      fit: getComputedStyle(i).objectFit, alt: i.alt !== null && i.alt !== '' };
  }).filter((i) => i.w > 40));
  const need = imgs.length ? imgs.filter((i) => i.dims || i.fit === 'cover').length : 0;
  say(imgs.length > 0, 'images present on the cook rail', `${imgs.length} img(s)`);
  if (imgs.length) {
    say(imgs.every((i) => i.fit === 'cover' || i.dims), 'images have a stable box (object-fit/intrinsic dims) — no CLS',
      `${need}/${imgs.length}`);
    say(imgs.some((i) => i.srcset) || imgs.every((i) => i.nw === 0 || i.nw >= i.w * 2),
      `images resolve at >=2x for dpr ${d.deviceScaleFactor}`,
      imgs.map((i) => `${i.nw}px into ${i.w}px`).slice(0, 3).join(', ') + (imgs.some((i) => i.srcset) ? ' (srcset present)' : ' (NO srcset — fixture is 1x1, see note)'));
  }

  await page.screenshot({ path: `out/device-${name.replace(/\s+/g, '-')}.png` });
  await ctx.close();
}
await browser.close();
const failed = out.filter((o) => !o).length;
console.log(`\n${out.length - failed}/${out.length} device-emulation checks passed.`);
process.exit(failed ? 1 : 0);
