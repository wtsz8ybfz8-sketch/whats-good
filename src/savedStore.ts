/*
 * Where a saved place or recipe actually lives.
 *
 * Two backing stores, one interface:
 *
 * - SIGNED OUT (or no Supabase configured) — localStorage, on this browser only. The UI
 *   says exactly that; it must never imply an account that does not exist.
 * - SIGNED IN — a `saved_items` row per user per item, through Supabase's REST API with
 *   the user's own access token, so row-level security decides what they can see. That
 *   is what makes the list follow them to another device.
 *
 * On sign-in the local list is pushed up and merged rather than discarded — someone who
 * saved four places before signing in should not be punished for signing in afterwards.
 *
 * No SDK, same reason as auth.ts: this is three REST calls, not a client library.
 */
import type { AuthSession } from './auth';

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || 'https://jpgycbnpfckabkjhyzbk.supabase.co';
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

/* The table is NOT ours to design — `public.saved_items` already exists in this project,
   created by the Lovable build's migration (20260810153321). Its columns are
   `kind ('venue'|'recipe')`, `ref_id`, `title`, `subtitle`, `image_url`, and its unique
   key is (user_id, kind, ref_id). An earlier pass here invented a second schema
   (`kind ('places'|'recipes')`, `name`) which would have failed the CHECK constraint on
   the first insert. This maps the app's own words onto the columns that are really there. */
const KIND: Record<SavedKind, string> = { places: 'venue', recipes: 'recipe' };

export type SavedKind = 'places' | 'recipes';
export interface SavedList { places: string[]; recipes: string[] }

const LOCAL_KEY = 'wg_saved';

export function readLocal(): SavedList {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return raw && Array.isArray(raw.places) ? raw : { places: [], recipes: [] };
  } catch {
    return { places: [], recipes: [] };
  }
}

export function writeLocal(list: SavedList): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* private mode */ }
}

/** The user's id, decoded from the access token's payload — no extra round trip. */
function userId(session: AuthSession): string {
  try {
    return JSON.parse(atob(session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
  } catch {
    return '';
  }
}

function restHeaders(session: AuthSession): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY ?? '',
    Authorization: `Bearer ${session.accessToken}`,
  };
}

/** Everything this account has kept, newest first. */
export async function fetchRemote(session: AuthSession): Promise<SavedList | null> {
  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/saved_items?select=kind,title&order=created_at.desc`,
      { headers: restHeaders(session) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { kind: string; title: string }[];
    return {
      places: rows.filter((r) => r.kind === KIND.places).map((r) => r.title),
      recipes: rows.filter((r) => r.kind === KIND.recipes).map((r) => r.title),
    };
  } catch {
    return null;
  }
}

/* `user_id` has no default on this table — the migration declares it NOT NULL with only
   an RLS check — so the client sends it, read from the JWT's `sub`. The RLS policy still
   refuses anything that is not the caller's own id.
   `ref_id` is the venue/recipe name: Places ids are not stable across queries (CLAUDE.md
   6), so the name is the only key that survives a re-search. */
export async function addRemote(session: AuthSession, kind: SavedKind, name: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/saved_items`, {
      method: 'POST',
      headers: { ...restHeaders(session), Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        user_id: userId(session), kind: KIND[kind], ref_id: name, title: name,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeRemote(session: AuthSession, kind: SavedKind, name: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/saved_items?kind=eq.${encodeURIComponent(KIND[kind])}`
        + `&ref_id=eq.${encodeURIComponent(name)}`,
      { method: 'DELETE', headers: restHeaders(session) },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Called once, immediately after a session appears. Anything saved on this device before
 * signing in is pushed to the account; the returned list is the union, so the tab shows
 * one list rather than two competing ones.
 */
export async function mergeLocalIntoRemote(session: AuthSession): Promise<SavedList> {
  const local = readLocal();
  const remote = (await fetchRemote(session)) ?? { places: [], recipes: [] };

  const pending: Promise<boolean>[] = [];
  (['places', 'recipes'] as SavedKind[]).forEach((kind) => {
    local[kind].filter((n) => !remote[kind].includes(n))
      .forEach((n) => { pending.push(addRemote(session, kind, n)); remote[kind].push(n); });
  });
  if (pending.length) await Promise.all(pending);

  /* The local copy stays as a mirror, so a reload renders instantly and an offline
     session still shows the list it had. The account remains the source of truth. */
  writeLocal(remote);
  return remote;
}
