import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — What's Good" },
      { name: "description", content: "Sign in to sync your saved places and recipes." },
      { property: "og:title", content: "Sign in — What's Good" },
      { property: "og:description", content: "Sync your saved places and recipes across devices." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const action =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    const { error } = await action;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "signin" ? "Welcome back" : "Account created");
    navigate({ to: "/saved" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/saved" });
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">
        {mode === "signin" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep your saved places and recipes on every device.
      </p>

      <button
        type="button"
        onClick={google}
        className="mt-8 w-full rounded-full border border-border px-5 py-3 text-sm font-medium hover:bg-secondary"
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          aria-label="Email"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-5 w-full text-sm text-muted-foreground underline"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
