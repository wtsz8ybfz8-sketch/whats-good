/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Where client errors land.
 *
 * Writes to stdout, which on Vercel IS the runtime log — readable in the project's Logs
 * tab. Real observability with no external service, no account, no SDK and no data
 * processor agreement, which is what made it shippable against a product that still has
 * no privacy policy.
 *
 * NOT a database. Vercel retains runtime logs for a limited window. That is enough to
 * answer "is it broken right now", which this project has never been able to answer.
 * Durable storage needs the privacy policy to exist first.
 *
 * `vercel.json`'s catch-all rewrite sends every path to `/` for SPA routing. `api/` had to
 * be added to its exclusion list or this endpoint would receive index.html and never run.
 *
 * ─── WHY THE BODY PARSING LOOKS PARANOID ────────────────────────────────────────────
 * The first version of this file assumed `req.body` would be a string or a parsed object.
 * That was a guess, and it was the weakest point in the whole feature: `sendBeacon` sends
 * a **Blob**, and depending on the runtime and the content-type negotiation, a handler can
 * receive a parsed object, a JSON string, a Buffer, or nothing at all with the payload
 * still sitting unread in the request stream. Three of those four would have silently
 * dropped every report — and the failure mode is invisible, because a telemetry endpoint
 * that logs nothing looks exactly like an app with no errors.
 *
 * `api/` sits outside tsconfig's include, so `npm run lint` never typechecks this file and
 * `checks.mjs` never calls it. Nothing gates it. That is precisely why it handles all four
 * shapes explicitly instead of trusting one.
 */

const MAX_BODY = 8000;

/** Every shape a Vercel Node handler can plausibly receive, including "not read yet". */
async function readBody(req: any): Promise<string> {
  const b = req?.body;

  if (typeof b === 'string') return b;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b) && Object.keys(b).length > 0) {
    return JSON.stringify(b);
  }
  if (Buffer.isBuffer(b)) return b.toString('utf8');

  // Nothing parsed — drain the stream ourselves. This is the sendBeacon-Blob case.
  return await new Promise<string>((resolve) => {
    let raw = '';
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(raw); } };
    try {
      req.setEncoding?.('utf8');
      req.on('data', (c: any) => {
        raw += c;
        if (raw.length > MAX_BODY) { raw = raw.slice(0, MAX_BODY); finish(); }
      });
      req.on('end', finish);
      req.on('error', finish);
      // Never hang the function on a stalled stream.
      setTimeout(finish, 1500);
    } catch {
      finish();
    }
  });
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false });
      return;
    }

    const raw = (await readBody(req)).slice(0, MAX_BODY);

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw) ?? {};
    } catch {
      // A body we cannot parse is still a signal that something reported. Log it rather
      // than discard it — a silent drop here is how you end up trusting an empty log.
      console.error(JSON.stringify({ tag: 'client-error', level: 'warn', message: 'unparseable report', raw: raw.slice(0, 300) }));
      res.status(204).end();
      return;
    }

    const level = payload.level === 'warn' ? 'warn' : 'error';
    const message = String(payload.message ?? '').slice(0, 1000);
    if (!message) {
      res.status(400).json({ ok: false });
      return;
    }

    const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined);

    // One line, prefixed, so it is greppable in the Vercel log stream.
    const line = JSON.stringify({
      tag: 'client-error',
      level,
      message,
      stack: str(payload.stack, 1500),
      path: str(payload.path, 200),
      viewport: str(payload.viewport, 20),
      ua: str(payload.ua, 200),
      ts: str(payload.ts, 40) ?? new Date().toISOString(),
    });

    if (level === 'warn') console.warn(line);
    else console.error(line);

    // 204: nothing to say, and sendBeacon ignores the response body anyway.
    res.status(204).end();
  } catch (e: any) {
    // A malformed report must never surface as a 500 — that would be noise about the
    // logger inside the log it exists to keep readable.
    try { console.error(JSON.stringify({ tag: 'client-error', level: 'warn', message: 'log handler threw', detail: String(e?.message).slice(0, 200) })); } catch {}
    res.status(204).end();
  }
}
