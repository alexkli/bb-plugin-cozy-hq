// Sky Loft: sit-stand desks, mesh task chairs, slim monitors and plants
// (fiddle-leaf figs, olive trees, snake plants) in concrete and ceramic pots.
import type { ChairTone, Screen } from "../../desks.ts";
import type { PlantPlacement } from "../../layout.ts";
import type { DeskStyle } from "../../model.ts";
import { Grid, OUTLINE, rng, shade } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

const DESKS: Record<DeskStyle, { top: string; hi: string; lo: string; edge: string; frame: string; frameLo: string }> = {
  default: { top: C.oak, hi: C.oakHi, lo: C.oakLo, edge: C.oakDk, frame: "#ecebe8", frameLo: "#c4c4bf" },
  sonnet: { top: C.oak, hi: C.oakHi, lo: C.oakLo, edge: C.oakDk, frame: "#ecebe8", frameLo: "#c4c4bf" },
  opus: { top: C.wal, hi: C.walHi, lo: C.walLo, edge: C.walDk, frame: C.steel, frameLo: C.steelLo },
  haiku: { top: "#f5f5f2", hi: "#ffffff", lo: "#e2e2dd", edge: "#c6c6c0", frame: "#ecebe8", frameLo: "#c4c4bf" },
  gpt: { top: "#2c2e34", hi: "#43464e", lo: "#24262b", edge: "#16171b", frame: C.steel, frameLo: C.steelLo },
  gemini: { top: "#e9ddc6", hi: "#f5eedf", lo: "#d7c9ae", edge: "#b6a584", frame: "#cdbd93", frameLo: "#a6976d" },
};

export function skylineDesk(style: DeskStyle): HTMLCanvasElement {
  const d = DESKS[style];
  // One length of a long shared bench: the top runs edge to edge so neighbours join up.
  return sprite(`desk-${style}`, 48, 32, (g) => {
    g.rect(0, 10, 48, 1, OUTLINE);
    g.rect(0, 11, 48, 14, d.top);
    g.rect(0, 11, 48, 1, d.hi);
    for (const [y, x, w] of [[14, 2, 20], [17, 20, 22], [21, 6, 14], [19, 33, 13]] as const) g.rect(x, y, w, 1, shade(d.top, -0.04));
    g.rect(0, 24, 48, 1, d.lo);
    g.rect(0, 25, 48, 1, d.edge);
    g.rect(0, 26, 48, 1, OUTLINE);
    g.rect(47, 12, 1, 12, shade(d.top, -0.08));
    // Sit-stand frame: two columns, a cable tray and T feet.
    g.rect(6, 27, 2, 4, d.frame).rect(40, 27, 2, 4, d.frame);
    g.rect(7, 27, 1, 4, d.frameLo).rect(41, 27, 1, 4, d.frameLo);
    g.rect(10, 27, 28, 1, d.frameLo);
    g.rect(3, 30, 8, 1, d.frameLo).rect(37, 30, 8, 1, d.frameLo);
    g.outline(OUTLINE);
  });
}

const TONES: Record<ChairTone, [string, string, string]> = {
  green: ["#5f8a63", "#80aa84", "#3f6243"],
  claude: ["#c4673f", "#e08a62", "#8f4528"],
  copilot: ["#6b4fc4", "#8e76e0", "#4a3590"],
  bedrock: ["#2f3e52", "#f29b38", "#1d2735"],
  codex: ["#2b2b33", "#4a4a55", "#18181d"],
  blue: ["#3e7cc4", "#6a9fde", "#2a5690"],
};

export function skylineChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const [base, hi, lo] = TONES[tone];
  const frame = "#22242a";
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    if (side === "north") {
      // Facing you: the mesh back rises behind the sitter.
      g.rrect(3, 0, 10, 7, frame, 2);
      g.rect(4, 1, 8, 5, base);
      for (let y = 2; y < 6; y += 2) for (let x = 5; x < 12; x += 2) g.set(x, y, lo);
      g.rect(4, 1, 8, 1, hi);
      g.rrect(2, 7, 12, 5, base, 1);
      g.rect(3, 7, 10, 1, hi);
      g.rect(1, 6, 2, 4, frame).rect(13, 6, 2, 4, frame);
      g.rect(7, 12, 2, 2, C.chromeLo);
      g.rect(3, 14, 10, 1, frame);
      g.set(3, 15, frame).set(12, 15, frame);
    } else {
      // Seen from behind, at the screen.
      g.rrect(3, 4, 10, 9, frame, 2);
      g.rect(4, 5, 8, 7, base);
      for (let y = 6; y < 12; y += 2) for (let x = 5 + (y % 4 ? 1 : 0); x < 12; x += 2) g.set(x, y, lo);
      g.rect(4, 5, 8, 1, hi);
      g.rect(5, 10, 6, 1, frame);
      g.rect(2, 12, 12, 1, shade(base, -0.1));
      g.rect(7, 13, 2, 1, C.chromeLo);
      g.rect(3, 14, 10, 1, frame);
      g.set(3, 15, frame).set(12, 15, frame);
    }
    g.outline(OUTLINE);
  });
}

function keyboard(g: Grid, x: number, y: number): void {
  g.rect(x, y, 11, 3, "#e3e5e8");
  for (let i = 0; i < 5; i++) g.set(x + 1 + i * 2, y + 1, "#b8bdc4");
  g.rect(x + 13, y, 3, 3, "#e3e5e8");
}

/** Slim silver monitors stand in for the old CRTs; everything else stays. */
export function skylineScreen(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean): Screen | null {
  const crt = !vision && style !== "opus" && style !== "haiku" && style !== "gpt" && variant % 9 === 4;
  if (!crt) return null;
  if (side === "south") {
    return {
      canvas: sprite("monitor-front", 16, 32, (g) => {
        g.rect(1, 1, 14, 11, "#d5dae0");
        g.rect(1, 1, 14, 1, "#eef1f4");
        g.rect(2, 2, 12, 9, "#1b1e26");
        g.rect(1, 11, 14, 1, "#c3c8cf");
        g.rect(7, 12, 2, 3, "#b9bec6");
        g.rect(4, 15, 8, 1, "#b9bec6");
        keyboard(g, 0, 18);
        g.outline(OUTLINE);
      }),
      dx: 0,
      dy: 0,
      screens: [{ x: 2, y: 2, w: 12, h: 9 }],
    };
  }
  return {
    canvas: sprite("monitor-back", 16, 32, (g) => {
      g.rect(1, 8, 14, 10, "#cfd4da");
      g.rect(1, 8, 14, 1, "#e6e9ed");
      g.rect(6, 11, 4, 3, "#e6e9ed");
      g.rect(7, 18, 2, 3, "#b9bec6");
      g.rect(4, 21, 8, 1, "#b9bec6");
      g.outline(OUTLINE);
    }),
    dx: 0,
    dy: 0,
    screens: [],
  };
}

// ------------------------------------------------------------------ plants

const FIG_LEAF = ["..##..", ".####.", "######", "######", "######", ".####.", "..##.."];

function figLeaf(g: Grid, x: number, y: number, c: string, edge: string, flip: boolean): void {
  // A broad, rounded leaf with a darker rim and a pale midrib.
  FIG_LEAF.forEach((row, j) => {
    for (let i = 0; i < 6; i++) {
      if (row[i] !== "#") continue;
      const rim = j === 0 || j === FIG_LEAF.length - 1 || row[i - 1] !== "#" || row[i + 1] !== "#";
      g.set(x + i, y + j, rim ? edge : c);
    }
  });
  const rib = shade(c, 0.28);
  for (let j = 1; j < 6; j++) g.set(x + (flip ? 3 - Math.floor(j / 3) : 2 + Math.floor(j / 3)), y + j, rib);
  g.set(x + (flip ? 4 : 1), y + 2, shade(c, 0.14));
}

function fig(): HTMLCanvasElement {
  return sprite("plant-LARGE", 32, 48, (g) => {
    // A tall concrete cylinder planter.
    g.rect(10, 34, 12, 12, "#bdb9b2");
    g.rect(10, 34, 12, 1, "#d6d2cb");
    g.rect(10, 35, 2, 11, "#cfcbc4");
    g.rect(20, 35, 2, 11, "#a6a29b");
    g.rect(11, 33, 10, 1, "#4a3a2c");
    const bark = "#6b5440";
    g.rect(15, 10, 2, 23, bark).rect(15, 10, 1, 23, "#7d6650");
    g.line(15, 24, 9, 19, bark).line(16, 21, 22, 15, bark).line(15, 15, 10, 9, bark).line(16, 13, 21, 7, bark);
    const leaves: [number, number, number][] = [
      [13, 0, 0],
      [7, 4, 0],
      [19, 3, 0],
      [3, 10, 1],
      [23, 9, 1],
      [11, 8, 1],
      [17, 12, 1],
      [6, 15, 1],
      [21, 17, 2],
      [2, 20, 2],
      [11, 19, 2],
      [17, 23, 2],
      [7, 25, 2],
    ];
    for (const [x, y, depth] of leaves) {
      const c = depth === 0 ? C.leafLo : depth === 1 ? C.leaf : C.leafHi;
      figLeaf(g, x, y, c, depth === 2 ? C.leafLo : C.leafDk, x > 14);
    }
    g.outline(OUTLINE);
  });
}

function olive(): HTMLCanvasElement {
  return sprite("plant-PLANT", 16, 32, (g) => {
    g.rect(3, 22, 10, 8, "#bdb9b2");
    g.rect(3, 22, 10, 1, "#d6d2cb");
    g.rect(3, 23, 1, 7, "#cfcbc4");
    g.rect(12, 23, 1, 7, "#a6a29b");
    g.rect(4, 21, 8, 1, "#4a3a2c");
    const bark = "#7a6a58";
    g.line(8, 21, 7, 15, bark).line(7, 16, 5, 12, bark).line(8, 17, 10, 12, bark);
    g.ellipse(5, 9, 4, 3.4, C.oliveLo);
    g.ellipse(11, 8, 3.6, 3.2, C.oliveLo);
    g.ellipse(8, 5, 3.8, 3, C.oliveLo);
    const r = rng(17);
    for (let i = 0; i < 60; i++) {
      const x = 1 + Math.floor(r() * 14);
      const y = 1 + Math.floor(r() * 12);
      if (g.get(x, y) === null) continue;
      g.set(x, y, r() < 0.45 ? C.oliveHi : C.olive);
    }
    for (const [x, y] of [[2, 6], [13, 5], [6, 2], [10, 1], [1, 10], [14, 10]] as const) g.set(x, y, C.olive);
    g.outline(OUTLINE);
  });
}

function snake(): HTMLCanvasElement {
  return sprite("plant-PLANT_2", 16, 32, (g) => {
    g.rect(3, 22, 10, 8, "#2a2c31");
    g.rect(3, 22, 10, 1, "#43464e");
    g.rect(4, 23, 1, 7, "#3a3d44");
    g.rect(4, 21, 8, 1, "#3a2c22");
    const blades: [number, number][] = [
      [3, 11],
      [5, 5],
      [7, 9],
      [9, 3],
      [11, 8],
    ];
    blades.forEach(([x, top], i) => {
      const c = i % 2 ? C.leaf : C.leafLo;
      const band = i % 2 ? C.leafHi : C.leaf;
      g.set(x, top, c);
      for (let y = top + 1; y < 21; y++) {
        g.rect(x, y, 2, 1, (y - top) % 4 === 2 ? band : c);
      }
      if (i === 0 || i === 4) g.rect(i === 0 ? x : x + 1, top + 2, 1, 21 - top - 2, "#c9c26a");
    });
    g.outline(OUTLINE);
  });
}

function cactus(): HTMLCanvasElement {
  return sprite("plant-CACTUS", 16, 32, (g) => {
    g.rect(3, 22, 10, 8, "#f1ede6");
    g.rect(3, 22, 10, 1, "#ffffff");
    for (const [x, y, c] of [[5, 25, "#c98f74"], [9, 27, "#5d6067"], [11, 24, "#9fb1a0"], [6, 28, "#8e8980"]] as const) g.set(x, y, c);
    g.rect(4, 21, 8, 1, "#4a3a2c");
    const c1 = "#5e8a5a";
    const c2 = "#7aa874";
    g.rect(6, 6, 4, 15, c1).rect(7, 6, 1, 15, c2);
    g.rect(7, 5, 2, 1, c1);
    g.rect(2, 10, 3, 7, c1).rect(3, 10, 1, 7, c2).rect(4, 15, 2, 2, c1);
    g.rect(11, 8, 3, 6, c1).rect(12, 8, 1, 6, c2).rect(10, 12, 2, 2, c1);
    g.set(8, 5, "#f2c6d4").set(7, 4, "#e99ab5");
    g.outline(OUTLINE);
  });
}

function bowl(): HTMLCanvasElement {
  return sprite("plant-POT", 16, 16, (g) => {
    g.rect(3, 8, 10, 5, "#bdb9b2");
    g.rect(3, 8, 10, 1, "#d6d2cb");
    g.rect(4, 13, 8, 1, "#a6a29b");
    g.ellipse(7.5, 7, 4.5, 1.6, "#4f6b3e");
    g.set(5, 6, C.oliveHi).set(7, 5, C.olive).set(9, 6, C.oliveHi).set(8, 4, C.oliveLo).set(6, 5, C.olive).set(10, 7, C.olive);
    g.outline(OUTLINE);
  });
}

function hanging(): HTMLCanvasElement {
  return sprite("plant-HANGING", 16, 32, (g) => {
    g.line(8, 0, 4, 9, C.brass).line(8, 0, 12, 9, C.brass);
    g.rect(3, 9, 10, 5, "#f1ede6");
    g.rect(3, 9, 10, 1, "#ffffff");
    g.rect(4, 14, 8, 1, "#d9d4cb");
    const r = rng(5);
    for (const [x0, len] of [[4, 14], [7, 10], [10, 16], [12, 9], [5, 7]] as const) {
      for (let k = 0; k < len; k++) {
        const x = x0 + Math.round(Math.sin(k * 0.7 + x0) * 1);
        const y = 13 + k;
        g.set(x, y, k % 3 === 0 ? C.leafHi : C.leaf);
        if (k % 3 === 1) g.set(x + (r() < 0.5 ? -1 : 1), y, "#8fbd73");
      }
    }
    for (let x = 3; x < 13; x += 2) g.set(x, 8, x % 4 ? C.leaf : C.leafHi);
    g.outline(OUTLINE);
  });
}

export function skylinePlant(s: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  switch (s) {
    case "LARGE_PLANT":
      return fig();
    case "PLANT":
      return olive();
    case "PLANT_2":
      return snake();
    case "CACTUS":
      return cactus();
    case "POT":
      return bowl();
    case "HANGING_PLANT":
      return hanging();
  }
  return null;
}
