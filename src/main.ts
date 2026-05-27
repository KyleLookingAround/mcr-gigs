import "./styles.css";
import { state, PRICE_MAX } from "./state";
import { loadPrefs, savePrefs, saveSaved, saveFollowed } from "./prefs";
import { fetchAllGigs, readCache, writeCache } from "./data/skiddle";
import { fetchTaste, readTasteCache } from "./data/lastfm";
import { decorate, render, renderLastfmStatus, filteredGigs, setAfterRender } from "./render";
import { downloadIcs, downloadIcsMany } from "./ics";
import { initEasterEggs, maybeLegendToast, showToast } from "./eggs";
import { byId, setPressed } from "./dom";
import { loadSeen, recordSeen } from "./seen";
import { isSortMode } from "./sort";
import { serializeShare, parseShare } from "./share";
import type { ForYou, RoomSize } from "./types";

function priceText(): string {
  return state.maxPrice >= PRICE_MAX ? "Any" : `£${state.maxPrice}`;
}

/** Sync the price slider's value label and the note explaining that
 *  unknown-price gigs are never hidden by the slider. */
function updatePriceUI(): void {
  byId("price-val").textContent = priceText();
  byId("price-note").textContent = state.maxPrice < PRICE_MAX ? "incl. unknown prices" : "";
}

function updateForYouChips(): void {
  const hasLf = state.lastfm.top.size > 0;
  byId("fy-you").style.display = hasLf ? "" : "none";
  byId("fy-similar").style.display = state.lastfm.similar.size > 0 ? "" : "none";
  byId("fy-venue").style.display = state.followedVenues.size > 0 ? "" : "none";
  byId("fy-shared").style.display = state.sharedSaved.size > 0 ? "" : "none";
  if (!hasLf) state.foryou.delete("you");
  if (state.lastfm.similar.size === 0) state.foryou.delete("similar");
  if (state.followedVenues.size === 0) state.foryou.delete("venue");
  if (state.sharedSaved.size === 0) state.foryou.delete("shared");
}

/** URL that reproduces the current filtered view. When sharing from the Saved
 *  filter it also carries your saved picks, which the recipient sees as a
 *  separate "shared with you" set (it never touches their own saved list). */
function shareUrl(): string {
  const sharingSaved = state.foryou.has("saved") && state.saved.size > 0;
  const hash = serializeShare({
    window: state.window,
    days: [...state.days],
    sizes: [...state.sizes],
    genres: [...state.genres],
    maxPrice: state.maxPrice < PRICE_MAX ? state.maxPrice : undefined,
    freeOnly: state.freeOnly,
    sort: state.sort,
    month: state.monthFilter || undefined,
    // "shared" is a receipt-only concept; never round-trip it into a link.
    foryou: [...state.foryou].filter((f) => f !== "shared"),
    search: state.search || undefined,
    saved: sharingSaved ? [...state.saved] : undefined,
  });
  return location.origin + location.pathname + (hash ? "#" + hash : "");
}

/** Apply a shared view from the URL hash. Any shared saved-gig ids are kept in
 *  a separate session set and surfaced via the "Shared" filter — they're never
 *  merged into the visitor's own saved list. */
function applyShare(): void {
  if (location.hash.length < 2) return;
  const s = parseShare(location.hash);
  if (s.window != null) state.window = s.window;
  if (s.days) state.days = new Set(s.days);
  if (s.sizes) state.sizes = new Set(s.sizes);
  if (s.genres) state.genres = new Set(s.genres);
  if (s.maxPrice != null) state.maxPrice = s.maxPrice;
  if (s.freeOnly != null) state.freeOnly = s.freeOnly;
  if (s.sort) state.sort = s.sort;
  if (s.month) state.monthFilter = s.month;
  if (s.foryou) state.foryou = new Set(s.foryou);
  if (s.saved && s.saved.length) {
    state.sharedSaved = new Set(s.saved);
    // The sender's "saved" filter becomes the recipient's "shared" filter.
    state.foryou.delete("saved");
    state.foryou.add("shared");
    showToast(`${s.saved.length} gig${s.saved.length === 1 ? "" : "s"} shared with you.`);
  }
  if (s.search) state.search = s.search;
}

function pickSurprise(): void {
  const vis = filteredGigs();
  if (vis.length === 0) {
    showToast("No gigs match — try loosening filters.");
    return;
  }
  const pick = vis[Math.floor(Math.random() * vis.length)];
  void setView("list").then(() =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `#results article[data-gig-id="${CSS.escape(pick.id)}"]`,
      );
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("flash");
      void el.offsetWidth; // restart the highlight animation
      el.classList.add("flash");
    }),
  );
}

async function copyShareLink(): Promise<void> {
  const url = shareUrl();
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard.");
      return;
    } catch {
      /* fall through to showing the link */
    }
  }
  showToast(url);
}

function applyStateToUI(): void {
  document
    .querySelectorAll<HTMLElement>("[data-window]")
    .forEach((b) => setPressed(b, Number(b.dataset.window) === state.window));
  document
    .querySelectorAll<HTMLElement>("[data-size]")
    .forEach((b) => setPressed(b, state.sizes.has(b.dataset.size as RoomSize)));
  document
    .querySelectorAll<HTMLElement>("[data-day]")
    .forEach((b) => setPressed(b, state.days.has(Number(b.dataset.day))));
  document
    .querySelectorAll<HTMLElement>("[data-foryou]")
    .forEach((b) => setPressed(b, state.foryou.has(b.dataset.foryou as ForYou)));
  setPressed(byId("free-only"), state.freeOnly);
  byId<HTMLSelectElement>("sort-select").value = state.sort;
  byId<HTMLInputElement>("price-range").value = String(state.maxPrice);
  updatePriceUI();
  byId<HTMLInputElement>("search-box").value = state.search;
  byId<HTMLInputElement>("lastfm-user").value = state.lastfm.user;
  updateForYouChips();
}

async function connectLastfm(user: string, { force = false } = {}): Promise<void> {
  user = (user || "").trim();
  state.lastfm.user = user;
  state.lastfm.error = null;

  const finish = () => {
    savePrefs();
    updateForYouChips();
    decorate();
    renderLastfmStatus();
    render();
  };

  if (!user) {
    state.lastfm.top = new Set();
    state.lastfm.similar = new Set();
    finish();
    return;
  }

  if (!force) {
    const cached = readTasteCache(user);
    if (cached) {
      state.lastfm.top = cached.top;
      state.lastfm.similar = cached.similar;
      finish();
      return;
    }
  }

  state.lastfm.loading = true;
  renderLastfmStatus();
  try {
    const taste = await fetchTaste(user);
    state.lastfm.top = taste.top;
    state.lastfm.similar = taste.similar;
  } catch (e) {
    state.lastfm.error = e instanceof Error ? e.message : String(e);
    state.lastfm.top = new Set();
    state.lastfm.similar = new Set();
  } finally {
    state.lastfm.loading = false;
    finish();
  }
}

let mapModule: Promise<typeof import("./map")> | null = null;
function loadMapModule(): Promise<typeof import("./map")> {
  if (!mapModule) mapModule = import("./map");
  return mapModule;
}

async function setView(v: "list" | "map" | "cal"): Promise<void> {
  state.view = v;
  setPressed(byId("view-list"), v === "list");
  setPressed(byId("view-map"), v === "map");
  setPressed(byId("view-cal"), v === "cal");
  render(); // toggles which container is visible
  if (v === "map") {
    const m = await loadMapModule();
    m.showMap(filteredGigs());
  }
}

async function load({ force = false } = {}): Promise<void> {
  state.error = null;
  state.partial = false;

  if (!force) {
    const cached = readCache(state.window);
    if (cached) {
      state.gigs = cached;
      state.loading = false;
      byId("last-updated").textContent = "cached";
      decorate();
      recordSeen(state.gigs.map((g) => g.id));
      render();
      renderLastfmStatus();
      return;
    }
  }

  state.loading = true;
  render();
  try {
    const { gigs, partial } = await fetchAllGigs(state.window);
    state.gigs = gigs;
    state.partial = partial;
    writeCache(state.window, gigs);
    byId("last-updated").textContent =
      "Updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
    state.gigs = [];
  } finally {
    state.loading = false;
    decorate();
    recordSeen(state.gigs.map((g) => g.id));
    render();
    renderLastfmStatus();
  }
}

function bind(): void {
  document.querySelectorAll<HTMLElement>("[data-window]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.window = Number(btn.dataset.window);
      applyStateToUI();
      savePrefs();
      void load();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.size as RoomSize;
      if (state.sizes.has(s)) state.sizes.delete(s);
      else state.sizes.add(s);
      setPressed(btn, state.sizes.has(s));
      savePrefs();
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = Number(btn.dataset.day);
      if (state.days.has(d)) state.days.delete(d);
      else state.days.add(d);
      setPressed(btn, state.days.has(d));
      savePrefs();
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-foryou]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.foryou as ForYou;
      if (state.foryou.has(f)) state.foryou.delete(f);
      else state.foryou.add(f);
      setPressed(btn, state.foryou.has(f));
      render();
    });
  });

  const freeBtn = byId("free-only");
  freeBtn.addEventListener("click", () => {
    state.freeOnly = !state.freeOnly;
    setPressed(freeBtn, state.freeOnly);
    savePrefs();
    render();
  });

  byId<HTMLSelectElement>("sort-select").addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value;
    if (isSortMode(v)) state.sort = v;
    savePrefs();
    render();
  });

  byId<HTMLInputElement>("search-box").addEventListener("input", (e) => {
    state.search = (e.target as HTMLInputElement).value;
    render();
    maybeLegendToast(state.search);
  });

  const priceRange = byId<HTMLInputElement>("price-range");
  priceRange.addEventListener("input", (e) => {
    state.maxPrice = Number((e.target as HTMLInputElement).value);
    updatePriceUI();
    render();
  });
  priceRange.addEventListener("change", savePrefs);

  byId("refresh-btn").addEventListener("click", () => void load({ force: true }));

  byId("view-list").addEventListener("click", () => void setView("list"));
  byId("view-map").addEventListener("click", () => void setView("map"));
  byId("view-cal").addEventListener("click", () => void setView("cal"));

  byId("surprise-btn").addEventListener("click", pickSurprise);
  byId("share-btn").addEventListener("click", () => void copyShareLink());
  byId("export-saved").addEventListener("click", () => {
    const saved = state.gigs.filter((g) => state.saved.has(g.id));
    if (saved.length === 0) {
      showToast("No saved gigs in the current window.");
      return;
    }
    downloadIcsMany(saved);
  });

  const lfInput = byId<HTMLInputElement>("lastfm-user");
  byId("lastfm-btn").addEventListener(
    "click",
    () => void connectLastfm(lfInput.value, { force: true }),
  );
  lfInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void connectLastfm(lfInput.value, { force: true });
  });

  // Delegated month/genre chip clicks (rebuilt on every render).
  byId("month-chips").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-month]");
    if (!btn) return;
    state.monthFilter = btn.dataset.month!;
    render();
  });
  byId("genre-chips").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-genre]");
    if (!btn) return;
    const g = btn.dataset.genre!;
    if (state.genres.has(g)) state.genres.delete(g);
    else state.genres.add(g);
    savePrefs();
    render();
  });

  // Clear the calendar's exact-day filter from the digest line.
  byId("digest").addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("[data-action='clear-day']")) return;
    state.dayFilter = "";
    render();
  });

  // Pick a day in the calendar → filter the list to it.
  byId("cal-view").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-cal-date]");
    if (!btn) return;
    state.monthFilter = "";
    state.dayFilter = btn.dataset.calDate!;
    void setView("list");
  });

  // Per-gig actions (save / follow / .ics) via delegation so they survive re-renders.
  byId("results").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!btn) return;
    const g = state.gigs.find((x) => x.id === btn.dataset.id);
    if (!g) return;
    if (btn.dataset.action === "save") {
      if (state.saved.has(g.id)) state.saved.delete(g.id);
      else state.saved.add(g.id);
      saveSaved();
      decorate();
      render();
      renderLastfmStatus();
    } else if (btn.dataset.action === "follow") {
      const name = g.venue.toLowerCase().trim();
      if (!name) return;
      if (state.followedVenues.has(name)) state.followedVenues.delete(name);
      else state.followedVenues.add(name);
      saveFollowed();
      updateForYouChips();
      decorate();
      render();
    } else if (btn.dataset.action === "ics") {
      downloadIcs(g);
    }
  });
}

function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}

setAfterRender(() => {
  byId("export-saved").style.display = state.saved.size ? "" : "none";
  if (state.view !== "map") return;
  void loadMapModule().then((m) => m.update(filteredGigs()));
});

loadPrefs();
loadSeen();
applyShare();
bind();
applyStateToUI();
initEasterEggs();
void load();
if (state.lastfm.user) void connectLastfm(state.lastfm.user);
registerServiceWorker();
