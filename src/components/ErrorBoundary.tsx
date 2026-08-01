import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { report } from '../telemetry';

/**
 * The app had no error boundary at all.
 *
 * React unmounts the whole tree when a render throws, so any single bad field from
 * Places or TheMealDB — a null where a string was expected, a malformed date — took the
 * user from a working app to a blank white page with no header, no tabs and no way back
 * except knowing to reload. For a product whose entire promise is "what is open near me
 * right now", used one-handed on a street, a white screen is the worst possible failure
 * and it was one unexpected payload away at all times.
 *
 * This is deliberately a class component: `getDerivedStateFromError` has no hook
 * equivalent in React 19, so a boundary cannot be written any other way.
 *
 * It does NOT try to be clever about recovery. It offers the two things that actually
 * work — clear the tab state and re-render, or reload — and it prints the message,
 * because "something went wrong" with no detail is what makes a bug unreportable.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry in this project, so the console is the only record. Keep both the
    // error and the component stack — the stack is what identifies which view died.
    console.error('Render failed:', error, info.componentStack);
    // The event that matters most. This boundary firing means a user is looking at
    // "This screen stopped working" right now — which happened to every user of the
    // Happy Hour tab for half an hour, and was discovered only because the owner
    // opened the app on their own phone. Never again silently.
    report('error', `boundary: ${error.message}`, error.stack || info.componentStack || undefined);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-dvh flex items-center justify-center px-5 py-16 bg-[var(--bg-warm)]">
        <div className="max-w-[420px] w-full text-center surface rounded-3xl px-7 py-12">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl leading-[1.1] tracking-tight mb-3 text-[var(--heading-color)]">
            This screen stopped working
          </h1>

          <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-4">
            Something in the data we loaded was not the shape we expected, so this view
            could not finish drawing. Your saved items are untouched.
          </p>

          {/*
            THE RAW EXCEPTION USED TO BE THE SECOND THING A USER READ.
            `error.message` was printed here in mono, unlabelled — "Cannot read properties
            of undefined (reading 'split')" sitting under the headline on a food app. That
            is a developer's sentence in a stranger's hands: it explains nothing, it reads
            as broken software, and it is the line a person screenshots.

            Best practice is neither hiding it nor leading with it. Lead with what the
            person needs — it is reported, it is not their fault, here is the way out —
            and keep the technical detail one tap away for when they do want to send it.
            <details> because it needs no state and stays accessible and copyable.
          */}
          <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-6">
            This has been reported automatically. Nothing you did caused it.
          </p>

          <details className="mb-8 text-left">
            <summary className="hit-44 relative cursor-pointer list-none font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] hover:text-[var(--accent-terracotta)] transition-colors text-center">
              Technical detail
            </summary>
            <p className="font-mono text-xs text-[var(--text-subtle)] break-words mt-3 p-3 rounded-xl bg-[var(--surface-quiet-bg,rgba(0,0,0,0.03))] border border-[var(--rule)] select-all">
              {error.message || String(error)}
            </p>
          </details>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={this.reset}
              className="hit-44 press inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] text-xs font-bold cursor-pointer hover:opacity-90"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="hit-44 press inline-flex items-center justify-center px-6 py-3 rounded-2xl border border-[var(--rule)] text-[var(--charcoal)] text-xs font-bold cursor-pointer hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)]"
            >
              Reload the app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
