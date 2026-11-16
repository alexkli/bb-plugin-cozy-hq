// Neon City workstations and plants: black glass desks with a neon rim per
// model, chairs lit in the provider's color, holo keyboards, and
// bioluminescent plants.
import type { ChairTone, Screen } from "../../desks.ts";
import type { PlantPlacement } from "../../layout.ts";
import type { DeskStyle } from "../../model.ts";
import { cached, hsl, mapPixels, pa, paRecolor, parseColor } from "../../themekit.ts";
import { hslOf, P } from "./kit.ts";

// DESK_FRONT palette: top #b38857, rim #cfa86d, front #885c47, base #532e3d, legs #394449 / #73787e.
const DESKS: Record<DeskStyle, { top: string; rim: string; front: string; base: string }> = {
  default: { top: "#2e2852", rim: P.cyan, front: "#1e1938", base: "#0e0b1a" },
  sonnet: { top: "#322a5a", rim: P.vio, front: "#211a40", base: "#0e0b1a" },
  opus: { top: "#3e1a48", rim: P.mag, front: "#2a1032", base: "#12081a" },
  haiku: { top: "#5a5a84", rim: P.chromeHi, front: "#3c3c62", base: "#1a1a32" },
  gpt: { top: "#18181f", rim: "#e6e9f4", front: "#0f0f14", base: "#050508" },
  gemini: { top: "#3e3218", rim: P.yel, front: "#2a2010", base: "#120e06" },
};

export function neonDesk(style: DeskStyle): HTMLCanvasElement {
  const d = DESKS[style] ?? DESKS.default;
  return paRecolor("DESK_FRONT", { "#b38857": d.top, "#cfa86d": d.rim, "#885c47": d.front, "#532e3d": d.base, "#394449": "#0b0916", "#73787e": "#3a3458" });
}

// CUSHIONED_CHAIR palette: body #487841, highlight #6fa374, dark #173115, legs #9e9295.
const CHAIRS: Record<ChairTone, string> = {
  green: P.lime,
  claude: P.orange,
  copilot: P.vio,
  bedrock: P.yel,
  codex: "#cfd6ff",
  blue: P.cyan,
};

export function neonChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const glow = CHAIRS[tone] ?? P.lime;
  const [h] = hslOf(glow);
  const body = tone === "codex" ? "#23233a" : hsl(Math.round(h), 45, 17);
  const name = side === "north" ? "CUSHIONED_CHAIR_FRONT" : "CUSHIONED_CHAIR_BACK";
  return paRecolor(name, { "#487841": body, "#6fa374": glow, "#173115": "#0b0916", "#9e9295": "#4c4670" });
}

const near = (r: number, g: number, b: number, c: string) => {
  const [cr, cg, cb] = parseColor(c);
  return Math.abs(r - cr) + Math.abs(g - cg) + Math.abs(b - cb) < 6;
};

/**
 * Monitors: dark bezels with a neon top edge, holo keyboards. Keeps the
 * classic geometry (and so where the live screens go).
 */
export function neonScreen(style: DeskStyle, side: "north" | "south", classic: () => Screen): Screen {
  const s = classic();
  const front = side === "south";
  const edge = style === "opus" ? P.mag : style === "gemini" ? P.yel : style === "haiku" ? P.chromeHi : P.cyan;
  const kbTop = s.canvas.height - 15;
  // The office builds each screen once per desk style, side and variant.
  const canvas = mapPixels(s.canvas, (r, g, b, a, _x, y) => {
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    const isKb = front && style !== "haiku" && y >= kbTop && s.canvas.height >= 30;
    if (near(r, g, b, "#2a1e2e")) return [r, g, b, a];
    if (near(r, g, b, "#1b1e26") || near(r, g, b, "#232733")) return [12, 10, 24, a];
    if (isKb) {
      // Holo keys: a cyan grid floating over the desk.
      if (lum > 150) return [24, 96, 120, a];
      if (lum > 110) return [46, 242, 255, a];
      return [20, 60, 80, a];
    }
    if (style === "haiku") {
      if (near(r, g, b, "#b5bcc6")) return [46, 242, 255, a];
      if (near(r, g, b, "#ffffff")) return [255, 47, 168, a];
    }
    // A neon edge along the top of each monitor.
    if (lum > 40 && y <= 2) {
      const [er, eg, eb] = parseColor(edge);
      return [er, eg, eb, a];
    }
    if (near(r, g, b, "#fbfcfd")) {
      const [er, eg, eb] = parseColor(edge);
      return [er, eg, eb, a];
    }
    // Everything else: dark gunmetal by brightness.
    const k = Math.min(1, lum / 255);
    return [34 + k * 90, 30 + k * 82, 62 + k * 120, a];
  });
  return { ...s, canvas };
}

// ------------------------------------------------------------------ plants

/** Bioluminescent leaves (by lightness) in a few hues. */
const BIO: Record<string, string[]> = {
  teal: ["#0d3a40", "#127068", "#1fb8a0", "#5affd8", "#c8fff2"],
  violet: ["#24104a", "#4a1f8a", "#7a3ad0", "#b77aff", "#ead2ff"],
  magenta: ["#3a0a30", "#7a1460", "#c0207f", "#ff5ac0", "#ffd0ee"],
  cyan: ["#0a2a4a", "#13608a", "#1fa8d0", "#5ae6ff", "#d0faff"],
};

function bio(src: HTMLCanvasElement, leaf: string[], potRim: string): HTMLCanvasElement {
  return mapPixels(src, (r, g, b, a) => {
    const [h, s, l] = hslOf(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
    if (h >= 55 && h <= 175 && s > 0.15) {
      const i = Math.max(0, Math.min(leaf.length - 1, Math.round(l * 1.35 * (leaf.length - 1))));
      const [nr, ng, nb] = parseColor(leaf[i]!);
      return [nr, ng, nb, a];
    }
    // Pots (browns and greys): dark steel, with the lightest tone as a neon rim.
    if (l > 0.42) {
      const [nr, ng, nb] = parseColor(potRim);
      return [nr, ng, nb, a];
    }
    const k = l * 0.9;
    return [14 + k * 60, 12 + k * 52, 26 + k * 90, a];
  });
}

export function neonPlant(sprite: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  return cached(`neon|plant|${sprite}`, () => {
    switch (sprite) {
      case "PLANT":
        return bio(pa("PLANT"), BIO.teal!, P.cyan);
      case "PLANT_2":
        return bio(pa("PLANT_2"), BIO.violet!, P.mag);
      case "LARGE_PLANT":
        return bio(pa("LARGE_PLANT"), BIO.cyan!, P.vio);
      case "CACTUS":
        return bio(pa("CACTUS"), BIO.magenta!, P.cyan);
      case "POT": {
        // A dark pot with a tuft of glowing moss.
        const c = bio(pa("POT"), BIO.teal!, P.mag);
        const ctx = c.getContext("2d")!;
        const moss = ["#127068", "#1fb8a0", "#5affd8"];
        for (let x = 4; x < 12; x++) {
          const h = 1 + ((x * 5) % 3);
          ctx.fillStyle = moss[x % 3]!;
          ctx.fillRect(x, 6 - h, 1, h);
        }
        ctx.fillStyle = "#c8fff2";
        ctx.fillRect(6, 3, 1, 1);
        ctx.fillRect(9, 4, 1, 1);
        return c;
      }
      case "HANGING_PLANT":
        return bio(pa("HANGING_PLANT"), BIO.teal!, P.vio);
    }
  });
}
