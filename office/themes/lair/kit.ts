// Villain's Lair: the palette and a few drawing helpers shared by its modules.
// Basalt and lava, riveted steel and hazard stripes, cream consoles with
// candy buttons, mahogany, red velvet and brass for the mastermind.
import { cached, Grid, OUTLINE } from "../../themekit.ts";

export const C = {
  // basalt
  rock: "#3a3438",
  rockHi: "#4d454a",
  rockTop: "#5e555a",
  rockLo: "#2c272b",
  rockDk: "#1f1b1f",
  // lava
  lava: "#ff6a1a",
  lavaHi: "#ffb238",
  lavaHot: "#ffe68a",
  lavaLo: "#d2401a",
  crust: "#7a2414",
  crustDk: "#4a160e",
  // steel
  steel: "#6b747e",
  steelHi: "#8d97a2",
  steelTop: "#a8b1bb",
  steelLo: "#4f5760",
  steelDk: "#353b42",
  rivet: "#c2c9d1",
  // hazard
  hazard: "#f2c230",
  hazardLo: "#c7961c",
  ink: "#26232a",
  // consoles
  cream: "#e2d8bf",
  creamHi: "#f1e9d4",
  creamLo: "#c4b897",
  teal: "#2f8a86",
  tealHi: "#4fb3ac",
  tealLo: "#1f625f",
  orange: "#e0722e",
  // the mastermind's things
  mahog: "#6a2c22",
  mahogHi: "#8a3e2e",
  mahogLo: "#4b1d17",
  mahogDk: "#331310",
  velvet: "#9a1f2e",
  velvetHi: "#c23544",
  velvetLo: "#6c1420",
  brass: "#d4a640",
  brassHi: "#f2d37a",
  brassLo: "#9c7424",
  leather: "#2a2427",
  leatherHi: "#433a3e",
  // jungle and sea
  leaf: "#3f8a4a",
  leafHi: "#63b05e",
  leafLo: "#2b6436",
  leafDk: "#1d4527",
  sea: "#2a8fb8",
  seaHi: "#55b8d8",
  seaLo: "#1d6a93",
  // screens and lights
  screen: "#0e3138",
  screenHi: "#1d5a62",
  glowGreen: "#7cf0a0",
  glowRed: "#ff4a3a",
  glowAmber: "#ffc54a",
  glowBlue: "#7cc8ff",
  white: "#f4f1ea",
  outline: OUTLINE,
};

/** A Grid sprite drawn once and cached (the key gets the theme prefix). */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void): HTMLCanvasElement {
  return cached(`lair|${key}`, () => {
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

/** Diagonal yellow-and-black hazard stripes in a rect (on a Grid). */
export function hazardStripes(g: Grid, x: number, y: number, w: number, h: number, period = 4): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, (i + j) % period < period / 2 ? C.hazard : C.ink);
}

/** The same on a canvas. */
export function hazardRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, period = 4): void {
  ctx.fillStyle = C.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.hazard;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j) % period < period / 2) ctx.fillRect(x + i, y + j, 1, 1);
}
