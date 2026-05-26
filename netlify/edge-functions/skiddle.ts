// netlify/edge-functions/skiddle.ts
//
// Proxies the Skiddle Events API and injects the API key from a Netlify
// environment variable so it never reaches the browser.
//
// Usage from the client:  fetch("/api/skiddle?latitude=53.48&longitude=-2.24&radius=3&...")
// The api_key param is added server-side. Any other params are forwarded as-is.

export default async (request: Request) => {
  const apiKey = Deno.env.get("SKIDDLE_API_KEY");
  if (!apiKey) {
    return json({ error: "SKIDDLE_API_KEY not set on Netlify" }, 500);
  }

  const incoming = new URL(request.url);
  const params = new URLSearchParams(incoming.search);
  params.set("api_key", apiKey);

  const target = `https://www.skiddle.com/api/v1/events/search/?${params}`;

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
      // Cache 5 minutes at the edge, allow stale for 1 hour while revalidating
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const config = { path: "/api/skiddle" };
