// Coffee Shop: the live bits. The café tables under everyone's laptops (a
// marble two-top, a walnut four-top, the long oak communal table, the window
// bar's plank), what stands on the counter (the grinder, the tip jar, the old
// brass till, the cake dome, cups waiting for pickup, the bell), the baristas
// behind it pulling shots, steaming milk, calling out orders and wiping down,
// the fire in the fireplace, the open-mic stage's gear, the roaster in the
// storeroom, Edison bulbs along the walls, and every warm light that keeps
// the place glowing after dark.

import type { Drawable, Light, PaintInfo, WallLightsInfo } from "../../theme.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import { charSprite, type CharPose, type Look } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import { cached, drawPixelText, floorPlan, pixelTextWidth } from "../../themekit.ts";
import { cafePlant } from "./props.ts";
import { C, OUTLINE, rect, sprite } from "./kit.ts";
import { planOf, type CafePlan, type Counter, type Table } from "./plan.ts";
import { clickDecor, clickLights, clickOverlay } from "./clicks.ts";

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ the tables

/** A table's sprite: drawn from 10 px below its north desk's top (the top 32 deep, the front edge, legs). */
function tableSprite(t: Table): HTMLCanvasElement {
  const w = t.w;
  return sprite(`table-${t.kind}-${w}`, w, 48, (g) => {
    switch (t.kind) {
      case "two": {
        // A round bistro table per desk pair: an oak top with a dark rim on an iron pedestal.
        for (let x = 0; x < w; x += 48) {
          g.ellipse(x + 24, 19, 21, 17, C.oakDk);
          g.ellipse(x + 24, 18, 20, 16, C.oak);
          for (let yy = 6; yy < 32; yy += 5) {
            for (let xx = x + 6; xx < x + 43; xx++) if (g.get(xx, yy) === C.oak && (xx * 3 + yy) % 11 > 2) g.set(xx, yy, "#a87244");
          }
          g.hline(x + 14, 2, 20, "#d9a46e").hline(x + 9, 4, 6, "#c99560");
          g.rect(x + 22, 36, 4, 7, C.iron).rect(x + 23, 36, 1, 7, C.ironHi);
          g.rect(x + 16, 43, 16, 3, C.iron).hline(x + 16, 43, 16, C.ironHi);
        }
        break;
      }
      case "four": {
        // A walnut four-top: square-cornered top with a light edge, tapered legs.
        for (let x = 0; x < w; x += 96) {
          const tw = Math.min(96, w - x) - 8;
          g.rect(x + 4, 2, tw, 30, C.walnutHi);
          g.rect(x + 4, 3, tw, 28, C.walnut);
          for (let y = 9; y < 31; y += 7) g.hline(x + 5, y, tw - 2, C.walnutLo);
          g.rect(x + 4, 31, tw, 4, C.walnutLo).hline(x + 4, 31, tw, C.walnutDk);
          for (const lx of [x + 6, x + 4 + tw - 5]) g.rect(lx, 35, 3, 11, C.walnutDk);
        }
        break;
      }
      case "long": {
        // The communal table: long oak planks, a linen runner, bud vases and outlets down the middle.
        g.rect(2, 2, w - 4, 30, C.oakHi);
        g.rect(2, 3, w - 4, 28, C.oak);
        for (let y = 8; y < 31; y += 6) g.hline(3, y, w - 6, C.oakLo);
        for (let x = 30; x < w - 4; x += 41) g.vline(x, 3, 28, C.oakLo);
        g.rect(2, 31, w - 4, 4, C.oakLo).hline(2, 31, w - 4, C.oakDk);
        for (const lx of [5, w - 9]) g.rect(lx, 35, 4, 11, C.oakDk);
        if (w >= 192) g.rect(Math.floor(w / 2) - 1, 35, 3, 11, C.oakDk);
        // Little things at the desk pairs' seams: a bud vase, a power outlet, salt and pepper.
        for (let x = 48; x < w; x += 48) {
          const k = (x / 48) % 3;
          if (k === 1) g.rect(x - 1, 14, 3, 5, C.glass).set(x, 12, C.chalkPink).set(x, 13, C.leaf);
          else if (k === 2) g.rect(x - 2, 15, 5, 4, C.chromeLo).set(x - 1, 16, OUTLINE).set(x + 1, 16, OUTLINE);
          else g.rect(x - 2, 16, 2, 3, C.cream).rect(x + 1, 16, 2, 3, C.iron);
        }
        break;
      }
      case "bar": {
        // The window bar's plank on iron brackets, a power strip at one end.
        g.rect(0, 0, w, 12, C.walnutHi);
        g.rect(0, 1, w, 10, C.walnut);
        for (let x = 20; x < w; x += 37) g.vline(x, 1, 10, C.walnutLo);
        g.rect(0, 11, w, 4, C.walnutLo).hline(0, 11, w, C.walnutDk);
        for (let x = 8; x < w - 4; x += 48) g.rect(x, 15, 2, 5, C.iron).rect(x - 2, 15, 6, 1, C.iron);
        g.rect(w - 14, 4, 10, 4, C.chrome).set(w - 12, 5, OUTLINE).set(w - 9, 5, OUTLINE).set(w - 6, 5, OUTLINE);
        break;
      }
    }
  });
}

/** Where each table is drawn and its depth. */
function tableItems(t: Table): { x: number; y: number; z: number; s: HTMLCanvasElement } {
  const s = tableSprite(t);
  if (t.kind === "bar") return { x: t.x + 2, y: t.y - 4, z: t.y + 12, s };
  return { x: t.x, y: t.y + 10, z: t.y + 22, s };
}

/** A candle jar on a table (lit at night). */
const candle = () =>
  sprite("candle", 4, 6, (g) => {
    g.rect(0, 2, 4, 4, C.glass).rect(1, 3, 2, 3, C.cream).set(1, 1, C.amber);
  });

// ------------------------------------------------------------------ the counter

const grinderSprite = () =>
  sprite("grinder", 9, 18, (g) => {
    g.rect(1, 0, 7, 6, "#9fc4d0").rect(2, 2, 5, 4, C.espresso).set(2, 2, C.crema).hline(1, 0, 7, C.chromeHi);
    g.rect(2, 6, 5, 7, C.iron).vline(2, 6, 7, C.ironHi).set(4, 8, C.chrome);
    g.rect(0, 13, 9, 1, C.iron).rect(1, 14, 7, 3, C.chromeLo).rect(3, 11, 3, 2, C.chrome);
  });

const tipsSprite = () =>
  sprite("tips", 6, 9, (g) => {
    g.rect(0, 1, 6, 8, "#cfe6ee").rect(1, 0, 4, 1, C.chromeLo);
    g.rect(1, 5, 4, 3, C.brass).set(2, 5, C.brassHi).set(3, 4, C.leafHi);
    g.rect(1, 2, 4, 2, C.paper);
  });

const registerSprite = () =>
  sprite("register", 16, 12, (g) => {
    // An old brass till with round keys and a pop-up flag.
    g.rect(1, 3, 14, 8, C.brass).hline(1, 3, 14, C.brassHi).rect(1, 9, 14, 2, C.brassLo);
    g.rect(3, 0, 10, 4, C.brassLo).rect(4, 1, 8, 2, C.board).set(6, 1, C.chalkYellow).set(9, 1, C.chalkYellow);
    for (let i = 0; i < 5; i++) g.set(3 + i * 2, 5, C.cream).set(4 + i * 2, 7, C.cream);
  });

const pastrySprite = () =>
  sprite("pastry", 23, 16, (g) => {
    // A glass dome case on a walnut base: croissants on top, cake slices and buns below.
    g.rect(0, 13, 23, 3, C.walnut).hline(0, 13, 23, C.walnutHi);
    g.rrect(1, 1, 21, 13, "#d6ebf0", 3);
    g.rect(2, 7, 19, 1, "#b5d3dc");
    for (const x of [3, 9, 15]) g.rect(x, 4, 5, 3, C.crema).set(x + 1, 4, C.mustardHi).set(x + 3, 5, C.mustardHi);
    g.rect(3, 9, 5, 4, C.cream).rect(3, 9, 5, 1, C.chalkPink).rect(10, 9, 5, 4, C.espresso).hline(10, 9, 5, C.crema);
    g.rect(17, 10, 4, 3, C.kraft).set(18, 10, C.cream);
    g.set(4, 2, "#ffffff").set(5, 2, "#ffffff");
  });

const cupsSprite = () =>
  sprite("cups", 12, 8, (g) => {
    for (const x of [0, 4, 8]) {
      g.rect(x, 2, 4, 6, C.paper).rect(x, 1, 4, 1, C.iron).rect(x, 4, 4, 2, C.kraft);
    }
    g.set(5, 4, C.walnutDk);
  });

const bellSprite = () =>
  sprite("bell", 18, 26, (g) => {
    // The PICKUP sign's post and the service bell (the sign is lettered live).
    g.rect(8, 8, 2, 12, C.brassLo);
    g.ellipse(9, 21, 4, 3, C.brass);
    g.rect(5, 21, 9, 2, C.brass).hline(5, 23, 9, C.brassLo).set(9, 17, C.brassHi).set(7, 19, C.brassHi);
  });

function counterThings(c: Counter): { x: number; y: number; s: HTMLCanvasElement }[] {
  const out = [
    { x: c.grinder.x, y: c.grinder.y, s: grinderSprite() },
    { x: c.tips.x, y: c.tips.y, s: tipsSprite() },
    { x: c.pastry.x, y: c.pastry.y, s: pastrySprite() },
    { x: c.cups.x, y: c.cups.y, s: cupsSprite() },
    { x: c.pickup.x, y: c.pickup.y - 10, s: bellSprite() },
  ];
  if (c.register) out.push({ x: c.register.x, y: c.register.y, s: registerSprite() });
  return out;
}

// ------------------------------------------------------------------ the baristas

const BARISTAS: Look[] = [
  { key: "cafe-barista-0", skin: "#c98a5e", hair: "#2b1d16", hairStyle: "bun", shirt: "#f4efe6", pants: "#2a2a34", accessory: "none", accent: C.green },
  { key: "cafe-barista-1", skin: "#ffdcc4", hair: "#b5432f", hairStyle: "long", shirt: "#2e2c36", pants: "#2a2a34", accessory: "beanie", accent: C.mustard },
  { key: "cafe-barista-2", skin: "#9b6340", hair: "#3a3a4c", hairStyle: "crop", shirt: "#c9b89c", pants: "#2a2a34", accessory: "glasses", accent: C.rust },
];

interface Barista {
  x: number;
  facing: Facing;
  pose: CharPose;
  /** Holding a steaming pitcher. */
  steam: boolean;
  /** What they're calling out (or null). */
  call: string | null;
}

const CALLS = ["Flat white!", "Oat latte for Sam!", "Two cortados!", "Chai for Ari!", "Cappuccino, extra dry!", "Mocha for Jo!", "Cold brew!", "Pour-over's up!", "Matcha for Kim!", "Americano!"];

/** Where barista `i` is and what they're doing at time t (deterministic, cheap). */
function baristaAt(c: Counter, i: number, t: number, out: Barista): Barista {
  out.steam = false;
  out.call = null;
  if (i === 0) {
    // At the machine: tamping and pulling, then handing a cup over.
    const k = (t + 1.3) % 9;
    out.x = c.grinder.x + c.grinder.w + 8;
    if (k < 5) {
      out.facing = "left";
      out.pose = Math.floor(t * 4) % 2 ? "type1" : "type0";
    } else if (k < 7) {
      out.facing = "front";
      out.pose = "cup";
    } else {
      out.facing = "front";
      out.pose = "stand";
    }
    return out;
  }
  if (i === 1) {
    // Steaming milk mid-counter, walking a drink to the pickup end, calling it, wiping on the way back.
    const xa = Math.round(c.x + c.w * 0.42);
    const xb = c.pickup.x - 16;
    const k = (t + 4.7) % 15;
    const walk = (from: number, to: number, a: number, b: number) => {
      const p = (k - a) / (b - a);
      out.x = Math.round(from + (to - from) * p);
      out.facing = to > from ? "right" : "left";
      out.pose = (["walk0", "walk1", "walk2", "walk3"] as const)[Math.floor(t * 6) % 4]!;
    };
    if (k < 5) {
      out.x = xa;
      out.facing = "front";
      out.pose = "cup";
      out.steam = true;
    } else if (k < 7) walk(xa, xb, 5, 7);
    else if (k < 9.5) {
      out.x = xb;
      out.facing = "front";
      out.pose = k < 8.6 ? "raise" : "cup";
      out.call = CALLS[Math.floor((t + 4.7) / 15) % CALLS.length]!;
    } else if (k < 11.5) walk(xb, xa, 9.5, 11.5);
    else {
      out.x = xa;
      out.facing = "front";
      out.pose = Math.floor(t * 3) % 2 ? "draw1" : "draw0";
    }
    return out;
  }
  // At the till: taking orders, wiping down.
  const k = (t + 2.1) % 11;
  out.x = (c.register?.x ?? c.tips.x) + 8;
  out.facing = "front";
  out.pose = k < 6 ? (Math.floor(t * 1.5) % 4 === 0 ? "type0" : "stand") : k < 8 ? "cup" : Math.floor(t * 3) % 2 ? "draw1" : "draw0";
  return out;
}

const scratch: Barista = { x: 0, facing: "front", pose: "stand", steam: false, call: null };

function drawBarista(ctx: Ctx, c: Counter, i: number, t: number): void {
  const b = baristaAt(c, i, t, scratch);
  const look = BARISTAS[i % BARISTAS.length]!;
  const blink = (Math.floor(t * 1.7 + i * 3) % 9) === 0;
  const spr = charSprite({ look, facing: b.facing, pose: b.pose, expr: blink ? "blink" : b.call ? "happy" : "open" });
  const x = b.x - 10;
  const y = c.staffY - 27;
  ctx.drawImage(spr, x, y);
  // The shop's green apron.
  ctx.fillStyle = C.green;
  if (b.facing === "front") {
    ctx.fillRect(x + 7, y + 16, 6, 5);
    ctx.fillStyle = C.greenHi;
    ctx.fillRect(x + 7, y + 16, 6, 1);
    ctx.fillStyle = C.greenDk;
    ctx.fillRect(x + 7, y + 15, 1, 1);
    ctx.fillRect(x + 12, y + 15, 1, 1);
  } else if (b.facing === "left" || b.facing === "right") {
    ctx.fillRect(b.facing === "left" ? x + 7 : x + 9, y + 16, 4, 5);
  }
  if (b.steam) {
    // The steel pitcher, and steam.
    rect(ctx, x + 13, y + 17, 3, 3, C.chromeLo);
    rect(ctx, x + 13, y + 17, 3, 1, C.chromeHi);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let k = 0; k < 3; k++) {
      const p = (t * 1.6 + k / 3) % 1;
      ctx.fillRect(Math.round(x + 14 + Math.sin(p * 6 + k) * 1.5), Math.round(y + 15 - p * 9), 1, 1);
    }
  }
}

function bubble(ctx: Ctx, text: string, cx: number, bottom: number): void {
  const w = pixelTextWidth(text) + 6;
  const x = Math.round(Math.max(2, cx - w / 2));
  const y = bottom - 11;
  rect(ctx, x, y, w, 9, OUTLINE);
  rect(ctx, x + 1, y + 1, w - 2, 7, "#fffdf6");
  rect(ctx, Math.round(cx) - 1, y + 9, 3, 1, OUTLINE);
  rect(ctx, Math.round(cx), y + 9, 1, 2, OUTLINE);
  drawPixelText(ctx, text, x + 3, y + 2, C.walnutDk);
}

// ------------------------------------------------------------------ the stage, the roaster, the fire

const micSprite = () =>
  sprite("mic", 7, 22, (g) => {
    g.rect(3, 4, 1, 16, C.iron).rect(1, 20, 5, 2, C.iron).rect(2, 0, 3, 4, C.chromeLo).set(2, 0, C.chromeHi);
  });
const ampSprite = () =>
  sprite("amp", 14, 12, (g) => {
    g.rect(0, 0, 14, 12, C.iron).rect(1, 3, 12, 8, "#4a4250").hline(0, 0, 14, C.ironHi);
    for (let y = 4; y < 11; y += 2) g.hline(2, y, 10, "#3a3240");
    g.set(2, 1, C.brass).set(4, 1, C.brass).set(6, 1, C.brass).set(11, 1, "#e5544b");
  });
const stoolSprite = () =>
  sprite("stage-stool", 10, 14, (g) => {
    g.rect(0, 0, 10, 3, C.walnut).hline(0, 0, 10, C.walnutHi);
    g.rect(1, 3, 1, 11, C.walnutDk).rect(8, 3, 1, 11, C.walnutDk).rect(1, 9, 8, 1, C.walnutDk);
  });
const guitarSprite = () =>
  sprite("guitar", 10, 24, (g) => {
    g.rect(4, 0, 2, 10, C.walnutDk).rect(3, 0, 4, 2, C.iron);
    g.ellipse(5, 13, 3, 3, C.mustard).ellipse(5, 19, 4, 4, C.mustard).set(5, 15, OUTLINE).set(5, 16, C.walnutDk);
    g.rect(2, 22, 6, 2, C.iron);
  });
const signSprite = () =>
  sprite("openmic-sign", 16, 20, (g) => {
    // A chalk A-frame: OPEN MIC.
    g.rect(1, 0, 14, 14, C.walnut).rect(2, 1, 12, 12, C.board);
    g.rect(1, 14, 1, 6, C.walnutDk).rect(14, 14, 1, 6, C.walnutDk);
  });

const roasterSprite = () =>
  sprite("roaster", 30, 40, (g) => {
    // A small drum roaster: the chimney up the wall, the hopper, the copper drum, the cooling tray.
    g.rect(4, 0, 3, 14, C.iron).vline(4, 0, 14, C.ironHi);
    g.rect(2, 22, 22, 16, C.iron).hline(2, 22, 22, C.ironHi).rect(4, 26, 7, 8, C.ironHi);
    g.rect(3, 12, 18, 11, C.copper).hline(3, 12, 18, C.copperHi).hline(3, 22, 18, C.copperLo);
    g.ellipse(12, 17, 4, 4, C.copperLo).ellipse(12, 17, 3, 3, C.board).set(11, 16, C.amber);
    g.rect(8, 6, 8, 3, C.chrome).rect(10, 9, 4, 3, C.chromeLo).hline(8, 6, 8, C.chromeHi);
    g.rect(16, 30, 13, 7, C.chromeLo).rect(17, 31, 11, 5, C.espresso).set(19, 32, C.crema).set(23, 33, C.crema);
    g.rect(18, 15, 3, 2, "#e5544b").set(16, 26, C.brassHi);
  });

/** Flames in the firebox. */
function drawFire(ctx: Ctx, f: Rect, t: number, night: number): void {
  const x0 = f.x + 10;
  const x1 = f.x + f.w - 10;
  const base = f.y + f.h - 6;
  // Logs.
  rect(ctx, x0 + 2, base - 2, x1 - x0 - 4, 3, "#5a3622");
  rect(ctx, x0 + 6, base - 4, x1 - x0 - 14, 2, "#6e4428");
  rect(ctx, x0 + 3, base, x1 - x0 - 6, 1, "#2a1a14");
  const cols = ["#fff1a8", "#ffc650", "#f07a2a", "#b8321e"];
  for (let x = x0 + 2; x < x1 - 2; x += 2) {
    const k = Math.sin(t * 7 + x * 1.7) * 0.5 + Math.sin(t * 11.3 + x * 0.6) * 0.5;
    const h = Math.max(2, Math.round(7 + k * 4 - Math.abs(x - (x0 + x1) / 2) * 0.35));
    for (let j = 0; j < h; j++) {
      ctx.fillStyle = cols[Math.min(3, Math.floor((j / h) * 3 + (j > h - 2 ? 1 : 0)))]!;
      ctx.fillRect(x, base - 3 - j, 2, 1);
    }
  }
  // Embers.
  ctx.fillStyle = "#ff8a3d";
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.7 + i / 3) % 1;
    ctx.fillRect(Math.round(x0 + 6 + ((i * 13) % (x1 - x0 - 12)) + Math.sin(t * 3 + i) * 2), Math.round(base - 8 - p * 14), 1, 1);
  }
  if (night > 0) {
    ctx.fillStyle = `rgba(255,170,80,${0.08 * night})`;
    ctx.fillRect(f.x + 2, f.y, f.w - 4, f.h);
  }
}

// ------------------------------------------------------------------ fillers: the café's odds and ends

const armchairSprite = () =>
  sprite("armchair", 22, 22, (g) => {
    // A worn leather club chair, facing you.
    g.rrect(1, 2, 20, 12, C.leather, 3).rect(3, 3, 16, 2, C.leatherHi);
    g.rect(0, 8, 5, 11, C.leatherLo).rect(17, 8, 5, 11, C.leatherLo).rect(1, 8, 3, 2, C.leatherHi).rect(18, 8, 3, 2, C.leatherHi);
    g.rect(5, 12, 12, 6, C.leatherHi).rect(5, 17, 12, 2, C.leather);
    g.rect(2, 19, 2, 3, C.walnutDk).rect(18, 19, 2, 3, C.walnutDk);
    g.set(8, 5, C.leatherLo).set(13, 5, C.leatherLo);
  });

const sideLampSprite = () =>
  sprite("side-lamp", 14, 26, (g) => {
    // A round side table with a little lamp and a book.
    g.rect(3, 0, 8, 6, C.cream).rect(3, 0, 8, 1, "#fff6e0").rect(2, 5, 10, 1, C.creamLo);
    g.rect(6, 6, 2, 6, C.brassLo);
    g.rect(0, 12, 14, 3, C.walnut).hline(0, 12, 14, C.walnutHi).rect(9, 10, 4, 2, C.rust);
    g.rect(6, 15, 2, 9, C.walnutDk).rect(3, 24, 8, 2, C.walnutDk);
  });

const coatRackSprite = () =>
  sprite("coat-rack", 14, 40, (g) => {
    g.rect(6, 2, 2, 36, C.walnut).vline(6, 2, 36, C.walnutHi);
    g.rect(2, 37, 10, 2, C.walnutDk);
    g.rect(1, 6, 5, 14, C.mustard).rect(1, 6, 5, 1, C.mustardHi).rect(8, 5, 5, 11, C.velvet).rect(8, 5, 5, 1, C.velvetHi);
    g.rect(7, 0, 4, 3, C.rust).rect(3, 3, 8, 1, C.walnutDk);
  });

const umbrellaSprite = () =>
  sprite("umbrellas", 10, 18, (g) => {
    g.rect(1, 8, 8, 10, C.iron).rect(2, 8, 6, 1, C.ironHi);
    g.rect(2, 0, 2, 9, "#3e7cc4").set(2, 0, "#62a0e0").rect(6, 2, 2, 7, C.rust).set(6, 2, C.rustHi);
    g.rect(4, 3, 1, 6, C.walnut).rect(3, 2, 2, 1, C.walnut);
  });

const papersSprite = () =>
  sprite("papers", 14, 20, (g) => {
    // A rack of newspapers and zines.
    g.rect(0, 4, 14, 14, C.walnut).hline(0, 4, 14, C.walnutHi);
    g.rect(1, 0, 5, 9, C.paper).hline(2, 2, 3, C.vein).hline(2, 4, 3, C.vein).rect(7, 1, 6, 8, C.chalkPink).hline(8, 3, 4, C.paper);
    g.rect(1, 10, 12, 1, C.walnutDk).rect(2, 11, 4, 5, C.chalkYellow).rect(8, 11, 4, 5, C.chalkBlue);
    g.rect(1, 18, 2, 2, C.walnutDk).rect(11, 18, 2, 2, C.walnutDk);
  });

const gamesSprite = () =>
  sprite("games", 26, 22, (g) => {
    // A low shelf of board games and a stack of mugs.
    g.rect(0, 6, 26, 16, C.walnut).hline(0, 6, 26, C.walnutHi).rect(2, 14, 22, 1, C.walnutDk);
    g.rect(2, 8, 10, 2, C.rust).rect(2, 10, 10, 2, C.chalkBlue).rect(3, 12, 9, 2, C.mustard);
    g.rect(14, 8, 3, 6, C.velvet).rect(17, 9, 3, 5, C.cream).rect(20, 8, 3, 6, "#5b6f8f");
    g.rect(3, 16, 20, 4, C.walnutLo).set(12, 18, C.brass);
    g.rect(4, 1, 5, 5, C.cream).rect(4, 0, 5, 1, C.creamLo).rect(16, 2, 6, 4, C.terra).rect(15, 0, 8, 2, C.leaf);
  });

type Filler = () => HTMLCanvasElement;

/** Odds and ends on free floor (clear of furniture, seats and everyone's ways): plants, chairs, racks. */
function fillers(L: Layout, plan: CafePlan): Placed[] {
  return cached(`cafe|fillers|${L.W}x${L.H}|${L.spots.length}|${L.props.length}`, () => {
    const fp = floorPlan(L);
    const out: Placed[] = [];
    const taken: Rect[] = [L.eventArea, ...(plan.stage ? [{ x: plan.stage.x - 4, y: plan.stage.y - 4, w: plan.stage.w + 30, h: plan.stage.h + 12 }] : [])];
    if (plan.roaster) taken.push({ x: plan.roaster.x - 18, y: plan.roaster.y - 40, w: 36, h: 44 });
    for (const r of L.rooms) if (r.walls) taken.push({ x: r.rect.x - 4, y: r.rect.y - 12, w: r.rect.w + 8, h: r.rect.h + 16 });
    const clash = (r: Rect) => taken.some((q) => r.x < q.x + q.w + 2 && q.x < r.x + r.w + 2 && r.y < q.y + q.h + 2 && q.y < r.y + r.h + 2);
    const put = (region: Rect, items: Filler[], spread = 3) => {
      for (const make of items) {
        const s = make();
        const cands = fp.find(s.width, s.height, 40, region).filter((r) => !clash(r));
        if (cands.length === 0) continue;
        const r = cands[Math.min(cands.length - 1, Math.floor(cands.length / spread))]!;
        taken.push(r);
        out.push({ x: r.x, y: r.y, z: r.y + s.height - 1, s });
      }
    };
    const plant = (name: "LARGE_PLANT" | "PLANT_2" | "PLANT") => () => cafePlant(name) ?? sprite("noplant", 1, 1, () => undefined, false);
    put(L.lounge, [armchairSprite, sideLampSprite, gamesSprite, plant("LARGE_PLANT")], 2);
    put(plan.reserved, [plant("LARGE_PLANT"), papersSprite, plant("PLANT_2")], 2);
    if (!L.portrait) {
      const mid: Rect = { x: L.lounge.x, y: L.net.halls[0]! + 10, w: L.lounge.w, h: L.H - L.net.halls[0]! - 10 };
      put(mid, [plant("LARGE_PLANT"), armchairSprite, plant("PLANT_2")], 1.5);
    }
    // Under the window bar, and anywhere else that's still bare.
    const bar = plan.bar;
    if (bar) put({ x: 0, y: bar.y + 60, w: L.wall.door.x + 30, h: L.net.halls[0]! - bar.y - 66 }, [plant("PLANT_2"), armchairSprite], 2);
    const low = L.net.halls[L.net.halls.length - 1]! + 10;
    put({ x: 0, y: low, w: L.W, h: L.H - low - 4 }, [plant("LARGE_PLANT"), plant("PLANT_2"), papersSprite, plant("LARGE_PLANT"), armchairSprite, plant("PLANT")], 1.3);
    const d = L.wall.door;
    const depth = L.segments.find((sg) => d.x >= sg.x0 && d.x < sg.x1)?.depth ?? 70;
    put({ x: d.x - 46, y: depth - 30, w: 92, h: 70 }, [coatRackSprite, umbrellaSprite], 1);
    return out;
  });
}

// ------------------------------------------------------------------ the hooks

interface Placed {
  x: number;
  y: number;
  z: number;
  s: HTMLCanvasElement;
}

/** Everything that stands still: tables, the counter's things, the stage gear, the roaster. */
function staticItems(L: Layout, plan: CafePlan): Placed[] {
  return cached(`cafe|static|${L.W}x${L.H}|${L.spots.length}|${L.desks.length}`, () => {
    const out: Placed[] = [];
    for (const t of plan.tables) {
      out.push(tableItems(t));
      // A candle jar at the end of each table.
      if (t.kind !== "bar") out.push({ x: t.x + t.w - 10, y: t.y + 16, z: t.y + 22.2, s: candle() });
    }
    const c = plan.counter;
    for (const it of counterThings(c)) out.push({ ...it, z: c.y + 32.4 });
    const s = plan.stage;
    if (s) {
      out.push({ x: s.x + 6, y: s.y - 2, z: s.y + 10, s: ampSprite() });
      out.push({ x: s.x + Math.round(s.w / 2) - 5, y: s.y + 6, z: s.y + 20, s: stoolSprite() });
      out.push({ x: s.x + Math.round(s.w / 2) + 8, y: s.y + 2, z: s.y + 24, s: micSprite() });
      out.push({ x: s.x + s.w - 12, y: s.y, z: s.y + 24, s: guitarSprite() });
      out.push({ x: s.x + s.w + 4, y: s.y + s.h - 14, z: s.y + s.h + 6, s: signSprite() });
    }
    if (plan.roaster) out.push({ x: plan.roaster.x - 15, y: plan.roaster.y - 38, z: plan.roaster.y, s: roasterSprite() });
    return out;
  });
}

export function cafeDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: Drawable[] = [];
  for (const p of staticItems(L, plan)) out.push({ z: p.z, draw: () => ctx.drawImage(p.s, p.x, p.y) });
  for (const p of fillers(L, plan)) out.push({ z: p.z, draw: () => ctx.drawImage(p.s, p.x, p.y) });
  const c = plan.counter;
  const n = c.w >= 140 ? 3 : 2;
  for (let i = 0; i < n; i++) out.push({ z: c.staffY + 0.1, draw: () => drawBarista(ctx, c, i, info.t) });
  const s = plan.stage;
  if (s) out.push({ z: s.y + s.h + 6.1, draw: () => drawPixelText(ctx, "MIC", s.x + s.w + 7, s.y + s.h - 11, C.chalk) });
  // The PICKUP sign over the bell.
  const pk = c.pickup;
  out.push({
    z: c.y + 32.5,
    draw: () => {
      const tw = pixelTextWidth("PICKUP");
      const x = Math.round(pk.x + pk.w / 2 - tw / 2 - 3);
      rect(ctx, x, pk.y - 11, tw + 6, 9, OUTLINE);
      rect(ctx, x + 1, pk.y - 10, tw + 4, 7, C.board);
      drawPixelText(ctx, "PICKUP", x + 3, pk.y - 9, C.chalkYellow);
    },
  });
  out.push(...clickDecor(ctx, L, info));
  return out;
}

export function cafeUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  if (plan?.fireplace) {
    const f = plan.fireplace;
    drawFire(ctx, { x: f.x, y: f.y + 6, w: f.w, h: f.h - 8 }, info.t, info.night);
  }
}

export function cafeOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  if (!plan) return;
  const c = plan.counter;
  const n = c.w >= 140 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const b = baristaAt(c, i, info.t, scratch);
    if (b.call) bubble(ctx, b.call, b.x, c.staffY - 28);
  }
  clickOverlay(ctx, L, info);
}

// ------------------------------------------------------------------ Edison bulbs along the walls

interface Bulb {
  x: number;
  y: number;
}

/** The bulbs where the office's technician expects them (every 10 px in 100 px runs), on a sagging wire. */
function bulbsOf(L: Layout): { wire: Point[]; bulbs: Bulb[] } {
  return cached(`cafe|bulbs|${L.W}x${L.H}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}`, () => {
    const wire: Point[] = [];
    const bulbs: Bulb[] = [];
    for (const seg of L.segments) {
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        for (let x = x0; x < x1; x++) {
          const k = (x - x0) / (x1 - x0);
          const y = 2 + Math.round(Math.sin(k * Math.PI) * 4);
          wire.push({ x, y });
          if ((x - x0) % 10 === 5) bulbs.push({ x, y: y + 1 });
        }
      }
    }
    return { wire, bulbs };
  });
}

export function cafeWallLights(ctx: Ctx, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const { wire, bulbs } = bulbsOf(L);
  const t = info.t;
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  const on = night > 0.25 || info.party;
  const dead = (b: Bulb) => info.brokenBulbX === b.x && Math.floor(t * 9) % 7 !== 0;
  if (!glow) {
    ctx.fillStyle = "#3a2e2a";
    for (const p of wire) ctx.fillRect(p.x, p.y, 1, 1);
    for (const b of bulbs) {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(b.x, b.y, 1, 1);
      ctx.fillStyle = dead(b) ? "#6a5a50" : on ? "#ffe6a8" : "#e8d6b0";
      ctx.fillRect(b.x - 1, b.y + 1, 3, 2);
      ctx.fillRect(b.x, b.y + 3, 1, 1);
    }
    return;
  }
  if (!on) return;
  for (const [i, b] of bulbs.entries()) {
    if (dead(b)) continue;
    const k = info.party ? ((i + Math.floor(t * 6)) % 3 === 0 ? 1 : 0.35) : 0.8 + 0.2 * Math.sin(t * 0.9 + i * 2.1);
    const g = ctx.createRadialGradient(b.x + 0.5, b.y + 2, 0, b.x + 0.5, b.y + 2, 7);
    g.addColorStop(0, `rgba(255,205,120,${(0.45 * k * night).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,205,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(b.x - 7, b.y - 5, 15, 15);
    ctx.fillStyle = "#fff4cf";
    ctx.fillRect(b.x - 1, b.y + 1, 3, 2);
  }
}

// ------------------------------------------------------------------ night lights

function staticLights(L: Layout): Light[] {
  return cached(`cafe|lights|${L.W}x${L.H}|${L.spots.length}`, () => {
    const plan = planOf(L);
    const out: Light[] = [];
    if (!plan) return out;
    for (const t of plan.tables) {
      if (t.kind === "bar") {
        for (let x = t.x + 24; x < t.x + t.w; x += 96) out.push([x, t.y + 6, 30, 0.45, "#ffcf8a", 0.25]);
      } else {
        out.push([t.x + t.w - 8, t.y + 18, 18, 0.5, "#ffb35a", 0.5]);
        for (let x = t.x + 24; x < t.x + t.w; x += 96) out.push([x, t.y + 26, 34, 0.35, "#ffd9a0", 0.15]);
      }
    }
    const c = plan.counter;
    // Pendants over the counter and the glow of the back bar.
    for (let x = c.x + 20; x < c.x + c.w; x += 50) out.push([x, c.y - 6, 40, 0.6, "#ffd28a", 0.35]);
    out.push([c.machine.x + 13, c.machine.y + 10, 16, 0.4, "#ffe6c0", 0.4]);
    out.push([c.pastry.x + 11, c.pastry.y + 8, 12, 0.5, "#fff4d8", 0.6]);
    if (plan.fireplace) {
      const f = plan.fireplace;
      out.push([f.x + f.w / 2, f.y + f.h - 6, 90, 0.85, "#ff9a4a", 0.6]);
    }
    if (plan.stage) out.push([plan.stage.x + plan.stage.w / 2, plan.stage.y + 10, 40, 0.5, "#ffc8e0", 0.3]);
    const m = plan.reserved;
    const table = L.props.find((p) => p.kind === "meeting-table");
    if (table) out.push([table.x + 34, table.y + 12, 44, 0.55, "#ffd28a", 0.3]);
    else out.push([m.x + m.w / 2, m.y + 30, 40, 0.4, "#ffd28a", 0.2]);
    out.push([L.boss.lamp.x, L.boss.lamp.y + 8, 54, 0.75, "#ffcf7a", 0.5]);
    if (plan.roaster) out.push([plan.roaster.x - 3, plan.roaster.y - 22, 16, 0.4, "#ff7a3a", 0.5]);
    if (L.server) out.push([L.server.x + L.server.w / 2, L.server.y + 8, 36, 0.35, "#ffe8c0", 0.2]);
    out.push([L.tv.x + L.tv.w / 2, L.tv.y + L.tv.h / 2, 46, 0.45, "#bfe0ff", 0.25]);
    return out;
  });
}

export function cafeLights(L: Layout, info: PaintInfo): Light[] {
  const out = staticLights(L);
  const extra = clickLights(L, info);
  const plan = planOf(L);
  if (plan?.fireplace) {
    // The fire flickers.
    const f = plan.fireplace;
    const k = 0.75 + 0.15 * Math.sin(info.t * 9) + 0.1 * Math.sin(info.t * 23);
    return [...out, [f.x + f.w / 2, f.y + f.h - 10, 60, 0.4 * k, "#ffb050", 0.4], ...extra];
  }
  return extra.length > 0 ? [...out, ...extra] : out;
}

