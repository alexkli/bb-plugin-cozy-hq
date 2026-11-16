// Startup House: the view out of the front windows, one panorama across them.
// Across the street: stucco ranch houses with palms in front, golden hills
// behind (green in the rainy months), power lines, our beat-up hatchback in
// the driveway and the mailbox on its post. By day the sprinklers tick and a
// neighbor jogs by; at night the street lamps and the neighbors' windows
// glow. Also the front door standing open and a window slid open.

import type { OutsideInfo, PaintInfo } from "../../theme.ts";
import type { Rect } from "../../layout.ts";
import { mix } from "../../themekit.ts";
import { C, ih, OUTLINE } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

/** How far apart windows sit, for when the view doesn't know the first window. */
const STEP = 52;
/** The street repeats every this many pixels of panorama. */
const BLOCK = 176;

const HOUSES: { u: number; w: number; wall: string; roof: string; garage: boolean }[] = [
  { u: 4, w: 28, wall: "#f0dcc0", roof: "#a85a3a", garage: true },
  { u: 52, w: 24, wall: "#d8e6d0", roof: "#6a6a72", garage: false },
  { u: 96, w: 30, wall: "#f4d8d4", roof: "#8a5a3a", garage: true },
  { u: 144, w: 22, wall: "#d6e2ee", roof: "#a85a3a", garage: false },
];
const PALMS = [42, 86, 132, 170];

export function startupOutside(ctx: Ctx, win: Rect, index: number, info: OutsideInfo): void {
  const { x, y, w, h } = win;
  const t = info.t;
  const night = info.night;
  const wx = info.weather;
  const wet = wx === "rain" || wx === "storm";
  const snowy = wx === "snow";
  const foggy = wx === "fog";
  // The rainy season turns the hills green (November to April); the rest of the year they're gold.
  const month = info.date.getMonth();
  const green = month >= 10 || month <= 3;
  const dark = (c: string, k = 0.72) => mix(c, "#161a3a", night * k);
  const fill = (c: string, px: number, py: number, pw: number, ph: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(px), Math.round(py), pw, ph);
  };
  const base = y + h - 2;
  const first = info.windows?.[0];
  const u0 = first ? win.x - first.x : index * STEP;
  const span = (ua: number, ub: number) => ub >= u0 - 2 && ua <= u0 + w + 2;
  // Repeat the block across the panorama: the u of an element in each block that might be visible.
  const each = (u: number, fn: (X: number) => void) => {
    for (let k = Math.floor((u0 - u - 40) / BLOCK); k <= Math.ceil((u0 + w - u) / BLOCK); k++) {
      const uu = u + k * BLOCK;
      if (span(uu - 20, uu + 40)) fn(x + (uu - u0));
    }
  };

  const yStreet = base - 10;
  const yAcross = yStreet - 3;
  const yHouse = yAcross;

  // The hills behind, rolling, with dark oaks dotted on them.
  const hill = dark(snowy ? "#e6ecf2" : green ? "#8fb86a" : "#d8b46a", 0.8);
  const hillLo = dark(snowy ? "#cdd6e0" : green ? "#78a456" : "#c49a52", 0.8);
  const fogK = foggy ? 0.55 : wx === "cloudy" || wet ? 0.18 : 0;
  for (let lx = 0; lx < w; lx++) {
    const u = u0 + lx;
    const top = Math.round(yHouse - 12 - 4 * Math.sin(u * 0.045) - 2 * Math.sin(u * 0.13 + 1));
    fill(mix(hill, info.sky.bottom, fogK), x + lx, top, 1, yHouse - top + 2);
    if ((u * 7) % 11 === 0) fill(mix(hillLo, info.sky.bottom, fogK), x + lx, top + 2, 1, 2);
    if (ih(Math.floor(u / 9), 1) % 5 === 0 && u % 9 === 4) {
      fill(mix(dark("#4a6a3a", 0.8), info.sky.bottom, fogK), x + lx - 1, top + 3, 3, 2);
    }
  }

  // Power lines, sagging from pole to pole.
  for (let lx = 0; lx < w; lx++) {
    const u = u0 + lx;
    const k = (((u % 88) + 88) % 88) / 88;
    const sag = Math.round(Math.sin(k * Math.PI) * 2);
    fill(mix(dark("#3a3440", 0.3), info.sky.bottom, 0.35), x + lx, y + 8 + sag, 1, 1);
  }
  for (const pu of [20, 108]) {
    each(pu, (X) => {
      fill(dark("#7a5a3a", 0.5), X, y + 5, 1, yAcross - y - 4);
      fill(dark("#5a4030", 0.5), X - 2, y + 6, 5, 1);
    });
  }

  // The houses across the street: low stucco ranches with hip roofs.
  for (const hs of HOUSES) {
    each(hs.u, (X) => {
      const top = yHouse - 5;
      const wall = dark(snowy ? "#f4f4f4" : hs.wall);
      const roof = dark(snowy ? "#f8fbff" : hs.roof);
      fill(roof, X - 1, top - 1, hs.w + 2, 2);
      fill(roof, X + 1, top - 2, hs.w - 2, 1);
      fill(roof, X + 3, top - 3, hs.w - 6, 1);
      fill(dark(snowy ? "#dfe8f2" : mix(hs.roof, "#000000", 0.25)), X - 1, top + 1, hs.w + 2, 1);
      fill(wall, X, top + 2, hs.w, yHouse - top - 2);
      if (hs.garage) fill(dark("#f4f2ea"), X + 2, top + 2, 9, yHouse - top - 2);
      const wx0 = X + (hs.garage ? 14 : 3);
      for (let i = 0; wx0 + i * 6 + 3 <= X + hs.w - 1; i++) {
        const lit = night > 0.45 && ih(hs.u * 7 + i, Math.floor(t / 40)) % 3 !== 0;
        fill(lit ? "#ffd98a" : dark("#7aa0c0"), wx0 + i * 6, top + 3, 3, 1);
      }
    });
  }

  // The near side of the street: their lawns and the curb, then the asphalt.
  fill(dark(snowy ? "#eef4fa" : wet ? "#6fa45a" : C.grass), x, yAcross, w, 3);
  fill(dark("#d8d4cc"), x, yStreet - 1, w, 1);
  fill(dark(wet ? "#4e5260" : "#6a6e78"), x, yStreet, w, 5);
  for (let lx = 0; lx < w; lx++) if ((u0 + lx) % 10 < 4) fill(dark("#e8d48a", 0.8), x + lx, yStreet + 2, 1, 1);
  if (wet) for (let lx = 2; lx < w; lx += 9) fill("rgba(200,220,255,0.25)", x + lx + ((t * 4) % 3), yStreet + 1 + (lx % 3), 3, 1);
  // Our side: the sidewalk and our patchy front lawn.
  fill(dark("#d8d4cc"), x, yStreet + 5, w, 2);
  fill(dark(snowy ? "#e6eef6" : wet ? "#7aa852" : "#a8b860"), x, yStreet + 7, w, base - (yStreet + 7) + 3);
  for (let lx = 0; lx < w; lx += 3) if (ih(u0 + lx, 2) % 4 === 0) fill(dark("#c8b870"), x + lx, yStreet + 8 + (lx % 2), 2, 1);

  // Palms on the far side, tall against the sky.
  for (const pu of PALMS) {
    each(pu, (X) => {
      const bot = yAcross + 1;
      const tip = y + 6 + (pu % 3);
      for (let yy = tip + 2; yy < bot; yy++) fill(dark("#8a6a4a", 0.6), X + (yy < tip + 8 ? 1 : 0), yy, 1, 1);
      const sway = Math.round(Math.sin(t * 0.8 + pu) * (wx === "storm" ? 2 : 0.6));
      const leaf = dark(C.palm, 0.75);
      fill(leaf, X - 3 + sway, tip, 9, 1);
      fill(leaf, X - 4 + sway, tip + 1, 2, 2);
      fill(leaf, X + 4 + sway, tip + 1, 2, 2);
      fill(dark(C.palmHi, 0.75), X - 1 + sway, tip - 1, 4, 1);
      fill(leaf, X + sway, tip + 2, 2, 1);
    });
  }

  // Street lamps; they come on at dusk.
  const lampsOn = night > 0.35 || wx === "storm" || foggy;
  each(64, (X) => {
    fill(dark("#5a5e68", 0.4), X, yStreet - 14, 1, 14);
    fill(dark("#5a5e68", 0.4), X, yStreet - 14, 3, 1);
    fill(lampsOn ? "#fff1b8" : dark("#d5dbe2"), X + 2, yStreet - 13, 2, 1);
    if (lampsOn) {
      const g = ctx.createRadialGradient(X + 3, yStreet - 12, 0, X + 3, yStreet - 12, 11);
      g.addColorStop(0, "rgba(255,226,150,0.5)");
      g.addColorStop(1, "rgba(255,226,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(X - 8, yStreet - 23, 22, 30);
      fill("rgba(255,226,150,0.3)", X - 2, yStreet + 1, 9, 2);
    }
  });

  // Our mailbox on its post, flag up when there's mail.
  each(118, (X) => {
    fill(dark("#6a4a30", 0.5), X + 2, base - 6, 1, 6);
    fill(OUTLINE, X, base - 9, 6, 4);
    fill(dark("#3a5aa0"), X + 1, base - 8, 4, 2);
    if (Math.floor(t / 90) % 2 === 0) fill(dark("#e5544b"), X + 5, base - 10, 1, 3);
  });

  // Our beat-up hatchback in the driveway: faded red, one blue door, a dent, a surf rack.
  each(140, (X) => {
    const cy = base - 3;
    fill(dark("#bfb8ac"), X - 3, cy + 3, 24, 4);
    fill(OUTLINE, X - 1, cy - 4, 20, 9);
    fill(dark("#c4685a"), X, cy - 3, 18, 6);
    fill(dark("#d88878"), X, cy - 3, 18, 1);
    fill(dark("#4a7ac0"), X + 7, cy - 1, 5, 4);
    fill(dark("#9ac8e8"), X + 3, cy - 3, 4, 2);
    fill(dark("#9ac8e8"), X + 8, cy - 3, 4, 2);
    fill(dark("#a85a4a"), X + 14, cy, 2, 1);
    fill(OUTLINE, X + 2, cy + 3, 3, 2);
    fill(OUTLINE, X + 13, cy + 3, 3, 2);
    fill(dark("#e8d4a8"), X + 2, cy - 5, 14, 1);
  });

  // Sprinklers on the lawns across the street, early in the morning.
  const sprinkling = info.hour >= 6.5 && info.hour < 9 && !wet && !snowy;
  if (sprinkling) {
    each(30, (X) => {
      for (let i = 0; i < 6; i++) {
        const a = (t * 2 + i) % 3;
        fill("rgba(220,240,255,0.7)", X + Math.round(Math.sin(t * 1.5 + i) * (2 + a)), yAcross - Math.round(a), 1, 1);
      }
    });
  }

  // Someone goes by now and then: a jogger by day, a car with its lights on at night.
  const day = night < 0.4 && !wet && !snowy;
  const period = 70;
  const k = (t % period) / period;
  const total = (info.windows?.length ?? 3) * STEP + 80;
  if (day) {
    const pu = -20 + k * total;
    if (span(pu - 4, pu + 4)) {
      const X = x + (pu - u0);
      const step = Math.floor(t * 6) % 2;
      fill(dark("#ff5fa2"), X, yStreet + 3, 2, 2);
      fill(dark("#f1c7a4"), X, yStreet + 1, 2, 2);
      fill(dark("#2e2c36"), X + step, yStreet + 5, 1, 1);
      fill(dark("#2e2c36"), X + 1 - step, yStreet + 5, 1, 1);
    }
  }
  const cu = total - ((t + 23) % 40) / 40 * (total + 60);
  if (span(cu - 2, cu + 14)) {
    const X = x + (cu - u0);
    const body = ih(Math.floor((t + 23) / 40), 3) % 2 ? "#e8e4da" : "#4a6a8a";
    fill(OUTLINE, X - 1, yStreet - 1, 14, 5);
    fill(dark(body), X, yStreet, 12, 3);
    fill(dark("#9ac8e8"), X + 3, yStreet, 5, 1);
    if (night > 0.35) {
      fill("#fff1b8", X - 1, yStreet + 1, 1, 1);
      fill("rgba(255,240,180,0.3)", X - 8, yStreet, 7, 3);
    }
  }
}

/** The front door standing open: daylight (or the porch light), the porch, a glimpse of the street. */
export function startupDoorOpen(ctx: Ctx, d: Rect, info: PaintInfo): boolean {
  const night = info.night;
  const fill = (c: string, px: number, py: number, pw: number, ph: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(px), Math.round(py), pw, ph);
  };
  const sky = night > 0.5 ? "#1c2048" : "#bfe2f4";
  fill(OUTLINE, d.x, d.y + 1, d.w, d.h - 1);
  fill(sky, d.x + 1, d.y + 2, d.w - 2, d.h - 14);
  // The street out front, the porch boards.
  fill(night > 0.5 ? "#2a3a2a" : "#8ab860", d.x + 1, d.y + d.h - 16, d.w - 2, 4);
  fill(night > 0.5 ? "#5a4a3a" : "#c8a878", d.x + 1, d.y + d.h - 12, d.w - 2, 11);
  for (let yy = d.y + d.h - 10; yy < d.y + d.h - 1; yy += 3) fill(night > 0.5 ? "#4a3a2e" : "#b08a5a", d.x + 1, yy, d.w - 2, 1);
  if (night > 0.5) fill("rgba(255,220,140,0.35)", d.x + 1, d.y + 2, d.w - 2, d.h - 3);
  // The door swung in against the wall.
  fill(OUTLINE, d.x - 4, d.y + 1, 5, d.h - 1);
  fill("#3f8f8a", d.x - 3, d.y + 2, 3, d.h - 3);
  fill("#c9a440", d.x - 2, d.y + 22, 1, 2);
  return true;
}

/** A window slid open: the pane pushed aside and a warm breeze (or a gust of rain) through it. */
export function startupOpenWindow(ctx: Ctx, win: Rect, k: number, info: PaintInfo): boolean {
  const slide = Math.round((win.w / 2 - 4) * Math.min(1, k * 1.4));
  ctx.fillStyle = "rgba(220,232,240,0.55)";
  ctx.fillRect(win.x + 4 + slide, win.y + 3, Math.max(0, win.w / 2 - 4 - slide), win.h - 5);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(win.x + win.w / 2 + slide - 1, win.y + 3, 1, win.h - 5);
  const wet = info.weather === "rain" || info.weather === "storm";
  for (let j = 0; j < 4; j++) {
    const p = (info.t * 0.7 + j / 4) % 1;
    const wx = win.x + 6 + j * 9 + Math.round(Math.sin(info.t * 3 + j) * 2);
    const wy = win.y + win.h + 2 + Math.round(p * 22);
    ctx.globalAlpha = (1 - p) * k;
    ctx.fillStyle = wet ? "#bcd6f0" : "#ffffff";
    ctx.fillRect(wx, wy, wet ? 1 : 4, wet ? 3 : 1);
    if (!wet) ctx.fillRect(wx + 3, wy + 1, 3, 1);
  }
  ctx.globalAlpha = 1;
  return true;
}
