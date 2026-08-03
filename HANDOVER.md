# Handover

## Status
**Pending commit on `main` worktree; push follows after the release gate.**

## Objective
Keep the Happy Hour tab while removing its Cape Town-only truth source. Make the tab city-neutral: every selected or searched city uses the live Google Places bar search, and the UI distinguishes venue opening status from promotional deals.

## What changed
- Removed the Cape Town-only curated Happy Hour dataset, freshness logic, global live-deal dot, and venue-detail Happy Hour card.
- Kept the Happy Hour tab and both desktop/mobile navigation entries.
- Happy Hour now uses `fetchVenues('', city, null, signal, 'bar')`, so a manual city such as London, Paris, Lisbon, or any other searched destination is queried live through the same Places integration.
- The tab renders only returned venue facts: name, address, rating, price band, published hours, and open/closed state. It explicitly says Google Places does not provide verified promotional deals here.
- Added a regression assertion that fails if the Happy Hour view or App reintroduces the old fixed-city identifiers.
- Updated the durable product rule in `CLAUDE.md` and the README source map.

## Customer journey impact
Happy Hour remains discoverable and available from the existing tab. It no longer shows Cape Town listings or a Cape Town-derived badge when the user searched another city. A user in any searched city gets a live bar/pub search; a city with no returned bars gets an honest recovery state instead of an unrelated curated list. Venue detail no longer shows a city-specific deal card.

## Verification and actual results
- Research consulted: Google’s official Places Text Search and Place Details documentation. It supports text search, place field masks, and opening-hours fields; it does not provide a verified happy-hour promotions field. The implementation therefore does not claim promotional accuracy from opening status.
- `npm run lint`: **exit 0** (`tsc --noEmit`).
- `npm run build`: **exit 0** (Vite production build; 458.97 kB JS / 140.40 kB gzip).
- `verify/checks.mjs`: **59/59 passed**, with `VITE_GOOGLE_PLACES_KEY=k` on the verification server and Chromium fixtures active.
- Browser sweep: the Happy Hour route rendered in the existing light mobile driver before the broader sweep was terminated by the sandbox; the 59 checks covered Happy Hour overflow, 44px targets, city deep-linking, and the live non-fixed-city assertion.
- `perceive`: completed by inspection of the changed Happy Hour surface. It is findable in the existing tab, states the live-data boundary, gives All/Open now filters, and has recovery for no city, no results, unconfigured Places, and network failure. Not checked: real Google responses in this sandbox, screen-reader output, and on-device iOS.
- `judge`: release concern remains that Google opening status is not a promotional deal; the UI names that limitation instead of hiding it. The desktop split-view redesign and the wider app audit remain outside this change.

## Protected decisions
- Do not remove the Happy Hour tab; its purpose is now “where can I go for a drink in this city?” with an explicit limitation on promotional deals.
- Never call Google opening hours a happy-hour deal.
- Never reintroduce a Cape Town-only dataset as a silent fallback for another city.
- A real promotional layer may be added later only with an independently sourced, multi-city data model and visible provenance/freshness.

## Next session: first three actions
1. Verify the pushed Vercel deployment against a manually searched non-Cape-Town city.
2. Run the full screenshot sweep again in a fresh runner; the previous broad sweep was terminated by the sandbox before completion.
3. Continue the separate desktop master-detail redesign; do not expand promotional Happy Hour data without independently sourced, multi-city provenance.

## Known risks and open questions
- Google Places search gives live venue facts and published opening status, not independently verified promotional windows.
- The app’s current CI suite uses fixtures; fixture responses must cover the bar-search request so a green run cannot merely prove an empty shell.
- The desktop master-detail redesign remains separate and unfinished; this change intentionally does not attempt it.
