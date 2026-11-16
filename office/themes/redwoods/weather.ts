// Redwood Camp's weather out in the open: rain streaking down over the whole
// camp with splashes and puddles on the trails, snow falling and settling,
// storm gusts tearing needles off the trees, fog drifting between the trunks
// and cloud shadows sliding over on partly cloudy days.
import type { PaintInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { makeCanvas } from "../../themekit.ts";
import { cached } from "./kit.ts";
import { campData } from "./plan.ts";
import { canopyEdge, underTop } from "./treeline.ts";

type Ctx = CanvasRenderingContext2D;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
const ih = (a: number, b: number) => ((Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0) % 100000;

const rainy = (w: string) => w === "rain" || w === "storm" || w === "drizzle";

/** How wet the camp is and how much snow lies, 0..1, easing in and out as the weather turns. */
let wet = -1;
let snow = -1;
let lastT = -1;

function settle(info: PaintInfo): void {
  const dt = lastT < 0 ? 0 : Math.min(1, Math.max(0, info.t - lastT));
  lastT = info.t;
  const r = rainy(info.weather);
  const s = info.weather === "snow";
  wet = wet < 0 ? (r ? 1 : 0) : Math.min(1, Math.max(0, wet + (r ? dt / 25 : -dt / 150)));
  snow = snow < 0 ? (s ? 1 : 0) : Math.min(1, Math.max(0, snow + (s ? dt / 60 : -dt / 200)));
}

/** Places that stay dry or bare: rooms and tents (they have roofs), fixtures, the creek. */
function covered(L: Layout): Rect[] {
  const d = campData(L);
  const out: Rect[] = L.rooms.filter((r) => r.kind !== "lounge" && r.kind !== "games" && r.kind !== "garden" && r.kind !== "library").map((r) => ({ x: r.rect.x - 2, y: r.rect.y - 8, w: r.rect.w + 4, h: r.rect.h + 8 }));
  for (const t of d?.tents ?? []) out.push({ x: t.x - 6, y: t.y - 10, w: t.w + 12, h: t.h + 12 });
  const w = L.wall;
  for (const r of [w.pinboard, w.calendar, w.status, w.door, w.legendNote, ...w.windows]) out.push({ x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 });
  out.push({ x: w.clock.x - 16, y: 0, w: 32, h: w.clock.y + w.clock.r + 26 });
  out.push({ x: L.tv.x - 2, y: L.tv.y - 2, w: L.tv.w + 4, h: L.tv.h + 4 });
  const creek = d?.creek ? d.strips[1] : null;
  if (creek) out.push({ x: creek.x - 1, y: 0, w: creek.w + 2, h: L.H });
  return out;
}

// ------------------------------------------------------------------ settled snow

function snowCover(L: Layout): HTMLCanvasElement {
  return cached(`redwoods|snowcover|${L.W}x${L.H}|${L.wall.windows.length}`, () =>
    makeCanvas(L.W, L.H, (ctx) => {
      const { W, H } = L;
      const img = ctx.createImageData(W, H);
      const px = img.data;
      const cell = 9;
      const cw = Math.ceil(W / cell) + 2;
      const ch = Math.ceil(H / cell) + 2;
      const lattice = new Float32Array(cw * ch);
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) lattice[j * cw + i] = ih(i + 7, j + 3) / 100000;
      const noise = (x: number, y: number) => {
        const gx = Math.floor(x / cell);
        const gy = Math.floor(y / cell);
        const fx = x / cell - gx;
        const fy = y / cell - gy;
        const v = (i: number, j: number) => lattice[Math.min(ch - 1, j) * cw + Math.min(cw - 1, i)]!;
        const a = v(gx, gy) + (v(gx + 1, gy) - v(gx, gy)) * fx;
        const b = v(gx, gy + 1) + (v(gx + 1, gy + 1) - v(gx, gy + 1)) * fx;
        return a + (b - a) * fy;
      };
      const depthAt = (x: number) => (L.segments.find((s) => x >= s.x0 && x < s.x1) ?? L.segments[0]!).depth;
      const put = (x: number, y: number, r: number, g: number, b: number, a: number) => {
        const o = (y * W + x) * 4;
        px[o] = r;
        px[o + 1] = g;
        px[o + 2] = b;
        px[o + 3] = a;
      };
      for (let x = 0; x < W; x++) {
        const d = depthAt(x);
        const e = canopyEdge(x);
        const u = underTop(x, d);
        for (let y = 0; y < H; y++) {
          const n = noise(x, y) + (bayer(x, y) - 0.5) * 0.28;
          if (y < d) {
            // Snow on the canopy's upper boughs and on top of the undergrowth.
            if (y < e - 1 && n > 0.42 && (x * 7 + y * 3) % 4 !== 0) put(x, y, 244, 248, 252, 230);
            else if (y >= u - 1 && y <= u + 1 && n > 0.3) put(x, y, 240, 245, 250, 235);
            continue;
          }
          if (n > 0.5) put(x, y, 246, 249, 252, 235);
          else if (n > 0.4) put(x, y, 222, 232, 242, 150);
        }
      }
      ctx.putImageData(img, 0, 0);
      // Keep it off the roofed-over and the fixtures.
      for (const r of covered(L)) ctx.clearRect(r.x, Math.max(r.y, 0), r.w, r.h);
    }),
  );
}

// ------------------------------------------------------------------ puddles

interface Puddle {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

function puddles(L: Layout): Puddle[] {
  return cached(`redwoods|puddles|${L.W}x${L.H}|${L.net.halls.join(",")}`, () => {
    const out: Puddle[] = [];
    const keep = covered(L);
    const clear = (p: Puddle) => !keep.some((r) => p.x + p.rx > r.x && p.x - p.rx < r.x + r.w && p.y + p.ry > r.y && p.y - p.ry < r.y + r.h);
    const d = campData(L);
    const bridges = d?.bridges ?? [];
    const wallMin = Math.min(...L.segments.map((s) => s.depth));
    for (const [i, hy] of L.net.halls.entries()) {
      for (let x = 30 + (i * 47) % 60; x < L.W - 20; x += 80 + (ih(x, i) % 70)) {
        const p: Puddle = { x, y: hy + ((ih(x, i + 9) % 5) - 2), rx: 5 + (ih(x, i + 3) % 6), ry: 2 + (ih(x, i + 5) % 2) };
        if (clear(p) && !bridges.some((b) => Math.abs(b.x + b.w / 2 - x) < 18)) out.push(p);
      }
    }
    for (const [i, ax] of L.net.aisles.entries()) {
      for (let y = wallMin + 30 + (i * 31) % 40; y < L.H - 12; y += 90 + (ih(y, i) % 80)) {
        if (L.net.halls.some((hy) => Math.abs(hy - y) < 16)) continue;
        const p: Puddle = { x: ax + ((ih(y, i + 2) % 5) - 2), y, rx: 4 + (ih(y, i + 4) % 3), ry: 2 };
        if (clear(p)) out.push(p);
      }
    }
    return out;
  });
}

function puddleSprite(rx: number, ry: number): HTMLCanvasElement {
  return cached(`redwoods|puddle|${rx}x${ry}`, () =>
    makeCanvas(rx * 2 + 1, ry * 2 + 2, (ctx) => {
      for (let j = -ry; j <= ry; j++) {
        const half = Math.round(rx * Math.sqrt(1 - (j * j) / ((ry + 0.5) * (ry + 0.5))));
        ctx.fillStyle = j === ry ? "rgba(40,30,20,0.35)" : "rgba(78,98,122,0.62)";
        ctx.fillRect(rx - half, j + ry, half * 2 + 1, 1);
      }
      // The sky's reflection
      ctx.fillStyle = "rgba(196,214,230,0.65)";
      ctx.fillRect(rx - Math.round(rx * 0.5), 1, Math.round(rx * 0.6), 1);
      ctx.fillRect(rx + 1, ry, Math.round(rx * 0.3), 1);
    }),
  );
}

// ------------------------------------------------------------------ cloud shadows

function shadowBlob(): HTMLCanvasElement {
  return cached("redwoods|cloudshadow", () =>
    makeCanvas(320, 150, (ctx) => {
      for (const [cx, cy, r] of [
        [110, 80, 84],
        [196, 66, 74],
        [160, 94, 64],
        [250, 88, 50],
      ] as const) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(18,26,40,0.2)");
        g.addColorStop(0.65, "rgba(18,26,40,0.13)");
        g.addColorStop(1, "rgba(18,26,40,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 320, 150);
      }
    }),
  );
}

/** Haze in the treeline, fading out onto the camp floor (1 px wide, stretched across). */
function bandHaze(depth: number): HTMLCanvasElement {
  return cached(`redwoods|bandhaze|${depth}`, () =>
    makeCanvas(1, depth + 14, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, depth + 14);
      g.addColorStop(0, "rgba(226,232,236,0.3)");
      g.addColorStop(depth / (depth + 14), "rgba(226,232,236,0.2)");
      g.addColorStop(1, "rgba(226,232,236,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1, depth + 14);
    }),
  );
}

function fogWisp(): HTMLCanvasElement {
  return cached("redwoods|fogwisp", () =>
    makeCanvas(130, 26, (ctx) => {
      for (const [cx, cy, r] of [
        [40, 14, 34],
        [80, 12, 40],
        [104, 15, 24],
      ] as const) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(236,240,244,0.32)");
        g.addColorStop(1, "rgba(236,240,244,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.32);
        ctx.translate(-cx, -cy);
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
      }
    }),
  );
}

// ------------------------------------------------------------------ the hooks

/** Under people and furniture: wet ground and puddles, settled snow. */
export function weatherUnder(ctx: Ctx, L: Layout, info: PaintInfo): void {
  settle(info);
  const t = info.t;
  const wallMin = Math.min(...L.segments.map((s) => s.depth));
  if (wet > 0.01) {
    ctx.fillStyle = `rgba(24,34,48,${(0.08 * wet).toFixed(3)})`;
    ctx.fillRect(0, wallMin, L.W, L.H - wallMin);
    const ps = puddles(L);
    ctx.globalAlpha = wet;
    for (const p of ps) ctx.drawImage(puddleSprite(p.rx, p.ry), p.x - p.rx, p.y - p.ry);
    ctx.globalAlpha = 1;
    if (rainy(info.weather)) {
      // Rings spreading where the drops land
      ctx.fillStyle = "rgba(214,230,244,0.7)";
      for (const [i, p] of ps.entries()) {
        const k = (t * 1.3 + i * 0.37) % 1;
        const r = Math.round(1 + k * (p.rx - 2));
        const cx = p.x + ((i * 5) % 5) - 2;
        if (k > 0.85) continue;
        ctx.fillRect(cx - r, p.y, 1, 1);
        ctx.fillRect(cx + r, p.y, 1, 1);
        if (r > 2) {
          ctx.fillRect(cx - r + 1, p.y - 1, r * 2 - 1, 1);
          ctx.fillRect(cx - r + 1, p.y + 1, r * 2 - 1, 1);
        }
      }
    }
  }
  if (snow > 0.01) {
    ctx.globalAlpha = Math.min(1, snow) * 0.9;
    ctx.drawImage(snowCover(L), 0, 0);
    ctx.globalAlpha = 1;
  }
}

/** Over everything: rain, snow, gusts, fog in the treeline, cloud shadows. */
export function weatherOver(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const t = info.t;
  const wx = info.weather;
  const { W, H } = L;
  const wallMin = Math.min(...L.segments.map((s) => s.depth));
  const night = info.night > 0.5;
  // Storms come in gusts.
  const gust = wx === "storm" ? Math.max(0, Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1)) : 0;
  if (rainy(wx)) {
    // A cool grey wash, then the streaks: a faint tail and a bright head per drop.
    ctx.fillStyle = `rgba(52,62,84,${wx === "storm" ? 0.16 : wx === "rain" ? 0.1 : 0.05})`;
    ctx.fillRect(0, 0, W, H);
    const per = wx === "storm" ? 520 : wx === "rain" ? 760 : 2600;
    const n = Math.round((W * H) / per);
    const speed = wx === "storm" ? 260 : wx === "rain" ? 210 : 120;
    const slant = wx === "storm" ? 0.3 + gust * 0.5 : wx === "rain" ? 0.12 : 0.04;
    const len = wx === "drizzle" ? 2 : 4;
    const drop = (i: number) => {
      const v = 0.85 + (i % 5) * 0.06;
      const y = ((i * 53.7 + t * speed * v) % (H + 20)) - 10;
      const x = ((((i * 97.13 + y * slant) % (W + 40)) + W + 40) % (W + 40)) - 20;
      return [Math.round(x), Math.round(y)] as const;
    };
    if (wx !== "drizzle") {
      ctx.fillStyle = night ? "rgba(140,160,196,0.28)" : "rgba(206,222,240,0.32)";
      for (let i = 0; i < n; i++) {
        const [x, y] = drop(i);
        const back = Math.round(len * slant);
        ctx.fillRect(x - back, y - len, 1, len);
      }
    }
    ctx.fillStyle = night ? "rgba(170,188,220,0.7)" : "rgba(232,242,252,0.78)";
    for (let i = 0; i < n; i++) {
      const [x, y] = drop(i);
      if (slant > 0.2) {
        ctx.fillRect(x, y, 1, 2);
        ctx.fillRect(x + 1, y + 2, 1, 2);
      } else ctx.fillRect(x, y, 1, len);
    }
    if (wx !== "drizzle") {
      // Splashes on the camp floor
      ctx.fillStyle = night ? "rgba(170,186,214,0.6)" : "rgba(226,236,248,0.7)";
      const m = Math.round(n / 5);
      for (let i = 0; i < m; i++) {
        const ph = t / 0.5 + i * 0.37;
        const cyc = Math.floor(ph);
        const k = ph - cyc;
        if (k > 0.45) continue;
        const h = ih(i + 1, cyc);
        const x = h % W;
        const y = wallMin + 4 + ((h >> 7) % Math.max(1, H - wallMin - 6));
        if (k < 0.2) {
          ctx.fillRect(x - 1, y - 1, 1, 1);
          ctx.fillRect(x + 1, y - 1, 1, 1);
          ctx.fillRect(x, y - 2, 1, 1);
          ctx.fillRect(x - 2, y, 1, 1);
          ctx.fillRect(x + 2, y, 1, 1);
        } else {
          ctx.fillRect(x - 3, y, 2, 1);
          ctx.fillRect(x + 2, y, 2, 1);
        }
      }
    }
  }
  if (gust > 0.12) {
    // Needles and leaves torn off in the gusts
    const colors = ["#6e9842", "#b17845", "#4f7334", "#c99a62"];
    for (let i = 0; i < 18; i++) {
      const x = ((i * 137 + t * (110 + 90 * gust)) % (W + 40)) - 20;
      const y = ((i * 71) % Math.max(1, H - 20)) + 10 + Math.sin(t * 3 + i) * 6;
      ctx.globalAlpha = Math.min(1, gust * 1.5);
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.fillRect(Math.round(x), Math.round(y), Math.floor(t * 8 + i) % 2 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  if (wx === "snow") {
    const n = Math.round((W * H) / 1100);
    for (let i = 0; i < n; i++) {
      const big = i % 5 === 0;
      const speed = (big ? 16 : 9) + (i % 4) * 2;
      const y = ((i * 37.3 + t * speed) % (H + 10)) - 5;
      const sway = Math.sin(t * 0.8 + i * 1.7) * 3;
      const x = ((((i * 61.7 + sway + t * 3) % W) + W) % W);
      ctx.fillStyle = night ? "rgba(214,222,240,0.85)" : "rgba(255,255,255,0.92)";
      ctx.fillRect(Math.round(x), Math.round(y), big ? 2 : 1, big ? 2 : 1);
    }
  }
  if (wx === "fog") {
    // A milky haze over the camp, thicker back in the treeline, with wisps drifting between the trunks.
    ctx.fillStyle = night ? "rgba(110,120,140,0.16)" : "rgba(216,222,228,0.18)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = night ? 0.6 : 1;
    ctx.drawImage(bandHaze(wallMin), 0, 0, W, wallMin + 14);
    ctx.globalAlpha = 1;
    const wisp = fogWisp();
    ctx.globalAlpha = night ? 0.5 : 0.85;
    for (let i = 0; i < Math.ceil(W / 90) + 2; i++) {
      const x = ((t * (2 + (i % 3)) + i * 97) % (W + 160)) - 140;
      const y = 4 + ((i * 17) % Math.max(1, wallMin - 20));
      ctx.drawImage(wisp, Math.round(x), y);
    }
    ctx.globalAlpha = 1;
  }
  if (wx === "partly" && info.night < 0.6) {
    // Cloud shadows sliding over the camp
    const blob = shadowBlob();
    ctx.globalAlpha = 1 - info.night / 0.6;
    for (let i = 0; i < 3; i++) {
      const x = ((t * 5 + 200 + i * (W / 3 + 160)) % (W + 360)) - 330;
      const y = Math.round(wallMin * 0.3 + ((i * 0.33 + 0.08) % 1) * (H - 80));
      ctx.drawImage(blob, Math.round(x), y);
    }
    ctx.globalAlpha = 1;
  }
}

