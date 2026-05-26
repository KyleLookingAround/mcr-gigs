export const SKIDDLE_API = "/api/skiddle";
export const LASTFM_API = "/api/lastfm";

export const MCR_CENTRE = { lat: 53.4808, lng: -2.2426, radius: 3 } as const; // miles

/** App-level cache of normalised gigs, in minutes. Kept in sync with the edge
 *  cache-control in netlify/edge-functions/skiddle.ts (300s = 5 min). */
export const GIG_CACHE_TTL_MIN = 5;

/** Last.fm taste data changes slowly; cache it in the browser for a day. */
export const LASTFM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Gig-crawl planner: two venues are "walkable" between sets within this many
 *  metres, and we assume this walking pace to check a crawl is makeable. */
export const CRAWL_MAX_WALK_M = 1200;
export const WALK_METRES_PER_MIN = 80; // ~4.8 km/h
/** A crawl needs at least this gap (minutes) between door times to count, so
 *  you actually catch some of each set rather than just venue-hopping. */
export const CRAWL_MIN_GAP_MIN = 30;

export const PAGE_LIMIT = 100;
export const MAX_EVENTS = 2000;
/** Concurrent upstream page fetches. */
export const FETCH_CONCURRENCY = 5;

export const CACHE_PREFIX = "mcr_gigs_v5_w";
export const PREFS_KEY = "mcr_gigs_prefs_v1";
export const SAVED_KEY = "mcr_gigs_saved_v1";
export const LASTFM_PREFIX = "mcr_gigs_lastfm_v1_";
