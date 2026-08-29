# VERIFIED ledger

One line per claim that was actually tested. Format:

`YYYY-MM-DD | claim | command run | PASS/FAIL`

Rules: read this file before making any status claim about this project. Append a
line only after running the command — never for code that was merely written. A
line is stale (treat as UNKNOWN, re-verify) once the code it covers has changed
since that date.

| Date | Claim | Command | Result |
|------|-------|---------|--------|
| 2026-08-29 | ledger created; no prior claim in this repo has been verified | (none) | UNKNOWN |
| 2026-08-29 | production site loads on vercel, renders home screen | browser navigate https://whats-good-nu.vercel.app + screenshot | PASS |
| 2026-08-29 | page contains ZERO `<img>` elements; all imagery is CSS background-image | JS `document.images.length` -> 0 | FAIL (defect) |
| 2026-08-29 | Schibsted Grotesk is preloaded but never used; body renders in system font | computed fontFamily = system stack; `--sans` token in prototype.css omits Schibsted | FAIL (defect) |
| 2026-08-29 | stack is Vite 6 + React 19 + Tailwind 4, NOT TanStack Start as memory claimed | head package.json | PASS (memory corrected) |
| 2026-08-29 | home page scrollHeight 3606px at 375px wide; 43 buttons, 0 unlabelled | JS DOM query | PASS |
| 2026-08-29 | @font-face declared for all 4 Schibsted woff2 + --sans rewired | edit only; no node_modules on this machine so no local build | UNVERIFIED — confirm on Vercel deploy |
| 2026-08-29 | Site live at whats-good-nu.vercel.app, 0 console errors, load 1519ms | browser get_page_text + read_console_messages + performance API | PASS |
| 2026-08-29 | Occasion rail renders 33 tiles on first screen | JS: document.querySelectorAll('.tile').length === 33 | PASS |
| 2026-08-29 | --ink3 (#8D8C87) on --bg (#F5F4F2) = 3.06:1, below WCAG AA 4.5:1 | JS contrast ratio calc in page | FAIL |
| 2026-08-29 | No main/nav landmarks, no h2; only 1 h1 for whole page | JS: querySelectorAll('main'/'nav'/'h2').length = 0,0,0 | FAIL |
| 2026-08-29 | 7 of 48 focusable controls under 44px minimum tap target | JS getBoundingClientRect audit | FAIL |
| 2026-08-29 | All photography is CSS background-image; 0 <img> elements | JS: document.images.length === 0 | FAIL |
| 2026-08-29 | Hero photo served as 592 KB PNG at fixed 800px width | fetch(heroPhotoUrl) -> content-type image/png, content-length 606317 | FAIL |
| 2026-08-29 | Photo proxy edge-caches correctly (s-maxage=86400, 302 to Google CDN); vercel.json does NOT override /api/* | read api/places.ts:91 + vercel.json | PASS |
| 2026-08-29 | 10 /api/places invocations on first paint, avg 487ms, slowest 898ms | performance.getEntriesByType('resource') | PASS (measured) |
| 2026-08-29 | Magic link body used options.email_redirect_to; REST /auth/v1/otp ignores it, so mailed links returned to Supabase Site URL, not the app | read src/auth.ts:74-79 + supabase/auth#1738 | FAIL (root cause) |
| 2026-08-29 | Fix: redirect_to moved to query string on /auth/v1/otp; project builds clean | npm ci && npm run build -> "built in 235ms", 60.83 kB | PASS (build only) |
| 2026-08-29 | End-to-end magic link (mail arrives, click lands in app) | not run - needs a real send | UNVERIFIED |
