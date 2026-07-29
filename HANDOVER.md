# HANDOVER

## Status

**`claude/codebase-analysis-priorities-h4cvnv` is at `16aaf6b`, pushed.** Working tree
clean, no dev server running. Not merged to `main`; no PR opened (none was asked for).

**Every commit on this branch IS signed. Do not "fix" the signing setup.** `git cat-file
-p <sha>` shows a `gpgsig -----BEGIN SSH SIGNATURE-----` header on all of them, back
through `1b0a618`. Signing is done by the harness's own managed signer:
`/root/.gitconfig` sets `gpg.ssh.program=/tmp/code-sign`, a symlink to
`/opt/env-runner/environment-manager`. The `user.signingkey` it points at
(`/home/claude/.ssh/commit_signing_key.pub`) is a 0-byte file, which looks broken and is
not — the managed signer does not read it.

**Two things mislead on this, and both cost a session turn:** `git log --format=%G?`
prints **N**, and a stop hook reports "missing signature". Both are reading local
*verification*, which cannot work because `gpg.ssh.allowedSignersFile` is unset — an
absent verifier, not an absent signature. Author and committer are already
`Claude <noreply@anthropic.com>`, so `--reset-author` is a no-op that only rewrites
hashes. **Never amend or rebase pushed commits over this.** Whether GitHub renders
"Verified" additionally requires the signer's public key to be registered on the account;
that is not checkable from this container and has not been checked.

`verify/checks.mjs` **46/46, 0 skipped, exit 0** on chromium (43 before this session; the
three new ones are the venue-action checks below). `npx tsc --noEmit` **exit 0 — it
completed this time**, in contrast to the usual local timeout. `npx vite build` exit 0.
`driver.mjs` 6/6 views light and dark, 0 unreachable, 0 console errors.

**`VITE_GOOGLE_PLACES_KEY` in Vercel — still CONTESTED, do not repeat either claim as
fact.** An earlier handover asserted flatly that the key was unset; a later session
reported having loaded the production URL, filtered 30 → 25 results and opened a venue
page with real hours. Neither is checkable from this container — **every outbound URL
403s here** (§6). Resolve it by opening the deployed Find tab on a real device, then
write down the answer *and how it was obtained*.

**No iOS run has yet executed against `b6027f9`'s geolocation fix.** Unchanged from the
previous handover: every iOS capture (runs 4–7) showed Safari's location prompt covering
the app, and two "different tabs" were byte-identical. The fix is in; it has never run.

## Objective

Act on a user-supplied codebase analysis. Three passes: the labels that promise more than
the data supports (committed); the search lifecycle (PROTECTED — do not
reopen); and the venue-page decision layer plus contextual recovery.

## What changed

**1. The Call pillar is gated on a real number.** `EateryView.tsx` rendered it
unconditionally, so a venue with no published phone got `href="tel:"` and
`aria-label="Call "` — an action that cannot act, with an empty accessible name. The
mobile CTA bar 280 lines below was already gated correctly; only the pillar was not.

**2. A Google Maps search URL is no longer labelled "Official website".**
`placesService.ts` falls back to `google.com/maps/search/<name>` when Places publishes no
`websiteUri` — a fair destination, but not the venue's site. It was labelled "Official
website" and "See the full menu and photos". `Venue.hasOwnWebsite` is now set only when
Places returned a site, and both render sites branch on it: the action reads
**Website / "See the full menu and photos"** with a real site and **Maps / "Open in
Google Maps"** without one. Venues saved to localStorage before the field existed read
the destination URL instead, since defaulting them to "no site" would mislabel a real one.

**3. The fixture can now express absence.** `verify/fixtures/places.mjs`'s `place()`
defaulted a phone and a website onto every venue, so both branches above were unreachable
from the suite. It honours `null` as "Places published no such field", and **`pl-6`
Hoxton Steam Buns** is the thin listing Places returns constantly — an address and
nothing else. Three new checks ride on it.

**4. HANDOVER.md's commit hash is stamped, not typed.** `verify/handover-commit.mjs`
with `--stamp` and `--check`; `npm run handover:stamp` / `handover:check`. CI runs
`--check` (and now checks out full history, which the ancestry test needs). It **fails**
when the named commit does not exist or is not an ancestor of HEAD, and **warns** when
code landed after it — a passing rule cannot demand the handover name the commit that
carries it. `--strict` fails on that too, for a pre-push gate. CLAUDE.md §10 documents it.

**5. Search lifecycle (`App.tsx`, `placesService.ts`). PROTECTED: do not
refactor, retest or reopen.** A generation counter (`searchRunIdRef`) gates every state
write after an `await`, so a slow response cannot land on top of a newer one; the
superseded run's `AbortController` fires, which stops stale results arriving and stops
work that has not yet been sent — **it does not prevent billing for requests already
dispatched**. `searchTextShared` gives identical concurrent queries one shared request,
refcounted so the last caller's release cancels it; the entry is dropped on settle, so it
is **not a cache**. `fetchVenues` returns `ok | unconfigured | denied | quota | http |
network | aborted` instead of `[]`, each mapped to its own notice with `canRetry` false
where retrying provably cannot help. 300ms debounce on the filter effect. Both Places
queries kept deliberately.

**6. The venue page answers "why this one" (`EateryView.tsx`, `App.tsx`).**
`buildFitReasons` assembles the decision layer from confirmed fields and the user's own
filters only: cuisine claimed **only when Places' type data corroborates the filter**,
price band only on exact tier equality, open/closed against `undefined`, real distance,
Google's rating. A `Found by searching "…"` line states how the venue was found, because
the mood filter reaches Google but nothing comes back saying the room is cosy. No reason
survives, no section renders. `intent` is not passed on the saved tabs, where the filters
on screen are not the ones that found the venue.

Mobile reading order fixed: the container is a flex column below `lg` with `order-1/2`,
so the reasons precede the action pillars — the page used to ask you to call before it
told you why. Desktop is untouched: both children are placed explicitly by column and
row, which ignores source order. The address moved into the main column as identity
rather than an action. Saved state now says "Saved" in words and carries `aria-pressed`.

**7. Contextual no-results recovery (`App.tsx`).** `activeConstraints`
derives the filters currently narrowing the search; a zero-result screen names each one
and drops it in a tap, rather than "nothing matched that combination", which never said
which part to relax. Empty constraint list still shows the opening invitation, which is
how "narrowed too far" stays distinct from "has not asked for anything yet".

## Customer journey impact

**Trust**, and **Act**. A label that overclaims its destination is the same category of
failure as an invented fact — it is just cheaper to miss, because tapping is what
disproves it. A dead Call button is an Act-stage promise the page cannot keep. Nothing
else moved; no stage regressed.

## Verification and actual results

| What | Command | Actual result |
|---|---|---|
| Regression suite | `NO_PROXY='*' node checks.mjs` | **46/46, 0 skipped, exit 0** |
| The three new checks, **red first** | same suite, `src/` stashed | **43/46 — 1 tel: link, "Official website" present, no Maps wording** |
| Handover check catches real drift | `--check` before the fix | **⚠ named `b6027f9`, 1 later commit changed code** |
| Handover check, bogus hash | hash edited to `deadbee` | **exit 1** |
| Handover check, `--strict` | `--check --strict` | **exit 1** |
| Typecheck | `npx tsc --noEmit` | **exit 0, completed** |
| Build | `npx vite build` | **exit 0** (`BUILD_EXIT` read directly, not through a pipe) |
| Views rendered | `driver.mjs`, `--dark` | **6/6 each, 0 unreachable, 0 console errors** |
| Phoneless venue, **looked at** | scratch script → PNG, light + dark | **DIRECTIONS + MAPS only, no Call; "Open in Google Maps" renders** |

**Not checked, in those words** (CLAUDE.md §13.2): the labels were verified in headless
Chromium at 390px, which says **nothing about iOS Safari**. `hasOwnWebsite` on legacy
saved items was reasoned about and unit-tested by nothing — the URL-shape fallback has no
check because the fixture cannot produce a pre-migration localStorage entry. And no
machine can fail the rule this change is really about — "never state a venue fact you
were not told"; the three new checks cover these two labels only.

**Passes 5–7 — verified:** `npm run lint` **exit 0**, `npm run build`
**exit 0**, `checks.mjs` **46/46, 0 skipped, exit 0**, `driver.mjs` 6/6 light and dark.
Screenshots read, not just written: venue page unfiltered (two reasons, no invented
filter match), venue page with a cuisine filter (three reasons + the "Found by searching"
line), and the recovery screen in **both** light and dark.

**Passes 5–7 — NOT verified, in those words:** no iOS Safari, as always. The
dedup and abort paths have **never been observed firing** — no check exercises two
concurrent identical searches, and the suite passing only shows the normal path still
works. The four new failure notices have **never rendered**; nothing in the fixture
returns a 401, 429 or a torn connection. Landscape and 1440 were covered by `checks.mjs`
geometry but the new sections were **not looked at** at those sizes. Saved-tab venue
pages were not opened, so the `intent === undefined` path is reasoned, not seen.

## Protected decisions

- **The search lifecycle is protected by explicit instruction** — abort, debounce,
  dedup and typed failures are not to be refactored, retested or reopened unless a
  change cannot function without it.
- **Never say cancellation prevents billing.** It prevents stale results and stops work
  not yet sent. A dispatched request is already billable.
- **A venue "reason" must name a real field or a user's own filter.** Cuisine is claimed
  only when Places' type data corroborates the filter; the mood term is reported as how
  the venue was *found*, never as what it feels like inside.
- **`hasOwnWebsite` is authoritative when present, inferred only when absent.** A venue
  could legitimately publish a Maps link as its own site; the flag must win over the
  URL-shape guess.
- **The fixture's `null` means "Places published no such field".** Distinct from an
  omitted option. Do not "simplify" it back to `??` defaults — that is what made both
  branches untestable.
- **The handover check warns, not fails, on later code commits.** Failing would make CI
  red on every code push until a second commit landed. Deliberate; `--strict` exists.
- Carried forward: `browser.mjs` never falls back (exit 3); declare font faces by hand;
  `font-display: optional` + preload together; `/fonts/*` immutable with stable
  filenames; `.safe-x` composes and never replaces; iOS CI does not `cancel-in-progress`;
  say "WebKit" / "iOS Simulator", never "iPhone"; no `openNow` ratchet; never a bare
  `npx vite`; §7 is decided; never state a check count from prose.

## Next session: first three actions

1. **Push `16aaf6b` and the handover commit, or decide not to.** Both are local only;
   the container is ephemeral, so unpushed work is lost when it is reclaimed. Ask first
   (§4) — the last session was told to commit, and only to commit.
2. **Add fixture coverage for the failure notices and the dedup path** — a route that
   answers 401, 429 and a connection reset, and one that fires two identical searches
   concurrently. Four notices and a refcounted shared request currently have no check
   that can fail. This is the largest verification gap in the tree.
3. **Trigger `ios-safari.yml` and read the PNGs** — `md5sum` the four light tabs first;
   if any two match, the tabs are still not navigating and a green tick means nothing.

## Known risks and open questions

- **The venue enrichment model is undefined and is the actual product gap.** The analysis
  is right that the page is thin, but the framing "the fields are intentionally empty"
  understates why: they were filled with strings built from the venue's own name, and
  deleting that was correct. The gap is a missing *source*, not a missing permission.
  **The cheapest truthful source is already available and unused:** the Places field mask
  in `placesService.ts` does not request `editorialSummary`, `reviews`, or the attribute
  booleans (`servesVegetarianFood`, `outdoorSeating`, `goodForGroups`, `servesBreakfast`).
  Those are venue-specific, sourced, and would need no invention. Decide the content model
  before writing render code.
- **Directions and Maps are near-neighbours on a phoneless venue.** Both go to Google,
  one to turn-by-turn and one to the listing. Defensible — they answer different
  questions — but it is two of three actions pointing at the same app. Product call, not
  made.
- **CLAUDE.md is 668 lines** and the analysis is right that it costs context every
  session. It was **not** split this session: most of the bulk is §13's ledger and the
  trap list, which is the part that has actually prevented regressions, and splitting it
  wrong would strand the reason each rule exists. If it is split, move the incident
  detail to a referenced file and delete none of it.
- **The venue hero has no photo fallback** — a flat pink→black gradient over most of the
  first screen. Seen again this session in the `pl-6` capture, which has no real photo:
  name, address and both actions are present and correct on first paint, on that slab.
- **`ci/ios-shots` is force-pushed and orphaned every run.** Never put anything there you
  want to keep.
- **Hex ratchet is 71**, unchanged this session.
- **`1,5 large, diced Onion`** — scaling discrete items yields fractional counts.
  Pre-existing, never in scope. Worth a product decision.
