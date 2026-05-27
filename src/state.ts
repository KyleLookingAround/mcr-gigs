import type { Gig, ForYou, LastfmState, RoomSize } from "./types";
import type { SortMode } from "./sort";

export interface AppState {
  window: number;
  view: "list" | "map" | "cal";
  monthFilter: string; // "YYYY-MM" or "" for all
  /** Exact-day filter ("YYYY-MM-DD") set from the calendar view; "" for none. */
  dayFilter: string;
  sizes: Set<RoomSize>;
  genres: Set<string>;
  maxPrice: number;
  /** Days of the week to show, 0 = Sun … 6 = Sat. Empty means all days. */
  days: Set<number>;
  /** When true, show only free gigs. */
  freeOnly: boolean;
  sort: SortMode;
  search: string;
  foryou: Set<ForYou>;
  gigs: Gig[];
  saved: Set<string>;
  /** Gig ids shared with the user via a link (session-only, not persisted). */
  sharedSaved: Set<string>;
  /** Followed venue names, lowercased. */
  followedVenues: Set<string>;
  lastfm: LastfmState;
  loading: boolean;
  error: string | null;
  /** Set when some upstream pages failed but others succeeded. */
  partial: boolean;
}

export const state: AppState = {
  window: 14,
  view: "list",
  monthFilter: "",
  dayFilter: "",
  sizes: new Set<RoomSize>(["small", "mid", "large", "unknown"]),
  genres: new Set<string>(),
  maxPrice: 60,
  days: new Set<number>(),
  freeOnly: false,
  sort: "relevance",
  search: "",
  foryou: new Set<ForYou>(),
  gigs: [],
  saved: new Set<string>(),
  sharedSaved: new Set<string>(),
  followedVenues: new Set<string>(),
  lastfm: { user: "", top: new Set(), similar: new Set(), loading: false, error: null },
  loading: false,
  error: null,
  partial: false,
};

/** Max value of the price slider; at this value the price filter is disabled. */
export const PRICE_MAX = 100;
