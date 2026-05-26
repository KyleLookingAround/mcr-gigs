import { describe, it, expect } from "vitest";
import { parsePrice } from "./price";

describe("parsePrice", () => {
  it("treats null/empty/unparseable as unknown", () => {
    expect(parsePrice(null)).toEqual({ price: null, isFree: false });
    expect(parsePrice(undefined)).toEqual({ price: null, isFree: false });
    expect(parsePrice("")).toEqual({ price: null, isFree: false });
    expect(parsePrice("sold out")).toEqual({ price: null, isFree: false });
  });

  it("recognises free events", () => {
    expect(parsePrice("Free")).toEqual({ price: 0, isFree: true });
    expect(parsePrice("free entry")).toEqual({ price: 0, isFree: true });
    expect(parsePrice(0)).toEqual({ price: 0, isFree: true });
    expect(parsePrice("£0")).toEqual({ price: 0, isFree: true });
  });

  it("takes the lowest price from a range rather than concatenating digits", () => {
    // The old parser turned "10-15" into 1015.
    expect(parsePrice("10-15")).toEqual({ price: 10, isFree: false });
    expect(parsePrice("£12.50 adv / £15 door")).toEqual({ price: 12.5, isFree: false });
  });

  it("parses decorated single prices", () => {
    expect(parsePrice("from £8")).toEqual({ price: 8, isFree: false });
    expect(parsePrice("£12.50")).toEqual({ price: 12.5, isFree: false });
    expect(parsePrice(20)).toEqual({ price: 20, isFree: false });
  });
});
