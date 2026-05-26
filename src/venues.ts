import type { RoomSize } from "./types";

/** Hand-curated capacities for Manchester venues Skiddle doesn't report a
 *  capacity for. Used only as a fallback behind any structured capacity. */
export const VENUE_INTEL: Record<string, number> = {
  "deaf institute": 260,
  "the deaf institute": 260,
  yes: 250,
  "yes basement": 250,
  "yes pink room": 350,
  "yes (basement)": 250,
  "band on the wall": 500,
  "night & day cafe": 280,
  "night and day cafe": 280,
  "night & day": 280,
  soup: 250,
  "soup kitchen": 250,
  gullivers: 170,
  "the castle hotel": 80,
  "castle hotel": 80,
  "the peer hat": 90,
  "peer hat": 90,
  "the eagle inn": 100,
  "eagle inn": 100,
  "new century hall": 1000,
  "new century": 1000,
  aatma: 150,
  gorilla: 600,
  "the ritz": 1500,
  "o2 ritz": 1500,
  "manchester o2 ritz": 1500,
  "manchester academy 1": 2300,
  "academy 1": 2300,
  "manchester academy 2": 900,
  "academy 2": 900,
  "manchester academy 3": 450,
  "academy 3": 450,
  "albert hall": 2000,
  "manchester albert hall": 2000,
  "halle st peter's": 300,
  "halle st peters": 300,
  "stoller hall": 480,
  "the stoller hall": 480,
  "the white hotel": 300,
  "white hotel": 300,
  rebellion: 350,
  "rebellion manchester": 350,
  "manchester apollo": 3500,
  "o2 apollo manchester": 3500,
  "o2 apollo": 3500,
  "ao arena": 21000,
  "manchester ao arena": 21000,
  "co-op live": 23500,
  "co op live": 23500,
  "matt and phreds": 110,
  "matt & phred's": 110,
  "the bread shed": 350,
  "bread shed": 350,
  "factory international": 1600,
  "aviva studios": 1600,
};

export function venueCap(name: string): number | undefined {
  return VENUE_INTEL[name.toLowerCase().trim()];
}

export function sizeBucket(cap: number | null | undefined): RoomSize {
  if (cap == null) return "unknown";
  if (cap <= 300) return "small";
  if (cap <= 1200) return "mid";
  return "large";
}
