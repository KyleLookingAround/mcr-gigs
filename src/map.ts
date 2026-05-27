import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Gig, RoomSize } from "./types";
import { MCR_CENTRE } from "./config";
import { nearest, formatMiles } from "./geo";
import { STATIONS } from "./stations";
import { byId, escapeHtml } from "./dom";
import { fmtDateHeader } from "./dates";

const COLOUR = { you: "#c8341c", similar: "#1a7a5e", none: "#1a1714" } as const;
const SIZE_RADIUS: Record<RoomSize, number> = { small: 6, mid: 8, large: 11, unknown: 6 };
const SIZE_ORDER: Record<RoomSize, number> = { unknown: 0, small: 1, mid: 2, large: 3 };

let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let markers = new Map<string, L.CircleMarker>();

interface VenueGroup {
  key: string;
  name: string;
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
  drawStations();
  renderLegend();

  byId("venue-list").addEventListener("click", (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>("[data-venue]");
    if (!item || !map) return;
    const marker = markers.get(item.dataset.venue!);
    if (!marker) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.4 });
    marker.openPopup();
  });
}

/** Plot the fixed rail stations once; they don't change with the gig results. */
function drawStations(): void {
  const layer = L.layerGroup().addTo(map!);
  for (const s of STATIONS) {
    L.marker([s.lat, s.lng], {
      icon: L.divIcon({
        className: "station-pin",
        html: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
      keyboard: false,
    })
      .bindTooltip(`${s.name} station`, { direction: "top" })
      .addTo(layer);
  }
}

function renderLegend(): void {
  byId("map-legend").innerHTML = `
    <span class="lg"><i class="dot" style="background:${COLOUR.you}"></i>Your artist</span>
    <span class="lg"><i class="dot" style="background:${COLOUR.similar}"></i>Similar</span>
    <span class="lg"><i class="dot" style="background:${COLOUR.none}"></i>Other</span>
    <span class="lg lg-size"><i class="dot s-small"></i><i class="dot s-large"></i>Room size</span>
    <span class="lg"><i class="dot station"></i>Station</span>`;
}

function venueMatch(gigs: Gig[]): keyof typeof COLOUR {
  if (gigs.some((g) => g.match === "you")) return "you";
  if (gigs.some((g) => g.match === "similar")) return "similar";
  return "none";
}

function venueSize(gigs: Gig[]): RoomSize {
  return gigs.reduce<RoomSize>(
    (best, g) => (SIZE_ORDER[g.size] > SIZE_ORDER[best] ? g.size : best),
    "unknown",
  );
}

function groupByVenue(gigs: Gig[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>();
  for (const g of gigs) {
    if (g.lat == null || g.lng == null) continue;
    const key = `${g.lat.toFixed(4)},${g.lng.toFixed(4)}`;
    let group = map.get(key);
    if (!group) {
      group = { key, name: g.venue || "Venue", lat: g.lat, lng: g.lng, gigs: [] };
      map.set(key, group);
    }
    group.gigs.push(g);
  }
  return [...map.values()];
}

function stationLabel(lat: number, lng: number): string {
  const ns = nearest(lat, lng, STATIONS);
  return ns ? `${formatMiles(ns.metres)} · ${ns.name}` : "";
}

function venuePopup(group: VenueGroup): string {
  const head = `<strong>${escapeHtml(group.name)}</strong>`;
  const ns = nearest(group.lat, group.lng, STATIONS);
  const stationLine = ns
    ? `<div class="pop-station">${formatMiles(ns.metres)} from ${escapeHtml(ns.name)} station</div>`
    : "";
  const rows = group.gigs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.door.localeCompare(b.door))
    .slice(0, 8)
    .map((g) => {
      const when = `${escapeHtml(fmtDateHeader(g.date))}${g.door ? " · " + escapeHtml(g.door) : ""}`;
      return `<li><a href="${escapeHtml(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a><span class="pop-when">${when}</span></li>`;
    })
    .join("");
  return `<div class="map-pop">${head}${stationLine}<ul>${rows}</ul></div>`;
}

function venueItem(group: VenueGroup): string {
  const match = venueMatch(group.gigs);
  const dist = stationLabel(group.lat, group.lng);
  const n = group.gigs.length;
  return `<button class="venue-item" data-venue="${escapeHtml(group.key)}">
    <i class="dot" style="background:${COLOUR[match]}"></i>
    <span class="venue-name">${escapeHtml(group.name)}</span>
    <span class="venue-meta">${n} gig${n === 1 ? "" : "s"} · ${dist}</span>
  </button>`;
}

function renderVenueList(groups: VenueGroup[], hidden: number): void {
  const list = byId("venue-list");
  const note =
    hidden > 0
      ? `<p class="venue-note">${hidden} gig${hidden === 1 ? "" : "s"} not shown — no map location from the source.</p>`
      : "";
  if (groups.length === 0) {
    list.innerHTML = `<p class="venue-empty">No mappable venues in the current results.</p>${note}`;
    return;
  }
  const rank = (g: VenueGroup) => {
    const m = venueMatch(g.gigs);
    return m === "you" ? 0 : m === "similar" ? 1 : 2;
  };
  const sorted = groups
    .slice()
    .sort(
      (a, b) => rank(a) - rank(b) || b.gigs.length - a.gigs.length || a.name.localeCompare(b.name),
    );
  list.innerHTML = sorted.map(venueItem).join("") + note;
}

function draw(gigs: Gig[]): void {
  if (!map) return;
  markerLayer!.clearLayers();
  markers = new Map();

  const located = gigs.filter((g) => g.lat != null && g.lng != null);
  const groups = groupByVenue(located);
  for (const group of groups) {
    const colour = COLOUR[venueMatch(group.gigs)];
    const marker = L.circleMarker([group.lat, group.lng], {
      radius: SIZE_RADIUS[venueSize(group.gigs)],
      color: colour,
      weight: 2,
      fillColor: colour,
      fillOpacity: 0.5,
    })
      .bindTooltip(group.name, { direction: "top" })
      .bindPopup(venuePopup(group))
      .addTo(markerLayer!);
    markers.set(group.key, marker);
  }

  renderVenueList(groups, gigs.length - located.length);
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
