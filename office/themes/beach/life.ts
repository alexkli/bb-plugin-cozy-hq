// Surf Villa: the life around the villa, drawn live. Beach umbrellas, palms,
// a lifeguard tower, the bonfire, tiki torches, surfboard racks, a beach
// shower, a sandcastle and sail shades over the work deck; floats bobbing and
// light dancing in the pool, the surf washing up the beach, a crab and a gull;
// torches, the bonfire and the pool glowing at night; the golden hour.
import type { Light, PaintInfo, Theme } from "../../theme.ts";
import type { Drawable } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, floorPlan, Grid, hash, mix, OUTLINE } from "../../themekit.ts";
import { C, fill } from "./kit.ts";
import { planOf } from "./plan.ts";

type P = { x: number; y: number };

export interface Spots {
  torches: P[];
  racks: P[];
  shower: P | null;
  castle: P | null;
  palms: (P & { flip: boolean })[];
  poles: P[];
}

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const grow = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });

/** Where the beach things go, per layout: clear of furniture, people's spots and paths, rooms, the pools and the events. */
export function spotsOf(L: Layout): Spots {
  return cached(`beach|spots|${L.W}x${L.H}|${L.props.length}|${L.spots.length}|${L.net.halls.join(",")}`, () => {
    const plan = floorPlan(L);
    const B = planOf(L);
    const blocked: Rect[] = [];
    for (const r of L.rooms) if (r.walls) blocked.push(grow(r.rect, 10));
    blocked.push(grow(L.eventArea, 6), grow(L.tv, 8));
    for (const s of L.speakers) blocked.push(grow(s, 6));
    for (const pl of L.plants) blocked.push({ x: pl.x - 4, y: pl.y, w: pl.sprite === "LARGE_PLANT" ? 40 : 24, h: pl.sprite === "LARGE_PLANT" ? 54 : 36 });
    if (B) {
      for (const p of B.pools) blocked.push(grow(p, 6));
      if (B.sea) blocked.push({ ...B.sea, y: B.sea.y - 6, h: B.sea.h + 6 });
      for (const u of B.umbrellas) blocked.push({ x: u.x - 20, y: u.y - 40, w: 40, h: 44 });
      if (B.tower) blocked.push({ x: B.tower.x - 16, y: B.tower.y - 52, w: 32, h: 56 });
      if (B.bonfire) blocked.push({ x: B.bonfire.x - 14, y: B.bonfire.y - 20, w: 28, h: 28 });
      if (B.shack) blocked.push(grow(B.shack, 4));
    }
    const taken: Rect[] = [];
    const ok = (r: Rect, gap = 10) => plan.isFree(r) && !blocked.some((b) => hit(b, r)) && !taken.some((o) => hit(grow(o, gap), r));
    const wallDepth = (x: number) => L.segments.find((sg) => x >= sg.x0 && x < sg.x1)?.depth ?? 64;
    // A thing standing on a footprint, as tall as `tall`: its whole height must be clear (leaning on the wall is fine).
    const stands = (r: Rect, tall: number) => {
      const top = Math.max(r.y - tall, wallDepth(r.x) + 5, wallDepth(r.x + r.w - 1) + 5);
      const body = { x: r.x, y: top, w: r.w, h: r.y + r.h - top };
      return top >= r.y || (plan.isFree(body) && !blocked.some((b) => hit(b, body)));
    };
    const pick = (w: number, h: number, within: Rect | null, n: number, tall = 0, order?: (r: Rect) => number, sand = false): Rect[] => {
      if (!within || within.w < w || within.h < h) return [];
      let cands = plan.find(w, h, 400, within).filter((r) => ok(r) && stands(r, tall) && (!sand || onSand(r)));
      if (order) cands = cands.sort((a, b) => order(a) - order(b));
      const out: Rect[] = [];
      for (const r of cands) {
        if (out.length >= n) break;
        if (!ok(r)) continue;
        out.push(r);
        taken.push({ ...r, y: r.y - tall, h: r.h + tall });
      }
      return out;
    };
    const beachBand: Rect | null = B ? { x: 0, y: B.sandY + 2, w: L.W, h: (B.sea?.y ?? L.H) - B.sandY - 4 } : L.games;
    // Sand things stay on the sand: off the decks, the tiki bar's tiles and the reading rug.
    const SANDY = new Set(["games", "waiting", "garden"]);
    const paved = L.rooms.filter((r) => !SANDY.has(r.kind)).map((r) => grow(r.rect, 4));
    const onSand = (r: Rect) => !paved.some((p) => hit(p, r));
    const deckBand: Rect | null = B?.pavers ? { x: 0, y: B.pavers.y0, w: L.W, h: B.pavers.y1 - B.pavers.y0 } : null;
    // Palms on the sand, spread out, the tallest things on the beach.
    const palms: Spots["palms"] = [];
    const nPalms = Math.max(2, Math.floor(L.W / 170));
    for (const r of pick(26, 10, beachBand, nPalms, 48, (r) => -(r.y + ((r.x * 37) % 50)), true)) palms.push({ x: r.x + 13, y: r.y + r.h, flip: hash(`palm${r.x}`) % 2 === 0 });
    for (const r of pick(26, 10, deckBand, 2, 48)) palms.push({ x: r.x + 13, y: r.y + r.h, flip: hash(`palm${r.x}`) % 2 === 0 });
    // Surfboard racks and a beach shower on the sand; a sandcastle down by the water.
    const racks: P[] = [];
    for (const r of pick(28, 10, L.games ?? beachBand, 1, 30, undefined, true)) racks.push({ x: r.x, y: r.y + r.h });
    for (const r of pick(28, 10, beachBand, 1, 30, undefined, true)) racks.push({ x: r.x, y: r.y + r.h });
    if (racks.length === 0 && !B) for (const r of pick(28, 10, L.lounge, 1, 30)) racks.push({ x: r.x, y: r.y + r.h });
    const sh = pick(14, 10, beachBand, 1, 32, undefined, true)[0] ?? pick(14, 10, deckBand, 1, 32)[0];
    const shower = sh ? { x: sh.x + 7, y: sh.y + sh.h } : null;
    const cs = pick(20, 12, beachBand, 1, 4, (r) => -r.y, true)[0] ?? pick(20, 12, L.games, 1, 4)[0];
    const castle = cs ? { x: cs.x + 2, y: cs.y + cs.h } : null;
    // Tiki torches: at the corners of the pool, either side of the beach, by the tiki bar and the lounge.
    const torches: P[] = [];
    const tryAt = (x: number, y: number) => {
      const r = { x: Math.round(x) - 4, y: Math.round(y) - 8, w: 8, h: 8 };
      if (torches.length < 8 && ok(r, 16) && stands(r, 22)) {
        torches.push({ x: r.x + 4, y: r.y + r.h });
        taken.push({ ...r, y: r.y - 22, h: r.h + 22 });
      }
    };
    for (const p of B?.pools ?? []) {
      tryAt(p.x - 10, p.y + 8);
      tryAt(p.x + p.w + 10, p.y + 8);
      tryAt(p.x - 10, p.y + p.h + 2);
      tryAt(p.x + p.w + 10, p.y + p.h + 2);
    }
    if (B) {
      const ev = L.eventArea;
      tryAt(ev.x - 10, ev.y + ev.h);
      tryAt(ev.x + ev.w + 10, ev.y + ev.h);
      tryAt(ev.x - 10, ev.y + 14);
      tryAt(ev.x + ev.w + 10, ev.y + 14);
    }
    for (const area of [L.kitchen, L.lounge, L.games]) {
      if (!area) continue;
      tryAt(area.x + area.w - 6, area.y + area.h - 2);
      tryAt(area.x + 6, area.y + area.h - 2);
    }
    // Poles for the sail shades over the work decks.
    const poles: P[] = [];
    for (const pod of L.pods) {
      for (const x of [pod.x - 5, pod.x + pod.w + 4]) {
        poles.push({ x, y: pod.y + 8 }, { x, y: pod.y + pod.h + 2 });
      }
    }
    return { torches, racks, shower, castle, palms, poles };
  });
}

// ------------------------------------------------------------------ sprites

function torchSprite(): HTMLCanvasElement {
  return cached("beach|torch", () => {
    const g = new Grid(9, 28);
    for (let j = 9; j < 27; j++) g.rect(4, j, 1, 1, j % 4 === 0 ? C.bambooNode : C.bamboo).set(3, j, C.bambooLo);
    g.rect(2, 5, 5, 5, C.thatch);
    g.rect(2, 5, 5, 1, C.thatchHi);
    for (let i = 2; i < 7; i += 2) g.set(i, 7, C.thatchLo).set(i + 1, 8, C.thatchDk);
    g.rect(3, 4, 3, 1, "#3a2a20");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function rackSprite(): HTMLCanvasElement {
  return cached("beach|rack", () => {
    const g = new Grid(30, 40);
    g.rect(2, 12, 2, 27, C.bambooLo).rect(26, 12, 2, 27, C.bambooLo);
    g.rect(1, 34, 28, 2, C.bamboo);
    g.rect(1, 22, 28, 1, C.bambooLo);
    const boards: [number, string, string][] = [
      [8, C.aqua, C.white],
      [15, C.coral, C.sunHi],
      [22, C.sun, C.coral],
    ];
    for (const [bx, c, stripe] of boards) {
      g.ellipse(bx, 18, 3.4, 16.5, c);
      g.rect(bx, 3, 1, 31, stripe);
      g.set(bx - 2, 8, mix(c, "#ffffff", 0.4));
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function showerSprite(): HTMLCanvasElement {
  return cached("beach|shower", () => {
    const g = new Grid(14, 42);
    g.rect(5, 6, 3, 34, C.teak).rect(5, 6, 1, 34, C.teakHi);
    g.rect(6, 3, 6, 2, C.chromeLo).rect(10, 5, 3, 2, C.chrome);
    g.rect(2, 38, 10, 3, C.driftLo);
    g.rect(2, 38, 10, 1, C.driftHi);
    g.rect(8, 22, 2, 1, C.chrome);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function castleSprite(): HTMLCanvasElement {
  return cached("beach|castle", () => {
    const g = new Grid(20, 16);
    const sand = "#e8c88a";
    const hi = "#f6dfaa";
    const lo = "#c9a462";
    g.rect(2, 9, 16, 5, sand).rect(2, 9, 16, 1, hi).rect(2, 13, 16, 1, lo);
    g.rect(3, 4, 5, 6, sand).rect(12, 4, 5, 6, sand).rect(7, 6, 6, 4, sand);
    for (const x of [3, 5, 7, 12, 14, 16]) g.set(x, 3, sand);
    g.rect(3, 4, 5, 1, hi).rect(12, 4, 5, 1, hi);
    g.rect(9, 10, 2, 3, "#8a6a3a");
    g.vline(14, 0, 4, "#8a6a3a").rect(15, 0, 3, 2, C.coral);
    g.set(5, 6, lo).set(14, 6, lo);
    g.rect(1, 13, 2, 1, C.pink).set(18, 12, "#f4d3c4");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A tall coconut palm, trunk base at the bottom middle (13, 55). */
function palmSprite(flip: boolean): HTMLCanvasElement {
  return cached(`beach|bigpalm|${flip}`, () => {
    const g = new Grid(40, 58);
    const base = 56;
    let tx = 19;
    let ty = base;
    for (let j = 0; j < 40; j++) {
      tx = 19 + Math.round(Math.pow(j / 40, 2) * 6);
      ty = base - j;
      const ring = j % 3 === 0;
      g.set(tx, ty, ring ? "#7c5a36" : "#a8804e").set(tx + 1, ty, ring ? "#6a4a2c" : "#8e6a40").set(tx - 1, ty, ring ? "#8e6a40" : "#c09060");
    }
    const cx = tx;
    const cy = ty;
    const fronds: [number, number, boolean][] = [
      [-17, 6, false],
      [-14, -4, true],
      [-6, -12, false],
      [4, -13, true],
      [13, -7, false],
      [17, 4, true],
      [10, 11, false],
      [-10, 11, true],
      [0, 9, false],
    ];
    for (const [fx, fy, hi] of fronds) {
      const n = Math.max(Math.abs(fx), Math.abs(fy));
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        const px = Math.round(cx + fx * k);
        const py = Math.round(cy + fy * k + k * k * 5);
        g.set(px, py, hi ? C.palmHi : C.palm);
        if (i % 2 === 0 && i < n) {
          g.set(px, py + 1, C.palmLo);
          if (Math.abs(fx) >= Math.abs(fy)) g.set(px, py - 1, hi ? C.palm : C.palmHi);
          else g.set(px + 1, py, C.palmLo);
        }
      }
    }
    for (const [dx, dy] of [[-1, 2], [1, 2], [0, 3]] as const) g.ellipse(cx + dx, cy + dy, 1.2, 1.2, C.coconut);
    g.outline(OUTLINE);
    return (flip ? g.flipped() : g).toCanvas();
  });
}

const CANOPIES: [string, string][] = [
  [C.coral, C.white],
  [C.aqua, C.white],
  [C.sun, C.coral],
  [C.sea, C.white],
  [C.hibiscus, C.sunHi],
];

/** A beach umbrella; the pole's base at (17, 39). */
function umbrellaSprite(i: number): HTMLCanvasElement {
  return cached(`beach|umbrella|${i % CANOPIES.length}`, () => {
    const g = new Grid(36, 41);
    const [a, b] = CANOPIES[i % CANOPIES.length]!;
    g.rect(17, 8, 1, 31, "#f4ead8").rect(18, 8, 1, 31, "#c9b48a");
    for (let j = 0; j < 7; j++) {
      const half = Math.min(16, 4 + j * 2.4);
      for (let x = Math.round(17.5 - half); x <= Math.round(17.5 + half); x++) {
        const seg = Math.floor(((x - 17.5) / (half + 0.01)) * 3 + 3);
        g.set(x, 2 + j, seg % 2 ? a : b);
      }
    }
    for (let x = 2; x < 34; x += 4) g.set(x, 9, a).set(x + 1, 9, b);
    g.rect(16, 1, 4, 1, "#c9b48a");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** The lifeguard tower: a hut on stilts with a ramp; base at (14, 51). */
function towerSprite(): HTMLCanvasElement {
  return cached("beach|tower", () => {
    const g = new Grid(30, 53);
    // Stilts and cross braces.
    for (const x of [6, 21]) g.rect(x, 22, 2, 30, C.white).set(x + 1, 22, C.washShade);
    g.line(7, 30, 21, 44, C.washShade).line(21, 30, 7, 44, C.washShade);
    // The hut, its striped roof and a red cross.
    g.rect(4, 10, 21, 13, "#f6f1e6");
    g.rect(4, 10, 21, 1, C.white);
    g.rect(7, 13, 15, 6, "#6fb8d6");
    g.rect(7, 13, 15, 1, "#a8dcef");
    g.rect(13, 19, 3, 3, "#e8453c").rect(12, 20, 5, 1, "#e8453c");
    for (let x = 2; x < 27; x++) g.rect(x, 6, 1, 4, Math.floor((x - 2) / 3) % 2 ? "#e8453c" : C.white);
    g.rect(3, 5, 23, 1, "#b8302a");
    // Railing deck and a ramp down to the sand.
    g.rect(2, 22, 25, 2, C.teak).rect(2, 22, 25, 1, C.teakHi);
    g.line(24, 24, 28, 50, C.teakLo).line(25, 24, 29, 50, C.teak);
    // A flag.
    g.vline(26, 0, 6, C.chromeLo).rect(27, 0, 3, 2, C.sun);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, right: boolean, peck: boolean, step: boolean): void {
  const px = (dx: number) => x + (right ? dx : -dx - 1);
  fill(ctx, x - 3, y, 7, 1, "rgba(60,40,30,0.18)");
  fill(ctx, px(-3), y - 5, 6, 3, OUTLINE);
  fill(ctx, px(-2), y - 4, 4, 2, "#ffffff");
  fill(ctx, px(-3), y - 4, 2, 1, "#9aa6b8");
  fill(ctx, px(-1), y - 4, 2, 1, "#c4ccd8");
  const hy = peck ? y - 3 : y - 6;
  fill(ctx, px(1), hy - 1, 3, 3, OUTLINE);
  fill(ctx, px(1), hy, 2, 1, "#ffffff");
  fill(ctx, px(3), hy + (peck ? 1 : 0), 1, 1, "#ffc83d");
  fill(ctx, px(-1), y - 2, 1, 2, "#ff9f40");
  fill(ctx, px(step ? 1 : 0), y - 2, 1, 2, "#ff9f40");
}

// ------------------------------------------------------------------ decor

export function beachDecor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const s = spotsOf(L);
  const B = planOf(L);
  const out: Drawable[] = [];
  const t = info.t;
  const wet = info.weather === "rain" || info.weather === "storm" || info.weather === "drizzle";
  for (const [i, p] of s.torches.entries()) {
    out.push({
      z: p.y,
      draw: () => {
        ctx.drawImage(torchSprite(), p.x - 4, p.y - 27);
        if (wet) return;
        const f = Math.floor(t * 9 + i * 3) % 4;
        const fx = p.x - 1;
        const fy = p.y - 22;
        fill(ctx, fx, fy - 4 + (f === 1 ? 1 : 0), 3, 4 - (f === 1 ? 1 : 0), "#ff8a3d");
        fill(ctx, fx + (f % 2), fy - 6 + (f === 3 ? 1 : 0), 1, 2, "#ffb347");
        fill(ctx, fx + 1, fy - 3, 1, 2, "#fff0a0");
      },
    });
  }
  for (const p of s.racks) out.push({ z: p.y, draw: () => ctx.drawImage(rackSprite(), p.x - 1, p.y - 40) });
  const sh = s.shower;
  if (sh) {
    out.push({
      z: sh.y,
      draw: () => {
        ctx.drawImage(showerSprite(), sh.x - 7, sh.y - 41);
        const k = (t * 0.9) % 1;
        if (k < 0.5) fill(ctx, sh.x + 4, sh.y - 34 + Math.floor(k * 60), 1, 1, "#9fe0f0");
      },
    });
  }
  const c = s.castle;
  if (c) out.push({ z: c.y, draw: () => ctx.drawImage(castleSprite(), c.x - 1, c.y - 15) });
  for (const p of s.palms) {
    const sway = Math.round(Math.sin(t * 0.6 + p.x) * 0.6);
    out.push({ z: p.y, draw: () => ctx.drawImage(palmSprite(p.flip), p.x - (p.flip ? 20 : 19) + sway * 0, p.y - 57) });
  }
  for (const p of s.poles) out.push({ z: p.y, draw: () => { fill(ctx, p.x - 1, p.y - 30, 3, 31, OUTLINE); fill(ctx, p.x, p.y - 29, 1, 29, C.driftHi); fill(ctx, p.x - 1, p.y - 31, 3, 2, C.driftLo); } });
  if (B) {
    B.umbrellas.forEach((u, i) => out.push({ z: u.y, draw: () => ctx.drawImage(umbrellaSprite(i), u.x - 17, u.y - 39) }));
    const tw = B.tower;
    if (tw) out.push({ z: tw.y, draw: () => ctx.drawImage(towerSprite(), tw.x - 14, tw.y - 51) });
    const f = B.bonfire;
    if (f) out.push({ z: f.y + 3, draw: () => drawFire(ctx, f.x, f.y, info, wet) });
  }
  // A gull wanders in off the beach now and then, pecking at crumbs.
  const hall = L.net.halls[L.net.halls.length - 1];
  if (hall !== undefined && info.night < 0.4 && !wet && info.weather !== "storm") {
    const cyc = (t % 80) / 80;
    if (cyc < 0.4) {
      const k = cyc / 0.4;
      const from = L.entrance.x + 20;
      const span = Math.min(120, L.W - from - 20);
      const there = k < 0.5;
      const pos = there ? k * 2 : (1 - k) * 2;
      const pecking = Math.floor(t * 1.3) % 4 === 0;
      const gx = Math.round(from + pos * span);
      const gy = hall + 7;
      out.push({ z: gy, draw: () => drawGull(ctx, gx, gy, there, pecking, Math.floor(t * 6) % 2 === 0) });
    }
  }
  return out;
}

/** The bonfire: embers and a wisp of smoke by day, roaring flames and sparks at night, steam in the rain. */
function drawFire(ctx: CanvasRenderingContext2D, x: number, y: number, info: PaintInfo, wet: boolean): void {
  const t = info.t;
  const lit = info.night > 0.25 && !wet;
  if (!lit) {
    fill(ctx, x - 2, y - 1, 2, 1, Math.floor(t * 2) % 2 ? "#ff8a3d" : "#c45a2a");
    fill(ctx, x + 2, y, 1, 1, "#ff6a2a");
    ctx.fillStyle = "rgba(220,220,220,0.4)";
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.3 + i * 0.25) % 1;
      ctx.fillRect(Math.round(x + Math.sin(t + i * 2) * 2 + k * 3), Math.round(y - 4 - k * 18), 2, 2);
    }
    return;
  }
  const f = Math.floor(t * 10);
  const flame = (dx: number, h: number, c: string) => fill(ctx, x + dx, y - h, 2, h, c);
  flame(-4, 5 + (f % 3), "#ff6a2a");
  flame(2, 6 + ((f + 1) % 3), "#ff6a2a");
  flame(-2, 9 + ((f + 2) % 3), "#ff8a3d");
  flame(0, 11 + (f % 4), "#ff9a40");
  fill(ctx, x - 1, y - 7 - (f % 2), 3, 6, "#ffc85a");
  fill(ctx, x, y - 4, 1, 3, "#fff3b0");
  ctx.fillStyle = "#ffcf6a";
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.7 + i * 0.27) % 1;
    ctx.fillRect(Math.round(x + Math.sin(t * 3 + i * 1.7) * 4), Math.round(y - 12 - k * 22), 1, 1);
  }
}

// ------------------------------------------------------------------ lighting

export const beachLighting: NonNullable<Theme["lighting"]> = {
  tint: "14,26,62",
  darkness: (night, _wx, classic) => classic * 0.96 + night * 0.02,
  lights(L, info) {
    const s = spotsOf(L);
    const B = planOf(L);
    const out: Light[] = [];
    const t = info.t;
    const wet = info.weather === "rain" || info.weather === "storm" || info.weather === "drizzle";
    if (!wet) {
      for (const [i, p] of s.torches.entries()) {
        const fl = 0.82 + Math.sin(t * 9 + i * 2) * 0.06 + Math.sin(t * 3.7 + i) * 0.08;
        out.push([p.x, p.y - 26, 40, 0.9 * fl, "#ffa040", 0.26 * fl]);
      }
    }
    for (const [i, c] of candles(L).entries()) {
      const fl = 0.8 + Math.sin(t * 7 + i * 1.7) * 0.08 + Math.sin(t * 2.9 + i) * 0.07;
      out.push([c.x, c.y, 20, 0.75 * fl, "#ffc070", 0.2 * fl]);
    }
    const k = L.kitchen;
    out.push([k.x + k.w * 0.75, k.y + 34, 46, 0.7, "#ffc070", 0.16]);
    const m = L.meeting;
    out.push([m.x + 14, m.y + m.h - 24, 34, 0.6, "#ffd08a", 0.14]);
    if (L.games) out.push([L.games.x + L.games.w / 2, L.games.y + L.games.h / 2, 60, 0.45, "#ffb870", 0.08]);
    if (L.server) out.push([L.server.x + 8, L.server.y + 8, 22, 0.5, "#86eee4", 0.12]);
    if (B) {
      // The pool lights up from below, and the bonfire roars.
      for (const p of B.pools) out.push([p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) * 0.62, 0.75, "#58e0ff", 0.18]);
      const f = B.bonfire;
      if (f && !wet) {
        const fl = 0.85 + Math.sin(t * 8) * 0.06 + Math.sin(t * 3.1) * 0.07;
        out.push([f.x, f.y - 8, 76, fl, "#ff9a40", 0.34 * fl]);
      }
      for (const u of B.umbrellas.filter((_, i) => i % 3 === 1)) out.push([u.x, u.y - 30, 24, 0.5, "#ffd08a", 0.1]);
    }
    return out;
  },
};

function candles(L: Layout): P[] {
  return cached(`beach|candles|${L.W}x${L.H}|${L.props.length}`, () => L.props.filter((p) => p.kind === "lounge-table").map((p) => ({ x: p.x + 13, y: p.y + 2 })));
}

// ------------------------------------------------------------------ underlay

const FLOATS = ["donut", "ring", "ball"] as const;

/** The pools shimmer and floats drift; the surf washes up the beach; a crab scuttles across the sand. */
export function beachUnderlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const t = info.t;
  const B = planOf(L);
  if (B) {
    for (const [pi, p] of B.pools.entries()) {
      // Light dancing on the water.
      ctx.fillStyle = `rgba(230,255,255,${0.5 - info.night * 0.25})`;
      const n = Math.round((p.w * p.h) / 220);
      for (let i = 0; i < n; i++) {
        const hx = hash(`c${pi}-${i}`);
        const ph = t * (0.4 + (hx % 7) * 0.05) + (hx % 100) / 16;
        const gx = p.x + 2 + ((hx >>> 4) % (p.w - 8)) + Math.round(Math.sin(ph) * 2);
        const gy = p.y + 5 + ((hx >>> 12) % (p.h - 8));
        if (Math.sin(ph * 2.3) > -0.2) ctx.fillRect(gx, gy, 2 + (hx % 3), 1);
      }
      // Floats drifting slowly.
      for (let i = 0; i < Math.min(3, Math.max(1, Math.floor(p.w / 90))); i++) {
        const kind = FLOATS[(i + pi) % FLOATS.length]!;
        const fx = Math.round(p.x + 14 + ((Math.sin(t * 0.05 + i * 2.1) + 1) / 2) * (p.w - 30));
        const fy = Math.round(p.y + 8 + ((Math.sin(t * 0.07 + i * 1.3) + 1) / 2) * (p.h - 18) + Math.sin(t * 1.5 + i) * 0.6);
        drawFloat(ctx, kind, fx, fy, t + i);
      }
    }
    if (B.sea) drawSurf(ctx, B.sea, info);
  }
  // A crab pops out on the sand now and then.
  const sandy = B ? L.eventArea : (L.games ?? null);
  if (!sandy) return;
  const cycle = (t * 0.05) % 1;
  if (cycle > 0.55) return;
  const k = Math.sin(cycle * Math.PI * 4) * 0.5 + 0.5;
  const x = Math.round(sandy.x + 12 + k * Math.max(10, sandy.w - 24));
  const y = Math.round(sandy.y + sandy.h - 4);
  const step = Math.floor(t * 10) % 2;
  fill(ctx, x - 3, y, 7, 1, "rgba(120,80,40,0.18)");
  fill(ctx, x - 2, y - 3, 5, 3, C.coralLo);
  fill(ctx, x - 1, y - 3, 3, 1, C.coral);
  fill(ctx, x - 1, y - 4, 1, 1, OUTLINE);
  fill(ctx, x + 1, y - 4, 1, 1, OUTLINE);
  fill(ctx, x - 4, y - 3 - step, 2, 1, C.coral);
  fill(ctx, x + 3, y - 3 - (1 - step), 2, 1, C.coral);
  fill(ctx, x - 3, y - step, 1, 1, C.coralDk);
  fill(ctx, x + 3, y - 1 + step, 1, 1, C.coralDk);
}

function drawFloat(ctx: CanvasRenderingContext2D, kind: (typeof FLOATS)[number], x: number, y: number, t: number): void {
  fill(ctx, x - 5, y + 3, 11, 2, "rgba(20,80,110,0.25)");
  if (kind === "ball") {
    fill(ctx, x - 2, y - 2, 5, 5, OUTLINE);
    fill(ctx, x - 1, y - 1, 3, 3, C.white);
    fill(ctx, x - 1, y - 1, 1, 3, C.coral);
    fill(ctx, x + 1, y - 1, 1, 3, C.sea);
    fill(ctx, x, y - 1, 1, 1, C.sun);
    return;
  }
  const a = kind === "donut" ? "#ff8fb8" : C.sun;
  const b = kind === "donut" ? "#ffd0e0" : C.coral;
  fill(ctx, x - 5, y - 2, 11, 6, OUTLINE);
  fill(ctx, x - 6, y - 1, 13, 4, OUTLINE);
  fill(ctx, x - 4, y - 1, 9, 4, a);
  fill(ctx, x - 5, y, 11, 2, a);
  fill(ctx, x - 1, y, 3, 2, "#3fb2c8");
  fill(ctx, x - 1, y, 3, 1, OUTLINE);
  if (kind === "donut") {
    for (const [dx, dy, c] of [[-3, 0, C.sun], [3, 1, C.aqua], [-2, 2, C.white], [2, -1, C.lime]] as const) fill(ctx, x + dx, y + dy, 1, 1, c);
  } else {
    fill(ctx, x - 4, y - 1, 2, 1, b);
    fill(ctx, x + 3, y + 2, 2, 1, b);
  }
  void t;
}

/** Waves rolling in along the waterline. */
function drawSurf(ctx: CanvasRenderingContext2D, sea: Rect, info: PaintInfo): void {
  const t = info.t;
  const stormy = info.weather === "storm" || info.weather === "rain";
  const period = stormy ? 3.6 : 5.5;
  const ph = (t / period) % 1;
  // The sunset colors the water.
  const h = info.hour;
  const golden = h > 17.2 && h < 20.4 && (info.weather === "clear" || info.weather === "partly") ? Math.max(0, 1 - Math.abs(h - 18.9) / 1.5) : 0;
  if (golden > 0.02) {
    ctx.fillStyle = `rgba(255,140,90,${0.35 * golden})`;
    ctx.fillRect(sea.x, sea.y, sea.w, sea.h);
    ctx.fillStyle = `rgba(255,214,140,${0.8 * golden})`;
    for (let i = 0; i < sea.w / 14; i++) {
      const hx = hash(`gl${i}-${Math.floor(t * 2 + i)}`);
      ctx.fillRect(sea.x + ((i * 53 + (hx % 9)) % sea.w), sea.y + 3 + (hx % Math.max(1, sea.h - 4)), 2 + (hx % 3), 1);
    }
  }
  // The wash: foam sliding up the sand and back.
  const reach = Math.sin(ph * Math.PI) * 4;
  ctx.fillStyle = info.night > 0.5 ? "rgba(170,200,230,0.55)" : "rgba(255,255,255,0.85)";
  for (let x = sea.x; x < sea.x + sea.w; x += 3) {
    const wob = Math.sin(x * 0.07 + t * 0.8) * 1.5 + Math.sin(x * 0.19) * 1;
    const up = Math.max(0, Math.round(reach + wob));
    ctx.fillRect(x, sea.y - up, 3, 1 + (x % 9 === 0 ? 1 : 0));
  }
  ctx.fillStyle = info.night > 0.5 ? "rgba(140,180,220,0.35)" : "rgba(220,250,255,0.55)";
  for (let x = sea.x; x < sea.x + sea.w; x += 3) ctx.fillRect(x, sea.y + 1, 3, 1);
  // Swells rolling in.
  ctx.fillStyle = info.night > 0.5 ? "rgba(150,180,220,0.4)" : "rgba(255,255,255,0.7)";
  for (let i = 0; i < 3; i++) {
    const k = (ph + i / 3) % 1;
    const yy = Math.round(sea.y + sea.h - 2 - k * (sea.h - 4));
    for (let x = sea.x + ((i * 37) % 23); x < sea.x + sea.w; x += 23) {
      const len = 6 + ((x * 3 + i) % 7);
      ctx.fillRect(x + Math.round(Math.sin(t * 0.3 + i) * 3), yy, len, 1);
    }
  }
}

// ------------------------------------------------------------------ overlay

/** Sail shades over the work decks, sun glare by day, the golden hour at sunset. */
export function beachOverlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const B = planOf(L);
  if (B) {
    const a = 0.2 * (1 - info.night * 0.75);
    for (const pod of L.pods) {
      const x0 = pod.x - 5;
      const x1 = pod.x + pod.w + 4;
      const y0 = pod.y - 22;
      const y1 = pod.y + pod.h - 28;
      ctx.fillStyle = `rgba(255,252,240,${a})`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0 + 6);
      ctx.lineTo(x0 + (x1 - x0) * 0.45, y1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,236,200,${a * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(x0, y1 - 4);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x0 + (x1 - x0) * 0.62, y0 + 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  const clear = info.weather === "clear" || info.weather === "partly";
  if (!clear) return;
  const h = info.hour;
  const golden = Math.max(0, 1 - Math.abs(h - 18.7) / 1.5) * (h > 17.2 && h < 20.2 ? 1 : 0) + Math.max(0, 1 - Math.abs(h - 6.6) / 0.9) * 0.6;
  if (golden > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = `rgba(255,${Math.round(150 - golden * 30)},70,${0.55 * golden})`;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.restore();
  }
  if (info.night > 0.65) return;
  const k = (1 - info.night) * 0.08;
  const g = ctx.createLinearGradient(0, 0, 0, L.H * 0.55);
  g.addColorStop(0, `rgba(255,236,180,${k})`);
  g.addColorStop(1, "rgba(255,236,180,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.W, Math.ceil(L.H * 0.55));
}
