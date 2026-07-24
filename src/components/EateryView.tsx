/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ParsedRecipe } from '../types';
import { ChevronLeft, Heart, Star, MapPin, Phone, Navigation, Clock, ExternalLink, Info } from 'lucide-react';
import { getVenueExtras, getHappyHourStatus, formatDays } from '../venueExtras';
import { findCuratedHappyHour } from '../happyHourData';
import { formatPriceTier } from '../placesService';

interface EateryViewProps {
  recipes: ParsedRecipe[];
  selectedRecipe: ParsedRecipe;
  onSelectRecipe: (recipe: ParsedRecipe | null) => void;
  onRegenerate: () => void;
  savedIds: string[];
  onToggleSave: (recipe: ParsedRecipe) => void;
  isSavedTab?: boolean;
  currency?: string;
}

export const EateryView: React.FC<EateryViewProps> = ({
  recipes,
  selectedRecipe,
  onSelectRecipe,
  onRegenerate,
  savedIds,
  onToggleSave,
  isSavedTab,
  currency = 'R',
}) => {
  const r = selectedRecipe;
  const rawEatery = (r as any).rawEatery;

  if (!rawEatery) return null;

  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(rawEatery.address)}`;
  const isSaved = savedIds.includes(r.id);
  // Only show distance when it's a real measured value, not a city-name fallback
  const distanceLabel = r.tags[1];
  const hasRealDistance = typeof distanceLabel === 'string' && distanceLabel.includes('km');
  const hasRealWait = rawEatery.estimatedWait && rawEatery.estimatedWait !== 'Check with venue';

  const extras = getVenueExtras(r.id, rawEatery.priceSymbol, rawEatery.signatureOrder, rawEatery.signatureDescription);
  // Happy hour is REAL data (happyHourData.ts) matched by venue name — only shown when
  // we genuinely have a confirmed window for this place, never fabricated per-venue.
  const realHH = findCuratedHappyHour(rawEatery.name);
  const hhStatus = realHH ? getHappyHourStatus(realHH) : null;
  const today = new Date().getDay();
  const specialsToday = extras.specials.filter((s) => s.days.includes(today));

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto w-full"
    >

      {/* Hero — CONTAINED within the column. The old full-bleed used a
          left-1/2/-translate-x-1/2/w-screen breakout that mis-centred on wide desktop
          and clipped the title and Back button off the left edge. */}
      {/* Colours here sit over a photo, not a theme surface — they stay mode-independent. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full h-[46vh] sm:h-[56vh] rounded-b-[26px] sm:rounded-[26px] sm:mt-3 overflow-hidden group"
      >
        <motion.img
          src={r.image}
          alt={rawEatery.name}
          referrerPolicy="no-referrer"
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
          className="absolute top-5 left-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.07em] text-white/70 hover:text-white transition-colors cursor-pointer backdrop-blur-md bg-black/20 hover:bg-black/35 rounded-full px-3.5 py-2"
        >
          <ChevronLeft className="w-3 h-3" />
          {isSavedTab ? `Saved (${recipes.length})` : `Results (${recipes.length})`}
        </button>

        {/* Save — top right */}
        <button
          onClick={() => onToggleSave(r)}
          aria-label={isSaved ? 'Remove from saved' : 'Save eatery'}
          className={`absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
            isSaved
              ? 'bg-[var(--accent-terracotta)] text-[var(--accent-contrast)]'
              : 'bg-black/20 text-white hover:bg-black/35'
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isSaved ? 'fill-current scale-110' : ''}`} />
        </button>

        {/* Name overlay — bottom of hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-8 sm:pb-12"
        >
          {rawEatery.cuisine && (
            <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-white/45 block mb-3">
              {rawEatery.cuisine}
            </span>
          )}
          <h2 className="font-serif text-5xl sm:text-6xl md:text-[5.5rem] text-white leading-[0.9] tracking-tight mb-5">
            {rawEatery.name}
          </h2>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-white/55">
            <span className="flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-white/80 text-white/80" />
              {rawEatery.rating}
            </span>
            <span className="text-white/25">·</span>
            <span>{formatPriceTier(rawEatery.priceSymbol, currency)}</span>
            {hasRealDistance && (
              <>
                <span className="text-white/25">·</span>
                <span>{distanceLabel}</span>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Two-column on desktop: the menu is the main column; everything actionable
          (address, contact, happy hour) lives in a sticky sidebar so wide screens are
          used, not left mostly empty. Collapses to a single column below lg. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8 lg:items-start">

      {/* SIDEBAR (right on desktop, top on mobile) */}
      <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 self-start lg:pt-4">

      {/* Address */}
      <div className="px-6 sm:px-10 pt-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[11px] font-mono">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{rawEatery.address}</span>
        </div>
      </div>

      {/* Rule */}
      <div className="mx-6 sm:mx-10 my-7 h-px bg-[var(--rule)]" />

      {/* Contact — minimalist icon pillars */}
      <div className="px-6 sm:px-10 flex items-start">
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
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">Directions</span>
        </a>
        <a
          href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
          aria-label={`Call ${rawEatery.phone}`}
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group press"
        >
          <div className="w-11 h-11 rounded-full border border-[var(--rule)] flex items-center justify-center group-hover:border-[var(--accent-terracotta)] transition-colors">
            <Phone className="w-4 h-4 text-[var(--accent-terracotta)]" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">Call</span>
        </a>
        <a
          href={rawEatery.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Official website"
          className="flex-1 flex flex-col items-center gap-2.5 cursor-pointer group press"
        >
          <div className="w-11 h-11 rounded-full border border-[var(--rule)] flex items-center justify-center group-hover:border-[var(--dusty-blue)] transition-colors">
            <ExternalLink className="w-4 h-4 text-[var(--dusty-blue)]" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">Website</span>
        </a>
      </div>

      {/* Rule */}
      <div className="mx-6 sm:mx-10 my-7 h-px bg-[var(--rule)]" />

      {/* Happy Hour — only surfaces when there is one; live state leads because it's the
          only part of this page that expires. */}
      {realHH && hhStatus && (
        <div className="px-6 sm:px-10 mb-8">
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
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent-terracotta)] font-bold">
                  {realHH.headline}
                </span>
              </span>
              <span className={`font-mono text-[10px] tabular-nums ${hhStatus.state === 'live' ? 'text-[var(--accent-terracotta)] font-bold' : 'text-[var(--text-muted)]'}`}>
                {hhStatus.label}
              </span>
            </div>
            <ul className="flex flex-col gap-1 mb-2">
              {realHH.deals.map((d) => (
                <li key={d} className="font-mono text-[11px] text-[var(--charcoal)] flex items-center gap-2">
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--accent-terracotta)] flex-shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--text-subtle)]">
              {formatDays(realHH.days)} · via {realHH.sourceLabel}
            </p>
          </div>
        </div>
      )}

      </aside>

      {/* MAIN column (left on desktop) — the menu is the reason to look at this page */}
      <div className="lg:col-start-1 lg:row-start-1 lg:pt-4">

      {/* Specials — today's first, since that's the only actionable set */}
      {extras.specials.length > 0 && (
        <div className="px-6 sm:px-10 mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.09em] text-[var(--text-subtle)] mb-4">Specials</p>
          <div className="flex flex-col gap-3">
            {[...specialsToday, ...extras.specials.filter((s) => !s.days.includes(today))].map((s) => {
              const isToday = s.days.includes(today);
              return (
                <div key={s.title} className="flex items-start gap-3">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.07em] w-[52px] flex-shrink-0 pt-0.5 ${
                      isToday ? 'text-[var(--accent-terracotta)] font-bold' : 'text-[var(--text-subtle)]'
                    }`}
                  >
                    {isToday ? 'Today' : formatDays(s.days)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-sans text-[13px] font-semibold text-[var(--charcoal)] flex items-center gap-2 flex-wrap">
                      {s.title}
                      {s.badge && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.07em] px-1.5 py-0.5 rounded border border-[var(--rule)] text-[var(--text-subtle)] font-normal">
                          {s.badge}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5">{s.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu — the reason to look at this page. Courses as typographic sections, no
          cards: a menu is a list you read top to bottom, not a grid you scan. */}
      <div className="px-6 sm:px-10 mb-8">
        <div className="flex items-baseline justify-between mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.09em] text-[var(--text-subtle)]">Menu</p>
          <span className="font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--text-subtle)]">Sample</span>
        </div>

        {extras.menu.map((course, ci) => (
          <motion.div
            key={course.course}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.5, delay: ci * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="mb-7 last:mb-0"
          >
            <h3 className="font-serif text-xl mb-3.5">{course.course}</h3>
            <ul className="flex flex-col">
              {course.items.map((item) => (
                <li key={item.name} className="py-3 border-b border-[var(--row-border)] last:border-b-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-sans text-[14px] font-semibold text-[var(--charcoal)] flex items-center gap-2 flex-wrap">
                      {item.name}
                      {item.tags?.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[10px] uppercase tracking-[0.07em] px-1.5 py-0.5 rounded-full bg-[var(--accent-tint)] text-[var(--accent-terracotta)] font-normal"
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                    {/* Leader dots — the one bit of menu typography that makes a price list
                        read as a menu rather than a table */}
                    <span className="flex-1 border-b border-dotted border-[var(--rule)] translate-y-[-3px] min-w-[16px]" />
                    <span className="font-mono text-[13px] tabular-nums text-[var(--charcoal)] whitespace-nowrap">
                      R{item.price}
                    </span>
                  </div>
                  {item.description && (
                    <p className="font-mono text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed max-w-[58ch]">
                      {item.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        {/* Provenance. This is not decoration — rendering invented prices without saying
            so would be lying to the user. */}
        <div className="mt-6 flex items-start gap-2.5 px-4 py-3 rounded-xl border border-[var(--rule)]">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--text-subtle)]" />
          <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
            Sample menu — Google Places doesn't publish menus, so these dishes and prices are
            representative of the venue's cuisine and price band, not confirmed.
            {rawEatery.signatureOrder && ' The signature dish is real.'}{' '}
            <a
              href={rawEatery.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-terracotta)] underline underline-offset-2"
            >
              Check the venue's own menu
            </a>
            .
          </p>
        </div>
      </div>

      </div>{/* /MAIN */}
      </div>{/* /two-column grid */}

      {/* Rule */}
      <div className="mx-6 sm:mx-10 my-7 h-px bg-[var(--rule)]" />

      {/* Visit Details — pure typography, no container */}
      <div className="px-6 sm:px-10 pb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.09em] text-[var(--text-subtle)] mb-5">Visit Details</p>
        <div className="flex flex-col">
          {rawEatery.openNow !== undefined && (
            <div className="flex items-center justify-between py-3.5 border-b border-[var(--row-border)]">
              <span className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" /> {rawEatery.openNow ? 'Open Now' : 'Closed Now'}
              </span>
              <span className={`font-mono text-[11px] font-bold ${rawEatery.openNow ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--text-subtle)]'}`}>
                {rawEatery.hoursToday ?? (rawEatery.openNow ? 'Open' : 'Closed')}
              </span>
            </div>
          )}
          {hasRealWait && (
            <div className="flex items-center justify-between py-3.5 border-b border-[var(--row-border)]">
              <span className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" /> Estimated Wait
              </span>
              <span className="font-mono text-[11px] font-bold text-[var(--charcoal)]">{rawEatery.estimatedWait}</span>
            </div>
          )}
          {hasRealDistance && (
            <div className="flex items-center justify-between py-3.5 border-b border-[var(--row-border)]">
              <span className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
                <MapPin className="w-3.5 h-3.5" /> Distance
              </span>
              <span className="font-mono text-[11px] font-bold text-[var(--accent-terracotta)]">{distanceLabel}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
              <Phone className="w-3.5 h-3.5" /> Phone
            </span>
            <a
              href={`tel:${rawEatery.phone.replace(/\s+/g, '')}`}
              className="font-mono text-[11px] font-bold text-[var(--charcoal)] hover:text-[var(--accent-terracotta)] transition-colors"
            >
              {rawEatery.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 sm:px-10 pt-6 pb-[110px] md:pb-12 flex flex-wrap gap-4 items-center justify-between border-t border-[var(--rule)]">
        <button
          onClick={() => onSelectRecipe(null)}
          className="font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] hover:text-[var(--charcoal)] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> Back to results
        </button>
        <button
          onClick={onRegenerate}
          className="font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--accent-terracotta)] hover:opacity-60 cursor-pointer transition-opacity"
        >
          Find other eateries
        </button>
      </div>
    </motion.div>
  );
};
