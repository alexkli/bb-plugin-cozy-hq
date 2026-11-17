// Mountain Cabin: where the overflow works (./squeeze.ts). Sheepskins on the
// hearth, the window seat, the boot bench, kitchen stools, knitted poufs and
// log stumps out on the deck; and on whoever's typing there, a laptop on the
// lap, its screen lighting their face (and the room at night).
import type { Look } from "../../characters.ts";
import type { Drawable, Light, PaintInfo } from "../../theme.ts";
import type { Layout } from "../../layout.ts";
import { OUTLINE, shade } from "../../themekit.ts";
import { C, h2, sprite } from "./kit.ts";
import { planOf } from "./plan.ts";
import { LIFT, NOOK, type Nook, type NookSeat } from "./squeeze.ts";

type Ctx = CanvasRenderingContext2D;

const px = (ctx: Ctx, c: string, x: number, y: number, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

const KNITS = [C.red, C.navy, C.mustard, C.moss];

function seatSprite(seat: NookSeat, v: number): HTMLCanvasElement {
  switch (seat) {
    case "sheepskin":
      return sprite("nook-sheepskin", 20, 9, (g) => {
        g.rrect(1, 1, 18, 7, C.fleece, 3);
        for (let x = 2; x < 18; x += 3) g.set(x, 2 + (x % 2), C.fleeceLo).set(x + 1, 5, C.fleeceLo);
        g.rect(3, 7, 14, 1, C.fleeceLo);
      });
    case "seat":
    case "boots":
      return sprite(`nook-cushion-${v % 4}`, 18, 8, (g) => {
        const c = KNITS[v % 4]!;
        g.rrect(1, 1, 16, 5, c, 1).rect(2, 1, 14, 1, shade(c, 0.25)).rect(1, 5, 16, 1, shade(c, -0.25));
        for (let x = 3; x < 16; x += 3) g.set(x, 3, C.cream);
      });
    case "stool":
      return sprite("nook-stool", 14, 13, (g) => {
        g.ellipse(7, 2.5, 5.5, 1.8, C.pine);
        g.rect(3, 1, 8, 1, C.pineHi);
        g.line(3, 4, 2, 12, C.pineDk).line(10, 4, 11, 12, C.pineDk).line(7, 4, 7, 12, C.pineLo);
      });
    case "pouf":
      return sprite(`nook-pouf-${v % 4}`, 20, 12, (g) => {
        const c = KNITS[v % 4]!;
        g.ellipse(10, 7, 9, 4.5, c);
        g.ellipse(10, 5, 7, 3, shade(c, 0.1));
        for (let x = 3; x < 18; x += 3) for (let y = 3; y < 11; y++) if (g.get(x, y)) g.set(x, y, shade(c, -0.15));
      });
    case "stump":
      return sprite("nook-stump", 16, 12, (g) => {
        g.rect(2, 4, 12, 7, C.beam).vline(4, 5, 6, C.beamLo).vline(9, 5, 6, C.beamLo).vline(12, 5, 6, C.beamLo);
        g.ellipse(7.5, 3.5, 6, 2.4, "#d9b07a");
        g.ellipse(7.5, 3.5, 3, 1.2, C.pine);
        g.rect(4, 2, 5, 1, C.snow);
      });
  }
}

/** When each squeeze-in last had someone typing there (by spot id): the seat shows them, the night a glow. */
const typing = new Map<string, number>();
const busy = (n: Nook, t: number) => (typing.get(n.id) ?? -9) > t - 0.4;

/** The seats (under whoever sits there), and a closed laptop left on some of the empty ones. */
export function nookDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const p = planOf(L);
  if (!p || p.nooks.length === 0) return [];
  return p.nooks.map((n) => ({
    z: n.y - 0.5,
    draw: () => {
      const v = Math.floor(h2(n.x, n.y) * 97);
      const s = seatSprite(n.seat, v);
      const lift = LIFT[n.seat];
      ctx.drawImage(s, Math.round(n.x - s.width / 2), Math.round(n.y - s.height + 2 - (n.seat === "stool" ? 0 : Math.max(0, lift - 2))));
      if (!busy(n, info.t) && v % 3 === 0) {
        const x = n.x - 4;
        const y = n.y - s.height + 1;
        px(ctx, OUTLINE, x - 1, y - 1, 10, 4);
        px(ctx, "#c9ced6", x, y, 8, 2);
        px(ctx, "#e3e7ec", x, y, 8, 1);
      }
    },
  }));
}

/** A laptop on the lap of whoever's typing at a squeeze-in, its screen lighting their face. */
export function laptopOnLap(ctx: Ctx, a: { x: number; y: number; facing: string; pose: string; seed: number; look: Look; spot?: string | null }, t: number): void {
  if (!a.spot?.startsWith(NOOK) || a.facing !== "front" || (a.pose !== "type0" && a.pose !== "type1")) return;
  typing.set(a.spot, t);
  const { x, y, seed } = a;
  // Crossed legs in wool socks.
  const pants = a.look.pants;
  px(ctx, pants, x + 3, y + 20, 12, 3);
  px(ctx, shade(pants, 0.15), x + 3, y + 20, 12, 1);
  px(ctx, C.cream, x + 2, y + 22, 3, 1);
  px(ctx, C.cream, x + 13, y + 22, 3, 1);
  px(ctx, OUTLINE, x + 2, y + 23, 14, 1);
  // The lid, seen from behind, a sticker of a mountain on it.
  px(ctx, OUTLINE, x + 4, y + 15, 10, 7);
  px(ctx, "#c9ced6", x + 5, y + 16, 8, 5);
  px(ctx, "#e3e7ec", x + 5, y + 16, 8, 1);
  px(ctx, "#9aa2ac", x + 5, y + 20, 8, 1);
  px(ctx, KNITS[seed % KNITS.length]!, x + 7, y + 18, 3, 1);
  px(ctx, KNITS[seed % KNITS.length]!, x + 8, y + 17, 1, 1);
  const flicker = 0.18 + (Math.floor(t * 3 + (seed % 5)) % 3) * 0.03;
  px(ctx, "#bff4ff", x + 5, y + 15, 8, 1);
  px(ctx, `rgba(150,232,255,${flicker.toFixed(2)})`, x + 5, y + 9, 8, 5);
}

/** The laptops' glow at night, where someone's typing. */
export function nookLights(L: Layout, info: PaintInfo): Light[] {
  const p = planOf(L);
  if (!p || info.night < 0.05) return [];
  const out: Light[] = [];
  for (const n of p.nooks) if (busy(n, info.t)) out.push([n.x - 1, n.y - LIFT[n.seat] - 13, 18, 0.75, "#9fe8ff", 0.14]);
  return out;
}
