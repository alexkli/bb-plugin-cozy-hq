// Mountain Cabin: the sky and the view through the big windows. Jagged
// peaks lit from the left with snow in their gullies and rock on the steep
// faces, a paler range behind, a glacier between two summits, snowfields in
// front with a piste, a chairlift up to a hut and a cable car across the sky.
// Pink alpenglow at sunset and dawn, moonlit blue at night, the odd clear
// night with a green aurora. Now and then: skiers, an eagle circling, a
// slough of snow off a far face. Clicking a window starts one of those.
import type { OutsideInfo, PaintInfo, SkyColors } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, makeCanvas, mix } from "../../themekit.ts";
import { clamp, h2 } from "./kit.ts";
import { isOpen, planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ the sky

const SKY: [number, string, string, number][] = [
  [0, "#060b1e", "#131d42", 1],
  [5, "#0d1430", "#2a2f5e", 0.92],
  [6.2, "#4a4a8a", "#f2a58a", 0.45],
  [7.4, "#3d86d8", "#cfe6f6", 0.05],
  [8.5, "#2f72cc", "#b8dcf4", 0],
  [16.5, "#3478cf", "#bfe0f6", 0],
  [18.3, "#5a6fb8", "#f6c6a0", 0.15],
  [19.2, "#3e3a7a", "#f08a7a", 0.45],
  [20.3, "#141a40", "#3a3468", 0.85],
  [21.5, "#070c22", "#141e44", 1],
  [24, "#060b1e", "#131d42", 1],
];

/** A deep, clear blue by day (thin air), pink at the edges of the day, inky at night. */
export function sky(hour: number): SkyColors {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0, n0] = SKY[i]!;
    const [h1, t1, b1, n1] = SKY[i + 1]!;
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), night: n0 + (n1 - n0) * k };
    }
  }
  return { top: "#2f72cc", bottom: "#b8dcf4", night: 0 };
}

/** How pink the peaks are: the last light of the day (and the first). */
export function alpenglow(hour: number): number {
  const bell = (c: number, w: number) => Math.max(0, 1 - Math.abs(hour - c) / w);
  return Math.min(1, bell(19.0, 0.9) + bell(6.4, 0.6));
}

// ------------------------------------------------------------------ the panorama

interface Pal {
  lit: string;
  shade: string;
  rock: string;
  rockS: string;
  far: string;
  farS: string;
  farRock: string;
  ice: string;
  iceS: string;
  fg: string;
  fgS: string;
  hut: string;
  hutWin: string;
  cable: string;
}

const PAL: Record<"day" | "glow" | "dusk" | "night", Pal> = {
  day: { lit: "#f6fafe", shade: "#a8bfdc", rock: "#7a808c", rockS: "#4d5566", far: "#dbe6f2", farS: "#b4c5da", farRock: "#9aa9bd", ice: "#cdeaf6", iceS: "#92c2de", fg: "#f4f8fc", fgS: "#c6d6e9", hut: "#7a4e30", hutWin: "#3a3046", cable: "#3a3d46" },
  glow: { lit: "#ffd6c0", shade: "#c494ae", rock: "#9a6a72", rockS: "#6a4a60", far: "#f0c0bc", farS: "#b48ea8", farRock: "#a07c92", ice: "#f2cfd8", iceS: "#b892b0", fg: "#f6dcd2", fgS: "#c2a0b6", hut: "#6a3e2a", hutWin: "#ffd27a", cable: "#3a2a3a" },
  dusk: { lit: "#b4bde0", shade: "#7a84b2", rock: "#525a7c", rockS: "#3c4262", far: "#96a2cc", farS: "#7682ac", farRock: "#646e96", ice: "#a2b6dc", iceS: "#788aba", fg: "#b0bbdc", fgS: "#8894be", hut: "#3a2a2a", hutWin: "#ffd27a", cable: "#2a2c40" },
  night: { lit: "#8698c2", shade: "#4b5a86", rock: "#2c3452", rockS: "#212840", far: "#566690", farS: "#414e78", farRock: "#364062", ice: "#7890be", iceS: "#546698", fg: "#90a2ca", fgS: "#5f6f9c", hut: "#1e1820", hutWin: "#ffcf6a", cable: "#141826" },
};

interface Peak {
  cx: number;
  top: number;
  kl: number;
  kr: number;
}

function range(W: number, Hv: number, seed: number, far: boolean): Peak[] {
  const out: Peak[] = [];
  let x = -50 - Math.round(h2(seed, 1) * 40);
  for (let i = 0; x < W + 80; i++) {
    const r = h2(i, seed);
    const big = !far && i % 3 === 1;
    const top = Math.round(Hv * (far ? 0.24 + r * 0.14 : big ? 0.04 + r * 0.06 : 0.16 + r * 0.16));
    out.push({ cx: x, top, kl: (far ? 0.55 : 0.85) + h2(i, seed + 3) * 0.5, kr: (far ? 0.6 : 0.95) + h2(i, seed + 4) * 0.6 });
    x += (far ? 50 : 62) + Math.round(h2(i, seed + 9) * (far ? 40 : 64));
  }
  return out;
}

/** The ridge line at x and which peak makes it (for lit or shaded flanks). */
function ridgeAt(peaks: Peak[], x: number, jag: number): { y: number; p: Peak } {
  let best = peaks[0]!;
  let by = Infinity;
  for (const p of peaks) {
    const y = p.top + Math.abs(x - p.cx) * (x < p.cx ? p.kl : p.kr);
    if (y < by) {
      by = y;
      best = p;
    }
  }
  const j = (h2(x >> 1, 5) - 0.5) * jag + (h2(x >> 3, 6) - 0.5) * jag * 1.4;
  return { y: by + j, p: best };
}

/** Where the cable car runs (its cable is painted into the view, the cabin is live). */
function gondolaY(x: number, W: number, Hv: number): number {
  return Hv * 0.44 - (x / Math.max(1, W)) * Hv * 0.3;
}

/** Where the chairlift climbs in the view: from the bottom of the open sky (or a window) up to a hut. */
export function viewLift(L: Layout): { x0: number; y0: number; x1: number; y1: number } | null {
  return cached(`cabin|viewlift|${L.W}x${L.H}|${L.wall.windows.length}`, () => {
    const p = planOf(L);
    const Hv = viewH(L);
    const side = p?.deckSide === "east" ? p.opens.find((o) => o.y === 0 && o.h > 30) : undefined;
    if (side) return { x0: side.x + side.w - 10, y0: side.y + side.h, x1: side.x + Math.round(side.w * 0.28), y1: Math.round(Hv * 0.42) };
    const wins = L.wall.windows.filter((w) => !isOpen(p, w));
    const w = wins[wins.length - 1];
    if (!w) return null;
    return { x0: w.x + Math.round(w.w * 0.85), y0: w.y + w.h, x1: w.x + Math.round(w.w * 0.3), y1: w.y + Math.round(w.h * 0.42) };
  });
}

function viewH(L: Layout): number {
  return Math.max(10, ...L.wall.windows.map((w) => w.y + w.h));
}

function panorama(L: Layout, mood: keyof typeof PAL): HTMLCanvasElement {
  const W = L.W;
  const Hv = viewH(L);
  const lift = viewLift(L);
  return cached(`cabin|pano|${mood}|${W}x${Hv}|${lift ? `${lift.x0},${lift.y1}` : "-"}`, () =>
    makeCanvas(W, Hv, (ctx) => {
      const P = PAL[mood];
      const px = (x: number, y: number, c: string, w = 1, h = 1) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, h);
      };
      // The far range, pale with distance.
      const far = range(W, Hv, 31, true);
      for (let x = 0; x < W; x++) {
        const { y, p } = ridgeAt(far, x, 2);
        const lit = x < p.cx;
        const cliff = 2 + h2(x >> 2, 12) * 7 * (h2(x >> 4, 13) > 0.4 ? 1 : 0.3);
        for (let yy = Math.max(0, Math.round(y)); yy < Hv; yy++) {
          const d = yy - y;
          const rock = d > 1 && d < cliff && h2(x, yy >> 1) > 0.3;
          px(x, yy, rock ? P.farRock : lit ? P.far : P.farS);
        }
      }
      // The main peaks: snow lit from the left and blue in the shade, rock cliffs under the
      // steep ridges cut by snowy gullies, ledges of snow across the rock.
      const main = range(W, Hv, 7, false);
      const ridge: number[] = [];
      for (let x = 0; x < W; x++) {
        const { y, p } = ridgeAt(main, x, 3);
        ridge.push(y);
        const lit = x < p.cx;
        const k = x < p.cx ? p.kl : p.kr;
        const near = Math.max(0, 1 - Math.abs(x - p.cx) / 44);
        const gully = h2(x >> 1, 21) < 0.2 || h2(x >> 2, 22) < 0.1;
        const cliff = gully ? 0 : (2 + h2(x >> 2, 23) * 9 + h2(x >> 3, 24) * 9) * (0.4 + near * 0.9) * (k > 1.15 ? 1.3 : 0.75);
        let run = 0;
        for (let yy = Math.max(0, Math.round(y)); yy < Hv; yy++) {
          const d = yy - y;
          const ledge = h2(x >> 2, (yy >> 1) + 300) < 0.12;
          const rock = d > 1 && d < cliff && !ledge;
          run = rock ? run + 1 : 0;
          const snow = lit ? (d > Hv * 0.4 ? mix(P.lit, P.shade, 0.22) : P.lit) : P.shade;
          px(x, yy, rock ? (run === 1 && lit ? mix(P.rock, P.lit, 0.35) : lit ? P.rock : P.rockS) : snow);
        }
        if (h2(x >> 1, 25) < 0.05) px(x, Math.round(y + 14 + h2(x, 26) * 10), lit ? P.rock : P.rockS, 2, 1);
        if (y >= 0) px(x, Math.round(y), lit ? P.lit : mix(P.lit, P.shade, 0.5));
      }
      // Glaciers: from cols between big peaks, tongues of blue ice with crevasses.
      for (let i = 1; i < main.length; i++) {
        const a = main[i - 1]!;
        const b = main[i]!;
        if (b.cx - a.cx < 70 || (i * 7) % 3 !== 0) continue;
        const colX = Math.round((a.cx * b.kl + b.cx * a.kr) / (a.kr + b.kl));
        const colY = Math.round(ridge[clamp(colX, 0, W - 1)] ?? Hv * 0.4) + 2;
        const endY = Math.round(Hv * 0.8);
        for (let yy = colY; yy < endY; yy++) {
          const k = (yy - colY) / Math.max(1, endY - colY);
          const half = Math.round(3 + k * 9 - k * k * 6);
          const cx = colX + Math.round(Math.sin(k * 3) * 4);
          for (let x = cx - half; x <= cx + half; x++) {
            if (x < 0 || x >= W) continue;
            const crev = (yy - colY) % 4 === 0 && Math.abs(x - cx) < half - 1;
            px(x, yy, crev ? P.iceS : x < cx - half / 3 ? P.ice : mix(P.ice, P.iceS, 0.4));
          }
        }
      }
      // The cable car's cable across the sky.
      for (let x = 0; x < W; x++) px(x, Math.round(gondolaY(x, W, Hv)), P.cable);
      // Snowfields in front, wavy, with soft hollows and a few rocks.
      for (let x = 0; x < W; x++) {
        const top = Math.round(Hv * 0.8 + Math.sin(x * 0.031) * 3 + Math.sin(x * 0.011 + 1) * 4);
        for (let yy = top; yy < Hv; yy++) {
          const hollow = Math.sin(x * 0.07 + yy * 0.3) > 0.75;
          px(x, yy, yy === top ? P.lit : hollow ? P.fgS : P.fg);
        }
        if (h2(x >> 2, 44) < 0.04) px(x, top + 3, P.rockS, 3, 2);
      }
      // The chairlift up to its hut: towers and two cables.
      if (lift) {
        const n = Math.max(2, Math.round(Math.hypot(lift.x1 - lift.x0, lift.y1 - lift.y0) / 14));
        for (let i = 0; i <= n * 6; i++) {
          const k = i / (n * 6);
          const x = Math.round(lift.x0 + (lift.x1 - lift.x0) * k);
          const y = Math.round(lift.y0 + (lift.y1 - lift.y0) * k);
          px(x - 1, y, P.cable);
          px(x + 1, y + 1, P.cable);
        }
        for (let i = 1; i < n; i++) {
          const k = i / n;
          const x = Math.round(lift.x0 + (lift.x1 - lift.x0) * k);
          const y = Math.round(lift.y0 + (lift.y1 - lift.y0) * k);
          const th = Math.max(2, Math.round(5 * (1 - k * 0.6)));
          px(x, y, P.rockS, 1, th);
          px(x - 1, y, P.rockS, 3, 1);
        }
        // The hut at the top: a little timber station with a snowy roof.
        const hx = lift.x1 - 4;
        const hy = lift.y1 - 2;
        px(hx, hy, P.hut, 8, 4);
        px(hx - 1, hy - 2, P.lit, 10, 2);
        px(hx + 2, hy + 1, P.hutWin, 2, 1);
        px(hx + 5, hy + 1, P.hutWin, 1, 1);
      }
    }),
  );
}

// ------------------------------------------------------------------ what happens out there

/** Something in the view: an eagle circling, a slough of snow off a face, a paraglider. */
interface Show {
  kind: "eagle" | "avalanche" | "glider" | "skiers" | "snowball";
  t0: number;
  x: number;
  y: number;
}

let shows: Show[] = [];
let lastAuto = -1;

/** Start something in the view (a click on a window, or now and then by itself). */
export function startView(L: Layout, t: number, win: Rect, night: number): Show["kind"] {
  const kinds: Show["kind"][] = night > 0.5 ? ["avalanche", "eagle", "snowball"] : ["eagle", "avalanche", "glider", "skiers", "snowball"];
  const busy = new Set(shows.filter((s) => t - s.t0 < 14).map((s) => s.kind));
  const free = kinds.filter((k) => !busy.has(k));
  const kind = free[Math.floor(Math.random() * free.length)] ?? "eagle";
  const Hv = viewH(L);
  shows.push({ kind, t0: t, x: win.x + Math.round(win.w * (0.25 + Math.random() * 0.5)), y: Math.round(Hv * (kind === "avalanche" ? 0.2 : 0.3)) });
  if (shows.length > 6) shows.shift();
  return kind;
}

export function viewShows(): readonly Show[] {
  return shows;
}

function eagle(ctx: Ctx, x: number, y: number, t: number, c: string): void {
  const flap = Math.sin(t * 3) > 0.6;
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
  ctx.fillRect(Math.round(x) - 3, Math.round(y) - (flap ? 1 : 0), 2, 1);
  ctx.fillRect(Math.round(x) + 2, Math.round(y) - (flap ? 1 : 0), 2, 1);
  ctx.fillRect(Math.round(x) - 4, Math.round(y) + (flap ? -2 : 1), 1, 1);
  ctx.fillRect(Math.round(x) + 4, Math.round(y) + (flap ? -2 : 1), 1, 1);
}

/** A tiny skier: a dark body and a bright jacket, skis under. */
function skier(ctx: Ctx, x: number, y: number, jacket: string, dir: number): void {
  const X = Math.round(x);
  const Y = Math.round(y);
  ctx.fillStyle = jacket;
  ctx.fillRect(X, Y - 2, 1, 2);
  ctx.fillStyle = "#2a2c36";
  ctx.fillRect(X, Y - 3, 1, 1);
  ctx.fillRect(X + (dir > 0 ? 1 : -1), Y - 1, 1, 1);
  ctx.fillStyle = "#3a3d46";
  ctx.fillRect(X - 1, Y, 3, 1);
}

const JACKETS = ["#e0453a", "#f2c230", "#3a8ad8", "#e86aa8", "#4fbf7a", "#f08a3a"];

export function outside(ctx: Ctx, win: Rect, index: number, info: OutsideInfo): void {
  const L = layoutFor(info.windows);
  if (!L) return;
  const { x, y, w, h } = win;
  const n = info.night;
  const g = alpenglow(info.hour);
  const layers: [keyof typeof PAL, number][] = [
    ["day", 1],
    ["glow", n < 0.9 ? g * 0.9 : 0],
    ["dusk", clamp((n - 0.25) / 0.45, 0, 1)],
    ["night", clamp((n - 0.72) / 0.28, 0, 1)],
  ];
  for (const [mood, a] of layers) {
    if (a < 0.02) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(panorama(L, mood), x, y, w, h, x, y, w, h);
  }
  ctx.globalAlpha = 1;
  const t = info.t;
  const wx = info.weather;
  const Hv = viewH(L);
  const overcast = wx !== "clear" && wx !== "partly";
  // Clouds hang on the summits when the weather turns.
  if (overcast) {
    ctx.fillStyle = n > 0.5 ? "rgba(40,46,70,0.55)" : wx === "storm" ? "rgba(96,104,124,0.62)" : "rgba(196,204,216,0.5)";
    ctx.fillRect(x, y, w, Math.round(Hv * 0.5) - y);
    ctx.fillStyle = n > 0.5 ? "rgba(40,46,70,0.3)" : "rgba(214,220,230,0.35)";
    ctx.fillRect(x, y + Math.round(Hv * 0.5) - y, w, Math.round(Hv * 0.12));
  }
  // A rare clear night: green curtains over the peaks.
  if (n > 0.8 && wx === "clear" && auroraNight(info.date)) {
    for (let i = 0; i < w; i++) {
      const X = x + i;
      const k = Math.sin(X * 0.05 + t * 0.4) * 0.5 + Math.sin(X * 0.013 - t * 0.17) * 0.5;
      const top = y + 2 + Math.round((1 + Math.sin(X * 0.021 + t * 0.2)) * 4);
      const len = Math.round(6 + k * 6);
      ctx.fillStyle = `rgba(110,255,170,${(0.1 + 0.12 * (k + 1)).toFixed(3)})`;
      ctx.fillRect(X, top, 1, Math.max(2, len));
      ctx.fillStyle = "rgba(160,120,255,0.12)";
      ctx.fillRect(X, top - 2, 1, 2);
    }
  }
  // The cable car, across and back.
  if (!overcast || wx === "cloudy") {
    const period = 140;
    const ph = (t % period) / period;
    const k = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const cx = Math.round(k * L.W);
    if (cx > x - 4 && cx < x + w + 4) {
      const cy = Math.round(gondolaY(cx, L.W, Hv));
      ctx.fillStyle = "#3a3d46";
      ctx.fillRect(cx, cy, 1, 2);
      ctx.fillStyle = n > 0.6 ? "#7a2a2a" : "#d0453a";
      ctx.fillRect(cx - 2, cy + 2, 5, 3);
      ctx.fillStyle = n > 0.6 ? "#ffd27a" : "#cfe6f5";
      ctx.fillRect(cx - 1, cy + 3, 3, 1);
    }
  }
  // Chairs on the lift going up (right cable) and coming down.
  const lift = viewLift(L);
  if (lift && n < 0.9) {
    const len = Math.hypot(lift.x1 - lift.x0, lift.y1 - lift.y0);
    for (let i = 0; i < 6; i++) {
      for (const dir of [1, -1]) {
        const k = ((t * 6) / len + i / 6 + (dir < 0 ? 0.08 : 0)) % 1;
        const kk = dir > 0 ? k : 1 - k;
        const cx = Math.round(lift.x0 + (lift.x1 - lift.x0) * kk) + (dir > 0 ? 1 : -1);
        const cy = Math.round(lift.y0 + (lift.y1 - lift.y0) * kk) + (dir > 0 ? 1 : 0);
        if (cx < x - 2 || cx > x + w + 2 || cy < y || cy > y + h) continue;
        ctx.fillStyle = "#2a2c36";
        ctx.fillRect(cx, cy, 1, 2);
        ctx.fillRect(cx - 1, cy + 2, 3, 1);
        if (dir > 0 && (i + Math.floor(t / 40)) % 3 !== 0) {
          ctx.fillStyle = JACKETS[(i * 3 + Math.floor(t / 40)) % JACKETS.length]!;
          ctx.fillRect(cx, cy + 1, 1, 1);
        }
      }
    }
  }
  // Skiers zigzagging down the snowfields by day.
  if (n < 0.45 && wx !== "storm") {
    for (let i = 0; i < 3; i++) {
      const period = 34 + i * 9;
      const ph = ((t + i * 13 + index * 7) % period) / period;
      const sx = x + ((i * 37 + index * 19) % Math.max(1, w - 10)) + 5 + Math.round(Math.sin(ph * Math.PI * 6) * 5);
      const sy = Math.round(Hv * 0.62 + ph * Hv * 0.4);
      if (sy < y + h - 1 && sy > Hv * 0.66) skier(ctx, sx, sy, JACKETS[(i + index) % JACKETS.length]!, Math.cos(ph * Math.PI * 6));
    }
  }
  // The shows someone started (or the mountains did).
  maybeAuto(L, t, n, wx);
  for (const s of shows) drawShow(ctx, s, win, t, n, Hv);
  // Frost creeping into the corners of the glass on cold days and nights.
  if (!isOpen(planOf(L), win)) frost(ctx, win, info);
}

/** One night in five is an aurora night (it shows only when it's clear). */
function auroraNight(date: Date): boolean {
  const d = new Date(date.getTime() - 12 * 3600 * 1000);
  return h2(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(), 71) < 0.2;
}

function maybeAuto(L: Layout, t: number, n: number, wx: string): void {
  if (lastAuto < 0) lastAuto = t;
  if (t - lastAuto < 150) return;
  lastAuto = t;
  if (wx === "storm" || wx === "fog") return;
  const wins = L.wall.windows;
  const win = wins[Math.floor(Math.random() * wins.length)];
  if (win) startView(L, t, win, n);
}

function drawShow(ctx: Ctx, s: Show, win: Rect, t: number, n: number, Hv: number): void {
  const e = t - s.t0;
  const { x, y, w, h } = win;
  const inWin = (px: number, py: number) => px >= x - 6 && px <= x + w + 6 && py >= y - 2 && py <= y + h + 2;
  switch (s.kind) {
    case "eagle": {
      if (e > 16) return;
      const cx = s.x + Math.cos(e * 0.6) * 18 + e * 1.5;
      const cy = s.y + Math.sin(e * 0.6) * 6 - e * 0.4;
      if (inWin(cx, cy)) eagle(ctx, cx, cy, t, n > 0.5 ? "#141826" : "#3a2a24");
      return;
    }
    case "glider": {
      if (e > 22) return;
      const gx = s.x - 30 + e * 3;
      const gy = s.y - 6 + e * 0.9 + Math.sin(e * 0.8) * 2;
      if (!inWin(gx, gy)) return;
      ctx.fillStyle = "#f08a3a";
      ctx.fillRect(Math.round(gx) - 4, Math.round(gy), 9, 1);
      ctx.fillRect(Math.round(gx) - 3, Math.round(gy) - 1, 7, 1);
      ctx.fillStyle = "#3a3d46";
      ctx.fillRect(Math.round(gx) - 2, Math.round(gy) + 1, 1, 3);
      ctx.fillRect(Math.round(gx) + 2, Math.round(gy) + 1, 1, 3);
      ctx.fillStyle = "#2a2c36";
      ctx.fillRect(Math.round(gx), Math.round(gy) + 4, 1, 2);
      return;
    }
    case "avalanche": {
      // A slough of powder rolling down a far face, billowing as it goes.
      if (e > 10) return;
      const k = Math.min(1, e / 6);
      const fade = e > 6 ? 1 - (e - 6) / 4 : 1;
      for (let i = 0; i < 9; i++) {
        const q = Math.max(0, k - i * 0.06);
        if (q <= 0) continue;
        const px = s.x + i * 1.5 + q * 10;
        const py = s.y + q * Hv * 0.45;
        const r = 1 + Math.round(q * 4 + (i % 3));
        if (!inWin(px, py)) continue;
        ctx.globalAlpha = 0.85 * fade;
        ctx.fillStyle = n > 0.5 ? "#a8b4d4" : "#ffffff";
        ctx.fillRect(Math.round(px - r), Math.round(py - r / 2), r * 2, r);
        ctx.fillRect(Math.round(px - r / 2), Math.round(py - r), r, r * 2);
      }
      ctx.globalAlpha = 1;
      return;
    }
    case "skiers": {
      // A whole ski school snaking down in a line.
      if (e > 14) return;
      for (let i = 0; i < 6; i++) {
        const q = (e - i * 0.7) / 12;
        if (q < 0 || q > 1) continue;
        const sx = s.x + Math.sin(q * Math.PI * 5) * 8;
        const sy = Hv * 0.6 + q * Hv * 0.38;
        if (inWin(sx, sy)) skier(ctx, sx, sy, JACKETS[i % JACKETS.length]!, Math.cos(q * Math.PI * 5));
      }
      return;
    }
    case "snowball": {
      // Kids out on the snowfield throwing snowballs at each other.
      if (e > 9) return;
      const by = Math.round(Hv * 0.9);
      const ax = s.x - 12;
      const bx = s.x + 12;
      if (inWin(ax, by)) skier(ctx, ax, by, JACKETS[0]!, 1);
      if (inWin(bx, by)) skier(ctx, bx, by, JACKETS[2]!, -1);
      const k = (e * 1.2) % 1;
      const from = Math.floor(e * 1.2) % 2 ? ax : bx;
      const to = from === ax ? bx : ax;
      const sx = from + (to - from) * k;
      const sy = by - 3 - Math.sin(k * Math.PI) * 5;
      if (inWin(sx, sy)) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
      return;
    }
  }
}

function frost(ctx: Ctx, win: Rect, info: PaintInfo): void {
  const cold = info.weather === "snow" || info.weather === "storm" || info.night > 0.6 || info.date.getMonth() < 2 || info.date.getMonth() === 11;
  if (!cold) return;
  ctx.fillStyle = "rgba(235,246,255,0.55)";
  const { x, y, w, h } = win;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x + 4, y + h - 3 - i, 6 - i, 1);
    ctx.fillRect(x + w - 10 + i, y + h - 3 - i, 6 - i, 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(x + 5, y + h - 6, 1, 1);
  ctx.fillRect(x + w - 6, y + h - 7, 1, 1);
}

/** The layout these windows belong to (outside() doesn't get it; the windows array identifies it). */
let knownL: Layout | null = null;
export function bindView(L: Layout): void {
  if (knownL !== L) {
    knownL = L;
    shows = [];
  }
}
function layoutFor(windows: Rect[]): Layout | null {
  return knownL && knownL.wall.windows === windows ? knownL : knownL;
}

// ------------------------------------------------------------------ a window clicked open

const opened = new Map<number, number>();

/** Cold air and a few flakes blow in; something happens out there. */
export function openWindow(ctx: Ctx, win: Rect, k: number, info: PaintInfo): boolean {
  const L = knownL;
  const key = win.x * 1000 + win.y;
  const last = opened.get(key) ?? -10;
  if (L && info.t - last > 1) startView(L, info.t, win, info.night);
  opened.set(key, info.t);
  const t = info.t;
  const sill = win.y + win.h + 2;
  for (let j = 0; j < 6; j++) {
    const p = (t * 0.5 + j / 6) % 1;
    const fx = win.x + 6 + ((j * 29) % Math.max(1, win.w - 12)) + Math.round(Math.sin(t * 2 + j * 1.3) * 4);
    const fy = sill + Math.round(p * 30);
    ctx.globalAlpha = k * (1 - p) * 0.9;
    ctx.fillStyle = j % 2 ? "#ffffff" : "#d6e8f6";
    ctx.fillRect(fx, fy, j % 3 ? 1 : 2, 1);
  }
  ctx.globalAlpha = 1;
  // The lower sash pushed open: a bright gap under the transom.
  ctx.fillStyle = `rgba(230,244,255,${(0.35 * k).toFixed(3)})`;
  ctx.fillRect(win.x + 1, win.y + Math.round(win.h * 0.28) + 3, win.w - 2, 2);
  return true;
}
