# Accounts — what already exists, and the one thing still missing

## The correction that produced this file

An earlier pass in this session said "there is no Supabase project, create one, here is
the SQL for a new table". **Both halves were wrong**, and the user was right to push back.

What is actually true, established by reading the repo rather than assuming:

- **The project exists.** Ref `jpgycbnpfckabkjhyzbk`, created by the Lovable build, still
  vendored at `whats-good-next/supabase/config.toml` in commit `44b5f5d`.
- **It is alive.** `GET https://jpgycbnpfckabkjhyzbk.supabase.co/auth/v1/health` answers
  `401 {"message":"No API key found in request"}` — a live instance refusing an
  unauthenticated caller, not a dead host.
- **The table exists**, from migration `20260810153321`:
  `public.saved_items (user_id, kind CHECK IN ('venue','recipe'), ref_id, title, subtitle,
  image_url)`, unique on `(user_id, kind, ref_id)`, RLS on, one policy —
  *"Users manage their own saved items"*, `auth.uid() = user_id`.
- So does `api_cache`, `api_budget` and a `consume_api_budget()` function — a whole caching
  and rate-limit layer that already exists and this app is not yet using.

`src/savedStore.ts` had invented a *second* schema (`kind IN ('places','recipes')`, a
`name` column). It would have failed the CHECK constraint on the very first insert. It now
writes the columns that are really there, mapping the app's words onto them:
`places → 'venue'`, `recipes → 'recipe'`, the name in both `ref_id` and `title`.

## What is still missing: one value

The browser key for that project. It is not in this repo (`.env*` is gitignored, correctly),
not in either Vercel project's environment variables (checked with `vercel env ls` on
`whats-good` and `whats-good-624c8eea`), and not in the Downloads clone.

Get it from **Supabase → Project Settings → API**, or from the Lovable project that
created it. It is the *publishable* / *anon* key — the one meant to sit in a browser
bundle. **Never the `service_role` key.**

Then, locally in `.env.local` and in Vercel → Settings → Environment Variables (all three
environments), set one of:

```
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…     # current-era key
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI…               # legacy JWT key
```

The code accepts either name, because Supabase renamed this key mid-flight and the Lovable
export used `PUBLISHABLE`. `VITE_SUPABASE_URL` is optional — it defaults to the project
above; set it only to point at a different instance.

## One console-side switch

Supabase → Authentication → URL Configuration → Redirect URLs must list both:

```
https://whats-good-nu.vercel.app
http://localhost:5199
```

Without it the emailed link lands on "requested path is invalid".

## What happens the moment the key is set

- Saved tab offers "Email me a link". No password, nothing to reset, nothing to leak.
- Following the link on any device signs that device in.
- Anything saved before signing in is merged up, not discarded.
- Saves are optimistic: the button flips immediately, the account catches up.
- Signing out leaves the list on the device — it is still on the account too.

## Not yet verified, and it cannot be from here

No link has been sent, no row has been written, no second device has been signed in. That
needs the key. Everything up to that point — the three UI states, the failure path, the
schema mapping — has been read, typechecked and rendered in a browser.

## Worth knowing: the caching layer already paid for

`api_cache` + `api_budget` + `consume_api_budget()` exist in that same project and are
unused. CLAUDE.md 7 says to cache resolved Places photo URLs in Supabase; the table for it
is already sitting there. That is a separate piece of work, and it would cut Places spend.
