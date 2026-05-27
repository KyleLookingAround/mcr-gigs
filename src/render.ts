import type { Gig } from "./types";
import { state, PRICE_MAX } from "./state";
import { escapeHtml, byId } from "./dom";
import { gcalLink } from "./ics";
import { fmtDateHeader, monthLabel, dayOfWeek } from "./dates";
import { computeMatch } from "./matching";
import { compareGigs } from "./sort";
import { isNewGig } from "./seen";
import { buildDigest } from "./digest";
import { buildCalendar, heatLevel, todayCalIso } from "./calendar";
import { LOADING_PHRASES, EMPTY_PHRASES, pickPhrase } from "./phrases";

/** Hook fired at the end of every render so the map view can stay in sync
 *  without render.ts importing the (heavy, lazy-loaded) Leaflet module. */
let afterRender: (() => void) | null = null;
export function setAfterRender(fn: () => void): void {
  afterRender = fn;
}

/** Recompute per-gig saved/match flags. Call after gigs, saved set, or Last.fm
 *  taste data change. */
export function decorate(): void {
  const { top, similar } = state.lastfm;
  for (const g of state.gigs) {
    g.saved = state.saved.has(g.id);
    g.match = computeMatch(g, top, similar);
    g.isNew = isNewGig(g.id);
    g.followedVenue = state.followedVenues.has(g.venue.toLowerCase().trim());
    g.shared = state.sharedSaved.has(g.id);
  }
}

export function filteredGigs(): Gig[] {
  const q = state.search.toLowerCase().trim();
  const fy = state.foryou;
  const priceActive = state.maxPrice < PRICE_MAX;
  return state.gigs.filter((g) => {
    // An exact-day filter (from the calendar) overrides the day-of-week chips.
    if (state.dayFilter) {
      if (g.date !== state.dayFilter) return false;
    } else if (state.days.size > 0 && !state.days.has(dayOfWeek(g.date))) {
      return false;
    }
    if (state.monthFilter && !g.date.startsWith(state.monthFilter)) return false;
    if (!state.sizes.has(g.size)) return false;
    if (state.freeOnly && !g.isFree) return false;
    // Unknown-price gigs always pass; the slider only bounds known prices.
    if (priceActive && g.price != null && g.price > state.maxPrice) return false;
    if (state.genres.size > 0 && !g.genres.some((x) => state.genres.has(x))) return false;
    if (fy.size > 0) {
      let ok = false;
      if (fy.has("saved") && g.saved) ok = true;
      if (fy.has("shared") && g.shared) ok = true;
      if (fy.has("you") && g.match === "you") ok = true;
      if (fy.has("similar") && (g.match === "you" || g.match === "similar")) ok = true;
      if (fy.has("venue") && g.followedVenue) ok = true;
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

function groupGigs(gigs: Gig[]): Array<[string, Gig[]]> {
  const map = new Map<string, Gig[]>();
  for (const g of gigs) {
    const k = g.date;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(g);
  }
  const cmp = compareGigs(state.sort);
  for (const arr of map.values()) arr.sort(cmp);
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
  const newBadge = g.isNew && g.match ? `<span class="match-badge new">New</span>` : "";
  const venueBadge = g.followedVenue ? `<span class="match-badge venue">♥ Venue</span>` : "";
  const sharedBadge = g.shared ? `<span class="match-badge shared">Shared</span>` : "";
  const id = escapeHtml(g.id);
  // Searches land on the act far more often than the (noisier) event title.
  const q = encodeURIComponent(g.artists[0] || g.name);
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
  const followBtn = g.venue
    ? `<button class="follow-venue ${g.followedVenue ? "on" : ""}" data-action="follow" data-id="${id}" aria-pressed="${g.followedVenue ? "true" : "false"}" aria-label="${g.followedVenue ? "Unfollow venue" : "Follow venue"}" title="${g.followedVenue ? "Following venue" : "Follow venue"}">${g.followedVenue ? "♥" : "♡"}</button>`
    : "";
  return `
    <article class="gig ${sizeClass} ${matchClass} ${g.followedVenue ? "followed-venue" : ""} ${g.image ? "" : "no-thumb"}" data-gig-id="${id}">
      <button class="save-star ${g.saved ? "saved" : ""}" data-action="save" data-id="${id}" aria-pressed="${g.saved ? "true" : "false"}" aria-label="${g.saved ? "Unsave gig" : "Save gig"}" title="${g.saved ? "Saved" : "Save"}">${g.saved ? "★" : "☆"}</button>
      ${thumb}
      <div class="gig-time">
        <div class="door-label">Doors</div>
        <div class="door-time">${escapeHtml(g.door || "—")}</div>
        <div class="door-sub">${sizeSub}</div>
      </div>
      <div class="gig-main">
        <div class="gig-venue-line">
          <span>${escapeHtml(g.venue)}</span>${followBtn}<span>·</span>${capLine}${badge}${newBadge}${venueBadge}${sharedBadge}
        </div>
        <h3 class="gig-title">${escapeHtml(g.name)}</h3>
        ${genres ? `<div class="gig-genres">${genres}</div>` : ""}
        ${g.description ? `<p class="gig-desc">${escapeHtml(g.description)}</p>` : ""}
        <div class="gig-links">
          <a href="https://open.spotify.com/search/${q}" target="_blank" rel="noopener">♪ Spotify</a>
          <a href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ YouTube</a>
          <a href="https://bandcamp.com/search?q=${q}" target="_blank" rel="noopener">Bandcamp</a>
          <a href="https://www.songkick.com/search?query=${q}" target="_blank" rel="noopener">Songkick</a>
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
    `<button class="chip ${active ? "active" : ""}" data-month="${escapeHtml(val)}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
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
        `<button class="chip accent ${state.genres.has(g) ? "active" : ""}" data-genre="${escapeHtml(g)}" aria-pressed="${state.genres.has(g)}">${escapeHtml(g)}</button>`,
    )
    .join("");
}

function renderDigest(visible: Gig[]): void {
  const el = byId("digest");
  if (state.loading || state.gigs.length === 0) {
    el.innerHTML = "";
    return;
  }
  const d = buildDigest(visible);
  const parts = [`${d.total} shown`];
  if (d.matches) parts.push(`${d.matches} for you`);
  if (d.freeCount) parts.push(`${d.freeCount} free`);
  if (d.cheapest != null && d.cheapest > 0) parts.push(`from £${d.cheapest}`);
  if (d.busiest && d.busiest.count > 1)
    parts.push(`busiest ${fmtDateHeader(d.busiest.date)} (${d.busiest.count})`);
  const dayChip = state.dayFilter
    ? `<button class="chip active" data-action="clear-day" aria-label="Clear day filter">${escapeHtml(fmtDateHeader(state.dayFilter))} ✕</button>`
    : "";
  el.innerHTML = `${dayChip}<span class="digest-line">${parts.join(" · ")}</span>`;
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
    const fresh = state.gigs.filter(
      (g) => g.isNew && (g.match === "you" || g.match === "similar"),
    ).length;
    el.textContent = `${l.top.size} artists · ${matched} match${fresh ? ` · ${fresh} new` : ""}`;
  } else {
    el.textContent = "";
  }
}

function calMonthTitle(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderCalendarView(): void {
  const host = byId("cal-el");
  const months = buildCalendar(state.gigs);
  if (months.length === 0) {
    host.innerHTML = `<p class="venue-empty">No gigs loaded yet.</p>`;
    return;
  }
  const today = todayCalIso();
  const dowRow = `<div class="cal-dow">${DOW.map((d) => `<span>${d}</span>`).join("")}</div>`;
  host.innerHTML = months
    .map((mo) => {
      const grid = mo.weeks
        .map((week) =>
          week
            .map((cell) => {
              if (!cell.date) return `<span class="cal-cell empty"></span>`;
              const lvl = heatLevel(cell.count);
              const cls = [
                `cal-cell h${lvl}`,
                cell.date === today ? "today" : "",
                cell.date === state.dayFilter ? "sel" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const day = Number(cell.date.slice(8));
              const dot = cell.matches
                ? `<i class="cal-dot" title="${cell.matches} for you"></i>`
                : "";
              const countLbl = cell.count ? `<span class="cal-count">${cell.count}</span>` : "";
              const dis = cell.count === 0 ? " disabled" : "";
              return `<button class="${cls}" data-cal-date="${cell.date}"${dis} aria-label="${escapeHtml(fmtDateHeader(cell.date))}, ${cell.count} gig${cell.count === 1 ? "" : "s"}"><span class="cal-num">${day}</span>${countLbl}${dot}</button>`;
            })
            .join(""),
        )
        .join("");
      return `<div class="cal-month-block"><h3 class="cal-month">${escapeHtml(calMonthTitle(mo.ym))}</h3>${dowRow}<div class="cal-grid">${grid}</div></div>`;
    })
    .join("");
}

export function render(): void {
  const v = state.view;
  byId("results").hidden = v !== "list";
  byId("map-view").hidden = v !== "map";
  byId("cal-view").hidden = v !== "cal";
  renderBody();
  if (v === "cal" && !state.loading) renderCalendarView();
  afterRender?.();
}

function renderBody(): void {
  const results = byId("results");
  results.setAttribute("aria-busy", state.loading ? "true" : "false");
  byId("error-container").innerHTML = state.error
    ? `<div class="error-box"><strong>Couldn't load gigs.</strong> ${escapeHtml(state.error)}
        <div style="margin-top:8px; font-size:11px; color:var(--muted)">
          If this says <code>SKIDDLE_API_KEY not set</code>, add the env var in Netlify and redeploy.
        </div></div>`
    : state.partial
      ? `<div class="error-box" style="background:#fdf3e6;border-color:var(--ink)">Some results may be missing — a few pages failed to load. Try refreshing.</div>`
      : "";

  if (state.loading) {
    results.innerHTML = `<div class="state-screen"><div class="spinner"></div><div class="display">${escapeHtml(pickPhrase(LOADING_PHRASES))}</div></div>`;
    byId("digest").innerHTML = "";
    byId("visible-count").textContent = "—";
    byId("status-meta").textContent = "loading";
    return;
  }

  renderMonthChips();
  renderGenreChips();
  const visible = filteredGigs();
  renderDigest(visible);
  byId("visible-count").textContent = String(visible.length);
  byId("status-meta").textContent = `next ${state.window} days · ${state.gigs.length} total`;

  if (visible.length === 0) {
    results.innerHTML = `<div class="state-screen"><div class="display">${state.gigs.length === 0 ? "No gigs loaded yet." : escapeHtml(pickPhrase(EMPTY_PHRASES))}</div><div class="small">${state.gigs.length === 0 ? "" : "Try loosening room size or genre."}</div></div>`;
    return;
  }

  const grouped = groupGigs(visible);
  results.innerHTML = grouped
    .map(
      ([key, gigs]) => `
    <div class="date-group">
      <h2 class="date-header"><span>${fmtDateHeader(key)}</span><span class="day-count">${gigs.length} gig${gigs.length === 1 ? "" : "s"}</span></h2>
      ${gigs.map(renderGig).join("")}
    </div>`,
    )
    .join("");
}
