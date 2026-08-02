/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, MotionConfig } from 'motion/react';
import { ParsedRecipe } from '../types';
import { ChevronLeft, Heart, Star, MapPin, Phone, Navigation, Clock, ExternalLink, Info, Sparkles, Wallet, MessageSquare } from 'lucide-react';
// getVenueExtras is deliberately no longer called — it synthesised menus, prices and
// "specials" from a hash of the venue id. See the "What to expect" block below.
import { getHappyHourStatus, formatDays } from '../venueExtras';
import { cuisineIcon } from '../cuisineIcon';
import { findCuratedHappyHour } from '../happyHourData';
import { formatPriceTier, priceTierLabel } from '../placesService';
import { formatQuantity } from '../locale';

/** What the user asked for. Absent on the saved tabs — see App.tsx. */
export interface SearchIntent {
  vibe: string | null;
  cuisine: string | null;
  diet: string | null;
  priceTier: number | null;
  query: string;
}

interface EateryViewProps {
  recipes: ParsedRecipe[];
  selectedRecipe: ParsedRecipe;
  onSelectRecipe: (recipe: ParsedRecipe | null) => void;
  onRegenerate: () => void;
  savedIds: string[];
  onToggleSave: (recipe: ParsedRecipe) => void;
  onShare?: (recipe: ParsedRecipe) => void;
  isSavedTab?: boolean;
  intent?: SearchIntent;
}

/**
 * Why this venue, for this person, right now — assembled ONLY from what we were told.
 *
 * This is the decision layer CLAUDE.md §1 asks for, and the reason it took so long to
 * exist is that the obvious version of it is a lie. Places publishes no atmosphere, no
 * signature dish and no editorial summary, so "intimate lighting and a lively bar" would
 * have to be written by us about a venue we have never been to — the same failure as the
 * synthesised menus, wearing better prose.
 *
 * What IS true and was simply never said out loud: this venue is on screen because it
 * satisfied specific constraints the user set, and Google published specific facts about
 * it. Each line below is one of those, and each names its source. A reason we cannot
 * substantiate is not softened — it is absent, and when none survive the section does
 * not render.
 */
function buildFitReasons(
  rawEatery: any,
  intent: SearchIntent | undefined,
  distanceLabel: string | null,
): { text: string; source: string }[] {
  const reasons: { text: string; source: string }[] = [];
  const cuisine: string = rawEatery.cuisine ?? '';

  // Cuisine: claimed only when Places' own type data actually corroborates the filter.
  // A venue can arrive in the result set from the free-text query alone, and saying
  // "matches your Italian filter" about a venue Google typed as a bar would be the
  // search engine's guess restated as a fact about the venue.
  if (intent?.cuisine && cuisine && cuisine.toLowerCase().includes(intent.cuisine.toLowerCase())) {
    // Places' display name is already "Italian restaurant", so "Italian restaurant
    // kitchen" is what the naive join produces. Trim the noun this sentence supplies.
    const kitchen = cuisine.replace(/\s*restaurants?$/i, '').trim() || cuisine;
    reasons.push({ text: `${kitchen} kitchen, which is what you filtered for`, source: 'Google Places' });
  }

  // Price band: a confirmed equality, not "affordable".
  if (intent?.priceTier && rawEatery.priceTier === intent.priceTier) {
    reasons.push({
      text: `Sits in the ${priceTierLabel(rawEatery.priceTier)} band you set`,
      source: 'Google Places',
    });
  }

  // Open/closed is the fact most likely to change the decision, and `false` is a real
  // answer — compared against undefined, never truthiness.
  if (rawEatery.openNow === true) {
    reasons.push({
      text: rawEatery.closingSoon
        ? `Open now, but closing soon${rawEatery.hoursToday ? ` — today ${rawEatery.hoursToday}` : ''}`
        : rawEatery.hoursToday
          ? `Open now — today ${rawEatery.hoursToday}`
          : 'Open right now',
      source: 'Google Places',
    });
  } else if (rawEatery.openNow === false) {
    reasons.push({
      text: rawEatery.hoursToday ? `Closed right now — today ${rawEatery.hoursToday}` : 'Closed right now',
      source: 'Google Places',
    });
  }

  if (distanceLabel) {
    reasons.push({ text: `${distanceLabel} from where you are`, source: 'your location' });
  }

  if (typeof rawEatery.rating === 'number' && rawEatery.rating > 0) {
    const reviewCount = typeof rawEatery.userRatingCount === 'number'
      ? ` from ${formatQuantity(rawEatery.userRatingCount, 0)} Google reviews`
      : ' by Google reviewers';
    reasons.push({ text: `Rated ${rawEatery.rating}${reviewCount}`, source: 'Google Places' });
  }

  return reasons;
}

/**
 * The terms that actually went to Google, shown back to the user.
 *
 * The mood filter is the one input with no verifiable counterpart in the response: we
 * translate "tired & cosy" into a search term and Google matches on it, but nothing
 * comes back saying this venue IS cosy. Printing the terms is the honest form of that —
 * it says how the venue was found, which is true, instead of what it feels like inside,
 * which we do not know.
 */
export function matchedTerms(intent: SearchIntent | undefined): string[] {
  if (!intent) return [];
  return [intent.query, intent.cuisine, intent.vibe, intent.diet].filter(
    (t): t is string => typeof t === 'string' && t.trim().length > 0,
  );
}

export const EateryView: React.FC<EateryViewProps> = ({
  recipes,
  selectedRecipe,
  onSelectRecipe,
  onRegenerate,
  savedIds,
  onToggleSave,
  onShare,
  isSavedTab,
  intent,
}) => {
  const r = selectedRecipe;
  const rawEatery = (r as any).rawEatery;

  if (!rawEatery) return null;

  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(rawEatery.address)}`;
  const googleDetailsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rawEatery.name}, ${rawEatery.address}`)}`;
  // Venues saved to localStorage before this field existed carry no flag, and defaulting
  // those to "no site" would mislabel a real website as Maps. The fallback URL has a
  // known shape, so read the destination itself when the flag is absent; the flag stays
  // authoritative when present, since a venue could legitimately publish a Maps link.
  const hasOwnWebsite: boolean =
    typeof rawEatery.hasOwnWebsite === 'boolean'
      ? rawEatery.hasOwnWebsite
      : !/^https?:\/\/(www\.)?google\.[^/]+\/maps\//.test(rawEatery.externalLink ?? '');
  const isSaved = savedIds.includes(r.id);
  // Only show distance when it's a real measured value, not a city-name fallback
  const distanceLabel = r.tags[1];
  const hasRealDistance = typeof distanceLabel === 'string' && distanceLabel.includes('km');
  const hasRealWait = rawEatery.estimatedWait && rawEatery.estimatedWait !== 'Check with venue';

  // Happy hour is REAL data (happyHourData.ts) matched by venue name — only shown when
  // we genuinely have a confirmed window for this place, never fabricated per-venue.
  const realHH = findCuratedHappyHour(rawEatery.name);
  const hhStatus = realHH ? getHappyHourStatus(realHH) : null;

  const fitReasons = buildFitReasons(rawEatery, intent, hasRealDistance ? (distanceLabel as string) : null);
  const terms = matchedTerms(intent);

  // Utility Block source of truth. Assembled then filtered, so a field we don't have
  // produces one fewer tile instead of a tile rendering an empty string. `openNow` is
  // deliberately checked against `undefined` — `false` is a real, renderable answer
  // ("Closed"), and a truthiness check would silently swallow it.
  const utilityTiles: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: string;
  }[] = [
    hasRealDistance
      ? { label: 'Distance', value: distanceLabel as string, icon: MapPin, tone: 'text-[var(--accent-terracotta)]' }
      : null,
    /* Gated like its two neighbours, which it was not.
       `priceTierLabel` returns '' when Places published no band, and this entry was the
       only one of the three built unconditionally — so the tile rendered as a labelled
       card with nothing under it. Photographed on a real device: a "SPEND" heading over
       empty space. §8 is explicit that a field is a real value or it is absent; an empty
       labelled card is the placeholder, not the exception to it. */
    priceTierLabel(rawEatery.priceTier)
      ? { label: 'Spend', value: priceTierLabel(rawEatery.priceTier), icon: Wallet }
      : null,
    rawEatery.openNow !== undefined
      ? {
          label: 'Status',
          value: rawEatery.openNow ? (rawEatery.closingSoon ? 'Closing soon' : 'Open now') : 'Closed',
          icon: Clock,
          tone: rawEatery.openNow
            ? rawEatery.closingSoon
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-700 dark:text-emerald-400'
            : 'text-[var(--text-muted)]',
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: string;
  }[];

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="page-grid bleed w-full"
    >

      {/* Colours here sit over a photo, not a theme surface — they stay mode-independent. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        // Full bleed means the physical edge of the viewport, not the edge of the content
        // column. `.bleed` puts this in the grid's full-start → full-end track, so it
        // measures x === 0 and width === the visible viewport at every breakpoint — no
        // negative margins to keep in sync with an ancestor's padding, and no w-screen
        // (which mis-centres against a scrollbar). The -mt cancels <main>'s top padding
        // so the photo also runs up under the header.
        className="bleed relative -mt-6 sm:-mt-10 lg:-mt-16 h-[46dvh] sm:h-[56dvh] md:h-[60dvh] overflow-hidden group"
      >
        <motion.img
          src={r.image}
          alt={rawEatery.name}
          initial={{ scale: 1.14 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full object-cover"
        />
        {/* Gradient scrim for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/22 to-transparent" />

        {/* Back — top left */}
        <button
          onClick={() => onSelectRecipe(null)}
          className="tap-44 absolute top-5 left-5 flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer backdrop-blur-md bg-black/20 hover:bg-black/35 rounded-full px-3.5 py-2"
        >
          <ChevronLeft className="w-3 h-3" />
          {isSavedTab ? `Saved (${recipes.length})` : `Results (${recipes.length})`}
        </button>

        <button
          type="button"
          onClick={() => onShare?.(r)}
          aria-label={`Share ${rawEatery.name}`}
          className="tap-44 absolute top-5 right-20 rounded-full flex items-center justify-center gap-1.5 backdrop-blur-md bg-black/20 text-white hover:bg-black/35 transition-all cursor-pointer px-3.5"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider">Share</span>
        </button>

        {/* Save — top right */}
        {/* Saved state says so in words as well as colour. A filled heart is the only
            feedback a tap used to produce, which is both a weak confirmation and
            invisible to anyone who cannot separate the two fills at a glance;
            `aria-pressed` gives assistive tech the toggle state the shape implies. The
            label is the ink that grows, not the target — the tap area stays `tap-44`. */}
        <button
          onClick={() => onToggleSave(r)}
          aria-label={isSaved ? `Remove ${rawEatery.name} from saved` : `Save ${rawEatery.name}`}
          aria-pressed={isSaved}
          className={`tap-44 absolute top-5 right-5 rounded-full flex items-center justify-center gap-1.5 backdrop-blur-md transition-all cursor-pointer ${
            isSaved
              ? 'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] px-3.5'
              : 'bg-black/20 text-white hover:bg-black/35'
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isSaved ? 'fill-current scale-110' : ''}`} />
          {isSaved && (
            <span className="font-mono text-xs uppercase tracking-wider">Saved</span>
          )}
        </button>

        {/* Name overlay — bottom of hero.
            Deliberately NOT a motion element. This is the name of the place you came here
            to look at; it is the page's identity, and it must be on the first paint with
            no frame of delay. It used to fade in on a 0.22s-delayed opacity/y entrance,
            and it was measured live sitting at opacity 0 / translateY(16px) — a venue
            page with no venue name on it. An entrance animation may never be the thing
            that decides whether the primary content exists. Everything decorative around
            it can animate; this cannot. */}
        <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-10 pb-8 sm:pb-12">
          {/* Was text-white/45, which over a bright photo (a yellow wall, a sunlit
              terrace) disappeared completely — the kitchen label was invisible on the
              venue this was tested against. Contrast is not optional; at /85 with a
              drop-shadow it holds against a light or dark image. */}
          {rawEatery.cuisine && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] mb-3">
              {React.createElement(cuisineIcon(rawEatery.cuisine), {
                'aria-hidden': 'true',
                strokeWidth: 2,
                className: 'w-3 h-3 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]',
              })}
              {rawEatery.cuisine}
            </span>
          )}
          <h2 className="font-serif text-5xl sm:text-6xl md:text-[5.5rem] text-white leading-[0.9] tracking-tight mb-5">
            {rawEatery.name}
          </h2>
          {/* Same fix the cuisine label above already got, which this row was left out of:
              /55 over a photograph is not a contrast ratio, it's a hope. Rating, spend and
              distance are the three facts someone standing on a street actually reads. */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
            {/* Guarded: `rating` is optional now that the invented 4.0 default is gone
                (venue.ts). An unguarded render put a star with nothing beside it on every
                unrated venue — the trailing separator goes with it, or the row opens on a
                stray interpunct. The count rides along because a 4.9 from three people is
                not a 4.9, and Google publishes both under the same SKU. */}
            {typeof rawEatery.rating === 'number' && (
              <>
                <span className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-white text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]" />
                  {formatQuantity(rawEatery.rating, 1)}
                  {typeof rawEatery.userRatingCount === 'number' && (
                    <span className="text-white/70 normal-case tracking-normal">
                      ({formatQuantity(rawEatery.userRatingCount, 0)})
                    </span>
                  )}
                </span>
                <span className="text-white/45">·</span>
              </>
            )}
            <span aria-label={priceTierLabel(rawEatery.priceTier)}>{formatPriceTier(rawEatery.priceTier)}</span>
            {hasRealDistance && (
              <>
                <span className="text-white/45">·</span>
                <span>{distanceLabel}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Two-column on desktop: the menu is the main column; everything actionable
          (address, contact, happy hour) lives in a sticky sidebar so wide screens are
          used, not left mostly empty. Collapses to a single column below lg. */}
      {/* Below lg this is a flex column purely so the two children can be REORDERED:
          the sidebar is first in the DOM (desktop needs it in the right-hand track) but
          on a phone that put the address and three action pillars above every reason to
          act — the page asked you to call before it told you why. Desktop is unaffected
          because both children are placed explicitly by column and row, which ignores
          source order; `order-*` is what the flex column below lg honours. */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8 lg:items-start">

      {/* SIDEBAR (right on desktop, BELOW the reasons on mobile) */}
      {/* `self-start` is LG-ONLY. It exists for the sticky desktop column, and while the
          container below lg was a plain block it did nothing. Turning that container into
          a flex column (for the mobile reorder) made it bite: align-self:flex-start
          shrank this whole column to content width, so the action pillars' `flex-1` had
          no width to divide and the three labels bunched into a left-hand clump —
          78/44/57px instead of equal thirds. Reported from a real phone, not caught here,
          because the reorder was checked at the top of the page and not at the actions. */}
      <aside className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start lg:pt-4">

      {/* On mobile this column now follows the content, so it opens with its own rule
          rather than the page's top padding. */}
      <div className="mx-5 sm:mx-10 mt-2 mb-7 h-px bg-[var(--rule)] lg:hidden" />

      {/* Contact — minimalist icon pillars */}
      <div className="px-5 sm:px-10 flex items-start">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get directions"
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group press"
        >
          <div className="w-11 h-11 rounded-full bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] flex items-center justify-center group-hover:opacity-90 transition-opacity">
            <Navigation className="w-4 h-4" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">Directions</span>
        </a>
        {/* Gated on a real number. Unguarded, a venue with no published phone still got
            a Call pillar wired to `tel:` with an empty accessible name — an action that
            cannot act, which is the same broken promise as a fabricated fact. */}
        {rawEatery.phone && (
          <a
            href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
            aria-label={`Call ${rawEatery.phone}`}
            className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group press"
          >
            <div className="w-11 h-11 rounded-full border border-[var(--rule)] flex items-center justify-center group-hover:border-[var(--accent-terracotta)] transition-colors">
              <Phone className="w-4 h-4 text-[var(--accent-terracotta)]" />
            </div>
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">Call</span>
          </a>
        )}
        <a
          href={rawEatery.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={hasOwnWebsite ? `Official website for ${rawEatery.name}` : `Look up ${rawEatery.name} on Google Maps`}
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group press"
        >
          <div className="w-11 h-11 rounded-full border border-[var(--rule)] flex items-center justify-center group-hover:border-[var(--accent-terracotta)] transition-colors">
            {hasOwnWebsite ? (
              <ExternalLink className="w-4 h-4 text-[var(--accent-terracotta)]" />
            ) : (
              <MapPin className="w-4 h-4 text-[var(--accent-terracotta)]" />
            )}
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
            {hasOwnWebsite ? 'Website' : 'Maps'}
          </span>
        </a>
      </div>

      {/* Rule */}
      <div className="mx-5 sm:mx-10 my-7 h-px bg-[var(--rule)]" />

      {/* Happy Hour — only surfaces when there is one; live state leads because it's the
          only part of this page that expires. */}
      {realHH && hhStatus && (
        <div className="px-5 sm:px-10 mb-8">
          <div
            className={`rounded-2xl px-5 py-4 border ${
              hhStatus.state === 'live'
                ? 'border-[var(--accent-terracotta)] bg-[var(--accent-tint)]'
                : 'border-[var(--rule)]'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="flex items-center gap-2">
                {hhStatus.state === 'live' && (
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-[var(--accent-terracotta)] opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[var(--accent-terracotta)]" />
                  </span>
                )}
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] font-bold">
                  {realHH.headline}
                </span>
              </span>
              <span className={`font-mono text-xs tabular-nums ${hhStatus.state === 'live' ? 'text-[var(--accent-terracotta)] font-bold' : 'text-[var(--text-muted)]'}`}>
                {hhStatus.label}
              </span>
            </div>
            <ul className="flex flex-col gap-1 mb-2">
              {realHH.deals.map((d) => (
                <li key={d} className="font-mono text-xs text-[var(--charcoal)] flex items-center gap-2">
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--accent-terracotta)] flex-shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
              {formatDays(realHH.days)} · via {realHH.sourceLabel}
            </p>
          </div>
        </div>
      )}

      </aside>

      {/* MAIN column (left on desktop, FIRST on mobile) — the reasons to consider this
          place, which is what the page is for. */}
      <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1 lg:pt-4">

      {/* Address — moved out of the action column. It is identity, not an action: where
          the place is belongs beside the reasons to go, not stacked on the buttons. */}
      <div className="px-5 sm:px-10 pt-5 pb-6">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{rawEatery.address}</span>
        </div>
      </div>

      {/* WHAT TO EXPECT — replaces the invented menu and the invented "specials".
       *
       * What used to be here: a full priced menu (Starters / Mains / Desserts, leader
       * dots, "R185") and a specials list stamped "Today", both synthesised in
       * venueExtras.ts from a hash of the venue id, with a small grey disclaimer at the
       * bottom saying none of it was real.
       *
       * That is indefensible for this product regardless of the disclaimer. Someone
       * standing on a street decides where to walk based on a price and a dish. Nobody
       * reads the footnote under the thing they came for; the disclaimer protects us,
       * not them. And "Today: Sunset Set Menu, R295" is a promise attached to a
       * specific day — the failure mode is a person arriving and being told it doesn't
       * exist. A fabricated price is worse than no price.
       *
       * What replaced it is only fields that are actually true: the venue's real
       * signature dish, the price BAND that Google publishes (a band is honest — it's
       * what Places actually knows), and a direct route to the venue's own menu. Less
       * content on screen, all of it load-bearing. Real happy-hour data still renders
       * in the sidebar; that comes from happyHourData.ts and is human-confirmed. */}
      <div className="px-5 sm:px-10 mb-8">

        {/* ── WHY THIS ONE ─────────────────────────────────────────────────────────
            The decision layer, and the first thing under the hero because it is the
            question the user is actually holding: not "what are the facts" but "why am I
            looking at this place". Every line is a real field or a constraint the user
            themselves set, and each carries its source — see buildFitReasons.

            When nothing survives (a saved venue opened with no active filters, a listing
            Places knows almost nothing about) the section does not render at all. An
            honest gap beats a confident sentence about a restaurant nobody here has
            visited. */}
        {fitReasons.length > 0 && (
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-3">
              Why this one
            </p>
            <ul className="flex flex-col gap-2.5">
              {fitReasons.map((reason) => (
                <li key={reason.text} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--accent-terracotta)] flex-shrink-0"
                  />
                  <span className="font-sans text-[15px] leading-snug text-[var(--charcoal)] max-w-[52ch]">
                    {reason.text}
                  </span>
                </li>
              ))}
            </ul>
            {terms.length > 0 && (
              /* How it was found, stated as such. The mood term reached Google; whether
                 the room is cosy is not something we were told, and this line is careful
                 to claim only the former. */
              <p className="mt-3.5 font-mono text-xs text-[var(--text-muted)] leading-relaxed">
                Found by searching {terms.map((t) => `“${t}”`).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* ── VIBE & ATMOSPHERE MATCH ──────────────────────────────────────────────
            Answers "is this place right for how I feel", which is the question the whole
            app is built around. `vibeMatch` is an authored field on the venue record, not
            derived or synthesised — so the module simply does not render when it is
            absent rather than emitting an empty tinted pill. */}
        {rawEatery.vibeMatch && (
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-3">
              Vibe &amp; atmosphere
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-tint-border)] bg-[var(--accent-tint)] px-4 py-2">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent-terracotta)]" />
              <span className="font-sans text-[14px] font-semibold text-[var(--accent-terracotta)] first-letter:uppercase">
                {rawEatery.vibeMatch}
              </span>
            </span>
          </div>
        )}

        {/* ── UTILITY BLOCK ────────────────────────────────────────────────────────
            The three facts that decide whether you walk there now: how far, what it
            costs, whether the door is open. Tiles are built from the real fields only —
            `utilityTiles` is filtered before render, so a venue missing distance shows
            two tiles rather than a tile containing nothing. Fixed tile height keeps the
            row from reflowing when a longer value lands. */}
        {utilityTiles.length > 0 && (
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-3">
              At a glance
            </p>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {utilityTiles.map((t) => (
                <div
                  key={t.label}
                  className="surface-quiet rounded-2xl px-3 py-3.5 min-h-[84px] flex flex-col justify-between"
                >
                  <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)]">
                    {/* Decorative: the label beside it carries the meaning, so it is hidden from
                        assistive tech by the wrapper rather than by a prop the icon type
                        does not accept. */}
                    {React.createElement(t.icon, { className: 'w-3 h-3 flex-shrink-0' })}
                    {t.label}
                  </span>
                  <span className={`font-sans text-[14px] font-semibold leading-tight ${t.tone ?? 'text-[var(--charcoal)]'}`}>
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
            {/* Today stays on the surface — it is the only hours line that decides whether
                you leave the house now. When the full week is available the rest of it sits
                one tap behind a native <details> so the page keeps its shape (§5 Explore:
                go deeper without losing your place). weeklyHours[0] IS today, so the list
                opens on the line the summary already showed and reads forward from there.
                <details>, not useState: this component early-returns above when there is no
                venue, so a hook added here would sit after a conditional return and change
                hook order between renders. */}
            {rawEatery.hoursToday && (!rawEatery.hoursWeekly || rawEatery.hoursWeekly.length === 0) && (
              <p className="mt-2.5 font-mono text-xs text-[var(--text-muted)]">
                Today: {rawEatery.hoursToday}
              </p>
            )}
            {rawEatery.hoursWeekly && rawEatery.hoursWeekly.length > 0 && (
              <details className="mt-2.5 group">
                <summary className="hit-44 list-none cursor-pointer font-mono text-xs text-[var(--text-muted)] hover:text-[var(--charcoal)] transition-colors flex items-center gap-1.5">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{rawEatery.hoursToday ? `Today: ${rawEatery.hoursToday}` : 'Opening hours'}</span>
                  <span className="text-[var(--accent-terracotta)] group-open:hidden">All week</span>
                  <span className="text-[var(--accent-terracotta)] hidden group-open:inline">Hide</span>
                </summary>
                <ul className="mt-2.5 flex flex-col">
                  {rawEatery.hoursWeekly.map((line, i) => (
                    <li
                      key={line}
                      className={`font-mono text-xs py-1.5 border-b border-[var(--row-border)] last:border-0 ${
                        i === 0 ? 'text-[var(--charcoal)] font-bold' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* ── SIGNATURE DIRECTIVE ──────────────────────────────────────────────────
            What to actually order, and what is in it. Every field here is authored on the
            venue record; nothing is inferred from the venue id (see the note above about
            the synthesised menu this replaced). The whole module collapses when the venue
            has no confirmed dish, which is the case for every Places-sourced result. */}
        {(rawEatery.signatureOrder || rawEatery.signatureDescription || rawEatery.signatureIngredients.length > 0) && (
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-3">
              What to order
            </p>

            {rawEatery.signatureOrder && (
              <h3 className="font-serif text-2xl sm:text-3xl leading-tight text-[var(--heading-color)] mb-3">
                {rawEatery.signatureOrder}
              </h3>
            )}

            {rawEatery.signatureDescription && (
              <p className="font-sans text-[15px] leading-relaxed text-[var(--charcoal)] max-w-[62ch] mb-5">
                {rawEatery.signatureDescription}
              </p>
            )}

            {rawEatery.signatureIngredients.length > 0 && (
              <>
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-2.5">
                  Check before you order
                </p>
                <ul className="flex flex-wrap gap-2">
                  {rawEatery.signatureIngredients.map((ing) => (
                    <li
                      key={ing}
                      className="rounded-full border border-[var(--rule)] px-3 py-1.5 font-sans text-[13px] text-[var(--charcoal)]"
                    >
                      {ing}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* Kitchen — always true, always available. */}
        {rawEatery.cuisine && (
          <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[var(--row-border)]">
            <span className="text-[13px] text-[var(--text-muted)] flex-shrink-0">Kitchen</span>
            <span className="inline-flex items-center gap-2 font-sans text-[14px] font-semibold text-[var(--charcoal)] text-right">
              {React.createElement(cuisineIcon(rawEatery.cuisine), {
                'aria-hidden': 'true',
                strokeWidth: 1.75,
                className: 'w-[15px] h-[15px] flex-shrink-0 text-[var(--accent-terracotta)]',
              })}
              {rawEatery.cuisine}
            </span>
          </div>
        )}
        {hasRealWait && (
          <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[var(--row-border)]">
            <span className="text-[13px] text-[var(--text-muted)] flex-shrink-0">Estimated wait</span>
            <span className="font-sans text-[14px] font-semibold text-[var(--charcoal)] text-right">
              {rawEatery.estimatedWait}
            </span>
          </div>
        )}

        {/* The menu itself lives with the venue. Send people there properly, as a real
            action, instead of burying it in a footnote under fake prices. The copy
            promises only what the destination is: the venue's own site may carry a
            menu, a Maps listing carries photos and reviews and makes no menu promise. */}
        <a
          href={rawEatery.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--rule)] text-[14px] font-medium text-[var(--charcoal)] hover:border-[var(--accent-terracotta)] hover:bg-[var(--accent-tint)] transition-colors"
        >
          {hasOwnWebsite ? <ExternalLink className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          {hasOwnWebsite ? 'See the full menu and photos' : 'Open in Google Maps'}
        </a>

        <a
          href={googleDetailsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--accent-terracotta)] hover:underline underline-offset-4"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Read Google reviews and see more photos
        </a>

        <div className="mt-5 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--text-subtle)]" />
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed max-w-[58ch]">
            Place details, ratings and photos are powered by Google. Spend is the band Google
            publishes for this venue, not a quoted price. Menus and prices change — confirm
            with the venue before you go.
          </p>
        </div>
      </div>

      </div>{/* /MAIN */}
      </div>{/* /two-column grid */}

      {/* The old "Visit Details" list lived here and repeated open status, distance, wait
          and phone — all four of which are now either in the Utility Block above or in the
          sidebar's contact pillars and the mobile action bar. Two renderings of the same
          fact on one page is not depth, it's noise; the block is gone rather than
          restyled. */}

      {/* Footer */}
      <div className="px-5 sm:px-10 pt-6 pb-[calc(var(--tabbar-h)+5rem+env(safe-area-inset-bottom))] lg:pb-12 flex flex-wrap gap-4 items-center justify-between border-t border-[var(--rule)]">
        <button
          onClick={() => onSelectRecipe(null)}
          className="hit-44 font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--charcoal)] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> Back to results
        </button>
        <button
          onClick={onRegenerate}
          className="font-mono text-xs uppercase tracking-wider text-[var(--accent-terracotta)] hover:opacity-60 cursor-pointer transition-opacity"
        >
          Find other eateries
        </button>
      </div>

      {/* Mobile sticky action bar — the whole journey ends at "go there" or
          "call ahead", so those actions stay under the thumb while the user
          scrolls the menu. Desktop keeps the sidebar pillars; lg:hidden. */}
      {/* Sits ON the tab bar, derived from --tabbar-h — never a number. Pinned at a
          hardcoded 64px against a 57px bar this left a 7px strip of page visible between
          two opaque bars. The safe-area inset belongs in the OFFSET (the bar it stacks
          on already clears the home indicator), so the padding below is a flat 0.5rem —
          counting the inset in both places would double it. */}
      <div className="action-bar lg:hidden fixed bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] left-0 right-0 z-40 pb-2 pt-2 flex gap-3">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3.5 rounded-2xl bg-[var(--accent-terracotta)] text-[var(--accent-contrast)] font-sans text-sm font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
        >
          <Navigation className="w-4 h-4" /> Directions
        </a>
        {rawEatery.phone && (
          <a
            href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
            aria-label={`Call ${rawEatery.name}`}
            className="w-[52px] py-3.5 rounded-2xl border border-[var(--rule)] bg-[var(--bg-warm)] text-[var(--accent-terracotta)] flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>
    </motion.div>
    </MotionConfig>
  );
};
