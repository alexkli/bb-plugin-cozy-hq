// Sky Loft: the view. A dense skyline seen from high up (towers with
// setbacks, Art Deco spires, water towers, a river and a bridge), glittering
// at night; and the street canyon far below in the lower glass.
import type { OutsideInfo, PaintInfo, SkyColors } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, hash, makeCanvas, mix, rect } from "../../themekit.ts";
import { lowerPane } from "./background.ts";
import { clamp } from "./kit.ts";

type Phase = "day" | "dusk" | "night";

const SKY_KEYS: [number, string, string][] = [
  [0, "#0a0f27", "#2e2643"],
  [5, "#151b40", "#45385c"],
  [6.5, "#e9927c", "#ffd8a4"],
  [8, "#5aaeea", "#d2ecff"],
  [16.5, "#529fe2", "#cbe7ff"],
  [18.5, "#df7569", "#ffca8c"],
  [19.6, "#463f80", "#e8897a"],
  [21, "#10163b", "#36294f"],
  [24, "#0a0f27", "#2e2643"],
];

/** Higher up: a deeper blue by day, and a city glow under the night sky. */
export function skylineSky(hour: number, classic: SkyColors): SkyColors {
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const [h0, t0, b0] = SKY_KEYS[i]!;
    const [h1, t1, b1] = SKY_KEYS[i + 1]!;
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), night: classic.night };
    }
  }
  return classic;
}

/** How much of the golden-hour palette shows (0..1). */
export function duskness(hour: number): number {
  return Math.max(clamp(1 - Math.abs(hour - 19.1) / 1.4, 0, 1), clamp(1 - Math.abs(hour - 6.6) / 1.1, 0, 1));
}

interface Pal {
  far: string;
  farTop: string;
  shore: string;
  river: string;
  riverHi: string;
  facades: string[];
  roofLift: number;
  window: string;
  lit: string[];
  litChance: number;
  deco: [string, string, string];
  glass: [string, string, string];
  crown: string;
  bridge: string;
  tank: string;
  street: string;
  lane: string;
}

const PALS: Record<Phase, Pal> = {
  day: {
    far: "#a9b9cd",
    farTop: "#bccada",
    shore: "#9eab9a",
    river: "#7fa6c4",
    riverHi: "#b9d4e8",
    facades: ["#b9ae9e", "#a6a39e", "#c6bba9", "#8d9aa8", "#a98e7d", "#9ea7b0", "#b3a18c"],
    roofLift: 0.16,
    window: "#6e7885",
    lit: [],
    litChance: 0,
    deco: ["#d4cbbb", "#e6dfd2", "#ada392"],
    glass: ["#7d9cbd", "#a7c2dc", "#5f7f9f"],
    crown: "#e9dfc9",
    bridge: "#6f7a86",
    tank: "#8a6a4a",
    street: "#6c6e72",
    lane: "#a8a9a6",
  },
  dusk: {
    far: "#b48fa0",
    farTop: "#c99fa5",
    shore: "#7d6f7c",
    river: "#d99a86",
    riverHi: "#ffd0a0",
    facades: ["#8d6f6c", "#7b6a72", "#9a7a70", "#6c6a80", "#85625e", "#7a7480", "#91706a"],
    roofLift: 0.22,
    window: "#5a4d5c",
    lit: ["#ffd98a", "#ffe9b8"],
    litChance: 0.12,
    deco: ["#c4917c", "#e8b490", "#8f6a66"],
    glass: ["#d08a7c", "#ffc79a", "#7a6080"],
    crown: "#ffd9a0",
    bridge: "#5a4f5e",
    tank: "#5e4638",
    street: "#4d4550",
    lane: "#8b7c80",
  },
  night: {
    far: "#252c48",
    farTop: "#2b3352",
    shore: "#1b2136",
    river: "#141b33",
    riverHi: "#ffd98a",
    facades: ["#1c2136", "#20253a", "#191e31", "#242a42", "#1e2338"],
    roofLift: 0.06,
    window: "#151a2a",
    lit: ["#ffd98a", "#fff1c4", "#cfe6ff", "#ffc06a", "#ffe3a8"],
    litChance: 0.34,
    deco: ["#2a2f48", "#3a405e", "#1d2236"],
    glass: ["#1f2944", "#2e3c60", "#171e33"],
    crown: "#fff1c4",
    bridge: "#2a3150",
    tank: "#141826",
    street: "#2e2828",
    lane: "#5a4a40",
  },
};

interface Spire {
  x: number;
  y: number;
}

interface ViewFeatures {
  /** Tips of the tallest towers (aviation lights). */
  tips: Spire[];
  /** Lit windows that can twinkle. */
  twinkle: { x: number; y: number }[];
  /** The bridge deck, if this window has one. */
  deck: { x0: number; x1: number; y: number } | null;
  horizon: number;
}

function hz(h: number): number {
  return Math.round(h * 0.46);
}

/** Lay out the panorama (window-local coordinates, x continuous across windows by global x). */
function drawView(ctx: CanvasRenderingContext2D, win: Rect, index: number, phase: Phase, snow: boolean): ViewFeatures {
  const { w, h } = win;
  const P = PALS[phase];
  const yh = hz(h);
  const feats: ViewFeatures = { tips: [], twinkle: [], deck: null, horizon: yh };
  const gx0 = win.x;
  const lit = (x: number, y: number) => P.litChance > 0 && hash(`lit${gx0 + x},${y}`) % 1000 < P.litChance * 1000;
  const litColor = (x: number, y: number) => P.lit[hash(`lc${gx0 + x},${y}`) % P.lit.length]!;
  // Far shore: low distant city on the horizon.
  for (let x = 0; x < w; ) {
    const g = gx0 + x;
    const bw = 2 + (hash(`fw${g}`) % 4);
    const bh = 1 + (hash(`fh${g}`) % 4) + (hash(`ft${g}`) % 9 === 0 ? 4 : 0);
    rect(ctx, x, yh - bh, bw, bh + 1, P.far);
    rect(ctx, x, yh - bh, 1, bh, P.farTop);
    if (phase === "night" && hash(`fl${g}`) % 3 === 0) rect(ctx, x + 1, yh - bh + 1, 1, 1, "#c9a873");
    x += bw;
  }
  rect(ctx, 0, yh, w, 1, P.shore);
  // The river, with glints.
  rect(ctx, 0, yh + 1, w, 3, P.river);
  for (let x = (hash(`rv${index}`) % 5); x < w; x += 6) rect(ctx, x, yh + 2 + (x % 2), 2, 1, P.riverHi);
  // A suspension bridge across the river in the middle window.
  if (index % 3 === 1 && w >= 24) {
    const t0 = Math.round(w * 0.22);
    const t1 = Math.round(w * 0.78);
    const deckY = yh + 2;
    rect(ctx, 0, deckY, w, 1, P.bridge);
    for (const tx of [t0, t1]) rect(ctx, tx, yh - 6, 1, 8, P.bridge);
    const sag = (x: number) => {
      if (x < t0) return yh - 6 + Math.round(((t0 - x) / t0) * 6);
      if (x > t1) return yh - 6 + Math.round(((x - t1) / (w - t1)) * 6);
      const k = (x - t0) / (t1 - t0);
      return yh - 6 + Math.round(Math.sin(k * Math.PI) * 7);
    };
    for (let x = 0; x < w; x++) {
      const y = Math.min(deckY - 1, sag(x));
      rect(ctx, x, y, 1, 1, phase === "night" ? (x % 3 === 0 ? "#fff1c4" : P.bridge) : P.bridge);
    }
    feats.deck = { x0: 0, x1: w, y: deckY };
  }
  // Rooftops below: mid layer, then the near layer.
  const layer = (top: number, spread: number, minW: number, varW: number, seed: string, near: boolean) => {
    for (let x = -4; x < w; ) {
      const g = gx0 + x;
      const bw = minW + (hash(`${seed}w${g}`) % varW);
      const by = top + (hash(`${seed}h${g}`) % spread);
      const base = P.facades[hash(`${seed}c${g}`) % P.facades.length]!;
      rect(ctx, x, by, bw, h - by, base);
      // Roof and a lit edge on the left.
      rect(ctx, x, by, bw, 1, snow ? "#eef1f5" : mix(base, "#ffffff", P.roofLift));
      rect(ctx, x, by + 1, 1, h - by - 1, mix(base, "#ffffff", P.roofLift * 0.6));
      // Window grid.
      for (let wy = by + 2; wy < h; wy += 2) {
        for (let wx = x + 1; wx < x + bw - 1; wx += 2) {
          if (wx < 0 || wx >= w) continue;
          if (lit(wx, wy)) {
            rect(ctx, wx, wy, 1, 1, litColor(wx, wy));
            if (hash(`tw${gx0 + wx},${wy}`) % 9 === 0) feats.twinkle.push({ x: wx, y: wy });
          } else if (phase !== "night" || (wx + wy) % 2 === 0) rect(ctx, wx, wy, 1, 1, P.window);
        }
      }
      // Rooftop water tower or an AC box.
      if (near && bw >= 6 && hash(`${seed}t${g}`) % 3 === 0) {
        const tx = x + 1 + (hash(`${seed}tx${g}`) % Math.max(1, bw - 4));
        rect(ctx, tx, by - 1, 1, 1, P.tank);
        rect(ctx, tx + 2, by - 1, 1, 1, P.tank);
        rect(ctx, tx, by - 4, 3, 3, P.tank);
        rect(ctx, tx + 1, by - 5, 1, 1, P.tank);
        if (snow) rect(ctx, tx, by - 4, 3, 1, "#eef1f5");
      } else if (bw >= 5 && hash(`${seed}a${g}`) % 4 === 0) {
        rect(ctx, x + 1, by - 1, 2, 1, mix(base, "#ffffff", 0.3));
      }
      x += bw + (hash(`${seed}g${g}`) % 5 === 0 ? 1 : 0);
    }
  };
  layer(yh + 4, 4, 3, 4, "m", false);
  // Tall towers that rise above the horizon.
  const towers: { cx: number; kind: "deco" | "glass" | "slab" }[] = [];
  const which = index % 3;
  if (which === 0) towers.push({ cx: Math.round(w * 0.34), kind: "deco" }, { cx: Math.round(w * 0.8), kind: "slab" });
  else if (which === 1) towers.push({ cx: Math.round(w * 0.5), kind: "slab" });
  else towers.push({ cx: Math.round(w * 0.22), kind: "glass" }, { cx: Math.round(w * 0.66), kind: "deco" });
  for (const tw of towers) {
    const top = tw.kind === "deco" ? yh - 12 : tw.kind === "glass" ? yh - 15 : yh - 7;
    if (tw.kind === "deco") {
      const [mid, hi, lo] = P.deco;
      // Setbacks, a stepped crown and a needle.
      const steps: [number, number][] = [
        [9, yh + 1],
        [7, yh - 4],
        [5, yh - 8],
        [3, yh - 11],
      ];
      for (let i = 0; i < steps.length; i++) {
        const [sw, sy] = steps[i]!;
        const bot = i === 0 ? h : steps[i - 1]![1];
        const x0 = tw.cx - Math.floor(sw / 2);
        rect(ctx, x0, sy, sw, bot - sy, mid);
        rect(ctx, x0, sy, 1, bot - sy, hi);
        rect(ctx, x0 + sw - 1, sy, 1, bot - sy, lo);
        for (let y = sy + 1; y < bot; y += 2) {
          for (let x = x0 + 2; x < x0 + sw - 1; x += 2) {
            if (lit(x, y)) rect(ctx, x, y, 1, 1, litColor(x, y));
            else rect(ctx, x, y, 1, 1, P.window);
          }
        }
      }
      rect(ctx, tw.cx - 1, yh - 12, 3, 1, P.crown);
      rect(ctx, tw.cx, top - 5, 1, 6, phase === "night" ? P.crown : P.deco[2]);
      feats.tips.push({ x: tw.cx, y: top - 5 });
    } else if (tw.kind === "glass") {
      const [mid, hi, lo] = P.glass;
      for (let y = top; y < h; y++) {
        const half = 3 + Math.floor((y - top) / 9);
        const x0 = tw.cx - half;
        rect(ctx, x0, y, half * 2, 1, mid);
        rect(ctx, x0, y, 1, 1, hi);
        rect(ctx, x0 + half * 2 - 1, y, 1, 1, lo);
        if (phase === "night" && y % 3 === 0) rect(ctx, x0 + 1, y, half * 2 - 2, 1, (y / 3) % 4 ? "#8fb6e0" : "#2e3c60");
        else if (phase !== "night" && (y + tw.cx) % 5 === 0) rect(ctx, x0 + 1, y, 2, 1, hi);
      }
      rect(ctx, tw.cx, top - 3, 1, 3, P.glass[2]);
      feats.tips.push({ x: tw.cx, y: top - 3 });
    } else {
      // A plain modern slab with a mechanical crown.
      const base = P.facades[3]!;
      const x0 = tw.cx - 4;
      rect(ctx, x0, top, 8, h - top, base);
      rect(ctx, x0, top, 1, h - top, mix(base, "#ffffff", 0.18));
      rect(ctx, x0 + 1, top - 2, 6, 2, mix(base, "#000000", 0.15));
      for (let y = top + 1; y < h; y += 2) {
        for (let x = x0 + 1; x < x0 + 7; x += 2) {
          if (lit(x, y)) rect(ctx, x, y, 1, 1, litColor(x, y));
          else rect(ctx, x, y, 1, 1, P.window);
        }
      }
      feats.tips.push({ x: tw.cx, y: top - 2 });
    }
  }
  layer(yh + 11, 6, 6, 6, "n", true);
  return feats;
}

function viewCanvas(win: Rect, index: number, phase: Phase, snow: boolean): { canvas: HTMLCanvasElement; feats: ViewFeatures } {
  return cached(`skyline|view|${win.x},${win.y},${win.w},${win.h}|${index}|${phase}|${snow}`, () => {
    let feats: ViewFeatures | null = null;
    const canvas = makeCanvas(win.w, win.h, (ctx) => {
      feats = drawView(ctx, win, index, phase, snow);
    });
    return { canvas, feats: feats! };
  });
}

const overcast = (w: string) => w !== "clear" && w !== "partly";

/** The skyline out of a window, every frame (sprites cached per phase). */
export function skylineOutside(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void {
  const snow = info.weather === "snow";
  const day = viewCanvas(win, index, "day", snow);
  const dusk = duskness(info.hour);
  const night = info.night;
  ctx.drawImage(day.canvas, win.x, win.y);
  if (dusk > 0.02) {
    ctx.globalAlpha = dusk * (1 - night * 0.5);
    ctx.drawImage(viewCanvas(win, index, "dusk", snow).canvas, win.x, win.y);
  }
  let feats = day.feats;
  if (night > 0.02) {
    const n = viewCanvas(win, index, "night", snow);
    ctx.globalAlpha = clamp(night * 1.15, 0, 1);
    ctx.drawImage(n.canvas, win.x, win.y);
    feats = n.feats;
  }
  ctx.globalAlpha = 1;
  const t = info.t;
  if (overcast(info.weather)) {
    ctx.fillStyle = night > 0.5 ? "rgba(26,28,44,0.28)" : "rgba(150,158,172,0.3)";
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  if (night > 0.4) {
    // Glittering windows and the red aviation lights.
    for (let i = 0; i < feats.twinkle.length; i++) {
      const p = feats.twinkle[i]!;
      if (hash(`tw${index}-${i}-${Math.floor(t * 0.7 + i * 0.37)}`) % 4 === 0) rect(ctx, win.x + p.x, win.y + p.y, 1, 1, "#141a2c");
    }
    for (const tip of feats.tips) {
      if (Math.floor(t * 1.2 + tip.x * 0.13) % 2 === 0) rect(ctx, win.x + tip.x, win.y + tip.y - 1, 1, 1, "#ff4a4a");
    }
  }
  // Traffic over the bridge.
  if (feats.deck) {
    for (let i = 0; i < 4; i++) {
      const dir = i % 2 ? 1 : -1;
      const k = ((t * (4 + i) + i * 13) % (win.w + 6)) - 3;
      const x = dir > 0 ? k : win.w - k;
      rect(ctx, win.x + Math.round(x), win.y + feats.deck.y - (i % 2), 1, 1, night > 0.4 ? (dir > 0 ? "#fff6dc" : "#ff6b5a") : "#3a3f48");
    }
  }
  flyers(ctx, win, info, feats.horizon);
  // Rain beads on the glass.
  if (info.weather === "rain" || info.weather === "storm" || info.weather === "drizzle") {
    ctx.fillStyle = night > 0.5 ? "rgba(200,215,240,0.35)" : "rgba(235,242,250,0.6)";
    for (let i = 0; i < 9; i++) {
      const bx = (hash(`bead${index}-${i}`) % (win.w - 6)) + 3;
      const by = (hash(`beady${index}-${i}`) % (win.h - 6)) + 3 + Math.floor(((t * 3 + i * 7) % 40) / 10);
      ctx.fillRect(win.x + bx, win.y + Math.min(win.h - 3, by), 1, 2);
    }
  }
  // Glass glare.
  ctx.fillStyle = `rgba(255,255,255,${night > 0.5 ? 0.04 : 0.12})`;
  for (const off of [6, 10]) {
    for (let k = 0; k < Math.min(win.w, win.h); k += 1) {
      const x = win.x + off + k - (off === 10 ? 2 : 0);
      const y = win.y + win.h - 4 - k;
      if (x > win.x + win.w - 3 || y < win.y + 2) break;
      if (k % 9 < (off === 6 ? 6 : 3)) ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** A helicopter now and then by day, and a plane's lights crossing at night. */
function flyers(ctx: CanvasRenderingContext2D, win: Rect, info: PaintInfo, yh: number): void {
  const t = info.t;
  const span = 760;
  if (info.night < 0.6) {
    const period = 64;
    const k = (t % period) / 22;
    if (k < 1) {
      const gx = -20 + k * span;
      const x = Math.round(gx - win.x);
      const y = Math.round(yh - 13 + Math.sin(t * 0.8) * 1.5);
      if (x > -8 && x < win.w + 8) {
        const X = win.x + x;
        const Y = win.y + y;
        ctx.fillStyle = "#2b2f38";
        ctx.fillRect(X, Y, 4, 2);
        ctx.fillRect(X - 3, Y, 3, 1);
        ctx.fillRect(X - 3, Y - 1, 1, 1);
        ctx.fillRect(X + 1, Y + 2, 3, 1);
        ctx.fillStyle = "#cfe0ef";
        ctx.fillRect(X + 3, Y, 1, 1);
        ctx.fillStyle = "#3a3f48";
        const blade = Math.floor(t * 20) % 2;
        ctx.fillRect(X - 1 + blade, Y - 2, 6 - blade * 2, 1);
        if (Math.floor(t * 2) % 2 === 0) {
          ctx.fillStyle = "#ff5a4a";
          ctx.fillRect(X - 3, Y - 1, 1, 1);
        }
      }
    }
  }
  if (info.night > 0.3) {
    const period = 48;
    const k = (t % period) / period;
    const gx = span - k * (span + 40);
    const x = Math.round(gx - win.x);
    const y = Math.round(5 + k * 4);
    if (x >= 0 && x < win.w) {
      const blink = Math.floor(t * 1.6) % 3;
      ctx.fillStyle = blink === 0 ? "#ffffff" : "#c9d2ff";
      ctx.fillRect(win.x + x, win.y + y, 1, 1);
      if (blink === 1) {
        ctx.fillStyle = "#ff4a4a";
        ctx.fillRect(win.x + x + 2, win.y + y, 1, 1);
      }
    }
  }
}

// ------------------------------------------------------------------ the street canyon below

interface StreetFeatures {
  avenue: number;
  lamps: number[];
  river: [number, number] | null;
}

function drawStreet(ctx: CanvasRenderingContext2D, lp: Rect, phase: Phase, snow: boolean, seed: number): StreetFeatures {
  const { w, h } = lp;
  const P = PALS[phase];
  const night = phase === "night";
  const av = Math.max(3, Math.round(h * 0.42));
  // A river crossing the longer panes, with a bridge carrying the avenue over it.
  let river: [number, number] | null = null;
  if (w >= 150 && hash(`river${seed}`) % 3 !== 2) {
    const rx = 24 + (hash(`rx${seed}`) % Math.max(1, w - 60));
    river = [rx, rx + 12 + (hash(`rw${seed}`) % 6)];
  }
  const wet = (x: number, bw: number) => river !== null && x + bw > river[0] && x < river[1];
  // Rooftops across the avenue (smaller, farther) and on our side (closer, with the odd tower top).
  const roofs = (y0: number, y1: number, minW: number, varW: number, key: string, near: boolean) => {
    for (let x = -3; x < w; ) {
      const g = seed + x;
      let bw = minW + (hash(`${key}w${g}`) % varW);
      if (wet(x, bw)) {
        x = river![1] + 1;
        continue;
      }
      const base = P.facades[hash(`${key}c${g}`) % P.facades.length]!;
      const roof = snow ? "#e9edf2" : mix(base, night ? "#000000" : "#ffffff", night ? 0.1 : 0.12);
      const kind = hash(`${key}k${g}`) % 9;
      if (near && kind === 0 && y1 - y0 >= 7) {
        // A neighbouring tower's top, much closer: a big roof with a helipad.
        bw = Math.max(bw, 12);
        rect(ctx, x, y0, bw, y1 - y0, night ? "#1d2338" : "#9aa3ad");
        rect(ctx, x, y0, bw, 1, night ? "#2e3654" : "#c6ccd3");
        const cx = x + Math.floor(bw / 2);
        const cy = y0 + Math.floor((y1 - y0) / 2);
        rect(ctx, cx - 3, cy - 2, 7, 5, night ? "#14182a" : "#4c535e");
        rect(ctx, cx - 2, cy - 1, 5, 3, night ? "#ffd98a" : "#e9c46a");
        rect(ctx, cx - 1, cy, 3, 1, night ? "#14182a" : "#4c535e");
        if (night) rect(ctx, x + bw - 2, y0 + 1, 1, 1, "#ff5a4a");
      } else if (kind === 1 && !near && y1 - y0 >= 4) {
        // A pocket park with trees.
        rect(ctx, x, y0, bw + 4, y1 - y0, night ? "#1c2c22" : "#6f9a5c");
        for (let i = 0; i < bw + 2; i += 3) rect(ctx, x + 1 + i, y0 + 1 + (i % 2), 2, 2, night ? "#24402c" : "#4f7d47");
        bw += 4;
      } else {
        rect(ctx, x, y0, bw, y1 - y0, roof);
        rect(ctx, x, y0, 1, y1 - y0, mix(base, "#000000", 0.25));
        rect(ctx, x, y0, bw, 1, mix(base, "#ffffff", 0.25));
        // Rooftop bits: skylights, AC units, water towers, a roof garden.
        const k = hash(`${key}q${g}`) % 5;
        const cx = x + 1 + (hash(`${key}x${g}`) % Math.max(1, bw - 3));
        const cy = y0 + 1 + (hash(`${key}y${g}`) % Math.max(1, y1 - y0 - 3));
        if (k === 0) {
          rect(ctx, cx, cy, 2, 2, P.tank);
          rect(ctx, cx, cy, 2, 1, mix(P.tank, "#ffffff", 0.25));
        } else if (k === 1) rect(ctx, cx, cy, 2, 1, night ? "#ffd98a" : "#9fb5c8");
        else if (k === 2) rect(ctx, cx, cy, 1, 1, mix(base, "#ffffff", 0.4));
        else if (k === 3 && y1 - y0 > 4) rect(ctx, cx, cy, 3, 2, night ? "#24402c" : "#6f9a5c");
        if (night && hash(`${key}n${g}`) % 3 === 0) rect(ctx, x + 1 + (Math.abs(g) % Math.max(1, bw - 2)), y0 + 1, 1, 1, "#ffe3a8");
      }
      x += bw + 1;
    }
  };
  rect(ctx, 0, 0, w, h, P.street);
  roofs(0, av - 1, 4, 5, "ra", false);
  // The avenue: sidewalks, asphalt, lane dashes.
  rect(ctx, 0, av - 1, w, 1, mix(P.street, "#ffffff", 0.2));
  rect(ctx, 0, av, w, 3, P.street);
  for (let x = seed % 4; x < w; x += 4) rect(ctx, x, av + 1, 2, 1, P.lane);
  rect(ctx, 0, av + 3, w, 1, mix(P.street, "#ffffff", 0.2));
  roofs(av + 4, h, 6, 6, "rb", true);
  // A cross street.
  const cs = (hash(`cs${seed}`) % Math.max(1, w - 8)) + 3;
  if (!wet(cs, 2)) rect(ctx, cs, av + 4, 2, h - av - 4, P.street);
  if (river) {
    const [r0, r1] = river;
    rect(ctx, r0, 0, r1 - r0, h, P.river);
    for (let y = 1; y < h; y += 3) rect(ctx, r0 + 2 + ((y * 5) % Math.max(1, r1 - r0 - 4)), y, 2, 1, P.riverHi);
    rect(ctx, r0, 0, 1, h, mix(P.river, "#ffffff", 0.3));
    rect(ctx, r1 - 1, 0, 1, h, mix(P.river, "#000000", 0.25));
    // The bridge.
    rect(ctx, r0 - 1, av - 1, r1 - r0 + 2, 5, P.bridge);
    rect(ctx, r0 - 1, av, r1 - r0 + 2, 3, P.street);
    for (let x = r0; x < r1; x += 3) {
      rect(ctx, x, av - 1, 1, 1, night ? "#ffd98a" : mix(P.bridge, "#ffffff", 0.3));
      rect(ctx, x, av + 3, 1, 1, night ? "#ffd98a" : mix(P.bridge, "#ffffff", 0.3));
    }
  }
  const lamps: number[] = [];
  for (let x = 2 + (seed % 6); x < w; x += 7) lamps.push(x);
  return { avenue: av, lamps, river };
}

function streetCanvas(lp: Rect, phase: Phase, snow: boolean, seed: number): { canvas: HTMLCanvasElement; feats: StreetFeatures } {
  return cached(`skyline|street|${lp.w}x${lp.h}|${seed}|${phase}|${snow}`, () => {
    let feats: StreetFeatures | null = null;
    const canvas = makeCanvas(lp.w, lp.h, (ctx) => {
      feats = drawStreet(ctx, lp, phase, snow, seed);
    });
    return { canvas, feats: feats! };
  });
}

/** One pane of the city far below (a lower window, or the drop beyond the terrace rail), with traffic. */
function streetPane(ctx: CanvasRenderingContext2D, lp: Rect, info: PaintInfo, seed: number, glass: boolean): void {
  const snow = info.weather === "snow";
  const dusk = duskness(info.hour);
  const night = info.night;
  const t = info.t;
  ctx.save();
  ctx.beginPath();
  ctx.rect(lp.x, lp.y, lp.w, lp.h);
  ctx.clip();
  const day = streetCanvas(lp, "day", snow, seed);
  ctx.drawImage(day.canvas, lp.x, lp.y);
  if (dusk > 0.02) {
    ctx.globalAlpha = dusk * (1 - night * 0.5);
    ctx.drawImage(streetCanvas(lp, "dusk", snow, seed).canvas, lp.x, lp.y);
  }
  if (night > 0.02) {
    ctx.globalAlpha = clamp(night * 1.15, 0, 1);
    ctx.drawImage(streetCanvas(lp, "night", snow, seed).canvas, lp.x, lp.y);
  }
  ctx.globalAlpha = 1;
  const f = day.feats;
  const y = lp.y + f.avenue;
  if (night > 0.3) {
    ctx.fillStyle = `rgba(255,190,110,${0.18 * night})`;
    ctx.fillRect(lp.x, y, lp.w, 3);
    ctx.fillStyle = `rgba(255,214,140,${0.9 * night})`;
    for (const x of f.lamps) {
      ctx.fillRect(lp.x + x, y - 1, 1, 1);
      ctx.fillRect(lp.x + x + 3, y + 3, 1, 1);
    }
  }
  const cars = Math.max(3, Math.round(lp.w / 7));
  for (let i = 0; i < cars; i++) {
    const dir = i % 2 ? 1 : -1;
    const speed = 5 + (i % 3) * 2.5;
    const k = ((t * speed + i * 17 + seed) % (lp.w + 8)) - 4;
    const x = Math.round(dir > 0 ? k : lp.w - k);
    if (x < 0 || x >= lp.w - 1) continue;
    const lane = dir > 0 ? 2 : 0;
    if (night > 0.45) {
      ctx.fillStyle = dir > 0 ? "#fff3d0" : "#ff5a4a";
      ctx.fillRect(lp.x + x, y + lane, 1, 1);
    } else {
      ctx.fillStyle = i % 3 === 0 ? "#f2c230" : i % 3 === 1 ? "#2a2c32" : "#e8e8e4";
      ctx.fillRect(lp.x + x, y + lane, 2, 1);
    }
  }
  // The city glitters at night.
  if (night > 0.45) {
    ctx.fillStyle = "#fff1c4";
    for (let i = 0; i < Math.ceil(lp.w / 14); i++) {
      if (hash(`gl${seed}|${i}|${Math.floor(t * 1.3 + i * 0.37)}`) % 3 !== 0) continue;
      ctx.fillRect(lp.x + (hash(`gx${seed}${i}`) % lp.w), lp.y + (hash(`gy${seed}${i}`) % lp.h), 1, 1);
    }
  }
  // A helicopter far below now and then.
  if (!glass && lp.w >= 160 && night < 0.6) {
    const k = ((t + seed) % 46) / 15;
    if (k < 1) {
      const hx = lp.x + Math.round(k * (lp.w + 20)) - 10;
      const hy = lp.y + Math.round(lp.h * 0.3);
      ctx.fillStyle = "#2b2f38";
      ctx.fillRect(hx, hy, 3, 2);
      ctx.fillRect(hx - 2, hy, 2, 1);
      ctx.fillStyle = Math.floor(t * 18) % 2 ? "#5a606b" : "#8a919c";
      ctx.fillRect(hx - 1, hy - 1, 5, 1);
      ctx.fillRect(hx + 1, hy - 2, 1, 3);
    }
  }
  if (overcast(info.weather)) {
    ctx.fillStyle = night > 0.5 ? "rgba(24,26,40,0.3)" : "rgba(160,166,178,0.35)";
    ctx.fillRect(lp.x, lp.y, lp.w, lp.h);
  }
  // Clouds drifting by below the floor.
  if (info.weather === "partly" || info.weather === "cloudy") {
    const n = Math.max(1, Math.round(lp.w / 90)) * (info.weather === "cloudy" ? 2 : 1);
    ctx.fillStyle = night > 0.5 ? "rgba(150,156,180,0.35)" : "rgba(252,253,255,0.62)";
    for (let i = 0; i < n; i++) {
      const cx = lp.x + Math.round(((t * (1.5 + (i % 3) * 0.6) + i * 83 + seed * 7) % (lp.w + 50)) - 25);
      const cy = lp.y + ((i * 7 + seed) % Math.max(1, lp.h)) - 2;
      ctx.fillRect(cx, cy, 20, 4);
      ctx.fillRect(cx + 4, cy - 2, 11, 2);
      ctx.fillRect(cx + 2, cy + 4, 14, 2);
    }
  }
  if (info.weather === "fog") {
    ctx.fillStyle = night > 0.5 ? "rgba(120,124,140,0.55)" : "rgba(226,230,236,0.7)";
    ctx.fillRect(lp.x, lp.y, lp.w, lp.h);
  }
  if (glass) {
    ctx.fillStyle = `rgba(255,255,255,${night > 0.5 ? 0.03 : 0.09})`;
    for (let k = 0; k < lp.h; k++) if (k % 7 < 4) ctx.fillRect(lp.x + 4 + k, lp.y + lp.h - 1 - k, 1, 1);
  }
  ctx.restore();
}

/** The lower glass: the city far below, with traffic. */
export function drawLowerPanes(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  for (const win of L.wall.windows) {
    const lp = lowerPane(L, win);
    if (lp) streetPane(ctx, lp, info, win.x, true);
  }
}

/** Beyond the terrace rail: the street canyon a long way down (side strips are turned on end). */
export function drawBeyond(ctx: CanvasRenderingContext2D, rects: Rect[], info: PaintInfo): void {
  for (const r of rects) {
    if (r.w >= r.h) {
      streetPane(ctx, r, info, r.x + 31, false);
      continue;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // Draw a wide pane in turned coordinates: x along the strip, y across it.
    ctx.translate(r.x + r.w, r.y);
    ctx.rotate(Math.PI / 2);
    streetPane(ctx, { x: 0, y: 0, w: r.h, h: r.w }, info, r.x * 3 + r.y + 57, false);
    ctx.restore();
  }
}
