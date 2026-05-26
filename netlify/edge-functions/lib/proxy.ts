// Shared helpers for the Skiddle/Last.fm edge proxies. Lives in a subdirectory
// so Netlify does not register it as its own edge function.

export function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...securityHeaders() },
  });
}

export function securityHeaders(): Record<string, string> {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
}

/** Reject browser cross-origin calls (which would otherwise burn API quota).
 *  Same-origin GETs send no Origin header, so a missing Origin is allowed. */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Keep only allowed params; everything else is dropped before reaching the
 *  upstream. `clamps` caps numeric params at a maximum. */
export function pickParams(
  incoming: URLSearchParams,
  allow: ReadonlySet<string>,
  clamps: Record<string, number> = {},
): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of incoming) {
    if (!allow.has(key)) continue;
    if (key in clamps) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      out.set(key, String(Math.min(n, clamps[key])));
    } else {
      out.set(key, value);
    }
  }
  return out;
}

// Best-effort per-IP rate limit. In-memory and therefore per edge instance, not
// global — it blunts a single abusive client but is not a hard guarantee. For
// strict limits use Netlify's native rate limiting.
const hits = new Map<string, number[]>();

export function rateLimited(request: Request, limit: number, windowMs: number): boolean {
  const ip =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory bound
  return recent.length > limit;
}

export async function forward(target: string, cacheControl: string): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: { Accept: "application/json" } });
  } catch (e) {
    return json({ error: "Upstream fetch failed", detail: String(e) }, 502);
  }
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      ...securityHeaders(),
    },
  });
}
