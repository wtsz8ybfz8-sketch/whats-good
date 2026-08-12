import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { Bookmark, ChefHat, Martini, Utensils } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "What's Good — eat out or cook, by mood" },
      {
        name: "description",
        content:
          "Find somewhere to eat or something to cook based on how you feel and where you are.",
      },
      { property: "og:title", content: "What's Good — eat out or cook, by mood" },
      {
        property: "og:description",
        content: "Mood-first food discovery: places to eat tonight, recipes worth cooking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link
          to="/"
          className="whitespace-nowrap font-display text-xl font-700 tracking-tight"
        >
          What&apos;s Good
        </Link>
        {/* Hidden on phones: five controls in a 390px bar wrapped both the
            wordmark and "Eat out" onto two lines. Navigation moves to the tab
            bar below, where a thumb can reach it. */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/eat"
            search={{ q: "", city: "", price: undefined }}
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Eat out
          </Link>
          <Link
            to="/out"
            search={{ q: "", city: "", price: undefined }}
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Out
          </Link>
          <Link
            to="/cook"
            search={{ q: "" }}
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Cook
          </Link>
          <Link
            to="/saved"
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Saved
          </Link>
        </nav>

        <span className="shrink-0">
          <ThemeToggle />
        </span>
      </div>
    </header>
  );
}

const TABS = [
  { to: "/eat", label: "Eat out", Icon: Utensils, search: { q: "", city: "", price: undefined } },
  { to: "/out", label: "Out", Icon: Martini, search: { q: "", city: "", price: undefined } },
  { to: "/cook", label: "Cook", Icon: ChefHat, search: { q: "" } },
  { to: "/saved", label: "Saved", Icon: Bookmark, search: undefined },
] as const;

/**
 * Phone navigation. Fixed to the bottom because this app is used one-handed on
 * a street, and padded by the safe-area inset so it clears the home indicator
 * rather than sitting under it.
 */
function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, Icon, search }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              {...(search ? { search } : {})}
              className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        {/* dvh, not vh: on iOS Safari 100vh is the viewport with the browser
            chrome hidden, so a vh-sized column is taller than what you can see
            whenever the URL bar is showing. */}
        <div className="flex min-h-[100dvh] flex-col">
          <SiteHeader />
          <main className="flex-1">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
            Venue data from Google Places. Recipes from spoonacular.
          </footer>
          {/* Clears the fixed tab bar so the last card is never trapped under it. */}
          <div
            aria-hidden="true"
            className="md:hidden"
            style={{ height: "calc(52px + env(safe-area-inset-bottom))" }}
          />
        </div>
        <MobileTabBar />
        <Toaster />
      </MotionConfig>
    </QueryClientProvider>
  );
}
