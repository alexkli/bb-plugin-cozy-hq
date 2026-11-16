// Villain's Lair: the view from the blast windows. A turquoise sea under the
// tropical sky, little islands with palms, the base's helipad on a spur of
// rock with its helicopter, gulls by day and the pad lights by night; storms
// whip up whitecaps (the office adds the rain and the lightning).
import type { Rect } from "../../layout.ts";
import type { OutsideInfo, PaintInfo, SkyColors } from "../../theme.ts";
import { hash, mix } from "../../themekit.ts";
import { BAY_DOORS } from "./bay.ts";
import { C } from "./kit.ts";
import { askDoors } from "./rocket.ts";

/** A little brighter and more turquoise than the city sky by day. */
export function lairSky(_hour: number, classic: SkyColors): SkyColors {
  if (classic.night > 0.3) return classic;
  return { ...classic, top: mix(classic.top, "#3aa8e0", 0.25), bottom: mix(classic.bottom, "#bff0f0", 0.3) };
}

function seaColors(info: OutsideInfo): { far: string; near: string; foam: string } {
  const wx = info.weather;
  const grey = wx === "storm" ? 0.62 : wx === "rain" || wx === "drizzle" ? 0.45 : wx === "cloudy" || wx === "fog" || wx === "snow" ? 0.3 : 0;
  let far = mix("#2fa8c8", "#5a7880", grey);
  let near = mix("#1d7aa8", "#3e5a66", grey);
  if (info.night > 0.05) {
    far = mix(far, "#16224a", info.night * 0.85);
    near = mix(near, "#0e1838", info.night * 0.85);
  }
  // Sunset warms the far water.
  if (info.hour > 17.5 && info.hour < 20 && info.night < 0.7) far = mix(far, "#f0a07a", 0.3);
  return { far, near, foam: info.night > 0.5 ? "#5a6a8a" : "#e9f8fb" };
}

export function lairOutside(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void {
  const { x, y, w, h } = win;
  if (BAY_DOORS.has(win)) {
    // Up the launch shaft: only sky, and the crater's rim against it.
    ctx.fillStyle = info.night > 0.5 ? "#140f16" : "#3a3438";
    for (let k = 0; k < w; k++) ctx.fillRect(x + k, y + h - 2 - (hash(`rim${k >> 1}`) % 4), 1, 6);
    return;
  }
  const t = info.t;
  const horizon = y + Math.round(h * 0.52);
  const sea = seaColors(info);
  const storm = info.weather === "storm";
  // The sea, darker toward you.
  for (let yy = horizon; yy < y + h; yy++) {
    const k = (yy - horizon) / Math.max(1, y + h - horizon);
    ctx.fillStyle = mix(sea.far, sea.near, k);
    ctx.fillRect(x, yy, w, 1);
  }
  ctx.fillStyle = mix(sea.far, "#ffffff", info.night > 0.5 ? 0.05 : 0.35);
  ctx.fillRect(x, horizon, w, 1);
  // Islands on the horizon, continuous across the windows (placed by panel x).
  for (let ix = (x - (x % 70)) - 70; ix < x + w + 40; ix += 70) {
    const hsh = hash(`isle${ix}`);
    if (hsh % 3 === 0) continue;
    const iw = 10 + (hsh % 16);
    const ih = 2 + (hsh % 3);
    const cx = ix + (hsh % 40);
    const isle = info.night > 0.5 ? "#1a2a2a" : storm ? "#3a5048" : "#3f7a4a";
    for (let k = 0; k < iw; k++) {
      const hh = Math.round(Math.sin((k / iw) * Math.PI) * ih) + 1;
      ctx.fillStyle = isle;
      ctx.fillRect(cx + k, horizon - hh, 1, hh);
    }
    if (hsh % 2 === 0) {
      // A palm, leaning.
      ctx.fillStyle = info.night > 0.5 ? "#141e1e" : "#5a4a32";
      ctx.fillRect(cx + Math.round(iw / 2), horizon - ih - 4, 1, 4);
      ctx.fillStyle = isle;
      ctx.fillRect(cx + Math.round(iw / 2) - 2, horizon - ih - 5, 5, 1);
    }
  }
  // Waves: dashes drifting toward you; whitecaps in a storm.
  const rows = Math.max(2, Math.floor((y + h - horizon) / 3));
  for (let r = 0; r < rows; r++) {
    const yy = horizon + 2 + r * 3;
    const speed = 3 + r * 2 + (storm ? 8 : 0);
    const gap = storm ? 9 : 16 - r;
    for (let k = 0; k < w + gap; k += gap) {
      const wx = x + ((k + Math.floor(t * speed) + r * 7 + hash(`w${r}`) % 9) % (w + gap)) - gap / 2;
      ctx.fillStyle = storm || (k / gap + r) % 3 === 0 ? sea.foam : mix(sea.near, sea.foam, 0.35);
      ctx.fillRect(Math.round(wx), yy, storm ? 3 : 2 + (r > 2 ? 1 : 0), 1);
    }
  }
  // The moon's path on the water at night.
  if (info.night > 0.6 && info.weather === "clear") {
    ctx.fillStyle = "rgba(240,240,210,0.35)";
    for (let yy = horizon + 2; yy < y + h; yy += 2) ctx.fillRect(x + Math.round(w * 0.3) + ((yy * 3) % 5), yy, 3 + ((yy - horizon) >> 2), 1);
  }
  // A boat crossing far out (not in a storm).
  if (!storm && info.night < 0.6) {
    const span = 420;
    const bx = ((t * 3 + 120) % span) - 20;
    const gx = info.windows[0] ? info.windows[0].x + bx : bx;
    if (gx > x - 10 && gx < x + w + 10) {
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(Math.round(gx), horizon - 2, 5, 1);
      ctx.fillRect(Math.round(gx) + 1, horizon - 3, 2, 1);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(Math.round(gx) - 4, horizon - 1, 4, 1);
    }
  }
  // The near rock of the volcano's flank, with jungle on it.
  const flank = info.night > 0.5 ? "#15121a" : "#2c262b";
  const jungle = info.night > 0.5 ? "#12221a" : storm ? "#2a4a34" : "#2f6a3a";
  for (let k = 0; k < w; k++) {
    const gx = x + k;
    const rh = 3 + (hash(`flank${gx >> 2}`) % 4);
    ctx.fillStyle = flank;
    ctx.fillRect(gx, y + h - rh, 1, rh);
    if (hash(`j${gx >> 1}`) % 3 !== 0) {
      ctx.fillStyle = jungle;
      ctx.fillRect(gx, y + h - rh - 1 - (hash(`jj${gx}`) % 2), 1, 2);
    }
  }
  // The helipad and its helicopter (in the last window but one: the panel's buttons sit over the last).
  const wall = info.windows.filter((v) => !BAY_DOORS.has(v));
  if (win === wall[Math.max(0, wall.length - 2)]) helipad(ctx, win, info);
  // Gulls by day.
  if (info.night < 0.3 && !storm && info.weather !== "rain") {
    for (let i = 0; i < 2; i++) {
      const gp = (t * (6 + i * 2) + i * 90 + index * 40) % (w + 30);
      const gx = x + gp - 15;
      const gy = y + 6 + i * 5 + Math.round(Math.sin(t * 1.5 + i) * 2);
      const flap = Math.floor(t * 4 + i) % 2;
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(Math.round(gx), gy + flap, 1, 1);
      ctx.fillRect(Math.round(gx) + 1, gy + 1 - flap, 1, 1);
      ctx.fillRect(Math.round(gx) + 2, gy + flap, 1, 1);
    }
  }
}

/** Where the helicopter sits, and whether it's up in the air (the red button can send it off). */
export const heli = { liftAt: -100 };

function helipad(ctx: CanvasRenderingContext2D, win: Rect, info: PaintInfo): void {
  const { x, y, w, h } = win;
  const t = info.t;
  const px = x + w - 24;
  const py = y + h - 7;
  // The spur of rock and the pad on it.
  ctx.fillStyle = info.night > 0.5 ? "#15121a" : "#3a3438";
  ctx.fillRect(px - 2, py, 26, 7);
  ctx.fillStyle = "#5a5560";
  ctx.fillRect(px, py - 1, 22, 2);
  ctx.fillStyle = C.hazard;
  ctx.fillRect(px + 9, py - 1, 1, 1);
  ctx.fillRect(px + 12, py - 1, 1, 1);
  ctx.fillRect(px + 10, py - 1, 2, 1);
  // Pad lights blink at night.
  if (info.night > 0.4 && Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = C.glowRed;
    ctx.fillRect(px, py - 1, 1, 1);
    ctx.fillRect(px + 21, py - 1, 1, 1);
  }
  // The helicopter: up and away for a few seconds after a lift-off, else on the pad, rotor idling.
  const up = t - heli.liftAt;
  let hx = px + 6;
  let hy = py - 5;
  if (up >= 0 && up < 9) {
    const k = up < 1.5 ? up / 1.5 : 1;
    hy -= Math.round(k * k * 10 + (up > 1.5 ? (up - 1.5) * 2 : 0));
    hx += Math.round(up > 1.5 ? -(up - 1.5) * 9 : 0);
    if (up > 7.5) return;
  }
  const body = info.night > 0.5 ? "#2a2e3a" : "#2c3a48";
  ctx.fillStyle = body;
  ctx.fillRect(hx, hy, 7, 3);
  ctx.fillRect(hx + 7, hy + 1, 5, 1);
  ctx.fillRect(hx + 11, hy, 1, 2);
  ctx.fillStyle = info.night > 0.5 ? "#7cc8ff" : "#9fd8f0";
  ctx.fillRect(hx + 1, hy, 2, 1);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(hx, hy + 3, 7, 1);
  const spin = Math.floor(t * (up >= 0 && up < 9 ? 20 : 4)) % 2;
  ctx.fillStyle = "#c9d0d6";
  ctx.fillRect(hx - 3 + spin * 2, hy - 1, 11 - spin * 2, 1);
}

/** A window clicked open: the armored pane slides up into its housing and the sea air comes in. */
export function lairOpenWindow(ctx: CanvasRenderingContext2D, win: Rect, k: number, info: PaintInfo): boolean {
  if (BAY_DOORS.has(win)) {
    // The launch doors slide apart (drawn with the bay; here we only pass it on).
    askDoors(k, info.t);
    return true;
  }
  const { x, y, w, h } = win;
  const lift = Math.round(k * (h - 6));
  // The glass rides up: its bottom rail shows where it is now.
  ctx.fillStyle = C.steelDk;
  ctx.fillRect(x, y + h - lift - 2, w, 2);
  ctx.fillStyle = C.steelHi;
  ctx.fillRect(x, y + h - lift - 2, w, 1);
  // Spray and a breeze across the sill.
  ctx.fillStyle = `rgba(233,248,251,${0.6 * k})`;
  for (let i = 0; i < 6; i++) {
    const sx = x + ((i * 13 + Math.floor(info.t * 30)) % w);
    const sy = y + h + 2 + ((i * 7 + Math.floor(info.t * 18)) % 14);
    ctx.fillRect(sx, sy, 2, 1);
  }
  return true;
}
