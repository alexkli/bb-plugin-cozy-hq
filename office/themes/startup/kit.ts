// Startup House: the palette and small drawing helpers its modules share. A
// sunny suburban ranch house gone founder: butter-yellow drywall, beige
// carpet, honey oak, terracotta tiles, a green-ish pool, and sticker colors
// on everything.
import { cached, drawPixelText, Grid, hash, makeCanvas, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";

export { OUTLINE, rect };

export const C = {
  // Drywall and trim.
  wall: "#f1e4c3",
  wallHi: "#f8eed6",
  wallLo: "#dccba4",
  wallDk: "#bfa97f",
  trim: "#fbf6ea",
  trimLo: "#d9d0bc",
  mint: "#cfe3cf",
  mintLo: "#b2cdb3",
  // Floors.
  carpet: "#cdbb98",
  carpetHi: "#d9c9a8",
  carpetLo: "#b9a681",
  oak: "#c98f55",
  oakHi: "#dba66c",
  oakLo: "#a87240",
  oakDk: "#7d5230",
  terra: "#c97f55",
  terraHi: "#d99468",
  terraLo: "#a86440",
  concrete: "#aaa69c",
  concreteHi: "#bcb8ae",
  concreteLo: "#918d84",
  // Outdoors.
  grass: "#86b95a",
  grassHi: "#9bcb6a",
  grassLo: "#6d9e48",
  grassDk: "#55833a",
  paver: "#d8cdb6",
  paverLo: "#bfb39a",
  pool: "#4ec2cc",
  poolHi: "#8be0e0",
  poolLo: "#2f9aa8",
  poolGreen: "#6cbf9a",
  fence: "#a8714a",
  fenceHi: "#c48b5c",
  fenceLo: "#7d5034",
  palm: "#4f9a46",
  palmHi: "#74bf5a",
  palmLo: "#2f6e34",
  trunk: "#9a7650",
  trunkLo: "#6e5236",
  // Furniture.
  wood: "#b98552",
  woodHi: "#d3a06a",
  woodLo: "#8e6038",
  woodDk: "#5e3e24",
  laminate: "#efe8d8",
  laminateLo: "#cfc6b0",
  plastic: "#f4f1e8",
  plasticLo: "#d4d0c4",
  steel: "#b8c0c8",
  steelHi: "#dde3e8",
  steelLo: "#8a949e",
  steelDk: "#5c6670",
  black: "#2e2c36",
  blackHi: "#4a4856",
  corduroy: "#c99a4a",
  corduroyHi: "#ddb46a",
  corduroyLo: "#a27832",
  corduroyDk: "#7a5626",
  denim: "#5f7fa8",
  denimLo: "#465f84",
  // Sticker and can colors.
  pink: "#ff5fa2",
  lime: "#b6e34a",
  cyan: "#43d1f0",
  orange: "#ff9a3d",
  yellow: "#ffd84a",
  red: "#e5544b",
  purple: "#9b72e6",
  blue: "#4a8fe0",
  green: "#4cc27a",
  paper: "#fbf8ef",
  paperLo: "#e6e0d0",
  ink: "#2e2a3a",
  pizza: "#e8b45a",
  box: "#c9a26a",
  boxHi: "#ddb983",
  boxLo: "#a8834e",
  screen: "#1b2438",
  glow: "#7fe0ff",
};

/** Can and sticker colors, for pyramids, laptops and the robot vacuum. */
export const STICKERS = [C.pink, C.lime, C.cyan, C.orange, C.yellow, C.purple, C.red, C.blue];
export const CANS = ["#3fd16a", "#ff4f7a", "#2fb8f0", "#ffd23a", "#b46cff", "#ff8a2a"];

/** A cached sprite drawn on a grid (outlined unless `outline` is false or a list of colors not to outline). */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, outline: boolean | string[] = true): HTMLCanvasElement {
  return cached(`startup|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE, { skip: Array.isArray(outline) ? outline : [] });
    return g.toCanvas();
  });
}

/** Pixel text into a grid. */
export function text(g: Grid, s: string, x: number, y: number, color: string): void {
  const c = cached(`startup|text|${s}|${color}`, () => makeCanvas(pixelTextWidth(s) + 1, 6, (ctx) => drawPixelText(ctx, s, 0, 0, color)));
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) if (d[(yy * c.width + xx) * 4 + 3]! > 0) g.set(x + xx, y + yy, color);
}

/** Deterministic 0..1 noise for a position (speckles, variety). */
export function noise(x: number, y: number, salt = 0): number {
  let h = hash(`${x},${y},${salt}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** A quick integer hash for per-frame variety (no strings, no allocations): 0..999. */
export function ih(a: number, b = 0): number {
  return ((Math.imul(a ^ 0x5bd1e995, 73856093) ^ Math.imul(b + 0x27d4eb2d, 19349663)) >>> 0) % 1000;
}

/** Fill a rect with alpha on a context (rounded to whole pixels). */
export function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** A pixel can (3×4) on a grid: body, a lighter rim and a stripe. */
export function can(g: Grid, x: number, y: number, color: string): void {
  g.rect(x, y, 3, 4, color);
  g.rect(x, y, 3, 1, "#e6e9ee");
  g.set(x, y + 2, "#ffffff");
}
