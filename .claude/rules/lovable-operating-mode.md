# Lovable operating mode — how to BUILD here (binding, read before every build)

Purpose: close the gap between how Lovable builds and how a general coding agent builds.
This is the operating contract for What's Good. It is modelled on what Lovable actually
does — a persistent Knowledge layer injected before every build, wrapped around an
autonomous *plan → edit → run → feed errors back → loop until usable → show it live* cycle
(Lovable Knowledge docs; AI-builder architecture teardowns). It is binding like
`product-principles.md` and `coding-principles.md`, and where a habit of "ship correct-but-
thin" conflicts with it, this file wins.

## The gap this fixes
Lovable never hands back a thin, empty, or unfinished-looking screen, and never hands back
an explanation in place of a built thing. A general agent will, because it optimises for
"a true, surgical change" over "a full, usable product." Here, optimise for BOTH: correct
AND full, every time.

## The contract

1. **Build to a usable, FULL state before handing back — loop, don't stop early.**
   Plan → edit → build/run → look at the result → fix the gaps → repeat, in ONE pass, until
   the first screen is market-ready (real content, no empty plates, no "2 places", no
   stranded loading state). A known-thin result is not "done"; it is the middle of the loop.
   Mirrors Lovable's run-and-feed-errors-back loop.

2. **Lead with the built thing, shown live — not an explanation.**
   Ship to `main` → Vercel, confirm it live, and open with the working result + the URL.
   No option-menus, no "want me to…?" when the next step is obvious. Do the obvious next
   step and show it. Explanations come after the result, short, and only if they add.

3. **Default to FULL of real content.** A finder is never a two-card or empty screen. Seed
   and populate real venues so every occasion and the landing are full of real local places
   on first paint. Absent/placeholder only where the truth requires it (§8/§2B of CLAUDE.md
   still bind — real fields only — but "sparse because honest" is a failure to populate,
   not a virtue).

4. **Standing knowledge is already loaded — do not re-ask what is decided.**
   CLAUDE.md, `product-principles.md`, `coding-principles.md`, §7 design direction and the
   amended §14.3 are the Knowledge layer. Read them, build to them, evolve them on purpose —
   never re-litigate them back to the user as questions.

5. **Self-correct after shipping, in the same turn.** After deploy, verify live (honesty
   contract / verify-guard still bind) and fix what is thin or broken rather than reporting
   it as a known gap for "next time". Reporting a gap you could have closed this pass is the
   exact Claude-Code-vs-Lovable gap this file exists to kill.

6. **Speed is a feature.** Batch independent work, take the decisive path, and do not spend
   the user's clock narrating. Fewer words, more shipped product.

## What this does NOT override
The safety, honesty (§2C) and reality (§2B) laws in CLAUDE.md, and the time/usage budget.
Lovable mode means build full and fast and show it — never fabricate a result, never claim
unverified, never ship an unfalsifiable control. Full AND true.

## 7. The stranger pass — FIRST, every session, before any other work (added 2026-10-08, owner's instruction)

Earned by: the owner asked to "make it go live"; the session answered privacy questions, then
found within ten minutes that "More occasions" had never hidden anything, the answer sat
~3,700px down a phone, and the landing led with four branches of one sandwich chain — all
visible to anyone who opened the app, all there for weeks, none caught by any check.

1. **Before touching anything else, open the app at 390×844 the way a stranger would** — with
   real city data (set the timezone, e.g. `Africa/Johannesburg`) — screenshot it, READ the
   screenshot, tap the lead occasion, and write down the worst three things a person would
   notice, worst first.
2. **Fix the worst one in this session, ship it to `main`, confirm the Vercel deploy READY.**
   Then the next. Process, docs, checks and handovers come AFTER the visible product.
3. **Never end a reply with a list of known first-impression problems you could have fixed.**
   If time runs out, the list is the FIRST line of the reply, with what stopped you — never a
   closing "want me to do X next?".
4. **A green suite is not a look.** If the suite and the screenshot disagree, the screenshot wins.
