import { describe, it, expect } from "vitest";
import { buildDigest } from "./digest";
import type { Gig } from "./types";

function gig(o: Partial<Gig>): Gig {
  return {
    id: "x",
    name: "",
    venue: "",
    capacity: null,
    size: "unknown",
    date: "2026-05-10",
    door: "",
    price: null,
    isFree: false,
    lat: null,
    lng: null,
    genres: [],
    description: "",
    url: "",
    image: "",
    artists: [],
    artistsNorm: [],
    ...o,
  };
}

describe("buildDigest", () => {
  it("summarises totals, matches, free count and cheapest price", () => {
    const d = buildDigest([
      gig({ price: 12 }),
      gig({ price: 8, match: "you" }),
      gig({ isFree: true, price: 0, match: "similar" }),
      gig({ price: null }),
    ]);
    expect(d.total).toBe(4);
    expect(d.matches).toBe(2);
    expect(d.freeCount).toBe(1);
    expect(d.cheapest).toBe(0);
  });

  it("finds the busiest day", () => {
    const d = buildDigest([
      gig({ date: "2026-05-10" }),
      gig({ date: "2026-05-11" }),
      gig({ date: "2026-05-11" }),
    ]);
    expect(d.busiest).toEqual({ date: "2026-05-11", count: 2 });
  });

  it("handles an empty set", () => {
    const d = buildDigest([]);
    expect(d).toEqual({ total: 0, matches: 0, cheapest: null, freeCount: 0, busiest: null });
  });
});
