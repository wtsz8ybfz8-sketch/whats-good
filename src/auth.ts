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
/* The Lovable build's project, jpgycbnpfckabkjhyzbk, is NOT this app's database and is not
   reachable from the owner's Supabase account. The live project is ibdnalmezctixgvjjwtm —
   it holds the saved_items table and the auth URL configuration. Production already
   overrides this through VITE_SUPABASE_URL, so the stale default was invisible in the
   running app and cost a later reader a real detour working out which one was true. */
const DEFAULT_URL = 'https://ibdnalmezctixgvjjwtm.supabase.co';
const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

const TOKEN_KEY = 'wg.auth.token';
const REFRESH_KEY = 'wg.auth.refresh';
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
  if (!isAuthConfigured()) return null;

  const clean = () =>
    window.history.replaceState({}, '', window.location.pathname);

  /* A provider sign-in can come back two ways. The implicit flow puts the tokens in the
     fragment, which is what the magic link does and what this only used to read. The PKCE
     flow — Supabase's newer default — comes back as ?code= in the QUERY string instead,
     and reading only the fragment meant Google reported a perfectly successful sign-in
     while the app quietly stayed signed out and saved to this device. Handle both. */
  const query = new URLSearchParams(window.location.search);
  const code = query.get('code');
  if (code) {
    /* The verifier that was generated before the redirect. Without it this exchange
       CANNOT succeed — GoTrue's pkce grant requires auth_code AND code_verifier, and the
       previous version of this function sent only the code. That call was guaranteed to
       fail; it merely looked harmless because signInWithGoogle() never asked for PKCE in
       the first place, so no ?code= ever arrived to run it. */
    const verifier = takeVerifier();
    clean();
    if (!verifier) return null;
    try {
      const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=pkce`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.access_token) {
          const session = await verify(data.access_token);
          if (session) { persist(session, data.refresh_token); return session; }
        }
      }
    } catch { /* fall through to the fragment */ }
  }

  if (!window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  // replaceState, not pushState: the token URL must not become a back-button destination.
  window.history.replaceState({}, '', window.location.pathname + window.location.search);

  const session = await verify(accessToken);
  if (session) persist(session, params.get('refresh_token'));
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

function persist(session: AuthSession, refreshToken?: string | null): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.accessToken);
    localStorage.setItem(EMAIL_KEY, session.email);
    /* Access tokens last about an hour. Without the refresh token beside it, a session
       simply died mid-use and the UI dropped to signed-out with no explanation. */
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
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
  if (session) return session;

  /* Expired rather than revoked, most of the time. Spend the refresh token before
     throwing the user out — signing someone out because an hour passed is a bug, not
     security. */
  const refreshed = await refresh();
  if (refreshed) return refreshed;
  signOut();
  return null;
}

async function refresh(): Promise<AuthSession | null> {
  let token: string | null = null;
  try { token = localStorage.getItem(REFRESH_KEY); } catch { return null; }
  if (!token) return null;
  try {
    const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token) return null;
    const session = await verify(data.access_token);
    if (session) persist(session, data.refresh_token);
    return session;
  } catch { return null; }
}

/* ─── PKCE ────────────────────────────────────────────────────────────────────────────
 *
 * The provider handshake used to run WITHOUT a code_challenge, which makes GoTrue fall
 * back to the implicit flow and hand the access token back in the URL fragment. That
 * works, and it is also the flow OAuth 2.1 removed: the token lands in the address bar,
 * in `history`, and in anything that reads document.location — including a referrer if
 * the page ever loads a third-party asset before the fragment is cleaned.
 *
 * PKCE returns a single-use `?code=` instead, worthless to anyone who does not hold the
 * verifier this browser generated and never transmitted. The exchange branch above was
 * already written for that flow; the missing half was ever asking for it.
 *
 * sessionStorage, not localStorage: the verifier is dead the moment it is spent, and a
 * value that outlives the tab is a value that can be stolen from a shared machine.
 */
const VERIFIER_KEY = 'wg.auth.pkce';

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 random bytes, base64url-encoded — 43 characters, the RFC 7636 minimum length. */
function makeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** Reads the verifier and removes it in one motion: it is valid for exactly one exchange. */
function takeVerifier(): string | null {
  try {
    const v = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    return v;
  } catch {
    return null;
  }
}

/**
 * Sends the browser to Supabase's own OAuth entry point. There is no SDK in this app, and
 * none is needed: the provider handshake is a redirect and the session comes back to
 * captureSessionFromUrl(), which handles both the PKCE code and the magic link's fragment.
 *
 * Passwordless email is defensible, but it asks someone to leave the page, open a mail
 * client and come back — three chances to lose them, on a page whose whole job is a
 * single decision. A provider button is one tap and identity people already trust.
 *
 * If crypto.subtle is unavailable — it is gated on a secure context, so this means an
 * http:// origin — the call falls back to the implicit flow rather than doing nothing.
 * A sign-in button that silently does nothing is worse than one using the older flow.
 */
export async function signInWithGoogle(): Promise<void> {
  const back = window.location.origin + window.location.pathname;
  const authorize = URL_BASE + '/auth/v1/authorize?provider=google&redirect_to='
    + encodeURIComponent(back);

  try {
    const verifier = makeVerifier();
    const challenge = await challengeFor(verifier);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    window.location.href = authorize
      + '&code_challenge=' + encodeURIComponent(challenge)
      + '&code_challenge_method=s256';
  } catch {
    window.location.href = authorize;
  }
}

export function signOut(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* Nothing stored, nothing to clear. */
  }
}
