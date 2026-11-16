// Coffee Shop: the street out the shop windows. Under the scalloped edge of
// the café's own awning: the row of shops across the street (a bakery with a
// striped awning, a bookshop, a flower stall, flats above), the street with
// cars, a bus and bikes going by, and our sidewalk with passersby (umbrellas
// in the rain, hats in the snow, a dog walker, a courier on a cargo bike).
// Rain runs down the glass. At night the flats light up, a street lamp
// glows and headlights sweep by. The door opens onto the sidewalk with its
// brass bell swinging.

import type { Rect } from "../../layout.ts";
import type { OutsideInfo, PaintInfo } from "../../theme.ts";
import { makeCanvas } from "../../themekit.ts";
import { C, h2, memo, OUTLINE, rect } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

/** The shops across the street, from global x (so the view runs on across windows). */
const FACADES = ["#c9a27a", "#9fb6a4", "#d9c3a0", "#b97e66", "#a8a4b8", "#d6b46a", "#8fa7b8", "#c48a7a"];

/** The far side of the street for a window: facades, shopfronts and the far sidewalk (baked per window). */
function farSide(win: Rect, horizon: number): HTMLCanvasElement {
  return memo(`far|${win.x}|${win.w}|${win.h}|${horizon}`, () =>
    makeCanvas(win.w, horizon, (ctx) => {
      let x = -((win.x * 3) % 37) - 4;
      let i = Math.floor((win.x * 3) / 37);
      while (x < win.w) {
        const bw = 22 + Math.floor(h2(i, 1) * 18);
        const top = 4 + Math.floor(h2(i, 2) * 10);
        const col = FACADES[Math.abs(i) % FACADES.length]!;
        rect(ctx, x, top, bw, horizon - top, col);
        rect(ctx, x, top, bw, 1, "#ffffff22");
        rect(ctx, x + bw - 1, top, 1, horizon - top, "#00000022");
        // Cornice and the flats' windows.
        rect(ctx, x, top, bw, 2, "#00000030");
        for (let wy = top + 4; wy < horizon - 12; wy += 7) {
          for (let wx = x + 3; wx + 3 < x + bw - 2; wx += 6) {
            rect(ctx, wx, wy, 3, 4, "#4a5a6a");
            rect(ctx, wx, wy, 3, 1, "#7f93a6");
          }
        }
        // A shopfront at street level, sometimes with a striped awning.
        const sh = 9;
        rect(ctx, x + 2, horizon - sh, bw - 4, sh, "#3a3540");
        rect(ctx, x + 3, horizon - sh + 1, bw - 6, sh - 3, "#8fb3c4");
        if (h2(i, 3) < 0.6) {
          const ac = [C.rust, C.green, C.mustard, "#3e7cc4"][Math.abs(i) % 4]!;
          for (let ax = x + 1; ax < x + bw - 1; ax++) rect(ctx, ax, horizon - sh - 3, 1, 3, Math.floor((ax - x) / 3) % 2 ? ac : C.cream);
        }
        x += bw;
        i++;
      }
      // The far sidewalk's curb.
      rect(ctx, 0, horizon - 2, win.w, 2, C.pavementLo);
    }),
  );
}

/** Lit windows across the street at night (drawn after the darkness, so they glow). */
function farLights(win: Rect, horizon: number): HTMLCanvasElement {
  return memo(`farlit|${win.x}|${win.w}|${win.h}|${horizon}`, () =>
    makeCanvas(win.w, horizon, (ctx) => {
      let x = -((win.x * 3) % 37) - 4;
      let i = Math.floor((win.x * 3) / 37);
      while (x < win.w) {
        const bw = 22 + Math.floor(h2(i, 1) * 18);
        const top = 4 + Math.floor(h2(i, 2) * 10);
        let n = 0;
        for (let wy = top + 4; wy < horizon - 12; wy += 7) {
          for (let wx = x + 3; wx + 3 < x + bw - 2; wx += 6) {
            if (h2(i * 31 + n++, 5) < 0.45) rect(ctx, wx, wy, 3, 4, h2(n, i) < 0.3 ? "#bfe0ff" : "#ffd98a");
          }
        }
        rect(ctx, x + 3, horizon - 8, bw - 6, 6, "#ffe0a0aa");
        x += bw;
        i++;
      }
    }),
  );
}

interface Walker {
  speed: number;
  phase: number;
  color: string;
  kind: "walk" | "dog" | "bike" | "cargo" | "stroller";
}

const WALKERS: Walker[] = [
  { speed: 9, phase: 0, color: "#c4673f", kind: "walk" },
  { speed: -7, phase: 140, color: "#3e7cc4", kind: "walk" },
  { speed: 11, phase: 300, color: C.mustard, kind: "dog" },
  { speed: -26, phase: 60, color: C.green, kind: "bike" },
  { speed: 8, phase: 520, color: "#8a5fd6", kind: "stroller" },
  { speed: -10, phase: 410, color: "#e5544b", kind: "walk" },
  { speed: 22, phase: 230, color: C.rust, kind: "cargo" },
];

function drawPerson(ctx: Ctx, x: number, y: number, color: string, t: number, dir: number, info: PaintInfo, seed: number): void {
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

/** The near sidewalk: passersby at feet `y`, across all windows from global x. */
function drawPassersby(ctx: Ctx, win: Rect, y: number, info: OutsideInfo): void {
  const x0 = Math.min(...info.windows.map((w) => w.x)) - 30;
  const x1 = Math.max(...info.windows.map((w) => w.x + w.w)) + 30;
  const span = x1 - x0;
  for (const [i, w] of WALKERS.entries()) {
    if (info.night > 0.6 && i % 2 === 1) continue;
    const gx = x0 + ((((w.phase + w.speed * info.t) % span) + span) % span);
    const x = Math.round(gx - win.x);
    if (x < -12 || x > win.w + 12) continue;
    const dir = Math.sign(w.speed);
    switch (w.kind) {
      case "walk":
        drawPerson(ctx, x, y, w.color, info.t, dir, info, i);
        break;
      case "stroller":
        drawPerson(ctx, x, y, w.color, info.t, dir, info, i);
        rect(ctx, x + dir * 5 - 1, y - 5, 5, 3, "#3a3540");
        rect(ctx, x + dir * 5, y - 2, 1, 2, OUTLINE);
        rect(ctx, x + dir * 5 + 2, y - 2, 1, 2, OUTLINE);
        break;
      case "dog":
        drawPerson(ctx, x, y, w.color, info.t, dir, info, i);
        rect(ctx, x + dir * 7, y - 3, 5, 2, "#9a6340");
        rect(ctx, x + dir * 7 + (dir > 0 ? 4 : -1), y - 4, 2, 2, "#9a6340");
        rect(ctx, x + dir * 7, y - 1, 1, 1, "#6e4630");
        rect(ctx, x + dir * 7 + 3, y - 1, 1, 1, "#6e4630");
        rect(ctx, x + (dir > 0 ? 3 : -2), y - 5, dir * 4 + (dir > 0 ? 0 : 0), 1, "#2a1e2e55");
        break;
      case "bike":
      case "cargo": {
        // Wheels, frame, rider; the cargo bike carries a box.
        const by = y - 1;
        rect(ctx, x - 4, by - 2, 3, 3, OUTLINE);
        rect(ctx, x + 4, by - 2, 3, 3, OUTLINE);
        rect(ctx, x - 3, by - 1, 1, 1, "#9aa3ad");
        rect(ctx, x + 5, by - 1, 1, 1, "#9aa3ad");
        rect(ctx, x - 2, by - 3, 8, 1, w.color);
        rect(ctx, x, by - 9, 3, 3, "#c98a5e");
        rect(ctx, x - 1, by - 6, 4, 3, w.kind === "cargo" ? C.mustard : "#3a3d46");
        if (w.kind === "cargo") rect(ctx, x + (dir > 0 ? 4 : -6), by - 6, 5, 4, C.kraft);
        break;
      }
    }
  }
}

interface Car {
  speed: number;
  phase: number;
  color: string;
  len: number;
}

const CARS: Car[] = [
  { speed: 46, phase: 0, color: "#e5544b", len: 16 },
  { speed: -38, phase: 200, color: "#3e7cc4", len: 14 },
  { speed: 30, phase: 500, color: C.mustard, len: 30 },
  { speed: -52, phase: 640, color: "#e8e2d8", len: 15 },
];

function drawTraffic(ctx: Ctx, win: Rect, y: number, info: OutsideInfo): void {
  const x0 = Math.min(...info.windows.map((w) => w.x)) - 60;
  const x1 = Math.max(...info.windows.map((w) => w.x + w.w)) + 60;
  const span = x1 - x0 + 400;
  for (const [i, c] of CARS.entries()) {
    const gx = x0 + ((((c.phase + c.speed * info.t) % span) + span) % span) - 200;
    const x = Math.round(gx - win.x);
    if (x < -c.len - 4 || x > win.w + 4) continue;
    const ly = y + (c.speed > 0 ? 3 : 0);
    const bus = c.len > 20;
    const h = bus ? 9 : 6;
    rect(ctx, x, ly - h, c.len, h, OUTLINE);
    rect(ctx, x + 1, ly - h + 1, c.len - 2, h - 2, c.color);
    if (bus) for (let wx = x + 3; wx < x + c.len - 4; wx += 5) rect(ctx, wx, ly - h + 2, 3, 3, "#bfe0ee");
    else rect(ctx, x + 4, ly - h + 1, c.len - 8, 2, "#bfe0ee");
    rect(ctx, x + 2, ly - 1, 3, 2, OUTLINE);
    rect(ctx, x + c.len - 5, ly - 1, 3, 2, OUTLINE);
    if (info.night > 0.3) {
      const front = c.speed > 0 ? x + c.len : x - 1;
      rect(ctx, front, ly - 4, 1, 2, "#fff2b0");
      ctx.fillStyle = `rgba(255,240,180,${0.25 * info.night})`;
      ctx.fillRect(c.speed > 0 ? front + 1 : front - 12, ly - 5, 12, 4);
      rect(ctx, c.speed > 0 ? x - 1 : x + c.len, ly - 4, 1, 2, "#ff4a3a");
    }
    void i;
  }
}

export function cafeOutside(ctx: Ctx, win: Rect, _index: number, info: OutsideInfo): void {
  const horizon = Math.round(win.h * 0.56);
  const top = win.y;
  // Across the street.
  ctx.drawImage(farSide(win, horizon), win.x, top);
  if (info.night > 0.35) {
    ctx.globalAlpha = Math.min(1, (info.night - 0.35) * 2);
    ctx.drawImage(farLights(win, horizon), win.x, top);
    ctx.globalAlpha = 1;
  }
  // The street.
  const sy = top + horizon;
  const road = Math.round(win.h * 0.2);
  rect(ctx, win.x, sy, win.w, road, info.weather === "rain" || info.weather === "storm" ? "#3e4049" : C.asphalt);
  for (let x = win.x + ((-Math.floor(win.x / 2)) % 10 + 10) % 10; x < win.x + win.w; x += 10) rect(ctx, x, sy + Math.floor(road / 2), 5, 1, "#d8d2b8");
  if (info.weather === "snow") rect(ctx, win.x, sy, win.w, 2, "#f5f9fd");
  ctx.save();
  ctx.beginPath();
  ctx.rect(win.x, top, win.w, win.h);
  ctx.clip();
  ctx.translate(win.x, 0);
  drawTraffic(ctx, { ...win, x: win.x }, sy + road - 2, info);
  ctx.restore();
  // Our sidewalk, the curb, a street tree and lamp at the café's corner.
  const py = sy + road;
  rect(ctx, win.x, py, win.w, win.y + win.h - py, info.weather === "snow" ? "#e6edf3" : C.pavement);
  rect(ctx, win.x, py, win.w, 1, C.curb);
  for (let x = win.x + (8 - (win.x % 8)); x < win.x + win.w; x += 8) rect(ctx, x, py + 2, 1, win.y + win.h - py - 2, C.pavementLo);
  ctx.save();
  ctx.beginPath();
  ctx.rect(win.x, top, win.w, win.h);
  ctx.clip();
  ctx.translate(win.x, 0);
  drawPassersby(ctx, { ...win }, win.y + win.h - 2, info);
  ctx.restore();
  // The awning's scalloped edge across the top of the glass.
  for (let x = win.x; x < win.x + win.w; x++) {
    const k = (x - win.x + (win.x % 8)) % 8;
    const stripe = Math.floor((x + 400) / 4) % 2 ? C.awning : C.awningStripe;
    rect(ctx, x, top, 1, 3 + (k === 3 || k === 4 ? 2 : k === 2 || k === 5 ? 1 : 0), stripe);
  }
  // Rain on the glass.
  if (info.weather === "rain" || info.weather === "storm") {
    ctx.fillStyle = "rgba(220,235,245,0.55)";
    for (let i = 0; i < Math.ceil(win.w / 6); i++) {
      const dx = (i * 37 + win.x * 7) % win.w;
      const p = ((info.t * (0.25 + h2(i, 9) * 0.4) + h2(i, 4)) % 1) * win.h;
      ctx.fillRect(win.x + dx, Math.round(top + p), 1, 3);
      ctx.fillRect(win.x + dx, Math.round(top + p) - 3, 1, 1);
    }
  }
  if (info.weather === "fog") {
    ctx.fillStyle = "rgba(225,228,232,0.45)";
    ctx.fillRect(win.x, top, win.w, win.h);
  }
  // Steam on the glass's lower corners in the cold.
  if (info.weather === "snow" || info.date.getMonth() === 11 || info.date.getMonth() <= 1) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(win.x, win.y + win.h - 6, win.w, 6);
  }
}

/** The shop door open: the sidewalk outside, the door swung in, the bell on its spring. */
export function cafeDoorOpen(ctx: Ctx, door: Rect, info: PaintInfo): boolean {
  const { x, y, w, h } = door;
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
