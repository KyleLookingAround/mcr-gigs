import { SEEN_KEY, SEEN_CAP } from "./config";

/** Baseline of gig ids recorded on previous visits. Held constant for the whole
 *  session so "new" badges don't disappear as the current load is recorded. */
let baseline = new Set<string>();
/** False on a user's very first visit, when there's no prior record and so
 *  nothing should be flagged as new. */
let hadRecord = false;

export function loadSeen(): void {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (raw == null) {
      hadRecord = false;
      baseline = new Set();
      return;
    }
    const arr = JSON.parse(raw);
    baseline = new Set(Array.isArray(arr) ? arr.map(String) : []);
    hadRecord = true;
  } catch {
    hadRecord = false;
    baseline = new Set();
  }
}

export function isNewGig(id: string): boolean {
  return hadRecord && !baseline.has(id);
}

/** Fold the currently loaded gig ids into the stored record (without disturbing
 *  the in-memory baseline). Current ids are kept when capping. */
export function recordSeen(ids: string[]): void {
  try {
    const merged = [...new Set([...baseline, ...ids])];
    const capped = merged.length > SEEN_CAP ? merged.slice(merged.length - SEEN_CAP) : merged;
    localStorage.setItem(SEEN_KEY, JSON.stringify(capped));
  } catch {
    /* storage full / disabled */
  }
}
