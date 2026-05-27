const R = 6_371_000; // Earth radius, metres
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in metres. */
export function haversineMetres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Metres rendered as a short imperial distance, e.g. "0.4 mi" or "<0.1 mi". */
export function formatMiles(metres: number): string {
  const mi = metres / 1609.344;
  return mi < 0.1 ? "<0.1 mi" : `${mi.toFixed(1)} mi`;
}

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
}

/** The closest point to a location, with its great-circle distance in metres.
 *  Returns null only when given no candidates. */
export function nearest(
  lat: number,
  lng: number,
  points: readonly GeoPoint[],
): { name: string; metres: number } | null {
  let best: { name: string; metres: number } | null = null;
  for (const p of points) {
    const metres = haversineMetres(lat, lng, p.lat, p.lng);
    if (!best || metres < best.metres) best = { name: p.name, metres };
  }
  return best;
}
