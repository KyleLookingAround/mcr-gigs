import type { Gig } from "./types";
import { nextDay, plusHours, localStamp } from "./dates";

export function gcalLink(g: Gig): string {
  let dates: string;
  if (g.door) {
    dates = `${localStamp(g.date, g.door)}/${plusHours(g.date, g.door, 3)}`;
  } else {
    dates = `${g.date.replace(/-/g, "")}/${nextDay(g.date).replace(/-/g, "")}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: g.name + (g.venue ? ` @ ${g.venue}` : ""),
    dates,
    details: g.url,
    location: g.venue,
    ctz: "Europe/London",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsEscape(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function vevent(g: Gig, stamp: string): string {
  let dtStart: string;
  let dtEnd: string;
  if (g.door) {
    dtStart = "DTSTART:" + localStamp(g.date, g.door);
    dtEnd = "DTEND:" + plusHours(g.date, g.door, 3);
  } else {
    dtStart = "DTSTART;VALUE=DATE:" + g.date.replace(/-/g, "");
    dtEnd = "DTEND;VALUE=DATE:" + nextDay(g.date).replace(/-/g, "");
  }
  return [
    "BEGIN:VEVENT",
    "UID:mcrgigs-" + g.id + "@mcr-gigs",
    "DTSTAMP:" + stamp,
    dtStart,
    dtEnd,
    "SUMMARY:" + icsEscape(g.name),
    "LOCATION:" + icsEscape(g.venue),
    "DESCRIPTION:" + icsEscape(g.url),
    "END:VEVENT",
  ].join("\r\n");
}

function wrapCalendar(events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MCR Gigs//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

export function buildIcs(g: Gig): string {
  return wrapCalendar([vevent(g, nowStamp())]);
}

export function buildIcsMany(gigs: Gig[]): string {
  const stamp = nowStamp();
  return wrapCalendar(gigs.map((g) => vevent(g, stamp)));
}

function download(filename: string, body: string): void {
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadIcs(g: Gig): void {
  download(`gig-${g.id}.ics`, buildIcs(g));
}

export function downloadIcsMany(gigs: Gig[]): void {
  download("mcr-gigs-saved.ics", buildIcsMany(gigs));
}
