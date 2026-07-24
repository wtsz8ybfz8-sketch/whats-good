# What's Good — Ideation Brief

> Take this to another AI (or a whiteboard) to generate ideas, then bring the best ones back to build.

## The product in one line
**What's Good** is a Cape Town food-discovery web app: tell it your mood/filters and it surfaces either nearby **restaurants** (with deals, directions, wait times) or **recipes to cook at home** — one clean decision instead of doomscrolling delivery apps.

## Who it's for
People in Cape Town who are hungry and indecisive: "I don't know what I want to eat." Two intents:
- **Dine out** → real nearby restaurants, a featured deal, directions, call, delivery options.
- **Cook at home** → a recipe with ingredients + steps, optional grocery deep-links.

## What exists today (working)
- Mood/filter search → restaurant results or recipes.
- **Google Places** integration for real Cape Town restaurants (falls back to a curated list).
- Restaurant detail: hero image, rating, price tier, address, **Get Directions**, click-to-call, estimated wait, **featured deal/voucher**, "Good to know" wellness note, save (heart).
- **Delivery partner** deep-links: Checkers Sixty60, Woolworths Dash, PnP asap! (search-only for now).
- Recipe detail: ingredients (with portion scaling), steps, grocery deep-links.
- "Surprise me" random pick, saved recipes + saved eateries, geolocation distance sorting, dark mode, PWA-installable, Apple-style glass UI.

## Constraints / context
- Stack: Vite + React + TS + Tailwind, deployed on Vercel. Solo/small build cadence with an AI pair.
- Data: Google Places (live) + TheMealDB (recipes) + a hardcoded fallback list.
- South Africa specific: Rand pricing (R/RR/RRR/RRRR), local delivery partners, Cape Town venues.
- Keep it lightweight — no backend/db yet; state is in `localStorage`.

---

## Questions to ideate on (bring answers back)

**1. Core differentiation**
- What makes someone pick this over Uber Eats / Mr D / just Googling? Is it the *deals*, the *mood→decision* flow, the *eat-out-OR-cook* duality, or something else?
- Is the "wellness note" a real hook or noise?

**2. The deal/voucher engine**
- Right now deals are static text. How could real restaurant deals work? (Partner sign-ups, scraped specials, time-based happy-hour, "What's good *right now*"?)
- Redemption: show-screen vs. QR vs. code. What builds trust for the restaurant?

**3. Monetisation**
- Restaurant partnerships? Affiliate on delivery? Featured placement? Freemium for users?
- What's the cheapest first revenue test?

**4. Decision/recommendation UX**
- Should it be a feed, a swipe (Tinder-for-food), a single "here's your answer" card, or a daily pick?
- How much input before it commits to a suggestion? (mood, budget, distance, dietary, group size?)

**5. Retention loops**
- Why does someone open it tomorrow? (Daily "what's good today", new deals, streaks, saved-list reminders, "you saved this 3 days ago — go?")

**6. Data / trust**
- How to keep restaurant info, hours, and deals accurate without manual upkeep?
- Reviews — pull from Google, build own, or skip?

**7. Growth**
- Single-city wedge (Cape Town) → how to dominate before expanding? Campus? Neighbourhood? Office lunch crowd?
- Shareable moments: "send a friend what's good near them."

**8. Scope cut for a sharp v1**
- If we could only keep 3 features, which 3? What gets cut?

---

## Idea parking lot (seeds — expand or kill)
- "What's good **near me right now**" — time + location aware (open now, happy hour live).
- Group mode: everyone votes, app picks the restaurant that fits all budgets/diets.
- Budget slider as the primary input ("I have R150").
- Daily push: one curated "what's good today" pick.
- Loyalty/passport: collect stamps for visiting featured spots.
- Recipe ↔ restaurant bridge: "loved this dish? here's who makes it near you" (the `onFindCorrespondingRestaurants` hook already exists).
- Real deal marketplace: restaurants self-serve post a daily special.

---

## How to bring ideas back to build
For each idea you want to pursue, capture:
1. **One-liner** + which user intent it serves (dine-out / cook / both).
2. **Why now / why us.**
3. **Smallest testable version** (what's the MVP slice?).
4. **What it touches** in the current app (new screen? new data source? change to search flow?).
5. **Effort guess** (S / M / L) and **any new dependency** (API, backend, auth).

Drop those back in this repo (append below or a new `IDEAS_RANKED.md`) and we'll turn the top pick into a build plan.
