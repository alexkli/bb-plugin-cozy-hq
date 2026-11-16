// Tools for scenery authors (office/themes/*.ts). Everything a theme needs to
// draw lives here, so themes don't reach into the core modules directly.

import { ANCHOR_X, ANCHOR_Y, CHAR_H, CHAR_W, OUTLINE, type Look } from "./characters.ts";
import { CLASSIC_BACKGROUND, classicProp, pa, paRecolor } from "./furniture.ts";
import type { Layout, Rect } from "./layout.ts";
import { Grid, hash, hex, hsl, mix, parseColor, rng, shade, SpriteCache } from "./pixel.ts";
import { drawPixelText, pixelTextWidth } from "./pixelfont.ts";

export { ANCHOR_X, ANCHOR_Y, CHAR_H, CHAR_W, OUTLINE, CLASSIC_BACKGROUND, classicProp, pa, paRecolor, Grid, hash, hex, hsl, mix, parseColor, rng, shade, SpriteCache, drawPixelText, pixelTextWidth };
export type { Look };

/** Fill a rectangle. */
export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** A checkerboard of square tiles. */
export function tiles(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, size = 6): void {
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      rect(ctx, x, y, Math.min(size, r.x + r.w - x), Math.min(size, r.y + r.h - y), (((x - r.x) / size + (y - r.y) / size) | 0) % 2 ? a : b);
    }
  }
}

/** A carpet with a border and a fleck pattern. */
export function carpet(ctx: CanvasRenderingContext2D, r: Rect, edge: string, base: string, fleck: string): void {
  rect(ctx, r.x, r.y, r.w, r.h, edge);
  rect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, base);
  for (let y = r.y + 4; y < r.y + r.h - 4; y += 6) {
    for (let x = r.x + 4 + ((y - r.y) % 12 ? 3 : 0); x < r.x + r.w - 4; x += 6) rect(ctx, x, y, 2, 1, fleck);
  }
}

/** A new canvas of this size, drawn by `draw` (pixel-crisp). */
export function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  return c;
}

const memo = new Map<string, unknown>();
/** Build something once per key (sprites, palettes); keys should start with your theme id. */
export function cached<T>(key: string, build: () => T): T {
  if (!memo.has(key)) memo.set(key, build());
  return memo.get(key) as T;
}

/** Run `fn` over every opaque pixel of a copy of `src`; return [r, g, b, a] to replace it. */
export function mapPixels(src: HTMLCanvasElement, fn: (r: number, g: number, b: number, a: number, x: number, y: number) => [number, number, number, number]): HTMLCanvasElement {
  return makeCanvas(src.width, src.height, (ctx) => {
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, src.width, src.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const p = (i / 4) | 0;
      const out = fn(d[i]!, d[i + 1]!, d[i + 2]!, d[i + 3]!, p % src.width, (p / src.width) | 0);
      d[i] = out[0];
      d[i + 1] = out[1];
      d[i + 2] = out[2];
      d[i + 3] = out[3];
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Swap exact colors ("#rrggbb" → "#rrggbb"). */
export function recolor(src: HTMLCanvasElement, map: Record<string, string>): HTMLCanvasElement {
  const table = new Map<number, [number, number, number]>();
  for (const [from, to] of Object.entries(map)) {
    const [r, g, b] = parseColor(from);
    const [r2, g2, b2] = parseColor(to);
    table.set((r << 16) | (g << 8) | b, [r2, g2, b2]);
  }
  return mapPixels(src, (r, g, b, a) => {
    const hit = table.get((r << 16) | (g << 8) | b);
    return hit ? [hit[0], hit[1], hit[2], a] : [r, g, b, a];
  });
}

/** Blend every pixel toward `color` by `amount` (0..1). */
export function tint(src: HTMLCanvasElement, color: string, amount: number): HTMLCanvasElement {
  const [tr, tg, tb] = parseColor(color);
  return mapPixels(src, (r, g, b, a) => [r + (tr - r) * amount, g + (tg - g) * amount, b + (tb - b) * amount, a]);
}

/**
 * Shift saturation and lightness: `sat` multiplies saturation (0 = grey,
 * 1.5 = vivid), `light` adds -1..1, `contrast` scales around mid grey.
 */
export function adjust(src: HTMLCanvasElement, opts: { sat?: number; light?: number; contrast?: number }): HTMLCanvasElement {
  const sat = opts.sat ?? 1;
  const light = (opts.light ?? 0) * 255;
  const con = opts.contrast ?? 1;
  return mapPixels(src, (r, g, b, a) => {
    const grey = 0.3 * r + 0.59 * g + 0.11 * b;
    const f = (v: number) => Math.max(0, Math.min(255, ((grey + (v - grey) * sat + light) - 128) * con + 128));
    return [f(r), f(g), f(b), a];
  });
}

/** A 1px glow/outline of `color` around the opaque pixels (the canvas grows by 1px each side). */
export function edgeGlow(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const s = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && s[(y * w + x) * 4 + 3]! > 0;
  return makeCanvas(w + 2, h + 2, (ctx) => {
    ctx.fillStyle = color;
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (on(x, y)) continue;
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    ctx.drawImage(src, 1, 1);
  });
}

/** Wear and dirt: darkened specks and the odd crack (`amount` 0..1). */
export function grime(src: HTMLCanvasElement, seed: number, amount = 0.25): HTMLCanvasElement {
  const r = rng(seed);
  return mapPixels(src, (cr, cg, cb, a) => {
    const k = r();
    if (k < amount * 0.25) return [cr * 0.55, cg * 0.52, cb * 0.48, a];
    if (k < amount) return [cr * 0.85, cg * 0.82, cb * 0.76, a];
    return [cr, cg, cb, a];
  });
}

/** Draw a canvas from a sprite with its top-left at (x, y). */
export function blit(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number): void {
  ctx.drawImage(src, Math.round(x), Math.round(y));
}

// ------------------------------------------------------------------ where decor fits

export interface FloorPlan {
  /** True when this floor rectangle is clear of furniture, people's spots, paths and walls. */
  isFree(r: Rect): boolean;
  /** Up to `n` clear spots of size w×h (top-left corners), spread out; optionally only inside `within`. */
  find(w: number, h: number, n: number, within?: Rect): Rect[];
}

/**
 * A rough map of what's taken on the floor: furniture, desks, the spots
 * people go to and the paths they walk, hallways, aisles and the back wall.
 * Use it to place a theme's decor where nobody walks through it.
 */
export function floorPlan(L: Layout): FloorPlan {
  return cached(`floorplan|${L.W}x${L.H}|${L.spots.length}|${L.props.length}`, () => {
    const S = 2;
    const cols = Math.ceil(L.W / S);
    const rows = Math.ceil(L.H / S);
    const taken = new Uint8Array(cols * rows);
    const mark = (x: number, y: number, w: number, h: number) => {
      const x0 = Math.max(0, Math.floor(x / S));
      const y0 = Math.max(0, Math.floor(y / S));
      const x1 = Math.min(cols, Math.ceil((x + w) / S));
      const y1 = Math.min(rows, Math.ceil((y + h) / S));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) taken[yy * cols + xx] = 1;
    };
    for (const sg of L.segments) mark(sg.x0, 0, sg.x1 - sg.x0, sg.depth + 4);
    for (const p of L.props) {
      const c = classicProp(p, L);
      mark(p.x - 2, p.y - 2, c.width + 4, c.height + 4);
    }
    for (const pl of L.plants) mark(pl.x, pl.y, 16, Math.max(16, pl.z - pl.y + 2));
    for (const d of L.desks) mark(d.x - 2, d.y - 12, 52, 50);
    for (const s of L.spots) {
      mark(s.x - 8, s.y - 26, 16, 28);
      let prev = s.path[0];
      for (const q of s.path.slice(1)) {
        if (prev) mark(Math.min(prev.x, q.x) - 6, Math.min(prev.y, q.y) - 6, Math.abs(q.x - prev.x) + 12, Math.abs(q.y - prev.y) + 12);
        prev = q;
      }
    }
    for (const hy of L.net.halls) mark(0, hy - 8, L.W, 16);
    for (const ax of L.net.aisles) mark(ax - 8, 0, 16, L.H);
    for (const r of L.rooms) if (r.walls) {
      mark(r.rect.x - 3, r.rect.y - 9, r.rect.w + 6, 10);
      mark(r.rect.x - 3, r.rect.y, 4, r.rect.h);
      mark(r.rect.x + r.rect.w - 2, r.rect.y, 4, r.rect.h);
      mark(r.rect.x - 3, r.rect.y + r.rect.h - 10, r.rect.w + 6, 12);
    }
    mark(L.entrance.x - 10, 0, 20, L.net.halls[0] ?? L.H);
    const isFree = (r: Rect) => {
      if (r.x < 0 || r.y < 0 || r.x + r.w > L.W || r.y + r.h > L.H) return false;
      for (let yy = Math.floor(r.y / S); yy < Math.ceil((r.y + r.h) / S); yy++) {
        for (let xx = Math.floor(r.x / S); xx < Math.ceil((r.x + r.w) / S); xx++) if (taken[yy * cols + xx]) return false;
      }
      return true;
    };
    const find = (w: number, h: number, n: number, within?: Rect) => {
      const area = within ?? { x: 0, y: 0, w: L.W, h: L.H };
      const out: Rect[] = [];
      for (let y = area.y; y + h <= area.y + area.h && out.length < n; y += 4) {
        for (let x = area.x; x + w <= area.x + area.w && out.length < n; x += 4) {
          const r = { x, y, w, h };
          if (!isFree(r)) continue;
          if (out.some((o) => Math.abs(o.x - x) < w + 12 && Math.abs(o.y - y) < h + 12)) continue;
          out.push(r);
        }
      }
      return out;
    };
    return { isFree, find };
  });
}
