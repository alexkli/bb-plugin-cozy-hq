// Villain's Lair: the backdrop. Polished stone floors, steel catwalks with a
// lava glow under the grating, columns of basalt for walls, the riveted map
// wall with the world map and the countdown, and the crater at the bottom.
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room, WallSegment } from "../../layout.ts";
import { Grid, hash, OUTLINE, rect, rng, shade } from "../../themekit.ts";
import { isLand, MAP_COLS, MAP_ROWS } from "./atlas.ts";
import { C, hazardRect, hazardStripes } from "./kit.ts";
import { planOf, type LairPlan, type SegKind } from "./plan.ts";

function paint(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), x, y);
}

/** The kind of a stretch of back wall (classic plans: rock everywhere). */
function segKindOf(L: Layout, sg: WallSegment): SegKind {
  const plan = planOf(L);
  const i = L.segments.indexOf(sg);
  return plan?.segKinds[i] ?? "rock";
}

// ------------------------------------------------------------------ floors

const STONE = ["#6b6766", "#6f6b69", "#696563", "#726e6b"];

function stoneFloor(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  const rnd = rng(seed);
  const tw = 24;
  const th = 16;
  for (let y = r.y, row = 0; y < r.y + r.h; y += th, row++) {
    for (let x = r.x - (row % 2 ? tw / 2 : 0); x < r.x + r.w; x += tw) {
      const x0 = Math.max(r.x, x);
      const w = Math.min(x + tw, r.x + r.w) - x0;
      const h = Math.min(th, r.y + r.h - y);
      if (w <= 0) continue;
      rect(ctx, x0, y, w, h, STONE[Math.floor(rnd() * STONE.length)]!);
      rect(ctx, x0, y, w, 1, "#7a7673");
      rect(ctx, x0, y + h - 1, w, 1, "#5a5654");
      if (x >= r.x) rect(ctx, x, y, 1, h, "#5a5654");
    }
  }
  for (let i = 0; i < (r.w * r.h) / 40; i++) {
    rect(ctx, r.x + Math.floor(rnd() * r.w), r.y + Math.floor(rnd() * r.h), 1, 1, rnd() < 0.5 ? "#625e5c" : "#7b7774");
  }
}

/** Steel grating over the lava: a mesh with a dim orange glow in the holes. */
function grating(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean): void {
  rect(ctx, x, y, w, h, "#4a1d14");
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const gx = x + i;
      const gy = y + j;
      const hole = gx % 3 !== 0 && gy % 3 !== 0;
      if (hole) {
        if (hash(`g${gx >> 3},${gy >> 3}`) % 5 === 0) rect(ctx, gx, gy, 1, 1, "#7a2c18");
        continue;
      }
      rect(ctx, gx, gy, 1, 1, (gx + gy) % 6 === 0 ? "#6f7882" : "#56606a");
    }
  }
  // Hazard-striped edges.
  if (vertical) {
    for (const ex of [x, x + w - 2]) hazardRect(ctx, ex, y, 2, h);
  } else {
    for (const ey of [y, y + h - 2]) hazardRect(ctx, x, ey, w, 2);
  }
}

function catwalks(ctx: CanvasRenderingContext2D, L: Layout, plan: LairPlan | null): void {
  const top = Math.min(...L.segments.map((s) => s.depth));
  const bottom = plan?.crater ? plan.crater.y : L.H;
  for (const hy of L.net.halls) grating(ctx, 0, hy - 8, L.W, 16, false);
  for (const ax of L.net.aisles) {
    const cuts = [...L.net.halls].sort((a, z) => a - z);
    let y = top + 2;
    for (const hy of [...cuts, bottom + 8]) {
      const end = Math.min(hy - 8, bottom);
      if (end - y > 4) grating(ctx, ax - 6, y, 12, end - y, true);
      y = hy + 8;
    }
  }
}

/** The crater: the rock lip, then the drop with the lava lake glowing far below and the monorail beam across. */
function craterFloor(ctx: CanvasRenderingContext2D, plan: LairPlan): void {
  const c = plan.crater;
  if (!c) return;
  // The drop: basalt falling away into the dark, warming toward the lava.
  const steps = c.h - 3;
  for (let j = 0; j < steps; j++) {
    const k = j / Math.max(1, steps - 1);
    const col = k < 0.45 ? shade(C.rockLo, -0.25 * k) : k < 0.75 ? "#2a1518" : k < 0.9 ? "#5a1c12" : "#8a2a12";
    rect(ctx, c.x, c.y + 3 + j, c.w, 1, col);
  }
  for (let x = 0; x < c.w; x += 3) {
    const len = 3 + (hash(`drop${x}`) % Math.max(4, Math.floor(steps * 0.5)));
    rect(ctx, x, c.y + 3, 1, len, hash(`d${x}`) % 3 ? C.rockDk : C.rock);
  }
  // The lip: a rough rock edge.
  rect(ctx, c.x, c.y, c.w, 3, C.rockTop);
  rect(ctx, c.x, c.y, c.w, 1, "#7a7074");
  for (let x = 0; x < c.w; x += 2) if (hash(`lip${x}`) % 3 === 0) rect(ctx, x, c.y + 3, 2, 1 + (hash(`l${x}`) % 2), C.rockHi);
  // The monorail beam on pylons.
  const r = plan.rail;
  if (r) {
    for (let x = 30; x < c.w; x += 90) {
      rect(ctx, x - 2, r.y + 3, 4, c.y + c.h - r.y - 3, C.steelDk);
      rect(ctx, x - 2, r.y + 3, 1, c.y + c.h - r.y - 3, C.steelLo);
    }
    rect(ctx, 0, r.y - 1, c.w, 1, OUTLINE);
    rect(ctx, 0, r.y, c.w, 3, C.steelHi);
    rect(ctx, 0, r.y, c.w, 1, C.steelTop);
    rect(ctx, 0, r.y + 3, c.w, 1, C.steelDk);
    rect(ctx, 0, r.y + 4, c.w, 1, OUTLINE);
    for (let x = 6; x < c.w; x += 12) rect(ctx, x, r.y + 1, 1, 1, C.rivet);
    // The station: a short platform with a sign.
    const sx = r.station;
    rect(ctx, sx - 34, c.y + 3, 68, 2, C.steelLo);
    hazardRect(ctx, sx - 34, c.y + 3, 68, 1, 4);
  }
}

/** Open floor where the base gets together: the concourse deck (or the crater ledge), with the closed trapdoor. */
function deckFloor(ctx: CanvasRenderingContext2D, L: Layout, plan: LairPlan): void {
  const ev = L.eventArea;
  if (plan.variant === "portrait" && plan.crater) {
    // The crater ledge: rough basalt with glowing cracks, boulders at the edges.
    const top = ev.y - 6;
    const r = { x: 0, y: top, w: L.W, h: plan.crater.y - top };
    const rnd = rng(77);
    rect(ctx, r.x, r.y, r.w, r.h, "#4a4246");
    for (let i = 0; i < (r.w * r.h) / 9; i++) rect(ctx, Math.floor(rnd() * r.w), r.y + Math.floor(rnd() * r.h), 2, 1, rnd() < 0.5 ? "#423b3f" : "#564e52");
    for (let i = 0; i < 7; i++) {
      // A crack wandering across, lava glowing in it.
      let x = Math.floor(rnd() * r.w);
      let y = r.y + 6 + Math.floor(rnd() * (r.h - 12));
      for (let n = 0; n < 18; n++) {
        rect(ctx, x, y, 2, 1, n % 5 === 2 ? C.lava : C.crust);
        x += rnd() < 0.5 ? 2 : -1;
        y += rnd() < 0.4 ? (rnd() < 0.5 ? 1 : -1) : 0;
      }
    }
    for (const [bx, by] of [[4, r.y + r.h - 16], [r.w - 22, r.y + 4], [r.w - 18, r.y + r.h - 14]] as const) boulder(ctx, bx, by);
    rect(ctx, 0, r.y, r.w, 1, "#6b6366");
  } else if (plan.variant === "tall") {
    // The concourse: a steel deck in plates, a painted border.
    const r = { x: ev.x - 4, y: ev.y - 1, w: ev.w + 8, h: ev.h + 4 };
    for (let y = r.y; y < r.y + r.h; y += 12) {
      for (let x = r.x; x < r.x + r.w; x += 20) {
        const w = Math.min(20, r.x + r.w - x);
        const h = Math.min(12, r.y + r.h - y);
        rect(ctx, x, y, w, h, ((x - r.x) / 20 + (y - r.y) / 12) % 2 ? "#5e666f" : "#636b74");
        for (let j = 2; j < h - 1; j += 3) for (let i = 2 + (j % 2); i < w - 1; i += 4) rect(ctx, x + i, y + j, 2, 1, "#6f7881");
        rect(ctx, x, y, w, 1, "#737c86");
        rect(ctx, x, y + h - 1, w, 1, "#4b525a");
        rect(ctx, x + 1, y + 1, 1, 1, C.rivet);
      }
    }
    for (const [x, y, w, h] of [
      [r.x, r.y, r.w, 1],
      [r.x, r.y + r.h - 1, r.w, 1],
      [r.x, r.y, 1, r.h],
      [r.x + r.w - 1, r.y, 1, r.h],
    ] as const) rect(ctx, x, y, w, h, C.hazard);
  }
  hatchClosed(ctx, plan.hatch);
}

function boulder(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const g = new Grid(18, 12);
  g.ellipse(9, 7, 8, 4.5, C.rock);
  g.ellipse(7, 5, 5, 3, C.rockHi);
  g.rect(5, 3, 3, 1, C.rockTop);
  g.rect(3, 10, 12, 1, C.rockDk);
  g.outline(OUTLINE);
  paint(ctx, g, x, y);
}

function hatchClosed(ctx: CanvasRenderingContext2D, h: Rect): void {
  const g = new Grid(h.w + 4, h.h + 4);
  hazardStripes(g, 0, 0, h.w + 4, h.h + 4);
  g.rect(2, 2, h.w, h.h, C.steelLo);
  g.rect(2, 2, h.w, 1, C.steelHi);
  g.rect(2 + Math.floor(h.w / 2), 2, 1, h.h, C.steelDk);
  for (const [x, y] of [[4, 4], [h.w - 1, 4], [4, h.h - 1], [h.w - 1, h.h - 1]] as const) g.set(x, y, C.rivet);
  // A recessed ring pull on each leaf.
  g.set(Math.floor(h.w / 2) - 3, Math.floor(h.h / 2) + 2, C.steelDk).set(Math.floor(h.w / 2) + 5, Math.floor(h.h / 2) + 2, C.steelDk);
  paint(ctx, g, h.x - 2, h.y - 2);
}

function rubberFloor(ctx: CanvasRenderingContext2D, r: Rect): void {
  // The control room: dark rubber tiles with a teal guide stripe.
  rect(ctx, r.x, r.y, r.w, r.h, "#3f4652");
  for (let y = r.y; y < r.y + r.h; y += 4) for (let x = r.x + ((y / 4) % 2 ? 2 : 0); x < r.x + r.w; x += 4) rect(ctx, x, y, 1, 1, "#47505d");
  for (let x = r.x; x < r.x + r.w; x += 24) rect(ctx, x, r.y, 1, r.h, "#363c47");
  for (let y = r.y; y < r.y + r.h; y += 24) rect(ctx, r.x, y, r.w, 1, "#363c47");
  rect(ctx, r.x, r.y, r.w, 2, C.teal);
  rect(ctx, r.x, r.y + r.h - 2, r.w, 2, C.teal);
  rect(ctx, r.x, r.y + 2, r.w, 1, C.tealLo);
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
    }
  }
}

function checker(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, size: number, line?: string): void {
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      rect(ctx, x, y, Math.min(size, r.x + r.w - x), Math.min(size, r.y + r.h - y), (((x - r.x) / size + (y - r.y) / size) | 0) % 2 ? a : b);
      if (line) rect(ctx, x, y, Math.min(size, r.x + r.w - x), 1, line);
    }
  }
}

function marble(ctx: CanvasRenderingContext2D, r: Rect, base: string, vein: string, seed: number): void {
  rect(ctx, r.x, r.y, r.w, r.h, base);
  const rnd = rng(seed);
  for (let i = 0; i < (r.w * r.h) / 260; i++) {
    let x = r.x + Math.floor(rnd() * r.w);
    let y = r.y + Math.floor(rnd() * r.h);
    const dir = rnd() < 0.5 ? -1 : 1;
    for (let n = 0; n < 16 && x > r.x && x < r.x + r.w - 1 && y < r.y + r.h - 1; n++) {
      if (n % 4 !== 3) rect(ctx, x, y, 1, 1, vein);
      x += dir;
      if (rnd() < 0.55) y += 1;
    }
  }
  for (let x = r.x + 32; x < r.x + r.w; x += 32) rect(ctx, x, r.y, 1, r.h, shade(base, -0.08));
  for (let y = r.y + 32; y < r.y + r.h; y += 32) rect(ctx, r.x, y, r.w, 1, shade(base, -0.08));
}

/** A rug with a border (a Grid, so the corners round). */
function rug(ctx: CanvasRenderingContext2D, r: Rect, edge: string, base: string, line: string, fleck: string, round = 2): void {
  if (r.w < 12 || r.h < 10) return;
  const g = new Grid(r.w, r.h);
  g.rrect(0, 0, r.w, r.h, edge, round);
  g.rrect(2, 2, r.w - 4, r.h - 4, base, Math.max(1, round - 1));
  g.rect(4, 4, r.w - 8, 1, line).rect(4, r.h - 5, r.w - 8, 1, line).rect(4, 4, 1, r.h - 8, line).rect(r.w - 5, 4, 1, r.h - 8, line);
  for (let y = 7; y < r.h - 7; y += 3) for (let x = 7 + ((y / 3) % 2 ? 2 : 0); x < r.w - 7; x += 4) g.set(x, y, fleck);
  paint(ctx, g, r.x, r.y);
}

function roomFloor(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  switch (room.kind) {
    case "meeting": {
      // A deep blue carpet with a gold-edged rug under the briefing table.
      rect(ctx, r.x, r.y, r.w, r.h, "#2c3448");
      for (let y = r.y + 2; y < r.y + r.h; y += 4) for (let x = r.x + ((y / 4) % 2 ? 2 : 0); x < r.x + r.w; x += 4) rect(ctx, x, y, 1, 1, "#343d53");
      const table = L.props.find((p) => p.kind === "meeting-table" && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
      if (table) rug(ctx, { x: table.x - 12, y: table.y - 18, w: 92, h: Math.min(78, r.y + r.h - (table.y - 18) - 4) }, C.brassLo, "#3a2a40", C.brass, "#4a3650", 2);
      break;
    }
    case "boss": {
      // Black marble, a red carpet with a gold border under the desk.
      marble(ctx, r, "#29262c", "#3d3940", 5 + r.x);
      const desk = L.boss.desk;
      const rw = Math.min(r.w - 24, 120);
      const rh = Math.min(r.h - 30, 76);
      const rx = Math.round(Math.max(r.x + 8, Math.min(r.x + r.w - 8 - rw, desk.x + desk.w / 2 - rw / 2)));
      rug(ctx, { x: rx, y: desk.y - 12, w: rw, h: rh }, C.brassLo, C.velvet, C.brass, C.velvetHi, 3);
      break;
    }
    case "waiting":
      // The antechamber: black and white marble, a velvet rope by the reception.
      checker(ctx, r, "#4a454c", "#a59e94", 16);
      for (let y = r.y; y < r.y + r.h; y += 16) rect(ctx, r.x, y, r.w, 1, "#00000022");
      break;
    case "kitchen":
      // The canteen: red and white tiles.
      checker(ctx, r, "#b9493d", "#e2dbcf", 8, "#ffffff22");
      break;
    case "server": {
      // The reactor room: grating over a cold blue glow.
      rect(ctx, r.x, r.y, r.w, r.h, "#14262c");
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x % 3 === 0 || y % 3 === 0) rect(ctx, x, y, 1, 1, (x + y) % 5 ? "#39444c" : "#48545d");
      rect(ctx, r.x, r.y + r.h - 2, r.w, 1, "#7cf0d0");
      rect(ctx, r.x, r.y + r.h - 1, r.w, 1, "#2e8a7a");
      break;
    }
    case "lounge": {
      // A round shag rug in sunset colors under the sofa.
      const c = L.couch;
      const rw = 126;
      const rh = 64;
      const g = new Grid(rw, rh);
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 1, rh / 2 - 1, "#a24a1e");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 4, rh / 2 - 4, "#d8722a");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 12, rh / 2 - 9, "#e89a3a");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 22, rh / 2 - 15, "#f2bd56");
      for (let y = 2; y < rh - 2; y += 2) for (let x = 2 + (y % 4 ? 1 : 0); x < rw - 2; x += 3) if (g.get(x, y)) g.set(x, y, shade(g.get(x, y)!, -0.08));
      paint(ctx, g, Math.round(c.x + c.w / 2 - rw / 2), c.y - 30);
      break;
    }
    case "games":
      checker(ctx, r, "#3a3f52", "#353a4c", 12);
      break;
    case "library":
      planks(ctx, r, ["#6d4632", "#744b36", "#68412e"], "#4b2f20", 22, 4);
      break;
    case "garden": {
      // A jungle bed: dark soil and ferns.
      rect(ctx, r.x, r.y, r.w, r.h, "#3b2f26");
      for (let i = 0; i < (r.w * r.h) / 6; i++) rect(ctx, r.x + ((i * 37) % r.w), r.y + ((i * 53) % r.h), 1, 1, i % 3 ? "#2f5f34" : "#4a8a4a");
      break;
    }
    default:
      break;
  }
}

function podFloor(ctx: CanvasRenderingContext2D, L: Layout): void {
  for (const pod of L.pods) rubberFloor(ctx, { x: pod.x - 6, y: pod.y + 2, w: pod.w + 12, h: pod.h - 2 });
}

function roomWalls(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  if (!room.walls) return;
  const wood = room.walls === "wood";
  const frame = wood ? C.mahogLo : C.steelDk;
  const frameHi = wood ? C.brass : C.steelHi;
  const pane = wood ? "#5b3a3e" : "#6f97a0";
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 1;
  const top = r.y - (atWall ? 2 : 8);
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, top, 3, r.h + (r.y - top), frame);
    rect(ctx, x + 1, top, 1, r.h + (r.y - top), pane);
    for (let y = top + 6; y < r.y + r.h; y += 14) rect(ctx, x + 1, y, 1, 1, frameHi);
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      rect(ctx, x, r.y - 8, 1, 1, OUTLINE);
      rect(ctx, x, r.y - 7, 1, 1, frameHi);
      rect(ctx, x, r.y - 6, 1, 5, pane);
      rect(ctx, x, r.y - 4, 1, 1, x % 2 ? shade(pane, 0.15) : pane);
      rect(ctx, x, r.y - 1, 1, 1, frame);
    }
    if (gap >= 0) {
      rect(ctx, gap - 10, r.y - 8, 2, 8, frame);
      rect(ctx, gap + 8, r.y - 8, 2, 8, frame);
    }
  }
  // A sign over the door of your lair and the reactor.
  if (room.kind === "server") hazardRect(ctx, r.x, r.y + r.h - 1, r.w, 1, 4);
}

// ------------------------------------------------------------------ the wall

/** Columnar basalt: tall jointed columns, lit from the top left. */
function rockWall(ctx: CanvasRenderingContext2D, sg: WallSegment): void {
  const w = sg.x1 - sg.x0;
  const d = sg.depth;
  rect(ctx, sg.x0, 0, w, d, C.rock);
  let x = sg.x0;
  let i = 0;
  while (x < sg.x1) {
    const cw = 6 + (hash(`col${sg.x0}-${i}`) % 4);
    const tone = [C.rock, "#3e383c", "#363034", "#423b40"][hash(`t${sg.x0}-${i}`) % 4]!;
    rect(ctx, x, 0, Math.min(cw, sg.x1 - x), d, tone);
    rect(ctx, x, 0, 1, d, C.rockHi);
    if (x + cw - 1 < sg.x1) rect(ctx, x + cw - 1, 0, 1, d, C.rockDk);
    // Joints across the column, and a lit chip here and there.
    for (let y = 6 + (hash(`j${x}`) % 12); y < d - 6; y += 12 + (hash(`jy${x}-${y}`) % 14)) {
      rect(ctx, x + 1, y, cw - 2, 1, C.rockDk);
      rect(ctx, x + 1, y + 1, cw - 2, 1, C.rockHi);
    }
    if (hash(`chip${x}`) % 3 === 0) rect(ctx, x + 2, 8 + (hash(`cy${x}`) % (d - 20)), 2, 1, C.rockTop);
    x += cw;
    i++;
  }
  // Darker up toward the ceiling, a warm bounce from below.
  for (let k = 0; k < 10; k++) {
    ctx.fillStyle = `rgba(14,10,14,${0.36 * (1 - k / 10)})`;
    ctx.fillRect(sg.x0, k, w, 1);
  }
  ctx.fillStyle = "rgba(255,120,60,0.05)";
  ctx.fillRect(sg.x0, d - 16, w, 10);
  skirting(ctx, sg.x0, w, d);
}

/** A riveted steel skirting along the foot of the wall, and its shadow on the floor. */
function skirting(ctx: CanvasRenderingContext2D, x: number, w: number, d: number): void {
  rect(ctx, x, d - 6, w, 6, C.steelLo);
  rect(ctx, x, d - 6, w, 1, C.steelHi);
  rect(ctx, x, d - 1, w, 1, C.steelDk);
  for (let rx = x + 4; rx < x + w; rx += 10) rect(ctx, rx, d - 4, 1, 1, C.rivet);
  ctx.fillStyle = "rgba(20,12,16,0.22)";
  ctx.fillRect(x, d, w, 3);
  ctx.fillStyle = "rgba(20,12,16,0.1)";
  ctx.fillRect(x, d + 3, w, 2);
}

/** Pipes running along the top of the wall, with a valve wheel now and then. */
function pipes(ctx: CanvasRenderingContext2D, L: Layout): void {
  for (const sg of L.segments) {
    const busy = (x: number) => x >= L.wall.pinboard.x - 2 && x <= L.wall.pinboard.x + L.wall.pinboard.w + 2 && L.wall.pinboard.y < 8;
    for (let x = sg.x0; x < sg.x1; x++) {
      if (busy(x)) continue;
      rect(ctx, x, 1, 1, 1, OUTLINE);
      rect(ctx, x, 2, 1, 2, x % 40 < 2 ? C.steelLo : C.steelHi);
      rect(ctx, x, 4, 1, 1, C.steelDk);
    }
    for (let x = sg.x0 + 20; x < sg.x1 - 8; x += 70) {
      if (busy(x)) continue;
      rect(ctx, x - 2, 0, 5, 1, OUTLINE);
      rect(ctx, x - 2, 5, 5, 1, OUTLINE);
      rect(ctx, x - 1, 1, 3, 4, C.velvet);
      rect(ctx, x, 2, 1, 2, C.velvetHi);
    }
  }
}

/** The map wall: riveted plates, the world map screen, the countdown board, the tape computers. */
function mapWall(ctx: CanvasRenderingContext2D, sg: WallSegment, plan: LairPlan | null): void {
  const w = sg.x1 - sg.x0;
  const d = sg.depth;
  rect(ctx, sg.x0, 0, w, d, "#3c4a4f");
  for (let y = 0; y < d - 6; y += 16) {
    for (let x = sg.x0 + ((y / 16) % 2 ? 12 : 0); x < sg.x1; x += 24) {
      rect(ctx, x, y, 1, 16, "#2f3a3e");
      rect(ctx, x + 1, y, 1, 16, "#4a5a60");
      rect(ctx, x + 3, y + 2, 1, 1, "#7b8e94");
      rect(ctx, x + 3, y + 13, 1, 1, "#7b8e94");
    }
    rect(ctx, sg.x0, y, w, 1, "#2f3a3e");
    rect(ctx, sg.x0, y + 1, w, 1, "#4a5a60");
  }
  for (let k = 0; k < 8; k++) {
    ctx.fillStyle = `rgba(10,14,18,${0.3 * (1 - k / 8)})`;
    ctx.fillRect(sg.x0, k, w, 1);
  }
  skirting(ctx, sg.x0, w, d);
  if (!plan) return;
  for (const t of plan.tapes) if (t.x >= sg.x0 && t.x + t.w <= sg.x1) tapeComputer(ctx, t);
  worldMap(ctx, plan.map);
  countdownBoard(ctx, plan.countdown);
}

/** The world map: a deep teal screen in a heavy frame, land in green, a grid. */
function worldMap(ctx: CanvasRenderingContext2D, m: Rect): void {
  const g = new Grid(m.w + 6, m.h + 6);
  g.rect(0, 0, m.w + 6, m.h + 6, C.steelDk);
  g.rect(1, 1, m.w + 4, 1, C.steelHi);
  g.rect(1, m.h + 4, m.w + 4, 1, C.ink);
  for (const [x, y] of [[1, 1], [m.w + 4, 1], [1, m.h + 4], [m.w + 4, m.h + 4]] as const) g.set(x, y, C.rivet);
  g.outline(OUTLINE);
  paint(ctx, g, m.x - 3, m.y - 3);
  rect(ctx, m.x, m.y, m.w, m.h, C.screen);
  // Graticule.
  for (let i = 1; i < 8; i++) rect(ctx, m.x + Math.round((i * m.w) / 8), m.y, 1, m.h, "#143f47");
  for (let j = 1; j < 5; j++) rect(ctx, m.x, m.y + Math.round((j * m.h) / 5), m.w, 1, "#143f47");
  // Land, with a lit coast.
  for (let y = 1; y < m.h - 1; y++) {
    const row = Math.floor(((y - 1) * MAP_ROWS) / (m.h - 2));
    for (let x = 1; x < m.w - 1; x++) {
      const col = Math.floor(((x - 1) * MAP_COLS) / (m.w - 2));
      if (!isLand(col, row)) continue;
      const rowUp = Math.floor(((y - 2) * MAP_ROWS) / (m.h - 2));
      const coast = y > 1 && !isLand(col, rowUp);
      rect(ctx, m.x + x, m.y + y, 1, 1, coast ? "#6fd6a0" : (x + y) % 4 === 0 ? "#2f9a72" : "#278463");
    }
  }
  // Scanlines and a glare.
  for (let y = m.y + 1; y < m.y + m.h; y += 2) {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(m.x, y, m.w, 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(m.x + 2, m.y + 2, Math.round(m.w * 0.3), 2);
}

function countdownBoard(ctx: CanvasRenderingContext2D, r: Rect): void {
  const g = new Grid(r.w + 4, r.h + 4);
  g.rect(0, 0, r.w + 4, r.h + 4, C.ink);
  g.rect(1, 1, r.w + 2, 1, "#4a4048");
  g.rect(2, 2, r.w, r.h, "#140c0e");
  g.outline(OUTLINE);
  paint(ctx, g, r.x - 2, r.y - 2);
  // Brackets bolted to the wall.
  rect(ctx, r.x + 6, r.y - 4, 2, 2, C.steelLo);
  rect(ctx, r.x + r.w - 8, r.y - 4, 2, 2, C.steelLo);
}

/** A reel-to-reel tape computer set into the wall (the reels turn in the live layer). */
function tapeComputer(ctx: CanvasRenderingContext2D, t: Rect): void {
  const g = new Grid(t.w, t.h);
  g.rect(0, 0, t.w, t.h, C.creamLo);
  g.rect(1, 1, t.w - 2, t.h - 2, C.cream);
  g.rect(1, 1, t.w - 2, 1, C.creamHi);
  // Two reel windows.
  g.rect(2, 3, t.w - 4, 18, "#2a2629");
  g.rect(3, 4, t.w - 6, 16, "#3a3438");
  // Buttons and lamps below.
  g.rect(2, 24, t.w - 4, 6, C.ink);
  for (let x = 3; x < t.w - 3; x += 3) g.set(x, 26, [C.glowRed, C.glowAmber, C.glowGreen, C.white][(x / 3) % 4 | 0]!);
  g.rect(3, 32, t.w - 6, 2, C.creamLo);
  g.rect(3, 36, t.w - 6, 1, C.creamLo);
  g.rect(3, 39, t.w - 6, 1, C.creamLo);
  g.rect(0, t.h - 2, t.w, 2, C.steelDk);
  g.outline(OUTLINE);
  paint(ctx, g, t.x, t.y);
}

/** A tall screen wall for the TV (short plans): dark steel and acoustic ribs. */
function mediaWall(ctx: CanvasRenderingContext2D, sg: WallSegment): void {
  rockWall(ctx, sg);
  const w = sg.x1 - sg.x0;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(sg.x0, 0, w, sg.depth - 6);
}

function pillar(ctx: CanvasRenderingContext2D, px: number, d: number): void {
  // A steel I-beam set into the rock, hazard stripes at the foot.
  rect(ctx, px - 4, 0, 8, d + 3, C.steelLo);
  rect(ctx, px - 4, 0, 2, d + 3, C.steelHi);
  rect(ctx, px + 2, 0, 2, d + 3, C.steelDk);
  rect(ctx, px - 1, 0, 2, d + 3, C.steel);
  for (let y = 6; y < d; y += 12) {
    rect(ctx, px - 3, y, 1, 1, C.rivet);
    rect(ctx, px + 2, y, 1, 1, C.rivet);
  }
  hazardRect(ctx, px - 4, d - 8, 8, 8, 4);
  rect(ctx, px - 5, 0, 1, d + 3, OUTLINE);
  rect(ctx, px + 4, 0, 1, d + 3, OUTLINE);
}

// ------------------------------------------------------------------ fixtures

function windowFrame(ctx: CanvasRenderingContext2D, win: Rect): void {
  const { x, y, w, h } = win;
  // A blast window: thick riveted steel, the armored shutter rolled up in its housing on top.
  const g = new Grid(w + 10, h + 12);
  g.rect(0, 6, w + 10, h + 6, C.steelDk);
  g.rect(1, 7, w + 8, 1, C.steelHi);
  for (let i = 3; i < w + 8; i += 6) g.set(i, 8, C.rivet).set(i, h + 9, C.rivet);
  g.rect(1, 0, w + 8, 6, C.steelLo);
  g.rect(1, 0, w + 8, 1, C.steelHi);
  hazardStripes(g, 2, 4, w + 6, 2);
  g.outline(OUTLINE);
  paint(ctx, g, x - 5, y - 7);
  ctx.clearRect(x, y, w, h);
  // A heavy mullion cross.
  rect(ctx, x + Math.floor(w / 2) - 1, y, 2, h, C.steelDk);
  rect(ctx, x, y + Math.floor(h * 0.55), w, 1, C.steelDk);
  rect(ctx, x, y + h, w, 1, C.steelHi);
}

function pinboard(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  // The scheme board: cork in a steel frame with a stencilled label.
  const g = new Grid(w + 2, h + 2);
  g.rect(1, 1, w, h, C.steelLo);
  g.rect(1, 1, w, 1, C.steelHi);
  g.rect(1, h, w, 1, C.steelDk);
  g.rect(3, 3, w - 4, h - 4, "#a7784a");
  for (let i = 0; i < (w * h) / 4; i++) g.set(3 + ((i * 37) % (w - 4)), 3 + ((i * 53 + (i >> 3)) % (h - 4)), i % 3 ? "#9a6c40" : "#b88a58");
  for (const [px, py] of [[2, 2], [w - 1, 2], [2, h - 1], [w - 1, h - 1]] as const) g.set(px, py, C.rivet);
  g.outline(OUTLINE);
  paint(ctx, g, x - 1, y - 1);
}

function calendar(ctx: CanvasRenderingContext2D, c: Rect): void {
  const g = new Grid(c.w + 2, c.h + 2);
  g.rect(1, 1, c.w, c.h, "#f4f0e6");
  g.rect(1, 1, c.w, 7, C.velvet);
  g.rect(1, 8, c.w, 1, C.ink);
  g.rect(1, c.h - 1, c.w, 2, "#ddd6c8");
  g.outline(OUTLINE);
  paint(ctx, g, c.x - 1, c.y - 1);
}

function status(ctx: CanvasRenderingContext2D, s: Rect): void {
  const b = new Grid(s.w + 2, s.h + 2);
  b.rect(1, 1, s.w, s.h, C.creamLo);
  b.rect(2, 2, s.w - 2, s.h - 2, "#0c1a14");
  b.rect(2, 2, s.w - 2, 1, "#16281f");
  b.outline(OUTLINE);
  paint(ctx, b, s.x - 1, s.y - 1);
}

function door(ctx: CanvasRenderingContext2D, d: Rect): void {
  // The blast door: a thick round-cornered slab in a hazard-striped frame, a wheel in the middle.
  const g = new Grid(d.w + 10, d.h + 6);
  hazardStripes(g, 0, 0, d.w + 10, d.h + 6);
  g.rect(2, 2, d.w + 6, d.h + 4, C.steelDk);
  g.rrect(5, 4, d.w, d.h + 1, C.steel, 2);
  g.rect(6, 5, d.w - 2, 1, C.steelHi);
  g.rect(5, 4 + Math.floor(d.h * 0.5), d.w, 1, C.steelLo);
  for (let i = 7; i < d.w + 3; i += 5) g.set(i, 7, C.rivet).set(i, d.h + 2, C.rivet);
  const cx = 5 + Math.floor(d.w / 2);
  const cy = 4 + Math.floor(d.h * 0.42);
  g.ellipse(cx, cy, 4, 4, C.steelDk);
  g.ellipse(cx, cy, 3, 3, C.velvet);
  g.ellipse(cx, cy, 1.4, 1.4, C.steelDk);
  g.set(cx - 1, cy - 3, C.velvetHi).set(cx - 3, cy - 1, C.velvetHi);
  g.outline(OUTLINE);
  paint(ctx, g, d.x - 5, d.y - 4);
  // The lit "+" over it: a new thread.
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, "#12100f");
  sg.rect(6, 2, 2, 5, C.glowGreen).rect(4, 4, 6, 1, C.glowGreen);
  sg.outline(OUTLINE);
  paint(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 13));
}

function legend(ctx: CanvasRenderingContext2D, n: Rect): void {
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, "#fbf3c4");
  g.rect(1, 1, n.w, 2, "#f1e39a");
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, "#3a3a40").set(qx + 2, 5, "#3a3a40").set(qx + 1, 6, "#3a3a40").set(qx + 1, 8, "#3a3a40");
  g.outline(OUTLINE);
  paint(ctx, g, n.x - 1, n.y - 1);
  rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, C.velvet);
}

function clock(ctx: CanvasRenderingContext2D, k: { x: number; y: number; r: number }): void {
  const { x, y, r } = k;
  // An industrial clock in a wire cage.
  const g = new Grid(r * 2 + 7, r * 2 + 7);
  const c = r + 3;
  g.ellipse(c, c, r + 1, r + 1, C.steelDk);
  g.ellipse(c, c, r - 0.4, r - 0.4, "#f2ecd8");
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2;
    g.set(c + Math.round(Math.sin(a) * (r - 2)), c - Math.round(Math.cos(a) * (r - 2)), C.ink);
  }
  g.outline(OUTLINE);
  for (const dx of [-3, 0, 3]) g.set(c + dx, 1, C.steelHi).set(c + dx, r * 2 + 5, C.steelHi);
  paint(ctx, g, x - c, y - c);
}

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    stoneFloor(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 4242);
    const plan = planOf(L);
    catwalks(ctx, L, plan);
    if (plan) {
      craterFloor(ctx, plan);
      deckFloor(ctx, L, plan);
    }
  },
  wall(ctx, L) {
    const plan = planOf(L);
    for (const sg of L.segments) {
      const kind = segKindOf(L, sg);
      if (kind === "map") mapWall(ctx, sg, plan);
      else if (kind === "media") mediaWall(ctx, sg);
      else rockWall(ctx, sg);
    }
    pipes(ctx, L);
    for (const px of L.wall.pillars) {
      const left = L.segments.find((s) => s.x1 === px);
      const right = L.segments.find((s) => s.x0 === px);
      pillar(ctx, px, Math.max(left?.depth ?? 64, right?.depth ?? 64));
    }
  },
  pods: podFloor,
  room: roomFloor,
  roomWalls,
  window: (ctx, win) => windowFrame(ctx, win),
  pinboard,
  calendar,
  status,
  door,
  legend,
  painting: () => {},
  clock,
};
