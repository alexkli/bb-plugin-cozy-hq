// Workstations dressed by whoever sits there: the model picks the desk and
// screens, the provider picks the chair. Empty desks are plain oak, PC off.

import { Grid, SpriteCache } from "./pixel.ts";
import { OUTLINE } from "./characters.ts";
import { pa, paRecolor } from "./furniture.ts";
import type { DeskStyle } from "./model.ts";
import type { Rect } from "./layout.ts";

const cache = new SpriteCache();

const DESK_COLORS: Record<DeskStyle, Record<string, string> | null> = {
  default: null,
  sonnet: null,
  opus: { "#885c47": "#4a2c22", "#cfa86d": "#9a6a48", "#b38857": "#6e4632", "#532e3d": "#2a1620" },
  haiku: { "#885c47": "#8f99a4", "#cfa86d": "#ffffff", "#b38857": "#e6ebf0", "#532e3d": "#5b6470" },
  gpt: { "#885c47": "#18181e", "#cfa86d": "#55555f", "#b38857": "#30303a", "#532e3d": "#0b0b0f" },
  gemini: { "#885c47": "#a88a5c", "#cfa86d": "#f6e6c4", "#b38857": "#e4cc98", "#532e3d": "#6b5333" },
};

export function deskCanvas(style: DeskStyle): HTMLCanvasElement {
  const map = DESK_COLORS[style];
  return map ? paRecolor("DESK_FRONT", map) : pa("DESK_FRONT");
}

export type ChairTone = "green" | "claude" | "copilot" | "bedrock" | "codex" | "blue";

const CHAIR_COLORS: Record<ChairTone, Record<string, string> | null> = {
  green: null,
  claude: { "#487841": "#c4673f", "#6fa374": "#e8936a", "#173115": "#4a1f10" },
  copilot: { "#487841": "#6b4fc4", "#6fa374": "#9b84e6", "#173115": "#24184a" },
  bedrock: { "#487841": "#2f3e52", "#6fa374": "#f29b38", "#173115": "#121a24" },
  codex: { "#487841": "#2b2b33", "#6fa374": "#55555f", "#173115": "#0e0e12" },
  blue: { "#487841": "#3e7cc4", "#6fa374": "#7fb3e6", "#173115": "#132a48" },
};

export function chairToneFor(providerId: string): ChairTone {
  const p = providerId.toLowerCase();
  if (p.includes("bedrock")) return "bedrock";
  if (p.includes("gh-copilot")) return "blue";
  if (p.includes("copilot")) return "copilot";
  if (p.includes("codex") || p.includes("openai")) return "codex";
  if (p.includes("claude")) return "claude";
  return "green";
}

export function chairCanvas(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const name = side === "north" ? "CUSHIONED_CHAIR_FRONT" : "CUSHIONED_CHAIR_BACK";
  const map = CHAIR_COLORS[tone];
  return map ? paRecolor(name, map) : pa(name);
}

export interface Screen {
  canvas: HTMLCanvasElement;
  /** Offset from the desk's PC anchor. */
  dx: number;
  dy: number;
  /** Visible screens, relative to the sprite. */
  screens: Rect[];
}

function laptopFront(): Grid {
  const g = new Grid(18, 14);
  g.rect(2, 1, 14, 9, "#c9ced6");
  g.rect(3, 2, 12, 7, "#232733");
  g.rect(1, 10, 16, 3, "#dfe3e8");
  for (let i = 0; i < 6; i++) g.set(3 + i * 2, 11, "#b5bcc6");
  g.outline(OUTLINE);
  return g;
}

function laptopBack(): Grid {
  const g = new Grid(18, 12);
  g.rect(2, 1, 14, 9, "#c9ced6");
  g.rect(3, 2, 12, 7, "#d9dde3");
  g.set(8, 5, "#ffffff").set(9, 5, "#ffffff").set(8, 6, "#ffffff").set(9, 6, "#ffffff");
  g.outline(OUTLINE);
  return g;
}

function ultrawideFront(): Grid {
  const g = new Grid(32, 22);
  g.rect(1, 1, 30, 11, "#1e1e24");
  g.rect(3, 3, 26, 7, "#232733");
  g.rect(14, 12, 4, 3, "#2e2e36");
  g.rect(11, 15, 10, 1, "#3a3a44");
  g.rect(9, 17, 14, 3, "#2e2e36");
  for (let i = 0; i < 6; i++) g.set(10 + i * 2, 18, "#4a4a55");
  g.outline(OUTLINE);
  return g;
}

function ultrawideBack(): Grid {
  const g = new Grid(32, 16);
  g.rect(1, 1, 30, 10, "#2a2a32");
  g.rect(12, 4, 8, 4, "#34343e");
  g.rect(14, 11, 4, 3, "#2e2e36");
  g.outline(OUTLINE);
  return g;
}

function sideMonitorFront(): Grid {
  const g = new Grid(14, 16);
  g.rect(1, 2, 12, 9, "#757b7c");
  g.rect(2, 3, 10, 7, "#b5bfc7");
  g.rect(3, 4, 8, 5, "#232733");
  g.rect(6, 11, 2, 2, "#757b7c");
  g.rect(4, 13, 6, 1, "#757b7c");
  g.outline(OUTLINE);
  return g;
}

function sideMonitorBack(): Grid {
  const g = new Grid(14, 14);
  g.rect(1, 2, 12, 9, "#b5bfc7");
  g.rect(2, 3, 10, 7, "#d5dbe2");
  g.rect(6, 11, 2, 2, "#757b7c");
  g.outline(OUTLINE);
  return g;
}

type Flat = "black" | "silver" | "white" | "big";

const BEZEL: Record<Flat, { bezel: string; edge: string; stand: string; back: string }> = {
  black: { bezel: "#24262e", edge: "#3a3d48", stand: "#3a3d48", back: "#3a3d48" },
  big: { bezel: "#1c1e25", edge: "#33363f", stand: "#4a4d58", back: "#33363f" },
  silver: { bezel: "#cfd5dc", edge: "#e9edf1", stand: "#b5bcc6", back: "#c9ced6" },
  white: { bezel: "#f1f2f4", edge: "#ffffff", stand: "#d5dbe2", back: "#e6e9ee" },
};

/** Keyboard and mouse at the front of a desk, as on the Pixel Agents PC. */
function keyboard(g: Grid, x: number, y: number): void {
  g.rect(x, y, 11, 4, "#c9ced6");
  for (let i = 0; i < 5; i++) g.set(x + 1 + i * 2, y + 1, "#9aa3ad").set(x + 2 + i * 2, y + 2, "#9aa3ad");
  g.rect(x + 13, y + 1, 3, 3, "#c9ced6").set(x + 14, y + 1, "#9aa3ad");
}

/** A flat screen seen from the front (we look at the screen), 16 or 22 wide. */
function flatFront(kind: Flat): Grid {
  const big = kind === "big";
  const w = big ? 22 : 16;
  const c = BEZEL[kind];
  const g = new Grid(w, 32);
  const sh = big ? 11 : 9;
  g.rect(1, 1, w - 2, sh + 2, c.bezel);
  g.rect(1, 1, w - 2, 1, c.edge);
  g.rect(2, 2, w - 4, sh, "#1b1e26");
  if (kind === "silver") g.rect(1, sh + 3, w - 2, 2, c.bezel).set(Math.floor(w / 2), sh + 3, "#9aa3ad");
  const neck = kind === "silver" ? sh + 5 : sh + 3;
  g.rect(Math.floor(w / 2) - 1, neck, 2, 3, c.stand);
  g.rect(Math.floor(w / 2) - 4, neck + 3, 8, 1, c.stand);
  keyboard(g, big ? 3 : 0, 18);
  g.outline(OUTLINE);
  return g;
}

/** A flat screen seen from behind (the person faces us). */
function flatBack(kind: Flat): Grid {
  const big = kind === "big";
  const w = big ? 22 : 16;
  const c = BEZEL[kind];
  const g = new Grid(w, 32);
  const top = big ? 7 : 8;
  g.rect(1, top, w - 2, big ? 11 : 9, c.back);
  g.rect(1, top, w - 2, 1, c.edge);
  g.rect(Math.floor(w / 2) - 2, top + 3, 4, 3, kind === "silver" || kind === "white" ? "#fbfcfd" : "#4a4d58");
  g.rect(Math.floor(w / 2) - 1, top + (big ? 11 : 9), 2, 3, c.stand);
  g.rect(Math.floor(w / 2) - 4, top + (big ? 14 : 12), 8, 1, c.stand);
  g.outline(OUTLINE);
  return g;
}

/** Nothing but a keyboard: whoever sits here works in a headset. */
function bareFront(): Grid {
  const g = new Grid(16, 32);
  keyboard(g, 0, 18);
  g.outline(OUTLINE);
  return g;
}

/**
 * The screen setup on a desk, by desk style and seat side. `variant` (the
 * desk index) varies the monitor model, with an old CRT here and there;
 * `vision` leaves the desk bare for someone in a Vision Pro.
 */
export function screenFor(style: DeskStyle, side: "north" | "south", variant = 0, vision = false): Screen {
  const front = side === "south";
  if (vision) {
    return front
      ? { canvas: cache.get("screen-bare", bareFront), dx: 0, dy: 0, screens: [] }
      : { canvas: once("screen-none", () => layered(1, 1, [])), dx: 0, dy: 0, screens: [] };
  }
  switch (style) {
    case "opus":
      // Dual flat screens.
      return front
        ? {
            canvas: once("opus-front", () => layered(32, 32, [[flatFront("black").toCanvas(), 0, 0], [flatFront("black").toCanvas(), 16, 0]])),
            dx: -8,
            dy: 0,
            screens: [
              { x: 2, y: 2, w: 12, h: 9 },
              { x: 18, y: 2, w: 12, h: 9 },
            ],
          }
        : { canvas: once("opus-back", () => layered(32, 32, [[flatBack("black").toCanvas(), 0, 0], [flatBack("black").toCanvas(), 16, 0]])), dx: -8, dy: 0, screens: [] };
    case "haiku":
      return front
        ? { canvas: cache.get("screen-laptop-front", laptopFront), dx: -1, dy: 12, screens: [{ x: 4, y: 3, w: 10, h: 5 }] }
        : { canvas: cache.get("screen-laptop-back", laptopBack), dx: -1, dy: 12, screens: [] };
    case "gpt":
      return front
        ? { canvas: cache.get("screen-ultra-front", ultrawideFront), dx: -8, dy: 4, screens: [{ x: 4, y: 4, w: 24, h: 5 }] }
        : { canvas: cache.get("screen-ultra-back", ultrawideBack), dx: -2, dy: 8, screens: [] };
    default: {
      // Mostly modern flat screens; a retro CRT on about one desk in nine.
      if (variant % 9 === 4) {
        return front
          ? { canvas: pa("PC_FRONT_OFF"), dx: 0, dy: 0, screens: [{ x: 3, y: 5, w: 10, h: 5 }] }
          : { canvas: pa("PC_BACK"), dx: 0, dy: 0, screens: [] };
      }
      const kind = (["black", "silver", "black", "big", "white", "silver"] as Flat[])[variant % 6]!;
      const big = kind === "big";
      return front
        ? { canvas: cache.get(`flat-front-${kind}`, () => flatFront(kind)), dx: big ? -3 : 0, dy: 0, screens: [{ x: 2, y: 2, w: big ? 18 : 12, h: big ? 11 : 9 }] }
        : { canvas: cache.get(`flat-back-${kind}`, () => flatBack(kind)), dx: big ? -3 : 0, dy: 0, screens: [] };
    }
  }
}

const built = new Map<string, HTMLCanvasElement>();
function once(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = built.get(key);
  if (!c) {
    c = build();
    built.set(key, c);
  }
  return c;
}

function layered(w: number, h: number, parts: [HTMLCanvasElement, number, number][]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  for (const [img, x, y] of parts) ctx.drawImage(img, x, y);
  return c;
}
