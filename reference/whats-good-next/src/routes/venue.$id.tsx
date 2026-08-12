import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";

import { getVenue } from "@/lib/discovery.functions";
import { priceLabel } from "@/lib/food";

export const Route = createFileRoute("/venue/$id")({
  head: () => ({
    meta: [
      { title: "Venue details — What's Good" },
      { name: "description", content: "Opening hours, price band, rating and contact details." },
      { property: "og:title", content: "Venue details — What's Good" },
      {
        property: "og:description",
        content: "Opening hours, price band, rating and contact details.",
      },
    ],
  }),
  component: VenuePage,
});

function VenuePage() {
  const { id } = Route.useParams();
  const fetchVenue = useServerFn(getVenue);
  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", id],
    queryFn: () => fetchVenue({ data: { id } }),
  });

  if (isLoading) return <p className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">Loading…</p>;
  if (!venue)
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-muted-foreground">We couldn&apos;t load that place.</p>
        <Link to="/eat" search={{ q: "", city: "", price: undefined }} className="mt-4 inline-block underline">
          Back to search
        </Link>
      </div>
    );

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      {venue.photoUrl ? (
        <img
          src={venue.photoUrl}
          alt={venue.name}
          className="aspect-[16/9] w-full rounded-3xl object-cover"
        />
      ) : null}
      <h1 className="mt-8 font-display text-4xl tracking-tight">{venue.name}</h1>
      <p className="mt-2 text-muted-foreground">
        {venue.cuisine}
        {venue.price ? ` · ${priceLabel(venue.price)}` : ""}
        {venue.rating ? ` · ${venue.rating.toFixed(1)}` : ""}
        {venue.ratingCount ? ` (${venue.ratingCount} reviews)` : ""}
      </p>
      {venue.rating ? (
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="size-4 fill-current text-accent" /> Rated by diners on Google
        </p>
      ) : null}
      <p className="mt-4">{venue.address}</p>

      {venue.hours.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Opening hours</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {venue.hours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {venue.phone ? (
          <a
            href={`tel:${venue.phone}`}
            className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-secondary"
          >
            {venue.phone}
          </a>
        ) : null}
        {venue.website ? (
          <a
            href={venue.website}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Visit website
          </a>
        ) : null}
      </div>
    </article>
  );
}
