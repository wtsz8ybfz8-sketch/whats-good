/**
 * Static server for the iOS Simulator run, with one extra job: a place for the
 * simulator to REPORT BACK.
 *
 * `xcrun simctl` can boot a device, open a URL and grab the framebuffer. What it
 * cannot do is read the DOM — so a page can display the device's real
 * `env(safe-area-inset-*)` values and the agent still cannot know them; the numbers
 * exist only as pixels inside a screenshot on a runner.
 *
 * So the probe page POSTs them here, and this process prints them to stdout, which
 * lands in the job log, which IS readable. That turns "a picture of a number" into a
 * number. These are the values CLAUDE.md §7 has always listed as unknowable from
 * anywhere in this project's toolchain.
 *
 * Plain node http: no dependency, and `npx serve` cannot accept a POST.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.argv[2] || 'dist';
const PORT = Number(process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/__probe') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      // The marker is what the log is grepped for afterwards.
      console.log('PROBE_RESULT ' + body.replace(/\s+/g, ' ').trim());
      res.writeHead(204).end();
    });
    return;
  }

  // Path traversal guard: normalize, then refuse anything that climbs out of ROOT.
  const url = new URL(req.url, 'http://x');

  // GET form of the same report. An image request is the crude, dependable channel:
  // no preflight, no keepalive semantics, nothing to be silently dropped. The first
  // run used sendBeacon alone and logged nothing at all after a perfect capture.
  if (url.pathname === '/__probe') {
    const d = url.searchParams.get('d');
    if (d) console.log('PROBE_RESULT ' + d.replace(/\s+/g, ' ').trim());
    res.writeHead(200, { 'Content-Type': 'image/gif' });
    return res.end(Buffer.from('R0lGODlhAQABAAAAACw=', 'base64'));
  }

  let p = normalize(decodeURIComponent(url.pathname));
  if (p.includes('..')) return res.writeHead(400).end();
  if (p === '/' || p === '\\') p = '/index.html';

  try {
    const file = join(ROOT, p);
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    // SPA fallback — the app owns its routes, same as vercel.json's rewrite.
    try {
      const buf = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    } catch {
      res.writeHead(404).end('not found');
    }
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on :${PORT}`));
