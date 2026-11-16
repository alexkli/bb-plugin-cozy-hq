// Redwood Camp: palette and small drawing helpers shared by the scenery's modules.
import { cached, Grid, hash, mix, OUTLINE, rng, shade } from "../../themekit.ts";

export { OUTLINE };

/** The camp palette: redwood bark, canvas, cedar decks, moss and lantern light. */
export const C = {
  // Redwood bark
  barkDk: "#3e1812",
  bark: "#6e2c1f",
  barkMid: "#8a3a27",
  barkHi: "#a94e33",
  barkLt: "#c66a45",
  // Tent canvas
  canvasHi: "#f4ecd6",
  canvas: "#e6dabd",
  canvasLo: "#d2c39d",
  canvasDk: "#b5a37b",
  canvasSeam: "#c4b38a",
  // Cedar decks
  deckHi: "#d39a66",
  deck: "#bb8150",
  deckLo: "#a06a3e",
  deckGap: "#6c4127",
  // Weathered porch boards
  porchHi: "#b9a68b",
  porch: "#a08d72",
  porchLo: "#8a785f",
  porchGap: "#5a4b3b",
  // Pine logs and lumber
  logHi: "#e3bb83",
  log: "#c99a62",
  logLo: "#a77a46",
  logDk: "#7a5230",
  ring: "#b58652",
  // Dark wood
  walnutHi: "#9a6a48",
  walnut: "#74482f",
  walnutLo: "#56331f",
  walnutDk: "#3d2216",
  // Forest floor
  soil: "#5c4631",
  soilLo: "#4a3826",
  soilHi: "#6e553b",
  needle: "#94603a",
  needleHi: "#b17845",
  // Moss and ferns
  mossDk: "#34502a",
  moss: "#4f7334",
  mossHi: "#6e9842",
  mossLt: "#93bd58",
  fernDk: "#2c5530",
  fern: "#43803f",
  fernHi: "#66a84d",
  fernLt: "#8cc865",
  // Stone
  stoneDk: "#5f5d57",
  stone: "#85827a",
  stoneHi: "#a6a397",
  stoneLt: "#c3c0b3",
  // Fabric and enamel
  plaid: "#b23a32",
  plaidDk: "#7c2425",
  plaidBk: "#2f2527",
  cream: "#f1e7cf",
  wool: "#e4d8bd",
  enamel: "#2f6b62",
  enamelHi: "#4f8f84",
  enamelSpeck: "#e9efe6",
  blueEnamel: "#3d6a94",
  brass: "#d4a23a",
  brassHi: "#f2cd6a",
  iron: "#3a3836",
  ironHi: "#5a5752",
  // Light
  flame: "#ff8a3d",
  flameHi: "#ffcf4a",
  flameCore: "#fff3b0",
  ember: "#e5484d",
  lantern: "#ffd27a",
  lanternHi: "#fff0c0",
  glass: "#f3e6c0",
  // Greens of the forest outside
  canopy: "#2d4a2a",
  canopyHi: "#4a6e38",
} as const;

/** A sprite built on a Grid, outlined, cached under `redwoods|key`. */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`redwoods|spr|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** Vertical redwood bark: deep fibrous grooves, lit from the left. */
export function barkFill(g: Grid, x: number, y: number, w: number, h: number, seed: number, lit = true): void {
  const r = rng(seed || 1);
  g.rect(x, y, w, h, C.bark);
  // Ridges: long wavy vertical stripes of lighter and darker bark.
  for (let i = 0; i < w; i++) {
    const k = i / Math.max(1, w - 1);
    let base: string = C.bark;
    if (lit && k < 0.25) base = C.barkHi;
    else if (lit && k < 0.5) base = C.barkMid;
    else if (k > 0.85) base = C.barkDk;
    g.rect(x + i, y, 1, h, base);
  }
  for (let n = 0; n < Math.max(2, Math.floor(w / 2)); n++) {
    let gx = x + Math.floor(r() * w);
    const len = 6 + Math.floor(r() * 18);
    const gy0 = y + Math.floor(r() * Math.max(1, h - 4));
    for (let j = 0; j < len && gy0 + j < y + h; j++) {
      if (r() < 0.18) gx += r() < 0.5 ? -1 : 1;
      if (gx < x || gx >= x + w) continue;
      g.set(gx, gy0 + j, C.barkDk);
      if (lit && gx - 1 >= x && r() < 0.5) g.set(gx - 1, gy0 + j, shade(C.barkHi, 0.08));
    }
  }
}

/** Horizontal boards with seams, staggered butt joints and nails. */
export function boards(
  g: Grid,
  x: number,
  y: number,
  w: number,
  h: number,
  pal: { hi: string; base: string; lo: string; gap: string },
  plank = 5,
  seed = 1,
): void {
  const r = rng(seed);
  for (let yy = 0, row = 0; yy < h; yy += plank, row++) {
    const ph = Math.min(plank, h - yy);
    const tone = r() < 0.3 ? pal.lo : r() < 0.45 ? pal.hi : pal.base;
    const c = mix(tone, pal.base, 0.6);
    g.rect(x, y + yy, w, ph, c);
    if (ph > 2) g.rect(x, y + yy, w, 1, mix(pal.hi, c, 0.5));
    g.rect(x, y + yy + ph - 1, w, 1, pal.gap);
    const off = Math.floor(r() * 60);
    for (let jx = x - off; jx < x + w; jx += 46 + Math.floor(r() * 40)) {
      if (jx <= x + 2 || jx >= x + w - 3) continue;
      g.rect(jx, y + yy, 1, ph - 1, mix(pal.gap, c, 0.25));
      if (ph >= 4) g.set(jx - 2, y + yy + 1, pal.lo).set(jx + 2, y + yy + 1, pal.lo);
    }
    // A knot here and there
    if (r() < 0.25) {
      const kx = x + 3 + Math.floor(r() * Math.max(1, w - 6));
      g.set(kx, y + yy + Math.floor(ph / 2), pal.lo).set(kx + 1, y + yy + Math.floor(ph / 2), mix(pal.lo, c, 0.5));
    }
  }
}

/** A plaid patch (buffalo-check style) in two colors plus the dark crossing. */
export function plaidFill(g: Grid, x: number, y: number, w: number, h: number, a: string = C.plaid, b: string = C.plaidDk, k: string = C.plaidBk, cell = 2): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ci = Math.floor(i / cell) % 2;
      const cj = Math.floor(j / cell) % 2;
      g.set(x + i, y + j, ci && cj ? k : ci || cj ? b : a);
    }
  }
}

/** A tree-ring end of a log: concentric rings on light wood. */
export function logEnd(g: Grid, cx: number, cy: number, rx: number, ry: number): void {
  g.ellipse(cx, cy, rx, ry, C.logDk);
  g.ellipse(cx, cy, Math.max(0.5, rx - 1), Math.max(0.5, ry - 1), C.log);
  if (rx > 2.5) g.ellipse(cx, cy, rx - 2, Math.max(0.5, ry - 2), C.ring);
  if (rx > 3.5) g.ellipse(cx, cy, rx - 3, Math.max(0.5, ry - 3), C.logHi);
  g.set(Math.round(cx), Math.round(cy), C.logLo);
}

/** A horizontal log (bark front, lit top edge) with ring ends. */
export function hlog(g: Grid, x: number, y: number, w: number, h: number, seed = 3, ends = true): void {
  const r = rng(seed);
  for (let j = 0; j < h; j++) {
    const k = j / Math.max(1, h - 1);
    const c = k < 0.2 ? C.barkLt : k < 0.45 ? C.barkHi : k < 0.8 ? C.barkMid : C.bark;
    g.rect(x, y + j, w, 1, c);
  }
  for (let n = 0; n < w / 3; n++) {
    const gx = x + 2 + Math.floor(r() * (w - 4));
    const gy = y + 1 + Math.floor(r() * Math.max(1, h - 2));
    const len = 3 + Math.floor(r() * 6);
    for (let i = 0; i < len && gx + i < x + w - 2; i++) g.set(gx + i, gy, C.barkDk);
  }
  if (ends) {
    logEnd(g, x + 1, y + (h - 1) / 2, Math.max(1, h / 2 - 1.5), (h - 1) / 2);
    logEnd(g, x + w - 2, y + (h - 1) / 2, Math.max(1, h / 2 - 1.5), (h - 1) / 2);
  }
}

/** A tiny lantern: cap, glass, frame (about 5×7). */
export function lanternAt(g: Grid, x: number, y: number, glass: string = C.glass, frame: string = C.iron): void {
  g.set(x + 2, y, frame);
  g.rect(x + 1, y + 1, 3, 1, frame);
  g.rect(x, y + 2, 5, 4, frame);
  g.rect(x + 1, y + 2, 3, 3, glass);
  g.set(x + 2, y + 3, C.flameHi);
  g.rect(x, y + 6, 5, 1, frame);
}

/** An enamel mug (3×3 + handle). */
export function mugAt(g: Grid, x: number, y: number, body: string = C.cream, rim: string = C.blueEnamel): void {
  g.rect(x, y, 3, 3, body);
  g.rect(x, y, 3, 1, rim);
  g.set(x + 3, y + 1, body);
}

/** Stable pseudo-random 0..1 from a string. */
export function h01(s: string): number {
  return (hash(s) % 10000) / 10000;
}

export { cached, Grid, hash, mix, rng, shade };
