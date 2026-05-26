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

export function buildIcs(g: Gig): string {
  let dtStart: string;
  let dtEnd: string;
  if (g.door) {
    dtStart = "DTSTART:" + localStamp(g.date, g.door);
    dtEnd = "DTEND:" + plusHours(g.date, g.door, 3);
  } else {
    dtStart = "DTSTART;VALUE=DATE:" + g.date.replace(/-/g, "");
    dtEnd = "DTEND;VALUE=DATE:" + nextDay(g.date).replace(/-/g, "");
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MCR Gigs//EN",
    "BEGIN:VEVENT",
    "UID:mcrgigs-" + g.id + "@mcr-gigs",
    "DTSTAMP:" + stamp,
    dtStart,
    dtEnd,
    "SUMMARY:" + icsEscape(g.name),
    "LOCATION:" + icsEscape(g.venue),
    "DESCRIPTION:" + icsEscape(g.url),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(g: Gig): void {
  const blob = new Blob([buildIcs(g)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gig-${g.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
