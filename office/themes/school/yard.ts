// School scenery: the schoolyard and the building's structure. The covered
// walkway and front wall, the asphalt with painted games, the grass field,
// the playground, the garden beds, the fence and the gate; the portable
// classroom; half-walls around the open rooms; and the play equipment.
import { drawPixelText, Grid, mix, rect, rng, shade } from "../../themekit.ts";
import type { Layout, Rect } from "../../layout.ts";
import { C, CRAYONS, OUTLINE, sprite, stamp } from "./kit.ts";
import type { SchoolPlan } from "./plan.ts";

// ------------------------------------------------------------------ the corridor

/** The main corridor: polished terrazzo with blue borders. */
export function paintCorridor(ctx: CanvasRenderingContext2D, L: Layout, y: number): void {
  const top = y - 9;
  const h = 19;
  rect(ctx, 0, top, L.W, h, "#efe8da");
  const rand = rng(y * 31 + 7);
  for (let i = 0; i < (L.W * h) / 7; i++) {
    const c = ["#d9cfbd", "#c9d8e6", "#e8c9b8", "#fbf8f1", "#bdb3a0"][i % 5]!;
    rect(ctx, Math.floor(rand() * L.W), top + Math.floor(rand() * h), 1, 1, c);
  }
  for (let x = 0; x < L.W; x += 48) rect(ctx, x, top + 1, 1, h - 2, "#e2dacb");
  rect(ctx, 0, top, L.W, 1, C.blueLo);
  rect(ctx, 0, top + 1, L.W, 1, C.blueHi);
  rect(ctx, 0, top + h - 2, L.W, 1, C.blueHi);
  rect(ctx, 0, top + h - 1, L.W, 1, C.blueLo);
}

/** Half-walls around an open room, with doorways where people come in. */
export function paintHalfWalls(ctx: CanvasRenderingContext2D, w: SchoolPlan["walls"][number], L: Layout): void {
  const r = w.rect;
  const seg = L.segments.find((s) => r.x + r.w / 2 >= s.x0 && r.x + r.w / 2 < s.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 2;
  const gapW = 14;
  const open = (side: string, at: number) => w.gaps.some((g) => g.side === side && Math.abs(g.at - at) <= gapW / 2);
  const top = "#f4ecd9";
  const face = "#cfc3a8";
  // Horizontal walls: outline, cap, face. Vertical: outline, cap, outline.
  const hwall = (y: number, side: "top" | "bottom") => {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (open(side, x)) continue;
      rect(ctx, x, y, 1, 1, OUTLINE);
      rect(ctx, x, y + 1, 1, 2, top);
      rect(ctx, x, y + 3, 1, 2, face);
      rect(ctx, x, y + 5, 1, 1, OUTLINE);
    }
  };
  const vwall = (x: number, side: "left" | "right") => {
    for (let y = r.y + (atWall ? 0 : 0); y < r.y + r.h; y++) {
      if (open(side, y)) continue;
      rect(ctx, x, y, 1, 1, OUTLINE);
      rect(ctx, x + 1, y, 2, 1, top);
      rect(ctx, x + 3, y, 1, 1, OUTLINE);
    }
  };
  if (!atWall) hwall(r.y - 3, "top");
  hwall(r.y + r.h - 3, "bottom");
  vwall(r.x - 2, "left");
  vwall(r.x + r.w - 2, "right");
  // Door frames at the openings.
  for (const g of w.gaps) {
    const frame = C.blueLo;
    if (g.side === "left" || g.side === "right") {
      const x = g.side === "left" ? r.x - 2 : r.x + r.w - 2;
      rect(ctx, x, g.at - gapW / 2 - 1, 4, 1, frame);
      rect(ctx, x, g.at + gapW / 2, 4, 1, frame);
      rect(ctx, x + 1, g.at - gapW / 2, 2, gapW, "rgba(120,100,80,0.12)");
    } else {
      const y = g.side === "top" ? r.y - 3 : r.y + r.h - 3;
      if (g.side === "top" && atWall) continue;
      rect(ctx, g.at - gapW / 2 - 1, y, 1, 6, frame);
      rect(ctx, g.at + gapW / 2, y, 1, 6, frame);
      rect(ctx, g.at - gapW / 2, y + 2, gapW, 2, "rgba(120,100,80,0.12)");
    }
  }
}

// ------------------------------------------------------------------ the yard

function grass(ctx: CanvasRenderingContext2D, r: Rect, stripes = true): void {
  for (let x = r.x; x < r.x + r.w; x += 10) {
    rect(ctx, x, r.y, Math.min(10, r.x + r.w - x), r.h, stripes && ((x - r.x) / 10) % 2 ? "#86c766" : "#7dbd5e");
  }
  const rand = rng(r.x * 13 + r.y);
  for (let i = 0; i < (r.w * r.h) / 30; i++) rect(ctx, r.x + Math.floor(rand() * r.w), r.y + Math.floor(rand() * r.h), 1, 2, i % 3 ? "#6aa84f" : "#9ad67a");
}

function asphalt(ctx: CanvasRenderingContext2D, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#a3a6ad");
  const rand = rng(r.y * 7 + 3);
  for (let i = 0; i < (r.w * r.h) / 6; i++) rect(ctx, r.x + Math.floor(rand() * r.w), r.y + Math.floor(rand() * r.h), 1, 1, i % 2 ? "#979aa2" : "#afb2b8");
}

function chips(ctx: CanvasRenderingContext2D, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#c99c64");
  const rand = rng(r.x * 3 + r.y * 5);
  for (let i = 0; i < (r.w * r.h) / 4; i++) rect(ctx, r.x + Math.floor(rand() * r.w), r.y + Math.floor(rand() * r.h), 2, 1, ["#b5864f", "#dbb27a", "#a8763f"][i % 3]!);
  rect(ctx, r.x, r.y, r.w, 1, "#8a6a42");
}

function hopscotch(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const paint = "#f4f1ea";
  const sq = (sx: number, sy: number, n: number) => {
    rect(ctx, sx, sy, 9, 1, paint);
    rect(ctx, sx, sy + 8, 9, 1, paint);
    rect(ctx, sx, sy, 1, 9, paint);
    rect(ctx, sx + 8, sy, 1, 9, paint);
    drawPixelText(ctx, String(n), sx + 3, sy + 2, CRAYONS[n % CRAYONS.length]!);
  };
  sq(x, y, 1);
  sq(x + 8, y, 2);
  sq(x + 16, y - 4, 3);
  sq(x + 16, y + 4, 4);
  sq(x + 24, y, 5);
  sq(x + 32, y - 4, 6);
  sq(x + 32, y + 4, 7);
}

function fourSquare(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const cols = [C.red, C.yellow, C.blue, C.green];
  cols.forEach((c, i) => {
    const qx = x + (i % 2) * s;
    const qy = y + Math.floor(i / 2) * s;
    ctx.fillStyle = mix(c, "#a3a6ad", 0.35);
    ctx.fillRect(qx + 1, qy + 1, s - 2, s - 2);
  });
  rect(ctx, x, y, s * 2, 1, "#f4f1ea");
  rect(ctx, x, y + s * 2 - 1, s * 2, 1, "#f4f1ea");
  rect(ctx, x, y, 1, s * 2, "#f4f1ea");
  rect(ctx, x + s * 2 - 1, y, 1, s * 2, "#f4f1ea");
  rect(ctx, x + s, y, 1, s * 2, "#f4f1ea");
  rect(ctx, x, y + s, s * 2, 1, "#f4f1ea");
}

export function paintYard(ctx: CanvasRenderingContext2D, L: Layout, P: SchoolPlan): void {
  if (!P.yard || P.walk === null) return;
  const W = L.W;
  const H = L.H;
  const walkTop = P.front + 2;
  const walkBottom = P.walk + 8;
  // Asphalt everywhere outside, the walkway on top.
  asphalt(ctx, { x: 0, y: walkBottom, w: W, h: H - walkBottom });
  rect(ctx, 0, walkTop, W, walkBottom - walkTop, "#d8d3c8");
  for (let x = 8; x < W; x += 24) rect(ctx, x, walkTop, 1, walkBottom - walkTop, "#c4beb1");
  rect(ctx, 0, walkBottom - 1, W, 1, "#b0a998");
  rect(ctx, 0, walkBottom, W, 2, "rgba(40,40,50,0.12)");
  // The building's front wall (brick), with double doors where the aisles come through.
  const doors = L.net.aisles;
  for (let x = 0; x < W; x++) {
    if (doors.some((a) => Math.abs(x - a) <= 9)) continue;
    rect(ctx, x, P.front - 2, 1, 1, OUTLINE);
    rect(ctx, x, P.front - 1, 1, 2, (x >> 3) % 2 ? "#c86b52" : "#b85c46");
    rect(ctx, x, P.front + 1, 1, 1, "#8f4436");
    rect(ctx, x, P.front + 2, 1, 1, OUTLINE);
  }
  for (const a of doors) {
    // Open double doors and a mat.
    rect(ctx, a - 10, P.front - 4, 2, 8, C.blueLo);
    rect(ctx, a + 9, P.front - 4, 2, 8, C.blueLo);
    rect(ctx, a - 7, P.front + 3, 14, 4, "#6b5a4a");
    rect(ctx, a - 6, P.front + 4, 12, 2, "#8a7660");
  }
  // Walkway roof posts.
  for (let x = 20; x < W - 10; x += 44) {
    if (doors.some((a) => Math.abs(x - a) < 16) || (P.gate && Math.abs(x - P.gate.x) < 14)) continue;
    rect(ctx, x - 1, walkBottom - 4, 4, 4, OUTLINE);
    rect(ctx, x, walkBottom - 3, 2, 2, "#e9e4da");
  }
  // The grass field, with a white line round it and a center circle.
  if (P.field) {
    const f = P.field;
    grass(ctx, f);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(f.x + 3, f.y + 3, f.w - 6, 1);
    ctx.fillRect(f.x + 3, f.y + f.h - 4, f.w - 6, 1);
    ctx.fillRect(f.x + 3, f.y + 3, 1, f.h - 6);
    ctx.fillRect(f.x + f.w - 4, f.y + 3, 1, f.h - 6);
    const cx = Math.round(f.x + f.w / 2);
    ctx.fillRect(cx, f.y + 3, 1, f.h - 6);
    const g = new Grid(31, 21);
    g.ellipse(15, 10, 14, 9, "#ffffffbf");
    g.ellipse(15, 10, 13, 8, "#00000000");
    for (let i = 0; i < g.px.length; i++) if (g.px[i] === "#00000000") g.px[i] = null;
    stamp(ctx, g, cx - 15, Math.round(f.y + f.h / 2) - 10);
  }
  if (P.swings) chips(ctx, { x: P.swings.x - 2, y: P.swings.y + 14, w: P.swings.w + 4, h: P.swings.h - 12 });
  if (P.slide) chips(ctx, { x: P.slide.x - 2, y: P.slide.y + 14, w: P.slide.w + 4, h: P.slide.h - 12 });
  // The playground corner: a sandbox, hopscotch and four square.
  if (P.playground) {
    const p = P.playground;
    const sb = { x: p.x + p.w - 62, y: p.y + p.h - 34, w: 40, h: 26 };
    rect(ctx, sb.x, sb.y, sb.w, sb.h, OUTLINE);
    rect(ctx, sb.x + 1, sb.y + 1, sb.w - 2, sb.h - 2, C.maple);
    rect(ctx, sb.x + 1, sb.y + 1, sb.w - 2, 1, C.mapleHi);
    rect(ctx, sb.x + 4, sb.y + 4, sb.w - 8, sb.h - 8, "#f0d9a0");
    const rand = rng(sb.x);
    for (let i = 0; i < 40; i++) rect(ctx, sb.x + 4 + Math.floor(rand() * (sb.w - 8)), sb.y + 4 + Math.floor(rand() * (sb.h - 8)), 1, 1, "#e0c487");
    // A bucket and a spade
    rect(ctx, sb.x + 9, sb.y + 8, 5, 5, OUTLINE);
    rect(ctx, sb.x + 10, sb.y + 9, 3, 3, C.red);
    rect(ctx, sb.x + 24, sb.y + 12, 6, 1, C.blue);
    rect(ctx, sb.x + 28, sb.y + 11, 3, 3, C.blue);
    // A sand castle
    rect(ctx, sb.x + 17, sb.y + 7, 5, 4, "#d9b874");
    rect(ctx, sb.x + 17, sb.y + 6, 1, 1, "#d9b874");
    rect(ctx, sb.x + 21, sb.y + 6, 1, 1, "#d9b874");
    const hx = P.portable ? p.x + 8 : p.x + 48;
    hopscotch(ctx, hx, p.y + 14);
    if (p.w >= 150 && p.h >= 30) fourSquare(ctx, hx + 50, p.y + 4, Math.min(13, Math.floor((p.h - 6) / 2)));
  }
  // The school garden: grass, raised beds, a gravel path.
  if (P.garden) {
    const r = P.garden;
    grass(ctx, r, false);
    rect(ctx, r.x, r.y + r.h - 12, r.w, 7, "#d6cdb8");
    const rand = rng(r.x + 99);
    for (let i = 0; i < r.w; i++) rect(ctx, r.x + Math.floor(rand() * r.w), r.y + r.h - 12 + Math.floor(rand() * 7), 1, 1, "#bdb29a");
    const beds = Math.max(1, Math.floor((r.w - 40) / 46));
    for (let b = 0; b < beds; b++) {
      const bx = r.x + 30 + b * 46;
      const by = r.y + 4;
      if (bx + 38 > r.x + r.w - 4) break;
      rect(ctx, bx, by, 38, 14, OUTLINE);
      rect(ctx, bx + 1, by + 1, 36, 12, C.mapleLo);
      rect(ctx, bx + 3, by + 3, 32, 8, "#6b4a32");
      for (let x = bx + 5; x < bx + 34; x += 5) {
        rect(ctx, x, by + 4, 3, 2, "#5cb860");
        rect(ctx, x + 1, by + 3, 1, 1, "#8fd88a");
        rect(ctx, x + 1, by + 8, 1, 2, b % 2 ? "#e5544b" : "#f39a3d");
        rect(ctx, x, by + 7, 3, 1, "#5cb860");
      }
    }
  }
  // The fence along the bottom and the sides.
  const fy = H - 5;
  for (let x = 0; x < W; x++) {
    if (P.gate && Math.abs(x - P.gate.x) <= 12) continue;
    rect(ctx, x, fy, 1, 1, "#7a828c");
    if ((x + fy) % 3 === 0) rect(ctx, x, fy + 1, 1, 3, "#9aa3ad");
    rect(ctx, x, fy + 4, 1, 1, "#6b7280");
  }
  for (let x = 2; x < W; x += 16) {
    if (P.gate && Math.abs(x - P.gate.x) <= 12) continue;
    rect(ctx, x, fy - 3, 2, 8, "#5f6b78");
  }
  for (const x of [0, W - 2]) {
    for (let y = walkBottom; y < H; y++) rect(ctx, x, y, 2, 1, (y % 3 === 0) ? "#7a828c" : "#9aa3ad");
  }
}

/** A portable classroom: a raised floor with skirting, a ramp and steps. */
export function paintPortable(ctx: CanvasRenderingContext2D, r: Rect): void {
  const x = r.x - 6;
  const y = r.y - 4;
  const w = r.w + 12;
  const h = r.h + 8;
  rect(ctx, x, y, w, h, OUTLINE);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, "#d9cdb4");
  rect(ctx, x + 3, y + 3, w - 6, h - 8, "#e9e1cf");
  const rand = rng(r.x + r.y);
  for (let i = 0; i < (w * h) / 12; i++) rect(ctx, x + 3 + Math.floor(rand() * (w - 6)), y + 3 + Math.floor(rand() * (h - 8)), 1, 1, i % 2 ? "#ddd3bd" : "#f3ede0");
  // Skirting along the bottom and a little sign.
  rect(ctx, x + 1, y + h - 5, w - 2, 4, "#9aa3ad");
  for (let k = x + 4; k < x + w - 4; k += 4) rect(ctx, k, y + h - 4, 2, 2, "#7a828c");
  rect(ctx, x + 6, y + 1, 30, 7, C.blue);
  drawPixelText(ctx, "ROOM 9", x + 8, y + 2, "#ffffff");
}

// ------------------------------------------------------------------ play equipment (decor sprites)

/** The swing set: posts and bar behind the swinger, chains in front. */
export function swingBack(): HTMLCanvasElement {
  return sprite("swing-back", 34, 42, (g) => {
    const post = C.red;
    for (const px of [1, 30]) {
      g.rect(px, 3, 2, 37, post);
      g.rect(px + (px === 1 ? 2 : -2), 30, 2, 10, shade(post, -0.15));
    }
    g.rect(1, 2, 31, 3, post);
    g.rect(1, 2, 31, 1, C.redHi);
    for (const sx of [6, 18]) {
      g.rect(sx, 31, 9, 2, "#3a3a46");
      g.rect(sx, 31, 9, 1, "#55556a");
    }
  });
}

export function swingFront(): HTMLCanvasElement {
  return sprite("swing-front", 34, 42, (g) => {
    for (const sx of [6, 18]) {
      g.vline(sx, 5, 26, "#9aa3ad");
      g.vline(sx + 8, 5, 26, "#9aa3ad");
    }
  }, false);
}

export function slideSprite(): HTMLCanvasElement {
  return sprite("slide", 30, 42, (g) => {
    // Ladder
    g.rect(2, 10, 1, 30, C.blue).rect(9, 10, 1, 30, C.blue);
    for (let y = 14; y < 40; y += 4) g.rect(3, y, 6, 1, C.steelLo);
    // Platform and a little roof
    g.rect(1, 9, 12, 3, C.blue);
    g.rect(1, 9, 12, 1, C.blueHi);
    g.rect(0, 1, 14, 3, C.red).rect(1, 0, 12, 1, C.redHi);
    g.rect(1, 4, 1, 5, C.steelLo).rect(12, 4, 1, 5, C.steelLo);
    // The chute
    for (let k = 0; k < 17; k++) {
      const x = 12 + k;
      const y = 10 + Math.round(k * 1.7);
      g.rect(x, y, 1, 4, C.yellow);
      g.set(x, y, C.yellowHi).set(x, y + 3, C.yellowLo);
    }
    g.rect(27, 38, 2, 3, C.yellowLo);
  });
}

export function climberSprite(): HTMLCanvasElement {
  // A climbing dome of colored bars.
  return sprite("climber", 34, 24, (g) => {
    for (let k = 0; k < 4; k++) {
      const c = CRAYONS[k * 1 + 1]!;
      g.ellipse(16.5, 21, 15 - k * 4, 19 - k * 5, c);
      g.ellipse(16.5, 21, 14 - k * 4, 18 - k * 5, "#00000000");
    }
    for (let i = 0; i < g.px.length; i++) if (g.px[i] === "#00000000") g.px[i] = null;
    for (const x of [8, 16, 25]) g.vline(x, 4 + Math.abs(16 - x) / 2, 18 - Math.abs(16 - x) / 2, C.purple);
    g.rect(1, 22, 32, 1, null);
  }, ["#00000000"]);
}

export function shadeTree(): HTMLCanvasElement {
  return sprite("shade-tree", 40, 52, (g) => {
    g.rect(17, 30, 6, 20, "#7a5236");
    g.rect(17, 30, 2, 20, "#946640");
    g.rect(14, 48, 12, 2, "#6b4a32");
    const leaf = ["#4f9a4a", "#5fb058", "#7cc46a"];
    g.ellipse(20, 18, 18, 14, leaf[0]!);
    g.ellipse(17, 14, 13, 10, leaf[1]!);
    g.ellipse(13, 11, 6, 5, leaf[2]!);
    g.ellipse(26, 20, 7, 5, leaf[1]!);
    for (const [x, y] of [[9, 20], [28, 12], [20, 26], [31, 22]] as const) g.set(x, y, "#e5544b").set(x + 1, y, "#f2837a");
  });
}

export function busStop(): HTMLCanvasElement {
  return sprite("bus-stop", 14, 30, (g) => {
    g.rect(6, 9, 2, 20, C.steelLo);
    g.rect(1, 1, 12, 9, C.yellow);
    g.rect(1, 1, 12, 1, C.yellowHi);
    // A little bus on the sign
    g.rect(3, 4, 8, 3, OUTLINE);
    g.rect(4, 4, 6, 2, "#f2b21c");
    g.set(4, 7, OUTLINE).set(9, 7, OUTLINE);
    g.rect(4, 28, 6, 1, C.steelDk);
  });
}

export function lampPost(): HTMLCanvasElement {
  return sprite("lamp-post", 8, 40, (g) => {
    g.rect(3, 4, 2, 34, "#4b5563");
    g.rect(1, 1, 6, 4, "#3a3a46");
    g.rect(2, 4, 4, 1, "#fff3c0");
    g.rect(2, 37, 4, 2, "#3a3a46");
  });
}
