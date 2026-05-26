import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  addDaysIso,
  nextDay,
  plusHours,
  localStamp,
  dateRange,
  fmtDateHeader,
  monthLabel,
  todayIso,
} from "./dates";

describe("date utils", () => {
  it("parses ISO dates at local midnight (no UTC day shift)", () => {
    const d = parseLocalDate("2026-05-10");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // May
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(0);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });

  it("rolls the day forward when door + hours wrap past midnight", () => {
    expect(plusHours("2026-05-10", "23:30", 3)).toBe("20260511T023000");
    expect(plusHours("2026-05-10", "19:00", 3)).toBe("20260510T220000");
  });

  it("formats a local timestamp", () => {
    expect(localStamp("2026-05-10", "19:30")).toBe("20260510T193000");
  });

  it("builds a window starting today", () => {
    const { minDate, maxDate } = dateRange(7);
    expect(minDate).toBe(todayIso());
    expect(maxDate).toBe(addDaysIso(minDate, 7));
  });

  it("renders a date header on the correct day", () => {
    expect(fmtDateHeader("2026-05-10")).toContain("10 May");
  });

  it("labels months, adding a year only when not the current one", () => {
    const y = new Date().getFullYear();
    expect(monthLabel(`${y}-06`)).toBe("Jun");
    expect(monthLabel(`${y + 4}-01`)).toContain(String(y + 4).slice(2));
  });
});
