// Dusty Annex: drawing the building from its plan. Lino corridors with a
// faded runner, creaky stair flights where the floors don't line up, each
// room's own floor, and mismatched partitions with doorways cut wherever
// people actually walk.

import type { Layout, Point, Rect } from "../../layout.ts";
import { hash, rect, rng, shade } from "../../themekit.ts";
import { planOf, type AnnexPlan, type Cell } from "./plan.ts";

type Gap = [number, number];

const HALF = 10;

// ------------------------------------------------------------------ textures

function speck(ctx: CanvasRenderingContext2D, r: Rect, colors: string[], density: number, seed: number): void {
  const rr = rng(seed);
  const n = Math.round(r.w * r.h * density);
  for (let i = 0; i < n; i++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, colors[i % colors.length]!);
}

function tilesIn(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, size: number, seed: number, seam = true): void {
  const rr = rng(seed);
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      const k = (Math.floor((x - r.x) / size) + Math.floor((y - r.y) / size)) % 2;
      const w = Math.min(size, r.x + r.w - x);
      const h = Math.min(size, r.y + r.h - y);
      const base = rr() < 0.06 ? shade(k ? a : b, -0.08) : k ? a : b;
      rect(ctx, x, y, w, h, base);
      if (seam) {
        rect(ctx, x + w - 1, y, 1, h, shade(base, -0.14));
        rect(ctx, x, y + h - 1, w, 1, shade(base, -0.14));
      }
      for (let f = 0; f < 3; f++) rect(ctx, x + Math.floor(rr() * w), y + Math.floor(rr() * h), 1, 1, shade(base, rr() < 0.5 ? 0.08 : -0.12));
    }
  }
}

/** Old floorboards, gappy and dusty. */
function boards(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  const rr = rng(seed);
  for (let y = r.y; y < r.y + r.h; y += 6) {
    const h = Math.min(6, r.y + r.h - y);
    rect(ctx, r.x, y, r.w, h, (y / 6) % 2 ? "#6a5842" : "#63523e");
    rect(ctx, r.x, y + h - 1, r.w, 1, "#44382a");
    for (let x = r.x - Math.floor(rr() * 40); x < r.x + r.w; x += 30 + Math.floor(rr() * 30)) {
      if (x > r.x) rect(ctx, x, y, 1, h - 1, "#4e4132");
      if (rr() < 0.3) rect(ctx, Math.max(r.x, x + 6), y + 2, 2, 1, "#4a3e30");
    }
  }
  speck(ctx, r, ["#7a6a52", "#574838"], 0.05, seed + 1);
}

/** Faded parquet in a herringbone, worn pale where the dancing was. */
function parquet(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  const rr = rng(seed);
  rect(ctx, r.x, r.y, r.w, r.h, "#7a5e3e");
  for (let y = r.y; y < r.y + r.h; y += 4) {
    for (let x = r.x + ((y - r.y) / 4) % 2 * 4; x < r.x + r.w; x += 8) {
      const c = rr() < 0.5 ? "#86683f" : "#7d6040";
      rect(ctx, x, y, Math.min(4, r.x + r.w - x), Math.min(4, r.y + r.h - y), c);
      rect(ctx, x, y, 1, Math.min(4, r.y + r.h - y), "#5e4630");
    }
  }
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.fillStyle = "rgba(200,180,140,0.12)";
  for (let y = r.y; y < r.y + r.h; y++) {
    const k = 1 - Math.abs(y - cy) / (r.h / 2);
    const half = Math.max(0, k) * r.w * 0.35;
    ctx.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
  }
  speck(ctx, r, ["#5a432c", "#9a7a50"], 0.02, seed + 3);
}

// ------------------------------------------------------------------ corridors and stairs

function corridors(ctx: CanvasRenderingContext2D, L: Layout, plan: AnnexPlan): void {
  const top = (x: number) => L.segments.find((s) => x >= s.x0 && x < s.x1)?.depth ?? 60;
  const lino = (r: Rect, seed: number) => {
    rect(ctx, r.x, r.y, r.w, r.h, "#77745f");
    speck(ctx, r, ["#6a6754", "#86826b", "#5f5c4b"], 0.18, seed);
  };
  for (const ax of L.net.aisles) lino({ x: ax - HALF, y: top(ax), w: HALF * 2, h: L.H - top(ax) }, ax);
  for (const hy of L.net.halls) {
    lino({ x: 0, y: hy - HALF, w: L.W, h: HALF * 2 }, hy);
    // A faded red runner down the corridor, frayed, a hole worn through here and there.
    const ry = hy - 4;
    rect(ctx, 0, ry, L.W, 8, "#6a3a30");
    rect(ctx, 0, ry + 1, L.W, 6, "#7a4436");
    for (let x = 3; x < L.W; x += 6) rect(ctx, x, ry + 2, 2, 1, "#8a5240");
    for (let x = 0; x < L.W; x += 3) {
      if (hash(`fr${x}${hy}`) % 3 === 0) rect(ctx, x, ry - 1, 1, 1, "#8a6a52");
      if (hash(`fb${x}${hy}`) % 3 === 0) rect(ctx, x, ry + 8, 1, 1, "#8a6a52");
    }
    const r = rng(hash(`runner${hy}`));
    for (let k = 0; k < L.W / 120; k++) {
      const x = Math.floor(r() * (L.W - 20));
      rect(ctx, x, ry + 2, 8 + Math.floor(r() * 10), 4, "#8c6a58");
    }
    rect(ctx, 0, hy - HALF, L.W, 1, "#5a5848");
    rect(ctx, 0, hy + HALF - 1, L.W, 1, "#5a5848");
  }
  for (const f of plan.flights) stairs(ctx, f, L, f.x + f.w / 2);
}

/** A flight of creaky stairs down an aisle, with landings where rooms open off it. */
function stairs(ctx: CanvasRenderingContext2D, f: Rect, L: Layout, ax: number): void {
  const landings: number[] = [];
  for (const s of L.spots) {
    for (let i = 0; i + 1 < s.path.length; i++) {
      const p = s.path[i]!;
      const q = s.path[i + 1]!;
      if (Math.abs(p.x - ax) < 1 && Math.abs(q.x - ax) > 4 && p.y > f.y && p.y < f.y + f.h) landings.push(p.y);
    }
  }
  const onLanding = (y: number) => landings.some((ly) => Math.abs(ly - y) <= 11);
  rect(ctx, f.x, f.y, f.w, f.h, "#4a3a2a");
  for (let y = f.y + 2; y < f.y + f.h - 2; y += 5) {
    if (onLanding(y) || onLanding(y + 4)) {
      rect(ctx, f.x + 1, y, f.w - 2, 5, "#6e604a");
      continue;
    }
    rect(ctx, f.x + 1, y, f.w - 2, 3, "#7e664a");
    rect(ctx, f.x + 1, y, f.w - 2, 1, "#9a7e5a");
    rect(ctx, f.x + 1, y + 3, f.w - 2, 1, "#3a2c20");
    rect(ctx, f.x + 1, y + 4, f.w - 2, 1, "#5a4834");
    // Worn pale in the middle where everyone treads.
    rect(ctx, f.x + Math.floor(f.w / 2) - 3, y + 1, 6, 1, "#8e7656");
  }
  // Banisters along both sides, broken off where the landings are.
  for (const x of [f.x, f.x + f.w - 1]) {
    for (let y = f.y; y < f.y + f.h; y++) {
      if (onLanding(y)) continue;
      rect(ctx, x, y, 1, 1, "#2e2218");
      if ((y - f.y) % 8 === 0) rect(ctx, x === f.x ? x : x - 1, y, 2, 2, "#5a4026");
    }
  }
}

// ------------------------------------------------------------------ room floors

function cellFloor(ctx: CanvasRenderingContext2D, c: Cell, seed: number): void {
  const r = c.r;
  switch (c.kind) {
    case "pen":
      tilesIn(ctx, r, "#535a62", "#4f565e", 12, seed);
      break;
    case "break":
      tilesIn(ctx, r, "#5f5040", "#5a4b3c", 12, seed);
      break;
    case "kitchen":
      tilesIn(ctx, r, "#9a8f72", "#83785e", 10, seed);
      break;
    case "storage":
      boards(ctx, r, seed);
      break;
    case "hall":
      parquet(ctx, r, seed);
      break;
    case "waiting":
      tilesIn(ctx, r, "#77745f", "#72705b", 16, seed);
      speck(ctx, r, ["#67644f", "#87836d"], 0.04, seed + 2);
      break;
    case "games":
      tilesIn(ctx, r, "#4f5650", "#4b524c", 12, seed);
      break;
    case "archive":
      tilesIn(ctx, r, "#5f5240", "#5a4d3c", 12, seed);
      break;
    case "nook":
      tilesIn(ctx, r, "#a29e8a", "#98947f", 7, seed);
      break;
    default:
      break;
  }
}

/** The floors of every room in the plan (rooms the builders made add their own touches on top). */
export function paintCells(ctx: CanvasRenderingContext2D, L: Layout): boolean {
  const plan = planOf(L);
  if (!plan) return false;
  plan.cells.forEach((c, i) => {
    if (c.kind !== "walled") cellFloor(ctx, c, hash(`annex-cell-${i}-${c.r.x}-${c.r.y}`));
  });
  // The old hall: a little stage at one end, columns at the corners.
  for (const c of plan.cells) {
    if (c.kind !== "hall") continue;
    const r = c.r;
    if (r.w >= 160 && r.h >= 70) {
      const sx = r.x + r.w - 34;
      const sy = r.y + 12;
      const sh = r.h - 24;
      rect(ctx, sx - 3, sy, 31, sh + 3, "#3a2a1e");
      rect(ctx, sx, sy, 28, sh, "#8a6a44");
      for (let y = sy + 4; y < sy + sh; y += 5) rect(ctx, sx, y, 28, 1, "#6e5234");
      rect(ctx, sx, sy, 28, 1, "#a8865a");
      rect(ctx, sx - 3, sy + 1, 3, sh + 2, "#5e4430");
      // Velvet curtains, faded to the colour of old wine.
      rect(ctx, sx + 22, sy, 6, sh, "#6a2a28");
      for (let y = sy; y < sy + sh; y += 1) if ((y - sy) % 4 === 0) rect(ctx, sx + 23, y, 1, 3, "#8a3a34");
      rect(ctx, sx + 24, sy, 1, sh, "#4a1c1a");
      ctx.fillStyle = "rgba(30,20,10,0.3)";
      ctx.fillRect(sx - 3, sy + sh + 3, 31, 3);
    }
    for (const [x, y] of [[r.x + 2, r.y + 1], [r.x + r.w - 8, r.y + 1]] as const) {
      rect(ctx, x, y, 6, 6, "#bdb08c");
      rect(ctx, x, y, 6, 1, "#d6cdb0");
      rect(ctx, x + 5, y, 1, 6, "#8f8466");
      rect(ctx, x, y + 6, 6, 2, "rgba(30,20,10,0.25)");
    }
  }
  return true;
}

export function corridorsFor(ctx: CanvasRenderingContext2D, L: Layout): boolean {
  const plan = planOf(L);
  if (!plan) return false;
  corridors(ctx, L, plan);
  // The building's own walls round the edge of the panel.
  rect(ctx, 0, 0, 3, L.H, "#3e3024");
  rect(ctx, L.W - 3, 0, 3, L.H, "#3e3024");
  rect(ctx, 0, L.H - 3, L.W, 3, "#3e3024");
  rect(ctx, 3, 0, 1, L.H, "#5a4836");
  rect(ctx, L.W - 4, 0, 1, L.H, "#2a2018");
  return true;
}

// ------------------------------------------------------------------ partitions

/** Where people cross a line: every spot path, plus the gags' and technician's walks. */
function crossings(L: Layout, plan: AnnexPlan, horizontal: boolean, at: number, from: number, to: number): number[] {
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
  return out;
}

function gapsOf(points: number[], half = 12): Gap[] {
  const gaps = points.map((v): Gap => [v - half, v + half]).sort((a, b) => a[0] - b[0]);
  const out: Gap[] = [];
  for (const g of gaps) {
    const last = out[out.length - 1];
    if (last && g[0] <= last[1] + 6) last[1] = Math.max(last[1], g[1]);
    else out.push([g[0], g[1]]);
  }
  return out;
}

/** Runs of wall between the gaps. */
function runs(from: number, to: number, gaps: Gap[]): Gap[] {
  const out: Gap[] = [];
  let x = from;
  for (const [a, b] of gaps) {
    if (b <= from || a >= to) continue;
    if (a > x) out.push([x, Math.min(a, to)]);
    x = Math.max(x, b);
  }
  if (x < to) out.push([x, to]);
  return out.filter(([a, b]) => b - a >= 3);
}

const STYLES = [
  // Plasterboard, cream, with a skirting.
  { cap: "#d2c8a8", capHi: "#e2dabe", face: "#b5a884", detail: "#a39672", base: "#5a4632" },
  // Blue-grey fabric cubicle panels on a metal cap.
  { cap: "#8a8e86", capHi: "#a9aba2", face: "#66707e", detail: "#5a6370", base: "#3e444c" },
  // Oatmeal fabric panels.
  { cap: "#8a8e86", capHi: "#a9aba2", face: "#a09170", detail: "#8e8062", base: "#5a5040" },
  // Wood panelling with frosted glass on top.
  { cap: "#6a5238", capHi: "#806448", face: "#7a5e40", detail: "#c0c4b6", base: "#3e2c1e" },
  // Plywood, patched with tape.
  { cap: "#b89a6a", capHi: "#cdb07e", face: "#a8865a", detail: "#cdbf8f", base: "#6a5236" },
];

function hWall(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, seed: number): void {
  // Panels of mismatched dividers along the run.
  let x = x0;
  let k = 0;
  const base = seed % STYLES.length;
  while (x < x1) {
    const w = Math.min(x1 - x, 22 + ((seed >> (k % 8)) % 4) * 8);
    const st = STYLES[(hash(`${seed}-${k}`) % 4 === 0 ? hash(`${seed}+${k}`) : base) % STYLES.length]!;
    rect(ctx, x, y - 2, w, 1, st.capHi);
    rect(ctx, x, y - 1, w, 1, st.cap);
    rect(ctx, x, y, w, 4, st.face);
    if (st === STYLES[3]) rect(ctx, x, y, w, 2, st.detail);
    else if (st === STYLES[4]) {
      if (w > 10) rect(ctx, x + 4, y + 1, 4, 2, st.detail);
    } else for (let i = x + 2; i < x + w - 1; i += 3) rect(ctx, i, y + 1 + (i % 2), 1, 1, st.detail);
    rect(ctx, x, y + 4, w, 1, st.base);
    rect(ctx, x + w - 1, y - 2, 1, 6, shade(st.face, -0.25));
    ctx.fillStyle = "rgba(30,20,10,0.22)";
    ctx.fillRect(x, y + 5, w, 2);
    x += w;
    k++;
  }
}

function vWall(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, seed: number): void {
  const st = STYLES[seed % STYLES.length]!;
  rect(ctx, x - 1, y0, 3, y1 - y0, st.cap);
  rect(ctx, x - 1, y0, 1, y1 - y0, st.capHi);
  ctx.fillStyle = "rgba(30,20,10,0.22)";
  ctx.fillRect(x + 2, y0, 2, y1 - y0);
  // The end of the wall shows its face.
  rect(ctx, x - 1, y1, 3, 4, st.face);
  rect(ctx, x - 1, y1 + 4, 3, 1, st.base);
}

function post(ctx: CanvasRenderingContext2D, x: number, y: number, horizontal: boolean): void {
  if (horizontal) {
    rect(ctx, x - 1, y - 5, 3, 10, "#3e2c1e");
    rect(ctx, x, y - 5, 1, 9, "#6a5238");
  } else {
    rect(ctx, x - 2, y - 1, 5, 3, "#3e2c1e");
    rect(ctx, x - 1, y - 1, 3, 1, "#6a5238");
  }
}

const drawn = new WeakSet<CanvasRenderingContext2D>();

/** Every room's partitions, with doorways where people walk (once per baked background). */
export function partitions(ctx: CanvasRenderingContext2D, L: Layout): void {
  const plan = planOf(L);
  if (!plan || drawn.has(ctx)) return;
  drawn.add(ctx);
  plan.cells.forEach((c, i) => {
    const r = c.r;
    const seed = hash(`annex-part-${i}-${r.x}-${r.y}`);
    const edge = (horizontal: boolean, at: number, from: number, to: number) => gapsOf(crossings(L, plan, horizontal, at, from, to));
    if (c.sides.t || c.sides.b) {
      // Bottom walls stand on the room's edge with their face out over the corridor's margin.
      for (const [on, y] of [[c.sides.t, r.y], [c.sides.b, r.y + r.h + 1]] as const) {
        if (!on) continue;
        const gaps = edge(true, y, r.x, r.x + r.w);
        for (const [a, b] of runs(r.x, r.x + r.w, gaps)) hWall(ctx, a, b, y, seed + y);
        for (const [a, b] of gaps) {
          if (a > r.x + 2) post(ctx, a, y, true);
          if (b < r.x + r.w - 2) post(ctx, b, y, true);
        }
      }
    }
    for (const [on, x] of [[c.sides.l, r.x + 1], [c.sides.r, r.x + r.w - 2]] as const) {
      if (!on) continue;
      const gaps = edge(false, x, r.y, r.y + r.h);
      for (const [a, b] of runs(r.y + (c.sides.t ? 2 : 0), r.y + r.h - (c.sides.b ? 1 : 4), gaps)) vWall(ctx, x, a, b, seed + x);
      for (const [a, b] of gaps) {
        if (a > r.y + 4) post(ctx, x, a, false);
        if (b < r.y + r.h - 4) post(ctx, x, b, false);
      }
    }
  });
}

/** The cell a point sits in, if any. */
export function cellAt(L: Layout, x: number, y: number): Cell | null {
  const plan = planOf(L);
  if (!plan) return null;
  return plan.cells.find((c) => x >= c.r.x && x < c.r.x + c.r.w && y >= c.r.y && y < c.r.y + c.r.h) ?? null;
}

