// Surf Villa: the grounds of the floor plan, baked into the backdrop: the
// villa's deck, the pool deck pavers, the infinity pools, boardwalks over the
// sand, the surf along the bottom, the work deck under its sail shades, beach
// towels under the umbrellas and the surf shack's thatched eave.
import type { Rect } from "../../layout.ts";
import { drawPixelText, OUTLINE, pixelTextWidth, rng, shade } from "../../themekit.ts";
import { C, fill } from "./kit.ts";

/** Travertine pool-deck pavers in a running bond. */
export function pavers(ctx: CanvasRenderingContext2D, r: Rect): void {
  const tones = ["#efe4cc", "#ebdfc4", "#f3e9d4", "#e8dbbe"];
  const rand = rng(77);
  for (let y = r.y, row = 0; y < r.y + r.h; y += 10, row++) {
    const h = Math.min(10, r.y + r.h - y);
    for (let x = r.x - (row % 2) * 10; x < r.x + r.w; x += 20) {
      const x0 = Math.max(r.x, x);
      const w = Math.min(x + 20, r.x + r.w) - x0;
      if (w <= 0) continue;
      fill(ctx, x0, y, w, h, tones[Math.floor(rand() * tones.length)]!);
      fill(ctx, x0, y, w, 1, "#f8f1e2");
      fill(ctx, x0, y, 1, h, "#d6c6a6");
      if (rand() < 0.3) fill(ctx, x0 + 3 + Math.floor(rand() * 12), y + 3 + Math.floor(rand() * 5), 2, 1, "#ddcfb2");
    }
    fill(ctx, r.x, y + h - 1, r.w, 1, "#d6c6a6");
  }
}

/** A boardwalk over the sand, planks across its run. */
export function boardwalk(ctx: CanvasRenderingContext2D, r: Rect): void {
  const across = r.w >= r.h;
  fill(ctx, r.x, r.y, r.w, r.h, C.drift);
  if (across) {
    for (let x = r.x; x < r.x + r.w; x += 5) {
      fill(ctx, x, r.y, 1, r.h, C.driftLo);
      if ((x * 7) % 3 === 0) fill(ctx, x + 2, r.y + 2, 1, 1, C.driftDk);
      fill(ctx, x + 1, r.y, 3, 1, C.driftHi);
    }
    fill(ctx, r.x, r.y + r.h - 1, r.w, 1, "rgba(90,70,40,0.35)");
    fill(ctx, r.x, r.y + r.h, r.w, 2, "rgba(120,90,50,0.18)");
  } else {
    for (let y = r.y; y < r.y + r.h; y += 5) {
      fill(ctx, r.x, y, r.w, 1, C.driftLo);
      fill(ctx, r.x, y + 1, r.w, 1, C.driftHi);
      if ((y * 7) % 3 === 0) fill(ctx, r.x + 2, y + 2, 1, 1, C.driftDk);
    }
    fill(ctx, r.x, r.y, 1, r.h, "rgba(90,70,40,0.35)");
    fill(ctx, r.x + r.w - 1, r.y, 1, r.h, "rgba(90,70,40,0.35)");
    fill(ctx, r.x + r.w, r.y, 2, r.h, "rgba(120,90,50,0.18)");
  }
}

/** An infinity pool: stone coping, a tiled basin, steps, a ladder, and a glass edge spilling toward the sea. */
export function pool(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  // Coping.
  fill(ctx, x - 4, y - 4, w + 8, h + 8, "#bcae92");
  fill(ctx, x - 3, y - 3, w + 6, h + 6, "#f6eedc");
  for (let i = x - 3; i < x + w + 3; i += 9) {
    fill(ctx, i, y - 3, 1, 3, "#e0d4ba");
  }
  fill(ctx, x - 3, y - 3, w + 6, 1, "#fffaf0");
  // The basin: the far wall in shade, then water from turquoise to deep.
  fill(ctx, x, y, w, h, "#2d9fba");
  fill(ctx, x, y, w, 3, "#24849e");
  for (let j = 3; j < h; j++) {
    const k = j / h;
    const c = k < 0.5 ? mixHex("#58d3dc", "#3fbfd2", k * 2) : mixHex("#3fbfd2", "#2aa6c6", (k - 0.5) * 2);
    fill(ctx, x, y + j, w, 1, c);
  }
  // Tile lines on the floor.
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = x + 6; i < x + w; i += 10) ctx.fillRect(i, y + 4, 1, h - 5);
  for (let j = y + 9; j < y + h; j += 10) ctx.fillRect(x, j, w, 1);
  // A lane line down the middle.
  ctx.fillStyle = "rgba(20,80,110,0.25)";
  ctx.fillRect(x + 8, y + Math.round(h / 2), w - 16, 2);
  // Steps in the left corner, a ladder on the right.
  for (let s = 0; s < 3; s++) fill(ctx, x, y + 3 + s * 4, 16 - s * 4, 2, "rgba(255,255,255,0.45)");
  fill(ctx, x + w - 12, y - 4, 1, 9, C.chrome);
  fill(ctx, x + w - 7, y - 4, 1, 9, C.chrome);
  fill(ctx, x + w - 12, y - 5, 6, 1, C.chromeLo);
  for (let j = y; j < y + 5; j += 2) fill(ctx, x + w - 11, j, 4, 1, C.chromeLo);
  // The infinity edge: glass, a slot and water spilling over.
  fill(ctx, x - 3, y + h, w + 6, 1, "#c6f2f6");
  fill(ctx, x - 3, y + h + 1, w + 6, 2, "#4fb6c8");
  fill(ctx, x - 3, y + h + 3, w + 6, 1, "#2a7f96");
  for (let i = x; i < x + w; i += 4) fill(ctx, i, y + h + 1, 1, 1, "#e6fbff");
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** The surf along the bottom: wet sand, the shallows, the deep blue. */
export function sea(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  fill(ctx, x, y - 3, w, 3, "#d9c08a");
  fill(ctx, x, y - 1, w, 1, "#cdb27a");
  const bands = ["#7fe0d8", "#5ccdd2", "#3fb2c8", "#2f8fbf", "#2678b0", "#1f64a0"];
  for (let j = 0; j < h; j++) fill(ctx, x, y + j, w, 1, bands[Math.min(bands.length - 1, Math.floor((j / h) * bands.length))]!);
  const rand = rng(5150);
  for (let i = 0; i < w / 6; i++) fill(ctx, x + Math.floor(rand() * w), y + 3 + Math.floor(rand() * (h - 3)), 2 + Math.floor(rand() * 3), 1, "rgba(255,255,255,0.35)");
}

/** A raised teak work deck under a pod, with the shade of two sails across it. */
export function workDeck(ctx: CanvasRenderingContext2D, pod: Rect, i: number): void {
  const r = { x: pod.x - 6, y: pod.y + 2, w: pod.w + 12, h: pod.h };
  fill(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 4, "#5c3a22");
  for (let y = r.y, n = 0; y < r.y + r.h; y += 6, n++) {
    const base = n % 2 ? "#b77a48" : "#ae7242";
    fill(ctx, r.x, y, r.w, 5, base);
    fill(ctx, r.x, y, r.w, 1, shade(base, 0.12));
    fill(ctx, r.x, y + 5, r.w, 1, "#8a5432");
    for (let x = r.x + ((n * 29 + i * 13) % 52); x < r.x + r.w; x += 52) fill(ctx, x, y, 1, 5, "#8a5432");
  }
  fill(ctx, r.x, r.y + r.h, r.w, 2, "#7a4a2a");
  fill(ctx, r.x, r.y + r.h + 2, r.w, 1, "rgba(80,50,30,0.3)");
  // Sail shade on the deck.
  ctx.fillStyle = "rgba(60,30,20,0.13)";
  ctx.beginPath();
  ctx.moveTo(r.x + 6, r.y + 4);
  ctx.lineTo(r.x + r.w - 6, r.y + 10);
  ctx.lineTo(r.x + r.w * 0.45, r.y + r.h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(60,30,20,0.08)";
  ctx.beginPath();
  ctx.moveTo(r.x + 10, r.y + r.h - 6);
  ctx.lineTo(r.x + r.w - 4, r.y + r.h - 2);
  ctx.lineTo(r.x + r.w * 0.62, r.y + 8);
  ctx.closePath();
  ctx.fill();
}

/** A striped beach towel. */
export function towel(ctx: CanvasRenderingContext2D, r: Rect, i: number): void {
  const pairs: [string, string][] = [
    [C.coral, C.sunHi],
    [C.aqua, C.white],
    [C.sun, C.coral],
    [C.sea, C.aquaHi],
    [C.hibiscus, C.white],
  ];
  const [a, b] = pairs[i % pairs.length]!;
  fill(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, "rgba(90,60,30,0.22)");
  for (let x = 0; x < r.w; x++) fill(ctx, r.x + x, r.y, 1, r.h, Math.floor(x / 4) % 2 ? b : a);
  for (let x = r.x; x < r.x + r.w; x += 2) {
    fill(ctx, x, r.y - 1, 1, 1, "#f6efe0");
    fill(ctx, x, r.y + r.h, 1, 1, "#f6efe0");
  }
}

/** The surf shack's thatched eave along the top of the games room, with its sign. */
export function shackEave(ctx: CanvasRenderingContext2D, r: Rect, sign: Rect | null): void {
  const y = r.y - 8;
  for (let x = r.x; x < r.x + r.w; x++) {
    const len = 7 + ((x * 7) % 3 === 0 ? 1 : 0);
    fill(ctx, x, y, 1, len, x % 2 ? C.thatch : C.thatchHi);
    if ((x * 5) % 4 === 0) fill(ctx, x, y + 2, 1, 2, C.thatchLo);
    fill(ctx, x, y + len - 1, 1, 1, C.thatchDk);
  }
  fill(ctx, r.x, y - 1, r.w, 1, C.thatchDk);
  if (!sign) return;
  const text = "SURF SHACK";
  const tw = pixelTextWidth(text);
  const sx = Math.round(sign.x + (sign.w - tw) / 2);
  fill(ctx, sx - 4, y - 2, tw + 8, 9, OUTLINE);
  fill(ctx, sx - 3, y - 1, tw + 6, 7, C.aqua);
  fill(ctx, sx - 3, y - 1, tw + 6, 1, C.aquaHi);
  drawPixelText(ctx, text, sx, y, C.white);
}

/** A bonfire pit: a ring of stones and logs (the flames are live). */
export function firePit(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fill(ctx, x - 9, y - 3, 19, 7, "rgba(60,40,30,0.25)");
  fill(ctx, x - 6, y - 2, 13, 5, "#5a4a40");
  for (const [dx, dy] of [[-8, 0], [-6, -3], [-2, -4], [2, -4], [6, -3], [8, 0], [6, 3], [2, 4], [-2, 4], [-6, 3]] as const) {
    fill(ctx, x + dx - 1, y + dy - 1, 3, 2, "#9a9088");
    fill(ctx, x + dx - 1, y + dy - 1, 2, 1, "#c8beb4");
  }
  fill(ctx, x - 4, y - 1, 9, 2, C.coconut);
  fill(ctx, x - 2, y - 2, 2, 4, "#5c3a22");
  fill(ctx, x + 1, y, 3, 1, "#3a2a20");
}
