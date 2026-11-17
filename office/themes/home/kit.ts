// Home Office: the palette and small helpers its modules share. A leafy
// neighborhood: grey asphalt and pale sidewalks, brick and stucco row
// houses, each apartment with its own wallpaper and floor, the park's grass.
import { cached, Grid, hash, OUTLINE, rect } from "../../themekit.ts";

export { OUTLINE, rect };

export const C = {
  // The street.
  asphalt: "#5b5e68",
  asphaltHi: "#666a74",
  asphaltLo: "#4f525b",
  lane: "#e9e4d6",
  sidewalk: "#cfc9bc",
  sidewalkHi: "#dbd6ca",
  sidewalkLo: "#b9b2a4",
  curb: "#9d978b",
  curbLo: "#827c71",
  // Grass and plants.
  grass: "#76b35e",
  grassHi: "#8cc66f",
  grassLo: "#5f9a4c",
  grassDk: "#4a7d3c",
  leaf: "#4f8f45",
  leafHi: "#6aab55",
  leafLo: "#3a7035",
  bark: "#7a5236",
  barkLo: "#5a3b26",
  soil: "#8a6244",
  // Brick and stucco outside.
  brick: "#b5614a",
  brickHi: "#c9755a",
  brickLo: "#8f4a38",
  mortar: "#d8c3ae",
  stucco: "#e9dcc4",
  stuccoLo: "#d2c2a6",
  roofCap: "#6b4a3e",
  // Inside.
  oak: "#c99a66",
  oakHi: "#d4a874",
  oakLo: "#a87a4a",
  pale: "#e1c9a0",
  paleLo: "#c9ae84",
  walnut: "#8a5a3c",
  walnutLo: "#6e452c",
  tileA: "#e9e3d6",
  tileB: "#d6cfbf",
  baseboard: "#f4efe4",
  // Fabric, wood, metal.
  white: "#f8f5ee",
  cream: "#f3ead6",
  steel: "#aeb6bf",
  steelLo: "#7d8792",
  dark: "#2f2b36",
  screen: "#1c2230",
  glass: "#bfe0f0",
  glassLo: "#8fbfd8",
  warm: "#ffd58a",
  amber: "#ffb35a",
  // The park screen.
  frame: "#33313b",
  frameHi: "#4a4855",
};

/** Wallpapers for the apartments: base, stripe or dot, baseboard shadow. */
export const PAPERS: { base: string; pattern: string; kind: "stripe" | "dot" | "plain" | "check" }[] = [
  { base: "#d6ead9", pattern: "#c3dec8", kind: "stripe" },
  { base: "#f4dccb", pattern: "#ebc9b3", kind: "dot" },
  { base: "#e0d8f0", pattern: "#d0c5e6", kind: "stripe" },
  { base: "#d4e4f2", pattern: "#c0d6ea", kind: "check" },
  { base: "#f3e8c2", pattern: "#e8d9a6", kind: "dot" },
  { base: "#f2d6dc", pattern: "#e8c2ca", kind: "plain" },
  { base: "#e6e1d6", pattern: "#d8d1c2", kind: "stripe" },
  { base: "#cfe6e6", pattern: "#bcd9d9", kind: "dot" },
];

/** Floors: planks (light or dark), tiles, a carpet. */
export const FLOORS = ["oak", "pale", "tiles", "walnut", "oak", "carpet", "pale", "oak"] as const;

/** Apartment accent colors: armchair, blanket, rug. */
export const FABRICS = ["#e2a33c", "#5f8fc4", "#d0627a", "#5aa37a", "#8a6ac4", "#e07a4a", "#4aa3b0", "#c4a24a", "#7a8a9a"];

/** House fronts outside, by seed: brick or stucco in a few colors. */
export const FRONTS = [
  { wall: "#b5614a", hi: "#c9755a", lo: "#8f4a38", brick: true },
  { wall: "#e9dcc4", hi: "#f4ead6", lo: "#cdbb9c", brick: false },
  { wall: "#9fb7c9", hi: "#b4cad9", lo: "#7f97a9", brick: false },
  { wall: "#a3563f", hi: "#b86a50", lo: "#7f4230", brick: true },
  { wall: "#e3c58a", hi: "#eed6a2", lo: "#c4a56c", brick: false },
  { wall: "#c9a3b4", hi: "#d9b8c6", lo: "#a8849a", brick: false },
];

/** A Grid sprite drawn once and cached (the key gets the theme prefix); outlined unless told not to. */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`home|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** Cached per key, for the live hooks. */
export function memo<T>(key: string, build: () => T): T {
  return cached(`home|${key}`, build);
}

/** A stable 0..1 from two ints. */
export function h2(a: number, b: number): number {
  return (((Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0) % 10007) / 10007;
}

/** A stable small int from a string. */
export function hs(s: string): number {
  return hash(s) >>> 0;
}

/** Fill a pixel run on a context. */
export const px = rect;
