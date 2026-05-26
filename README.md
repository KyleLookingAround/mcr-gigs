# MCR Gigs

Static gig finder for Manchester. Hits the Skiddle Events API through a Netlify edge function so the API key never reaches the browser.

Tune it to your taste: connect your **Last.fm** username and gigs by artists you listen to (and artists similar to them) get flagged and floated to the top. Star gigs to save them, group by day or month, and your filters stick between visits — all in the browser, no account needed. Each gig links out to Spotify/YouTube and exports to Google Calendar or an `.ics` file.

## Deploy

1. **Get a Skiddle API key.** Free at https://www.skiddle.com/api/join.php — they email it.
2. **Drop this folder into Netlify.** Either:
   - Drag the folder onto https://app.netlify.com (Sites → Add new site → Deploy manually), or
   - `git init && git remote add ... && git push`, then connect the repo on Netlify.
3. **Add the env var(s).** Site → Site configuration → Environment variables → Add a variable:
   - Key: `SKIDDLE_API_KEY`
   - Value: *(paste your key)*
   - Scopes: leave default (all)
   - *(Optional)* `LASTFM_API_KEY` — enables the Last.fm taste-matching feature. Free at https://www.last.fm/api/account/create. Without it the rest of the site works fine; only the "Connect Last.fm" box is disabled.
4. **Redeploy.** Deploys → Trigger deploy → Deploy site. Edge functions don't pick up new env vars until next deploy.

That's it. Visit the site URL.

## Files

- `index.html` — the whole UI, vanilla JS, no build step
- `netlify/edge-functions/skiddle.ts` — Skiddle proxy that injects `SKIDDLE_API_KEY`
- `netlify/edge-functions/lastfm.ts` — Last.fm proxy that injects `LASTFM_API_KEY`
- `netlify.toml` — minimal config

## Personalization (all client-side)

- **Last.fm matching:** type your username in the *Last.fm* box. The app pulls your top artists (and similar artists for "people like me"), flags matching gigs with a `♪ Your artist` / `≈ Similar to yours` badge, and the *For you* filter lets you show only those. Results are cached in `localStorage` for a day.
- **Saved gigs:** the ☆ on each gig saves it; *For you → ★ Saved* shows your saved list.
- **Sticky preferences:** window, room sizes, genres, max price, grouping and your Last.fm username persist between visits.
- **Browse by rolling window** (next 7/14/30/60 days) **or pick a specific month**, and group results by day or month. Gigs outside the chosen range are trimmed (Skiddle occasionally returns stray past-dated recurring events).
- **Per-gig links:** Spotify & YouTube search, plus Google Calendar / `.ics` export.

## Local dev

```bash
npm i -g netlify-cli
netlify dev
```

`netlify dev` runs the edge function locally and serves the static site. It'll pick up `SKIDDLE_API_KEY` from a local `.env` file or from your linked Netlify site.

## Tweaks

- **Search radius:** change `MCR_CENTRE.radius` in `index.html` (miles).
- **Venue capacity intel:** extend `VENUE_INTEL` in `index.html` — lowercase venue name → capacity.
- **Cache TTL:** edge cache is 5 min (`cache-control` in the edge function); browser cache is 10 min (`CACHE_TTL_MIN`).
