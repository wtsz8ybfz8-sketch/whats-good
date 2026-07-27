import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

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
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16 bg-[var(--bg-warm)]">
        <div className="max-w-[420px] w-full text-center surface rounded-3xl px-7 py-12">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl leading-[1.1] tracking-tight mb-3 text-[var(--heading-color)]">
            This screen stopped working
          </h1>

          <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-2">
            Something in the data we loaded was not the shape we expected, so this view
            could not finish drawing. Your saved items are untouched.
          </p>

          {/* The message, not just a shrug. An error a user cannot describe is an error
              nobody can fix. */}
          <p className="font-mono text-xs text-[var(--text-subtle)] break-words mb-8">
            {error.message || String(error)}
          </p>

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
