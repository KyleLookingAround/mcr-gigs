import type { GeoPoint } from "./geo";

/** Central Manchester National Rail stations, for "distance to the nearest
 *  station" on the map. Coordinates are the station entrances, approximately. */
export const STATIONS: readonly GeoPoint[] = [
  { name: "Piccadilly", lat: 53.4773, lng: -2.2309 },
  { name: "Victoria", lat: 53.4875, lng: -2.2425 },
  { name: "Oxford Road", lat: 53.4738, lng: -2.242 },
  { name: "Deansgate", lat: 53.4744, lng: -2.2509 },
];
