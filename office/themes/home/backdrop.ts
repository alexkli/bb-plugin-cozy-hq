// Home Office: the backdrop, baked once per plan. The streets and the cross
// alleys, the lots between them (greens, a parking lot, a corner shop, the
// park, your garden), every apartment's floor and back wall, your house,
// and the shopfronts along the top that carry the noticeboard, the
// calendar, the status board, the clock and the building door (the "+").
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { CLASSIC_BACKGROUND, drawPixelText, Grid, pixelTextWidth, shade, tiles } from "../../themekit.ts";
import { C, FABRICS, FLOORS, FRONTS, h2, OUTLINE, PAPERS, rect } from "./kit.ts";
import { BACK, FRONT, homeData, type HomeData, type Lot, type Unit } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

function paint(ctx: Ctx, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

// ------------------------------------------------------------------ the ground

function sidewalk(ctx: Ctx, r: Rect, seed = 0): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.sidewalk);
  // Paving slabs.
  for (let y = r.y; y < r.y + r.h; y += 8) {
    rect(ctx, r.x, y, r.w, 1, C.sidewalkLo);
    const off = ((y - r.y) / 8) % 2 ? 6 : 0;
    for (let x = r.x + off; x < r.x + r.w; x += 12) rect(ctx, x, y, 1, Math.min(8, r.y + r.h - y), C.sidewalkLo);
  }
  for (let i = 0; i < (r.w * r.h) / 90; i++) {
    const x = r.x + Math.floor(h2(seed + i, 3) * r.w);
    const y = r.y + Math.floor(h2(seed + i, 7) * r.h);
    rect(ctx, x, y, 1, 1, i % 3 ? C.sidewalkHi : C.sidewalkLo);
  }
}

function asphalt(ctx: Ctx, r: Rect, seed = 0): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.asphalt);
  for (let i = 0; i < (r.w * r.h) / 26; i++) {
    const x = r.x + Math.floor(h2(seed + i, 11) * r.w);
    const y = r.y + Math.floor(h2(seed + i, 13) * r.h);
    rect(ctx, x, y, 1, 1, i % 2 ? C.asphaltHi : C.asphaltLo);
  }
}

function grass(ctx: Ctx, r: Rect, seed = 0): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.grass);
  for (let i = 0; i < (r.w * r.h) / 14; i++) {
    const x = r.x + Math.floor(h2(seed + i, 17) * r.w);
    const y = r.y + Math.floor(h2(seed + i, 19) * r.h);
    const k = h2(seed + i, 23);
    rect(ctx, x, y, 1, k < 0.5 ? 2 : 1, k < 0.33 ? C.grassHi : k < 0.66 ? C.grassLo : C.grass);
  }
}

/** A street: the sidewalk the doors open onto, the road with a dashed line, a strip of sidewalk along the next row. */
function street(ctx: Ctx, s: Rect, d: HomeData, seed: number): void {
  sidewalk(ctx, { x: s.x, y: s.y, w: s.w, h: 9 }, seed);
  rect(ctx, s.x, s.y + 9, s.w, 1, C.curb);
  const road: Rect = { x: s.x, y: s.y + 10, w: s.w, h: s.h - 17 };
  asphalt(ctx, road, seed);
  rect(ctx, s.x, s.y + s.h - 7, s.w, 1, C.curb);
  rect(ctx, s.x, s.y + s.h - 6, s.w, 1, C.curbLo);
  sidewalk(ctx, { x: s.x, y: s.y + s.h - 5, w: s.w, h: 5 }, seed + 50);
  const mid = road.y + Math.floor(road.h / 2);
  for (let x = s.x + 4; x < s.x + s.w; x += 14) rect(ctx, x, mid, 7, 1, C.lane);
  // A manhole cover or two.
  for (let i = 0; i < 2; i++) {
    const x = Math.round(s.x + s.w * (0.25 + 0.5 * i) + (h2(seed, i) - 0.5) * 60);
    const g = new Grid(8, 5);
    g.ellipse(3.5, 2, 3.5, 2, "#4a4a52");
    g.hline(2, 1, 4, "#5e5e66").hline(1, 3, 6, "#3e3e46");
    paint(ctx, g, x, mid - 6 + (i % 2) * 7);
  }
  void d;
}

/** A cross alley between the blocks: paving stones, with crosswalks over the roads. */
function alley(ctx: Ctx, a: Rect, d: HomeData, seed: number): void {
  rect(ctx, a.x, a.y, a.w, a.h, C.sidewalkLo);
  for (let y = a.y; y < a.y + a.h; y += 5) {
    const off = Math.floor(y / 5) % 2 ? 3 : 0;
    for (let x = a.x + 1 + off; x < a.x + a.w - 1; x += 6) {
      const k = h2(seed + x, y);
      rect(ctx, x, y, 5, 4, k < 0.3 ? "#c4bdaf" : k < 0.7 ? "#bcb5a7" : "#cbc5b8");
    }
  }
  rect(ctx, a.x, a.y, 1, a.h, C.curb);
  rect(ctx, a.x + a.w - 1, a.y, 1, a.h, C.curb);
  // Zebra crossings where the alley meets a road.
  for (const r of d.rows) {
    const y0 = r.street.y + 10;
    const h = r.street.h - 17;
    asphalt(ctx, { x: a.x, y: y0, w: a.w, h }, seed + r.y);
    for (let x = a.x + 2; x < a.x + a.w - 2; x += 4) rect(ctx, x, y0 + 1, 2, h - 2, C.lane);
  }
}

// ------------------------------------------------------------------ the blocks

/** Backyards behind the buildings: grass with a wooden fence along the back of the block. */
function backyards(ctx: Ctx, d: HomeData, L: Layout): void {
  for (const [ri, r] of d.rows.entries()) {
    const top = ri === 0 ? Math.max(...L.segments.map((s) => s.depth)) : d.rows[ri - 1]!.street.y + d.rows[ri - 1]!.street.h;
    const y0 = ri === 0 ? top : top;
    grass(ctx, { x: 0, y: y0, w: L.W, h: r.street.y - y0 }, 200 + ri * 11);
    // A board fence along the back of each block.
    const fy = r.y + 2;
    for (let x = 0; x < L.W; x += 3) {
      if (d.avenues.some((a) => x >= a.x - 2 && x < a.x + a.w + 2)) continue;
      rect(ctx, x, fy, 2, 7, "#b08458");
      rect(ctx, x, fy, 2, 1, "#c99a6a");
      rect(ctx, x + 2, fy, 1, 7, "#8a6440");
    }
    rect(ctx, 0, fy + 2, L.W, 1, "#8a6440");
  }
}

/** A side yard between two buildings: grass, a bin or a bike, a path. */
function yardLot(ctx: Ctx, lot: Lot): void {
  const r = lot.rect;
  const bottom = r.y + r.h;
  rect(ctx, r.x + Math.floor(r.w / 2) - 2, bottom - 30, 4, 30, "#cfc6b2");
  if (r.w >= 14 && lot.seed % 3 === 0) {
    const g = new Grid(7, 9);
    g.rect(0, 1, 7, 8, ["#3a7a4a", "#3a5a8a", "#5a5a62"][lot.seed % 3]!).rect(0, 0, 7, 2, "#2a2a32");
    g.outline(OUTLINE);
    paint(ctx, g, r.x + 1, bottom - 22);
  }
}

function greenLot(ctx: Ctx, lot: Lot): void {
  const r = lot.rect;
  grass(ctx, r, lot.seed);
  // A low hedge round it, a gravel path across, a flower bed.
  rect(ctx, r.x + 2, r.y + 10, r.w - 4, 4, C.leaf);
  rect(ctx, r.x + 2, r.y + 10, r.w - 4, 1, C.leafHi);
  const py = r.y + 50 + (lot.seed % 3) * 4;
  rect(ctx, r.x, py, r.w, 6, "#d8ccb0");
  rect(ctx, r.x, py, r.w, 1, "#c4b694");
  rect(ctx, r.x, py + 5, r.w, 1, "#c4b694");
  const fx = r.x + 8 + (lot.seed % 4) * 6;
  for (let i = 0; i < 10; i++) {
    const x = fx + (i % 5) * 5 + (i > 4 ? 2 : 0);
    const y = r.y + r.h - 18 + (i > 4 ? 4 : 0);
    rect(ctx, x, y, 2, 2, ["#f2c14e", "#e86a8a", "#ffffff", "#b48cff"][i % 4]!);
    rect(ctx, x, y + 2, 1, 1, C.leafLo);
  }
}

function parkingLot(ctx: Ctx, lot: Lot): void {
  const r = lot.rect;
  const y0 = r.y + 14;
  asphalt(ctx, { x: r.x, y: y0, w: r.w, h: r.h - 14 }, lot.seed);
  rect(ctx, r.x, y0, r.w, 2, C.curb);
  for (let x = r.x + 4; x < r.x + r.w - 4; x += 22) rect(ctx, x, y0 + 6, 1, 26, C.lane);
  const g = new Grid(9, 9);
  g.rect(0, 0, 9, 9, "#2f6bb0").rect(2, 2, 2, 5, "#ffffff").rect(4, 2, 2, 1, "#ffffff").rect(4, 4, 2, 1, "#ffffff").set(5, 3, "#ffffff");
  g.outline(OUTLINE);
  paint(ctx, g, r.x + r.w - 13, y0 + 4);
}

function shopLot(ctx: Ctx, lot: Lot): void {
  // A little corner shop with its flat roof, its front onto the street below.
  const r = lot.rect;
  const top = r.y + 14;
  const roof = r.h - 14 - 30;
  rect(ctx, r.x, top, r.w, roof, "#8d8a86");
  for (let i = 0; i < (r.w * roof) / 12; i++) rect(ctx, r.x + Math.floor(h2(lot.seed, i) * r.w), top + Math.floor(h2(i, lot.seed) * roof), 1, 1, i % 2 ? "#a19e99" : "#7b7874");
  rect(ctx, r.x, top, r.w, 2, "#6e6b67");
  rect(ctx, r.x, top + roof - 3, r.w, 3, "#6e6b67");
  const g = new Grid(14, 10);
  g.rect(0, 0, 14, 10, C.steel).rect(1, 1, 12, 3, "#c7cdd4").rect(3, 5, 8, 3, C.steelLo);
  g.outline(OUTLINE);
  paint(ctx, g, r.x + 8, top + 6);
  const f = FRONTS[lot.seed % FRONTS.length]!;
  const fy = top + roof;
  rect(ctx, r.x, fy, r.w, 30, f.wall);
  if (f.brick) for (let y = fy + 2; y < fy + 30; y += 4) rect(ctx, r.x, y, r.w, 1, f.lo);
  rect(ctx, r.x + 6, fy + 13, r.w - 30, 16, C.dark);
  rect(ctx, r.x + 7, fy + 14, r.w - 32, 14, C.glassLo);
  rect(ctx, r.x + 8, fy + 15, 6, 2, "#e9f6ff");
  for (let i = 0; i < 4; i++) rect(ctx, r.x + 9 + i * 7, fy + 24, 4, 4, ["#f2c14e", "#e86a8a", "#c8733f", "#7fb8d6"][(lot.seed + i) % 4]!);
  rect(ctx, r.x + r.w - 20, fy + 10, 14, 20, C.dark);
  rect(ctx, r.x + r.w - 19, fy + 11, 12, 19, "#6e8aa0");
  const stripe = ["#d0505a", "#3e8ed0", "#30a46c", "#e5a33c"][lot.seed % 4]!;
  for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) {
    rect(ctx, x, fy + 4, 2, 6, stripe);
    rect(ctx, x + 2, fy + 4, 2, 6, C.white);
  }
  rect(ctx, r.x + 2, fy + 10, r.w - 4, 1, shade(stripe, -0.3));
  const name = ["DELI", "BOOKS", "FLOWERS", "BIKES", "BAKERY", "GROCER"][lot.seed % 6]!;
  const tw = pixelTextWidth(name);
  if (tw + 8 <= r.w) {
    rect(ctx, r.x + Math.round((r.w - tw) / 2) - 3, fy - 8, tw + 6, 9, OUTLINE);
    rect(ctx, r.x + Math.round((r.w - tw) / 2) - 2, fy - 7, tw + 4, 7, C.cream);
    drawPixelText(ctx, name, r.x + Math.round((r.w - tw) / 2), fy - 6, "#5a3a2a");
  }
}

/** White pickets along a line, a gap for the gate. */
function pickets(ctx: Ctx, x0: number, y: number, w: number, gate?: [number, number]): void {
  rect(ctx, x0, y + 3, w, 1, "#d9d4c8");
  for (let x = x0; x < x0 + w; x += 3) {
    if (gate && x >= gate[0] && x < gate[1]) continue;
    rect(ctx, x, y, 2, 6, C.white);
    rect(ctx, x + 1, y + 1, 1, 5, "#d9d4c8");
  }
}

/** A garden: grass, a stone path from the gate, flower beds, a picket fence. */
function gardenPlot(ctx: Ctx, r: Rect, seed: number): void {
  grass(ctx, r, seed);
  rect(ctx, r.x + 2, r.y + 2, r.w - 4, 6, C.soil);
  for (let x = r.x + 3; x < r.x + r.w - 4; x += 4) {
    rect(ctx, x, r.y + 1, 3, 3, ["#f2c14e", "#e86a8a", "#ff8a5a", "#b48cff", "#ffffff"][((x >> 2) + seed) % 5]!);
    rect(ctx, x + 1, r.y + 4, 1, 3, C.leafLo);
  }
  const gx = r.x + Math.round(r.w / 2) - 3;
  for (let y = r.y + r.h - 7; y > r.y + r.h - 30; y -= 7) {
    const g = new Grid(7, 4);
    g.ellipse(3, 1.5, 3, 1.5, "#c9c0ae");
    g.hline(2, 1, 3, "#ddd5c4");
    paint(ctx, g, gx + ((y >> 3) % 2 ? -1 : 1), y);
  }
  for (const x of [r.x, r.x + r.w - 2]) {
    rect(ctx, x, r.y, 2, r.h, C.white);
    rect(ctx, x + 1, r.y, 1, r.h, "#d9d4c8");
  }
  pickets(ctx, r.x, r.y + r.h - 6, r.w, [gx - 3, gx + 9]);
}

function parkLot(ctx: Ctx, d: HomeData): void {
  const p = d.park;
  grass(ctx, p, 41);
  // A path round the lawn.
  const l = d.lawn;
  const path = (r: Rect) => {
    rect(ctx, r.x, r.y, r.w, r.h, "#d8ccb0");
    for (let i = 0; i < (r.w * r.h) / 10; i++) rect(ctx, r.x + Math.floor(h2(i, r.x) * r.w), r.y + Math.floor(h2(r.y, i) * r.h), 1, 1, i % 2 ? "#cbbd9e" : "#e2d8c0");
  };
  path({ x: l.x - 4, y: l.y - 4, w: l.w + 8, h: 3 });
  path({ x: l.x - 4, y: l.y + l.h + 1, w: l.w + 8, h: 3 });
  path({ x: l.x - 4, y: l.y - 4, w: 3, h: l.h + 8 });
  path({ x: l.x + l.w + 1, y: l.y - 4, w: 3, h: l.h + 8 });
  path({ x: p.x + 2, y: p.y + p.h - 6, w: p.w - 4, h: 4 });
  // The lawn, mown in stripes.
  for (let x = l.x; x < l.x + l.w; x += 8) rect(ctx, x, l.y, 4, l.h, C.grassHi);
  // A hedge round the park.
  rect(ctx, p.x, p.y, p.w, 4, C.leaf);
  rect(ctx, p.x, p.y, p.w, 1, C.leafHi);
  rect(ctx, p.x, p.y, 3, p.h - 6, C.leaf);
  rect(ctx, p.x + p.w - 3, p.y, 3, p.h - 6, C.leaf);
  // Flower beds in the corners.
  for (const x of [p.x + 6, p.x + p.w - 28]) {
    rect(ctx, x, p.y + 8, 22, 9, C.soil);
    for (let i = 0; i < 8; i++) rect(ctx, x + 2 + (i % 4) * 5, p.y + 9 + (i > 3 ? 4 : 0), 3, 3, ["#f2c14e", "#e86a8a", "#ffffff", "#ff8a5a"][i % 4]!);
  }
}

// ------------------------------------------------------------------ a home

function floorOf(ctx: Ctx, r: Rect, kind: (typeof FLOORS)[number], seed: number): void {
  switch (kind) {
    case "tiles":
      tiles(ctx, r, C.tileA, C.tileB, 5);
      return;
    case "carpet":
      rect(ctx, r.x, r.y, r.w, r.h, "#b9a68a");
      for (let i = 0; i < (r.w * r.h) / 8; i++) rect(ctx, r.x + Math.floor(h2(seed, i) * r.w), r.y + Math.floor(h2(i, seed) * r.h), 1, 1, i % 2 ? "#c7b598" : "#ab977a");
      return;
    default: {
      const [a, b, line] = kind === "pale" ? [C.pale, "#d8bf94", C.paleLo] : kind === "walnut" ? [C.walnut, "#93613f", C.walnutLo] : [C.oak, "#c39260", C.oakLo];
      for (let y = r.y, row = 0; y < r.y + r.h; y += 6, row++) {
        rect(ctx, r.x, y, r.w, Math.min(6, r.y + r.h - y), row % 2 ? a : b);
        rect(ctx, r.x, y + 5, r.w, 1, line);
        const off = (row * 23 + seed) % 34;
        for (let x = r.x - off; x < r.x + r.w; x += 34) if (x > r.x) rect(ctx, x, y, 1, 5, line);
      }
    }
  }
}

function wallpaper(ctx: Ctx, r: Rect, seed: number): void {
  const p = PAPERS[seed % PAPERS.length]!;
  rect(ctx, r.x, r.y, r.w, r.h, p.base);
  if (p.kind === "stripe") for (let x = r.x + 2; x < r.x + r.w; x += 6) rect(ctx, x, r.y, 2, r.h - 3, p.pattern);
  else if (p.kind === "dot") for (let y = r.y + 2; y < r.y + r.h - 4; y += 4) for (let x = r.x + 2 + ((y >> 2) % 2) * 2; x < r.x + r.w - 1; x += 5) rect(ctx, x, y, 1, 1, p.pattern);
  else if (p.kind === "check") for (let y = r.y; y < r.y + r.h - 3; y += 5) rect(ctx, r.x, y, r.w, 1, p.pattern);
  rect(ctx, r.x, r.y + r.h - 3, r.w, 2, C.baseboard);
  rect(ctx, r.x, r.y + r.h - 1, r.w, 1, shade(p.base, -0.25));
}

/** A window in a back wall: frame, sky, rooftops across the way, curtains. */
function homeWindow(ctx: Ctx, w: Rect, fabric: string): void {
  const g = new Grid(w.w + 2, w.h + 3);
  g.rect(1, 1, w.w, w.h, C.white);
  g.rect(2, 2, w.w - 2, w.h - 2, "#a8d8f0");
  g.rect(2, 2, w.w - 2, 2, "#c8ecfa");
  g.rect(2, w.h - 3, w.w - 2, 2, "#9fb0c0");
  g.rect(4, w.h - 5, 4, 2, "#9fb0c0");
  g.rect(Math.floor(w.w / 2), 2, 1, w.h - 2, C.white);
  g.rect(0, w.h + 1, w.w + 2, 2, C.white);
  g.outline(OUTLINE);
  g.rect(1, 1, 2, w.h, fabric).rect(w.w - 1, 1, 2, w.h, fabric);
  paint(ctx, g, w.x - 1, w.y - 1);
}

function wallBoard(ctx: Ctx, b: Rect): void {
  const g = new Grid(b.w + 2, b.h + 3);
  g.rect(1, 1, b.w, b.h, "#aeb6bf");
  g.rect(2, 2, b.w - 2, b.h - 3, "#fbfbf8");
  g.rect(1, b.h, b.w, 2, "#8d96a0");
  g.set(4, b.h + 1, "#e5484d").set(6, b.h + 1, "#3e8ed0");
  g.outline(OUTLINE);
  paint(ctx, g, b.x - 1, b.y - 1);
}

/** Something small on the wall: a shelf with jars, a picture, a clock, a guitar, a poster. */
function wallThing(ctx: Ctx, x: number, y: number, seed: number): void {
  switch (seed % 5) {
    case 0:
      rect(ctx, x, y + 6, 16, 1, C.walnut);
      for (let i = 0; i < 4; i++) rect(ctx, x + 1 + i * 4, y + 3, 3, 3, ["#e5a33c", "#d0505a", "#7fb8d6", "#f3ead6"][i]!);
      return;
    case 1:
      rect(ctx, x + 2, y + 1, 12, 9, OUTLINE);
      rect(ctx, x + 3, y + 2, 10, 7, ["#7fb8d6", "#f2c14e", "#86e07f"][seed % 3]!);
      rect(ctx, x + 3, y + 6, 10, 3, "#5f9a4c");
      rect(ctx, x + 8, y + 3, 3, 3, "#ffe9a0");
      return;
    case 2: {
      const g = new Grid(9, 9);
      g.ellipse(4, 4, 4, 4, OUTLINE).ellipse(4, 4, 3, 3, C.white).set(4, 2, OUTLINE).set(4, 3, OUTLINE).set(5, 4, OUTLINE);
      paint(ctx, g, x + 3, y + 1);
      return;
    }
    case 3: {
      const g = new Grid(8, 13);
      g.rect(3, 0, 2, 6, "#6e452c").ellipse(3.5, 9, 3, 3, "#c8733f").set(3, 9, OUTLINE).set(4, 9, OUTLINE);
      g.outline(OUTLINE);
      paint(ctx, g, x + 4, y);
      return;
    }
    default:
      rect(ctx, x + 2, y, 11, 12, OUTLINE);
      rect(ctx, x + 3, y + 1, 9, 10, ["#e86a8a", "#3e8ed0", "#30a46c"][seed % 3]!);
      rect(ctx, x + 5, y + 3, 5, 5, "#fff3c4");
  }
}

function unitRoom(ctx: Ctx, u: Unit): void {
  const r = u.rect;
  const s = u.seed;
  const fabric = FABRICS[s % FABRICS.length]!;
  const inner: Rect = { x: r.x + 3, y: r.y + BACK, w: r.w - 6, h: r.h - BACK - FRONT + 2 };
  floorOf(ctx, inner, FLOORS[(s + u.index) % FLOORS.length]!, s);
  if (u.balcony) {
    // The balcony: outdoor tiles past the glass door.
    const b = u.balcony;
    tiles(ctx, b, "#d9cfc0", "#c9bfae", 4);
    rect(ctx, b.x, b.y, b.w, 2, C.glassLo);
    rect(ctx, b.x, b.y, b.w, 1, OUTLINE);
    rect(ctx, u.doorX - 7, b.y, 14, 2, C.glass);
  }
  for (const p of u.pieces) {
    if (p.kind !== "rug") continue;
    rect(ctx, p.rect.x, p.rect.y, p.rect.w, p.rect.h, shade(fabric, -0.2));
    rect(ctx, p.rect.x + 1, p.rect.y + 1, p.rect.w - 2, p.rect.h - 2, shade(fabric, 0.4));
    rect(ctx, p.rect.x + 3, p.rect.y + 3, p.rect.w - 6, p.rect.h - 6, shade(fabric, 0.2));
  }
  // The door stands open against the wall inside the doorway.
  rect(ctx, u.doorX + 6, r.y + r.h - FRONT - 9, 2, 10, "#8a5a3c");
  rect(ctx, u.doorX + 7, r.y + r.h - FRONT - 9, 1, 10, "#a8744c");
  if (u.template === "cottage") {
    // Timber and plaster in the cottage.
    rect(ctx, r.x + 3, r.y + 3, r.w - 6, BACK - 3, "#f3e9d2");
    for (let x = r.x + 8; x < r.x + r.w - 4; x += 16) rect(ctx, x, r.y + 3, 2, BACK - 5, "#8a5a3c");
    rect(ctx, r.x + 3, r.y + 3, r.w - 6, 2, "#8a5a3c");
    rect(ctx, r.x + 3, r.y + BACK - 3, r.w - 6, 3, "#8a5a3c");
  } else wallpaper(ctx, { x: r.x + 3, y: r.y + 3, w: r.w - 6, h: BACK - 3 }, s + u.index);
  for (const w of u.windows) homeWindow(ctx, w, fabric);
  if (u.board) wallBoard(ctx, u.board);
  // Something on the wall where there's room.
  const taken = [...u.windows, ...(u.board ? [u.board] : []), ...u.pieces.filter((p) => p.rect.y < r.y + BACK).map((p) => p.rect)];
  for (let x = r.x + 6; x + 16 < r.x + r.w - 4; x += 4) {
    if (taken.some((t) => x < t.x + t.w + 2 && x + 16 > t.x - 2)) continue;
    wallThing(ctx, x, r.y + 3, s + x);
    break;
  }
  if (u.garden) gardenPlot(ctx, u.garden, s);
}

/** A home's walls seen from above: its outside color on top. */
function unitWalls(ctx: Ctx, u: Unit): void {
  const r = u.rect;
  const f = u.template === "cottage" ? { wall: "#e9dcc4", hi: "#f4ead6", lo: "#8a5a3c" } : FRONTS[u.seed % FRONTS.length]!;
  rect(ctx, r.x, r.y, r.w, 3, f.lo);
  rect(ctx, r.x, r.y, r.w, 1, C.roofCap);
  for (const x of [r.x, r.x + r.w - 3]) {
    rect(ctx, x, r.y, 3, r.h - FRONT + 1, f.wall);
    rect(ctx, x, r.y, 1, r.h - FRONT + 1, f.lo);
    rect(ctx, x + 2, r.y, 1, r.h - FRONT + 1, f.hi);
  }
  // The doormat outside, the step down to the sidewalk.
  rect(ctx, u.doorX - 7, r.y + r.h + 1, 14, 3, "#7a5a3c");
  rect(ctx, u.doorX - 6, r.y + r.h + 2, 12, 1, "#9a744c");
}

// ------------------------------------------------------------------ your house, the café

function houseRoom(ctx: Ctx, r: Rect): void {
  const inner: Rect = { x: r.x + 3, y: r.y + BACK, w: r.w - 6, h: r.h - BACK - FRONT + 2 };
  rect(ctx, inner.x, inner.y, inner.w, inner.h, "#b8834f");
  for (let y = inner.y; y < inner.y + inner.h; y += 4) {
    for (let x = inner.x + ((y >> 2) % 2) * 4; x < inner.x + inner.w; x += 8) {
      rect(ctx, x, y, 4, 2, "#c99460");
      rect(ctx, x + 4, y + 2, 4, 2, "#a8743f");
    }
  }
  const rug: Rect = { x: r.x + 28, y: r.y + 26, w: Math.min(112, r.w - 56), h: 46 };
  rect(ctx, rug.x, rug.y, rug.w, rug.h, "#3f5a7a");
  rect(ctx, rug.x + 2, rug.y + 2, rug.w - 4, rug.h - 4, "#5a7aa0");
  rect(ctx, rug.x + 5, rug.y + 5, rug.w - 10, rug.h - 10, "#e9dcc0");
  rect(ctx, rug.x + 7, rug.y + 7, rug.w - 14, rug.h - 14, "#5a7aa0");
  rect(ctx, r.x + 3, r.y + 3, r.w - 6, BACK - 3, "#f1e4c8");
  rect(ctx, r.x + 3, r.y + 10, r.w - 6, BACK - 10, "#e2cfa8");
  rect(ctx, r.x + 3, r.y + 10, r.w - 6, 1, "#c9b28a");
  for (let x = r.x + 6; x < r.x + r.w - 6; x += 10) rect(ctx, x, r.y + 12, 1, BACK - 15, "#d4be94");
  rect(ctx, r.x + 3, r.y + BACK - 2, r.w - 6, 2, C.baseboard);
  homeWindow(ctx, { x: r.x + Math.round(r.w * 0.36), y: r.y + 3, w: 18, h: 10 }, "#c9564a");
  homeWindow(ctx, { x: r.x + Math.round(r.w * 0.36) + 24, y: r.y + 3, w: 18, h: 10 }, "#c9564a");
  rect(ctx, r.x, r.y, r.w, 3, "#7a5a44");
  rect(ctx, r.x, r.y, r.w, 1, C.roofCap);
  for (const x of [r.x, r.x + r.w - 3]) {
    rect(ctx, x, r.y, 3, r.h - FRONT + 1, "#efe2c8");
    rect(ctx, x, r.y, 1, r.h - FRONT + 1, "#c9b28a");
  }
  // The doormat and a name plate by the door.
  rect(ctx, r.x + 10, r.y + r.h + 1, 16, 4, "#8a5a3c");
  rect(ctx, r.x + 11, r.y + r.h + 2, 14, 2, "#c46a4a");
}

function cafeRoom(ctx: Ctx, r: Rect): void {
  tiles(ctx, { x: r.x + 3, y: r.y + BACK, w: r.w - 6, h: r.h - BACK - FRONT + 2 }, "#efe7d6", "#3d3537", 4);
  // Exposed brick with a chalkboard menu.
  rect(ctx, r.x + 3, r.y + 3, r.w - 6, BACK - 3, C.brick);
  for (let y = r.y + 4; y < r.y + BACK - 1; y += 3) {
    rect(ctx, r.x + 3, y, r.w - 6, 1, C.brickLo);
    for (let x = r.x + 3 + ((y >> 1) % 2) * 3; x < r.x + r.w - 3; x += 6) rect(ctx, x, y + 1, 1, 2, C.brickLo);
  }
  const name = "CO-WORK CAFE";
  const tw = pixelTextWidth(name);
  const bx = r.x + 92;
  if (bx + tw + 8 < r.x + r.w - 36) {
    rect(ctx, bx, r.y + 4, tw + 8, 11, OUTLINE);
    rect(ctx, bx + 1, r.y + 5, tw + 6, 9, "#2c3431");
    drawPixelText(ctx, name, bx + 4, r.y + 7, "#efeee6");
  }
  rect(ctx, r.x, r.y, r.w, 3, "#2f5d50");
  rect(ctx, r.x, r.y, r.w, 1, C.roofCap);
  for (const x of [r.x, r.x + r.w - 3]) {
    rect(ctx, x, r.y, 3, r.h - FRONT + 1, "#2f5d50");
    rect(ctx, x + 2, r.y, 1, r.h - FRONT + 1, "#46806e");
  }
}

// ------------------------------------------------------------------ the shopfronts along the top

const SHOPS = ["BAKERY", "BOOKS", "LAUNDRY", "FLOWERS", "CAFE", "DELI", "RECORDS", "BIKES", "TOYS", "NOODLES"];

function shopfronts(ctx: Ctx, L: Layout): void {
  const busy: [number, number][] = [
    [L.wall.pinboard.x - 2, L.wall.status.x + L.wall.status.w + 2],
    [L.wall.legendNote.x - 3, L.wall.door.x + L.wall.door.w + 3],
    [L.wall.clock.x - 12, L.wall.clock.x + 12],
    [L.tv.x - 18, L.tv.x + L.tv.w + 18],
  ];
  // Buildings of 70–120 px between the alleys (the windows are the gaps).
  const gaps = L.wall.windows.map((w) => [w.x, w.x + w.w] as [number, number]).sort((a, b) => a[0] - b[0]);
  const edges = [0, ...gaps.flatMap((g) => g), L.W];
  let n = 0;
  for (let i = 0; i < edges.length; i += 2) {
    const x0 = edges[i]!;
    const x1 = edges[i + 1]!;
    for (let x = x0; x < x1; ) {
      const left = x1 - x;
      const w = left < 150 ? left : Math.min(left - 60, 72 + Math.floor(h2(n, 5) * 48));
      building(ctx, L, x, w, n++, busy);
      x += w;
    }
  }
}

function building(ctx: Ctx, L: Layout, x: number, w: number, n: number, busy: [number, number][]): void {
  const seg = L.segments.find((s) => x + 2 >= s.x0 && x + 2 < s.x1) ?? L.segments[0]!;
  const d = seg.depth;
  const f = FRONTS[(n * 5 + 1) % FRONTS.length]!;
  rect(ctx, x, 0, w, d, f.wall);
  if (f.brick) {
    for (let y = 1; y < d; y += 4) {
      rect(ctx, x, y, w, 1, f.lo);
      for (let bx = x + ((y >> 2) % 2) * 4; bx < x + w; bx += 8) rect(ctx, bx, y + 1, 1, 3, f.lo);
    }
  } else for (let i = 0; i < w * 2; i++) rect(ctx, x + Math.floor(h2(n, i) * w), Math.floor(h2(i, n) * d), 1, 1, i % 2 ? f.hi : f.lo);
  rect(ctx, x, 0, 1, d, shade(f.wall, -0.35));
  rect(ctx, x + w - 1, 0, 1, d, shade(f.wall, -0.2));
  const free = (a: number, b: number) => !busy.some(([p, q]) => a < q && b > p);
  // Upper windows with flower boxes, where nothing's mounted on the wall (two floors on tall fronts).
  const floors = d >= 70 ? [4, 28] : [4];
  for (const fy of floors) for (let wx = x + 6; wx + 10 <= x + w - 4; wx += 16) {
    if (!free(wx - 2, wx + 12)) continue;
    const g = new Grid(12, 14);
    g.rect(1, 1, 10, 10, C.white).rect(2, 2, 8, 8, "#9cc8e0").rect(2, 2, 8, 2, "#c0e2f2").rect(6, 2, 1, 8, C.white);
    g.rect(0, 10, 12, 3, "#8a5a3c");
    g.outline(OUTLINE);
    if (h2(n, wx) < 0.6) g.set(2, 9, "#e86a8a").set(5, 9, "#f2c14e").set(8, 9, "#e86a8a").set(3, 9, C.leaf).set(7, 9, C.leaf);
    paint(ctx, g, wx - 1, fy);
  }
  // The shop at street level: an awning, a window, a door, a sign.
  const sy = d - 22;
  if (free(x + 4, x + w - 4) || w >= 60) {
    const stripe = ["#d0505a", "#3e8ed0", "#30a46c", "#e5a33c", "#8e4ec6"][n % 5]!;
    const ax0 = x + 3;
    const ax1 = x + w - 3;
    for (let ax = ax0; ax < ax1; ax += 4) {
      if (!free(ax, ax + 4)) continue;
      rect(ctx, ax, sy, 2, 5, stripe);
      rect(ctx, ax + 2, sy, 2, 5, C.white);
      rect(ctx, ax, sy + 5, 4, 1, shade(stripe, -0.35));
    }
    for (let sx = x + 6; sx + 22 <= x + w - 6; sx += 30) {
      if (!free(sx - 2, sx + 24)) continue;
      rect(ctx, sx, sy + 8, 22, d - sy - 9, OUTLINE);
      rect(ctx, sx + 1, sy + 9, 20, d - sy - 10, C.glassLo);
      rect(ctx, sx + 2, sy + 10, 5, 2, "#e9f6ff");
      // Goods in the window.
      for (let i = 0; i < 4; i++) rect(ctx, sx + 3 + i * 5, d - 5, 3, 3, ["#f2c14e", "#e86a8a", "#c8733f", "#7fb8d6"][(n + i) % 4]!);
    }
    const name = SHOPS[n % SHOPS.length]!;
    const tw = pixelTextWidth(name);
    const nx = x + Math.round((w - tw) / 2);
    if (free(nx - 4, nx + tw + 4) && tw + 8 < w) {
      rect(ctx, nx - 3, sy - 10, tw + 6, 9, OUTLINE);
      rect(ctx, nx - 2, sy - 9, tw + 4, 7, C.cream);
      drawPixelText(ctx, name, nx, sy - 8, "#5a3a2a");
    }
  }
  // The building's foot on the sidewalk.
  rect(ctx, x, d - 1, w, 1, shade(f.wall, -0.4));
}

// ------------------------------------------------------------------ the steps

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    const d = homeData(L);
    if (!d) return CLASSIC_BACKGROUND.floor(ctx, L);
    sidewalk(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 5);
    backyards(ctx, d, L);
    for (const [i, r] of d.rows.entries()) street(ctx, r.street, d, 100 + i * 37);
    for (const [i, a] of d.avenues.entries()) alley(ctx, a, d, 300 + i * 17);
    for (const lot of d.lots) {
      if (lot.kind === "green") greenLot(ctx, lot);
      else if (lot.kind === "parking") parkingLot(ctx, lot);
      else if (lot.kind === "shop") shopLot(ctx, lot);
      else yardLot(ctx, lot);
    }
    if (d.garden) gardenPlot(ctx, d.garden, 77);
    parkLot(ctx, d);
  },
  wall(ctx, L) {
    if (!homeData(L)) return CLASSIC_BACKGROUND.wall(ctx, L);
    shopfronts(ctx, L);
  },
  pods() {},
  room(ctx, room: Room, L) {
    const d = homeData(L);
    if (!d) return CLASSIC_BACKGROUND.room(ctx, room, L);
    if (room.kind === "pod") {
      if (room.variant === -1) return cafeRoom(ctx, room.rect);
      const u = d.units[room.variant ?? 0];
      if (u) {
        unitRoom(ctx, u);
        unitWalls(ctx, u);
      }
    } else if (room.kind === "boss") houseRoom(ctx, room.rect);
  },
  roomWalls(ctx, room, L) {
    const d = homeData(L);
    if (!d) return CLASSIC_BACKGROUND.roomWalls(ctx, room, L);
    void room;
  },
  window(ctx, win, L) {
    // A gap between the buildings: their corners either side, the alley's gate below.
    const seg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
    const d = seg?.depth ?? 56;
    rect(ctx, win.x, win.y, 4, win.h, C.brickLo);
    rect(ctx, win.x + 3, win.y, 1, win.h, OUTLINE);
    rect(ctx, win.x + win.w - 3, win.y, 3, win.h, C.brickLo);
    rect(ctx, win.x + win.w - 3, win.y, 1, win.h, OUTLINE);
    rect(ctx, win.x, win.y, win.w, 3, "#3a3a44");
    rect(ctx, win.x + win.w / 2 - 1, win.y + 3, 3, 3, OUTLINE);
    rect(ctx, win.x + win.w / 2, win.y + 4, 1, 1, C.warm);
    const gy = win.y + win.h - 2;
    rect(ctx, win.x + 4, gy, win.w - 7, d - gy, "#8f8a82");
    rect(ctx, win.x + 4, gy, win.w - 7, 1, OUTLINE);
    for (let x = win.x + 5; x < win.x + win.w - 4; x += 3) rect(ctx, x, gy + 1, 1, d - gy - 2, "#3a3a44");
    rect(ctx, win.x + 4, gy + 2, win.w - 7, 1, "#3a3a44");
  },
  door(ctx, door) {
    // The building's front door: glass in a dark frame under a little canopy, and the "+" sign.
    const g = new Grid(door.w + 8, door.h + 6);
    g.rect(0, 4, door.w + 8, door.h + 2, "#5a4a44");
    g.rect(4, 6, door.w, door.h, "#2f3a46");
    g.rect(5, 8, door.w - 2, door.h - 4, C.glassLo);
    g.rect(6, 9, 4, door.h - 8, "#cde8f5");
    g.rect(4 + door.w / 2, 6, 1, door.h, "#2f3a46");
    g.rect(door.w / 2 + 1, 22, 2, 4, "#d6a64a").rect(door.w / 2 + 6, 22, 2, 4, "#d6a64a");
    g.rect(0, 0, door.w + 8, 5, "#3e8ed0").rect(0, 0, door.w + 8, 1, "#7fb8e6");
    g.outline(OUTLINE);
    paint(ctx, g, door.x - 4, door.y - 6);
    const sg = new Grid(14, 9);
    sg.rect(1, 1, 12, 7, "#2f6b4a");
    sg.rect(6, 2, 2, 5, "#bff5cf").rect(4, 4, 6, 1, "#bff5cf");
    sg.outline(OUTLINE);
    paint(ctx, sg, door.x + door.w / 2 - 7, Math.max(1, door.y - 16));
  },
};
