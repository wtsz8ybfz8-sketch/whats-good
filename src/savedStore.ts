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

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
      `${URL_BASE}/rest/v1/saved_items?select=kind,name&order=created_at.desc`,
      { headers: restHeaders(session) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { kind: SavedKind; name: string }[];
    return {
      places: rows.filter((r) => r.kind === 'places').map((r) => r.name),
      recipes: rows.filter((r) => r.kind === 'recipes').map((r) => r.name),
    };
  } catch {
    return null;
  }
}

/** `user_id` is filled by a column default of `auth.uid()`, so the client never sets it. */
export async function addRemote(session: AuthSession, kind: SavedKind, name: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/saved_items`, {
      method: 'POST',
      headers: { ...restHeaders(session), Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ kind, name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeRemote(session: AuthSession, kind: SavedKind, name: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/saved_items?kind=eq.${encodeURIComponent(kind)}&name=eq.${encodeURIComponent(name)}`,
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
