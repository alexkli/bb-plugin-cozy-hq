// Mountain Cabin: the backdrop, baked once per floor plan. Honey pine floors,
// a whitewashed timber-frame wall on a granite plinth with big windows to the
// peaks, the fieldstone chimney with the firebox and the TV, slate in the
// mudroom, clay tiles in the kitchen, woven wool rugs; outside the log wall
// the weathered deck, the rail and the snow of the piste.
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room, WallSegment } from "../../layout.ts";
import { Grid, OUTLINE, rect, shade } from "../../themekit.ts";
import { C, h2, knitBand, stones } from "./kit.ts";
import { planOf, type CabinPlan } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

function paint(ctx: Ctx, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

// ------------------------------------------------------------------ floors

/** Wide honey pine boards running across, staggered joints and the odd knot. */
function pineFloor(ctx: Ctx, r: Rect, tone: "honey" | "old" = "honey"): void {
  const [a, b, joint, knot] = tone === "honey" ? ["#d0a46a", "#c99c61", "#ab7d45", "#b28652"] : ["#a87a4c", "#9f7246", "#7d5532", "#87603a"];
  for (let y = r.y - (r.y % 7); y < r.y + r.h; y += 7) {
    const row = Math.floor(y / 7);
    const y0 = Math.max(y, r.y);
    const y1 = Math.min(y + 7, r.y + r.h);
    if (y1 <= y0) continue;
    rect(ctx, r.x, y0, r.w, y1 - y0, row % 2 ? a : b);
    if (y + 6 >= r.y && y + 6 < r.y + r.h) rect(ctx, r.x, y + 6, r.w, 1, joint);
    if (y + 1 >= r.y && y + 1 < r.y + r.h) rect(ctx, r.x, y + 1, r.w, 1, shade(row % 2 ? a : b, 0.06));
    const off = (row * 41) % 64;
    for (let x = r.x - off; x < r.x + r.w; x += 64) {
      if (x >= r.x) rect(ctx, x, y0, 1, y1 - y0 - (y + 6 < y1 ? 1 : 0), joint);
      const kx = x + 18 + ((row * 13) % 30);
      if (h2(row, x) < 0.35 && kx > r.x && kx + 3 < r.x + r.w && y + 3 >= r.y && y + 4 < r.y + r.h) {
        rect(ctx, kx, y + 3, 3, 1, knot);
        rect(ctx, kx + 1, y + 2, 1, 1, knot);
      }
    }
  }
}

/** Irregular grey-blue slate flags (the mudroom: wet boots welcome). */
function slateFloor(ctx: Ctx, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#4a5059");
  for (let y = r.y, row = 0; y < r.y + r.h; y += 11, row++) {
    let x = r.x - Math.floor(h2(row, 5) * 10);
    let i = 0;
    while (x < r.x + r.w) {
      const w = 12 + Math.floor(h2(row * 7 + i, 3) * 12);
      const x0 = Math.max(r.x, x + 1);
      const x1 = Math.min(r.x + r.w, x + w);
      const y1 = Math.min(r.y + r.h, y + 10);
      if (x1 > x0 && y1 > y + 1) {
        const k = h2(row * 13 + i, 9);
        const base = k < 0.3 ? C.slate : k < 0.65 ? "#636b78" : "#56606c";
        rect(ctx, x0, y + 1, x1 - x0, y1 - y - 1, base);
        rect(ctx, x0, y + 1, x1 - x0, 1, k < 0.5 ? C.slateHi : "#6e7785");
        if (k > 0.75 && x1 - x0 > 8) rect(ctx, x0 + 3, y + 5, 4, 1, C.slateLo);
      }
      x += w;
      i++;
    }
  }
}

/** Big handmade clay tiles, warm and a bit uneven. */
function clayTiles(ctx: Ctx, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#a8613c");
  for (let y = r.y, j = 0; y < r.y + r.h; y += 10, j++) {
    for (let x = r.x, i = 0; x < r.x + r.w; x += 10, i++) {
      const k = h2(i + 3, j + 11);
      const c = k < 0.3 ? "#c97a4f" : k < 0.7 ? "#c2734a" : "#b96c44";
      const w = Math.min(9, r.x + r.w - x);
      const h = Math.min(9, r.y + r.h - y);
      if (w <= 0 || h <= 0) continue;
      rect(ctx, x, y, w, h, c);
      rect(ctx, x, y, w, 1, shade(c, 0.12));
      if (k > 0.85 && w > 5 && h > 5) rect(ctx, x + 3, y + 4, 2, 1, "#a05a36");
    }
  }
}

/** A woven wool rug: a knit border band, then a sparse motif ("diamonds", "bands" across, or a "medallion"). */
function woolRug(ctx: Ctx, r: Rect, base: string, edge: string, motif: string, accent: string, kind: "diamonds" | "bands" | "medallion" | "plain" = "diamonds"): void {
  const g = new Grid(r.w, r.h);
  g.rect(0, 0, r.w, r.h, edge);
  g.rect(2, 2, r.w - 4, r.h - 4, base);
  if (r.h > 16 && r.w > 16) {
    knitBand(g, 3, 3, r.w - 6, base, accent);
    knitBand(g, 3, r.h - 6, r.w - 6, base, accent);
  }
  const diamond = (x: number, y: number, c: string, dot: string) => {
    g.set(x + 2, y, c).rect(x + 1, y + 1, 3, 1, c).rect(x, y + 2, 5, 1, c).rect(x + 1, y + 3, 3, 1, c).set(x + 2, y + 4, c);
    g.set(x + 2, y + 2, dot);
  };
  if (kind === "diamonds") {
    for (let y = 10; y + 5 <= r.h - 9; y += 14) for (let x = 8 + ((y / 14) % 2 ? 9 : 0); x + 5 <= r.w - 7; x += 18) diamond(x, y, motif, accent);
  } else if (kind === "bands") {
    for (let y = 10; y + 3 <= r.h - 9; y += 16) {
      g.rect(3, y, r.w - 6, 3, motif);
      for (let x = 4; x < r.w - 4; x += 6) g.set(x, y + 1, accent);
    }
  } else {
    const cx = Math.floor(r.w / 2) - 2;
    const cy = Math.floor(r.h / 2) - 2;
    diamond(cx, cy, motif, accent);
    for (const dx of [-14, 14]) if (cx + dx > 6 && cx + dx + 5 < r.w - 6) diamond(cx + dx, cy, accent, motif);
  }
  for (let y = 1; y < r.h - 1; y += 2) g.set(0, y, C.cream).set(r.w - 1, y, C.cream);
  paint(ctx, g, r.x, r.y);
}

/** An oval braided rag rug (rings of red, cream, navy, mustard). */
function braidedRug(ctx: Ctx, cx: number, cy: number, rw: number, rh: number): void {
  const g = new Grid(rw, rh);
  const rings = [C.redLo, C.cream, C.navy, C.red, C.creamLo, C.mustard, C.navyHi, C.cream, C.red];
  for (let i = 0; i < rings.length; i++) {
    const rx = rw / 2 - 1 - i * 3.2;
    const ry = rh / 2 - 1 - i * 2.2;
    if (rx < 3 || ry < 2) break;
    g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rx, ry, rings[i]!);
  }
  // Braid texture: little ticks around the rings.
  for (let y = 0; y < rh; y++) for (let x = (y % 2) * 2; x < rw; x += 4) if (g.get(x, y)) g.set(x, y, shade(g.get(x, y)!, -0.12));
  paint(ctx, g, cx - rw / 2, cy - rh / 2);
}

// ------------------------------------------------------------------ the deck and the snow

function deckBoards(ctx: Ctx, d: Rect, along: "x" | "y"): void {
  rect(ctx, d.x, d.y, d.w, d.h, "#7d7366");
  if (along === "x") {
    // Boards from the lodge wall out to the rail.
    for (let y = d.y, i = 0; y < d.y + d.h; y += 6, i++) {
      const h = Math.min(5, d.y + d.h - y);
      const c = i % 3 === 0 ? "#a39684" : i % 3 === 1 ? "#9a8d7b" : "#a89b89";
      rect(ctx, d.x, y, d.w, h, c);
      rect(ctx, d.x, y, d.w, 1, shade(c, 0.1));
      const j = d.x + 10 + ((i * 23) % Math.max(1, d.w - 20));
      rect(ctx, j, y, 1, h, "#7d7366");
      if (h2(i, 4) < 0.5) rect(ctx, d.x + ((i * 37) % Math.max(1, d.w - 6)) + 2, y + 2, 2, 1, "#8a7e6e");
    }
  } else {
    for (let x = d.x, i = 0; x < d.x + d.w; x += 6, i++) {
      const w = Math.min(5, d.x + d.w - x);
      const c = i % 3 === 0 ? "#a39684" : i % 3 === 1 ? "#9a8d7b" : "#a89b89";
      rect(ctx, x, d.y, w, d.h, c);
      rect(ctx, x, d.y, 1, d.h, shade(c, 0.1));
      const j = d.y + 8 + ((i * 29) % Math.max(1, d.h - 16));
      rect(ctx, x, j, w, 1, "#7d7366");
      if (h2(i, 9) < 0.5) rect(ctx, x + 2, d.y + ((i * 31) % Math.max(1, d.h - 6)) + 2, 1, 2, "#8a7e6e");
    }
  }
}

/** Snow with soft blue shadows and sparkles, over a rect. */
export function snowField(ctx: Ctx, r: Rect, seed = 1): void {
  rect(ctx, r.x, r.y, r.w, r.h, C.snow);
  for (let i = 0; i < (r.w * r.h) / 60; i++) {
    const x = r.x + Math.floor(h2(i, seed) * r.w);
    const y = r.y + Math.floor(h2(i + 999, seed + 1) * r.h);
    rect(ctx, x, y, 3 + (i % 3), 1, i % 4 ? C.snowShade : "#e6eef7");
  }
}

/** A small snow-laden fir (stunted, near the treeline). */
function fir(ctx: Ctx, x: number, base: number, h: number): void {
  const g = new Grid(h, h + 3);
  const cx = Math.floor(h / 2);
  for (let j = 0; j < h; j++) {
    const half = Math.max(1, Math.round((j / h) * (h / 2 - 1)) + (j % 3 === 2 ? 1 : 0));
    g.rect(cx - half, j, half * 2 + 1, 1, j % 3 === 0 ? "#2f5a48" : "#3c6b56");
    if (j % 3 === 0) g.rect(cx - half, j, Math.max(1, half), 1, C.snow);
  }
  g.rect(cx, h, 1, 3, C.beamLo);
  g.outline(OUTLINE);
  paint(ctx, g, x - cx - 1, base - h - 3);
}

function paintSlope(ctx: Ctx, s: Rect, along: "x" | "y"): void {
  snowField(ctx, s, 7);
  if (along === "y") {
    // Groomed corduroy down the piste, firs on the far side.
    for (let x = s.x + 4; x < s.x + s.w - 10; x += 3) for (let y = s.y; y < s.y + s.h; y += 2) if ((x + y) % 7 === 0) rect(ctx, x, y, 1, 1, "#e3ebf5");
    for (let y = s.y + 30; y < s.y + s.h - 6; y += 46 + Math.floor(h2(y, 3) * 30)) fir(ctx, s.x + s.w - 4, y, 9 + Math.floor(h2(y, 5) * 5));
    // Lift towers (the cables and chairs are live).
    const lx = s.x + Math.round(s.w * 0.42);
    for (let y = s.y + 50; y < s.y + s.h; y += 120) liftTower(ctx, lx, y);
  } else {
    for (let y = s.y + 3; y < s.y + s.h - 2; y += 3) for (let x = s.x; x < s.x + s.w; x += 2) if ((x + y) % 7 === 0) rect(ctx, x, y, 1, 1, "#e3ebf5");
    for (let x = s.x + 20; x < s.x + s.w; x += 70 + Math.floor(h2(x, 2) * 50)) fir(ctx, x, s.y + s.h, 8 + Math.floor(h2(x, 4) * 4));
  }
}

/** A chairlift tower: a grey steel pole with a crossbar (cables run through its ends). */
function liftTower(ctx: Ctx, x: number, base: number): void {
  const g = new Grid(13, 30);
  g.rect(5, 4, 3, 26, "#7d848e").vline(5, 4, 26, "#a3aab3");
  g.rect(0, 2, 13, 2, "#5b626c").rect(0, 2, 13, 1, "#8d949e");
  g.set(1, 4, "#2a2c31").set(11, 4, "#2a2c31");
  g.rect(3, 28, 7, 2, "#5b626c");
  g.outline(OUTLINE);
  paint(ctx, g, x - 7, base - 30);
}

/** The rail along the deck's edge: posts and a top rail, a cap of snow. */
function rail(ctx: Ctx, r: Rect, along: "x" | "y"): void {
  if (along === "y") {
    for (let y = r.y; y < r.y + r.h; y += 16) {
      rect(ctx, r.x, y, 3, 9, OUTLINE);
      rect(ctx, r.x + 1, y + 1, 1, 7, C.beamHi);
    }
    rect(ctx, r.x - 1, r.y, 5, r.h, OUTLINE);
    rect(ctx, r.x, r.y, 3, r.h, C.beam);
    rect(ctx, r.x, r.y, 1, r.h, C.beamHi);
    rect(ctx, r.x + 2, r.y, 1, r.h, C.snowShade);
  } else {
    rect(ctx, r.x, r.y - 1, r.w, 5, OUTLINE);
    rect(ctx, r.x, r.y, r.w, 3, C.beam);
    rect(ctx, r.x, r.y, r.w, 1, C.snow);
    for (let x = r.x + 4; x < r.x + r.w; x += 16) {
      rect(ctx, x, r.y + 3, 3, 6, OUTLINE);
      rect(ctx, x + 1, r.y + 3, 1, 5, C.beamHi);
    }
  }
}

/** Snow banked against a wall or the rail. */
function drift(ctx: Ctx, r: Rect, along: "x" | "y", seed: number): void {
  if (along === "y") {
    for (let y = r.y; y < r.y + r.h; y++) {
      const w = Math.max(1, Math.round(r.w * (0.55 + 0.45 * Math.sin(y * 0.09 + seed) * Math.sin(y * 0.031 + seed * 2))));
      rect(ctx, r.x + r.w - w, y, w, 1, C.snow);
      rect(ctx, r.x + r.w - w, y, 1, 1, C.snowShade);
    }
  } else {
    for (let x = r.x; x < r.x + r.w; x++) {
      const h = Math.max(1, Math.round(r.h * (0.55 + 0.45 * Math.sin(x * 0.08 + seed) * Math.sin(x * 0.027 + seed * 3))));
      rect(ctx, x, r.y + r.h - h, 1, h, C.snow);
      rect(ctx, x, r.y + r.h - h, 1, 1, "#ffffff");
      rect(ctx, x, r.y + r.h - 1, 1, 1, C.snowShade);
    }
  }
}

/** The log wall between the lodge and the deck, open where people pass. */
function deckWall(ctx: Ctx, p: CabinPlan): void {
  const w = p.deckWall;
  if (!w) return;
  const open = (v: number) => w.gaps.some(([a, z]) => v >= a && v < z);
  if (w.x0 === w.x1) {
    const x = w.x0;
    for (let y = w.y0; y < w.y1; y++) {
      if (open(y)) continue;
      rect(ctx, x - 1, y, 7, 1, OUTLINE);
      const log = ((y - w.y0) % 6) < 5;
      rect(ctx, x, y, 5, 1, log ? (((y - w.y0) % 6) < 2 ? C.beamHi : C.beam) : C.beamDk);
    }
    for (const [a, z] of w.gaps) {
      // Door frames and a snowy threshold.
      rect(ctx, x - 1, a - 2, 7, 2, OUTLINE);
      rect(ctx, x - 1, z, 7, 2, OUTLINE);
      rect(ctx, x, a - 1, 5, 1, C.pineLo);
      rect(ctx, x, z, 5, 1, C.pineLo);
      rect(ctx, x, a, 5, z - a, "#8c8174");
      rect(ctx, x + 3, a + 1, 2, z - a - 2, C.snowShade);
    }
  } else {
    const y = w.y0;
    for (let x = w.x0; x < w.x1; x++) {
      if (open(x)) continue;
      rect(ctx, x, y - 1, 1, 7, OUTLINE);
      rect(ctx, x, y, 1, 2, C.beamHi);
      rect(ctx, x, y + 2, 1, 3, C.beam);
    }
    for (let x = w.x0; x < w.x1; x += 9) if (!open(x)) rect(ctx, x, y + 1, 1, 3, C.beamDk);
    for (const [a, z] of w.gaps) {
      rect(ctx, a - 2, y - 2, 2, 9, OUTLINE);
      rect(ctx, z, y - 2, 2, 9, OUTLINE);
      rect(ctx, a, y, z - a, 5, "#8c8174");
    }
  }
}

// ------------------------------------------------------------------ the back wall

function timberSegment(ctx: Ctx, sg: WallSegment): void {
  const d = sg.depth;
  const w = sg.x1 - sg.x0;
  rect(ctx, sg.x0, 0, w, d, C.plaster);
  for (let i = 0; i < (w * d) / 70; i++) rect(ctx, sg.x0 + Math.floor(h2(i, sg.x0) * w), 4 + Math.floor(h2(i, 77) * (d - 20)), 2, 1, C.plasterLo);
  // The ceiling beam and the rail over the plinth.
  rect(ctx, sg.x0, 0, w, 3, C.beamDk);
  rect(ctx, sg.x0, 3, w, 1, C.beam);
  rect(ctx, sg.x0, d - 17, w, 3, C.beam);
  rect(ctx, sg.x0, d - 17, w, 1, C.beamHi);
  // The granite plinth.
  const g = new Grid(w, 12);
  stones(g, 0, 0, w, 12, sg.x0 + 3, 6);
  paint(ctx, g, sg.x0, d - 14);
  rect(ctx, sg.x0, d - 2, w, 2, C.stoneDk);
  ctx.fillStyle = "rgba(50,30,20,0.22)";
  ctx.fillRect(sg.x0, d, w, 3);
}

function chimneySegment(ctx: Ctx, sg: WallSegment, p: CabinPlan, L: Layout): void {
  const d = sg.depth;
  const w = sg.x1 - sg.x0;
  const g = new Grid(w, d);
  stones(g, 0, 0, w, d, 11, 7);
  // The chimney stands out from the wall: shaded flanks where it passes the wall line.
  const wallD = Math.min(...L.segments.filter((s) => s !== sg).map((s) => s.depth), d);
  for (let y = 0; y < d; y++) {
    g.set(0, y, OUTLINE).set(w - 1, y, OUTLINE);
    g.set(1, y, y >= wallD - 2 ? C.stoneDk : C.stoneHi).set(w - 2, y, C.stoneDk);
  }
  g.rect(0, 0, w, 2, C.beamDk);
  const f = p.fire;
  const bx = f.box.x - sg.x0;
  const by = f.box.y;
  // The firebox: firebrick inside, sooty and arched, an iron grate.
  g.rect(bx - 2, by - 2, f.box.w + 4, f.box.h + 2, C.stoneDk);
  g.rrect(bx, by, f.box.w, f.box.h, "#3a1e18", 3);
  for (let y = by + 3; y < by + f.box.h - 4; y += 3) for (let x = bx + 2 + (((y - by) / 3) % 2 ? 2 : 0); x < bx + f.box.w - 3; x += 5) g.rect(x, y, 4, 2, "#5a2a1e");
  g.rect(bx + 2, by, f.box.w - 4, 3, C.soot);
  g.rect(bx + 1, by + 1, f.box.w - 2, 1, "#120c0c");
  g.rect(bx + 3, by + f.box.h - 4, f.box.w - 6, 1, C.iron);
  for (let x = bx + 4; x < bx + f.box.w - 4; x += 3) g.rect(x, by + f.box.h - 6, 1, 3, C.ironHi);
  g.rect(bx, by + f.box.h - 2, f.box.w, 2, "#2a1a16");
  // The mantel: a thick larch beam on stone corbels.
  const m = f.mantel;
  const mx = m.x - sg.x0;
  g.rect(mx, m.y, m.w, m.h, C.beam).rect(mx, m.y, m.w, 1, C.beamHi).rect(mx, m.y + m.h - 1, m.w, 1, C.beamDk);
  g.rect(mx + 2, m.y + m.h, 4, 3, C.stoneLo).rect(mx + m.w - 6, m.y + m.h, 4, 3, C.stoneLo);
  for (let x = mx; x < mx + m.w; x++) g.set(x, m.y - 1, OUTLINE);
  // On the mantel: two candles, a copper jug, a little carved ibex.
  g.rect(mx + 4, m.y - 4, 2, 3, C.cream).set(mx + 4, m.y - 5, C.fire2);
  g.rect(mx + 8, m.y - 3, 2, 2, C.cream).set(mx + 8, m.y - 4, C.fire2);
  g.rect(mx + m.w - 12, m.y - 4, 4, 3, C.copper).set(mx + m.w - 12, m.y - 4, C.copperHi).set(mx + m.w - 8, m.y - 3, C.copperLo);
  g.rect(mx + m.w - 6, m.y - 2, 3, 1, C.pineDk).set(mx + m.w - 6, m.y - 1, C.pineDk).set(mx + m.w - 4, m.y - 1, C.pineDk).set(mx + m.w - 3, m.y - 3, C.pineDk).set(mx + m.w - 3, m.y - 4, C.pineDeep);
  paint(ctx, g, sg.x0, 0);
  ctx.fillStyle = "rgba(40,24,20,0.25)";
  ctx.fillRect(sg.x0, d, w, 3);
}

/** Coats, a scarf and a bobble hat on the peg rail over the mudroom benches. */
function coatPegs(ctx: Ctx, p: CabinPlan, L: Layout): void {
  const m = p.mudroom;
  const seg = L.segments.find((s) => m.x >= s.x0 && m.x < s.x1);
  if (!seg || m.y > seg.depth + 6) return;
  const d = seg.depth;
  const x0 = m.x + 6;
  const x1 = Math.min(m.x + m.w - 46, L.wall.legendNote.x - 6);
  if (x1 - x0 < 30) return;
  const y = d - 19;
  rect(ctx, x0, y, x1 - x0, 2, C.beamLo);
  rect(ctx, x0, y, x1 - x0, 1, C.beamHi);
  const coats = [C.red, C.navy, C.mustard, C.moss, C.redLo, C.navyHi];
  for (let x = x0 + 4, i = 0; x + 8 < x1; x += 13, i++) {
    rect(ctx, x + 3, y - 1, 2, 2, C.ironLo);
    const g = new Grid(9, 14);
    const kind = i % 4;
    if (kind === 3) {
      // A scarf and a bobble hat.
      g.rect(3, 0, 3, 11, C.cream).rect(3, 3, 3, 1, C.red).rect(3, 7, 3, 1, C.red);
      g.rect(1, 9, 3, 4, C.cream).set(1, 12, C.red);
    } else {
      const c = coats[(i * 5) % coats.length]!;
      g.rect(2, 0, 5, 2, c).rect(1, 2, 7, 10, c).rect(1, 2, 1, 10, shade(c, 0.15));
      g.vline(4, 3, 9, shade(c, -0.25));
      g.rect(0, 4, 1, 7, shade(c, -0.15)).rect(8, 4, 1, 7, shade(c, -0.15));
      if (i % 2) g.rect(1, 7, 7, 1, C.snow);
    }
    g.outline(OUTLINE);
    paint(ctx, g, x, y);
  }
}

/** Old skis, snowshoes, an ice axe and a coiled rope on the walls where there's room. */
function wallGear(ctx: Ctx, L: Layout, p: CabinPlan): void {
  const busy: [number, number][] = [
    ...L.wall.windows.map((w) => [w.x - 5, w.x + w.w + 5] as [number, number]),
    [L.wall.pinboard.x - 4, L.wall.pinboard.x + L.wall.pinboard.w + 4],
    [L.wall.calendar.x - 4, L.wall.calendar.x + 26],
    [L.wall.legendNote.x - 4, L.wall.door.x + L.wall.door.w + 6],
    [L.wall.clock.x - 13, L.wall.clock.x + 13],
  ];
  const kinds = ["skis", "axe", "shoes", "rope"];
  let k = 0;
  for (const [i, sg] of L.segments.entries()) {
    if (p.segKinds[i] !== "timber") continue;
    for (let x = sg.x0 + 6; x + 14 <= sg.x1 - 4; x++) {
      if (busy.some(([a, z]) => x < z && x + 14 > a)) continue;
      const d = sg.depth;
      const kind = kinds[k++ % kinds.length]!;
      const g = new Grid(14, d - 22);
      const h = d - 22;
      if (kind === "skis") {
        g.rect(3, 4, 2, h - 6, "#9a5a32").rect(8, 4, 2, h - 6, "#9a5a32").set(3, 3, "#9a5a32").set(4, 2, "#9a5a32").set(8, 3, "#9a5a32").set(9, 2, "#9a5a32");
        g.rect(2, Math.floor(h / 2), 9, 2, C.iron);
        g.vline(4, 6, h - 10, "#c07a48").vline(9, 6, h - 10, "#c07a48");
      } else if (kind === "axe") {
        g.rect(6, 4, 2, h - 8, C.pine).vline(6, 4, h - 8, C.pineHi);
        g.rect(2, 3, 10, 2, C.ironHi).set(1, 4, C.ironHi).set(12, 4, C.iron);
        g.rect(5, h - 5, 4, 2, C.ironHi);
        g.ellipse(7, Math.floor(h * 0.6), 4, 4, C.mustard);
        g.ellipse(7, Math.floor(h * 0.6), 2, 2, null as unknown as string);
      } else if (kind === "shoes") {
        g.ellipse(4, Math.floor(h / 2), 3, Math.floor(h / 2) - 4, C.beam);
        g.ellipse(4, Math.floor(h / 2), 2, Math.floor(h / 2) - 5, "#d9c9a6");
        g.ellipse(10, Math.floor(h / 2) + 2, 3, Math.floor(h / 2) - 4, C.beam);
        g.ellipse(10, Math.floor(h / 2) + 2, 2, Math.floor(h / 2) - 5, "#d9c9a6");
        for (let y = 6; y < h - 4; y += 3) g.set(4, y, C.beamLo).set(10, y + 1, C.beamLo);
      } else {
        g.rect(6, 2, 2, 4, C.ironLo);
        g.ellipse(7, 12, 5, 6, C.red);
        g.ellipse(7, 12, 3, 4, null as unknown as string);
        g.ellipse(7, 13, 5, 5, C.redHi);
        g.ellipse(7, 13, 3, 3, null as unknown as string);
      }
      g.outline(OUTLINE);
      paint(ctx, g, x, 6);
      busy.push([x - 4, x + 18]);
      x += 18;
    }
  }
}

// ------------------------------------------------------------------ rooms

function roomFloor(ctx: Ctx, room: Room, L: Layout): void {
  const r = room.rect;
  switch (room.kind) {
    case "waiting": {
      slateFloor(ctx, r);
      // A long boot tray along the front of the benches.
      break;
    }
    case "kitchen":
      clayTiles(ctx, { x: r.x - 2, y: r.y - 8, w: r.w + 4, h: r.h + 8 });
      break;
    case "meeting":
      woolRug(ctx, { x: r.x + 8, y: r.y + 46, w: r.w - 16, h: Math.max(20, r.h - 56) }, C.navy, C.navyLo, C.cream, C.red, "medallion");
      break;
    case "boss": {
      pineFloor(ctx, r, "old");
      const rw = Math.min(r.w - 36, 100);
      const rh = Math.min(r.h - 50, 56);
      if (rw > 30 && rh > 20) woolRug(ctx, { x: r.x + Math.round((r.w - rw) / 2) - 8, y: r.y + 24, w: rw, h: rh }, C.red, C.redLo, C.cream, C.navy, "diamonds");
      break;
    }
    case "lounge": {
      const c = L.couch;
      braidedRug(ctx, c.x + c.w / 2, c.y - 6, Math.min(r.w - 12, 150), 58);
      break;
    }
    case "games":
      woolRug(ctx, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, "#5f6b5a", "#46503f", C.feltHi, C.cream, "plain");
      break;
    case "library": {
      // The reading loft: a raised platform of dark boards with a rail and a ladder.
      pineFloor(ctx, { x: r.x, y: r.y - 6, w: r.w, h: r.h + 6 }, "old");
      woolRug(ctx, { x: r.x + 10, y: r.y + 30, w: r.w - 20, h: Math.max(16, r.h - 46) }, C.mustard, C.mustardLo, C.redLo, C.cream, "medallion");
      rect(ctx, r.x, r.y + r.h - 2, r.w, 6, C.beamDk);
      rect(ctx, r.x, r.y + r.h - 2, r.w, 1, C.beamHi);
      break;
    }
    case "server": {
      // The cold room: pale frosted tiles.
      for (let y = r.y; y < r.y + r.h; y += 6) for (let x = r.x; x < r.x + r.w; x += 6) rect(ctx, x, y, Math.min(6, r.x + r.w - x), Math.min(6, r.y + r.h - y), ((x - r.x) / 6 + (y - r.y) / 6) % 2 ? "#c9dbe6" : "#d8e7f0");
      for (let i = 0; i < r.w / 3; i++) rect(ctx, r.x + Math.floor(h2(i, 5) * r.w), r.y + Math.floor(h2(i, 6) * r.h), 1, 1, "#ffffff");
      rect(ctx, r.x, r.y + r.h - 2, r.w, 2, C.iceDk);
      break;
    }
    case "pod":
      break;
    default:
      break;
  }
}

function roomShell(ctx: Ctx, room: Room, L: Layout): void {
  const r = room.rect;
  if (!room.walls) return;
  const wood = room.walls === "wood";
  const cold = room.kind === "server";
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 3;
  const top = r.y - (atWall ? 2 : 8);
  for (const x of [r.x - 3, r.x + r.w - 1]) {
    rect(ctx, x, top, 4, r.y + r.h - top, OUTLINE);
    rect(ctx, x + 1, top, 2, r.y + r.h - top, wood ? C.pineLo : cold ? "#a9c4d6" : C.beam);
    rect(ctx, x + 1, top, 1, r.y + r.h - top, wood ? C.pineHi : cold ? "#e6f3fa" : C.beamHi);
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? (room.doorX ?? -1) : -1;
    for (let x = r.x - 3; x < r.x + r.w + 3; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      rect(ctx, x, r.y - 9, 1, 1, OUTLINE);
      if (wood) {
        rect(ctx, x, r.y - 8, 1, 7, (x - r.x) % 5 === 0 ? C.pineDk : (x - r.x) % 5 === 1 ? C.pineHi : C.pine);
        rect(ctx, x, r.y - 8, 1, 1, C.pineHi);
      } else {
        rect(ctx, x, r.y - 8, 1, 2, cold ? "#a9c4d6" : C.beam);
        rect(ctx, x, r.y - 6, 1, 4, cold ? "#e3f1f8" : "#d6e8f1");
        if ((x - r.x) % 24 === 0) rect(ctx, x, r.y - 6, 1, 4, cold ? "#a9c4d6" : C.beam);
      }
      rect(ctx, x, r.y - 2, 1, 1, wood ? C.pineDk : cold ? "#86a4b8" : C.beamDk);
      rect(ctx, x, r.y - 1, 1, 1, OUTLINE);
    }
    if (gap >= 0) {
      for (const x of [gap - 10, gap + 9]) {
        rect(ctx, x, r.y - 10, 2, 10, OUTLINE);
        rect(ctx, x, r.y - 9, 1, 8, wood ? C.pineDk : C.beamDk);
      }
    }
  }
  // The window in your study's side wall, by the telescope.
  const sw = room.kind === "boss" ? planOf(L)?.studyWindow : null;
  if (sw) {
    rect(ctx, sw.x - 1, sw.y - 1, 5, sw.h + 2, OUTLINE);
    rect(ctx, sw.x, sw.y, 3, sw.h, "#cfe6f5");
    rect(ctx, sw.x, sw.y, 1, sw.h, "#ffffff");
    rect(ctx, sw.x, sw.y + Math.floor(sw.h / 2), 3, 1, C.pineDk);
    rect(ctx, sw.x - 2, sw.y + sw.h, 6, 2, C.pine);
  }
}

// ------------------------------------------------------------------ the steps

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    const p = planOf(L);
    const inside = p?.inside ?? { x: 0, y: 0, w: L.W, h: L.H };
    pineFloor(ctx, { x: 0, y: 0, w: inside.w, h: inside.h });
    // A long woven runner down the hallway (inside the lodge).
    for (const hy of L.net.halls) {
      if (hy > inside.h) continue;
      const g = new Grid(inside.w, 12);
      g.rect(0, 0, inside.w, 12, C.redLo);
      g.rect(0, 1, inside.w, 10, C.red);
      knitBand(g, 0, 2, inside.w, C.red, C.cream);
      knitBand(g, 0, 7, inside.w, C.red, C.cream);
      g.rect(0, 5, inside.w, 2, C.navy);
      paint(ctx, g, 0, hy - 6);
    }
    if (!p) return;
    // The hearth slab in front of the fire.
    const h = p.fire.hearth;
    const g = new Grid(h.w, h.h);
    g.rect(0, 0, h.w, h.h, C.stoneLo);
    stones(g, 1, 0, h.w - 2, h.h - 1, 21, 8);
    g.rect(0, h.h - 1, h.w, 1, C.stoneDk);
    paint(ctx, g, h.x, h.y);
    // The snowy doormat inside the door.
    const m = p.mat;
    rect(ctx, m.x, m.y, m.w, m.h, OUTLINE);
    rect(ctx, m.x + 1, m.y + 1, m.w - 2, m.h - 2, "#6b5a46");
    for (let x = m.x + 2; x < m.x + m.w - 2; x += 2) rect(ctx, x, m.y + 2, 1, m.h - 4, "#7d6a52");
    rect(ctx, m.x + 3, m.y + 3, 3, 2, C.snow);
    rect(ctx, m.x + m.w - 7, m.y + 5, 2, 1, C.snowShade);
    // Outside: the deck, its rail, the drifts and the piste beyond.
    if (p.deck && p.slope) {
      const east = p.deckSide === "east";
      const d = p.deck;
      const s = p.slope;
      if (east) {
        deckBoards(ctx, { x: inside.w, y: d.y, w: s.x - inside.w, h: L.H - d.y }, "x");
        snowField(ctx, { x: inside.w, y: d.y - 4, w: L.W - inside.w, h: 4 }, 3);
        paintSlope(ctx, s, "y");
        drift(ctx, { x: s.x - 10, y: d.y, w: 8, h: d.h }, "y", 2);
        rail(ctx, { x: s.x - 3, y: d.y, w: 3, h: d.h }, "y");
      } else {
        deckBoards(ctx, { x: 0, y: d.y, w: L.W, h: s.y - d.y }, "y");
        paintSlope(ctx, s, "x");
        drift(ctx, { x: 0, y: s.y - 7, w: L.W, h: 6 }, "x", 4);
        rail(ctx, { x: 0, y: s.y - 2, w: L.W, h: 3 }, "x");
      }
      deckWall(ctx, p);
    }
  },
  wall(ctx, L) {
    const p = planOf(L);
    L.segments.forEach((sg, i) => {
      const kind = p?.segKinds[i] ?? "timber";
      if (kind === "open") return;
      if (kind === "chimney" && p) chimneySegment(ctx, sg, p, L);
      else timberSegment(ctx, sg);
    });
    // Posts where the wall steps (next to the chimney the stone is its own edge).
    for (const px of L.wall.pillars) {
      const right = L.segments.find((s) => s.x0 === px);
      const i = right ? L.segments.indexOf(right) : -1;
      if (p && (p.segKinds[i] === "chimney" || p.segKinds[i - 1] === "chimney")) continue;
      const d = Math.max(right?.depth ?? 64, L.segments[i - 1]?.depth ?? 64);
      rect(ctx, px - 3, 0, 6, d, OUTLINE);
      rect(ctx, px - 2, 0, 4, d, C.beam);
      rect(ctx, px - 2, 0, 1, d, C.beamHi);
    }
    if (p) {
      coatPegs(ctx, p, L);
      wallGear(ctx, L, p);
    }
  },
  pods(ctx, L) {
    const pal: [string, string, string, string][] = [
      [C.navy, C.navyLo, C.navyHi, C.cream],
      [C.redLo, "#6e2420", C.red, C.cream],
      [C.mossLo, "#33452c", C.moss, C.creamHi],
    ];
    L.pods.forEach((pod, i) => {
      const [base, edge, motif, accent] = pal[i % pal.length]!;
      woolRug(ctx, { x: pod.x - 4, y: pod.y + 4, w: pod.w + 8, h: pod.h - 4 }, base, edge, motif, accent, "bands");
    });
  },
  room: roomFloor,
  roomWalls: roomShell,
  window(ctx, win, L) {
    const p = planOf(L);
    if (p?.open && win.x === p.open.x && win.y === p.open.y && win.w === p.open.w) {
      // The sky over the deck: no frame, just the eave of the lodge roof along the top.
      ctx.clearRect(win.x, win.y, win.w, win.h);
      return;
    }
    const { x, y, w, h } = win;
    const g = new Grid(w + 6, h + 8);
    const F = C.beam;
    // A chunky larch frame, a transom near the top, one slim mullion.
    g.rect(0, 0, w + 6, 3, F).rect(0, 0, w + 6, 1, C.beamHi);
    g.rect(0, 0, 3, h + 4, F).rect(w + 3, 0, 3, h + 4, F);
    g.vline(1, 1, h + 3, C.beamHi);
    g.rect(0, h + 3, w + 6, 3, C.pine).rect(0, h + 3, w + 6, 1, C.pineHi).rect(0, h + 5, w + 6, 1, C.pineDk);
    const ty = Math.round(h * 0.28) + 2;
    g.rect(3, ty, w, 1, F);
    g.rect(3 + Math.floor(w / 2), ty, 1, h + 3 - ty, F);
    g.outline(OUTLINE);
    for (let j = 3; j < h + 3; j++) for (let i = 3; i < w + 3; i++) if (j !== ty && i !== 3 + Math.floor(w / 2)) g.set(i, j, null);
    // Little wool curtains tied back at the sides.
    for (const [cx, dir] of [[3, 1], [w + 2, -1]] as const) {
      for (let j = 3; j < h + 1; j++) {
        const k = j < ty + 4 ? 2 : j < h - 6 ? 1 : 2;
        for (let i = 0; i < k; i++) g.set(cx + i * dir, j, j % 4 === 0 ? C.redLo : C.red);
      }
      g.set(cx + dir, ty + 6, C.cream).set(cx + dir, ty + 7, C.cream);
    }
    paint(ctx, g, x - 3, y - 3);
  },
  pinboard(ctx, r) {
    const { x, y, w, h } = r;
    const g = new Grid(w + 6, h + 6);
    g.rect(0, 0, w + 6, h + 6, C.beam);
    g.rect(0, 0, w + 6, 1, C.beamHi).rect(0, 0, 1, h + 6, C.beamHi);
    g.rect(0, h + 5, w + 6, 1, C.beamDk);
    g.rect(3, 3, w, h, "#c69863");
    for (let i = 0; i < 300; i++) g.set(3 + ((i * 37) % w), 3 + ((i * 53 + (i >> 3)) % h), i % 3 ? "#b6895a" : "#d6a874");
    // Pegs in the corners.
    for (const [px, py] of [[1, 1], [w + 3, 1], [1, h + 3], [w + 3, h + 3]] as const) g.rect(px, py, 2, 2, C.pineHi);
    g.outline(OUTLINE);
    paint(ctx, g, x - 3, y - 3);
  },
  calendar(ctx, c) {
    const g = new Grid(c.w + 2, c.h + 2);
    g.rect(1, 1, c.w, c.h, C.creamHi);
    g.rect(1, 1, c.w, 7, C.navy);
    // A little peak on the top band.
    g.set(c.w - 3, 2, C.snow).rect(c.w - 4, 3, 3, 1, C.snow);
    g.rect(1, c.h - 1, c.w, 2, C.creamLo);
    g.outline(OUTLINE);
    paint(ctx, g, c.x - 1, c.y - 1);
  },
  status(ctx, s) {
    const b = new Grid(s.w + 4, s.h + 4);
    b.rect(0, 0, s.w + 4, s.h + 4, C.beam).rect(0, 0, s.w + 4, 1, C.beamHi);
    b.rect(2, 2, s.w, s.h, "#232a26");
    b.outline(OUTLINE);
    paint(ctx, b, s.x - 2, s.y - 2);
  },
  door(ctx, d) {
    // A heavy plank door with iron straps and a little window; a carved sign with the "+".
    const g = new Grid(d.w + 8, d.h + 4);
    g.rect(0, 1, d.w + 8, d.h + 3, C.beamDk);
    g.rect(1, 1, d.w + 6, 2, C.beam);
    for (let x = 4; x < d.w + 4; x++) {
      const c = (x - 4) % 5 === 0 ? C.pineDk : (x - 4) % 5 === 1 ? C.pineHi : C.pine;
      g.rect(x, 4, 1, d.h, c);
    }
    for (const y of [9, d.h - 6]) {
      g.rect(4, y, d.w - 2, 2, C.iron).rect(4, y, d.w - 2, 1, C.ironHi);
      g.set(d.w + 2, y, C.iron);
    }
    // The window with a heart cut in the shutter beside it.
    g.rect(7, 13, d.w - 6, 7, C.beamDk).rect(8, 14, d.w - 8, 5, "#cfe6f5");
    g.set(10, 15, "#ffffff");
    const hx = Math.floor(d.w / 2) + 3;
    g.set(hx - 1, 25, C.beamDk).set(hx + 1, 25, C.beamDk).rect(hx - 1, 26, 3, 1, C.beamDk).set(hx, 27, C.beamDk);
    g.rect(d.w, 29, 2, 3, C.brass);
    g.outline(OUTLINE);
    paint(ctx, g, d.x - 4, d.y - 3);
    const sg = new Grid(16, 10);
    sg.rect(1, 1, 14, 8, C.pine).rect(1, 1, 14, 1, C.pineHi).rect(1, 8, 14, 1, C.pineDk);
    sg.rect(7, 2, 2, 6, "#3f8a4a").rect(5, 4, 6, 2, "#3f8a4a");
    sg.outline(OUTLINE);
    paint(ctx, sg, d.x + d.w / 2 - 8, Math.max(1, d.y - 13));
  },
  legend(ctx, n) {
    const g = new Grid(n.w + 2, n.h + 2);
    g.rect(1, 1, n.w, n.h, "#f6e8b8");
    g.rect(1, 1, n.w, 2, "#e8d08a");
    const qx = Math.floor(n.w / 2) - 1;
    g.rect(qx, 4, 3, 1, C.beamDk).set(qx + 2, 5, C.beamDk).set(qx + 1, 6, C.beamDk).set(qx + 1, 8, C.beamDk);
    g.outline(OUTLINE);
    paint(ctx, g, n.x - 1, n.y - 1);
    rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, C.red);
  },
  painting() {
    // No paintings: the lodge's walls are windows.
  },
  clock(ctx, k) {
    // A round clock in a carved pine sun.
    const { x, y, r } = k;
    const S = r * 2 + 9;
    const c = Math.floor(S / 2);
    const g = new Grid(S, S);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.set(c + Math.round(Math.sin(a) * (r + 2)), c - Math.round(Math.cos(a) * (r + 2)), C.pineDk);
      g.set(c + Math.round(Math.sin(a) * (r + 3)), c - Math.round(Math.cos(a) * (r + 3)), C.pine);
    }
    g.ellipse(c, c, r + 0.5, r + 0.5, C.pineDk);
    g.ellipse(c, c, r - 1, r - 1, C.creamHi);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.set(c + Math.round(Math.sin(a) * (r - 2.4)), c - Math.round(Math.cos(a) * (r - 2.4)), i % 3 === 0 ? C.beamDk : C.creamLo);
    }
    g.outline(OUTLINE);
    paint(ctx, g, x - c, y - c);
  },
};
