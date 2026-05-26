import { describe, it, expect } from "vitest";
import { pickPhrase, matchLegend, LEGENDS } from "./phrases";

describe("pickPhrase", () => {
  const list = ["a", "b", "c"] as const;

  it("is deterministic when given an index", () => {
    expect(pickPhrase(list, 0)).toBe("a");
    expect(pickPhrase(list, 1)).toBe("b");
    expect(pickPhrase(list, 2)).toBe("c");
  });

  it("wraps indices out of range", () => {
    expect(pickPhrase(list, 3)).toBe("a");
    expect(pickPhrase(list, -1)).toBe("c");
  });

  it("always returns a member of the list when random", () => {
    for (let n = 0; n < 50; n++) expect(list).toContain(pickPhrase(list));
  });
});

describe("matchLegend", () => {
  it("returns null for empty or non-matching queries", () => {
    expect(matchLegend("")).toBeNull();
    expect(matchLegend("   ")).toBeNull();
    expect(matchLegend("some random dj")).toBeNull();
  });

  it("matches a legend by name, case-insensitively", () => {
    expect(matchLegend("Oasis")).toBe(LEGENDS["oasis"]);
    expect(matchLegend("OASIS")).toBe(LEGENDS["oasis"]);
  });

  it("matches when the legend is part of a longer query", () => {
    expect(matchLegend("happy mondays tribute")).toBe(LEGENDS["happy mondays"]);
  });

  it("prefers the most specific (longest) key", () => {
    expect(matchLegend("the stone roses")).toBe(LEGENDS["the stone roses"]);
  });
});
