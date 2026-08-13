import {
  Beef, Building2, Clock, Cookie, Croissant, Disc3, Drumstick, Fish, Flame, Leaf,
  Martini, Music, Pizza, Salad, Sandwich, Soup, Wheat, Wine, Beer, Utensils,
} from "lucide-react";

/**
 * Names live as strings on the domain objects in food.ts (which must stay free
 * of UI imports); they are resolved to components here, at the UI boundary.
 */
const ICONS: Record<string, typeof Beef> = {
  Beef, Building2, Clock, Cookie, Croissant, Disc3, Drumstick, Fish, Flame, Leaf,
  Martini, Music, Pizza, Salad, Sandwich, Soup, Wheat, Wine, Beer,
};

export function CuisineIcon({ name, className = "size-4" }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Utensils;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.5} />;
}
