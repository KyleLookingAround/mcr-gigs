import type { RoomSize } from "./types";
import { state } from "./state";
import { PREFS_KEY, SAVED_KEY } from "./config";
import { isSortMode } from "./sort";

export function loadPrefs(): void {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    if (typeof p.window === "number") state.window = p.window;
    if (Array.isArray(p.sizes)) state.sizes = new Set(p.sizes as RoomSize[]);
    if (Array.isArray(p.genres)) state.genres = new Set(p.genres as string[]);
    if (typeof p.maxPrice === "number") state.maxPrice = p.maxPrice;
    if (typeof p.lastfmUser === "string") state.lastfm.user = p.lastfmUser;
    if (Array.isArray(p.days))
      state.days = new Set((p.days as unknown[]).map(Number).filter((n) => n >= 0 && n <= 6));
    if (typeof p.freeOnly === "boolean") state.freeOnly = p.freeOnly;
    if (typeof p.sort === "string" && isSortMode(p.sort)) state.sort = p.sort;
  } catch {
    /* ignore corrupt prefs */
  }
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    if (Array.isArray(s)) state.saved = new Set(s.map(String));
  } catch {
    /* ignore corrupt saved list */
  }
}

export function savePrefs(): void {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        window: state.window,
        sizes: [...state.sizes],
        genres: [...state.genres],
        maxPrice: state.maxPrice,
        lastfmUser: state.lastfm.user,
        days: [...state.days],
        freeOnly: state.freeOnly,
        sort: state.sort,
      }),
    );
  } catch {
    /* storage may be full or disabled */
  }
}

export function saveSaved(): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...state.saved]));
  } catch {
    /* ignore */
  }
}
