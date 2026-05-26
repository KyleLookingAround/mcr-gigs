import { describe, it, expect } from "vitest";
import { haversineMetres, walkMinutes, parseDoorMinutes, planCrawls } from "./geo";
import type { Gig } from "./types";

function gig(over: Partial<Gig>): Gig {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Show",
    venue: "Venue",
    capacity: null,
    size: "unknown",
    date: "2026-06-01",
    door: "19:00",
    price: null,
    isFree: false,
    lat: null,
    lng: null,
    genres: [],
    description: "",
    url: "",
    image: "",
    artistsNorm: [],
    ...over,
  };
}

describe("haversineMetres", () => {
  it("is zero for the same point", () => {
    expect(haversineMetres(53.48, -2.24, 53.48, -2.24)).toBe(0);
  });

  it("matches a known short Manchester distance within tolerance", () => {
    // Deaf Institute ~ Soup Kitchen, ~700m apart.
    const d = haversineMetres(53.4742, -2.2406, 53.4847, -2.2376);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1300);
  });

  it("is symmetric", () => {
    const a = haversineMetres(53.48, -2.24, 53.49, -2.25);
    const b = haversineMetres(53.49, -2.25, 53.48, -2.24);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("walkMinutes", () => {
  it("scales with distance at the configured pace", () => {
    expect(walkMinutes(800)).toBeCloseTo(10, 5);
    expect(walkMinutes(0)).toBe(0);
  });
});

describe("parseDoorMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseDoorMinutes("19:30")).toBe(19 * 60 + 30);
    expect(parseDoorMinutes("00:00")).toBe(0);
  });
  it("rejects junk and out-of-range", () => {
    expect(parseDoorMinutes("")).toBeNull();
    expect(parseDoorMinutes("doors")).toBeNull();
    expect(parseDoorMinutes("25:00")).toBeNull();
    expect(parseDoorMinutes("12:75")).toBeNull();
  });
});

describe("planCrawls", () => {
  // Three close central venues, staggered door times → one 3-stop crawl.
  const a = gig({ venue: "A", lat: 53.476, lng: -2.241, door: "19:00" });
  const b = gig({ venue: "B", lat: 53.479, lng: -2.243, door: "20:00" });
  const c = gig({ venue: "C", lat: 53.482, lng: -2.245, door: "21:00" });

  it("chains nearby, time-ordered venues into a crawl", () => {
    const [crawl] = planCrawls([c, a, b]);
    expect(crawl.gigs.map((g) => g.venue)).toEqual(["A", "B", "C"]);
    expect(crawl.date).toBe("2026-06-01");
    expect(crawl.totalMetres).toBeGreaterThan(0);
  });

  it("ignores gigs without coordinates or a door time", () => {
    const noCoords = gig({ venue: "X", door: "20:00" });
    const noDoor = gig({ venue: "Y", lat: 53.48, lng: -2.24, door: "" });
    expect(planCrawls([noCoords, noDoor])).toEqual([]);
  });

  it("drops venues too far to walk between sets", () => {
    const far = gig({ venue: "Far", lat: 53.6, lng: -2.6, door: "20:00" });
    expect(planCrawls([a, far])).toEqual([]);
  });

  it("needs a real gap between door times", () => {
    const near = gig({ venue: "B2", lat: 53.4761, lng: -2.2411, door: "19:05" });
    expect(planCrawls([a, near])).toEqual([]);
  });

  it("collapses multiple gigs at one venue to a single stop", () => {
    const a2 = gig({ venue: "A", lat: 53.476, lng: -2.241, door: "19:30" });
    const [crawl] = planCrawls([a, a2, b, c]);
    const venues = crawl.gigs.map((g) => g.venue);
    expect(venues).toEqual(["A", "B", "C"]);
  });

  it("plans independently per night", () => {
    const night2 = [
      gig({ date: "2026-06-02", venue: "D", lat: 53.476, lng: -2.241, door: "19:00" }),
      gig({ date: "2026-06-02", venue: "E", lat: 53.479, lng: -2.243, door: "20:00" }),
    ];
    const crawls = planCrawls([a, b, c, ...night2]);
    expect(crawls.length).toBe(2);
    expect(crawls.map((x) => x.date)).toEqual(["2026-06-01", "2026-06-02"]);
  });
});
