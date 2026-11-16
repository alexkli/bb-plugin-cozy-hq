// Coffee Shop: the workplaces. The desks themselves are the café's tables
// (drawn in live.ts, a two-top, a four-top or the long communal table under
// each group of desks, the window bar's plank under the windows), so the desk
// sprite is empty; on the table each worker has a laptop in the color of their
// model, with stickers, and a cup (a latte, an espresso, a pot of tea, a
// croissant). Bentwood café chairs with a seat cushion in the provider's color.
import type { ChairTone, Screen } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { makeCanvas } from "../../themekit.ts";
import { C, memo, sprite } from "./kit.ts";

/** The table is drawn by the café: an empty 48×32 desk keeps the office's geometry. */
export function cafeDesk(style: DeskStyle): HTMLCanvasElement {
  return sprite(`desk-${style}`, 48, 32, () => undefined, false);
}

const CUSHION: Record<ChairTone, [string, string]> = {
  green: [C.velvet, C.velvetHi],
  claude: ["#c4673f", "#e08a60"],
  copilot: ["#6b4fc4", "#8d74e0"],
  bedrock: ["#d98a2a", "#f0aa50"],
  codex: ["#3a3d46", "#565a66"],
  blue: ["#3e7cc4", "#62a0e0"],
};

export function cafeChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const [c, hi] = CUSHION[tone];
  const w = C.walnut;
  const wl = C.walnutLo;
  const wh = C.walnutHi;
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    if (side === "north") {
      // Facing you: the bent hoop of the back behind the seat, the cushion in front.
      g.rect(3, 0, 10, 1, wh).rect(2, 1, 1, 8, w).rect(13, 1, 1, 8, w);
      g.rect(3, 1, 10, 1, w).vline(6, 2, 6, wl).vline(9, 2, 6, wl);
      g.rect(2, 8, 12, 4, w).rect(3, 8, 10, 3, c).rect(3, 8, 10, 1, hi);
      g.rect(3, 12, 1, 4, wl).rect(12, 12, 1, 4, wl).rect(5, 12, 1, 3, wl).rect(10, 12, 1, 3, wl);
      g.rect(4, 14, 8, 1, wl);
    } else {
      // From behind: the bentwood hoop over the seat.
      g.rect(2, 9, 12, 3, w).rect(3, 9, 10, 2, c).rect(3, 9, 10, 1, hi);
      g.rect(4, 1, 8, 1, wh).rect(3, 2, 1, 8, w).rect(12, 2, 1, 8, w).rect(4, 2, 8, 1, w);
      g.vline(7, 3, 6, wl).vline(8, 3, 6, wl);
      g.rect(3, 12, 1, 4, wl).rect(12, 12, 1, 4, wl).rect(5, 12, 1, 3, wl).rect(10, 12, 1, 3, wl);
      g.rect(4, 14, 8, 1, wl);
    }
  });
}

/** Lid colors by model: [lid, lid light, lid dark]. */
const LID: Record<DeskStyle, [string, string, string]> = {
  default: ["#c9ced6", "#e6e9ee", "#9aa3ad"],
  sonnet: ["#c9ced6", "#e6e9ee", "#9aa3ad"],
  opus: ["#5d6068", "#7a7e88", "#43464d"],
  haiku: ["#eef0f2", "#ffffff", "#c8ccd2"],
  gpt: ["#2a2a30", "#45454e", "#18181c"],
  gemini: ["#e2c48e", "#f2dcb0", "#b8985e"],
};

const STICKERS = ["#f2a7b8", "#9fd0e6", "#f4dc8a", "#b3dfa0", "#e5544b", "#ff9a3d", "#b48cff"];

type Side = "north" | "south";

/** What else is on the table by a laptop, by desk. */
type Thing = "latte" | "espresso" | "tea" | "croissant" | "water" | "notebook" | "none";
const THINGS: Thing[] = ["latte", "espresso", "tea", "latte", "croissant", "water", "notebook", "latte", "none"];

function drawThing(ctx: CanvasRenderingContext2D, thing: Thing, x: number, y: number): void {
  const px = (xx: number, yy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + xx, y + yy, w, h);
  };
  const O = "#2a1e2e";
  switch (thing) {
    case "latte":
      // A wide cup and saucer seen from above-ish: the foam with a heart.
      px(0, 4, 8, 3, O);
      px(1, 5, 6, 1, C.cream);
      px(1, 0, 6, 5, O);
      px(2, 1, 4, 3, C.cream);
      px(2, 1, 4, 1, C.crema);
      px(3, 2, 2, 1, C.cream);
      px(7, 1, 1, 2, O);
      break;
    case "espresso":
      px(1, 3, 6, 3, O);
      px(2, 4, 4, 1, C.cream);
      px(2, 0, 4, 4, O);
      px(3, 1, 2, 2, C.crema);
      break;
    case "tea":
      // A little teapot.
      px(1, 1, 6, 5, O);
      px(2, 2, 4, 3, C.green);
      px(2, 2, 4, 1, C.greenHi);
      px(0, 2, 1, 2, O);
      px(7, 3, 1, 1, O);
      px(3, 0, 2, 1, O);
      break;
    case "croissant":
      px(0, 2, 9, 4, O);
      px(1, 3, 7, 2, C.crema);
      px(2, 2, 5, 1, O);
      px(3, 3, 1, 1, C.mustardHi);
      px(5, 3, 1, 1, C.mustardHi);
      break;
    case "water":
      px(1, 0, 4, 6, O);
      px(2, 1, 2, 4, "#bfe3ee");
      px(2, 1, 1, 1, "#ffffff");
      break;
    case "notebook":
      px(0, 1, 8, 6, O);
      px(1, 2, 6, 4, C.paper);
      px(1, 3, 5, 1, C.vein);
      px(1, 5, 4, 1, C.vein);
      px(6, 0, 1, 6, C.rust);
      break;
    case "none":
      break;
  }
}

function laptopBack(ctx: CanvasRenderingContext2D, style: DeskStyle, variant: number, x: number, y: number): void {
  const [lid, hi, lo] = LID[style];
  const O = "#2a1e2e";
  ctx.fillStyle = O;
  ctx.fillRect(x, y, 16, 11);
  ctx.fillStyle = lid;
  ctx.fillRect(x + 1, y + 1, 14, 8);
  ctx.fillStyle = hi;
  ctx.fillRect(x + 1, y + 1, 14, 1);
  ctx.fillStyle = lo;
  ctx.fillRect(x + 1, y + 8, 14, 1);
  // The hinge and the keyboard's edge behind the lid.
  ctx.fillStyle = "#8a8f98";
  ctx.fillRect(x + 1, y + 9, 14, 1);
  // A glowing dot on the lid, and stickers.
  ctx.fillStyle = style === "gpt" || style === "opus" ? "#d9dde3" : "#ffffff";
  ctx.fillRect(x + 7, y + 4, 2, 2);
  const n = variant % 4;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = STICKERS[(variant + i * 3) % STICKERS.length]!;
    const sx = x + 2 + ((variant * 5 + i * 7) % 11);
    const sy = y + 2 + ((variant * 3 + i * 4) % 5);
    if (sx >= x + 6 && sx <= x + 9 && sy >= y + 3 && sy <= y + 6) continue;
    ctx.fillRect(sx, sy, 2, 2);
  }
}

function laptopFront(ctx: CanvasRenderingContext2D, style: DeskStyle, x: number, y: number): void {
  const [lid, hi, lo] = LID[style];
  const O = "#2a1e2e";
  // The screen (the office draws on it), then the keyboard deck toward you.
  ctx.fillStyle = O;
  ctx.fillRect(x, y, 18, 14);
  ctx.fillStyle = lid;
  ctx.fillRect(x + 1, y + 1, 16, 9);
  ctx.fillStyle = "#1d1a22";
  ctx.fillRect(x + 2, y + 2, 14, 7);
  ctx.fillStyle = hi;
  ctx.fillRect(x + 1, y + 10, 16, 3);
  ctx.fillStyle = lo;
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + i * 2, y + 11, 1, 1);
  ctx.fillRect(x + 7, y + 12, 4, 1);
}

export function cafeScreen(style: DeskStyle, side: Side, variant: number, vision: boolean): Screen {
  const thing = THINGS[variant % THINGS.length]!;
  const key = `screen-${style}-${side}-${variant % 9}-${vision ? 1 : 0}`;
  if (side === "north") {
    // Seen from behind the lid: the laptop in the middle of the table's far half, a cup beside it.
    const canvas = memo(key, () =>
      makeCanvas(30, 14, (ctx) => {
        if (!vision) laptopBack(ctx, style, variant, 7, 1);
        drawThing(ctx, thing, vision ? 11 : 22, 4);
      }),
    );
    return { canvas, dx: 11, dy: 10, screens: [] };
  }
  const canvas = memo(key, () =>
    makeCanvas(30, 15, (ctx) => {
      drawThing(ctx, thing, vision ? 11 : 0, 6);
      if (!vision) laptopFront(ctx, style, 10, 0);
    }),
  );
  return { canvas, dx: -11, dy: 6, screens: vision ? [] : [{ x: 12, y: 2, w: 14, h: 7 }] };
}

/** Small walnut bookshelf speakers on brackets beside the specials screen. */
export function cafeSpeaker(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rect(1, 6, 10, 16, C.walnut).rect(1, 6, 10, 1, C.walnutHi).vline(1, 6, 16, C.walnutHi);
    g.rect(3, 8, 6, 6, C.iron).rect(4, 9, 4, 4, C.ironHi).set(5, 10, C.iron).set(6, 11, C.iron);
    g.rect(4, 16, 4, 4, C.iron).set(5, 17, C.ironHi);
    g.rect(4, 22, 4, 2, C.brassLo).rect(2, 24, 8, 1, C.brassLo);
  });
}
