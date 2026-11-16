// Neon City backdrop: wet steel floors with neon trim, dark panel walls with
// signs, glass rooms with glowing frames, and the wall fixtures.
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { cached, carpet, classicProp, drawPixelText, Grid, hash, makeCanvas, OUTLINE, pixelTextWidth, rect, rng, tiles } from "../../themekit.ts";
import { glyph, P, perLayout, stamp } from "./kit.ts";
import { planOf, type Front, type NeonPlan } from "./plan.ts";

// ------------------------------------------------------------------ signs on the wall

export interface WallSign {
  x: number;
  y: number;
  /** The whole sign (plate, tubes), baked into the wall. */
  base: HTMLCanvasElement;
  /** Just the lit tubes, redrawn bright after dark. */
  lit: HTMLCanvasElement;
  color: string;
}

const WORDS: Record<string, string[]> = {
  kitchen: ["RAMEN", "NOODLE", "EAT"],
  lounge: ["CHILL", "RELAX"],
  meeting: ["PLAN", "SYNC"],
  pod: ["CODE", "BUILD", "SHIP", "HACK"],
  waiting: ["WAIT", "QUEUE"],
  boss: ["VIP", "BOSS"],
  games: ["PLAY", "GAME"],
  server: ["CORE"],
  library: ["DATA"],
  garden: ["GROW"],
  none: ["OPEN", "24H", "NEON", "LOFT"],
};

/** A sign of neon letters on a dark plate. */
function wordSign(text: string, color: string, scale: number): { base: HTMLCanvasElement; lit: HTMLCanvasElement } {
  return cached(`neon|word|${text}|${color}|${scale}`, () => {
    const tw = pixelTextWidth(text, scale);
    const w = tw + 6;
    const h = 5 * scale + 6;
    const lit = makeCanvas(w + 2, h + 2, (ctx) => {
      // A soft halo pixel ring around the letters, then the tubes.
      ctx.globalAlpha = 0.35;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) drawPixelText(ctx, text, 4 + dx, 4 + dy, color, scale);
      ctx.globalAlpha = 1;
      drawPixelText(ctx, text, 4, 4, color, scale);
      // Hot cores on bigger letters.
      if (scale > 1) {
        ctx.globalAlpha = 0.55;
        drawPixelText(ctx, text, 4, 4, "#ffffff", scale);
        ctx.globalAlpha = 1;
      }
    });
    const base = makeCanvas(w + 2, h + 2, (ctx) => {
      const g = new Grid(w + 2, h + 2);
      g.rect(1, 1, w, h, P.ink);
      g.rect(1, 1, w, 1, P.panel2);
      g.rect(2, h - 1, w - 2, 1, P.void);
      g.outline(OUTLINE);
      stamp(ctx, g, 0, 0);
      // Brackets on the wall.
      rect(ctx, 3, 0, 1, 1, P.steelHi);
      rect(ctx, w - 2, 0, 1, 1, P.steelHi);
      drawPixelText(ctx, text, 4, 4, color, scale);
    });
    return { base, lit };
  });
}

/** A tall sign of invented glyphs, the kind that hangs on every megacity wall. */
function glyphSign(seed: number, n: number, color: string): { base: HTMLCanvasElement; lit: HTMLCanvasElement } {
  return cached(`neon|glyphsign|${seed}|${n}|${color}`, () => {
    const w = 11;
    const h = n * 7 + 5;
    const marks: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      glyph(seed + i).forEach((row, y) => {
        for (let x = 0; x < 5; x++) if (row[x] === "#") marks.push([3 + x, 3 + i * 7 + y]);
      });
    }
    const draw = (ctx: CanvasRenderingContext2D, c: string) => {
      ctx.fillStyle = c;
      for (const [x, y] of marks) ctx.fillRect(x, y, 1, 1);
    };
    const lit = makeCanvas(w, h, (ctx) => {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      for (const [x, y] of marks) ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.globalAlpha = 1;
      draw(ctx, color);
    });
    const base = makeCanvas(w, h, (ctx) => {
      const g = new Grid(w, h);
      g.rect(1, 1, w - 2, h - 2, P.ink);
      g.rect(1, 1, w - 2, 1, color);
      g.rect(1, h - 2, w - 2, 1, color);
      g.outline(OUTLINE);
      stamp(ctx, g, 0, 0);
      draw(ctx, color);
    });
    // The rails are lit too.
    const litCtx = lit.getContext("2d")!;
    litCtx.fillStyle = color;
    litCtx.fillRect(1, 1, w - 2, 1);
    litCtx.fillRect(1, h - 2, w - 2, 1);
    return { base, lit };
  });
}

/** The vertical glyph signs that replace the paintings (16×32 like them). */
export function paintingSign(x: number): { base: HTMLCanvasElement; lit: HTMLCanvasElement; color: string } {
  const color = [P.mag, P.cyan, P.vio, P.yel][hash(`ps${x}`) % 4]!;
  return cached(`neon|psign|${x}`, () => {
    const marks: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      glyph(hash(`p${x}-${i}`) % 997).forEach((row, y) => {
        for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") marks.push([5 + xx, 4 + i * 8 + y]);
      });
    }
    const base = makeCanvas(16, 32, (ctx) => {
      const g = new Grid(16, 32);
      g.rect(3, 1, 10, 30, P.ink);
      g.rect(4, 2, 8, 28, P.void);
      g.rect(3, 1, 10, 1, P.steel);
      g.outline(OUTLINE);
      stamp(ctx, g, 0, 0);
      ctx.fillStyle = color;
      for (const [mx, my] of marks) ctx.fillRect(mx, my, 1, 1);
      ctx.fillRect(4, 2, 1, 28);
      ctx.fillRect(11, 2, 1, 28);
    });
    const lit = makeCanvas(16, 32, (ctx) => {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      for (const [mx, my] of marks) ctx.fillRect(mx - 1, my - 1, 3, 3);
      ctx.fillRect(3, 1, 3, 30);
      ctx.fillRect(10, 1, 3, 30);
      ctx.globalAlpha = 1;
      for (const [mx, my] of marks) ctx.fillRect(mx, my, 1, 1);
      ctx.fillRect(4, 2, 1, 28);
      ctx.fillRect(11, 2, 1, 28);
    });
    return { base, lit, color };
  });
}

/** Free stretches of wall, between windows, fixtures, pillars and tall furniture. */
function freeWall(L: Layout): { x0: number; x1: number; depth: number }[] {
  const busy: [number, number][] = [];
  const w = L.wall;
  busy.push([w.pinboard.x - 4, w.pinboard.x + w.pinboard.w + 4]);
  busy.push([w.calendar.x - 4, w.calendar.x + w.calendar.w + 4]);
  busy.push([w.legendNote.x - 4, w.door.x + w.door.w + 6]);
  busy.push([w.clock.x - w.clock.r - 5, w.clock.x + w.clock.r + 5]);
  for (const win of w.windows) busy.push([win.x - 4, win.x + win.w + 4]);
  for (const p of w.paintings) busy.push([p.x - 4, p.x + 20]);
  for (const pl of L.plants) if (pl.sprite === "HANGING_PLANT") busy.push([pl.x - 3, pl.x + 19]);
  for (const px of w.pillars) busy.push([px - 9, px + 9]);
  const tvSeg = L.segments.find((s) => L.tv.x >= s.x0 && L.tv.x < s.x1);
  if (tvSeg && L.tv.y < tvSeg.depth) busy.push([L.tv.x - 20, L.tv.x + L.tv.w + 20]);
  for (const p of L.props) {
    const seg = L.segments.find((s) => p.x >= s.x0 && p.x < s.x1);
    if (!seg || p.y > seg.depth - 16) continue;
    const c = classicProp(p, L);
    busy.push([p.x - 3, p.x + c.width + 3]);
  }
  const out: { x0: number; x1: number; depth: number }[] = [];
  for (const s of L.segments) {
    let x = s.x0 + 6;
    while (x < s.x1 - 6) {
      const hit = busy.find(([a, z]) => x >= a && x < z);
      if (hit) {
        x = hit[1];
        continue;
      }
      let end = x;
      while (end < s.x1 - 6 && !busy.some(([a, z]) => end >= a && end < z)) end++;
      if (end - x >= 14) out.push({ x0: x, x1: end, depth: s.depth });
      x = end + 1;
    }
  }
  return out;
}

/** Neon signs in the free stretches of wall (also used for their glow at night). */
export function wallSigns(L: Layout): WallSign[] {
  return perLayout("signs", L, () => {
    const signs: WallSign[] = [];
    let n = 0;
    for (const f of freeWall(L)) {
      const len = f.x1 - f.x0;
      const cx = (f.x0 + f.x1) / 2;
      const below = L.rooms
        .filter((r) => cx >= r.rect.x && cx < r.rect.x + r.rect.w && r.rect.y >= f.depth - 30)
        .sort((a, b) => a.rect.y - b.rect.y)[0];
      const words = WORDS[below?.kind ?? "none"] ?? WORDS.none!;
      const color = [P.mag, P.cyan, P.vio, P.yel, P.lime][(n + hash(`c${f.x0}`)) % 5]!;
      const word = words[(hash(`w${f.x0}`) + n) % words.length]!;
      const big = len >= pixelTextWidth(word, 2) + 14 && f.depth >= 72;
      const small = len >= pixelTextWidth(word) + 12;
      const top = 12;
      if (big || small) {
        const s = wordSign(word, color, big ? 2 : 1);
        const y = big ? top + 2 : top + 6 + ((n * 7) % 9);
        signs.push({ x: Math.round(cx - s.base.width / 2), y, base: s.base, lit: s.lit, color });
      } else if (f.depth >= 56) {
        const s = glyphSign(hash(`gs${f.x0}`) % 991, f.depth >= 76 ? 4 : 3, color);
        signs.push({ x: Math.round(cx - s.base.width / 2), y: top, base: s.base, lit: s.lit, color });
      } else continue;
      n++;
    }
    // Vertical glyph signs bolted to the pillars.
    L.wall.pillars.forEach((px, i) => {
      const left = L.segments.find((sg) => sg.x1 === px);
      const right = L.segments.find((sg) => sg.x0 === px);
      const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
      if (d < 56) return;
      const color = [P.mag, P.cyan, P.yel, P.vio][(i + 1) % 4]!;
      const s = glyphSign(hash(`pillar${px}`) % 977, d >= 80 ? 4 : 3, color);
      signs.push({ x: px - Math.floor(s.base.width / 2), y: 12, base: s.base, lit: s.lit, color });
    });
    return signs;
  });
}

// ------------------------------------------------------------------ floor

/** The hallway trim dashes on free floor (x, y, w, h), lit in turns by the underlay. */
export function floorDashes(L: Layout): { x: number; y: number; w: number; h: number; i: number }[] {
  return perLayout("dashes", L, () => {
    const blocked = (x: number, y: number) =>
      L.rooms.some((r) => x >= r.rect.x - 4 && x < r.rect.x + r.rect.w + 4 && y >= r.rect.y - 10 && y < r.rect.y + r.rect.h + 4) ||
      L.pods.some((p) => x >= p.x - 6 && x < p.x + p.w + 6 && y >= p.y - 2 && y < p.y + p.h + 4) ||
      L.segments.some((s) => x >= s.x0 && x < s.x1 && y < s.depth + 3);
    const out: { x: number; y: number; w: number; h: number; i: number }[] = [];
    const plan = planOf(L);
    for (const hy of L.net.halls) {
      const st = plan?.streets.find((q) => q.y === hy);
      const offs = st ? [-st.half + 1, st.half - 2] : [-11, 10];
      for (const dy of offs) {
        let i = 0;
        for (let x = 2; x < L.W - 4; x += 8) {
          if (blocked(x, hy + dy) || blocked(x + 4, hy + dy)) continue;
          if (st && L.net.aisles.some((ax) => Math.abs(x + 2 - ax) < 13)) continue;
          out.push({ x, y: hy + dy, w: 4, h: 1, i: i++ });
        }
      }
    }
    for (const ax of L.net.aisles) {
      for (const dx of [-11, 10]) {
        let i = 0;
        for (let y = 2; y < L.H - 4; y += 8) {
          if (blocked(ax + dx, y) || blocked(ax + dx, y + 4)) continue;
          if (L.net.halls.some((hy) => Math.abs(y + 2 - hy) < (plan?.streets.find((q) => q.y === hy)?.half ?? 10) + 6)) continue;
          out.push({ x: ax + dx, y, w: 1, h: 4, i: i++ });
        }
      }
    }
    return out;
  });
}

function floor(ctx: CanvasRenderingContext2D, L: Layout): void {
  rect(ctx, 0, 0, L.W, L.H, "#211c32");
  // Steel deck plates, staggered, with rivets.
  for (let row = 0; row * 16 < L.H; row++) {
    const y = row * 16;
    const off = (row % 2) * 16;
    rect(ctx, 0, y, L.W, 1, "#151224");
    rect(ctx, 0, y + 1, L.W, 1, "#29233e");
    for (let x = -off; x < L.W; x += 32) {
      rect(ctx, x, y, 1, 16, "#151224");
      rect(ctx, x + 1, y + 2, 1, 14, "#27213b");
      rect(ctx, x + 3, y + 3, 1, 1, "#352e50");
      rect(ctx, x + 28, y + 13, 1, 1, "#352e50");
    }
  }
  // Tread texture.
  for (let y = 5; y < L.H; y += 4) {
    for (let x = ((y >> 2) % 2) * 4 + 2; x < L.W; x += 8) rect(ctx, x, y, 2, 1, "#1d192d");
  }
  // Wet patches catching the neon.
  const r = rng(hash(`neon-floor-${L.W}x${L.H}`));
  const puddles = Math.round((L.W * L.H) / 7000);
  for (let i = 0; i < puddles; i++) {
    const px = Math.round(r() * L.W);
    const py = Math.round(r() * L.H);
    const pw = 10 + Math.round(r() * 26);
    const ph = 3 + Math.round(r() * 4);
    const g = new Grid(pw, ph);
    g.ellipse(pw / 2 - 0.5, ph / 2 - 0.5, pw / 2 - 0.5, ph / 2 - 0.5, "#1a1630");
    g.ellipse(pw / 2 - 0.5, ph / 2 - 0.5, pw / 2 - 3, Math.max(0.6, ph / 2 - 1.5), "#16132a");
    const streak = r() < 0.5 ? "#4a1d56" : "#17405a";
    g.hline(Math.round(pw * 0.25), Math.floor(ph / 2), Math.round(pw * 0.45), streak);
    stamp(ctx, g, px, py);
  }
  const plan = planOf(L);
  if (plan) {
    for (const ax of L.net.aisles) alley(ctx, L, ax);
    for (const st of plan.streets) street(ctx, L, st);
    if (plan.plaza) plazaFloor(ctx, plan.plaza);
  }
  // Hallway trim: dim neon dashes along both edges of every hallway and aisle.
  for (const d of floorDashes(L)) {
    rect(ctx, d.x, d.y, d.w, d.h, "#1a7488");
    rect(ctx, d.x - (d.w > 1 ? 0 : 0), d.y + d.h, d.w, 1, "#16112a");
  }
}

/** A back alley along an aisle: darker pavement between the rooms. */
function alley(ctx: CanvasRenderingContext2D, L: Layout, ax: number): void {
  const top = Math.max(...L.segments.filter((sg) => ax >= sg.x0 - 8 && ax <= sg.x1 + 8).map((sg) => sg.depth), 0);
  rect(ctx, ax - 7, top, 14, L.H - top, "#1a1626");
  for (let y = top + 3; y < L.H; y += 10) {
    rect(ctx, ax - 7, y, 14, 1, "#15121f");
    if (hash(`al${ax}${y}`) % 5 === 0) rect(ctx, ax - 4 + (hash(`b${y}`) % 6), y + 4, 3, 1, "#2a1f3e");
  }
  rect(ctx, ax - 7, top, 1, L.H - top, "#120f1c");
  rect(ctx, ax + 6, top, 1, L.H - top, "#120f1c");
}

/** The night-market street: wet asphalt, curbs, lane lines and crosswalks. */
function street(ctx: CanvasRenderingContext2D, L: Layout, st: NeonPlan["streets"][number]): void {
  const y0 = st.y - st.half;
  const y1 = st.y + st.half;
  rect(ctx, 0, y0, L.W, y1 - y0, "#191628");
  const r = rng(hash(`street${st.y}${L.W}`));
  for (let i = 0; i < (L.W * (y1 - y0)) / 10; i++) rect(ctx, Math.floor(r() * L.W), y0 + Math.floor(r() * (y1 - y0)), 1, 1, r() < 0.5 ? "#211d33" : "#13101d");
  // Puddles with long neon reflections.
  for (let i = 0; i < L.W / 70; i++) {
    const px = Math.floor(r() * L.W);
    const py = y0 + 3 + Math.floor(r() * Math.max(1, y1 - y0 - 8));
    const pw = 14 + Math.floor(r() * 24);
    rect(ctx, px, py, pw, 2, "#120f1a");
    rect(ctx, px + 2, py + 2, pw - 4, 1, "#120f1a");
    rect(ctx, px + 3, py, Math.floor(pw * 0.4), 1, r() < 0.5 ? "#5a1d5a" : "#174a64");
  }
  // Sidewalk curbs with a neon lip.
  rect(ctx, 0, y0 - 4, L.W, 4, "#332d4e");
  rect(ctx, 0, y0 - 4, L.W, 1, "#4e4772");
  rect(ctx, 0, y0 - 1, L.W, 1, P.cyanLo);
  rect(ctx, 0, y1, L.W, 4, "#2b2642");
  rect(ctx, 0, y1, L.W, 1, P.magLo);
  rect(ctx, 0, y1 + 1, L.W, 1, "#4a4368");
  rect(ctx, 0, y1 + 4, L.W, 1, "#0c0a14");
  // Lane edges and a dashed center line (amber).
  if (st.half >= 12) {
    rect(ctx, 0, y0 + 4, L.W, 1, "#2a2638");
    rect(ctx, 0, y1 - 5, L.W, 1, "#2a2638");
  }
  for (let x = 4; x < L.W; x += 16) rect(ctx, x, st.y + 4, 8, 1, "#9a7420");
  // Crosswalks where the alleys cross the street.
  for (const ax of L.net.aisles) {
    rect(ctx, ax - 11, y0, 22, y1 - y0, "#16131e");
    for (let x = ax - 10; x <= ax + 8; x += 4) rect(ctx, x, y0 + 2, 2, y1 - y0 - 4, "#56507a");
  }
  // Bollards along the curbs (their caps glow).
  const plan = planOf(L);
  for (const bo of plan?.bollards ?? []) {
    if (bo.y < y0 - 6 || bo.y > y1 + 6) continue;
    const c = (bo.x >> 3) % 2 ? P.mag : P.cyan;
    rect(ctx, bo.x - 2, bo.y - 6, 4, 8, OUTLINE);
    rect(ctx, bo.x - 1, bo.y - 5, 2, 6, "#4c4670");
    rect(ctx, bo.x - 1, bo.y - 5, 2, 2, c);
    rect(ctx, bo.x - 2, bo.y + 2, 4, 1, "rgba(0,0,0,0.4)");
  }
}

// ------------------------------------------------------------------ wall

function wall(ctx: CanvasRenderingContext2D, L: Layout): void {
  L.segments.forEach((sg, i) => {
    const d = sg.depth;
    const w = sg.x1 - sg.x0;
    rect(ctx, sg.x0, 0, w, d, "#1d1834");
    // Ceiling: a cable tray.
    rect(ctx, sg.x0, 0, w, 7, "#0f0c1d");
    rect(ctx, sg.x0, 7, w, 1, "#2b2448");
    for (let x = sg.x0 + 3; x < sg.x1; x += 9) rect(ctx, x, 5, 4, 1, "#1d1830");
    // Panels with seams and a few vents.
    const hs = Math.round(8 + (d - 20) * 0.58);
    for (let x = sg.x0 + 10 + ((i * 7) % 20); x < sg.x1 - 2; x += 26) {
      rect(ctx, x, 8, 1, d - 20, "#130f24");
      rect(ctx, x + 1, 8, 1, d - 20, "#26203f");
      if (hash(`vent${x}`) % 4 === 0) for (let k = 0; k < 3; k++) rect(ctx, x + 6, hs + 4 + k * 2, 10, 1, "#141022");
    }
    rect(ctx, sg.x0, hs, w, 1, "#130f24");
    rect(ctx, sg.x0, hs + 1, w, 1, "#26203f");
    // A darker lower band.
    rect(ctx, sg.x0, hs + 2, w, d - 14 - hs, "#191430");
    // Baseboard with an LED strip.
    const strip = i % 2 ? P.mag : P.cyan;
    const stripLo = i % 2 ? P.magLo : P.cyanLo;
    rect(ctx, sg.x0, d - 12, w, 12, "#100d1c");
    rect(ctx, sg.x0, d - 12, w, 1, "#2e2749");
    rect(ctx, sg.x0, d - 9, w, 1, strip);
    rect(ctx, sg.x0, d - 8, w, 1, stripLo);
    for (let x = sg.x0 + 6; x < sg.x1 - 4; x += 30) rect(ctx, x, d - 5, 8, 1, "#1d1830");
    rect(ctx, sg.x0, d - 2, w, 2, "#08060f");
    ctx.fillStyle = "rgba(4,2,10,0.4)";
    ctx.fillRect(sg.x0, d, w, 3);
  });
  // Steel pillars with a neon strip.
  for (const px of L.wall.pillars) {
    const left = L.segments.find((s) => s.x1 === px);
    const right = L.segments.find((s) => s.x0 === px);
    const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
    rect(ctx, px - 6, 0, 12, d + 4, OUTLINE);
    rect(ctx, px - 5, 0, 10, d + 4, "#2a2442");
    rect(ctx, px - 5, 0, 2, d + 4, "#3d3660");
    rect(ctx, px + 3, 0, 2, d + 4, "#1a1530");
    rect(ctx, px - 1, 4, 2, d - 6, P.vioDim);
    rect(ctx, px - 1, 6, 1, d - 10, P.vio);
    rect(ctx, px - 7, d - 3, 14, 7, OUTLINE);
    rect(ctx, px - 6, d - 2, 12, 5, "#2a2442");
    rect(ctx, px - 6, d - 2, 12, 1, "#4c4670");
  }
  for (const s of wallSigns(L)) ctx.drawImage(s.base, s.x, s.y);
}

// ------------------------------------------------------------------ rooms

const POD_TRIM = [P.cyanLo, P.magLo, P.vioLo];

function neonBorder(ctx: CanvasRenderingContext2D, r: Rect, color: string, inset = 2): void {
  rect(ctx, r.x + inset, r.y + inset, r.w - inset * 2, 1, color);
  rect(ctx, r.x + inset, r.y + r.h - inset - 1, r.w - inset * 2, 1, color);
  rect(ctx, r.x + inset, r.y + inset, 1, r.h - inset * 2, color);
  rect(ctx, r.x + r.w - inset - 1, r.y + inset, 1, r.h - inset * 2, color);
}

function pods(ctx: CanvasRenderingContext2D, L: Layout): void {
  L.pods.forEach((pod, i) => {
    const r = { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 };
    carpet(ctx, r, "#110e1a", "#171324", "#1e192e");
    neonBorder(ctx, r, POD_TRIM[i % POD_TRIM.length]!, 2);
    // Corner markers.
    for (const [cx, cy] of [[r.x + 4, r.y + 4], [r.x + r.w - 7, r.y + 4], [r.x + 4, r.y + r.h - 5], [r.x + r.w - 7, r.y + r.h - 5]] as const) rect(ctx, cx, cy, 3, 1, POD_TRIM[i % POD_TRIM.length]!);
    if (!planOf(L)) return;
    // Capsule hotel: every desk column is a lit capsule with rounded hatches.
    const trim = POD_TRIM[i % POD_TRIM.length]!;
    const cols = Math.round(pod.w / 48);
    for (let c = 0; c < cols; c++) {
      const x = pod.x + c * 48;
      ctx.drawImage(capsule(pod.h, trim, hash(`cap${i}-${c}`)), x, pod.y);
      const label = `${String.fromCharCode(65 + (i % 26))}${c + 1}`;
      drawPixelText(ctx, label, x + 6, pod.y + 5, trim);
    }
  });
}

/** One capsule: a rounded steel shell with a neon seam and hatch rings at both ends. */
function capsule(h: number, trim: string, seed: number): HTMLCanvasElement {
  return cached(`neon|capsule|${h}|${trim}|${seed % 3}`, () => {
    const g = new Grid(48, h);
    g.rrect(1, 1, 46, h - 2, "#2a2444", 10);
    g.rrect(2, 2, 44, h - 4, "#3d3660", 9);
    g.rrect(3, 3, 42, h - 6, trim, 9);
    g.rrect(4, 4, 40, h - 8, "#14101f", 8);
    // Hatch rings at the ends.
    for (const cy of [9, h - 10]) {
      for (let a = 0; a < Math.PI * 2; a += 0.09) {
        const x = Math.round(24 + Math.cos(a) * 12);
        const y = Math.round(cy + Math.sin(a) * 4);
        if (g.get(x, y) === "#14101f") g.set(x, y, "#2e2850");
      }
    }
    // A status light on each end.
    const led = [P.lime, P.yel, P.mag][seed % 3]!;
    g.set(40, 5, led).set(40, h - 6, led);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

// ------------------------------------------------------------------ storefronts

function awning(ctx: CanvasRenderingContext2D, f: Front, x0: number, x1: number): void {
  const lo = mixHex(f.color, "#120e1e", 0.55);
  for (let x = x0; x < x1; x++) {
    const stripe = Math.floor((x - f.x0) / 4) % 2 === 0;
    rect(ctx, x, f.y - 2, 1, 6, stripe ? f.color : lo);
    if ((x - f.x0) % 4 === 1) rect(ctx, x, f.y + 4, 2, 1, stripe ? f.color : lo);
  }
  rect(ctx, x0, f.y - 3, x1 - x0, 1, OUTLINE);
  rect(ctx, x0, f.y - 2, x1 - x0, 1, mixHex(f.color, "#ffffff", 0.35));
  rect(ctx, x0, f.y + 5, x1 - x0, 1, "rgba(0,0,0,0.35)");
}

function drawFront(ctx: CanvasRenderingContext2D, f: Front): void {
  // Split the front at its doorways.
  const spans: [number, number][] = [];
  let x = f.x0 + 2;
  for (const g of f.gaps) {
    if (g - 8 > x) spans.push([x, g - 8]);
    x = g + 8;
  }
  if (f.x1 - 2 > x) spans.push([x, f.x1 - 2]);
  if (f.side === "top") {
    // Below the street: an awning along the curb, noren on the ramen shop, lit mats at the doors.
    for (const [a, z] of spans) {
      awning(ctx, f, a, z);
      if (f.kind === "kitchen") {
        for (let nx = a + 2; nx + 7 <= z; nx += 9) {
          rect(ctx, nx, f.y + 5, 7, 7, "#7a1028");
          rect(ctx, nx, f.y + 5, 7, 1, "#a8183a");
          rect(ctx, nx + 2, f.y + 8, 3, 1, "#f4e8d8");
          rect(ctx, nx + 3, f.y + 7, 1, 3, "#f4e8d8");
        }
      }
    }
    for (const g of f.gaps) {
      rect(ctx, g - 6, f.y + 2, 12, 2, mixHex(f.color, "#120e1e", 0.6));
      rect(ctx, g - 5, f.y + 2, 10, 1, f.color);
    }
    // The shop sign sits up on the awning.
    const s = wordSign(f.sign, f.color, 1);
    const longest = spans.reduce((b, q) => (q[1] - q[0] > b[1] - b[0] ? q : b), spans[0] ?? [f.x0, f.x1]);
    if (longest[1] - longest[0] >= s.base.width + 4) ctx.drawImage(s.base, Math.round((longest[0] + longest[1]) / 2 - s.base.width / 2), f.y - 10);
  } else {
    // Above the street: a shop ledge with neon trim, roll-up shutters half open over the doors.
    for (const [a, z] of spans) {
      rect(ctx, a, f.y - 4, z - a, 5, "#1a1530");
      rect(ctx, a, f.y - 5, z - a, 1, OUTLINE);
      rect(ctx, a, f.y - 4, z - a, 1, f.color);
      rect(ctx, a, f.y + 1, z - a, 1, "#0c0a14");
      for (let k = a + 3; k < z - 2; k += 12) rect(ctx, k, f.y - 2, 6, 2, "#2a2444");
    }
    for (const g of f.gaps) {
      rect(ctx, g - 7, f.y - 12, 14, 7, OUTLINE);
      for (let yy = f.y - 11; yy < f.y - 6; yy++) rect(ctx, g - 6, yy, 12, 1, yy % 2 ? "#6a6694" : "#4c4670");
      rect(ctx, g - 6, f.y - 6, 12, 1, "#ffd23f");
    }
  }
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const c = (i: number) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * t).toString(16).padStart(2, "0");
  return `#${c(0)}${c(1)}${c(2)}`;
}

function parseHex(c: string): number[] {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

/** The plaza: big lit pavers and a neon ring in the middle. */
function plazaFloor(ctx: CanvasRenderingContext2D, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#1e1a30");
  for (let y = r.y; y < r.y + r.h; y += 10) {
    rect(ctx, r.x, y, r.w, 1, "#15121f");
    for (let x = r.x + ((y - r.y) % 20 ? 0 : 10); x < r.x + r.w; x += 20) rect(ctx, x, y, 1, 10, "#15121f");
  }
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + 2;
  for (const [k, c] of [[1, P.magLo], [0.62, P.cyanLo]] as const) {
    const rx = Math.min(r.w / 2 - 8, 60) * k;
    const ry = Math.min(r.h / 2 - 3, 16) * k;
    for (let a = 0; a < Math.PI * 2; a += 0.03) rect(ctx, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, c);
  }
  rect(ctx, r.x, r.y + r.h - 1, r.w, 1, "#2e2850");
}

function room(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  roomFloor(ctx, room, L);
  const plan = planOf(L);
  for (const f of plan?.fronts ?? []) if (f.kind === room.kind && f.x0 === room.rect.x) drawFront(ctx, f);
}

function roomFloor(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  switch (room.kind) {
    case "meeting": {
      // Dark glass tiles with a faint holo grid.
      tiles(ctx, r, "#1d2240", "#212746", 8);
      for (let x = r.x; x < r.x + r.w; x += 16) rect(ctx, x, r.y, 1, r.h, "#28305a");
      for (let y = r.y; y < r.y + r.h; y += 16) rect(ctx, r.x, y, r.w, 1, "#28305a");
      if (planOf(L)) {
        // The holo dome: projection rings on the floor and the ribs of the dome.
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h * 0.58;
        const rx0 = r.w / 2 - 6;
        const ry0 = Math.min(r.h * 0.42, rx0 * 0.62);
        for (const [k, c] of [[1, "#2b4a7a"], [0.72, "#244068"], [0.44, "#2e5a88"]] as const) {
          for (let a = 0; a < Math.PI * 2; a += 0.025) rect(ctx, Math.round(cx + Math.cos(a) * rx0 * k), Math.round(cy + Math.sin(a) * ry0 * k), 1, 1, c);
        }
        for (let s = 0; s < 8; s++) {
          const a = (s / 8) * Math.PI * 2;
          for (let f = 0.46; f < 1; f += 0.04) rect(ctx, Math.round(cx + Math.cos(a) * rx0 * f), Math.round(cy + Math.sin(a) * ry0 * f), 1, 1, "#223a60");
        }
      }
      break;
    }
    case "boss": {
      // Black marble with violet veins and a neon rug.
      rect(ctx, r.x, r.y, r.w, r.h, "#17121f");
      const rr = rng(hash(`marble${r.x}${r.y}`));
      for (let i = 0; i < (r.w * r.h) / 260; i++) {
        let x = r.x + rr() * r.w;
        let y = r.y + rr() * r.h;
        const len = 6 + rr() * 16;
        const dx = rr() * 2 - 1;
        for (let k = 0; k < len; k++) {
          rect(ctx, Math.round(x), Math.round(y), 1, 1, k % 5 === 0 ? "#3a2650" : "#261c34");
          x += dx;
          y += 0.6;
        }
      }
      for (let y = r.y + 12; y < r.y + r.h; y += 24) rect(ctx, r.x, y, r.w, 1, "#110d18");
      const rug = new Grid(Math.min(r.w - 30, 110), Math.min(r.h - 40, 64));
      rug.rrect(0, 0, rug.w, rug.h, "#2a0f2e", 3);
      rug.rrect(2, 2, rug.w - 4, rug.h - 4, P.magLo, 2);
      rug.rrect(3, 3, rug.w - 6, rug.h - 6, "#2a0f2e", 2);
      rug.rrect(7, 7, rug.w - 14, rug.h - 14, P.cyanLo, 1);
      rug.rrect(8, 8, rug.w - 16, rug.h - 16, "#1f0d26", 1);
      for (let x = 12; x < rug.w - 12; x += 8) rug.set(x, Math.floor(rug.h / 2), P.magLo).set(x + 1, Math.floor(rug.h / 2) - 1, P.magLo).set(x + 1, Math.floor(rug.h / 2) + 1, P.magLo);
      stamp(ctx, rug, r.x + Math.round((r.w - rug.w) / 2) + 6, r.y + 22);
      if (planOf(L)) {
        // A raised platform: a lit lip all round, steps down at the door.
        rect(ctx, r.x, r.y, r.w, 2, "#3a2a4a");
        rect(ctx, r.x, r.y + 2, r.w, 1, P.magLo);
        rect(ctx, r.x, r.y, 2, r.h, "#3a2a4a");
        rect(ctx, r.x + r.w - 2, r.y, 2, r.h, "#3a2a4a");
        rect(ctx, r.x + 2, r.y + r.h - 12, r.w - 4, 1, P.magLo);
        if (room.doorX !== undefined) for (let k = 0; k < 3; k++) rect(ctx, room.doorX - 8, r.y + 3 + k * 3, 16, 1, k % 2 ? "#4a3a5c" : "#2a1f36");
      }
      break;
    }
    case "waiting": {
      carpet(ctx, r, "#121a2a", "#18233a", "#1d2b46");
      // Hex dots and a cyan border.
      for (let y = r.y + 6; y < r.y + r.h - 4; y += 8) {
        for (let x = r.x + 6 + ((y - r.y) % 16 ? 4 : 0); x < r.x + r.w - 4; x += 8) rect(ctx, x, y, 2, 1, "#203454");
      }
      neonBorder(ctx, r, P.cyanLo, 2);
      if (planOf(L) && r.w >= 120) {
        // A departures-style board along the top: the queue for you.
        const bw = Math.min(r.w - 70, 120);
        const bx = r.x + 8;
        rect(ctx, bx - 1, r.y + 3, bw + 2, 9, OUTLINE);
        rect(ctx, bx, r.y + 4, bw, 7, "#0c0a14");
        drawPixelText(ctx, "QUEUE", bx + 3, r.y + 5, P.yel);
        rect(ctx, bx + 25, r.y + 5, 1, 5, "#3a3458");
        for (let x = bx + 29, k = 0; x < bx + bw - 6; x += 8, k++) {
          glyph(200 + k).forEach((row, yy) => {
            for (let xx = 0; xx < 5; xx++) if (row[xx] === "#" && yy < 5) rect(ctx, x + xx, r.y + 5 + yy, 1, 1, k % 3 === 0 ? P.cyan : "#b88a12");
          });
        }
      }
      break;
    }
    case "kitchen": {
      // A noodle bar: red-black tiles.
      tiles(ctx, r, "#2a121e", "#1d0d16", 6);
      for (let y = r.y; y < r.y + r.h; y += 6) rect(ctx, r.x, y, r.w, 1, "#150a10");
      neonBorder(ctx, r, P.redLo, 1);
      break;
    }
    case "games": {
      // A synthwave grid.
      rect(ctx, r.x, r.y, r.w, r.h, "#170c28");
      for (let x = r.x + 6; x < r.x + r.w; x += 12) rect(ctx, x, r.y, 1, r.h, "#3a1352");
      for (let y = r.y + 6; y < r.y + r.h; y += 12) rect(ctx, r.x, y, r.w, 1, "#3a1352");
      neonBorder(ctx, r, P.magLo, 1);
      break;
    }
    case "garden": {
      // A bio-dome: dark moss with glowing spores and lit stepping stones.
      for (let y = r.y; y < r.y + r.h; y += 4) {
        for (let x = r.x; x < r.x + r.w; x += 4) rect(ctx, x, y, 4, 4, ((x + y) >> 2) % 2 ? "#0f2522" : "#122a24");
      }
      const rr = rng(hash(`moss${r.x}`));
      for (let i = 0; i < (r.w * r.h) / 60; i++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, rr() < 0.2 ? "#3affc0" : rr() < 0.5 ? "#1d5a48" : "#174438");
      for (let x = r.x + 10; x < r.x + r.w - 10; x += 14) {
        const y = r.y + r.h - 18 + Math.round(Math.sin(x * 0.08) * 3);
        rect(ctx, x, y, 9, 5, "#2b2a3e");
        rect(ctx, x + 1, y, 7, 1, "#4a4866");
        rect(ctx, x, y + 5, 9, 1, P.cyanLo);
      }
      rect(ctx, r.x, r.y, r.w, 2, "#0a1a16");
      neonBorder(ctx, r, "#1f8a6a", 0);
      break;
    }
    case "server": {
      // The core: grating over a glowing underfloor.
      rect(ctx, r.x, r.y, r.w, r.h, "#0b1424");
      for (let y = r.y; y < r.y + r.h; y += 6) {
        for (let x = r.x; x < r.x + r.w; x += 6) {
          rect(ctx, x, y, 6, 1, "#1a2235");
          rect(ctx, x, y, 1, 6, "#1a2235");
          rect(ctx, x + 3, y + 3, 1, 1, (x + y) % 18 === 0 ? "#2ad0ff" : "#123048");
        }
      }
      rect(ctx, r.x, r.y + r.h - 2, r.w, 2, P.cyan);
      rect(ctx, r.x, r.y, r.w, 1, P.vio);
      break;
    }
    case "library":
      carpet(ctx, r, "#0f1c1c", "#142624", "#1a302d");
      neonBorder(ctx, r, "#1f8a6a", 2);
      break;
    case "lounge": {
      // A round rug with a neon ring under the capsule sofa.
      const c = L.couch;
      const rw = 124;
      const rh = 64;
      const g = new Grid(rw, rh);
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 2, rh / 2 - 2, P.magLo);
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 3, rh / 2 - 3, "#22102e");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 9, rh / 2 - 7, "#2a1438");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 16, rh / 2 - 12, P.vioDim);
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 17, rh / 2 - 13, "#2a1438");
      stamp(ctx, g, c.x + c.w / 2 - rw / 2, c.y - 30);
      break;
    }
    default:
      break;
  }
}

const ROOM_SIGNS: Partial<Record<Room["kind"], [string, string]>> = { boss: ["VIP", P.mag], meeting: ["PLAN", P.vio] };

/** A small neon sign on the top wall of a closed room (not against the back wall). */
export function roomSign(room: Room, L: Layout): { x: number; y: number; base: HTMLCanvasElement; color: string } | null {
  const r = room.rect;
  const def = ROOM_SIGNS[room.kind];
  if (!room.walls || !def) return null;
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  if (seg !== undefined && r.y <= seg.depth + 1) return null;
  // Not where another room's glass front sits right above.
  if (L.rooms.some((o) => o !== room && o.rect.x < r.x + r.w && o.rect.x + o.rect.w > r.x && o.rect.y + o.rect.h > r.y - 18 && o.rect.y + o.rect.h <= r.y + 2)) return null;
  const s = wordSign(def[0], def[1], 1);
  let cx = room.kind === "boss" && planOf(L) ? r.x + r.w * 0.68 : r.x + r.w / 2;
  if (room.doorSide === "top" && room.doorX !== undefined && Math.abs(room.doorX - cx) < s.base.width / 2 + 12) cx = r.x + r.w * 0.25;
  return { x: Math.round(cx - s.base.width / 2), y: r.y - 13, base: s.base, color: def[1] };
}

function roomWalls(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  if (!room.walls) return;
  const wood = room.walls === "wood";
  const frame = wood ? "#2a1a2a" : "#2b2546";
  const pane = wood ? P.magLo : P.cyanLo;
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 1;
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, r.y - (atWall ? 2 : 6), 3, r.h + (atWall ? 2 : 6), frame);
    rect(ctx, x + 1, r.y - (atWall ? 2 : 6), 1, r.h + (atWall ? 2 : 6), pane);
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      rect(ctx, x, r.y - 8, 1, 2, frame);
      rect(ctx, x, r.y - 7, 1, 1, pane);
      rect(ctx, x, r.y - 6, 1, 5, wood ? "#2a1430" : "#1e2448");
      rect(ctx, x, r.y - 1, 1, 1, frame);
    }
  }
  const sign = roomSign(room, L);
  if (sign) ctx.drawImage(sign.base, sign.x, sign.y);
  if (room.kind === "server" && planOf(L) && !atWall) {
    // The core sits behind a security grille, hazard stripes at the gate.
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      for (let y = r.y - 7; y < r.y - 1; y++) if ((x + y) % 4 === 0 || (x - y) % 4 === 0) rect(ctx, x, y, 1, 1, "#7a80a4");
    }
    if (room.doorX !== undefined) {
      for (const gx of [room.doorX - 10, room.doorX + 9]) for (let y = r.y - 8; y < r.y; y++) rect(ctx, gx, y, 1, 1, (y >> 1) % 2 ? P.yel : OUTLINE);
    }
  }
}

// ------------------------------------------------------------------ windows and fixtures

function window(ctx: CanvasRenderingContext2D, win: Rect): void {
  const { x, y, w, h } = win;
  const g = new Grid(w + 2, h + 6);
  g.rect(1, 1, w, h, "#221c3a");
  g.rect(1, 1, w, 1, "#3d3660");
  g.rect(2, 2, w - 2, 1, "#2d2649");
  const mx = Math.floor(w / 2);
  g.rect(mx, 1, 1, h, "#221c3a");
  // Sill with a neon lip.
  g.rect(0, h + 1, w + 2, 4, "#151126");
  g.rect(0, h + 1, w + 2, 1, P.cyan);
  g.rect(1, h + 2, w, 1, P.cyanLo);
  // Side jambs with tiny status LEDs.
  g.rect(1, 1, 3, h + 1, "#191430").rect(w - 2, 1, 3, h + 1, "#191430");
  g.set(2, 6, P.mag).set(2, 9, P.magLo).set(w - 1, 6, P.cyan).set(w - 1, 9, P.cyanLo);
  g.outline(OUTLINE);
  for (let j = 4; j < h - 2; j++) {
    for (let i = 5; i < w - 3; i++) {
      if (i === mx) continue;
      g.set(i, j, null);
    }
  }
  stamp(ctx, g, x - 1, y - 1);
}

function pinboard(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  const g = new Grid(w + 2, h + 2);
  g.rect(1, 1, w, h, "#2b2546");
  g.rect(1, 1, w, 1, P.vio);
  g.rect(2, h, w - 2, 1, P.vioLo);
  g.rect(4, 4, w - 6, h - 6, "#141024");
  for (let yy = 6; yy < h - 2; yy += 4) for (let xx = 6; xx < w - 2; xx += 4) g.set(xx, yy, "#201a36");
  g.set(3, 3, P.cyan).set(w - 2, 3, P.cyan);
  g.outline(OUTLINE);
  stamp(ctx, g, x - 1, y - 1);
}

function calendar(ctx: CanvasRenderingContext2D, c: Rect): void {
  // A little e-paper calendar with a magenta header (the month and day are live).
  const g = new Grid(c.w + 2, c.h + 2);
  g.rect(1, 1, c.w, c.h, "#d9d4f2");
  g.rect(1, 1, c.w, 7, P.magLo);
  g.rect(1, 8, c.w, 1, P.mag);
  g.rect(1, c.h - 1, c.w, 2, "#a9a2d0");
  g.outline(OUTLINE);
  stamp(ctx, g, c.x - 1, c.y - 1);
}

function status(ctx: CanvasRenderingContext2D, s: Rect): void {
  const b = new Grid(s.w + 2, s.h + 2);
  b.rrect(1, 1, s.w, s.h, "#2b2546", 1);
  b.rect(2, 2, s.w - 2, s.h - 2, "#0c0a16");
  b.rect(2, 1, s.w - 2, 1, P.cyanLo);
  b.outline(OUTLINE);
  stamp(ctx, b, s.x - 1, s.y - 1);
}

function door(ctx: CanvasRenderingContext2D, d: Rect): void {
  // A sliding steel door in a lit frame; the "+" panel lets someone new in.
  const g = new Grid(d.w + 6, d.h + 4);
  g.rect(0, 2, d.w + 6, d.h + 2, "#2b2546");
  g.rect(1, 2, 1, d.h + 2, P.cyan).rect(d.w + 4, 2, 1, d.h + 2, P.cyan);
  g.rect(0, 2, d.w + 6, 1, P.cyan);
  g.rect(3, 4, d.w, d.h, "#3a3458");
  g.rect(3, 4, d.w, 1, "#5a5486");
  const mid = 3 + Math.floor(d.w / 2);
  g.rect(mid, 4, 1, d.h, "#1d1830");
  g.rect(5, 8, mid - 6, 12, "#2f2a4c").rect(mid + 2, 8, d.w - (mid - 3) - 4, 12, "#2f2a4c");
  for (let yy = 26; yy < d.h; yy += 4) g.rect(5, yy, d.w - 4, 1, "#322c52");
  g.rect(mid - 3, 22, 2, 4, P.cyanLo).rect(mid + 2, 22, 2, 4, P.cyanLo);
  g.outline(OUTLINE);
  stamp(ctx, g, d.x - 3, d.y - 3);
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, "#0c2a1c");
  sg.rect(6, 2, 2, 5, P.lime).rect(4, 4, 6, 1, P.lime);
  sg.outline(OUTLINE);
  stamp(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
}

function legend(ctx: CanvasRenderingContext2D, n: Rect): void {
  // The "?" note: a little holo tag in neon yellow.
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, "#2a2410");
  g.rect(1, 1, n.w, 1, P.yel);
  g.rect(1, n.h, n.w, 1, P.yelLo);
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, P.yel).set(qx + 2, 5, P.yel).set(qx + 1, 6, P.yel).set(qx + 1, 8, P.yel);
  g.outline(OUTLINE);
  stamp(ctx, g, n.x - 1, n.y - 1);
}

function painting(ctx: CanvasRenderingContext2D, p: Layout["wall"]["paintings"][number]): void {
  ctx.drawImage(paintingSign(p.x).base, p.x, p.y);
}

function clock(ctx: CanvasRenderingContext2D, k: { x: number; y: number; r: number }): void {
  const { x, y, r } = k;
  const g = new Grid(r * 2 + 5, r * 2 + 5);
  const c = r + 2;
  g.ellipse(c, c, r, r, P.mag);
  g.ellipse(c, c, r - 1, r - 1, "#2b2546");
  g.ellipse(c, c, r - 1.8, r - 1.8, "#dcd8f4");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.set(c + Math.round(Math.sin(a) * (r - 2.8)), c - Math.round(Math.cos(a) * (r - 2.8)), i % 3 === 0 ? P.magLo : "#a9a2d0");
  }
  g.outline(OUTLINE);
  stamp(ctx, g, x - c, y - c);
}

export const NEON_BACKGROUND: Partial<BackgroundSteps> = {
  floor,
  wall,
  pods,
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
};
