import { createFileRoute, Link } from "@tanstack/react-router";

import { useSaved } from "@/hooks/useSaved";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved places and recipes — What's Good" },
      { name: "description", content: "Everything you've bookmarked, on every device once you sign in." },
      { property: "og:title", content: "Saved places and recipes — What's Good" },
      { property: "og:description", content: "Everything you've bookmarked, in one place." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { items, signedIn, ready } = useSaved();

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-4xl tracking-tight">Saved</h1>
      {ready && !signedIn ? (
        <p className="mt-3 text-sm text-muted-foreground">
          These are stored on this device.{" "}
          <Link to="/auth" className="underline">
            Sign in
          </Link>{" "}
          to keep them everywhere.
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-3">
              <Link
                to={item.kind === "venue" ? "/venue/$id" : "/recipe/$id"}
                params={{ id: item.refId }}
                className="flex items-center gap-4"
              >
                <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
                  ) : null}
                </span>
                <span>
                  <span className="block font-display text-lg">{item.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {item.subtitle ?? (item.kind === "venue" ? "Place" : "Recipe")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
