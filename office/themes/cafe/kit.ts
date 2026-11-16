// Coffee Shop: the palette and small drawing helpers its modules share. A
// neighborhood café on a street corner: cream walls and green trim, exposed
// brick, an oak herringbone floor, a walnut counter with a marble top,
// copper and chrome on the espresso machine, chalkboards everywhere.
import { cached, Grid, OUTLINE, rect } from "../../themekit.ts";

export { OUTLINE, rect, rect as fill };

export const C = {
  // Plaster and the shop's green trim.
  wall: "#efe2c6",
  wallHi: "#f7eedb",
  wallLo: "#dccaa6",
  wallDk: "#bea782",
  green: "#2f5d50",
  greenHi: "#46806e",
  greenLo: "#244a3f",
  greenDk: "#173129",
  // Exposed brick.
  brick: "#a9583f",
  brickHi: "#c06c4e",
  brickLo: "#86422f",
  mortar: "#d6c2a4",
  // Floors.
  oak: "#b07a48",
  oakHi: "#c48c57",
  oakLo: "#94633a",
  oakDk: "#6f4527",
  tile: "#e9dfcc",
  tileLo: "#d3c6ae",
  tileDk: "#3d3537",
  terra: "#c9784f",
  terraLo: "#a85f3c",
  // Walnut, marble, metal.
  walnut: "#6e432a",
  walnutHi: "#8a5737",
  walnutLo: "#53311f",
  walnutDk: "#3a2114",
  marble: "#ece8e2",
  marbleHi: "#faf8f4",
  marbleLo: "#d2ccc3",
  vein: "#b9b1a6",
  copper: "#c8733f",
  copperHi: "#e8a066",
  copperLo: "#924f2a",
  brass: "#d6a64a",
  brassHi: "#f0cc78",
  brassLo: "#9c7428",
  chrome: "#cfd6dc",
  chromeHi: "#f4f7f9",
  chromeLo: "#8e98a2",
  chromeDk: "#5d6670",
  iron: "#34363d",
  ironHi: "#53565f",
  // Chalkboards and chalk.
  board: "#2c3431",
  boardHi: "#3a4440",
  chalk: "#efeee6",
  chalkPink: "#f2a7b8",
  chalkYellow: "#f4dc8a",
  chalkBlue: "#9fd0e6",
  chalkGreen: "#b3dfa0",
  // Textiles.
  velvet: "#3f6b55",
  velvetHi: "#558a70",
  velvetLo: "#2d4f3e",
  mustard: "#d1a03c",
  mustardHi: "#e6bd5e",
  mustardLo: "#a97c25",
  rust: "#b4583a",
  rustHi: "#cf7552",
  rustLo: "#8c3f27",
  leather: "#7a4a2c",
  leatherHi: "#9a6340",
  leatherLo: "#5a341e",
  cream: "#f6efe4",
  creamLo: "#e2d6c2",
  // Coffee.
  espresso: "#3b2116",
  crema: "#c58a52",
  milk: "#f6efe4",
  // Greens.
  leaf: "#5f8f4e",
  leafHi: "#7fae5f",
  leafLo: "#41693a",
  // Paper and cups.
  paper: "#fbf7ee",
  paperLo: "#e8dfcd",
  kraft: "#c79f6e",
  kraftLo: "#a88252",
  // The street.
  asphalt: "#4b4c55",
  asphaltLo: "#3c3d45",
  curb: "#a7a39b",
  pavement: "#c9c2b5",
  pavementLo: "#b2aa9b",
  awning: "#2f5d50",
  awningStripe: "#efe2c6",
  glass: "#a9cfe0",
  // Light.
  warm: "#ffd58a",
  amber: "#ffb35a",
};

/** A Grid sprite drawn once and cached (the key gets the theme prefix); outlined unless told not to. */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`cafe|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A cheap stable hash of two ints, 0..1. */
export function h2(a: number, b: number): number {
  return (((Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0) % 10007) / 10007;
}

/** A chalk scribble line (menu items): a run of short dashes. */
export function chalkLine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, seed: number): void {
  ctx.fillStyle = color;
  let cx = x;
  let i = 0;
  while (cx < x + w) {
    const len = 2 + Math.floor(h2(seed, i++) * 5);
    ctx.fillRect(cx, y, Math.min(len, x + w - cx), 1);
    cx += len + 1;
  }
}

/** Sprites cached per key for the live hooks (not Grid based). */
export function memo<T>(key: string, build: () => T): T {
  return cached(`cafe|${key}`, build);
}
