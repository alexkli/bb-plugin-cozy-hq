// School scenery: the view out of the windows. A playground with swings, a
// slide and a big tree, the school bus by the crosswalk and kids at recess
// by day; a quiet schoolyard under a street lamp at night.
import { hash, mix } from "../../themekit.ts";
import type { OutsideInfo } from "../../theme.ts";
import type { Rect } from "../../layout.ts";

const KID_SHIRTS = ["#e5544b", "#4a8fd9", "#f7c948", "#5cb860", "#9b72cf", "#f39a3d", "#f08fb3"];
const KID_SKIN = ["#f1c7a4", "#d9a07a", "#a8714a", "#7a4e30", "#f6d2b4"];

/** Panorama x: windows sit 52 px apart, so the view runs on across them. */
const STEP = 52;

export function paintOutside(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void {
  const { x, y, w, h } = win;
  const t = info.t;
  const night = info.night;
  const wx = info.weather;
  const wet = wx === "rain" || wx === "drizzle" || wx === "storm";
  const snowy = wx === "snow";
  const month = info.date.getMonth();
  const dark = (c: string, k = 0.7) => mix(c, "#141a38", night * k);
  const fill = (c: string, px: number, py: number, pw: number, ph: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(px), Math.round(py), pw, ph);
  };
  const base = y + h - 2; // bottom of the glass
  const ground = base - Math.round(h * 0.34);
  // Where this window sits in the view (the view runs on across them).
  const first = info.windows?.[0];
  const u0 = first ? win.x - first.x : index * STEP;
  const X = (u: number) => x + (u - u0);
  const visible = (ua: number, ub: number) => ub >= u0 - 2 && ua <= u0 + w + 2;

  // Far trees and rooftops along the horizon.
  const far = dark(mix("#6fae6a", info.sky.bottom, 0.35), 0.8);
  for (let lx = 0; lx < w; lx++) {
    const u = u0 + lx;
    const bump = 2 + (hash(`tree${Math.floor(u / 6)}`) % 4);
    const k = Math.abs(((u % 6) - 2.5) / 3);
    fill(far, x + lx, ground - Math.round(bump * (1 - k * k)) - 1, 1, Math.round(bump * (1 - k * k)) + 1);
  }
  for (const hu of [36, 120, 168]) {
    if (!visible(hu, hu + 8)) continue;
    const hx = X(hu);
    fill(dark("#e8d9c0"), hx, ground - 5, 7, 5);
    fill(dark("#c4574d"), hx - 1, ground - 6, 9, 1);
    fill(dark("#c4574d"), hx + 1, ground - 7, 5, 1);
    if (night > 0.4) {
      fill(hash(`lit${hu}`) % 2 ? "#ffd98a" : "#ffe9b0", hx + 2, ground - 3, 1, 1);
      fill("#ffd98a", hx + 5, ground - 3, 1, 1);
    } else fill(dark("#9fc8e8"), hx + 2, ground - 3, 1, 1);
  }

  // Ground: grass (or snow), the road with the crosswalk.
  const grass = snowy ? dark("#eef4fa", 0.6) : wet ? dark("#6fa45a") : dark("#86c766");
  fill(grass, x, ground, w, base - ground + 3);
  const road = ground + 1;
  fill(dark(wet ? "#6f7682" : "#8a909a"), x, road, w, 3);
  for (let lx = 0; lx < w; lx++) if ((u0 + lx) % 6 < 3) fill(dark("#f2e3a0", 0.8), x + lx, road + 1, 1, 1);
  if (visible(90, 99)) for (let i = 0; i < 4; i++) fill(dark("#ffffff", 0.75), X(90 + i * 2), road, 1, 3);
  // Wood chips under the play things.
  const chips = snowy ? dark("#e3eaf2", 0.6) : dark("#c9a06a");
  if (visible(4, 30)) fill(chips, X(4), base - 2, 26, 3);
  if (visible(54, 76)) fill(chips, X(54), base - 2, 22, 3);
  if (wet && !snowy) {
    fill(dark("#9cc3e0", 0.5), X(u0 + 6), base - 1, 6, 1);
    fill(dark("#9cc3e0", 0.5), X(u0 + 24), base - 3, 4, 1);
  }

  // The school bus, parked by day.
  const school = info.hour >= 7 && info.hour < 17.5;
  if (school && visible(100, 118)) {
    const bx = X(100);
    const by = road - 4;
    fill("#2a1e2e", bx - 1, by - 1, 18, 7);
    fill(dark("#f5c22b"), bx, by, 16, 5);
    fill(dark("#fde38a"), bx, by, 16, 1);
    for (let i = 0; i < 5; i++) fill(dark("#bfe2f5"), bx + 1 + i * 3, by + 1, 2, 1);
    fill(dark("#2a1e2e"), bx, by + 3, 16, 1);
    fill("#2a1e2e", bx + 2, by + 5, 2, 1);
    fill("#2a1e2e", bx + 12, by + 5, 2, 1);
    fill(dark("#e5544b"), bx + 15, by + 2, 1, 1);
  }
  // Crossing sign
  if (visible(87, 90)) {
    const sx = X(88);
    fill(dark("#6b7280"), sx, road - 7, 1, 8);
    fill("#2a1e2e", sx - 2, road - 10, 5, 4);
    fill(dark("#f7c948"), sx - 1, road - 9, 3, 2);
  }
  // Street lamp: glows at night.
  if (visible(80, 84)) {
    const lx = X(82);
    fill(dark("#4b5563", 0.4), lx, ground - 12, 1, 14);
    fill(dark("#4b5563", 0.4), lx - 1, ground - 13, 3, 1);
    const on = night > 0.35 || wx === "storm" || wx === "fog";
    fill(on ? "#fff1b8" : dark("#d5dbe2"), lx - 1, ground - 12, 3, 1);
    if (on) {
      const g = ctx.createRadialGradient(lx + 0.5, ground - 11, 0, lx + 0.5, ground - 11, 12);
      g.addColorStop(0, "rgba(255,230,160,0.55)");
      g.addColorStop(1, "rgba(255,230,160,0)");
      ctx.fillStyle = g;
      ctx.fillRect(lx - 12, ground - 23, 25, 30);
      fill("rgba(255,230,160,0.35)", lx - 4, ground + 1, 9, 2);
    }
  }

  // The swing set.
  const recess = school && info.hour >= 8.5 && info.hour < 16 && !wet && wx !== "fog";
  if (visible(6, 28)) {
    const sx0 = X(7);
    const top = base - 12;
    const post = dark("#d6403a");
    for (const px of [sx0, sx0 + 18]) {
      fill(post, px, top + 1, 1, 11);
      fill(post, px + 2, top + 1, 1, 11);
      fill(post, px + 1, top, 1, 1);
    }
    fill(post, sx0, top, 21, 1);
    for (let i = 0; i < 3; i++) {
      const cx = sx0 + 5 + i * 5;
      const busy = recess && i !== 1;
      const swing = busy ? Math.sin(t * 2.4 + i * 1.7) * 2.4 : Math.sin(t * 0.6 + i) * 0.3;
      for (let k = 1; k <= 6; k++) fill(dark("#9aa3ad"), cx + Math.round((swing * k) / 6), top + k, 1, 1);
      const seatX = cx + Math.round(swing) - 1;
      fill(dark("#2a1e2e"), seatX, top + 7, 3, 1);
      if (busy) kid(ctx, seatX + 1, top + 7, hash(`sw${i}`), false, 0, dark);
    }
  }

  // The slide.
  if (visible(54, 76)) {
    const lx = X(57);
    const top = base - 11;
    const rail = dark("#4a8fd9");
    fill(rail, lx, top, 1, 11);
    fill(rail, lx + 3, top, 1, 11);
    for (let k = 2; k < 11; k += 3) fill(dark("#9aa3ad"), lx + 1, top + k, 2, 1);
    fill(dark("#4a8fd9"), lx - 1, top - 1, 6, 1);
    fill(dark("#f39a3d"), lx, top - 4, 4, 3);
    fill(dark("#f8bd77"), lx, top - 4, 4, 1);
    for (let k = 0; k < 13; k++) {
      fill(dark("#f7c948"), lx + 4 + k, top + Math.round(k * 0.75), 1, 2);
    }
    if (recess) {
      // Someone slides down every few seconds.
      const cyc = (t * 0.45) % 1;
      if (cyc < 0.35) {
        const k = cyc / 0.35;
        kid(ctx, lx + 5 + Math.round(k * 11), top - 1 + Math.round(k * 8), 77, false, 0, dark);
      } else kid(ctx, lx + 1, top - 2, 77, false, 0, dark);
    }
  }

  // The big tree.
  if (visible(122, 146)) {
    const tx = X(132);
    const autumn = month >= 8 && month <= 10;
    const winter = month === 11 || month <= 1;
    fill(dark("#7a5236"), tx, base - 14, 3, 15);
    fill(dark("#7a5236"), tx - 3, base - 16, 3, 1);
    fill(dark("#7a5236"), tx + 3, base - 17, 3, 1);
    if (!winter || (!snowy && month === 1)) {
      const leaf = autumn ? ["#e0913a", "#c95f2c", "#e8c14a"] : ["#4f9a4a", "#5fb058", "#7cc46a"];
      const cx = tx + 1;
      const cy = base - 20;
      for (let j = -6; j <= 6; j++) {
        const span = Math.round(Math.sqrt(1 - (j / 7) ** 2) * 10);
        fill(dark(leaf[(j + 6) % 3 === 0 ? 2 : j < 0 ? 1 : 0]!), cx - span, cy + j, span * 2 + 1, 1);
      }
      fill(dark(leaf[2]!), cx - 6, cy - 4, 3, 1);
      fill(dark(leaf[2]!), cx + 2, cy - 5, 4, 1);
      if (snowy) {
        fill(dark("#ffffff", 0.5), cx - 6, cy - 6, 13, 1);
        fill(dark("#ffffff", 0.5), cx - 9, cy - 3, 4, 1);
        fill(dark("#ffffff", 0.5), cx + 5, cy - 2, 5, 1);
      }
      if (!autumn && month >= 3 && month <= 5) {
        fill(dark("#ffc4d6"), cx - 4, cy - 1, 1, 1);
        fill(dark("#ffc4d6"), cx + 5, cy + 2, 1, 1);
        fill(dark("#ffc4d6"), cx + 1, cy - 3, 1, 1);
      }
    } else {
      // Bare winter branches.
      const b = dark("#6b4a32");
      fill(b, tx - 5, base - 20, 1, 4);
      fill(b, tx + 6, base - 22, 1, 5);
      fill(b, tx + 1, base - 24, 1, 10);
      if (snowy) fill(dark("#ffffff", 0.5), tx - 6, base - 18, 14, 1);
    }
  }

  // A snowman on snowy days.
  if (snowy && visible(74, 80)) {
    const sx = X(75);
    fill(dark("#ffffff", 0.5), sx, base - 4, 5, 4);
    fill(dark("#ffffff", 0.5), sx + 1, base - 7, 3, 3);
    fill("#2a1e2e", sx + 2, base - 6, 1, 1);
    fill(dark("#f39a3d"), sx + 3, base - 6, 1, 1);
    fill(dark("#e5544b"), sx + 1, base - 5, 3, 1);
  }

  // Kids at recess, running around the yard.
  if (recess) {
    for (let i = 0; i < 7; i++) {
      const s = hash(`kid${i}`);
      const a = (s % 140) + 2;
      const span = 10 + (s % 18);
      const sp = 0.5 + ((s >>> 5) % 10) / 10;
      const ph = (s >>> 9) % 7;
      const k = Math.sin(t * sp + ph);
      const u = a + span * (0.5 + 0.5 * k);
      if (!visible(u - 2, u + 2)) continue;
      const dir = Math.cos(t * sp + ph) >= 0 ? 1 : -1;
      const row = base - 1 - ((s >>> 3) % 3);
      const hop = Math.abs(Math.cos(t * sp + ph)) > 0.2 ? Math.floor(t * 8 + i) % 2 : 0;
      kid(ctx, X(u), row - hop, s, true, dir, dark);
    }
    // A bouncing ball.
    if (visible(40, 52)) {
      const bt = (t * 1.3) % 2;
      const bx = X(40 + Math.abs(bt - 1) * 12);
      const by = base - 2 - Math.round(Math.abs(Math.sin(t * 4.2)) * 5);
      fill(dark("#e5544b"), bx, by, 2, 2);
    }
  }
}

/** A tiny far-off kid: head, shirt, legs (feet at y). */
function kid(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, running: boolean, dir: number, dark: (c: string, k?: number) => string): void {
  const px = Math.round(x);
  const py = Math.round(y);
  ctx.fillStyle = dark(KID_SKIN[seed % KID_SKIN.length]!);
  ctx.fillRect(px, py - 4, 1, 1);
  ctx.fillStyle = dark(KID_SHIRTS[(seed >>> 2) % KID_SHIRTS.length]!);
  ctx.fillRect(px, py - 3, 1, 2);
  if (running) ctx.fillRect(px + (dir > 0 ? -1 : 1), py - 3, 1, 1);
  ctx.fillStyle = dark("#3d4a6b");
  ctx.fillRect(px - (running ? 0 : 0), py - 1, 1, 1);
}
