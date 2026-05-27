# CLAUDE.md

Guidance for working in this repo. Keep it current as the architecture changes.

## What this is

A static gig finder for Manchester. Vanilla TypeScript + Vite, no UI framework.
It fetches live events from the **Skiddle** API and **Last.fm** taste data through
two **Netlify edge functions** that inject the API keys server-side, so keys never
reach the browser. Output is plain static assets; hosting stays trivial.

Keep it lightweight. A heavy SPA framework would be the wrong call for a page this
small — the value is fast first paint and no build ceremony.

## Commands

```bash
npm run dev          # Vite dev server (UI only; /api/* needs Netlify)
netlify dev          # full stack incl. the edge-function proxies
npm run build        # tsc --noEmit && vite build -> dist/
npm test             # vitest unit tests
npm run test:e2e     # playwright smoke test (needs browsers: npx playwright install)
npm run lint         # eslint
npm run format       # prettier --write
npm run typecheck    # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests,
build, and the E2E test on every PR. Run these before pushing.

## Architecture

Data flows: edge proxy → `data/*` fetch+normalise → `state` → `render`/`map`.

- `src/main.ts` — entry point: binds DOM events, owns the load/connect flows,
  registers the service worker.
- `src/state.ts` — the single mutable `state` object + `PRICE_MAX`.
- `src/prefs.ts` — load/save sticky prefs and the saved-gig set in `localStorage`.
- `src/data/skiddle.ts` — bounded **parallel** pagination that tolerates partial
  failure (returns what loaded + a `partial` flag), plus the browser gig cache.
- `src/data/lastfm.ts` — top artists + similar artists, cached a day.
- `src/normalise.ts` — raw `SkiddleEvent` → `Gig`. The one place upstream shape is
  trusted; everything downstream uses `Gig`.
- `src/matching.ts` — pure taste matching against structured lineup + title (+
  description for your own artists). No DOM.
- `src/render.ts` — list rendering, filtering (`filteredGigs`), grouping, chips.
- `src/map.ts` — lazy-loaded Leaflet map view (separate chunk; don't import it
  eagerly from `render.ts` — use the `setAfterRender` hook instead).
- `src/sort.ts`, `src/dates.ts`, `src/geo.ts`, `src/price.ts`, `src/ics.ts` — pure
  helpers, each with `*.test.ts` next to it.
- `src/seen.ts` — tracks gig ids seen on previous visits for the "New" badge.
- `src/venues.ts` — hand-curated venue capacities (fallback behind any capacity
  Skiddle reports). `src/stations.ts` — central rail stations for map distances.
- `netlify/edge-functions/` — `skiddle.ts` / `lastfm.ts` proxies (shared
  `lib/proxy.ts`): inject keys, allowlist params/methods, rate-limit, set cache
  headers.
- `public/` — static assets copied as-is (`sw.js`, `_headers` CSP, manifest, etc).
- `tests-e2e/smoke.spec.ts` — Playwright against a **mocked** `/api/skiddle`.

## Conventions

- **Pure logic is tested; DOM code isn't.** When you add logic, put it in a pure
  module with a `*.test.ts`, not inline in `render.ts`/`map.ts`.
- **Persisted prefs:** add the field to `Prefs` (types.ts), `state.ts`, and both
  load and save in `prefs.ts`. Bump the relevant `*_KEY`/`CACHE_PREFIX` in
  `config.ts` only if the stored shape changes incompatibly.
- **Escape everything rendered via `innerHTML`** with `escapeHtml` from `dom.ts`.
  Event listeners are delegated (containers persist across re-renders); per-item
  actions use `data-action`/`data-id`.
- **Chips** toggle visual + `aria-pressed` together via `setPressed`. Keep the
  accessibility parity (aria-pressed, labels, focus-visible).
- **Filter rows** are a 2-col grid: a leading `.filter-label` + a `.row-body`
  flex-wrap container holding the controls. Put chips/inputs inside `.row-body`
  so wrapped items align under the group, not under the label.
- **Dates** are ISO `YYYY-MM-DD` parsed at _local_ midnight via `parseLocalDate` —
  never `new Date(iso)` (UTC shift bug). Use the `dates.ts` helpers.

## Gotchas

- **Cache TTLs must stay in sync:** `GIG_CACHE_TTL_MIN` (config.ts, browser) and
  the edge `cache-control` in `netlify/edge-functions/skiddle.ts` are both 5 min.
  The footer/README also state this — update all three together.
- **Leaflet positions markers with an inline `transform`.** Don't put `transform`
  on a marker's root element (it'll clobber placement) — rotate a child/pseudo-
  element instead (see `.station-pin::before`).
- **E2E "Free" collision:** the price label and the "Free only" chip both contain
  "Free"; scope assertions (e.g. to `.gig-price`) to avoid strict-mode matches.
- **First-visit "New" badges:** `seen.ts` flags nothing on a user's first visit
  (no prior record); the baseline is held constant for the session so badges
  don't vanish mid-session.

## Tuning

- Search radius/centre: `MCR_CENTRE` in `config.ts`.
- Venue capacities: extend `VENUE_INTEL` in `venues.ts` (lowercased name → cap).
- Rail stations on the map: `STATIONS` in `stations.ts`.
