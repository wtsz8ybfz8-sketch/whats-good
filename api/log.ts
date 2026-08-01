/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Where client errors land.
 *
 * Deliberately the smallest possible thing that works: it validates, it caps size, and it
 * writes to stdout. On Vercel, stdout from a function IS the runtime log — readable in the
 * dashboard under the project's Logs tab, and queryable through the Vercel API. So this
 * gives real observability with **no external service, no account, no SDK and no data
 * processor agreement**, which is the difference between shipping it tonight and adding a
 * vendor to a product that has no privacy policy yet.
 *
 * NOT a database. Vercel retains runtime logs for a limited window (roughly an hour on
 * Hobby, longer on Pro). That is enough to answer "is it broken right now", which is the
 * question this project has never once been able to answer. Durable storage is a later
 * decision and needs the privacy policy to exist first.
 *
 * IMPORTANT: `vercel.json`'s catch-all rewrite sends every path to `/` so the SPA can
 * route. `api/` had to be added to its exclusion list or this endpoint would receive
 * index.html and never run. That trap was documented before this file existed.
 *
 * No types are imported from `@vercel/node` on purpose — it is not a dependency of this
 * project and this handler does not need it. `api/` is outside tsconfig's include, so
 * this file is not typechecked by `npm run lint`; keep it simple enough not to need it.
 */

const MAX_BODY = 4000;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false });
      return;
    }

    // sendBeacon delivers a Blob; depending on the runtime, req.body may already be
    // parsed or may still be a string. Handle both rather than assuming.
    let payload: Record<string, unknown> = {};
    const raw = req.body;
    if (typeof raw === 'string') {
      payload = JSON.parse(raw.slice(0, MAX_BODY));
    } else if (raw && typeof raw === 'object') {
      payload = raw;
    }

    const level = payload.level === 'warn' ? 'warn' : 'error';
    const message = String(payload.message ?? '').slice(0, 1000);
    if (!message) {
      res.status(400).json({ ok: false });
      return;
    }

    // One line, prefixed, so it is greppable in the Vercel log stream.
    const line = JSON.stringify({
      tag: 'client-error',
      level,
      message,
      stack: typeof payload.stack === 'string' ? payload.stack.slice(0, 1500) : undefined,
      path: String(payload.path ?? '').slice(0, 200),
      viewport: String(payload.viewport ?? '').slice(0, 20),
      ua: String(payload.ua ?? '').slice(0, 200),
      ts: String(payload.ts ?? new Date().toISOString()).slice(0, 40),
    });

    if (level === 'warn') console.warn(line);
    else console.error(line);

    // 204: nothing to say, and sendBeacon ignores the body anyway.
    res.status(204).end();
  } catch {
    // A malformed report must not produce a 500 in the logs — that would be noise about
    // the logger inside the log it is meant to keep clean.
    res.status(204).end();
  }
}
