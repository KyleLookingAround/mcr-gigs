# MCR Gigs

Static gig finder for Manchester. Hits the Skiddle Events API through a Netlify edge function so the API key never reaches the browser.

## Deploy

1. **Get a Skiddle API key.** Free at https://www.skiddle.com/api/join.php — they email it.
2. **Drop this folder into Netlify.** Either:
   - Drag the folder onto https://app.netlify.com (Sites → Add new site → Deploy manually), or
   - `git init && git remote add ... && git push`, then connect the repo on Netlify.
3. **Add the env var.** Site → Site configuration → Environment variables → Add a variable:
   - Key: `SKIDDLE_API_KEY`
   - Value: *(paste your key)*
   - Scopes: leave default (all)
4. **Redeploy.** Deploys → Trigger deploy → Deploy site. Edge functions don't pick up new env vars until next deploy.

That's it. Visit the site URL.

## Files

- `index.html` — the whole UI, vanilla JS, no build step
- `netlify/edge-functions/skiddle.ts` — proxy that injects the API key
- `netlify.toml` — minimal config

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
