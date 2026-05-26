import type { Gig, ForYou, LastfmState, RoomSize } from "./types";

export interface AppState {
  window: number;
  monthFilter: string; // "YYYY-MM" or "" for all
  sizes: Set<RoomSize>;
  genres: Set<string>;
  maxPrice: number;
  search: string;
  foryou: Set<ForYou>;
  gigs: Gig[];
  saved: Set<string>;
  lastfm: LastfmState;
  loading: boolean;
  error: string | null;
  /** Set when some upstream pages failed but others succeeded. */
  partial: boolean;
}

export const state: AppState = {
  window: 14,
  monthFilter: "",
  sizes: new Set<RoomSize>(["small", "mid", "large", "unknown"]),
  genres: new Set<string>(),
  maxPrice: 60,
  search: "",
  foryou: new Set<ForYou>(),
  gigs: [],
  saved: new Set<string>(),
  lastfm: { user: "", top: new Set(), similar: new Set(), loading: false, error: null },
  loading: false,
  error: null,
  partial: false,
};

/** Max value of the price slider; at this value the price filter is disabled. */
export const PRICE_MAX = 100;
