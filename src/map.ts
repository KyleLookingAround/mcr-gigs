import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Gig } from "./types";
import { MCR_CENTRE } from "./config";
import { planCrawls, type Crawl } from "./geo";
import { byId, escapeHtml } from "./dom";
import { fmtDateHeader } from "./dates";

const COLOUR = { you: "#c8341c", similar: "#1a7a5e", none: "#1a1714" } as const;

let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let routeLayer: L.LayerGroup | null = null;
let routes: L.Polyline[] = [];

interface VenueGroup {
  lat: number;
  lng: number;
  gigs: Gig[];
}

function init(): void {
  map = L.map("map-el", { scrollWheelZoom: true }).setView([MCR_CENTRE.lat, MCR_CENTRE.lng], 14);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);

  byId("crawl-list").addEventListener("click", (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>("[data-crawl]");
    if (!item || !map) return;
    const line = routes[Number(item.dataset.crawl)];
    if (!line) return;
    map.fitBounds(line.getBounds().pad(0.3));
    routes.forEach((r) => r.setStyle({ weight: 3, opacity: 0.45 }));
    line.setStyle({ weight: 5, opacity: 0.95 });
    line.bringToFront();
  });
}

function venueColour(gigs: Gig[]): string {
  if (gigs.some((g) => g.match === "you")) return COLOUR.you;
  if (gigs.some((g) => g.match === "similar")) return COLOUR.similar;
  return COLOUR.none;
}

function venuePopup(group: VenueGroup): string {
  const head = `<strong>${escapeHtml(group.gigs[0].venue || "Venue")}</strong>`;
  const rows = group.gigs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.door.localeCompare(b.door))
    .slice(0, 8)
    .map((g) => {
      const when = `${escapeHtml(fmtDateHeader(g.date))}${g.door ? " · " + escapeHtml(g.door) : ""}`;
      return `<li><a href="${escapeHtml(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a><span class="pop-when">${when}</span></li>`;
    })
    .join("");
  return `<div class="map-pop">${head}<ul>${rows}</ul></div>`;
}

function groupByVenue(gigs: Gig[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>();
  for (const g of gigs) {
    if (g.lat == null || g.lng == null) continue;
    const key = `${g.lat.toFixed(4)},${g.lng.toFixed(4)}`;
    let group = map.get(key);
    if (!group) {
      group = { lat: g.lat, lng: g.lng, gigs: [] };
      map.set(key, group);
    }
    group.gigs.push(g);
  }
  return [...map.values()];
}

function crawlItem(c: Crawl, i: number): string {
  const venues = c.gigs.map((g) => escapeHtml(g.venue || "?")).join(" → ");
  const km = (c.totalMetres / 1000).toFixed(1);
  return `<button class="crawl-item" data-crawl="${i}">
    <span class="crawl-date">${escapeHtml(fmtDateHeader(c.date))}</span>
    <span class="crawl-route">${venues}</span>
    <span class="crawl-meta">${c.gigs.length} stops · ${km} km · ~${c.walkMins} min walk</span>
  </button>`;
}

function renderCrawlPanel(crawls: Crawl[], hidden: number): void {
  const list = byId("crawl-list");
  const note =
    hidden > 0
      ? `<p class="crawl-note">${hidden} gig${hidden === 1 ? "" : "s"} not shown — no map location from the source.</p>`
      : "";
  if (crawls.length === 0) {
    list.innerHTML = `<p class="crawl-empty">No walkable multi-venue nights in the current results. Try a wider window or fewer filters.</p>${note}`;
    return;
  }
  list.innerHTML = crawls.map(crawlItem).join("") + note;
}

function draw(gigs: Gig[]): void {
  if (!map) return;
  markerLayer!.clearLayers();
  routeLayer!.clearLayers();
  routes = [];

  const located = gigs.filter((g) => g.lat != null && g.lng != null);
  for (const group of groupByVenue(located)) {
    const colour = venueColour(group.gigs);
    L.circleMarker([group.lat, group.lng], {
      radius: 7,
      color: colour,
      weight: 2,
      fillColor: colour,
      fillOpacity: 0.5,
    })
      .bindPopup(venuePopup(group))
      .addTo(markerLayer!);
  }

  const crawls = planCrawls(located);
  crawls.forEach((crawl, i) => {
    routes[i] = L.polyline(
      crawl.gigs.map((g) => [g.lat!, g.lng!] as L.LatLngTuple),
      { color: COLOUR.you, weight: 3, opacity: 0.5, dashArray: "6 7" },
    ).addTo(routeLayer!);
  });

  renderCrawlPanel(crawls, gigs.length - located.length);
}

export function update(gigs: Gig[], fit = false): void {
  if (!map) return;
  draw(gigs);
  if (fit) {
    const pts = gigs
      .filter((g) => g.lat != null && g.lng != null)
      .map((g) => [g.lat!, g.lng!] as L.LatLngTuple);
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.2));
  }
}

export function showMap(gigs: Gig[]): void {
  if (!map) init();
  requestAnimationFrame(() => {
    map!.invalidateSize();
    update(gigs, true);
  });
}
