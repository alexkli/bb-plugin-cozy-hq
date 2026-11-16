// Startup House: where the overflow works. The seats of the squeeze-ins
// (./squeeze.ts): the old futon behind the couch, floor cushions, beanbags,
// camping chairs, kitchen stools, pool loungers and beach towels, a closed
// laptop left on some of the empty ones; and on whoever's typing there, a
// laptop on the lap, its screen lighting up their face (and the room at
// night).

import type { Drawable, Light, PaintInfo } from "../../theme.ts";
import type { Look } from "../../characters.ts";
import type { Layout } from "../../layout.ts";
import { shade } from "../../themekit.ts";
import { C, ih, OUTLINE, sprite, STICKERS } from "./kit.ts";
import { planOf } from "./plan.ts";
import { LIFT, NOOK, type Nook, type NookSeat } from "./squeeze.ts";

type Ctx = CanvasRenderingContext2D;

const px = (ctx: Ctx, c: string, x: number, y: number, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

// ------------------------------------------------------------------ seats

const CUSHIONS = ["#e8a838", "#3fa8a0", "#e86a5a", "#7a6ad8"];
const BAGS = ["#4a8fe0", "#ff9a3d", "#ff5fa2", "#4cc27a"];
const CANVAS = ["#3f8a4a", "#2f6a9a", "#c8483a", "#e8a838"];
const TOWELS: [string, string][] = [["#43d1f0", "#ffffff"], ["#ffd84a", "#ff9a3d"], ["#ff5fa2", "#ffffff"], ["#4cc27a", "#f4f2ea"]];

/** A white plastic pool lounger, the back propped up behind whoever's on it (14×28). */
export function lounger(): HTMLCanvasElement {
  return sprite("lounger", 14, 28, (g) => {
    g.rrect(1, 0, 12, 10, "#f4f2ea", 2);
    for (let y = 2; y < 9; y += 2) g.rect(2, y, 10, 1, "#d8d4c8");
    g.rect(1, 10, 12, 16, "#f4f2ea");
    for (let y = 11; y < 25; y += 2) g.rect(2, y, 10, 1, "#d8d4c8");
    // A towel draped over it.
    g.rect(3, 12, 8, 9, "#ff5fa2").rect(3, 14, 8, 1, "#ffffff").rect(3, 17, 8, 1, "#ffffff");
    g.set(1, 26, "#b8b4a8").set(12, 26, "#b8b4a8");
  });
}

/** A square floor cushion (16×8). */
function cushion(v: number): HTMLCanvasElement {
  const c = CUSHIONS[v % CUSHIONS.length]!;
  return sprite(`nook-cushion-${v % CUSHIONS.length}`, 18, 8, (g) => {
    g.rrect(1, 1, 16, 5, c, 1);
    g.rect(2, 1, 14, 1, shade(c, 0.25));
    g.rect(1, 5, 16, 1, shade(c, -0.25));
    g.set(8, 3, shade(c, -0.3)).set(9, 3, shade(c, -0.3));
  });
}

/** A beanbag slumped around whoever sinks into it (22×17). */
function beanbag(v: number): HTMLCanvasElement {
  const c = BAGS[v % BAGS.length]!;
  return sprite(`nook-beanbag-${v % BAGS.length}`, 24, 17, (g) => {
    g.ellipse(12, 10, 10.5, 6, c);
    g.ellipse(12, 6, 8, 5, c);
    g.ellipse(9, 4, 4, 2, shade(c, 0.22));
    g.rect(4, 14, 16, 1, shade(c, -0.25));
    g.set(19, 9, shade(c, 0.22)).set(18, 10, shade(c, 0.22));
  });
}

/** A folding camping chair: the canvas sling and back, a cup holder on the arm, the X legs (18×24). */
function campChair(v: number): HTMLCanvasElement {
  const c = CANVAS[v % CANVAS.length]!;
  return sprite(`nook-camp-${v % CANVAS.length}`, 19, 24, (g) => {
    const frame = "#3a3a44";
    // The back (wider than whoever sits in it), the armrests, the seat sling.
    g.rect(1, 3, 16, 10, c);
    g.rect(1, 3, 16, 1, shade(c, 0.25));
    g.rect(1, 7, 16, 1, shade(c, -0.15));
    g.vline(1, 3, 10, frame).vline(16, 3, 10, frame);
    g.rect(0, 9, 3, 2, frame).rect(15, 9, 3, 2, frame);
    g.rect(3, 13, 12, 3, shade(c, -0.2));
    // The cup holder, with a can in it.
    g.rect(16, 6, 2, 3, "#2fb8f0").set(16, 6, "#e6e9ee").set(17, 6, "#e6e9ee");
    // The X legs.
    g.line(3, 16, 14, 22, frame).line(14, 16, 3, 22, frame);
    g.set(3, 22, frame).set(14, 22, frame);
  });
}

/** A kitchen stool (12×13). */
function stool(): HTMLCanvasElement {
  return sprite("nook-stool", 14, 13, (g) => {
    g.ellipse(7, 2.5, 5.5, 1.8, C.wood);
    g.rect(3, 1, 8, 1, C.woodHi);
    g.rect(2, 4, 10, 1, C.woodLo);
    g.vline(3, 5, 7, C.woodDk).vline(10, 5, 7, C.woodDk);
    g.vline(6, 5, 6, C.woodLo).vline(7, 5, 6, C.woodLo);
    g.rect(3, 8, 8, 1, C.woodLo);
  });
}

/** A striped beach towel on the grass (18×9). */
function towel(v: number): HTMLCanvasElement {
  const [a, b] = TOWELS[v % TOWELS.length]!;
  return sprite(`nook-towel-${v % TOWELS.length}`, 20, 9, (g) => {
    g.rect(1, 1, 18, 7, a);
    for (let x = 3; x < 19; x += 4) g.rect(x, 1, 2, 7, b);
    g.rect(1, 7, 18, 1, shade(a, -0.2));
  });
}

/** The old futon: a folded-up mattress on a pine frame, as wide as its seats (26 tall). */
function futon(w: number): HTMLCanvasElement {
  return sprite(`nook-futon-${w}`, w + 2, 27, (g) => {
    const mat = "#2f4a6a";
    const matHi = "#4a6a8e";
    const pine = "#d8b07a";
    const pineLo = "#b08a58";
    // The back: the mattress folded up against the frame.
    g.rect(4, 2, w - 6, 11, mat);
    g.rect(4, 2, w - 6, 1, matHi);
    for (let x = 10; x < w - 4; x += 11) g.vline(x, 4, 8, "#263c58");
    // The seat.
    g.rect(3, 13, w - 4, 6, mat);
    g.rect(3, 13, w - 4, 1, matHi);
    g.rect(3, 18, w - 4, 1, "#263c58");
    // The pine frame: arms, the front rail, the feet.
    g.rect(1, 9, 3, 12, pine).rect(w - 2, 9, 3, 12, pine);
    g.rect(1, 9, 3, 1, "#ecd0a0").rect(w - 2, 9, 3, 1, "#ecd0a0");
    g.rect(1, 19, w, 2, pine).rect(1, 20, w, 1, pineLo);
    g.rect(2, 21, 2, 4, pineLo).rect(w - 3, 21, 2, 4, pineLo);
    // A throw blanket over one arm.
    g.rect(w - 9, 13, 6, 6, "#e86a3a").rect(w - 9, 15, 6, 1, "#f4e2b8");
  });
}

/** A closed laptop, left on a seat (stickers on the lid). */
function closedLaptop(ctx: Ctx, x: number, y: number, v: number): void {
  px(ctx, OUTLINE, x - 1, y - 1, 10, 4);
  px(ctx, "#c9ced6", x, y, 8, 2);
  px(ctx, "#e3e7ec", x, y, 8, 1);
  px(ctx, STICKERS[v % STICKERS.length]!, x + 1 + (v % 3), y, 2, 1);
}

/** When each squeeze-in last had someone typing there (by spot id): the seat shows them a laptop, the night a glow. */
const typing = new Map<string, number>();
const busy = (n: Nook, t: number) => (typing.get(n.id) ?? -9) > t - 0.4;

function seatDrawable(ctx: Ctx, n: Nook, t: number): Drawable {
  const v = ih(n.x, n.y) % 97;
  const { x, y } = n;
  const z = y + 0.3;
  const left = !busy(n, t) && v % 2 === 0;
  const draw: Record<Exclude<NookSeat, "futon">, () => void> = {
    cushion: () => {
      ctx.drawImage(cushion(v), x - 10, y - 9);
      if (left) closedLaptop(ctx, x - 5, y - 8, v);
    },
    beanbag: () => ctx.drawImage(beanbag(v), x - 13, y - 16),
    camp: () => {
      ctx.drawImage(campChair(v), x - 10, y - 23);
      if (left) closedLaptop(ctx, x - 5, y - 11, v);
    },
    stool: () => ctx.drawImage(stool(), x - 8, y - 12),
    lounger: () => ctx.drawImage(lounger(), x - 7, y - 20),
    towel: () => {
      ctx.drawImage(towel(v), x - 11, y - 9);
      if (left) closedLaptop(ctx, x - 6, y - 6, v);
    },
  };
  return { z, draw: n.seat === "futon" ? () => undefined : draw[n.seat] };
}

/** The squeeze-ins' seats (sorted with the people: just behind whoever sits there). */
export function nookDecor(ctx: Ctx, L: Layout, info: PaintInfo, out: Drawable[]): void {
  const plan = planOf(L);
  if (!plan || plan.nooks.length === 0) return;
  const t = info.t;
  const f = plan.futon;
  if (f) {
    const img = futon(f.w);
    const seats = plan.nooks.filter((n) => n.seat === "futon");
    out.push({
      z: f.y + f.h - 0.7,
      draw: () => {
        ctx.drawImage(img, f.x - 1, f.y - 1);
        seats.forEach((n, i) => {
          if (!busy(n, t) && i % 2 === 1) closedLaptop(ctx, n.x - 5, n.y - 13, ih(n.x, n.y));
        });
      },
    });
  }
  for (const n of plan.nooks) if (n.seat !== "futon") out.push(seatDrawable(ctx, n, t));
}

// ------------------------------------------------------------------ the laptop on the lap

/**
 * On whoever's typing at a squeeze-in: crossed legs (the typing sprite has
 * none, a desk usually hides them), a laptop on the lap with stickers on the
 * lid, and the screen's light on their face. `x, y`: the sprite's top left.
 */
export function laptopOnLap(ctx: Ctx, a: { x: number; y: number; facing: string; pose: string; seed: number; look: Look; spot?: string | null }, t: number): void {
  if (!a.spot?.startsWith(NOOK) || a.facing !== "front" || (a.pose !== "type0" && a.pose !== "type1")) return;
  typing.set(a.spot, t);
  const { x, y, seed } = a;
  // Crossed legs and shoes.
  const pants = a.look.pants;
  px(ctx, pants, x + 3, y + 20, 12, 3);
  px(ctx, shade(pants, 0.15), x + 3, y + 20, 12, 1);
  px(ctx, "#3b2b2b", x + 2, y + 22, 3, 1);
  px(ctx, "#3b2b2b", x + 13, y + 22, 3, 1);
  px(ctx, OUTLINE, x + 2, y + 23, 14, 1);
  // The lid, seen from behind, its screen lighting the rim.
  px(ctx, OUTLINE, x + 4, y + 15, 10, 7);
  px(ctx, "#c9ced6", x + 5, y + 16, 8, 5);
  px(ctx, "#e3e7ec", x + 5, y + 16, 8, 1);
  px(ctx, "#9aa2ac", x + 5, y + 20, 8, 1);
  px(ctx, STICKERS[seed % STICKERS.length]!, x + 6, y + 17, 2, 2);
  px(ctx, STICKERS[(seed >>> 3) % STICKERS.length]!, x + 10, y + 18, 2, 1);
  const flicker = 0.18 + ((Math.floor(t * 3 + (seed % 5)) % 3) * 0.03);
  px(ctx, "#bff4ff", x + 5, y + 15, 8, 1);
  px(ctx, `rgba(150,232,255,${flicker.toFixed(2)})`, x + 5, y + 9, 8, 5);
}

/** The laptops' glow at night, where someone's typing. */
export function nookLights(L: Layout, info: PaintInfo): Light[] {
  const plan = planOf(L);
  if (!plan || info.night < 0.05) return [];
  const out: Light[] = [];
  for (const n of plan.nooks) if (busy(n, info.t)) out.push([n.x - 1, n.y - LIFT[n.seat] - 13, 18, 0.75, "#9fe8ff", 0.14]);
  return out;
}
