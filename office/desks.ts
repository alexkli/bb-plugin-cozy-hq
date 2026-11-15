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

/** The screen setup on a desk, by desk style and seat side. */
export function screenFor(style: DeskStyle, side: "north" | "south"): Screen {
  const key = `${style}-${side}`;
  const PC_SCREEN: Rect = { x: 3, y: 5, w: 10, h: 5 };
  switch (style) {
    case "opus":
      // Dual monitors: the PC plus a second screen on the side.
      return side === "south"
        ? {
            canvas: once(key, () => layered(30, 32, [[sideMonitorFront().toCanvas(), 15, 1], [pa("PC_FRONT_OFF"), 0, 0]])),
            dx: -8,
            dy: 0,
            screens: [PC_SCREEN, { x: 18, y: 5, w: 8, h: 5 }],
          }
        : {
            canvas: once(key, () => layered(30, 32, [[sideMonitorBack().toCanvas(), 15, 8], [pa("PC_BACK"), 0, 0]])),
            dx: 0,
            dy: 0,
            screens: [],
          };
    case "haiku":
      return side === "south"
        ? { canvas: cache.get(`screen-${key}`, laptopFront), dx: -1, dy: 12, screens: [{ x: 4, y: 3, w: 10, h: 5 }] }
        : { canvas: cache.get(`screen-${key}`, laptopBack), dx: -1, dy: 12, screens: [] };
    case "gpt":
      return side === "south"
        ? { canvas: cache.get(`screen-${key}`, ultrawideFront), dx: -8, dy: 4, screens: [{ x: 4, y: 4, w: 24, h: 5 }] }
        : { canvas: cache.get(`screen-${key}`, ultrawideBack), dx: -2, dy: 8, screens: [] };
    default:
      return side === "south"
        ? { canvas: pa("PC_FRONT_OFF"), dx: 0, dy: 0, screens: [PC_SCREEN] }
        : { canvas: pa("PC_BACK"), dx: 0, dy: 0, screens: [] };
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
