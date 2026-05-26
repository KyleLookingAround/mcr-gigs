export interface ParsedPrice {
  /** Lowest known price in GBP, 0 for free, null for unknown. */
  price: number | null;
  isFree: boolean;
}

/** Robustly parse Skiddle's free-text entryprice.
 *  Handles numbers, "Free", ranges ("10-15" -> 10), and decorated strings
 *  ("from £12.50 adv" -> 12.50). Ranges resolve to the lowest price. */
export function parsePrice(raw: string | number | null | undefined): ParsedPrice {
  if (raw == null) return { price: null, isFree: false };

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { price: null, isFree: false };
    return { price: raw, isFree: raw === 0 };
  }

  const s = raw.trim().toLowerCase();
  if (s === "") return { price: null, isFree: false };
  if (/\bfree\b/.test(s)) return { price: 0, isFree: true };

  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums) return { price: null, isFree: false };

  const price = Math.min(...nums.map(Number));
  return { price, isFree: price === 0 };
}
