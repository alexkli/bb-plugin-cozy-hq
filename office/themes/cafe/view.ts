// Coffee Shop: the views. Out the back windows upstairs, the town's rooftops
// (tiles, zinc, chimney pots, dormers lit at night, a pigeon on the ridge),
// rain running down the glass. The front door opens with its brass bell
// swinging; a window's top light tips open for a breeze.

import type { Rect } from "../../layout.ts";
import type { OutsideInfo, PaintInfo } from "../../theme.ts";
import { makeCanvas } from "../../themekit.ts";
import { C, h2, memo, OUTLINE, rect } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

/** A passerby (feet at x, y): umbrella in the rain, a hat in the snow, a coffee to go now and then. */
export function drawPerson(ctx: Ctx, x: number, y: number, color: string, t: number, dir: number, info: PaintInfo, seed: number): void {
  const step = Math.floor(t * 6 + seed) % 2;
  rect(ctx, x, y - 9, 3, 3, "#e7b08a");
  rect(ctx, x, y - 10, 3, 1, seed % 2 ? "#2b1d16" : "#9a5f34");
  rect(ctx, x - 1, y - 6, 5, 4, color);
  rect(ctx, x + (step ? 0 : 1), y - 2, 1, 2, "#2a2f40");
  rect(ctx, x + (step ? 2 : 1), y - 2, 1, 2, "#2a2f40");
  if (info.weather === "rain" || info.weather === "storm") {
    // An umbrella.
    const uc = ["#e5544b", "#3e7cc4", C.mustard, C.green][seed % 4]!;
    rect(ctx, x - 3, y - 14, 9, 2, uc);
    rect(ctx, x - 2, y - 15, 7, 1, uc);
    rect(ctx, x + 1, y - 12, 1, 3, OUTLINE);
  } else if (info.weather === "snow") rect(ctx, x, y - 11, 3, 2, seed % 2 ? "#e5544b" : C.cream);
  else if (seed % 3 === 0 && dir > 0) rect(ctx, x + 3, y - 5, 2, 3, C.kraft);
}

/** Rooftops over the town from the back windows upstairs: tiles, zinc, chimney pots, dormers (baked per window). */
function roofs(win: Rect, night: boolean): HTMLCanvasElement {
  return memo(`roofs|${win.x}|${win.w}|${win.h}|${night ? 1 : 0}`, () =>
    makeCanvas(win.w, win.h, (ctx) => {
      const tiles = ["#b8603e", "#a4583c", "#8f9aa4", "#c06c48", "#7e8a96"];
      // Far roofs: a jagged band.
      for (let x = 0; x < win.w; x++) {
        const gx = win.x + x;
        const top = Math.round(win.h * 0.5 + Math.sin(gx * 0.13) * 2 + (h2(Math.floor(gx / 9), 3) < 0.4 ? -4 : 0));
        rect(ctx, x, top, 1, win.h - top, night ? "#3a3448" : "#9a8a8a");
      }
      // Nearer roofs, each a slope of tiles with a chimney or a dormer.
      let x = -((win.x * 5) % 31);
      let i = Math.floor((win.x * 5) / 31);
      while (x < win.w) {
        const bw = 20 + Math.floor(h2(i, 4) * 16);
        const top = Math.round(win.h * 0.62 + h2(i, 5) * win.h * 0.12);
        const col = tiles[Math.abs(i) % tiles.length]!;
        for (let yy = top; yy < win.h; yy++) {
          const inset = Math.max(0, Math.round((top + 6 - yy) * 1.2));
          rect(ctx, x + inset, yy, bw - inset * 2, 1, (yy - top) % 3 === 0 ? "#00000033" : col);
          if (night) rect(ctx, x + inset, yy, bw - inset * 2, 1, "#14102866");
        }
        rect(ctx, x + 2, top, bw - 4, 1, "#ffffff33");
        if (h2(i, 6) < 0.6) {
          const cx = x + 4 + Math.floor(h2(i, 7) * (bw - 10));
          rect(ctx, cx, top - 7, 4, 8, night ? "#4a3a3a" : "#8a4a3a");
          rect(ctx, cx - 1, top - 8, 6, 2, night ? "#3a2e2e" : "#6e3a2e");
        } else {
          const dx = x + Math.floor(bw / 2) - 3;
          rect(ctx, dx, top + 3, 7, 6, night ? "#4a4458" : "#e8e2d8");
          rect(ctx, dx + 2, top + 5, 3, 4, night ? "#ffd98a" : "#5a6a7a");
        }
        x += bw;
        i++;
      }
    }),
  );
}

export function cafeOutside(ctx: Ctx, win: Rect, _index: number, info: OutsideInfo): void {
  ctx.drawImage(roofs(win, info.night > 0.5), win.x, win.y);
  // A pigeon on the near ridge now and then.
  const k = (info.t * 0.07 + win.x * 0.01) % 1;
  if (k < 0.4 && info.night < 0.5) {
    const px = win.x + 6 + Math.floor(h2(Math.floor(info.t * 0.07), win.x) * (win.w - 12));
    const py = win.y + Math.round(win.h * 0.62) - 3;
    rect(ctx, px, py, 3, 2, "#7a7e8a");
    rect(ctx, px + (Math.floor(info.t * 2) % 2 ? 2 : 0), py - 1, 1, 1, "#5a5e6a");
  }
  // Rain on the glass.
  if (info.weather === "rain" || info.weather === "storm") {
    ctx.fillStyle = "rgba(220,235,245,0.55)";
    for (let i = 0; i < Math.ceil(win.w / 6); i++) {
      const dx = (i * 37 + win.x * 7) % win.w;
      const p = ((info.t * (0.25 + h2(i, 9) * 0.4) + h2(i, 4)) % 1) * win.h;
      ctx.fillRect(win.x + dx, Math.round(win.y + p), 1, 3);
      ctx.fillRect(win.x + dx, Math.round(win.y + p) - 3, 1, 1);
    }
  }
  if (info.weather === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(win.x, win.y + Math.round(win.h * 0.62), win.w, 1);
  }
  if (info.weather === "fog") {
    ctx.fillStyle = "rgba(225,228,232,0.45)";
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
}

/** The shop door open: the sidewalk outside, the door swung in, the bell on its spring. */
export function cafeDoorOpen(ctx: Ctx, door: Rect, info: PaintInfo): boolean {
  const { x, y, w, h } = door;
  if (h < 40) {
    // The front door from outside: swung in, the warm café beyond, the bell jingling.
    rect(ctx, x, y, w, h, OUTLINE);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, "#8a5a34");
    rect(ctx, x + 1, y + 1, w - 2, 6, "#c8925a");
    rect(ctx, x + 3, y + h - 9, w - 6, 8, C.oak);
    rect(ctx, x, y, 4, h, C.green);
    rect(ctx, x + 1, y + 3, 2, h - 8, "#9cc3d2");
    const sw = Math.round(Math.sin(info.t * 18) * 2);
    rect(ctx, x + w + sw, y - 2, 3, 3, OUTLINE);
    rect(ctx, x + w + sw, y - 2, 2, 2, C.brassHi);
    return true;
  }
  // Outside: a slice of sidewalk and the street, lit by day or the lamps at night.
  const day = 1 - info.night;
  rect(ctx, x, y, w, h, OUTLINE);
  rect(ctx, x + 1, y + 1, w - 2, Math.round(h * 0.5), day > 0.5 ? "#a9cfe0" : "#2a3450");
  rect(ctx, x + 1, y + Math.round(h * 0.5), w - 2, 6, C.asphalt);
  rect(ctx, x + 1, y + Math.round(h * 0.5) + 6, w - 2, h - Math.round(h * 0.5) - 7, C.pavement);
  rect(ctx, x + 1, y + h - 4, w - 2, 3, C.pavementLo);
  // The door, swung in and to the right, showing its edge.
  rect(ctx, x + w - 4, y - 1, 7, h + 1, OUTLINE);
  rect(ctx, x + w - 3, y, 5, h - 1, C.green);
  rect(ctx, x + w - 2, y + 4, 2, h - 12, "#9cc3d2");
  // The bell swinging.
  const sw = Math.round(Math.sin(info.t * 18) * 2);
  rect(ctx, x + w + sw, y - 3, 3, 3, OUTLINE);
  rect(ctx, x + w + sw, y - 3, 2, 2, C.brassHi);
  return true;
}

/** A shop window's top light tipped open: a breeze, a leaf or two (snowflakes in winter) drifting in. */
export function cafeOpenWindow(ctx: Ctx, win: Rect, k: number, info: PaintInfo): boolean {
  const tr = Math.min(9, Math.floor(win.h / 4));
  const open = Math.round(k * 5);
  rect(ctx, win.x + 4, win.y + 3, win.w - 8, tr - 2, "#d6ecf4");
  rect(ctx, win.x + 4, win.y + tr - open, win.w - 8, 2, C.green);
  rect(ctx, win.x + 4, win.y + tr - open + 2, win.w - 8, 1, C.greenHi);
  const leaf = info.weather === "snow" ? "#ffffff" : info.date.getMonth() >= 8 && info.date.getMonth() <= 10 ? C.rust : C.leafHi;
  for (let i = 0; i < 3; i++) {
    const p = (info.t * 0.5 + i / 3) % 1;
    const lx = win.x + 8 + ((i * 17) % Math.max(1, win.w - 16)) + Math.sin(info.t * 3 + i) * 3;
    const ly = win.y + tr + p * (win.h + 30) * k;
    rect(ctx, Math.round(lx), Math.round(ly), 2, 1, leaf);
  }
  return true;
}
