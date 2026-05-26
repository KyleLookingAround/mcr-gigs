# MCR Gigs — Production Readiness Plan

A ground-up redesign plan to take the current prototype to something that can be
maintained, trusted, and shipped publicly. Written against the code as it stands
today (single `index.html` + two Netlify edge proxies).

## 1. Where we are

What exists works as a demo: a vanilla-JS static page that pulls Manchester live
events from Skiddle through an edge-function proxy (so the API key stays
server-side), with Last.fm taste-matching, saved gigs, calendar export, and
filters. The architecture instinct is good — static + thin server proxy is the
right shape for this. The problems are that the code is one untested 940-line
file, several headline features are quietly broken, and the proxies are
unprotected.

## 2. Feature triage

### Keep — these are good
- **Edge-function API-key proxy.** Correct pattern; the key never reaches the
  browser. Keep it, just harden it (§4).
- **The visual design.** Distinctive editorial look, fast first paint, no build
  step. Worth preserving the aesthetic and the "loads instantly" feel.
- **Sticky preferences + saved gigs** in `localStorage`. Simple, no account
  needed, genuinely useful.
- **Calendar export** (`.ics` + Google Calendar). Cleanly implemented; the
  day-rollover handling in `plusHours` is a nice touch.
- **Day/month grouping** and **free-text search**.

### Rework — meh, partially works
- **Window vs Month filter overlap.** "Window" (7–365d) refetches from Skiddle;
  "Month" is a client-side filter over what's loaded. Two controls doing
  near-overlapping jobs is confusing. Pick one mental model.
- **Room-size filter** is driven entirely by a hand-maintained `VENUE_INTEL`
  dict (~30 venues, exact lowercased name match). Anything not in the dict is
  `unknown`, names drift, and it goes stale. The filter is only as good as the
  dictionary, which is to say patchy.
- **Genre chips** depend on Skiddle genre data, which is sparse for live events.
- **Price slider semantics.** Null-price gigs always pass the filter, so the
  slider silently doesn't apply to a large share of results.
- **Spotify / YouTube links** are just pre-filled search queries — low value.
- **Caching.** Three overlapping layers (edge 5 min, `localStorage` 10 min, HTTP
  `max-age=300`) with inconsistent TTLs. The footer/README claim "10 min in your
  browser" but the edge sends `max-age=300` (5 min).

### Fix — actually broken
- **Last.fm matching (the headline personalization feature).** Matches artist
  name tokens against the event *name* string only
  (`hay.includes(" " + a + " ")`). It misses support acts, festival/multi-act
  bills, and any event whose title doesn't literally contain the artist; the
  `a.length >= 3` guard drops short names (U2, MØ); no structured artist data is
  used. High false-negative rate — the feature mostly doesn't deliver on its
  promise.
- **Price parsing.** `parseFloat(String(entryprice).replace(/[^0-9.]/g,""))`
  turns a range like `"10-15"` into `1015`, and text like `"Free"` into `null`.
  Wrong prices feed a filter that's already weak.
- **Pagination.** Fully sequential `await` loop, up to 20 round-trips for a
  365-day window, and a single failed page aborts the entire load. Slow and
  fragile.
- **Date header timezone bug.** `fmtDateHeader` uses `new Date(iso)` (parsed as
  UTC) while `nextDay`/`localStamp` use `new Date(iso + "T00:00:00")` (local).
  Latent off-by-one-day for some timezones.
- **Dead code.** `normaliseGig` extracts an `image` field that is never
  rendered.

### Production gaps (cross-cutting)
- **No tests, no CI, no lint/format, no `package.json`.** Nothing stops a
  regression.
- **Unprotected proxies.** `lastfm.ts` forwards *any* method and `skiddle.ts`
  forwards *any* params, both unauthenticated and unthrottled → your API keys
  can be used as an open proxy and your quota burned.
- **No security headers** (CSP, etc.), no rate limiting.
- **No monitoring / error reporting / analytics.**
- **SEO/meta:** no description, Open Graph, or favicon.
- **No offline/PWA** despite being mobile- and cache-oriented.
- **Accessibility:** toggle chips lack `aria-pressed`; limited `focus-visible`.
- **Single data source.** Skiddle misses many DIY/independent venues — a real
  coverage gap for a "Manchester gigs" site.

## 3. Target architecture

Stay lightweight — a heavy SPA framework would be the wrong call for a page this
small. The goal is *structure and safety without losing the fast, no-nonsense
feel.*

- **Build:** Vite + TypeScript. Keep output to static assets so hosting stays
  trivial. This buys modules, type-checking, and a test runner with almost no
  runtime cost.
- **Module split** (replacing the monolith):
  - `state.ts` — app state + persistence
  - `data/skiddle.ts`, `data/lastfm.ts` — fetch + normalise
  - `matching.ts` — taste matching (pure, testable)
  - `ics.ts`, `dates.ts` — calendar + date utils (pure, testable)
  - `render.ts` — DOM rendering
  - `venues.ts` — capacity data as a versioned data file, not inline
  - styles in their own file, design tokens preserved
- **Tests:** Vitest for the pure logic (normalisation, price parsing, matching,
  ics, dates) and Playwright for one golden-path E2E against a mocked API.
- **Quality gates:** ESLint + Prettier + `tsc --noEmit`, run in GitHub Actions
  on every PR alongside a Netlify deploy preview.
- **Data layer:** robust normaliser, bounded *parallel* pagination that tolerates
  partial failure (return what loaded + a soft warning). Treat venue capacity as
  *enrichment* layered on top of any capacity Skiddle returns, not the sole
  signal.
- **Matching v2:** match against structured artist data first (investigate
  Skiddle's per-event `artists`/lineup fields), fall back to name tokens; better
  normalisation; configurable threshold; drop the blunt `length >= 3` rule.
- **Hardened edge functions:** method/param allowlist, response-size cap, simple
  per-IP rate limit, lock CORS to the site origin, consistent cache headers.
- **Observability:** privacy-respecting analytics, lightweight client error
  reporting, structured logs in the edge functions.

## 4. Phased roadmap

Each phase is independently shippable and ordered so the riskiest-but-cheapest
wins come first.

**Phase 0 — Foundation (no behaviour change).**
Add `package.json`, Vite, TypeScript, ESLint/Prettier, split the monolith into
modules, stand up Vitest + Playwright and GitHub Actions CI. Establishes the
safety net before anything else moves.

**Phase 1 — Fix what's broken.**
Price parsing (handle ranges, "Free", "from £x"), date timezone consistency,
matching v2, resilient parallel pagination, remove or actually render the
`image` field, reconcile the cache TTLs and the docs that describe them. Each
fix lands with a test.

**Phase 2 — Harden the infrastructure.**
Edge-proxy allowlists + rate limit + security/CORS headers, a single coherent
caching strategy, and error monitoring. Closes the API-key-abuse and
silent-failure risks.

**Phase 3 — Rework the meh features.**
Unify the window/month UX into one model, settle the capacity-data strategy,
fix price-filter semantics (decide how null-price gigs behave and say so in the
UI), prune the low-value Spotify/YouTube search links or replace them with real
deep links.

**Phase 4 — Production polish.**
SEO/Open Graph/favicon, PWA + offline, an accessibility pass (`aria-pressed`,
focus-visible, contrast audit), a performance budget, and — if coverage is the
priority — a second data source (Songkick/Bandsintown/RA) behind the same
normaliser.

## 5. Suggested first PR

Phase 0 + the three cheapest Phase 1 bug fixes (price parsing, date timezone,
dead `image` code), each with a unit test. Small, reviewable, no visible
behaviour change except correct prices — and it proves the new test harness
catches regressions.
