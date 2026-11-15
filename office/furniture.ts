// Furniture and scenery. Static wall/floor art is baked once into a
// background canvas for the current layout; furniture that characters can
// stand behind or in front of becomes depth-sorted props.
//
// Desks, PCs, chairs, plants and a few wall pieces are Pixel Agents sprites
// (MIT, see ATTRIBUTION.md); everything else is drawn here.

import { Grid, parseColor, shade, SpriteCache } from "./pixel.ts";
import { OUTLINE } from "./characters.ts";
import type { Layout, PropKind, PropPlacement, Rect } from "./layout.ts";
import { PIXEL_AGENTS } from "./pixelAgents.generated.ts";

const cache = new SpriteCache();

export interface Prop {
  id: string;
  kind: PropKind | "plant" | "decor";
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  /** Depth: props and characters draw in ascending z. */
  z: number;
  variant?: number;
}

// ---------- palette
export const WOOD = "#d9a066";
const WOOD_HI = "#ecbd84";
const WOOD_LO = "#b97c46";
const WOOD_DK = "#8a5a34";

// ---------- Pixel Agents sprites

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const paCache = new Map<string, HTMLCanvasElement>();

/** A Pixel Agents furniture sprite as a canvas. */
export function pa(name: string): HTMLCanvasElement {
  let c = paCache.get(name);
  if (c) return c;
  const s = PIXEL_AGENTS[name];
  c = document.createElement("canvas");
  if (!s) {
    c.width = c.height = 1;
    paCache.set(name, c);
    return c;
  }
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(s.w, s.h);
  const rgb = s.pal.map((h) => parseColor(h));
  for (let i = 0; i < s.px.length; i++) {
    const ch = s.px[i]!;
    if (ch === ".") continue;
    const [r, g, b] = rgb[ALPHABET.indexOf(ch)]!;
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  paCache.set(name, c);
  return c;
}

/** A Pixel Agents sprite with some palette colors swapped. */
export function paRecolor(name: string, map: Record<string, string>): HTMLCanvasElement {
  const key = `${name}|${JSON.stringify(map)}`;
  let c = paCache.get(key);
  if (c) return c;
  const s = PIXEL_AGENTS[name];
  if (!s) return pa(name);
  c = document.createElement("canvas");
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(s.w, s.h);
  const rgb = s.pal.map((h) => parseColor(map[h] ?? h));
  for (let i = 0; i < s.px.length; i++) {
    const ch = s.px[i]!;
    if (ch === ".") continue;
    const [r, g, b] = rgb[ALPHABET.indexOf(ch)]!;
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  paCache.set(key, c);
  return c;
}

// ---------- sprites drawn here
export function couchSprite(): HTMLCanvasElement {
  return cache.get("couch", () => {
    const w = 82;
    const g = new Grid(w + 2, 28);
    const base = "#d9776a";
    const hi = "#ea9486";
    const lo = "#b85a50";
    g.rrect(8, 1, w - 16, 15, base, 3);
    g.rect(10, 2, w - 20, 1, hi);
    for (const sx of [w / 3, (2 * w) / 3]) g.vline(Math.round(sx), 3, 11, lo);
    g.rect(2, 13, w - 2, 10, lo);
    g.rect(2, 13, w - 2, 1, shade(lo, 0.12));
    g.rrect(1, 5, 10, 18, base, 2);
    g.rrect(w - 9, 5, 10, 18, base, 2);
    g.rect(2, 6, 7, 1, hi).rect(w - 8, 6, 7, 1, hi);
    g.rect(4, 23, 3, 2, WOOD_DK).rect(w - 5, 23, 3, 2, WOOD_DK);
    g.outline(OUTLINE);
    return g;
  });
}

export function coffeeTableSprite(): HTMLCanvasElement {
  return cache.get("coffee-table", () => {
    const g = new Grid(38, 14);
    g.rrect(1, 1, 36, 6, WOOD, 1);
    g.rect(2, 1, 34, 1, WOOD_HI);
    g.rect(1, 7, 36, 2, WOOD_LO);
    g.rect(3, 9, 2, 3, WOOD_DK).rect(33, 9, 2, 3, WOOD_DK);
    // magazines + snack bowl
    g.rect(5, 2, 7, 3, "#7fb8d6").rect(7, 3, 7, 3, "#f2c14e");
    g.ellipse(27, 3, 4, 1.5, "#e9e2d6");
    g.set(25, 2, "#d9776a").set(27, 2, "#f2c14e").set(29, 2, "#86c97f");
    g.outline(OUTLINE);
    return g;
  });
}

export function pingPongSprite(): HTMLCanvasElement {
  return cache.get("pingpong", () => {
    const w = 74;
    const h = 24;
    const g = new Grid(w + 2, h + 2);
    g.rect(1, 1, w, 13, "#3b9b6b");
    g.rect(1, 1, w, 1, "#ffffff").rect(1, 13, w, 1, "#ffffff");
    g.vline(1, 1, 13, "#ffffff").vline(w, 1, 13, "#ffffff");
    g.hline(2, 7, w - 2, "#d8f0e2");
    g.rect(1, 14, w, 3, "#2a7a52");
    // net
    const nx = 1 + Math.floor(w / 2);
    g.rect(nx, -0 + 0, 1, 15, "#f4f4f4");
    g.rect(nx - 1, 0, 3, 1, "#c9c9c9");
    for (let y = 2; y < 14; y += 2) g.set(nx, y, "#cfcfcf");
    // legs
    g.rect(4, 17, 2, 7, "#4a4a58").rect(w - 5, 17, 2, 7, "#4a4a58");
    g.rect(nx - 6, 17, 2, 5, "#3a3a46").rect(nx + 5, 17, 2, 5, "#3a3a46");
    g.outline(OUTLINE);
    return g;
  });
}

export function arcadeSprite(): HTMLCanvasElement {
  return cache.get("arcade", () => {
    const w = 24;
    const h = 46;
    const g = new Grid(w + 2, h + 2);
    const body = "#6a4fb0";
    g.rect(2, 1, w - 2, h - 1, body);
    g.rect(1, 1, w, 8, "#ef6f9a");
    g.rect(3, 3, w - 4, 4, "#ffd1e0");
    for (let i = 0; i < 4; i++) g.set(5 + i * 4, 5, "#ef6f9a");
    g.rect(3, 10, w - 4, 14, "#1a1726");
    g.rect(1, 25, w, 6, "#8b6fd0");
    g.set(6, 27, "#ff5a5a").set(9, 28, "#5ad1ff").set(12, 27, "#ffd84a");
    g.rect(16, 26, 1, 3, "#2a2a2a").set(16, 25, "#ff5a5a");
    g.rect(2, 32, w - 2, h - 33, shade(body, -0.15));
    g.rect(8, 36, 8, 3, "#3d2b70");
    g.outline(OUTLINE);
    return g;
  });
}

export function beanbagSprite(color: string): HTMLCanvasElement {
  return cache.get(`beanbag-${color}`, () => {
    const g = new Grid(26, 16);
    g.ellipse(13, 9, 11, 5.5, color);
    g.ellipse(13, 5, 8, 3.5, shade(color, 0.12));
    g.rect(7, 4, 4, 1, shade(color, 0.3));
    g.rect(4, 12, 18, 1, shade(color, -0.18));
    g.outline(OUTLINE);
    return g;
  });
}

export function armchairSprite(): HTMLCanvasElement {
  return cache.get("armchair", () => {
    const g = new Grid(28, 26);
    const c = "#e0b14a";
    g.rrect(4, 1, 20, 16, c, 3);
    g.rect(6, 2, 16, 1, shade(c, 0.25));
    g.rrect(1, 9, 6, 13, shade(c, -0.08), 2);
    g.rrect(21, 9, 6, 13, shade(c, -0.08), 2);
    g.rect(6, 15, 16, 6, shade(c, -0.15));
    g.rect(4, 22, 2, 2, WOOD_DK).rect(22, 22, 2, 2, WOOD_DK);
    g.outline(OUTLINE);
    return g;
  });
}

export function bookshelfSprite(): HTMLCanvasElement {
  return cache.get("bookshelf", () => {
    const g = new Grid(38, 36);
    g.rect(1, 6, 36, 28, WOOD_LO);
    g.rect(1, 6, 36, 2, WOOD);
    g.rect(3, 9, 32, 10, "#6e4528");
    g.rect(3, 21, 32, 10, "#6e4528");
    g.rect(1, 19, 36, 2, WOOD);
    const colors = ["#d9776a", "#7fb8d6", "#f2c14e", "#86c97f", "#a98bd8", "#ef6f9a", "#e9e2d6"];
    let x = 4;
    let i = 0;
    while (x < 33) {
      const bw = 2 + (i % 3 === 0 ? 1 : 0);
      const bh = 7 + ((i * 7) % 3);
      g.rect(x, 19 - bh, bw, bh, colors[i % colors.length]!);
      x += bw + (i % 4 === 3 ? 2 : 0);
      i++;
    }
    x = 4;
    while (x < 31) {
      const bw = 2 + ((i + 1) % 3 === 0 ? 1 : 0);
      const bh = 6 + ((i * 5) % 4);
      g.rect(x, 31 - bh, bw, bh, colors[(i * 3) % colors.length]!);
      x += bw + (i % 5 === 2 ? 3 : 0);
      i++;
    }
    // globe on top
    g.ellipse(28, 2.5, 3, 3, "#5aa9d6");
    g.set(27, 1, "#86c97f").set(29, 3, "#86c97f").set(26, 3, "#86c97f");
    g.rect(27, 5, 3, 1, WOOD_DK);
    // tiny plant on top
    g.rect(6, 3, 4, 3, "#c86b4a");
    g.set(7, 1, "#6fb36a").set(8, 0, "#86c97f").set(6, 2, "#6fb36a").set(9, 2, "#5a9a55");
    g.outline(OUTLINE);
    return g;
  });
}

export function lampSprite(): HTMLCanvasElement {
  return cache.get("lamp", () => {
    const g = new Grid(16, 52);
    g.rrect(2, 1, 12, 9, "#f6e7c1", 2);
    g.rect(3, 8, 10, 2, "#e8d3a0");
    g.rect(7, 10, 2, 38, "#4b4458");
    g.rect(4, 48, 8, 2, "#4b4458");
    g.outline(OUTLINE);
    return g;
  });
}

export function printerSprite(): HTMLCanvasElement {
  return cache.get("printer", () => {
    const g = new Grid(30, 26);
    g.rect(2, 8, 26, 16, "#cfc6b8");
    g.rect(2, 8, 26, 1, "#ddd6ca");
    g.rect(5, 12, 20, 9, "#b9b0a2");
    g.rrect(3, 1, 24, 8, "#ece8e0", 1);
    g.rect(5, 3, 20, 2, "#3a3a46");
    g.rect(8, 0, 14, 2, "#ffffff");
    g.set(24, 6, "#5ad18a");
    g.outline(OUTLINE);
    return g;
  });
}

export function coolerSprite(): HTMLCanvasElement {
  return cache.get("cooler", () => {
    const g = new Grid(17, 36);
    g.rrect(3, 1, 11, 11, "#8fd0f0", 2);
    g.rect(5, 3, 2, 6, "#c8ecfb");
    g.rect(5, 12, 7, 2, "#7ab0c8");
    g.rect(2, 14, 13, 20, "#eef0f2");
    g.rect(2, 14, 13, 1, "#ffffff");
    g.rect(5, 18, 2, 2, "#5aa9d6").rect(10, 18, 2, 2, "#e86f6f");
    g.rect(4, 22, 9, 1, "#d0d4d8");
    g.outline(OUTLINE);
    return g;
  });
}


export function roombaSprite(): HTMLCanvasElement {
  return cache.get("roomba", () => {
    const g = new Grid(16, 9);
    g.ellipse(8, 4, 6.5, 3.2, "#4a4a58");
    g.ellipse(8, 3.5, 5, 2, "#6b6b7c");
    g.set(8, 3, "#5ad18a");
    g.rect(3, 6, 10, 1, "#33333f");
    g.outline(OUTLINE);
    return g;
  });
}

/** A long planter box with a row of Pixel Agents plants. */
const canvasCache = new Map<string, HTMLCanvasElement>();
function planterSprite(width: number): HTMLCanvasElement {
  const hit = canvasCache.get(`planter-${width}`);
  if (hit) return hit;
  const made = (() => {
    const g = new Grid(width, 20);
    g.rect(1, 12, width - 2, 7, "#8a5a34");
    g.rect(1, 12, width - 2, 2, "#b07a46");
    g.rect(2, 11, width - 4, 1, "#4a6b3a");
    for (let x = 6; x < width - 4; x += 12) g.rect(x, 15, 6, 1, "#7a4e2c");
    g.outline(OUTLINE);
    const c = g.toCanvas();
    const ctx = c.getContext("2d")!;
    // Leaves spill over the box.
    const leaves = ["#5fae63", "#86cf7f", "#3f8b4c"];
    for (let x = 3; x < width - 3; x += 3) {
      const h = 3 + ((x * 7) % 5);
      ctx.fillStyle = leaves[(x / 3) % 3 | 0]!;
      ctx.fillRect(x, 12 - h, 2, h);
      ctx.fillRect(x + 1, 11 - h, 2, 2);
    }
    return c;
  })();
  canvasCache.set(`planter-${width}`, made);
  return made;
}

function kitchenIslandSprite(width: number): HTMLCanvasElement {
  return cache.get(`island-${width}`, () => {
    const g = new Grid(width + 2, 26);
    g.rect(1, 1, width, 12, "#eceff2");
    g.rect(1, 1, width, 1, "#ffffff");
    for (let x = 4; x < width; x += 9) g.set(x, 5, "#d9dee4").set(x + 3, 9, "#d9dee4");
    g.rect(1, 13, width, 10, "#5f8fa8");
    g.rect(1, 13, width, 1, "#7fb0c8");
    for (let x = 6; x < width - 2; x += 14) g.rect(x, 16, 8, 5, "#6f9fb8");
    // coffee machine, mugs, fruit bowl
    g.rect(5, 2, 9, 9, "#3a3a46").rect(6, 3, 7, 3, "#22222c").set(11, 4, "#ff5a5a").rect(8, 8, 3, 2, "#f4efe6");
    g.rect(18, 6, 3, 3, "#ef6f9a").rect(23, 7, 3, 3, "#7fb8d6");
    g.ellipse(width - 14, 6, 5, 2.5, "#e9e2d6");
    g.set(width - 17, 5, "#ff8a3d").set(width - 14, 4, "#ffd84a").set(width - 12, 6, "#86c97f").set(width - 15, 7, "#e5484d");
    g.rect(width - 30, 3, 6, 6, "#f4efe6").rect(width - 29, 4, 4, 3, "#c9a07a");
    g.outline(OUTLINE);
    return g;
  });
}

function stoolSprite(): HTMLCanvasElement {
  return cache.get("stool", () => {
    const g = new Grid(12, 10);
    g.ellipse(5.5, 2.5, 4.5, 2, "#d9776a");
    g.set(4, 1, "#ea9486");
    g.rect(5, 4, 2, 4, "#4b4458");
    g.rect(3, 8, 6, 1, "#4b4458");
    g.outline(OUTLINE);
    return g;
  });
}

function fridgeSprite(): HTMLCanvasElement {
  return cache.get("fridge", () => {
    const g = new Grid(20, 34);
    g.rrect(1, 1, 18, 31, "#e9eef2", 1);
    g.rect(1, 12, 18, 1, "#b9c2cc");
    g.rect(15, 4, 1, 6, "#9aa3ad").rect(15, 15, 1, 8, "#9aa3ad");
    g.rect(3, 15, 4, 4, "#ffd84a").rect(8, 16, 4, 3, "#86e07f").rect(4, 20, 5, 3, "#ff9fb2");
    g.outline(OUTLINE);
    return g;
  });
}

function fishtankStandSprite(): HTMLCanvasElement {
  return cache.get("fishtank-stand", () => {
    const g = new Grid(42, 22);
    g.rect(1, 1, 40, 18, "#4a5a7a");
    g.rect(1, 1, 40, 2, "#5f7096");
    g.rect(4, 6, 34, 10, "#40506e");
    g.rect(2, 19, 3, 2, "#2e3a50").rect(37, 19, 3, 2, "#2e3a50");
    g.outline(OUTLINE);
    return g;
  });
}


export function meetingTableSprite(): HTMLCanvasElement {
  return cache.get("meeting-table", () => {
    const g = new Grid(68, 30);
    g.rect(1, 1, 66, 20, "#b38857");
    g.rect(1, 1, 66, 1, "#cfa86d");
    g.rect(1, 20, 66, 2, "#885c47");
    g.rect(1, 22, 66, 1, "#532e3d");
    g.rect(3, 23, 3, 5, "#394449").rect(62, 23, 3, 5, "#394449");
    // A pen cup and a coffee; the plans and papers come and go with the people.
    g.rect(4, 4, 3, 4, "#6b6280").set(4, 3, "#e5484d").set(6, 2, "#3e8ed0");
    g.rect(61, 6, 3, 4, "#f4efe6").set(64, 7, "#f4efe6");
    g.outline(OUTLINE, { skip: [] });
    return g;
  });
}



// ---------- more furniture

function whiteboardSprite(w: number): HTMLCanvasElement {
  return cache.get(`whiteboard-${w}`, () => {
    const g = new Grid(w + 2, 46);
    g.rect(1, 1, w, 34, "#9aa3ad");
    g.rect(3, 3, w - 4, 30, "#fbfcfd");
    g.rect(1, 35, w, 2, "#7a838d");
    g.rect(8, 34, 6, 1, "#e5484d").rect(16, 34, 6, 1, "#3e8ed0").rect(24, 34, 6, 1, "#30a46c");
    g.rect(4, 37, 2, 8, "#6b7280").rect(w - 5, 37, 2, 8, "#6b7280");
    g.outline(OUTLINE);
    return g;
  });
}

function tvSprite(w: number, h: number, standing: boolean): HTMLCanvasElement {
  return cache.get(`tv-${w}-${h}-${standing}`, () => {
    const g = new Grid(w + 2, h + (standing ? 22 : 4));
    g.rrect(1, 1, w, h, "#2c2836", 1);
    g.rect(3, 3, w - 4, h - 4, "#14121c");
    g.set(w - 3, h - 1, "#5ad18a");
    if (standing) {
      g.rect(1 + w / 2 - 4, h + 1, 8, 4, "#3a3546");
      g.rect(8, h + 5, w - 14, 14, "#b97c46");
      g.rect(8, h + 5, w - 14, 2, "#d9a066");
      for (let i = 0; i < 3; i++) g.rect(12 + i * ((w - 26) / 3), h + 9, (w - 26) / 3 - 4, 8, "#a86c3a");
      g.rect(10, h + 19, 3, 2, "#6e4528").rect(w - 10, h + 19, 3, 2, "#6e4528");
    } else {
      g.rect(1 + w / 2 - 6, h + 1, 12, 2, "#3a3546");
    }
    g.outline(OUTLINE);
    return g;
  });
}

function speakerSprite(): HTMLCanvasElement {
  return cache.get("speaker", () => {
    const g = new Grid(12, 28);
    g.rrect(1, 1, 10, 26, "#4a4458", 1);
    g.ellipse(5.5, 7, 3, 3, "#2a2633");
    g.ellipse(5.5, 7, 1.4, 1.4, "#6b6280");
    g.ellipse(5.5, 17, 3.4, 3.4, "#2a2633");
    g.ellipse(5.5, 17, 1.6, 1.6, "#6b6280");
    g.outline(OUTLINE);
    return g;
  });
}
export { speakerSprite };

/** A kitchen counter with a big espresso machine, kettle, sink and microwave. */
function kitchenCounterSprite(w: number): HTMLCanvasElement {
  return cache.get(`kcounter-${w}`, () => {
    const g = new Grid(w + 2, 36);
    const top = 10;
    g.rect(1, top, w, 7, "#eceff2");
    g.rect(1, top, w, 1, "#ffffff");
    g.rect(1, top + 7, w, 17, "#6f9fb8");
    g.rect(1, top + 7, w, 1, "#8fbcd2");
    for (let x = 4; x < w - 6; x += 22) g.rect(x, top + 10, 18, 11, "#7fafc6").set(x + 9, top + 15, "#e9d3a8");
    // Kettle (the espresso machine is its own prop, at the left end)
    g.rrect(31, 6, 9, 9, "#e5484d", 2);
    g.rect(33, 4, 5, 2, "#c4383f").set(40, 9, "#c4383f");
    // Sink
    if (w >= 80) {
      g.rect(42, top + 1, 16, 5, "#b9c2cc");
      g.rect(43, top + 2, 14, 3, "#9aa3ad");
      g.rect(49, top - 4, 2, 5, "#9aa3ad").set(50, top - 4, "#c9ced6");
    }
    // Microwave
    if (w >= 100) {
      g.rect(w - 26, 0, 22, 14, "#3a3a46");
      g.rect(w - 24, 2, 13, 10, "#55556a");
      g.rect(w - 9, 3, 3, 8, "#22222c").set(w - 8, 4, "#5ad18a");
    }
    // Mugs
    g.rect(w >= 80 ? 60 : 30, top - 4, 3, 4, "#7fb8d6").rect(w >= 100 ? w - 34 : w - 8, top - 4, 3, 4, "#ef6f9a");
    g.outline(OUTLINE);
    return g;
  });
}

/** A big red espresso machine: chrome top with cups, a display, two group heads. */
function espressoSprite(): HTMLCanvasElement {
  return cache.get("espresso", () => {
    const g = new Grid(26, 30);
    const red = "#d6453d";
    const redHi = "#ee6b5f";
    const redLo = "#a8322c";
    const chrome = "#d5dbe2";
    const chromeLo = "#9aa3ad";
    // Cups warming on top
    g.rect(5, 1, 4, 3, "#fbfaf5").rect(10, 1, 4, 3, "#fbfaf5").rect(16, 2, 4, 2, "#f2c14e");
    g.rect(2, 4, 22, 2, chrome).rect(2, 4, 22, 1, "#ffffff");
    // Body
    g.rrect(2, 6, 22, 16, red, 1);
    g.rect(3, 7, 20, 1, redHi);
    g.rect(2, 20, 22, 2, redLo);
    // Display and buttons
    g.rect(8, 8, 10, 4, "#1d2b22").rect(9, 9, 4, 1, "#5ad18a").rect(14, 9, 3, 1, "#5ad18a").rect(9, 10, 6, 1, "#2f6b4a");
    g.set(5, 9, "#fff3a3").set(5, 11, "#ffffff").set(20, 9, "#ffffff").set(20, 11, "#fff3a3");
    // Group heads and portafilters
    for (const x of [6, 15]) {
      g.rect(x, 13, 5, 3, chromeLo);
      g.rect(x + 1, 16, 3, 1, "#2a2a32");
      g.rect(x - 2, 14, 2, 1, "#2a2a32");
    }
    // Steam wand
    g.rect(23, 12, 1, 7, chrome).set(22, 18, chrome);
    // Drip tray with a cup
    g.rect(3, 22, 20, 3, chromeLo);
    for (let x = 4; x < 22; x += 2) g.set(x, 23, "#6b7280");
    g.rect(7, 19, 3, 3, "#fbfaf5").set(10, 20, "#fbfaf5");
    // Badge
    g.rect(11, 18, 4, 2, "#f2c14e");
    g.rect(2, 25, 22, 2, "#3a3a46");
    g.outline(OUTLINE);
    return g;
  });
}

/** A sofa seen from behind, for people sitting facing a table. */
function sofaBackSprite(w: number): HTMLCanvasElement {
  return cache.get(`sofa-back-${w}`, () => {
    const g = new Grid(w + 2, 16);
    const body = "#d9823f";
    g.rect(1, 1, w, 10, "#b0632a");
    g.rect(1, 1, w, 2, body);
    g.rect(3, 3, w - 4, 1, "#c9733a");
    g.rect(1, 11, w, 2, "#8a4a20");
    g.rect(2, 13, 2, 2, "#5a3a24").rect(w - 2, 13, 2, 2, "#5a3a24");
    g.outline(OUTLINE);
    return g;
  });
}

/** An armchair seen from the side, facing right (flip for left). */
function armchairSideSprite(left: boolean): HTMLCanvasElement {
  return cache.get(`arm-side-${left}`, () => {
    const g = new Grid(18, 20);
    const body = "#d9823f";
    const hi = "#f2a65e";
    const lo = "#b0632a";
    g.rrect(1, 1, 5, 15, lo, 1);
    g.rect(2, 2, 2, 12, body);
    g.rect(5, 9, 11, 6, body);
    g.rect(5, 9, 11, 2, hi);
    g.rect(13, 7, 4, 8, lo).rect(13, 7, 4, 1, body);
    g.rect(1, 15, 16, 2, lo);
    g.rect(2, 17, 2, 2, "#5a3a24").rect(14, 17, 2, 2, "#5a3a24");
    g.outline(OUTLINE);
    return left ? g.flipped() : g;
  });
}

/** A wooden garden bench, seen from the front. */
function benchSprite(): HTMLCanvasElement {
  return cache.get("bench", () => {
    const g = new Grid(36, 16);
    for (const y of [1, 4]) g.rect(2, y, 32, 2, "#b97c46").rect(2, y, 32, 1, "#d9a066");
    g.rect(4, 3, 2, 6, "#3a3546").rect(30, 3, 2, 6, "#3a3546");
    g.rect(1, 8, 34, 3, "#c48a52").rect(1, 8, 34, 1, "#e0a868");
    g.rect(3, 11, 2, 4, "#3a3546").rect(31, 11, 2, 4, "#3a3546");
    g.outline(OUTLINE);
    return g;
  });
}

/** A low round table with magazines and a little plant. */
function loungeTableSprite(): HTMLCanvasElement {
  return cache.get("lounge-table", () => {
    const g = new Grid(28, 12);
    g.ellipse(13.5, 4.5, 12.5, 4, "#c48a52");
    g.ellipse(13.5, 4, 11.5, 3, "#d9a066");
    g.rect(5, 3, 6, 3, "#7fb8d6").rect(6, 3, 4, 1, "#fbfaf5");
    g.rect(11, 4, 5, 3, "#ff9fb2");
    g.rect(18, 2, 3, 3, "#c4622d").set(19, 0, "#3f9a5a").set(18, 1, "#57b86f").set(20, 1, "#57b86f");
    g.rect(12, 8, 3, 3, "#8a5a34");
    g.outline(OUTLINE);
    return g;
  });
}

/** A server rack: blank panels and drive bays (the blinking lights are live). */
function serverRackSprite(): HTMLCanvasElement {
  return cache.get("server-rack", () => {
    const g = new Grid(16, 33);
    g.rect(1, 1, 14, 30, "#22252e");
    g.rect(1, 1, 14, 1, "#3a3f4c");
    for (let y = 3; y < 29; y += 4) {
      g.rect(3, y, 10, 3, "#2f3440");
      g.rect(3, y, 10, 1, "#3d4352");
      g.rect(4, y + 1, 5, 1, "#1a1d24");
    }
    g.rect(1, 31, 14, 1, "#111318");
    g.outline(OUTLINE);
    return g;
  });
}

/** The AI cluster: a wider rack of GPU sleds behind a smoked door. */
function aiRackSprite(): HTMLCanvasElement {
  return cache.get("ai-rack", () => {
    const g = new Grid(20, 33);
    g.rect(1, 1, 18, 30, "#181a22");
    g.rect(1, 1, 18, 6, "#4b2f7a");
    for (let y = 8; y < 29; y += 6) {
      g.rect(3, y, 14, 4, "#262a36");
      g.ellipse(6.5, y + 1.5, 1.5, 1.5, "#0f1016");
      g.ellipse(12.5, y + 1.5, 1.5, 1.5, "#0f1016");
    }
    g.rect(1, 31, 18, 1, "#111318");
    g.outline(OUTLINE);
    return g;
  });
}

function vendingSprite(): HTMLCanvasElement {
  return cache.get("vending", () => {
    const g = new Grid(24, 44);
    g.rect(1, 1, 22, 42, "#c4383f");
    g.rect(1, 1, 22, 3, "#e5484d");
    g.rect(3, 5, 13, 28, "#1a1722");
    const snacks = ["#ffd84a", "#7fd1ff", "#86e07f", "#ff9fb2", "#c39bff", "#ff8a3d"];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, "#6b6b7c");
      for (let c = 0; c < 3; c++) g.rect(4 + c * 4, 6 + r * 7, 3, 4, snacks[(r * 3 + c) % snacks.length]!);
    }
    g.rect(17, 6, 5, 10, "#22222c");
    for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, "#5ad1ff");
    g.rect(17, 18, 5, 2, "#f2c14e");
    g.rect(3, 35, 18, 5, "#22222c");
    g.outline(OUTLINE);
    return g;
  });
}

function pianoSprite(): HTMLCanvasElement {
  return cache.get("piano", () => {
    const g = new Grid(32, 32);
    g.rect(1, 1, 30, 22, "#3a2a2e");
    g.rect(1, 1, 30, 2, "#5a4048");
    g.rect(4, 5, 24, 8, "#4a3438");
    g.rect(2, 14, 28, 5, "#fbfaf5");
    for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, "#2a1e2e");
    g.rect(1, 19, 30, 4, "#2a1e22");
    g.rect(3, 23, 2, 7, "#3a2a2e").rect(27, 23, 2, 7, "#3a2a2e");
    g.set(8, 3, "#f2c14e").set(23, 3, "#f2c14e");
    g.outline(OUTLINE);
    return g;
  });
}

function dartboardSprite(): HTMLCanvasElement {
  return cache.get("dartboard", () => {
    const g = new Grid(20, 34);
    g.ellipse(9.5, 9.5, 8.5, 8.5, "#2a2633");
    g.ellipse(9.5, 9.5, 7, 7, "#e5484d");
    g.ellipse(9.5, 9.5, 5.5, 5.5, "#fbf3e6");
    g.ellipse(9.5, 9.5, 3.5, 3.5, "#30a46c");
    g.ellipse(9.5, 9.5, 1.5, 1.5, "#e5484d");
    g.rect(9, 19, 2, 12, "#6b7280");
    g.rect(5, 31, 10, 2, "#4b4458");
    g.outline(OUTLINE);
    return g;
  });
}

function waitingChairSprite(): HTMLCanvasElement {
  return paRecolor("CUSHIONED_CHAIR_FRONT", { "#487841": "#3f8f8c", "#6fa374": "#6fc1bd", "#173115": "#173a38" });
}

/** A front-facing two-seat sofa for the waiting room. */
function waitingSofaSprite(w: number): HTMLCanvasElement {
  return cache.get(`wait-sofa-${w}`, () => {
    const g = new Grid(w + 2, 22);
    const body = "#d9823f";
    const hi = "#f2a65e";
    const lo = "#b0632a";
    g.rrect(3, 1, w - 4, 11, lo, 2);
    g.rect(5, 2, w - 8, 1, body);
    g.rect(1, 6, 5, 12, body).rect(w - 4, 6, 5, 12, body);
    g.rect(1, 6, 5, 1, hi).rect(w - 4, 6, 5, 1, hi);
    g.rect(6, 10, w - 10, 7, body);
    g.rect(6, 10, (w - 10) / 2 - 1, 2, hi).rect(6 + (w - 10) / 2 + 1, 10, (w - 10) / 2 - 1, 2, hi);
    g.rect(1, 17, w, 2, lo);
    g.rect(3, 19, 2, 2, "#5a3a24").rect(w - 3, 19, 2, 2, "#5a3a24");
    g.outline(OUTLINE);
    return g;
  });
}

function sideTableSprite(): HTMLCanvasElement {
  return cache.get("side-table", () => {
    const g = new Grid(18, 14);
    g.rect(1, 1, 16, 7, "#c48a52");
    g.rect(1, 1, 16, 1, "#d9a066");
    g.rect(3, 2, 6, 4, "#7fb8d6").rect(8, 3, 6, 4, "#f2c14e");
    g.rect(2, 8, 2, 5, "#8a5a34").rect(14, 8, 2, 5, "#8a5a34");
    g.outline(OUTLINE);
    return g;
  });
}

function receptionSprite(): HTMLCanvasElement {
  return cache.get("reception", () => {
    const g = new Grid(36, 22);
    g.rect(1, 6, 34, 6, "#f3e9da");
    g.rect(1, 6, 34, 1, "#ffffff");
    g.rect(1, 12, 34, 9, "#d98a4a");
    g.rect(4, 14, 28, 5, "#e59a5a");
    // Bell and a "take a number" roll
    g.ellipse(9, 4, 3.5, 2.5, "#f2c14e");
    g.rect(6, 5, 7, 1, "#d9a531");
    g.set(9, 1, "#f2c14e");
    g.rect(24, 1, 7, 6, "#e5484d");
    g.rect(25, 2, 5, 3, "#fbfaf5");
    g.outline(OUTLINE);
    return g;
  });
}

function bossDeskSprite(w: number): HTMLCanvasElement {
  return cache.get(`boss-desk-${w}`, () => {
    const g = new Grid(w + 2, 30);
    const top = "#5a3426";
    g.rect(1, 1, w, 12, top);
    g.rect(1, 1, w, 1, "#8a5a3c");
    g.rect(1, 13, w, 12, "#4a2a1e");
    g.rect(1, 13, w, 1, "#6e4632");
    g.rect(4, 16, w - 8, 7, "#3e2218");
    g.rect(w / 2 - 6, 18, 12, 3, "#f2c14e");
    // Monitor back, papers, nameplate, mug, little plant
    g.rect(8, -0 + 1, 14, 9, "#b5bfc7").rect(9, 2, 12, 7, "#d5dbe2");
    g.rect(26, 4, 9, 7, "#fbfaf5").rect(28, 3, 9, 7, "#ffffff").rect(29, 5, 6, 1, "#b9b0a2").rect(29, 7, 5, 1, "#b9b0a2");
    g.rect(w - 22, 8, 12, 3, "#f2c14e").rect(w - 21, 9, 10, 1, "#8a5a34");
    g.rect(w - 8, 4, 4, 5, "#fbfaf5").set(w - 6, 5, "#e5484d");
    g.outline(OUTLINE);
    return g;
  });
}

function bossChairSprite(): HTMLCanvasElement {
  return cache.get("boss-chair", () => {
    const g = new Grid(22, 26);
    g.rrect(2, 1, 18, 18, "#2b2b33", 3);
    g.rect(4, 3, 14, 1, "#4a4a58");
    for (let y = 6; y < 16; y += 4) g.rect(5, y, 12, 1, "#3a3a44");
    g.rect(1, 12, 3, 8, "#2b2b33").rect(18, 12, 3, 8, "#2b2b33");
    g.rect(10, 19, 2, 4, "#4b4458").rect(5, 23, 12, 1, "#4b4458");
    g.outline(OUTLINE);
    return g;
  });
}

function dogBedSprite(): HTMLCanvasElement {
  return cache.get("dog-bed", () => {
    const g = new Grid(26, 14);
    g.ellipse(12.5, 7, 11.5, 5.5, "#7a5fb0");
    g.ellipse(12.5, 7.5, 8.5, 3.5, "#c9b8ff");
    g.set(10, 6, "#ffffff").set(15, 8, "#ffffff");
    g.outline(OUTLINE);
    return g;
  });
}

function cornholeSprite(): HTMLCanvasElement {
  return cache.get("cornhole", () => {
    const g = new Grid(16, 22);
    g.rect(1, 1, 14, 20, "#d9a066");
    g.rect(1, 1, 14, 1, "#ecbd84");
    g.rect(3, 3, 10, 16, "#3e8ed0");
    g.ellipse(7.5, 7, 2.5, 2.5, "#1a1722");
    g.outline(OUTLINE);
    return g;
  });
}
export { cornholeSprite };

/** A basket of rolled-up blueprints for the meeting room corner. */
function planRollsSprite(): HTMLCanvasElement {
  return cache.get("plan-rolls", () => {
    const g = new Grid(18, 28);
    const rolls: [number, number, string][] = [
      [3, 1, "#7fb3e6"],
      [8, 4, "#fbfaf5"],
      [12, 2, "#5a8fd0"],
      [6, 7, "#9fc4ff"],
    ];
    for (const [x, y, c] of rolls) {
      g.rect(x, y, 3, 16, c);
      g.rect(x, y, 3, 1, shade(c, 0.2));
      g.set(x + 1, y, shade(c, -0.25));
    }
    g.rect(2, 15, 14, 12, "#c48a52");
    g.rect(2, 15, 14, 1, "#d9a066");
    for (let y = 18; y < 26; y += 3) g.rect(3, y, 12, 1, "#a86c3a");
    g.outline(OUTLINE);
    return g;
  });
}

function wallFrontSprite(w: number, gapX: number, wood: boolean): HTMLCanvasElement {
  return cache.get(`front-${w}-${gapX}-${wood}`, () => {
    const g = new Grid(w, 11);
    const frame = wood ? "#7a4e2c" : "#8fa3b5";
    const light = wood ? "#a86c3a" : "#b8c9d6";
    const glass = wood ? "#e9dcc6cc" : "#cfe6f5aa";
    for (let x = 0; x < w; x++) {
      if (gapX >= 0 && x >= gapX - 9 && x < gapX + 9) continue;
      g.set(x, 0, frame).set(x, 1, light);
      for (let y = 2; y < 9; y++) g.set(x, y, glass);
      g.set(x, 9, frame).set(x, 10, wood ? "#4a2e1a" : "#5b6b7a");
    }
    for (let x = 6; x < w; x += 24) {
      if (gapX >= 0 && x >= gapX - 10 && x < gapX + 10) continue;
      g.set(x, 3, "#ffffffcc").set(x + 1, 4, "#ffffffcc").set(x + 2, 5, "#ffffffaa");
      g.vline(x + 12, 1, 9, frame);
    }
    return g;
  });
}

// ---------- background

function paintPixels(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), x, y);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

const WALLPAPERS = [
  { base: "#f2e6d0", stripe: "#ece0c7" },
  { base: "#e4ecdf", stripe: "#d9e4d2" },
  { base: "#f0e0d6", stripe: "#e8d3c7" },
];

function tiles(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, size = 6): void {
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      rect(ctx, x, y, Math.min(size, r.x + r.w - x), Math.min(size, r.y + r.h - y), (((x - r.x) / size + (y - r.y) / size) | 0) % 2 ? a : b);
    }
  }
}

function carpet(ctx: CanvasRenderingContext2D, r: Rect, edge: string, base: string, fleck: string): void {
  rect(ctx, r.x, r.y, r.w, r.h, edge);
  rect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, base);
  for (let y = r.y + 4; y < r.y + r.h - 4; y += 6) {
    for (let x = r.x + 4 + ((y - r.y) % 12 ? 3 : 0); x < r.x + r.w - 4; x += 6) rect(ctx, x, y, 2, 1, fleck);
  }
}

/** Bake the walls, floors and wall-mounted fixtures. Window panes stay transparent. */
export function paintBackground(L: Layout): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = L.W;
  canvas.height = L.H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const W = L.W;
  const H = L.H;

  // Floor planks everywhere first.
  for (let row = 0; row * 8 < H; row++) {
    const y = row * 8;
    rect(ctx, 0, y, W, 8, row % 2 ? "#c99a66" : "#c39260");
    rect(ctx, 0, y + 7, W, 1, "#a87a4a");
    const off = (row * 37) % 56;
    for (let x = -off; x < W; x += 56) {
      rect(ctx, x, y, 1, 7, "#a87a4a");
      if ((x + row * 13) % 3 === 0) rect(ctx, x + 22, y + 3, 2, 1, "#b2834f");
    }
  }

  // The back wall, in segments of different depth and wallpaper.
  L.segments.forEach((sg, i) => {
    const wp = WALLPAPERS[i % WALLPAPERS.length]!;
    const d = sg.depth;
    rect(ctx, sg.x0, 0, sg.x1 - sg.x0, d, wp.base);
    for (let x = sg.x0 + (i * 4) % 10; x < sg.x1; x += 10) rect(ctx, x, 0, 3, d - 16, wp.stripe);
    rect(ctx, sg.x0, 0, sg.x1 - sg.x0, 2, shade(wp.base, -0.12));
    rect(ctx, sg.x0, d - 16, sg.x1 - sg.x0, 14, "#b88257");
    rect(ctx, sg.x0, d - 16, sg.x1 - sg.x0, 2, "#d19a6c");
    rect(ctx, sg.x0, d - 14, sg.x1 - sg.x0, 1, "#9c6a42");
    for (let x = sg.x0 + 8; x < sg.x1 - 8; x += 26) {
      rect(ctx, x, d - 12, Math.min(20, sg.x1 - 8 - x), 8, "#ad774c");
      rect(ctx, x, d - 12, Math.min(20, sg.x1 - 8 - x), 1, "#9a6942");
    }
    rect(ctx, sg.x0, d - 2, sg.x1 - sg.x0, 2, "#7a5130");
    ctx.fillStyle = "rgba(60,30,20,0.18)";
    ctx.fillRect(sg.x0, d, sg.x1 - sg.x0, 3);
  });
  // Pillars where the wall steps in or out.
  for (const px of L.wall.pillars) {
    const left = L.segments.find((s) => s.x1 === px);
    const right = L.segments.find((s) => s.x0 === px);
    const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
    rect(ctx, px - 5, 0, 10, d + 4, "#e2d3bb");
    rect(ctx, px - 5, 0, 2, d + 4, "#f3e8d6");
    rect(ctx, px + 3, 0, 2, d + 4, "#c9b89c");
    rect(ctx, px - 6, d - 2, 12, 6, "#b88257");
    rect(ctx, px - 6, d + 3, 12, 1, "#7a5130");
  }

  // Room floors.
  const podCarpets = [
    ["#7a8aa6", "#8c9cb8", "#9aaac4"],
    ["#7f9a78", "#93ad8c", "#a1bb99"],
    ["#a38b77", "#b8a08c", "#c6ae99"],
  ];
  L.pods.forEach((pod, i) => {
    const [edge, base, hi] = podCarpets[i % podCarpets.length]!;
    carpet(ctx, { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 }, edge!, base!, hi!);
  });
  for (const room of L.rooms) {
    const r = room.rect;
    switch (room.kind) {
      case "meeting":
        tiles(ctx, r, "#9fb0c4", "#a8b8cb", 8);
        break;
      case "boss": {
        // Parquet and a rich rug.
        for (let y = r.y; y < r.y + r.h; y += 6) {
          for (let x = r.x + ((y / 6) % 2 ? 0 : 6); x < r.x + r.w; x += 12) {
            rect(ctx, x, y, Math.min(12, r.x + r.w - x), 6, (x + y) % 24 < 12 ? "#9a6a48" : "#8a5a3c");
            rect(ctx, x, y + 5, Math.min(12, r.x + r.w - x), 1, "#6e4632");
          }
        }
        const rug = new Grid(Math.min(r.w - 30, 110), Math.min(r.h - 40, 64));
        rug.rrect(0, 0, rug.w, rug.h, "#8a2f3a", 3);
        rug.rrect(3, 3, rug.w - 6, rug.h - 6, "#b8434f", 2);
        rug.rrect(7, 7, rug.w - 14, rug.h - 14, "#d9a531", 1);
        rug.rrect(8, 8, rug.w - 16, rug.h - 16, "#b8434f", 1);
        paintPixels(ctx, rug, r.x + Math.round((r.w - rug.w) / 2) + 6, r.y + 22);
        break;
      }
      case "waiting":
        carpet(ctx, r, "#5f9a96", "#7fb3ae", "#8fc4bf");
        break;
      case "kitchen":
        tiles(ctx, r, "#e8e1d4", "#d9cfbd");
        break;
      case "games":
        carpet(ctx, r, "#4f6b8a", "#5f7fa0", "#6f8fb0");
        break;
      case "garden": {
        // Grass with a stone path through it.
        for (let y = r.y; y < r.y + r.h; y += 4) {
          for (let x = r.x; x < r.x + r.w; x += 4) rect(ctx, x, y, 4, 4, ((x + y) >> 2) % 2 ? "#78a85e" : "#82b366");
        }
        for (let i = 0; i < r.w * r.h / 40; i++) rect(ctx, r.x + ((i * 37) % r.w), r.y + ((i * 53) % r.h), 1, 2, "#5f8f4a");
        for (let x = r.x + 10; x < r.x + r.w - 10; x += 14) {
          const y = r.y + r.h - 18 + Math.round(Math.sin(x * 0.08) * 3);
          rect(ctx, x, y, 9, 5, "#c9bfae");
          rect(ctx, x + 1, y, 7, 1, "#e2dacb");
        }
        rect(ctx, r.x, r.y, r.w, 2, "#5f8f4a");
        break;
      }
      case "server": {
        // A raised floor of dark tiles with a cool glow along the edges.
        tiles(ctx, r, "#232838", "#1d2130", 6);
        rect(ctx, r.x, r.y + r.h - 2, r.w, 2, "#3fd6ff");
        rect(ctx, r.x, r.y, r.w, 1, "#8f6bff");
        break;
      }
      case "library":
        carpet(ctx, r, "#6f9a6a", "#93bd8a", "#7fae78");
        break;
      case "lounge": {
        const c = L.couch;
        const rw = 124;
        const rh = 64;
        const g = new Grid(rw, rh);
        g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 2, rh / 2 - 2, "#b0566b");
        g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 7, rh / 2 - 6, "#e8c9a6");
        g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 14, rh / 2 - 11, "#d4a77f");
        g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 22, rh / 2 - 16, "#e8c9a6");
        paintPixels(ctx, g, c.x + c.w / 2 - rw / 2, c.y - 30);
        break;
      }
      default:
        break;
    }
    // Room walls: glass for the meeting room, wood-framed for your office.
    if (room.walls) {
      const frame = room.walls === "wood" ? "#7a4e2c" : "#8fa3b5";
      const pane = room.walls === "wood" ? "#e9dcc6" : "#cfe6f5";
      const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
      const atWall = seg !== undefined && r.y <= seg.depth + 1;
      for (const x of [r.x - 2, r.x + r.w - 1]) {
        rect(ctx, x, r.y - (atWall ? 2 : 6), 3, r.h + (atWall ? 2 : 6), frame);
        rect(ctx, x + 1, r.y - (atWall ? 2 : 6), 1, r.h + (atWall ? 2 : 6), pane);
      }
      if (!atWall) {
        const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
        for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
          if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
          rect(ctx, x, r.y - 8, 1, 2, frame);
          rect(ctx, x, r.y - 6, 1, 5, pane);
          rect(ctx, x, r.y - 1, 1, 1, frame);
        }
      }
    }
  }

  // Windows (panes cleared so the sky shows through)
  for (const win of L.wall.windows) {
    const { x, y, w, h } = win;
    const g = new Grid(w + 2, h + 6);
    g.rect(1, 1, w, h, "#f4eee2");
    const mx = Math.floor(w / 2);
    const my = Math.floor(h / 2);
    g.rect(mx, 1, 2, h, "#f4eee2");
    g.rect(1, my, w, 2, "#f4eee2");
    g.rect(0, h + 1, w + 2, 3, "#e6dccb");
    g.rect(0, h + 1, w + 2, 1, "#ffffff");
    g.rect(1, 1, 3, h + 1, "#ef8f7f").rect(w - 2, 1, 3, h + 1, "#ef8f7f");
    g.outline(OUTLINE);
    for (let j = 4; j < h - 2; j++) {
      for (let i = 5; i < w - 3; i++) {
        if (i === mx || i === mx + 1 || j === my || j === my + 1) continue;
        g.set(i, j, null);
      }
    }
    ctx.clearRect(x + 4, y + 3, w - 7, h - 5);
    paintPixels(ctx, g, x - 1, y - 1);
  }

  // Pinboard
  {
    const { x, y, w, h } = L.wall.pinboard;
    const g = new Grid(w + 2, h + 2);
    g.rect(1, 1, w, h, "#a4703f");
    g.rect(1, 1, w, 1, "#c08a55");
    g.rect(4, 4, w - 6, h - 6, "#c99a64");
    for (let i = 0; i < 260; i++) g.set(4 + ((i * 37) % (w - 6)), 4 + ((i * 53 + (i >> 3)) % (h - 6)), i % 3 ? "#b8875a" : "#d9ad78");
    g.outline(OUTLINE);
    paintPixels(ctx, g, x - 1, y - 1);
  }

  // Calendar + status board frames (contents are live)
  {
    const c = L.wall.calendar;
    const g = new Grid(c.w + 2, c.h + 2);
    g.rect(1, 1, c.w, c.h, "#fbfaf5");
    g.rect(1, 1, c.w, 7, "#e5484d");
    g.rect(1, c.h - 1, c.w, 2, "#e2dccf");
    g.outline(OUTLINE);
    paintPixels(ctx, g, c.x - 1, c.y - 1);
    const s = L.wall.status;
    const b = new Grid(s.w + 2, s.h + 2);
    b.rrect(1, 1, s.w, s.h, "#2c2836", 1);
    b.rect(2, 2, s.w - 2, s.h - 2, "#1a1722");
    b.outline(OUTLINE);
    paintPixels(ctx, b, s.x - 1, s.y - 1);
  }

  // Door with a "+" sign
  {
    const d = L.wall.door;
    const g = new Grid(d.w + 6, d.h + 4);
    g.rect(0, 2, d.w + 6, d.h + 2, "#8a5a34");
    g.rect(3, 4, d.w, d.h, "#c48a52");
    g.rect(5, 7, d.w - 4, 10, "#d9a066");
    g.rect(5, 21, d.w - 4, 16, "#d9a066");
    g.rect(7, 9, d.w - 8, 6, "#cfe6f5");
    g.set(d.w - 1, 25, "#f2c14e").set(d.w - 1, 26, "#f2c14e");
    g.outline(OUTLINE);
    paintPixels(ctx, g, d.x - 3, d.y - 3);
    const sg = new Grid(14, 9);
    sg.rect(1, 1, 12, 7, "#2f6b4a");
    sg.rect(6, 2, 2, 5, "#bff5cf").rect(4, 4, 6, 1, "#bff5cf");
    sg.outline(OUTLINE);
    paintPixels(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
  }

  // Legend sticky note
  {
    const n = L.wall.legendNote;
    const g = new Grid(n.w + 2, n.h + 2);
    g.rect(1, 1, n.w, n.h, "#fff3a3");
    g.rect(1, 1, n.w, 2, "#f5dc6a");
    const qx = Math.floor(n.w / 2) - 1;
    g.rect(qx, 4, 3, 1, "#6b5a2e").set(qx + 2, 5, "#6b5a2e").set(qx + 1, 6, "#6b5a2e").set(qx + 1, 8, "#6b5a2e");
    g.outline(OUTLINE);
    paintPixels(ctx, g, n.x - 1, n.y - 1);
    rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, "#e5484d");
  }

  for (const p of L.wall.paintings) ctx.drawImage(pa(p.sprite), p.x, p.y);

  // Clock face
  {
    const { x, y, r } = L.wall.clock;
    const g = new Grid(r * 2 + 5, r * 2 + 5);
    const c = r + 2;
    g.ellipse(c, c, r, r, "#4b3d5c");
    g.ellipse(c, c, r - 1.5, r - 1.5, "#fdf8ec");
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.set(c + Math.round(Math.sin(a) * (r - 2.6)), c - Math.round(Math.cos(a) * (r - 2.6)), i % 3 === 0 ? "#4b3d5c" : "#b9a9c9");
    }
    g.outline(OUTLINE);
    paintPixels(ctx, g, x - c, y - c);
  }
  return canvas;
}

function canvasFor(p: PropPlacement, L: Layout): HTMLCanvasElement {
  switch (p.kind) {
    case "meeting-chair-back":
    case "guest-chair":
      return pa("WOODEN_CHAIR_BACK");
    case "meeting-chair-front":
      return pa("WOODEN_CHAIR_FRONT");
    case "plan-rolls":
      return planRollsSprite();
    case "meeting-table":
      return meetingTableSprite();
    case "glass-front": {
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      return wallFrontSprite(p.w ?? 100, gap, room?.walls === "wood");
    }
    case "couch":
      return couchSprite();
    case "coffee-table":
      return coffeeTableSprite();
    case "pingpong":
      return pingPongSprite();
    case "arcade":
      return arcadeSprite();
    case "beanbag-blue":
      return beanbagSprite("#7fb8d6");
    case "beanbag-pink":
      return beanbagSprite("#e6a0c4");
    case "armchair":
      return armchairSprite();
    case "bookshelf":
      return bookshelfSprite();
    case "lamp":
      return lampSprite();
    case "printer":
      return printerSprite();
    case "cooler":
      return coolerSprite();
    case "library-shelf":
      return pa("DOUBLE_BOOKSHELF");
    case "library-table":
      return pa("COFFEE_TABLE");
    case "sofa-front":
      return pa("SOFA_FRONT");
    case "sofa-back":
      return pa("SOFA_BACK");
    case "low-shelf":
      return pa("BOOKSHELF");
    case "planter":
      return planterSprite(p.w ?? 48);
    case "kitchen-island":
      return kitchenIslandSprite(p.w ?? 72);
    case "kitchen-counter":
      return kitchenCounterSprite(p.w ?? 100);
    case "stool":
      return stoolSprite();
    case "fridge":
      return fridgeSprite();
    case "vending":
      return vendingSprite();
    case "fishtank-stand":
      return fishtankStandSprite();
    case "whiteboard":
      return whiteboardSprite(p.w ?? 80);
    case "tv":
      return tvSprite(p.w ?? 120, L.tv.h, p.z > 0);
    case "piano":
      return pianoSprite();
    case "dartboard":
      return dartboardSprite();
    case "cornhole":
      return cornholeSprite();
    case "waiting-chair":
      return waitingChairSprite();
    case "waiting-sofa":
      return waitingSofaSprite(p.w ?? 42);
    case "waiting-sofa-back":
      return sofaBackSprite(p.w ?? 42);
    case "waiting-armchair":
      return armchairSideSprite(false);
    case "waiting-armchair-left":
      return armchairSideSprite(true);
    case "lounge-table":
      return loungeTableSprite();
    case "bench":
      return benchSprite();
    case "espresso":
      return espressoSprite();
    case "server-rack":
      return serverRackSprite();
    case "ai-rack":
      return aiRackSprite();
    case "side-table":
      return sideTableSprite();
    case "reception":
      return receptionSprite();
    case "boss-desk":
      return bossDeskSprite(p.w ?? 60);
    case "boss-chair":
      return bossChairSprite();
    case "dog-bed":
      return dogBedSprite();
    case "bin":
      return pa("BIN");
  }
}

/** Turn the layout's placements into drawable, depth-sorted props. */
export function buildProps(L: Layout): Prop[] {
  const props: Prop[] = L.props.map((p) => ({
    id: p.id,
    kind: p.kind,
    canvas: canvasFor(p, L),
    x: p.x,
    y: p.y,
    z: p.z,
    variant: p.variant,
  }));
  for (const pl of L.plants) {
    props.push({ id: `plant-${pl.x}-${pl.y}`, kind: "plant", canvas: pa(pl.sprite), x: pl.x, y: pl.y, z: pl.z });
  }
  return props;
}
