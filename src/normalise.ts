import type { Gig, SkiddleEvent } from "./types";
import { venueCap, sizeBucket } from "./venues";
import { parsePrice } from "./price";
import { normName } from "./matching";
import { stripHtml } from "./dom";

function structuredCapacity(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractGenres(ev: SkiddleEvent): string[] {
  const g = ev.genres ?? ev.genre;
  let out: string[] = [];
  if (Array.isArray(g)) {
    out = g
      .map((x) => (typeof x === "string" ? x : ((x as { name?: string })?.name ?? "")))
      .filter(Boolean);
  } else if (typeof g === "string") {
    out = [g];
  }
  return out.map((s) => s.toLowerCase().trim()).filter(Boolean);
}

function extractArtists(ev: SkiddleEvent): string[] {
  if (!Array.isArray(ev.artists)) return [];
  return ev.artists
    .map((a) => (typeof a === "string" ? a : (a?.name ?? "")))
    .filter(Boolean) as string[];
}

export function normaliseGig(ev: SkiddleEvent): Gig {
  const venueName = (ev.venue?.name || "").trim();
  const cap = structuredCapacity(ev.venue?.capacity) ?? venueCap(venueName) ?? null;
  const doorRaw = ev.openingtimes?.doorsopen || "";
  const door = doorRaw ? doorRaw.slice(0, 5) : "";
  const { price, isFree } = parsePrice(ev.entryprice);
  const name = ev.eventname || venueName;

  // Candidate strings for taste matching: structured lineup + the event title.
  const artistsNorm = [...new Set([...extractArtists(ev), name].map(normName).filter(Boolean))];

  return {
    id: String(ev.id),
    name,
    venue: venueName,
    capacity: cap,
    size: sizeBucket(cap),
    date: ev.date || "",
    door,
    price,
    isFree,
    genres: extractGenres(ev),
    description: stripHtml(ev.description || "").slice(0, 240),
    url: ev.link || `https://www.skiddle.com/whats-on/event/${ev.id}/`,
    image: ev.largeimageurl || ev.imageurl || "",
    artistsNorm,
  };
}
