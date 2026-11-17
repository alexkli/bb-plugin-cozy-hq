// Mountain Cabin: the mountainside round the lodge. Snow with blue shadows,
// patches of frozen ground and scree, jagged granite outcrops and boulders
// with caps of snow, stunted pines, a frozen stream down the slope and a
// small icy tarn, a cairn and a trail sign, the trodden path from the front
// door with footprints, firewood stacked against the west wall, the lodge's
// log walls and the snowy eaves with icicles. Live: snow piling up on the
// rocks and the ground, the sun glinting on the ice.
import type { PaintInfo } from "../../theme.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import { cached, Grid, makeCanvas, OUTLINE, rect } from "../../themekit.ts";
import { C, h2, sprite } from "./kit.ts";
import type { CabinPlan, Terrain } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ sprites

/** A jagged granite outcrop: lit on the left, dark on the right, cracks, a cap of snow. */
export function outcrop(w: number, h: number, seed: number): HTMLCanvasElement {
  return sprite(`outcrop-${w}-${h}-${seed % 7}`, w, h, (g) => {
    const peak = Math.round(w * (0.35 + h2(seed, 1) * 0.3));
    const tops: number[] = [];
    for (let x = 0; x < w; x++) {
      const k = 1 - Math.abs(x - peak) / (w / 2 + 1);
      const jag = Math.round((h2(x >> 1, seed) - 0.5) * 3);
      tops.push(Math.max(0, Math.min(h - 3, Math.round(h * (1 - Math.max(0.12, k) * 0.95)) + jag)));
    }
    for (let x = 1; x < w - 1; x++) {
      const t = tops[x]!;
      for (let y = t; y < h - 1; y++) {
        const lit = x < peak - 1;
        const facet = (x + y * 2 + seed) % 9 === 0;
        g.set(x, y, facet ? C.stoneDk : lit ? (y - t < 3 ? C.stoneHi : C.stone) : y - t < 2 ? C.stone : C.stoneLo);
      }
      // Snow caught on the lit side and on ledges.
      if (x < peak + 1) g.set(x, t, C.snow).set(x, t + 1, (x + seed) % 3 ? C.snow : C.stoneHi);
      if ((x * 7 + seed) % 11 === 0 && t + 5 < h - 2) g.set(x, t + 4, C.snow).set(x + 1, t + 4, C.snow);
    }
    for (let x = 1; x < w - 1; x++) g.set(x, h - 2, C.snowShade);
  });
}

/** A rounded boulder with a snow cap. */
export function boulder(w: number, h: number, seed: number): HTMLCanvasElement {
  return sprite(`boulder-${w}-${h}-${seed % 5}`, w + 2, h + 2, (g) => {
    g.ellipse(w / 2, h / 2 + 0.5, w / 2 - 0.5, h / 2 - 0.5, C.stoneLo);
    g.ellipse(w / 2 - 1, h / 2 - 0.5, w / 2 - 2, h / 2 - 2, C.stone);
    g.ellipse(w / 2 - 1.5, h / 2 - 2, w / 2 - 3, 1.6, C.snow);
    g.set(Math.round(w * 0.7), Math.round(h * 0.6), C.stoneDk);
  });
}

/** A stunted, wind-bent pine with snow on its boughs. */
export function pine(h: number): HTMLCanvasElement {
  return sprite(`pine-${h}`, 13, h + 4, (g) => {
    const cx = 6;
    for (let j = 0; j < h; j++) {
      const half = Math.max(1, Math.round((j / h) * 5) + (j % 3 === 2 ? 1 : 0));
      const lean = j < h / 3 ? 1 : 0;
      g.rect(cx - half + lean, j, half * 2 + 1 - lean, 1, j % 3 === 0 ? "#2f5a48" : "#3c6b56");
      if (j % 3 === 0) g.rect(cx - half + lean, j, Math.max(1, half), 1, C.snow);
    }
    g.rect(cx, h, 1, 3, C.beamLo);
  });
}

/** A cairn: flat stones piled up, a dusting of snow. */
function cairnSprite(): HTMLCanvasElement {
  return sprite("cairn", 14, 16, (g) => {
    g.rect(2, 12, 10, 3, C.stoneLo).rect(3, 9, 8, 3, C.stone).rect(4, 6, 6, 3, C.stoneLo).rect(5, 3, 4, 3, C.stone).rect(6, 1, 2, 2, C.stoneHi);
    g.rect(3, 9, 8, 1, C.stoneHi).rect(4, 6, 6, 1, C.snow).rect(5, 3, 4, 1, C.stoneHi).rect(2, 12, 10, 1, C.snow);
  });
}

/** A wooden trail sign: two arrows on a post. */
function signSprite(): HTMLCanvasElement {
  return sprite("sign", 20, 24, (g) => {
    g.rect(9, 6, 2, 18, C.beam).vline(9, 6, 18, C.beamHi);
    g.rect(2, 3, 14, 4, "#d8a83a").set(16, 4, "#d8a83a").set(16, 5, "#d8a83a").set(17, 5, "#d8a83a");
    g.rect(4, 4, 8, 1, C.beamDk).rect(4, 5, 5, 1, C.beamDk);
    g.rect(4, 9, 13, 4, "#d8a83a").set(3, 10, "#d8a83a").set(3, 11, "#d8a83a").set(2, 11, "#d8a83a");
    g.rect(7, 10, 8, 1, C.beamDk).rect(9, 11, 6, 1, C.beamDk);
    g.rect(2, 2, 14, 1, C.snow).rect(4, 8, 13, 1, C.snow);
    g.rect(6, 22, 8, 2, C.snow);
  });
}

/** Split logs stacked against the outside of the west wall, a little roof of boards over them. */
function stackSprite(h: number): HTMLCanvasElement {
  return sprite(`stack-${h}`, 12, h, (g) => {
    g.rect(0, 0, 12, 3, C.beam).rect(0, 0, 12, 1, C.snow).rect(0, 1, 12, 1, C.snow);
    for (let y = 4; y + 4 <= h; y += 4) {
      for (let x = (y / 4) % 2 ? 0 : 2; x + 4 <= 12; x += 5) {
        g.rect(x, y, 4, 4, C.beam).rect(x + 1, y + 1, 2, 2, "#d9b07a").set(x + 1, y + 1, "#e8c890");
      }
    }
  });
}

/** The red wooden sled. */
export function sledSprite(): HTMLCanvasElement {
  return sprite("sled", 18, 9, (g) => {
    g.rect(2, 2, 13, 4, C.red).rect(2, 2, 13, 1, C.redHi);
    for (let x = 4; x < 15; x += 3) g.vline(x, 2, 4, C.redLo);
    g.rect(1, 7, 16, 1, C.iron).set(0, 6, C.iron).set(17, 6, C.iron).rect(4, 6, 1, 1, C.iron).rect(12, 6, 1, 1, C.iron);
    g.line(15, 3, 17, 1, C.cream);
  });
}

// ------------------------------------------------------------------ the static mountainside

/** The ground everywhere outside: snow, frozen ground and scree, the stream, the tarn, rocks and pines. */
export function paintTerrain(ctx: Ctx, L: Layout, p: CabinPlan): void {
  const t = p.terrain;
  rect(ctx, 0, 0, L.W, L.H, C.snow);
  // Wind-carved shadows in the snow.
  for (let i = 0; i < (L.W * L.H) / 70; i++) {
    const x = Math.floor(h2(i, 3) * L.W);
    const y = Math.floor(h2(i + 777, 5) * L.H);
    rect(ctx, x, y, 4 + (i % 4), 1, i % 5 ? C.snowShade : "#e6eef7");
  }
  // Frozen ground where the wind blows the snow off: brown-grey earth with frost.
  for (let i = 0; i < (L.W * L.H) / 5000; i++) {
    const x = Math.floor(h2(i, 41) * L.W);
    const y = Math.floor(h2(i, 43) * L.H);
    const w = 10 + Math.floor(h2(i, 47) * 18);
    const g = new Grid(w, 8);
    g.ellipse(w / 2, 4, w / 2 - 1, 3, "#8a8278");
    for (let k = 0; k < w; k += 2) if (g.get(k, 3)) g.set(k, 3, "#a8a49c");
    g.set(Math.floor(w / 3), 4, "#6e675e").set(Math.floor((w * 2) / 3), 5, "#ffffff");
    ctx.drawImage(g.toCanvas(), x, y);
  }
  for (const s of t.scree) for (let i = 0; i < s.w * 0.6; i++) rect(ctx, s.x + Math.floor(h2(i, s.x) * s.w), s.y + Math.floor(h2(i, s.y) * s.h), 2, 1, i % 3 ? C.stoneLo : C.stone);
  if (t.stream) frozenStream(ctx, t.stream);
  if (t.tarn) tarn(ctx, t.tarn);
  if (t.path) path(ctx, t.path);
  for (const r of t.rocks) ctx.drawImage(r.jagged ? outcrop(r.w, r.h, r.x + r.y) : boulder(r.w, r.h, r.x), r.x, r.y);
  for (const q of t.pines) ctx.drawImage(pine(q.h), q.x - 6, q.y - q.h - 3);
  if (t.cairn) ctx.drawImage(cairnSprite(), t.cairn.x - 7, t.cairn.y - 15);
  if (t.sign) ctx.drawImage(signSprite(), t.sign.x - 10, t.sign.y - 23);
  if (t.logs) ctx.drawImage(stackSprite(t.logs.h), t.logs.x, t.logs.y);
}

function frozenStream(ctx: Ctx, pts: Point[]): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    for (let y = a.y; y < b.y; y++) {
      const x = Math.round(a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
      rect(ctx, x - 5, y, 11, 1, C.snowShade);
      rect(ctx, x - 4, y, 9, 1, C.ice);
      rect(ctx, x - 1, y, 3, 1, C.iceDk);
      if ((y * 7) % 13 === 0) rect(ctx, x - 3, y, 2, 1, "#ffffff");
      if ((y * 5) % 17 === 0) rect(ctx, x + 2, y, 2, 1, "#a8d4ea");
    }
  }
}

function tarn(ctx: Ctx, r: Rect): void {
  const g = new Grid(r.w, r.h);
  g.ellipse(r.w / 2 - 0.5, r.h / 2 - 0.5, r.w / 2 - 0.5, r.h / 2 - 0.5, C.snowShade);
  g.ellipse(r.w / 2 - 0.5, r.h / 2 - 0.5, r.w / 2 - 2.5, r.h / 2 - 2.5, C.ice);
  g.ellipse(r.w / 2 + 2, r.h / 2 + 1, r.w / 2 - 8, r.h / 2 - 6, "#a8d4ea");
  // Cracks in the ice and a dusting of snow blown across it.
  g.line(6, r.h / 2, r.w / 2, r.h / 2 - 3, C.iceDk).line(r.w / 2, r.h / 2 - 3, r.w - 9, r.h / 2 + 2, C.iceDk).line(r.w / 2, r.h / 2 - 3, r.w / 2 + 4, r.h - 5, C.iceDk);
  g.rect(Math.round(r.w * 0.2), 4, 6, 1, "#ffffff").rect(Math.round(r.w * 0.6), r.h - 6, 5, 1, "#ffffff");
  g.outline(OUTLINE);
  ctx.drawImage(g.toCanvas(), r.x, r.y);
}

/** The trodden path down from the door: packed snow and pairs of footprints. */
function path(ctx: Ctx, p: { x: number; y0: number; y1: number }): void {
  for (let y = p.y0; y < p.y1; y++) {
    const x = Math.round(p.x + Math.sin(y * 0.08) * 3);
    rect(ctx, x - 6, y, 13, 1, C.snowShade);
    rect(ctx, x - 5, y, 11, 1, "#e2eaf3");
  }
  for (let y = p.y0 + 3, i = 0; y < p.y1 - 2; y += 6, i++) {
    const x = Math.round(p.x + Math.sin(y * 0.08) * 3) + (i % 2 ? 1 : -3);
    rect(ctx, x, y, 2, 3, C.snowDeep);
  }
}

// ------------------------------------------------------------------ the lodge from outside

/** The log walls round the lodge, its corners, the snowy eaves with icicles. */
export function paintShell(ctx: Ctx, L: Layout, p: CabinPlan): void {
  const lo = p.lodge;
  const x0 = lo.x;
  const x1 = lo.x + lo.w;
  const yTop = p.top;
  const yBot = lo.y + lo.h;
  // Side walls: stacked log ends seen from above.
  for (const x of [x0, x1 - 5]) {
    if (p.deckSide === "east" && x === x1 - 5) continue;
    rect(ctx, x - 1, yTop, 7, yBot - yTop, OUTLINE);
    for (let y = yTop; y < yBot; y++) rect(ctx, x, y, 5, 1, (y - yTop) % 6 < 2 ? C.beamHi : (y - yTop) % 6 === 5 ? C.beamDk : C.beam);
  }
  // The front wall, when the lodge stops short of the panel's bottom (the deck wall draws its own).
  if (yBot < L.H - 2 && !p.deckWall) {
    rect(ctx, x0 - 1, yBot - 1, x1 - x0 + 2, 7, OUTLINE);
    rect(ctx, x0, yBot, x1 - x0, 2, C.beamHi);
    rect(ctx, x0, yBot + 2, x1 - x0, 3, C.beam);
  }
  // Corner posts with log ends.
  for (const [cx, cy] of [
    [x0, yTop],
    [x1 - 5, yTop],
    [x0, yBot - 6],
    [x1 - 5, yBot - 6],
  ] as const) {
    if (cy >= L.H - 4) continue;
    rect(ctx, cx - 1, cy - 1, 7, 8, OUTLINE);
    rect(ctx, cx, cy, 5, 6, "#d9b07a");
    rect(ctx, cx + 1, cy + 1, 3, 4, C.pine);
    rect(ctx, cx + 2, cy + 2, 1, 2, C.beam);
  }
  // Snow banked against the outside of the walls.
  for (let y = yTop + 6; y < yBot; y++) {
    const k = Math.round(2 + Math.sin(y * 0.11) * 1.5 + Math.sin(y * 0.037) * 1.5);
    rect(ctx, x0 - 1 - k, y, k, 1, (y % 7) ? C.snow : C.snowShade);
    if (p.deckSide !== "east") rect(ctx, x1 + 1, y, k, 1, (y % 5) ? C.snow : C.snowShade);
  }
}

/** The eaves along the top: snow heaped on the roof's edge, icicles hanging off it. */
export function paintEaves(ctx: Ctx, p: CabinPlan): void {
  const lo = p.lodge;
  const y = p.top;
  if (y < 5) {
    // No sky over the roof: just icicles along the top of the wall.
    for (let x = lo.x + 4; x < lo.x + lo.w - 4; x += 5) rect(ctx, x, 0, 1, 2 + ((x * 7) % 4), C.ice);
    return;
  }
  rect(ctx, lo.x - 4, y - 6, lo.w + 8, 7, OUTLINE);
  rect(ctx, lo.x - 3, y - 5, lo.w + 6, 2, C.beamDk);
  for (let x = lo.x - 3; x < lo.x + lo.w + 3; x++) {
    const bump = Math.round(Math.sin(x * 0.21) + Math.sin(x * 0.07));
    rect(ctx, x, y - 7 - Math.max(0, bump), 1, 4 + Math.max(0, bump), C.snow);
    rect(ctx, x, y - 3, 1, 1, C.snowShade);
  }
  // Icicles of all lengths over the wall's top beam.
  for (let x = lo.x + 2; x < lo.x + lo.w - 2; x += 3) {
    const len = 2 + Math.floor(h2(x, 9) * 6);
    if (h2(x, 13) < 0.3) continue;
    rect(ctx, x, y - 2, 1, len, C.ice);
    rect(ctx, x, y - 2, 1, 1, "#ffffff");
    rect(ctx, x, y - 2 + len - 1, 1, 1, C.iceDk);
  }
}

// ------------------------------------------------------------------ live

/** Every bit of outdoors, for the weather. */
export function outdoorRects(L: Layout, p: CabinPlan): Rect[] {
  return cached(`cabin|outdoors|${L.W}x${L.H}|${p.lodge.x},${p.lodge.y},${p.lodge.w},${p.lodge.h}`, () => {
    const lo = p.lodge;
    const out: Rect[] = [];
    const top = Math.max(0, p.top - 5);
    if (lo.x > 0) out.push({ x: 0, y: top, w: lo.x, h: L.H - top });
    const right = lo.x + lo.w;
    if (right < L.W) out.push({ x: right, y: top, w: L.W - right, h: L.H - top });
    const bot = lo.y + lo.h;
    if (bot < L.H) out.push({ x: lo.x, y: bot, w: lo.w, h: L.H - bot });
    return out;
  });
}

/** Fresh snow on the rocks, the frozen ground and the path (drawn by how much has fallen). */
function snowCap(L: Layout, t: Terrain, p: CabinPlan): HTMLCanvasElement {
  return cached(`cabin|terrainsnow|${L.W}x${L.H}|${t.rocks.length}|${p.lodge.x}`, () =>
    makeCanvas(L.W, L.H, (ctx) => {
      ctx.fillStyle = C.snow;
      for (const r of t.rocks) {
        for (let x = 1; x < r.w - 1; x++) {
          const k = Math.round(2 + h2(x, r.x) * (r.jagged ? 3 : 2));
          ctx.fillRect(r.x + x, r.y + Math.round(r.h * (r.jagged ? 0.25 : 0.1)) + (x % 3 === 0 ? 1 : 0), 1, k);
        }
      }
      for (const q of t.pines) for (let j = 0; j < q.h; j += 3) ctx.fillRect(q.x - Math.round((j / q.h) * 5) - 1, q.y - q.h - 3 + j, Math.round((j / q.h) * 10) + 3, 1);
      if (t.path) ctx.fillRect(t.path.x - 5, t.path.y0, 11, t.path.y1 - t.path.y0);
      if (t.logs) ctx.fillRect(t.logs.x, t.logs.y, t.logs.w, 4);
      if (t.tarn) {
        ctx.fillStyle = "rgba(245,249,253,0.7)";
        ctx.fillRect(t.tarn.x + 4, t.tarn.y + 3, t.tarn.w - 8, t.tarn.h - 6);
      }
    }),
  );
}

/** The sun glinting on the ice; fresh snow covering the mountainside. */
export function terrainUnder(ctx: Ctx, L: Layout, p: CabinPlan, info: PaintInfo, snow: number): void {
  const t = p.terrain;
  if (snow > 0.05) {
    ctx.globalAlpha = Math.min(1, snow);
    ctx.drawImage(snowCap(L, t, p), 0, 0);
    ctx.globalAlpha = 1;
  }
  if (info.night < 0.4 && (info.weather === "clear" || info.weather === "partly") && snow < 0.5) {
    const tt = info.t;
    const spark = (x: number, y: number, i: number) => {
      const k = Math.sin(tt * 2.4 + i * 2.7);
      if (k < 0.85) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, 1, 1);
      if (k > 0.96) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    };
    if (t.tarn) for (let i = 0; i < 6; i++) spark(t.tarn.x + 5 + ((i * 13) % (t.tarn.w - 10)), t.tarn.y + 4 + ((i * 7) % (t.tarn.h - 8)), i);
    if (t.stream) for (let i = 0; i < t.stream.length; i += 5) spark(t.stream[i]!.x + ((i * 3) % 5) - 2, t.stream[i]!.y, i);
    // And on the icicles.
    const lo = p.lodge;
    for (let i = 0; i < 8; i++) spark(lo.x + 6 + ((i * 71) % Math.max(1, lo.w - 12)), p.top + 1, i + 40);
  }
}

/** Snow blowing across the open ground in a blizzard: long streaks low over the snow. */
export function blizzard(ctx: Ctx, rects: Rect[], t: number, heavy: boolean): void {
  ctx.fillStyle = heavy ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)";
  for (const r of rects) {
    const n = Math.round((r.w * r.h) / (heavy ? 260 : 600));
    for (let i = 0; i < n; i++) {
      const sp = 70 + (i % 5) * 18;
      const x = r.x + ((((i * 97 + Math.floor(t * sp)) % (r.w + 20)) + r.w + 20) % (r.w + 20)) - 10;
      const y = r.y + ((i * 53 + Math.floor(t * 9)) % r.h);
      ctx.fillRect(x, y, 3 + (i % 4), 1);
    }
  }
  if (heavy) {
    // A white-out haze gusting over everything outside.
    const g = 0.12 + 0.08 * Math.sin(t * 0.7) + 0.06 * Math.sin(t * 2.3);
    ctx.fillStyle = `rgba(235,242,250,${g.toFixed(3)})`;
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h);
  }
}
