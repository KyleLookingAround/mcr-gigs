import { LASTFM_API, LASTFM_PREFIX, LASTFM_CACHE_TTL_MS } from "../config";
import { normName } from "../matching";

export interface Taste {
  top: Set<string>;
  similar: Set<string>;
}

export function readTasteCache(user: string): Taste | null {
  try {
    const raw = localStorage.getItem(LASTFM_PREFIX + user.toLowerCase());
    if (!raw) return null;
    const { ts, top, similar } = JSON.parse(raw);
    if (Date.now() - ts >= LASTFM_CACHE_TTL_MS) return null;
    return { top: new Set(top), similar: new Set(similar) };
  } catch {
    return null;
  }
}

function writeTasteCache(user: string, t: Taste): void {
  try {
    localStorage.setItem(
      LASTFM_PREFIX + user.toLowerCase(),
      JSON.stringify({ ts: Date.now(), top: [...t.top], similar: [...t.similar] }),
    );
  } catch {
    /* ignore */
  }
}

async function lastfm(params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${LASTFM_API}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from /api/lastfm`);
  const body = await res.json();
  if (body.error) throw new Error(body.message || `Last.fm error ${body.error}`);
  return body;
}

/** Fetch a user's top artists plus artists similar to their top 20, building a
 *  "you" set and a "people like you" set. Network-heavy, so cache the result. */
export async function fetchTaste(user: string): Promise<Taste> {
  const topBody = await lastfm({
    method: "user.gettopartists",
    user,
    period: "overall",
    limit: "100",
  });
  const topArtists = ((topBody.topartists as { artist?: Array<{ name?: string }> })?.artist ?? [])
    .map((a) => a.name)
    .filter((n): n is string => Boolean(n));
  if (topArtists.length === 0) throw new Error("No top artists for that username.");

  const top = new Set(topArtists.map(normName).filter(Boolean));

  const lists = await Promise.all(
    topArtists.slice(0, 20).map(async (name) => {
      try {
        const b = await lastfm({
          method: "artist.getsimilar",
          artist: name,
          autocorrect: "1",
          limit: "8",
        });
        return ((b.similarartists as { artist?: Array<{ name?: string }> })?.artist ?? [])
          .map((a) => a.name)
          .filter((n): n is string => Boolean(n));
      } catch {
        return [];
      }
    }),
  );

  const similar = new Set<string>();
  for (const list of lists) {
    for (const n of list) {
      const nn = normName(n);
      if (nn && !top.has(nn)) similar.add(nn);
    }
  }

  const taste = { top, similar };
  writeTasteCache(user, taste);
  return taste;
}
