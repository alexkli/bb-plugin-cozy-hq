// Spaceship: space, painted live. The same star field drifts past every
// porthole, the viewscreen and the gaps beyond the hull (three layers of
// parallax, world-aligned so they line up from window to window). Each star
// system has its own sky: a ringed giant, twin suns, a violet nebula, an ice
// moon, a red dwarf and its belt, a blue world at home. The local weather
// turns into space weather: a meteor shower for rain, an ice field for snow,
// an ion storm for a thunderstorm, a nebula for fog, dust for clouds.
import type { WeatherKind } from "../../../contract.ts";
import type { Rect } from "../../layout.ts";
import { OUTLINE, cached, drawPixelText, makeCanvas, mix, shade } from "../../themekit.ts";
import { fill, P } from "./pal.ts";
import { NEVER, SHIP, since } from "./state.ts";

export type Phenomenon = "clear" | "wisps" | "dust" | "nebula" | "drizzle" | "meteors" | "ice" | "ion";

export function phenomenon(w: WeatherKind): Phenomenon {
  switch (w) {
    case "partly":
      return "wisps";
    case "cloudy":
      return "dust";
    case "fog":
      return "nebula";
    case "drizzle":
      return "drizzle";
    case "rain":
      return "meteors";
    case "snow":
      return "ice";
    case "storm":
      return "ion";
    default:
      return "clear";
  }
}

/** A fast integer hash for star cells (no strings in the hot loop). */
export function ih(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 362437)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// ------------------------------------------------------------------ star systems

interface Body {
  kind: "terran" | "gas" | "rock" | "ice" | "desert";
  colors: [string, string, string, string];
  ring?: string;
  /** Position in the viewscreen (0..1) and radius as a share of its height. */
  fx: number;
  fy: number;
  fr: number;
}

interface StarSystem {
  name: string;
  tint: string;
  nebula: [string, string] | null;
  suns: { color: string; fx: number; fy: number; r: number }[];
  bodies: Body[];
  belt?: boolean;
}

export const SYSTEMS: StarSystem[] = [
  {
    name: "HOMEWARD",
    tint: "#0a1024",
    nebula: null,
    suns: [{ color: "#fff1b0", fx: 0.12, fy: 0.22, r: 3 }],
    bodies: [
      { kind: "terran", colors: ["#2f6fc0", "#4f9be0", "#5fbf6a", "#eef6ff"], fx: 0.68, fy: 0.62, fr: 0.42 },
      { kind: "rock", colors: ["#8a8f9c", "#b3b8c4", "#6c7180", "#d8dce4"], fx: 0.36, fy: 0.3, fr: 0.1 },
    ],
  },
  {
    name: "AMBER GIANT",
    tint: "#120c1c",
    nebula: ["#6a3a5a", "#3a2a5a"],
    suns: [{ color: "#ffd9a0", fx: 0.88, fy: 0.18, r: 2 }],
    bodies: [
      { kind: "gas", colors: ["#c7883f", "#e8b46a", "#a35f2e", "#f6dca8"], ring: "#d8c49a", fx: 0.42, fy: 0.55, fr: 0.36 },
      { kind: "rock", colors: ["#9a8a7a", "#c4b4a0", "#7a6a5c", "#e0d4c4"], fx: 0.8, fy: 0.7, fr: 0.07 },
      { kind: "ice", colors: ["#9fc4d8", "#d4ecf6", "#7aa0b8", "#ffffff"], fx: 0.14, fy: 0.36, fr: 0.05 },
    ],
  },
  {
    name: "TWIN SUNS",
    tint: "#1a0f14",
    nebula: null,
    suns: [
      { color: "#ffb36b", fx: 0.2, fy: 0.3, r: 5 },
      { color: "#fff6e0", fx: 0.3, fy: 0.2, r: 3 },
    ],
    bodies: [{ kind: "desert", colors: ["#c46a3a", "#e89a5a", "#9a4a2a", "#f6c890"], fx: 0.7, fy: 0.68, fr: 0.38 }],
  },
  {
    name: "VIOLET DRIFT",
    tint: "#140a26",
    nebula: ["#8a3aa8", "#3a5ac0"],
    suns: [{ color: "#d8c8ff", fx: 0.5, fy: 0.15, r: 2 }],
    bodies: [{ kind: "ice", colors: ["#a8b8e8", "#e0e8ff", "#7a88c0", "#ffffff"], ring: "#b8a8e8", fx: 0.3, fy: 0.6, fr: 0.22 }],
  },
  {
    name: "FROST MOON",
    tint: "#08121c",
    nebula: ["#2a5a7a", "#1a3a5a"],
    suns: [{ color: "#bfe4ff", fx: 0.85, fy: 0.25, r: 3 }],
    bodies: [{ kind: "ice", colors: ["#b8d8e8", "#eaf6ff", "#88a8c0", "#ffffff"], fx: 0.42, fy: 0.75, fr: 0.62 }],
  },
  {
    name: "RED DWARF",
    tint: "#160a0c",
    nebula: ["#6a2a2a", "#3a1a2a"],
    suns: [{ color: "#ff7a5a", fx: 0.75, fy: 0.35, r: 7 }],
    bodies: [{ kind: "rock", colors: ["#7a5a4a", "#a07a62", "#5a4034", "#c8a088"], fx: 0.25, fy: 0.65, fr: 0.16 }],
    belt: true,
  },
];

export const systemOf = (i: number) => SYSTEMS[((i % SYSTEMS.length) + SYSTEMS.length) % SYSTEMS.length]!;

/** A shaded planet (lit from the top left), bands, continents or craters; a ring tilted across it. */
function planet(b: Body, r: number, seed: number): HTMLCanvasElement {
  const R = Math.max(2, Math.round(r));
  return cached(`spaceship|planet|${b.kind}|${b.colors.join()}|${b.ring ?? ""}|${R}|${seed}`, () => {
    const ringR = b.ring ? R * 1.9 : R;
    const W = Math.ceil(ringR * 2 + 4);
    const H = R * 2 + 4;
    const cx = W / 2;
    const cy = H / 2;
    return makeCanvas(W, H, (ctx) => {
      const ring = (front: boolean) => {
        if (!b.ring) return;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const dx = (x + 0.5 - cx) / ringR;
            const dy = (y + 0.5 - cy) / (ringR * 0.28);
            const d = dx * dx + dy * dy;
            if (d > 1 || d < 0.52) continue;
            if (front !== y + 0.5 >= cy) continue;
            const inPlanet = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < R * R;
            if (!front && inPlanet) continue;
            fill(ctx, x, y, 1, 1, d > 0.8 ? shade(b.ring, -0.25) : d > 0.66 ? b.ring : shade(b.ring, 0.15));
          }
        }
      };
      ring(false);
      const [base, hi, lo, cap] = b.colors;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const nx = (x + 0.5 - cx) / R;
          const ny = (y + 0.5 - cy) / R;
          const d = nx * nx + ny * ny;
          if (d > 1) continue;
          const nz = Math.sqrt(1 - d);
          const light = -nx * 0.55 - ny * 0.45 + nz * 0.7;
          let c = base;
          if (b.kind === "gas") {
            const band = Math.floor((ny + 1) * 5 + Math.sin(nx * 3 + seed) * 0.6);
            c = band % 3 === 0 ? hi : band % 3 === 1 ? base : lo;
          } else if (b.kind === "terran" || b.kind === "desert") {
            const n = Math.sin(nx * 5.1 + seed) * Math.cos(ny * 4.3 - seed * 0.7) + Math.sin((nx + ny) * 7.7 + seed * 2) * 0.5;
            c = n > 0.45 ? lo : n > 0.1 ? hi : base;
            if (b.kind === "terran" && Math.abs(ny) > 0.82) c = cap;
          } else {
            const n = Math.sin(nx * 9 + seed) * Math.sin(ny * 8 - seed);
            c = n > 0.6 ? lo : n < -0.7 ? hi : base;
          }
          // Day side to night side in pixel steps.
          const k = light > 0.6 ? 0.18 : light > 0.25 ? 0 : light > -0.05 ? -0.3 : -0.62;
          c = shade(c, k);
          if (light > 0.82 && b.kind !== "gas") c = mix(c, cap, 0.35);
          fill(ctx, x, y, 1, 1, c);
        }
      }
      // A thin atmosphere on the lit limb.
      if (b.kind === "terran") {
        for (let i = 0; i < 64; i++) {
          const a = Math.PI * (0.9 + (i / 64) * 0.9);
          fill(ctx, Math.round(cx + Math.cos(a) * (R - 0.5) - 0.5), Math.round(cy + Math.sin(a) * (R - 0.5) - 0.5), 1, 1, "#9fd8ff");
        }
      }
      ring(true);
    });
  });
}

/** A sun: a bright core and a soft halo. */
function sun(color: string, r: number): HTMLCanvasElement {
  return cached(`spaceship|sun|${color}|${r}`, () => {
    const R = r * 4 + 2;
    return makeCanvas(R * 2, R * 2, (ctx) => {
      const g = ctx.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, `${color}cc`);
      g.addColorStop(0.3, `${color}44`);
      g.addColorStop(1, `${color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, R * 2, R * 2);
      ctx.fillStyle = mix(color, "#ffffff", 0.6);
      ctx.beginPath();
      ctx.arc(R, R, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

/** A seamless band of nebula: dithered clouds in two colors, 256 wide (it scrolls). */
function nebulaTile(a: string, b: string, h: number, density: number): HTMLCanvasElement {
  return cached(`spaceship|nebula|${a}|${b}|${h}|${density}`, () =>
    makeCanvas(256, h, (ctx) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < 256; x++) {
          const u = (x / 256) * Math.PI * 2;
          const n =
            Math.sin(u * 2 + y * 0.09) * 0.5 +
            Math.sin(u * 5 - y * 0.17 + 1.3) * 0.3 +
            Math.sin(u * 11 + y * 0.31 + 2.1) * 0.15 +
            Math.sin(u * 3 + y * 0.05 + 4) * 0.4;
          const v = n * 0.5 + 0.5 - (1 - density) * 0.5;
          const dither = ((x + y) & 1) === 0;
          if (v > 0.72 || (v > 0.62 && dither)) fill(ctx, x, y, 1, 1, mix(a, b, Math.sin(u * 3 + y * 0.05) * 0.5 + 0.5));
          else if (v > 0.52 && dither && (x & 2) === 0) fill(ctx, x, y, 1, 1, mix(shade(a, -0.3), shade(b, -0.3), 0.5));
        }
      }
    }),
  );
}

function drawNebula(ctx: CanvasRenderingContext2D, r: Rect, t: number, tile: HTMLCanvasElement, alpha: number, speed: number, top = 0): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  const off = ((t * speed) % 256) | 0;
  for (let x = Math.floor((r.x + off) / 256) * 256 - off; x < r.x + r.w; x += 256) {
    for (let y = top - Math.ceil((top - r.y) / tile.height) * tile.height; y < r.y + r.h; y += tile.height) ctx.drawImage(tile, x, y);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ stars

const LAYERS = [
  { cell: 7, speed: 1.4, density: 30, color: "#4f5980" },
  { cell: 11, speed: 4, density: 28, color: "#9aa6d0" },
  { cell: 17, speed: 9, density: 26, color: "#f4f6ff" },
];

/**
 * The star field in a rect, world-aligned so windows agree; `warp` (0..1)
 * stretches stars into streaks, `zoom` speeds the drift up (the viewscreen).
 */
export function starfield(ctx: CanvasRenderingContext2D, r: Rect, t: number, warp: number, tint?: string): void {
  for (let k = 0; k < LAYERS.length; k++) {
    const ly = LAYERS[k]!;
    const c = ly.cell;
    const off = t * ly.speed;
    const streak = Math.round(warp * (4 + k * 12));
    const i0 = Math.floor((r.x + off) / c);
    const i1 = Math.floor((r.x + r.w + off + streak) / c);
    const j0 = Math.floor(r.y / c);
    const j1 = Math.floor((r.y + r.h) / c);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const h = ih(i, j, k);
        if (h % 100 >= ly.density) continue;
        const sx = Math.round(i * c + ((h >>> 8) % c) - off);
        const sy = j * c + ((h >>> 16) % c);
        if (sy < r.y || sy >= r.y + r.h || sx >= r.x + r.w || sx + streak < r.x) continue;
        let color = ly.color;
        if (k === 2 && (h >>> 4) % 5 === 0 && Math.sin(t * 2.6 + (h % 97)) > 0.55) color = "#ffffff";
        else if (k === 2 && (h >>> 3) % 9 === 0) color = (h >>> 5) % 2 ? "#ffd9a0" : "#a8d8ff";
        if (tint) color = mix(color, tint, 0.35);
        ctx.fillStyle = color;
        if (streak > 0) {
          const x0 = Math.max(r.x, sx);
          ctx.fillRect(x0, sy, Math.min(r.x + r.w, sx + streak + 1) - x0, 1);
        } else if (sx >= r.x) {
          ctx.fillRect(sx, sy, 1, 1);
          if (k === 2 && (h >>> 6) % 11 === 0 && sx > r.x && sx < r.x + r.w - 1 && sy > r.y && sy < r.y + r.h - 1) {
            ctx.fillStyle = mix(color, "#1a2040", 0.5);
            ctx.fillRect(sx - 1, sy, 1, 1);
            ctx.fillRect(sx + 1, sy, 1, 1);
            ctx.fillRect(sx, sy - 1, 1, 1);
            ctx.fillRect(sx, sy + 1, 1, 1);
          }
        }
      }
    }
  }
}

/** How much the stars streak now: a jump, or the ship's engines opening up now and then. */
export function warpNow(t: number): number {
  const j = t - SHIP.jumpAt;
  if (j >= 0 && j < 1.8) return j < 1 ? Math.min(1, j * 1.6) : Math.max(0, 1 - (j - 1) * 2.5);
  // A burn every few minutes: the streaks swell and fade.
  const p = t % 260;
  if (p > 200 && p < 208) return Math.sin(((p - 200) / 8) * Math.PI) * 0.45;
  return 0;
}

// ------------------------------------------------------------------ space weather

function meteors(ctx: CanvasRenderingContext2D, r: Rect, t: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const h = ih(i, seed, 77);
    const period = 1.1 + (h % 100) / 60;
    const p = ((t + (h % 1000) / 100) % period) / period;
    if (p > 0.45) continue;
    const k = p / 0.45;
    const x = r.x + ((h >>> 8) % Math.max(1, r.w + 30)) - k * 34;
    const y = r.y - 4 + ((h >>> 16) % Math.max(1, r.h)) * 0.6 + k * 20;
    for (let s = 0; s < 6; s++) {
      const px = Math.round(x + s * 1.7);
      const py = Math.round(y - s);
      if (px < r.x || px >= r.x + r.w || py < r.y || py >= r.y + r.h) continue;
      ctx.fillStyle = s === 0 ? "#fff6e0" : s < 3 ? "#ffc878" : "#b0603a";
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function iceField(ctx: CanvasRenderingContext2D, r: Rect, t: number): void {
  const c = 19;
  const off = t * 6;
  for (let j = Math.floor(r.y / c); j <= Math.floor((r.y + r.h) / c); j++) {
    for (let i = Math.floor((r.x + off) / c) - 1; i <= Math.floor((r.x + r.w + off) / c); i++) {
      const h = ih(i, j, 9);
      if (h % 100 > 34) continue;
      const x = Math.round(i * c + ((h >>> 8) % c) - off);
      const y = j * c + ((h >>> 16) % c);
      const big = (h >>> 5) % 3 === 0;
      const pts = big ? [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [-1, 1]] : [[0, 0], [1, 0], [0, 1]];
      for (const [dx, dy] of pts) {
        const px = x + dx!;
        const py = y + dy!;
        if (px < r.x || px >= r.x + r.w || py < r.y || py >= r.y + r.h) continue;
        ctx.fillStyle = dy === 0 ? "#eaf8ff" : dx! < 0 ? "#7aa8c8" : "#b8dcf0";
        ctx.fillRect(px, py, 1, 1);
      }
      if (Math.sin(t * 3 + (h % 50)) > 0.93 && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y - 1, 1, 1);
      }
    }
  }
}

/** The ion storm: a violet glow and the odd forked arc across the rect. */
function ionStorm(ctx: CanvasRenderingContext2D, r: Rect, t: number, seed: number): void {
  const beat = Math.floor(t * 1.3 + seed * 0.37);
  const h = ih(beat, seed, 31);
  const p = t * 1.3 + seed * 0.37 - beat;
  ctx.fillStyle = `rgba(150,90,255,${0.08 + 0.05 * Math.sin(t * 2 + seed)})`;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (h % 3 !== 0 || p > 0.22) return;
  ctx.fillStyle = `rgba(200,170,255,${0.35 * (1 - p / 0.22)})`;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  let x = r.x + ((h >>> 8) % Math.max(1, r.w));
  ctx.fillStyle = p < 0.1 ? "#ffffff" : "#d8b8ff";
  for (let y = r.y; y < r.y + r.h; y += 2) {
    x += ((h >>> ((y - r.y) % 24)) % 3) - 1;
    if (x >= r.x && x < r.x + r.w) ctx.fillRect(x, y, 1, 2);
  }
}

// ------------------------------------------------------------------ things out there

/** Someone on a spacewalk: a white suit on a tether, drifting along the hull and waving. */
export function drawEva(ctx: CanvasRenderingContext2D, r: Rect, t: number, W: number): void {
  const k = since(SHIP.evaAt, t, 16);
  if (k < 0) return;
  const x = Math.round(-20 + (k / 16) * (W + 40));
  const y = Math.round(22 + Math.sin(k * 1.3) * 5);
  if (x < r.x - 12 || x > r.x + r.w + 4 || y < r.y - 14 || y > r.y + r.h + 4) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  // The tether back toward the airlock.
  ctx.fillStyle = "#c8ccd6";
  for (let i = 1; i < 18; i++) ctx.fillRect(x - i * 2, y + 6 + Math.round(Math.sin(k * 2 + i * 0.5) * 2), 1, 1);
  const wave = Math.floor(t * 4) % 2;
  fill(ctx, x - 3, y - 6, 7, 7, OUTLINE);
  fill(ctx, x - 2, y - 5, 5, 5, "#f4f6f9");
  fill(ctx, x - 1, y - 4, 3, 2, "#3a6fb0");
  fill(ctx, x, y - 4, 1, 1, "#a8e8ff");
  fill(ctx, x - 3, y + 1, 7, 6, OUTLINE);
  fill(ctx, x - 2, y + 1, 5, 5, "#e8ecf2");
  fill(ctx, x - 1, y + 2, 3, 1, P.orange);
  fill(ctx, x - 4, y + 1, 2, 3, "#d3d9e2");
  fill(ctx, x + 3, y - 2 + wave, 2, 3, "#d3d9e2");
  fill(ctx, x - 2, y + 6, 2, 2, "#c8ccd6");
  fill(ctx, x + 1, y + 6, 2, 2, "#c8ccd6");
  ctx.restore();
}

/** A small freighter (an original boxy hauler) crossing now and then. */
function freighter(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const s = cached("spaceship|freighter", () =>
    makeCanvas(22, 8, (c) => {
      fill(c, 1, 2, 20, 4, OUTLINE);
      fill(c, 2, 3, 12, 2, "#8a93a6");
      fill(c, 2, 3, 12, 1, "#b8c0d0");
      for (let i = 0; i < 3; i++) fill(c, 3 + i * 4, 1, 3, 6, i % 2 ? "#c46a3a" : "#5a8aa8");
      fill(c, 14, 2, 5, 4, "#6c7486");
      fill(c, 18, 3, 3, 2, "#a8e8ff");
      fill(c, 0, 3, 1, 2, "#7fe3ff");
    }),
  );
  ctx.drawImage(s, Math.round(x), Math.round(y));
}

function comet(ctx: CanvasRenderingContext2D, r: Rect, t: number): void {
  const p = (t % 150) / 22;
  if (p > 1) return;
  const x = r.x + r.w * (1.1 - p * 1.3);
  const y = r.y + r.h * (0.15 + p * 0.35);
  for (let i = 0; i < 18; i++) {
    const px = Math.round(x + i * 1.6);
    const py = Math.round(y - i * 0.5);
    if (px < r.x || px >= r.x + r.w || py < r.y || py >= r.y + r.h) continue;
    ctx.fillStyle = i === 0 ? "#ffffff" : i < 4 ? "#c8f0ff" : i < 10 ? "rgba(140,210,255,0.6)" : "rgba(120,180,255,0.3)";
    ctx.fillRect(px, py, i < 3 ? 2 : 1, 1);
  }
}

// ------------------------------------------------------------------ the views

function weatherIn(ctx: CanvasRenderingContext2D, r: Rect, t: number, ph: Phenomenon, seed: number): void {
  switch (ph) {
    case "wisps":
      drawNebula(ctx, r, t, nebulaTile("#3a8a9a", "#5a6ab0", 48, 0.55), 0.35, 2);
      break;
    case "dust":
      drawNebula(ctx, r, t, nebulaTile("#7a6a5a", "#5a5060", 48, 0.8), 0.45, 3);
      break;
    case "nebula":
      drawNebula(ctx, r, t, nebulaTile("#c0508a", "#6a4ad0", 64, 1), 0.65, 1.5);
      break;
    case "drizzle":
      meteors(ctx, r, t, Math.max(1, Math.round((r.w * r.h) / 1400)), seed);
      break;
    case "meteors":
      meteors(ctx, r, t, Math.max(2, Math.round((r.w * r.h) / 380)), seed);
      break;
    case "ice":
      iceField(ctx, r, t);
      break;
    case "ion":
      ionStorm(ctx, r, t, seed);
      break;
    default:
      break;
  }
}

/** The view out of a porthole (`r` is the window; the glass is the circle inside it). */
export function portholeView(ctx: CanvasRenderingContext2D, r: Rect, index: number, t: number, weather: WeatherKind, W: number): void {
  const sys = systemOf(SHIP.system);
  // Deep space, a touch lighter toward the bottom of the glass.
  for (let i = 0; i < 4; i++) fill(ctx, r.x, r.y + i * 6, r.w, 6, mix(sys.tint, "#34488a", 0.08 + i * 0.12));
  if (sys.nebula) drawNebula(ctx, r, t, nebulaTile(sys.nebula[0], sys.nebula[1], 64, 0.7), 0.5, 1);
  const warp = warpNow(t);
  starfield(ctx, r, t, warp);
  // Close up to the glass a few bright stars slide by (the field alone is sparse in a small porthole).
  for (let i = 0; i < 5; i++) {
    const h = ih(index, i, 3);
    const speed = 2 + (h % 5);
    const x = r.x + 20 - (((t * speed + (h % 97)) % 24) | 0);
    const y = r.y + 5 + ((h >>> 8) % 14);
    const len = Math.round(warp * 10);
    fill(ctx, x, y, 1 + len, 1, (h >>> 4) % 3 ? "#e8ecff" : "#ffd9a0");
  }
  // Now and then a body of this system drifts by one of the portholes.
  const body = sys.bodies[sys.bodies.length - 1]!;
  const lap = 90 + index * 23;
  const p = ((t + index * 37) % lap) / lap;
  if (index % 2 === SHIP.system % 2) {
    const s = planet(body, 5, index);
    ctx.drawImage(s, Math.round(r.x + r.w + 6 - p * (r.w + 20 + s.width)), Math.round(r.y + 4 + (index * 5) % 8));
  }
  weatherIn(ctx, r, t, phenomenon(weather), index + 1);
  drawEva(ctx, r, t, W);
  jumpFlash(ctx, r, t);
  // A glint on the glass.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(r.x + 8, r.y + 7, 2, 1);
  ctx.fillRect(r.x + 7, r.y + 8, 1, 2);
}

function jumpFlash(ctx: CanvasRenderingContext2D, r: Rect, t: number): void {
  const j = t - SHIP.jumpAt;
  if (j < 0.85 || j > 1.5) return;
  const a = j < 1 ? (j - 0.85) / 0.15 : 1 - (j - 1) / 0.5;
  ctx.fillStyle = `rgba(230,240,255,${Math.max(0, Math.min(1, a)) * 0.9})`;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

/** The bridge's viewscreen: the system ahead, its suns and worlds, space weather, a HUD. */
export function viewscreen(ctx: CanvasRenderingContext2D, v: Rect, t: number, weather: WeatherKind, W: number): void {
  if (v.w <= 0 || v.h <= 0) return;
  const j = t - SHIP.jumpAt;
  const jumping = j >= 0 && j < 1;
  // Half way through a jump the view switches to the system the jump goes to.
  const sys = systemOf(jumping ? SHIP.system - 1 : SHIP.system);
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.x, v.y, v.w, v.h);
  ctx.clip();
  for (let i = 0; i < 6; i++) fill(ctx, v.x, v.y + Math.floor((i * v.h) / 6), v.w, Math.ceil(v.h / 6) + 1, mix(sys.tint, "#000000", i / 9));
  if (sys.nebula) drawNebula(ctx, v, t, nebulaTile(sys.nebula[0], sys.nebula[1], 64, 0.85), 0.7, 0.8, v.y);
  const warp = warpNow(t);
  starfield(ctx, v, t * 1.5, warp);
  // The suns and worlds drift very slowly across.
  const drift = (((t - Math.max(0, SHIP.jumpAt)) * 0.05) % 30) - 15;
  for (const s of sys.suns) {
    const c = sun(s.color, s.r);
    ctx.drawImage(c, Math.round(v.x + v.w * s.fx - c.width / 2 + drift * 0.3), Math.round(v.y + v.h * s.fy - c.height / 2));
  }
  if (sys.belt) {
    for (let i = 0; i < v.w; i += 3) {
      const h = ih(i, SHIP.system, 5);
      if (h % 3) continue;
      const by = v.y + v.h * 0.82 + Math.sin(i * 0.05) * 4 + ((h >>> 8) % 4);
      fill(ctx, v.x + ((i + Math.floor(t * 2)) % v.w), Math.round(by), 1 + ((h >>> 4) % 2), 1, h % 2 ? "#8a7a6a" : "#5a4a40");
    }
  }
  sys.bodies.forEach((b, i) => {
    const s = planet(b, b.fr * v.h, i + SHIP.system * 3);
    ctx.drawImage(s, Math.round(v.x + v.w * b.fx - s.width / 2 + drift * (0.5 + i * 0.4)), Math.round(v.y + v.h * b.fy - s.height / 2));
  });
  // Traffic: a freighter now and then, a comet more rarely.
  const ft = t % 95;
  if (ft < 26) freighter(ctx, v.x + v.w + 4 - (ft / 26) * (v.w + 30), v.y + v.h * 0.4 + Math.sin(t * 0.3) * 2);
  comet(ctx, v, t);
  weatherIn(ctx, v, t, phenomenon(weather), 0);
  drawEva(ctx, v, t, W);
  if (jumping) {
    // Into the fold: rings close in on the middle.
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    ctx.fillStyle = "rgba(160,120,255,0.5)";
    for (let k = 0; k < 3; k++) {
      const rr = ((1 - j) * 60 + k * 18) % 70;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * rr * 1.6), Math.round(cy + Math.sin(a) * rr * 0.7), 1, 1);
      }
    }
  }
  jumpFlash(ctx, v, t);
  // The HUD: corner ticks, a reticle, the system's name and a faint scanline.
  ctx.fillStyle = "rgba(127,227,255,0.55)";
  for (const [x, y, dx, dy] of [[v.x + 2, v.y + 2, 1, 1], [v.x + v.w - 3, v.y + 2, -1, 1], [v.x + 2, v.y + v.h - 3, 1, -1], [v.x + v.w - 3, v.y + v.h - 3, -1, -1]] as const) {
    ctx.fillRect(Math.min(x, x + dx * 4), y, 5, 1);
    ctx.fillRect(x, Math.min(y, y + dy * 4), 1, 5);
  }
  const cx = Math.round(v.x + v.w / 2);
  const cy = Math.round(v.y + v.h / 2);
  ctx.fillStyle = "rgba(127,227,255,0.3)";
  ctx.fillRect(cx - 4, cy, 3, 1);
  ctx.fillRect(cx + 2, cy, 3, 1);
  ctx.fillRect(cx, cy - 3, 1, 2);
  ctx.fillRect(cx, cy + 2, 1, 2);
  const label = jumping ? "JUMPING" : sys.name;
  drawPixelText(ctx, label, v.x + 4, v.y + v.h - 8, j >= 0 && j < 4 && Math.floor(t * 4) % 2 ? "#ffffff" : "rgba(127,227,255,0.75)");
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  const row = Math.floor(t * 12) % v.h;
  ctx.fillRect(v.x, v.y + row, v.w, 2);
  ctx.restore();
}

/** Space beyond the hull at the panel's sides and bottom, the nav lights on the hull, the engines' glow aft. */
export function hullSpace(ctx: CanvasRenderingContext2D, W: number, H: number, E: number, EB: number, t: number, weather: WeatherKind, night: number): void {
  const strips: Rect[] = [];
  if (E > 5) strips.push({ x: 0, y: 0, w: E - 5, h: H }, { x: W - E + 5, y: 0, w: E - 5, h: H });
  if (EB > 5) strips.push({ x: E > 5 ? E - 5 : 0, y: H - EB + 5, w: W - 2 * Math.max(0, E - 5), h: EB - 5 });
  if (strips.length === 0) return;
  const sys = systemOf(SHIP.system);
  const warp = warpNow(t);
  const ph = phenomenon(weather);
  for (const [i, r] of strips.entries()) {
    fill(ctx, r.x, r.y, r.w, r.h, sys.tint);
    starfield(ctx, r, t, warp);
    if (ph === "nebula" || ph === "dust" || ph === "ion" || ph === "ice") weatherIn(ctx, r, t, ph, 10 + i);
    drawEva(ctx, r, t, W);
    jumpFlash(ctx, r, t);
  }
  // The engines' glow off the stern, low on the left.
  if (E > 5) {
    const pulse = 0.55 + 0.15 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23);
    const cy = H - EB - 40;
    for (let y = cy - 18; y < cy + 18; y++) {
      const k = 1 - Math.abs(y - cy) / 18;
      ctx.fillStyle = `rgba(110,190,255,${(k * pulse * 0.55).toFixed(3)})`;
      ctx.fillRect(0, y, E - 5, 1);
    }
  }
  // Nav lights on the hull: red to port (left), green to starboard, blinking.
  if (E > 5 && Math.floor(t * 1.2) % 3 === 0) {
    const y = Math.round(H * 0.4);
    fill(ctx, E - 6, y, 1, 2, "#ff5a5a");
    fill(ctx, W - E + 5, y, 1, 2, "#5aff8a");
  }
  if (night > 0.5 && EB > 5 && Math.floor(t * 0.8) % 4 === 1) fill(ctx, Math.round(W / 2), H - EB + 5, 2, 1, "#ffffff");
}

export { NEVER };
