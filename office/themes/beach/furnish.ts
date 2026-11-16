// Surf Villa: plants (monstera, bird of paradise, a potted palm, agave, a
// coconut-shell succulent, macramé hangers), driftwood and bamboo desks, and
// desk chairs on bamboo legs.
import type { PlantPlacement } from "../../layout.ts";
import type { ChairTone, Screen } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { Grid, paRecolor, recolor, cached } from "../../themekit.ts";
import { C, spr, weave } from "./kit.ts";

function monsteraLeaf(g: Grid, cx: number, cy: number, rx: number, ry: number, flip = false): void {
  g.ellipse(cx, cy, rx + 0.7, ry + 0.7, C.palmDk);
  g.ellipse(cx, cy, rx, ry, C.palm);
  g.set(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.5), C.palmHi).set(Math.round(cx - rx * 0.2), Math.round(cy - ry * 0.7), C.palmHi);
  const s = flip ? -1 : 1;
  // A midrib and splits running in from the edge.
  for (let i = -Math.floor(ry); i <= Math.floor(ry); i++) g.set(Math.round(cx), Math.round(cy + i), C.palmLo);
  for (const k of [-0.45, 0.35]) {
    const yy = Math.round(cy + k * ry * 1.6);
    for (let i = 0; i < Math.max(1, Math.floor(rx) - 1); i++) {
      g.set(Math.round(cx + s * (rx - i)), yy, C.palmDk);
      g.set(Math.round(cx - s * (rx - i)), yy + 1, i === 0 ? C.palmDk : g.get(Math.round(cx - s * (rx - i)), yy + 1));
    }
  }
}

/** A long leaf from (x, y) along (dx, dy), with a midrib. */
function blade(g: Grid, x: number, y: number, dx: number, dy: number, len: number, width: number, c: string, hi: string): void {
  const n = Math.hypot(dx, dy);
  const ux = dx / n;
  const uy = dy / n;
  for (let i = 0; i <= len; i++) {
    const w = Math.sin((i / len) * Math.PI) * width;
    for (let j = -Math.ceil(w); j <= Math.ceil(w); j++) {
      if (Math.abs(j) > w + 0.3) continue;
      g.set(Math.round(x + ux * i - uy * j), Math.round(y + uy * i + ux * j), j < 0 ? hi : c);
    }
    g.set(Math.round(x + ux * i), Math.round(y + uy * i), C.palmLo);
  }
}

function plantSprite(sprite: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  switch (sprite) {
    case "PLANT":
      // A monstera in a woven basket.
      return spr("plant-monstera", 16, 32, (g) => {
        g.line(8, 22, 4, 15, C.palmLo).line(8, 22, 11, 14, C.palmLo).line(8, 22, 8, 9, C.palmLo);
        monsteraLeaf(g, 7.5, 6, 4, 3.2);
        monsteraLeaf(g, 12, 19.5, 2.2, 1.7, true);
        monsteraLeaf(g, 4, 14, 3.2, 2.8);
        monsteraLeaf(g, 11.5, 12.5, 3.2, 2.8, true);
        g.rrect(3, 22, 10, 9, C.rattan, 1);
        weave(g, 3, 23, 10, 8, C.rattan, C.rattanLo);
        g.rect(3, 22, 10, 1, C.rattanHi);
      });
    case "PLANT_2":
      // A bird of paradise in a white pot with an aqua band.
      return spr("plant-bop", 16, 32, (g) => {
        g.line(7, 23, 5, 17, C.palmLo).line(8, 23, 9, 15, C.palmLo).line(8, 23, 11, 9, "#4f7a46");
        blade(g, 5, 17, -0.4, -1, 9, 2.2, C.palm, C.palmHi);
        blade(g, 9, 15, 0.3, -1, 9, 2.2, C.palmHi, "#9ad68a");
        blade(g, 6, 21, -1, -0.55, 5, 1.6, C.palmLo, C.palm);
        blade(g, 10, 21, 1, -0.6, 4, 1.5, C.palm, C.palmHi);
        // The flower: a green beak, orange crest, blue tongue.
        g.rect(10, 9, 4, 1, "#4a6a46").set(14, 9, "#4a6a46").set(9, 10, "#4a6a46");
        g.set(11, 8, "#ff8a3d").set(12, 7, "#ffb347").set(12, 8, "#ff8a3d").set(13, 6, "#ff8a3d").set(11, 6, "#ffb347").set(13, 8, "#4a7be0").set(14, 8, "#4a7be0");
        g.rrect(4, 23, 8, 8, C.white, 1);
        g.rect(4, 25, 8, 2, C.aqua);
        g.rect(4, 23, 8, 1, C.washShade);
      });
    case "LARGE_PLANT":
      // A potted palm with arching fronds.
      return spr("plant-palm", 32, 48, (g) => {
        const cx = 16;
        const cy = 18;
        g.line(16, 36, 15, 20, C.palmLo).line(16, 36, 12, 22, C.palmLo).line(16, 36, 20, 21, C.palmLo);
        const fronds: [number, number][] = [
          [-14, 4],
          [-13, -6],
          [-6, -14],
          [3, -16],
          [11, -10],
          [14, 1],
          [-9, 11],
          [9, 12],
          [0, 8],
        ];
        for (const [i, [fx, fy]] of fronds.entries()) {
          const n = Math.max(Math.abs(fx), Math.abs(fy));
          for (let k = 1; k <= n; k++) {
            const t = k / n;
            const px = Math.round(cx + fx * t);
            const py = Math.round(cy + fy * t + t * t * 4);
            g.set(px, py, i % 2 ? C.palmHi : C.palm);
            if (k % 2 === 0 && k < n) {
              g.set(px, py + 1, C.palmLo);
              if (Math.abs(fx) > Math.abs(fy)) g.set(px, py - 1, i % 2 ? C.palm : C.palmHi);
              else g.set(px + 1, py, C.palmLo).set(px - 1, py, C.palm);
            }
          }
        }
        g.set(cx, cy, C.coconut).set(cx - 1, cy + 1, C.coconut).set(cx + 1, cy + 1, C.coconutHi);
        g.rrect(9, 36, 14, 11, C.rattan, 2);
        weave(g, 9, 37, 14, 10, C.rattan, C.rattanLo);
        g.rect(9, 36, 14, 1, C.rattanHi);
      });
    case "CACTUS":
      // An agave in a terracotta pot with a rope band.
      return spr("plant-agave", 16, 32, (g) => {
        const blade = "#6fa89a";
        const hi = "#a6d4c6";
        for (const [ex, ey] of [
          [2, 15],
          [4, 10],
          [7, 6],
          [10, 8],
          [13, 12],
          [14, 18],
          [1, 20],
        ] as const) {
          g.line(8, 22, ex, ey, blade);
          g.line(ex < 8 ? 9 : 7, 22, ex, ey + 1, ex < 8 ? hi : "#558a7e");
        }
        g.rect(6, 19, 4, 4, blade);
        g.rrect(3, 23, 10, 8, C.terracotta, 1);
        g.rect(2, 22, 12, 2, "#e88a5c");
        g.rect(3, 26, 10, 1, C.rattanLo);
        g.rect(3, 29, 10, 1, C.terracottaLo);
      });
    case "POT":
      // A coconut shell with a little succulent.
      return spr("plant-coco", 16, 16, (g) => {
        g.ellipse(8, 11, 5, 3.5, C.coconut);
        g.rect(4, 12, 2, 1, C.coconutHi).rect(9, 13, 2, 1, C.coconutHi);
        g.ellipse(8, 8.5, 4.5, 1.5, "#f4ead8");
        g.ellipse(8, 6.5, 3.5, 2.5, "#8fc49a");
        g.set(8, 3, "#8fc49a").set(5, 5, "#b8e0c0").set(11, 5, "#b8e0c0").set(8, 5, "#6aa47a").set(7, 7, "#6aa47a").set(9, 7, "#b8e0c0");
        g.set(8, 4, "#ff9fc0");
      });
    case "HANGING_PLANT":
      // A macramé hanger with trailing pothos.
      return spr("plant-macrame", 16, 32, (g) => {
        g.line(8, 0, 4, 16, C.thatchHi).line(8, 0, 12, 16, C.thatchHi).line(8, 1, 8, 16, C.thatch);
        g.set(6, 8, C.thatchLo).set(10, 8, C.thatchLo).set(8, 8, C.thatchLo).set(7, 9, C.thatch).set(9, 9, C.thatch);
        g.rect(7, 0, 3, 2, C.thatchLo);
        g.ellipse(8, 15, 5, 2, C.palm);
        g.set(5, 14, C.palmHi).set(10, 13, C.palmHi);
        g.rrect(4, 16, 8, 6, C.white, 1);
        g.rect(4, 18, 8, 1, C.aqua);
        for (const [vx, len] of [
          [4, 9],
          [6, 6],
          [9, 10],
          [12, 7],
        ] as const) {
          for (let j = 0; j < len; j++) {
            const x = vx + (Math.floor(j / 3) % 2 ? 1 : 0) - (vx > 8 ? 0 : 1);
            g.set(x, 22 + j, j % 2 ? C.palmHi : C.palm);
            if (j % 3 === 1) g.set(x + 1, 22 + j, C.palmLo);
          }
        }
      });
  }
  return null;
}

export function beachPlant(sprite: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  return plantSprite(sprite);
}

const DESK: Record<DeskStyle, Record<string, string>> = {
  // Light bamboo and driftwood for most, teak for opus, whitewash for haiku,
  // a sea-blue painted desk for gpt and pale sand for gemini.
  default: { "#885c47": "#b39a6e", "#cfa86d": "#efe0bd", "#b38857": "#dcc69a", "#532e3d": "#7a6544", "#394449": "#8a7650", "#73787e": "#c9b07a" },
  sonnet: { "#885c47": "#b39a6e", "#cfa86d": "#efe0bd", "#b38857": "#dcc69a", "#532e3d": "#7a6544", "#394449": "#8a7650", "#73787e": "#c9b07a" },
  opus: { "#885c47": "#7f4a28", "#cfa86d": "#c98a52", "#b38857": "#a8673a", "#532e3d": "#4a2614", "#394449": "#4a2614", "#73787e": "#8a5a34" },
  haiku: { "#885c47": "#c9bfae", "#cfa86d": "#ffffff", "#b38857": "#f1ece2", "#532e3d": "#8c8272", "#394449": "#8c8272", "#73787e": "#d9d2c4" },
  gpt: { "#885c47": "#1f4f66", "#cfa86d": "#4f9ab4", "#b38857": "#2f7592", "#532e3d": "#12303f", "#394449": "#12303f", "#73787e": "#3a6a80" },
  gemini: { "#885c47": "#c2a26a", "#cfa86d": "#f7e7bf", "#b38857": "#ecd39c", "#532e3d": "#7a5f33", "#394449": "#7a5f33", "#73787e": "#b8975e" },
};

export function beachDesk(style: DeskStyle): HTMLCanvasElement {
  return paRecolor("DESK_FRONT", DESK[style] ?? DESK.default);
}

/** Desk chairs keep the provider's cushion color, on bamboo legs. */
export function beachChair(tone: ChairTone, side: "north" | "south", classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return cached(`beach|chair|${tone}|${side}`, () => recolor(classic(), { "#9e9295": C.bambooLo }));
}

/** Monitors in sea-dark bezels with whitewashed keyboards. */
export function beachScreen(key: string, classic: () => Screen): Screen {
  const c = classic();
  const canvas = cached(`beach|screen|${key}`, () =>
    recolor(c.canvas, {
      "#24262e": "#1f3038",
      "#3a3d48": "#33505a",
      "#1c1e25": "#1a2a32",
      "#33363f": "#2c4650",
      "#4a4d58": "#4a6a72",
      "#c9ced6": "#ece4d0",
      "#9aa3ad": "#c4b79a",
      "#1e1e24": "#1c2c34",
      "#2a2a32": "#26363e",
      "#2e2e36": "#2a3e46",
      "#3a3a44": "#3a5058",
    }),
  );
  return { ...c, canvas };
}
