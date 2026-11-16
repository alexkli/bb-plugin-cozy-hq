// Villain's Lair: the control room consoles (desks), swivel bucket chairs,
// and tropical plants in steel pots.
import type { ChairTone } from "../../desks.ts";
import type { PlantPlacement } from "../../layout.ts";
import type { DeskStyle } from "../../model.ts";
import { Grid, OUTLINE, shade } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

const CONSOLES: Record<DeskStyle, { top: string; hi: string; lo: string; trim: string; face: string }> = {
  default: { top: C.cream, hi: C.creamHi, lo: C.creamLo, trim: C.teal, face: "#2a2e30" },
  sonnet: { top: C.cream, hi: C.creamHi, lo: C.creamLo, trim: C.orange, face: "#2a2e30" },
  opus: { top: C.mahog, hi: C.mahogHi, lo: C.mahogLo, trim: C.brass, face: "#24181a" },
  haiku: { top: "#eeeae2", hi: "#ffffff", lo: "#d2ccc0", trim: C.velvet, face: "#2a2e30" },
  gpt: { top: "#33373c", hi: "#4a4f56", lo: "#24272b", trim: C.glowGreen, face: "#141618" },
  gemini: { top: "#9fc4c0", hi: "#c2e0dc", lo: "#7aa29e", trim: C.teal, face: "#1d2a2c" },
};

/** A control console: a flat top for the screens, a front face full of lamps and switches. */
export function lairDesk(style: DeskStyle): HTMLCanvasElement {
  const d = CONSOLES[style];
  return sprite(`desk-${style}`, 48, 32, (g) => {
    g.rect(0, 10, 48, 1, OUTLINE);
    g.rect(0, 11, 48, 12, d.top);
    g.rect(0, 11, 48, 1, d.hi);
    g.rect(0, 13, 48, 1, d.trim);
    g.rect(47, 12, 1, 11, shade(d.top, -0.08));
    // The face: a row of lamps and toggles (the live office doesn't touch it).
    g.rect(0, 23, 48, 6, d.face);
    g.rect(0, 23, 48, 1, d.lo);
    const lamps = [C.glowRed, C.glowAmber, C.glowGreen, C.white, C.glowBlue];
    for (let x = 3; x < 46; x += 3) g.set(x, 25, lamps[(x * 7 + style.length) % lamps.length]!);
    for (let x = 4; x < 46; x += 6) g.rect(x, 27, 2, 1, C.steelHi);
    g.rect(0, 29, 48, 1, OUTLINE);
    g.rect(2, 30, 3, 1, C.steelDk).rect(43, 30, 3, 1, C.steelDk);
  });
}

const TONES: Record<ChairTone, [string, string, string]> = {
  green: ["#4f8a5a", "#72ad7c", "#356040"],
  claude: ["#c4673f", "#e08a62", "#8f4528"],
  copilot: ["#6b4fc4", "#8e76e0", "#4a3590"],
  bedrock: ["#2f3e52", "#f29b38", "#1d2735"],
  codex: ["#2b2b33", "#4a4a55", "#18181d"],
  blue: ["#3e7cc4", "#6a9fde", "#2a5690"],
};

/** A molded swivel bucket seat on a chrome stalk. */
export function lairChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const [base, hi, lo] = TONES[tone];
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    if (side === "north") {
      g.rrect(2, 0, 12, 9, base, 3);
      g.rect(4, 1, 8, 1, hi);
      g.rrect(4, 2, 8, 6, lo, 2);
      g.rrect(2, 7, 12, 5, base, 1);
      g.rect(3, 7, 10, 1, hi);
      g.rect(7, 12, 2, 2, C.steelHi);
      g.rect(3, 14, 10, 1, C.steelHi);
      g.set(3, 15, C.steelLo).set(12, 15, C.steelLo);
    } else {
      g.rrect(2, 3, 12, 10, base, 4);
      g.rect(4, 4, 8, 1, hi);
      g.rect(3, 11, 10, 1, lo);
      g.rect(7, 13, 2, 1, C.steelHi);
      g.rect(3, 14, 10, 1, C.steelHi);
      g.set(3, 15, C.steelLo).set(12, 15, C.steelLo);
    }
    g.outline(OUTLINE);
  });
}

function pot(g: Grid, x: number, y: number, w: number, h: number): void {
  g.rect(x, y, w, h, C.steelLo);
  g.rect(x, y, w, 1, C.steelHi);
  g.rect(x + 1, y + 2, w - 2, 1, C.hazard);
  g.rect(x, y + h - 1, w, 1, C.steelDk);
}

/** Jungle plants in steel pots: a monstera, a bird of paradise, a palm, a cactus, a fern. */
export function lairPlant(s: PlantPlacement["sprite"]): HTMLCanvasElement {
  switch (s) {
    case "LARGE_PLANT":
      return sprite("palm", 32, 48, (g) => {
        // A potted palm: a ringed trunk, fronds fanning out.
        for (let y = 14; y < 38; y++) g.set(16 + Math.round(Math.sin(y * 0.25) * 1), y, y % 3 ? "#8a6a42" : "#6a4e30");
        for (let y = 14; y < 38; y++) g.set(17 + Math.round(Math.sin(y * 0.25) * 1), y, "#a8844e");
        const fronds: [number, number][] = [[-12, 6], [-9, -2], [-3, -6], [4, -6], [10, -2], [13, 6], [7, 2], [-6, 2]];
        for (const [dx, dy] of fronds) {
          const steps = 10;
          for (let i = 0; i <= steps; i++) {
            const k = i / steps;
            const x = 16 + dx * k;
            const y = 14 + dy * k + k * k * 6;
            g.set(Math.round(x), Math.round(y), k > 0.3 ? C.leaf : C.leafLo);
            if (i > 2 && i % 2 === 0) g.set(Math.round(x), Math.round(y) + 1, C.leafHi);
            if (i > 3) g.set(Math.round(x) + (dx > 0 ? -1 : 1), Math.round(y) + 2, C.leafLo);
          }
        }
        g.set(16, 13, "#5a3a20").set(17, 14, "#5a3a20");
        pot(g, 9, 37, 14, 10);
        g.outline(OUTLINE);
      });
    case "PLANT":
      return sprite("monstera", 16, 32, (g) => {
        const leaf = (cx: number, cy: number, rx: number, ry: number) => {
          g.ellipse(cx, cy, rx, ry, C.leaf);
          g.set(Math.round(cx) - 1, Math.round(cy), C.leafDk).set(Math.round(cx) + 1, Math.round(cy) + 1, C.leafDk);
          g.set(Math.round(cx - rx / 2), Math.round(cy - ry / 2), C.leafHi);
        };
        g.vline(7, 12, 10, C.leafLo).vline(9, 14, 8, C.leafLo);
        leaf(5, 10, 4, 3);
        leaf(11, 8, 4, 3.5);
        leaf(8, 16, 4, 3);
        leaf(3, 17, 2.5, 2);
        pot(g, 3, 22, 10, 9);
        g.outline(OUTLINE);
      });
    case "PLANT_2":
      return sprite("paradise", 16, 32, (g) => {
        // A bird of paradise: tall paddle leaves and an orange flower.
        for (const [x, top] of [[5, 6], [8, 3], [11, 7]] as const) {
          g.vline(x, top + 4, 22 - top - 4, C.leafLo);
          g.rect(x - 1, top, 3, 6, C.leaf).set(x - 1, top, C.leafHi);
        }
        g.vline(9, 9, 13, C.leafLo);
        g.rect(9, 7, 4, 2, C.orange).set(13, 6, "#4a6ad0").set(12, 6, C.orange);
        pot(g, 3, 22, 10, 9);
        g.outline(OUTLINE);
      });
    case "CACTUS":
      return sprite("cactus", 16, 32, (g) => {
        g.rect(6, 6, 4, 17, C.leaf).rect(7, 6, 1, 17, C.leafHi);
        g.rect(2, 11, 3, 6, C.leaf).rect(2, 16, 4, 2, C.leaf).rect(11, 9, 3, 5, C.leaf).rect(10, 13, 4, 2, C.leaf);
        g.set(7, 5, C.velvetHi).set(8, 5, C.velvetHi);
        pot(g, 3, 22, 10, 9);
        g.outline(OUTLINE);
      });
    case "POT":
      return sprite("fernpot", 16, 16, (g) => {
        for (let i = 0; i < 6; i++) g.line(8, 9, 2 + i * 2.4, 2 + (i % 2) * 2, i % 2 ? C.leaf : C.leafHi);
        pot(g, 4, 9, 8, 6);
        g.outline(OUTLINE);
      });
    case "HANGING_PLANT":
      return sprite("hangfern", 16, 32, (g) => {
        g.vline(8, 0, 6, C.steelLo);
        g.rect(4, 6, 8, 4, C.steelLo).rect(4, 6, 8, 1, C.steelHi);
        for (let i = 0; i < 7; i++) {
          const x = 3 + i * 1.6;
          for (let y = 10; y < 12 + ((i * 5) % 14); y++) g.set(Math.round(x + Math.sin(y * 0.5) * 0.6), y, y % 3 ? C.leaf : C.leafHi);
        }
        g.outline(OUTLINE);
      });
  }
}
