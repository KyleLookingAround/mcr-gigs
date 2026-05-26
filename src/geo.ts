import type { Gig } from "./types";
import { CRAWL_MAX_WALK_M, WALK_METRES_PER_MIN, CRAWL_MIN_GAP_MIN } from "./config";

const R = 6_371_000; // Earth radius, metres
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in metres. */
export function haversineMetres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough walking time for a straight-line distance, in minutes. */
export function walkMinutes(metres: number): number {
  return metres / WALK_METRES_PER_MIN;
}

/** "HH:MM" → minutes since midnight, or null if unparseable. */
export function parseDoorMinutes(door: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(door.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Push small-hours door times (e.g. 00:30) past the evening so a crawl that
 *  rolls past midnight still orders correctly. */
function eveningMinutes(raw: number): number {
  return raw < 360 ? raw + 1440 : raw;
}

export interface Crawl {
  date: string;
  /** Venues in the order you'd walk them, earliest door first. */
  gigs: Gig[];
  /** Summed straight-line walking distance between consecutive venues, metres. */
  totalMetres: number;
  /** Rough total walking time, minutes. */
  walkMins: number;
}

interface Node {
  gig: Gig;
  lat: number;
  lng: number;
  door: number;
}

function matchScore(g: Gig): number {
  return g.match === "you" ? 2 : g.match === "similar" ? 1 : 0;
}

/** Find the best walkable, door-ordered crawl (2+ venues) for a single night's
 *  candidate gigs. Longest chain wins; ties break toward more taste matches,
 *  then less walking. */
function bestCrawlForNight(date: string, nodes: Node[]): Crawl | null {
  const n = nodes.length;
  if (n < 2) return null;

  // best[i]: best chain ending at node i.
  const len = new Array(n).fill(1);
  const score = nodes.map((node) => matchScore(node.gig));
  const walk = new Array(n).fill(0);
  const prev = new Array<number>(n).fill(-1);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      const gap = nodes[i].door - nodes[j].door;
      if (gap < CRAWL_MIN_GAP_MIN) continue;
      const d = haversineMetres(nodes[j].lat, nodes[j].lng, nodes[i].lat, nodes[i].lng);
      if (d > CRAWL_MAX_WALK_M) continue;
      if (gap < walkMinutes(d)) continue; // can't physically make it

      const candLen = len[j] + 1;
      const candScore = score[j] + matchScore(nodes[i].gig);
      const candWalk = walk[j] + d;
      const better =
        candLen > len[i] ||
        (candLen === len[i] && candScore > score[i]) ||
        (candLen === len[i] && candScore === score[i] && candWalk < walk[i]);
      if (better) {
        len[i] = candLen;
        score[i] = candScore;
        walk[i] = candWalk;
        prev[i] = j;
      }
    }
  }

  let end = -1;
  for (let i = 0; i < n; i++) {
    if (len[i] < 2) continue;
    if (
      end === -1 ||
      len[i] > len[end] ||
      (len[i] === len[end] && score[i] > score[end]) ||
      (len[i] === len[end] && score[i] === score[end] && walk[i] < walk[end])
    ) {
      end = i;
    }
  }
  if (end === -1) return null;

  const chain: Node[] = [];
  for (let i = end; i !== -1; i = prev[i]) chain.push(nodes[i]);
  chain.reverse();

  return {
    date,
    gigs: chain.map((c) => c.gig),
    totalMetres: Math.round(walk[end]),
    walkMins: Math.round(walkMinutes(walk[end])),
  };
}

/** Plan one suggested gig-crawl per night across the given gigs: a walkable,
 *  time-ordered run of 2+ venues you could realistically hit in an evening.
 *  Only gigs with coordinates and a door time can take part. */
export function planCrawls(gigs: Gig[]): Crawl[] {
  const byNight = new Map<string, Node[]>();
  for (const g of gigs) {
    if (g.lat == null || g.lng == null || !g.date) continue;
    const raw = parseDoorMinutes(g.door);
    if (raw == null) continue;
    if (!byNight.has(g.date)) byNight.set(g.date, []);
    byNight.get(g.date)!.push({ gig: g, lat: g.lat, lng: g.lng, door: eveningMinutes(raw) });
  }

  const crawls: Crawl[] = [];
  for (const [date, all] of byNight) {
    // One venue per stop: keep the earliest-door gig at each venue.
    const perVenue = new Map<string, Node>();
    for (const node of all) {
      const key = node.gig.venue.toLowerCase().trim() || node.gig.id;
      const existing = perVenue.get(key);
      if (!existing || node.door < existing.door) perVenue.set(key, node);
    }
    const nodes = [...perVenue.values()].sort((a, b) => a.door - b.door);
    const crawl = bestCrawlForNight(date, nodes);
    if (crawl) crawls.push(crawl);
  }

  return crawls.sort((a, b) => a.date.localeCompare(b.date) || b.gigs.length - a.gigs.length);
}
