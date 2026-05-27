export const SKIDDLE_API = "/api/skiddle";
export const LASTFM_API = "/api/lastfm";

export const MCR_CENTRE = { lat: 53.4808, lng: -2.2426, radius: 3 } as const; // miles

/** App-level cache of normalised gigs, in minutes. Kept in sync with the edge
 *  cache-control in netlify/edge-functions/skiddle.ts (300s = 5 min). */
export const GIG_CACHE_TTL_MIN = 5;

/** Last.fm taste data changes slowly; cache it in the browser for a day. */
export const LASTFM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const PAGE_LIMIT = 100;
export const MAX_EVENTS = 2000;
/** Concurrent upstream page fetches. */
export const FETCH_CONCURRENCY = 5;

export const CACHE_PREFIX = "mcr_gigs_v5_w";
export const PREFS_KEY = "mcr_gigs_prefs_v1";
export const SAVED_KEY = "mcr_gigs_saved_v1";
export const LASTFM_PREFIX = "mcr_gigs_lastfm_v1_";
/** Gig ids seen on previous visits, for the "new since last visit" badge. */
export const SEEN_KEY = "mcr_gigs_seen_v1";
/** Cap on stored seen-gig ids so the record can't grow without bound. */
export const SEEN_CAP = 5000;
