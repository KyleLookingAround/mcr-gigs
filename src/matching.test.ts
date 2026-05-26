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

  it("matches your artist named only in the description (support slot)", () => {
    const g = {
      id: "1",
      name: "Some Headliner",
      venue: "",
      artistsNorm: ["some headliner"],
      description: "Plus special guest Radiohead and friends.",
    } as Gig;
    expect(computeMatch(g, new Set(["radiohead"]), new Set())).toBe("you");
  });

  it("does not use the description for the noisier similar set", () => {
    const g = {
      id: "1",
      name: "Some Headliner",
      venue: "",
      artistsNorm: ["some headliner"],
      description: "A sound very much in the spirit of Interpol.",
    } as Gig;
    expect(computeMatch(g, new Set(), new Set(["interpol"]))).toBeNull();
  });
});
