# BENCHMARKS.md — the founded, cited reference for every design decision

**Read this with CLAUDE.md §2A (THE BENCHMARK LAW). This file exists so "real research
every time" becomes "research once, cite forever" instead of re-fetching or, worse,
winging it. It is a LIVING document: when you consult a new primary source, or verify one
that is currently snippet-only, record it here. Do not delete the honesty log.**

**How to use it:** before any UI/UX/functionality change, find the relevant row below, state
its prescription + source in your response (the §2A pre-work gate), and say where the app
deviates. If the decision you need is not covered here, you have a research debt — go read
the primary source, add it here, THEN write code.

---

## 0. Provenance & honesty log — what was actually read

This is the most important section. A benchmark is only grounding if it was really read.

| Source | How reached | Date | Trust level |
|---|---|---|---|
| Apple HIG — Split Views (`developer.apple.com/design/human-interface-guidelines/split-views`) | **Search snippets only.** The HIG is a JS SPA; `WebFetch` returned the page title only. | 2026-08-03 | Snippet-verified, NOT full primary read |
| Apple HIG — Layout / Designing for macOS | **Search snippets only** (same SPA limitation) | 2026-08-03 | Snippet-verified |
| Apple HIG — Typography (macOS) | **Search snippets only** | 2026-08-03 | Snippet-verified |
| Apple HIG — Materials / Liquid Glass (WWDC25) | Secondary commentary via search | 2026-08-03 | Secondary, low |
| Google Maps desktop restaurant panel | Search snippets + prior product knowledge | 2026-08-03 | Snippet-verified |
| The Infatuation restaurant page | Search snippets (DesignRush, Center Design) | 2026-08-03 | Snippet-verified, app-focused not desktop |
| OpenTable / Resy profile page | Search snippets; the one desktop teardown (zmaic.com) **403'd** | 2026-08-03 | Weak — needs a real look |
| WCAG 2.2 AA | Known standard, not re-fetched this session | — | Standard |
| Core Web Vitals thresholds | Known standard (LCP<2.5s, CLS<0.1, INP<200ms) | — | Standard |

**Open research debts (§2A violations until closed):**
1. **No full primary read of the live Apple HIG.** Everything below tagged "HIG" is snippet
   level. To close: render the SPA (a browser with JS, not `WebFetch`) and read Split Views,
   Layout, Materials, Typography end to end.
2. **No live look at a competitor desktop restaurant page.** Google Maps / Infatuation /
   Resy were read *about*, not *looked at*, this session. To close: drive a real browser to
   each and capture the actual above-the-fold structure.
3. **No measured Core Web Vitals for this app.** LCP/CLS/INP have never been measured here.

---

## 1. Apple HIG benchmarks → our decision

Weight-led type, optical scaling and one-family hierarchy from §7 already match the HIG
Typography guidance, so those rows are "already compliant" and not repeated.

| Topic | HIG prescription (snippet-level, see §0) | Source | Our decision for whats-good |
|---|---|---|---|
| **Browse → detail** | A **split view** presents hierarchical content: a primary list pane beside a secondary detail pane. Restrict navigation to **one side**. | [Split Views](https://developer.apple.com/design/human-interface-guidelines/split-views) | **ADOPT on desktop.** The venue detail must become a master-detail split (persistent results list + detail beside it), not a full-page swap with a Back button. This is the root fix for "feels like a phone". See §3. |
| **Split proportions** | Default **⅓ primary / ⅔ secondary**, or half-and-half. Secondary pane **never narrower** than primary. | [Split Views](https://developer.apple.com/design/human-interface-guidelines/split-views) | List pane ~360–420px (or ⅓), detail takes the rest (≥⅔). Never invert. |
| **Divider** | Prefer the **thin, 1pt** divider. | [Split Views](https://developer.apple.com/design/human-interface-guidelines/split-views) | 1px hairline using `--border-color`/`--rule`, not a heavy rule. |
| **Adaptivity** | The interface must adapt on resize; a split view **collapses** to a single stack at narrow widths. | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Split view only at `lg+`. Below `lg` keep the existing single-column push nav (correct for phones). |
| **Margins & spacing** | macOS: **20pt standard margins, 8pt between related controls, 20pt between groups.** Respect safe areas. | [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos) | Desktop panes use 20–24px gutters; control clusters 8px (already used in the new toolbar); section groups ~20–24px. Stop eyeballing — use this scale. |
| **Readable width** | Constrain content width for legibility (Readable Content Guide). | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Body copy stays ~60ch (app currently caps ~52ch — inside range, fine). The detail pane, not the whole 1440, owns text width. |
| **Materials** | 2025 "Liquid Glass" translucency is heavily promoted as current Apple style. | Secondary (low trust) | **REJECT for content, per §7.** `.glass` stays on the 2 chrome surfaces only. Backdrop-filter on scrolling content is a perf cost (§7, §13) and fights the warm-editorial direction. This is a deliberate rejection, not an oversight. |

---

## 2. Market teardown → steal / reject (against §7)

| Competitor | What they do (snippet-level) | Source | Steal | Reject |
|---|---|---|---|---|
| **Google Maps (desktop)** | Master-detail: a search/list panel beside the map; selecting a place opens a **detail panel** (hours, photos, reviews) without leaving the list. | [Maps side panel](https://workspaceupdates.googleblog.com/2021/04/Use-Google-Maps-in-quick-access-side-panel.html) | The **persistent-list + detail-panel** pattern — validates §3. Utility (hours/address/phone) immediately visible. | The map-dominant, cold-utility feel — §1 wants a truthful decision layer on top, not a bare directory. |
| **The Infatuation** | Bold photography, **clean editorial layout**, warm/personality-driven voice, a prominent **rating score overlaying the restaurant image**, name+image list, bold obvious CTAs, click-to-call + website. | [DesignRush](https://www.designrush.com/best-designs/apps/the-infatuation), [Center Design](https://center.design/project/infatuation/) | Editorial hero + warm voice (already §7), **rating prominent on the image** (the app already does this), one clear obvious CTA. | Its list-heavy, review-first density where it buries the single "why this place" thesis (§8.1). |
| **OpenTable / Resy** | Reservation-first profiles; **hours/address and the primary action above the fold**; reviews from verified diners. | [OpenTable](https://www.opentable.com/), [Resy venue profile](https://helpdesk.resy.com/en_us/how-to-update-your-venue-listing-info-Hk1_ZvX8_) | **Above-the-fold utility** (open-now, hours, address, primary action) — the app currently buries these under a 440px hero on desktop. | The booking-centric IA — this product does not take reservations; its primary action is directions/call/menu/save (§8.6). |

---

## 3. Per-surface decisions (what to actually build)

### 3.1 Desktop venue detail → master-detail split view  *(next session, founded here)*
- **Layout at `lg+`:** two-pane split. Left: persistent, scrollable results list (~⅓, 360–420px).
  Right: the venue detail (≥⅔). 1px hairline divider. Selecting a card updates the right pane;
  the list stays put and highlights the active card. **No full-page swap, no "Back to results"
  button on desktop** — the list is always there (HIG Split Views; Google Maps).
- **Above the fold in the detail pane:** name + cuisine + rating, THEN open-now/hours/address/
  distance and the primary action **visible without scrolling** (OpenTable/Resy; §8.3). The hero
  image is contained and shorter so utility clears the fold — the current 440px hero pushes it
  under (measured 2026-08-03).
- **Below `lg`:** unchanged. The single-column push-nav detail with the full-bleed hero and the
  floating controls is the correct *phone* pattern (HIG adaptivity) — do not touch it.
- **Reject:** Liquid Glass on the panes (§1 row above). Panes use `.surface` / `--bg-warm`.

### 3.2 Spacing scale (stop eyeballing)
Desktop: 20–24px pane gutters, 8px intra-cluster, 20–24px inter-group (HIG macOS). Bind to a
token if introducing new spacing; do not sprinkle arbitrary px.

### 3.3 Performance budget (must be measured, currently unknown)
Targets: **LCP < 2.5s, CLS < 0.1, INP < 200ms** (Core Web Vitals). Actions when the redesign
lands: give the hero `<img>` explicit width/height (or aspect-ratio) to stop CLS; reconsider the
1.5s `scale(1.14→1)` hero entrance (it can delay LCP and is a paint the phone does on every
open); measure, don't assume.

### 3.4 Contrast (must be measured, not eyeballed — §11.7)
Every new tone measured to **WCAG 2.2 AA** (≥4.5:1 text, ≥3:1 large text/UI). The new desktop
toolbar Share/Save (`--charcoal` on `--bg-warm`, `--rule` border) is currently **unmeasured** —
measure before calling it done.

### 3.5 De-rounding (open decision, tokens-first)
The user reads heavy rounding as "cheap/widget/AI-slop"; editorial/print + macOS content plates
are more rectilinear. **Decide deliberately at the token level** (a `--radius` scale) rather than
per-component, so mobile and desktop stay coherent. Not yet decided — do not de-round piecemeal.

---

## 4. Standards quick-reference
- **WCAG 2.2 AA:** text ≥4.5:1, large text/UI ≥3:1, focus visible, hit targets (HIG 44pt).
- **Core Web Vitals:** LCP <2.5s · CLS <0.1 · INP <200ms — as measured numbers only.
- **Apple HIG macOS spacing:** 20pt margins · 8pt controls · 20pt groups · 1pt split divider.
