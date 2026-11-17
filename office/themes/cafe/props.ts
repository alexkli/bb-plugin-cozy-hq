// Coffee Shop: the furniture. Walnut and marble at the espresso bar, chrome
// and copper on the machine, green velvet by the fire, bentwood chairs round
// the farmhouse table, a wicker basket for the café dog. Every prop keeps its
// classic size (taken from the classic sprite); live details (the screen, the
// steam, the fridge door, the chalk strokes) land where they always do.

import type { Layout, PlantPlacement, PropPlacement } from "../../layout.ts";
import { Grid, hash, shade } from "../../themekit.ts";
import { C, OUTLINE, sprite } from "./kit.ts";

// A few colors of the furniture's own.
const K = {
  bottle: "#7a4a2a",
  juice: "#f0a23a",
  berry: "#c4486a",
  fizz: "#b8e0d8",
  cake: "#f3d9b0",
  cakeLo: "#d9b483",
  icing: "#fbeef2",
  berryHi: "#e8708a",
  choc: "#5a3424",
  chocHi: "#7a4a32",
  wicker: "#c9955a",
  wickerHi: "#e0b57a",
  wickerLo: "#9a6a38",
  plaidA: "#b4483a",
  plaidB: "#2f4a3a",
  plaidC: "#e8d6a8",
  turf: "#4f8f4a",
  turfHi: "#64a85c",
  turfLo: "#3c7238",
  key: "#f6f1e6",
  screen: "#14121c",
  glassDk: "#3e5a5e",
  glassLo: "#6d9aa2",
  jarLid: "#b8b2a4",
  terraPot: "#c47a4e",
  terraHi: "#da9466",
  terraLo: "#9a5a36",
  ceramic: "#f1ece2",
  ceramicLo: "#cfc7b8",
};

/** A sprite the size of the classic one (so placing, depth and clicks line up). */
function sized(key: string, classic: () => HTMLCanvasElement, draw: (g: Grid, w: number, h: number) => void, outline = true): HTMLCanvasElement {
  const c = classic();
  const w = c.width;
  const h = c.height;
  return sprite(`${key}-${w}x${h}`, w, h, (g) => draw(g, w, h), outline);
}

/** A tiny mug (3×3 plus a handle), seen from above-front. */
function mug(g: Grid, x: number, y: number, body: string): void {
  g.rect(x, y, 3, 3, body).set(x + 1, y, C.espresso).set(x + 3, y + 1, body);
}

// ------------------------------------------------------------------ the fireside corner

function couch(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A green velvet chesterfield seen from behind (everyone faces the fire): seat
  // cushions on top, the tufted back toward you, rolled arms, turned walnut feet.
  return sized("couch", classic, (g, w) => {
    const r = w - 2;
    // Seat cushions (we look down on them over the back).
    g.rect(7, 2, r - 13, 11, C.velvetHi);
    for (const x of [Math.round(r / 3) + 2, Math.round((2 * r) / 3)]) g.vline(x, 3, 9, C.velvet);
    g.rect(8, 3, r - 15, 1, shade(C.velvetHi, 0.12));
    // A cushion thrown on one end, a knitted throw over the other.
    g.rrect(10, 3, 8, 6, C.mustard, 1).rect(11, 4, 6, 1, C.mustardHi);
    for (let x = r - 22; x < r - 9; x++) for (let y = 2; y < 12; y++) if ((x + y) % 5 !== 0) g.set(x, y, (x * 3 + y) % 4 < 2 ? C.cream : C.creamLo);
    // The tufted back: a rolled top edge, diamond buttons.
    g.rect(4, 12, r - 7, 12, C.velvet);
    g.rect(4, 12, r - 7, 2, C.velvetHi);
    g.rect(4, 14, r - 7, 1, shade(C.velvetHi, -0.08));
    for (let row = 0; row < 3; row++) {
      for (let x = 9 + (row % 2) * 4; x < r - 6; x += 8) {
        g.set(x, 16 + row * 3, C.velvetLo);
        g.set(x - 1, 16 + row * 3 - 1, shade(C.velvet, 0.1));
      }
    }
    g.rect(4, 23, r - 7, 1, C.velvetLo);
    // Rolled arms either end.
    for (const ax of [0, r - 6]) {
      g.rrect(ax + 1, 2, 7, 22, C.velvet, 2);
      g.rect(ax + 2, 3, 5, 2, C.velvetHi);
      g.vline(ax + 2, 6, 16, shade(C.velvet, 0.08));
      g.vline(ax + 6, 6, 16, C.velvetLo);
    }
    // Brass nailheads along the bottom, turned feet.
    for (let x = 6; x < r - 4; x += 3) g.set(x, 22, C.brass);
    for (const fx of [3, Math.round(r / 2) - 1, r - 4]) g.rect(fx, 24, 3, 3, C.walnutLo).set(fx + 1, 24, C.walnutHi);
  });
}

function coffeeTable(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A low walnut table: two mugs, a board-game box, a stack of magazines.
  return sized("coffee-table", classic, (g, w) => {
    const r = w - 2;
    g.rect(1, 1, r, 7, C.walnutHi);
    g.rect(1, 1, r, 1, shade(C.walnutHi, 0.18));
    for (let x = 6; x < r; x += 9) g.vline(x, 2, 6, C.walnut);
    g.rect(1, 8, r, 2, C.walnutLo);
    g.rect(2, 10, 2, 3, C.walnutDk).rect(r - 2, 10, 2, 3, C.walnutDk);
    // Magazines, a game box, mugs.
    g.rect(3, 2, 8, 5, C.paper).rect(4, 3, 8, 4, "#9fd0e6").rect(5, 4, 4, 1, C.rust);
    g.rect(14, 2, 11, 5, C.rust).rect(14, 2, 11, 1, C.rustHi).rect(16, 4, 7, 1, C.cream);
    mug(g, 27, 3, C.cream);
    mug(g, r - 6, 2, C.green);
  });
}

function pouf(classic: () => HTMLCanvasElement, color: string, key: string): HTMLCanvasElement {
  // A chunky knitted floor pouf: cable stitches in columns.
  return sized(key, classic, (g) => {
    const hi = shade(color, 0.2);
    const lo = shade(color, -0.22);
    g.ellipse(12.5, 9.5, 11.5, 5.5, color);
    g.ellipse(12.5, 6.5, 10.5, 4, hi);
    g.ellipse(12, 6, 3, 1.4, shade(hi, 0.12));
    for (let x = 3; x < 23; x += 3) {
      for (let y = 9; y < 15; y += 2) {
        if (g.get(x, y) === null) continue;
        g.set(x, y, lo);
        if (g.get(x + 1, y + 1) !== null) g.set(x + 1, y + 1, lo);
      }
    }
    g.rect(5, 14, 16, 1, lo);
  });
}

function floorLamp(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A brass floor lamp with a pleated cream shade.
  return sized("lamp", classic, (g, w, h) => {
    const cx = Math.floor(w / 2) - 1;
    // The shade: wider at the bottom, pleats.
    for (let y = 1; y < 12; y++) {
      const half = 3 + Math.floor(y / 3);
      g.rect(cx - half + 1, y, half * 2, 1, y < 3 ? C.creamLo : C.cream);
    }
    for (let x = cx - 5; x <= cx + 6; x += 2) g.vline(x, 4, 8, C.creamLo);
    g.rect(cx - 6, 12, 14, 1, C.mustardLo);
    g.rect(cx - 2, 1, 4, 1, C.paper);
    // Pole and base.
    g.vline(cx, 13, h - 19, C.brassLo).vline(cx + 1, 13, h - 19, C.brass);
    g.set(cx + 1, 20, C.brassHi).set(cx + 1, 21, C.brassHi);
    g.rect(cx - 1, 28, 4, 2, C.brass);
    g.ellipse(cx + 0.5, h - 4, 5, 2, C.brass);
    g.rect(cx - 3, h - 5, 4, 1, C.brassHi);
    g.rect(cx - 4, h - 3, 10, 1, C.brassLo);
  });
}

function bookshelf(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A walnut bookshelf by your armchair: novels, a little plant, a framed photo; flat top (the globe sits there).
  return sized("bookshelf", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, h - 2, C.walnut);
    g.rect(1, 1, r, 2, C.walnutHi);
    g.rect(3, 4, r - 4, h - 7, C.walnutDk);
    const books = [C.rust, C.green, C.mustard, C.cream, "#5a6fa0", C.velvetHi, C.brickHi, "#8a5aa0"];
    const shelves = [4, 4 + Math.floor((h - 7) / 2)];
    shelves.forEach((sy, si) => {
      const bh = Math.floor((h - 7) / 2) - 2;
      let x = 4;
      let i = si * 3;
      while (x < r - 2) {
        if (si === 0 && x >= r - 11 && x < r - 3) {
          // A small framed photo and a sprig in a jar.
          g.rect(r - 10, sy + bh - 6, 5, 6, C.brass).rect(r - 9, sy + bh - 5, 3, 4, "#9fd0e6").set(r - 8, sy + bh - 3, C.leafLo);
          g.rect(r - 4, sy + bh - 3, 2, 3, K.ceramic).set(r - 4, sy + bh - 5, C.leaf).set(r - 3, sy + bh - 6, C.leafHi).set(r - 5, sy + bh - 4, C.leaf);
          x = r - 2;
          continue;
        }
        const bw = 2 + (hash(`bk${si}${i}`) % 2);
        const tall = bh - (hash(`bt${si}${i}`) % 3);
        const c = books[(i * 5 + si) % books.length]!;
        g.rect(x, sy + bh - tall, bw, tall, c);
        g.vline(x, sy + bh - tall, tall, shade(c, 0.15));
        g.set(x + bw - 1, sy + bh - tall + 2, shade(c, -0.25));
        x += bw;
        i++;
      }
      g.rect(2, sy + bh, r - 2, 1, C.walnutHi);
    });
    g.rect(1, h - 2, r, 1, C.walnutLo);
  });
}

function piano(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // An upright walnut piano: sheet music on the stand, a little brass lamp, the keys toward you.
  return sized("piano", classic, (g, w) => {
    const r = w - 2;
    g.rect(1, 3, r, 15, C.walnut);
    g.rect(1, 3, r, 1, C.walnutHi);
    g.rect(1, 2, r, 1, C.walnutHi);
    // Panels with an inlay.
    g.rect(3, 6, r - 4, 7, C.walnutLo).rect(4, 7, r - 6, 5, C.walnut);
    g.hline(5, 9, r - 8, C.walnutHi);
    // Sheet music and the lamp.
    g.rect(9, 4, 6, 5, C.paper).rect(15, 4, 6, 5, C.paperLo);
    for (const y of [5, 7]) g.hline(10, y, 4, "#8a8070").hline(16, y, 4, "#8a8070");
    g.rect(r - 6, 0, 5, 2, C.brass).set(r - 4, 2, C.brassLo);
    // The keyboard.
    g.rect(1, 18, r, 2, C.walnutDk);
    g.rect(1, 20, r, 4, K.key);
    for (let x = 2; x < r; x += 2) g.set(x, 20, OUTLINE).set(x, 21, OUTLINE);
    for (let x = 3; x < r; x += 7) g.vline(x, 22, 2, "#d6cfc0");
    g.rect(1, 24, r, 1, C.walnutHi);
    // The legs and pedals.
    g.rect(2, 25, 3, 6, C.walnutLo).rect(r - 3, 25, 3, 6, C.walnutLo);
    g.rect(5, 29, r - 8, 2, C.walnutDk);
    g.set(13, 30, C.brass).set(16, 30, C.brass).set(19, 30, C.brass);
  });
}

function sideboard(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A walnut sideboard under the aquarium: two doors, brass pulls, a jar of fish food.
  return sized("fishtank-stand", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, 4, C.walnutHi);
    g.rect(1, 1, r, 1, shade(C.walnutHi, 0.15));
    g.rect(1, 5, r, h - 8, C.walnut);
    const half = Math.floor(r / 2);
    for (const dx of [3, half + 1]) {
      g.rect(dx, 7, half - 4, h - 12, C.walnutLo);
      g.rect(dx + 1, 8, half - 6, h - 14, C.walnut);
    }
    g.set(half - 2, 12, C.brassHi).set(half + 3, 12, C.brassHi);
    g.rect(1, h - 3, r, 1, C.walnutDk);
    g.rect(2, h - 2, 2, 1, C.walnutDk).rect(r - 2, h - 2, 2, 1, C.walnutDk);
  });
}

function arcade(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A vintage wooden cabinet, a glowing amber marquee, a cream control panel.
  return sized("arcade", classic, (g, w, h) => {
    const r = w - 2;
    // The sides and the top.
    g.rect(1, 1, r, h - 2, C.walnut);
    g.vline(1, 1, h - 2, C.walnutHi);
    g.vline(r, 1, h - 2, C.walnutLo);
    // Marquee.
    g.rect(2, 2, r - 2, 6, C.mustard);
    g.rect(3, 3, r - 4, 4, C.mustardHi);
    for (let x = 4; x < r - 2; x += 3) g.set(x, 4, C.rust).set(x + 1, 5, C.rust);
    // The screen (dark: the office draws the game) in a bezel.
    g.rect(2, 8, r - 2, 16, C.walnutDk);
    g.rect(3, 9, 20, 14, K.screen);
    // Control panel: a stick and buttons.
    g.rect(1, 24, r, 6, C.cream);
    g.rect(1, 24, r, 1, C.paper);
    g.rect(1, 29, r, 1, C.creamLo);
    g.vline(6, 25, 3, OUTLINE).set(6, 25, C.rust).set(5, 25, C.rustHi);
    g.set(13, 26, C.rust).set(16, 26, "#3a74c4").set(19, 26, C.mustard);
    // The coin door and the kick panel.
    g.rect(2, 30, r - 2, h - 33, C.walnut);
    g.rect(8, 33, 10, 7, C.walnutLo).rect(9, 34, 3, 2, C.brass).rect(14, 34, 3, 2, C.brass);
    g.set(10, 37, C.amber).set(15, 37, C.amber);
    g.rect(2, h - 4, r - 2, 2, C.walnutDk);
  });
}

// ------------------------------------------------------------------ the middle: water station, the cart, the bin

function waterStation(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A glass dispenser of water with lemon slices and mint on a wooden stand, glasses stacked below.
  return sized("cooler", classic, (g, w, h) => {
    const r = w - 2;
    // The jar.
    g.rect(3, 1, r - 4, 2, K.jarLid);
    g.rrect(2, 3, r - 2, 15, "#cfe8ee", 2);
    g.rect(3, 6, r - 4, 11, "#a9d6e2");
    g.rect(3, 4, 1, 12, "#eef8fb");
    // Lemons and mint floating.
    g.rect(6, 8, 3, 3, "#f2d34a").set(7, 9, "#fbe98a");
    g.rect(10, 12, 3, 2, "#f2d34a").set(11, 12, "#fbe98a");
    g.set(9, 7, C.leaf).set(10, 7, C.leafHi).set(5, 13, C.leaf).set(12, 9, C.leafLo);
    // The spigot.
    g.rect(Math.floor(w / 2) - 1, 18, 3, 2, C.brass).set(Math.floor(w / 2), 20, C.brassLo);
    // The stand: a little walnut cabinet with an open shelf of glasses.
    g.rect(1, 21, r, 2, C.walnutHi);
    g.rect(1, 23, r, h - 25, C.walnut);
    g.rect(2, 25, r - 2, 7, C.walnutDk);
    for (let x = 3; x < r - 1; x += 3) g.rect(x, 28, 2, 4, "#d8eef2").set(x, 28, "#ffffff");
    g.rect(2, 33, r - 2, 1, C.walnutHi);
    g.rect(2, h - 2, 2, 1, C.walnutDk).rect(r - 2, h - 2, 2, 1, C.walnutDk);
  });
}

function selfServeCart(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // The self-serve cart: the order-ticket printer on top (paper comes out of it), cream and sugar below.
  return sized("printer", classic, (g, w, h) => {
    const r = w - 2;
    // The ticket printer (its slot along the top, where the paper comes out).
    g.rrect(6, 1, 18, 9, "#3a3d46", 1);
    g.rect(7, 2, 16, 2, "#55596a");
    g.rect(8, 2, 14, 1, OUTLINE);
    g.rect(8, 6, 4, 2, "#55596a").set(19, 6, "#5ad18a");
    // The cart top: walnut with a brass rail.
    g.rect(1, 10, r, 3, C.walnutHi);
    g.rect(1, 10, r, 1, shade(C.walnutHi, 0.15));
    g.rect(1, 13, r, 1, C.walnutLo);
    g.vline(1, 13, h - 16, C.brass).vline(r, 13, h - 16, C.brass);
    // Lower shelf: the cream jug, the sugar jar, a cup of stirrers.
    g.rect(2, 20, r - 2, 2, C.walnut);
    g.rect(4, 15, 4, 5, K.ceramic).set(8, 16, K.ceramic).rect(4, 15, 4, 1, K.ceramicLo);
    g.rect(11, 15, 5, 5, "#e8e2d4").rect(11, 14, 5, 1, K.jarLid).rect(12, 17, 3, 2, C.paper);
    g.rect(19, 16, 3, 4, C.kraft).set(19, 14, C.walnutLo).set(20, 13, C.walnutLo).set(21, 14, C.walnutLo);
    g.rect(24, 15, 3, 5, C.cream).set(25, 15, C.rust);
    // Wheels.
    g.rect(2, h - 3, 3, 2, C.iron).rect(r - 3, h - 3, 3, 2, C.iron);
  });
}

function bin(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A slim bin with a green compost lid and a little leaf sign.
  return sized("bin", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(3, 1, r - 4, 3, C.green).rect(3, 1, r - 4, 1, C.greenHi);
    g.rect(6, 2, 4, 1, C.greenDk);
    g.rect(2, 4, r - 2, h - 6, C.walnut);
    g.vline(2, 4, h - 6, C.walnutHi);
    for (let x = 5; x < r - 1; x += 3) g.vline(x, 5, h - 8, C.walnutLo);
    g.rect(5, 7, 6, 4, C.cream).set(7, 8, C.leaf).set(8, 9, C.leafLo).set(8, 8, C.leafHi);
    g.rect(2, h - 2, r - 2, 1, C.walnutDk);
  });
}

// ------------------------------------------------------------------ the reserved table

function farmTable(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A long farmhouse table of wide planks: the RESERVED card, a candle jar, a little vase.
  return sized("meeting-table", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, 17, C.oakHi);
    for (let y = 1; y < 18; y += 4) g.hline(1, y + 3, r, C.oakLo);
    g.rect(1, 1, r, 1, "#d8a670");
    for (let i = 0; i < 6; i++) g.set(5 + i * 11, 3 + (i % 3) * 4, C.oak);
    g.rect(1, 18, r, 4, C.oak);
    g.rect(1, 18, r, 1, C.oakLo);
    g.rect(1, 21, r, 1, C.oakDk);
    // Chunky legs.
    g.rect(3, 22, 4, h - 23, C.oakLo).rect(r - 5, 22, 4, h - 23, C.oakLo);
    g.vline(3, 22, h - 23, C.oak).vline(r - 5, 22, h - 23, C.oak);
    // The RESERVED tent card: white with a red rule and dots of "lettering".
    const cx = Math.floor(r / 2) - 6;
    g.rect(cx, 6, 13, 6, C.paper);
    g.rect(cx, 6, 13, 1, "#ffffff");
    g.hline(cx + 1, 8, 11, C.rust);
    for (let x = cx + 2; x < cx + 11; x += 2) g.set(x, 10, C.espresso);
    g.rect(cx, 11, 13, 1, C.paperLo);
    // A candle jar and a vase with a stem.
    g.rect(8, 9, 4, 4, C.amber).rect(8, 9, 4, 1, C.warm).set(9, 8, C.brassHi);
    g.rect(r - 12, 8, 3, 5, "#9fd0e6").set(r - 11, 6, C.leaf).set(r - 11, 7, C.leafLo).set(r - 12, 5, C.chalkPink).set(r - 10, 5, C.chalkPink);
  });
}

function bentwood(classic: () => HTMLCanvasElement, back: boolean, key: string): HTMLCanvasElement {
  // A bentwood café chair in dark walnut: the hoop back, a round caned seat.
  return sized(key, classic, (g) => {
    const wood = C.walnut;
    const hi = C.walnutHi;
    const lo = C.walnutDk;
    const cane = "#d9b77a";
    if (!back) {
      // Seen from the front: the hoop back up top, the seat, legs splayed.
      g.rrect(2, 3, 12, 13, wood, 3);
      g.rect(4, 5, 8, 9, null);
      g.hline(4, 10, 8, wood);
      g.set(4, 5, hi).set(5, 4, hi);
      g.rrect(2, 15, 12, 5, wood, 2);
      g.rect(3, 16, 10, 3, cane);
      g.rect(4, 16, 8, 1, "#ecd29e");
      g.line(3, 20, 2, 30, lo).line(12, 20, 13, 30, lo);
      g.vline(6, 20, 9, wood).vline(9, 20, 9, wood);
      g.rect(3, 26, 10, 1, wood);
    } else {
      // From behind: the seat beyond, the hoop back toward you.
      g.rrect(2, 12, 12, 5, wood, 2);
      g.rect(3, 13, 10, 3, cane);
      g.rrect(2, 13, 12, 13, wood, 3);
      g.rect(4, 15, 8, 9, null);
      g.hline(4, 20, 8, wood);
      g.set(4, 15, hi).set(5, 14, hi);
      g.line(3, 26, 2, 31, lo).line(12, 26, 13, 31, lo);
      g.rect(4, 29, 8, 1, wood);
    }
  });
}

function chalkEasel(classic: () => HTMLCanvasElement, onWall: boolean): HTMLCanvasElement {
  // A chalkboard on an A-frame easel (or hung on the wall): wooden frame, chalk dust, a ledge with chalk (the strokes are live).
  return sized(onWall ? "whiteboard-wall" : "whiteboard", classic, (g, w) => {
    const r = w - 2;
    if (!onWall) {
      // A-frame legs behind the board, splayed.
      g.line(4, 30, 1, 44, C.oakLo).line(r - 3, 30, r, 44, C.oakLo);
      g.line(5, 30, 2, 44, C.oak).line(r - 4, 30, r - 1, 44, C.oak);
      g.rect(2, 41, r - 2, 1, C.oakDk);
    } else {
      // Two brass hooks it hangs from.
      g.rect(6, 0, 2, 2, C.brassHi).rect(r - 6, 0, 2, 2, C.brassHi);
    }
    // The frame and the board.
    g.rect(1, 1, r, 34, C.oak);
    g.rect(1, 1, r, 1, C.oakHi);
    g.vline(1, 1, 34, C.oakHi);
    g.vline(r, 2, 33, C.oakLo);
    g.rect(3, 3, r - 4, 30, C.board);
    g.rect(3, 3, r - 4, 1, C.boardHi);
    // Chalk dust smudges near the edges.
    for (let i = 0; i < Math.floor(r / 7); i++) {
      const x = 4 + ((i * 13) % Math.max(1, r - 8));
      const y = 28 + (i % 3) * 2;
      g.set(x, y, "#4a5450").set(x + 1, y, "#4a5450");
    }
    g.set(r - 6, 5, "#4a5450").set(r - 5, 6, "#4a5450");
    // The ledge with chalk and a cloth.
    g.rect(1, 35, r, 2, C.oakLo);
    g.rect(1, 35, r, 1, C.oak);
    g.rect(7, 34, 4, 1, C.chalk).rect(13, 34, 3, 1, C.chalkPink).rect(18, 34, 3, 1, C.chalkYellow);
    g.rect(r - 10, 34, 6, 2, C.creamLo);
  });
}

// ------------------------------------------------------------------ the back wall and the counter

function specialsScreen(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // The specials screen: a slim black bezel in a thin brass frame, on a small wall mount (the picture is live).
  const tw = p.w ?? 120;
  const th = L.tv.h;
  return sized(`tv-${tw}-${th}`, classic, (g, w, h) => {
    const r = w - 2;
    const bottom = Math.min(th, h - 2);
    g.rect(1, 1, r, bottom, C.brass);
    g.rect(1, 1, r, 1, C.brassHi);
    g.vline(1, 1, bottom, C.brassHi);
    g.rect(2, 2, r - 2, bottom - 2, "#1c1a20");
    g.rect(3, 3, r - 4, bottom - 4, K.screen);
    g.set(r - 2, bottom - 1, "#5ad18a");
    // The mount under it.
    if (h - bottom >= 3) g.rect(Math.floor(w / 2) - 5, bottom + 1, 10, 2, C.iron);
  });
}

function espressoBar(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // The front counter, seen from the customer side: a veined marble top, a walnut front
  // with raised panels and a band of green tiles, a brass foot rail along the bottom.
  return sized("kitchen-counter", classic, (g, w, h) => {
    const r = w - 2;
    // Marble top (we look down on it): ~9 px deep, a rounded front edge.
    g.rect(1, 1, r, 9, C.marble);
    g.rect(1, 1, r, 1, C.marbleHi);
    for (let i = 0; i < Math.floor(r / 9); i++) {
      const x = 3 + ((i * 37) % Math.max(1, r - 10));
      const y = 2 + ((i * 5) % 6);
      g.set(x, y, C.vein).set(x + 1, y + 1, C.vein).set(x + 2, y + 1, C.marbleLo);
    }
    g.rect(1, 10, r, 1, C.marbleHi);
    g.rect(1, 11, r, 1, C.marbleLo);
    // Walnut front.
    g.rect(1, 12, r, h - 13, C.walnut);
    g.rect(1, 12, r, 1, C.walnutLo);
    // A band of green tiles under the lip.
    for (let x = 1; x <= r; x++) {
      const tile = Math.floor((x - 1) / 4) % 2;
      g.set(x, 13, tile ? C.greenHi : C.green).set(x, 14, tile ? C.green : C.greenLo);
      if ((x - 1) % 4 === 0) g.set(x, 13, C.greenDk).set(x, 14, C.greenDk);
    }
    g.rect(1, 15, r, 1, C.walnutDk);
    // Raised panels.
    const pw = 22;
    const n = Math.max(1, Math.floor((r - 4) / pw));
    const start = 1 + Math.floor((r - n * pw) / 2);
    for (let i = 0; i < n; i++) {
      const x = start + i * pw + 2;
      g.rect(x, 17, pw - 4, 11, C.walnutLo);
      g.rect(x + 1, 18, pw - 6, 9, C.walnut);
      g.hline(x + 1, 18, pw - 6, C.walnutHi);
      g.vline(x + 1, 18, 9, C.walnutHi);
    }
    // A chalk price card hung on the front, near the middle.
    if (r >= 90) {
      const cx = Math.floor(r / 2) - 6;
      g.rect(cx, 18, 12, 8, C.board).rect(cx, 18, 12, 1, C.boardHi);
      g.hline(cx + 2, 20, 6, C.chalk).hline(cx + 2, 22, 8, C.chalkYellow).hline(cx + 2, 24, 5, C.chalk);
      g.set(cx + 3, 17, C.brass).set(cx + 8, 17, C.brass);
    }
    // The brass foot rail on little posts, and the kick plate.
    g.rect(1, h - 6, r, 1, C.brassHi);
    g.rect(1, h - 5, r, 1, C.brass);
    for (let x = 6; x < r - 2; x += 18) g.vline(x, h - 4, 2, C.brassLo);
    g.rect(1, h - 3, r, 2, C.walnutDk);
  });
}

function espressoMachine(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // The big shiny machine: chrome body, a copper dome with cups warming on top, two
  // gauges, two group heads with portafilters, a steam wand; the open bay under the
  // spout (where the office draws the cup and the stream) and a drip tray.
  return sized("espresso", classic, (g) => {
    // Cups warming on top.
    for (const x of [6, 10, 14]) g.rect(x, 1, 3, 2, C.paper).set(x + 1, 1, C.cream);
    // The copper dome.
    g.rrect(4, 3, 18, 4, C.copper, 1);
    g.rect(5, 3, 16, 1, C.copperHi);
    g.rect(4, 6, 18, 1, C.copperLo);
    // Chrome body.
    g.rect(1, 7, 24, 18, C.chrome);
    g.rect(1, 7, 24, 1, C.chromeHi);
    g.vline(1, 7, 18, C.chromeHi);
    g.vline(24, 8, 17, C.chromeLo);
    g.rect(2, 8, 1, 15, "#ffffff");
    // Gauges (the office blinks a display at x+10..15, y+10).
    g.rect(3, 9, 3, 3, C.brass).set(4, 10, C.paper);
    g.rect(20, 9, 3, 3, C.brass).set(21, 10, C.paper);
    g.rect(9, 9, 8, 3, C.chromeDk);
    g.rect(10, 10, 6, 1, "#1d2a22");
    // The group heads with their portafilters (black handles).
    g.rect(6, 13, 6, 2, C.chromeDk).rect(7, 15, 4, 1, C.chromeLo);
    g.rect(15, 13, 6, 2, C.chromeDk).rect(16, 15, 4, 1, C.chromeLo);
    g.rect(3, 15, 4, 1, OUTLINE).rect(20, 15, 4, 1, OUTLINE);
    // The open bay under the spouts.
    g.rect(5, 16, 17, 6, "#3a3f46");
    g.rect(5, 16, 17, 1, "#2c3036");
    // The steam wand off the right side.
    g.vline(24, 12, 9, C.chromeLo).set(25, 20, C.chromeLo);
    g.set(24, 11, OUTLINE);
    // The drip tray and the copper base band.
    g.rect(4, 22, 19, 2, C.chromeLo);
    for (let x = 5; x < 22; x += 2) g.set(x, 22, C.chromeDk);
    g.rect(1, 24, 24, 3, C.copper);
    g.rect(1, 24, 24, 1, C.copperHi);
    g.rect(1, 27, 24, 1, C.copperLo);
    g.rect(2, 28, 3, 1, C.iron).rect(21, 28, 3, 1, C.iron);
  });
}

function drinksCooler(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A glass-door drinks cooler in shop green: cold brew, juices and sparkling water on wire shelves.
  return sized("vending", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, h - 2, C.green);
    g.rect(1, 1, r, 1, C.greenHi);
    g.vline(1, 1, h - 2, C.greenHi);
    // The header with a cream label.
    g.rect(3, 2, r - 4, 2, C.cream);
    g.hline(5, 3, r - 8, C.greenLo);
    // The glass (x+3..16, y+5..33).
    g.rect(3, 5, 14, 29, "#cfe8ee");
    const rows = [6, 13, 20, 27];
    const drinks = [K.bottle, K.juice, K.fizz, K.berry];
    rows.forEach((y, ri) => {
      for (let x = 4; x < 16; x += 3) {
        const c = drinks[(ri + Math.floor(x / 3)) % drinks.length]!;
        g.rect(x, y + 1, 2, 5, c).set(x, y, shade(c, -0.2));
        g.set(x, y + 2, shade(c, 0.35));
      }
      g.hline(3, y + 6, 14, "#9ab4ba");
    });
    g.vline(4, 5, 29, "#eef8fb");
    // The side with the handle (the flap at x+17, y+18).
    g.rect(17, 5, r - 17, 29, C.greenLo);
    g.rect(17, 15, 2, 8, C.brass);
    g.set(17, 15, C.brassHi);
    g.rect(19, 8, 3, 4, C.cream).set(20, 9, C.rust);
    // The grille at the bottom.
    g.rect(2, 35, r - 2, h - 37, C.greenDk);
    for (let x = 4; x < r - 2; x += 2) g.vline(x, 36, h - 39, C.greenLo);
  });
}

function cakeFridge(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A tall glass cake fridge: a layer cake, a tart, slices of cheesecake on glass shelves.
  return sized("fridge", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, h - 2, C.walnut);
    g.rect(1, 1, r, 1, C.walnutHi);
    g.rect(2, 2, r - 2, 2, C.cream);
    g.rect(2, 4, r - 2, h - 9, "#e8f4f6");
    g.vline(3, 4, h - 9, "#ffffff");
    // Shelves.
    for (const y of [12, 20]) g.hline(2, y, r - 2, "#b8cfd4");
    // Top shelf: a layer cake with berries.
    g.rect(5, 7, 10, 5, K.cake).rect(5, 7, 10, 1, K.icing).hline(5, 9, 10, K.berry);
    g.set(7, 6, K.berryHi).set(10, 6, K.berryHi).set(13, 6, K.berryHi);
    // Middle: chocolate cake and a lemon tart.
    g.rect(4, 15, 6, 5, K.choc).rect(4, 15, 6, 1, K.chocHi).hline(4, 17, 6, K.cake);
    g.rect(11, 17, 7, 3, "#f2d34a").rect(11, 19, 7, 1, K.cakeLo).set(13, 17, "#fbe98a");
    // Bottom: cheesecake slices.
    g.rect(4, 24, 4, 4, K.icing).rect(4, 27, 4, 1, K.cakeLo).set(5, 24, K.berry);
    g.rect(10, 24, 4, 4, K.icing).rect(10, 27, 4, 1, K.cakeLo).set(11, 24, K.berry);
    g.rect(15, 25, 3, 3, K.cake);
    // The base.
    g.rect(1, h - 5, r, 4, C.walnutLo);
    g.rect(1, h - 5, r, 1, C.walnut);
    g.set(r - 2, 16, C.brassHi).set(r - 2, 17, C.brass);
  });
}

function barStool(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A tall bar stool: a round green leather seat, brass legs and a foot ring.
  return sized("stool", classic, (g, w) => {
    const r = w - 2;
    g.ellipse(r / 2 + 0.5, 2, r / 2 - 0.5, 1.6, C.velvet);
    g.rect(3, 1, r - 4, 1, C.velvetHi);
    g.rect(2, 3, r - 2, 1, C.velvetLo);
    g.vline(3, 4, 5, C.brassLo).vline(r - 2, 4, 5, C.brassLo);
    g.vline(Math.floor(r / 2), 4, 5, C.brass);
    g.hline(3, 7, r - 4, C.brass);
  });
}

// ------------------------------------------------------------------ the back room

function routerShelf(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A metal shelving unit: the network switches stacked on the right (their LEDs blink
  // at x+10..12), bean sacks and boxes of cups on the left.
  return sized("server-rack", classic, (g, w, h) => {
    const r = w - 2;
    g.vline(1, 1, h - 2, C.chromeLo).vline(r, 1, h - 2, C.chromeLo);
    for (const y of [1, 11, 21, h - 3]) g.hline(1, y, r, C.chrome);
    // The switches: a dark stack.
    g.rect(8, 3, 6, h - 6, "#26282e");
    for (let y = 4; y < h - 4; y += 4) g.hline(8, y, 6, "#383b44");
    g.vline(9, 4, h - 8, "#1a1c20");
    // Left: a bean sack, a box of cups, another sack.
    g.rrect(2, 4, 6, 7, C.kraft, 1).rect(3, 6, 4, 1, C.kraftLo).set(4, 8, C.rust);
    g.rect(2, 14, 6, 7, C.cream).rect(2, 14, 6, 1, C.paper).hline(3, 17, 4, C.creamLo);
    g.rrect(2, 23, 6, 7, C.kraft, 1).rect(3, 25, 4, 1, C.kraftLo).set(5, 27, C.green);
  });
}

function aiBox(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // The little AI box on a walnut stand: a dark panel up top for its light band, fan grilles below.
  return sized("ai-rack", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, h - 6, "#24252c");
    g.rect(1, 1, r, 1, "#3a3c46");
    g.rect(2, 2, r - 2, 6, "#16171c");
    for (let y = 9; y < h - 7; y += 6) {
      for (const fx of [6, 12]) {
        g.rect(fx - 2, y, 5, 5, "#2e3038");
        g.set(fx, y + 2, "#3e414c");
      }
    }
    g.rect(1, h - 5, r, 2, C.walnutHi);
    g.rect(1, h - 3, r, 2, C.walnutLo);
  });
}

function front(p: PropPlacement, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  if (p.id === "server-glass") {
    // The back room's front: a low brick half-wall with a wooden cap.
    return sized("store-front", classic, (g, w) => {
      g.rect(0, 0, w, 1, OUTLINE);
      g.rect(0, 1, w, 2, C.walnutHi);
      g.rect(0, 3, w, 1, C.walnutLo);
      for (let y = 4; y < 10; y++) {
        for (let x = 0; x < w; x++) {
          const row = Math.floor((y - 4) / 3);
          const joint = (y - 4) % 3 === 2 || (x + row * 4) % 8 === 0;
          g.set(x, y, joint ? C.mortar : (x * 3 + row) % 7 === 0 ? C.brickLo : C.brick);
        }
      }
      g.rect(0, 10, w, 1, OUTLINE);
    }, false);
  }
  return null;
}

// ------------------------------------------------------------------ your corner

function cornerTable(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // Your table: a marble top on a sturdy walnut base, a little brass RESERVED plaque on the apron.
  return sized("boss-desk", classic, (g, w, h) => {
    const r = w - 2;
    g.rect(1, 1, r, 15, C.marble);
    g.rect(1, 1, r, 1, C.marbleHi);
    for (let i = 0; i < 6; i++) g.set(4 + i * 9, 3 + (i % 3) * 4, C.vein).set(5 + i * 9, 4 + (i % 3) * 4, C.vein);
    g.rect(1, 16, r, 1, C.marbleLo);
    g.rect(1, 17, r, 5, C.walnut);
    g.rect(1, 17, r, 1, C.walnutHi);
    const px = Math.floor(r / 2) - 5;
    g.rect(px, 18, 11, 3, C.brass).hline(px + 1, 19, 9, C.brassLo).set(px, 18, C.brassHi);
    g.rect(3, 22, 4, h - 23, C.walnutLo).rect(r - 5, 22, 4, h - 23, C.walnutLo);
    g.vline(3, 22, h - 23, C.walnut).vline(r - 5, 22, h - 23, C.walnut);
  });
}

function wingback(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A big green velvet wingback, facing you: tall tufted back, wings, rolled arms, a seat cushion.
  return sized("boss-chair", classic, (g, w, h) => {
    const r = w - 2;
    g.rrect(3, 1, r - 4, 16, C.velvet, 3);
    g.rect(5, 2, r - 8, 2, C.velvetHi);
    for (let y = 6; y < 15; y += 4) for (let x = 6 + ((y / 2) % 2) * 2; x < r - 4; x += 4) g.set(x, y, C.velvetLo);
    // The wings.
    g.rrect(1, 5, 4, 12, C.velvetHi, 1).rrect(r - 3, 5, 4, 12, C.velvetHi, 1);
    // Arms and seat.
    g.rrect(1, 14, 5, 9, C.velvet, 2).rrect(r - 4, 14, 5, 9, C.velvet, 2);
    g.rect(2, 14, 3, 1, C.velvetHi).rect(r - 3, 14, 3, 1, C.velvetHi);
    g.rect(6, 15, r - 10, 6, C.velvetHi);
    g.rect(6, 15, r - 10, 1, shade(C.velvetHi, 0.15));
    g.rect(6, 21, r - 10, 2, C.velvetLo);
    g.rect(3, h - 3, 2, 2, C.walnutDk).rect(r - 3, h - 3, 2, 2, C.walnutDk);
  });
}

function dogBasket(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A woven wicker basket with a plaid blanket in it.
  return sized("dog-bed", classic, (g, w, h) => {
    const r = w - 2;
    g.ellipse(r / 2 + 0.5, h / 2, r / 2, h / 2 - 1, K.wicker);
    g.ellipse(r / 2 + 0.5, h / 2 - 1, r / 2 - 3, h / 2 - 3.5, K.plaidA);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const c = g.get(x, y);
        if (c === K.plaidA) {
          if (x % 4 === 0 || y % 4 === 2) g.set(x, y, K.plaidB);
          if (x % 4 === 0 && y % 4 === 2) g.set(x, y, K.plaidC);
        } else if (c === K.wicker) {
          if ((x + y) % 3 === 0) g.set(x, y, K.wickerLo);
          else if ((x * 2 + y) % 5 === 0) g.set(x, y, K.wickerHi);
        }
      }
    }
  });
}

function turfRunner(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A strip of indoor turf: mown stripes, a stitched edge, the cup near the far end.
  return sized("putting-green", classic, (g, w) => {
    g.rrect(1, 1, w - 2, 11, K.turfLo, 1);
    g.rrect(1, 1, w - 2, 10, K.turf, 1);
    for (let x = 3; x < w - 3; x += 8) g.rect(x, 2, 4, 8, K.turfHi);
    g.rect(2, 1, w - 4, 1, "#7cbc70");
    for (let x = 3; x < w - 3; x += 3) g.set(x, 10, C.cream);
    g.rect(9, 3, 1, 6, C.cream);
    g.rect(w - 13, 5, 5, 3, "#1c2a1d").rect(w - 12, 5, 3, 1, "#0f1810").rect(w - 13, 8, 5, 1, "#8fd88b");
    g.outline(OUTLINE);
  }, false);
}

// ------------------------------------------------------------------ the props

export function cafeProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch(classic);
    case "coffee-table":
      return coffeeTable(classic);
    case "arcade":
      return arcade(classic);
    case "beanbag-blue":
      return pouf(classic, C.mustard, "pouf-mustard");
    case "beanbag-pink":
      return pouf(classic, C.rust, "pouf-rust");
    case "lamp":
      return floorLamp(classic);
    case "library-shelf":
      return bookshelf(classic);
    case "printer":
      return selfServeCart(classic);
    case "cooler":
      return waterStation(classic);
    case "bin":
      return bin(classic);
    case "meeting-table":
      return farmTable(classic);
    case "meeting-chair-front":
      return bentwood(classic, false, "bentwood-front");
    case "meeting-chair-back":
      return bentwood(classic, true, "bentwood-back");
    case "guest-chair":
      return bentwood(classic, true, "bentwood-guest");
    case "whiteboard":
      // Hung on the back wall upstairs (its depth is the wall's), else on its easel.
      return chalkEasel(classic, p.z < p.y + 40);
    case "tv":
      return p.z > 0 ? null : specialsScreen(p, L, classic);
    case "piano":
      return piano(classic);
    case "fishtank-stand":
      return sideboard(classic);
    case "kitchen-counter":
      return espressoBar(classic);
    case "espresso":
      return espressoMachine(classic);
    case "vending":
      return drinksCooler(classic);
    case "fridge":
      return cakeFridge(classic);
    case "stool":
      return barStool(classic);
    case "server-rack":
      return routerShelf(classic);
    case "ai-rack":
      return aiBox(classic);
    case "glass-front":
      return front(p, classic);
    case "boss-desk":
      return cornerTable(classic);
    case "boss-chair":
      return wingback(classic);
    case "dog-bed":
      return dogBasket(classic);
    case "putting-green":
      return turfRunner(classic);
    default:
      return null;
  }
}

// ------------------------------------------------------------------ plants

/** A terracotta pot (or a white ceramic one) at the bottom of a w×h sprite. */
function pot(g: Grid, x: number, y: number, w: number, h: number, ceramic = false): void {
  const [base, hi, lo] = ceramic ? [K.ceramic, "#ffffff", K.ceramicLo] : [K.terraPot, K.terraHi, K.terraLo];
  g.rect(x, y, w, 2, hi);
  g.rect(x + 1, y + 2, w - 2, h - 2, base);
  g.vline(x + 1, y + 2, h - 2, hi);
  g.vline(x + w - 2, y + 2, h - 2, lo);
  g.rect(x + 1, y + h - 1, w - 2, 1, lo);
}

function leaves(g: Grid, cx: number, cy: number, rx: number, ry: number, seed: number, big = false): void {
  for (let i = 0; i < (big ? 18 : 10); i++) {
    const a = (i / (big ? 18 : 10)) * Math.PI * 2 + seed;
    const d = 0.35 + ((i * 37 + seed * 11) % 7) / 10;
    const x = Math.round(cx + Math.cos(a) * rx * d);
    const y = Math.round(cy + Math.sin(a) * ry * d);
    const s = big ? 3 : 2;
    g.rect(x - 1, y - 1, s, s, i % 3 === 0 ? C.leafHi : i % 3 === 1 ? C.leaf : C.leafLo);
    g.set(x - 1, y - 1, C.leafHi);
  }
}

export function cafePlant(name: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  switch (name) {
    case "PLANT":
      // A monstera in a white ceramic pot.
      return sprite("plant", 16, 32, (g) => {
        for (const [x, y, w, h] of [[2, 10, 6, 5], [8, 8, 6, 5], [4, 4, 6, 5], [9, 14, 5, 4], [1, 15, 5, 4]] as const) {
          g.rrect(x, y, w, h, C.leaf, 1);
          g.set(x + 1, y + 1, C.leafHi);
          g.set(x + Math.floor(w / 2), y + 2, OUTLINE).set(x + Math.floor(w / 2), y + 3, C.leafLo);
        }
        g.vline(7, 12, 9, C.leafLo).vline(9, 13, 8, C.leafLo);
        pot(g, 3, 21, 10, 10, true);
        g.rect(5, 25, 6, 1, C.green);
      });
    case "PLANT_2":
      // Potted herbs: rosemary and basil in terracotta.
      return sprite("plant-2", 16, 32, (g) => {
        for (let i = 0; i < 6; i++) g.vline(4 + i * 2, 8 + (i % 3) * 2, 14 - (i % 3) * 2, i % 2 ? C.leafLo : C.leaf);
        leaves(g, 8, 14, 6, 6, 1);
        for (let i = 0; i < 4; i++) g.set(5 + i * 2, 9 + (i % 2) * 2, C.leafHi);
        pot(g, 3, 22, 10, 9);
        g.rect(5, 26, 6, 2, C.cream).hline(6, 27, 4, C.leafLo);
      });
    case "LARGE_PLANT":
      // A fiddle-leaf fig in a big terracotta pot.
      return sprite("large-plant", 32, 48, (g) => {
        g.vline(15, 8, 26, C.walnut).vline(16, 10, 24, C.walnutHi);
        g.line(15, 22, 9, 16, C.walnut).line(16, 18, 22, 12, C.walnut);
        const blobs: [number, number][] = [[15, 4], [9, 9], [21, 8], [6, 15], [24, 15], [11, 19], [20, 21], [15, 12], [8, 24], [23, 26]];
        blobs.forEach(([x, y], i) => {
          g.rrect(x - 3, y - 2, 7, 6, i % 3 === 0 ? C.leafLo : C.leaf, 2);
          g.set(x - 1, y - 1, C.leafHi).set(x, y - 1, C.leafHi);
          g.set(x, y + 1, C.leafLo).set(x + 1, y + 2, C.leafLo);
        });
        pot(g, 7, 33, 18, 14);
        g.rect(9, 38, 14, 1, K.terraLo);
      });
    case "CACTUS":
      // A tall cactus in a striped ceramic pot.
      return sprite("cactus", 16, 32, (g) => {
        g.rrect(6, 6, 5, 18, C.leaf, 2);
        g.vline(7, 7, 16, C.leafHi);
        g.rrect(1, 9, 3, 8, C.leaf, 1).rrect(13, 7, 3, 7, C.leaf, 1);
        g.rect(3, 15, 3, 2, C.leaf).rect(11, 12, 2, 2, C.leaf);
        g.vline(1, 10, 6, C.leafHi).vline(13, 8, 5, C.leafHi);
        for (let y = 9; y < 22; y += 3) g.set(9, y, C.cream);
        g.set(8, 5, C.chalkPink).set(9, 5, C.chalkPink);
        pot(g, 3, 23, 10, 8, true);
        g.hline(4, 26, 8, C.green).hline(4, 28, 8, C.green);
      });
    case "POT":
      // A small succulent in a little terracotta pot.
      return sprite("pot", 16, 16, (g) => {
        for (const [x, y] of [[5, 4], [8, 3], [10, 5], [6, 7], [9, 7]] as const) g.rrect(x, y, 3, 3, C.leafHi, 1);
        g.set(7, 5, C.leaf).set(10, 6, C.leaf);
        pot(g, 4, 9, 9, 6);
      });
    case "HANGING_PLANT":
      // Pothos in a macramé hanger, vines trailing.
      return sprite("hanging", 16, 32, (g) => {
        g.line(8, 0, 4, 10, C.cream).line(8, 0, 12, 10, C.cream).vline(8, 0, 10, C.creamLo);
        g.set(6, 6, C.creamLo).set(10, 6, C.creamLo);
        pot(g, 4, 10, 9, 6, true);
        leaves(g, 8, 10, 6, 3, 2);
        for (const [x, len] of [[3, 14], [7, 18], [11, 12], [13, 9]] as const) {
          for (let y = 15; y < 15 + len; y++) {
            g.set(x + (y % 4 === 0 ? 1 : 0), y, y % 3 === 0 ? C.leafHi : C.leaf);
          }
          g.set(x + 1, 15 + len - 1, C.leafLo);
        }
      });
    default:
      return null;
  }
}
