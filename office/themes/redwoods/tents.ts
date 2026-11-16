// Redwood Camp tents: poles with brass finials and pennants, guy ropes, the
// big tent's entrance awning, the porch tent's scalloped canopy and bunting,
// the camp kitchen pavilion's posts and lanterns, the treehouse stilts and its
// rope ladder. Depth-sorted with people (static sprites, cached).
import type { Drawable } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { Grid, OUTLINE, rect } from "../../themekit.ts";
import { C, cached, sprite } from "./kit.ts";
import { campData } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const STRIPE_A = "#b8433a";
const STRIPE_B = "#f1e7cf";

/** A tent pole with a brass finial, h px tall above its foot. */
function pole(h: number, finial = true): HTMLCanvasElement {
  return sprite(`tent-pole-${h}-${finial}`, 7, h + 4, (g) => {
    g.rect(2, 3, 3, h, C.log).rect(2, 3, 1, h, C.logHi).rect(4, 3, 1, h, C.logLo);
    g.rect(1, h + 1, 5, 2, C.logDk);
    if (finial) g.rect(2, 0, 3, 3, C.brass).set(2, 0, C.brassHi);
  });
}

/** A pennant on a short staff, two frames of flutter. */
function pennant(frame: number, color: string): HTMLCanvasElement {
  return sprite(`pennant-${frame}-${color}`, 12, 9, (g) => {
    g.rect(1, 0, 1, 9, C.logDk);
    const len = frame ? 8 : 9;
    for (let i = 0; i < len; i++) {
      const half = Math.max(0, Math.round(2.5 * (1 - i / len)));
      const off = frame && i > 4 ? 1 : 0;
      g.rect(2 + i, 3 - half + off, 1, half * 2 + 1, i % 3 === 2 ? STRIPE_B : color);
    }
  });
}

/** The big tent's entrance: a peaked awning with the door flaps tied back. */
function entrance(): HTMLCanvasElement {
  return cached("redwoods|tent-entrance", () => {
    const g = new Grid(34, 22);
    // Peak
    for (let j = 0; j < 9; j++) {
      const half = Math.round(4 + j * 1.6);
      for (let x = 17 - half; x <= 16 + half; x++) g.set(x, j + 1, j % 3 === 2 ? C.canvasLo : (x + 40) % 6 < 3 ? STRIPE_A : STRIPE_B);
    }
    // Scalloped hem
    for (let x = 2; x < 32; x++) g.set(x, 10, (x % 4 === 1 || x % 4 === 2) ? STRIPE_A : null);
    // Tied-back flaps either side of the doorway
    for (const [x0, dir] of [
      [3, 1],
      [28, -1],
    ] as const) {
      for (let j = 0; j < 10; j++) {
        const w = Math.max(1, 4 - Math.floor(j / 3));
        for (let i = 0; i < w; i++) g.set(x0 + dir * i, 10 + j, j % 4 === 0 ? C.canvasLo : C.canvas);
      }
      g.rect(x0 - (dir < 0 ? 3 : 0), 15, 4, 1, "#8f7b58");
    }
    g.set(17, 0, C.brass);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A rope ladder hanging from the treehouse door. */
function ladder(h: number): HTMLCanvasElement {
  return sprite(`ladder-${h}`, 12, h, (g) => {
    g.rect(2, 0, 1, h, "#8f7b58").rect(9, 0, 1, h, "#8f7b58");
    for (let y = 2; y < h - 1; y += 4) g.rect(2, y, 8, 2, C.log).rect(2, y, 8, 1, C.logHi);
  }, false);
}

function guyRope(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  ctx.fillStyle = "#9a865f";
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  ctx.fillStyle = C.logDk;
  ctx.fillRect(Math.round(x1), Math.round(y1) - 1, 1, 3);
}

interface TentBits {
  items: { z: number; canvas: HTMLCanvasElement; x: number; y: number }[];
  ropes: [number, number, number, number][];
  flags: { x: number; y: number; z: number; color: string }[];
  bunting: { x0: number; x1: number; y: number; z: number }[];
  /** Ridge lines with bulbs: from (x0, y) to (x1, y), drawn over the people under them. */
  ridges: { x0: number; x1: number; y: number; z: number }[];
}

function atWall(room: Room, L: Layout): boolean {
  const seg = L.segments.find((sg) => room.rect.x >= sg.x0 && room.rect.x < sg.x1);
  return seg !== undefined && room.rect.y <= seg.depth + 1;
}

function bits(L: Layout): TentBits {
  return cached(`redwoods|tents|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const out: TentBits = { items: [], ropes: [], flags: [], bunting: [], ridges: [] };
    // Desk tents: corner poles, two tall poles holding the ridge, a string of bulbs along it, guy ropes.
    for (const [i, T] of (campData(L)?.tents ?? []).entries()) {
      const l = T.x - 7;
      const r = T.x + T.w + 4;
      const back = T.y - 4;
      const front = T.y + T.h + 1;
      const mid = T.y + Math.round(T.h / 2);
      const ridgeY = T.y + 5;
      for (const x of [l, r]) {
        out.items.push({ z: back, canvas: pole(22), x: x - 2, y: back - 24 });
        out.items.push({ z: front, canvas: pole(26), x: x - 2, y: front - 28 });
        out.items.push({ z: mid, canvas: pole(mid - ridgeY), x: x - 2, y: ridgeY - 2 });
      }
      out.ridges.push({ x0: l + 1, x1: r + 1, y: ridgeY, z: front + 0.7 });
      out.flags.push({ x: l - 1, y: ridgeY - 9, z: mid + 0.1, color: i % 2 ? "#3f6b4a" : STRIPE_A });
      const drop = 9;
      out.ropes.push([l, back - 20, l - 9, back + 2], [r + 1, back - 20, r + 10, back + 2]);
      out.ropes.push([l, front - 24, l - 9, front + drop - 6], [r + 1, front - 24, r + 10, front + drop - 6]);
    }
    const halls = L.net.halls;
    const below = (y: number) => halls.filter((h) => h > y).sort((a, b) => a - b)[0] ?? L.H;
    for (const room of L.rooms) {
      const r = room.rect;
      if (room.kind === "meeting") {
        // The big safari tent: tall poles, pennants, the entrance awning.
        const ph = 30;
        const front = r.y + r.h;
        for (const x of [r.x - 3, r.x + r.w - 4]) {
          out.items.push({ z: front + 0.5, canvas: pole(ph), x: x - 2, y: front - ph - 2 });
          out.flags.push({ x: x - 1, y: front - ph - 10, z: front + 0.6, color: x < r.x ? STRIPE_A : "#d9a531" });
        }
        if (!atWall(room, L)) {
          for (const x of [r.x - 3, r.x + r.w - 4]) out.items.push({ z: r.y, canvas: pole(ph), x: x - 2, y: r.y - ph - 2 });
        }
        if (room.doorX !== undefined) out.items.push({ z: front + 1, canvas: entrance(), x: room.doorX - 17, y: front - 21 });
        // Guy ropes out to the sides where there's floor (not across the boardwalk below).
        const hall = below(front);
        const drop = Math.min(10, hall - 9 - front);
        if (drop >= 4) {
          out.ropes.push([r.x - 2, front - ph + 4, r.x - 12, front + drop]);
          out.ropes.push([r.x + r.w - 2, front - ph + 4, Math.min(L.W - 2, r.x + r.w + 8), front + drop]);
        }
      } else if (room.kind === "waiting") {
        // The porch tent: four poles and a canopy (the scalloped edge is in the backdrop), bunting across.
        const ph = 26;
        for (const x of [r.x + 1, r.x + r.w - 4]) {
          out.items.push({ z: r.y + 1, canvas: pole(14), x: x - 2, y: r.y - 12 });
          out.items.push({ z: r.y + r.h, canvas: pole(ph), x: x - 2, y: r.y + r.h - ph - 2 });
        }
        out.flags.push({ x: r.x + 2, y: r.y + r.h - ph - 10, z: r.y + r.h + 0.1, color: "#3f6b4a" });
        out.flags.push({ x: r.x + r.w - 3, y: r.y + r.h - ph - 10, z: r.y + r.h + 0.1, color: "#c4552d" });
      } else if (room.kind === "kitchen") {
        // The pavilion: four timber posts and a string of lanterns between the back ones.
        const ph = 26;
        for (const x of [r.x - 1, r.x + r.w - 2]) out.items.push({ z: r.y + r.h, canvas: pole(ph, false), x: x - 2, y: r.y + r.h - ph - 2 });
        out.bunting.push({ x0: r.x, x1: r.x + r.w - 2, y: r.y + r.h - ph, z: r.y + r.h + 0.5 });
      } else if (room.kind === "boss") {
        // The treehouse: a rope ladder up to the door, stilts under the front.
        if (room.doorX !== undefined && room.doorSide === "top") out.items.push({ z: r.y - 1, canvas: ladder(14), x: room.doorX - 6, y: r.y - 12 });
      }
    }
    return out;
  });
}

let flagT = 0;
let ridgeLit = false;

/** The tents' depth-sorted parts. */
export function tentItems(ctx: Ctx, L: Layout, t: number, night = 0): Drawable[] {
  const B = bits(L);
  flagT = t;
  ridgeLit = night > 0.3;
  return cached(`redwoods|tentitems|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const items: Drawable[] = B.items.map((it) => ({ z: it.z, draw: () => ctxRef.c?.drawImage(it.canvas, it.x, it.y) }));
    for (const f of B.flags) {
      items.push({ z: f.z, draw: () => ctxRef.c?.drawImage(pennant(Math.floor(flagT * 3 + f.x) % 2, f.color), f.x, f.y) });
    }
    for (const rg of B.ridges) {
      items.push({
        z: rg.z,
        draw: () => {
          const c = ctxRef.c;
          if (!c) return;
          rect(c, rg.x0, rg.y, rg.x1 - rg.x0, 2, C.logLo);
          rect(c, rg.x0, rg.y, rg.x1 - rg.x0, 1, C.logHi);
          for (let x = rg.x0 + 6; x < rg.x1 - 4; x += 10) {
            c.fillStyle = "#6b5238";
            c.fillRect(x, rg.y + 2, 1, 1);
            c.fillStyle = OUTLINE;
            c.fillRect(x - 1, rg.y + 3, 3, 3);
            c.fillStyle = ridgeLit ? "#ffe0a0" : "#c8bc9c";
            c.fillRect(x, rg.y + 4, 1, 1);
          }
        },
      });
    }
    for (const b of B.bunting) {
      items.push({
        z: b.z,
        draw: () => {
          const c = ctxRef.c;
          if (!c) return;
          const n = b.x1 - b.x0;
          for (let i = 0; i <= n; i++) {
            const y = b.y + Math.round(Math.sin((i / n) * Math.PI) * 5);
            rect(c, b.x0 + i, y, 1, 1, "#6b5238");
            if (i % 12 === 6) {
              c.fillStyle = OUTLINE;
              c.fillRect(b.x0 + i - 2, y + 1, 5, 6);
              c.fillStyle = "#3a3632";
              c.fillRect(b.x0 + i - 1, y + 1, 3, 1);
              c.fillStyle = C.glass;
              c.fillRect(b.x0 + i - 1, y + 2, 3, 3);
              c.fillStyle = C.flameHi;
              c.fillRect(b.x0 + i, y + 3, 1, 1);
            }
          }
        },
      });
    }
    return items;
  }).concat(ropeDrawable(L));
}

const ctxRef: { c: Ctx | null } = { c: null };
export function bindTentCtx(ctx: Ctx): void {
  ctxRef.c = ctx;
}

function ropeDrawable(L: Layout): Drawable[] {
  const B = bits(L);
  if (B.ropes.length === 0) return [];
  return cached(`redwoods|tentropes|${L.W}x${L.H}|${L.props.length}`, () => [
    {
      z: 0.4,
      draw: () => {
        const c = ctxRef.c;
        if (c) for (const [a, b2, x, y] of B.ropes) guyRope(c, a, b2, x, y);
      },
    },
  ]);
}

/** The bulbs on the pavilion string and along the desk tents' ridges, for the night lights. */
export function tentLights(L: Layout): [number, number][] {
  const out: [number, number][] = [];
  for (const rg of bits(L).ridges) for (let x = rg.x0 + 6; x < rg.x1 - 4; x += 20) out.push([x, rg.y + 5]);
  for (const b of bits(L).bunting) {
    const n = b.x1 - b.x0;
    for (let i = 6; i <= n; i += 12) out.push([b.x0 + i, b.y + Math.round(Math.sin((i / n) * Math.PI) * 5) + 4]);
  }
  return out;
}

/** A desk tent's canvas, baked into the backdrop: the back wall with a rolled window, rolled-up sides. */
export function paintDeskTent(ctx: Ctx, T: Rect): void {
  const x0 = T.x - 6;
  const x1 = T.x + T.w + 6;
  const y = T.y - 9;
  for (let x = x0; x < x1; x++) {
    const k = (x - x0) % 16;
    rect(ctx, x, y, 1, 9, k === 0 ? C.canvasSeam : k < 8 ? C.canvas : C.canvasHi);
    rect(ctx, x, y, 1, 1, C.logDk);
    const drop = (x - x0) % 8 < 2 || (x - x0) % 8 > 5 ? 1 : 2;
    rect(ctx, x, y + 9, 1, drop, (x - x0) % 16 < 8 ? STRIPE_A : STRIPE_B);
  }
  // Rolled-up windows in the back wall
  for (let wx = x0 + 10; wx + 18 < x1 - 6; wx += 44) {
    rect(ctx, wx, y + 2, 16, 4, "#3e4a3a");
    rect(ctx, wx - 1, y + 1, 18, 2, C.canvasLo);
    rect(ctx, wx - 1, y + 1, 18, 1, C.canvasHi);
    rect(ctx, wx + 3, y + 3, 1, 2, "#8f7b58");
    rect(ctx, wx + 12, y + 3, 1, 2, "#8f7b58");
  }
  rect(ctx, x0, y - 1, x1 - x0, 1, OUTLINE);
  // The side walls rolled up into tight rolls along the eaves
  for (const sx of [x0 - 1, x1 - 2]) {
    rect(ctx, sx, y, 3, T.h + 10, C.canvasLo);
    rect(ctx, sx + 1, y, 1, T.h + 10, C.canvasHi);
    for (let ty = y + 8; ty < T.y + T.h; ty += 18) rect(ctx, sx, ty, 3, 1, "#8f7b58");
  }
}

/** The big tent's peaked back (a bell tent) above its top edge. */
export function paintBellPeak(ctx: Ctx, r: Rect): void {
  const cx = r.x + Math.round(r.w / 2);
  const h = 16;
  for (let j = 0; j < h; j++) {
    const half = Math.round((j / h) * (r.w / 2 + 2));
    for (let x = cx - half; x <= cx + half; x++) {
      const seam = (x - cx) % 12 === 0;
      rect(ctx, x, r.y - 8 - h + j, 1, 1, seam ? C.canvasSeam : j < 2 ? C.canvasHi : (x - cx) < 0 ? C.canvas : C.canvasLo);
    }
    rect(ctx, cx - half - 1, r.y - 8 - h + j, 1, 1, OUTLINE);
    rect(ctx, cx + half + 1, r.y - 8 - h + j, 1, 1, OUTLINE);
  }
  rect(ctx, cx - 1, r.y - 8 - h - 4, 3, 4, C.brass);
  rect(ctx, cx - 1, r.y - 8 - h - 4, 1, 1, C.brassHi);
}

/** The porch tent's canopy edge and the treehouse platform, baked into the backdrop. */
export function paintTentShells(ctx: Ctx, room: Room, L: Layout): void {
  const r = room.rect;
  if (room.kind === "waiting") {
    // Striped canopy hem along the top, a lighter canvas shade over the back of the porch.
    ctx.fillStyle = "rgba(255,244,214,0.10)";
    ctx.fillRect(r.x, r.y, r.w, 26);
    for (let x = r.x; x < r.x + r.w; x++) {
      const k = (x - r.x) % 12;
      const drop = k < 2 || k > 9 ? 3 : k < 4 || k > 7 ? 4 : 5;
      const stripe = Math.floor((x - r.x) / 6) % 2 ? STRIPE_A : STRIPE_B;
      rect(ctx, x, r.y, 1, drop, stripe);
      rect(ctx, x, r.y + drop, 1, 1, OUTLINE);
    }
    rect(ctx, r.x, r.y, r.w, 1, OUTLINE);
  } else if (room.kind === "kitchen") {
    ctx.fillStyle = "rgba(255,244,214,0.08)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
  } else if (room.kind === "boss") {
    // A ring of decking round the giant that grows up through the treehouse.
    const tree = campData(L)?.trees.find((t) => t.role === "treehouse");
    if (tree) {
      const cx = tree.x + tree.w / 2;
      const rx = tree.w / 2 + 12;
      for (let j = -7; j <= 4; j++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / 50)));
        for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) rect(ctx, x, tree.base + j, 1, 1, (x + j * 3) % 6 === 0 ? C.logLo : j < -5 ? C.logHi : C.log);
      }
      ctx.fillStyle = "rgba(20,12,6,0.3)";
      ctx.fillRect(Math.round(cx - rx), tree.base + 5, Math.round(rx * 2), 2);
    }
    // The cabin sits on a platform: beams and stilts show along the front.
    const y = r.y + r.h;
    if (y + 3 < L.H) {
      ctx.fillStyle = "rgba(20,12,6,0.4)";
      ctx.fillRect(r.x - 2, y + 1, r.w + 4, Math.min(5, L.H - y - 1));
      for (let x = r.x + 4; x < r.x + r.w - 2; x += 22) {
        rect(ctx, x, y, 3, Math.min(6, L.H - y), C.logLo);
        rect(ctx, x, y, 1, Math.min(6, L.H - y), C.logHi);
      }
    }
  }
}

export { STRIPE_A, STRIPE_B };
export type { Rect };
