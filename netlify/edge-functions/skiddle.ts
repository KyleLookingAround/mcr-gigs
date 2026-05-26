// Proxies the Skiddle Events API and injects SKIDDLE_API_KEY server-side so it
// never reaches the browser. Only an allowlist of search params is forwarded.

import { json, forward, originAllowed, pickParams, rateLimited } from "./lib/proxy.ts";

const ALLOWED = new Set([
  "latitude",
  "longitude",
  "radius",
  "eventcode",
  "minDate",
  "maxDate",
  "description",
  "order",
  "limit",
  "offset",
  "keyword",
]);
const CLAMPS = { limit: 100, offset: 5000, radius: 30 };

export default async (request: Request): Promise<Response> => {
  if (!originAllowed(request)) return json({ error: "Forbidden origin" }, 403);
  if (rateLimited(request, 60, 60_000)) return json({ error: "Rate limited" }, 429);

  const apiKey = Deno.env.get("SKIDDLE_API_KEY");
  if (!apiKey) return json({ error: "SKIDDLE_API_KEY not set on Netlify" }, 500);

  const incoming = new URL(request.url);
  const params = pickParams(incoming.searchParams, ALLOWED, CLAMPS);
  params.set("api_key", apiKey);

  return forward(
    `https://www.skiddle.com/api/v1/events/search/?${params}`,
    "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
  );
};

export const config = { path: "/api/skiddle" };
