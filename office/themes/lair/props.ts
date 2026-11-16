// Villain's Lair: furniture. Riveted steel and hazard stripes for the base,
// cream consoles, a canteen in chrome and red, burnt-orange velvet in the
// lounge, and mahogany, brass and red velvet for the mastermind. Every sprite
// keeps its classic size.
import type { Layout, PropPlacement } from "../../layout.ts";
import { cached, mapPixels, OUTLINE, parseColor, shade } from "../../themekit.ts";
import { C, hazardStripes, sprite } from "./kit.ts";

/** Restyle a classic sprite by brightness onto a ramp of colors (dark → light), keeping its outline. */
export function ramp(src: HTMLCanvasElement, colors: string[]): HTMLCanvasElement {
  const rgb = colors.map((c) => parseColor(c));
  const out = parseColor(OUTLINE);
  return mapPixels(src, (r, g, b, a) => {
    if (r === out[0] && g === out[1] && b === out[2]) return [r, g, b, a];
    const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const c = rgb[Math.min(rgb.length - 1, Math.floor(l * rgb.length))]!;
    return [c[0], c[1], c[2], a];
  });
}

const STEEL_RAMP = [C.steelDk, C.steelLo, C.steel, C.steelHi, C.steelTop];
const VELVET_RAMP = [C.velvetLo, C.velvet, C.velvetHi, "#e05a5a"];
const MAHOG_RAMP = [C.mahogDk, C.mahogLo, C.mahog, C.mahogHi, C.brass];

// ------------------------------------------------------------------ the lounge

function couch(): HTMLCanvasElement {
  // A long, low sofa in burnt-orange velvet, button-tufted, on chrome feet.
  return sprite("couch", 84, 28, (g) => {
    const v = "#c4572a";
    const hi = "#e27a46";
    const lo = "#93401d";
    g.rect(7, 24, 2, 3, C.steelHi).rect(75, 24, 2, 3, C.steelHi);
    g.rrect(4, 2, 76, 12, lo, 3);
    g.rrect(5, 3, 74, 10, v, 2);
    g.rect(7, 3, 70, 1, hi);
    for (let x = 12; x < 76; x += 10) g.set(x, 7, lo).set(x + 5, 10, lo);
    g.rect(3, 12, 78, 8, v);
    g.rect(3, 12, 78, 1, hi);
    for (const sx of [29, 55]) g.vline(sx, 13, 6, lo);
    g.rect(3, 19, 78, 3, lo);
    g.rect(4, 22, 76, 2, shade(lo, -0.2));
    g.rrect(0, 7, 8, 16, v, 2).rect(1, 7, 6, 1, hi).rect(1, 21, 6, 2, lo);
    g.rrect(76, 7, 8, 16, v, 2).rect(77, 7, 6, 1, hi).rect(77, 21, 6, 2, lo);
    // Cushions: a leopard one (it's that kind of lair) and a teal one.
    g.rrect(10, 5, 10, 8, "#e0b04a", 1);
    for (const [x, y] of [[12, 7], [15, 9], [17, 6], [13, 10]] as const) g.set(x, y, "#5a3a1a");
    g.rrect(64, 5, 10, 8, C.teal, 1).rect(65, 6, 7, 1, C.tealHi);
    g.outline(OUTLINE);
  });
}

function coffeeTable(): HTMLCanvasElement {
  // A kidney-shaped table of smoked glass on a chrome frame, a cocktail and a dish of olives.
  return sprite("coffee-table", 38, 14, (g) => {
    g.rect(5, 8, 2, 4, C.steelHi).rect(31, 8, 2, 4, C.steelHi);
    g.rrect(1, 2, 36, 7, "#3e5b61", 2);
    g.rect(3, 3, 32, 1, "#6f9aa2");
    g.rect(2, 8, 34, 1, "#2a3e42");
    // A cocktail glass with a cherry.
    g.rect(8, 0, 5, 1, "#d9eef2").rect(9, 1, 3, 1, "#d9eef2").set(10, 2, "#c9dde2").set(10, 3, "#c9dde2");
    g.set(11, 0, C.glowRed);
    // A little bowl.
    g.rect(24, 3, 6, 2, C.white).set(25, 3, C.leafHi).set(27, 3, C.leaf);
    g.outline(OUTLINE);
  });
}

function beanbag(key: string, base: string, hi: string, lo: string): HTMLCanvasElement {
  return sprite(`beanbag-${key}`, 26, 16, (g) => {
    g.ellipse(13, 9, 11, 5.5, base);
    g.ellipse(13, 5.5, 8, 3.5, shade(base, 0.1));
    g.rect(7, 4, 5, 1, hi).set(6, 5, hi);
    g.rect(4, 12, 18, 1, lo).rect(6, 13, 14, 1, lo);
    g.set(13, 8, lo).set(8, 9, lo).set(18, 9, lo);
    g.outline(OUTLINE);
  });
}

function piano(): HTMLCanvasElement {
  // A white lacquer upright with gold trim (every lair needs one for the dramatic chords).
  return sprite("piano", 32, 32, (g) => {
    const w = "#efe9de";
    const wl = "#d4cbbb";
    g.rect(2, 2, 28, 18, w);
    g.rect(2, 2, 28, 1, "#ffffff");
    g.rect(2, 5, 28, 1, C.brass);
    g.rect(5, 8, 22, 8, wl);
    g.rect(14, 10, 4, 4, C.brass).set(15, 11, C.brassHi);
    g.rect(1, 18, 30, 3, w);
    g.rect(2, 21, 28, 4, "#fbfaf6");
    for (let x = 3; x < 30; x += 2) g.rect(x, 21, 1, 2, OUTLINE);
    g.rect(1, 25, 30, 2, wl);
    g.rect(3, 27, 3, 4, w).rect(26, 27, 3, 4, w).rect(3, 30, 3, 1, C.brass).rect(26, 30, 3, 1, C.brass);
    // A candelabra.
    g.rect(24, 0, 1, 2, C.brass).set(22, 0, C.brass).set(26, 0, C.brass);
    g.outline(OUTLINE);
  });
}

function fishtankStand(): HTMLCanvasElement {
  return sprite("fishtank-stand", 42, 22, (g) => {
    g.rect(1, 1, 40, 18, C.steelLo);
    g.rect(1, 1, 40, 1, C.steelHi);
    hazardStripes(g, 1, 2, 40, 2);
    g.rect(4, 6, 34, 10, C.steelDk);
    for (const x of [4, 37]) g.set(x, 6, C.rivet).set(x, 15, C.rivet);
    // A stencilled fin.
    g.rect(17, 12, 8, 1, C.steelHi).set(20, 11, C.steelHi).set(21, 10, C.steelHi).set(21, 11, C.steelHi).set(22, 9, C.steelHi);
    g.rect(2, 19, 3, 2, C.steelDk).rect(37, 19, 3, 2, C.steelDk);
    g.outline(OUTLINE);
  });
}

function tv(w: number, h: number, standing: boolean): HTMLCanvasElement {
  // A screen in a heavy teak-and-chrome cabinet; standing ones sit on a long hi-fi console.
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rrect(1, 1, w, h, "#4a3226", 1);
    g.rect(2, 2, w - 2, 1, "#6a4a36");
    g.rect(3, 3, w - 4, h - 4, "#0e0c12");
    g.set(w - 3, h - 1, C.glowGreen).set(w - 6, h - 1, C.glowAmber);
    if (standing) {
      g.rect(1 + w / 2 - 4, h + 1, 8, 4, C.steelLo);
      g.rect(6, h + 5, w - 10, 14, "#7a4f34");
      g.rect(6, h + 5, w - 10, 2, "#9a6a46");
      // Speaker grille, a dial, the record deck lid.
      for (let x = 10; x < w / 2 - 4; x += 2) g.rect(x, h + 9, 1, 8, "#5a3a26");
      g.rect(w / 2 + 2, h + 9, w / 2 - 12, 4, C.steelHi).rect(w / 2 + 2, h + 9, w / 2 - 12, 1, C.steelTop);
      g.ellipse(w - 12, h + 15, 1.6, 1.6, C.brass);
      g.rect(8, h + 19, 2, 2, C.steelHi).rect(w - 8, h + 19, 2, 2, C.steelHi);
    } else {
      g.rect(1 + w / 2 - 6, h + 1, 12, 2, C.steelLo);
    }
    g.outline(OUTLINE);
  });
}

function speaker(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rrect(1, 1, 10, 26, "#5a3a28", 1);
    g.rect(2, 2, 8, 1, "#7a5238");
    g.rect(2, 4, 8, 20, "#2a2224");
    for (let y = 5; y < 24; y += 2) g.rect(2, y, 8, 1, "#3a3034");
    g.ellipse(5.5, 9, 2.5, 2.5, "#4a3e40");
    g.ellipse(5.5, 18, 3, 3, "#4a3e40");
    g.set(5, 9, C.brass).set(5, 18, C.brass);
    g.outline(OUTLINE);
  });
}

function arcade(): HTMLCanvasElement {
  // A teal-and-steel cabinet with a volcano on the marquee; the office plays the screen (x+3..22, y+10..23).
  return sprite("arcade", 26, 48, (g) => {
    g.rect(1, 1, 24, 46, C.tealLo);
    g.rect(1, 1, 2, 46, C.teal).rect(23, 1, 2, 46, C.tealLo);
    g.rect(1, 1, 24, 1, C.tealHi);
    // The marquee: a little volcano with lava on top, lit from behind.
    g.rect(2, 2, 22, 6, "#1a1418");
    g.rect(9, 6, 8, 1, C.rockHi).rect(10, 5, 6, 1, C.rockHi).rect(11, 4, 4, 1, C.rockHi);
    g.rect(12, 3, 2, 1, C.lava).set(11, 3, C.lavaHi).set(14, 3, C.lavaHi).set(12, 2, C.lavaHot);
    g.set(4, 4, C.glowRed).set(21, 4, C.glowRed);
    // The bezel round the screen.
    g.rect(2, 8, 22, 17, "#121418");
    g.rect(3, 10, 20, 14, "#0c1012");
    g.rect(2, 8, 22, 1, C.steelDk);
    // The control deck: a red ball-top stick and two buttons.
    g.rect(1, 25, 24, 6, C.cream).rect(1, 25, 24, 1, C.creamHi).rect(1, 30, 24, 1, C.creamLo);
    g.rect(7, 26, 1, 3, C.ink).rect(6, 25, 3, 2, C.velvetHi);
    g.rect(14, 27, 2, 2, C.glowRed).rect(18, 27, 2, 2, C.hazard);
    // The coin door and the kick plate.
    g.rect(2, 31, 22, 13, C.steelLo);
    g.rect(9, 34, 8, 6, C.steelDk);
    g.set(11, 36, C.lavaHi).set(14, 36, C.lavaHi);
    hazardStripes(g, 1, 44, 24, 3);
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the briefing room

function meetingTable(): HTMLCanvasElement {
  // A long black briefing table with a red pinstripe and a glowing map strip inlaid.
  return sprite("meeting-table", 68, 30, (g) => {
    g.rect(1, 1, 66, 20, "#2c272b");
    g.rect(1, 1, 66, 1, "#4a4247");
    g.rect(3, 3, 62, 1, C.velvet);
    g.rect(3, 17, 62, 1, C.velvet);
    g.rect(14, 8, 40, 5, C.screen);
    for (let x = 16; x < 52; x += 3) g.set(x, 10 + ((x * 7) % 2), "#2f9a72");
    g.set(30, 9, C.glowRed).set(41, 11, C.glowRed);
    g.rect(1, 20, 66, 2, "#1f1b1f");
    g.rect(1, 22, 66, 1, "#141114");
    g.rect(4, 23, 3, 5, C.steelLo).rect(61, 23, 3, 5, C.steelLo);
    g.rect(28, 23, 12, 2, C.steelDk);
    // A water carafe.
    g.rect(5, 4, 3, 4, "#cfe6ee").set(6, 3, "#cfe6ee");
    g.outline(OUTLINE);
  });
}

function whiteboard(w: number): HTMLCanvasElement {
  // A projection screen lowered from a steel housing, a pointer on its hook.
  return sprite(`whiteboard-${w}`, w + 2, 46, (g) => {
    g.rect(0, 0, w + 2, 3, C.steelLo);
    g.rect(0, 0, w + 2, 1, C.steelHi);
    g.rect(1, 3, w, 32, "#d9dfe2");
    g.rect(3, 3, w - 4, 30, "#f4f6f4");
    g.rect(1, 34, w, 2, "#7f878e");
    g.rect(Math.floor(w / 2) - 2, 36, 4, 2, C.steelDk);
    g.set(Math.floor(w / 2), 38, C.velvet);
    g.rect(8, 34, 6, 1, C.glowRed).rect(16, 34, 6, 1, C.teal);
    g.rect(4, 37, 2, 8, C.steelLo).rect(w - 5, 37, 2, 8, C.steelLo);
    g.outline(OUTLINE);
  });
}

function highChair(key: string, back: boolean): HTMLCanvasElement {
  // Black leather, high-backed, chrome: the briefing room and your guests' chairs.
  return sprite(`chair-${key}`, 16, 32, (g) => {
    if (back) {
      // Seen from behind, low enough that the sitter shows above it.
      g.rrect(2, 14, 12, 11, "#1c181b", 2);
      g.rect(3, 15, 10, 9, C.leather);
      g.rect(3, 15, 10, 1, C.leatherHi);
      g.set(5, 18, C.brass).set(10, 18, C.brass).set(5, 22, C.brass).set(10, 22, C.brass);
      g.rect(7, 25, 2, 3, C.steelHi);
      g.rect(3, 28, 10, 1, C.steelHi);
      g.set(3, 29, C.steelLo).set(12, 29, C.steelLo);
    } else {
      // Facing you: a tall back behind the sitter.
      g.rrect(3, 6, 10, 16, "#1c181b", 2);
      g.rect(4, 7, 8, 14, C.leather);
      g.rect(4, 7, 8, 1, C.leatherHi);
      for (let y = 10; y < 20; y += 4) g.set(6, y, C.brass).set(9, y + 2, C.brass);
      g.rrect(2, 20, 12, 5, C.leatherHi, 1);
      g.rect(3, 20, 10, 1, "#5e5357");
      g.rect(7, 25, 2, 3, C.steelHi);
      g.rect(3, 28, 10, 1, C.steelHi);
      g.set(3, 29, C.steelLo).set(12, 29, C.steelLo);
    }
    g.outline(OUTLINE);
  });
}

function planRolls(classic: HTMLCanvasElement): HTMLCanvasElement {
  return sprite("plan-rolls", classic.width, classic.height, (g) => {
    // A drum of rolled schematics.
    g.rect(3, 14, 12, 13, C.steelLo);
    g.rect(3, 14, 12, 1, C.steelHi);
    hazardStripes(g, 3, 18, 12, 2);
    g.rect(3, 26, 12, 1, C.steelDk);
    for (const [x, h, c] of [[4, 12, "#cfe0ee"], [7, 15, "#e9e4d4"], [10, 11, "#9fc4e6"], [12, 14, "#cfe0ee"]] as const) {
      g.rect(x, 14 - h, 3, h, c);
      g.set(x + 1, 14 - h, shade(c, -0.25));
    }
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the canteen

function counter(w: number): HTMLCanvasElement {
  // A chrome serving counter, a red tiled backsplash, the kettle, the sink and the microwave.
  return sprite(`counter-${w}`, w + 2, 36, (g) => {
    const top = 10;
    g.rect(1, 2, w, top - 2, "#b9493d");
    for (let x = 1; x < w + 1; x += 4) g.vline(x, 2, top - 2, "#a33e33");
    g.rect(1, 5, w, 1, "#a33e33");
    g.rect(1, top, w, 7, "#c9d0d6");
    g.rect(1, top, w, 1, "#eef2f4");
    g.rect(1, top + 7, w, 17, C.steelLo);
    g.rect(1, top + 7, w, 1, C.steelHi);
    for (let x = 4; x < w - 6; x += 22) {
      g.rect(x, top + 10, 18, 11, C.steel);
      g.rect(x, top + 10, 18, 1, C.steelHi);
      g.rect(x + 7, top + 14, 4, 1, C.steelTop);
    }
    hazardStripes(g, 1, top + 23, w, 1);
    // The kettle: a chrome dome with a black handle.
    g.rrect(31, 6, 9, 9, "#d5dbe2", 2);
    g.rect(32, 7, 3, 1, "#ffffff");
    g.rect(33, 4, 5, 2, OUTLINE).set(40, 9, OUTLINE);
    if (w >= 80) {
      g.rect(44, top + 1, 16, 5, "#9aa3ad");
      g.rect(45, top + 2, 14, 3, "#7d868f");
      g.rect(51, top - 4, 2, 5, "#9aa3ad").set(52, top - 4, "#d5dbe2");
    }
    if (w >= 100) {
      g.rect(w - 26, 0, 22, 14, "#3a3a46");
      g.rect(w - 24, 2, 13, 10, "#2a2e2c");
      g.rect(w - 9, 3, 3, 8, "#22222c").set(w - 8, 4, C.glowGreen);
    }
    // A stack of trays.
    g.rect(w >= 80 ? 64 : 22, top - 3, 10, 1, "#e0722e").rect(w >= 80 ? 64 : 22, top - 2, 10, 1, "#c45a22").rect(w >= 80 ? 64 : 22, top - 1, 10, 1, "#e0722e");
    g.outline(OUTLINE);
  });
}

function island(w: number): HTMLCanvasElement {
  // The serving line: chrome rails, hot pans of the day's slop, a sneeze guard.
  return sprite(`island-${w}`, w + 2, 26, (g) => {
    g.rect(1, 6, w, 8, "#c9d0d6");
    g.rect(1, 6, w, 1, "#eef2f4");
    const pans = ["#e0b04a", "#7aa04a", "#c45a3a", "#e8e0c8"];
    for (let i = 0, x = 4; x + 12 <= w - 2; i++, x += 15) {
      g.rect(x, 7, 12, 5, "#7d868f");
      g.rect(x + 1, 8, 10, 3, pans[i % pans.length]!);
      g.set(x + 3, 8, shade(pans[i % pans.length]!, 0.25));
    }
    g.rect(2, 1, w - 2, 1, "#d9eef2aa").rect(2, 1, 1, 5, C.steelHi).rect(w - 1, 1, 1, 5, C.steelHi);
    g.rect(1, 14, w, 9, C.steelLo);
    g.rect(1, 14, w, 1, C.steelHi);
    g.rect(1, 16, w, 1, C.steelTop);
    hazardStripes(g, 1, 21, w, 1);
    g.rect(1, 23, w, 1, C.steelDk);
    g.outline(OUTLINE);
  });
}

function stool(): HTMLCanvasElement {
  return sprite("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, C.velvet);
    g.rect(3, 1, 4, 1, C.velvetHi);
    g.rect(5, 4, 2, 4, C.steelHi);
    g.rect(2, 8, 8, 1, C.steelHi);
    g.outline(OUTLINE);
  });
}

function fridge(): HTMLCanvasElement {
  // A brushed-steel cold store with a frosty window and a warning stripe.
  return sprite("fridge", 20, 34, (g) => {
    g.rrect(1, 1, 18, 31, C.steelHi, 1);
    g.rect(2, 2, 16, 1, C.steelTop);
    g.rect(1, 12, 18, 1, C.steelLo);
    g.rect(4, 4, 8, 6, "#cfe6ee");
    g.rect(4, 4, 8, 1, "#ffffff");
    g.rect(15, 4, 2, 6, C.steelDk).rect(15, 15, 2, 8, C.steelDk);
    hazardStripes(g, 1, 27, 18, 2);
    // A snowflake sticker.
    g.set(7, 18, "#5ab0e8").set(6, 17, "#5ab0e8").set(8, 17, "#5ab0e8").set(6, 19, "#5ab0e8").set(8, 19, "#5ab0e8").set(7, 16, "#5ab0e8").set(7, 20, "#5ab0e8");
    g.outline(OUTLINE);
  });
}

function vending(): HTMLCanvasElement {
  // Snacks for henchpeople: the window and the coin flap where the office expects them.
  return sprite("vending", 24, 44, (g) => {
    g.rect(1, 1, 22, 42, "#2c3a3e");
    g.rect(1, 1, 22, 3, C.teal);
    g.rect(1, 1, 22, 1, C.tealHi);
    g.rect(3, 5, 13, 28, "#121518");
    const snacks = ["#ffd84a", "#ff6a1a", "#86e07f", "#ff9fb2", "#7cc8ff", "#e0b04a"];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, "#4a565a");
      for (let c = 0; c < 3; c++) g.rect(4 + c * 4, 6 + r * 7, 3, 4, snacks[(r * 3 + c) % snacks.length]!);
    }
    g.rect(17, 6, 5, 10, "#141618");
    for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, C.glowAmber);
    g.rect(17, 18, 5, 2, C.hazard);
    g.rect(3, 35, 18, 5, "#141618");
    hazardStripes(g, 1, 41, 22, 2);
    g.outline(OUTLINE);
  });
}

function espresso(): HTMLCanvasElement {
  // A chrome espresso machine with pressure gauges and a red alarm lamp on top.
  return sprite("espresso", 26, 30, (g) => {
    g.rect(3, 2, 20, 3, "#d5dbe2");
    g.rect(5, 0, 3, 2, C.white).rect(10, 0, 3, 2, C.white);
    g.rect(18, 0, 3, 2, C.glowRed);
    g.rect(1, 5, 24, 9, C.steelHi);
    g.rect(1, 5, 24, 1, C.steelTop);
    g.ellipse(6, 9, 2, 2, C.white).ellipse(19, 9, 2, 2, C.white);
    g.set(6, 8, OUTLINE).set(20, 9, OUTLINE);
    g.rect(1, 14, 24, 10, C.steelLo);
    g.rect(6, 14, 4, 3, "#2a2e32").rect(16, 14, 4, 3, "#2a2e32");
    g.rect(7, 17, 2, 1, "#1f2226").rect(17, 17, 2, 1, "#1f2226");
    g.rect(3, 22, 20, 2, "#7d868f");
    g.rect(1, 24, 24, 5, C.steelDk);
    g.rect(1, 24, 24, 1, C.steel);
    g.outline(OUTLINE);
  });
}

function cooler(): HTMLCanvasElement {
  return sprite("cooler", 17, 36, (g) => {
    g.rrect(4, 1, 9, 10, "#7fd0d8", 2);
    g.rect(5, 2, 2, 6, "#c9f0f4");
    g.rect(6, 11, 5, 1, C.steelDk);
    g.rect(3, 12, 11, 22, C.steelHi);
    g.rect(3, 12, 11, 1, C.steelTop);
    g.rect(5, 16, 7, 4, C.steelDk);
    g.set(6, 17, C.glowBlue).set(10, 17, C.glowRed);
    hazardStripes(g, 3, 30, 11, 2);
    g.outline(OUTLINE);
  });
}

function printer(): HTMLCanvasElement {
  // A chunky line printer in cream with a fan of green-bar paper.
  return sprite("printer", 30, 26, (g) => {
    g.rect(2, 4, 26, 6, "#f1efe6");
    for (let y = 5; y < 10; y += 2) g.rect(3, y, 24, 1, "#cfe8cf");
    g.rect(1, 9, 28, 12, C.cream);
    g.rect(1, 9, 28, 1, C.creamHi);
    g.rect(3, 12, 14, 3, C.ink);
    g.rect(21, 12, 5, 2, C.creamLo);
    g.set(22, 16, C.glowGreen).set(24, 16, C.glowAmber);
    g.rect(1, 20, 28, 2, C.creamLo);
    g.rect(3, 22, 3, 3, C.steelDk).rect(24, 22, 3, 3, C.steelDk);
    g.outline(OUTLINE);
  });
}

function bin(): HTMLCanvasElement {
  return sprite("bin", 16, 16, (g) => {
    g.rect(3, 3, 10, 12, C.steelLo);
    g.rect(3, 3, 10, 1, C.steelHi);
    g.ellipse(7.5, 3, 5, 1.5, C.steelDk);
    hazardStripes(g, 3, 8, 10, 2);
    g.rect(4, 12, 1, 2, C.steel);
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the antechamber

function reception(): HTMLCanvasElement {
  // The guard post: a steel desk with a hazard front, a lamp, a sign-in book and the bell.
  return sprite("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 4, C.steelHi);
    g.rect(1, 6, 34, 1, C.steelTop);
    g.rect(1, 10, 34, 10, C.steelLo);
    hazardStripes(g, 1, 12, 34, 3);
    g.rect(1, 19, 34, 1, C.steelDk);
    g.rect(4, 3, 8, 3, C.white).rect(8, 3, 1, 3, C.creamLo);
    g.rect(24, 1, 1, 5, C.ink).rect(22, 0, 5, 2, C.velvet);
    g.ellipse(30, 4, 2, 1.5, C.brass);
    g.outline(OUTLINE);
  });
}

function loungeTable(): HTMLCanvasElement {
  return sprite("lounge-table", 28, 12, (g) => {
    g.ellipse(13.5, 4, 12, 3, C.ink);
    g.ellipse(13.5, 3.5, 11, 2.4, "#3e3a40");
    g.rect(6, 2, 6, 2, C.white).set(7, 2, C.velvet);
    g.rect(13, 7, 2, 4, C.brass);
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the reactor

function reactorCabinet(): HTMLCanvasElement {
  // A control cabinet: dials and a meter on the left, the drive lights column on the right.
  return sprite("server-rack", 16, 33, (g) => {
    g.rect(1, 1, 14, 30, C.creamLo);
    g.rect(1, 1, 14, 1, C.creamHi);
    g.rect(9, 3, 5, 27, "#1d2224");
    g.ellipse(4.5, 6, 2.2, 2.2, C.white);
    g.set(4, 6, OUTLINE).set(5, 5, OUTLINE);
    g.ellipse(4.5, 13, 2.2, 2.2, C.white);
    g.set(5, 13, OUTLINE).set(5, 14, OUTLINE);
    for (let y = 18; y < 28; y += 3) g.rect(3, y, 4, 1, C.ink).set(3 + ((y / 3) % 3), y, C.glowAmber);
    g.rect(1, 31, 14, 1, C.steelDk);
    g.outline(OUTLINE);
  });
}

function reactorCore(): HTMLCanvasElement {
  // The doomsday core: a glass column full of glow in a riveted cage.
  return sprite("ai-rack", 20, 33, (g) => {
    g.rect(1, 1, 18, 30, C.steelDk);
    g.rect(1, 1, 18, 7, C.steelLo);
    g.rect(1, 1, 18, 1, C.steelHi);
    g.rect(4, 9, 12, 20, "#1f6a62");
    g.rect(6, 10, 8, 18, "#5ae0c8");
    g.rect(8, 11, 3, 16, "#c8fff2");
    for (let y = 12; y < 28; y += 4) g.rect(4, y, 12, 1, C.steelLo);
    g.rect(1, 9, 3, 20, C.steel).rect(16, 9, 3, 20, C.steel);
    hazardStripes(g, 1, 29, 18, 2);
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ your lair

function bossDesk(w: number): HTMLCanvasElement {
  // Mahogany and brass, a leather blotter, and on the left the big red button under a flip-up cover.
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    g.rect(1, 1, w, 9, C.mahogHi);
    g.rect(1, 1, w, 1, "#a65640");
    g.rect(1, 10, w, 2, C.brass);
    g.rect(1, 12, w, 14, C.mahog);
    g.rect(1, 12, w, 1, C.mahogHi);
    for (let x = 6; x < w - 4; x += 16) {
      g.rect(x, 15, 12, 8, C.mahogLo);
      g.rect(x + 5, 18, 2, 1, C.brass);
    }
    g.rect(1, 26, w, 1, C.mahogDk);
    g.rect(3, 27, 4, 2, C.mahogDk).rect(w - 5, 27, 4, 2, C.mahogDk);
    g.rect(Math.floor(w / 2) - 10, 3, 20, 5, C.leather);
    g.rect(Math.floor(w / 2) - 9, 4, 18, 1, C.leatherHi);
    // The big red button: a chrome collar, a fat red dome, a hazard plate.
    hazardStripes(g, 4, 2, 12, 7, 4);
    g.ellipse(9.5, 4.5, 4, 2.6, C.steelHi);
    g.ellipse(9.5, 4, 3, 2, C.velvetHi);
    g.rect(8, 3, 2, 1, "#ff9a9a");
    // A gold phone on the right.
    g.rect(w - 12, 3, 7, 4, C.brass).rect(w - 13, 2, 9, 1, C.brassHi).set(w - 9, 5, C.brassLo);
    g.outline(OUTLINE);
  });
}

function bossChair(): HTMLCanvasElement {
  // A tall wingback swivel chair in black leather, brass studs, on a five-star base.
  return sprite("boss-chair", 22, 26, (g) => {
    g.rrect(3, 0, 16, 19, "#1c181b", 3);
    g.rect(4, 1, 14, 17, C.leather);
    g.rect(5, 1, 12, 1, C.leatherHi);
    for (let y = 4; y < 17; y += 4) for (let x = 6; x < 17; x += 4) g.set(x + ((y / 4) % 2 ? 2 : 0), y, "#141114");
    g.rect(4, 1, 1, 17, C.brassLo);
    g.rect(17, 1, 1, 17, C.brassLo);
    g.rrect(1, 8, 4, 11, C.leatherHi, 1).rrect(17, 8, 4, 11, C.leatherHi, 1);
    g.rect(3, 18, 16, 3, C.leatherHi);
    g.rect(10, 21, 2, 2, C.steelHi);
    g.rect(4, 23, 14, 1, C.steelHi);
    g.set(4, 24, C.steelLo).set(17, 24, C.steelLo).set(11, 24, C.steelLo);
    g.outline(OUTLINE);
  });
}

function globeCabinet(): HTMLCanvasElement {
  // A mahogany drinks cabinet with red velvet doors (the globe sits on top).
  return sprite("boss-shelf", 32, 32, (g) => {
    g.rect(1, 6, 30, 24, C.mahog);
    g.rect(1, 6, 30, 2, C.mahogHi);
    g.rect(1, 8, 30, 1, C.brass);
    g.rect(3, 11, 12, 16, C.velvet).rect(17, 11, 12, 16, C.velvet);
    g.rect(3, 11, 12, 1, C.velvetHi).rect(17, 11, 12, 1, C.velvetHi);
    g.set(14, 19, C.brassHi).set(17, 19, C.brassHi);
    g.rect(1, 28, 30, 2, C.mahogLo);
    g.rect(2, 30, 3, 2, C.mahogDk).rect(27, 30, 3, 2, C.mahogDk);
    // A decanter and two glasses on the shelf top.
    g.rect(3, 2, 3, 4, "#d9a25a").set(4, 1, "#d9a25a").rect(8, 4, 2, 2, "#d9eef2").rect(26, 4, 2, 2, "#d9eef2");
    g.outline(OUTLINE);
  });
}

function lavaLamp(): HTMLCanvasElement {
  // A tall floor lava lamp: brass base and cap, red blobs in amber glass.
  return sprite("lamp", 16, 52, (g) => {
    g.rect(6, 0, 4, 3, C.brass);
    g.rect(5, 3, 6, 2, C.brassHi);
    g.rrect(4, 5, 8, 30, "#f2a63a", 2);
    g.rect(5, 6, 2, 26, "#ffd27a");
    g.ellipse(8, 10, 2, 2.5, C.lavaLo);
    g.ellipse(9, 20, 2.5, 3, C.lavaLo);
    g.ellipse(7, 29, 2.5, 2, C.lavaLo);
    g.rect(4, 35, 8, 2, C.brassLo);
    g.rect(5, 37, 6, 9, C.brass);
    g.rect(5, 37, 2, 9, C.brassHi);
    g.rect(3, 46, 10, 4, C.brassLo);
    g.rect(3, 46, 10, 1, C.brass);
    g.outline(OUTLINE);
  });
}

function chargingPad(): HTMLCanvasElement {
  // Where the robot hound recharges: a steel pad with a glowing ring.
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 12, 5.5, C.steelDk);
    g.ellipse(12.5, 6.5, 11, 4.5, C.steelLo);
    g.ellipse(12.5, 6.5, 8, 3, "#3a8a9a");
    g.ellipse(12.5, 6.5, 6.5, 2, C.steelLo);
    g.rect(9, 6, 7, 1, C.steelHi);
    g.outline(OUTLINE);
  });
}

function lairGlassFront(w: number, gapX: number, wood: boolean): HTMLCanvasElement {
  // The front edge of a closed room: smoked glass in steel (or mahogany and brass for your lair).
  return sprite(`front-${w}-${gapX}-${wood}`, w, 11, (g) => {
    const frame = wood ? C.mahogLo : C.steelDk;
    const light = wood ? C.brass : C.steelHi;
    const glass = wood ? "#6a3a3ecc" : "#7fa8b0aa";
    for (let x = 0; x < w; x++) {
      if (gapX >= 0 && x >= gapX - 9 && x < gapX + 9) continue;
      g.set(x, 0, frame).set(x, 1, light);
      for (let y = 2; y < 9; y++) g.set(x, y, glass);
      g.set(x, 9, frame).set(x, 10, wood ? C.mahogDk : "#2a3036");
    }
    for (let x = 6; x < w; x += 24) {
      if (gapX >= 0 && x >= gapX - 10 && x < gapX + 10) continue;
      g.set(x, 3, "#ffffff88").set(x + 1, 4, "#ffffff88");
      g.vline(x + 12, 1, 9, frame);
    }
  });
}

function planter(w: number): HTMLCanvasElement {
  // A steel trough of jungle ferns between the console rows.
  return sprite(`planter-${w}`, w, 20, (g) => {
    g.rect(0, 12, w, 7, C.steelLo);
    g.rect(0, 12, w, 1, C.steelHi);
    hazardStripes(g, 0, 17, w, 1);
    for (let x = 2; x < w - 2; x += 5) {
      const h = 5 + ((x * 7) % 6);
      g.rect(x, 12 - h, 1, h, C.leaf);
      g.set(x - 1, 12 - h + 1, C.leafHi).set(x + 1, 12 - h + 2, C.leafHi).set(x + 2, 12 - h + 4, C.leafLo);
    }
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ dispatch

export function lairProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "beanbag-blue":
      return beanbag("teal", C.teal, C.tealHi, C.tealLo);
    case "beanbag-pink":
      return beanbag("lava", "#d8622a", "#f08a4a", "#a8441a");
    case "piano":
      return piano();
    case "arcade":
      return arcade();
    case "fishtank-stand":
      return fishtankStand();
    case "tv":
      return tv(p.w ?? 120, L.tv.h, p.z > 0);
    case "meeting-table":
      return meetingTable();
    case "whiteboard":
      return whiteboard(p.w ?? 80);
    case "meeting-chair-back":
      return highChair("back", true);
    case "meeting-chair-front":
      return highChair("front", false);
    case "guest-chair":
      return highChair("guest", true);
    case "plan-rolls":
      return planRolls(classic());
    case "glass-front": {
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      return lairGlassFront(p.w ?? 100, gap, room?.walls === "wood");
    }
    case "kitchen-counter":
      return counter(p.w ?? 100);
    case "kitchen-island":
      return island(p.w ?? 72);
    case "stool":
      return stool();
    case "fridge":
      return fridge();
    case "vending":
      return vending();
    case "espresso":
      return espresso();
    case "cooler":
      return cooler();
    case "printer":
      return printer();
    case "bin":
      return bin();
    case "reception":
      return reception();
    case "lounge-table":
      return loungeTable();
    case "waiting-sofa":
    case "waiting-sofa-back":
    case "waiting-armchair":
    case "waiting-armchair-left":
    case "waiting-chair":
      return velvet(classic(), `${p.kind}-${p.w ?? 0}`);
    case "server-rack":
      return reactorCabinet();
    case "ai-rack":
      return reactorCore();
    case "boss-desk":
      return bossDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair();
    case "library-shelf":
      return p.id === "boss-shelf" ? globeCabinet() : steel(classic(), `shelf`);
    case "lamp":
      return lavaLamp();
    case "dog-bed":
      return chargingPad();
    case "planter":
      return planter(p.w ?? 48);
    case "putting-green":
    case "cradle":
    case "hoop":
      return null;
    case "armchair":
    case "sofa-front":
    case "sofa-back":
      return velvet(classic(), p.kind);
    case "library-table":
    case "side-table":
    case "bench":
    case "bookshelf":
    case "low-shelf":
      return mahogany(classic(), `${p.kind}`);
    default:
      return steel(classic(), `${p.kind}-${p.w ?? 0}`);
  }
}

// Pieces this scenery doesn't draw itself: the classic shapes in its materials.
const velvet = (src: HTMLCanvasElement, key: string) => cached(`lair|velvet-${key}`, () => ramp(src, VELVET_RAMP));
const steel = (src: HTMLCanvasElement, key: string) => cached(`lair|steel-${key}`, () => ramp(src, STEEL_RAMP));
const mahogany = (src: HTMLCanvasElement, key: string) => cached(`lair|mahog-${key}`, () => ramp(src, MAHOG_RAMP));

export const lairSpeaker = speaker;
