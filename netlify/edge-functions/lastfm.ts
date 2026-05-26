// netlify/edge-functions/lastfm.ts
//
// Proxies the Last.fm API and injects the API key from a Netlify environment
// variable so it never reaches the browser. Mirrors skiddle.ts.
//
// Usage from the client:
//   /api/lastfm?method=user.gettopartists&user=NAME&period=overall&limit=100
//   /api/lastfm?method=artist.getsimilar&artist=NAME&autocorrect=1&limit=8
// The api_key and format=json params are added server-side.

export default async (request: Request) => {
  const apiKey = Deno.env.get("LASTFM_API_KEY");
  if (!apiKey) {
    return json({ error: "LASTFM_API_KEY not set on Netlify" }, 500);
  }

  const incoming = new URL(request.url);
  const params = new URLSearchParams(incoming.search);
  params.set("api_key", apiKey);
  params.set("format", "json");

  const target = `https://ws.audioscrobbler.com/2.0/?${params}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "Accept": "application/json" },
    });
  } catch (e) {
    return json({ error: "Upstream fetch failed", detail: String(e) }, 502);
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Taste data changes slowly: cache 1 hour at the edge, stale for a day.
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const config = { path: "/api/lastfm" };
