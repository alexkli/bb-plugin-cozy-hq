// Spaceship: the palette and a few drawing helpers shared by the deck's
// modules. A cozy long-haul ship: warm off-white wall panels and pale grey
// hull plating with an orange livery stripe, slate deck plates, teal and navy
// upholstery, consoles glowing cyan, amber and mint. Light from the top left.
import { Grid, OUTLINE, mix, shade } from "../../themekit.ts";

export const P = {
  outline: OUTLINE,
  // Hull and wall panels (light, warm grey to deep slate).
  panelHi: "#eef0f2",
  panel: "#d8dce2",
  panelMid: "#b9bfc9",
  panelLo: "#959cab",
  panelDk: "#6f7787",
  steel: "#5c6475",
  steelDk: "#454c5c",
  steelDeep: "#323846",
  void: "#1b1f2a",
  // Deck plating and the corridor grating.
  deck: "#59606f",
  deckHi: "#6b7282",
  deckLo: "#4a505e",
  deckSeam: "#3d4250",
  grate: "#363b48",
  grateHi: "#474d5c",
  // The livery: orange stripe and hazard trims, teal accents.
  orange: "#f08a3c",
  orangeHi: "#ffb067",
  orangeLo: "#c2632a",
  hazard: "#f2c230",
  teal: "#33b3ad",
  tealHi: "#62d8d0",
  tealLo: "#23807f",
  navy: "#34416a",
  navyHi: "#4a5a8c",
  navyLo: "#252f4f",
  rust: "#b4583a",
  // Plastics and soft furnishings.
  white: "#f4f6f9",
  whiteLo: "#d3d9e2",
  cream: "#efe6d2",
  creamLo: "#d2c6ab",
  cushion: "#4d6fa8",
  cushionHi: "#6b8fc9",
  cushionLo: "#3a5585",
  // Lights and screens.
  screen: "#0c1424",
  screenHi: "#14223a",
  cyan: "#7fe3ff",
  cyanDk: "#3aa6cc",
  mint: "#8ff0b5",
  amber: "#ffc857",
  red: "#ff6b6b",
  violet: "#a88bff",
  grow: "#d77bff",
  // Greens (hydroponics).
  leaf: "#4fbf6a",
  leafHi: "#8fe27a",
  leafLo: "#2f8a52",
  leafDk: "#1f5e3c",
  soil: "#5a4636",
  water: "#5fc8f0",
  waterHi: "#a8e8ff",
};

/** Outline a grid and bake it into a canvas. */
export function done(g: Grid, skip: string[] = []): HTMLCanvasElement {
  g.outline(OUTLINE, { skip });
  return g.toCanvas();
}

/** A bevelled metal panel: light top/left edge, dark bottom/right edge. */
export function panel(g: Grid, x: number, y: number, w: number, h: number, base: string, r = 1): void {
  g.rrect(x, y, w, h, shade(base, -0.22), r);
  g.rrect(x, y, w, h - 1, base, r);
  g.hline(x + r, y, w - 2 * r, shade(base, 0.25));
  g.vline(x, y + r, h - 2 * r - 1, shade(base, 0.14));
}

/** A row of rivets (1 px, with a highlight below-right). */
export function rivets(g: Grid, x0: number, y: number, x1: number, step: number, base: string): void {
  for (let x = x0; x <= x1; x += step) {
    g.set(x, y, shade(base, -0.3));
    g.set(x + 1, y + 1, shade(base, 0.2));
  }
}

/** A small glowing light: a bright core with a halo of the mixed color. */
export function lamp(g: Grid, x: number, y: number, color: string, bg: string): void {
  g.set(x, y, mix(color, "#ffffff", 0.35));
  g.set(x - 1, y, mix(color, bg, 0.45));
  g.set(x + 1, y, mix(color, bg, 0.45));
}

/** Diagonal hazard stripes in a rect (yellow and dark). */
export function hazard(g: Grid, x: number, y: number, w: number, h: number, a = P.hazard, b = P.steelDeep): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, Math.floor((i + j) / 2) % 2 ? b : a);
}

/** Fill a rect on a canvas context. */
export function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
