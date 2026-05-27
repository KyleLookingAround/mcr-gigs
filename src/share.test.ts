import { describe, it, expect } from "vitest";
import { serializeShare, parseShare } from "./share";

describe("serializeShare", () => {
  it("omits defaults to keep links short", () => {
    const hash = serializeShare({
      window: 14,
      days: [],
      sizes: ["small", "mid", "large", "unknown"],
      genres: [],
      maxPrice: undefined,
      freeOnly: false,
      sort: "relevance",
      foryou: [],
      saved: [],
    });
    expect(hash).toBe("w=14");
  });

  it("encodes only non-default fields", () => {
    const hash = serializeShare({
      window: 30,
      days: [5, 6],
      sizes: ["small"],
      freeOnly: true,
      sort: "price-asc",
      search: "punk",
      saved: ["a", "b"],
    });
    const p = new URLSearchParams(hash);
    expect(p.get("w")).toBe("30");
    expect(p.get("days")).toBe("5,6");
    expect(p.get("size")).toBe("small");
    expect(p.get("free")).toBe("1");
    expect(p.get("sort")).toBe("price-asc");
    expect(p.get("q")).toBe("punk");
    expect(p.get("sv")).toBe("a,b");
  });
});

describe("parseShare", () => {
  it("round-trips a populated state", () => {
    const input = {
      window: 30,
      days: [0, 5],
      sizes: ["small" as const, "mid" as const],
      genres: ["rock"],
      maxPrice: 20,
      freeOnly: true,
      sort: "cap-desc" as const,
      month: "2026-06",
      foryou: ["saved" as const, "venue" as const],
      search: "noise",
      saved: ["1", "2"],
    };
    expect(parseShare("#" + serializeShare(input))).toEqual(input);
  });

  it("drops malformed values rather than throwing", () => {
    const s = parseShare("#w=abc&days=9,foo&size=huge&sort=bogus&month=nope&price=-5&fy=ghost");
    expect(s.window).toBeUndefined();
    expect(s.days).toBeUndefined();
    expect(s.sizes).toBeUndefined();
    expect(s.sort).toBeUndefined();
    expect(s.month).toBeUndefined();
    expect(s.maxPrice).toBeUndefined();
    expect(s.foryou).toBeUndefined();
  });

  it("returns an empty object for an empty hash", () => {
    expect(parseShare("")).toEqual({});
    expect(parseShare("#")).toEqual({});
  });
});
