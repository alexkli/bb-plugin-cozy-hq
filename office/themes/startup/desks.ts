// Startup House: the workstations. Nobody bought matching desks: a white
// folding table, a door on sawhorses, the old dining table, a card table, a
// glass gaming desk, plywood on milk crates; gaming chairs in every color; and
// laptops plastered with stickers. Monitors stay classic (they're the same
// monitors everyone has), with a sticker or two on the back.

import type { DeskStyle } from "../../model.ts";
import type { ChairTone } from "../../desks.ts";
import type { Screen } from "../../desks.ts";
import { cached, Grid, hash, makeCanvas, shade } from "../../themekit.ts";
import { C, CANS, can, sprite, STICKERS } from "./kit.ts";

/** Legs: two pairs (folding steel, sawhorses, crates, trestles) under a 48×32 desk. */
function legs(g: Grid, kind: "steel" | "saw" | "crate" | "wood" | "glass"): void {
  switch (kind) {
    case "steel":
      g.rect(4, 26, 1, 5, C.steelLo).rect(43, 26, 1, 5, C.steelLo).rect(6, 26, 1, 5, C.steelDk).rect(41, 26, 1, 5, C.steelDk);
      g.rect(4, 30, 3, 1, C.steelDk).rect(41, 30, 3, 1, C.steelDk);
      break;
    case "saw":
      for (const x of [6, 40]) {
        g.line(x, 26, x - 3, 31, "#c9a060").line(x + 2, 26, x + 5, 31, "#c9a060");
        g.rect(x - 1, 26, 5, 1, "#a87e48");
      }
      break;
    case "crate":
      for (const x of [3, 33]) {
        g.rect(x, 25, 12, 6, "#2f6ec4");
        g.rect(x, 25, 12, 1, "#4f8ee4");
        for (let i = x + 2; i < x + 11; i += 3) g.vline(i, 26, 4, "#1f4e94");
      }
      break;
    case "wood":
      g.rect(4, 26, 3, 5, C.woodLo).rect(41, 26, 3, 5, C.woodLo);
      g.set(4, 26, C.wood).set(41, 26, C.wood);
      break;
    case "glass":
      g.rect(5, 26, 2, 5, "#2e2c36").rect(41, 26, 2, 5, "#2e2c36");
      g.rect(5, 26, 2, 1, C.red).rect(41, 26, 2, 1, C.red);
      break;
  }
}

/** A desk top from x 2..45, y 11..25 (the classic desk's footprint). */
function top(g: Grid, base: string, hi: string, lo: string, edge: string): void {
  g.rect(2, 11, 44, 14, base);
  g.rect(2, 11, 44, 1, hi);
  g.rect(2, 24, 44, 1, lo);
  g.rect(2, 25, 44, 1, edge);
}

export function startupDesk(style: DeskStyle): HTMLCanvasElement {
  return sprite(`desk-${style}`, 48, 32, (g) => {
    switch (style) {
      case "opus":
        // An old paneled door on sawhorses, the knob hole plugged with a cork.
        top(g, "#d9b483", "#ecd0a4", "#b8925c", "#8a6a3e");
        g.rect(5, 13, 17, 9, "#cfa874").rect(26, 13, 17, 9, "#cfa874");
        g.rect(5, 13, 17, 1, "#c09668").rect(26, 13, 17, 1, "#c09668");
        g.rect(44, 17, 1, 2, "#8a5a34");
        legs(g, "saw");
        break;
      case "sonnet":
        // The old dining table, rings from a thousand mugs.
        top(g, C.wood, C.woodHi, C.woodLo, C.woodDk);
        for (let y = 13; y < 24; y += 3) g.rect(3, y, 42, 1, shade(C.wood, -0.05));
        g.rect(30, 15, 4, 1, C.woodLo).rect(29, 16, 1, 2, C.woodLo).rect(34, 16, 1, 2, C.woodLo).rect(30, 18, 4, 1, C.woodLo);
        legs(g, "wood");
        break;
      case "haiku":
        // A card table with green felt, wobbly.
        top(g, "#3f8a5a", "#5aa874", "#2f6a44", "#2e2c36");
        g.rect(3, 12, 42, 12, "#4a9a66");
        g.rect(3, 12, 42, 1, "#5aa874");
        legs(g, "steel");
        break;
      case "gpt":
        // A black glass gaming desk with an RGB strip.
        top(g, "#2e2c36", "#4a4856", "#22222a", "#1a1a22");
        g.rect(3, 12, 6, 1, "#5a5866");
        for (let x = 2; x < 46; x++) g.set(x, 25, STICKERS[Math.floor(x / 6) % STICKERS.length]!);
        legs(g, "glass");
        break;
      case "gemini":
        // A sheet of plywood on milk crates.
        top(g, "#e0c08a", "#f0d4a4", "#c4a06a", "#a88450");
        for (const [x, y] of [[8, 14], [30, 19], [40, 13]] as const) g.rect(x, y, 3, 1, "#c4a06a");
        legs(g, "crate");
        break;
      default:
        // A white plastic folding table.
        top(g, C.plastic, "#ffffff", C.plasticLo, "#b8b4a8");
        for (let x = 4; x < 44; x += 6) g.set(x, 18, "#e8e4da");
        legs(g, "steel");
        break;
    }
    // A can or two on most desks, and a sticker on the edge.
    const h = hash(`desk-${style}`);
    can(g, 40 - (h % 6), 13, CANS[h % CANS.length]!);
  });
}

/** Gaming chairs in the provider's color (16×16). North chairs face you; south ones show their back. */
export function startupChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const colors: Record<ChairTone, [string, string]> = {
    green: ["#3f8a5a", "#5aa874"],
    claude: ["#c4673f", "#e8936a"],
    copilot: ["#6b4fc4", "#9b84e6"],
    bedrock: ["#2f3e52", "#f29b38"],
    codex: ["#2b2b33", "#55555f"],
    blue: ["#3e7cc4", "#7fb3e6"],
  };
  const [body, stripe] = colors[tone];
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    const dark = shade(body, -0.35);
    if (side === "north") {
      // Facing you: the headrest and wings up top, the seat below.
      g.rrect(3, 0, 10, 9, body, 2);
      g.rect(4, 1, 8, 1, shade(body, 0.2));
      g.rect(4, 3, 2, 5, stripe).rect(10, 3, 2, 5, stripe);
      g.rrect(2, 8, 12, 5, body, 1);
      g.rect(3, 9, 10, 1, shade(body, 0.2));
      g.rect(1, 9, 1, 3, dark).rect(14, 9, 1, 3, dark);
      g.vline(7, 13, 2, C.steelDk).vline(8, 13, 2, C.steelDk);
      g.set(3, 15, "#1a1a22").set(12, 15, "#1a1a22").set(7, 15, "#1a1a22");
    } else {
      // From behind: the tall back toward you.
      g.rrect(3, 3, 10, 10, body, 2);
      g.rect(4, 4, 8, 1, shade(body, 0.2));
      g.rect(7, 5, 2, 7, stripe);
      g.rect(2, 11, 12, 2, dark);
      g.vline(7, 13, 2, C.steelDk).vline(8, 13, 2, C.steelDk);
      g.set(3, 15, "#1a1a22").set(12, 15, "#1a1a22").set(7, 15, "#1a1a22");
    }
  });
}

/** The classic screens, with stickers on the laptop lids and a note on some monitor backs. */
export function startupScreen(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean, classic: () => Screen): Screen {
  const s = classic();
  if (side !== "north" || vision) return s;
  const key = `startup|screen|${style}|${variant % 9}`;
  const canvas = cached(key, () =>
    makeCanvas(s.canvas.width, s.canvas.height, (ctx) => {
      ctx.drawImage(s.canvas, 0, 0);
      const px = (x: number, y: number, c: string, w = 2, h = 2) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, h);
      };
      const h = hash(key);
      if (style === "haiku") {
        // The laptop lid: stickers all over.
        px(4, 3, STICKERS[h % 8]!, 3, 2);
        px(10, 5, STICKERS[(h >> 3) % 8]!, 2, 3);
        px(6, 7, STICKERS[(h >> 6) % 8]!, 3, 2);
        px(12, 2, "#ffffff", 2, 2);
        px(13, 3, STICKERS[(h >> 9) % 8]!, 1, 1);
      } else if (h % 3 === 0) {
        // A sticky note on the back of the monitor.
        px(3, 2, "#fff3a3", 4, 3);
        px(4, 3, "#c9a440", 2, 1);
      } else if (h % 3 === 1) {
        px(4, 3, STICKERS[h % 8]!, 2, 2);
      }
    }),
  );
  return { ...s, canvas };
}

/** The speakers beside the TV: a tower speaker and one perched on a milk crate (12×28). */
export function startupSpeaker(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rect(1, 1, 10, 18, "#2e2c36");
    g.rect(2, 2, 8, 1, "#4a4856");
    g.ellipse(5.5, 6, 2.5, 2.5, "#1a1a22");
    g.set(5, 6, "#5a5866");
    g.ellipse(5.5, 13, 3.5, 3.5, "#1a1a22");
    g.ellipse(5.5, 13, 1.5, 1.5, "#4a4856");
    // The milk crate under it.
    g.rect(1, 19, 10, 8, "#c4483a");
    g.rect(1, 19, 10, 1, "#e06a5a");
    for (let x = 2; x < 11; x += 3) g.vline(x, 21, 5, "#8a2a24");
  });
}

