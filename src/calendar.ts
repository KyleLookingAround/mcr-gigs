import type { Gig } from "./types";
import { parseLocalDate, toIso } from "./dates";

export interface CalDay {
  /** ISO date, or "" for a padding cell outside the month. */
  date: string;
  count: number;
  matches: number;
}

export interface CalMonth {
  ym: string; // "YYYY-MM"
  weeks: CalDay[][]; // rows of 7, Monday-first
}

const EMPTY: CalDay = { date: "", count: 0, matches: 0 };

/** Monday-first weekday index for a JS date: Mon=0 … Sun=6. */
function monIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Build month grids (Monday-first) for every month present in the gigs, with
 *  per-day gig and taste-match counts. */
export function buildCalendar(gigs: Gig[]): CalMonth[] {
  const counts = new Map<string, { count: number; matches: number }>();
  for (const g of gigs) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.date)) continue;
    const c = counts.get(g.date) || { count: 0, matches: 0 };
    c.count++;
    if (g.match === "you" || g.match === "similar") c.matches++;
    counts.set(g.date, c);
  }

  const months = [...new Set(gigs.map((g) => g.date.slice(0, 7)))]
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
    .sort();

  return months.map((ym) => {
    const [y, m] = ym.split("-").map(Number);
    const first = parseLocalDate(`${ym}-01`);
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: CalDay[] = [];
    for (let i = 0; i < monIndex(first); i++) cells.push(EMPTY);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${ym}-${String(day).padStart(2, "0")}`;
      const c = counts.get(date) || { count: 0, matches: 0 };
      cells.push({ date, count: c.count, matches: c.matches });
    }
    while (cells.length % 7 !== 0) cells.push(EMPTY);

    const weeks: CalDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { ym, weeks };
  });
}

/** Heat bucket (0–4) for a day's gig count, for shading the calendar. */
export function heatLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

/** Today's date in ISO, exposed so the calendar can mark it without importing
 *  dates.ts at the call site. */
export function todayCalIso(): string {
  return toIso(new Date());
}
