// Surf Villa: the furniture. Rattan, bamboo, teak and driftwood, aqua and
// coral cushions, a tiki bar, a juice cooler, a coconut-water dispenser and a
// board shed for the servers. Every sprite keeps the classic size.
import type { Layout, PropPlacement } from "../../layout.ts";
import { drawPixelText, Grid, makeCanvas, OUTLINE, cached, paRecolor, pixelTextWidth, recolor, shade } from "../../themekit.ts";
import { C, canes, fringe, spr, weave } from "./kit.ts";

const RATTAN_WOOD: Record<string, string> = { "#885c47": C.rattanLo, "#b38857": C.rattan, "#cfa86d": C.rattanHi, "#532e3d": C.rattanDk, "#eddf9c": C.white, "#e3bf88": C.rattanHi };
const WASH_WOOD: Record<string, string> = { "#885c47": "#b9a688", "#b38857": "#e1d5bb", "#cfa86d": "#f3ecdc", "#532e3d": "#7a6a58", "#301c1c": "#6a5a48", "#35191f": "#6a5a48", "#e3bf88": "#f3ecdc" };

// ------------------------------------------------------------------ lounge

function couch(): HTMLCanvasElement {
  return spr("couch", 84, 28, (g) => {
    const W = 84;
    // Throw pillows peek over the back.
    g.rrect(10, 1, 10, 5, C.aqua, 1).rect(11, 1, 8, 1, C.aquaHi);
    g.rrect(W - 20, 1, 10, 5, C.coral, 1).rect(W - 19, 1, 8, 1, C.coralHi);
    g.set(14, 3, C.white).set(15, 3, C.white).set(W - 16, 3, C.sunHi);
    // The woven back, seen from behind.
    g.rrect(7, 4, W - 14, 13, C.rattan, 2);
    weave(g, 9, 6, W - 18, 10, C.rattan, C.rattanLo);
    g.rect(8, 4, W - 16, 2, C.rattanHi);
    g.rect(8, 6, W - 16, 1, C.rattanLo);
    // Frame along the bottom.
    g.rect(2, 16, W - 4, 7, C.rattanLo);
    g.rect(2, 16, W - 4, 1, C.rattan);
    for (let x = 5; x < W - 4; x += 5) g.vline(x, 17, 6, C.rattanDk);
    // Rolled arms.
    for (const ax of [1, W - 10]) {
      g.rrect(ax, 6, 9, 17, C.rattan, 3);
      g.rect(ax + 1, 7, 7, 2, C.rattanHi);
      for (let y = 10; y < 21; y += 2) g.rect(ax + 1, y, 7, 1, C.rattanLo);
    }
    g.rect(4, 23, 2, 3, C.rattanDk).rect(W - 6, 23, 2, 3, C.rattanDk).rect(W / 2 - 1, 23, 2, 2, C.rattanDk);
  });
}

function coffeeTable(): HTMLCanvasElement {
  return spr("coffee-table", 38, 14, (g) => {
    g.rrect(1, 1, 36, 6, C.drift, 1);
    g.rect(2, 1, 34, 1, C.driftHi);
    g.rect(4, 4, 8, 1, C.driftLo).rect(20, 3, 10, 1, C.driftLo);
    g.rect(1, 7, 36, 2, C.driftLo);
    g.rect(3, 9, 2, 3, C.driftDk).rect(33, 9, 2, 3, C.driftDk);
    // A pineapple, a surf mag and two coconut drinks.
    g.rect(5, 3, 3, 3, C.sun).set(6, 4, C.sunLo).set(5, 5, C.sunLo);
    g.set(5, 2, C.palm).set(6, 1, C.palmHi).set(7, 2, C.palm);
    g.rect(11, 2, 7, 4, C.aqua).rect(12, 3, 4, 1, C.white).set(16, 4, C.coral);
    g.ellipse(25, 4, 1.6, 1.4, C.coconut).set(25, 3, C.coconutHi).set(26, 2, C.pink).set(27, 1, C.pink);
    g.ellipse(30, 4, 1.6, 1.4, C.coconut).set(30, 3, C.coconutHi).set(31, 2, C.coral).set(32, 2, C.sun).set(31, 1, C.coral);
  });
}

function beanbag(a: string, b: string): HTMLCanvasElement {
  return spr(`beanbag-${a}`, 26, 16, (g) => {
    const tmp = new Grid(26, 16);
    tmp.ellipse(13, 9, 11, 5.5, a);
    tmp.ellipse(13, 5, 8, 3.5, shade(a, 0.12));
    tmp.rect(4, 12, 18, 1, shade(a, -0.18));
    const swap: Record<string, string> = { [a]: b, [shade(a, 0.12)]: shade(b, 0.06), [shade(a, -0.18)]: shade(b, -0.14) };
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 26; x++) {
        const c = tmp.get(x, y);
        if (c) g.set(x, y, Math.floor((x + Math.floor(y / 3)) / 3) % 2 ? swap[c] ?? c : c);
      }
    }
    g.rect(7, 4, 4, 1, C.white);
    g.set(13, 2, shade(a, -0.1));
  });
}

function peacockChair(): HTMLCanvasElement {
  return spr("peacock", 28, 26, (g) => {
    const cx = 13.5;
    const cy = 17;
    g.ellipse(13.5, 9, 12.5, 8.5, C.rattan);
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 28; x++) {
        if (g.get(x, y) !== C.rattan) continue;
        const a = Math.atan2(y - cy, x - cx);
        const d = Math.hypot((x - cx) / 12.5, (y - cy) / 16);
        if (Math.floor(a * 7) % 2 === 0) g.set(x, y, C.rattanLo);
        if (Math.abs(d - 0.62) < 0.05 || Math.abs(d - 0.92) < 0.05) g.set(x, y, C.rattanDk);
        if (y === 1 || (y === 2 && (x < 6 || x > 21))) g.set(x, y, C.rattanHi);
      }
    }
    g.rrect(6, 13, 16, 6, C.aqua, 2);
    g.rect(7, 13, 14, 1, C.aquaHi);
    g.rect(7, 17, 14, 1, C.aquaLo);
    g.rect(10, 19, 8, 3, C.rattanLo);
    g.rect(11, 19, 1, 3, C.rattan).rect(15, 19, 1, 3, C.rattan);
    g.rect(7, 22, 14, 2, C.rattan);
    g.rect(7, 22, 14, 1, C.rattanHi);
  });
}

function rattanLamp(): HTMLCanvasElement {
  return spr("lamp", 16, 52, (g) => {
    g.rrect(1, 1, 14, 11, C.rattan, 3);
    weave(g, 2, 3, 12, 8, C.rattan, C.rattanLo);
    g.rect(3, 1, 10, 1, C.rattanHi);
    g.rect(2, 11, 12, 1, C.rattanDk);
    for (let y = 12; y < 48; y++) g.set(7, y, y % 7 === 0 ? C.bambooNode : C.bamboo).set(8, y, y % 7 === 0 ? C.bambooNode : C.bambooLo);
    g.rect(3, 48, 10, 2, C.teakLo);
    g.rect(3, 48, 10, 1, C.teak);
  });
}

function pingPong(): HTMLCanvasElement {
  return spr("pingpong", 76, 26, (g) => {
    const w = 74;
    g.rect(1, 1, w, 13, C.sea);
    g.rect(1, 1, w, 1, C.white).rect(1, 13, w, 1, C.white);
    g.vline(1, 1, 13, C.white).vline(w, 1, 13, C.white);
    g.hline(2, 7, w - 2, "#9fd2ea");
    for (let x = 6; x < w - 4; x += 9) g.set(x, 4, C.seaHi).set(x + 4, 10, C.seaHi);
    g.rect(1, 14, w, 3, C.seaLo);
    const nx = 1 + Math.floor(w / 2);
    g.rect(nx, 0, 1, 15, "#f4f4f4");
    g.rect(nx - 1, 0, 3, 1, C.bambooLo);
    for (let y = 2; y < 14; y += 2) g.set(nx, y, "#cfcfcf");
    for (const lx of [4, w - 5, nx - 6, nx + 5]) {
      const h = lx === 4 || lx === w - 5 ? 7 : 5;
      g.rect(lx, 17, 2, h, C.bamboo).set(lx, 19, C.bambooNode).set(lx + 1, 19, C.bambooNode);
    }
  });
}

function arcade(): HTMLCanvasElement {
  return spr("arcade", 26, 48, (g) => {
    const w = 24;
    const h = 46;
    g.rect(2, 1, w - 2, h - 1, C.teak);
    // A sunset marquee with a palm.
    g.rect(1, 1, w, 8, C.teakLo);
    const bands = ["#ff8f6a", "#ffa070", "#ffc070", "#ffd98a"];
    for (let j = 0; j < 4; j++) g.rect(3, 3 + j, w - 4, 1, bands[j]!);
    g.rect(14, 5, 4, 2, "#fff0b0");
    g.rect(3, 7, w - 4, 1, C.sea);
    g.set(7, 6, "#3a2a3a").set(7, 5, "#3a2a3a").set(7, 4, "#3a2a3a").set(6, 3, "#3a2a3a").set(8, 3, "#3a2a3a").set(5, 4, "#3a2a3a").set(9, 4, "#3a2a3a");
    // Screen (live).
    g.rect(2, 9, w - 2, 16, C.teakDk);
    g.rect(3, 10, w - 4, 14, "#1a1726");
    // Controls.
    g.rect(1, 25, w, 6, C.bamboo);
    g.rect(1, 25, w, 1, C.bambooHi);
    g.set(6, 27, C.coral).set(9, 28, C.aqua).set(12, 27, C.sun);
    g.rect(16, 26, 1, 3, "#2a2a2a").set(16, 25, C.coral);
    // Bamboo-clad cabinet with a coin door.
    canes(g, 2, 32, w - 2, h - 32);
    g.rect(8, 36, 8, 4, C.teakDk);
    g.set(11, 37, C.sun).set(12, 37, C.sun);
  });
}

function pianoSprite(): HTMLCanvasElement {
  return spr("piano", 32, 32, (g) => {
    const body = "#8fd6cf";
    const lo = "#6cb8b2";
    g.rect(1, 1, 30, 22, body);
    g.rect(1, 1, 30, 2, "#bdeee6");
    g.rect(4, 5, 24, 8, "#7ccac3");
    g.rect(4, 5, 24, 1, lo);
    // Sheet music and a conch on top.
    g.rect(12, 6, 8, 6, C.white);
    for (let y = 7; y < 12; y += 2) g.rect(13, y, 6, 1, "#c9c3b8");
    g.rect(22, 1, 4, 2, "#f6c6b8").set(25, 1, "#e0a090");
    g.set(6, 2, C.hibiscus).set(7, 1, C.hibiscus).set(8, 2, C.hibiscus).set(7, 2, C.sun);
    g.rect(2, 14, 28, 5, "#fbfaf5");
    for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, OUTLINE);
    g.rect(1, 19, 30, 4, lo);
    g.rect(3, 23, 2, 7, lo).rect(27, 23, 2, 7, lo);
  });
}

function fishtankStand(): HTMLCanvasElement {
  // A rock outcrop under the rock pool, with barnacles and a little seaweed.
  return spr("fishtank-stand", 42, 22, (g) => {
    const rocks = ["#8a8278", "#a39a8e", "#77706a"];
    g.rrect(1, 1, 40, 18, "#8a8278", 3);
    g.ellipse(9, 9, 8, 7, rocks[1]!);
    g.ellipse(22, 10, 9, 8, rocks[0]!);
    g.ellipse(34, 9, 7, 7, rocks[2]!);
    g.rect(3, 2, 10, 1, "#c8beb2").rect(16, 2, 9, 1, "#b4ab9e").rect(29, 3, 8, 1, "#a8a094");
    for (const [x, y] of [[6, 12], [20, 15], [31, 13], [14, 6], [36, 6]] as const) g.set(x, y, "#e8e2d6").set(x + 1, y, "#c8beb2");
    g.set(25, 5, "#57b86f").set(26, 4, "#3f9a5a").set(27, 5, "#57b86f").set(10, 4, "#57b86f").set(11, 3, "#3f9a5a");
    g.rect(2, 19, 4, 2, "#6e665c").rect(36, 19, 4, 2, "#6e665c");
  });
}

function tvFrame(w: number, h: number, standing: boolean): HTMLCanvasElement {
  return spr(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rrect(1, 1, w, h, C.bamboo, 1);
    for (let i = 1; i <= w; i += 9) g.set(i, 1, C.bambooNode).set(i, 2, C.bambooNode).set(i + 4, h, C.bambooNode).set(i + 4, h - 1, C.bambooNode);
    for (let j = 1; j <= h; j += 9) g.set(1, j, C.bambooNode).set(2, j, C.bambooNode).set(w, j + 4, C.bambooNode).set(w - 1, j + 4, C.bambooNode);
    g.rect(2, 1, w - 2, 1, C.bambooHi);
    g.rect(3, 3, w - 4, h - 4, "#14121c");
    g.set(w - 3, h - 1, C.aquaHi);
    if (standing) {
      g.rect(1 + w / 2 - 4, h + 1, 8, 4, C.teakDk);
      g.rect(8, h + 5, w - 14, 14, C.teak);
      g.rect(8, h + 5, w - 14, 2, C.teakHi);
      for (let i = 0; i < 3; i++) weave(g, 12 + Math.round(i * ((w - 26) / 3)), h + 9, Math.round((w - 26) / 3) - 4, 8, C.rattan, C.rattanLo);
      g.rect(10, h + 19, 3, 2, C.teakDk).rect(w - 10, h + 19, 3, 2, C.teakDk);
    } else {
      g.rect(1 + w / 2 - 6, h + 1, 12, 2, C.teakDk);
    }
  });
}

// ------------------------------------------------------------------ the tiki bar

function kitchenCounter(w: number): HTMLCanvasElement {
  return spr(`kcounter-${w}`, w + 2, 36, (g) => {
    const top = 10;
    // Butcher-block top over aqua cabinets.
    g.rect(1, top, w, 7, "#e9cf9c");
    g.rect(1, top, w, 1, "#f6e2b8");
    g.rect(1, top + 6, w, 1, "#cfae74");
    for (let x = 9; x < w; x += 9) g.vline(x, top + 1, 5, "#dcbf88");
    g.rect(1, top + 7, w, 17, C.aqua);
    g.rect(1, top + 7, w, 1, C.aquaHi);
    for (let x = 4; x < w - 6; x += 22) {
      g.rect(x, top + 10, 18, 11, "#56cdc8");
      g.rect(x, top + 10, 18, 1, C.aquaLo);
      g.rect(x + 7, top + 15, 4, 1, C.bambooLo);
    }
    // A blender with a pink smoothie where the kettle was.
    g.rect(33, 1, 5, 1, C.ink);
    g.rect(33, 2, 5, 8, "#e6f4f4");
    g.rect(33, 5, 5, 5, C.pink);
    g.rect(33, 5, 5, 1, "#ffc8dc");
    g.vline(33, 3, 6, C.white);
    g.rect(32, 10, 7, 5, C.coral);
    g.rect(32, 10, 7, 1, C.coralHi);
    g.set(35, 12, C.white);
    // Sink with a chrome tap.
    if (w >= 80) {
      g.rect(42, top + 1, 16, 5, C.chromeLo);
      g.rect(43, top + 2, 14, 3, "#8fb4c0");
      g.rect(49, top - 4, 2, 5, C.chromeLo).set(50, top - 4, C.chrome);
    }
    // A retro mint microwave.
    if (w >= 100) {
      g.rect(w - 26, 0, 22, 14, "#8fdcc8");
      g.rect(w - 26, 0, 22, 1, "#bdeedf");
      g.rect(w - 24, 2, 13, 10, "#2f5a5a");
      g.rect(w - 23, 3, 3, 1, "#4f7a78");
      g.rect(w - 9, 3, 3, 8, "#24303a").set(w - 8, 4, "#5ad18a");
      // Coconuts and a bunch of bananas by the microwave.
      g.ellipse(w - 32, top - 2, 2, 2, C.coconut).set(w - 33, top - 3, C.coconutHi);
      g.rect(w - 40, top - 2, 4, 1, C.sun).rect(w - 41, top - 3, 2, 1, C.sun).set(w - 36, top - 3, C.sunLo);
    }
    // Coconut cups with straws.
    const cupA = w >= 80 ? 60 : 24;
    g.rect(cupA, top - 3, 3, 3, C.coconut).set(cupA + 1, top - 3, C.coconutHi).set(cupA + 2, top - 5, C.pink).set(cupA + 2, top - 4, C.pink);
  });
}

function espresso(): HTMLCanvasElement {
  return spr("espresso", 26, 30, (g) => {
    // Carafes of cold brew and a smoothie on top.
    g.rect(4, 1, 4, 3, "#eef6f6").rect(4, 2, 4, 2, "#7a4a2a");
    g.rect(10, 1, 4, 3, "#eef6f6").rect(10, 2, 4, 2, C.pink);
    g.rect(16, 2, 3, 2, C.lime).set(17, 2, "#d8f4a0");
    g.rect(2, 4, 22, 2, C.chrome).rect(2, 4, 22, 1, "#ffffff");
    // A sunny yellow body.
    g.rrect(2, 6, 22, 16, C.sun, 1);
    g.rect(3, 7, 20, 1, C.sunHi);
    g.rect(2, 20, 22, 2, C.sunLo);
    g.rect(8, 8, 10, 4, "#1d2b22").rect(9, 9, 4, 1, "#5ad18a").rect(14, 9, 3, 1, "#5ad18a").rect(9, 10, 6, 1, "#2f6b4a");
    g.set(5, 9, C.coral).set(5, 11, C.white).set(20, 9, C.white).set(20, 11, C.aqua);
    for (const x of [6, 15]) {
      g.rect(x, 13, 5, 3, C.chromeLo);
      g.rect(x + 1, 16, 3, 1, "#2a2a32");
      g.rect(x + 2, 12, 1, 1, C.teak);
    }
    g.rect(23, 12, 1, 7, C.chrome).set(22, 18, C.chrome);
    g.rect(3, 22, 20, 3, C.chromeLo);
    for (let x = 4; x < 22; x += 2) g.set(x, 23, "#6b7280");
    g.rect(7, 19, 3, 3, "#eef6f6").set(10, 20, "#eef6f6");
    g.rect(11, 18, 4, 2, C.palm).set(12, 18, C.palmHi);
    g.rect(2, 25, 22, 2, C.ink);
  });
}

function fridge(): HTMLCanvasElement {
  return spr("fridge", 20, 34, (g) => {
    g.rrect(1, 1, 18, 31, "#bfe8dc", 2);
    g.rect(2, 1, 16, 1, "#e2f6ef");
    g.vline(2, 2, 29, "#d4f1e8");
    g.vline(18, 2, 29, "#9fd3c5");
    g.rect(1, 12, 18, 1, "#86bfb2");
    g.rect(15, 4, 1, 6, C.chromeLo).rect(15, 15, 1, 8, C.chromeLo);
    // Magnets: a starfish, a surfboard, a beach photo.
    g.set(5, 16, C.coral).set(4, 17, C.coral).set(5, 17, C.coralHi).set(6, 17, C.coral).set(4, 18, C.coral).set(6, 18, C.coral);
    g.rect(9, 15, 2, 5, C.sun).set(9, 15, C.coral).set(10, 19, C.coral);
    g.rect(3, 22, 6, 5, C.white).rect(4, 23, 4, 2, C.seaHi).rect(4, 25, 4, 1, C.sand);
    g.rect(11, 5, 3, 3, C.hibiscus).set(12, 6, C.sun);
  });
}

function vending(): HTMLCanvasElement {
  return spr("vending", 24, 44, (g) => {
    g.rect(1, 1, 22, 42, C.coral);
    g.rect(1, 1, 22, 3, C.sun);
    for (let x = 1; x < 23; x += 4) g.set(x, 3, C.sunLo).set(x + 1, 2, C.sunHi);
    g.rect(3, 5, 13, 28, "#16303a");
    const drinks = [C.sun, C.pink, C.lime, "#ffa040", C.aquaHi, C.hibiscus];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, "#5a8a94");
      for (let c = 0; c < 3; c++) {
        const x = 4 + c * 4;
        const y = 6 + r * 7;
        g.rect(x, y + 1, 3, 4, drinks[(r * 3 + c) % drinks.length]!);
        g.set(x + 1, y, C.white);
        g.set(x, y + 2, C.white);
      }
    }
    g.rect(17, 6, 5, 10, "#2a1e2e");
    for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, C.aquaHi);
    g.rect(17, 18, 5, 2, C.sunHi);
    // A palm-leaf decal.
    g.set(19, 24, C.palm).set(18, 25, C.palm).set(20, 25, C.palmHi).set(19, 26, C.palm).set(19, 27, C.palmLo).set(19, 28, C.palmLo);
    g.rect(3, 35, 18, 5, "#2a1e2e");
    g.rect(3, 41, 18, 1, C.coralLo);
  });
}

function island(width: number): HTMLCanvasElement {
  return cached(`beach|island-signed-${width}`, () => {
    const c = islandBase(width);
    // A little "TIKI BAR" plank on the bamboo front.
    const text = width >= 50 ? "TIKI BAR" : "TIKI";
    const tw = pixelTextWidth(text);
    if (width < tw + 8) return c;
    const out = makeCanvas(c.width, c.height, (ctx) => ctx.drawImage(c, 0, 0));
    const ctx = out.getContext("2d")!;
    const x = Math.round((width + 2 - tw) / 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 3, 16, tw + 6, 8);
    ctx.fillStyle = C.teakDk;
    ctx.fillRect(x - 2, 17, tw + 4, 6);
    ctx.fillStyle = C.teakLo;
    ctx.fillRect(x - 2, 17, tw + 4, 1);
    drawPixelText(ctx, text, x, 18, C.sunHi);
    return out;
  });
}

function islandBase(width: number): HTMLCanvasElement {
  return spr(`island-${width}`, width + 2, 26, (g) => {
    const w = width;
    // A teak bar top on a bamboo front with a thatch fringe.
    g.rect(1, 1, w, 12, C.teak);
    g.rect(1, 1, w, 1, C.teakHi);
    for (let y = 4; y < 12; y += 3) for (let x = 3 + (y % 2) * 5; x < w - 2; x += 11) g.rect(x, y, 5, 1, "#97592f");
    canes(g, 1, 13, w, 10);
    fringe(g, 1, 13, w, 4, width);
    // Coconut drinks with umbrellas, a cocktail, a fruit bowl, limes.
    const drink = (x: number, umb: string) => {
      g.ellipse(x, 6, 2, 1.8, C.coconut).set(x - 1, 5, C.coconutHi).set(x, 5, "#f4ead8");
      g.set(x + 1, 3, umb).set(x + 2, 3, umb).set(x + 1, 2, umb).set(x, 3, umb).set(x + 1, 4, C.bambooLo);
    };
    drink(6, C.coral);
    if (w >= 50) drink(18, C.aqua);
    g.rect(24, 5, 3, 3, "#f6fbfb").rect(24, 6, 3, 2, "#ff9f40").set(25, 8, "#f6fbfb").set(25, 9, "#f6fbfb");
    g.ellipse(w - 12, 7, 5, 2.5, C.white);
    g.rect(w - 15, 4, 3, 3, C.sun).set(w - 14, 3, C.palm).set(w - 15, 2, C.palmHi).set(w - 13, 2, C.palm);
    g.set(w - 11, 6, C.hibiscus).set(w - 10, 6, C.lime).set(w - 9, 7, C.coral).set(w - 12, 7, "#ffa040");
    if (w >= 60) g.rect(w - 29, 4, 7, 5, C.drift).rect(w - 28, 5, 2, 2, C.lime).rect(w - 25, 6, 2, 2, C.lime);
  });
}

function stool(): HTMLCanvasElement {
  return spr("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, C.rattan);
    g.rect(3, 2, 6, 1, C.rattanLo);
    g.set(4, 1, C.rattanHi).set(5, 1, C.rattanHi);
    g.rect(3, 4, 1, 4, C.bamboo).rect(8, 4, 1, 4, C.bamboo);
    g.rect(3, 6, 6, 1, C.bambooLo);
    g.set(3, 8, C.bambooNode).set(8, 8, C.bambooNode);
  });
}

function coconutCooler(): HTMLCanvasElement {
  return spr("cooler", 17, 36, (g) => {
    // A glass dispenser of coconut water on a bamboo stand.
    g.rrect(3, 1, 11, 11, "#e2f3f0", 2);
    g.rect(4, 4, 9, 7, "#eef4d6");
    g.rect(4, 4, 9, 1, "#f8fbe8");
    g.set(6, 6, C.lime).set(7, 6, C.lime).set(10, 8, C.lime).set(9, 5, C.white).set(7, 9, C.white);
    g.vline(4, 3, 7, C.white);
    g.rect(4, 1, 9, 1, C.bambooLo);
    g.rect(7, 12, 3, 2, C.chromeLo).set(8, 13, C.aqua);
    g.rect(2, 14, 13, 20, C.bamboo);
    canes(g, 2, 16, 13, 18);
    g.rect(2, 14, 13, 2, C.teak);
    g.rect(2, 14, 13, 1, C.teakHi);
    g.rect(3, 22, 11, 9, C.teakDk);
    g.ellipse(6, 27, 2.2, 2.2, C.coconut);
    g.ellipse(11, 28, 2.2, 1.8, C.coconutHi);
    g.set(5, 26, "#b38050").set(10, 27, "#c8925a");
    g.set(8, 24, C.palm).set(9, 23, C.palmHi);
  });
}

// ------------------------------------------------------------------ the cabana and the villa office

function meetingTable(): HTMLCanvasElement {
  return spr("meeting-table", 68, 30, (g) => {
    g.rect(1, 1, 66, 20, "#ebe0c6");
    g.rect(1, 1, 66, 1, "#f8f2e2");
    for (const [y, x0] of [
      [5, 9],
      [9, 30],
      [13, 4],
      [17, 40],
    ] as const) {
      for (let x = x0; x < x0 + 22 && x < 66; x++) if ((x * 3) % 7) g.set(x, y, "#d9caa8");
    }
    g.rect(1, 20, 66, 2, C.driftLo);
    g.rect(1, 22, 66, 1, C.driftDk);
    g.rect(3, 23, 3, 5, C.driftDk).rect(62, 23, 3, 5, C.driftDk);
    g.rect(32, 23, 4, 4, C.driftLo);
    g.rect(4, 4, 3, 4, C.coconut).set(4, 3, C.coral).set(6, 2, C.aqua).set(5, 4, C.coconutHi);
    g.rect(61, 6, 3, 4, "#fff0c0").set(62, 7, C.lime).set(63, 4, C.pink).set(63, 5, C.pink).set(64, 7, "#fff0c0");
    g.rect(48, 15, 3, 2, "#f6d0c4").set(49, 15, "#e0a898");
  });
}

function whiteboard(w: number): HTMLCanvasElement {
  return spr(`whiteboard-${w}`, w + 2, 46, (g) => {
    g.rect(1, 1, w, 34, C.bamboo);
    for (let x = 1; x <= w; x += 8) g.set(x, 1, C.bambooNode).set(x, 2, C.bambooNode).set(x + 4, 33, C.bambooNode).set(x + 4, 34, C.bambooNode);
    g.vline(1, 1, 34, C.bambooLo);
    g.rect(3, 3, w - 4, 30, "#fbfcfd");
    g.rect(1, 35, w, 2, C.teak);
    g.rect(8, 34, 6, 1, C.coral).rect(16, 34, 6, 1, C.sea).rect(24, 34, 6, 1, C.palm);
    for (const lx of [4, w - 5]) {
      g.rect(lx, 37, 2, 8, C.bamboo);
      g.set(lx, 40, C.bambooNode).set(lx + 1, 40, C.bambooNode);
    }
  });
}

function planRolls(): HTMLCanvasElement {
  return spr("plan-rolls", 18, 28, (g) => {
    const rolls: [number, number, string][] = [
      [3, 1, "#9fd8e8"],
      [8, 4, C.sandLight],
      [12, 2, C.seaHi],
      [6, 7, "#f6d6a8"],
    ];
    for (const [x, y, c] of rolls) {
      g.rect(x, y, 3, 16, c);
      g.rect(x, y, 3, 1, shade(c, 0.2));
      g.set(x + 1, y, shade(c, -0.25));
    }
    g.rect(2, 15, 14, 12, C.rattan);
    weave(g, 2, 16, 14, 11, C.rattan, C.rattanLo);
    g.rect(2, 15, 14, 1, C.rattanHi);
  });
}

function front(w: number, gapX: number, kind: "cabana" | "teak" | "shed"): HTMLCanvasElement {
  return cached(`beach|front-${w}-${gapX}-${kind}`, () => {
    const g = new Grid(w, 11);
    const inGap = (x: number) => gapX >= 0 && x >= gapX - 9 && x < gapX + 9;
    for (let x = 0; x < w; x++) {
      if (inGap(x)) continue;
      if (kind === "cabana") {
        g.set(x, 0, C.rattanLo).set(x, 1, C.rattan);
        const fold = x % 5;
        for (let y = 2; y < 9; y++) g.set(x, y, fold === 0 ? "#e6dccad0" : fold === 3 ? "#fffdf6c8" : "#f8f3e8b8");
        g.set(x, 9, C.teak).set(x, 10, C.teakDk);
      } else if (kind === "teak") {
        g.set(x, 0, C.teakLo).set(x, 1, C.teak);
        for (let y = 2; y < 9; y++) g.set(x, y, y % 2 ? "#e9d7b4c8" : "#f6ead2c0");
        g.set(x, 9, C.teakLo).set(x, 10, C.teakDk);
      } else {
        g.set(x, 0, C.bambooLo).set(x, 1, C.bamboo);
        for (let y = 5; y < 10; y++) g.set(x, y, x % 4 === 3 ? "#7aa6b8" : y === 5 ? "#c4e4ee" : "#9cc9d9");
        g.set(x, 10, "#3e5869");
      }
    }
    for (let x = 6; x < w; x += 24) {
      if (inGap(x) || inGap(x + 12)) continue;
      if (kind === "cabana") {
        // Curtains gathered with a rope tie.
        g.rect(x + 11, 2, 3, 7, "#fffdf6");
        g.set(x + 12, 5, C.rattanLo).set(x + 11, 5, C.rattanLo).set(x + 13, 5, C.rattanLo);
      } else if (kind === "teak") {
        g.vline(x + 12, 1, 9, C.teakLo);
        g.set(x + 2, 3, "#ffffffaa").set(x + 3, 4, "#ffffffaa");
      } else {
        g.vline(x + 12, 1, 5, C.bambooLo);
        if (kind === "shed" && x + 10 > (w - 42) / 2 && x < (w + 42) / 2) continue;
        // Surf stickers on the shed wall.
        const s = (x / 24) % 3;
        if (s === 0) g.rect(x + 4, 6, 3, 3, C.sun).set(x + 5, 7, "#fff0b0");
        else if (s === 1) g.rect(x + 3, 7, 5, 2, C.coral).set(x + 4, 6, C.coral);
        else g.rect(x + 4, 6, 2, 4, C.aquaHi).set(x + 5, 5, C.aquaHi);
      }
    }
    const c = g.toCanvas();
    if (kind === "shed" && w >= 60) {
      const ctx = c.getContext("2d")!;
      const tw = pixelTextWidth("BOARD SHED");
      drawPixelText(ctx, "BOARD SHED", Math.round((w - tw) / 2), 5, "#1d3a48");
    }
    return c;
  });
}

function bossDesk(w: number): HTMLCanvasElement {
  return spr(`boss-desk-${w}`, w + 2, 30, (g) => {
    g.rect(1, 1, w, 12, C.teak);
    g.rect(1, 1, w, 1, C.teakHi);
    for (let y = 4; y < 12; y += 3) for (let x = 2 + (y % 2) * 6; x < w - 2; x += 13) g.rect(x, y, 6, 1, "#97592f");
    g.rect(1, 13, w, 12, C.teakLo);
    g.rect(1, 13, w, 1, C.teak);
    g.rect(3, 15, w - 4, 9, C.teakDk);
    weave(g, 4, 16, w - 6, 7, C.rattan, C.rattanLo);
    g.rect(w / 2 - 6, 18, 12, 3, C.sun).rect(w / 2 - 5, 19, 10, 1, C.sunLo);
    // Monitor back, papers, a bamboo nameplate, an orchid, a coconut mug.
    g.rect(8, 1, 14, 9, "#b5bfc7").rect(9, 2, 12, 7, "#d5dbe2");
    g.rect(26, 4, 9, 7, "#fbfaf5").rect(28, 3, 9, 7, "#ffffff").rect(29, 5, 6, 1, "#b9b0a2").rect(29, 7, 5, 1, "#b9b0a2");
    g.rect(w - 22, 8, 12, 3, C.bamboo).rect(w - 21, 9, 10, 1, C.bambooNode);
    g.rect(w - 8, 5, 4, 4, C.coconut).set(w - 7, 5, C.coconutHi).set(w - 5, 3, C.aqua).set(w - 5, 4, C.aqua);
    g.rect(w - 14, 6, 3, 2, C.white).set(w - 13, 5, C.palm).set(w - 14, 3, C.pink).set(w - 12, 2, C.pink).set(w - 13, 4, C.palm).set(w - 11, 4, C.hibiscus);
  });
}

function bossChair(): HTMLCanvasElement {
  return spr("boss-chair", 22, 26, (g) => {
    g.rrect(2, 1, 18, 18, C.rattan, 4);
    weave(g, 4, 3, 14, 13, C.rattan, C.rattanLo);
    g.rect(5, 1, 12, 1, C.rattanHi);
    g.rect(5, 12, 12, 5, C.linen);
    g.rect(5, 12, 12, 1, C.white);
    g.rect(1, 12, 3, 8, C.rattanLo).rect(18, 12, 3, 8, C.rattanLo);
    g.rect(10, 19, 2, 4, C.rattanDk).rect(5, 23, 12, 1, C.rattanDk);
  });
}

function dogBed(): HTMLCanvasElement {
  return spr("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 11.5, 5.5, C.rattan);
    for (let y = 1; y < 13; y++) for (let x = (y % 2) * 2; x < 26; x += 4) if (g.get(x, y) === C.rattan) g.set(x, y, C.rattanLo);
    g.ellipse(12.5, 7.5, 8.5, 3.5, C.aquaHi);
    for (let x = 5; x < 22; x++) for (let y = 4; y < 12; y++) if (g.get(x, y) === C.aquaHi && Math.floor(x / 2) % 2) g.set(x, y, C.white);
    g.set(10, 6, C.coral).set(15, 8, C.coral);
  });
}

// ------------------------------------------------------------------ the waiting lounge

function waitingSofa(w: number): HTMLCanvasElement {
  return spr(`wait-sofa-${w}`, w + 2, 22, (g) => {
    g.rrect(3, 1, w - 4, 11, C.rattan, 2);
    weave(g, 4, 3, w - 6, 8, C.rattan, C.rattanLo);
    g.rect(5, 1, w - 8, 1, C.rattanHi);
    g.rrect(7, 4, 6, 5, C.coral, 1).rect(8, 4, 4, 1, C.coralHi);
    g.rect(1, 6, 5, 12, C.rattan).rect(w - 4, 6, 5, 12, C.rattan);
    g.rect(1, 6, 5, 1, C.rattanHi).rect(w - 4, 6, 5, 1, C.rattanHi);
    for (let y = 8; y < 17; y += 2) g.rect(2, y, 3, 1, C.rattanLo).rect(w - 3, y, 3, 1, C.rattanLo);
    const half = (w - 10) / 2;
    g.rect(6, 10, w - 10, 7, C.aqua);
    g.rect(6, 10, half - 1, 2, C.aquaHi).rect(6 + half + 1, 10, half - 1, 2, C.aquaHi);
    g.vline(6 + Math.floor(half), 10, 7, C.white);
    g.rect(1, 17, w, 2, C.rattanLo);
    g.rect(3, 19, 2, 2, C.rattanDk).rect(w - 3, 19, 2, 2, C.rattanDk);
  });
}

function sofaBack(w: number): HTMLCanvasElement {
  return spr(`sofa-back-${w}`, w + 2, 16, (g) => {
    g.rect(1, 1, w, 10, C.rattanLo);
    weave(g, 1, 3, w, 8, C.rattan, C.rattanLo);
    g.rect(1, 1, w, 2, C.rattanHi);
    g.rect(1, 11, w, 2, C.rattanDk);
    g.rect(2, 13, 2, 2, C.rattanDk).rect(w - 2, 13, 2, 2, C.rattanDk);
  });
}

function armchairSide(left: boolean): HTMLCanvasElement {
  return cached(`beach|arm-side-${left}`, () => {
    const g = new Grid(18, 20);
    g.rrect(1, 1, 5, 15, C.rattanLo, 1);
    for (let y = 2; y < 14; y++) g.set(2, y, y % 2 ? C.rattan : C.rattanHi).set(3, y, y % 2 ? C.rattanLo : C.rattan);
    g.rect(5, 9, 11, 6, C.aqua);
    g.rect(5, 9, 11, 2, C.aquaHi);
    g.rect(13, 7, 4, 8, C.rattan).rect(13, 7, 4, 1, C.rattanHi);
    g.rect(1, 15, 16, 2, C.rattanLo);
    g.rect(2, 17, 2, 2, C.rattanDk).rect(14, 17, 2, 2, C.rattanDk);
    g.outline(OUTLINE);
    return (left ? g.flipped() : g).toCanvas();
  });
}

function loungeTable(): HTMLCanvasElement {
  return spr("lounge-table", 28, 12, (g) => {
    g.ellipse(13.5, 4.5, 12.5, 4, C.rattanLo);
    g.ellipse(13.5, 4, 11.5, 3, C.rattan);
    for (let x = 4; x < 24; x += 3) g.set(x, 4 + (x % 2), C.rattanLo);
    // A hurricane candle in the middle (it glows at night).
    g.rect(12, 1, 3, 4, "#fff3c8").set(13, 2, "#ffb347").set(13, 1, "#fff8e0").rect(12, 5, 3, 1, C.rattanDk);
    g.ellipse(6, 4, 1.6, 1.4, C.coconut).set(6, 3, C.coconutHi).set(7, 1, C.coral).set(8, 1, C.coral).set(7, 2, C.bambooLo);
    g.set(20, 2, C.hibiscus).set(19, 3, C.hibiscus).set(21, 3, C.hibiscus).set(20, 4, C.hibiscus).set(20, 3, C.sun);
    g.rect(12, 8, 3, 3, C.rattanDk);
  });
}

function sideTable(): HTMLCanvasElement {
  return spr("side-table", 18, 14, (g) => {
    g.rect(1, 1, 16, 7, C.bamboo);
    g.rect(1, 1, 16, 1, C.bambooHi);
    for (let x = 3; x < 16; x += 3) g.vline(x, 2, 5, C.bambooLo);
    g.rect(3, 2, 6, 4, C.aqua).rect(4, 3, 3, 1, C.white);
    g.rect(11, 3, 3, 2, "#f6d0c4").set(12, 3, "#e0a898");
    g.rect(2, 8, 2, 5, C.bambooLo).rect(14, 8, 2, 5, C.bambooLo);
  });
}

function reception(): HTMLCanvasElement {
  return spr("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 6, C.teak);
    g.rect(1, 6, 34, 1, C.teakHi);
    canes(g, 1, 12, 34, 9);
    fringe(g, 1, 11, 34, 4, 31);
    // The bell, a lei and a little aqua sign.
    g.ellipse(9, 4, 3.5, 2.5, C.sun);
    g.rect(6, 5, 7, 1, C.sunLo);
    g.set(9, 1, C.sun).set(8, 3, C.sunHi);
    g.set(15, 8, C.hibiscus).set(16, 9, C.sun).set(17, 9, C.pink).set(18, 9, C.white).set(19, 8, C.hibiscus);
    g.rrect(24, 1, 7, 6, C.aqua, 1);
    g.rect(25, 2, 5, 1, C.white).rect(25, 4, 3, 1, C.white);
  });
}

// ------------------------------------------------------------------ games, servers, utilities

function dartboard(): HTMLCanvasElement {
  return spr("dartboard", 20, 34, (g) => {
    g.ellipse(9.5, 9.5, 8.5, 8.5, C.drift);
    g.ellipse(9.5, 9.5, 7, 7, C.coral);
    g.ellipse(9.5, 9.5, 5.5, 5.5, C.sandLight);
    g.ellipse(9.5, 9.5, 3.5, 3.5, C.aqua);
    g.ellipse(9.5, 9.5, 1.5, 1.5, C.coral);
    for (const [x, y] of [[9, 1], [1, 9], [17, 10], [10, 17]] as const) g.set(x, y, C.driftDk);
    g.rect(9, 19, 2, 12, C.driftLo).set(9, 22, C.driftDk).set(10, 27, C.driftDk);
    g.rect(5, 31, 10, 2, C.driftDk);
  });
}

function cornhole(): HTMLCanvasElement {
  return spr("cornhole", 16, 22, (g) => {
    g.rect(1, 1, 14, 20, C.drift);
    g.rect(1, 1, 14, 1, C.driftHi);
    const bands = [C.coral, "#ff9f6a", C.sun, C.sun, C.aqua, C.sea];
    for (let y = 3; y < 19; y++) g.rect(3, y, 10, 1, bands[Math.min(5, Math.floor((y - 3) / 2.7))]!);
    for (let x = 3; x < 13; x++) g.set(x, 13 + (x % 3 === 0 ? 1 : 0), C.white);
    g.ellipse(7.5, 7, 2.5, 2.5, "#1a1722");
  });
}

function serverLocker(): HTMLCanvasElement {
  return spr("server-rack", 16, 33, (g) => {
    g.rect(1, 1, 14, 30, "#9cc9d9");
    for (let x = 3; x < 9; x += 3) g.vline(x, 2, 29, "#86b4c6");
    g.rect(1, 1, 14, 1, "#c4e4ee");
    for (let y = 5; y < 29; y += 3) g.rect(2, y, 6, 1, "#7aa6b8");
    g.rect(9, 3, 5, 27, "#1d2a33");
    g.rect(9, 3, 5, 1, "#2f4250");
    g.ellipse(4.5, 20, 1.5, 1.5, C.sun);
    g.rect(3, 25, 4, 2, C.coral).set(4, 24, C.coral);
    g.rect(1, 31, 14, 1, "#3e5869");
  });
}

function aiLocker(): HTMLCanvasElement {
  return spr("ai-rack", 20, 33, (g) => {
    g.rect(1, 1, 18, 30, "#1f4f66");
    g.rect(1, 1, 18, 6, C.aquaDk);
    for (let y = 8; y < 29; y += 6) {
      g.rect(3, y, 14, 4, "#2a6680");
      g.ellipse(6.5, y + 1.5, 1.5, 1.5, "#0f2430");
      g.ellipse(12.5, y + 1.5, 1.5, 1.5, "#0f2430");
    }
    g.set(16, 29, C.hibiscus).set(17, 29, C.sun);
    g.rect(1, 31, 18, 1, "#0f2430");
  });
}

function planter(width: number): HTMLCanvasElement {
  return cached(`beach|planter-${width}`, () => {
    const g = new Grid(width, 20);
    g.rect(1, 12, width - 2, 7, C.teak);
    g.rect(1, 12, width - 2, 2, C.teakHi);
    for (let x = 6; x < width - 2; x += 6) g.vline(x, 14, 5, C.teakLo);
    g.rect(2, 11, width - 4, 1, "#5a4a2a");
    g.outline(OUTLINE);
    const c = g.toCanvas();
    const ctx = c.getContext("2d")!;
    // Tropical leaves spill over the box: fronds, monstera, a bird of paradise.
    const put = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    };
    for (let x = 3, i = 0; x < width - 4; x += 4, i++) {
      const kind = i % 5;
      if (kind === 0 || kind === 3) {
        // Palm frond: a fan of thin strokes.
        put(x, 6, 1, 6, C.palmLo);
        put(x - 1, 5, 1, 2, C.palm);
        put(x + 1, 4, 1, 3, C.palmHi);
        put(x + 2, 6, 1, 2, C.palm);
        put(x - 2, 7, 1, 2, C.palmLo);
      } else if (kind === 1) {
        // Monstera leaf.
        put(x - 1, 5, 4, 5, C.palm);
        put(x, 4, 2, 1, C.palm);
        put(x, 6, 1, 1, C.palmDk);
        put(x + 2, 8, 1, 1, C.palmDk);
        put(x + 1, 10, 1, 2, C.palmLo);
      } else if (kind === 2) {
        put(x, 3, 1, 9, C.palmLo);
        put(x + 1, 2, 2, 1, "#ff8a3d");
        put(x + 2, 1, 1, 1, "#4a7be0");
        put(x - 1, 3, 1, 1, "#ff8a3d");
      } else {
        put(x, 7, 3, 4, C.palmHi);
        put(x + 1, 6, 1, 1, C.palmHi);
        put(x + 1, 9, 1, 2, C.palm);
      }
    }
    return c;
  });
}

function bench(): HTMLCanvasElement {
  return spr("bench", 36, 16, (g) => {
    for (const y of [1, 4]) g.rect(2, y, 32, 2, C.drift).rect(2, y, 32, 1, C.driftHi);
    g.rect(4, 3, 2, 6, C.driftDk).rect(30, 3, 2, 6, C.driftDk);
    g.rect(1, 8, 34, 3, C.drift).rect(1, 8, 34, 1, C.driftHi);
    g.set(9, 9, C.driftLo).set(22, 10, C.driftLo);
    g.rect(3, 11, 2, 4, C.driftDk).rect(31, 11, 2, 4, C.driftDk);
  });
}

// ------------------------------------------------------------------ the hook

export function beachProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "pingpong":
      return pingPong();
    case "arcade":
      return arcade();
    case "beanbag-blue":
      return beanbag(C.aqua, C.white);
    case "beanbag-pink":
      return beanbag(C.coral, C.sunHi);
    case "armchair":
      return peacockChair();
    case "lamp":
      return rattanLamp();
    case "piano":
      return pianoSprite();
    case "fishtank-stand":
      return fishtankStand();
    case "tv":
      return tvFrame(p.w ?? 120, L.tv.h, p.z > 0);
    case "kitchen-counter":
      return kitchenCounter(p.w ?? 100);
    case "espresso":
      return espresso();
    case "fridge":
      return fridge();
    case "vending":
      return vending();
    case "kitchen-island":
      return island(p.w ?? 72);
    case "stool":
      return stool();
    case "cooler":
      return coconutCooler();
    case "meeting-table":
      return meetingTable();
    case "whiteboard":
      return whiteboard(p.w ?? 80);
    case "plan-rolls":
      return planRolls();
    case "glass-front": {
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      return front(p.w ?? 100, gap, room?.kind === "meeting" ? "cabana" : room?.walls === "wood" ? "teak" : "shed");
    }
    case "boss-desk":
      return bossDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair();
    case "dog-bed":
      return dogBed();
    case "waiting-sofa":
      return waitingSofa(p.w ?? 42);
    case "waiting-sofa-back":
      return sofaBack(p.w ?? 42);
    case "waiting-armchair":
      return armchairSide(false);
    case "waiting-armchair-left":
      return armchairSide(true);
    case "lounge-table":
      return loungeTable();
    case "side-table":
      return sideTable();
    case "reception":
      return reception();
    case "dartboard":
      return dartboard();
    case "cornhole":
      return cornhole();
    case "server-rack":
      return serverLocker();
    case "ai-rack":
      return aiLocker();
    case "planter":
      return planter(p.w ?? 48);
    case "bench":
      return bench();
    case "meeting-chair-back":
    case "guest-chair":
      return paRecolor("WOODEN_CHAIR_BACK", RATTAN_WOOD);
    case "meeting-chair-front":
      return paRecolor("WOODEN_CHAIR_FRONT", RATTAN_WOOD);
    case "waiting-chair":
      return paRecolor("CUSHIONED_CHAIR_FRONT", { "#487841": C.aqua, "#6fa374": C.aquaHi, "#173115": C.aquaDk, "#9e9295": C.rattanLo });
    case "library-shelf":
      return paRecolor("DOUBLE_BOOKSHELF", WASH_WOOD);
    case "low-shelf":
      return paRecolor("BOOKSHELF", WASH_WOOD);
    case "library-table":
      return paRecolor("COFFEE_TABLE", RATTAN_WOOD);
    case "sofa-front":
      return paRecolor("SOFA_FRONT", { "#972651": C.aquaLo, "#c25769": C.aqua, "#420517": C.aquaDk, "#a2aaaf": C.rattan });
    case "sofa-back":
      return paRecolor("SOFA_BACK", { "#972651": C.aquaLo, "#c25769": C.aqua, "#420517": C.aquaDk, "#a2aaaf": C.rattan });
    case "bin":
      return paRecolor("BIN", { "#757b7c": C.rattanLo, "#e1e3e9": C.rattanHi, "#3f3740": C.rattanDk, "#b5bfc7": C.rattan });
    case "bookshelf":
      return cached("beach|bookshelf", () => recolor(classic(), { "#b97c46": "#e1d5bb", "#d9a066": "#f3ecdc", "#6e4528": "#b9a688", "#8a5a34": "#8a7a62", "#ecbd84": "#fbf6ea" }));
    case "printer":
      return cached("beach|printer", () => recolor(classic(), { "#cfc6b8": "#e6f1ee", "#ddd6ca": "#f6fbfa", "#b9b0a2": "#9fd6d0", "#ece8e0": "#ffffff", "#3a3a46": "#2f4a54" }));
    default:
      return null;
  }
}
