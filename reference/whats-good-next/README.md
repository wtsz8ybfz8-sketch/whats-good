# Reference copy — "What's Good Refined" (Lovable)

**This directory is not part of the app.** Nothing here is imported, built, bundled,
typechecked or served. It is a verbatim reading copy of a separate project, kept in the
tree so we can port from it deliberately instead of from memory of a screenshot.

## Provenance

| | |
|---|---|
| Source | Lovable project `whats-good-next` ("What's Good Refined") |
| Project id | `17fb5aa5-085c-4457-932b-265b699a248d` |
| Commit copied | `ee3a6c76803a665283d86e1cd1f7aab47ea2c236` |
| Live URL | https://whats-good-next.lovable.app |
| Copied on | 2026-08-12 |
| How | Read file-by-file through the Lovable MCP server (`read_file`). The live URL is **not reachable from the agent container** — the egress proxy blocks the domain, so nothing here was verified by loading the running site. |

Files are byte-for-byte as returned by `read_file`. Nothing was reformatted, renamed or
"improved" on the way in — including the blank-line quirks and the `font-700` typo in
`__root.tsx`. If you want to know what the Lovable app does, this is the record; if you
want to know what it *looks* like, open the live URL on a real device.

## What is here

```
src/styles.css               design tokens (oklch), font stack, base layer
src/routes/__root.tsx        shell, sticky header, nav, footer
src/routes/index.tsx         landing: split hero + mood/budget/where form
src/routes/eat.tsx           restaurant search
src/routes/out.tsx           bars & nightlife
src/routes/cook.tsx          recipe search
src/routes/saved.tsx         saved list
src/routes/venue.$id.tsx     venue detail
src/routes/recipe.$id.tsx    recipe detail
src/routes/auth.tsx          email + Google sign-in
src/components/food-cards.tsx  VenueCard, RecipeCard, SaveButton
src/components/theme-toggle.tsx
src/hooks/useSaved.ts        local-storage → Supabase saved items
src/lib/food.ts              moods, cities, price bands, domain types
src/lib/discovery.functions.ts  TanStack server functions
src/lib/places.server.ts     Google Places (New), server-side key
src/lib/recipes.server.ts    TheMealDB
src/lib/cache.server.ts      Supabase-backed cache + daily spend guard
src/lib/saved.functions.ts   saved-items CRUD
src/lib/sample-venues.ts     labelled fallback data
package.json                 dependency manifest (not installed)
```

## What is deliberately NOT here

- The ~50 shadcn/ui primitives under `src/components/ui/` — generic upstream boilerplate,
  no design decisions of ours in them.
- Supabase integration glue (`src/integrations/**`), the SQL migration, `routeTree.gen.ts`,
  `router.tsx`, `server.ts`, `start.ts`, lockfiles and tooling config.
- `.env`. Never copy it.

So several imports here dangle. **That is expected** — this is a reading copy, not a
runnable app. Do not try to `npm install` in this directory.

## Stack gap — why this is a port, not a paste

| | whats-good (ours) | whats-good-next (Lovable) |
|---|---|---|
| Framework | Vite SPA, React 19 | TanStack Start (SSR) |
| Routing | React state + `?tab=` / `?city=` | File-based routes, typed search params |
| Data | `placesService.ts` in the browser, key in the bundle | Server functions, key server-side, Supabase cache + spend guard |
| Components | hand-rolled | shadcn/ui + Radix |
| Tokens | hex on `:root` / `html.dark` in `index.css` | oklch semantic tokens (`--primary`, `--muted-foreground`, …) |
| Type | Schibsted Grotesk only, weight for hierarchy | Schibsted Grotesk body + **Fraunces** serif display |
| Saved | — | localStorage, syncing to Supabase on sign-in |

Nothing in this directory obeys our CLAUDE.md rules. It uses `min-h-screen` (banned by
`verify/checks.mjs`), has no `viewport-fit=cover`, no `theme-color` pair, no safe-area
handling, no `--tabbar-h`, and formats money as a hardcoded `£`. Ported code has to be
rewritten against those rules, not pasted past them.

## Reading the design, honestly

The pre-work gate in CLAUDE.md §2A applies to anything ported out of here. A Lovable app
is **not** a primary industry benchmark — it is one more AI-generated design, and "I liked
it" is a hypothesis, not grounding. Any decision taken from this directory still needs its
own named, current, primary source before it reaches `src/`.
