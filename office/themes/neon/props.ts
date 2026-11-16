// Neon City furniture: black glass and chrome with neon edges, a noodle bar,
// glowing vending, a holo TV, capsule seating and very glowy racks.
// Every sprite keeps the classic size so the office can place and animate it.
import type { Layout, PropPlacement } from "../../layout.ts";
import { drawPixelText, paRecolor, recolor, shade } from "../../themekit.ts";
import { glyph, neonize, OUTLINE, P, recolorNear, rim, sprite } from "./kit.ts";

// Furniture tones
const K0 = "#100d1c";
const K1 = "#201a38";
const K2 = "#2e2652";
const K3 = "#3f356a";
const K4 = "#564b88";
const K5 = "#7166a8";
const CH = P.chrome;
const CHH = P.chromeHi;

function couch(): HTMLCanvasElement {
  return sprite("couch", 84, 28, (g) => {
    const w = 82;
    const base = "#4a2f86";
    const hi = "#6a48b4";
    const lo = "#2e1d5a";
    g.rrect(8, 1, w - 16, 15, base, 3);
    g.rect(10, 2, w - 20, 1, P.mag);
    g.rect(10, 3, w - 20, 1, hi);
    for (const sx of [w / 3, (2 * w) / 3]) g.vline(Math.round(sx), 4, 10, lo);
    // Quilted back: little studs.
    for (let x = 14; x < w - 12; x += 8) g.set(x, 8, lo).set(x + 4, 11, lo);
    g.rect(2, 13, w - 2, 9, lo);
    g.rect(2, 13, w - 2, 1, shade(lo, 0.2));
    g.rect(4, 14, w - 6, 3, base);
    g.rrect(1, 5, 10, 17, base, 2);
    g.rrect(w - 9, 5, 10, 17, base, 2);
    g.rect(2, 6, 7, 1, P.mag).rect(w - 8, 6, 7, 1, P.mag);
    g.rect(2, 7, 7, 1, hi).rect(w - 8, 7, 7, 1, hi);
    // Plinth with a cyan underglow.
    g.rect(3, 22, w - 4, 2, K1);
    g.rect(5, 24, w - 8, 1, P.cyan);
  }, { skip: [P.cyan] });
}

function coffeeTable(): HTMLCanvasElement {
  return sprite("coffee-table", 38, 14, (g) => {
    g.rrect(1, 1, 36, 6, K2, 1);
    g.rect(2, 1, 34, 1, P.cyanLo);
    g.rect(1, 7, 36, 2, K1);
    g.rect(2, 8, 34, 1, P.mag);
    g.rect(3, 9, 2, 3, K0).rect(33, 9, 2, 3, K0);
    // A holo pad and a noodle cup with chopsticks.
    g.rect(5, 2, 9, 4, P.cyanDim).rect(6, 3, 5, 1, P.cyan).rect(6, 4, 3, 1, P.cyanLo);
    g.rect(24, 2, 5, 4, P.white).rect(24, 4, 5, 1, P.red);
    g.set(25, 1, "#c9a06a").set(27, 0, "#c9a06a").set(26, 1, "#c9a06a");
    g.set(31, 4, P.yel).set(32, 3, P.yel);
  });
}

function tv(w: number, h: number, standing: boolean): HTMLCanvasElement {
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rrect(1, 1, w, h, K1, 1);
    g.rect(3, 3, w - 4, h - 4, "#07060d");
    g.rect(2, 1, w - 2, 1, K4);
    // HUD corner brackets in cyan, a magenta lip, a status LED.
    for (const [cx, cy, dx, dy] of [[2, 2, 1, 1], [w - 1, 2, -1, 1], [2, h - 1, 1, -1], [w - 1, h - 1, -1, -1]] as const) {
      for (let i = 0; i < 6; i++) g.set(cx + i * dx, cy, P.cyan).set(cx, cy + i * dy, P.cyan);
    }
    g.rect(10, h, w - 18, 1, P.mag);
    g.set(w - 4, h, P.lime);
    if (standing) {
      g.rect(1 + w / 2 - 4, h + 1, 8, 4, K2);
      g.rect(8, h + 5, w - 14, 14, K1);
      g.rect(8, h + 5, w - 14, 1, K4);
      g.rect(8, h + 6, w - 14, 1, P.vio);
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * ((w - 26) / 3);
        g.rect(x, h + 9, (w - 26) / 3 - 4, 8, K2);
        for (let yy = h + 10; yy < h + 16; yy += 2) g.rect(x + 2, yy, (w - 26) / 3 - 8, 1, K3);
      }
      g.rect(10, h + 19, 3, 2, K0).rect(w - 10, h + 19, 3, 2, K0);
      g.rect(12, h + 19, w - 22, 1, P.cyan);
    } else {
      g.rect(1 + w / 2 - 6, h + 1, 12, 2, K2);
    }
  }, { skip: [P.cyan] });
}

/** The noodle bar counter: red lacquer, a broth pot, a steel sink, a nuker. */
function kitchenCounter(w: number): HTMLCanvasElement {
  return sprite(`kcounter-${w}`, w + 2, 36, (g) => {
    const top = 10;
    g.rect(1, top, w, 7, "#2e2438");
    g.rect(1, top, w, 1, "#4a3d5c");
    g.rect(1, top + 6, w, 1, "#201828");
    g.rect(1, top + 7, w, 17, "#3a0f22");
    g.rect(1, top + 7, w, 1, P.red);
    g.rect(1, top + 8, w, 1, "#5a1430");
    const signX = Math.round(w / 2) - 13;
    for (let x = 4; x < w - 6; x += 22) {
      if (x + 18 > signX - 1 && x < signX + 27) continue;
      g.rect(x, top + 10, 18, 11, "#2a0a18");
      g.rect(x, top + 10, 18, 1, "#4a1228");
      // A painted glyph on every door panel.
      glyph(x * 3 + w).forEach((row, yy) => {
        for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") g.set(x + 7 + xx, top + 13 + yy, "#b8862a");
      });
    }
    g.rect(1, top + 23, w, 1, "#1a0610");
    // A lit "RAMEN" sign on the front.
    g.rect(signX, top + 10, 26, 11, "#12060c");
    g.rect(signX, top + 10, 26, 1, P.orange);
    g.rect(signX, top + 20, 26, 1, P.orange);
    // Broth pot (the kettle): steel with a lid; steam rises at x+34.
    g.rrect(30, 6, 11, 9, "#6a6e8e", 2);
    g.rect(31, 7, 9, 1, "#a9b0d0");
    g.rect(32, 4, 7, 2, "#4c5070").set(35, 3, "#a9b0d0");
    g.set(29, 9, "#4c5070").set(41, 9, "#4c5070");
    // Sink
    if (w >= 80) {
      g.rect(42, top + 1, 16, 5, "#6a6e8e");
      g.rect(43, top + 2, 14, 3, "#3a3e5a");
      g.rect(49, top - 4, 2, 5, "#a9b0d0").set(50, top - 4, CHH);
    }
    // The nuker (microwave): dark box, window, keypad.
    if (w >= 100) {
      g.rect(w - 26, 0, 22, 14, K2);
      g.rect(w - 26, 0, 22, 1, K4);
      g.rect(w - 24, 2, 13, 10, "#0b0a14");
      g.rect(w - 24, 2, 13, 1, P.cyanDim);
      g.rect(w - 9, 3, 3, 8, K0).set(w - 8, 4, P.lime).set(w - 8, 6, P.cyanLo).set(w - 8, 8, P.cyanLo);
    }
    // Noodle cups with chopsticks.
    const cup = (cx: number, band: string) => {
      g.rect(cx, top - 4, 4, 4, P.white).rect(cx, top - 2, 4, 1, band);
      g.set(cx + 1, top - 6, "#c9a06a").set(cx + 2, top - 5, "#c9a06a");
    };
    cup(w >= 80 ? 60 : 44, P.red);
    cup(w >= 100 ? w - 34 : w - 8, P.cyanLo);
  }, {
    post: (ctx) => {
      const x = Math.round(w / 2) - 13 + 4;
      ctx.globalAlpha = 0.4;
      drawPixelText(ctx, "RAMEN", x, 23, P.red);
      drawPixelText(ctx, "RAMEN", x + 1, 22, P.red);
      ctx.globalAlpha = 1;
      drawPixelText(ctx, "RAMEN", x, 22, "#ffb27a");
    },
  });
}

/** The auto-brewer: black and chrome, a magenta display, two spouts. */
function espresso(): HTMLCanvasElement {
  return sprite("espresso", 26, 30, (g) => {
    // Cups warming on top.
    g.rect(5, 1, 4, 3, P.white).rect(10, 1, 4, 3, P.white).rect(16, 2, 4, 2, P.cyanLo);
    g.rect(2, 4, 22, 2, CH).rect(2, 4, 22, 1, CHH);
    g.rrect(2, 6, 22, 16, K2, 1);
    g.rect(3, 7, 20, 1, K4);
    g.rect(2, 20, 22, 2, K1);
    g.vline(2, 8, 12, P.mag).vline(23, 8, 12, P.mag);
    // Display and buttons
    g.rect(8, 8, 10, 4, "#1a0716").rect(9, 9, 4, 1, P.mag).rect(14, 9, 3, 1, P.mag).rect(9, 10, 6, 1, P.magLo);
    g.set(5, 9, P.cyan).set(5, 11, CHH).set(20, 9, CHH).set(20, 11, P.cyan);
    for (const x of [6, 15]) {
      g.rect(x, 13, 5, 3, CH);
      g.rect(x + 1, 16, 3, 1, K0);
      g.rect(x - 2, 14, 2, 1, K0);
    }
    g.rect(23, 12, 1, 7, CH).set(22, 18, CH);
    g.rect(3, 22, 20, 3, "#6a6e8e");
    for (let x = 4; x < 22; x += 2) g.set(x, 23, "#3a3e5a");
    g.rect(7, 19, 3, 3, P.white).set(10, 20, P.white);
    g.rect(11, 18, 4, 2, P.cyan);
    g.rect(2, 25, 22, 2, K0);
  });
}

function fridge(): HTMLCanvasElement {
  return sprite("fridge", 20, 34, (g) => {
    g.rrect(1, 1, 18, 31, "#24203a", 1);
    g.rect(2, 1, 16, 1, K5);
    g.rect(1, 12, 18, 1, K0);
    g.rect(1, 13, 18, 1, K4);
    // Glowing handles.
    g.rect(15, 4, 1, 6, P.cyan).rect(15, 15, 1, 8, P.cyan);
    // Holo temperature panel and a couple of stickers.
    g.rect(3, 4, 8, 5, "#0a1a24").rect(4, 5, 2, 3, P.cyan).rect(7, 5, 3, 1, P.cyanLo).rect(7, 7, 2, 1, P.cyanLo);
    g.rect(3, 16, 4, 4, P.mag).rect(8, 17, 4, 3, P.yel).rect(4, 22, 5, 3, P.vio);
    g.rect(2, 30, 16, 1, K1);
  }, { skip: [P.cyan] });
}

function vending(): HTMLCanvasElement {
  return sprite("vending", 24, 44, (g) => {
    g.rect(1, 1, 22, 42, "#2a0f34");
    g.rect(1, 1, 22, 3, P.mag);
    g.rect(2, 2, 20, 1, P.magHi);
    g.vline(22, 4, 38, P.magLo);
    g.vline(1, 4, 38, "#3e1650");
    // The window: lit rows of glowing snacks.
    g.rect(3, 5, 13, 28, "#0d0a1c");
    const snacks = [P.yel, P.cyan, P.lime, P.magHi, P.vioHi, P.orange];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, P.vioLo);
      for (let c = 0; c < 3; c++) {
        const s = snacks[(r * 3 + c + 1) % snacks.length]!;
        g.rect(4 + c * 4, 6 + r * 7, 3, 4, s);
        g.set(4 + c * 4, 6 + r * 7, shade(s, 0.5));
      }
    }
    // Keypad, coin flap, tray.
    g.rect(17, 6, 5, 10, "#140a1e");
    for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, P.cyan);
    g.rect(17, 18, 5, 2, P.yel);
    g.rect(17, 22, 5, 8, "#1e0c28");
    glyph(41).forEach((row, yy) => {
      for (let xx = 0; xx < 5; xx++) if (row[xx] === "#" && yy < 5) g.set(17 + xx, 23 + yy, P.magLo);
    });
    g.rect(3, 35, 18, 5, "#0d0a14");
    g.rect(3, 35, 18, 1, P.magLo);
  });
}

function meetingTable(): HTMLCanvasElement {
  return sprite("meeting-table", 68, 30, (g) => {
    g.rect(1, 1, 66, 20, "#1a1832");
    g.rect(1, 1, 66, 1, P.cyan);
    for (let x = 8; x < 66; x += 10) g.vline(x, 3, 16, "#20203e");
    for (let y = 6; y < 20; y += 6) g.hline(2, y, 64, "#20203e");
    // The holo emitter in the middle.
    g.ellipse(33.5, 11, 9, 4, P.cyanDim);
    g.ellipse(33.5, 11, 7, 2.6, "#122a40");
    g.ellipse(33.5, 11, 2, 1, P.cyanLo);
    g.rect(1, 20, 66, 2, K1);
    g.rect(2, 21, 64, 1, P.mag);
    g.rect(1, 22, 66, 1, K0);
    g.rect(3, 23, 3, 5, CH).rect(62, 23, 3, 5, CH);
    g.rect(4, 4, 3, 4, K4).set(4, 3, P.mag).set(6, 2, P.cyan);
    g.rect(61, 6, 3, 4, P.white).set(64, 7, P.white);
  }, { skip: [P.cyan] });
}

/** A lit holo-board: a glowing pale panel (the marker strokes are live). */
function whiteboard(w: number): HTMLCanvasElement {
  return sprite(`whiteboard-${w}`, w + 2, 46, (g) => {
    g.rect(1, 1, w, 34, K2);
    g.rect(1, 1, w, 1, P.cyan);
    g.rect(3, 3, w - 4, 30, "#e4f3ff");
    for (let x = 8; x < w - 2; x += 8) g.vline(x, 3, 30, "#d5e8fa");
    for (let y = 9; y < 33; y += 8) g.hline(3, y, w - 4, "#d5e8fa");
    g.set(3, 3, P.cyan).set(w, 3, P.cyan).set(3, 32, P.cyan).set(w, 32, P.cyan);
    g.rect(1, 35, w, 2, K1);
    g.rect(8, 34, 6, 1, P.mag).rect(16, 34, 6, 1, P.cyan).rect(24, 34, 6, 1, P.lime);
    g.rect(4, 37, 2, 8, K4).rect(w - 5, 37, 2, 8, K4);
  });
}

function bossDesk(w: number): HTMLCanvasElement {
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    g.rect(1, 1, w, 12, "#1a1428");
    g.rect(1, 1, w, 1, P.mag);
    g.rect(1, 13, w, 12, "#110d1c");
    g.rect(1, 13, w, 1, K4);
    g.rect(4, 16, w - 8, 7, "#0b0914");
    g.rect(w / 2 - 6, 18, 12, 3, P.cyan);
    g.rect(w / 2 - 5, 19, 10, 1, P.cyanHi);
    // A holo monitor from behind, holo sheets, a nameplate, a mug.
    g.rect(8, 1, 14, 9, "#1d3550").rect(9, 2, 12, 7, "#24486a");
    g.rect(9, 2, 12, 1, P.cyanLo);
    g.rect(26, 4, 9, 7, "#a8e8ff").rect(28, 3, 9, 7, "#d8f6ff").rect(29, 5, 6, 1, P.cyanLo).rect(29, 7, 5, 1, P.cyanLo);
    g.rect(w - 22, 8, 12, 3, K0).rect(w - 21, 9, 10, 1, P.mag);
    g.rect(w - 8, 4, 4, 5, P.white).set(w - 6, 5, P.mag);
  }, { skip: [P.cyan] });
}

function bossChair(): HTMLCanvasElement {
  return sprite("boss-chair", 22, 26, (g) => {
    g.rrect(2, 1, 18, 18, "#1c1828", 3);
    g.rect(4, 2, 14, 1, P.mag);
    for (let y = 6; y < 16; y += 4) g.rect(5, y, 12, 1, "#2a2440");
    g.rect(1, 12, 3, 8, "#1c1828").rect(18, 12, 3, 8, "#1c1828");
    g.set(2, 12, P.magLo).set(19, 12, P.magLo);
    g.rect(10, 19, 2, 4, CH).rect(5, 23, 12, 1, CH);
  });
}

function reception(): HTMLCanvasElement {
  return sprite("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 6, "#3a3460");
    g.rect(1, 6, 34, 1, P.cyan);
    g.rect(1, 12, 34, 9, "#1a1530");
    g.rect(1, 14, 34, 1, P.cyanLo);
    g.rect(4, 16, 28, 3, "#120f22");
    glyph(7).forEach((row, yy) => {
      if (yy < 3) for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") g.set(15 + xx, 16 + yy, P.vio);
    });
    // The bell (chrome, a neon ring) and a ticket dispenser.
    g.ellipse(9, 4, 3.5, 2.5, CH);
    g.rect(6, 5, 7, 1, P.mag);
    g.set(9, 1, CHH).set(8, 3, CHH);
    g.rect(24, 1, 7, 6, "#2a1430");
    g.rect(25, 2, 5, 3, "#0a0812");
    g.set(26, 3, P.red).set(28, 3, P.red);
  }, { skip: [P.cyan] });
}

function piano(): HTMLCanvasElement {
  // A synth workstation on a stand.
  return sprite("piano", 32, 32, (g) => {
    g.rect(1, 1, 30, 22, "#1a1530");
    g.rect(1, 1, 30, 1, P.vio);
    g.rect(4, 4, 10, 6, "#0a0a18");
    g.rect(5, 5, 8, 1, P.cyan).rect(5, 7, 5, 1, P.cyanLo).rect(5, 8, 7, 1, P.magLo);
    for (let i = 0; i < 5; i++) {
      g.set(17 + i * 3, 5, i % 2 ? P.mag : P.cyan);
      g.set(17 + i * 3, 8, K4);
    }
    g.rect(16, 10, 13, 2, K2);
    g.rect(2, 14, 28, 5, "#e6e8f6");
    for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, K0);
    g.rect(2, 18, 28, 1, P.mag);
    g.rect(1, 19, 30, 4, K0);
    // X stand
    g.line(5, 23, 12, 30, CH).line(12, 23, 5, 30, CH);
    g.line(20, 23, 27, 30, CH).line(27, 23, 20, 30, CH);
  });
}

function arcade(): HTMLCanvasElement {
  return sprite("arcade", 26, 48, (g) => {
    const w = 24;
    const h = 46;
    g.rect(2, 1, w - 2, h - 1, "#1a0f30");
    g.rect(1, 1, w, 8, P.mag);
    g.rect(3, 3, w - 4, 4, "#2a0a2a");
    for (let i = 0; i < 4; i++) {
      glyph(60 + i, 4).forEach((row, yy) => {
        if (yy < 3) for (let xx = 0; xx < 4; xx++) if (row[xx] === "#") g.set(4 + i * 5 + xx, 3 + yy, P.cyanHi);
      });
    }
    g.rect(3, 10, w - 4, 14, "#05040a");
    g.rect(1, 25, w, 6, "#2e2056");
    g.rect(1, 25, w, 1, P.cyan);
    g.set(6, 27, P.red).set(9, 28, P.cyan).set(12, 27, P.yel);
    g.rect(16, 26, 1, 3, K0).set(16, 25, P.mag);
    g.rect(2, 32, w - 2, h - 33, "#140a26");
    g.vline(2, 10, 35, P.magLo).vline(w - 1, 10, 35, P.cyanLo);
    g.rect(8, 36, 8, 3, "#0a0614");
    g.set(10, 37, P.lime).set(13, 37, P.lime);
  });
}

function pingpong(): HTMLCanvasElement {
  return sprite("pingpong", 76, 26, (g) => {
    const w = 74;
    g.rect(1, 1, w, 13, "#0f1a30");
    g.rect(1, 1, w, 1, P.cyan).rect(1, 13, w, 1, P.cyan);
    g.vline(1, 1, 13, P.cyan).vline(w, 1, 13, P.cyan);
    g.hline(2, 7, w - 2, P.cyanLo);
    g.rect(1, 14, w, 3, "#0a0f20");
    g.rect(2, 16, w - 2, 1, P.mag);
    const nx = 1 + Math.floor(w / 2);
    g.rect(nx, 0, 1, 15, P.cyanHi);
    g.rect(nx - 1, 0, 3, 1, CH);
    for (let y = 2; y < 14; y += 2) g.set(nx, y, P.cyan);
    g.rect(4, 17, 2, 7, CH).rect(w - 5, 17, 2, 7, CH);
    g.rect(nx - 6, 17, 2, 5, K4).rect(nx + 5, 17, 2, 5, K4);
  }, { skip: [P.cyan] });
}

function beanbag(color: string, body: string, top: string): HTMLCanvasElement {
  // A glowing sleep pod.
  return sprite(`beanbag-${color}`, 26, 16, (g) => {
    g.ellipse(13, 9, 11, 5.5, color);
    g.ellipse(13, 9, 10, 4.5, body);
    g.ellipse(13, 5.5, 8, 3.5, top);
    g.ellipse(13, 5, 5, 1.8, shade(top, 0.18));
    g.rect(8, 3, 4, 1, shade(color, 0.5));
    g.rect(5, 12, 16, 1, shade(body, -0.35));
  });
}

function armchair(): HTMLCanvasElement {
  return sprite("armchair", 28, 26, (g) => {
    const c = "#40357a";
    g.rrect(4, 1, 20, 16, c, 3);
    g.rect(6, 2, 16, 1, P.cyan);
    g.rrect(1, 9, 6, 13, shade(c, -0.15), 2);
    g.rrect(21, 9, 6, 13, shade(c, -0.15), 2);
    g.set(3, 9, P.cyanLo).set(24, 9, P.cyanLo);
    g.rect(6, 15, 16, 6, shade(c, -0.3));
    g.rect(4, 22, 2, 2, K0).rect(22, 22, 2, 2, K0);
  });
}

function lamp(): HTMLCanvasElement {
  // A neon tube floor lamp.
  return sprite("lamp", 16, 52, (g) => {
    g.rrect(5, 1, 6, 4, K3, 1);
    g.rect(6, 5, 4, 30, "#ffd0ee");
    g.rect(6, 5, 1, 30, P.mag).rect(9, 5, 1, 30, P.mag);
    g.rect(7, 35, 2, 13, K4);
    g.rect(4, 48, 8, 2, K2);
    g.rect(5, 48, 6, 1, P.mag);
  });
}

function printer(): HTMLCanvasElement {
  // The fabricator.
  return sprite("printer", 30, 26, (g) => {
    g.rect(2, 8, 26, 16, K3);
    g.rect(2, 8, 26, 1, K5);
    g.rect(5, 12, 20, 9, K1);
    for (let y = 14; y < 20; y += 2) g.hline(7, y, 16, K2);
    g.rrect(3, 1, 24, 8, K4, 1);
    g.rect(5, 3, 20, 2, "#0a1a24");
    g.rect(6, 3, 18, 1, P.cyan);
    g.rect(8, 0, 14, 2, P.white);
    g.set(24, 6, P.lime);
    g.rect(2, 22, 26, 1, P.vio);
  });
}

function cooler(): HTMLCanvasElement {
  // The hydration tap: a glowing tank on a dark body.
  return sprite("cooler", 17, 36, (g) => {
    g.rrect(3, 1, 11, 11, "#1fa8d0", 2);
    g.rect(4, 2, 9, 2, P.cyan);
    g.rect(5, 4, 2, 6, P.cyanHi);
    g.rect(5, 12, 7, 2, K4);
    g.rect(2, 14, 13, 20, K2);
    g.rect(2, 14, 13, 1, K5);
    g.rect(5, 18, 2, 2, P.cyan).rect(10, 18, 2, 2, P.mag);
    g.rect(4, 22, 9, 1, K1);
    g.rect(3, 32, 11, 1, P.cyanLo);
  });
}

function dartboard(): HTMLCanvasElement {
  return sprite("dartboard", 20, 34, (g) => {
    g.ellipse(9.5, 9.5, 8.5, 8.5, K1);
    g.ellipse(9.5, 9.5, 7, 7, P.mag);
    g.ellipse(9.5, 9.5, 6, 6, "#1a0f2a");
    g.ellipse(9.5, 9.5, 4.5, 4.5, P.cyan);
    g.ellipse(9.5, 9.5, 3.5, 3.5, "#0f1a2a");
    g.ellipse(9.5, 9.5, 1.5, 1.5, P.yel);
    g.rect(9, 19, 2, 12, K4);
    g.rect(5, 31, 10, 2, K2);
  });
}

function fishtankStand(): HTMLCanvasElement {
  return sprite("fishtank-stand", 42, 22, (g) => {
    g.rect(1, 1, 40, 18, K2);
    g.rect(1, 1, 40, 1, P.cyan);
    g.rect(1, 2, 40, 1, K4);
    g.rect(4, 6, 34, 10, K1);
    g.rect(4, 6, 34, 1, K3);
    glyph(23).forEach((row, yy) => {
      for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") g.set(18 + xx, 8 + yy, P.cyanLo);
    });
    g.rect(2, 19, 3, 2, K0).rect(37, 19, 3, 2, K0);
  }, { skip: [P.cyan] });
}

/** Server rack for the core: panels and drive bays with glowing vents (drive LEDs are live). */
function serverRack(): HTMLCanvasElement {
  return sprite("server-rack", 16, 33, (g) => {
    g.rect(1, 1, 14, 30, "#0a1020");
    g.rect(1, 1, 14, 1, P.cyan);
    for (let y = 3; y < 29; y += 4) {
      g.rect(3, y, 10, 3, "#14223a");
      g.rect(3, y, 10, 1, "#1f3456");
      g.rect(4, y + 1, 5, 1, P.cyanLo);
      g.set(4, y + 1, P.cyan);
    }
    g.vline(14, 2, 28, P.cyanLo);
    g.vline(1, 2, 28, P.vioLo);
    g.rect(1, 31, 14, 1, "#060a12");
  });
}

function aiRack(): HTMLCanvasElement {
  return sprite("ai-rack", 20, 33, (g) => {
    g.rect(1, 1, 18, 30, "#0e0a1e");
    g.rect(1, 1, 18, 6, "#4a1f8a");
    for (let y = 8; y < 29; y += 6) {
      g.rect(3, y, 14, 4, "#1c1438");
      g.ellipse(6.5, y + 1.5, 1.5, 1.5, "#05040c");
      g.ellipse(12.5, y + 1.5, 1.5, 1.5, "#05040c");
    }
    g.vline(1, 7, 24, P.mag).vline(18, 7, 24, P.mag);
    g.rect(1, 31, 18, 1, "#06040c");
  });
}

function stool(): HTMLCanvasElement {
  return sprite("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, "#c4203f");
    g.set(4, 1, P.red).set(5, 1, "#ff7a90");
    g.rect(5, 4, 2, 4, CH);
    g.rect(3, 8, 6, 1, K4);
  });
}

/** The noodle counter in the middle: bowls, chopsticks, a rice cooker. */
function kitchenIsland(width: number): HTMLCanvasElement {
  return sprite(`island-${width}`, width + 2, 26, (g) => {
    g.rect(1, 1, width, 12, "#2e2438");
    g.rect(1, 1, width, 1, "#4a3d5c");
    for (let x = 4; x < width; x += 9) g.set(x, 5, "#3a2e48").set(x + 3, 9, "#3a2e48");
    g.rect(1, 13, width, 10, "#3a0f22");
    g.rect(1, 13, width, 1, P.red);
    for (let x = 6; x < width - 2; x += 14) g.rect(x, 16, 8, 5, "#2a0a18");
    // Rice cooker, bowls, a soy bottle.
    g.rrect(4, 2, 10, 9, "#e6e8f6", 2).rect(5, 3, 8, 2, "#c9cde6").set(11, 7, P.lime);
    const bowl = (bx: number, by: number, broth: string) => {
      g.ellipse(bx, by, 3, 1.6, P.white);
      g.rect(bx - 2, by - 1, 5, 1, broth);
      g.set(bx + 2, by - 3, "#c9a06a").set(bx + 3, by - 4, "#c9a06a");
    };
    bowl(20, 7, "#e0a050");
    bowl(width - 14, 6, "#d07a3a");
    bowl(width - 24, 8, "#e0a050");
    g.rect(width - 32, 3, 2, 5, "#1a0a0a").set(width - 32, 2, P.red);
  });
}

function planter(width: number): HTMLCanvasElement {
  return sprite(`planter-${width}`, width, 20, (g) => {
    g.rect(1, 12, width - 2, 7, K2);
    g.rect(1, 12, width - 2, 1, K4);
    g.rect(2, 14, width - 4, 1, P.cyanLo);
    g.rect(2, 11, width - 4, 1, "#0f2a2a");
    const leaves = ["#1fd8b0", "#3affd8", "#148a7a", "#a052ff"];
    for (let x = 3; x < width - 3; x += 3) {
      const h = 3 + ((x * 7) % 5);
      const c = leaves[((x / 3) | 0) % 7 === 3 ? 3 : ((x / 3) | 0) % 3]!;
      g.rect(x, 12 - h, 1, h, c);
      g.rect(x + 1, 11 - h, 1, 2, c);
      if (((x / 3) | 0) % 5 === 1) g.set(x + 1, 10 - h, P.cyanHi);
    }
  }, { skip: ["#1fd8b0", "#3affd8", "#148a7a", "#a052ff", P.cyanHi] });
}

function loungeTable(): HTMLCanvasElement {
  return sprite("lounge-table", 28, 12, (g) => {
    g.ellipse(13.5, 4.5, 12.5, 4, K1);
    g.ellipse(13.5, 4, 11.5, 3, K3);
    g.ellipse(13.5, 4, 10.5, 2.4, "#1f1a36");
    g.rect(5, 3, 6, 3, P.cyanDim).rect(6, 3, 4, 1, P.cyan);
    g.rect(12, 4, 4, 2, P.white).set(12, 5, P.red);
    g.rect(18, 2, 3, 3, K4).set(19, 0, "#3affd8").set(18, 1, "#1fd8b0").set(20, 1, "#1fd8b0");
    g.rect(12, 8, 3, 3, CH);
  });
}

function sideTable(): HTMLCanvasElement {
  return sprite("side-table", 18, 14, (g) => {
    g.rect(1, 1, 16, 7, K2);
    g.rect(1, 1, 16, 1, P.vio);
    g.rect(3, 2, 6, 4, P.cyanDim).rect(4, 3, 3, 1, P.cyan);
    g.rect(10, 3, 5, 3, P.magLo);
    g.rect(2, 8, 2, 5, K4).rect(14, 8, 2, 5, K4);
  });
}

function bench(): HTMLCanvasElement {
  return sprite("bench", 36, 16, (g) => {
    for (const y of [1, 4]) g.rect(2, y, 32, 2, K3).rect(2, y, 32, 1, K5);
    g.rect(4, 3, 2, 6, CH).rect(30, 3, 2, 6, CH);
    g.rect(1, 8, 34, 3, K3).rect(1, 8, 34, 1, P.cyan);
    g.rect(3, 11, 2, 4, CH).rect(31, 11, 2, 4, CH);
    g.rect(6, 12, 24, 1, P.cyanLo);
  });
}

function dogBed(): HTMLCanvasElement {
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 11.5, 5.5, P.vio);
    g.ellipse(12.5, 7, 10.5, 4.5, "#2a1650");
    g.ellipse(12.5, 7.5, 8.5, 3.5, "#3a2470");
    g.set(10, 6, P.vioHi).set(15, 8, P.vioHi);
  });
}

function cornhole(): HTMLCanvasElement {
  return sprite("cornhole", 16, 22, (g) => {
    g.rect(1, 1, 14, 20, K2);
    g.rect(1, 1, 14, 1, P.mag);
    g.rect(3, 3, 10, 16, "#1a1040");
    g.vline(3, 3, 16, P.vio).vline(12, 3, 16, P.vio);
    g.ellipse(7.5, 7, 2.5, 2.5, P.mag);
    g.ellipse(7.5, 7, 1.5, 1.5, "#05040a");
  });
}

function planRolls(): HTMLCanvasElement {
  // Holo-scrolls in a steel canister.
  return sprite("plan-rolls", 18, 28, (g) => {
    const rolls: [number, number, string][] = [
      [3, 1, P.cyan],
      [8, 4, P.vioHi],
      [12, 2, P.cyanLo],
      [6, 7, P.magHi],
    ];
    for (const [x, y, c] of rolls) {
      g.rect(x, y, 3, 16, shade(c, -0.35));
      g.rect(x + 1, y, 1, 16, c);
      g.rect(x, y, 3, 1, shade(c, 0.4));
    }
    g.rect(2, 15, 14, 12, K3);
    g.rect(2, 15, 14, 1, K5);
    for (let y = 18; y < 26; y += 3) g.rect(3, y, 12, 1, K1);
    g.rect(3, 24, 12, 1, P.cyanLo);
  });
}

/** Glass fronts: a cyan-lit glass wall (violet-black for your suite). */
function glassFront(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // The room whose front edge this is (rooms can share x and width, so match the bottom too).
  const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
  const wood = room?.walls === "wood";
  const glass = recolorNear(
    classic(),
    wood
      ? { "#7a4e2c": "#2a1a2a", "#a86c3a": P.mag, "#e9dcc6": "#2a1236", "#4a2e1a": "#120812", "#ffffff": P.magHi }
      : { "#8fa3b5": "#2b2546", "#b8c9d6": P.cyan, "#cfe6f5": "#1e2a5a", "#5b6b7a": "#100d20", "#ffffff": P.cyanHi },
  );
  if (room?.kind === "server") {
    // "THE CORE" across the glass.
    const ctx = glass.getContext("2d")!;
    const text = (p.w ?? 100) >= 70 ? "THE CORE" : "CORE";
    const tw = text.length * 4 - 1;
    const x = Math.round((glass.width - tw) / 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 3, 1, tw + 6, 9);
    ctx.fillStyle = "#0a1424";
    ctx.fillRect(x - 2, 2, tw + 4, 7);
    drawPixelText(ctx, text, x, 3, P.cyan);
  }
  return glass;
}

// ------------------------------------------------------------------ seating by recolor

const SOFA_MAP = { "#d9823f": "#30407e", "#f2a65e": P.cyan, "#b0632a": "#222c5c", "#c9733a": "#3a4c8e", "#8a4a20": "#161c3c", "#5a3a24": K0 };

function waitingChair(): HTMLCanvasElement {
  return paRecolor("CUSHIONED_CHAIR_FRONT", { "#487841": "#30407e", "#6fa374": P.cyan, "#173115": "#121634", "#9e9295": K4 });
}

function woodenChair(name: string): HTMLCanvasElement {
  return paRecolor(name, { "#885c47": "#2e2a56", "#cfa86d": P.cyan, "#eddf9c": P.cyan, "#b38857": "#463e78", "#532e3d": K0 });
}

// Data archive shelves: dark steel racks of glowing cartridges.
const SHELF_MAP: Record<string, string> = {
  "#885c47": K2, "#b38857": K3, "#cfa86d": K4, "#301c1c": K0, "#35191f": K0, "#4f4651": K1,
  "#b84349": P.mag, "#903039": P.magLo, "#658eb1": P.cyan, "#607b94": P.cyanLo, "#63a159": P.lime, "#497d3f": P.limeLo,
  "#ad954d": P.yel, "#8b7336": P.yelLo,
  "#cac6b9": "#9d9ac8", "#e1e3e9": "#c8c6e6", "#dfd6ca": "#b0aed6", "#e7c4c9": P.magHi, "#d9e2e9": "#c8c6e6",
  "#f1f1db": "#e2e0f6", "#dfeee2": P.cyanHi, "#e2c2c9": P.magHi, "#b5bfc7": "#7570a6",
};

function libraryShelf(name: string): HTMLCanvasElement {
  return rim(paRecolor(name, SHELF_MAP), P.vioLo, "top");
}

function libraryTable(): HTMLCanvasElement {
  const c = rim(paRecolor("COFFEE_TABLE", { "#885c47": K1, "#e3bf88": P.cyan, "#b38857": K3, "#532e3d": K0 }), P.cyanLo, "top");
  // A holo reader and a cup.
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = P.cyanDim;
  ctx.fillRect(9, 13, 10, 6);
  ctx.fillStyle = P.cyan;
  ctx.fillRect(10, 14, 6, 1);
  ctx.fillRect(10, 16, 4, 1);
  ctx.fillStyle = P.white;
  ctx.fillRect(21, 12, 3, 3);
  ctx.fillStyle = P.mag;
  ctx.fillRect(21, 14, 3, 1);
  return c;
}

function sofaPa(name: string): HTMLCanvasElement {
  return paRecolor(name, { "#972651": "#3a1a5e", "#c25769": P.mag, "#420517": "#160a26", "#a2aaaf": K4 });
}

function bin(): HTMLCanvasElement {
  return paRecolor("BIN", { "#757b7c": K3, "#e1e3e9": P.lime, "#3f3740": K0, "#b5bcc6": K4, "#b5bfc7": K4 });
}

function bookshelf(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return rim(
    recolorNear(classic(), {
      "#b97c46": K2, "#d9a066": K4, "#6e4528": K0, "#8a5a34": K1, "#c86b4a": K3,
      "#d9776a": P.mag, "#7fb8d6": P.cyan, "#f2c14e": P.yel, "#86c97f": P.lime, "#a98bd8": P.vio, "#ef6f9a": P.magHi, "#e9e2d6": "#c8c6e6",
      "#5aa9d6": P.cyanLo, "#6fb36a": "#1fb8a0", "#5a9a55": "#127068",
    }, 2),
    P.magLo,
    "top",
  );
}

// ------------------------------------------------------------------ the hook

export function neonProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "tv":
      return tv(p.w ?? 120, L.tv.h, p.z > 0);
    case "kitchen-counter":
      return kitchenCounter(p.w ?? 100);
    case "espresso":
      return espresso();
    case "fridge":
      return fridge();
    case "vending":
      return vending();
    case "meeting-table":
      return meetingTable();
    case "whiteboard":
      return whiteboard(p.w ?? 80);
    case "boss-desk":
      return bossDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair();
    case "reception":
      return reception();
    case "piano":
      return piano();
    case "arcade":
      return arcade();
    case "pingpong":
      return pingpong();
    case "beanbag-blue":
      return beanbag(P.cyan, "#174a78", "#1f64a0");
    case "beanbag-pink":
      return beanbag(P.mag, "#5a1858", "#7a2478");
    case "armchair":
      return armchair();
    case "lamp":
      return lamp();
    case "printer":
      return printer();
    case "cooler":
      return cooler();
    case "dartboard":
      return dartboard();
    case "fishtank-stand":
      return fishtankStand();
    case "server-rack":
      return serverRack();
    case "ai-rack":
      return aiRack();
    case "stool":
      return stool();
    case "kitchen-island":
      return kitchenIsland(p.w ?? 72);
    case "planter":
      return planter(p.w ?? 48);
    case "lounge-table":
      return loungeTable();
    case "side-table":
      return sideTable();
    case "bench":
      return bench();
    case "dog-bed":
      return dogBed();
    case "cornhole":
      return cornhole();
    case "plan-rolls":
      return planRolls();
    case "glass-front":
      return glassFront(p, L, classic);
    case "waiting-chair":
      return waitingChair();
    case "waiting-sofa":
    case "waiting-sofa-back":
    case "waiting-armchair":
    case "waiting-armchair-left":
      return recolor(classic(), SOFA_MAP);
    case "meeting-chair-back":
    case "guest-chair":
      return woodenChair("WOODEN_CHAIR_BACK");
    case "meeting-chair-front":
      return woodenChair("WOODEN_CHAIR_FRONT");
    case "library-shelf":
      return libraryShelf("DOUBLE_BOOKSHELF");
    case "low-shelf":
      return libraryShelf("BOOKSHELF");
    case "library-table":
      return libraryTable();
    case "sofa-front":
      return sofaPa("SOFA_FRONT");
    case "sofa-back":
      return sofaPa("SOFA_BACK");
    case "bookshelf":
      return bookshelf(classic);
    case "bin":
      return bin();
    default:
      return rim(neonize(classic()), P.cyanLo, "top");
  }
}

export { OUTLINE };

/** The speakers beside the TV: dark towers with glowing cones. */
export function neonSpeaker(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rrect(1, 1, 10, 26, K1, 1);
    g.rect(2, 1, 8, 1, K4);
    g.ellipse(5.5, 7, 3, 3, P.mag);
    g.ellipse(5.5, 7, 2, 2, "#1a0a20");
    g.ellipse(5.5, 7, 0.8, 0.8, P.magHi);
    g.ellipse(5.5, 17, 3.4, 3.4, P.cyan);
    g.ellipse(5.5, 17, 2.4, 2.4, "#0a1a24");
    g.ellipse(5.5, 17, 1, 1, P.cyanLo);
    g.rect(3, 23, 6, 1, P.vioLo);
  });
}
