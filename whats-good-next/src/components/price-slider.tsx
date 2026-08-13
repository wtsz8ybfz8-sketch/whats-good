import { PRICE_LEVELS, type PriceBand } from "@/lib/food";

const BANDS: (PriceBand | null)[] = [null, "cheap", "mid", "high"];

/**
 * Budget as one continuous control rather than three separate chips: on a
 * phone it is a single thumb drag instead of three tap targets, and "Any" is
 * a real position on the scale rather than the absence of a selection.
 */
export function PriceSlider({
  value,
  onChange,
  className = "",
}: {
  value: PriceBand | null;
  onChange: (next: PriceBand | null) => void;
  className?: string;
}) {
  const index = Math.max(0, BANDS.indexOf(value));
  const label = value ? (PRICE_LEVELS.find((b) => b.id === value)?.word ?? "Any") : "Any budget";

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Budget</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={3}
        step={1}
        value={index}
        aria-label="Budget"
        aria-valuetext={label}
        onChange={(event) => onChange(BANDS[Number(event.target.value)] ?? null)}
        className="mt-2 h-11 w-full cursor-pointer accent-[var(--primary,currentColor)]"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Any</span>
        <span>Cheap</span>
        <span>Mid</span>
        <span>Big night</span>
      </div>
    </div>
  );
}
