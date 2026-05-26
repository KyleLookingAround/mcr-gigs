export type RoomSize = "small" | "mid" | "large" | "unknown";

export type MatchKind = "you" | "similar" | null;

export type ForYou = "saved" | "you" | "similar";

/** A gig normalised from a raw upstream event, ready for rendering. */
export interface Gig {
  id: string;
  name: string;
  venue: string;
  capacity: number | null;
  size: RoomSize;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Door time HH:MM, or "" if unknown. */
  door: string;
  /** Lowest known price in GBP. 0 means free. null means unknown. */
  price: number | null;
  isFree: boolean;
  genres: string[];
  description: string;
  url: string;
  image: string;
  /** Lowercase candidate artist/lineup strings used for taste matching. */
  artistsNorm: string[];
  // Derived per render pass:
  saved?: boolean;
  match?: MatchKind;
}

/** The shape we depend on from a Skiddle event. Everything is optional. */
export interface SkiddleEvent {
  id: string | number;
  eventname?: string;
  venue?: { name?: string; capacity?: number | string };
  openingtimes?: { doorsopen?: string };
  entryprice?: string | number | null;
  genres?: unknown;
  genre?: unknown;
  artists?: Array<{ name?: string } | string>;
  description?: string;
  date?: string;
  link?: string;
  largeimageurl?: string;
  imageurl?: string;
}

export interface LastfmState {
  user: string;
  top: Set<string>;
  similar: Set<string>;
  loading: boolean;
  error: string | null;
}

export interface Prefs {
  window: number;
  sizes: string[];
  genres: string[];
  maxPrice: number;
  group: "day" | "month";
  lastfmUser: string;
}
