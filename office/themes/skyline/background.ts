// Sky Loft: the backdrop. Polished concrete, plaster and walnut walls, a
// black steel curtain wall with floor-to-ceiling glass, stone and terrazzo
// rooms, frosted glass.
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room, WallSegment } from "../../layout.ts";
import { blit, drawPixelText, Grid, hash, makeCanvas, OUTLINE, pa, pixelTextWidth, rect, rng, shade } from "../../themekit.ts";
import { C } from "./kit.ts";
import { planOf, type SkyPlan } from "./plan.ts";

export type SegKind = "glass" | "media" | "plaster" | "core";

/** What a stretch of back wall is: glass (it has windows), the elevator core, the walnut wall, or plaster. */
export function segKind(L: Layout, sg: WallSegment): SegKind {
  const plan = planOf(L);
  const i = L.segments.indexOf(sg);
  if (plan && i >= 0) {
    const k = plan.segKinds[i];
    if (k === "core") return "core";
    if (k === "feature") return "media";
    if (k === "glass") return "glass";
  }
  if (L.wall.windows.some((w) => w.x >= sg.x0 && w.x < sg.x1)) return "glass";
  const cx = L.tv.x + L.tv.w / 2;
  if (L.tv.y < sg.depth && cx >= sg.x0 && cx < sg.x1) return "media";
  return "plaster";
}

/** The lower glass under a window: the city far below shows here. */
export function lowerPane(L: Layout, win: Rect): Rect | null {
  const sg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
  if (!sg) return null;
  const y = win.y + win.h + 2;
  const h = sg.depth - 4 - y;
  if (h < 5) return null;
  return { x: win.x + 2, y, w: win.w - 4, h };
}

function paint(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), x, y);
}

// ------------------------------------------------------------------ floors

function concrete(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.conc);
  const rnd = rng(seed);
  // Soft clouding in the polish.
  for (let i = 0; i < (r.w * r.h) / 700; i++) {
    const x = r.x + Math.floor(rnd() * r.w);
    const y = r.y + Math.floor(rnd() * r.h);
    ctx.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(96,84,72,0.05)";
    ctx.fillRect(x, y, 8 + Math.floor(rnd() * 22), 2 + Math.floor(rnd() * 5));
  }
  // Aggregate specks.
  for (let i = 0; i < (r.w * r.h) / 55; i++) {
    const k = rnd();
    rect(ctx, r.x + Math.floor(rnd() * r.w), r.y + Math.floor(rnd() * r.h), 1, 1, k < 0.45 ? C.concLo : k < 0.9 ? C.concHi : "#a9a39a");
  }
  // Saw-cut joints.
  for (let y = r.y + 46; y < r.y + r.h; y += 52) rect(ctx, r.x, y, r.w, 1, C.concJoint);
  for (let x = r.x + 70; x < r.x + r.w; x += 78) rect(ctx, x, r.y, 1, r.h, C.concJoint);
}

function rug(ctx: CanvasRenderingContext2D, r: Rect, edge: string, base: string, line: string, weave: string): void {
  const g = new Grid(r.w, r.h);
  g.rrect(0, 0, r.w, r.h, edge, 2);
  g.rect(2, 2, r.w - 4, r.h - 4, base);
  g.rect(4, 4, r.w - 8, 1, line).rect(4, r.h - 5, r.w - 8, 1, line).rect(4, 4, 1, r.h - 8, line).rect(r.w - 5, 4, 1, r.h - 8, line);
  for (let y = 6; y < r.h - 6; y += 2) for (let x = 6 + (y % 4 ? 1 : 0); x < r.w - 6; x += 4) g.set(x, y, weave);
  paint(ctx, g, r.x, r.y);
}

function marbleTiles(ctx: CanvasRenderingContext2D, r: Rect, size: number, seed: number): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.marb);
  const rnd = rng(seed);
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      const w = Math.min(size, r.x + r.w - x);
      const h = Math.min(size, r.y + r.h - y);
      rect(ctx, x, y, w, h, rnd() < 0.5 ? C.marb : "#efece7");
      // A soft vein drifting across some tiles.
      if (rnd() < 0.45) {
        let vx = x + Math.floor(rnd() * w);
        let vy = y + Math.floor(rnd() * 4);
        const dir = rnd() < 0.5 ? -1 : 1;
        let n = 0;
        while (vy < y + h && vx >= x && vx < x + w && n < 14) {
          if (n % 3 !== 2) rect(ctx, vx, vy, 1, 1, "#dcd8d1");
          vx += dir;
          if (rnd() < 0.5) vy += 1;
          n++;
        }
      }
      rect(ctx, x, y + h - 1, w, 1, C.marbLo);
      rect(ctx, x + w - 1, y, 1, h, C.marbLo);
    }
  }
}

function terrazzo(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#ece7de");
  const rnd = rng(seed);
  const chips = ["#d3cbbf", "#c9c1b4", "#b9b1a5", "#dcc3b4", "#c8d0c5", "#a9a49c", "#d9b6a2"];
  for (let i = 0; i < (r.w * r.h) / 26; i++) {
    const c = chips[Math.floor(rnd() * chips.length)]!;
    const x = r.x + Math.floor(rnd() * r.w);
    const y = r.y + Math.floor(rnd() * r.h);
    rect(ctx, x, y, rnd() < 0.25 ? 2 : 1, 1, c);
  }
  for (let i = 0; i < (r.w * r.h) / 260; i++) {
    rect(ctx, r.x + Math.floor(rnd() * r.w), r.y + Math.floor(rnd() * r.h), 1, 1, rnd() < 0.5 ? "#8e8a84" : "#b98a72");
  }
  // Brass divider strips.
  ctx.fillStyle = "rgba(200,160,76,0.5)";
  for (let x = r.x + 40; x < r.x + r.w - 4; x += 48) ctx.fillRect(x, r.y, 1, r.h);
  for (let y = r.y + 40; y < r.y + r.h - 4; y += 48) ctx.fillRect(r.x, y, r.w, 1);
}

function stoneTiles(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, joint: string, tw: number, th: number): void {
  for (let y = r.y, row = 0; y < r.y + r.h; y += th, row++) {
    for (let x = r.x - (row % 2 ? tw / 2 : 0), col = 0; x < r.x + r.w; x += tw, col++) {
      const x0 = Math.max(r.x, x);
      const w = Math.min(x + tw, r.x + r.w) - x0;
      const h = Math.min(th, r.y + r.h - y);
      if (w <= 0) continue;
      rect(ctx, x0, y, w, h, (row + col) % 3 === 0 ? b : a);
      rect(ctx, x0, y + h - 1, w, 1, joint);
      rect(ctx, x0, y, 1, h, joint);
    }
  }
}

function planks(ctx: CanvasRenderingContext2D, r: Rect, colors: string[], joint: string, len = 18, th = 4): void {
  const rnd = rng(r.x * 31 + r.y);
  for (let y = r.y, row = 0; y < r.y + r.h; y += th, row++) {
    const off = (row * 7) % len;
    for (let x = r.x - off; x < r.x + r.w; x += len) {
      const x0 = Math.max(r.x, x);
      const w = Math.min(x + len, r.x + r.w) - x0;
      if (w <= 0) continue;
      const h = Math.min(th, r.y + r.h - y);
      rect(ctx, x0, y, w, h, colors[Math.floor(rnd() * colors.length)]!);
      rect(ctx, x0, y + h - 1, w, 1, joint);
      if (x >= r.x) rect(ctx, x, y, 1, h, joint);
      if (rnd() < 0.4) rect(ctx, x0 + 2 + Math.floor(rnd() * Math.max(1, w - 6)), y + 1, 3, 1, shade(colors[0]!, 0.08));
    }
  }
}

// ------------------------------------------------------------------ the wall

function wallBase(ctx: CanvasRenderingContext2D, x: number, w: number, d: number): void {
  // Ceiling reveal with the LED track housing; a shadow-gap base.
  rect(ctx, x, 0, w, 2, "#1d1f24");
  rect(ctx, x, 2, w, 1, "#3c4048");
  rect(ctx, x, d - 3, w, 1, "#c9c5be");
  rect(ctx, x, d - 2, w, 2, "#2c2e33");
  ctx.fillStyle = "rgba(30,28,36,0.16)";
  ctx.fillRect(x, d, w, 3);
  ctx.fillStyle = "rgba(30,28,36,0.07)";
  ctx.fillRect(x, d + 3, w, 2);
}

function plasterWall(ctx: CanvasRenderingContext2D, sg: WallSegment): void {
  const w = sg.x1 - sg.x0;
  const d = sg.depth;
  rect(ctx, sg.x0, 0, w, d, C.plaster);
  // Skim-coat panels and a wash of light from the downlights.
  for (let x = sg.x0 + 48; x < sg.x1 - 4; x += 64) rect(ctx, x, 3, 1, d - 6, "#e7e4df");
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.32 * (1 - i / 10)})`;
    ctx.fillRect(sg.x0, 3 + i, w, 1);
  }
  ctx.fillStyle = "rgba(120,110,100,0.05)";
  ctx.fillRect(sg.x0, d - 14, w, 11);
  wallBase(ctx, sg.x0, w, d);
}

function mediaWall(ctx: CanvasRenderingContext2D, sg: WallSegment): void {
  const w = sg.x1 - sg.x0;
  const d = sg.depth;
  rect(ctx, sg.x0, 0, w, d, C.walDk);
  const tones = [C.wal, "#744b36", "#68412e", "#7a4f39"];
  for (let x = sg.x0 + 1; x < sg.x1; x += 3) {
    const c = tones[hash(`slat${x}`) % tones.length]!;
    rect(ctx, x, 3, 2, d - 6, c);
    rect(ctx, x, 3, 1, d - 6, shade(c, 0.1));
    if (hash(`knot${x}`) % 7 === 0) rect(ctx, x + 1, 10 + (hash(`k${x}`) % (d - 24)), 1, 2, C.walLo);
  }
  // A warm cove light from above and shade toward the floor.
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(255,214,160,${0.2 * (1 - i / 12)})`;
    ctx.fillRect(sg.x0, 3 + i, w, 1);
  }
  ctx.fillStyle = "rgba(20,10,8,0.16)";
  ctx.fillRect(sg.x0, d - 12, w, 9);
  wallBase(ctx, sg.x0, w, d);
}

function glassWall(ctx: CanvasRenderingContext2D, sg: WallSegment, L: Layout): void {
  const w = sg.x1 - sg.x0;
  const d = sg.depth;
  rect(ctx, sg.x0, 0, w, d, C.steel);
  // Mullion profiles: a lit edge and a shadow line on each pier.
  const wins = L.wall.windows.filter((v) => v.x >= sg.x0 && v.x < sg.x1).sort((a, b) => a.x - b.x);
  const edges = [sg.x0, ...wins.flatMap((v) => [v.x, v.x + v.w]), sg.x1];
  for (let i = 0; i + 1 < edges.length; i += 2) {
    const a = edges[i]!;
    const b = edges[i + 1]!;
    if (b - a < 3) continue;
    rect(ctx, a, 3, 1, d - 6, C.steelHi);
    rect(ctx, b - 1, 3, 1, d - 6, C.steelLo);
    if (b - a > 10) rect(ctx, Math.floor((a + b) / 2), 3, 1, d - 6, C.steelMid);
  }
  for (const v of wins) {
    const lp = lowerPane(L, v);
    if (!lp) continue;
    rect(ctx, lp.x, lp.y, lp.w, lp.h, "#3d4a5a");
  }
  wallBase(ctx, sg.x0, w, d);
  rect(ctx, sg.x0, d - 4, w, 1, C.steelHi);
}

/** The elevator core: travertine panels, a brass reveal, a second elevator and the floor's name. */
function coreWall(ctx: CanvasRenderingContext2D, sg: WallSegment, L: Layout): void {
  const w = sg.x1 - sg.x0;
  const d = sg.depth;
  rect(ctx, sg.x0, 0, w, d, "#d9d0c1");
  const rnd = rng(sg.x0 * 7 + 3);
  for (let i = 0; i < (w * d) / 30; i++) rect(ctx, sg.x0 + Math.floor(rnd() * w), Math.floor(rnd() * d), rnd() < 0.7 ? 2 : 1, 1, rnd() < 0.6 ? "#cfc5b4" : "#e3dbcd");
  for (let x = sg.x0 + 30; x < sg.x1 - 6; x += 34) rect(ctx, x, 3, 1, d - 6, "#c6bba8");
  rect(ctx, sg.x0, Math.round(d * 0.45), w, 1, "#c6bba8");
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(255,248,232,${0.3 * (1 - i / 12)})`;
    ctx.fillRect(sg.x0, 3 + i, w, 1);
  }
  // A brass reveal at hand height and the name of the floor up top.
  rect(ctx, sg.x0, d - 15, w, 1, C.brassLo);
  rect(ctx, sg.x0, d - 14, w, 1, C.brass);
  const name = "PENTHOUSE";
  const pin = L.wall.pinboard;
  if (pin.y - 4 >= 12) {
    // Brass letters just above the board, below any festival garlands.
    const tw = pixelTextWidth(name);
    const x = Math.round(pin.x + pin.w / 2 - tw / 2);
    const y = pin.y - 9;
    rect(ctx, x - 4, y - 2, tw + 8, 9, "#cfc5b3");
    rect(ctx, x - 4, y + 6, tw + 8, 1, "#b9ad98");
    drawPixelText(ctx, name, x + 1, y + 1, "#9c8c72");
    drawPixelText(ctx, name, x, y, C.brassHi);
  }
  // A second elevator beside the real one (it never opens).
  const door = L.wall.door;
  const busy: [number, number][] = [
    [pin.x - 6, pin.x + pin.w + 6],
    [L.wall.calendar.x - 6, L.wall.calendar.x + L.wall.calendar.w + 6],
    [L.wall.clock.x - 14, L.wall.clock.x + 14],
    [L.wall.legendNote.x - 4, door.x + door.w + 8],
    [L.tv.x - 20, L.tv.y < d ? L.tv.x + L.tv.w + 20 : L.tv.x - 20],
  ];
  const ex = door.x - 46;
  if (door.x >= sg.x0 && door.x < sg.x1 && ex > sg.x0 + 6 && !busy.some(([a, z]) => ex - 4 < z && ex + 24 > a)) {
    const g = new Grid(door.w + 6, door.h + 4);
    g.rect(0, 1, door.w + 6, door.h + 3, C.steelLo);
    g.rect(1, 2, door.w + 4, 1, C.steelHi);
    g.rect(3, 4, door.w, door.h, "#b4bac2");
    for (let x = 3; x < 3 + door.w; x += 2) g.rect(x, 4, 1, door.h, "#bfc5cc");
    const mid = 3 + Math.floor(door.w / 2);
    g.rect(mid - 1, 4, 1, door.h, "#7f858e").rect(mid, 4, 1, door.h, "#dfe3e8");
    g.outline(OUTLINE);
    paint(ctx, g, ex - 3, door.y - 3);
    rect(ctx, ex + door.w / 2 - 4, door.y - 9, 8, 5, "#14181c");
    rect(ctx, ex + door.w / 2 - 2, door.y - 8, 4, 1, "#e9c46a");
    rect(ctx, ex + door.w / 2 - 1, door.y - 7, 2, 1, "#e9c46a");
  }
  wallBase(ctx, sg.x0, w, d);
}

/** The hallway and aisles as a honed walkway with brass inlays at its edges. */
function walkways(ctx: CanvasRenderingContext2D, L: Layout): void {
  const top = Math.min(...L.segments.map((s) => s.depth));
  const strip = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "rgba(255,252,244,0.22)";
    ctx.fillRect(x, y, w, h);
  };
  for (const y of L.net.halls) strip(0, y - 7, L.W, 14);
  for (const x of L.net.aisles) strip(x - 6, top, 12, L.H - top);
  ctx.fillStyle = "rgba(200,160,76,0.55)";
  for (const y of L.net.halls) {
    ctx.fillRect(0, y - 8, L.W, 1);
    ctx.fillRect(0, y + 7, L.W, 1);
  }
  for (const x of L.net.aisles) {
    for (const [a, z] of spans(L, top)) {
      ctx.fillRect(x - 7, a, 1, z - a);
      ctx.fillRect(x + 6, a, 1, z - a);
    }
  }
}

/** Vertical runs of an aisle between the hallway bands (so the inlays don't cross them). */
function spans(L: Layout, top: number): [number, number][] {
  const cuts = [...L.net.halls].sort((a, z) => a - z);
  const out: [number, number][] = [];
  let y = top;
  for (const h of cuts) {
    if (h - 8 > y) out.push([y, h - 8]);
    y = h + 8;
  }
  if (L.H > y) out.push([y, L.H]);
  return out;
}

/** Glass along the panel's edges, the terrace deck and its glass walls, and the drop beyond the rail. */
function edgesAndTerrace(ctx: CanvasRenderingContext2D, L: Layout, plan: SkyPlan): void {
  const E = plan.edgeX;
  const EB = plan.edgeY;
  // The drop beyond the glass (the live city is drawn over it).
  for (const b of plan.beyond) rect(ctx, b.x, b.y, b.w, b.h, "#59606c");
  // Floor-to-ceiling glass seen from above: a pale pane, a lit inner edge, steel mullions.
  const vGlass = (x: number, y0: number, y1: number) => {
    rect(ctx, x, y0, 3, y1 - y0, "#b9d0dd");
    rect(ctx, x + (x < L.W / 2 ? 2 : 0), y0, 1, y1 - y0, "#eaf3f8");
    rect(ctx, x + (x < L.W / 2 ? 0 : 2), y0, 1, y1 - y0, "#6f8797");
    for (let y = y0 + 18; y < y1 - 2; y += 40) rect(ctx, x - 1, y, 5, 2, C.steel);
  };
  const hGlass = (x0: number, x1: number, y: number) => {
    rect(ctx, x0, y, x1 - x0, 3, "#b9d0dd");
    rect(ctx, x0, y, x1 - x0, 1, "#eaf3f8");
    rect(ctx, x0, y + 2, x1 - x0, 1, "#6f8797");
    for (let x = x0 + 18; x < x1 - 2; x += 44) rect(ctx, x, y - 1, 2, 5, C.steel);
  };
  // Narrow panels: just a band of glass at the very edge.
  const band = (x: number, y: number, w: number, h: number, vertical: boolean) => {
    rect(ctx, x, y, w, h, "#9fb7c8");
    if (vertical) {
      rect(ctx, x, y, 1, h, "#c9dbe6");
      rect(ctx, x + w - 1, y, 1, h, C.steel);
      for (let yy = y + 20; yy < y + h; yy += 44) rect(ctx, x, yy, w, 3, C.steel);
    } else {
      rect(ctx, x, y, w, 1, C.steel);
      rect(ctx, x, y + h - 1, w, 1, "#c9dbe6");
      for (let xx = x + 20; xx < x + w; xx += 48) rect(ctx, xx, y, 3, h, C.steel);
    }
  };
  for (const [y0, y1] of plan.glassLeft) {
    if (E >= 8) vGlass(E - 2, y0, Math.min(y1, L.H - EB));
    else band(0, y0, 5, y1 - y0, true);
  }
  for (const [y0, y1] of plan.glassRight) {
    if (E >= 8) vGlass(L.W - E - 1, y0, Math.min(y1, L.H - EB));
    else band(L.W - 5, y0, 5, y1 - y0, true);
  }
  for (const [x0, x1] of plan.glassBottom) {
    if (EB >= 8) hGlass(x0, x1, L.H - EB - 2);
    else band(x0, L.H - 5, x1 - x0, 5, false);
  }
  const t = plan.terrace;
  if (!t) return;
  // Ipe decking with a lighter grain and dark gaps.
  for (let y = t.y; y < t.y + t.h; y += 4) {
    const row = (y - t.y) / 4;
    rect(ctx, t.x, y, t.w, 3, row % 3 === 0 ? "#8c6a52" : row % 3 === 1 ? "#87654d" : "#916f56");
    rect(ctx, t.x, y + 3, t.w, 1, "#5f4535");
    for (let x = t.x + ((row * 23) % 40); x < t.x + t.w; x += 40) rect(ctx, x, y, 1, 3, "#6d503d");
    for (let x = t.x + ((row * 13) % 17); x < t.x + t.w; x += 17) if (hash(`g${x},${y}`) % 3 === 0) rect(ctx, x, y + 1, 4, 1, "#9b7a60");
  }
  // Glass balustrade: a steel cap on frameless glass.
  for (const r of plan.rails) {
    rect(ctx, r.x, r.y, r.w, r.h, "#bcd3df");
    if (r.w > r.h) {
      rect(ctx, r.x, r.y, r.w, 1, C.steel);
      rect(ctx, r.x, r.y + r.h - 1, r.w, 1, "#7f95a3");
    } else {
      rect(ctx, r.x, r.y, 1, r.h, C.steel);
      rect(ctx, r.x + r.w - 1, r.y, 1, r.h, "#7f95a3");
    }
  }
  // The glass wall between inside and out, with its sliding doors open.
  const wall = plan.terraceWall;
  if (wall) {
    for (let x = wall.x0; x < wall.x1; x++) {
      if (wall.gaps.some(([a, z]) => x >= a && x < z)) continue;
      rect(ctx, x, wall.y - 6, 1, 1, C.steel);
      rect(ctx, x, wall.y - 5, 1, 5, x % 30 === 0 ? C.steel : "#d6e6ef");
      rect(ctx, x, wall.y - 3, 1, 1, x % 2 ? "#eef5f9" : "#d6e6ef");
      rect(ctx, x, wall.y, 1, 1, C.steelLo);
    }
    for (const [a, z] of wall.gaps) {
      rect(ctx, a - 2, wall.y - 7, 2, 8, C.steelLo);
      rect(ctx, z, wall.y - 7, 2, 8, C.steelLo);
    }
    ctx.fillStyle = "rgba(30,28,36,0.14)";
    ctx.fillRect(wall.x0, wall.y + 1, wall.x1 - wall.x0, 3);
  }
  const side = plan.terraceSide;
  if (side) {
    for (let y = side.y0; y < side.y1; y++) {
      if (side.gaps.some(([a, z]) => y >= a && y < z)) continue;
      rect(ctx, side.x - 1, y, 1, 1, C.steel);
      rect(ctx, side.x, y, 1, 1, y % 30 === 0 ? C.steel : "#d6e6ef");
      rect(ctx, side.x + 1, y, 1, 1, C.steelLo);
    }
  }
}

function pillar(ctx: CanvasRenderingContext2D, px: number, d: number): void {
  // Board-formed concrete.
  rect(ctx, px - 5, 0, 10, d + 4, "#bab7b0");
  for (let y = 3; y < d + 2; y += 5) rect(ctx, px - 5, y, 10, 1, "#afaca5");
  for (let y = 6; y < d; y += 15) {
    rect(ctx, px - 3, y, 1, 1, "#9a978f");
    rect(ctx, px + 2, y, 1, 1, "#9a978f");
  }
  rect(ctx, px - 5, 0, 2, d + 4, "#cdcac3");
  rect(ctx, px + 3, 0, 2, d + 4, "#a3a099");
  rect(ctx, px - 6, 0, 1, d + 4, "#8f8c86");
  rect(ctx, px + 5, 0, 1, d + 4, "#8f8c86");
  rect(ctx, px - 6, d + 3, 12, 1, "#7d7a74");
}

// ------------------------------------------------------------------ rooms

function roomFloor(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  switch (room.kind) {
    case "meeting": {
      // Honed basalt, polished to a soft sheen.
      stoneTiles(ctx, r, "#6d7078", "#686b73", "#5b5e65", 24, 16);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < r.w + r.h; i += 26) {
        for (let k = 0; k < 6; k++) {
          const x = r.x + i - k * 2;
          const y = r.y + k * 6;
          if (x > r.x && x < r.x + r.w) ctx.fillRect(x, y, 1, 4);
        }
      }
      break;
    }
    case "boss": {
      planks(ctx, r, ["#5f4434", "#654a39", "#5a3f30", "#624636"], "#43301f", 20, 4);
      const rw = Math.min(r.w - 30, 112);
      const rh = Math.min(r.h - 40, 64);
      if (rw > 20 && rh > 16) {
        const g = new Grid(rw, rh);
        g.rrect(0, 0, rw, rh, C.navyLo, 2);
        g.rect(2, 2, rw - 4, rh - 4, C.navy);
        g.rect(4, 4, rw - 8, 1, C.brass).rect(4, rh - 5, rw - 8, 1, C.brass).rect(4, 4, 1, rh - 8, C.brass).rect(rw - 5, 4, 1, rh - 8, C.brass);
        for (let y = 8; y < rh - 8; y += 6) for (let x = 8 + ((y / 6) % 2 ? 3 : 0); x < rw - 8; x += 6) g.set(x, y, C.navyHi);
        paint(ctx, g, r.x + Math.round((r.w - rw) / 2) + 6, r.y + 22);
      }
      break;
    }
    case "waiting":
      terrazzo(ctx, r, 11 + r.x);
      break;
    case "kitchen":
      marbleTiles(ctx, r, 16, 5 + r.y);
      break;
    case "games": {
      // Carpet tiles laid in alternating directions.
      for (let y = r.y; y < r.y + r.h; y += 12) {
        for (let x = r.x; x < r.x + r.w; x += 12) {
          const w = Math.min(12, r.x + r.w - x);
          const h = Math.min(12, r.y + r.h - y);
          const alt = ((x - r.x) / 12 + (y - r.y) / 12) % 2 === 0;
          rect(ctx, x, y, w, h, alt ? "#434d61" : "#3f485b");
          for (let k = 1; k < (alt ? h : w); k += 2) {
            if (alt) rect(ctx, x, y + k, w, 1, "#485367");
            else rect(ctx, x + k, y, 1, h, "#465065");
          }
        }
      }
      break;
    }
    case "garden": {
      for (let y = r.y; y < r.y + r.h; y += 3) for (let x = r.x; x < r.x + r.w; x += 3) rect(ctx, x, y, 3, 3, (hash(`m${x},${y}`) % 3) ? "#6e8f55" : "#78995d");
      for (let i = 0; i < (r.w * r.h) / 30; i++) rect(ctx, r.x + ((i * 37) % r.w), r.y + ((i * 53) % r.h), 1, 1, i % 2 ? "#5d7d48" : "#8fae6e");
      // Concrete pavers through a gravel bed.
      const py = r.y + r.h - 18;
      rect(ctx, r.x, py - 2, r.w, 13, "#cfc9bf");
      for (let i = 0; i < r.w * 3; i++) rect(ctx, r.x + ((i * 29) % r.w), py - 2 + ((i * 7) % 13), 1, 1, i % 3 ? "#bdb6aa" : "#e0dbd2");
      for (let x = r.x + 6; x < r.x + r.w - 12; x += 16) {
        rect(ctx, x, py, 12, 8, "#bab6af");
        rect(ctx, x, py, 12, 1, "#d2cec7");
        rect(ctx, x, py + 7, 12, 1, "#9c9890");
      }
      rect(ctx, r.x, r.y, r.w, 2, "#4f6b3e");
      break;
    }
    case "server": {
      for (let y = r.y; y < r.y + r.h; y += 8) {
        for (let x = r.x; x < r.x + r.w; x += 8) {
          rect(ctx, x, y, Math.min(8, r.x + r.w - x), Math.min(8, r.y + r.h - y), ((x - r.x) / 8 + (y - r.y) / 8) % 2 ? "#252a34" : "#222630");
          for (let j = 2; j < 7; j += 2) for (let i = 2; i < 7; i += 2) if (x + i < r.x + r.w && y + j < r.y + r.h) rect(ctx, x + i, y + j, 1, 1, "#1a1d24");
          rect(ctx, x, y, Math.min(8, r.x + r.w - x), 1, "#2d323e");
        }
      }
      rect(ctx, r.x, r.y + r.h - 2, r.w, 1, C.led);
      rect(ctx, r.x, r.y + r.h - 1, r.w, 1, "#3b6f99");
      rect(ctx, r.x, r.y, r.w, 1, "#4a8fd0");
      break;
    }
    case "library": {
      planks(ctx, r, [C.oak, "#d2b386", "#dcc097"], C.oakLo, 22, 4);
      rug(ctx, { x: r.x + 10, y: r.y + 10, w: r.w - 20, h: r.h - 20 }, "#8d5d45", "#b0765a", "#d9b79c", "#a46d52");
      break;
    }
    case "lounge": {
      const c = L.couch;
      const rw = 126;
      const rh = 64;
      const g = new Grid(rw, rh);
      g.rrect(0, 0, rw, rh, "#3e4047", 3);
      g.rrect(2, 2, rw - 4, rh - 4, C.char, 2);
      g.rect(5, 5, rw - 10, 1, C.oatLo).rect(5, rh - 6, rw - 10, 1, C.oatLo).rect(5, 5, 1, rh - 10, C.oatLo).rect(rw - 6, 5, 1, rh - 10, C.oatLo);
      for (let y = 9; y < rh - 9; y += 3) for (let x = 9 + ((y / 3) % 2 ? 2 : 0); x < rw - 9; x += 4) g.set(x, y, C.charHi);
      paint(ctx, g, Math.round(c.x + c.w / 2 - rw / 2), c.y - 30);
      break;
    }
    default:
      break;
  }
}

function roomWalls(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  if (!room.walls) return;
  const wood = room.walls === "wood";
  const frame = wood ? C.walDk : C.steel;
  const pane = wood ? "#cdbda6" : C.frost;
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 1;
  const top = r.y - (atWall ? 2 : 6);
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, top, 3, r.h + (r.y - top), frame);
    rect(ctx, x + 1, top, 1, r.h + (r.y - top), pane);
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      rect(ctx, x, r.y - 8, 1, 2, frame);
      rect(ctx, x, r.y - 6, 1, 5, pane);
      // A frosted band with a fine line pattern.
      rect(ctx, x, r.y - 4, 1, 1, (x % 3) ? (wood ? "#bba98f" : "#d6e0e5") : (wood ? "#e1d4bf" : "#f7fafb"));
      rect(ctx, x, r.y - 1, 1, 1, frame);
    }
    if (gap >= 0) {
      // Door posts.
      rect(ctx, gap - 10, r.y - 8, 2, 8, frame);
      rect(ctx, gap + 8, r.y - 8, 2, 8, frame);
    }
  }
}

// ------------------------------------------------------------------ fixtures

function windowFrame(ctx: CanvasRenderingContext2D, win: Rect, L: Layout): void {
  const { x, y, w, h } = win;
  // A bigger pane: clear up to a slim 2 px black frame (the sky fills the window rect).
  rect(ctx, x - 1, y - 1, w + 2, h + 4, C.steelLo);
  ctx.clearRect(x + 2, y + 2, w - 4, h - 4);
  rect(ctx, x - 1, y - 1, w + 2, 1, OUTLINE);
  rect(ctx, x + 1, y + 1, w - 2, 1, C.steelHi);
  rect(ctx, x + 1, y + 1, 1, h - 2, C.steelHi);
  // The transom down to the lower glass.
  rect(ctx, x - 1, y + h - 2, w + 2, 4, C.steelLo);
  rect(ctx, x, y + h - 2, w, 1, "#53596a");
  const lp = lowerPane(L, win);
  if (lp) {
    rect(ctx, lp.x - 2, lp.y - 1, lp.w + 4, lp.h + 2, C.steelLo);
    rect(ctx, lp.x - 1, lp.y + lp.h, lp.w + 2, 1, C.steelHi);
  }
}

function pinboard(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  const g = new Grid(w + 2, h + 2);
  g.rect(1, 1, w, h, C.oak);
  g.rect(1, 1, w, 1, C.oakHi);
  g.rect(1, h, w, 1, C.oakDk);
  g.rect(3, 3, w - 4, h - 4, "#5b5e66");
  for (let i = 0; i < (w * h) / 5; i++) g.set(3 + ((i * 37) % (w - 4)), 3 + ((i * 53 + (i >> 3)) % (h - 4)), i % 3 ? "#61646c" : "#54575e");
  g.rect(3, 3, w - 4, 1, "#4a4d54");
  g.outline(OUTLINE);
  paint(ctx, g, x - 1, y - 1);
}

function calendar(ctx: CanvasRenderingContext2D, c: Rect): void {
  const g = new Grid(c.w + 2, c.h + 2);
  g.rect(1, 1, c.w, c.h, "#fbfaf7");
  g.rect(1, 1, c.w, 7, "#24272d");
  g.rect(1, 8, c.w, 1, C.brass);
  g.rect(1, c.h - 1, c.w, 2, "#e4e0d8");
  g.outline(OUTLINE);
  paint(ctx, g, c.x - 1, c.y - 1);
}

function status(ctx: CanvasRenderingContext2D, s: Rect): void {
  const b = new Grid(s.w + 2, s.h + 2);
  b.rect(1, 1, s.w, s.h, C.steelMid);
  b.rect(2, 2, s.w - 2, s.h - 2, "#101318");
  b.rect(2, 2, s.w - 2, 1, "#1b2029");
  b.outline(OUTLINE);
  paint(ctx, b, s.x - 1, s.y - 1);
}

function door(ctx: CanvasRenderingContext2D, d: Rect): void {
  // The elevator: brushed steel doors in a black portal.
  const g = new Grid(d.w + 6, d.h + 4);
  g.rect(0, 1, d.w + 6, d.h + 3, C.steelLo);
  g.rect(1, 2, d.w + 4, 1, C.steelHi);
  g.rect(3, 4, d.w, d.h, "#b4bac2");
  for (let x = 3; x < 3 + d.w; x += 2) g.rect(x, 4, 1, d.h, "#bfc5cc");
  g.rect(3, 4, d.w, 1, "#d8dde3");
  const mid = 3 + Math.floor(d.w / 2);
  g.rect(mid - 1, 4, 1, d.h, "#7f858e");
  g.rect(mid, 4, 1, d.h, "#dfe3e8");
  g.rect(3, 4 + d.h - 1, d.w, 1, "#8d939b");
  // Call button on the frame.
  g.set(d.w + 4, Math.floor(d.h / 2) + 2, C.brassHi).set(d.w + 4, Math.floor(d.h / 2) + 4, C.brass);
  g.outline(OUTLINE);
  paint(ctx, g, d.x - 3, d.y - 3);
  // The lit "+" over the doors: a new thread.
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, "#14181c");
  sg.rect(6, 2, 2, 5, "#7ef0a6").rect(4, 4, 6, 1, "#7ef0a6");
  sg.set(2, 2, "#2a4a38").set(11, 2, "#2a4a38");
  sg.outline(OUTLINE);
  paint(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
}

function legend(ctx: CanvasRenderingContext2D, n: Rect): void {
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, "#fbf3c4");
  g.rect(1, 1, n.w, 2, "#f1e39a");
  g.rect(n.w - 1, n.h - 1, 2, 2, "#efe2a8");
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, "#3a3a40").set(qx + 2, 5, "#3a3a40").set(qx + 1, 6, "#3a3a40").set(qx + 1, 8, "#3a3a40");
  g.outline(OUTLINE);
  paint(ctx, g, n.x - 1, n.y - 1);
  rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, C.brass);
  rect(ctx, n.x + Math.floor(n.w / 2), n.y, 1, 1, C.brassHi);
}

/** Opaque bounds of a canvas. */
function bounds(c: HTMLCanvasElement): Rect {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width;
  let y0 = c.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3]! === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w: c.width, h: c.height } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function painting(ctx: CanvasRenderingContext2D, p: Layout["wall"]["paintings"][number]): void {
  const b = bounds(pa(p.sprite));
  const art = makeCanvas(b.w, b.h, (c) => {
    // Thin black gallery frame, white mat, and an original abstract.
    rect(c, 0, 0, b.w, b.h, OUTLINE);
    rect(c, 1, 1, b.w - 2, b.h - 2, "#f6f4ef");
    const ix = 3;
    const iy = 3;
    const iw = b.w - 6;
    const ih = b.h - 6;
    const seed = hash(`${p.sprite}${p.x}`);
    const palettes = [
      [C.terra, C.oat, C.navy, C.brass],
      [C.sage, "#e9e2d4", C.char, C.terraHi],
      ["#2e3a55", "#c8a04c", "#e8e2d6", "#9b5631"],
    ];
    const pal = palettes[seed % palettes.length]!;
    rect(c, ix, iy, iw, ih, pal[1]!);
    if (p.sprite === "LARGE_PAINTING") {
      rect(c, ix, iy + Math.floor(ih * 0.55), iw, ih - Math.floor(ih * 0.55), pal[2]!);
      for (let i = 0; i < iw; i++) {
        const k = i / iw;
        const yy = iy + Math.floor(ih * 0.25 + Math.sin(k * Math.PI) * -3);
        rect(c, ix + i, yy, 1, 2, pal[0]!);
      }
      rect(c, ix + Math.floor(iw * 0.62), iy + 2, 4, 4, pal[3]!);
    } else {
      rect(c, ix, iy + Math.floor(ih / 3), iw, Math.floor(ih / 3), pal[0]!);
      rect(c, ix + 1, iy + 1 + Math.floor((2 * ih) / 3), iw - 2, Math.floor(ih / 3) - 2, pal[2]!);
      rect(c, ix + Math.floor(iw / 2), iy + 2, 1, ih - 4, pal[3]!);
    }
  });
  blit(ctx, art, p.x + b.x, p.y + b.y);
}

function clock(ctx: CanvasRenderingContext2D, k: { x: number; y: number; r: number }): void {
  const { x, y, r } = k;
  const g = new Grid(r * 2 + 5, r * 2 + 5);
  const c = r + 2;
  g.ellipse(c, c, r, r, "#1f2126");
  g.ellipse(c, c, r - 1.2, r - 1.2, "#fbfaf7");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (i % 3 !== 0) continue;
    g.set(c + Math.round(Math.sin(a) * (r - 2.5)), c - Math.round(Math.cos(a) * (r - 2.5)), "#2a2c32");
  }
  g.outline(OUTLINE);
  paint(ctx, g, x - c, y - c);
}

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    concrete(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 4242);
    const plan = planOf(L);
    if (plan) {
      walkways(ctx, L);
      edgesAndTerrace(ctx, L, plan);
    }
  },
  wall(ctx, L) {
    for (const sg of L.segments) {
      const kind = segKind(L, sg);
      if (kind === "glass") glassWall(ctx, sg, L);
      else if (kind === "core") coreWall(ctx, sg, L);
      else if (kind === "media") mediaWall(ctx, sg);
      else plasterWall(ctx, sg);
    }
    for (const px of L.wall.pillars) {
      const left = L.segments.find((s) => s.x1 === px);
      const right = L.segments.find((s) => s.x0 === px);
      pillar(ctx, px, Math.max(left?.depth ?? 64, right?.depth ?? 64));
    }
  },
  pods(ctx, L) {
    // The work floor: wide smoked-oak planks framed in walnut, warm against the concrete.
    for (const pod of L.pods) {
      const r = { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 };
      rect(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, C.walLo);
      planks(ctx, r, ["#9c8770", "#958069", "#a38d75", "#8f7b65"], "#7c6a56", 30, 5);
      rect(ctx, r.x, r.y, r.w, 1, "#b39d84");
      ctx.fillStyle = "rgba(60,40,20,0.08)";
      ctx.fillRect(r.x, r.y + r.h - 3, r.w, 3);
    }
  },
  room: roomFloor,
  roomWalls,
  window: windowFrame,
  pinboard,
  calendar,
  status,
  door,
  legend,
  painting,
  clock,
};

