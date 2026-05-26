import type { Gig } from "./types";
import { state, PRICE_MAX } from "./state";
import { escapeHtml, byId } from "./dom";
import { gcalLink } from "./ics";
import { fmtGroupHeader, monthLabel } from "./dates";
import { computeMatch } from "./matching";

/** Recompute per-gig saved/match flags. Call after gigs, saved set, or Last.fm
 *  taste data change. */
export function decorate(): void {
  const { top, similar } = state.lastfm;
  for (const g of state.gigs) {
    g.saved = state.saved.has(g.id);
    g.match = computeMatch(g, top, similar);
  }
}

export function filteredGigs(): Gig[] {
  const q = state.search.toLowerCase().trim();
  const fy = state.foryou;
  const priceActive = state.maxPrice < PRICE_MAX;
  return state.gigs.filter((g) => {
    if (state.monthFilter && !g.date.startsWith(state.monthFilter)) return false;
    if (!state.sizes.has(g.size)) return false;
    // Unknown-price gigs always pass; the slider only bounds known prices.
    if (priceActive && g.price != null && g.price > state.maxPrice) return false;
    if (state.genres.size > 0 && !g.genres.some((x) => state.genres.has(x))) return false;
    if (fy.size > 0) {
      let ok = false;
      if (fy.has("saved") && g.saved) ok = true;
      if (fy.has("you") && g.match === "you") ok = true;
      if (fy.has("similar") && (g.match === "you" || g.match === "similar")) ok = true;
      if (!ok) return false;
    }
    if (q) {
      const hay = (
        g.name +
        " " +
        g.venue +
        " " +
        g.genres.join(" ") +
        " " +
        g.description
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function priority(g: Gig): number {
  if (g.saved) return 0;
  if (g.match === "you") return 1;
  if (g.match === "similar") return 2;
  return 3;
}

function groupGigs(gigs: Gig[]): Array<[string, Gig[]]> {
  const map = new Map<string, Gig[]>();
  for (const g of gigs) {
    const k = state.group === "month" ? g.date.slice(0, 7) : g.date;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(g);
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        priority(a) - priority(b) ||
        (a.door || "").localeCompare(b.door || "") ||
        a.name.localeCompare(b.name),
    );
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function priceLabel(g: Gig): string {
  if (g.isFree) return "Free";
  if (g.price != null) return `£${g.price}`;
  return "—";
}

function renderGig(g: Gig): string {
  const sizeClass = g.size === "small" ? "small-room" : g.size === "large" ? "large-room" : "";
  const matchClass = g.match === "you" ? "match-you" : g.match === "similar" ? "match-similar" : "";
  const capLine =
    g.capacity != null
      ? `<span class="cap">cap. ${g.capacity}</span>`
      : `<span>capacity unknown</span>`;
  const genres = g.genres
    .slice(0, 4)
    .map((x) => `<span class="gig-genre">${escapeHtml(x)}</span>`)
    .join("");
  const badge =
    g.match === "you"
      ? `<span class="match-badge you">♪ Your artist</span>`
      : g.match === "similar"
        ? `<span class="match-badge similar">≈ Similar to yours</span>`
        : "";
  const id = escapeHtml(g.id);
  const q = encodeURIComponent(g.name);
  const sizeSub =
    g.size === "small"
      ? "Intimate"
      : g.size === "mid"
        ? "Mid-size"
        : g.size === "large"
          ? "Big room"
          : "";
  const thumb = g.image
    ? `<img class="gig-thumb" src="${escapeHtml(g.image)}" alt="" loading="lazy" decoding="async">`
    : "";
  return `
    <article class="gig ${sizeClass} ${matchClass}">
      ${thumb}
      <div class="gig-time">
        <div class="door-label">Doors</div>
        <div class="door-time">${escapeHtml(g.door || "—")}</div>
        <div class="door-sub">${sizeSub}</div>
      </div>
      <div class="gig-main">
        <div class="gig-venue-line">
          <button class="save-star ${g.saved ? "saved" : ""}" data-action="save" data-id="${id}" aria-pressed="${g.saved ? "true" : "false"}" aria-label="${g.saved ? "Unsave gig" : "Save gig"}" title="${g.saved ? "Saved" : "Save"}">${g.saved ? "★" : "☆"}</button>
          <span>${escapeHtml(g.venue)}</span><span>·</span>${capLine}${badge}
        </div>
        <h3 class="gig-title">${escapeHtml(g.name)}</h3>
        ${genres ? `<div class="gig-genres">${genres}</div>` : ""}
        ${g.description ? `<p class="gig-desc">${escapeHtml(g.description)}</p>` : ""}
        <div class="gig-links">
          <a href="https://open.spotify.com/search/${q}" target="_blank" rel="noopener">♪ Spotify</a>
          <a href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ YouTube</a>
          <a href="${escapeHtml(gcalLink(g))}" target="_blank" rel="noopener">+ Google Cal</a>
          <button data-action="ics" data-id="${id}">↓ .ics</button>
        </div>
      </div>
      <div class="gig-side">
        <div class="gig-price"><span class="lbl">From</span>${priceLabel(g)}</div>
        <a class="buy-btn" href="${escapeHtml(g.url)}" target="_blank" rel="noopener">Tickets</a>
      </div>
    </article>
  `;
}

function renderMonthChips(): void {
  const row = byId("month-row");
  const container = byId("month-chips");
  const months = [...new Set(state.gigs.map((g) => g.date.slice(0, 7)))]
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
    .sort();
  if (state.monthFilter && !months.includes(state.monthFilter)) state.monthFilter = "";
  if (months.length <= 1) {
    state.monthFilter = "";
    row.style.display = "none";
    return;
  }
  row.style.display = "";
  const chip = (val: string, label: string, active: boolean) =>
    `<button class="chip ${active ? "active" : ""}" data-month="${escapeHtml(val)}">${escapeHtml(label)}</button>`;
  container.innerHTML =
    chip("", "All", state.monthFilter === "") +
    months.map((m) => chip(m, monthLabel(m), state.monthFilter === m)).join("");
}

function renderGenreChips(): void {
  const counts = new Map<string, number>();
  for (const g of state.gigs) for (const x of g.genres) counts.set(x, (counts.get(x) || 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([g]) => g);
  const row = byId("genre-row");
  const container = byId("genre-chips");
  if (top.length === 0) {
    row.style.display = "none";
    return;
  }
  row.style.display = "";
  container.innerHTML = top
    .map(
      (g) =>
        `<button class="chip accent ${state.genres.has(g) ? "active" : ""}" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`,
    )
    .join("");
}

export function renderLastfmStatus(): void {
  const el = byId("lastfm-status");
  const l = state.lastfm;
  if (l.loading) {
    el.textContent = "Connecting…";
    return;
  }
  if (l.error) {
    el.textContent = l.error;
    return;
  }
  if (l.user && l.top.size) {
    const matched = state.gigs.filter((g) => g.match === "you").length;
    el.textContent = `${l.top.size} artists · ${matched} match`;
  } else {
    el.textContent = "";
  }
}

export function render(): void {
  const results = byId("results");
  byId("error-container").innerHTML = state.error
    ? `<div class="error-box"><strong>Couldn't load gigs.</strong> ${escapeHtml(state.error)}
        <div style="margin-top:8px; font-size:11px; color:var(--muted)">
          If this says <code>SKIDDLE_API_KEY not set</code>, add the env var in Netlify and redeploy.
        </div></div>`
    : state.partial
      ? `<div class="error-box" style="background:#fdf3e6;border-color:var(--ink)">Some results may be missing — a few pages failed to load. Try refreshing.</div>`
      : "";

  if (state.loading) {
    results.innerHTML = `<div class="state-screen"><div class="spinner"></div><div class="display">Fetching gigs…</div></div>`;
    byId("visible-count").textContent = "—";
    byId("status-meta").textContent = "loading";
    return;
  }

  renderMonthChips();
  renderGenreChips();
  const visible = filteredGigs();
  byId("visible-count").textContent = String(visible.length);
  byId("status-meta").textContent = `next ${state.window} days · ${state.gigs.length} total`;

  if (visible.length === 0) {
    results.innerHTML = `<div class="state-screen"><div class="display">${state.gigs.length === 0 ? "No gigs loaded yet." : "Nothing matches these filters."}</div><div class="small">${state.gigs.length === 0 ? "" : "Try loosening room size or genre."}</div></div>`;
    return;
  }

  const grouped = groupGigs(visible);
  results.innerHTML = grouped
    .map(
      ([key, gigs]) => `
    <div class="date-group">
      <h2 class="date-header"><span>${fmtGroupHeader(key, state.group)}</span><span class="day-count">${gigs.length} gig${gigs.length === 1 ? "" : "s"}</span></h2>
      ${gigs.map(renderGig).join("")}
    </div>`,
    )
    .join("");
}
