// Mountain Cabin: the palette and a few drawing helpers shared by its modules.
// Honey larch and pine, grey granite, whitewash, red and navy wool, black
// iron and copper inside; snow, ice and cold blue shadows outside.
import { cached, Grid, OUTLINE } from "../../themekit.ts";

export const C = {
  // larch and pine (honey, sun-warmed)
  pine: "#d6a868",
  pineHi: "#e8c48c",
  pineLo: "#bb8b4c",
  pineDk: "#8f6232",
  pineDeep: "#5f3f1f",
  // old dark larch beams
  beam: "#6b4a33",
  beamHi: "#8a6343",
  beamLo: "#4f3525",
  beamDk: "#36241a",
  // granite and fieldstone
  stone: "#8f949b",
  stoneHi: "#b0b5bb",
  stoneLo: "#71767e",
  stoneDk: "#53575f",
  mortar: "#c6c1b5",
  slate: "#5c6470",
  slateHi: "#727b88",
  slateLo: "#4a515c",
  // whitewash
  plaster: "#ece6da",
  plasterHi: "#f7f3ec",
  plasterLo: "#d8d0c1",
  // wool
  red: "#b8423a",
  redHi: "#d4645a",
  redLo: "#8c2d28",
  navy: "#2f4468",
  navyHi: "#48628f",
  navyLo: "#1f2e4a",
  cream: "#efe6d2",
  creamHi: "#faf5ea",
  creamLo: "#d6c9ad",
  mustard: "#d9a63a",
  mustardLo: "#b0821f",
  moss: "#5d7a4e",
  mossHi: "#7c9a66",
  mossLo: "#435a3a",
  felt: "#8b8e95",
  feltHi: "#a5a8ae",
  feltLo: "#6d7077",
  // sheepskin
  fleece: "#f2ebdc",
  fleeceLo: "#ddd2bd",
  // iron and copper
  iron: "#3a3b42",
  ironHi: "#5b5d67",
  ironLo: "#25262c",
  copper: "#c57a43",
  copperHi: "#e8a066",
  copperLo: "#93552b",
  brass: "#d0a94e",
  brassHi: "#f0d488",
  // snow and ice
  snow: "#f5f9fd",
  snowShade: "#d3e0ee",
  snowDeep: "#adc1d9",
  ice: "#c4e6f4",
  iceDk: "#86bad8",
  // fire
  fire1: "#fff1a8",
  fire2: "#ffc650",
  fire3: "#f07a2a",
  ember: "#b8321e",
  soot: "#221a18",
  outline: OUTLINE,
};

/** A Grid sprite drawn once and cached (the key gets the theme prefix); outlined unless told not to. */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`cabin|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** "#rrggbb" + alpha (0..1) → "#rrggbbaa". */
export function alpha(color: string, a: number): string {
  return `${color}${Math.max(0, Math.min(255, Math.round(a * 255))).toString(16).padStart(2, "0")}`;
}

/** A cheap stable hash of two ints, 0..1. */
export function h2(a: number, b: number): number {
  return (((Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0) % 10007) / 10007;
}

/** Fieldstone: irregular grey blocks in light mortar, lit from the top left. */
export function stones(g: Grid, x: number, y: number, w: number, h: number, seed = 1, rowH = 6): void {
  g.rect(x, y, w, h, C.mortar);
  for (let ry = 0, row = 0; ry < h; ry += rowH, row++) {
    const bh = Math.min(rowH - 1, h - ry);
    let bx = -Math.floor(h2(row, seed) * 8);
    let i = 0;
    while (bx < w) {
      const bw = 7 + Math.floor(h2(row * 31 + i, seed + 7) * 9);
      const x0 = Math.max(0, bx);
      const x1 = Math.min(w, bx + bw - 1);
      if (x1 > x0) {
        const k = h2(row * 17 + i, seed + 3);
        const base = k < 0.33 ? C.stone : k < 0.66 ? C.stoneLo : "#9a9890";
        g.rect(x + x0, y + ry, x1 - x0, bh, base);
        g.hline(x + x0, y + ry, x1 - x0, k < 0.66 ? C.stoneHi : "#b6b2a6");
        if (bh > 2) g.hline(x + x0, y + ry + bh - 1, x1 - x0, C.stoneDk);
        if (x1 - x0 > 3) g.vline(x + x0, y + ry, bh, k < 0.5 ? C.stoneHi : base);
        if (k > 0.8 && x1 - x0 > 6) g.set(x + x0 + 3, y + ry + 2, C.stoneDk);
      }
      bx += bw;
      i++;
    }
  }
}

/** A Nordic knit band: a row of little crosses and dots in `fg` on `bg`. */
export function knitBand(g: Grid, x: number, y: number, w: number, bg: string, fg: string): void {
  g.rect(x, y, w, 3, bg);
  for (let i = 0; i < w; i++) {
    if (i % 4 === 1) g.set(x + i, y + 1, fg);
    if (i % 4 === 3) {
      g.set(x + i, y, fg);
      g.set(x + i, y + 2, fg);
    }
  }
}

/** Boards side by side (vertical planks), with grain. */
export function planksV(g: Grid, x: number, y: number, w: number, h: number, base: string, hi: string, lo: string, pitch = 4): void {
  g.rect(x, y, w, h, base);
  for (let i = 0; i < w; i += pitch) {
    g.vline(x + i, y, h, lo);
    g.vline(x + i + 1, y, h, hi);
    if ((i * 7) % 11 < 3 && h > 6) g.set(x + i + 2, y + 2 + ((i * 5) % Math.max(1, h - 4)), lo);
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
