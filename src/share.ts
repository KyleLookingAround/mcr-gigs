import type { RoomSize, ForYou } from "./types";
import { isSortMode, type SortMode } from "./sort";

const ALL_SIZES: RoomSize[] = ["small", "mid", "large", "unknown"];
const FORYOU: ForYou[] = ["saved", "you", "similar", "venue"];

/** The slice of app state that a share link carries. All optional: a missing
 *  field means "leave the recipient's value alone". */
export interface ShareState {
  window?: number;
  days?: number[];
  sizes?: RoomSize[];
  genres?: string[];
  maxPrice?: number;
  freeOnly?: boolean;
  sort?: SortMode;
  month?: string;
  foryou?: ForYou[];
  search?: string;
  saved?: string[];
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Build the URL hash fragment (without the leading '#') for a shared view.
 *  Only non-default values are included, to keep links short. */
export function serializeShare(s: ShareState): string {
  const p = new URLSearchParams();
  if (s.window != null) p.set("w", String(s.window));
  if (s.days && s.days.length) p.set("days", uniq(s.days).join(","));
  // Only encode sizes when they differ from "all selected".
  if (s.sizes && s.sizes.length && s.sizes.length < ALL_SIZES.length)
    p.set("size", uniq(s.sizes).join(","));
  if (s.genres && s.genres.length) p.set("g", uniq(s.genres).join(","));
  if (s.maxPrice != null) p.set("price", String(s.maxPrice));
  if (s.freeOnly) p.set("free", "1");
  if (s.sort && s.sort !== "relevance") p.set("sort", s.sort);
  if (s.month) p.set("month", s.month);
  if (s.foryou && s.foryou.length) p.set("fy", uniq(s.foryou).join(","));
  if (s.search && s.search.trim()) p.set("q", s.search.trim());
  if (s.saved && s.saved.length) p.set("sv", uniq(s.saved).join(","));
  return p.toString();
}

function splitList(v: string | null): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

/** Parse a hash fragment back into a (validated) ShareState. Unknown or
 *  malformed values are dropped rather than throwing. */
export function parseShare(hash: string): ShareState {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const out: ShareState = {};

  const w = Number(p.get("w"));
  if (Number.isFinite(w) && w > 0) out.window = w;

  const days = splitList(p.get("days"))
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (days.length) out.days = uniq(days);

  const sizes = splitList(p.get("size")).filter((x): x is RoomSize =>
    (ALL_SIZES as string[]).includes(x),
  );
  if (sizes.length) out.sizes = uniq(sizes);

  const genres = splitList(p.get("g"));
  if (genres.length) out.genres = uniq(genres);

  if (p.has("price")) {
    const price = Number(p.get("price"));
    if (Number.isFinite(price) && price >= 0) out.maxPrice = price;
  }

  if (p.get("free") === "1") out.freeOnly = true;

  const sort = p.get("sort");
  if (sort && isSortMode(sort)) out.sort = sort;

  const month = p.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) out.month = month;

  const fy = splitList(p.get("fy")).filter((x): x is ForYou => (FORYOU as string[]).includes(x));
  if (fy.length) out.foryou = uniq(fy);

  const q = p.get("q");
  if (q) out.search = q;

  const sv = splitList(p.get("sv"));
  if (sv.length) out.saved = uniq(sv);

  return out;
}
