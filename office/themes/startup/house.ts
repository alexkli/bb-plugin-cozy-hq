// Startup House: the backdrop, baked once per floor plan. Butter-yellow
// drywall with outlets and their tangle of power strips, aluminum sliders
// with bunched vertical blinds, beige carpet in the living room, checkered
// vinyl in the kitchen, terracotta tiles in the entryway, oak in the
// hallways, concrete in the garage; the backyard's lawn, the pool and the
// patio pavers out back; and the house's walls with doorways (and sliding
// doors to the patio) wherever people actually walk.

import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Point, Rect, Room } from "../../layout.ts";
import { Grid, hash, mix, rng, shade } from "../../themekit.ts";
import { C, noise, OUTLINE, rect, STICKERS, text } from "./kit.ts";
import { planOf, type Cell, type StartupPlan } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;
type Gap = [number, number];

const HALF = 10;

function put(ctx: Ctx, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

function speck(ctx: Ctx, r: Rect, colors: string[], density: number, seed: number): void {
  const rr = rng(seed);
  const n = Math.round(r.w * r.h * density);
  for (let i = 0; i < n; i++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, colors[i % colors.length]!);
}

// ------------------------------------------------------------------ floors

/** Wall-to-wall carpet: flecked, a little flattened, with the odd stain. */
function carpet(ctx: Ctx, r: Rect, base: string, seed: number, stains = true): void {
  rect(ctx, r.x, r.y, r.w, r.h, base);
  speck(ctx, r, [shade(base, 0.08), shade(base, -0.06), shade(base, -0.1)], 0.22, seed);
  if (!stains) return;
  const rr = rng(seed + 7);
  for (let i = 0; i < Math.max(1, Math.round((r.w * r.h) / 9000)); i++) {
    const sx = r.x + 8 + Math.floor(rr() * Math.max(1, r.w - 24));
    const sy = r.y + 8 + Math.floor(rr() * Math.max(1, r.h - 20));
    const c = rr() < 0.5 ? shade(base, -0.12) : mix(base, "#8a6a4a", 0.25);
    rect(ctx, sx, sy, 6, 3, c);
    rect(ctx, sx + 1, sy - 1, 4, 5, c);
    rect(ctx, sx + 6, sy + 1, 2, 1, c);
  }
}

/** Retro checkered vinyl, cream and avocado. */
function vinyl(ctx: Ctx, r: Rect, seed: number): void {
  const s = 8;
  for (let y = r.y; y < r.y + r.h; y += s) {
    for (let x = r.x; x < r.x + r.w; x += s) {
      const k = (Math.floor((x - r.x) / s) + Math.floor((y - r.y) / s)) % 2;
      const w = Math.min(s, r.x + r.w - x);
      const h = Math.min(s, r.y + r.h - y);
      rect(ctx, x, y, w, h, k ? "#efe4c6" : "#b9c79a");
      rect(ctx, x, y, w, 1, k ? "#f7eed6" : "#c9d5aa");
    }
  }
  speck(ctx, r, ["#d8ccac", "#a3b386"], 0.03, seed);
}

/** Honey oak boards along the run (`across`: planks run left to right). */
function oak(ctx: Ctx, r: Rect, seed: number, across = true): void {
  const rr = rng(seed);
  if (across) {
    for (let y = r.y; y < r.y + r.h; y += 5) {
      const h = Math.min(5, r.y + r.h - y);
      const base = (y / 5) % 2 ? C.oak : "#c48a50";
      rect(ctx, r.x, y, r.w, h, base);
      rect(ctx, r.x, y, r.w, 1, shade(base, 0.1));
      rect(ctx, r.x, y + h - 1, r.w, 1, C.oakLo);
      for (let x = r.x - Math.floor(rr() * 40); x < r.x + r.w; x += 28 + Math.floor(rr() * 26)) if (x > r.x) rect(ctx, x, y, 1, h - 1, C.oakLo);
    }
  } else {
    for (let x = r.x; x < r.x + r.w; x += 5) {
      const w = Math.min(5, r.x + r.w - x);
      const base = (x / 5) % 2 ? C.oak : "#c48a50";
      rect(ctx, x, r.y, w, r.h, base);
      rect(ctx, x, r.y, 1, r.h, shade(base, 0.1));
      rect(ctx, x + w - 1, r.y, 1, r.h, C.oakLo);
      for (let y = r.y - Math.floor(rr() * 40); y < r.y + r.h; y += 28 + Math.floor(rr() * 26)) if (y > r.y) rect(ctx, x, y, w - 1, 1, C.oakLo);
    }
  }
  speck(ctx, r, [C.oakHi, C.oakLo], 0.02, seed + 1);
}

/** Saltillo tiles: terracotta squares with wide grout, each a slightly different bake. */
function terracotta(ctx: Ctx, r: Rect, seed: number): void {
  const s = 12;
  rect(ctx, r.x, r.y, r.w, r.h, "#b8a98c");
  for (let y = r.y; y < r.y + r.h; y += s) {
    for (let x = r.x; x < r.x + r.w; x += s) {
      const n = noise(x, y, seed);
      const base = n < 0.3 ? C.terra : n < 0.6 ? "#c4794f" : n < 0.85 ? "#cf8a5e" : "#b96f47";
      const w = Math.min(s - 1, r.x + r.w - x);
      const h = Math.min(s - 1, r.y + r.h - y);
      rect(ctx, x, y, w, h, base);
      rect(ctx, x, y, w, 1, shade(base, 0.12));
      rect(ctx, x, y, 1, h, shade(base, 0.06));
      if (n > 0.92) rect(ctx, x + 3, y + 4, 2, 2, shade(base, -0.15));
    }
  }
}

/** Garage concrete: speckled, saw-cut joints, an oil stain where the car used to be. */
function concrete(ctx: Ctx, r: Rect, seed: number, oil = true): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.concrete);
  speck(ctx, r, [C.concreteHi, C.concreteLo, "#9e9a90"], 0.2, seed);
  for (let x = r.x + 48; x < r.x + r.w - 8; x += 64) rect(ctx, x, r.y, 1, r.h, C.concreteLo);
  for (let y = r.y + 52; y < r.y + r.h - 8; y += 64) rect(ctx, r.x, y, r.w, 1, C.concreteLo);
  if (oil && r.w > 60 && r.h > 50) {
    const cx = r.x + Math.round(r.w * 0.55);
    const cy = r.y + Math.round(r.h * 0.45);
    ctx.fillStyle = "rgba(40,36,44,0.22)";
    ctx.fillRect(cx - 9, cy - 3, 18, 7);
    ctx.fillRect(cx - 6, cy - 5, 12, 11);
    ctx.fillStyle = "rgba(40,36,44,0.18)";
    ctx.fillRect(cx + 10, cy + 3, 4, 3);
  }
}

/** The lawn: mowed stripes, clover, the odd dry patch. */
function lawn(ctx: Ctx, r: Rect, seed: number): void {
  for (let x = r.x; x < r.x + r.w; x += 10) rect(ctx, x, r.y, Math.min(10, r.x + r.w - x), r.h, Math.floor((x - r.x) / 10) % 2 ? C.grass : "#8fc161");
  speck(ctx, r, [C.grassLo, C.grassHi, "#7aab52"], 0.16, seed);
  const rr = rng(seed + 3);
  for (let i = 0; i < Math.round((r.w * r.h) / 5000); i++) {
    const x = r.x + Math.floor(rr() * (r.w - 12));
    const y = r.y + Math.floor(rr() * (r.h - 8));
    ctx.fillStyle = "rgba(200,180,90,0.35)";
    ctx.fillRect(x, y, 10, 4);
    ctx.fillRect(x + 2, y - 1, 6, 6);
  }
  // Tiny white clover flowers.
  for (let i = 0; i < Math.round((r.w * r.h) / 900); i++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, "#f4f6e8");
}

/** Patio pavers in a running bond. */
function pavers(ctx: Ctx, r: Rect, seed: number): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.paverLo);
  for (let y = r.y, row = 0; y < r.y + r.h; y += 8, row++) {
    for (let x = r.x - (row % 2) * 8; x < r.x + r.w; x += 16) {
      const x0 = Math.max(r.x, x);
      const w = Math.min(x + 15, r.x + r.w) - x0;
      const h = Math.min(7, r.y + r.h - y);
      if (w <= 0 || h <= 0) continue;
      const n = noise(x, y, seed);
      const base = n < 0.4 ? C.paver : n < 0.8 ? "#d2c6ad" : "#ddd3bd";
      rect(ctx, x0, y, w, h, base);
      rect(ctx, x0, y, w, 1, "#e8dfcc");
    }
  }
}

/** Stepping stones through the side yard. */
function steppingStones(ctx: Ctx, r: Rect): void {
  for (let y = r.y + 3; y + 6 <= r.y + r.h; y += 11) {
    const x = r.x + Math.round(r.w / 2) - 5 + ((y / 11) % 2 ? 1 : -1);
    rect(ctx, x, y + 1, 10, 6, C.paverLo);
    rect(ctx, x + 1, y, 8, 8, C.paverLo);
    rect(ctx, x + 1, y + 1, 8, 5, C.paver);
    rect(ctx, x + 2, y + 1, 5, 1, "#e8dfcc");
  }
}

/** The pool: cool deck coping, a blue basin gone a touch green, steps, a skimmer, leaves. */
function pool(ctx: Ctx, r: Rect): void {
  const { x, y, w, h } = r;
  rect(ctx, x - 4, y - 4, w + 8, h + 8, "#bfb39a");
  rect(ctx, x - 3, y - 3, w + 6, h + 6, "#efe7d4");
  for (let i = x - 3; i < x + w + 3; i += 8) rect(ctx, i, y - 3, 1, 3, "#d9cfb8");
  for (let i = x - 3; i < x + w + 3; i += 8) rect(ctx, i, y + h, 1, 3, "#d9cfb8");
  rect(ctx, x - 3, y - 3, w + 6, 1, "#fbf7ec");
  // The far wall in shade, then the water from aqua to a greener deep end.
  rect(ctx, x, y, w, h, C.poolLo);
  rect(ctx, x, y, w, 3, "#25808c");
  for (let j = 3; j < h; j++) {
    const k = j / h;
    rect(ctx, x, y + j, w, 1, mix(mix("#5cc9cf", "#43b2bc", k), C.poolGreen, 0.18 + k * 0.12));
  }
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  for (let i = x + 6; i < x + w; i += 10) ctx.fillRect(i, y + 4, 1, h - 5);
  for (let j = y + 9; j < y + h; j += 10) ctx.fillRect(x, j, w, 1);
  // A dark tile band along the waterline and steps in the near left corner.
  rect(ctx, x, y + 3, w, 1, "#2a6f88");
  for (let s = 0; s < 3; s++) rect(ctx, x, y + h - 4 - s * 4, 14 - s * 4, 2, "rgba(255,255,255,0.4)");
  // The skimmer lid and a couple of leaves floating.
  rect(ctx, x + w - 8, y - 3, 5, 2, "#d0c8b4");
  rect(ctx, x + w - 7, y - 3, 3, 1, "#e2dccb");
  for (const [lx, ly] of [[0.3, 0.4], [0.7, 0.65], [0.55, 0.2]] as const) {
    rect(ctx, x + Math.round(w * lx), y + Math.round(h * ly), 2, 1, "#9a8a3a");
    rect(ctx, x + Math.round(w * lx) + 1, y + Math.round(h * ly) + 1, 1, 1, "#7a6a2a");
  }
}

/** The redwood fence along the bottom of the yard. */
function fence(ctx: Ctx, x0: number, x1: number, y: number): void {
  for (let x = x0; x < x1; x += 4) {
    const w = Math.min(4, x1 - x);
    rect(ctx, x, y, w, 5, (x / 4) % 2 ? C.fence : "#9c6842");
    rect(ctx, x, y, w, 1, C.fenceHi);
    rect(ctx, x + w - 1, y, 1, 5, C.fenceLo);
  }
  rect(ctx, x0, y + 2, x1 - x0, 1, C.fenceLo);
  ctx.fillStyle = "rgba(40,60,20,0.25)";
  ctx.fillRect(x0, y - 2, x1 - x0, 2);
}

function cellFloor(ctx: Ctx, c: Cell, seed: number): void {
  const r = c.r;
  switch (c.kind) {
    case "living":
      carpet(ctx, r, C.carpet, seed);
      break;
    case "kitchen":
      vinyl(ctx, r, seed);
      break;
    case "entry":
      terracotta(ctx, r, seed);
      break;
    case "garage":
      concrete(ctx, r, seed);
      break;
    case "yard":
      break;
  }
}

// ------------------------------------------------------------------ the floor step

let baking: Layout | null = null;

function floor(ctx: Ctx, L: Layout): void {
  baking = L;
  const plan = planOf(L);
  if (!plan) {
    oak(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 11);
    return;
  }
  const lot = plan.lot;
  // The lot: lawn everywhere the house isn't.
  lawn(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 404);
  sideYards(ctx, L, plan);
  // The house: oak under everything, the hallways are what's left between the rooms.
  const top = Math.min(...L.segments.map((sg) => sg.depth)) - 8;
  oak(ctx, { x: lot.x0, y: top, w: lot.x1 - lot.x0, h: lot.back - top }, 11);
  const h1 = L.net.halls[0]!;
  runner(ctx, lot.x0 + 6, lot.x1 - 6, h1);
  plan.cells.forEach((c, i) => cellFloor(ctx, c, hash(`startup-cell-${i}-${c.r.x}-${c.r.y}`)));
  const y = plan.yard;
  if (y) {
    if (plan.patio) pavers(ctx, { x: plan.patio.x0, y: plan.patio.y, w: plan.patio.x1 - plan.patio.x0, h: HALF * 2 }, 7);
    // Stepping stones where the aisles cross the lawn.
    for (const ax of L.net.aisles) {
      if (ax < y.r.x || ax > y.r.x + y.r.w) continue;
      const t = plan.patio && plan.patio.x0 <= ax && plan.patio.x1 >= ax ? plan.patio.y + HALF * 2 : y.r.y;
      steppingStones(ctx, { x: ax - 6, y: t, w: 12, h: L.H - 6 - t });
    }
    pool(ctx, y.pool);
    if (y.beds) vegBeds(ctx, y.beds);
    fence(ctx, 0, L.W, L.H - 5);
  }
  outerWalls(ctx, L, plan);
  const g = plan.garage;
  if (g?.door) garageDoor(ctx, g.door);
  // A doormat inside the front door.
  const d = L.wall.door;
  const seg = L.segments.find((s) => d.x + d.w / 2 >= s.x0 && d.x + d.w / 2 < s.x1);
  if (seg) doormat(ctx, d.x - 3, seg.depth + 1);
}

/** Raised vegetable beds along the back fence: tomatoes on stakes, lettuce, a scarecrow made of a hoodie. */
function vegBeds(ctx: Ctx, r: Rect): void {
  for (let x = r.x; x + 30 <= r.x + r.w; x += 38) {
    rect(ctx, x, r.y, 30, r.h, OUTLINE);
    rect(ctx, x + 1, r.y + 1, 28, r.h - 2, C.woodLo);
    rect(ctx, x + 1, r.y + 1, 28, 1, C.woodHi);
    rect(ctx, x + 3, r.y + 3, 24, r.h - 6, "#6a4a2e");
    for (let k = 0; k < 4; k++) {
      const px = x + 5 + k * 6;
      rect(ctx, px, r.y + 4, 3, 4, C.palm);
      rect(ctx, px + 1, r.y + 5, 1, 1, (k + x) % 2 ? "#e5544b" : C.palmHi);
      rect(ctx, px, r.y + 10, 3, 3, C.palmHi);
    }
  }
}

/** The house's own walls on its lot: stucco down both sides with the roof's eave beyond them. */
function outerWalls(ctx: Ctx, L: Layout, plan: StartupPlan): void {
  const { x0, x1, back } = plan.lot;
  const yTop = (x: number) => L.segments.find((sg) => x >= sg.x0 && x < sg.x1)?.depth ?? L.segments[0]!.depth;
  const bottom = Math.min(back + 1, L.H);
  for (const [x, side] of [[x0, -1], [x1 - 5, 1]] as const) {
    const t = Math.min(yTop(x0), yTop(x1 - 1)) - 6;
    // The eave: a strip of roof tiles just outside the wall.
    if ((side < 0 && x0 >= 4) || (side > 0 && x1 <= L.W - 4)) {
      const ex = side < 0 ? x - 4 : x + 5;
      for (let yy = plan.lot.front; yy < bottom; yy += 3) {
        rect(ctx, ex, yy, 4, 3, (yy / 3) % 2 ? "#b85a3a" : "#c86a44");
        rect(ctx, side < 0 ? ex : ex + 3, yy, 1, 3, "#8a3a24");
      }
      ctx.fillStyle = "rgba(30,40,20,0.22)";
      ctx.fillRect(side < 0 ? ex - 3 : ex + 4, plan.lot.front, 3, bottom - plan.lot.front);
    }
    rect(ctx, x, t, 5, bottom - t, OUTLINE);
    rect(ctx, x + 1, t, 3, bottom - t, "#efe2c6");
    rect(ctx, x + (side < 0 ? 3 : 1), t, 1, bottom - t, "#d8c49e");
  }
  // The eave along the back over the patio.
  if (plan.patio && back < L.H - 4) {
    for (let xx = x0 - 4; xx < x1 + 4; xx += 3) {
      rect(ctx, xx, back + 1, 3, 3, (xx / 3) % 2 ? "#b85a3a" : "#c86a44");
      rect(ctx, xx, back + 3, 3, 1, "#8a3a24");
    }
  }
}

/**
 * The side yards between the house and the neighbours: the driveway down the
 * left to the garage with the beat-up hatchback on it, garden beds, hedges
 * along the neighbours' fences, the trash cans, the side gate to the backyard.
 */
function sideYards(ctx: Ctx, L: Layout, plan: StartupPlan): void {
  const { x0, x1, front } = plan.lot;
  const bottom = plan.patio ? plan.patio.y : L.H;
  const rr = rng(9091);
  // The neighbours' fences along the panel's edges, a hedge inside them.
  for (const [fx, w] of [[0, x0], [x1, L.W - x1]] as const) {
    if (w < 8) continue;
    const edge = fx === 0 ? 0 : L.W - 3;
    for (let y = front; y < L.H - 5; y += 4) {
      rect(ctx, edge, y, 3, 4, (y / 4) % 2 ? C.fence : "#9c6842");
      rect(ctx, edge, y, 3, 1, C.fenceHi);
    }
    const hx = fx === 0 ? 3 : L.W - 3 - Math.min(10, w - 4);
    const hw = Math.min(10, w - 4);
    if (hw >= 5) {
      for (let y = front + 2; y < bottom - 2; y += 6) {
        rect(ctx, hx, y, hw, 7, C.palmLo);
        rect(ctx, hx + 1, y, hw - 2, 5, C.palm);
        rect(ctx, hx + 2, y + 1, 2, 2, C.palmHi);
      }
    }
  }
  // The driveway down the left side to the garage door, the car on it.
  const g = plan.garage?.door;
  const dw = Math.min(30, x0 - 14);
  if (g && dw >= 14) {
    const dx = x0 - dw - 1;
    const dy = front;
    const dh = g.y + g.h + 6 - dy;
    rect(ctx, dx, dy, dw, dh, C.concrete);
    for (let y = dy + 24; y < dy + dh; y += 28) rect(ctx, dx, y, dw, 1, C.concreteLo);
    for (let i = 0; i < (dw * dh) / 12; i++) rect(ctx, dx + Math.floor(rr() * dw), dy + Math.floor(rr() * dh), 1, 1, i % 2 ? C.concreteHi : C.concreteLo);
    ctx.fillStyle = "rgba(40,36,44,0.2)";
    ctx.fillRect(dx + Math.round(dw / 2) - 4, g.y - 30, 8, 12);
    if (dw >= 18) hatchback(ctx, dx + Math.round(dw / 2) - 7, Math.max(dy + 4, g.y - 36));
  }
  // Garden beds and the trash cans on the right; beds on the left when it's roomy.
  const beds = (bx: number, bw: number) => {
    for (let y = front + 14; y + 22 <= bottom - 8; y += 34) {
      rect(ctx, bx, y, bw, 22, "#7a5a3a");
      rect(ctx, bx + 1, y + 1, bw - 2, 20, "#6a4a2e");
      for (let k = 0; k < Math.floor(bw / 6); k++) {
        const px = bx + 3 + k * 6;
        const c = (k + y) % 3 === 0 ? "#e5544b" : (k + y) % 3 === 1 ? C.palm : C.yellow;
        rect(ctx, px, y + 4, 3, 3, C.palm);
        rect(ctx, px + 1, y + 5, 1, 1, c);
        rect(ctx, px, y + 13, 3, 3, C.palmHi);
      }
    }
  };
  const rw = L.W - x1;
  if (rw >= 26) beds(x1 + 10, Math.min(40, rw - 22));
  if (x0 >= 70) beds(5 + 12, Math.min(40, x0 - dw - 34));
  if (rw >= 18) {
    // The trash and recycling cans by the side gate, and the gate itself.
    const tx = x1 + 6;
    const ty = bottom - 22;
    for (const [i, c] of ["#4a5a4a", "#3a74c4"].entries()) {
      rect(ctx, tx + i * 9, ty, 8, 12, OUTLINE);
      rect(ctx, tx + i * 9 + 1, ty + 1, 6, 10, c);
      rect(ctx, tx + i * 9 + 1, ty + 1, 6, 2, shade(c, 0.2));
    }
    if (plan.patio) {
      const gy = plan.patio.y - 3;
      rect(ctx, x1 + 1, gy, rw - 1, 3, C.fenceLo);
      for (let x = x1 + 2; x < L.W - 2; x += 3) rect(ctx, x, gy, 2, 3, C.fence);
      rect(ctx, x1 + 4, gy - 1, Math.min(14, rw - 6), 1, C.fenceHi);
    }
  }
}

/** Our beat-up hatchback, seen from above: faded red, one blue door, a surfboard rack. */
function hatchback(ctx: Ctx, x: number, y: number): void {
  const g = new Grid(14, 26);
  g.rrect(1, 1, 12, 24, "#c4685a", 2);
  g.rect(2, 2, 10, 2, "#d88878");
  g.rect(2, 6, 10, 5, "#9ac8e8");
  g.rect(2, 7, 10, 1, "#c8e4f4");
  g.rect(2, 12, 10, 7, "#b85a4c");
  g.rect(1, 12, 1, 5, "#4a7ac0").rect(12, 13, 1, 4, "#c4685a");
  g.rect(2, 20, 10, 3, "#9ac8e8");
  g.rect(3, 12, 8, 1, "#e8d4a8").rect(3, 18, 8, 1, "#e8d4a8");
  g.set(2, 1, "#fff3c0").set(11, 1, "#fff3c0").set(2, 24, "#e5544b").set(11, 24, "#e5544b");
  g.outline(OUTLINE);
  put(ctx, g, x, y);
}

function runner(ctx: Ctx, x0: number, x1: number, hy: number): void {
  const y = hy - 5;
  rect(ctx, x0, y, x1 - x0, 10, "#7a3a3a");
  rect(ctx, x0, y + 1, x1 - x0, 8, "#a8463e");
  rect(ctx, x0, y + 2, x1 - x0, 1, "#e0b060");
  rect(ctx, x0, y + 7, x1 - x0, 1, "#e0b060");
  for (let x = x0 + 4; x < x1; x += 12) {
    rect(ctx, x, y + 4, 3, 2, "#2f4f6e");
    rect(ctx, x + 6, y + 4, 2, 2, "#e0b060");
  }
  ctx.fillStyle = "rgba(60,30,20,0.18)";
  ctx.fillRect(x0, y + 10, x1 - x0, 1);
}

function doormat(ctx: Ctx, x: number, y: number): void {
  rect(ctx, x, y, 26, 7, "#5a4430");
  rect(ctx, x + 1, y + 1, 24, 5, "#8a6a42");
  for (let i = x + 2; i < x + 24; i += 2) rect(ctx, i, y + 1, 1, 5, "#7a5a36");
  const g = new Grid(14, 6);
  text(g, "HI", 3, 0, "#3a2a1a");
  put(ctx, g, x + 6, y + 1);
}

/** The roll-up garage door in the house's side wall, onto the driveway: white panels seen edge-on. */
function garageDoor(ctx: Ctx, r: Rect): void {
  rect(ctx, r.x - 1, r.y - 2, r.w + 2, r.h + 4, "#6a6a70");
  rect(ctx, r.x, r.y, r.w, r.h, "#eeeeea");
  rect(ctx, r.x, r.y, 1, r.h, "#ffffff");
  for (let y = r.y + 6; y < r.y + r.h - 2; y += 6) rect(ctx, r.x, y, r.w, 1, "#c9c9c4");
  rect(ctx, r.x + 1, r.y + Math.round(r.h / 2) - 3, 1, 6, "#8a8a90");
}

// ------------------------------------------------------------------ the front wall

function wallColor(L: Layout, x0: number, x1: number, depth: number): { base: string; hi: string; lo: string; kitchen: boolean } {
  const k = L.kitchen;
  const kitchen = !L.portrait && k.y - 12 <= depth + 20 && k.x < x1 && k.x + k.w > x0;
  return kitchen ? { base: C.mint, hi: "#e2efdd", lo: C.mintLo, kitchen } : { base: C.wall, hi: C.wallHi, lo: C.wallLo, kitchen };
}

/** What hangs on the front wall (fixtures, windows, the TV): stay clear of it. */
function busyOnWall(L: Layout): Rect[] {
  const w = L.wall;
  const out: Rect[] = [w.pinboard, w.calendar, w.status, w.legendNote, { x: w.door.x - 4, y: w.door.y - 14, w: w.door.w + 8, h: w.door.h + 16 }, { x: w.clock.x - 12, y: 0, w: 24, h: 30 }];
  for (const win of w.windows) out.push({ x: win.x - 3, y: win.y - 3, w: win.w + 6, h: win.h + 8 });
  for (const p of w.paintings) out.push({ x: p.x - 2, y: 0, w: 20, h: 40 });
  const seg = L.segments.find((s) => L.tv.x >= s.x0 && L.tv.x < s.x1);
  if (seg && L.tv.y < seg.depth) out.push({ x: L.tv.x - 18, y: L.tv.y - 4, w: L.tv.w + 36, h: L.tv.h + 10 });
  for (const s of L.speakers) out.push({ x: s.x - 2, y: s.y - 2, w: s.w + 4, h: s.h + 4 });
  for (const p of L.props) {
    const sg = L.segments.find((s) => p.x >= s.x0 && p.x < s.x1);
    if (sg && p.y < sg.depth + 4 && p.kind !== "tv") out.push({ x: p.x - 2, y: 0, w: (p.w ?? 26) + 4, h: sg.depth });
  }
  for (const pl of L.plants) if (pl.sprite === "HANGING_PLANT") out.push({ x: pl.x - 2, y: 0, w: 20, h: 34 });
  return out;
}

const hits = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function wall(ctx: Ctx, L: Layout): void {
  const plan = planOf(L);
  const M = plan?.lot.front ?? 0;
  if (plan && M > 0) street(ctx, L, plan);
  L.segments.forEach((sg, i) => {
    const d = sg.depth;
    const w = sg.x1 - sg.x0;
    const col = wallColor(L, sg.x0, sg.x1, d);
    rect(ctx, sg.x0, M, w, d - M, col.base);
    // Drywall seams and the odd nail pop.
    for (let x = sg.x0 + 30 + (i * 17) % 20; x < sg.x1 - 4; x += 48) rect(ctx, x, M + 3, 1, d - M - 10, shade(col.base, -0.03));
    speck(ctx, { x: sg.x0, y: M + 3, w, h: d - M - 10 }, [shade(col.base, -0.05), shade(col.base, 0.05)], 0.02, 31 + i);
    // Crown molding and the ceiling shadow.
    rect(ctx, sg.x0, M, w, 3, C.trim);
    rect(ctx, sg.x0, M + 3, w, 1, C.trimLo);
    rect(ctx, sg.x0, M + 4, w, 1, shade(col.base, -0.06));
    if (col.kitchen) {
      // Subway tile behind the counter.
      const ty = d - 22;
      rect(ctx, sg.x0, ty, w, 16, "#f6f4ee");
      for (let y = ty; y < ty + 16; y += 4) {
        rect(ctx, sg.x0, y + 3, w, 1, "#d9d6cc");
        for (let x = sg.x0 + ((y - ty) / 4) % 2 * 4; x < sg.x1; x += 8) rect(ctx, x, y, 1, 3, "#d9d6cc");
      }
    }
    // The baseboard.
    rect(ctx, sg.x0, d - 6, w, 5, C.trim);
    rect(ctx, sg.x0, d - 6, w, 1, "#ffffff");
    rect(ctx, sg.x0, d - 2, w, 1, C.trimLo);
    rect(ctx, sg.x0, d - 1, w, 1, "#a99a7a");
    ctx.fillStyle = "rgba(70,50,30,0.16)";
    ctx.fillRect(sg.x0, d, w, 3);
  });
  // Corners where the wall steps in or out.
  for (const px of L.wall.pillars) {
    const left = L.segments.find((s) => s.x1 === px);
    const right = L.segments.find((s) => s.x0 === px);
    const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
    rect(ctx, px - 3, M, 6, d + 2 - M, C.wallHi);
    rect(ctx, px - 3, M, 1, d + 2 - M, "#fffaf0");
    rect(ctx, px + 2, M, 1, d + 2 - M, C.wallDk);
    rect(ctx, px - 3, d - 6, 6, 5, C.trim);
    rect(ctx, px - 3, d - 1, 6, 1, "#a99a7a");
  }
  // Outlets along the baseboard, every one with a power strip and a tangle of cords.
  const busy = busyOnWall(L);
  for (const sg of L.segments) {
    const d = sg.depth;
    for (let x = sg.x0 + 22; x < sg.x1 - 16; x += 70) {
      const r = { x: x - 2, y: d - 16, w: 12, h: 18 };
      if (busy.some((b) => hits(b, r)) || L.wall.pillars.some((p) => Math.abs(p - x) < 10)) continue;
      outlet(ctx, x, d - 14, hash(`outlet${x}`));
    }
  }
}

/**
 * Out front, over the roof: the street with its dashed line and a neighbour's
 * car, the curb and sidewalk, the strip of front lawn with our mailbox where
 * the driveway meets the street, and the roof's tiled edge along the house.
 */
function street(ctx: Ctx, L: Layout, plan: StartupPlan): void {
  const { x0, x1, front: M } = plan.lot;
  const W = L.W;
  rect(ctx, 0, 0, W, 11, "#6a6e78");
  speck(ctx, { x: 0, y: 0, w: W, h: 11 }, ["#5e626c", "#767a84"], 0.12, 77);
  for (let x = 4; x < W; x += 14) rect(ctx, x, 5, 7, 1, "#e8d48a");
  rect(ctx, 0, 11, W, 1, "#c8c4bc");
  rect(ctx, 0, 12, W, 3, "#d8d4cc");
  for (let x = 8; x < W; x += 16) rect(ctx, x, 12, 1, 3, "#c4c0b8");
  // The front lawn strip, the driveway across it.
  rect(ctx, 0, 15, W, M - 15, C.grass);
  speck(ctx, { x: 0, y: 15, w: W, h: M - 15 }, [C.grassLo, C.grassHi], 0.18, 78);
  const g = plan.garage?.door;
  const dw = Math.min(30, x0 - 14);
  if (g && dw >= 14) {
    const dx = x0 - dw - 1;
    rect(ctx, dx, 12, dw, M - 12, C.concrete);
    rect(ctx, dx, 12, dw, 1, C.concreteHi);
    // The mailbox by the driveway, flag up.
    const mx = Math.max(2, dx - 8);
    rect(ctx, mx + 2, M - 12, 1, 6, "#6a4a30");
    rect(ctx, mx - 1, M - 16, 7, 5, OUTLINE);
    rect(ctx, mx, M - 15, 5, 3, "#3a5aa0");
    rect(ctx, mx + 5, M - 17, 1, 3, "#e5544b");
  }
  // A street lamp on the sidewalk.
  const lx = Math.round(W * 0.3);
  rect(ctx, lx, 3, 1, 11, "#5a5e68");
  rect(ctx, lx - 1, 2, 4, 2, "#3a3e48");
  rect(ctx, lx, 3, 2, 1, "#fff1b8");
  // A neighbour's car parked along the curb.
  const cx = Math.round(W * 0.62);
  const car = new Grid(26, 12);
  car.rrect(1, 1, 24, 9, "#e8e4da", 2);
  car.rect(6, 2, 6, 7, "#9ac8e8").rect(15, 2, 4, 7, "#9ac8e8");
  car.set(1, 3, "#fff3c0").set(1, 7, "#fff3c0").set(24, 3, "#e5544b").set(24, 7, "#e5544b");
  car.outline(OUTLINE);
  put(ctx, car, cx, 0);
  // The roof's tiled edge along the house's front.
  for (let x = x0 - 4; x < x1 + 4; x += 3) {
    for (let y = M - 7; y < M; y += 2) rect(ctx, x + ((y - M) % 4 ? 1 : 0), y, 3, 2, (x / 3 + y) % 2 ? "#c86a44" : "#b85a3a");
  }
  rect(ctx, x0 - 4, M - 8, x1 - x0 + 8, 1, "#e08a5a");
  rect(ctx, x0 - 4, M - 1, x1 - x0 + 8, 1, "#7a3420");
  ctx.fillStyle = "rgba(30,40,20,0.22)";
  ctx.fillRect(x0 - 7, M - 6, 3, 6);
  ctx.fillRect(x1 + 4, M - 6, 3, 6);
}

function outlet(ctx: Ctx, x: number, y: number, seed: number): void {
  rect(ctx, x, y, 5, 7, "#fbf8f0");
  rect(ctx, x, y, 5, 7, "#fbf8f0");
  rect(ctx, x - 1, y - 1, 7, 1, OUTLINE);
  rect(ctx, x - 1, y + 7, 7, 1, OUTLINE);
  rect(ctx, x - 1, y, 1, 7, OUTLINE);
  rect(ctx, x + 5, y, 1, 7, OUTLINE);
  rect(ctx, x + 1, y + 1, 1, 2, "#6a6a6a");
  rect(ctx, x + 3, y + 1, 1, 2, "#6a6a6a");
  // Plugged in: cords drooping to the floor, a cube adapter.
  const cords = ["#2e2c36", "#f4f4f0", "#2e2c36", "#e6a03a"];
  for (let i = 0; i < 2 + (seed % 2); i++) {
    const cx = x + 1 + i * 2;
    rect(ctx, cx, y + 4, 1, 10, cords[(seed + i) % cords.length]!);
  }
  rect(ctx, x + 1, y + 4, 3, 3, "#2e2c36");
  rect(ctx, x + 1, y + 4, 3, 1, "#4a4856");
}

// ------------------------------------------------------------------ room floors

function room(ctx: Ctx, room: Room, L: Layout): void {
  const r = room.rect;
  switch (room.kind) {
    case "meeting":
      // The bedroom's blue-grey carpet.
      carpet(ctx, { x: r.x - 1, y: r.y - 4, w: r.w + 2, h: r.h + 4 }, "#8f9fb2", hash(`bunk${r.x}`), false);
      break;
    case "boss": {
      // Your room: oak, a shag rug, a yoga mat rolled out by the wall.
      oak(ctx, { x: r.x - 1, y: r.y - 4, w: r.w + 2, h: r.h + 4 }, 91);
      const rw = Math.min(r.w - 30, 110);
      const rh = Math.min(r.h - 40, 60);
      const rx = r.x + Math.round((r.w - rw) / 2) + 6;
      const ry = r.y + 22;
      rect(ctx, rx, ry, rw, rh, "#d8cdb8");
      rect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, "#e8dfcb");
      speck(ctx, { x: rx + 2, y: ry + 2, w: rw - 4, h: rh - 4 }, ["#d4c8b0", "#f4ecdc"], 0.4, 92);
      for (let x = rx; x < rx + rw; x += 2) rect(ctx, x, ry + rh, 1, 1, "#d8cdb8");
      break;
    }
    case "server":
      concrete(ctx, { x: r.x, y: r.y - 2, w: r.w, h: r.h + 2 }, 77, false);
      // Rubber anti-fatigue mat.
      rect(ctx, r.x + 3, r.y + 2, r.w - 6, r.h - 6, "#3a3a42");
      for (let x = r.x + 5; x < r.x + r.w - 4; x += 3) for (let y = r.y + 4; y < r.y + r.h - 5; y += 3) rect(ctx, x, y, 1, 1, "#4a4a54");
      break;
    case "lounge": {
      // A big, slightly frayed area rug under the sectional and the coffee table.
      const c = L.couch;
      const rw = Math.min(r.w - 70, 132);
      const rx = Math.round(c.x + c.w / 2 - rw / 2);
      const ry = c.y - 32;
      const rh = 66;
      rect(ctx, rx, ry, rw, rh, "#5a6f8a");
      rect(ctx, rx + 3, ry + 3, rw - 6, rh - 6, "#7f93ad");
      rect(ctx, rx + 6, ry + 6, rw - 12, rh - 12, "#c9b48a");
      rect(ctx, rx + 8, ry + 8, rw - 16, rh - 16, "#7f93ad");
      for (let x = rx + 12; x < rx + rw - 12; x += 8) rect(ctx, x, ry + Math.round(rh / 2), 4, 1, "#c9b48a");
      for (let x = rx; x < rx + rw; x += 2) {
        rect(ctx, x, ry - 1, 1, 1, "#e8dcc0");
        rect(ctx, x, ry + rh, 1, 1, "#e8dcc0");
      }
      ctx.fillStyle = "rgba(90,60,40,0.18)";
      ctx.fillRect(rx + rw - 30, ry + rh - 18, 9, 5);
      break;
    }
    case "waiting": {
      // A jute rug under the chairs, a little frayed.
      const rx = r.x + 14;
      const ry = r.y + 22;
      const rw = r.w - 28;
      const rh = Math.min(r.h - 30, 62);
      if (rw < 30 || rh < 20) break;
      rect(ctx, rx, ry, rw, rh, "#b89a6a");
      rect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, "#cdb284");
      for (let y = ry + 3; y < ry + rh - 3; y += 3) for (let x = rx + 3 + ((y - ry) % 6 ? 1 : 0); x < rx + rw - 3; x += 3) rect(ctx, x, y, 1, 1, "#bfa272");
      rect(ctx, rx + 4, ry + 4, rw - 8, 1, "#9a7a4a");
      rect(ctx, rx + 4, ry + rh - 5, rw - 8, 1, "#9a7a4a");
      for (let x = rx; x < rx + rw; x += 2) {
        rect(ctx, x, ry - 1, 1, 1, "#d8c49a");
        rect(ctx, x, ry + rh, 1, 1, "#d8c49a");
      }
      break;
    }
    case "games":
      // Painted lines from a long-gone pickleball phase.
      ctx.fillStyle = "rgba(255,255,240,0.28)";
      ctx.fillRect(r.x + 4, r.y + r.h - 6, r.w - 8, 1);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ walled rooms

function roomWalls(ctx: Ctx, room: Room, L: Layout): void {
  const r = room.rect;
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 1;
  if (room.kind === "server") {
    cage(ctx, r, room.doorSide === "top" ? room.doorX ?? -1 : -1);
    return;
  }
  // Drywall on both sides, a cap along the top with your door, if it's not the front wall.
  const top = r.y - (atWall ? 2 : 8);
  for (const x of [r.x - 2, r.x + r.w - 1]) vWall(ctx, x + 1, top, r.y + r.h - 9, false);
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    const runsOf = gap >= 0 ? [[r.x - 2, gap - 10], [gap + 10, r.x + r.w + 1]] : [[r.x - 2, r.x + r.w + 1]];
    for (const [a, b] of runsOf) hWall(ctx, a!, b!, r.y - 6, false);
    if (gap >= 0) {
      doorFrame(ctx, gap - 10, r.y - 6, true);
      doorFrame(ctx, gap + 10, r.y - 6, true);
      // The door, swung open against the wall.
      rect(ctx, gap + 11, r.y - 5, 3, 16, OUTLINE);
      rect(ctx, gap + 12, r.y - 5, 1, 15, "#efe6d2");
    }
  }
}

/** The server cage in the garage: wire mesh on steel posts, zip-tied cables. */
function cage(ctx: Ctx, r: Rect, gap: number): void {
  const mesh = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if ((xx + yy) % 3 === 0) rect(ctx, xx, yy, 1, 1, "rgba(200,206,212,0.55)");
  };
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, r.y - 8, 3, r.h + 8, "#6a727c");
    rect(ctx, x + 1, r.y - 8, 1, r.h + 8, "#aab2bc");
  }
  for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
    if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
    rect(ctx, x, r.y - 8, 1, 1, "#6a727c");
    rect(ctx, x, r.y - 1, 1, 1, "#6a727c");
  }
  if (gap >= 0) {
    mesh(r.x, r.y - 7, gap - 9 - r.x, 6);
    mesh(gap + 9, r.y - 7, r.x + r.w - gap - 9, 6);
  } else mesh(r.x, r.y - 7, r.w, 6);
}

// ------------------------------------------------------------------ partitions

/** House walls from above: a white cap, the painted face, a baseboard. Outside walls are stucco. */
function hWall(ctx: Ctx, x0: number, x1: number, y: number, outside: boolean): void {
  const w = x1 - x0;
  if (w <= 0) return;
  const face = outside ? "#e3cfa8" : C.wall;
  rect(ctx, x0, y - 3, w, 1, OUTLINE);
  rect(ctx, x0, y - 2, w, 2, outside ? "#efe2c6" : C.trim);
  rect(ctx, x0, y, w, 5, face);
  if (outside) for (let x = x0 + 1; x < x1; x += 3) rect(ctx, x, y + 1 + (x % 2), 1, 1, shade(face, -0.06));
  rect(ctx, x0, y + 5, w, 2, outside ? "#b08860" : C.trim);
  rect(ctx, x0, y + 7, w, 1, outside ? "#7a5a3a" : "#a99a7a");
  ctx.fillStyle = "rgba(60,40,20,0.2)";
  ctx.fillRect(x0, y + 8, w, 2);
}

function vWall(ctx: Ctx, x: number, y0: number, y1: number, outside: boolean): void {
  if (y1 <= y0) return;
  rect(ctx, x - 2, y0, 4, y1 - y0, OUTLINE);
  rect(ctx, x - 1, y0, 2, y1 - y0, outside ? "#efe2c6" : C.trim);
  ctx.fillStyle = "rgba(60,40,20,0.18)";
  ctx.fillRect(x + 2, y0, 2, y1 - y0);
  // The end of the wall shows its face.
  rect(ctx, x - 2, y1, 4, 6, OUTLINE);
  rect(ctx, x - 1, y1, 2, 5, outside ? "#e3cfa8" : C.wall);
  rect(ctx, x - 1, y1 + 4, 2, 1, outside ? "#b08860" : C.trim);
}

/** Windows and a closed slider in a long outside wall: glass where the stucco face is. */
function glazing(ctx: Ctx, a: number, b: number, y: number): void {
  const len = b - a;
  if (len < 50) return;
  const pane = (x: number, w: number) => {
    rect(ctx, x - 1, y - 1, w + 2, 8, OUTLINE);
    rect(ctx, x, y, w, 6, "#a8cfdc");
    rect(ctx, x, y, w, 1, "#d8eef4");
    rect(ctx, x + 2, y + 2, 2, 1, "#ffffff");
    for (let i = x + Math.floor(w / 2); i < x + w; i += Math.max(8, Math.floor(w / 2))) rect(ctx, i, y, 1, 6, "#e6e9ec");
  };
  // A slider in the middle, windows either side when there's room.
  const mid = Math.round((a + b) / 2);
  pane(mid - 16, 32);
  for (let x = mid - 60; x >= a + 10; x -= 56) pane(x, 18);
  for (let x = mid + 42; x + 18 <= b - 10; x += 56) pane(x, 18);
}

/** A door frame's end on a wall: trim posts either side of a doorway. */
function doorFrame(ctx: Ctx, x: number, y: number, horizontal: boolean): void {
  if (horizontal) {
    rect(ctx, x - 1, y - 3, 3, 11, OUTLINE);
    rect(ctx, x, y - 2, 1, 9, C.trim);
  } else {
    rect(ctx, x - 2, y - 1, 5, 3, OUTLINE);
    rect(ctx, x - 1, y, 3, 1, C.trim);
  }
}

/** A sliding glass door to the patio, open: the glass panel slid over beside the gap. */
function slider(ctx: Ctx, a: number, b: number, y: number): void {
  rect(ctx, a, y + 5, b - a, 2, "#9aa2aa");
  rect(ctx, a, y + 5, b - a, 1, "#c8ced4");
  const pw = Math.min(18, b - a);
  rect(ctx, b, y - 3, pw, 10, OUTLINE);
  rect(ctx, b + 1, y - 2, pw - 2, 8, "#bfdbe6");
  rect(ctx, b + 1, y - 2, pw - 2, 1, "#e6f4f8");
  rect(ctx, b + 3, y, 2, 1, "#ffffff");
  rect(ctx, b + 4, y + 1, 1, 1, "#ffffff");
}

function crossings(L: Layout, plan: StartupPlan, horizontal: boolean, at: number, from: number, to: number): number[] {
  const out: number[] = [];
  const check = (path: Point[]) => {
    for (let i = 0; i + 1 < path.length; i++) {
      const p = path[i]!;
      const q = path[i + 1]!;
      const a = horizontal ? p.y : p.x;
      const b = horizontal ? q.y : q.x;
      if ((a - at) * (b - at) >= 0 && !(a === at && b !== at)) continue;
      const t = (at - a) / (b - a);
      const v = horizontal ? p.x + (q.x - p.x) * t : p.y + (q.y - p.y) * t;
      if (v >= from - 8 && v <= to + 8) out.push(v);
    }
  };
  for (const s of L.spots) check(s.path);
  for (const p of plan.extra) check(p);
  // Hallways and aisles always get through.
  for (const v of horizontal ? L.net.aisles : L.net.halls) if (v >= from - 8 && v <= to + 8) out.push(v);
  return out;
}

function gapsOf(points: number[], half = 11): Gap[] {
  const gaps = points.map((v): Gap => [v - half, v + half]).sort((a, b) => a[0] - b[0]);
  const out: Gap[] = [];
  for (const g of gaps) {
    const last = out[out.length - 1];
    if (last && g[0] <= last[1] + 10) last[1] = Math.max(last[1], g[1]);
    else out.push([g[0], g[1]]);
  }
  return out;
}

function runs(from: number, to: number, gaps: Gap[]): Gap[] {
  const out: Gap[] = [];
  let x = from;
  for (const [a, b] of gaps) {
    if (b <= from || a >= to) continue;
    if (a > x) out.push([x, Math.min(a, to)]);
    x = Math.max(x, b);
  }
  if (x < to) out.push([x, to]);
  return out.filter(([a, b]) => b - a >= 4);
}

function outdoors(plan: StartupPlan, x: number, y: number): boolean {
  const yd = plan.yard?.r;
  if (yd && x >= yd.x && x < yd.x + yd.w && y >= yd.y && y < yd.y + yd.h) return true;
  const p = plan.patio;
  return p !== null && x >= p.x0 && x < p.x1 && y >= p.y && y < p.y + HALF * 2;
}

/** Every room's walls with doorways where people walk (once per baked background). */
function partitions(ctx: Ctx, L: Layout): void {
  const plan = planOf(L);
  if (!plan) return;
  for (const c of plan.cells) {
    const r = c.r;
    const edge = (horizontal: boolean, at: number, from: number, to: number) => gapsOf(crossings(L, plan, horizontal, at, from, to));
    for (const [on, y] of [[c.sides.t, r.y], [c.sides.b, r.y + r.h + 1]] as const) {
      if (!on) continue;
      const gaps = edge(true, y, r.x, r.x + r.w);
      const mid = r.x + r.w / 2;
      const out = outdoors(plan, mid, y + 8) || outdoors(plan, mid, y - 8);
      for (const [a, b] of runs(r.x, r.x + r.w, gaps)) {
        hWall(ctx, a, b, y, out);
        if (out) glazing(ctx, a, b, y);
      }
      for (const [a, b] of gaps) {
        if (b <= r.x || a >= r.x + r.w) continue;
        if (out && b < r.x + r.w - 20) slider(ctx, Math.max(a, r.x), b, y);
        if (a > r.x + 2) doorFrame(ctx, a, y, true);
        if (b < r.x + r.w - 2) doorFrame(ctx, b, y, true);
      }
    }
    for (const [on, x] of [[c.sides.l, r.x + 1], [c.sides.r, r.x + r.w - 2]] as const) {
      if (!on) continue;
      const gaps = edge(false, x, r.y, r.y + r.h);
      const out = outdoors(plan, x + 8, r.y + r.h / 2) || outdoors(plan, x - 8, r.y + r.h / 2);
      for (const [a, b] of runs(r.y + (c.sides.t ? 0 : 0), r.y + r.h - (c.sides.b ? 0 : 6), gaps)) vWall(ctx, x, a, b - 6, out);
      for (const [a, b] of gaps) {
        if (a > r.y + 4) doorFrame(ctx, x, a, false);
        if (b < r.y + r.h - 4) doorFrame(ctx, x, b - 6, false);
      }
    }
  }
}

// ------------------------------------------------------------------ windows and fixtures

function window(ctx: Ctx, win: Rect): void {
  const { x, y, w, h } = win;
  const g = new Grid(w + 2, h + 7);
  const frame = "#e6e9ec";
  const frameLo = "#aab2ba";
  g.rect(1, 1, w, h, frame);
  g.rect(1, 1, w, 1, "#ffffff");
  g.rect(1, h, w, 1, frameLo);
  // The slider's meeting rail down the middle.
  const mx = Math.floor(w / 2);
  g.rect(mx, 1, 2, h, frame);
  g.set(mx + 1, 2, frameLo);
  // The sill.
  g.rect(0, h + 1, w + 2, 3, C.trim);
  g.rect(0, h + 1, w + 2, 1, "#ffffff");
  g.rect(0, h + 3, w + 2, 1, C.trimLo);
  g.outline(OUTLINE);
  for (let j = 4; j < h - 1; j++) for (let i = 5; i < w - 2; i++) if (i !== mx && i !== mx + 1) g.set(i, j, null);
  // Vertical blinds, pulled aside and bunched (on one side or the other).
  const left = hash(`blinds${x}`) % 2 === 0;
  const n = 3 + (hash(`n${x}`) % 3);
  for (let k = 0; k < n; k++) {
    const bx = left ? 5 + k * 2 : w - 3 - k * 2;
    g.rect(bx, 3, 1, h - 3, k % 2 ? "#efe6d0" : "#ddd2b8");
  }
  g.rect(3, 2, w - 4, 1, "#c9c2b0");
  // A sticker on the glass, now and then.
  if (hash(`stk${x}`) % 3 === 0) {
    const c = STICKERS[hash(`stc${x}`) % STICKERS.length]!;
    const sx = left ? w - 9 : 9;
    g.rect(sx, h - 9, 3, 3, c).set(sx + 1, h - 10, c);
  }
  put(ctx, g, x - 1, y - 1);
}

/** The whiteboard wall: everyone's diagrams, half rubbed out, with the usage notes stuck on top. */
function pinboard(ctx: Ctx, r: Rect): void {
  const { x, y, w, h } = r;
  const g = new Grid(w + 2, h + 4);
  g.rect(1, 1, w, h, "#c9ced4");
  g.rect(1, 1, w, 1, "#eef1f4");
  g.rect(3, 3, w - 4, h - 4, "#fbfcfd");
  g.rect(3, 3, w - 4, 1, "#e8ecf0");
  // The marker tray.
  g.rect(2, h, w - 2, 2, "#b3bac2");
  g.rect(10, h - 1, 6, 1, "#e5544b").rect(18, h - 1, 6, 1, "#3a74c4").rect(w - 20, h - 1, 5, 1, "#2e2c36");
  g.outline(OUTLINE);
  // Ghosts of old diagrams around the edges (the notes cover the middle).
  const ink = ["#8fb0de", "#e0a0a0", "#a8d0a8", "#c8c8d0"];
  const rr = rng(hash(`wb${x}${w}`));
  for (let i = 0; i < 9; i++) {
    const bx = 5 + Math.floor(rr() * (w - 22));
    const by = 5 + Math.floor(rr() * (h - 14));
    const c = ink[i % ink.length]!;
    if (i % 3 === 0) {
      g.rect(bx, by, 10, 1, c).rect(bx, by + 5, 10, 1, c).rect(bx, by, 1, 6, c).rect(bx + 9, by, 1, 6, c);
      g.rect(bx + 10, by + 2, 5, 1, c).set(bx + 14, by + 1, c).set(bx + 14, by + 3, c);
    } else if (i % 3 === 1) {
      for (let k = 0; k < 10; k++) g.set(bx + k, by + 6 - Math.floor(k * k / 16), c);
    } else g.rect(bx, by + 3, 8, 1, c).rect(bx + 1, by + 5, 6, 1, c);
  }
  put(ctx, g, x - 1, y - 1);
}

function calendar(ctx: Ctx, c: Rect): void {
  // A free calendar from the pizza place, the month's picture a slice.
  const g = new Grid(c.w + 2, c.h + 2);
  g.rect(1, 1, c.w, c.h, C.paper);
  g.rect(1, 1, c.w, 7, "#e86a3a");
  g.rect(1, c.h - 1, c.w, 2, C.paperLo);
  g.outline(OUTLINE);
  put(ctx, g, c.x - 1, c.y - 1);
  rect(ctx, c.x + Math.floor(c.w / 2), c.y - 2, 1, 2, "#7a6a5a");
}

function status(ctx: Ctx, s: Rect): void {
  // An old tablet stuck to the wall with tape, running the status board.
  const b = new Grid(s.w + 2, s.h + 2);
  b.rrect(1, 1, s.w, s.h, "#3a3a44", 1);
  b.rect(2, 2, s.w - 2, s.h - 2, "#15161c");
  b.outline(OUTLINE);
  put(ctx, b, s.x - 1, s.y - 1);
  rect(ctx, s.x - 2, s.y + 2, 4, 2, "#e8dcae");
  rect(ctx, s.x + s.w - 2, s.y + s.h - 4, 4, 2, "#e8dcae");
}

function door(ctx: Ctx, d: Rect): void {
  if (baking) partitions(ctx, baking);
  // The front door: sun-faded teal, a fan light, a brass knob and the mail slot.
  const g = new Grid(d.w + 6, d.h + 4);
  g.rect(0, 2, d.w + 6, d.h + 2, C.trim);
  g.rect(0, 2, d.w + 6, 1, "#ffffff");
  g.rect(3, 4, d.w, d.h, "#3f8f8a");
  g.rect(3, 4, d.w, 1, "#5aa8a0");
  g.rect(3, 4, 1, d.h, "#5aa8a0");
  // Panels.
  g.rect(6, 13, d.w - 6, 11, "#378079").rect(6, 27, d.w - 6, 12, "#378079");
  g.rect(6, 13, d.w - 6, 1, "#4f9c94").rect(6, 27, d.w - 6, 1, "#4f9c94");
  // The fan light over the panels.
  g.rect(6, 6, d.w - 6, 5, "#cfe6ee");
  g.set(6, 6, "#3f8f8a").set(d.w - 1, 6, "#3f8f8a");
  g.rect(Math.floor((d.w + 6) / 2) - 1, 7, 1, 4, "#9fbcc6");
  g.rect(9, 8, 1, 2, "#9fbcc6").rect(d.w - 4, 8, 1, 2, "#9fbcc6");
  g.rect(7, 25, d.w - 8, 1, "#c9a440");
  g.set(d.w, 22, "#e8c060").set(d.w, 23, "#c9a440");
  g.outline(OUTLINE);
  put(ctx, g, d.x - 3, d.y - 3);
  // The sign over the door: a house-number plaque with a "+" (a new thread).
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, "#2f6b4a");
  sg.rect(6, 2, 2, 5, "#e9f5e4").rect(4, 4, 6, 1, "#e9f5e4");
  sg.outline(OUTLINE);
  put(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
}

function legend(ctx: Ctx, n: Rect): void {
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, "#fff3a3");
  g.rect(1, 1, n.w, 2, "#f5dc6a");
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, "#6b5a2e").set(qx + 2, 5, "#6b5a2e").set(qx + 1, 6, "#6b5a2e").set(qx + 1, 8, "#6b5a2e");
  g.outline(OUTLINE);
  put(ctx, g, n.x - 1, n.y - 1);
  rect(ctx, n.x + 2, n.y, 3, 1, "#e8dcae");
}

const POSTERS: { bg: string; ink: string; lines: string[]; art?: "rocket" | "graph" | "sun" }[] = [
  { bg: "#2f3a6a", ink: "#ffd84a", lines: ["SHIP", "IT"], art: "rocket" },
  { bg: "#f3e6c8", ink: "#e5544b", lines: ["UP", "AND", "TO", "THE"], art: "graph" },
  { bg: "#e86a3a", ink: "#fff3d0", lines: ["STAY", "SCRA", "PPY"], art: "sun" },
];

function painting(ctx: Ctx, p: Layout["wall"]["paintings"][number]): void {
  // A poster, taped up a little crooked.
  const v = POSTERS[hash(`poster${p.x}`) % POSTERS.length]!;
  const g = new Grid(16, 24);
  g.rect(1, 1, 14, 22, v.bg);
  if (v.art === "rocket") {
    g.rect(7, 3, 2, 7, "#e9edf2").set(7, 2, "#e5544b").set(8, 2, "#e5544b").set(6, 8, "#e5544b").set(9, 8, "#e5544b");
    g.set(7, 10, "#ffb347").set(8, 11, "#ff7a3a");
    text(g, v.lines[0]!, 2, 13, v.ink);
    text(g, v.lines[1]!, 5, 18, v.ink);
  } else if (v.art === "graph") {
    g.rect(3, 4, 1, 9, "#2e2c36").rect(3, 12, 10, 1, "#2e2c36");
    for (let k = 0; k < 9; k++) g.set(4 + k, 11 - Math.floor((k * k) / 9), v.ink);
    g.set(12, 3, v.ink).set(13, 4, v.ink);
    g.rect(3, 15, 10, 1, "#c9b48a").rect(3, 18, 8, 1, "#c9b48a");
  } else {
    g.ellipse(7.5, 6, 3, 3, "#ffd84a");
    text(g, v.lines[0]!, 1, 11, v.ink);
    text(g, "IT", 4, 17, v.ink);
  }
  g.outline(OUTLINE);
  put(ctx, g, p.x, p.y + 4);
  rect(ctx, p.x + 1, p.y + 4, 3, 1, "#e8dcae");
  rect(ctx, p.x + 12, p.y + 4, 3, 1, "#e8dcae");
}

function clock(ctx: Ctx, k: { x: number; y: number; r: number }): void {
  // A sunburst clock from a yard sale.
  const { x, y, r } = k;
  const g = new Grid(r * 2 + 9, r * 2 + 9);
  const c = r + 4;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const len = r + (i % 2 ? 2 : 3.5);
    for (let s = r - 1; s <= len; s += 0.5) g.set(c + Math.round(Math.sin(a) * s), c - Math.round(Math.cos(a) * s), i % 2 ? "#c9a440" : "#e0bc58");
  }
  g.ellipse(c, c, r - 0.5, r - 0.5, "#c9a440");
  g.ellipse(c, c, r - 2, r - 2, "#fbf6e6");
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2;
    g.set(c + Math.round(Math.sin(a) * (r - 3)), c - Math.round(Math.cos(a) * (r - 3)), "#6a5a3a");
  }
  g.outline(OUTLINE);
  put(ctx, g, x - c, y - c);
}

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor,
  wall,
  room,
  roomWalls,
  window,
  pinboard,
  calendar,
  status,
  door,
  legend,
  painting,
  clock,
  pods: () => undefined,
};

