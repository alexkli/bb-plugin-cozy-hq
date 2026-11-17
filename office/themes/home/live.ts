// Home Office: what moves and glows. Trees in the yards and along the
// streets, street lamps, cars driving by and parked ones, the blanket over
// whoever's napping (they lie down in bed), headsets on whoever's on a
// call, and the calls themselves: dotted links from home to home (and to
// your house) with the signal running along them. At night the homes,
// the shop windows and the lamps glow.
import type { Call, Light, PaintInfo, PoseOf, DriftOf, WallLightsInfo } from "../../theme.ts";
import type { Facing, Layout, Rect } from "../../layout.ts";
import type { CharPose, Expression, Look } from "../../characters.ts";
import type { Drawable } from "../../life.ts";
import { Grid, shade } from "../../themekit.ts";
import { C, FABRICS, h2, memo, OUTLINE, rect, sprite } from "./kit.ts";
import { blanket } from "./props.ts";
import { homeData, type HomeData, type Unit } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

// What the hooks without a layout need this frame (drift, pose, dress): set in `underlay`.
let current: HomeData | null = null;
let onCall = new Map<string, Call>();
/** Homes whose bed someone's lying in (seen while drawing people; the blankets go on next frame). */
let sleepers = new Set<number>();
let sleptIn = new Set<number>();

// ------------------------------------------------------------------ trees, lamps, cars

function treeSprite(size: number, seed: number): HTMLCanvasElement {
  const r = [7, 9, 12][size]!;
  const hue = seed % 3;
  const [leaf, hi, lo] = hue === 0 ? [C.leaf, C.leafHi, C.leafLo] : hue === 1 ? ["#5a9a4a", "#78b860", "#447a38"] : ["#4a8a5a", "#64a874", "#366a44"];
  const w = r * 2 + 3;
  const trunk = size === 0 ? 8 : 10;
  return sprite(`tree-${size}-${hue}`, w, r * 2 + trunk + 2, (g) => {
    g.rect(Math.floor(w / 2) - 1, r * 2 - 2, 3, trunk + 3, C.bark).vline(Math.floor(w / 2) - 1, r * 2 - 2, trunk + 3, C.barkLo);
    g.ellipse(w / 2 - 0.5, r + 0.5, r, r, leaf);
    g.ellipse(w / 2 - 2, r - 1.5, r * 0.6, r * 0.55, hi);
    g.ellipse(w / 2 + 2, r + 3, r * 0.5, r * 0.4, lo);
    for (let i = 0; i < r * 2; i++) {
      const x = Math.floor(h2(seed, i) * w);
      const y = Math.floor(h2(i, seed) * r * 2);
      if (g.get(x, y)) g.set(x, y, i % 2 ? hi : lo);
    }
  });
}

function lampSprite(): HTMLCanvasElement {
  return sprite("street-lamp", 7, 30, (g) => {
    g.rect(2, 3, 2, 26, "#3a3846").vline(3, 3, 26, "#4e4c5a");
    g.rect(0, 0, 7, 3, "#3a3846").rect(1, 3, 5, 1, "#fff3c0");
    g.rect(1, 28, 5, 2, "#3a3846");
  });
}

const CAR_COLORS = ["#d0505a", "#3e8ed0", "#f2c14e", "#30a46c", "#f4f1ea", "#8e4ec6", "#e07a4a", "#5a6270"];

function carSprite(color: string, dir: 1 | -1): HTMLCanvasElement {
  return sprite(`car-${color}-${dir}`, 22, 12, (g) => {
    g.rrect(0, 4, 22, 6, color, 1);
    g.rect(5, 0, 12, 5, shade(color, -0.12));
    g.rect(6, 1, 4, 3, "#a8d8f0").rect(12, 1, 4, 3, "#a8d8f0");
    g.rect(0, 5, 22, 1, shade(color, 0.25));
    g.rect(3, 9, 4, 3, "#26242c").rect(15, 9, 4, 3, "#26242c");
    g.set(dir === 1 ? 21 : 0, 6, "#fff3a0").set(dir === 1 ? 0 : 21, 6, "#e5484d");
  });
}

/** Cars on every street: two lanes, a few each way, at their own speeds. */
function cars(ctx: Ctx, d: HomeData, L: Layout, t: number): Drawable[] {
  const out: Drawable[] = [];
  for (const [ri, row] of d.rows.entries()) {
    const road = { y: row.street.y + 10, h: row.street.h - 17 };
    for (const dir of [1, -1] as const) {
      const lane = dir === 1 ? road.y + road.h - 6 : road.y + 3;
      for (let i = 0; i < 2; i++) {
        const seed = ri * 7 + i * 3 + (dir === 1 ? 0 : 11);
        const speed = 18 + h2(seed, 1) * 16;
        const span = L.W + 160;
        const pos = (t * speed + h2(seed, 2) * span + i * span * 0.5) % span;
        // A car or two pause now and then (only the odd one is on the road at a time).
        if (h2(seed, Math.floor((t * speed + h2(seed, 2) * span) / span)) < 0.35) continue;
        const x = dir === 1 ? pos - 40 : L.W + 40 - pos;
        const spr = carSprite(CAR_COLORS[seed % CAR_COLORS.length]!, dir);
        out.push({
          z: lane + 10,
          draw: () => {
            ctx.fillStyle = "rgba(20,20,30,0.18)";
            ctx.fillRect(Math.round(x) + 1, lane + 10, 20, 2);
            ctx.drawImage(spr, Math.round(x), lane);
          },
        });
      }
    }
  }
  return out;
}

function parked(ctx: Ctx, d: HomeData): Drawable[] {
  const out: Drawable[] = [];
  for (const lot of d.lots) {
    if (lot.kind !== "parking") continue;
    const y0 = lot.rect.y + 14;
    for (let x = lot.rect.x + 6, i = 0; x + 18 < lot.rect.x + lot.rect.w; x += 22, i++) {
      if (h2(lot.seed, i) < 0.3) continue;
      const spr = carSprite(CAR_COLORS[(lot.seed + i) % CAR_COLORS.length]!, 1);
      // Parked nose in: seen from above-front, a car is its side sprite turned; keep it simple, side on.
      out.push({ z: y0 + 22, draw: () => ctx.drawImage(spr, x - 2, y0 + 10) });
    }
  }
  return out;
}

function lampPosts(d: HomeData, L: Layout): { x: number; y: number }[] {
  return memo(`lamps|${L.W}x${L.H}|${d.units.length}|${d.rows.length}`, () => {
    const out: { x: number; y: number }[] = [];
    const doors = [...d.units.map((u) => u.doorX), L.boss.way?.[0]?.x ?? -99, ...(d.cafe ? [d.cafeDoor] : [])];
    for (const row of d.rows) {
      for (let x = 50; x < L.W - 10; x += 120) {
        const lx = [x, x + 10, x - 10, x + 20].find((q) => doors.every((dx) => Math.abs(dx - q) > 10) && d.avenues.every((a) => q < a.x - 4 || q > a.x + a.w + 4));
        // On the far sidewalk, between the trees (not in front of anyone's door).
        if (lx !== undefined) out.push({ x: lx + 32, y: row.street.y + row.street.h - 2 });
      }
    }
    return out;
  });
}

// ------------------------------------------------------------------ calls

const CALL_COLOR: Record<Call["kind"], string> = { chat: "#5ad1ff", meeting: "#c08cff", you: "#ffd84a", lobby: "#d8d2c4" };

/** A dotted arc from a to b, its dots running along it (the signal). */
function link(ctx: Ctx, ax: number, ay: number, bx: number, by: number, color: string, t: number, moving: boolean): void {
  const lift = Math.min(40, 14 + Math.hypot(bx - ax, by - ay) * 0.18);
  const cx = (ax + bx) / 2;
  const cy = Math.min(ay, by) - lift;
  const len = Math.hypot(bx - ax, by - ay) + lift;
  const n = Math.max(4, Math.floor(len / 7));
  const phase = moving ? (t * 1.6) % 1 : 0;
  for (let i = 0; i <= n; i++) {
    const k = (i + phase) / (n + 1);
    const u = 1 - k;
    const x = u * u * ax + 2 * u * k * cx + k * k * bx;
    const y = u * u * ay + 2 * u * k * cy + k * k * by;
    ctx.fillStyle = "rgba(30,24,40,0.35)";
    ctx.fillRect(Math.round(x), Math.round(y) + 1, 2, 2);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
}

/** A tiny camera badge over someone on a video call. */
function camBadge(ctx: Ctx, x: number, y: number, color: string): void {
  const s = memo(`cam-${color}`, () => {
    const g = new Grid(9, 7);
    g.rect(0, 0, 9, 7, OUTLINE).rect(1, 1, 5, 5, color).rect(6, 2, 2, 3, color).set(2, 2, "#ffffff");
    return g.toCanvas();
  });
  ctx.drawImage(s, Math.round(x) - 4, Math.round(y));
}

function drawCalls(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const calls = info.calls ?? [];
  if (calls.length === 0) return;
  const you = { x: L.boss.seat.x, y: L.boss.seat.y - 30 };
  const head = (m: { x: number; y: number }) => ({ x: m.x, y: m.y - 32 });
  for (const c of calls) {
    const color = CALL_COLOR[c.kind];
    if (c.kind === "lobby") continue;
    if (c.kind === "you") {
      const a = head(c.members[0]!);
      link(ctx, a.x, a.y, you.x, you.y, color, info.t, true);
    } else {
      const ms = [...c.members].sort((p, q) => p.x - q.x);
      for (let i = 1; i < ms.length; i++) {
        const a = head(ms[i - 1]!);
        const b = head(ms[i]!);
        link(ctx, a.x, a.y, b.x, b.y, color, info.t + i * 0.3, true);
      }
    }
    for (const m of c.members) {
      const h = head(m);
      const bob = Math.floor(info.t * 2 + m.x) % 2;
      camBadge(ctx, h.x, h.y - 6 - bob, color);
    }
  }
  // Your camera's on too when someone's calling you.
  if (calls.some((c) => c.kind === "you")) camBadge(ctx, you.x, you.y - 6 - (Math.floor(info.t * 2) % 2), CALL_COLOR.you);
}

// ------------------------------------------------------------------ people: lying in bed, headsets

/** Whose bed a sleeper's in (by their spot), and where the mattress is. */
function bedAt(x: number, y: number): Unit | null {
  if (!current) return null;
  for (const u of current.units) if (u.sleep.x === Math.round(x) && u.sleep.y === Math.round(y)) return u;
  return null;
}

export function homeDrift(who: DriftOf, info: PaintInfo): { dx: number; dy: number; tilt?: number } | null {
  if (who.kind !== "agent") return null;
  const u = bedAt(who.x, who.y);
  if (!u) return null;
  // Lying down, head on the pillow at the left.
  const mid = u.template === "tiny" ? u.bed.y + 14 : u.bed.y + 9;
  sleepers.add(u.index);
  void info;
  return { dx: u.bed.x + 17 - who.x, dy: mid - (who.y - 14), tilt: -Math.PI / 2 };
}

export function homePose(p: PoseOf, info: PaintInfo): { pose: CharPose; expr: Expression; facing?: Facing } | null {
  if (p.kind !== "agent") return null;
  if (p.spot === "bench" && bedAt(p.x, p.y)) return { pose: "stand", expr: "closed", facing: "front" };
  // Talking on a call: hands going now and then.
  const c = onCall.get(p.id);
  if (c && c.talking === p.id && p.pose === "stand" && Math.floor(info.t * 1.4 + p.seed) % 4 === 0) return { pose: "raise", expr: Math.floor(info.t * 7) % 2 ? "open" : "happy", facing: p.facing };
  return null;
}

/** A headset on whoever's on a call (the FaceTime ones hold up a phone instead). */
export function homeDress(ctx: Ctx, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look; spot?: string | null; id?: string }, t: number): void {
  if (!a.id) return;
  const c = onCall.get(a.id);
  if (!c || c.kind === "lobby") return;
  const x = a.x;
  const y = a.y + (a.seated || a.pose === "sit-back" || a.pose === "type0" || a.pose === "type1" || a.pose === "read" ? 3 : 0);
  const phone = c.kind === "chat" && (a.seed + c.key.length) % 3 === 0 && a.pose !== "cup";
  if (phone && a.facing === "front") {
    // Holding up the phone for a FaceTime.
    rect(ctx, x + 14, y + 12, 4, 6, OUTLINE);
    rect(ctx, x + 15, y + 13, 2, 4, Math.floor(t * 3) % 2 ? "#7fd1ff" : "#a8e2ff");
    return;
  }
  const band = "#2f2b36";
  rect(ctx, x + 4, y + 1, 12, 1, band);
  if (a.facing !== "right") rect(ctx, x + 1, y + 6, 2, 4, band);
  if (a.facing !== "left") rect(ctx, x + 17, y + 6, 2, 4, band);
  if (a.facing === "front") {
    rect(ctx, x + 2, y + 10, 1, 1, band);
    rect(ctx, x + 3, y + 11, 3, 1, band);
    rect(ctx, x + 6, y + 11, 1, 1, "#e5484d");
  }
  void t;
}

// ------------------------------------------------------------------ hooks

export function homeUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  current = homeData(L);
  sleptIn = sleepers;
  sleepers = new Set();
  onCall = new Map();
  for (const c of info.calls ?? []) for (const m of c.members) onCall.set(m.id, c);
  void ctx;
}

export function homeDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const d = homeData(L);
  if (!d) return [];
  const out: Drawable[] = [];
  for (const tr of d.trees) {
    const spr = treeSprite(tr.size, tr.seed);
    out.push({ z: tr.y, draw: () => ctx.drawImage(spr, Math.round(tr.x - spr.width / 2), tr.y - spr.height + 2) });
  }
  const lamp = lampSprite();
  for (const p of lampPosts(d, L)) out.push({ z: p.y, draw: () => ctx.drawImage(lamp, p.x - 3, p.y - 29) });
  out.push(...cars(ctx, d, L, info.t));
  out.push(...parked(ctx, d));
  // Blankets over whoever's in bed.
  for (const u of d.units) {
    if (!sleptIn.has(u.index)) continue;
    const bl = blanket(u.seed);
    const by = u.template === "tiny" ? u.bed.y + 8 : u.bed.y + 3;
    out.push({ z: u.sleep.y + 1, draw: () => ctx.drawImage(bl, u.bed.x + 15, by) });
  }
  return out;
}

export function homeOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  drawCalls(ctx, L, info);
}

export function homeLights(L: Layout, info: PaintInfo): Light[] {
  const d = homeData(L);
  if (!d || info.night < 0.05) return [];
  const out: Light[] = [];
  for (const p of lampPosts(d, L)) out.push([p.x, p.y - 22, 38, 0.95, "#ffe2a0", 0.22]);
  for (const u of d.units) {
    const lamp = FABRICS[u.seed % FABRICS.length]!;
    void lamp;
    out.push([u.rect.x + u.rect.w / 2, u.rect.y + 34, Math.max(36, u.rect.w * 0.45), 0.7, "#ffd59a", 0.12]);
    for (const w of u.windows) out.push([w.x + w.w / 2, w.y + 6, 12, 0.5, "#ffe9b0", 0.12]);
  }
  if (d.cafe) out.push([d.cafe.x + d.cafe.w / 2, d.cafe.y + 40, d.cafe.w * 0.55, 0.75, "#ffcf8a", 0.14]);
  out.push([d.house.x + d.house.w / 2, d.house.y + 36, d.house.w * 0.5, 0.6, "#ffd59a", 0.1]);
  // The shop windows along the top.
  for (const s of L.segments) for (let x = s.x0 + 20; x < s.x1 - 10; x += 34) out.push([x, s.depth - 8, 16, 0.55, "#ffd48a", 0.16]);
  return out;
}

/** String lights zigzagging between the shopfronts, a dead bulb when one's broken. */
export function homeWallLights(ctx: Ctx, L: Layout, info: WallLightsInfo, glow: boolean): void {
  if (!homeData(L)) return;
  const y0 = 2;
  const colors = ["#ffd84a", "#ff6b8b", "#5ad1ff", "#86e07f", "#ffb35a"];
  for (let x = 6, i = 0; x < L.W - 4; x += 10, i++) {
    const sag = Math.round(Math.sin(((x % 80) / 80) * Math.PI) * 4);
    const y = y0 + sag;
    if (!glow) {
      ctx.fillStyle = "#3a3846";
      ctx.fillRect(x, y - 1, 10, 1);
    }
    const dead = info.brokenBulbX !== null && Math.abs(info.brokenBulbX - x) < 5;
    const lit = !dead && (info.night > 0.2 || info.party);
    const c = colors[(info.party ? Math.floor(info.t * 6) + i : i) % colors.length]!;
    if (glow) {
      if (!lit) continue;
      ctx.fillStyle = `${c}55`;
      ctx.fillRect(x - 2, y - 1, 6, 6);
    } else {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = dead ? "#5a5862" : lit ? c : shade(c, -0.35);
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
}

export type { Rect };
