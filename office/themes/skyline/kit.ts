// Sky Loft: the palette and a few drawing helpers shared by its modules.
import { cached, Grid, OUTLINE } from "../../themekit.ts";

export const C = {
  // polished concrete
  conc: "#c9c5be",
  concHi: "#d4d1ca",
  concLo: "#bdb8b0",
  concJoint: "#ada89f",
  // plaster
  plaster: "#efede9",
  plasterHi: "#f8f7f4",
  plasterLo: "#e1ded8",
  // blackened steel
  steel: "#2a2d34",
  steelHi: "#4b515c",
  steelMid: "#373b44",
  steelLo: "#1c1e23",
  chrome: "#c3c8cf",
  chromeLo: "#8f959e",
  // walnut
  wal: "#6e4632",
  walHi: "#8a5c41",
  walLo: "#55351f",
  walDk: "#3d2416",
  // white oak
  oak: "#d7b98e",
  oakHi: "#e8d3ad",
  oakLo: "#c0a073",
  oakDk: "#9d7f58",
  // marble
  marb: "#f2f0ec",
  marbHi: "#fbfaf8",
  marbLo: "#e1ddd7",
  vein: "#c9c4bc",
  // brass
  brass: "#c8a04c",
  brassHi: "#ecd28e",
  brassLo: "#94742f",
  // cognac leather
  lea: "#9b5631",
  leaHi: "#bd7647",
  leaLo: "#723b1f",
  // textiles
  char: "#4b4e56",
  charHi: "#61656e",
  charLo: "#393b42",
  oat: "#ddd4c5",
  oatHi: "#ebe5d9",
  oatLo: "#c6bcab",
  navy: "#2e3a55",
  navyHi: "#44547a",
  navyLo: "#212a40",
  sage: "#8d9c86",
  sageHi: "#a7b5a0",
  sageLo: "#71806b",
  terra: "#c2694a",
  terraHi: "#da876a",
  // glass and light
  glass: "#d3e5ee",
  frost: "#e9f0f3",
  led: "#7cc8ff",
  ledHi: "#d6f0ff",
  warm: "#ffd9a0",
  // greens
  leaf: "#4f7d47",
  leafHi: "#71a05e",
  leafLo: "#3a5f36",
  leafDk: "#29432a",
  olive: "#8a9a6e",
  oliveHi: "#a8b78c",
  oliveLo: "#6b7a55",
  outline: OUTLINE,
};

/** A Grid sprite drawn once and cached (key gets the theme prefix). */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void): HTMLCanvasElement {
  return cached(`skyline|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    return g.toCanvas();
  });
}

/** "#rrggbb" + alpha (0..1) → "#rrggbbaa". */
export function alpha(color: string, a: number): string {
  return `${color}${Math.max(0, Math.min(255, Math.round(a * 255))).toString(16).padStart(2, "0")}`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
