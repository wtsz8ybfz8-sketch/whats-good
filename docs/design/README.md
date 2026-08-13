# Design direction — occasions, v7

Two self-contained HTML files. Open them directly in a browser; no build step, no dependencies.

- **`occasion-prototype.html`** — the working prototype. All four tabs, time periods, freeform search, sliders, venue detail, Saved with sign-in.
- **`experience-map.html`** — the experience map: the six-second spine, stage-by-stage emotion and failure points, tap budget, open arguments.

## Status

This is a **design reference, not shipped code.** Nothing here is wired into `whats-good-next/`. The React implementation is the next job.

## The decisions it encodes

**One axis on the tiles: occasion.** Party size, distance and spend are *refinements*, not moods — "quick", "just me" and "big group" can all be true at once, so they were never occasions. Budget is a slider, which is why "End of month" is gone.

**The tile set is generated from the local hour**, under three visible periods (Morning / Midday / Evening). Auto-selected from the clock, switchable in one tap so planning ahead doesn't need a hidden control.

**Occasion vocabulary is per city.** Same underlying intent, local words — Cape Town gets Braai and Sundowners, Paris gets Terrasse and Apéro, London gets the Sunday roast. Neighbourhoods come from the detected city.

**Selection is the query.** No Search button between intent and results. Freeform search exists as the escape hatch for everything six tiles can't express.

**Ordinal controls drag, categorical controls tap.** Distance, spend and party are sliders. Neighbourhoods are chips.

**The exit is designed in.** Every result carries open-now / last-orders, one-tap directions and call, and a pre-computed Plan B for venues that fill up. That's the moment trust is won or lost, and it was the weakest stage.

**Colour discipline.** True-neutral ground, one accent. The accent marks selection, the live period, slider values, open-now, and the one emotional word in each headline. Nothing else is coloured.

## Images

Frames are sized and positioned for real photography. Two sources:

1. **Venue photos → Google Places Photo API.** Already paid for. Cache resolved URLs in Supabase rather than re-billing per view.
2. **Occasion and hero imagery → a curated set we own.** ~20 images total across all tabs. Licence from Pexels (free, commercial, no attribution) or Unsplash, choose each deliberately, host in Supabase Storage or `/public`. No API, no rate limit, no per-view cost, and the same considered photo every time. Occasion imagery is editorial — fetching it dynamically is more work for a worse result.

Openverse is the fully open-licence fallback if we ever want zero commercial dependency. Not OSM or Wikimedia — their photos are documentation shots, not food photography.

## Known open questions

- Six tiles is a guess, not a finding. Four may read faster; eight may cover more.
- Period boundaries can shift the set mid-session. Lock it once the user has picked.
- Time-derived UI can't be cached server-side as-is — render client-side or cache per period.
- Tile order should stay stable so muscle memory survives; only membership changes.
