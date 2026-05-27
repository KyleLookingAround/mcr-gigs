import { describe, it, expect } from "vitest";
import { compareGigs, isSortMode, SORT_MODES } from "./sort";
import type { Gig } from "./types";

function gig(overrides: Partial<Gig>): Gig {
  return {
    id: "x",
    name: "Band",
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
    ...overrides,
  };
}

function order(mode: Parameters<typeof compareGigs>[0], gigs: Gig[]): string[] {
  return gigs
    .slice()
    .sort(compareGigs(mode))
    .map((g) => g.id);
}

describe("isSortMode", () => {
  it("accepts known modes and rejects others", () => {
    for (const m of SORT_MODES) expect(isSortMode(m)).toBe(true);
    expect(isSortMode("nonsense")).toBe(false);
  });
});

describe("compareGigs", () => {
  const cheap = gig({ id: "cheap", price: 5 });
  const dear = gig({ id: "dear", price: 30 });
  const unknown = gig({ id: "unknown", price: null });

  it("sorts price ascending with unknown prices last", () => {
    expect(order("price-asc", [dear, unknown, cheap])).toEqual(["cheap", "dear", "unknown"]);
  });

  it("sorts price descending with unknown prices still last", () => {
    expect(order("price-desc", [cheap, unknown, dear])).toEqual(["dear", "cheap", "unknown"]);
  });

  it("sorts capacity largest first with unknown capacity last", () => {
    const small = gig({ id: "small", capacity: 200 });
    const big = gig({ id: "big", capacity: 2000 });
    const none = gig({ id: "none", capacity: null });
    expect(order("cap-desc", [small, none, big])).toEqual(["big", "small", "none"]);
  });

  it("relevance floats saved, then your-artist, then similar matches", () => {
    const plain = gig({ id: "plain" });
    const saved = gig({ id: "saved", saved: true });
    const you = gig({ id: "you", match: "you" });
    const similar = gig({ id: "similar", match: "similar" });
    expect(order("relevance", [plain, similar, you, saved])).toEqual([
      "saved",
      "you",
      "similar",
      "plain",
    ]);
  });

  it("relevance ranks shared-with-you above matches and followed venues", () => {
    const plain = gig({ id: "plain" });
    const shared = gig({ id: "shared", shared: true });
    const followed = gig({ id: "followed", followedVenue: true });
    const you = gig({ id: "you", match: "you" });
    expect(order("relevance", [plain, followed, you, shared])).toEqual([
      "shared",
      "you",
      "followed",
      "plain",
    ]);
  });
});
