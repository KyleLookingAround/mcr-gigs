# MCR Gigs

Static gig finder for Manchester. Hits the Skiddle Events API through a Netlify edge function so the API key never reaches the browser.

Tune it to your taste: connect your **Last.fm** username and gigs by artists you listen to (and artists similar to them) get flagged and floated to the top. Star gigs to save them, and your filters stick between visits — all in the browser, no account needed. Each gig links out to Spotify/YouTube and exports to Google Calendar or an `.ics` file.

Switch to the **Map** view to see venues plotted across central Manchester: markers are colour-coded by taste match and sized by room capacity, with hover labels and a popup of each venue's upcoming gigs. Central rail stations (Piccadilly, Victoria, Oxford Road, Deansgate) are marked too, and each venue shows how far it is from the nearest one. A side list ranks the venues (matches first, then by gig count) — click one to fly straight to it on the map.

## Deploy

1. **Get a Skiddle API key.** Free at https://www.skiddle.com/api/join.php — they email it.
2. **Connect the repo to Netlify.** Netlify reads `netlify.toml`: it runs `npm run build` and publishes `dist/`. Edge functions in `netlify/edge-functions/` are auto-detected.
3. **Add the env var(s).** Site → Site configuration → Environment variables → Add a variable:
   - Key: `SKIDDLE_API_KEY`
   - Value: _(paste your key)_
   - Scopes: leave default (all)
   - _(Optional)_ `LASTFM_API_KEY` — enables the Last.fm taste-matching feature. Free at https://www.last.fm/api/account/create. Without it the rest of the site works fine; only the "Connect Last.fm" box is disabled.
4. **Redeploy.** Deploys → Trigger deploy → Deploy site. Edge functions don't pick up new env vars until next deploy.

That's it. Visit the site URL.

## Layout

- `index.html` — page shell; loads the TypeScript app via Vite
- `src/` — the app, split into modules (`data/`, `render.ts`, `matching.ts`, `dates.ts`, `ics.ts`, `price.ts`, `venues.ts`, `state.ts`, `geo.ts` (distance helpers), `map.ts` (lazy-loaded Leaflet map view), …). Pure logic has `*.test.ts` unit tests next to it.
- `public/` — static assets copied as-is: `favicon.svg`, `manifest.webmanifest`, `sw.js` (offline), `_headers` (CSP + security headers), `robots.txt`, `sitemap.xml`
- `netlify/edge-functions/` — `skiddle.ts` / `lastfm.ts` proxies (shared helpers in `lib/proxy.ts`) that inject API keys, allowlist params, and apply a best-effort rate limit
- `tests-e2e/` — Playwright smoke test against a mocked API
- `netlify.toml`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js` — config

## Personalization (all client-side)

- **Last.fm matching:** type your username in the _Last.fm_ box. The app pulls your top artists (and similar artists for "people like me"), flags matching gigs with a `♪ Your artist` / `≈ Similar to yours` badge, and the _For you_ filter lets you show only those. Matching gigs that weren't around on your last visit also get a `New` badge. Results are cached in `localStorage` for a day.
- **Saved gigs:** the ☆ on each gig saves it; _For you → ★ Saved_ shows your saved list.
- **Day, free and sort controls:** filter to specific days of the week, show only free gigs, and sort each day by relevance, price, or room capacity.
- **Per-act links:** Spotify & YouTube links search the billed artist (not just the event title), so they land on the right page more often.
- **Sticky preferences:** window, room sizes, days, free-only, sort, genres, max price and your Last.fm username persist between visits.
- **Window** (next 7/14/30/60/90/180/365 days) sets how much is fetched from Skiddle; the **Month** chips then filter the loaded gigs down to a single month (one chip per month present, plus _All_). Results are grouped by day. Gigs Skiddle returns outside the window — e.g. stray past-dated recurring events — are trimmed.
- **Per-gig links:** Spotify & YouTube search, plus Google Calendar / `.ics` export.

## Local dev

```bash
npm install
npm run dev          # Vite dev server (UI only; /api/* needs Netlify)
netlify dev          # full stack: runs the edge functions + serves the build
```

Use `netlify dev` (install `netlify-cli` first) to exercise the `/api/*` proxies;
it picks up `SKIDDLE_API_KEY` from a local `.env` file or your linked Netlify site.

## Scripts

```bash
npm run build        # tsc --noEmit && vite build -> dist/
npm test             # vitest unit tests
npm run test:e2e     # playwright smoke test
npm run lint         # eslint
npm run format       # prettier --write
npm run typecheck    # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests, build, and the E2E test on every PR.

## Tweaks

- **Search radius / centre:** `MCR_CENTRE` in `src/config.ts` (miles).
- **Venue capacity intel:** extend `VENUE_INTEL` in `src/venues.ts` (lowercase venue name → capacity). Used only as a fallback behind any capacity Skiddle reports.
- **Cache TTL:** the edge cache (`netlify/edge-functions/*`) and the browser cache (`GIG_CACHE_TTL_MIN` in `src/config.ts`) are both 5 min; keep them in sync.
