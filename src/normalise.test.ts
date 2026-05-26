import { describe, it, expect } from "vitest";
import { normaliseGig } from "./normalise";
import type { SkiddleEvent } from "./types";

describe("normaliseGig", () => {
  it("normalises a full event", () => {
    const ev: SkiddleEvent = {
      id: 42,
      eventname: "Radiohead",
      venue: { name: "O2 Apollo", capacity: "3500" },
      openingtimes: { doorsopen: "19:30:00" },
      entryprice: "£25-40",
      genres: ["Rock", { name: "Alternative" }],
      artists: [{ name: "Radiohead" }, "Support Act"],
      description: "<p>An <b>evening</b> with the band.</p>",
      date: "2026-06-01",
      link: "https://example.com/e/42",
      largeimageurl: "https://img.example.com/42.jpg",
    };
    const g = normaliseGig(ev);
    expect(g.id).toBe("42");
    expect(g.name).toBe("Radiohead");
    expect(g.venue).toBe("O2 Apollo");
    expect(g.capacity).toBe(3500);
    expect(g.size).toBe("large");
    expect(g.door).toBe("19:30");
    expect(g.price).toBe(25);
    expect(g.isFree).toBe(false);
    expect(g.genres).toEqual(["rock", "alternative"]);
    expect(g.description).toBe("An evening with the band.");
    expect(g.image).toBe("https://img.example.com/42.jpg");
    expect(g.artistsNorm).toContain("radiohead");
    expect(g.artistsNorm).toContain("support act");
  });

  it("falls back to the curated capacity when none is structured", () => {
    const g = normaliseGig({ id: 7, eventname: "Gig", venue: { name: "Gorilla" } });
    expect(g.capacity).toBe(600);
    expect(g.size).toBe("mid");
  });

  it("handles missing fields gracefully", () => {
    const g = normaliseGig({ id: 1 });
    expect(g.door).toBe("");
    expect(g.price).toBeNull();
    expect(g.capacity).toBeNull();
    expect(g.size).toBe("unknown");
    expect(g.url).toContain("/event/1/");
  });
});
