/*
 * Email sign-in for the Saved tab, against Supabase Auth's REST endpoints.
 *
 * Two deliberate choices:
 *
 * 1. NO SDK. `@supabase/supabase-js` is ~40kB gzipped and brings a realtime client and a
 *    Postgrest builder this app does not use. Auth here is two endpoints — send a link,
 *    read the user back — so it is plain `fetch`, and the dependency list stays where
 *    CLAUDE.md 9 wants it.
 *
 * 2. MAGIC LINK, NOT PASSWORDS. The app never sees, stores or transmits a password, so
 *    there is no credential to leak from a client bundle and no reset flow to build
 *    tonight. Supabase mails a one-time link; the browser comes back with a token in the
 *    URL fragment, which never reaches a server log the way a query string would.
 *
 * Both env vars are PUBLIC by design — the anon key is meant to sit in a browser bundle
 * and is only as powerful as the row-level security policies behind it. Turn RLS on for
 * every table before storing anything per-user; without it the anon key reads everyone's
 * rows. That is a console-side switch, not something this file can enforce.
 */

/* This project's Supabase instance already exists — it was created by the Lovable build
 * (project ref `jpgycbnpfckabkjhyzbk`, see the vendored `supabase/config.toml` in commit
 * 44b5f5d) and it already carries the `saved_items` table and its RLS policy. So the URL
 * has a default and only the browser key has to be supplied.
 *
 * Two names for that key, because Supabase renamed it mid-flight: the legacy anon JWT is
 * `VITE_SUPABASE_ANON_KEY`, the current opaque `sb_publishable_…` string is
 * `VITE_SUPABASE_PUBLISHABLE_KEY` — which is what the Lovable export used. Accept either
 * rather than making the deployment guess which era it is in. */
const DEFAULT_URL = 'https://jpgycbnpfckabkjhyzbk.supabase.co';
const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

const TOKEN_KEY = 'wg.auth.token';
const EMAIL_KEY = 'wg.auth.email';

export interface AuthSession {
  accessToken: string;
  email: string;
}

/**
 * False when the deployment has no Supabase credentials. The UI branches on this and
 * says so plainly rather than rendering a sign-in form that cannot possibly work — an
 * input that silently fails is worse than an honest "not configured yet".
 */
export function isAuthConfigured(): boolean {
  return Boolean(URL_BASE && ANON_KEY);
}

function headers(): Record<string, string> {
  return { 'Content-Type': 'application/json', apikey: ANON_KEY ?? '' };
}

/**
 * Asks Supabase to mail a sign-in link. `emailRedirectTo` must also be listed under
 * Authentication → URL Configuration in the Supabase dashboard, or the link lands on a
 * "requested path is invalid" page — that allow-list is console-side.
 */
export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!isAuthConfigured()) return { ok: false, error: 'Sign-in is not configured for this deployment.' };

  try {
    const res = await fetch(`${URL_BASE}/auth/v1/otp`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email,
        create_user: true,
        options: { email_redirect_to: window.location.origin + '/?tab=saved-recipes' },
      }),
    });

    if (res.ok) return { ok: true };

    // Supabase returns a JSON body with msg/error_description; anything else is a network
    // or gateway failure and gets a generic line rather than a raw status code.
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.msg ?? body?.error_description ?? 'That did not go through. Try again.' };
  } catch {
    return { ok: false, error: 'No connection. Check your network and try again.' };
  }
}

/**
 * Reads the token Supabase leaves in the URL fragment after a magic-link click, confirms
 * it against /auth/v1/user, and clears the fragment so the token is not left sitting in
 * the address bar, in a screenshot, or in a shared link. Returns null when there is no
 * token in the URL, which is the normal case on every ordinary page load.
 */
export async function captureSessionFromUrl(): Promise<AuthSession | null> {
  if (!isAuthConfigured() || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  // replaceState, not pushState: the token URL must not become a back-button destination.
  window.history.replaceState({}, '', window.location.pathname + window.location.search);

  const session = await verify(accessToken);
  if (session) persist(session);
  return session;
}

async function verify(accessToken: string): Promise<AuthSession | null> {
  try {
    const res = await fetch(`${URL_BASE}/auth/v1/user`, {
      headers: { ...headers(), Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.email ? { accessToken, email: user.email } : null;
  } catch {
    return null;
  }
}

function persist(session: AuthSession): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.accessToken);
    localStorage.setItem(EMAIL_KEY, session.email);
  } catch {
    /* Private mode: the session is session-only, which is still correct behaviour. */
  }
}

/**
 * The session from a previous visit, if the stored token is still valid. Deliberately
 * re-checked against the server rather than trusted from localStorage — a token that
 * expired or was revoked would otherwise keep the UI showing a signed-in state that no
 * longer buys the user anything.
 */
export async function restoreSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return null;

  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
  if (!token) return null;

  const session = await verify(token);
  if (!session) signOut();
  return session;
}

export function signOut(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* Nothing stored, nothing to clear. */
  }
}
