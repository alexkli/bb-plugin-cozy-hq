// School scenery: classroom desks, school chairs and the class laptops and tablets.
import { Grid, makeCanvas, shade } from "../../themekit.ts";
import type { ChairTone, Screen } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { C, CRAYONS, sprite } from "./kit.ts";

// ------------------------------------------------------------------ desks

const DESK: Record<DeskStyle, { top: string; hi: string; lo: string; trim: string }> = {
  default: { top: C.maple, hi: C.mapleHi, lo: C.mapleLo, trim: C.blue },
  sonnet: { top: C.maple, hi: C.mapleHi, lo: C.mapleLo, trim: C.blue },
  opus: { top: "#8a5a3c", hi: "#a8744e", lo: "#5f3a28", trim: C.red },
  haiku: { top: "#eef1f4", hi: "#ffffff", lo: "#c9d1d9", trim: C.teal },
  gpt: { top: "#3e3e48", hi: "#5a5a66", lo: "#26262e", trim: "#18181e" },
  gemini: { top: "#f3e2bd", hi: "#fbf0d6", lo: "#d9c08e", trim: C.yellow },
};

/** A school desk: laminate top with a colored edge, a book box underneath. */
export function schoolDesk(style: DeskStyle): HTMLCanvasElement {
  const c = DESK[style] ?? DESK.default;
  return sprite(`desk-${style}`, 48, 32, (g) => {
    g.rrect(2, 11, 44, 15, c.trim, 1);
    g.rect(3, 12, 42, 13, c.top);
    g.rect(3, 12, 42, 1, c.hi);
    for (let x = 6; x < 44; x += 9) g.set(x, 16 + (x % 4), shade(c.top, -0.04));
    g.rect(2, 25, 44, 2, c.lo);
    g.rect(2, 25, 44, 1, c.trim);
    // Name tag and a pencil
    g.rect(28, 22, 11, 2, C.paper);
    g.rect(28, 22, 11, 1, "#ffffff");
    g.rect(29, 23, 2, 1, C.red).rect(32, 23, 5, 1, "#b9b0a2");
    g.rect(40, 19, 4, 1, C.yellow).set(44, 19, C.pink).set(39, 19, "#e8c9a6");
    // Book box under the top, between steel legs
    g.rect(7, 27, 34, 3, "#5a4a48");
    g.rect(7, 27, 34, 1, "#6e5c58");
    for (const [x, c] of [[10, C.red], [12, C.blue], [19, C.yellow], [27, C.green], [29, C.purple], [35, C.orange]] as const) g.rect(x, 28, 1, 2, c);
    g.rect(3, 27, 2, 5, C.steelLo).rect(43, 27, 2, 5, C.steelLo);
    g.rect(3, 27, 1, 5, C.steelHi).rect(43, 27, 1, 5, C.steelHi);
  });
}

// ------------------------------------------------------------------ chairs

const TONES: Record<ChairTone, [string, string, string]> = {
  green: [C.green, C.greenHi, C.greenLo],
  claude: ["#e07a4a", "#f2a07a", "#a8502c"],
  copilot: ["#7a5fd0", "#a48ef0", "#4f3a96"],
  bedrock: ["#2f3e52", "#f29b38", "#1c2634"],
  codex: ["#3a3a44", "#5a5a66", "#22222a"],
  blue: [C.blue, C.blueHi, C.blueLo],
};

/** A molded school chair: north chairs show their seat, south ones their backrest. */
export function schoolChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const [body, hi, lo] = TONES[tone] ?? TONES.green;
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    if (side === "north") {
      g.rrect(3, 0, 10, 7, body, 2);
      g.rect(4, 1, 8, 1, hi);
      g.rect(6, 3, 4, 1, lo);
      g.rect(2, 7, 12, 5, body);
      g.rect(3, 8, 10, 2, hi);
      g.rect(2, 11, 12, 1, lo);
      g.rect(3, 12, 1, 4, C.steelLo).rect(12, 12, 1, 4, C.steelLo);
      g.rect(5, 12, 1, 3, C.steelDk).rect(10, 12, 1, 3, C.steelDk);
    } else {
      g.rrect(3, 4, 10, 8, body, 2);
      g.rect(4, 5, 8, 1, hi);
      g.rect(6, 7, 4, 1, lo);
      g.rect(3, 11, 10, 1, lo);
      g.rect(2, 12, 12, 1, shade(body, -0.1));
      g.rect(3, 13, 1, 3, C.steelLo).rect(12, 13, 1, 3, C.steelLo);
      g.rect(5, 13, 1, 2, C.steelDk).rect(10, 13, 1, 2, C.steelDk);
    }
  });
}

// ------------------------------------------------------------------ laptops and tablets

const BUMPERS = [C.blue, C.green, C.red, C.purple, C.orange, C.teal];

function laptopFront(g: Grid, ox: number, bumper: string): void {
  g.rrect(ox + 1, 1, 16, 10, bumper, 1);
  g.rect(ox + 2, 1, 14, 1, shade(bumper, 0.3));
  g.rect(ox + 3, 2, 12, 8, "#232733");
  g.rect(ox, 11, 18, 3, "#dfe3e8");
  g.rect(ox, 11, 18, 1, "#f4f6f8");
  for (let i = 0; i < 7; i++) g.set(ox + 2 + i * 2, 12, "#b5bcc6");
  g.rect(ox, 13, 1, 1, bumper).rect(ox + 17, 13, 1, 1, bumper);
}

function laptopBack(g: Grid, ox: number, bumper: string, seed: number): void {
  g.rrect(ox + 1, 1, 16, 10, bumper, 1);
  g.rect(ox + 2, 1, 14, 1, shade(bumper, 0.3));
  g.rect(ox + 2, 9, 14, 1, shade(bumper, -0.2));
  // Stickers!
  const stickers: [number, number, string][] = [
    [4 + (seed % 3), 3, C.yellowHi],
    [10 + (seed % 2), 5, C.pink],
    [6, 7 - (seed % 2), "#ffffff"],
  ];
  const [sx, sy, sc] = stickers[0]!;
  g.set(ox + sx + 1, sy, sc).rect(ox + sx, sy + 1, 3, 1, sc).set(ox + sx, sy + 2, sc).set(ox + sx + 2, sy + 2, sc);
  const [hx, hy, hc] = stickers[1]!;
  g.set(ox + hx, hy, hc).set(ox + hx + 2, hy, hc).rect(ox + hx, hy + 1, 3, 1, hc).set(ox + hx + 1, hy + 2, hc);
  const [cx, cy, cc] = stickers[2]!;
  g.rect(ox + cx, cy, 2, 2, cc);
  g.rect(ox + 1, 11, 16, 1, "#c9ced6");
}

function tabletFront(g: Grid, ox: number, oy: number, cas: string): void {
  g.rect(ox + 4, oy, 6, 2, shade(cas, -0.15)); // handle
  g.rect(ox + 5, oy + 1, 4, 1, null);
  g.rrect(ox, oy + 2, 14, 10, cas, 2);
  g.rect(ox + 2, oy + 3, 10, 8, "#232733");
}

function tabletBack(g: Grid, ox: number, oy: number, cas: string): void {
  g.rect(ox + 4, oy, 6, 2, shade(cas, -0.15));
  g.rrect(ox, oy + 2, 14, 10, cas, 2);
  g.rect(ox + 2, oy + 3, 10, 1, shade(cas, 0.3));
  g.rect(ox + 5, oy + 6, 4, 4, shade(cas, -0.2)); // kickstand
  g.set(ox + 3, oy + 5, C.yellowHi).set(ox + 10, oy + 8, "#ffffff");
}

/** The screens on a desk; null keeps the classic one. */
export function schoolScreen(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean, classic: () => Screen): Screen | null {
  const front = side === "south";
  const key = `school-screen|${style}|${side}|${variant % 9}|${vision}`;
  const bumper = BUMPERS[variant % BUMPERS.length]!;
  if (vision) {
    // Headset on: just a notebook and a pencil on the desk.
    return front
      ? { canvas: sprite(`${key}`, 18, 12, (g) => {
          g.rect(1, 3, 14, 8, C.paper);
          g.rect(1, 3, 14, 1, C.red);
          for (let y = 5; y < 10; y += 2) g.rect(3, y, 10, 1, "#c9d8ea");
          g.vline(8, 3, 8, "#d6d0c2");
          g.rect(13, 1, 1, 6, C.yellow).set(13, 7, "#e8c9a6");
        }), dx: 0, dy: 10, screens: [] }
      : { canvas: makeCanvas(1, 1, () => undefined), dx: 0, dy: 0, screens: [] };
  }
  switch (style) {
    case "opus":
      // A laptop and a tablet.
      return front
        ? {
            canvas: sprite(key, 34, 16, (g) => {
              laptopFront(g, 0, bumper);
              tabletFront(g, 19, 2, C.orange);
            }),
            dx: -8,
            dy: 8,
            screens: [
              { x: 3, y: 2, w: 12, h: 7 },
              { x: 21, y: 5, w: 10, h: 7 },
            ],
          }
        : {
            canvas: sprite(key, 34, 16, (g) => {
              laptopBack(g, 0, bumper, variant);
              tabletBack(g, 19, 2, C.orange);
            }),
            dx: -8,
            dy: 8,
            screens: [],
          };
    case "haiku":
      // A tablet in a chunky kid-proof case.
      return front
        ? { canvas: sprite(key, 16, 14, (g) => tabletFront(g, 1, 1, CRAYONS[variant % CRAYONS.length]!)), dx: 0, dy: 10, screens: [{ x: 3, y: 4, w: 10, h: 7 }] }
        : { canvas: sprite(key, 16, 14, (g) => tabletBack(g, 1, 1, CRAYONS[variant % CRAYONS.length]!)), dx: 0, dy: 10, screens: [] };
    case "gpt":
      // A chunky all-in-one from the computer lab.
      return front
        ? {
            canvas: sprite(key, 32, 22, (g) => {
              g.rect(1, 1, 30, 12, "#e6dfcf");
              g.rect(1, 1, 30, 1, "#f6f1e6");
              g.rect(3, 2, 26, 9, "#232733");
              g.set(27, 12, "#5ad18a");
              g.rect(13, 13, 6, 2, "#cfc6b4");
              g.rect(10, 15, 12, 1, "#b9b0a0");
              g.rect(8, 17, 16, 3, "#e6dfcf");
              for (let i = 0; i < 7; i++) g.set(9 + i * 2, 18, "#b9b0a0");
              g.rect(26, 17, 3, 3, "#e6dfcf");
            }),
            dx: -8,
            dy: 4,
            screens: [{ x: 4, y: 3, w: 24, h: 7 }],
          }
        : {
            canvas: sprite(key, 32, 16, (g) => {
              g.rect(1, 1, 30, 11, "#e6dfcf");
              g.rect(1, 1, 30, 1, "#f6f1e6");
              for (let x = 6; x < 26; x += 3) g.rect(x, 4, 2, 1, "#cfc6b4");
              g.rect(14, 12, 4, 3, "#cfc6b4");
              g.set(5, 9, C.yellowHi);
            }),
            dx: -2,
            dy: 8,
            screens: [],
          };
    default: {
      if (variant % 9 === 4) return classic();
      // A class laptop in a colored bumper (stickers on the lid).
      return front
        ? { canvas: sprite(key, 18, 15, (g) => laptopFront(g, 0, bumper)), dx: -1, dy: 8, screens: [{ x: 3, y: 2, w: 12, h: 7 }] }
        : { canvas: sprite(key, 18, 13, (g) => laptopBack(g, 0, bumper, variant)), dx: -1, dy: 8, screens: [] };
    }
  }
}
