/** Parse an ISO date (YYYY-MM-DD) as LOCAL midnight, not UTC. Using bare
 *  `new Date(iso)` parses as UTC and shifts the day for some timezones. */
export function parseLocalDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function todayIso(): string {
  const d = new Date();
  return toIso(d);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysIso(iso: string, n: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

export function nextDay(iso: string): string {
  return addDaysIso(iso, 1);
}

/** Day of week for an ISO date, 0 = Sunday … 6 = Saturday (local time). */
export function dayOfWeek(iso: string): number {
  return parseLocalDate(iso).getDay();
}

/** [minDate, maxDate] window we ask the upstream for and trim results to. */
export function dateRange(windowDays: number): { minDate: string; maxDate: string } {
  const minDate = todayIso();
  return { minDate, maxDate: addDaysIso(minDate, windowDays) };
}

/** YYYYMMDDTHHMMSS for date + time, rolling the day forward if hours wrap. */
export function plusHours(dateIso: string, hhmm: string, hrs: number): string {
  const [H, M] = hhmm.split(":").map(Number);
  let h = H + hrs;
  let day = dateIso;
  while (h >= 24) {
    h -= 24;
    day = nextDay(day);
  }
  return (
    day.replace(/-/g, "") + "T" + String(h).padStart(2, "0") + String(M).padStart(2, "0") + "00"
  );
}

export function localStamp(dateIso: string, hhmm: string): string {
  return dateIso.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00";
}

export function fmtDateHeader(iso: string): string {
  const d = parseLocalDate(iso);
  const dow = d.toLocaleDateString("en-GB", { weekday: "long" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  return `${dow} ${d.getDate()} ${month}`;
}

/** Label for a "YYYY-MM" month chip, e.g. "May" or "Jan 27". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return month + (y !== new Date().getFullYear() ? " " + String(y).slice(2) : "");
}
