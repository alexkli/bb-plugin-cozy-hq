// Neon City: palette and small sprite helpers shared by the scenery modules.
import { cached, Grid, hash, makeCanvas, mapPixels, OUTLINE, parseColor, rng } from "../../themekit.ts";

/** The Neon City palette: wet steel and night violet, with neon accents. */
export const P = {
  void: "#0b0916",
  ink: "#110e1e",
  night: "#171327",
  deep: "#1d1830",
  panel: "#241e3a",
  panel2: "#2d2649",
  steel: "#3a3458",
  steel2: "#4c4670",
  steelHi: "#6a6694",
  chrome: "#a9b0d0",
  chromeHi: "#e2e6f7",
  mag: "#ff2fa8",
  magHi: "#ff9ad6",
  magLo: "#b0187a",
  magDim: "#5c1048",
  cyan: "#2ef2ff",
  cyanHi: "#c2fcff",
  cyanLo: "#1499b0",
  cyanDim: "#0d4a5e",
  vio: "#a052ff",
  vioHi: "#d2a8ff",
  vioLo: "#5f27b0",
  vioDim: "#32165e",
  yel: "#ffd23f",
  yelLo: "#b88a12",
  lime: "#7dff6a",
  limeLo: "#2f9e3a",
  orange: "#ff8a3d",
  red: "#ff3b5c",
  redLo: "#a81a3a",
  white: "#f4f2ff",
} as const;

export { OUTLINE };

/** Neon hues in the order signs and trims cycle through them. */
export const NEONS = [P.mag, P.cyan, P.vio, P.yel, P.lime] as const;

/** Build a Grid sprite once, outline it, and bake it to a canvas. */
export function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, opts: { outline?: boolean; skip?: string[]; post?: (ctx: CanvasRenderingContext2D) => void } = {}): HTMLCanvasElement {
  return cached(`neon|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (opts.outline !== false) g.outline(OUTLINE, { skip: opts.skip });
    const c = g.toCanvas();
    if (opts.post) opts.post(c.getContext("2d")!);
    return c;
  });
}

/** Paint a Grid onto a context. */
export function stamp(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Hue (0..360), saturation and lightness (0..1) of a "#rrggbb" color. */
export function hslOf(c: string): [number, number, number] {
  const [r, g, b] = parseColor(c);
  return rgbToHsl(r, g, b);
}

/** The neon closest to a hue. */
export function neonFor(h: number): string {
  if (h < 15 || h >= 345) return P.red;
  if (h < 38) return P.orange;
  if (h < 70) return P.yel;
  if (h < 150) return P.lime;
  if (h < 215) return P.cyan;
  if (h < 290) return P.vio;
  return P.mag;
}

const RAMP = ["#0e0b1a", "#141024", "#1b162f", "#221c3b", "#2b2449", "#362e59", "#443b6c", "#574f84", "#7570a6", "#9d9ac8", "#c8c6e6"].map((c) => parseColor(c));

/**
 * Turn a classic sprite into Neon City stuff: wood and paint become dark
 * steel by brightness, vivid colors become neon. Outlines stay.
 */
export function neonize(src: HTMLCanvasElement, opts: { sat?: number; lift?: number } = {}): HTMLCanvasElement {
  const satMin = opts.sat ?? 0.42;
  const lift = opts.lift ?? 0;
  const [or, og, ob] = parseColor(OUTLINE);
  return mapPixels(src, (r, g, b, a) => {
    if (r === or && g === og && b === ob) return [r, g, b, a];
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s > satMin && l > 0.32 && l < 0.88) {
      const [nr, ng, nb] = parseColor(neonFor(h));
      const k = l > 0.68 ? 0.45 : l < 0.45 ? -0.35 : 0;
      if (k > 0) return [nr + (255 - nr) * k, ng + (255 - ng) * k, nb + (255 - nb) * k, a];
      if (k < 0) return [nr * (1 + k), ng * (1 + k), nb * (1 + k), a];
      return [nr, ng, nb, a];
    }
    const i = Math.max(0, Math.min(RAMP.length - 1, Math.round(l * 0.78 * (RAMP.length - 1) + lift)));
    const c = RAMP[i]!;
    return [c[0], c[1], c[2], a];
  });
}

/**
 * Neon rim light: outline pixels on the sprite's silhouette turn `color`
 * (`top`: only where the sky is above them, i.e. the top edges).
 */
export function rim(src: HTMLCanvasElement, color: string, mode: "all" | "top" | "sides" = "all"): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const empty = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || data[(y * w + x) * 4 + 3] === 0;
  const [or, og, ob] = parseColor(OUTLINE);
  const [cr, cg, cb] = parseColor(color);
  return mapPixels(src, (r, g, b, a, x, y) => {
    if (r !== or || g !== og || b !== ob) return [r, g, b, a];
    const hit = mode === "top" ? empty(x, y - 1) : mode === "sides" ? empty(x - 1, y) || empty(x + 1, y) : empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1);
    return hit ? [cr, cg, cb, a] : [r, g, b, a];
  });
}

/** Only the pixels of `src` that are one of the given colors (an emissive mask). */
export function only(src: HTMLCanvasElement, colors: string[]): HTMLCanvasElement {
  const keep = new Set(colors.map((c) => {
    const [r, g, b] = parseColor(c);
    return (r << 16) | (g << 8) | b;
  }));
  return mapPixels(src, (r, g, b, a) => (keep.has((r << 16) | (g << 8) | b) ? [r, g, b, a] : [0, 0, 0, 0]));
}

/** A soft round glow sprite (cached), drawn with "lighter". */
export function glowDot(color: string, radius: number, alpha = 1): HTMLCanvasElement {
  return cached(`neon|glow|${color}|${radius}|${alpha}`, () =>
    makeCanvas(radius * 2, radius * 2, (ctx) => {
      const [r, g, b] = parseColor(color);
      const gr = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      gr.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      gr.addColorStop(0.35, `rgba(${r},${g},${b},${alpha * 0.45})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, radius * 2, radius * 2);
    }),
  );
}

/** A soft horizontal bar of glow (for neon tubes), cached by size and color. */
export function glowBar(color: string, w: number, spread: number, alpha = 1): HTMLCanvasElement {
  return cached(`neon|bar|${color}|${w}|${spread}|${alpha}`, () =>
    makeCanvas(w + spread * 2, spread * 2 + 1, (ctx) => {
      const [r, g, b] = parseColor(color);
      for (let j = 0; j <= spread * 2; j++) {
        const dy = Math.abs(j - spread) / (spread + 0.5);
        const k = alpha * Math.pow(1 - dy, 2);
        for (let i = 0; i < w + spread * 2; i++) {
          const dx = i < spread ? (spread - i) / spread : i >= w + spread ? (i - w - spread + 1) / spread : 0;
          const kk = k * Math.max(0, 1 - dx);
          if (kk <= 0.004) continue;
          ctx.fillStyle = `rgba(${r},${g},${b},${kk})`;
          ctx.fillRect(i, j, 1, 1);
        }
      }
    }),
  );
}

/**
 * An invented glyph (5 wide, `h` tall) for signs: blocky strokes, readable
 * as "writing" without being any real script.
 */
export function glyph(seed: number, h = 5): string[] {
  const r = rng(seed * 7919 + 13);
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let s = "";
    for (let x = 0; x < 5; x++) s += r() < (y === 0 || y === h - 1 ? 0.6 : 0.42) ? "#" : ".";
    rows.push(s);
  }
  // A spine so it reads as one character.
  const spine = hash(`g${seed}`) % 3;
  for (let y = 0; y < h; y++) {
    const row = rows[y]!.split("");
    if (spine === 0) row[2] = "#";
    else if (spine === 1 && y % 2 === 0) row[0] = "#";
    else if (spine === 2 && y === Math.floor(h / 2)) row.fill("#");
    rows[y] = row.join("");
  }
  return rows;
}

/** Like `recolor`, but tolerant (semi-transparent pixels read back a little off). */
export function recolorNear(src: HTMLCanvasElement, map: Record<string, string>, tol = 6): HTMLCanvasElement {
  const pairs = Object.entries(map).map(([a, b]) => [parseColor(a), parseColor(b)] as const);
  return mapPixels(src, (r, g, b, a) => {
    for (const [[fr, fg, fb], [tr, tg, tb]] of pairs) {
      if (Math.abs(r - fr) <= tol && Math.abs(g - fg) <= tol && Math.abs(b - fb) <= tol) return [tr, tg, tb, a];
    }
    return [r, g, b, a];
  });
}

const latestByKind = new Map<string, { key: string; value: unknown }>();
/**
 * Like `cached`, but keeps only the newest value per `kind`: for things
 * baked per layout (the panel gets resized; old sizes are never needed again).
 */
export function perLayout<T>(kind: string, key: string, build: () => T): T {
  const hit = latestByKind.get(kind);
  if (hit && hit.key === key) return hit.value as T;
  const value = build();
  latestByKind.set(kind, { key, value });
  return value;
}
