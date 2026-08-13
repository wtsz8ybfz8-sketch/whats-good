import React from 'react';
import { Mail, Check, LogOut } from 'lucide-react';
import {
  isAuthConfigured,
  sendMagicLink,
  captureSessionFromUrl,
  restoreSession,
  signOut,
  type AuthSession,
} from '../auth';

/*
 * The prototype's `.auth` block on the Saved tab: "Keep what you like", one email field,
 * one button, and a signed-in row with the address and a way out.
 *
 * Saved items are still localStorage today, so signing in does not yet move anything
 * between devices. The copy says exactly that instead of implying a sync that has not
 * been built — promising cross-device saves and not delivering them is how a shortlist
 * gets lost, which is worse than not offering it.
 */
export const AuthPanel: React.FC = () => {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    // A magic-link return carries the token in the URL, so that is checked first; an
    // ordinary load falls through to whatever was stored on a previous visit.
    (async () => {
      const fromUrl = await captureSessionFromUrl();
      const found = fromUrl ?? (await restoreSession());
      if (live) setSession(found);
    })();
    return () => { live = false; };
  }, []);

  if (!isAuthConfigured()) {
    return (
      <div className="surface-quiet mb-8 rounded-2xl border border-[var(--rule)] px-5 py-4">
        <p className="text-sm text-[var(--text-muted)]">
          Accounts are not switched on for this deployment yet. Your saves are kept on this
          device in the meantime — clearing site data will clear them.
        </p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="surface-quiet mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--rule)] px-5 py-4">
        <Check className="h-4 w-4 flex-none text-[var(--accent-terracotta)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--charcoal)]">{session.email}</p>
          <p className="text-xs text-[var(--text-muted)]">Signed in on this device</p>
        </div>
        <button
          type="button"
          onClick={() => { signOut(); setSession(null); setStatus('idle'); }}
          className="hit-44 relative inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-terracotta)] hover:text-[var(--accent-terracotta)] cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    );
  }

  if (status === 'sent') {
    return (
      <div className="surface-quiet mb-8 rounded-2xl border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--charcoal)]">Check your email</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          A sign-in link is on its way to {email}. It opens this page, already signed in.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setStatus('sending');
        setError(null);
        const result = await sendMagicLink(email.trim());
        if (result.ok) {
          setStatus('sent');
        } else {
          setStatus('error');
          setError(result.error ?? 'That did not go through. Try again.');
        }
      }}
      className="surface-quiet mb-8 rounded-2xl border border-[var(--rule)] px-5 py-5"
    >
      <h3 className="text-base font-semibold text-[var(--charcoal)]">Keep what you like</h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Sign in and this list stops being tied to one browser. No password — we email you a
        link.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="auth-email" className="sr-only">Email address</label>
        <div className="relative flex flex-1 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-bg)] px-4 py-1">
          <Mail className="h-4 w-4 flex-none text-[var(--text-muted)]" aria-hidden="true" />
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[16px] text-[var(--charcoal)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-0"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="hit-44 relative rounded-full bg-[var(--accent-terracotta)] px-5 py-2.5 text-[13px] font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {status === 'sending' ? 'Sending…' : 'Email me a link'}
        </button>
      </div>

      {/* Live region: a failure that only appears visually is invisible to anyone using a
          screen reader, and this is the point where the flow can dead-end. */}
      <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs text-[var(--accent-terracotta)]">
        {error}
      </p>
    </form>
  );
};
