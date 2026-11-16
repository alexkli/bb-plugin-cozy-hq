// Surf Villa: the palette and a few drawing helpers shared by its modules.
import { cached, Grid, OUTLINE, rng, shade } from "../../themekit.ts";

/** Sun-bleached wood, sand, whitewash, teak, rattan, bamboo, sea, coral and palm. */
export const C = {
  // decks
  deck: "#ead8b4",
  deck2: "#e4cfa7",
  deckGap: "#c6a97c",
  deckGrain: "#dac39a",
  deckNail: "#b89a6c",
  // sand
  sand: "#f2dfb0",
  sand2: "#ecd6a2",
  sandDot: "#d8bd88",
  sandLight: "#fbefcf",
  // whitewash
  white: "#fdfaf2",
  wash: "#f5f0e4",
  washLine: "#e7dfcd",
  washShade: "#d6cbb4",
  // woods
  teak: "#a8673a",
  teakHi: "#c98a52",
  teakLo: "#844c2a",
  teakDk: "#5c331d",
  drift: "#d8c8a8",
  driftHi: "#ece2cb",
  driftLo: "#b7a280",
  driftDk: "#8a7658",
  rattan: "#ddb46c",
  rattanHi: "#f1d496",
  rattanLo: "#b98b45",
  rattanDk: "#8a6230",
  bamboo: "#d9c47c",
  bambooHi: "#efe2a4",
  bambooLo: "#ad9552",
  bambooNode: "#8a7440",
  thatch: "#d8b064",
  thatchHi: "#ecd08c",
  thatchLo: "#b08640",
  thatchDk: "#86622e",
  // sea and sky
  aqua: "#3fbfc0",
  aquaHi: "#86e2da",
  aquaLo: "#2b939b",
  aquaDk: "#1d6a72",
  sea: "#2f8fbf",
  seaHi: "#5cb9e0",
  seaLo: "#226d9a",
  seaDk: "#174d72",
  foam: "#f4fbff",
  // warm accents
  coral: "#ff7a5c",
  coralHi: "#ffa287",
  coralLo: "#d8553f",
  coralDk: "#a63c2e",
  sun: "#ffd166",
  sunHi: "#ffe7a3",
  sunLo: "#e7a83a",
  hibiscus: "#ff4f7b",
  pink: "#ff9fc0",
  lime: "#9fdc5a",
  // greens
  palm: "#3f9a5a",
  palmHi: "#6cc070",
  palmLo: "#2b7046",
  palmDk: "#1d4f34",
  // misc
  coconut: "#7a4e2c",
  coconutHi: "#9c6a3e",
  terracotta: "#d9774a",
  terracottaLo: "#b25a34",
  chrome: "#d5dde2",
  chromeLo: "#9aa6ad",
  ink: "#24303a",
  screen: "#16202a",
  linen: "#efe6d2",
} as const;

export { OUTLINE };

/** A Grid sprite, outlined and baked once. */
export function spr(key: string, w: number, h: number, draw: (g: Grid) => void, skip?: string[]): HTMLCanvasElement {
  return cached(`beach|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE, { skip });
    return g.toCanvas();
  });
}

/** Basket weave: little over-under blocks in two tones. */
export function weave(g: Grid, x: number, y: number, w: number, h: number, a: string, b: string, hi?: string): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const bx = Math.floor(i / 3);
      const by = Math.floor(j / 2);
      const across = (bx + by) % 2 === 0;
      const edge = across ? i % 3 === 2 : j % 2 === 1;
      g.set(x + i, y + j, edge ? b : a);
    }
  }
  if (hi) for (let i = 0; i < w; i += 6) g.set(x + i + ((y >> 1) % 3), y, hi);
}

/** Vertical bamboo canes: stripes with a node every few rows. */
export function canes(g: Grid, x: number, y: number, w: number, h: number, cane = C.bamboo, gap = C.bambooLo, node = C.bambooNode, step = 3): void {
  for (let i = 0; i < w; i++) {
    const k = i % step;
    for (let j = 0; j < h; j++) {
      let c: string = k === step - 1 ? gap : cane;
      if (k === 0 && step > 2) c = shade(cane, 0.18);
      if (k !== step - 1 && (j + Math.floor(i / step) * 3) % 7 === 3) c = node;
      g.set(x + i, y + j, c);
    }
  }
}

/** A thatch fringe: straw strands of uneven length hanging down from y. */
export function fringe(g: Grid, x: number, y: number, w: number, depth: number, seed = 7): void {
  const r = rng(seed);
  for (let i = 0; i < w; i++) {
    const len = depth - 1 + Math.floor(r() * 2) + (i % 3 === 0 ? 1 : 0);
    for (let j = 0; j < len; j++) {
      const c = j === 0 ? C.thatchHi : (i + j) % 4 === 0 ? C.thatchLo : i % 2 ? C.thatch : C.thatchHi;
      g.set(x + i, y + j, j === len - 1 && i % 2 ? C.thatchDk : c);
    }
  }
}

/** Fill a rectangle on a canvas. */
export function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** Paint a Grid onto a canvas (for one-off background pieces). */
export function paint(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}
