// Proxies the Last.fm API and injects LASTFM_API_KEY server-side. Only the two
// read methods the app actually uses are permitted.

import { json, forward, originAllowed, pickParams, rateLimited } from "./lib/proxy.ts";

const ALLOWED_METHODS = new Set(["user.gettopartists", "artist.getsimilar"]);
const ALLOWED = new Set(["method", "user", "artist", "period", "limit", "autocorrect"]);
const CLAMPS = { limit: 100 };

export default async (request: Request): Promise<Response> => {
  if (!originAllowed(request)) return json({ error: "Forbidden origin" }, 403);
  if (rateLimited(request, 120, 60_000)) return json({ error: "Rate limited" }, 429);

  const apiKey = Deno.env.get("LASTFM_API_KEY");
  if (!apiKey) return json({ error: "LASTFM_API_KEY not set on Netlify" }, 500);

  const incoming = new URL(request.url);
  const method = incoming.searchParams.get("method") || "";
  if (!ALLOWED_METHODS.has(method)) return json({ error: "Unsupported method" }, 400);

  const params = pickParams(incoming.searchParams, ALLOWED, CLAMPS);
  params.set("api_key", apiKey);
  params.set("format", "json");

  return forward(
    `https://ws.audioscrobbler.com/2.0/?${params}`,
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  );
};

export const config = { path: "/api/lastfm" };
