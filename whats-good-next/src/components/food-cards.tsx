import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Star } from "lucide-react";

import { useSaved } from "@/hooks/useSaved";
import { formatRating, priceLabel, type Recipe, type Venue } from "@/lib/food";

function SaveButton({
  kind,
  refId,
  title,
  subtitle,
  imageUrl,
}: {
  kind: "venue" | "recipe";
  refId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
}) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(kind, refId);
  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      aria-pressed={saved}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle({ kind, refId, title, subtitle, imageUrl });
      }}
      className="absolute right-3 top-3 rounded-full bg-background/90 p-2 text-foreground shadow-sm transition-colors hover:bg-background"
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
    </button>
  );
}

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
      <SaveButton
        kind="venue"
        refId={venue.id}
        title={venue.name}
        subtitle={venue.cuisine}
        imageUrl={venue.photoUrl}
      />
      <Link to="/venue/$id" params={{ id: venue.id }} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {venue.photoUrl ? (
            <img
              src={venue.photoUrl}
              alt={venue.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center font-display text-3xl text-muted-foreground">
              {venue.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg leading-snug">{venue.name}</h3>
            {venue.rating ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                <Star className="size-3.5 fill-current text-accent" />
                {formatRating(venue.rating)}
                {venue.ratingCount ? (
                  <span className="text-xs opacity-70">
                    ({new Intl.NumberFormat().format(venue.ratingCount)})
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {venue.cuisine}
            {priceLabel(venue.price) ? ` · ${priceLabel(venue.price)}` : ""}
          </p>
          {venue.summary ? (
            <p className="line-clamp-2 text-sm leading-snug text-foreground/80">{venue.summary}</p>
          ) : null}
          {venue.attributes && venue.attributes.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {venue.attributes.map((attribute) => (
                <span
                  key={attribute}
                  className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {attribute}
                </span>
              ))}
            </div>
          ) : null}
          <p className="line-clamp-1 text-xs text-muted-foreground">{venue.address}</p>
          {/*
            Signals derived from fields we already fetch. A rating without a
            count is a weak claim; 2,000 reviews and 12 reviews mean different
            things and the card should say which it is.
          */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs">
            {venue.openNow !== null ? (
              <span className={venue.openNow ? "text-primary" : "text-muted-foreground"}>
                {venue.openNow ? "Open now" : "Closed right now"}
              </span>
            ) : null}
            {venue.ratingCount !== null && venue.ratingCount >= 500 ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                Well reviewed
              </span>
            ) : null}
            {venue.ratingCount !== null && venue.ratingCount < 60 ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                Under the radar
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
      <SaveButton
        kind="recipe"
        refId={recipe.id}
        title={recipe.name}
        subtitle={recipe.category}
        imageUrl={recipe.thumbnail}
      />
      <Link to="/recipe/$id" params={{ id: recipe.id }} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {recipe.thumbnail ? (
            <img
              src={recipe.thumbnail}
              alt={recipe.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="space-y-1.5 p-4">
          <h3 className="font-display text-lg leading-snug">{recipe.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[recipe.area, recipe.category].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
    </article>
  );
}
