import type { Gig } from "./types";

export interface Digest {
  total: number;
  matches: number;
  /** Lowest known price among the gigs, or null when none are priced. */
  cheapest: number | null;
  freeCount: number;
  /** The busiest day, when there's a clear standout. */
  busiest: { date: string; count: number } | null;
}

/** Summarise a set of (already filtered) gigs for the "your week" line. */
export function buildDigest(gigs: Gig[]): Digest {
  let matches = 0;
  let cheapest: number | null = null;
  let freeCount = 0;
  const perDay = new Map<string, number>();

  for (const g of gigs) {
    if (g.match === "you" || g.match === "similar") matches++;
    if (g.isFree) freeCount++;
    if (g.price != null && (cheapest == null || g.price < cheapest)) cheapest = g.price;
    perDay.set(g.date, (perDay.get(g.date) || 0) + 1);
  }

  let busiest: { date: string; count: number } | null = null;
  for (const [date, count] of perDay) {
    if (!busiest || count > busiest.count) busiest = { date, count };
  }

  return { total: gigs.length, matches, cheapest, freeCount, busiest };
}
