import { describe, it, expect } from "vitest";
import { normName, computeMatch } from "./matching";
import type { Gig } from "./types";

function gig(artistsNorm: string[]): Gig {
  return { id: "1", name: "", venue: "", artistsNorm } as Gig;
}

describe("normName", () => {
  it("strips accents and punctuation", () => {
    expect(normName("Sigur Rós")).toBe("sigur ros");
    expect(normName("Björk!")).toBe("bjork");
    expect(normName("  Godspeed You! Black Emperor ")).toBe("godspeed you black emperor");
  });
});

describe("computeMatch", () => {
  it("returns null with no taste data", () => {
    expect(computeMatch(gig(["radiohead"]), new Set(), new Set())).toBeNull();
  });

  it("flags your artists", () => {
    expect(
      computeMatch(gig(["radiohead live in manchester"]), new Set(["radiohead"]), new Set()),
    ).toBe("you");
  });

  it("flags similar artists when not a top match", () => {
    expect(computeMatch(gig(["interpol"]), new Set(["editors"]), new Set(["interpol"]))).toBe(
      "similar",
    );
  });

  it("prefers a top match over a similar one", () => {
    expect(computeMatch(gig(["interpol"]), new Set(["interpol"]), new Set(["interpol"]))).toBe(
      "you",
    );
  });

  it("matches via structured lineup, not only the title", () => {
    const g = gig(["the headliner", "radiohead"]);
    expect(computeMatch(g, new Set(["radiohead"]), new Set())).toBe("you");
  });

  it("does not partial-match inside a longer word", () => {
    expect(computeMatch(gig(["yesterday people"]), new Set(["yes"]), new Set())).toBeNull();
  });

  it("matches short names of two or more characters", () => {
    expect(computeMatch(gig(["u2 tribute night"]), new Set(["u2"]), new Set())).toBe("you");
  });
});
