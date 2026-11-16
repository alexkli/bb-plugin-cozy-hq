// Redwood Camp workstations: plank camp tables, canvas director's chairs,
// laptops with stickers, a wood-cased terminal, field notebooks and enamel mugs.
import type { ChairTone, Screen } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { Grid } from "../../themekit.ts";
import { boards, C, cached, mugAt, OUTLINE, sprite } from "./kit.ts";

// ------------------------------------------------------------------ tables

const WOODS: Record<DeskStyle, { hi: string; base: string; lo: string; gap: string; leg: string; legHi: string }> = {
  default: { hi: "#dcb67e", base: "#c69c62", lo: "#ab814c", gap: "#6e4c2c", leg: C.barkMid, legHi: C.barkHi },
  sonnet: { hi: "#dcb67e", base: "#c69c62", lo: "#ab814c", gap: "#6e4c2c", leg: C.barkMid, legHi: C.barkHi },
  opus: { hi: "#9a6a48", base: "#7f5236", lo: "#6a4129", gap: "#3e2416", leg: C.walnutLo, legHi: C.walnut },
  haiku: { hi: "#f6f0e2", base: "#e6dcc6", lo: "#cfc4aa", gap: "#8a8070", leg: "#ece6d8", legHi: "#ffffff" },
  gpt: { hi: "#564a44", base: "#3e3432", lo: "#2e2624", gap: "#141010", leg: "#2a2220", legHi: "#3e3432" },
  gemini: { hi: "#f4d49c", base: "#e2b878", lo: "#c89a5a", gap: "#7a5a30", leg: "#b08048", legHi: "#d4a46a" },
};

export function desk(style: DeskStyle): HTMLCanvasElement {
  return sprite(`desk-${style}`, 48, 32, (g) => {
    const w = WOODS[style];
    boards(g, 2, 11, 44, 13, { hi: w.hi, base: w.base, lo: w.lo, gap: w.gap }, 4, style.length * 7 + 3);
    g.rect(2, 11, 44, 1, w.hi);
    g.rect(2, 24, 44, 2, w.lo).rect(2, 26, 44, 1, w.gap);
    if (style === "haiku") {
      // Birch: little dark marks on the top and the legs.
      for (const [x, y] of [
        [7, 13],
        [19, 17],
        [33, 14],
        [40, 20],
        [12, 21],
        [27, 22],
      ] as const) g.rect(x, y, 2, 1, "#5a5248");
    }
    for (const x of [3, 41]) {
      g.rect(x, 27, 4, 5, w.leg);
      g.rect(x, 27, 1, 5, w.legHi);
      if (style === "haiku") g.set(x + 2, 28, "#3a342e").set(x + 1, 30, "#3a342e");
    }
    // A cross brace between the legs
    g.rect(7, 29, 34, 1, w.lo);
  });
}

// ------------------------------------------------------------------ director's chairs

const TONES: Record<ChairTone, [string, string, string]> = {
  green: ["#4f7a3a", "#6f9a52", "#2f4a22"],
  claude: ["#c4673f", "#e8936a", "#7a3a1e"],
  copilot: ["#6b4fc4", "#9b84e6", "#3a2a6a"],
  bedrock: ["#2f3e52", "#f29b38", "#18202c"],
  codex: ["#2b2b33", "#55555f", "#141418"],
  blue: ["#3e7cc4", "#7fb3e6", "#1e3e62"],
};

export function chair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    const [cloth, hi, lo] = TONES[tone];
    if (side === "north") {
      g.rect(2, 0, 2, 13, C.log).rect(12, 0, 2, 13, C.log);
      g.rect(2, 0, 1, 13, C.logHi).rect(12, 0, 1, 13, C.logHi);
      g.rect(4, 1, 8, 6, cloth).rect(4, 1, 8, 1, hi).rect(4, 6, 8, 1, lo);
      g.rect(1, 7, 14, 1, C.logLo);
      g.rect(3, 8, 10, 4, cloth).rect(3, 8, 10, 1, hi);
      g.line(3, 12, 12, 15, C.logLo).line(12, 12, 3, 15, C.logDk);
    } else {
      g.rect(2, 4, 2, 10, C.log).rect(12, 4, 2, 10, C.log);
      g.rect(2, 4, 1, 10, C.logHi).rect(12, 4, 1, 10, C.logHi);
      g.rect(4, 5, 8, 6, lo).rect(4, 5, 8, 1, cloth);
      g.rect(1, 11, 14, 1, C.logLo);
      g.line(3, 12, 12, 15, C.logLo).line(12, 12, 3, 15, C.logDk);
    }
  });
}

// ------------------------------------------------------------------ screens

type Flat = "black" | "silver" | "white" | "big";
const LAPTOP: Record<Exclude<Flat, "big">, { body: string; hi: string; lo: string; sticker: string }> = {
  black: { body: "#3a3d42", hi: "#55595f", lo: "#26282c", sticker: "#e8c872" },
  silver: { body: "#c9ced2", hi: "#e4e8ea", lo: "#9aa2a8", sticker: "#3f6b3a" },
  white: { body: "#e8e0cc", hi: "#f6f0e2", lo: "#c8bea6", sticker: "#c4552d" },
};

/** A field notebook with an elastic band and an enamel mug, near the sitter. */
function notebookAndMug(g: Grid, x: number, y: number): void {
  g.rect(x, y, 6, 4, "#c9a46a").rect(x, y, 6, 1, "#dcb880").rect(x + 4, y, 1, 4, "#5a3a22");
  g.line(x + 7, y + 3, x + 9, y, "#3a3a3a");
  mugAt(g, x + 11, y, C.cream, C.blueEnamel);
}

/** A sticker on a laptop lid: a little pine in a circle, a tent or a mountain. */
function sticker(g: Grid, x: number, y: number, c: string, kind: number): void {
  if (kind === 0) {
    g.set(x + 1, y, c).rect(x, y + 1, 3, 1, c).set(x + 1, y + 2, "#6a4a2a");
  } else if (kind === 1) {
    g.set(x + 1, y, c).rect(x, y + 1, 3, 1, c).set(x, y + 2, c).set(x + 2, y + 2, c);
  } else {
    g.rect(x, y, 3, 3, c).set(x + 1, y + 1, "#f6f0e2");
  }
}

function laptopFront(kind: Exclude<Flat, "big">): Grid {
  const L = LAPTOP[kind];
  const g = new Grid(16, 32);
  g.rect(1, 1, 14, 11, L.body);
  g.rect(1, 1, 14, 1, L.hi);
  g.rect(2, 2, 12, 9, "#14201a");
  g.rect(1, 12, 14, 1, L.lo);
  g.rect(0, 13, 16, 3, L.body);
  for (let i = 0; i < 6; i++) g.set(2 + i * 2, 14, L.lo);
  g.rect(6, 15, 4, 1, L.hi);
  notebookAndMug(g, 0, 18);
  g.outline(OUTLINE);
  return g;
}

function laptopBack(kind: Exclude<Flat, "big">, variant: number): Grid {
  const L = LAPTOP[kind];
  const g = new Grid(16, 32);
  g.rect(1, 8, 14, 10, L.body);
  g.rect(1, 8, 14, 1, L.hi);
  g.rect(1, 17, 14, 1, L.lo);
  sticker(g, 4 + (variant % 3) * 2, 11, L.sticker, variant % 3);
  if (variant % 2) g.rect(10, 14, 3, 2, "#b5653a");
  g.rect(0, 18, 16, 2, L.lo);
  g.outline(OUTLINE);
  return g;
}

/** A big monitor in a walnut frame (22 wide). */
function bigFront(): Grid {
  const g = new Grid(22, 32);
  g.rect(1, 1, 20, 13, C.walnut);
  g.rect(1, 1, 20, 1, C.walnutHi);
  g.rect(2, 2, 18, 11, "#14201a");
  g.rect(9, 14, 4, 3, C.walnutLo);
  g.rect(5, 17, 12, 1, C.walnutLo);
  // Wooden keyboard
  g.rect(3, 18, 12, 4, C.log);
  for (let i = 0; i < 5; i++) g.set(4 + i * 2, 19, C.cream).set(5 + i * 2, 20, C.cream);
  g.rect(16, 19, 3, 3, C.log).set(17, 19, C.logLo);
  g.outline(OUTLINE);
  return g;
}

function bigBack(): Grid {
  const g = new Grid(22, 32);
  g.rect(1, 7, 20, 12, C.walnut);
  g.rect(1, 7, 20, 1, C.walnutHi);
  for (let y = 9; y < 18; y += 3) g.rect(3, y, 16, 1, C.walnutLo);
  g.rect(9, 19, 4, 3, C.walnutLo).rect(6, 22, 10, 1, C.walnutLo);
  g.outline(OUTLINE);
  return g;
}

/** A wood-cased terminal in place of the old CRT. */
function terminalFront(): Grid {
  const g = new Grid(16, 32);
  g.rect(1, 1, 14, 15, C.log);
  g.rect(1, 1, 14, 1, C.logHi);
  g.rect(1, 15, 14, 1, C.logLo);
  g.rect(2, 4, 12, 7, C.walnutLo);
  g.rect(3, 5, 10, 5, "#14201a");
  g.set(3, 13, C.brass).set(6, 13, C.brass).rect(9, 12, 4, 2, "#5a3a22");
  g.rect(1, 18, 12, 4, C.logLo);
  for (let i = 0; i < 5; i++) g.set(2 + i * 2, 19, C.cream).set(3 + i * 2, 20, C.cream);
  g.outline(OUTLINE);
  return g;
}

function terminalBack(): Grid {
  const g = new Grid(16, 32);
  g.rect(1, 3, 14, 16, C.log);
  g.rect(1, 3, 14, 1, C.logHi);
  for (let y = 6; y < 17; y += 3) g.rect(3, y, 10, 1, C.logLo);
  g.rect(1, 18, 14, 1, C.logDk);
  g.outline(OUTLINE);
  return g;
}

function dualFront(): Grid {
  const g = new Grid(32, 32);
  for (const ox of [0, 16]) {
    g.rect(ox + 1, 1, 14, 11, C.walnut);
    g.rect(ox + 1, 1, 14, 1, C.walnutHi);
    g.rect(ox + 2, 2, 12, 9, "#14201a");
    g.rect(ox + 7, 12, 2, 3, C.walnutLo).rect(ox + 4, 15, 8, 1, C.walnutLo);
  }
  g.rect(1, 18, 13, 4, C.log);
  for (let i = 0; i < 6; i++) g.set(2 + i * 2, 19, C.cream).set(3 + i * 2, 20, C.cream);
  mugAt(g, 18, 18, C.cream, "#3f6b3a");
  g.rect(24, 18, 6, 4, "#c9a46a").rect(24, 18, 6, 1, "#dcb880");
  g.outline(OUTLINE);
  return g;
}

function dualBack(): Grid {
  const g = new Grid(32, 32);
  for (const ox of [0, 16]) {
    g.rect(ox + 1, 8, 14, 9, C.walnut);
    g.rect(ox + 1, 8, 14, 1, C.walnutHi);
    g.rect(ox + 6, 11, 4, 3, C.walnutLo);
    g.rect(ox + 7, 17, 2, 3, C.walnutLo).rect(ox + 4, 20, 8, 1, C.walnutLo);
  }
  g.outline(OUTLINE);
  return g;
}

/** A rugged field laptop: olive with orange bumpers. */
function ruggedFront(): Grid {
  const g = new Grid(18, 14);
  g.rect(2, 1, 14, 9, "#5a6440");
  g.rect(3, 2, 12, 7, "#3e4630");
  g.rect(4, 3, 10, 5, "#14201a");
  for (const [x, y] of [
    [2, 1],
    [15, 1],
    [2, 9],
    [15, 9],
  ] as const) g.set(x, y, "#e07a3a");
  g.rect(1, 10, 16, 3, "#6a744e");
  for (let i = 0; i < 6; i++) g.set(3 + i * 2, 11, "#4a5236");
  g.outline(OUTLINE);
  return g;
}

function ruggedBack(): Grid {
  const g = new Grid(18, 12);
  g.rect(2, 1, 14, 9, "#5a6440");
  g.rect(3, 2, 12, 7, "#6a744e");
  for (const [x, y] of [
    [2, 1],
    [15, 1],
    [2, 9],
    [15, 9],
  ] as const) g.set(x, y, "#e07a3a");
  sticker(g, 7, 4, "#e8c872", 1);
  g.outline(OUTLINE);
  return g;
}

function wideFront(): Grid {
  const g = new Grid(32, 22);
  g.rect(1, 1, 30, 11, C.walnutLo);
  g.rect(1, 1, 30, 1, C.walnut);
  g.rect(3, 3, 26, 7, "#14201a");
  // A log-slice stand
  g.rect(13, 12, 6, 3, C.barkMid);
  g.ellipse(15.5, 15.5, 6, 1.2, C.log);
  g.rect(8, 17, 16, 3, C.log);
  for (let i = 0; i < 7; i++) g.set(9 + i * 2, 18, C.cream);
  g.outline(OUTLINE);
  return g;
}

function wideBack(): Grid {
  const g = new Grid(32, 16);
  g.rect(1, 1, 30, 10, C.walnutLo);
  g.rect(1, 1, 30, 1, C.walnut);
  for (let x = 4; x < 29; x += 5) g.rect(x, 3, 1, 7, C.walnutDk);
  g.rect(13, 11, 6, 3, C.barkMid);
  g.outline(OUTLINE);
  return g;
}

function bareFront(): Grid {
  const g = new Grid(16, 32);
  notebookAndMug(g, 0, 18);
  g.outline(OUTLINE);
  return g;
}

function sameSize(c: HTMLCanvasElement, g: Grid): HTMLCanvasElement | null {
  return c.width === g.w && c.height === g.h ? g.toCanvas() : null;
}

export function screen(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean, classic: () => Screen): Screen | null {
  const base = classic();
  const front = side === "south";
  let key: string;
  let build: () => Grid;
  if (vision) {
    if (!front) return base;
    key = "bare";
    build = bareFront;
  } else if (style === "opus") {
    key = `dual-${front}`;
    build = front ? dualFront : dualBack;
  } else if (style === "haiku") {
    key = `rugged-${front}`;
    build = front ? ruggedFront : ruggedBack;
  } else if (style === "gpt") {
    key = `wide-${front}`;
    build = front ? wideFront : wideBack;
  } else if (variant % 9 === 4) {
    key = `terminal-${front}`;
    build = front ? terminalFront : terminalBack;
  } else {
    const kind = (["black", "silver", "black", "big", "white", "silver"] as Flat[])[variant % 6]!;
    if (kind === "big") {
      key = `big-${front}`;
      build = front ? bigFront : bigBack;
    } else {
      key = `laptop-${kind}-${front}-${front ? 0 : variant % 6}`;
      build = front ? () => laptopFront(kind) : () => laptopBack(kind, variant);
    }
  }
  const canvas = cached(`redwoods|screen|${key}`, () => sameSize(base.canvas, build()) ?? base.canvas);
  return { ...base, canvas };
}

export const SCREEN_COLORS = { bg: "#15211a", code: ["#e8c872", "#9fd08a", "#e89a6a", "#d8e0c8", "#8fc4c0"] };
