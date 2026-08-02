# Contributing & Definition of Done

This is the contract between the owner and every AI (or human) that touches this repo.
`CLAUDE.md` is the source of truth for *how* to build; this file is the source of truth
for *when a change is allowed to land*. If the two ever disagree, `CLAUDE.md` wins on
craft and this file wins on the gate.

The reason this file exists: for this project's whole history, the owner has been the
last line of defence — catching a 14px font, an exposed key, a duplicate cuisine chip
that every automated check passed. That is backwards. The gate below moves the last line
of defence from the owner to the machine, so that a confident-but-wrong claim cannot
reach production just because someone said "done."

---

## The gate (non-negotiable)

1. **No direct pushes to `main`.** Every change lands through a Pull Request.
2. **CI must be green to merge.** `.github/workflows/ci.yml` runs the typecheck, the
   build, and `verify/checks.mjs`. A red or skipped check is not a merge.
3. **Production deploys only from green `main`.** A red build must never be the live
   site. (Vercel setting — confirm "Production Branch = `main`" and that only successful
   builds are promoted.)
4. **The PR description states what was actually verified** — the real command, its real
   exit code, and what was *not* checked, in those words. "Should work" is not a
   verification.

## Definition of Done (per change)

A change is done when **all** of these are true, not when the code compiles:

- [ ] The cheapest check that can actually detect the change was run, and named in the PR
      (parse → typecheck → build → browser, per `CLAUDE.md` §6).
- [ ] `verify/checks.mjs` is green (`exit 0`, 0 skipped). Quote the printed total; never
      a hardcoded count.
- [ ] Anything visible was **looked at** — screenshot at 390×844, both light and dark,
      and the picture was actually read. Types passing is not looking.
- [ ] No fabricated facts. No invented ratings, prices, deals, menus, or hours. Real,
      sourced data or the field is absent. This is the highest-cost rule in the repo.
- [ ] Rules with no machine check (`CLAUDE.md` §13.2) that the change touched are named
      in the PR as unverified, honestly.
- [ ] Scope was not widened. One diagnosis, one focused implementation.

## What this sandbox genuinely cannot do (so don't claim it did)

- **Reach Google Places or any external site** — the agent proxy 403s all outbound
  requests. Real venues/recipes do not load here; the empty state is a network artifact,
  not a bug. You **can** take screenshots of everything seeded from local data.
- **Verify anything about the live deployment** — a proxy 403 tells you nothing about
  Vercel. Reachability is checked from a real device or not at all.
- **Verify `/api/*`** — `vite dev` does not serve it.

State these limits as limits. Do not dress an "I could not check this here" up as a pass.

---

## Pre-launch checklist (what still blocks a public ship)

Tracked honestly, separate from feature work:

- [ ] **Production never serves a red build** (the gate above). *Blocker #1.*
- [ ] **Privacy policy + terms.** The app sends a user's IP and location to Google. A
      public geolocation app cannot ship without this. (GDPR/CCPA.)
- [ ] **API key hardening.** The Places key ships in the browser bundle (normal for a
      browser Places app). It needs an HTTP-referrer restriction **and** a daily quota
      cap in the Google Cloud console, or the key can be lifted and run up a bill.
- [ ] **Error observability confirmed in prod** — `telemetry.ts` + `/api/log` verified on
      a real deployment, not just in the tree.
- [ ] **Depth of the opinionated layer** — the differentiator vs a map is curated,
      time-aware, human-confirmed data (e.g. `happyHourData.ts`). One city / a handful of
      venues is thin for launch. Expanding it needs a real source, never invention.
