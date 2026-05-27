import type { Gig } from "./types";

export type SortMode = "relevance" | "price-asc" | "price-desc" | "cap-desc";

export const SORT_MODES: readonly SortMode[] = ["relevance", "price-asc", "price-desc", "cap-desc"];

export function isSortMode(s: string): s is SortMode {
  return (SORT_MODES as readonly string[]).includes(s);
}

/** Saved, then shared-with-you, your-artist, similar, followed venues, rest. */
function priority(g: Gig): number {
  if (g.saved) return 0;
  if (g.shared) return 1;
  if (g.match === "you") return 2;
  if (g.match === "similar") return 3;
  if (g.followedVenue) return 4;
  return 5;
}

function byDoorThenName(a: Gig, b: Gig): number {
  return (a.door || "").localeCompare(b.door || "") || a.name.localeCompare(b.name);
}

/** Compare by price in the given direction; unknown prices always sort last. */
function comparePrice(a: Gig, b: Gig, dir: 1 | -1): number {
  const au = a.price == null;
  const bu = b.price == null;
  if (au && bu) return 0;
  if (au) return 1;
  if (bu) return -1;
  return (a.price! - b.price!) * dir;
}

/** Compare by capacity, largest first; unknown capacities always sort last. */
function compareCapacity(a: Gig, b: Gig): number {
  const au = a.capacity == null;
  const bu = b.capacity == null;
  if (au && bu) return 0;
  if (au) return 1;
  if (bu) return -1;
  return b.capacity! - a.capacity!;
}

/** Comparator for ordering gigs *within* a day group, per the chosen sort. */
export function compareGigs(mode: SortMode): (a: Gig, b: Gig) => number {
  switch (mode) {
    case "price-asc":
      return (a, b) => comparePrice(a, b, 1) || byDoorThenName(a, b);
    case "price-desc":
      return (a, b) => comparePrice(a, b, -1) || byDoorThenName(a, b);
    case "cap-desc":
      return (a, b) => compareCapacity(a, b) || byDoorThenName(a, b);
    default:
      return (a, b) => priority(a) - priority(b) || byDoorThenName(a, b);
  }
}
