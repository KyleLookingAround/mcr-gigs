import { describe, it, expect } from "vitest";
import { haversineMetres, formatMiles, nearest } from "./geo";

describe("haversineMetres", () => {
  it("is zero for the same point", () => {
    expect(haversineMetres(53.48, -2.24, 53.48, -2.24)).toBe(0);
  });

  it("matches a known short Manchester distance within tolerance", () => {
    // Deaf Institute ~ Soup Kitchen, ~1km apart.
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

describe("formatMiles", () => {
  it("rounds to one decimal", () => {
    expect(formatMiles(1609.344)).toBe("1.0 mi");
    expect(formatMiles(804.672)).toBe("0.5 mi");
  });

  it("collapses very short distances", () => {
    expect(formatMiles(50)).toBe("<0.1 mi");
    expect(formatMiles(0)).toBe("<0.1 mi");
  });
});

describe("nearest", () => {
  const points = [
    { name: "Piccadilly", lat: 53.4773, lng: -2.2309 },
    { name: "Victoria", lat: 53.4875, lng: -2.2425 },
  ];

  it("picks the closest point and reports the distance", () => {
    // A spot right by Victoria station.
    const r = nearest(53.4874, -2.2426, points);
    expect(r?.name).toBe("Victoria");
    expect(r?.metres).toBeLessThan(50);
  });

  it("returns null when there are no candidates", () => {
    expect(nearest(53.48, -2.24, [])).toBeNull();
  });
});
