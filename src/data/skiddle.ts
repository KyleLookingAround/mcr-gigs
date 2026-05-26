import type { Gig, SkiddleEvent } from "../types";
import {
  SKIDDLE_API,
  MCR_CENTRE,
  PAGE_LIMIT,
  MAX_EVENTS,
  FETCH_CONCURRENCY,
  GIG_CACHE_TTL_MIN,
  CACHE_PREFIX,
} from "../config";
import { dateRange } from "../dates";
import { normaliseGig } from "../normalise";

export interface FetchResult {
  gigs: Gig[];
  /** True when at least one upstream page failed but others succeeded. */
  partial: boolean;
}

function cacheKey(windowDays: number): string {
  return `${CACHE_PREFIX}${windowDays}`;
}

export function readCache(windowDays: number): Gig[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(windowDays));
    if (!raw) return null;
    const { ts, gigs } = JSON.parse(raw);
    if (Date.now() - ts > GIG_CACHE_TTL_MIN * 60 * 1000) return null;
    return gigs as Gig[];
  } catch {
    return null;
  }
}

export function writeCache(windowDays: number, gigs: Gig[]): void {
  try {
    localStorage.setItem(cacheKey(windowDays), JSON.stringify({ ts: Date.now(), gigs }));
  } catch {
    /* storage full / disabled */
  }
}

function buildParams(minDate: string, maxDate: string, offset: number): URLSearchParams {
  return new URLSearchParams({
    latitude: String(MCR_CENTRE.lat),
    longitude: String(MCR_CENTRE.lng),
    radius: String(MCR_CENTRE.radius),
    eventcode: "LIVE",
    minDate,
    maxDate,
    description: "1",
    order: "date",
    limit: String(PAGE_LIMIT),
    offset: String(offset),
  });
}

async function fetchPage(
  minDate: string,
  maxDate: string,
  offset: number,
): Promise<{ results: SkiddleEvent[]; total: number | null }> {
  const res = await fetch(`${SKIDDLE_API}?${buildParams(minDate, maxDate, offset)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from /api/skiddle`);
  const body = await res.json();
  if (body && body.error) throw new Error(String(body.error));
  const total = body?.totalcount != null ? Number(body.totalcount) : null;
  return { results: body?.results ?? [], total: Number.isFinite(total) ? total : null };
}

/** Run async tasks with bounded concurrency, never rejecting; returns the
 *  settled outcome of each so callers can tolerate partial failure. */
async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return out;
}

export async function fetchAllGigs(windowDays: number): Promise<FetchResult> {
  const { minDate, maxDate } = dateRange(windowDays);
  const raw: SkiddleEvent[] = [];
  let partial = false;

  // First page (also tells us the total) — a failure here is fatal.
  const first = await fetchPage(minDate, maxDate, 0);
  raw.push(...first.results);

  // Decide how many more pages to pull. Prefer the reported total; otherwise
  // page until a short page comes back.
  const cap = Math.min(MAX_EVENTS, first.total ?? MAX_EVENTS);
  if (first.results.length === PAGE_LIMIT && raw.length < cap) {
    const offsets: number[] = [];
    for (let o = PAGE_LIMIT; o < cap; o += PAGE_LIMIT) offsets.push(o);

    const settled = await runPool(
      offsets.map((o) => () => fetchPage(minDate, maxDate, o)),
      FETCH_CONCURRENCY,
    );
    for (const r of settled) {
      if (r.status === "fulfilled") raw.push(...r.value.results);
      else partial = true;
    }
  }

  // Skiddle occasionally returns events outside the requested window (stray
  // recurring classes); trim to range and de-duplicate by id.
  const seen = new Set<string>();
  const gigs: Gig[] = [];
  for (const ev of raw) {
    const g = normaliseGig(ev);
    if (!g.date || g.date < minDate || g.date > maxDate) continue;
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    gigs.push(g);
  }
  return { gigs, partial };
}
