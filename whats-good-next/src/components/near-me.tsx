import { LocateFixed, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cityFromCoords } from "@/lib/discovery.functions";

export type Located = { lat: number; lng: number; city: string };

type State = "idle" | "locating" | "denied" | "unavailable";

/**
 * Asks the device where it is, then names the place.
 *
 * The search is biased by the coordinates, so it works even when the reverse
 * geocode fails — in that case the label reads "Near you", which is true,
 * rather than a city we guessed.
 */
export function NearMeButton({
  onLocated,
  auto,
  className = "",
}: {
  onLocated: (located: Located) => void;
  /** Try once on mount, for a screen that has no location at all yet. */
  auto?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const attempted = useRef(false);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("unavailable");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        cityFromCoords({ data: { lat, lng } })
          .then((res) => onLocated({ lat, lng, city: res.city ?? "Near you" }))
          .catch(() => onLocated({ lat, lng, city: "Near you" }))
          .finally(() => setState("idle"));
      },
      (error) => {
        setState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [onLocated]);

  useEffect(() => {
    if (!auto || attempted.current) return;
    attempted.current = true;
    locate();
  }, [auto, locate]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={locate}
        disabled={state === "locating"}
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {state === "locating" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="size-4" aria-hidden="true" />
        )}
        {state === "locating" ? "Finding you…" : "Near me"}
      </button>
      {state === "denied" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Location is off for this site. Turn it on in your browser settings, or pick a city
          below.
        </p>
      ) : null}
      {state === "unavailable" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Couldn&apos;t get a location just now — pick a city below instead.
        </p>
      ) : null}
    </div>
  );
}
