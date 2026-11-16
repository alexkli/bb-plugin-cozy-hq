// School scenery: palette and small drawing helpers shared by its modules.
import { cached, Grid, hash, OUTLINE, rect, shade } from "../../themekit.ts";
import type { Layout, Rect } from "../../layout.ts";

export { OUTLINE };

/** Bright school colors: primaries a notch softer than crayons. */
export const C = {
  red: "#e5544b",
  redHi: "#f2837a",
  redLo: "#b23a37",
  yellow: "#f7c948",
  yellowHi: "#fde38a",
  yellowLo: "#d9a531",
  blue: "#4a8fd9",
  blueHi: "#7fb6ee",
  blueLo: "#2f6bb0",
  navy: "#2c4a7c",
  green: "#5cb860",
  greenHi: "#8fd88a",
  greenLo: "#3a8a4f",
  orange: "#f39a3d",
  orangeHi: "#f8bd77",
  purple: "#9b72cf",
  purpleHi: "#bfa2e6",
  teal: "#3fb5a8",
  pink: "#f08fb3",
  maple: "#e6bd82",
  mapleHi: "#f3d7a6",
  mapleLo: "#c99a5e",
  mapleDk: "#97693e",
  steel: "#b8c2cc",
  steelHi: "#dde3ea",
  steelLo: "#8a96a3",
  steelDk: "#5f6b78",
  paper: "#fbfaf3",
  paperLo: "#e6e1d2",
  ink: "#3a3046",
  chalk: "#eef3ea",
  board: "#2f6a4f",
  boardHi: "#3d7a5d",
  cork: "#d6a46a",
  wall: "#f6edd3",
  skin: "#f1c7a4",
};

/** The crayon box, for rugs, books, backpacks and flags. */
export const CRAYONS = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
export const BOOKS = [C.red, C.blue, C.yellow, C.green, C.purple, C.orange, C.teal, "#e9e2d6", C.pink];

/** A cached sprite drawn on a Grid, outlined by default. */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, outline: boolean | string[] = true): HTMLCanvasElement {
  return cached(`school|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE, { skip: Array.isArray(outline) ? outline : [] });
    return g.toCanvas();
  });
}

/** Paint a grid at (x, y) on a canvas (null pixels stay as they are). */
export function stamp(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

/** Deterministic 0..1 noise for a position (speckles, variety). */
export function noise(x: number, y: number, salt = 0): number {
  let h = hash(`${x},${y},${salt}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A row of book spines on a grid (x0..x1 at the bottom row `base`, `tall` max height). */
export function bookRow(g: Grid, x0: number, x1: number, base: number, tall: number, seed: number): void {
  let x = x0;
  let i = seed;
  while (x < x1) {
    const bw = 1 + ((i * 7) % 3 === 0 ? 1 : 0) + (i % 5 === 0 ? 1 : 0);
    const bh = tall - ((i * 5) % 3);
    const w = Math.min(bw, x1 - x);
    const c = BOOKS[(i * 3 + seed) % BOOKS.length]!;
    g.rect(x, base - bh + 1, w, bh, c);
    if (bh > 3) g.set(x, base - bh + 2, shade(c, 0.35));
    x += w;
    if (i % 6 === 5 && x < x1 - 2) {
      // A leaning book.
      g.set(x, base, shade(c, -0.2)).set(x + 1, base - 1, shade(c, -0.2));
      x += 2;
    }
    i++;
  }
}

/** Fill helper on a 2d context. */
export { rect };

/** Everything mounted on the back wall, as rectangles (fixtures, TV, windows, hanging decor). */
export function wallFixtures(L: Layout): Rect[] {
  return cached(`school|fixtures|${L.W}x${L.H}|${L.props.length}`, () => {
    const w = L.wall;
    const out: Rect[] = [];
    const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2 });
    out.push(pad(w.pinboard, 2), pad(w.calendar, 2), pad(w.status, 2), pad(w.legendNote, 3));
    out.push({ x: w.door.x - 6, y: w.door.y - 14, w: w.door.w + 12, h: w.door.h + 18 });
    for (const win of w.windows) out.push({ x: win.x - 3, y: win.y - 3, w: win.w + 6, h: win.h + 10 });
    out.push({ x: w.clock.x - w.clock.r - 3, y: w.clock.y - w.clock.r - 3, w: w.clock.r * 2 + 6, h: w.clock.r * 2 + 6 });
    const seg = L.segments.find((s) => L.tv.x >= s.x0 && L.tv.x < s.x1);
    if (seg && L.tv.y < seg.depth) out.push(pad(L.tv, 3));
    for (const s of L.speakers) out.push(pad(s, 2));
    for (const p of w.paintings) out.push({ x: p.x - 2, y: p.y - 2, w: 36, h: 36 });
    for (const pl of L.plants) if (pl.sprite === "HANGING_PLANT") out.push({ x: pl.x - 1, y: pl.y, w: 18, h: 26 });
    for (const px of w.pillars) out.push({ x: px - 8, y: 0, w: 16, h: 200 });
    // Props that stand against the wall (counters, whiteboards, shelves…)
    for (const p of L.props) {
      const seg2 = L.segments.find((s) => p.x >= s.x0 && p.x < s.x1);
      if (seg2 && p.y < seg2.depth + 2 && p.kind !== "tv") out.push({ x: p.x - 2, y: p.y - 4, w: (p.w ?? 24) + 6, h: 200 });
    }
    return out;
  });
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
