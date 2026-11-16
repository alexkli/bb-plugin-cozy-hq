// School scenery: furniture. Every prop keeps its classic size; live details
// (screens, steam, the fridge door, chalk strokes) land where they always do.
import { drawPixelText, Grid, makeCanvas, pa, paRecolor, pixelTextWidth, recolor, shade } from "../../themekit.ts";
import type { Layout, PlantPlacement, PropPlacement } from "../../layout.ts";
import { BOOKS, bookRow, C, CRAYONS, OUTLINE, sprite } from "./kit.ts";

// ------------------------------------------------------------------ helpers

/** Pixel text into a grid. */
function text(g: Grid, s: string, x: number, y: number, color: string): void {
  const c = makeCanvas(pixelTextWidth(s) + 1, 6, (ctx) => drawPixelText(ctx, s, 0, 0, color));
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) if (d[(yy * c.width + xx) * 4 + 3]! > 0) g.set(x + xx, y + yy, color);
}

/** A school chair shell color. */
const CHAIR = { body: "#ef8a3a", hi: "#f7b277", lo: "#c4672a", leg: C.steelLo };

function schoolChairFront(body = CHAIR.body, hi = CHAIR.hi, lo = CHAIR.lo): (g: Grid) => void {
  // 16×32, like the wooden chair seen from the front (backrest up top).
  return (g) => {
    g.rrect(3, 9, 10, 8, body, 2);
    g.rect(4, 10, 8, 1, hi);
    g.rect(6, 12, 4, 1, lo); // hand hole
    g.rect(4, 17, 1, 2, CHAIR.leg).rect(11, 17, 1, 2, CHAIR.leg);
    g.rrect(2, 18, 12, 6, body, 1);
    g.rect(3, 19, 10, 2, hi);
    g.rect(2, 23, 12, 1, lo);
    g.rect(3, 24, 1, 7, CHAIR.leg).rect(12, 24, 1, 7, CHAIR.leg);
    g.rect(5, 24, 1, 5, C.steelDk).rect(10, 24, 1, 5, C.steelDk);
    g.rect(3, 28, 10, 1, C.steelDk);
  };
}

function schoolChairBack(body = CHAIR.body, hi = CHAIR.hi, lo = CHAIR.lo): (g: Grid) => void {
  // 16×32, the backrest toward us (rows 15..23), seat behind it.
  return (g) => {
    g.rrect(3, 15, 10, 9, body, 2);
    g.rect(4, 16, 8, 1, hi);
    g.rect(6, 18, 4, 1, lo);
    g.rect(3, 22, 10, 1, lo);
    g.rect(2, 24, 12, 3, shade(body, -0.08));
    g.rect(2, 24, 12, 1, hi);
    g.rect(3, 27, 1, 4, CHAIR.leg).rect(12, 27, 1, 4, CHAIR.leg);
    g.rect(5, 27, 1, 3, C.steelDk).rect(10, 27, 1, 3, C.steelDk);
  };
}

// ------------------------------------------------------------------ props

function couch(): HTMLCanvasElement {
  return sprite("couch", 84, 28, (g) => {
    const w = 82;
    const base = C.blue;
    const hi = C.blueHi;
    const lo = C.blueLo;
    g.rrect(8, 1, w - 16, 15, base, 3);
    g.rect(10, 2, w - 20, 1, hi);
    for (const sx of [Math.round(w / 3), Math.round((2 * w) / 3)]) g.vline(sx, 3, 9, lo);
    // Throw pillows
    for (const [px, c] of [[13, C.yellow], [36, C.red], [58, C.green]] as const) {
      g.rrect(px, 7, 10, 7, c, 1);
      g.rect(px + 1, 8, 8, 1, shade(c, 0.35));
      g.set(px + 4, 10, shade(c, -0.2)).set(px + 5, 10, shade(c, -0.2));
    }
    g.rect(2, 13, w - 2, 10, lo);
    g.rect(2, 13, w - 2, 1, shade(lo, 0.15));
    g.rect(10, 15, w - 18, 1, shade(lo, 0.08));
    g.rrect(1, 5, 10, 18, base, 2);
    g.rrect(w - 9, 5, 10, 18, base, 2);
    g.rect(2, 6, 7, 1, hi).rect(w - 8, 6, 7, 1, hi);
    g.rect(4, 23, 3, 2, C.mapleDk).rect(w - 5, 23, 3, 2, C.mapleDk);
  });
}

function coffeeTable(): HTMLCanvasElement {
  return sprite("coffee-table", 38, 14, (g) => {
    g.rrect(1, 1, 36, 6, C.maple, 1);
    g.rect(2, 1, 34, 1, C.mapleHi);
    g.rect(1, 7, 36, 2, C.mapleLo);
    g.rect(3, 9, 2, 3, C.mapleDk).rect(33, 9, 2, 3, C.mapleDk);
    // An open picture book, a stack, and crayons.
    g.rect(4, 2, 11, 4, C.red);
    g.rect(5, 2, 4, 3, C.paper).rect(10, 2, 4, 3, C.paper);
    g.set(6, 3, C.blue).set(11, 3, C.yellow).set(12, 3, C.green);
    g.rect(18, 2, 7, 2, C.blue).rect(19, 1, 6, 2, C.yellow);
    g.rect(28, 3, 3, 1, C.red).rect(31, 4, 3, 1, C.blue).rect(28, 5, 3, 1, C.green);
  });
}

function pingpong(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return recolor(classic(), { "#3b9b6b": "#3f7fd0", "#2a7a52": "#2c5c9e", "#d8f0e2": "#cfe2f7", "#4a4a58": "#6b7684", "#3a3a46": "#5f6b78" });
}

function arcade(): HTMLCanvasElement {
  // A math-game cabinet (the game screen is live at x+2..21, y+9..22).
  return sprite("arcade", 26, 48, (g) => {
    const w = 24;
    const h = 46;
    const body = C.blue;
    g.rect(2, 1, w - 2, h - 1, body);
    g.rect(1, 1, w, 8, C.yellow);
    g.rect(1, 1, w, 1, C.yellowHi);
    text(g, "MATH", 5, 2, C.red);
    g.rect(3, 10, w - 4, 14, "#1a1726");
    g.rect(1, 25, w, 6, C.blueHi);
    g.rect(1, 25, w, 1, "#a8cff5");
    // Buttons: + − × ÷ in crayon colors
    g.set(5, 27, C.red).set(4, 28, C.red).set(5, 28, C.red).set(6, 28, C.red).set(5, 29, C.red);
    g.rect(9, 28, 3, 1, C.yellow);
    g.set(14, 27, C.green).set(16, 27, C.green).set(15, 28, C.green).set(14, 29, C.green).set(16, 29, C.green);
    g.set(20, 27, C.purple).rect(19, 28, 3, 1, C.purple).set(20, 29, C.purple);
    g.rect(2, 32, w - 2, h - 33, C.blueLo);
    g.rect(8, 36, 8, 3, "#20406e");
    g.rect(11, 37, 2, 1, C.yellow);
    // Stars down the side
    g.set(3, 41, C.yellowHi).set(20, 34, C.yellowHi).set(21, 43, C.yellowHi);
  });
}

function cushion(color: string, dot: string, key: string): HTMLCanvasElement {
  return sprite(key, 26, 16, (g) => {
    g.ellipse(13, 9, 11, 5.5, color);
    g.ellipse(13, 6, 9, 3.5, shade(color, 0.14));
    g.rect(7, 4, 4, 1, shade(color, 0.32));
    g.rect(4, 12, 18, 1, shade(color, -0.18));
    for (const [dx, dy] of [[6, 7], [11, 5], [16, 7], [20, 9], [9, 10], [14, 9]] as const) g.set(dx, dy, dot);
    g.set(13, 2, shade(color, -0.25)).set(13, 1, shade(color, -0.25)); // a tab
  });
}

function armchair(): HTMLCanvasElement {
  return sprite("armchair", 28, 26, (g) => {
    const c = C.red;
    g.rrect(4, 1, 20, 16, c, 3);
    g.rect(6, 2, 16, 1, C.redHi);
    g.rrect(1, 9, 6, 13, shade(c, -0.08), 2);
    g.rrect(21, 9, 6, 13, shade(c, -0.08), 2);
    g.rect(6, 14, 16, 7, C.yellow);
    g.rect(6, 14, 16, 1, C.yellowHi);
    g.rect(4, 22, 2, 2, C.mapleDk).rect(22, 22, 2, 2, C.mapleDk);
  });
}

function bookshelf(): HTMLCanvasElement {
  return sprite("bookshelf", 38, 36, (g) => {
    g.rect(1, 6, 36, 28, C.mapleLo);
    g.rect(1, 6, 36, 2, C.maple);
    g.rect(3, 9, 32, 10, "#8a5e3a");
    g.rect(3, 21, 32, 10, "#8a5e3a");
    g.rect(1, 19, 36, 2, C.maple);
    bookRow(g, 4, 34, 18, 8, 2);
    // Book bins on the lower shelf
    for (let i = 0; i < 4; i++) {
      const c = CRAYONS[(i * 2 + 1) % CRAYONS.length]!;
      g.rect(4 + i * 8, 23, 7, 8, c);
      g.rect(4 + i * 8, 23, 7, 1, shade(c, 0.3));
      g.rect(5 + i * 8, 26, 5, 2, C.paper);
      g.rect(5 + i * 8, 21, 2, 2, BOOKS[i]!).rect(8 + i * 8, 22, 2, 1, BOOKS[i + 3]!);
    }
    // Globe and a pencil cup on top
    g.ellipse(28, 2.5, 3, 3, "#5aa9d6");
    g.set(27, 1, "#86c97f").set(29, 3, "#86c97f").set(26, 3, "#86c97f");
    g.rect(27, 5, 3, 1, C.mapleDk);
    g.rect(7, 3, 4, 3, C.red);
    g.set(7, 1, C.yellow).set(7, 2, C.yellow).set(9, 0, C.blue).set(9, 1, C.blue).set(9, 2, C.blue).set(10, 2, C.green);
  });
}

function lamp(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return recolor(classic(), { "#4b4458": "#a8822f", "#f6e7c1": "#f4ecd2", "#e8d3a0": "#3a8a4f" });
}

function printer(): HTMLCanvasElement {
  // The copier, with reams of colored paper.
  return sprite("printer", 30, 26, (g) => {
    g.rect(2, 8, 26, 16, "#d9dee4");
    g.rect(2, 8, 26, 1, "#eef1f4");
    g.rect(4, 12, 22, 4, "#c3cad3");
    g.rect(4, 17, 22, 4, "#c3cad3");
    g.rect(12, 13, 6, 1, C.steelLo).rect(12, 18, 6, 1, C.steelLo);
    g.rrect(3, 1, 24, 8, "#f1f3f6", 1);
    g.rect(5, 3, 20, 2, "#3a3a46");
    g.rect(8, 0, 14, 2, "#ffffff");
    g.set(24, 6, "#5ad18a").set(22, 6, C.blue).set(20, 6, C.yellow);
    // Colored paper peeking out of the drawers.
    g.rect(5, 15, 6, 1, C.yellowHi).rect(5, 20, 6, 1, "#ffc4d6");
  });
}

function fountain(): HTMLCanvasElement {
  // A drinking fountain with a bottle filler on top.
  const water = "#9fd8ff";
  return sprite("cooler", 17, 36, (g) => {
    const steel = "#cfd6de";
    g.rrect(3, 1, 11, 11, steel, 1);
    g.rect(4, 2, 9, 1, "#eef2f6");
    g.rect(5, 4, 7, 7, "#5f6b78");
    g.rect(8, 4, 1, 1, "#9aa5b1");
    g.set(8, 6, "#7fc4ff").rect(7, 7, 3, 2, "#7fc4ff").set(8, 9, "#4a8fd9");
    g.rect(4, 2, 2, 1, "#5ad18a");
    // The basin, with a little arc of water.
    g.rect(1, 14, 15, 7, "#b7c0ca");
    g.rect(1, 14, 15, 1, "#e3e8ee");
    g.rect(3, 15, 11, 3, "#8e99a6");
    g.rect(4, 14, 1, 2, "#e3e8ee");
    g.set(5, 12, water).set(6, 11, water).set(7, 11, water).set(8, 12, water).set(9, 13, water).set(9, 15, water).set(10, 16, water);
    g.rect(13, 18, 2, 1, "#9aa5b1");
    g.rect(5, 21, 7, 13, steel);
    g.rect(5, 21, 2, 13, "#e3e8ee");
    g.rect(3, 33, 11, 1, C.steelLo);
  }, [water]);
}

function classroomTable(): HTMLCanvasElement {
  return sprite("meeting-table", 68, 30, (g) => {
    g.rrect(1, 1, 66, 20, C.maple, 2);
    g.rect(2, 1, 64, 1, C.mapleHi);
    g.rect(1, 20, 66, 2, C.mapleLo);
    g.rect(1, 22, 66, 1, C.mapleDk);
    g.rect(3, 23, 2, 5, C.steelLo).rect(63, 23, 2, 5, C.steelLo);
    g.rect(32, 23, 2, 4, C.steelDk);
    // Pencil cup, an apple, a crayon box; papers come and go with the people.
    g.rect(4, 4, 3, 4, C.blue).set(4, 3, C.yellow).set(5, 2, C.red).set(6, 3, C.green);
    g.ellipse(62, 6, 2, 2, "#e5544b");
    g.set(61, 5, "#f2837a").set(62, 3, "#7a5236").set(63, 3, C.green);
    g.rect(57, 13, 7, 4, C.yellow).rect(57, 13, 7, 1, C.green);
    for (let i = 0; i < 5; i++) g.set(58 + i, 12, CRAYONS[i]!);
  }, true);
}

function planRolls(): HTMLCanvasElement {
  // A bin of rolled-up maps and posters, and a yardstick.
  return sprite("plan-rolls", 18, 28, (g) => {
    const rolls: [number, number, string][] = [
      [3, 2, "#f7e9b8"],
      [7, 4, C.paper],
      [11, 1, "#bfe0f5"],
      [5, 7, "#ffd1e0"],
    ];
    for (const [x, y, c] of rolls) {
      g.rect(x, y, 3, 16, c);
      g.rect(x, y, 3, 1, shade(c, 0.3));
      g.set(x + 1, y, shade(c, -0.3));
    }
    g.rect(14, 0, 2, 18, C.yellow);
    for (let y = 1; y < 17; y += 2) g.set(15, y, C.ink);
    g.rect(2, 15, 14, 12, C.green);
    g.rect(2, 15, 14, 1, C.greenHi);
    g.rect(2, 20, 14, 1, C.greenLo);
    g.rect(6, 22, 6, 3, C.paper);
  });
}

function glassFront(p: PropPlacement, L: Layout): HTMLCanvasElement {
  const w = p.w ?? 100;
  const room = L.rooms
    .filter((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w)
    .sort((a, b) => Math.abs(a.rect.y + a.rect.h - 10 - p.y) - Math.abs(b.rect.y + b.rect.h - 10 - p.y))[0];
  const gapX = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
  const wood = room?.walls === "wood";
  const label = room?.kind === "boss" ? "PRINCIPAL" : room?.kind === "server" ? "COMPUTER LAB" : room?.kind === "meeting" ? "TEACHERS" : "";
  return sprite(`front-${w}-${gapX}-${wood}-${label}`, w, 11, (g) => {
    const frame = wood ? "#8a5a34" : C.blueLo;
    const light = wood ? "#b07a46" : C.blue;
    const glass = wood ? "#efe4cfdd" : "#d6ebf8aa";
    for (let x = 0; x < w; x++) {
      if (gapX >= 0 && x >= gapX - 9 && x < gapX + 9) continue;
      g.set(x, 0, frame).set(x, 1, light);
      for (let y = 2; y < 9; y++) g.set(x, y, glass);
      g.set(x, 9, frame).set(x, 10, wood ? "#4a2e1a" : "#244f86");
    }
    for (let x = 6; x < w; x += 24) {
      if (gapX >= 0 && x >= gapX - 10 && x < gapX + 10) continue;
      g.set(x, 3, "#ffffffcc").set(x + 1, 4, "#ffffffcc").set(x + 2, 5, "#ffffffaa");
      g.vline(x + 12, 1, 9, frame);
    }
    if (!wood && label !== "COMPUTER LAB") {
      // Paper cut-outs taped to the glass.
      for (let x = 16; x < w - 8; x += 37) {
        if (gapX >= 0 && x >= gapX - 14 && x < gapX + 12) continue;
        const c = CRAYONS[(x / 37) % CRAYONS.length | 0]!;
        g.set(x + 1, 3, c).rect(x, 4, 3, 1, c).set(x + 1, 5, c).set(x, 6, c).set(x + 2, 6, c);
      }
    }
    if (label) {
      const tw = pixelTextWidth(label);
      let lx = Math.floor((w - tw) / 2);
      if (gapX >= 0 && lx + tw + 2 > gapX - 10) lx = Math.max(4, gapX - 12 - tw - 2);
      if (lx >= 2 && lx + tw + 2 < w) {
        g.rect(lx - 2, 2, tw + 4, 7, wood ? "#f2d27a" : C.paper);
        g.rect(lx - 2, 2, tw + 4, 1, wood ? "#fbe7a8" : "#ffffff");
        text(g, label, lx, 3, wood ? "#5a3a1a" : C.blueLo);
      }
    }
  }, false);
}

function libraryShelf(): HTMLCanvasElement {
  return sprite("library-shelf", 32, 32, (g) => {
    g.rect(1, 6, 30, 26, C.mapleLo);
    g.rect(1, 6, 30, 2, C.maple);
    g.rect(1, 6, 30, 1, C.mapleHi);
    g.rect(3, 8, 26, 7, "#7a5236");
    g.rect(3, 17, 26, 6, "#7a5236");
    g.rect(3, 25, 26, 5, "#7a5236");
    g.rect(1, 15, 30, 2, C.maple);
    g.rect(1, 23, 30, 2, C.maple);
    bookRow(g, 3, 29, 14, 6, 1);
    bookRow(g, 3, 29, 22, 5, 4);
    bookRow(g, 3, 20, 29, 4, 7);
    g.rect(21, 26, 7, 4, C.yellow).rect(21, 26, 7, 1, C.yellowHi); // a bin of picture books
  });
}

function libraryTable(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  const base = recolor(classic(), { "#885c47": C.mapleDk, "#e3bf88": C.mapleHi, "#b38857": C.maple, "#532e3d": "#5a3a26" });
  return makeCanvas(base.width, base.height, (ctx) => {
    ctx.drawImage(base, 0, 0);
    const put = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    put(6, 10, 9, 6, OUTLINE);
    put(7, 11, 3, 4, C.paper);
    put(11, 11, 3, 4, C.paper);
    put(18, 16, 8, 5, OUTLINE);
    put(19, 17, 6, 3, C.blue);
    put(20, 18, 4, 1, C.blueHi);
  });
}

function planter(w: number): HTMLCanvasElement {
  // A shelf of bean sprouts in paper cups, with name tags.
  return sprite(`planter-${w}`, w, 20, (g) => {
    g.rect(1, 13, w - 2, 6, C.maple);
    g.rect(1, 13, w - 2, 1, C.mapleHi);
    g.rect(1, 17, w - 2, 1, C.mapleLo);
    let i = 0;
    for (let x = 4; x < w - 6; x += 7, i++) {
      const tall = 4 + ((i * 5) % 5);
      // Stem and leaves
      g.vline(x + 2, 9 - tall, tall + 1, C.greenLo);
      g.set(x + 1, 9 - tall, C.green).set(x, 8 - tall, C.greenHi).set(x + 3, 9 - tall, C.green).set(x + 4, 8 - tall, C.greenHi);
      if (i % 3 === 0) g.set(x + 1, 10 - Math.floor(tall / 2), C.green);
      // Cup
      g.rect(x, 9, 5, 5, "#ffffff");
      g.rect(x, 9, 5, 1, "#e9e5da");
      g.rect(x + 1, 11, 3, 1, CRAYONS[i % CRAYONS.length]!);
    }
  }, [C.greenLo, C.green, C.greenHi]);
}

function servingLine(w: number): HTMLCanvasElement {
  // The cafeteria line: steam pans under a sneeze guard, trays, milk and fruit.
  return sprite(`island-${w}`, w + 2, 26, (g) => {
    g.rect(1, 1, w, 12, "#d5dbe2");
    g.rect(1, 1, w, 1, "#eef2f6");
    const foods = ["#f2c14e", "#7cc46a", "#e5744b", "#f4efe6"];
    let k = 0;
    for (let x = 4; x < w - 28; x += 10, k++) {
      g.rect(x, 3, 9, 6, "#8a96a3");
      g.rect(x + 1, 4, 7, 4, foods[k % foods.length]!);
      g.set(x + 2, 5, shade(foods[k % foods.length]!, 0.3)).set(x + 5, 6, shade(foods[k % foods.length]!, -0.15));
    }
    // Sneeze guard
    g.rect(3, 1, w - 32, 1, "#bfe6ff");
    // Tray stack and milk cartons and a fruit bowl at the end.
    g.rect(w - 26, 3, 9, 7, C.orange).rect(w - 26, 3, 9, 1, C.orangeHi).rect(w - 26, 6, 9, 1, "#d97a2a");
    for (let i = 0; i < 3; i++) {
      g.rect(w - 15 + i * 3, 5, 2, 4, i === 1 ? "#ffc4d6" : "#ffffff");
      g.rect(w - 15 + i * 3, 4, 2, 1, i === 1 ? "#e88aa8" : C.blue);
    }
    g.ellipse(w - 3, 9, 3, 1.6, "#e9e2d6");
    g.set(w - 5, 8, "#ff8a3d").set(w - 3, 7, "#e5484d").set(w - 1, 8, "#86c97f").set(w - 3, 8, "#ffd84a");
    // Counter front in school teal with panels.
    g.rect(1, 13, w, 10, C.teal);
    g.rect(1, 13, w, 1, "#7fd6cb");
    for (let x = 6; x < w - 2; x += 14) g.rect(x, 16, 8, 5, "#36a094");
    g.rect(1, 22, w, 1, "#2a7f75");
  });
}

function kitchenCounter(w: number): HTMLCanvasElement {
  return sprite(`kcounter-${w}`, w + 2, 36, (g) => {
    const top = 10;
    g.rect(1, top, w, 7, "#e9edf1");
    g.rect(1, top, w, 1, "#ffffff");
    g.rect(1, top + 7, w, 17, C.yellow);
    g.rect(1, top + 7, w, 1, C.yellowHi);
    for (let x = 4; x < w - 6; x += 22) {
      g.rect(x, top + 10, 18, 11, "#f2bd3c");
      g.rect(x + 8, top + 14, 2, 1, C.ink);
    }
    g.rect(1, top + 23, w, 1, C.yellowLo);
    // Kettle (the coffee maker is its own prop at the left end).
    g.rrect(31, 6, 9, 9, C.red, 2);
    g.rect(32, 7, 2, 2, C.redHi);
    g.rect(33, 4, 5, 2, C.redLo).set(40, 9, C.redLo);
    if (w >= 80) {
      g.rect(42, top + 1, 16, 5, "#b9c2cc");
      g.rect(43, top + 2, 14, 3, "#9aa3ad");
      g.rect(49, top - 4, 2, 5, "#9aa3ad").set(50, top - 4, "#c9ced6");
    }
    if (w >= 100) {
      // Microwave (its window lights up live).
      g.rect(w - 26, 0, 22, 14, "#e9edf1");
      g.rect(w - 26, 0, 22, 1, "#ffffff");
      g.rect(w - 24, 2, 13, 10, "#55606e");
      g.rect(w - 9, 3, 3, 8, "#c9d1d9").set(w - 8, 4, "#5ad18a");
      // A stack of lunch trays and milk cartons.
      g.rect(w - 40, top - 3, 11, 3, C.green).rect(w - 40, top - 3, 11, 1, C.greenHi);
      g.rect(w - 37, top - 6, 2, 3, "#ffffff").rect(w - 37, top - 7, 2, 1, C.blue).rect(w - 33, top - 6, 2, 3, "#ffffff").rect(w - 33, top - 7, 2, 1, C.red);
    }
    g.rect(w >= 80 ? 60 : 30, top - 4, 3, 4, C.blue).rect(w >= 100 ? w - 46 : w - 8, top - 4, 3, 4, C.pink);
  });
}

function stool(): HTMLCanvasElement {
  return sprite("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, C.orange);
    g.set(4, 1, C.orangeHi).set(5, 1, C.orangeHi);
    g.rect(5, 4, 2, 4, C.steelLo);
    g.rect(3, 8, 6, 1, C.steelDk);
  });
}

function milkFridge(): HTMLCanvasElement {
  // A glass-door milk cooler (the door swings open live over x+1..19).
  return sprite("fridge", 20, 34, (g) => {
    g.rrect(1, 1, 18, 31, "#f2f5f8", 1);
    g.rect(1, 1, 18, 7, C.blue);
    g.rect(2, 1, 16, 1, C.blueHi);
    text(g, "MILK", 2, 2, "#ffffff");
    g.rect(3, 9, 12, 21, "#d8ecf8");
    for (const [yy, a, b] of [[10, "#ffffff", C.blue], [16, "#ffc4d6", "#e88aa8"], [22, "#e8c9a6", "#8a5a3c"]] as const) {
      for (let i = 0; i < 4; i++) {
        g.rect(4 + i * 3, yy + 1, 2, 4, i % 2 ? a : "#ffffff");
        g.rect(4 + i * 3, yy, 2, 1, i % 2 ? b : C.blue);
      }
      g.rect(3, yy + 5, 12, 1, "#a9c6dc");
    }
    g.rect(3, 9, 1, 21, "#ffffff");
    g.rect(16, 12, 1, 12, "#9aa3ad");
    g.rect(2, 31, 16, 1, "#c9d1d9");
  });
}

function bookVending(): HTMLCanvasElement {
  // A book vending machine: earn a token, get a book.
  return sprite("vending", 24, 44, (g) => {
    const body = C.purple;
    g.rect(1, 1, 22, 42, body);
    g.rect(1, 1, 22, 3, C.purpleHi);
    g.set(5, 2, C.yellow).set(11, 2, C.yellow).set(17, 2, C.yellow);
    g.rect(3, 5, 13, 28, "#f4efe2");
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, "#b9a98e");
      for (let c = 0; c < 4; c++) {
        const col = BOOKS[(r * 4 + c) % BOOKS.length]!;
        const bh = 4 + ((r + c) % 2);
        g.rect(4 + c * 3, 11 + r * 7 - bh, 2, bh, col);
        g.set(4 + c * 3, 11 + r * 7 - bh + 1, shade(col, 0.4));
      }
    }
    g.rect(17, 6, 5, 10, "#3a2a5a");
    for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, C.yellowHi);
    g.rect(17, 18, 5, 2, C.yellow);
    g.rect(3, 35, 18, 5, "#3a2a5a");
    g.rect(5, 41, 14, 1, shade(body, -0.25));
  });
}

function cubbyStand(): HTMLCanvasElement {
  // Low cubbies with bins: the class aquarium sits on top.
  return sprite("fishtank-stand", 42, 22, (g) => {
    g.rect(1, 1, 40, 18, C.maple);
    g.rect(1, 1, 40, 2, C.mapleHi);
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 9 + Math.floor(i / 2);
      g.rect(x, 5, 8, 12, "#8a5e3a");
      const c = [C.red, C.yellow, C.blue, C.green][i]!;
      g.rect(x, 8, 8, 9, c);
      g.rect(x, 8, 8, 1, shade(c, 0.3));
      g.rect(x + 2, 11, 4, 2, C.paper);
    }
    g.rect(2, 19, 3, 2, C.mapleDk).rect(37, 19, 3, 2, C.mapleDk);
  });
}

function chalkboard(w: number): HTMLCanvasElement {
  return sprite(`whiteboard-${w}`, w + 2, 46, (g) => {
    g.rect(1, 1, w, 34, C.maple);
    g.rect(1, 1, w, 1, C.mapleHi);
    g.rect(3, 3, w - 4, 30, C.board);
    // Old chalk dust where it was wiped.
    for (let i = 0; i < 40; i++) {
      const x = 4 + ((i * 29) % (w - 7));
      const y = 4 + ((i * 13) % 27);
      g.set(x, y, C.boardHi).set(x + 1, y, C.boardHi);
    }
    g.rect(5, 29, 20, 1, "#4f8a6c");
    // A little "ABC 123" in the corner.
    const ink = "#9cc4ad";
    if (w >= 60) {
      text(g, "ABC", w - 30, 26, ink);
      text(g, "123", w - 16, 26, ink);
    }
    g.rect(1, 35, w, 2, C.mapleLo);
    g.rect(8, 34, 4, 1, "#ffffff").rect(14, 34, 3, 1, C.yellowHi).rect(19, 34, 3, 1, "#ffc4d6");
    g.rect(w - 14, 33, 7, 2, "#4b4458").rect(w - 14, 33, 7, 1, "#d9c9a6");
    g.rect(4, 37, 2, 8, C.steelLo).rect(w - 5, 37, 2, 8, C.steelLo);
    g.rect(2, 44, 6, 1, C.steelDk).rect(w - 7, 44, 6, 1, C.steelDk);
  });
}

function smartboard(w: number, h: number, standing: boolean): HTMLCanvasElement {
  // An interactive board: white frame, a pen tray; on an AV cart when it stands.
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rrect(1, 1, w, h, "#e9edf1", 1);
    g.rect(2, 1, w - 2, 1, "#ffffff");
    g.rect(3, 3, w - 4, h - 4, "#14121c");
    g.rect(1, h - 1, w, 1, "#c9d1d9");
    // Pen tray with markers.
    g.rect(Math.floor(w / 2) - 20, h + 1, 40, 2, "#c9d1d9");
    g.rect(Math.floor(w / 2) - 16, h + 1, 4, 1, C.red).rect(Math.floor(w / 2) - 10, h + 1, 4, 1, C.blue).rect(Math.floor(w / 2) - 4, h + 1, 4, 1, C.green).rect(Math.floor(w / 2) + 2, h + 1, 5, 1, "#f4f6f8");
    g.set(w - 3, h - 1, "#5ad18a");
    if (standing) {
      // The AV cart.
      g.rect(1 + w / 2 - 3, h + 3, 6, 3, C.steelDk);
      g.rect(8, h + 6, w - 14, 3, "#3a3a46");
      g.rect(8, h + 6, w - 14, 1, "#5a5a66");
      g.rect(10, h + 9, 2, 8, C.steelLo).rect(w - 6, h + 9, 2, 8, C.steelLo);
      g.rect(8, h + 14, w - 14, 2, "#3a3a46");
      g.rect(14, h + 11, 12, 3, C.blue).rect(28, h + 12, 10, 2, C.paper);
      g.rect(9, h + 18, 3, 2, OUTLINE).rect(w - 7, h + 18, 3, 2, OUTLINE);
    } else {
      g.rect(1 + w / 2 - 6, h + 3, 12, 1, "#9aa3ad");
    }
  });
}

function piano(): HTMLCanvasElement {
  return sprite("piano", 32, 32, (g) => {
    const wood = "#9a5a3a";
    g.rect(1, 1, 30, 22, wood);
    g.rect(1, 1, 30, 2, "#b8744e");
    g.rect(4, 5, 24, 8, "#874c30");
    // Sheet music and a metronome
    g.rect(9, 5, 6, 7, C.paper).rect(16, 5, 6, 7, C.paper);
    for (let y = 6; y < 11; y += 2) g.rect(10, y, 4, 1, "#b9b0a2").rect(17, y, 4, 1, "#b9b0a2");
    g.set(11, 7, C.ink).set(18, 9, C.ink);
    g.rect(25, 0, 3, 3, "#5a3a26").set(26, 0, C.yellow);
    g.rect(2, 14, 28, 5, "#fbfaf5");
    for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, "#2a1e2e");
    // Color stickers on a few keys (for little hands)
    g.set(5, 18, C.red).set(8, 18, C.orange).set(11, 18, C.yellow).set(14, 18, C.green).set(17, 18, C.blue);
    g.rect(1, 19, 30, 4, "#6e3c26");
    g.rect(3, 23, 2, 7, wood).rect(27, 23, 2, 7, wood);
  });
}

function target(): HTMLCanvasElement {
  // A felt target on a stand (for the soft-dart toss).
  return sprite("dartboard", 20, 34, (g) => {
    g.ellipse(9.5, 9.5, 8.5, 8.5, C.blue);
    g.ellipse(9.5, 9.5, 7, 7, C.paper);
    g.ellipse(9.5, 9.5, 5.5, 5.5, C.yellow);
    g.ellipse(9.5, 9.5, 3.5, 3.5, C.green);
    g.ellipse(9.5, 9.5, 1.5, 1.5, C.red);
    g.rect(9, 19, 2, 12, C.steelLo);
    g.rect(5, 31, 10, 2, C.steelDk);
  });
}

function cornholeBoard(): HTMLCanvasElement {
  return sprite("cornhole", 16, 22, (g) => {
    g.rect(1, 1, 14, 20, C.yellow);
    g.rect(1, 1, 14, 1, C.yellowHi);
    g.rect(3, 3, 10, 16, C.red);
    g.ellipse(7.5, 7, 2.5, 2.5, "#1a1722");
    g.set(4, 14, C.yellowHi).set(10, 16, C.yellowHi).set(7, 12, C.yellowHi);
  });
}

function bench(w: number): HTMLCanvasElement {
  // The hallway bench: maple slats on a steel frame, seen from the front.
  return sprite(`wait-sofa-${w}`, w + 2, 22, (g) => {
    for (const y of [2, 6]) {
      g.rect(3, y, w - 4, 3, C.maple);
      g.rect(3, y, w - 4, 1, C.mapleHi);
    }
    g.rect(4, 1, 2, 10, C.steelLo).rect(w - 3, 1, 2, 10, C.steelLo);
    g.rect(1, 10, w, 6, C.maple);
    g.rect(1, 10, w, 1, C.mapleHi);
    g.rect(1, 13, w, 1, C.mapleLo);
    g.rect(1, 16, w, 2, C.mapleLo);
    g.rect(3, 18, 2, 3, C.steelLo).rect(w - 3, 18, 2, 3, C.steelLo);
    g.rect(Math.floor(w / 2), 18, 2, 3, C.steelLo);
  });
}

function benchBack(w: number): HTMLCanvasElement {
  return sprite(`sofa-back-${w}`, w + 2, 16, (g) => {
    for (const y of [1, 5]) {
      g.rect(1, y, w, 3, C.maple);
      g.rect(1, y, w, 1, C.mapleHi);
    }
    g.rect(1, 9, w, 3, C.mapleLo);
    g.rect(3, 12, 2, 3, C.steelLo).rect(w - 3, 12, 2, 3, C.steelLo);
  });
}

function plasticSide(left: boolean): HTMLCanvasElement {
  const body = C.teal;
  const hi = "#7fd6cb";
  const lo = "#2a8f84";
  const c = sprite(`arm-side-r`, 18, 20, (g) => {
    g.rrect(1, 1, 5, 12, body, 1);
    g.rect(2, 2, 2, 9, hi);
    g.rect(3, 13, 1, 2, CHAIR.leg);
    g.rect(4, 10, 11, 4, body);
    g.rect(4, 10, 11, 1, hi);
    g.rect(4, 13, 11, 1, lo);
    g.rect(4, 14, 1, 5, CHAIR.leg).rect(14, 14, 1, 5, CHAIR.leg);
    g.rect(4, 17, 11, 1, C.steelDk);
  });
  if (!left) return c;
  return sprite("arm-side-l", 18, 20, (g) => {
    const d = c.getContext("2d")!.getImageData(0, 0, 18, 20).data;
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 18; x++) {
        const i = (y * 18 + 17 - x) * 4;
        if (d[i + 3]! > 0) g.set(x, y, `#${[d[i]!, d[i + 1]!, d[i + 2]!].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
      }
    }
  }, false);
}

function loungeTable(): HTMLCanvasElement {
  return sprite("lounge-table", 28, 12, (g) => {
    g.ellipse(13.5, 4.5, 12.5, 4, C.mapleLo);
    g.ellipse(13.5, 4, 11.5, 3, C.maple);
    // A tissue box and a clipboard with hall passes.
    g.rect(5, 2, 6, 3, C.blue).rect(5, 2, 6, 1, C.blueHi).set(7, 1, "#ffffff").set(8, 0, "#ffffff").set(8, 1, "#ffffff");
    g.rect(14, 2, 6, 4, "#b07a46").rect(15, 3, 4, 3, C.paper).rect(16, 2, 2, 1, C.steelLo);
    g.set(16, 4, C.red).set(17, 4, C.red);
    g.rect(12, 8, 3, 3, C.mapleDk);
  });
}

function coffeeMaker(): HTMLCanvasElement {
  // The teachers' drip coffee maker, with a carafe and a favorite mug.
  return sprite("espresso", 26, 30, (g) => {
    const body = "#3a3a46";
    const hi = "#55556a";
    // Paper cups and a sugar jar on top
    g.rect(15, 1, 3, 3, C.paper).rect(19, 2, 4, 2, "#f4efe6").set(20, 1, C.steelLo);
    g.rrect(2, 4, 18, 10, body, 1);
    g.rect(3, 5, 16, 1, hi);
    g.rect(8, 8, 10, 4, "#1d2b22");
    g.rect(9, 9, 3, 1, "#5ad18a").rect(13, 9, 3, 1, "#5ad18a");
    g.set(5, 9, C.red).set(5, 11, "#ffffff");
    g.rect(3, 14, 15, 3, "#2a2a32");
    g.rect(8, 16, 3, 1, "#1a1a22");
    // Water tank on the side
    g.rect(19, 6, 3, 14, "#9fd0f0");
    g.rect(19, 6, 1, 14, "#cfe9f8");
    g.rect(2, 17, 2, 7, body);
    // Carafe under the spout
    g.rect(6, 18, 7, 6, "#d8ecf8");
    g.rect(6, 21, 7, 3, "#6b3e1e");
    g.rect(13, 19, 2, 1, "#2a2a32").rect(14, 19, 1, 3, "#2a2a32");
    g.rect(2, 24, 18, 2, body);
    g.rect(2, 24, 18, 1, hi);
    // The mug: red with a heart
    g.rect(20, 21, 4, 5, "#ffffff");
    g.set(24, 22, "#ffffff").set(24, 23, "#ffffff");
    g.set(21, 23, C.red).set(22, 23, C.red).set(21, 22, C.red).set(23, 22, C.red);
    g.rect(2, 26, 22, 1, "#2a2a32");
  });
}

function rack(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return recolor(classic(), {
    "#22252e": "#3b4a63",
    "#3a3f4c": "#6a7fa3",
    "#2f3440": "#2a3446",
    "#3d4352": "#4f6080",
    "#1a1d24": "#18202e",
    "#111318": "#1d2433",
    "#181a22": "#2a3446",
    "#4b2f7a": "#5a4a9a",
    "#262a36": "#3b4a63",
    "#0f1016": "#1a2232",
  });
}

function gardenBench(): HTMLCanvasElement {
  // Painted in rainbow slats.
  return sprite("bench", 36, 16, (g) => {
    g.rect(2, 1, 32, 2, C.red).rect(2, 1, 32, 1, C.redHi);
    g.rect(2, 4, 32, 2, C.yellow).rect(2, 4, 32, 1, C.yellowHi);
    g.rect(4, 3, 2, 6, "#3a3546").rect(30, 3, 2, 6, "#3a3546");
    g.rect(1, 8, 34, 3, C.blue).rect(1, 8, 34, 1, C.blueHi);
    g.rect(3, 11, 2, 4, "#3a3546").rect(31, 11, 2, 4, "#3a3546");
  });
}

function sideTable(): HTMLCanvasElement {
  return sprite("side-table", 18, 14, (g) => {
    g.rect(1, 1, 16, 7, C.maple);
    g.rect(1, 1, 16, 1, C.mapleHi);
    // A jar of lollipops and a first-aid box
    g.rect(3, 2, 4, 4, "#d8ecf8").set(3, 1, C.red).set(5, 0, C.yellow).set(6, 1, C.green);
    g.rect(9, 3, 6, 4, "#ffffff").rect(11, 4, 2, 2, C.red).set(10, 4, C.red).set(13, 5, C.red);
    g.rect(2, 8, 2, 5, C.mapleDk).rect(14, 8, 2, 5, C.mapleDk);
  });
}

function frontDesk(): HTMLCanvasElement {
  // The front office counter: bell, sign-in clipboard, first-aid kit.
  return sprite("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 6, "#f3efe6");
    g.rect(1, 6, 34, 1, "#ffffff");
    g.rect(1, 12, 34, 9, C.blue);
    g.rect(1, 12, 34, 1, C.blueHi);
    text(g, "OFFICE", 6, 14, "#ffffff");
    // Bell
    g.ellipse(9, 4, 3.5, 2.5, "#e8c14a");
    g.rect(6, 5, 7, 1, "#c9a031");
    g.set(9, 1, "#e8c14a");
    // Clipboard
    g.rect(15, 3, 5, 6, "#b07a46").rect(16, 4, 3, 4, C.paper).rect(16, 3, 3, 1, C.steelLo);
    // First-aid kit
    g.rect(24, 1, 8, 6, "#ffffff");
    g.rect(27, 2, 2, 4, C.red).rect(26, 3, 4, 2, C.red);
    g.rect(24, 6, 8, 1, "#d5dbe2");
  });
}

function principalDesk(w: number): HTMLCanvasElement {
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    const top = "#8a5a3c";
    g.rect(1, 1, w, 12, top);
    g.rect(1, 1, w, 1, "#b07a52");
    g.rect(1, 13, w, 12, "#6e4632");
    g.rect(1, 13, w, 1, "#8f6046");
    g.rect(4, 15, w - 8, 9, "#5f3a28");
    // Brass plaque: PRINCIPAL
    const label = "PRINCIPAL";
    const tw = pixelTextWidth(label);
    const lx = Math.floor((w + 2 - tw) / 2);
    g.rect(lx - 2, 16, tw + 4, 7, "#e8c14a");
    g.rect(lx - 2, 16, tw + 4, 1, "#fbe08a");
    text(g, label, lx, 17, "#5a3a1a");
    // Monitor back, papers, an apple, a pencil cup, a name block
    g.rect(8, 1, 14, 9, "#b5bfc7").rect(9, 2, 12, 7, "#d5dbe2");
    g.rect(26, 4, 9, 7, "#fbfaf5").rect(28, 3, 9, 7, "#ffffff").rect(29, 5, 6, 1, "#b9b0a2").rect(29, 7, 5, 1, "#b9b0a2");
    g.ellipse(w - 15, 8, 2, 2, "#e5544b");
    g.set(w - 16, 7, "#f2837a").set(w - 15, 5, "#7a5236").set(w - 14, 5, C.green);
    g.rect(w - 8, 4, 4, 5, C.blue).set(w - 7, 2, C.yellow).set(w - 7, 3, C.yellow).set(w - 5, 3, C.red);
  });
}

function bossChair(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return recolor(classic(), { "#2b2b33": "#7a2f38", "#4a4a58": "#a8404a", "#3a3a44": "#5f2530" });
}

function petBed(): HTMLCanvasElement {
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 11.5, 5.5, "#c99a5e");
    for (let x = 3; x < 23; x += 3) g.set(x, 4, "#b0834a").set(x + 1, 10, "#b0834a");
    g.ellipse(12.5, 7.5, 8.5, 3.5, C.red);
    for (let x = 6; x < 20; x += 3) g.set(x, 7, C.redHi);
    g.rect(5, 8, 15, 1, "#c9433d");
  });
}

function recycleBin(): HTMLCanvasElement {
  return sprite("bin", 16, 16, (g) => {
    g.rect(3, 3, 10, 2, C.blueHi);
    g.rect(4, 5, 8, 9, C.blue);
    g.rect(4, 5, 2, 9, C.blueHi);
    // Recycling arrows, roughly
    g.set(8, 7, "#ffffff").set(7, 8, "#ffffff").set(9, 8, "#ffffff").set(6, 10, "#ffffff").set(7, 10, "#ffffff").set(9, 10, "#ffffff").set(10, 10, "#ffffff");
    g.rect(5, 14, 6, 1, C.blueLo);
    g.rect(6, 2, 2, 1, C.paper).set(9, 1, "#fff3a3"); // crumpled paper
  });
}

/** The scenery's sprite for a placed prop (null keeps classic). */
export function schoolProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "pingpong":
      return pingpong(classic);
    case "arcade":
      return arcade();
    case "beanbag-blue":
      return cushion("#7fb6ee", "#ffffff", "beanbag-blue");
    case "beanbag-pink":
      return cushion(C.yellow, C.orange, "beanbag-pink");
    case "armchair":
      return armchair();
    case "bookshelf":
      return bookshelf();
    case "lamp":
      return lamp(classic);
    case "printer":
      return printer();
    case "cooler":
      return fountain();
    case "meeting-table":
      return classroomTable();
    case "meeting-chair-front":
      return sprite("chair-front", 16, 32, schoolChairFront());
    case "meeting-chair-back":
      return sprite("chair-back", 16, 32, schoolChairBack());
    case "guest-chair":
      return sprite("guest-chair", 16, 32, schoolChairBack(C.blue, C.blueHi, C.blueLo));
    case "plan-rolls":
      return planRolls();
    case "glass-front":
      return glassFront(p, L);
    case "library-shelf":
      return libraryShelf();
    case "library-table":
      return libraryTable(classic);
    case "sofa-front":
      return paRecolor("SOFA_FRONT", { "#972651": C.blue, "#c25769": C.blueHi, "#420517": "#1f3f6e" });
    case "sofa-back":
      return paRecolor("SOFA_BACK", { "#972651": C.blue, "#c25769": C.blueHi, "#420517": "#1f3f6e" });
    case "low-shelf":
      return paRecolor("BOOKSHELF", { "#885c47": C.mapleLo, "#b38857": C.maple, "#cfa86d": C.mapleHi });
    case "planter":
      return planter(p.w ?? 48);
    case "kitchen-island":
      return servingLine(p.w ?? 72);
    case "kitchen-counter":
      return kitchenCounter(p.w ?? 100);
    case "stool":
      return stool();
    case "fridge":
      return milkFridge();
    case "vending":
      return bookVending();
    case "fishtank-stand":
      return cubbyStand();
    case "whiteboard":
      return chalkboard(p.w ?? 80);
    case "tv":
      return smartboard(p.w ?? 120, L.tv.h, p.z > 0);
    case "piano":
      return piano();
    case "dartboard":
      return target();
    case "cornhole":
      return cornholeBoard();
    case "waiting-chair":
      return paRecolor("CUSHIONED_CHAIR_FRONT", { "#487841": C.teal, "#6fa374": "#7fd6cb", "#173115": "#1d5a54" });
    case "waiting-sofa":
      return bench(p.w ?? 42);
    case "waiting-sofa-back":
      return benchBack(p.w ?? 42);
    case "waiting-armchair":
      return plasticSide(false);
    case "waiting-armchair-left":
      return plasticSide(true);
    case "lounge-table":
      return loungeTable();
    case "bench":
      return gardenBench();
    case "espresso":
      return coffeeMaker();
    case "server-rack":
    case "ai-rack":
      return rack(classic);
    case "side-table":
      return sideTable();
    case "reception":
      return frontDesk();
    case "boss-desk":
      return principalDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair(classic);
    case "dog-bed":
      return petBed();
    case "bin":
      return recycleBin();
    default:
      return null;
  }
}

// ------------------------------------------------------------------ speakers

/** The classroom intercom: a cream box with a call button and a round grille. */
export function intercom(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rrect(1, 1, 10, 26, "#efe6cf", 1);
    g.rect(2, 2, 8, 1, "#fbf6e8");
    g.rect(5, 4, 2, 2, C.red).set(5, 4, C.redHi);
    for (let y = 8; y < 12; y += 2) g.rect(3, y, 6, 1, "#b9ad8f");
    g.ellipse(5.5, 17, 3.6, 3.6, "#d8cdb0");
    for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) g.set(Math.round(5.5 + dx), 17 + dy, "#8a7f66");
    g.rect(1, 24, 10, 2, "#d9ccab");
    g.rect(1, 24, 10, 1, "#c9bd9c");
  });
}

// ------------------------------------------------------------------ plants

function pot(g: Grid, x: number, y: number, w: number, h: number, color: string): void {
  g.rect(x, y, w, 2, shade(color, 0.2));
  g.rect(x + 1, y + 2, w - 2, h - 2, color);
  g.rect(x + 1, y + 2, 1, h - 2, shade(color, 0.25));
  g.rect(x + 2, y + h - 1, w - 4, 1, shade(color, -0.2));
}

function sunflower(g: Grid, cx: number, top: number, stemTo: number, big = false): void {
  g.vline(cx, top + 3, stemTo - top - 3, C.greenLo);
  g.rect(cx - 3, top + 9, 3, 2, C.green).rect(cx + 1, top + 12, 3, 2, C.green);
  g.set(cx - 3, top + 9, C.greenHi).set(cx + 3, top + 12, C.greenHi);
  const r = big ? 3.4 : 2.6;
  g.ellipse(cx, top + 2, r, r, C.yellow);
  g.set(cx, top - 2, C.yellow).set(cx - 4, top + 2, C.yellow).set(cx + 4, top + 2, C.yellow).set(cx, top + 6, C.yellow);
  g.ellipse(cx, top + 2, big ? 1.6 : 1.2, big ? 1.6 : 1.2, "#7a4a2a");
  g.set(cx - 1, top + 1, "#9a6a3a");
}

export function schoolPlant(s: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  switch (s) {
    case "PLANT":
      // A sunflower in a painted pot.
      return sprite("plant-sunflower", 16, 32, (g) => {
        sunflower(g, 8, 3, 22);
        pot(g, 3, 21, 10, 9, C.blue);
        g.set(6, 25, C.yellow).set(9, 27, C.yellow).set(10, 24, C.yellow);
      });
    case "PLANT_2":
      // A climbing bean on a stick, with a popsicle-stick label.
      return sprite("plant-bean", 16, 32, (g) => {
        g.vline(8, 3, 19, "#c9a06a");
        for (let y = 4; y < 21; y += 3) {
          const side = (y / 3) % 2 ? -1 : 1;
          g.rect(8 + side * 2 - (side < 0 ? 1 : 0), y, 2, 2, y % 2 ? C.green : C.greenHi);
          g.set(8 + side, y + 1, C.greenLo);
        }
        g.set(5, 10, "#f2f0e6").set(11, 15, "#f2f0e6");
        pot(g, 3, 21, 10, 9, "#d9784a");
        g.rect(11, 18, 2, 5, "#f0d9a8");
      });
    case "LARGE_PLANT":
      // Three tall sunflowers in a big tub.
      return sprite("plant-sunflowers", 32, 48, (g) => {
        sunflower(g, 9, 8, 38, true);
        sunflower(g, 22, 4, 38, true);
        sunflower(g, 15, 15, 38);
        g.rect(4, 34, 24, 3, C.greenLo);
        g.set(6, 33, C.green).set(12, 32, C.green).set(26, 33, C.green);
        pot(g, 6, 36, 20, 11, C.red);
        for (let x = 9; x < 24; x += 4) g.set(x, 41, C.yellowHi);
      });
    case "CACTUS":
      // The class cactus, with googly eyes.
      return sprite("plant-cactus", 16, 32, (g) => {
        g.rrect(6, 6, 5, 16, "#5fa65a", 2);
        g.rect(7, 7, 1, 13, "#86c97f");
        g.rrect(2, 11, 3, 6, "#5fa65a", 1).rect(4, 15, 2, 2, "#5fa65a");
        g.rrect(12, 9, 3, 6, "#5fa65a", 1).rect(11, 13, 2, 2, "#5fa65a");
        g.rect(7, 9, 2, 2, "#ffffff").rect(9, 9, 2, 2, "#ffffff").set(8, 10, OUTLINE).set(9, 10, OUTLINE);
        g.set(8, 5, C.pink).set(9, 4, C.pink);
        pot(g, 4, 21, 9, 9, C.yellow);
        g.set(6, 25, C.red).set(9, 27, C.blue).set(10, 24, C.green);
      });
    case "POT":
      // A paper cup with a bean sprout and a name.
      return sprite("plant-cup", 16, 16, (g) => {
        g.vline(8, 3, 5, C.greenLo);
        g.rect(5, 2, 3, 2, C.greenHi).rect(9, 3, 3, 2, C.green);
        g.rect(4, 8, 8, 6, "#ffffff");
        g.rect(4, 8, 8, 1, "#e9e5da");
        g.rect(5, 10, 6, 1, C.red);
        g.rect(5, 13, 6, 1, "#d6d0c2");
      });
    case "HANGING_PLANT":
      // A solar-system mobile hanging from the ceiling.
      return sprite("plant-mobile", 16, 32, (g) => {
        g.vline(8, 0, 6, "#9aa3ad");
        g.rect(2, 6, 13, 1, "#b07a46");
        const planets: [number, number, number, string][] = [
          [2, 14, 1.6, "#e8b06a"],
          [8, 11, 2.6, C.yellow],
          [14, 17, 1.8, C.blue],
          [5, 22, 1.4, C.red],
          [11, 25, 2.2, "#c9a27a"],
        ];
        for (const [x, y, r, c] of planets) {
          g.vline(x, 7, Math.round(y - r - 7), "#c9ced6");
          g.ellipse(x, y, r, r, c);
          g.set(x - 1, Math.round(y - r / 2), shade(c, 0.4));
        }
        g.rect(9, 25, 5, 1, "#e3c08a"); // a ring
      }, ["#9aa3ad", "#c9ced6"]);
    default:
      return null;
  }
}

export { pa };
