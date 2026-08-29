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
