// Villain's Lair: the world on the big map. A rough equirectangular world,
// 48 × 20 cells (7.5° each, from 80° N), and a few cities to aim pizza at.
import type { Rect } from "../../layout.ts";

/** Land per row: [first col, last col] runs. */
const LAND: [number, number][][] = [
  /* 0 */ [[17, 21], [31, 40]],
  /* 1 */ [[2, 16], [18, 21], [25, 28], [29, 46]],
  /* 2 */ [[2, 15], [18, 20], [24, 47]],
  /* 3 */ [[3, 5], [6, 15], [23, 23], [24, 45]],
  /* 4 */ [[7, 15], [23, 42]],
  /* 5 */ [[7, 14], [22, 28], [29, 41]],
  /* 6 */ [[8, 12], [21, 39]],
  /* 7 */ [[9, 11], [21, 31], [33, 38]],
  /* 8 */ [[11, 12], [21, 31], [34, 34], [37, 38]],
  /* 9 */ [[12, 16], [22, 30], [38, 39]],
  /* 10 */ [[13, 18], [24, 29], [37, 41]],
  /* 11 */ [[13, 19], [25, 29], [40, 43]],
  /* 12 */ [[13, 19], [25, 29], [39, 44]],
  /* 13 */ [[14, 18], [26, 29], [30, 30], [39, 44]],
  /* 14 */ [[14, 17], [26, 28], [39, 43]],
  /* 15 */ [[14, 16], [27, 27], [42, 42], [46, 46]],
  /* 16 */ [[14, 15], [46, 46]],
  /* 17 */ [[14, 14]],
  /* 18 */ [],
  /* 19 */ [[4, 20], [24, 44]],
];

export const MAP_COLS = 48;
export const MAP_ROWS = 20;

export function isLand(col: number, row: number): boolean {
  const runs = LAND[row];
  return runs !== undefined && runs.some(([a, z]) => col >= a && col <= z);
}

/** Where a longitude and latitude fall on the map rect. */
export function mapPoint(map: Rect, lon: number, lat: number): { x: number; y: number } {
  const u = (lon + 180) / 360;
  const v = (80 - lat) / 150;
  return { x: Math.round(map.x + 2 + u * (map.w - 4)), y: Math.round(map.y + 2 + Math.max(0, Math.min(1, v)) * (map.h - 4)) };
}

/** The longitude and latitude at a point on the map rect (the inverse of `mapPoint`). */
export function mapLonLat(map: Rect, x: number, y: number): { lon: number; lat: number } {
  const u = Math.max(0, Math.min(1, (x - map.x - 2) / (map.w - 4)));
  const v = Math.max(0, Math.min(1, (y - map.y - 2) / (map.h - 4)));
  return { lon: u * 360 - 180, lat: 80 - v * 150 };
}

/** Cities that get a pizza when the map "targets" them. */
export const CITIES: [string, number, number][] = [
  ["Lisbon", -9, 38.7],
  ["Reykjavik", -22, 64],
  ["Nairobi", 36.8, -1.3],
  ["Lima", -77, -12],
  ["Osaka", 135.5, 34.7],
  ["Oslo", 10.7, 59.9],
  ["Cairo", 31.2, 30],
  ["Sydney", 151.2, -33.9],
  ["Toronto", -79.4, 43.7],
  ["Mumbai", 72.8, 19],
  ["Buenos Aires", -58.4, -34.6],
  ["Anchorage", -150, 61.2],
  ["Honolulu", -157.8, 21.3],
  ["Cape Town", 18.4, -33.9],
  ["Seoul", 127, 37.5],
  ["Mexico City", -99.1, 19.4],
  ["Helsinki", 25, 60.2],
  ["Perth", 115.9, -31.9],
  ["Naples", 14.3, 40.9],
  ["Montreal", -73.6, 45.5],
];

/** Blinking lights on the map: [lon, lat] of the base's "outposts" (snack depots, mostly). */
export const OUTPOSTS: [number, number][] = [
  [-120, 45],
  [-95, 32],
  [-60, -15],
  [-45, 64],
  [2, 48],
  [24, 8],
  [45, 52],
  [78, 25],
  [104, 60],
  [118, 30],
  [140, -25],
  [30, -20],
  [-150, 63],
  [170, -42],
];
