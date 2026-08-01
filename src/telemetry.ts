/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The reason nobody knew this app was broken.
 *
 * Until this file, whats-good had NO observability of any kind. The Happy Hour tab
 * rendered an error boundary to every user on earth for half an hour and the only way
 * anyone found out was the owner opening it on their own phone while standing outside.
 * Every significant defect in this project's history was found by the user, and that is
 * not a coincidence or bad luck — there was no mechanism by which it could be otherwise.
 *
 * DESIGN CONSTRAINTS, all of them load-bearing:
 *
 * 1. NO THIRD-PARTY SDK. CLAUDE.md §9 keeps the dependency list small on purpose, and a
 *    telemetry SDK is a script that runs before your app, sees everything, and can break
 *    the page it is meant to be watching. Events go to our own /api/log, which writes to
 *    Vercel's runtime logs. Zero dependencies, no external processor, nothing to leak.
 *
 * 2. IT MUST NEVER BREAK THE APP. Every path is wrapped, every failure is swallowed, and
 *    nothing here is awaited. Telemetry that takes down the product is worse than no
 *    telemetry. If /api/log 404s — which it will on any host that is not Vercel — this
 *    file does nothing at all, forever, silently, and the app is unaffected.
 *
 * 3. IT MUST NOT COST MONEY. A crash loop firing an event per frame is a bill. Hard cap
 *    of MAX_EVENTS per page view, identical messages deduplicated, and `sendBeacon` so a
 *    report costs nothing on the main thread and survives the page being closed.
 *
 * 4. NO PII, EVER. No search terms, no coordinates, no city, no key, no full URL with its
 *    query string. A crash report is a stack trace, not a record of what someone was
 *    looking for on a Friday night. See `scrub()`.
 */

type Level = 'error' | 'warn';

interface Event {
  level: Level;
  message: string;
  stack?: string;
  /** Pathname only — never the query string, which carries ?city= and ?tab=. */
  path: string;
  viewport: string;
  ua: string;
  ts: string;
}

const ENDPOINT = '/api/log';
/** Per page view. A render loop must not become a bill. */
const MAX_EVENTS = 8;

let sent = 0;
const seen = new Set<string>();
let installed = false;

/**
 * Strip anything that could identify a person or leak a secret.
 *
 * Stacks and messages routinely contain full URLs, and ours carry the Places key in
 * photo URLs and the user's city in the query string. A telemetry pipeline that quietly
 * exfiltrates the API key it was installed to protect would be its own incident.
 */
function scrub(text: string): string {
  return text
    .replace(/key=[^&\s"')]+/gi, 'key=[redacted]')
    .replace(/[?&](city|q|query|textQuery)=[^&\s"')]+/gi, '$1=[redacted]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email]')
    .slice(0, 1000);
}

/** Fire-and-forget. Never throws, never returns a promise worth awaiting. */
export function report(level: Level, message: string, stack?: string): void {
  try {
    if (sent >= MAX_EVENTS) return;

    const msg = scrub(String(message ?? 'unknown'));
    // One report per distinct problem. A component throwing on every render of a long
    // list would otherwise send one event per row.
    const key = `${level}:${msg}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent += 1;

    const event: Event = {
      level,
      message: msg,
      stack: stack ? scrub(stack) : undefined,
      path: window.location.pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ua: navigator.userAgent.slice(0, 180),
      ts: new Date().toISOString(),
    };

    const body = JSON.stringify(event);

    // sendBeacon survives navigation and page close — a crash immediately followed by the
    // user closing the tab is exactly the case a normal fetch loses. It also cannot be
    // awaited, which is a feature here.
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch {
    // Telemetry failing is not an application error. Swallow it.
  }
}

/**
 * Attach the global handlers. Called once from main.tsx, before the app renders, so a
 * throw during the very first render is still captured.
 */
export function initTelemetry(): void {
  try {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    window.addEventListener('error', (e) => {
      report('error', e.message || 'window.onerror', e.error?.stack);
    });

    // The failure mode that produces a silently broken app: a rejected promise nobody
    // catches. No UI changes, no boundary fires, the data simply never arrives.
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      report('error', r?.message || String(r) || 'unhandledrejection', r?.stack);
    });
  } catch {
    /* never break boot */
  }
}
