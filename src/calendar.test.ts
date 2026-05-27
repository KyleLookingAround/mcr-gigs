import { describe, it, expect } from "vitest";
import { buildCalendar, heatLevel } from "./calendar";
import type { Gig } from "./types";

function gig(date: string, o: Partial<Gig> = {}): Gig {
  return {
    id: date + Math.random(),
    name: "",
    venue: "",
    capacity: null,
    size: "unknown",
    date,
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

describe("buildCalendar", () => {
  it("lays out a Monday-first month with correct leading padding", () => {
    // 1 May 2026 is a Friday → 4 leading empty cells (Mon..Thu).
    const months = buildCalendar([gig("2026-05-01"), gig("2026-05-01", { match: "you" })]);
    expect(months).toHaveLength(1);
    const first = months[0];
    expect(first.ym).toBe("2026-05");
    expect(first.weeks[0].slice(0, 4).every((c) => c.date === "")).toBe(true);
    const may1 = first.weeks[0][4];
    expect(may1.date).toBe("2026-05-01");
    expect(may1.count).toBe(2);
    expect(may1.matches).toBe(1);
  });

  it("pads every week to 7 cells and covers all month days", () => {
    const months = buildCalendar([gig("2026-02-01")]);
    const cells = months[0].weeks.flat();
    expect(cells.length % 7).toBe(0);
    expect(cells.filter((c) => c.date).length).toBe(28); // Feb 2026
  });

  it("returns one block per distinct month, sorted", () => {
    const months = buildCalendar([gig("2026-06-15"), gig("2026-05-02")]);
    expect(months.map((m) => m.ym)).toEqual(["2026-05", "2026-06"]);
  });
});

describe("heatLevel", () => {
  it("buckets counts into 0–4", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(2)).toBe(1);
    expect(heatLevel(5)).toBe(2);
    expect(heatLevel(10)).toBe(3);
    expect(heatLevel(11)).toBe(4);
  });
});
