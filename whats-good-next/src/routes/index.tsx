import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";

import {
  CITIES,
  MOODS,
  PRICE_LEVELS,
  currencySymbol,
  priceBandLabel,
  type PriceBand,
} from "@/lib/food";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "What's Good — eat out or cook, by mood" },
      {
        name: "description",
        content:
          "Pick a mood, get somewhere to eat nearby or a recipe worth cooking tonight. No endless scrolling.",
      },
      { property: "og:title", content: "What's Good — eat out or cook, by mood" },
      {
        property: "og:description",
        content: "Pick a mood, get somewhere to eat nearby or a recipe worth cooking tonight.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [mood, setMood] = useState(MOODS[0]!.id);
  const [price, setPrice] = useState<PriceBand | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  const selected = MOODS.find((m) => m.id === mood)!;
  const visibleMoods = showAll ? MOODS : MOODS.slice(0, 4);


  return (
    <div className="mx-auto max-w-6xl px-5 py-12 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Decide in one move
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight lg:text-6xl">
            What&apos;s good
            <br />
            right now?
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Tell us the mood and roughly where you are. We&apos;ll find a table worth leaving the
            house for — or something you can actually cook tonight.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/eat"
              search={{ q: selected.placeTerms, city, price: price ?? undefined }}
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Find somewhere to eat
            </Link>
            <Link
              to="/cook"
              search={{ q: selected.recipeTerm }}
              className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Cook it instead
            </Link>
          </div>
        </motion.div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:p-8">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              navigate({
                to: "/eat",
                search: { q: selected.placeTerms, city, price: price ?? undefined },
              });
            }}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="mood"
                className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
              >
                The mood
              </label>
              <div id="mood" className="mt-3 grid gap-2 sm:grid-cols-2">
                {visibleMoods.map((m) => {
                  const active = m.id === mood;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/25"
                      }`}
                    >
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{m.blurb}</span>
                    </button>
                  );
                })}
              </div>
              {MOODS.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {showAll ? "Show fewer" : `Show all ${MOODS.length}`}
                </button>
              ) : null}
            </div>

            <div>
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Budget
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRICE_LEVELS.map((band) => {
                  const active = price === band.id;
                  return (
                    <button
                      key={band.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPrice(active ? null : band.id)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                      }`}
                    >
                      {priceBandLabel(band.tier, band.word, currencySymbol(city))}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="city"
                className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
              >
                Where
              </label>
              <input
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Town, city or neighbourhood"
                className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {CITIES.slice(0, showAllCities ? CITIES.length : 6).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCity(name)}
                    aria-pressed={city === name}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      city === name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAllCities((v) => !v)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-primary hover:underline"
                >
                  {showAllCities ? "Fewer cities" : "More cities"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Show me {selected.label.toLowerCase()}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
