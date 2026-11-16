// Dusty Annex: round the outside. The building is squeezed in between a
// neighbour's soot-black brick wall (an alley with a rusty fire escape down
// the left), the street (pavement, a lamp post, bin bags, a parked car when
// there's room) and a back yard full of bins along the bottom. The thick outer
// walls have a little window at each end of every corridor: that's where
// people go to smoke, feed the pigeons or peek at the street.

import type { Light, PaintInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { Grid, OUTLINE, cached, hash, rect, rng, shade } from "../../themekit.ts";
import { P } from "./pal.ts";
import { siteOf, type Site } from "./plan.ts";

const BRICKS = ["#6e3a2e", "#7a4032", "#653428", "#5c3226", "#744436"];
const MORTAR = "#3e2e28";
const WALL = "#3e3024";
const WALL_HI = "#5a4836";

/** A little window in the outer wall at the end of a corridor. */
export interface SideWindow {
  side: "left" | "right";
  /** The corridor it ends. */
  hall: number;
  /** The glass, in the wall. */
  r: Rect;
  /** Where someone stands at it (feet). */
  at: { x: number; y: number };
}

export function sideWindows(L: Layout): SideWindow[] {
  return cached(`annex|sidewin|${L.W}x${L.H}|${L.net.halls.join(",")}`, () => {
    const s = siteOf(L);
    const out: SideWindow[] = [];
    for (const hy of L.net.halls) {
      out.push({ side: "left", hall: hy, r: { x: s.x, y: hy - 9, w: 4, h: 13 }, at: { x: s.x + 10, y: hy + 1 } });
      out.push({ side: "right", hall: hy, r: { x: s.x + s.w - 4, y: hy - 9, w: 4, h: 13 }, at: { x: s.x + s.w - 10, y: hy + 1 } });
    }
    return out;
  });
}

// ------------------------------------------------------------------ baked

function bricks(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  if (r.w <= 0 || r.h <= 0) return;
  rect(ctx, r.x, r.y, r.w, r.h, MORTAR);
  const rr = rng(seed);
  for (let y = r.y, row = 0; y < r.y + r.h; y += 4, row++) {
    for (let x = r.x - (row % 2 ? 4 : 0); x < r.x + r.w; x += 8) {
      const x0 = Math.max(r.x, x);
      const x1 = Math.min(r.x + r.w, x + 7);
      if (x1 > x0) rect(ctx, x0, y, x1 - x0, Math.min(3, r.y + r.h - y), BRICKS[Math.floor(rr() * BRICKS.length)]!);
    }
  }
  // Soot, streaked down from the top.
  for (let k = 0; k < r.w / 6; k++) {
    const x = r.x + Math.floor(rr() * r.w);
    const len = Math.floor(rr() * r.h * 0.6);
    ctx.fillStyle = "rgba(20,14,12,0.22)";
    ctx.fillRect(x, r.y, 1 + Math.floor(rr() * 2), len);
  }
}

function speck(ctx: CanvasRenderingContext2D, r: Rect, colors: string[], density: number, seed: number): void {
  const rr = rng(seed);
  const n = Math.round(r.w * r.h * density);
  for (let i = 0; i < n; i++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, colors[i % colors.length]!);
}

function puddle(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, seed: number): void {
  const rr = rng(seed);
  for (let j = -2; j <= 2; j++) {
    const half = Math.round(w * (1 - (j * j) / 6) * (0.8 + rr() * 0.3));
    rect(ctx, cx - half, cy + j, half * 2, 1, "#2f3236");
  }
  rect(ctx, cx - Math.round(w * 0.4), cy - 1, Math.round(w * 0.5), 1, "#5a6066");
}

/** A heap of black bin bags, 14×9. */
function binBags(): HTMLCanvasElement {
  return cached("annex|binbags", () => {
    const g = new Grid(14, 9);
    for (const [x, y, w] of [[1, 2, 6], [6, 1, 6], [3, 4, 8]] as const) {
      g.rect(x, y, w, 4, "#26232a");
      g.rect(x + 1, y, w - 2, 1, "#3d3a44");
      g.set(x + w - 2, y + 1, "#4a4652");
    }
    g.set(4, 1, "#3d3a44").set(9, 0, "#3d3a44");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A wheelie bin, lid up top and its front below (12×18). */
function wheelieBin(color: string): HTMLCanvasElement {
  return cached(`annex|wheelie|${color}`, () => {
    const g = new Grid(14, 19);
    g.rect(1, 1, 12, 5, shade(color, 0.12));
    g.rect(1, 1, 12, 1, shade(color, 0.25));
    g.rect(2, 6, 10, 10, color);
    g.rect(2, 6, 10, 1, shade(color, -0.3));
    g.rect(3, 8, 8, 1, shade(color, -0.12));
    g.rect(3, 12, 8, 1, shade(color, -0.12));
    g.rect(2, 16, 3, 2, "#1e1c1c");
    g.rect(9, 16, 3, 2, "#1e1c1c");
    // The lid doesn't shut: a bag pokes out.
    g.rect(4, 0, 5, 2, "#26232a");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** Pallets nobody came back for (18×11). */
function pallets(): HTMLCanvasElement {
  return cached("annex|pallets", () => {
    const g = new Grid(20, 12);
    for (let i = 0; i < 3; i++) {
      const y = 8 - i * 3;
      g.rect(1, y, 18, 3, i % 2 ? "#8a6a44" : "#9a7a50");
      for (let x = 2; x < 19; x += 4) g.rect(x, y + 1, 2, 1, "#5a4430");
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** An armchair someone dumped out the back, stuffing coming out (18×16). */
function dumpedChair(): HTMLCanvasElement {
  return cached("annex|dumpedchair", () => {
    const g = new Grid(20, 17);
    g.rrect(1, 1, 18, 8, P.must, 2);
    g.rect(1, 6, 3, 8, P.mustLo).rect(16, 6, 3, 8, P.mustLo);
    g.rect(4, 8, 12, 5, P.mustHi);
    g.rect(4, 13, 12, 2, P.mustLo);
    g.rect(7, 3, 4, 3, P.foam).set(11, 4, P.foam);
    g.set(2, 15, "#2a2826").set(17, 15, "#2a2826");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A crate of empties (10×8). */
function crate(): HTMLCanvasElement {
  return cached("annex|crate", () => {
    const g = new Grid(12, 10);
    g.rect(1, 3, 10, 6, "#3a5a7a");
    g.rect(1, 3, 10, 1, "#4a6a8a");
    for (let x = 2; x < 10; x += 2) g.rect(x, 1, 1, 3, "#7a9a6a").set(x, 0, "#d8c890");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A small car parked by the kerb, seen from above (16×30). */
function parkedCar(color: string): HTMLCanvasElement {
  return cached(`annex|car|${color}`, () => {
    const g = new Grid(18, 32);
    g.rect(1, 2, 16, 28, color);
    g.rect(2, 1, 14, 1, color);
    g.rect(2, 30, 14, 1, color);
    g.rect(2, 2, 14, 1, shade(color, 0.2));
    // Windscreen, roof, back window.
    g.rect(3, 8, 12, 4, "#2e3a44");
    g.rect(4, 8, 4, 1, "#5a6a78");
    g.rect(3, 12, 12, 9, shade(color, -0.12));
    g.rect(4, 13, 10, 1, shade(color, 0.08));
    g.rect(3, 21, 12, 3, "#2e3a44");
    // Wheels peeking out, a dent and a parking ticket.
    for (const [x, y] of [[0, 5], [16, 5], [0, 24], [16, 24]] as const) g.rect(x, y, 2, 4, "#1e1c1c");
    g.rect(13, 16, 2, 2, shade(color, -0.3));
    g.rect(5, 9, 3, 2, "#e8e0c8");
    g.set(1, 3, "#d8c890").set(16, 3, "#d8c890");
    g.set(1, 29, "#8a2a24").set(16, 29, "#8a2a24");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** The neighbour's wall, the alley and the fire escape, left of the building. */
function alley(ctx: CanvasRenderingContext2D, L: Layout, s: Site): void {
  const w = s.x;
  if (w < 6) return;
  const top = L.segments[0]?.depth ?? 64;
  const nb = Math.max(4, Math.round(w * 0.3));
  // Up top, the neighbour's back wall carries on from ours.
  bricks(ctx, { x: 0, y: 0, w, h: top }, hash(`annex-nb-${w}`));
  rect(ctx, 0, top - 2, w, 2, "#2a201c");
  // Down below, the alley: wet setts, a gutter, the neighbour's wall along the far side.
  const g = { x: 0, y: top, w, h: s.h - top };
  rect(ctx, g.x, g.y, g.w, g.h, "#3e3b36");
  const rr = rng(hash(`annex-alley-${w}-${s.h}`));
  for (let y = g.y + 1; y < g.y + g.h; y += 4) {
    for (let x = nb + ((y >> 2) % 2) * 2; x < w; x += 5) rect(ctx, x, y, 4, 3, rr() < 0.5 ? "#48443e" : "#433f39");
  }
  bricks(ctx, { x: 0, y: top, w: nb, h: g.h }, hash(`annex-nbside-${w}`));
  rect(ctx, nb, top, 1, g.h, "#241c18");
  rect(ctx, nb + 1, top, 1, g.h, "rgba(0,0,0,0.25)");
  const gx = nb + Math.floor((w - nb) / 2);
  rect(ctx, gx, top, 1, g.h, "#34312c");
  for (let k = 0; k < Math.max(1, g.h / 140); k++) puddle(ctx, gx, Math.floor(top + 30 + rr() * (g.h - 40)), Math.max(2, Math.floor((w - nb) / 3)), hash(`ap${k}`));
  // The fire escape, bolted to our wall: a landing at every corridor window, ladders between.
  if (w < 14) return;
  const fx = s.x - 12;
  const landings = L.net.halls.map((hy) => hy - 12);
  const ladder = (y0: number, y1: number) => {
    if (y1 - y0 < 4) return;
    rect(ctx, fx + 3, y0, 1, y1 - y0, "#1e1c1c");
    rect(ctx, fx + 8, y0, 1, y1 - y0, "#1e1c1c");
    for (let y = y0 + 1; y < y1; y += 3) rect(ctx, fx + 4, y, 4, 1, "#5a5450");
  };
  ladder(top, landings[0]!);
  landings.forEach((ly, i) => {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(fx - 1, ly + 2, 13, 20);
    rect(ctx, fx, ly, 12, 20, "#2f2d2c");
    for (let y = ly + 1; y < ly + 19; y += 2) rect(ctx, fx + 1, y, 10, 1, "#4a4744");
    for (let x = fx + 2; x < fx + 11; x += 3) rect(ctx, x, ly + 1, 1, 18, "#3a3836");
    rect(ctx, fx, ly, 1, 20, "#1e1c1c");
    rect(ctx, fx, ly, 12, 1, "#1e1c1c");
    rect(ctx, fx, ly + 19, 12, 1, "#1e1c1c");
    // Rust running down from the bolts, and a flowerpot of fag ends on the top one.
    rect(ctx, fx + 11, ly + 4, 1, 3, P.rust);
    if (i === 0) {
      rect(ctx, fx + 2, ly + 13, 4, 4, "#8a4f2c");
      rect(ctx, fx + 2, ly + 13, 4, 1, "#a8653a");
      rect(ctx, fx + 3, ly + 14, 1, 1, "#e6dfc8");
      rect(ctx, fx + 4, ly + 15, 1, 1, "#d3c8a6");
    }
    ladder(ly + 20, landings[i + 1] ?? s.h - 2);
  });
}

/** The street down the right: pavement, kerb, a stretch of road. */
function street(ctx: CanvasRenderingContext2D, L: Layout, s: Site): void {
  const x0 = s.x + s.w;
  const w = L.W - x0;
  if (w < 6) return;
  const top = L.segments[L.segments.length - 1]?.depth ?? 64;
  // The building next door, up top: brick, and a shop's roller shutter at the bottom.
  bricks(ctx, { x: x0, y: 0, w, h: top }, hash(`annex-next-${w}`));
  if (w >= 24) {
    const sw = Math.min(w - 8, 40);
    const sx = x0 + 4;
    rect(ctx, sx, top - 22, sw, 20, "#5a5a56");
    for (let y = top - 21; y < top - 2; y += 2) rect(ctx, sx, y, sw, 1, "#6c6c66");
    rect(ctx, sx, top - 22, sw, 2, "#3a3a38");
    rect(ctx, sx + 3, top - 16, Math.min(10, sw - 6), 5, "rgba(140,60,50,0.35)");
  }
  rect(ctx, x0, top - 2, w, 2, "#2a201c");
  const pw = Math.min(14, Math.max(6, Math.round(w * 0.36)));
  const kx = x0 + pw;
  // Paving slabs, a few cracked.
  rect(ctx, x0, top, pw, s.h - top, "#86837a");
  const rr = rng(hash(`annex-pave-${w}-${s.h}`));
  for (let y = top; y < s.h; y += 10) {
    rect(ctx, x0, y, pw, 1, "#6f6c64");
    if (rr() < 0.3) rect(ctx, x0 + 2 + Math.floor(rr() * (pw - 4)), y + 2, 1, 5, "#6a675f");
  }
  if (pw >= 10) rect(ctx, x0 + Math.floor(pw / 2), top, 1, s.h - top, "#77746c");
  speck(ctx, { x: x0, y: top, w: pw, h: s.h - top }, ["#7a776e", "#949188", "#3a3a3c"], 0.03, hash(`pv${w}`));
  // The kerb and the road.
  const road = { x: kx + 2, y: top, w: L.W - kx - 2, h: L.H - top };
  rect(ctx, kx, top, 1, L.H - top, "#a6a297");
  rect(ctx, kx + 1, top, 1, L.H - top, "#5a5850");
  if (road.w > 0) {
    rect(ctx, road.x, road.y, road.w, road.h, "#38383a");
    speck(ctx, road, ["#424244", "#303032", "#4a4a4c"], 0.08, hash(`rd${w}`));
    // Double yellow lines, faded.
    if (road.w >= 6) for (const dx of [1, 3]) rect(ctx, road.x + dx, road.y, 1, road.h, "#8a7a3a");
    // A drain, patched tarmac and puddles.
    for (let y = top + 50; y < L.H - 10; y += 140) {
      rect(ctx, road.x, y, 5, 4, "#1e1c1c");
      for (let k = 0; k < 4; k += 2) rect(ctx, road.x + 1, y + k, 3, 1, "#4a4744");
    }
    if (road.w >= 10) for (let k = 0; k < Math.max(1, (L.H - top) / 160); k++) puddle(ctx, road.x + Math.floor(road.w / 2), Math.floor(top + 40 + rr() * (L.H - top - 60)), Math.min(6, Math.floor(road.w / 3)), hash(`rp${k}`));
    if (road.w >= 26) {
      for (let y = top + 6; y < L.H; y += 18) rect(ctx, road.x + road.w - 3, y, 1, 9, "#b8b4a8");
    }
  }
  // Bin bags heaped by our wall; a parked car if the road's wide enough.
  const bags = binBags();
  for (const hy of L.net.halls) {
    const by = hy + 16;
    if (by + bags.height < s.h - 4 && pw >= 10) ctx.drawImage(bags, x0 + Math.max(0, pw - 14), by);
  }
  if (road.w >= 22) {
    const car = parkedCar(["#5e2e2a", "#3e4a56", "#5a5a40"][hash(`car${L.W}`) % 3]!);
    const cy = Math.round(top + (s.h - top) * 0.55);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(road.x + 6, cy + 2, 16, 30);
    ctx.drawImage(car, road.x + 4, cy);
  }
}

/** The lamp post on the pavement (its light is in `streetLights`). */
function lampPost(L: Layout): { x: number; y: number } | null {
  const s = siteOf(L);
  const x0 = s.x + s.w;
  if (L.W - x0 < 10) return null;
  const top = L.segments[L.segments.length - 1]?.depth ?? 64;
  return { x: x0 + Math.min(14, Math.max(6, Math.round((L.W - x0) * 0.36))) - 3, y: Math.round(top + (s.h - top) * 0.25) };
}

/** The back yard along the bottom: flags, weeds, bins, a bike nobody claims. */
function yard(ctx: CanvasRenderingContext2D, L: Layout, s: Site): void {
  const h = L.H - s.h;
  if (h < 12) return;
  const r = { x: 0, y: s.h, w: s.x + s.w, h };
  rect(ctx, r.x, r.y, r.w, r.h, "#77746a");
  const rr = rng(hash(`annex-yard-${L.W}-${h}`));
  for (let y = r.y; y < r.y + r.h; y += 12) {
    rect(ctx, r.x, y, r.w, 1, "#5f5c54");
    for (let x = r.x + ((y / 12) % 2) * 7; x < r.x + r.w; x += 14) rect(ctx, x, y, 1, 12, "#5f5c54");
  }
  speck(ctx, r, ["#6a675e", "#86837a", "#5f7a44"], 0.03, hash(`yd${L.W}`));
  // Weeds in the cracks.
  for (let k = 0; k < r.w / 30; k++) {
    const x = r.x + Math.floor(rr() * r.w);
    const y = r.y + 4 + Math.floor(rr() * Math.max(1, h - 10));
    rect(ctx, x, y, 1, 2, P.leaf);
    rect(ctx, x - 1, y + 1, 1, 1, P.leafHi);
    rect(ctx, x + 1, y, 1, 1, P.leafSick);
  }
  for (let k = 0; k < Math.max(1, r.w / 240); k++) puddle(ctx, Math.floor(r.x + 20 + rr() * (r.w - 40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${k}`));
  // A low yard wall along the bottom.
  const wh = Math.min(6, Math.floor(h / 4));
  bricks(ctx, { x: 0, y: L.H - wh, w: r.w, h: wh }, hash(`annex-yw-${L.W}`));
  rect(ctx, 0, L.H - wh - 1, r.w, 1, "#8a8478");
  // Bins along it, a pallet, fag ends by the back step.
  const bins = ["#3c4a3a", "#3a3a40", "#5a3a2a"];
  const bin = wheelieBin(bins[0]!);
  const fit = h - wh >= bin.height - 2;
  let x = s.x + 14;
  for (let i = 0; i < 3 && fit; i++) {
    const c = wheelieBin(bins[i]!);
    ctx.drawImage(c, x, L.H - wh - c.height + 2);
    x += c.width + 1;
  }
  const bags = binBags();
  ctx.drawImage(bags, x + 2, L.H - wh - bags.height);
  // The rest of the yard: pallets, a chair nobody wanted, a crate of empties.
  const floorY = L.H - wh;
  for (const [f, sprite] of [[0.38, pallets()], [0.5, dumpedChair()], [0.9, crate()]] as const) {
    if (h - wh < sprite.height - 3) continue;
    ctx.drawImage(sprite, Math.round(s.x + s.w * f), floorY - sprite.height + 1 - (f === 0.5 ? Math.max(0, Math.floor((h - wh - sprite.height) / 2)) : 0));
  }
  // The back door, propped open with a brick.
  const dx = s.x + Math.round(s.w * 0.62);
  rect(ctx, dx, s.h - 4, 16, 4, "#2a2622");
  rect(ctx, dx + 1, s.h - 3, 14, 2, "#4a4a46");
  rect(ctx, dx + 2, s.h, 12, 3, "#8a867a");
  rect(ctx, dx + 2, s.h, 12, 1, "#9a968a");
  rect(ctx, dx + 15, s.h + 1, 3, 2, BRICKS[1]!);
  for (let k = 0; k < 6; k++) rect(ctx, dx - 4 + Math.floor(rr() * 24), s.h + 4 + Math.floor(rr() * Math.max(1, h - wh - 6)), 2, 1, k % 2 ? "#e6dfc8" : "#c8a060");
  // A bike chained to the drainpipe since anyone can remember, one wheel gone.
  if (r.w > 300 && h >= 24) {
    const bx = s.x + Math.round(s.w * 0.82);
    const by = s.h + Math.round((h - wh) / 2);
    ctx.strokeStyle = "#2a2622";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx + 0.5, by + 0.5, 4, 0, Math.PI * 2);
    ctx.stroke();
    rect(ctx, bx, by, 12, 1, "#7a3a32");
    rect(ctx, bx + 8, by - 3, 1, 4, "#7a3a32");
    rect(ctx, bx + 6, by - 4, 4, 1, "#2a2622");
    rect(ctx, bx + 12, by - 1, 1, 3, "#5a5a56");
  }
}

/** The building's own thick walls, and the little windows at the ends of the corridors. */
function outerWalls(ctx: CanvasRenderingContext2D, L: Layout, s: Site): void {
  const R = s.x + s.w;
  rect(ctx, s.x, 0, 4, s.h, WALL);
  rect(ctx, s.x + 3, 0, 1, s.h, WALL_HI);
  rect(ctx, R - 4, 0, 4, s.h, WALL);
  rect(ctx, R - 4, 0, 1, s.h, "#2a2018");
  rect(ctx, s.x, s.h - 4, s.w, 4, WALL);
  rect(ctx, s.x, s.h - 4, s.w, 1, WALL_HI);
  // Outside: a shadow down the alley and on the pavement.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  if (s.x >= 4) ctx.fillRect(s.x - 3, 0, 3, s.h);
  if (L.W - R >= 4) ctx.fillRect(R, 0, 3, s.h);
  if (L.H - s.h >= 4) ctx.fillRect(s.x - 3, s.h, s.w + 6, 3);
  for (const w of sideWindows(L)) {
    const g = w.r;
    rect(ctx, g.x, g.y - 1, g.w, g.h + 2, "#241a14");
    rect(ctx, g.x + 1, g.y, g.w - 2, g.h, "#7d8c90");
    rect(ctx, g.x + 1, g.y + 6, g.w - 2, 1, "#241a14");
    rect(ctx, g.x + 1, g.y + 1, 1, 3, "#a9b6b8");
    // Grime in the corner, and the sill.
    rect(ctx, g.x + 1, g.y + g.h - 2, g.w - 2, 2, "#5a6260");
    rect(ctx, w.side === "left" ? g.x + g.w : g.x - 2, g.y + g.h - 1, 2, 2, "#9a8f72");
  }
}

/** Everything outside the building, baked with the floor. */
export function paintSurroundings(ctx: CanvasRenderingContext2D, L: Layout): void {
  const s = siteOf(L);
  if (s.x === 0 && s.w === L.W && s.h === L.H) {
    outerWalls(ctx, L, s);
    return;
  }
  alley(ctx, L, s);
  street(ctx, L, s);
  yard(ctx, L, s);
  const lamp = lampPost(L);
  if (lamp) {
    rect(ctx, lamp.x - 1, lamp.y - 1, 4, 4, OUTLINE);
    rect(ctx, lamp.x, lamp.y, 2, 2, "#3e463e");
    rect(ctx, lamp.x + 2, lamp.y, 6, 1, "#2e342e");
    rect(ctx, lamp.x + 7, lamp.y - 1, 4, 3, "#2e342e");
    rect(ctx, lamp.x + 8, lamp.y, 2, 1, "#d8c890");
  }
  outerWalls(ctx, L, s);
}

// ------------------------------------------------------------------ live

const DROPS = Array.from({ length: 60 }, (_, i) => hash(`annex-drop-${i}`));

/** Rain on the street, the alley and the yard (not indoors). */
export function surroundingsRain(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  if (info.weather !== "rain" && info.weather !== "storm") return;
  const s = siteOf(L);
  const areas: Rect[] = [];
  if (s.x >= 6) areas.push({ x: 0, y: 0, w: s.x, h: L.H });
  if (L.W - s.x - s.w >= 6) areas.push({ x: s.x + s.w, y: 0, w: L.W - s.x - s.w, h: L.H });
  if (L.H - s.h >= 12) areas.push({ x: s.x, y: s.h, w: s.w, h: L.H - s.h });
  ctx.fillStyle = "rgba(190,205,220,0.35)";
  const frame = Math.floor(info.t * 12);
  for (const a of areas) {
    const n = Math.min(DROPS.length, Math.round((a.w * a.h) / 260));
    for (let i = 0; i < n; i++) {
      const k = DROPS[i]!;
      const x = a.x + (k % a.w);
      const y = a.y + ((((k >>> 8) % a.h) + frame * 7) % a.h);
      ctx.fillRect(x, y, 1, 3);
    }
  }
}

/** The street lamp, and a light on next door. */
export function streetLights(L: Layout): Light[] {
  const out: Light[] = [];
  const lamp = lampPost(L);
  if (lamp) out.push([lamp.x + 9, lamp.y + 2, 46, 0.75, "#ffc66a", 0.5]);
  const s = siteOf(L);
  if (s.x >= 14) out.push([Math.round(s.x / 2), 30, 16, 0.35, "#ffd88a", 0.2]);
  return out;
}
