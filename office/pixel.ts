// Tiny pixel-art toolkit: sprites are built procedurally on a color grid,
// outlined automatically, then baked into canvases once and cached.

export type Color = string;

export class Grid {
  readonly w: number;
  readonly h: number;
  readonly px: (Color | null)[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Array<Color | null>(w * h).fill(null);
  }

  get(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x] ?? null;
  }

  set(x: number, y: number, c: Color | null): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.px[y * this.w + x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Color | null): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  /** Rounded rect: corners trimmed by `r` steps (pixel-art style). */
  rrect(x: number, y: number, w: number, h: number, c: Color, r = 1): this {
    for (let j = 0; j < h; j++) {
      const inset = j < r ? r - j : j >= h - r ? j - (h - r) + 1 : 0;
      for (let i = inset; i < w - inset; i++) this.set(x + i, y + j, c);
    }
    return this;
  }

  hline(x: number, y: number, w: number, c: Color): this {
    return this.rect(x, y, w, 1, c);
  }

  vline(x: number, y: number, h: number, c: Color): this {
    return this.rect(x, y, 1, h, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Replace every pixel of color `from` with `to`. */
  recolor(from: Color, to: Color): this {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === from) this.px[i] = to;
    return this;
  }

  /**
   * Add a 1px outline around every filled pixel. Pixels listed in `skip`
   * do not emit outlines (handy for glows and highlights at edges).
   */
  outline(c: Color, opts: { diagonal?: boolean; skip?: Color[] } = {}): this {
    const add: number[] = [];
    const skip = new Set(opts.skip ?? []);
    const filled = (x: number, y: number) => {
      const v = this.get(x, y);
      return v !== null && v !== c && !skip.has(v);
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== null) continue;
        let near =
          filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1);
        if (!near && opts.diagonal) {
          near =
            filled(x - 1, y - 1) ||
            filled(x + 1, y - 1) ||
            filled(x - 1, y + 1) ||
            filled(x + 1, y + 1);
        }
        if (near) add.push(y * this.w + x);
      }
    }
    for (const i of add) this.px[i] = c;
    return this;
  }

  /** Copy another grid onto this one (null pixels are transparent). */
  stamp(g: Grid, ox: number, oy: number, flipX = false): this {
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const v = g.get(flipX ? g.w - 1 - x : x, y);
        if (v !== null) this.set(ox + x, oy + y, v);
      }
    }
    return this;
  }

  flipped(): Grid {
    const g = new Grid(this.w, this.h);
    return g.stamp(this, 0, 0, true);
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.px.length; i++) {
      const c = this.px[i];
      if (c === null || c === undefined) continue;
      const [r, g, b, a] = parseColor(c);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

const colorCache = new Map<string, [number, number, number, number]>();

export function parseColor(c: string): [number, number, number, number] {
  const hit = colorCache.get(c);
  if (hit) return hit;
  let out: [number, number, number, number] = [0, 0, 0, 255];
  if (c.startsWith("#")) {
    const h = c.slice(1);
    if (h.length === 3 || h.length === 4) {
      out = [
        parseInt(h[0]! + h[0]!, 16),
        parseInt(h[1]! + h[1]!, 16),
        parseInt(h[2]! + h[2]!, 16),
        h.length === 4 ? parseInt(h[3]! + h[3]!, 16) : 255,
      ];
    } else {
      out = [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
        h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255,
      ];
    }
  }
  colorCache.set(c, out);
  return out;
}

export function hex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix two hex colors; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseColor(a);
  const [r2, g2, b2] = parseColor(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function shade(c: string, amount: number): string {
  return amount >= 0 ? mix(c, "#ffffff", amount) : mix(c, "#1a1020", -amount);
}

export function hsl(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** Stable 32-bit hash for deterministic per-thread looks. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export class SpriteCache {
  private map = new Map<string, HTMLCanvasElement>();
  get(key: string, build: () => Grid): HTMLCanvasElement {
    let c = this.map.get(key);
    if (!c) {
      c = build().toCanvas();
      this.map.set(key, c);
      if (this.map.size > 4000) {
        const first = this.map.keys().next().value;
        if (first !== undefined) this.map.delete(first);
      }
    }
    return c;
  }
}
