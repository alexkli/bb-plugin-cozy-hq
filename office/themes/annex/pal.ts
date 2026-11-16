// Dusty Annex: the palette and a few drawing helpers shared by its modules.
// Faded browns, olive and nicotine-beige, lit by tired fluorescent tubes.

import { Grid, rng, shade } from "../../themekit.ts";

export const P = {
  // Old wood and chipboard
  woodHi: "#9c8462",
  wood: "#7f6a4c",
  woodLo: "#64533b",
  woodDk: "#4a3d2c",
  // Brown vinyl / leatherette
  vinylHi: "#8a6444",
  vinyl: "#6e4c35",
  vinylLo: "#553827",
  // Mustard 70s fabric
  mustHi: "#bba256",
  must: "#a08a42",
  mustLo: "#826e31",
  // Olive fabric
  oliveHi: "#8a8a5c",
  olive: "#6f6f47",
  oliveLo: "#575737",
  // Yellowed beige plastic
  beigeHi: "#ddd3b0",
  beige: "#c8bc97",
  beigeLo: "#a69a76",
  beigeDk: "#7f755a",
  // Grey metal
  metalHi: "#a9aba2",
  metal: "#8c8e86",
  metalLo: "#6d6f68",
  metalDk: "#4f514c",
  // Paper and card
  paper: "#e6dfc8",
  paperOld: "#d3c8a6",
  paperLine: "#a59a7c",
  card: "#a8865a",
  cardHi: "#bf9d6c",
  cardLo: "#876a44",
  tape: "#cdbf8f",
  // Dirt
  stain: "#5e4b34",
  rust: "#8a4f2c",
  foam: "#d9cc9a",
  // Dull accents
  red: "#8e3b32",
  redHi: "#a9503f",
  green: "#55704a",
  greenHi: "#6f8a5c",
  blue: "#4c5d70",
  blueHi: "#64788c",
  teal: "#4f6a66",
  // Dead and dying leaves
  leafDead: "#8a6a3a",
  leafDry: "#a88a4a",
  leafSick: "#7d8a48",
  leaf: "#5f7a44",
  leafHi: "#7b9455",
  // Screens
  amber: "#ffb000",
  amberDim: "#b87a10",
  phosphor: "#7fe07f",
  crt: "#10120c",
} as const;

/** Random dots of `color` on filled pixels inside a box (dust, wear, stains). */
export function speckle(g: Grid, x: number, y: number, w: number, h: number, color: string, density: number, seed: number): void {
  const r = rng(seed);
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (g.get(i, j) === null) continue;
      if (r() < density) g.set(i, j, color);
    }
  }
}

/** A coffee ring seen from above. */
export function ring(g: Grid, cx: number, cy: number, color: string, big = false): void {
  if (big) {
    g.set(cx - 1, cy - 1, color).set(cx, cy - 1, color).set(cx + 1, cy - 1, color);
    g.set(cx - 2, cy, color).set(cx + 2, cy, color);
    g.set(cx - 1, cy + 1, color).set(cx, cy + 1, color).set(cx + 1, cy + 1, color);
  } else {
    g.set(cx, cy - 1, color).set(cx - 1, cy, color).set(cx + 1, cy, color).set(cx, cy + 1, color);
  }
}

/** A strip of brown parcel tape (a repair). */
export function tapeX(g: Grid, x: number, y: number): void {
  g.set(x - 1, y - 1, P.tape).set(x, y, P.tape).set(x + 1, y + 1, P.tape);
  g.set(x + 1, y - 1, P.tape).set(x - 1, y + 1, P.tape);
}

/** A tiny stack of paper, top-down. */
export function papers(g: Grid, x: number, y: number, w: number, h: number, sheets = 3): void {
  for (let i = 0; i < sheets; i++) {
    const c = i === sheets - 1 ? P.paper : i % 2 ? P.paperOld : shade(P.paperOld, -0.08);
    g.rect(x + (i % 2), y - i, w, h, c);
  }
  for (let j = 1; j < h - 1; j += 2) g.rect(x + 1 + ((sheets - 1) % 2), y - sheets + 1 + j, Math.max(1, w - 3 - (j % 3)), 1, P.paperLine);
}

/** A takeaway carton (white, red band), 5×4. */
export function carton(g: Grid, x: number, y: number): void {
  g.rect(x, y, 5, 4, "#e2dccb");
  g.rect(x, y, 5, 1, "#f0ebdc");
  g.rect(x + 1, y + 2, 3, 1, P.red);
  g.set(x + 2, y - 1, P.metalLo);
}

/** A mug, 3×3 with a handle. */
export function mug(g: Grid, x: number, y: number, color: string): void {
  g.rect(x, y, 3, 3, color);
  g.set(x, y, shade(color, 0.2));
  g.set(x + 1, y, P.stain);
  g.set(x + 3, y + 1, color);
}
