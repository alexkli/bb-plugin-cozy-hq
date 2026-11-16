// Coffee Shop: the baked backdrop. An oak herringbone floor, cement tiles at
// the counter, rugs by the fire and under the reserved table, the open-mic
// stage's boards, your snug's raised platform. The wall is three walls: the
// storefront (green-painted shop windows onto the street, a brick pier with
// the community corkboard, the glass door with its brass bell), the chimney
// breast with the fireplace between built-in bookshelves, and the back bar
// (white subway tiles, open shelves of cups and bean jars, chalkboard menus,
// the back counter where the baristas grind and steam).
import type { Layout, Rect, Room } from "../../layout.ts";
import type { BackgroundSteps } from "../../theme.ts";
import { Grid, OUTLINE, pixelTextWidth, drawPixelText } from "../../themekit.ts";
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
  const w = Math.max(1, Math.floor(r.w));
  const h = Math.max(1, Math.floor(r.h));
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
  // Each column of boards leans one way or the other.
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

/** A woven rug: a striped border round a field of small diamonds, a fringe at the ends. */
function rug(ctx: CanvasRenderingContext2D, r: Rect, field: string, border: string, motif: string): void {
  const g = new Grid(r.w, r.h);
  g.rect(0, 0, r.w, r.h, border);
  g.rect(2, 2, r.w - 4, r.h - 4, C.cream);
  g.rect(3, 3, r.w - 6, r.h - 6, border);
  g.rect(5, 5, r.w - 10, r.h - 10, field);
  for (let x = 4; x < r.w - 4; x += 3) g.set(x, 4, motif).set(x + 1, r.h - 5, motif);
  for (let y = 4; y < r.h - 4; y += 3) g.set(4, y, motif).set(r.w - 5, y + 1, motif);
  // Small diamonds on a lattice.
  for (let y = 9; y < r.h - 8; y += 8) {
    for (let x = 10 + ((y / 8) % 2 ? 4 : 0); x < r.w - 9; x += 8) {
      g.set(x, y - 1, motif).set(x - 1, y, motif).set(x + 1, y, motif).set(x, y + 1, motif).set(x, y, C.cream);
    }
  }
  // Fringe at the ends.
  for (let y = 1; y < r.h - 1; y += 2) g.set(0, y, C.cream).set(r.w - 1, y, C.cream);
  paint(ctx, g, r.x, r.y);
}

function floor(ctx: CanvasRenderingContext2D, L: Layout): void {
  pixels(ctx, { x: 0, y: 0, w: L.W, h: L.H }, oak);
  const plan = planOf(L);
  if (!plan) return;
  for (const t of plan.tiles) pixels(ctx, t, cement);
  // A doormat inside the front door.
  const d = L.wall.door;
  const seg = L.segments.find((s) => d.x + d.w / 2 >= s.x0 && d.x + d.w / 2 < s.x1);
  const my = (seg?.depth ?? 70) + 2;
  rect(ctx, d.x - 4, my, d.w + 8, 10, OUTLINE);
  rect(ctx, d.x - 3, my + 1, d.w + 6, 8, "#6b4a2a");
  for (let x = d.x - 2; x < d.x + d.w + 2; x += 2) rect(ctx, x, my + 2, 1, 6, "#7d5a36");
  for (const r of plan.rugs) rug(ctx, r, C.rust, C.rustLo, C.mustard);
  const m = plan.reserved;
  const table = L.props.find((p) => p.kind === "meeting-table");
  if (table) rug(ctx, { x: Math.max(m.x + 2, table.x - 14), y: table.y - 30, w: Math.min(m.w - 4, 96), h: 92 }, C.velvet, C.velvetLo, C.mustard);
  if (plan.stage) stageBoards(ctx, plan.stage);
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

// ------------------------------------------------------------------ the walls

type WallKind = "storefront" | "chimney" | "backbar";

function kindOf(plan: CafePlan | null, s: { x0: number; x1: number }): WallKind {
  if (!plan) return "backbar";
  const mid = (s.x0 + s.x1) / 2;
  if (mid >= plan.storefront.x0 && mid < plan.storefront.x1) return "storefront";
  if (plan.fireplace && plan.fireplace.x >= s.x0 && plan.fireplace.x < s.x1) return "chimney";
  return "backbar";
}

function wall(ctx: CanvasRenderingContext2D, L: Layout): void {
  const plan = planOf(L);
  for (const s of L.segments) {
    const w = s.x1 - s.x0;
    const d = s.depth;
    switch (kindOf(plan, s)) {
      case "storefront":
        storefront(ctx, s.x0, w, d);
        break;
      case "chimney":
        chimneyWall(ctx, s.x0, w, d, plan!);
        break;
      case "backbar":
        backBar(ctx, s.x0, w, d, plan, L);
        break;
    }
    // The skirting where the wall meets the floor.
    rect(ctx, s.x0, d - 2, w, 2, C.walnutDk);
    rect(ctx, s.x0, d, w, 1, "#5a3a22");
  }
  // Posts where the walls step in or out.
  for (const x of L.wall.pillars) {
    const depth = Math.max(...L.segments.filter((s) => Math.abs(s.x0 - x) < 2 || Math.abs(s.x1 - x) < 2).map((s) => s.depth));
    rect(ctx, x - 3, 0, 6, depth, OUTLINE);
    rect(ctx, x - 2, 0, 4, depth - 1, C.walnut);
    rect(ctx, x - 2, 0, 1, depth - 1, C.walnutHi);
  }
}

/** The shopfront from inside: a green fascia, the window wall (windows cut in later), a paneled green bulkhead under the sill. */
function storefront(ctx: CanvasRenderingContext2D, x: number, w: number, d: number): void {
  // Brick between and around the windows (most of it ends up glass).
  const g = new Grid(w, d);
  for (let y = 0; y < d; y++) {
    for (let xx = 0; xx < w; xx++) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const bx = Math.floor((xx + off) / 8);
      const mortar = y % 4 === 3 || (xx + off) % 8 === 7;
      const k = h2(row * 13 + bx, 3);
      g.set(xx, y, mortar ? C.mortar : k < 0.2 ? C.brickLo : k > 0.85 ? C.brickHi : C.brick);
    }
  }
  // The fascia along the top.
  g.rect(0, 0, w, 6, C.green).hline(0, 0, w, C.greenHi).hline(0, 5, w, C.greenDk);
  for (let xx = 4; xx < w; xx += 10) g.set(xx, 3, C.brass);
  // The sill and the bulkhead under the windows.
  const sill = d - 12;
  g.rect(0, sill, w, 2, C.walnutHi).rect(0, sill + 2, w, 1, C.walnutLo);
  g.rect(0, sill + 3, w, d - sill - 3, C.green);
  for (let xx = 2; xx + 12 < w; xx += 16) {
    g.rect(xx, sill + 4, 13, d - sill - 7, C.greenLo).rect(xx + 1, sill + 5, 11, d - sill - 9, C.green).hline(xx + 1, sill + 5, 11, C.greenHi);
  }
  paint(ctx, g, x, 0);
}

/** Exposed brick, built-in bookshelves either side and the fireplace in the chimney breast. */
function chimneyWall(ctx: CanvasRenderingContext2D, x: number, w: number, d: number, plan: CafePlan): void {
  const g = new Grid(w, d);
  for (let y = 0; y < d; y++) {
    for (let xx = 0; xx < w; xx++) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const bx = Math.floor((xx + x + off) / 8);
      const mortar = y % 4 === 3 || (xx + x + off) % 8 === 7;
      const k = h2(row * 17 + bx, 5);
      g.set(xx, y, mortar ? C.mortar : k < 0.22 ? C.brickLo : k > 0.86 ? C.brickHi : C.brick);
    }
  }
  const f = plan.fireplace!;
  const fx = f.x - x;
  // Built-in shelves of books either side of the chimney.
  const shelf = (sx: number, sw: number) => {
    if (sw < 14) return;
    const top = 10;
    const bottom = d - 6;
    g.rect(sx, top, sw, bottom - top, C.walnutDk);
    g.rect(sx, top, sw, 2, C.walnutHi).rect(sx, top, 2, bottom - top, C.walnut).rect(sx + sw - 2, top, 2, bottom - top, C.walnut);
    for (let sy = top + 2, row = 0; sy + 12 < bottom; sy += 14, row++) {
      g.rect(sx + 2, sy + 12, sw - 4, 2, C.walnut);
      let bx = sx + 3;
      let i = 0;
      while (bx < sx + sw - 4) {
        const k = h2(row * 29 + i + sx, 11);
        if (k < 0.12) {
          // A potted plant or a jar now and then.
          g.rect(bx, sy + 6, 5, 6, C.terra).rect(bx - 1, sy + 2, 7, 4, C.leaf).set(bx + 1, sy + 2, C.leafHi);
          bx += 7;
        } else {
          const bw = 2 + Math.floor(k * 3);
          const bh = 8 + Math.floor(h2(i, row) * 4);
          const col = [C.rust, C.green, C.mustard, C.cream, C.velvet, "#5b6f8f", C.leather][Math.floor(k * 7)]!;
          g.rect(bx, sy + 12 - bh, bw, bh, col).vline(bx, sy + 12 - bh, bh, C.walnutDk);
          bx += bw + (k > 0.8 ? 2 : 0);
        }
        i++;
      }
    }
  };
  shelf(4, fx - 10);
  shelf(fx + f.w + 6, w - (fx + f.w + 6) - 4);
  // The chimney breast: lighter brick with a stone surround and an oak mantel.
  g.rect(fx - 2, 0, f.w + 4, d, C.brickHi);
  for (let y = 0; y < d; y += 4) g.hline(fx - 2, y + 3, f.w + 4, C.mortar);
  for (let y = 0, row = 0; y < d; y += 4, row++) for (let xx = fx - 2 + (row % 2 ? 4 : 0); xx < fx + f.w + 2; xx += 8) g.vline(xx, y, 3, C.mortar);
  const fy = f.y;
  g.rect(fx - 4, fy - 4, f.w + 8, 4, C.oakHi).hline(fx - 4, fy - 4, f.w + 8, "#d9a46e").hline(fx - 4, fy - 1, f.w + 8, C.oakDk);
  g.rect(fx + 2, fy, f.w - 4, d - fy, "#9a958c").rect(fx + 2, fy, f.w - 4, 1, "#b5b0a6");
  g.rect(fx + 8, fy + 6, f.w - 16, d - fy - 8, "#1b1416").rect(fx + 8, fy + 6, f.w - 16, 2, "#2a2024");
  // Fire bricks at the back of the firebox.
  for (let y = fy + 9; y < d - 4; y += 3) for (let xx = fx + 10 + (y % 2 ? 2 : 0); xx < fx + f.w - 10; xx += 5) g.set(xx, y, "#3a2622");
  // Things on the mantel: candles, a little plant, a framed photo.
  g.rect(fx + 4, fy - 9, 2, 5, C.cream).set(fx + 4, fy - 10, C.amber);
  g.rect(fx + 8, fy - 7, 2, 3, C.cream).set(fx + 8, fy - 8, C.amber);
  g.rect(fx + f.w - 14, fy - 10, 8, 6, C.walnut).rect(fx + f.w - 13, fy - 9, 6, 4, C.chalkBlue);
  g.rect(fx + f.w - 5, fy - 7, 4, 3, C.terra).rect(fx + f.w - 6, fy - 10, 6, 3, C.leaf);
  paint(ctx, g, x, 0);
}

/** The back bar: subway tiles, open shelves of cups and jars, menus, the back counter at its foot. */
function backBar(ctx: CanvasRenderingContext2D, x: number, w: number, d: number, plan: CafePlan | null, L: Layout): void {
  const g = new Grid(w, d);
  // Dark green upper wall, white subway tiles below.
  const tileTop = Math.max(26, d - 34);
  g.rect(0, 0, w, tileTop, C.greenLo);
  for (let xx = 0; xx < w; xx += 6) g.vline(xx, 0, tileTop, C.green);
  g.hline(0, 0, w, C.greenHi);
  for (let y = tileTop; y < d; y++) {
    for (let xx = 0; xx < w; xx++) {
      const row = Math.floor((y - tileTop) / 3);
      const off = row % 2 ? 4 : 0;
      const grout = (y - tileTop) % 3 === 2 || (xx + off) % 8 === 7;
      g.set(xx, y, grout ? "#d6d2c8" : (y - tileTop) % 3 === 0 ? "#ffffff" : "#f1eee8");
    }
  }
  // Open shelves on the tiles: cups, glasses and jars of beans.
  const busy: [number, number][] = [];
  if (plan) for (const m of plan.menus) busy.push([m.x - x - 3, m.x - x + m.w + 3]);
  busy.push([L.tv.x - x - 18, L.tv.x - x + L.tv.w + 18]);
  const shelfY = tileTop + 6;
  for (let xx = 4; xx < w - 4; xx++) {
    if (busy.some(([a, z]) => xx >= a && xx < z) && shelfY < L.tv.y + L.tv.h + 2) continue;
    const k = h2(xx >> 3, 9);
    const lx = xx & 7;
    if (lx === 7) continue;
    if (k < 0.4) {
      // Stacked cups.
      if (lx < 6) g.rect(xx, shelfY - 6, 1, 6, lx % 2 ? "#ffffff" : "#e8e2d8");
    } else if (k < 0.7) {
      // A jar of beans.
      if (lx >= 1 && lx <= 5) g.vline(xx, shelfY - 7, 7, lx === 1 ? C.glass : lx === 5 ? "#8fb6c8" : C.espresso).set(xx, shelfY - 8, C.walnut);
    } else if (k < 0.85) {
      // Syrup bottles.
      if (lx % 3 === 1) g.vline(xx, shelfY - 8, 8, [C.rust, C.mustard, C.velvet][lx % 3]!).set(xx, shelfY - 9, C.chromeLo);
    }
  }
  g.rect(2, shelfY, w - 4, 2, C.walnut).hline(2, shelfY, w - 4, C.walnutHi);
  for (let xx = 8; xx < w - 8; xx += 30) g.rect(xx, shelfY + 2, 1, 3, C.iron);
  paint(ctx, g, x, 0);
  // Chalkboard menus (the special's line is chalked live; the rest is baked here).
  if (plan) for (const [i, m] of plan.menus.entries()) menuBoard(ctx, m, i);
  // The back counter along the wall's foot (where it's the counter's wall).
  if (plan?.counter.walled) {
    const K = plan.counter.r;
    const x0 = Math.max(x, K.x - 4);
    const x1 = Math.min(x + w, K.x + K.w + 4);
    if (x1 - x0 > 20 && Math.abs(K.y - d) < 4) backCounter(ctx, x0, d - 16, x1 - x0, 22);
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

function room(ctx: CanvasRenderingContext2D, r: Room, L: Layout): void {
  if (r.kind === "boss") snugFloor(ctx, r.rect);
  else if (r.kind === "server") {
    const q = r.rect;
    pixels(ctx, q, (x, y) => ((x + y * 3) % 11 === 0 ? "#8f8a82" : (x * 7 + y) % 13 === 0 ? "#b4afa6" : "#a29d94"));
  } else if (r.kind === "lounge" && !planOf(L)) rect(ctx, r.rect.x, r.rect.y, r.rect.w, r.rect.h, C.rust);
}

/** Your snug: a raised platform of dark walnut boards (its edge shows at the front). */
function snugFloor(ctx: CanvasRenderingContext2D, r: Rect): void {
  pixels(ctx, r, (x, y) => {
    const ly = (y - r.y) % 6;
    if (ly === 5) return C.walnutDk;
    const seam = (x + Math.floor((y - r.y) / 6) * 19) % 37 === 0;
    if (seam) return C.walnutDk;
    return ly === 0 ? C.walnutHi : (x + y) % 17 === 0 ? C.walnutLo : C.walnut;
  });
  // A rug under the desk.
  const rw = Math.min(r.w - 30, 110);
  rug(ctx, { x: r.x + Math.round((r.w - rw) / 2) + 8, y: r.y + 22, w: rw, h: Math.min(66, r.h - 34) }, C.velvet, C.velvetLo, C.rust);
}

function roomWalls(ctx: CanvasRenderingContext2D, r: Room, _L: Layout): void {
  const q = r.rect;
  if (r.kind === "boss") {
    // A low walnut railing round the back and the sides, open at the step up by the door.
    const door = r.doorX ?? q.x + 16;
    const rail = (x: number, y: number, w: number) => {
      rect(ctx, x, y, w, 6, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, 4, C.walnut);
      rect(ctx, x + 1, y + 1, w - 2, 1, C.walnutHi);
      for (let xx = x + 3; xx < x + w - 2; xx += 5) rect(ctx, xx, y + 2, 1, 3, C.walnutDk);
    };
    rail(q.x - 2, q.y - 8, door - 9 - (q.x - 2));
    rail(door + 9, q.y - 8, q.x + q.w + 2 - (door + 9));
    // The step up into the snug.
    rect(ctx, door - 9, q.y - 4, 18, 4, OUTLINE);
    rect(ctx, door - 8, q.y - 3, 16, 2, C.oakHi);
    for (const x of [q.x - 3, q.x + q.w - 1]) {
      rect(ctx, x, q.y - 6, 4, q.h, OUTLINE);
      rect(ctx, x + 1, q.y - 5, 2, q.h - 2, C.walnut);
    }
    // A brass sign on the railing.
    const sx = Math.min(q.x + q.w - 40, door + 20);
    rect(ctx, sx, q.y - 10, 30, 7, OUTLINE);
    rect(ctx, sx + 1, q.y - 9, 28, 5, C.brass);
    drawPixelText(ctx, "SNUG", sx + 15 - pixelTextWidth("SNUG") / 2, q.y - 9, C.walnutDk);
  } else if (r.kind === "server") {
    // The storeroom: brick walls, the door at the top right.
    const door = r.doorX ?? q.x + q.w - 12;
    const top = (x: number, w: number) => {
      if (w <= 0) return;
      const g = new Grid(w, 9);
      for (let y = 0; y < 9; y++) for (let xx = 0; xx < w; xx++) g.set(xx, y, y % 4 === 3 || (xx + (Math.floor(y / 4) % 2 ? 4 : 0)) % 8 === 7 ? C.mortar : C.brick);
      g.hline(0, 0, w, C.brickHi);
      g.outline(OUTLINE);
      paint(ctx, g, x, q.y - 9);
    };
    top(q.x - 2, door - 7 - (q.x - 2));
    top(door + 7, q.x + q.w + 2 - (door + 7));
    for (const x of [q.x - 3, q.x + q.w - 1]) {
      rect(ctx, x, q.y - 8, 4, q.h + 6, OUTLINE);
      rect(ctx, x + 1, q.y - 7, 2, q.h + 4, C.brickLo);
    }
    // A sign over the door gap.
    rect(ctx, door - 14, q.y - 16, 28, 7, OUTLINE);
    rect(ctx, door - 13, q.y - 15, 26, 5, C.cream);
    drawPixelText(ctx, "STAFF", door - pixelTextWidth("STAFF") / 2, q.y - 15, C.rustLo);
  }
}

// ------------------------------------------------------------------ fixtures

function windowFrame(ctx: CanvasRenderingContext2D, win: Rect): void {
  const { x, y, w, h } = win;
  const g = new Grid(w + 2, h + 6);
  g.rect(1, 1, w, h, C.green);
  g.rect(1, 1, w, 1, C.greenHi);
  g.rect(0, h + 1, w + 2, 3, C.walnutHi).rect(0, h + 1, w + 2, 1, "#c08a5a");
  g.outline(OUTLINE);
  // The glass, with one thin mullion and a transom bar near the top.
  const tr = Math.min(9, Math.floor(h / 4));
  const mx = Math.floor(w / 2);
  for (let j = 4; j < h - 1; j++) {
    for (let i = 5; i < w - 3; i++) {
      if (j === tr || (w > 56 && i === mx)) continue;
      g.set(i, j, null);
    }
  }
  paint(ctx, g, x - 1, y - 1);
  // Gold-leaf lettering on the transom (from inside it reads backwards: just the arc and dots).
  ctx.fillStyle = C.brassHi;
  for (let i = 8; i < w - 8; i += 3) ctx.fillRect(x + i, y + 4 + Math.round(Math.abs(i - w / 2) / (w / 6)), 1, 1);
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
  g.rect(6, 7, d.w - 6, d.h - 16, "#9cc3d2");
  g.rect(6, 7, d.w - 6, 2, "#c7e2ec");
  g.set(8, 12, "#ffffff").set(9, 11, "#ffffff");
  g.rect(5, d.h - 6, d.w - 4, 4, C.greenLo);
  // The push bar and the hinge side.
  g.rect(d.w - 2, 22, 2, 8, C.brass).set(d.w - 2, 22, C.brassHi);
  g.outline(OUTLINE);
  paint(ctx, g, d.x - 3, d.y - 3);
  // OPEN sign on a string.
  rect(ctx, d.x + 4, d.y + 14, 12, 6, OUTLINE);
  rect(ctx, d.x + 5, d.y + 15, 10, 4, C.cream);
  rect(ctx, d.x + 6, d.y + 16, 8, 1, C.rust);
  rect(ctx, d.x + 7, d.y + 17, 6, 1, C.rust);
  rect(ctx, d.x + 9, d.y + 10, 1, 4, C.walnutDk);
  // The bell on its curly bracket, above the frame on the hinge side.
  rect(ctx, d.x + d.w - 2, d.y - 4, 4, 1, C.iron);
  rect(ctx, d.x + d.w, d.y - 3, 3, 3, OUTLINE);
  rect(ctx, d.x + d.w, d.y - 3, 2, 2, C.brassHi);
  // The "+" plate: a new thread.
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, C.green);
  sg.rect(6, 2, 2, 5, C.cream).rect(4, 4, 6, 1, C.cream);
  sg.outline(OUTLINE);
  paint(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
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
