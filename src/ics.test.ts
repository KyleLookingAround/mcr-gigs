import { describe, it, expect } from "vitest";
import { buildIcs, buildIcsMany, gcalLink } from "./ics";
import type { Gig } from "./types";

function gig(overrides: Partial<Gig> = {}): Gig {
  return {
    id: "99",
    name: "Test, Band",
    venue: "The Venue",
    capacity: null,
    size: "unknown",
    date: "2026-05-10",
    door: "19:30",
    price: null,
    isFree: false,
    lat: null,
    lng: null,
    genres: [],
    description: "",
    url: "https://example.com/e/99",
    image: "",
    artists: [],
    artistsNorm: [],
    ...overrides,
  };
}

describe("buildIcs", () => {
  it("emits a timed event ending three hours after doors", () => {
    const ics = buildIcs(gig());
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20260510T193000");
    expect(ics).toContain("DTEND:20260510T223000");
    expect(ics).toContain("UID:mcrgigs-99@mcr-gigs");
    expect(ics).toContain("SUMMARY:Test\\, Band"); // comma escaped
  });

  it("emits an all-day event when there is no door time", () => {
    const ics = buildIcs(gig({ door: "" }));
    expect(ics).toContain("DTSTART;VALUE=DATE:20260510");
    expect(ics).toContain("DTEND;VALUE=DATE:20260511");
  });
});

describe("buildIcsMany", () => {
  it("wraps several events in a single calendar", () => {
    const ics = buildIcsMany([gig({ id: "1" }), gig({ id: "2" })]);
    expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("UID:mcrgigs-1@mcr-gigs");
    expect(ics).toContain("UID:mcrgigs-2@mcr-gigs");
  });
});

describe("gcalLink", () => {
  it("builds a Google Calendar template URL", () => {
    const url = gcalLink(gig());
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("20260510T193000");
  });
});
