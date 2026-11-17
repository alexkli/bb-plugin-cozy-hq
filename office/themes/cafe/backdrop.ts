// Coffee Shop: the baked backdrop. The café is a small brick building on
// its lot: the pavement round it, a sliver of cobbled street at the bottom.
// Upstairs, wide pine boards and the back wall of brick (the chalkboard of
// the reserved table, the chimney breast with the fireplace, windows over
// the rooftops); the mezzanine's balustrade and the stairs down; downstairs
// an oak herringbone floor, cement tiles at the counter, the back counter
// under the mezzanine with the menus hanging over it, sockets over the
// wall counter; the back room's brick walls with a doorway; and out front
// the shop's face: the sign, the striped awning, big windows with flower
// boxes, the door with its bell, French doors onto the terrace.
import type { Layout, Rect, Room } from "../../layout.ts";
import type { BackgroundSteps } from "../../theme.ts";
import { drawPixelText, Grid, OUTLINE, pixelTextWidth } from "../../themekit.ts";
import { C, chalkLine, h2, rect } from "./kit.ts";
import { planOf, type CafePlan } from "./plan.ts";

function paint(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Fill a rect pixel by pixel from a color function (fast: one ImageData). */
function pixels(ctx: CanvasRenderingContext2D, r: Rect, color: (x: number, y: number) => string): void {
  const x0 = Math.max(0, Math.floor(r.x));
  const y0 = Math.max(0, Math.floor(r.y));
  const w = Math.min(ctx.canvas.width - x0, Math.max(1, Math.floor(r.w)));
  const h = Math.min(ctx.canvas.height - y0, Math.max(1, Math.floor(r.h)));
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const cache = new Map<string, [number, number, number]>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = color(x0 + x, y0 + y);
      let rgb = cache.get(c);
      if (!rgb) {
        rgb = hex(c);
        cache.set(c, rgb);
      }
      const i = (y * w + x) * 4;
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

// ------------------------------------------------------------------ floors

/** Oak herringbone: 4 px boards zigzagging in columns 12 wide, soft seams. */
function oak(x: number, y: number): string {
  const col = Math.floor(x / 12);
  const lx = x - col * 12;
  const yy = col % 2 ? y + lx : y - lx + 12;
  const row = Math.floor(yy / 8);
  const ly = ((yy % 8) + 8) % 8;
  const k = h2(col * 31 + row, 7);
  if (ly === 0) return "#9a683d";
  if (lx === 0 && (row + col) % 2 === 0) return "#a06e42";
  if (k < 0.25) return "#ab7546";
  if (k > 0.8) return "#bb8452";
  return C.oak;
}

/** Wide pine boards upstairs, running across. */
function pine(x: number, y: number): string {
  const row = Math.floor(y / 6);
  const ly = y % 6;
  const seam = (x + row * 53) % 71 === 0;
  if (ly === 5 || seam) return "#a87a4c";
  const k = h2(row, Math.floor((x + row * 53) / 71));
  if (ly === 0) return "#dcb07c";
  return k < 0.3 ? "#c6955f" : k > 0.8 ? "#d6a670" : "#cf9f68";
}

/** Cement tiles: cream with a small terracotta and green flower in each 8 px tile. */
function cement(x: number, y: number): string {
  const lx = x & 7;
  const ly = y & 7;
  if (lx === 0 || ly === 0) return "#d9cdb6";
  const dx = Math.abs(lx - 4);
  const dy = Math.abs(ly - 4);
  if (dx + dy === 0) return C.green;
  if (dx + dy === 1) return C.terra;
  return C.tile;
}

/** Big pale paving slabs out front. */
function pavement(x: number, y: number): string {
  const row = Math.floor(y / 10);
  const off = row % 2 ? 7 : 0;
  if (y % 10 === 0 || (x + off) % 14 === 0) return C.pavementLo;
  return h2(Math.floor((x + off) / 14), row) < 0.2 ? "#c1b9aa" : C.pavement;
}

/** Cobbles: little rounded stones. */
function cobbles(x: number, y: number): string {
  const row = Math.floor(y / 3);
  const off = row % 2 ? 2 : 0;
  if (y % 3 === 2 || (x + off) % 4 === 3) return "#4a4650";
  const k = h2(Math.floor((x + off) / 4), row);
  return k < 0.3 ? "#6e6a72" : k > 0.8 ? "#8c8890" : "#7a767e";
}

/** A woven rug: a striped border round a field of small diamonds, a fringe at the ends. */
function rug(ctx: CanvasRenderingContext2D, r: Rect, field: string, border: string, motif: string): void {
  if (r.w < 12 || r.h < 12) return;
  const g = new Grid(r.w, r.h);
  g.rect(0, 0, r.w, r.h, border);
  g.rect(2, 2, r.w - 4, r.h - 4, C.cream);
  g.rect(3, 3, r.w - 6, r.h - 6, border);
  g.rect(5, 5, r.w - 10, r.h - 10, field);
  for (let x = 4; x < r.w - 4; x += 3) g.set(x, 4, motif).set(x + 1, r.h - 5, motif);
  for (let y = 4; y < r.h - 4; y += 3) g.set(4, y, motif).set(r.w - 5, y + 1, motif);
  for (let y = 9; y < r.h - 8; y += 8) {
    for (let x = 10 + ((y / 8) % 2 ? 4 : 0); x < r.w - 9; x += 8) {
      g.set(x, y - 1, motif).set(x - 1, y, motif).set(x + 1, y, motif).set(x, y + 1, motif).set(x, y, C.cream);
    }
  }
  for (let y = 1; y < r.h - 1; y += 2) g.set(0, y, C.cream).set(r.w - 1, y, C.cream);
  paint(ctx, g, r.x, r.y);
}

/** Your round rug: rings of rust, mustard and cream round a green middle. */
function roundRug(ctx: CanvasRenderingContext2D, c: { x: number; y: number; rx: number; ry: number }): void {
  const w = c.rx * 2 + 2;
  const h = c.ry * 2 + 2;
  const g = new Grid(w, h);
  const cx = c.rx + 1;
  const cy = c.ry + 1;
  const rings = [C.rustLo, C.rust, C.cream, C.mustard, C.rust, C.velvet, C.velvetLo, C.velvet];
  rings.forEach((col, i) => {
    const k = 1 - i * 0.11;
    if (k > 0.1) g.ellipse(cx, cy, c.rx * k, c.ry * k, col);
  });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.set(Math.round(cx + Math.cos(a) * c.rx * 0.72), Math.round(cy + Math.sin(a) * c.ry * 0.72), C.cream);
  }
  g.outline(OUTLINE);
  paint(ctx, g, c.x - cx, c.y - cy);
}

/** The open-mic stage: a low platform of dark boards with a lit front edge. */
function stageBoards(ctx: CanvasRenderingContext2D, s: Rect): void {
  const g = new Grid(s.w, s.h + 4);
  g.rect(0, 0, s.w, s.h, C.walnut);
  for (let y = 0; y < s.h; y += 4) g.hline(0, y, s.w, C.walnutLo);
  for (let y = 0, i = 0; y < s.h; y += 4, i++) for (let x = (i * 17) % 23; x < s.w; x += 23) g.vline(x, y + 1, 3, C.walnutDk);
  g.hline(0, 0, s.w, C.walnutHi);
  g.rect(0, s.h, s.w, 4, C.walnutDk);
  for (let x = 3; x < s.w; x += 8) g.set(x, s.h + 1, C.brass);
  g.outline(OUTLINE);
  paint(ctx, g, s.x, s.y);
}

function floor(ctx: CanvasRenderingContext2D, L: Layout): void {
  const plan = planOf(L);
  if (!plan) {
    pixels(ctx, { x: 0, y: 0, w: L.W, h: L.H }, oak);
    return;
  }
  const { x0, x1 } = plan.bldg;
  // The lot: pavement all round, cobbles at the bottom.
  pixels(ctx, { x: 0, y: 0, w: L.W, h: L.H }, pavement);
  if (plan.street) pixels(ctx, plan.street, cobbles);
  const bottom = plan.facade ? plan.facade.y : L.H;
  const top = plan.upstairs ? plan.upstairs.edge + 16 : plan.wallD;
  pixels(ctx, { x: x0, y: top, w: x1 - x0, h: bottom - top }, oak);
  if (plan.upstairs) pixels(ctx, { x: x0, y: plan.wallD, w: x1 - x0, h: plan.upstairs.edge - plan.wallD }, pine);
  for (const t of plan.tiles) pixels(ctx, t, cement);
  for (const r of plan.rugs) rug(ctx, r, C.rust, C.rustLo, C.mustard);
  roundRug(ctx, plan.rug);
  if (plan.stage) stageBoards(ctx, plan.stage);
  // A doormat inside the door.
  const d = L.wall.door;
  const my = plan.facade ? plan.facade.y - 12 : plan.wallD + 2;
  rect(ctx, d.x - 4, my, d.w + 8, 10, OUTLINE);
  rect(ctx, d.x - 3, my + 1, d.w + 6, 8, "#6b4a2a");
  for (let x = d.x - 2; x < d.x + d.w + 2; x += 2) rect(ctx, x, my + 2, 1, 6, "#7d5a36");
}

// ------------------------------------------------------------------ the walls

/** Brick into a grid (running bond, lit from the top left); `ox` keeps the bond continuous. */
function brickInto(g: Grid, x: number, y: number, w: number, h: number, ox: number, seed: number, hi = false): void {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const row = Math.floor(yy / 4);
      const off = row % 2 ? 4 : 0;
      const bx = Math.floor((xx + ox + off) / 8);
      const mortar = yy % 4 === 3 || (xx + ox + off) % 8 === 7;
      const k = h2(row * 17 + bx, seed);
      g.set(x + xx, y + yy, mortar ? C.mortar : hi ? (k < 0.3 ? C.brick : C.brickHi) : k < 0.22 ? C.brickLo : k > 0.86 ? C.brickHi : C.brick);
    }
  }
}

function wall(ctx: CanvasRenderingContext2D, L: Layout): void {
  const plan = planOf(L);
  if (!plan) return;
  const { x0, x1 } = plan.bldg;
  const d = plan.wallD;
  // The back wall, brick, with a cornice.
  const g = new Grid(x1 - x0 + 12, d);
  brickInto(g, 0, 0, x1 - x0 + 12, d, x0 - 6, 5);
  g.rect(0, 0, x1 - x0 + 12, 3, C.walnut).hline(0, 0, x1 - x0 + 12, C.walnutHi);
  g.rect(0, d - 6, x1 - x0 + 12, 6, C.walnutLo).hline(0, d - 6, x1 - x0 + 12, C.walnut);
  paint(ctx, g, x0 - 6, 0);
  if (plan.fireplace) fireplace(ctx, plan.fireplace, d);
  if (!plan.upstairs) backBar(ctx, plan, L);
  // The side walls, down to the front.
  const bottom = plan.facade ? plan.facade.y : L.H;
  for (const x of [x0 - 6, x1]) {
    rect(ctx, x, d, 6, bottom - d, OUTLINE);
    rect(ctx, x + 1, d, 4, bottom - d, C.brickLo);
    rect(ctx, x + 1, d, 1, bottom - d, C.brickHi);
  }
  if (plan.upstairs) mezzanine(ctx, plan, L);
  if (plan.facade) facade(ctx, plan, L);
}

/** The chimney breast in the back wall: an oak mantel over a stone surround, the firebox (the fire is live). */
function fireplace(ctx: CanvasRenderingContext2D, f: Rect, d: number): void {
  const g = new Grid(f.w + 12, d);
  brickInto(g, 0, 0, f.w + 12, d, f.x, 9, true);
  const fx = 6;
  const fy = f.y;
  g.rect(fx - 4, fy - 4, f.w + 8, 4, C.oakHi).hline(fx - 4, fy - 4, f.w + 8, "#d9a46e").hline(fx - 4, fy - 1, f.w + 8, C.oakDk);
  g.rect(fx + 2, fy, f.w - 4, d - fy, "#9a958c").rect(fx + 2, fy, f.w - 4, 1, "#b5b0a6");
  g.rect(fx + 8, fy + 6, f.w - 16, d - fy - 8, "#1b1416").rect(fx + 8, fy + 6, f.w - 16, 2, "#2a2024");
  for (let y = fy + 9; y < d - 4; y += 3) for (let xx = fx + 10 + (y % 2 ? 2 : 0); xx < fx + f.w - 10; xx += 5) g.set(xx, y, "#3a2622");
  // On the mantel: candles, a framed photo, a little plant.
  g.rect(fx + 4, fy - 9, 2, 5, C.cream).set(fx + 4, fy - 10, C.amber);
  g.rect(fx + 8, fy - 7, 2, 3, C.cream).set(fx + 8, fy - 8, C.amber);
  g.rect(fx + f.w - 14, fy - 10, 8, 6, C.walnut).rect(fx + f.w - 13, fy - 9, 6, 4, C.chalkBlue);
  g.rect(fx + f.w - 5, fy - 7, 4, 3, C.terra).rect(fx + f.w - 6, fy - 10, 6, 3, C.leaf);
  paint(ctx, g, f.x - 6, 0);
}

/** One floor (short panels): the back bar on the wall over the counter: shelves of cups and jars, the menus, the back counter. */
function backBar(ctx: CanvasRenderingContext2D, plan: CafePlan, L: Layout): void {
  const K = plan.counter.r;
  const d = plan.wallD;
  const x = K.x - 4;
  const w = K.w + 8;
  const g = new Grid(w, d - 6);
  g.rect(0, 0, w, d - 6, C.greenLo);
  for (let xx = 0; xx < w; xx += 6) g.vline(xx, 0, d - 6, C.green);
  g.hline(0, 0, w, C.greenHi);
  const shelfY = d - 16;
  shelfStuff(g, 4, w - 8, shelfY);
  g.outline(OUTLINE);
  paint(ctx, g, x, 0);
  for (const [i, m] of plan.menus.entries()) menuBoard(ctx, m, i);
  backCounter(ctx, x, d - 16, w, 22);
  void L;
}

/** Cups, jars of beans and syrup bottles on a shelf at `y`. */
function shelfStuff(g: Grid, x0: number, w: number, y: number): void {
  for (let xx = x0; xx < x0 + w; xx++) {
    const k = h2(xx >> 3, 9);
    const lx = xx & 7;
    if (lx === 7) continue;
    if (k < 0.4) {
      if (lx < 6) g.rect(xx, y - 6, 1, 6, lx % 2 ? "#ffffff" : "#e8e2d8");
    } else if (k < 0.7) {
      if (lx >= 1 && lx <= 5) g.vline(xx, y - 7, 7, lx === 1 ? C.glass : lx === 5 ? "#8fb6c8" : C.espresso).set(xx, y - 8, C.walnut);
    } else if (k < 0.85) {
      if (lx % 3 === 1) g.vline(xx, y - 8, 8, [C.rust, C.mustard, C.velvet][lx % 3]!).set(xx, y - 9, C.chromeLo);
    }
  }
  g.rect(x0 - 2, y, w + 4, 2, C.walnut).hline(x0 - 2, y, w + 4, C.walnutHi);
}

/**
 * The mezzanine's edge: the balustrade along it (open at the stairs), the
 * paneled riser under it with sockets over the wall counter, the back
 * counter of the espresso bar at its foot with the menus hanging over it,
 * and the stairs coming down.
 */
function mezzanine(ctx: CanvasRenderingContext2D, plan: CafePlan, L: Layout): void {
  const { x0, x1 } = plan.bldg;
  const e = plan.upstairs!.edge;
  const st = plan.stairs!;
  // The riser: walnut panels.
  const g = new Grid(x1 - x0, 16);
  g.rect(0, 0, x1 - x0, 16, C.walnut);
  for (let x = 2; x + 20 < x1 - x0; x += 24) g.rect(x, 4, 20, 9, C.walnutLo).rect(x + 1, 5, 18, 7, C.walnut).hline(x + 1, 5, 18, C.walnutHi);
  g.hline(0, 15, x1 - x0, C.walnutDk);
  paint(ctx, g, x0, e);
  // Sockets over the wall counter.
  for (const t of plan.tables) {
    if (t.kind !== "bar") continue;
    for (let x = t.x + 10; x < t.x + t.w; x += 48) {
      rect(ctx, x, e + 6, 6, 5, OUTLINE);
      rect(ctx, x + 1, e + 7, 4, 3, C.cream);
      rect(ctx, x + 2, e + 8, 1, 1, OUTLINE);
      rect(ctx, x + 4, e + 8, 1, 1, OUTLINE);
    }
  }
  // The balustrade on top.
  for (let x = x0; x < x1; x++) {
    if (Math.abs(x - st.x) <= 13) continue;
    if ((x - x0) % 5 === 0) rect(ctx, x, e - 6, 1, 7, C.walnutDk);
  }
  for (const [a, b] of [[x0, st.x - 13], [st.x + 14, x1]] as const) {
    if (b <= a) continue;
    rect(ctx, a, e - 8, b - a, 3, OUTLINE);
    rect(ctx, a, e - 8, b - a, 2, C.walnutHi);
    rect(ctx, a, e, b - a, 1, C.walnutDk);
  }
  // The back counter and the menus over it.
  const K = plan.counter.r;
  backCounter(ctx, K.x - 2, K.y - 10, K.w + 4, 22);
  for (const [i, m] of plan.menus.entries()) {
    rect(ctx, m.x + 6, e - 4, 1, m.y - e + 4, C.iron);
    rect(ctx, m.x + m.w - 7, e - 4, 1, m.y - e + 4, C.iron);
    menuBoard(ctx, m, i);
  }
  // The stairs: treads going down, a stringer either side.
  const sx = st.x - 11;
  const sw = 22;
  const y0 = st.y0 - 4;
  const y1 = st.y1;
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) % 5;
    rect(ctx, sx, y, sw, 1, k === 0 ? "#e2b884" : k === 4 ? "#8e6238" : "#c8965e");
  }
  rect(ctx, sx - 2, y0, 2, y1 - y0, OUTLINE);
  rect(ctx, sx + sw, y0, 2, y1 - y0, OUTLINE);
  rect(ctx, sx - 3, e - 8, 3, y1 - e + 8, C.walnut);
  rect(ctx, sx + sw, e - 8, 3, y1 - e + 8, C.walnut);
  rect(ctx, sx - 3, e - 9, 3, 2, C.brassHi);
  rect(ctx, sx + sw, e - 9, 3, 2, C.brassHi);
  void L;
}

/**
 * The shop's face: the stone cap of the front wall, the green sign board,
 * brick, big windows under a striped awning with flower boxes, open French
 * doors (the main door with its bell is the door step), lamps by the door.
 */
function facade(ctx: CanvasRenderingContext2D, plan: CafePlan, L: Layout): void {
  const f = plan.facade!;
  const { x0, x1 } = plan.bldg;
  const x = x0 - 6;
  const w = x1 - x0 + 12;
  const g = new Grid(w, f.h);
  brickInto(g, 0, 0, w, f.h, x, 13);
  g.rect(0, 0, w, 3, "#cfc6b6").hline(0, 0, w, "#e6dfd2").hline(0, 3, w, "#a89f90");
  g.rect(0, 4, w, 8, C.green).hline(0, 4, w, C.greenHi).hline(0, 11, w, C.greenDk);
  g.rect(0, f.h - 3, w, 3, "#a89f90").hline(0, f.h - 3, w, "#c1b8a8");
  // Windows between the doors.
  const gaps = [...f.doors].sort((a, b) => a - b);
  const spans: [number, number][] = [];
  let from = x0 + 4;
  for (const dx of gaps) {
    spans.push([from, dx - 14]);
    from = dx + 14;
  }
  spans.push([from, x1 - 4]);
  for (const [a, b] of spans) {
    for (let wx = a; wx + 30 <= b; ) {
      const ww = Math.min(60, b - wx);
      if (ww < 30) break;
      const lx = wx - x;
      g.rect(lx, 14, ww, 18, C.green);
      g.rect(lx + 2, 16, ww - 4, 14, "#3a3540");
      g.rect(lx + 2, 16, ww - 4, 2, "#5a5462");
      for (let i = 0; i < 3; i++) g.set(lx + 5 + i * 9, 26 - i * 3, "#6e6878").set(lx + 6 + i * 9, 25 - i * 3, "#6e6878");
      g.vline(lx + Math.floor(ww / 2), 16, 14, C.green);
      // The flower box.
      g.rect(lx + 1, 32, ww - 2, 4, C.terra).hline(lx + 1, 32, ww - 2, "#de9068").hline(lx + 1, 35, ww - 2, C.terraLo);
      for (let i = 2; i < ww - 2; i += 3) g.set(lx + i, 31, i % 2 ? C.leaf : C.leafHi).set(lx + i, 30, i % 6 === 2 ? "#e5484d" : i % 6 === 5 ? C.chalkPink : C.leaf);
      wx += ww + 8;
    }
  }
  // The French doors stand open: dark warm gaps with the leaves folded back.
  for (const dx of gaps.slice(1)) {
    const lx = dx - x - 9;
    g.rect(lx, 12, 18, f.h - 15, C.greenDk);
    g.rect(lx + 2, 14, 14, f.h - 17, "#4a3428");
    g.rect(lx + 2, 14, 14, 2, "#6a4a34");
    g.rect(lx - 3, 13, 3, f.h - 16, C.green).rect(lx + 18, 13, 3, f.h - 16, C.green);
  }
  g.outline(OUTLINE);
  paint(ctx, g, x, f.y);
  // The sign: the name left of the door, what's on offer right of it.
  const dX = L.wall.door.x + L.wall.door.w / 2;
  const name = "CAFE";
  drawPixelText(ctx, name, Math.round(Math.max(x0 + 8, dX - 30 - pixelTextWidth(name))), f.y + 5, C.brassHi);
  const tag = "COFFEE . CAKE";
  if (dX + 30 + pixelTextWidth(tag) <= x1 - 4) drawPixelText(ctx, tag, Math.round(dX + 30), f.y + 5, C.cream);
  // The awning over the windows: green and cream stripes, a scalloped edge.
  for (const [a, b] of spans) {
    if (b - a < 30) continue;
    for (let ax = a - 2; ax < b + 2; ax++) {
      const stripe = Math.floor((ax - a) / 4) % 2 ? C.awning : C.awningStripe;
      const k = (ax - a) % 8;
      const drop = k === 3 || k === 4 ? 2 : k === 2 || k === 5 ? 1 : 0;
      rect(ctx, ax, f.y + 12, 1, 7 + drop, stripe);
      rect(ctx, ax, f.y + 19 + drop, 1, 1, OUTLINE);
    }
    rect(ctx, a - 2, f.y + 12, b - a + 4, 1, OUTLINE);
  }
  // Lamps either side of the door.
  const d = L.wall.door;
  for (const lx of [d.x - 7, d.x + d.w + 4]) {
    rect(ctx, lx, d.y + 4, 4, 6, OUTLINE);
    rect(ctx, lx + 1, d.y + 5, 2, 4, "#ffe6a8");
  }
}

/** The menu board: a walnut frame, chalk headings and item lines with prices. */
function menuBoard(ctx: CanvasRenderingContext2D, m: Rect, i: number): void {
  const g = new Grid(m.w + 2, m.h + 2);
  g.rect(0, 0, m.w + 2, m.h + 2, C.walnut).rect(0, 0, m.w + 2, 1, C.walnutHi);
  g.rect(2, 2, m.w - 2, m.h - 2, C.board);
  g.outline(OUTLINE);
  paint(ctx, g, m.x - 1, m.y - 1);
  const heads = ["COFFEE", "TEA", "BAKES"];
  const head = heads[i % heads.length]!;
  const hy = m.y + 14;
  if (pixelTextWidth(head) < m.w - 6) drawPixelText(ctx, head, m.x + 3, hy, C.chalkYellow);
  for (let r = 0, y = hy + 8; y < m.y + m.h - 3; r++, y += 4) {
    const lw = Math.max(6, Math.floor((m.w - 14) * (0.55 + h2(r, i) * 0.4)));
    chalkLine(ctx, m.x + 3, y, lw, C.chalk, r * 7 + i);
    rect(ctx, m.x + m.w - 8, y, 4, 1, C.chalkPink);
  }
}

/** The back counter: a walnut cabinet with a marble top, the second grinder, milk jugs, a blender, cup stacks. */
function backCounter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const g = new Grid(w, h);
  g.rect(0, 6, w, h - 6, C.walnut).hline(0, 6, w, C.walnutHi);
  for (let xx = 3; xx + 14 < w; xx += 18) g.rect(xx, 9, 14, h - 12, C.walnutLo).rect(xx + 1, 10, 12, h - 14, C.walnut).set(xx + 7, 12, C.brass);
  g.rect(0, 2, w, 5, C.marble).hline(0, 2, w, C.marbleHi).hline(0, 6, w, C.marbleLo);
  // Things on it.
  for (let xx = 6, i = 0; xx < w - 10; i++) {
    const k = h2(i, 21);
    if (k < 0.3) {
      // Milk jugs (steel).
      g.rect(xx, -2 + 4, 4, 4, C.chromeLo).rect(xx, 0 + 2, 4, 1, C.chromeHi).set(xx + 4, 3, C.chromeLo);
      xx += 8;
    } else if (k < 0.5) {
      // A stack of to-go cups.
      g.rect(xx, -6 + 6, 3, 6, C.kraft).hline(xx, 1, 3, C.paper);
      xx += 6;
    } else if (k < 0.65) {
      // A syrup rack.
      for (let j = 0; j < 3; j++) g.rect(xx + j * 2, 0, 1, 4, [C.rust, C.mustard, C.velvet][j]!);
      xx += 9;
    } else {
      xx += 7;
    }
  }
  g.outline(OUTLINE);
  paint(ctx, g, x, y);
}

// ------------------------------------------------------------------ rooms

function room(ctx: CanvasRenderingContext2D, r: Room): void {
  if (r.kind === "server") pixels(ctx, r.rect, (x, y) => ((x + y * 3) % 11 === 0 ? "#8f8a82" : (x * 7 + y) % 13 === 0 ? "#b4afa6" : "#a29d94"));
}

/**
 * The back room's walls: brick, a doorway at the bottom of the side facing
 * the stairs (where whoever pokes at the cables walks in), a pass-through
 * hatch on the other side looking out behind the counter.
 */
function roomWalls(ctx: CanvasRenderingContext2D, r: Room, L: Layout): void {
  if (r.kind !== "server") return;
  const q = r.rect;
  const gap = planOf(L)?.server?.gap ?? "left";
  const g = new Grid(q.w + 6, 9);
  brickInto(g, 0, 0, q.w + 6, 9, q.x, 21);
  g.hline(0, 0, q.w + 6, C.brickHi);
  g.outline(OUTLINE);
  paint(ctx, g, q.x - 3, q.y - 9);
  const sy = q.y + q.h - 3;
  for (const side of ["left", "right"] as const) {
    const x = side === "left" ? q.x - 3 : q.x + q.w - 1;
    const doorway = side === gap;
    const to = doorway ? sy - 18 : q.y + q.h - 4;
    rect(ctx, x, q.y - 8, 4, to - (q.y - 8), OUTLINE);
    rect(ctx, x + 1, q.y - 7, 2, to - (q.y - 7), C.brickLo);
    if (doorway) {
      rect(ctx, x - 1, to, 6, 2, C.walnutDk);
    } else {
      // The hatch: a gap with a little ledge.
      const hy = q.y + 10;
      rect(ctx, x, hy, 4, 14, "#4a3428");
      rect(ctx, x - 2, hy + 14, 8, 2, C.walnutHi);
    }
  }
  // A sign by the doorway.
  const tw = pixelTextWidth("STAFF") + 6;
  const tx = gap === "left" ? q.x + 2 : q.x + q.w - tw - 2;
  rect(ctx, tx, q.y - 17, tw, 9, OUTLINE);
  rect(ctx, tx + 1, q.y - 16, tw - 2, 7, C.cream);
  drawPixelText(ctx, "STAFF", tx + 3, q.y - 15, C.rustLo);
}

// ------------------------------------------------------------------ fixtures

/** An arched window frame (the glass is cleared; the view is live). */
function windowFrame(ctx: CanvasRenderingContext2D, win: Rect): void {
  const { x, y, w, h } = win;
  const g = new Grid(w + 2, h + 6);
  g.rect(1, 1, w, h, C.green);
  g.rect(1, 1, w, 1, C.greenHi);
  g.rect(0, h + 1, w + 2, 3, C.walnutHi).rect(0, h + 1, w + 2, 1, "#c08a5a");
  g.outline(OUTLINE);
  const mx = Math.floor(w / 2);
  const tr = Math.min(9, Math.floor(h / 4));
  for (let j = 4; j < h - 1; j++) {
    for (let i = 5; i < w - 3; i++) {
      if (j === tr || i === mx) continue;
      g.set(i, j, null);
    }
  }
  paint(ctx, g, x - 1, y - 1);
  // The arch's corners in brick.
  for (let i = 0; i < 4; i++) {
    rect(ctx, x + 3, y + 2 + i, 4 - i, 1, C.brick);
    rect(ctx, x + w - 7 + i, y + 2 + i, 4 - i, 1, C.brick);
  }
}

function pinboard(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  const g = new Grid(w + 2, h + 2);
  g.rect(1, 1, w, h, C.walnut).rect(1, 1, w, 1, C.walnutHi);
  g.rect(4, 4, w - 6, h - 6, "#c99a64");
  for (let i = 0; i < 300; i++) g.set(4 + ((i * 37) % (w - 6)), 4 + ((i * 53 + (i >> 3)) % (h - 6)), i % 3 ? "#b8875a" : "#d9ad78");
  g.outline(OUTLINE);
  paint(ctx, g, x - 1, y - 1);
  // Flyers peeking out at the edges (the usage notes cover the middle): a gig, a lost cat, guitar lessons.
  const flyer = (fx: number, fy: number, fw: number, fh: number, c: string) => {
    rect(ctx, fx, fy, fw, fh, OUTLINE);
    rect(ctx, fx + 1, fy + 1, fw - 2, fh - 2, c);
  };
  flyer(x + w - 10, y + h - 12, 8, 10, C.chalkPink);
  flyer(x + 2, y + h - 9, 10, 7, C.chalkYellow);
  rect(ctx, x + w - 7, y + h - 11, 1, 1, "#e5484d");
}

function calendar(ctx: CanvasRenderingContext2D, c: Rect): void {
  const g = new Grid(c.w + 2, c.h + 2);
  g.rect(1, 1, c.w, c.h, C.paper);
  g.rect(1, 1, c.w, 7, C.green);
  g.rect(1, c.h - 1, c.w, 2, C.paperLo);
  g.outline(OUTLINE);
  paint(ctx, g, c.x - 1, c.y - 1);
}

function status(ctx: CanvasRenderingContext2D, s: Rect): void {
  const g = new Grid(s.w + 2, s.h + 2);
  g.rect(1, 1, s.w, s.h, C.walnut);
  g.rect(2, 2, s.w - 2, s.h - 2, C.board);
  g.outline(OUTLINE);
  paint(ctx, g, s.x - 1, s.y - 1);
}

/** The shop door: a green frame round a big glass pane, the brass bell over it, an OPEN sign; the "+" plate above. */
function door(ctx: CanvasRenderingContext2D, d: Rect): void {
  const g = new Grid(d.w + 6, d.h + 4);
  g.rect(0, 2, d.w + 6, d.h + 2, C.greenDk);
  g.rect(3, 4, d.w, d.h, C.green);
  g.rect(3, 4, d.w, 1, C.greenHi);
  g.rect(6, 7, d.w - 6, d.h - 14, "#5c4a3a");
  g.rect(6, 7, d.w - 6, 2, "#8a6a4a");
  g.set(8, 12, "#c8a878").set(9, 11, "#c8a878");
  g.rect(5, d.h - 5, d.w - 4, 3, C.greenLo);
  // The push bar.
  g.rect(d.w - 2, Math.round(d.h * 0.55), 2, 6, C.brass).set(d.w - 2, Math.round(d.h * 0.55), C.brassHi);
  g.outline(OUTLINE);
  paint(ctx, g, d.x - 3, d.y - 3);
  // The "+" plate hanging inside the glass: a new thread. And the brass bell over the door.
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, C.green);
  sg.rect(6, 2, 2, 5, C.cream).rect(4, 4, 6, 1, C.cream);
  sg.outline(OUTLINE);
  paint(ctx, sg, d.x + d.w / 2 - 7, d.y + 3);
  rect(ctx, d.x + d.w - 3, d.y - 3, 5, 1, C.iron);
  rect(ctx, d.x + d.w, d.y - 2, 3, 3, OUTLINE);
  rect(ctx, d.x + d.w, d.y - 2, 2, 2, C.brassHi);
}

function legend(ctx: CanvasRenderingContext2D, n: Rect): void {
  // A paper order ticket with a "?" on it.
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, C.paper);
  g.rect(1, 1, n.w, 2, C.chalkYellow);
  for (let x = 1; x < n.w + 1; x += 2) g.set(x, n.h, C.paperLo);
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, C.walnutDk).set(qx + 2, 5, C.walnutDk).set(qx + 1, 6, C.walnutDk).set(qx + 1, 8, C.walnutDk);
  g.outline(OUTLINE);
  paint(ctx, g, n.x - 1, n.y - 1);
  rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, C.copper);
}

/** A round station clock: a brass rim, a cream face. */
function clock(ctx: CanvasRenderingContext2D, k: { x: number; y: number; r: number }): void {
  const { x, y, r } = k;
  const g = new Grid(r * 2 + 5, r * 2 + 5);
  const c = r + 2;
  g.ellipse(c, c, r, r, C.brassLo);
  g.ellipse(c, c, r - 0.6, r - 0.6, C.brass);
  g.ellipse(c, c, r - 1.6, r - 1.6, "#fbf5e6");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.set(c + Math.round(Math.sin(a) * (r - 2.8)), c - Math.round(Math.cos(a) * (r - 2.8)), i % 3 === 0 ? C.walnutDk : C.vein);
  }
  g.outline(OUTLINE);
  paint(ctx, g, x - c, y - c);
}

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor,
  wall,
  pods: () => undefined,
  room,
  roomWalls,
  window: (ctx, win) => windowFrame(ctx, win),
  pinboard,
  calendar,
  status,
  door,
  legend,
  clock,
  painting: () => undefined,
};
