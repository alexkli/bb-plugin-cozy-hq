// Redwood Camp backdrop: forest floor, trails, deck platforms, the treeline
// along the top, tents, the cabin and the camp fixtures.
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { blit, Grid, hash, mix, OUTLINE, parseColor, rect, rng, shade } from "../../themekit.ts";
import { barkFill, boards, C, hlog, logEnd, plaidFill } from "./kit.ts";
import { paintBridges, paintCreek, treeShadows } from "./forest.ts";
import { noticeBoard, paintGap, paintTreeline, trailhead } from "./treeline.ts";
import { campData } from "./plan.ts";
import { paintBellPeak, paintDeskTent, paintTentShells } from "./tents.ts";

type Ctx = CanvasRenderingContext2D;

function paintGrid(ctx: Ctx, g: Grid, x: number, y: number): void {
  blit(ctx, g.toCanvas(), x, y);
}

/** Smooth value noise in 0..1 (a coarse lattice, bilinear). */
function valueNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const v = (i: number, j: number) => (hash(`${seed}:${i}:${j}`) % 1000) / 1000;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = v(gx, gy) + (v(gx + 1, gy) - v(gx, gy)) * sx;
  const b = v(gx, gy + 1) + (v(gx + 1, gy + 1) - v(gx, gy + 1)) * sx;
  return a + (b - a) * sy;
}

// ------------------------------------------------------------------ the forest floor

function forestFloor(ctx: Ctx, L: Layout): void {
  const W = L.W;
  const H = L.H;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const pal = {
    moss: ["#4f6a36", "#587640", "#66844a"].map((c) => parseColor(c)),
    soil: ["#5e4630", "#664c34", "#70563a"].map((c) => parseColor(c)),
    needle: ["#6a4c32", "#74523a", "#80603f"].map((c) => parseColor(c)),
    edge: ["#5a5a38", "#5e6038", "#64663e"].map((c) => parseColor(c)),
  };
  // Blend the soil toward a warm duff color so the floor reads calm.
  for (let by = 0; by < H; by += 2) {
    for (let bx = 0; bx < W; bx += 2) {
      const f = valueNoise(bx, by, 46, 11) * 0.7 + valueNoise(bx, by, 13, 12) * 0.3;
      const k = hash(`f${bx},${by}`) % 100;
      let set = pal.soil;
      if (f > 0.64) set = pal.moss;
      else if (f > 0.6) set = k % 2 ? pal.moss : pal.edge;
      else if (f > 0.57) set = k % 3 ? pal.edge : pal.soil;
      else if (f < 0.4) set = pal.needle;
      const idx = k < 68 ? 1 : k < 88 ? 0 : 2;
      const [r, g, b] = set[idx]!;
      for (let yy = by; yy < Math.min(H, by + 2); yy++) {
        for (let xx = bx; xx < Math.min(W, bx + 2); xx++) {
          const i = (yy * W + xx) * 4;
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  // Fallen needles, twigs, pebbles, little tufts of clover.
  const r = rng(hash(`floor-${W}x${H}`));
  const n = Math.round((W * H) / 70);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    const f = valueNoise(x, y, 46, 11);
    const roll = r();
    if (roll < 0.62) {
      ctx.fillStyle = r() < 0.5 ? "#8e6440" : "#7e5634";
      const dir = r() < 0.5 ? 1 : -1;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + dir, y + 1, 1, 1);
      if (r() < 0.5) ctx.fillRect(x + dir * 2, y + 2, 1, 1);
    } else if (roll < 0.74) {
      ctx.fillStyle = f > 0.6 ? "#76924e" : "#7a5e40";
      ctx.fillRect(x, y, 1, 1);
    } else if (roll < 0.8) {
      ctx.fillStyle = C.stoneDk;
      ctx.fillRect(x, y + 1, 3, 1);
      ctx.fillStyle = C.stone;
      ctx.fillRect(x, y, 2, 1);
    } else if (roll < 0.86 && f > 0.5) {
      // Clover / sorrel tuft
      ctx.fillStyle = C.fernHi;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
      ctx.fillRect(x + 1, y - 1, 1, 1);
      ctx.fillStyle = C.fern;
      ctx.fillRect(x + 1, y, 1, 1);
    } else if (roll < 0.9) {
      // A twig
      ctx.fillStyle = C.walnutLo;
      ctx.fillRect(x, y, 4, 1);
      ctx.fillRect(x + 4, y - 1, 2, 1);
    }
  }
}

/** A boardwalk along a hallway (horizontal) or an aisle (vertical). */
function boardwalk(ctx: Ctx, x: number, y: number, w: number, h: number, vertical: boolean, seed: number): void {
  const r = rng(seed);
  // Shadow it casts on the forest floor.
  ctx.fillStyle = "rgba(30,18,10,0.28)";
  if (vertical) ctx.fillRect(x + w, y, 2, h);
  else ctx.fillRect(x, y + h, w, 2);
  const tones = [C.deck, C.deckLo, C.deck, C.deckHi, mix(C.deck, C.porch, 0.4)];
  if (vertical) {
    for (let yy = y; yy < y + h; yy += 4) {
      const c = tones[Math.floor(r() * tones.length)]!;
      rect(ctx, x, yy, w, 3, c);
      rect(ctx, x, yy, w, 1, mix(c, C.deckHi, 0.5));
      rect(ctx, x, yy + 3, w, 1, C.deckGap);
      ctx.fillStyle = C.deckGap;
      ctx.fillRect(x + 2, yy + 1, 1, 1);
      ctx.fillRect(x + w - 3, yy + 1, 1, 1);
    }
    rect(ctx, x, y, 1, h, C.deckGap);
    rect(ctx, x + w - 1, y, 1, h, C.deckGap);
  } else {
    for (let xx = x; xx < x + w; xx += 4) {
      const c = tones[Math.floor(r() * tones.length)]!;
      rect(ctx, xx, y, 3, h, c);
      rect(ctx, xx, y, 1, h, mix(c, C.deckHi, 0.5));
      rect(ctx, xx + 3, y, 1, h, C.deckGap);
      ctx.fillStyle = C.deckGap;
      ctx.fillRect(xx + 1, y + 2, 1, 1);
      ctx.fillRect(xx + 1, y + h - 3, 1, 1);
    }
    rect(ctx, x, y, w, 1, C.deckGap);
    rect(ctx, x, y + h - 1, w, 1, C.deckGap);
  }
}

/** A packed-dirt forest trail along a hallway or an aisle: wobbly edges, pebbles, roots across it. */
function dirtTrail(ctx: Ctx, L: Layout, pos: number, vertical: boolean, from: number, seed: number): void {
  const r = rng(seed);
  const len = vertical ? L.H - from : L.W;
  const half = 7;
  const edge = (i: number) => Math.round(Math.sin(i * 0.071 + seed) * 1.6 + Math.sin(i * 0.19 + seed * 2) * 0.9);
  for (let i = 0; i < len; i++) {
    const a = -half + edge(i);
    const b = half + edge(i + 37);
    const at = (o: number, n: number, c: string) => (vertical ? rect(ctx, pos + o, from + i, n, 1, c) : rect(ctx, i, pos + o, 1, n, c));
    at(a - 1, 1, "#4a3826");
    at(a, b - a, "#8a6c4c");
    at(a + 2, b - a - 4, "#957652");
    at(a, 1, "#6e5238");
    at(b - 1, 1, "#6e5238");
    // Pebbles, needles and a root now and then
    if (r() < 0.09) at(a + 2 + Math.floor(r() * (b - a - 4)), 1, r() < 0.5 ? C.stoneHi : "#7a5e40");
    if (r() < 0.05) at(a + 1 + Math.floor(r() * (b - a - 2)), 1, "#b17845");
    if (r() < 0.012) {
      // A root crossing the trail
      for (let o = a - 2; o < b + 2; o++) {
        const wob = Math.round(Math.sin(o * 0.6) * 0.8);
        if (vertical) rect(ctx, pos + o, from + i + wob, 1, 2, C.walnutLo);
        else rect(ctx, i + wob, pos + o, 2, 1, C.walnutLo);
      }
    }
  }
}

// ------------------------------------------------------------------ decks and rugs

type Boards = { hi: string; base: string; lo: string; gap: string };
const PORCH: Boards = { hi: C.porchHi, base: C.porch, lo: C.porchLo, gap: C.porchGap };
const PINE: Boards = { hi: "#dcb67e", base: "#c69c62", lo: "#ab814c", gap: "#6e4c2c" };
const STAINED: Boards = { hi: "#9e6e50", base: "#875a40", lo: "#734a34", gap: "#40261a" };
const GREYED: Boards = { hi: "#9a8a76", base: "#857664", lo: "#726454", gap: "#463c32" };
const SMOKED: Boards = { hi: "#a07458", base: "#8a6048", lo: "#76503a", gap: "#46281c" };
const CABIN: Boards = { hi: "#9a6a48", base: "#7f5236", lo: "#6a4129", gap: "#3e2416" };

/** A raised deck platform: boards, a beam edge, and its shadow on the ground. */
function deck(ctx: Ctx, r: Rect, pal: Boards, seed: number, plank = 5): void {
  ctx.fillStyle = "rgba(25,15,8,0.32)";
  ctx.fillRect(r.x + 2, r.y + r.h, r.w, 2);
  ctx.fillRect(r.x + r.w, r.y + 2, 2, r.h);
  const g = new Grid(r.w, r.h);
  boards(g, 0, 0, r.w, r.h, pal, plank, seed);
  // Edge beam
  g.rect(0, 0, r.w, 1, pal.gap).rect(0, r.h - 2, r.w, 1, pal.lo).rect(0, r.h - 1, r.w, 1, pal.gap);
  g.rect(0, 0, 1, r.h, pal.gap).rect(r.w - 1, 0, 1, r.h, pal.gap);
  paintGrid(ctx, g, r.x, r.y);
}

/** A woven jute rug with a striped border. */
function wovenRug(ctx: Ctx, r: Rect, a: string, b: string, stripe: string, stripe2: string): void {
  const g = new Grid(r.w, r.h);
  g.rrect(0, 0, r.w, r.h, shade(a, -0.2), 2);
  for (let y = 1; y < r.h - 1; y++) {
    for (let x = 1; x < r.w - 1; x++) g.set(x, y, (x + (y >> 1)) % 4 < 2 ? a : b);
  }
  const s = 3;
  for (const [o, c] of [
    [s, stripe],
    [s + 2, stripe2],
  ] as const) {
    g.rect(o, o, r.w - o * 2, 1, c).rect(o, r.h - 1 - o, r.w - o * 2, 1, c);
    g.rect(o, o, 1, r.h - o * 2, c).rect(r.w - 1 - o, o, 1, r.h - o * 2, c);
  }
  // Fringe on the short ends
  for (let y = 2; y < r.h - 2; y += 2) g.set(0, y, a).set(r.w - 1, y, a);
  paintGrid(ctx, g, r.x, r.y);
}

function buffaloRug(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const g = new Grid(w, h);
  g.rrect(0, 0, w, h, "#2a1e20", 2);
  plaidFill(g, 2, 2, w - 4, h - 4, "#a8352f", "#6e1f22", "#241a1c", 4);
  g.rect(1, 1, w - 2, 1, "#3a2a2a").rect(1, h - 2, w - 2, 1, "#3a2a2a");
  for (let x = 2; x < w - 2; x += 2) g.set(x, 0, "#c9b48a").set(x, h - 1, "#c9b48a");
  paintGrid(ctx, g, x, y);
}

function flagstones(ctx: Ctx, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#4d4334");
  const rr = rng(hash(`flag-${r.x}-${r.y}`));
  const tones = ["#9c968a", "#8c867a", "#a8a294", "#948a7a", "#878f86"];
  for (let y = r.y + 1, row = 0; y < r.y + r.h - 1; row++) {
    const h = 7 + Math.floor(rr() * 3);
    let x = r.x + 1 - (row % 2 ? 5 : 0);
    while (x < r.x + r.w - 1) {
      const w = 9 + Math.floor(rr() * 8);
      const x0 = Math.max(r.x + 1, x);
      const x1 = Math.min(r.x + r.w - 1, x + w - 1);
      const y1 = Math.min(r.y + r.h - 1, y + h - 1);
      if (x1 - x0 >= 2 && y1 - y >= 2) {
        const c = tones[Math.floor(rr() * tones.length)]!;
        rect(ctx, x0, y, x1 - x0, y1 - y, c);
        rect(ctx, x0, y, x1 - x0, 1, shade(c, 0.12));
        rect(ctx, x0, y1 - 1, x1 - x0, 1, shade(c, -0.12));
        ctx.fillStyle = "#4d4334";
        ctx.fillRect(x0, y, 1, 1);
        ctx.fillRect(x1 - 1, y1 - 1, 1, 1);
        if (rr() < 0.3) {
          ctx.fillStyle = shade(c, -0.08);
          ctx.fillRect(x0 + 2 + Math.floor(rr() * Math.max(1, x1 - x0 - 4)), y + 2 + Math.floor(rr() * Math.max(1, y1 - y - 4)), 2, 1);
        }
      }
      if (rr() < 0.22) {
        ctx.fillStyle = C.mossHi;
        ctx.fillRect(x1, y + 2, 1, 2);
      }
      x += w;
    }
    y += h;
  }
}

function grassLawn(ctx: Ctx, r: Rect): void {
  const rr = rng(hash(`lawn-${r.x}-${r.y}`));
  for (let y = r.y; y < r.y + r.h; y += 3) {
    for (let x = r.x; x < r.x + r.w; x += 3) rect(ctx, x, y, Math.min(3, r.x + r.w - x), Math.min(3, r.y + r.h - y), ((x * 7 + y * 3) >> 2) % 3 === 0 ? "#6f9a44" : "#77a24a");
  }
  for (let i = 0; i < (r.w * r.h) / 14; i++) {
    const x = r.x + Math.floor(rr() * r.w);
    const y = r.y + 1 + Math.floor(rr() * (r.h - 2));
    ctx.fillStyle = rr() < 0.5 ? "#5e8a3a" : "#8cba58";
    ctx.fillRect(x, y, 1, 2);
  }
  for (let i = 0; i < r.w / 9; i++) {
    const x = r.x + 2 + Math.floor(rr() * (r.w - 4));
    const y = r.y + 2 + Math.floor(rr() * (r.h - 4));
    ctx.fillStyle = rr() < 0.5 ? "#f4f0dc" : "#f2d24a";
    ctx.fillRect(x, y, 1, 1);
  }
  // Chalk lines of a lawn court
  ctx.fillStyle = "rgba(244,244,226,0.55)";
  ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, 1);
  ctx.fillRect(r.x + 6, r.y + r.h - 7, r.w - 12, 1);
  ctx.fillRect(r.x + 6, r.y + 6, 1, r.h - 12);
  ctx.fillRect(r.x + r.w - 7, r.y + 6, 1, r.h - 12);
  rect(ctx, r.x, r.y, r.w, 1, "#5e8a3a");
}

function mossCarpet(ctx: Ctx, r: Rect): void {
  const rr = rng(hash(`moss-${r.x}-${r.y}`));
  for (let y = r.y; y < r.y + r.h; y += 2) {
    for (let x = r.x; x < r.x + r.w; x += 2) {
      const k = hash(`m${x},${y}`) % 10;
      rect(ctx, x, y, 2, 2, k < 6 ? C.moss : k < 9 ? C.mossHi : C.mossDk);
    }
  }
  for (let i = 0; i < (r.w * r.h) / 30; i++) {
    ctx.fillStyle = rr() < 0.5 ? C.mossLt : C.fernHi;
    ctx.fillRect(r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1);
  }
}

function steppingStones(ctx: Ctx, r: Rect, y: number): void {
  for (let x = r.x + 10; x < r.x + r.w - 10; x += 15) {
    const yy = y + Math.round(Math.sin(x * 0.09) * 3);
    const g = new Grid(11, 7);
    g.ellipse(5, 3, 4.6, 2.6, C.stone);
    g.ellipse(4.5, 2.5, 3, 1.4, C.stoneHi);
    g.set(7, 4, C.stoneDk).set(8, 3, C.stoneDk);
    g.outline("#3e3a30");
    paintGrid(ctx, g, x - 1, yy - 1);
  }
}

/** The packed-earth clearing around the campfire. */
function clearing(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  const w = Math.ceil(rx * 2 + 4);
  const h = Math.ceil(ry * 2 + 4);
  const g = new Grid(w, h);
  const ox = w / 2 - 0.5;
  const oy = h / 2 - 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - ox) / rx;
      const dy = (y - oy) / ry;
      const q = dx * dx + dy * dy;
      if (q > 1.05) continue;
      const k = hash(`c${x},${y}`) % 100;
      // Ragged dithered edge into the forest floor.
      if (q > 0.86 && k < (q - 0.86) * 520) continue;
      g.set(x, y, k < 60 ? "#8a6a4a" : k < 85 ? "#977754" : "#7a5c3f");
    }
  }
  // Sand flecks
  for (let i = 0; i < (w * h) / 22; i++) {
    const x = hash(`sx${i}`) % w;
    const y = hash(`sy${i}`) % h;
    if (g.get(x, y)) g.set(x, y, i % 3 ? "#a88a66" : "#6e5238");
  }
  paintGrid(ctx, g, Math.round(cx - w / 2), Math.round(cy - h / 2));
}

function concretePad(ctx: Ctx, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#7a7c74");
  for (let i = 0; i < (r.w * r.h) / 12; i++) {
    const k = hash(`cp${i}`);
    ctx.fillStyle = k % 3 ? "#868880" : "#6c6e66";
    ctx.fillRect(r.x + (k % r.w), r.y + ((k >> 8) % r.h), 1, 1);
  }
  ctx.fillStyle = "#64665e";
  for (let x = r.x + 24; x < r.x + r.w; x += 24) ctx.fillRect(x, r.y, 1, r.h);
  ctx.fillRect(r.x, r.y + Math.floor(r.h / 2), r.w, 1);
  rect(ctx, r.x, r.y + r.h - 2, r.w, 2, "#8fd0a0");
  rect(ctx, r.x, r.y + r.h - 2, r.w, 1, "#c8f0b0");
}

/** The sofa islands of the waiting porch, as the layout places them. */
function porchIslands(r: Rect): { cx: number; cy: number }[] {
  const islandW = 84;
  const cols = Math.max(1, Math.floor((r.w - 10) / islandW));
  const x0 = r.x + Math.round((r.w - cols * islandW) / 2) + islandW / 2;
  const out: { cx: number; cy: number }[] = [];
  for (let cy = r.y + 50; cy + 30 <= r.y + r.h; cy += 72) {
    for (let col = 0; col < cols; col++) out.push({ cx: Math.round(x0 + col * islandW), cy });
  }
  return out;
}

// ------------------------------------------------------------------ room shells

function tentWalls(ctx: Ctx, room: Room, atWall: boolean): void {
  const r = room.rect;
  const top = r.y - (atWall ? 2 : 6);
  const h = r.h + (atWall ? 2 : 6);
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, top, 3, h, C.canvasLo);
    rect(ctx, x + 1, top, 1, h, C.canvasHi);
    rect(ctx, x, top, 1, h, C.canvasDk);
    // Poles
    for (const py of [top, top + Math.floor(h / 2) - 2, top + h - 4]) {
      rect(ctx, x, py, 3, 4, C.logDk);
      rect(ctx, x + 1, py, 1, 4, C.log);
    }
  }
  // Inside the side walls: the canvas slopes in a little (a soft shadow).
  ctx.fillStyle = "rgba(60,40,20,0.16)";
  ctx.fillRect(r.x + 1, r.y, 3, r.h - 10);
  ctx.fillRect(r.x + r.w - 4, r.y, 3, r.h - 10);
  // A scalloped valance under the ridge, with a pennant here and there.
  const vy = atWall ? r.y : r.y - 1;
  for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
    const k = (x - r.x) % 10;
    const drop = k < 1 || k > 8 ? 2 : k < 2 || k > 7 ? 3 : 4;
    rect(ctx, x, vy, 1, drop, k === 5 ? C.canvasHi : C.canvas);
    rect(ctx, x, vy + drop, 1, 1, C.canvasDk);
    rect(ctx, x, vy, 1, 1, C.logDk);
  }
  ctx.fillStyle = "rgba(40,25,10,0.14)";
  ctx.fillRect(r.x + 1, vy + 5, r.w - 2, 2);
  // Guy ropes out from the front corners to little stakes.
  const rope = "#8f7b58";
  for (const [x, dir] of [
    [r.x - 2, -1],
    [r.x + r.w, 1],
  ] as const) {
    const y0 = r.y + r.h - 3;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = rope;
      ctx.fillRect(x + dir * (i + 1), y0 + Math.floor(i * 0.9), 1, 1);
    }
    ctx.fillStyle = C.logDk;
    ctx.fillRect(x + dir * 9, y0 + 6, 1, 3);
    ctx.fillStyle = C.logHi;
    ctx.fillRect(x + dir * 9, y0 + 6, 1, 1);
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      rect(ctx, x, r.y - 8, 1, 1, C.logDk);
      rect(ctx, x, r.y - 7, 1, 2, C.canvasHi);
      rect(ctx, x, r.y - 5, 1, 3, C.canvas);
      rect(ctx, x, r.y - 2, 1, 1, (x - r.x) % 6 < 3 ? C.plaid : C.canvasDk);
      rect(ctx, x, r.y - 1, 1, 1, C.canvasDk);
    }
  }
}

function hutWalls(ctx: Ctx, room: Room, atWall: boolean): void {
  const r = room.rect;
  const top = r.y - (atWall ? 2 : 6);
  const h = r.h + (atWall ? 2 : 6);
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, top, 3, h, "#6c7a66");
    for (let y = top; y < top + h; y += 2) rect(ctx, x, y, 3, 1, "#879680");
    rect(ctx, x, top, 1, h, "#4a5646");
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      // Solar panels along the roof edge.
      const cell = (x - r.x + 200) % 10;
      rect(ctx, x, r.y - 8, 1, 1, "#3a4048");
      rect(ctx, x, r.y - 7, 1, 4, cell === 0 ? "#8fa0b8" : (x + 1) % 3 === 0 ? "#2d4a7a" : "#355a8f");
      rect(ctx, x, r.y - 5, 1, 1, "#8fa0b8");
      rect(ctx, x, r.y - 3, 1, 2, x % 2 ? "#879680" : "#6c7a66");
      rect(ctx, x, r.y - 1, 1, 1, "#4a5646");
    }
  }
}

function cabinWalls(ctx: Ctx, room: Room, atWall: boolean): void {
  const r = room.rect;
  const top = r.y - (atWall ? 2 : 8);
  const h = r.h + (atWall ? 2 : 8);
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, top, 3, h, C.logLo);
    rect(ctx, x, top, 1, h, C.logHi);
    rect(ctx, x + 2, top, 1, h, C.logDk);
    for (let y = top + 5; y < top + h; y += 9) rect(ctx, x + 1, y, 1, 2, C.logDk);
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    const g = new Grid(r.w + 8, 9);
    hlog(g, 0, 0, r.w + 8, 4, hash(`cab-${r.x}`), false);
    hlog(g, 0, 4, r.w + 8, 4, hash(`cab2-${r.x}`), false);
    for (const lx of [1, r.w + 6]) {
      logEnd(g, lx, 1.5, 1.5, 1.5);
      logEnd(g, lx, 5.5, 1.5, 1.5);
    }
    g.rect(0, 8, r.w + 8, 1, C.walnutDk);
    if (gap >= 0) {
      const gx = gap - (r.x - 4);
      g.rect(gx - 9, 0, 18, 9, null);
      g.rect(gx - 10, 0, 1, 9, C.logDk).rect(gx + 9, 0, 1, 9, C.logDk);
    }
    paintGrid(ctx, g, r.x - 4, r.y - 9);
    if (gap >= 0) {
      // Threshold plank in the doorway.
      rect(ctx, gap - 9, r.y - 2, 18, 2, C.logLo);
      rect(ctx, gap - 9, r.y - 2, 18, 1, C.logHi);
    }
  }
}

// ------------------------------------------------------------------ fixtures

function pinboard(ctx: Ctx, r: Rect): void {
  const { x, y, w, h } = r;
  const g = new Grid(w + 2, h + 2);
  barkFill(g, 1, 1, w, h, 77);
  // Turn the bark texture horizontal on the top and bottom rails.
  for (let i = 1; i <= w; i++) {
    g.set(i, 1, C.barkLt).set(i, 2, C.barkHi).set(i, 3, C.barkMid);
    g.set(i, h - 2, C.barkMid).set(i, h - 1, C.bark).set(i, h, C.barkDk);
  }
  g.rect(4, 4, w - 6, h - 6, "#c99a64");
  for (let i = 0; i < 260; i++) g.set(4 + ((i * 37) % (w - 6)), 4 + ((i * 53 + (i >> 3)) % (h - 6)), i % 3 ? "#b8875a" : "#d9ad78");
  // Twine lashings at the corners.
  for (const [cx, cy] of [
    [2, 2],
    [w - 1, 2],
    [2, h - 1],
    [w - 1, h - 1],
  ] as const) {
    g.set(cx - 1, cy - 1, C.canvasHi).set(cx, cy, C.canvasHi).set(cx + 1, cy + 1, C.canvasHi);
    g.set(cx + 1, cy - 1, C.canvas).set(cx - 1, cy + 1, C.canvas);
  }
  g.outline(OUTLINE);
  paintGrid(ctx, g, x - 1, y - 1);
}

function calendar(ctx: Ctx, c: Rect): void {
  const g = new Grid(c.w + 2, c.h + 4);
  g.rect(1, 3, c.w, c.h, "#f4ecd4");
  g.rect(1, 3, c.w, 7, "#3f6b3a");
  g.rect(1, 3, c.w, 1, "#5a8a4a");
  g.rect(1, c.h + 1, c.w, 2, "#ddd0ae");
  for (let x = 3; x < c.w; x += 3) g.set(x, c.h, "#e6dcc0");
  g.outline(OUTLINE);
  // Hung from a nail by twine.
  const mid = Math.floor((c.w + 2) / 2);
  g.set(mid, 0, C.ironHi).set(mid - 1, 1, "#9a7a4e").set(mid + 1, 1, "#9a7a4e").set(mid - 2, 2, "#9a7a4e").set(mid + 2, 2, "#9a7a4e");
  paintGrid(ctx, g, c.x - 1, c.y - 3);
}

function statusBoard(ctx: Ctx, s: Rect): void {
  const g = new Grid(s.w + 2, s.h + 2);
  g.rect(1, 1, s.w, s.h, C.logLo);
  g.rect(1, 1, s.w, 1, C.logHi);
  g.rect(2, 2, s.w - 2, s.h - 2, "#232a26");
  g.set(s.w - 2, s.h - 1, "#e8e4d8").set(s.w - 3, s.h - 1, "#e8e4d8");
  g.outline(OUTLINE);
  paintGrid(ctx, g, s.x - 1, s.y - 1);
}

function legend(ctx: Ctx, n: Rect): void {
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, "#f6e6a6");
  g.rect(1, 1, n.w, 2, "#e2c46a");
  g.set(n.w, n.h, "#e8d590").set(n.w - 1, n.h, "#e8d590");
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, "#6b4a2e").set(qx + 2, 5, "#6b4a2e").set(qx + 1, 6, "#6b4a2e").set(qx + 1, 8, "#6b4a2e");
  g.outline(OUTLINE);
  paintGrid(ctx, g, n.x - 1, n.y - 1);
  rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, C.plaid);
}

function cuckooClock(ctx: Ctx, k: { x: number; y: number; r: number }): void {
  const { x, y, r } = k;
  const W = r * 2 + 13;
  const H = r * 2 + 24;
  const cx = Math.floor(W / 2);
  const top = 7;
  const cy = top + r + 2;
  const g = new Grid(W, H);
  // Pine-cone weights on chains
  for (const [wx, len] of [
    [cx - 3, 9],
    [cx + 3, 6],
  ] as const) {
    for (let j = 0; j < len; j++) g.set(wx, cy + r + 2 + j, j % 2 ? C.brass : "#a8822a");
    const wy = cy + r + 2 + len;
    g.rect(wx - 1, wy, 3, 4, C.walnut).set(wx, wy, C.walnutHi).set(wx - 1, wy + 2, C.walnutLo).set(wx + 1, wy + 1, C.walnutLo).set(wx, wy + 4, C.walnutLo);
  }
  // Pendulum leaf
  g.set(cx, cy + r + 2, C.brass).set(cx, cy + r + 3, C.brass).rect(cx - 1, cy + r + 4, 3, 2, "#5a8a4a").set(cx, cy + r + 6, "#3f6b3a");
  // House body
  g.rect(cx - r - 3, top + 2, r * 2 + 7, r * 2 + 3, C.walnut);
  g.rect(cx - r - 3, top + 2, 1, r * 2 + 3, C.walnutHi);
  g.rect(cx - r - 3, top + r * 2 + 4, r * 2 + 7, 1, C.walnutLo);
  // Roof
  for (let j = 0; j < top + 3; j++) {
    const half = Math.round((j / (top + 2)) * (r + 6));
    g.rect(cx - half, j, half * 2 + 1, 1, j === top + 2 ? C.walnutDk : j % 2 ? "#5a3622" : "#6e432a");
  }
  g.rect(cx - 2, top - 3, 5, 4, C.walnutDk).rect(cx - 1, top - 2, 3, 3, "#2a1810");
  // Carved leaves on the corners
  for (const lx of [cx - r - 2, cx + r + 2]) g.set(lx, top + 3, "#5a8a4a").set(lx, top + 4, "#3f6b3a");
  // Dial
  g.ellipse(cx, cy, r, r, C.brass);
  g.ellipse(cx, cy, r - 1.5, r - 1.5, "#fbf3e0");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.set(cx + Math.round(Math.sin(a) * (r - 2.6)), cy - Math.round(Math.cos(a) * (r - 2.6)), i % 3 === 0 ? C.walnutDk : "#c9b48a");
  }
  g.outline(OUTLINE);
  paintGrid(ctx, g, x - cx, y - cy);
}

// ------------------------------------------------------------------ the steps

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    forestFloor(ctx, L);
    treeShadows(ctx, L);
    paintCreek(ctx, L);
    const depth = Math.min(...L.segments.map((s) => s.depth));
    if (campData(L)?.trails) {
      for (const [i, ax] of L.net.aisles.entries()) dirtTrail(ctx, L, ax, true, depth, 31 + i);
      for (const [i, hy] of L.net.halls.entries()) dirtTrail(ctx, L, hy, false, 0, 17 + i);
      // Plank footbridges where the trails cross the creek.
      const c = campData(L)?.creek;
      if (c) {
        for (const [i, hy] of L.net.halls.entries()) {
          const cx = c.pts.reduce((best, p) => (Math.abs(p.y - hy) < Math.abs(best.y - hy) ? p : best)).x;
          boardwalk(ctx, cx - c.w / 2 - 6, hy - 7, c.w + 12, 14, false, 70 + i);
        }
      }
    } else {
      for (const [i, ax] of L.net.aisles.entries()) boardwalk(ctx, ax - 6, depth, 12, L.H - depth, true, 31 + i);
      for (const [i, hy] of L.net.halls.entries()) boardwalk(ctx, 0, hy - 7, L.W, 14, false, 17 + i);
    }
    paintBridges(ctx, L);
  },
  wall(ctx, L) {
    // No wall out here: the treeline.
    paintTreeline(ctx, L);
  },
  pods(ctx, L) {
    const pals = [STAINED, GREYED, SMOKED];
    const tents = campData(L)?.tents;
    if (tents) {
      tents.forEach((t, i) => {
        deck(ctx, { x: t.x - 6, y: t.y - 1, w: t.w + 12, h: t.h + 3 }, pals[i % pals.length]!, 51 + i);
        paintDeskTent(ctx, t);
      });
      return;
    }
    L.pods.forEach((pod, i) => deck(ctx, { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 }, pals[i % pals.length]!, 51 + i));
  },
  room(ctx, room, L) {
    const r = room.rect;
    switch (room.kind) {
      case "meeting":
        deck(ctx, r, PINE, 61, 6);
        wovenRug(ctx, { x: r.x + 6, y: r.y + 8, w: r.w - 12, h: r.h - 20 }, "#d9c49a", "#c9b285", "#b5653a", "#2f6b62");
        if (campData(L)?.tents) {
          // An octagonal platform: the corners are forest floor.
          for (let j = 0; j < 9; j++) {
            ctx.fillStyle = j === 8 ? C.deckGap : "#5c4631";
            for (const [cx, cy, dx, dy] of [
              [r.x, r.y, 1, 1],
              [r.x + r.w - 1, r.y, -1, 1],
              [r.x, r.y + r.h - 1, 1, -1],
              [r.x + r.w - 1, r.y + r.h - 1, -1, -1],
            ] as const) {
              const len = 9 - j;
              ctx.fillRect(dx > 0 ? cx : cx - len + 1, cy + dy * j, len, 1);
            }
          }
          paintBellPeak(ctx, r);
        }
        break;
      case "boss": {
        deck(ctx, r, CABIN, 71, 7);
        const w = Math.min(r.w - 30, 110);
        const h = Math.min(r.h - 40, 64);
        buffaloRug(ctx, r.x + Math.round((r.w - w) / 2) + 6, r.y + 22, w, h);
        break;
      }
      case "waiting":
        deck(ctx, r, PORCH, 81, 6);
        for (const { cx, cy } of porchIslands(r)) wovenRug(ctx, { x: cx - 36, y: cy - 22, w: 72, h: 46 }, "#4f7a6a", "#5d8a78", C.cream, "#c4552d");
        break;
      case "kitchen":
        if (campData(L)?.tents) {
          // An open pavilion: a timber platform under the counter, a flagstone patio round the island.
          deck(ctx, { x: r.x - 3, y: r.y - 13, w: r.w + 6, h: 36 }, PINE, 91, 5);
          const patio: Rect = { x: r.x + 4, y: r.y + 24, w: r.w - 8, h: r.h - 22 };
          flagstones(ctx, patio);
          // Round off the patio's corners into the forest floor.
          for (let j = 0; j < 6; j++) {
            const len = 6 - j;
            ctx.fillStyle = "#5c4631";
            ctx.fillRect(patio.x, patio.y + patio.h - 1 - j, len, 1);
            ctx.fillRect(patio.x + patio.w - len, patio.y + patio.h - 1 - j, len, 1);
          }
        } else flagstones(ctx, r);
        break;
      case "games":
        grassLawn(ctx, r);
        break;
      case "library":
        mossCarpet(ctx, r);
        steppingStones(ctx, r, r.y + r.h - 12);
        break;
      case "garden":
        mossCarpet(ctx, r);
        steppingStones(ctx, r, r.y + r.h - 16);
        break;
      case "server":
        concretePad(ctx, r);
        break;
      case "lounge": {
        const c = L.couch;
        clearing(ctx, c.x + c.w / 2, c.y - 6, 70, 40);
        break;
      }
      default:
        break;
    }
    paintTentShells(ctx, room, L);
  },
  roomWalls(ctx, room, L) {
    if (!room.walls) return;
    // Out in the woods every room is freestanding, its back to the treeline at most.
    const atWall = false;
    void L;
    if (room.walls === "wood") cabinWalls(ctx, room, atWall);
    else if (room.kind === "server") hutWalls(ctx, room, atWall);
    else tentWalls(ctx, room, atWall);
  },
  window: (ctx, win) => paintGap(ctx, win),
  pinboard: (ctx, r) => noticeBoard(ctx, r, pinboard),
  calendar: (ctx, c) => calendar(ctx, c),
  status: (ctx, s) => statusBoard(ctx, s),
  door: (ctx, d) => trailhead(ctx, d),
  legend: (ctx, n) => legend(ctx, n),
  clock: (ctx, k) => cuckooClock(ctx, k),
};

