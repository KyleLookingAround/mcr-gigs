import { describe, it, expect } from "vitest";
import { venueCap, sizeBucket } from "./venues";

describe("venueCap", () => {
  it("looks up capacity case-insensitively", () => {
    expect(venueCap("Deaf Institute")).toBe(260);
    expect(venueCap("  GORILLA ")).toBe(600);
  });
  it("returns undefined for unknown venues", () => {
    expect(venueCap("Some Random Pub")).toBeUndefined();
  });
});

describe("sizeBucket", () => {
  it("buckets by capacity", () => {
    expect(sizeBucket(null)).toBe("unknown");
    expect(sizeBucket(undefined)).toBe("unknown");
    expect(sizeBucket(200)).toBe("small");
    expect(sizeBucket(300)).toBe("small");
    expect(sizeBucket(800)).toBe("mid");
    expect(sizeBucket(1200)).toBe("mid");
    expect(sizeBucket(5000)).toBe("large");
  });
});
