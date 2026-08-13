# Accounts — what's built, and the four things only you can do

The app ships with real email sign-in wired end to end: `src/auth.ts` (Supabase magic
link, no SDK, no passwords), `src/savedStore.ts` (saved list per account), and the Saved
tab, which shows one of three honest states depending on what is configured.

Until the two environment variables below exist, the app runs in device-only mode and
**says so on screen** — it never claims an account it does not have. Nothing else about
the app depends on this; venues, recipes and saving all work today.

## 1. Create the Supabase project

<https://supabase.com> → new project. Free tier is enough. You have to do this part —
creating accounts is not something I can do on your behalf.

## 2. Run this SQL (SQL Editor → New query → Run)

Row-level security is the whole security model here: the anon key sits in the browser by
design, and these policies are what stop it reading anyone else's rows.

```sql
create table public.saved_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  kind       text not null check (kind in ('places', 'recipes')),
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

alter table public.saved_items enable row level security;

create policy "own rows: read"   on public.saved_items for select using (auth.uid() = user_id);
create policy "own rows: insert" on public.saved_items for insert with check (auth.uid() = user_id);
create policy "own rows: delete" on public.saved_items for delete using (auth.uid() = user_id);
```

The `unique` constraint is what makes a double-tap on Save harmless — the client sends
`Prefer: resolution=ignore-duplicates`.

## 3. Allow the redirect URL

Authentication → URL Configuration → Redirect URLs, add both:

```
https://whats-good-nu.vercel.app
http://localhost:5199
```

Without this the emailed link lands on "requested path is invalid".

## 4. Set the two variables

Locally in `.env.local`, and in Vercel under Settings → Environment Variables (all three
environments), then redeploy:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon/public key from Project Settings → API>
```

Both are public by design — the anon key is meant to be in a browser bundle, and the RLS
policies above are what make that safe. Never put the **service_role** key here.

## What happens once those are set

- Saved tab offers "Email me a link". No password, nothing to reset, nothing to leak.
- Following the link on any device signs that device in.
- Anything saved before signing in is merged up, not discarded.
- Saves are optimistic: the button flips immediately, the account catches up.
- Signing out leaves the list on the device — it is still on the account too.
