// Neon City, live: the megacity outside, the sky, neon tubes along the wall,
// floor lights that chase down the hallways, light pools at night, and a
// faint CRT shimmer over it all.
import type { Drawable, Light, OutsideInfo, PaintInfo, SkyColors, WallLightsInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, classicProp, drawPixelText, floorPlan, Grid, hash, makeCanvas, mix, OUTLINE, rng } from "../../themekit.ts";
import { floorDashes, paintingSign, roomSign, wallSigns } from "./background.ts";
import { glowBar, glowDot, glyph, P, perLayout } from "./kit.ts";
import { planOf } from "./plan.ts";

// ------------------------------------------------------------------ sky

const SKY: [number, string, string, number][] = [
  [0, "#07051a", "#2a0d3e", 1],
  [5, "#0e0a26", "#3a1446", 0.95],
  [6.5, "#2c1f52", "#ff6f8a", 0.55],
  [8, "#3f4f86", "#c792b8", 0.1],
  [16.5, "#3c4c84", "#d39ab6", 0.1],
  [18.5, "#2f1f5c", "#ff5f7a", 0.45],
  [19.6, "#1c0f42", "#b8306e", 0.75],
  [21, "#0b0722", "#35103f", 1],
  [24, "#07051a", "#2a0d3e", 1],
];

/** A smoggy violet day, magenta sunsets and a night that never gets black. */
export function neonSky(hour: number): SkyColors {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0, n0] = SKY[i]!;
    const [h1, t1, b1, n1] = SKY[i + 1]!;
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), night: n0 + (n1 - n0) * k };
    }
  }
  return { top: "#3f4f86", bottom: "#c792b8", night: 0.1 };
}

// ------------------------------------------------------------------ the megacity

interface Tower {
  /** Absolute x across the whole wall (the skyline runs on from window to window). */
  x: number;
  w: number;
  /** Height as a share of the window. */
  h: number;
  layer: 0 | 1 | 2;
  sign: string | null;
  antenna: boolean;
}

/** One skyline for the whole wall, cached by its width. */
function skyline(span: number): Tower[] {
  return cached(`neon|skyline|${span}`, () => {
    const r = rng(hash(`neon-city-${span}`) + 1);
    const out: Tower[] = [];
    for (const layer of [0, 1, 2] as const) {
      let x = -Math.floor(r() * 6);
      while (x < span) {
        const tw = layer === 0 ? 4 + Math.floor(r() * 5) : layer === 1 ? 5 + Math.floor(r() * 6) : 6 + Math.floor(r() * 8);
        const th = layer === 0 ? 0.4 + r() * 0.35 : layer === 1 ? 0.25 + r() * 0.35 : 0.1 + r() * 0.32;
        const sign = layer === 2 && r() < 0.45 ? [P.mag, P.cyan, P.yel, P.vio][Math.floor(r() * 4)]! : null;
        out.push({ x, w: tw, h: th, layer, sign, antenna: layer === 0 && r() < 0.35 });
        x += tw + (layer === 2 ? 3 + Math.floor(r() * 8) : layer === 1 ? Math.floor(r() * 3) : 0);
      }
    }
    return out;
  });
}

/** The baked view out of one window: its slice of the skyline, by day or by night. */
function cityLayer(win: Rect, span: number, night: boolean): HTMLCanvasElement {
  const { x: wx, w, h } = win;
  return cached(`neon|city|${wx}|${w}|${h}|${span}|${night}`, () =>
    makeCanvas(w, h, (ctx) => {
      const cols = night ? ["#2a1f4e", "#1a1338", "#0c0a1c"] : ["#b2aed6", "#77729f", "#3e3a68"];
      const lit = night ? ["#ffd98a", P.cyan, P.magHi, "#9fb4ff"] : ["#d8e0ff", "#b8c4f0"];
      for (const t of skyline(span)) {
        const tx = t.x - wx;
        if (tx + t.w < 0 || tx > w) continue;
        const th = Math.floor(t.h * h);
        ctx.fillStyle = cols[t.layer]!;
        ctx.fillRect(tx, h - th, t.w, th);
        if (t.antenna) ctx.fillRect(tx + Math.floor(t.w / 2), h - th - 4, 1, 4);
        if (!night) {
          // Glass curtain walls: a lighter edge and faint vertical mullions.
          ctx.fillStyle = mix(cols[t.layer]!, "#ffffff", 0.18);
          ctx.fillRect(tx, h - th, 1, th);
          if (t.layer > 0) {
            ctx.fillStyle = mix(cols[t.layer]!, "#000000", 0.12);
            for (let x = tx + 2; x < tx + t.w; x += 2) ctx.fillRect(x, h - th + 1, 1, th - 1);
          }
        } else {
          // Floors of lit windows: whole rows on or off, a few dark gaps.
          const step = t.layer === 0 ? 3 : 2;
          for (let y = h - th + 2; y < h - 1; y += step) {
            const row = hash(`${t.layer}-${t.x}-${h - y}`) % 100;
            if (row > (t.layer === 0 ? 45 : 60)) continue;
            const c = lit[row % lit.length]!;
            for (let x = 1; x < t.w - 1; x += 2) {
              if (hash(`${t.x + x}-${h - y}`) % 5 === 0) continue;
              ctx.fillStyle = c;
              ctx.globalAlpha = t.layer === 0 ? 0.45 : 0.9;
              ctx.fillRect(tx + x, y, 1, 1);
              ctx.globalAlpha = 1;
            }
          }
        }
        // A vertical neon sign of invented glyphs on near towers.
        if (t.sign && th > 10) {
          ctx.fillStyle = night ? t.sign : mix(t.sign, cols[2]!, 0.35);
          const g = glyph(hash(`${t.x}`) % 400, 7);
          for (let y = 0; y < Math.min(7, th - 4); y++) {
            for (let x = 0; x < 3; x++) if (g[y]![x + 1] === "#") ctx.fillRect(tx + 1 + x, h - th + 2 + y, 1, 1);
          }
        }
        if (t.layer === 2) {
          ctx.fillStyle = night ? "#2a2050" : "#4a4878";
          ctx.fillRect(tx, h - th, t.w, 1);
        }
      }
    }),
  );
}

/** Holo billboard pictures (6 rows of 10), cycling. */
function billboard(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, night: number, seed: number): void {
  const w = 10;
  const h = 6;
  const kind = Math.floor(t / 4 + seed) % 3;
  ctx.globalAlpha = 0.55 + night * 0.4;
  ctx.fillStyle = "#14082a";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  if (kind === 0) {
    // Scrolling stripes.
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = (Math.floor(i + t * 6) % 6) < 3 ? P.mag : P.vio;
      ctx.fillRect(x + i, y, 1, h);
    }
  } else if (kind === 1) {
    // A floating koi.
    ctx.fillStyle = "#0a2040";
    ctx.fillRect(x, y, w, h);
    const fx = x + 1 + Math.floor((t * 3) % 6);
    ctx.fillStyle = P.orange;
    ctx.fillRect(fx, y + 2, 3, 2);
    ctx.fillStyle = P.white;
    ctx.fillRect(fx + 1, y + 2, 1, 1);
    ctx.fillStyle = P.orange;
    ctx.fillRect(fx - 1, y + 1 + (Math.floor(t * 4) % 2), 1, 2);
  } else {
    // Glyph ad.
    ctx.fillStyle = "#200a20";
    ctx.fillRect(x, y, w, h);
    const g = glyph(Math.floor(t / 4) % 50);
    ctx.fillStyle = P.cyan;
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if (g[yy]![xx] === "#") ctx.fillRect(x + 1 + xx, y + yy, 1, 1);
    ctx.fillStyle = Math.floor(t * 2) % 2 ? P.yel : P.mag;
    ctx.fillRect(x + 7, y + 1, 2, 4);
  }
  // Scan flicker.
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x, y + (Math.floor(t * 8) % h), w, 1);
  ctx.globalAlpha = 1;
}

export function neonOutside(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void {
  const { x, y, w, h } = win;
  const t = info.t;
  const wins = info.windows && info.windows.length > 0 ? info.windows : [win];
  const span = Math.max(...wins.map((r) => r.x + r.w)) + 8;
  const night = Math.max(0, Math.min(1, (info.night - 0.1) / 0.8));
  if (night < 1) ctx.drawImage(cityLayer(win, span, false), x, y);
  if (night > 0) {
    ctx.globalAlpha = night;
    ctx.drawImage(cityLayer(win, span, true), x, y);
    ctx.globalAlpha = 1;
  }
  // The megacity drizzle never quite stops on grey days.
  if (info.weather === "cloudy" || info.weather === "fog") {
    ctx.fillStyle = "rgba(200,210,255,0.45)";
    for (let i = 0; i < Math.round(w / 6); i++) {
      const rx = x + ((i * 23 + Math.floor(t * 20)) % w);
      const ry = y + ((i * 13 + Math.floor(t * 55)) % h);
      ctx.fillRect(rx, ry, 1, 2);
    }
  }
  // Smog haze over the far towers.
  ctx.fillStyle = night > 0.5 ? "rgba(120,30,120,0.12)" : "rgba(230,170,210,0.12)";
  ctx.fillRect(x, y + h - 14, w, 14);
  // Aircraft lights on the antennas.
  for (const tw of skyline(span)) {
    if (!tw.antenna || tw.x + tw.w < x || tw.x > x + w) continue;
    const blink = Math.floor(t * 1.5 + tw.x * 0.1) % 3 === 0;
    ctx.fillStyle = blink ? "#ff3b5c" : "#5a1020";
    ctx.fillRect(tw.x + Math.floor(tw.w / 2), y + h - Math.floor(tw.h * h) - 5, 1, 1);
  }
  // A holo billboard on every other window.
  if (index % 2 === 0) billboard(ctx, x + 8 + (index * 7) % 14, y + h - 22, t, night, index);
  // Hover traffic in lanes that run past all the windows.
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1;
    const speed = 9 + i * 5;
    const len = span + 40;
    let cx = ((t * speed + i * 97) % len) - 20;
    if (dir < 0) cx = span - cx;
    const px = Math.round(cx);
    if (px < x - 6 || px > x + w + 6) continue;
    const cy = y + 6 + i * 5;
    ctx.fillStyle = night > 0.4 ? "#1a1430" : "#2a2848";
    ctx.fillRect(px, cy, 3, 1);
    if (night > 0.2) {
      ctx.fillStyle = "#fff6d0";
      ctx.fillRect(dir > 0 ? px + 3 : px - 1, cy, 1, 1);
      ctx.fillStyle = "#ff3b5c";
      ctx.fillRect(dir > 0 ? px - 1 : px + 3, cy, 1, 1);
      ctx.globalAlpha = 0.35 * night;
      ctx.fillStyle = i % 2 ? P.cyan : P.mag;
      ctx.fillRect(dir > 0 ? px - 5 : px + 4, cy, 4, 1);
      ctx.globalAlpha = 1;
    }
  }
  // A searchlight sweeping the clouds at night.
  if (night > 0.6 && index % 3 === 1) {
    const a = Math.sin(t * 0.35 + index) * 0.6;
    ctx.save();
    ctx.globalAlpha = 0.1 * night;
    ctx.fillStyle = "#c8d8ff";
    ctx.beginPath();
    const bx = x + w * 0.6;
    ctx.moveTo(bx, y + h);
    ctx.lineTo(bx + Math.sin(a) * h * 1.4 - 3, y);
    ctx.lineTo(bx + Math.sin(a) * h * 1.4 + 4, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------------ neon tubes along the wall

interface Tube {
  x0: number;
  x1: number;
  color: string;
  i: number;
}

function tubes(L: Layout): Tube[] {
  return perLayout("tubes", `${L.W}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}`, () => {
    const out: Tube[] = [];
    const colors = [P.mag, P.cyan, P.vio, P.cyan];
    let n = 0;
    for (const seg of L.segments) {
      for (let x0 = seg.x0 + 8; x0 < seg.x1 - 12; x0 += 54) {
        const x1 = Math.min(seg.x1 - 8, x0 + 48);
        if (x1 - x0 < 16) continue;
        out.push({ x0, x1, color: colors[n % colors.length]!, i: n });
        n++;
      }
    }
    return out;
  });
}

const PARTY = [P.mag, P.cyan, P.yel, P.lime, P.vio];

export function neonWallLights(ctx: CanvasRenderingContext2D, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const t = info.t;
  const amount = info.party ? Math.max(info.night, 0.75) : info.night;
  for (const tb of tubes(L)) {
    const dead = info.brokenBulbX !== null && info.brokenBulbX >= tb.x0 - 4 && info.brokenBulbX <= tb.x1 + 4;
    const spark = Math.floor(t * 9) % 7 === 0;
    const stutter = hash(`${tb.i}:${Math.floor(t * 14)}`) % 113 === 0;
    const off = (dead && !spark) || stutter;
    const color = info.party ? PARTY[(tb.i + Math.floor(t * 6)) % PARTY.length]! : tb.color;
    const len = tb.x1 - tb.x0;
    if (!glow) {
      // Brackets and the tube itself (neon is on day and night).
      ctx.fillStyle = "#3a3458";
      ctx.fillRect(tb.x0 - 1, 1, 1, 4);
      ctx.fillRect(tb.x1, 1, 1, 4);
      ctx.fillStyle = off ? "#3a3448" : color;
      ctx.fillRect(tb.x0, 2, len, 2);
      if (!off) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(tb.x0, 2, len, 1);
      }
      continue;
    }
    if (off || amount < 0.02) continue;
    const pulse = info.party ? 0.75 + 0.25 * Math.sin(t * 10 + tb.i) : 0.9 + 0.1 * Math.sin(t * 2.1 + tb.i * 1.7);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, amount * 0.7 * pulse);
    ctx.drawImage(glowBar(color, len, 6, 0.5), tb.x0 - 6, 3 - 6);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.min(1, amount);
    ctx.fillRect(tb.x0, 2, len, 2);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = Math.min(1, amount) * 0.6;
    ctx.fillRect(tb.x0, 2, len, 1);
    ctx.globalAlpha = 1;
  }
  if (!glow) return;
  // The signs on the wall light up through the dark.
  const signAmount = Math.max(amount, 0.12);
  ctx.save();
  for (const s of wallSigns(L)) {
    const flick = hash(`s${s.x}:${Math.floor(t * 12)}`) % 61 === 0 ? 0.25 : 1;
    ctx.globalAlpha = signAmount * flick;
    ctx.drawImage(s.lit, s.x, s.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = signAmount * 0.45 * flick;
    const r = Math.max(10, Math.round(s.lit.width * 0.7));
    ctx.drawImage(glowDot(s.color, r, 0.5), s.x + s.lit.width / 2 - r, s.y + s.lit.height / 2 - r);
    ctx.globalCompositeOperation = "source-over";
  }
  for (const p of L.wall.paintings) {
    const sg = paintingSign(p.x);
    const flick = hash(`p${p.x}:${Math.floor(t * 12)}`) % 47 === 0 ? 0.3 : 1;
    ctx.globalAlpha = signAmount * flick;
    ctx.drawImage(sg.lit, p.x, p.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = signAmount * 0.4 * flick;
    ctx.drawImage(glowDot(sg.color, 16, 0.5), p.x + 8 - 16, p.y + 16 - 16);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}

// ------------------------------------------------------------------ light at night

function propsOf(L: Layout, kind: string) {
  return L.props.filter((p) => p.kind === kind);
}

function staticLights(L: Layout): Light[] {
  return perLayout("lights", L, () => {
    const out: Light[] = [];
    for (const win of L.wall.windows) out.push([win.x + win.w / 2, win.y + win.h / 2, 34, 0.45, "#ff6ac8", 0.06]);
    // The "?" note and the "+" over the door stay easy to find in the dark.
    const n = L.wall.legendNote;
    out.push([n.x + n.w / 2, n.y + n.h / 2, 11, 0.85, P.yel, 0.18]);
    const d = L.wall.door;
    out.push([d.x + d.w / 2, Math.max(1, d.y - 12) + 4, 11, 0.85, P.lime, 0.18]);
    for (const s of wallSigns(L)) out.push([s.x + s.base.width / 2, s.y + s.base.height / 2, 16 + s.base.width / 2, 0.65, s.color, 0.16]);
    for (const p of L.wall.paintings) out.push([p.x + 8, p.y + 16, 24, 0.65, paintingSign(p.x).color, 0.16]);
    const k = L.kitchen;
    out.push([k.x + k.w / 2, k.y + 6, Math.max(56, k.w * 0.5), 0.6, "#ff6a3d", 0.14]);
    for (const v of propsOf(L, "vending")) out.push([v.x + 12, v.y + 22, 30, 0.85, P.mag, 0.24]);
    for (const f of propsOf(L, "fridge")) out.push([f.x + 15, f.y + 12, 12, 0.5, P.cyan, 0.12]);
    for (const i of propsOf(L, "kitchen-island")) out.push([i.x + (i.w ?? 72) / 2, i.y + 6, 30, 0.6, "#ffb07a", 0.14]);
    const m = L.meeting;
    out.push([m.x + m.w / 2, m.y + m.h * 0.55, Math.max(50, m.w * 0.45), 0.5, "#5ad8ff", 0.1]);
    const b = L.whiteboard;
    out.push([b.x + b.w / 2, b.y + 18, b.w * 0.6, 0.65, "#bff6ff", 0.12]);
    const wt = L.waiting;
    out.push([wt.x + wt.w / 2, wt.y + wt.h / 2, Math.max(60, Math.min(wt.w, wt.h) * 0.55), 0.45, "#7a5cff", 0.1]);
    const boss = L.boss.room;
    out.push([boss.x + boss.w / 2, boss.y + boss.h / 2, Math.max(50, Math.min(boss.w, boss.h) * 0.5), 0.45, P.mag, 0.09]);
    out.push([L.couch.x + L.couch.w / 2, L.couch.y + 4, 56, 0.45, P.mag, 0.1]);
    if (L.server) {
      out.push([L.server.x + L.server.w / 2, L.server.y + L.server.h - 4, Math.max(30, L.server.w * 0.5), 0.6, P.cyan, 0.16]);
      out.push([L.server.x + L.server.w / 2, L.server.y + L.server.h - 5, 16, 0.8, P.cyan, 0.2]);
    }
    if (L.games) out.push([L.games.x + L.games.w / 2, L.games.y + L.games.h / 2, Math.max(50, L.games.w * 0.4), 0.45, P.vio, 0.12]);
    if (L.pingpong) out.push([L.pingpong.x + 38, L.pingpong.y + 8, 40, 0.6, P.cyan, 0.14]);
    for (const p of [...propsOf(L, "beanbag-blue"), ...propsOf(L, "beanbag-pink")]) out.push([p.x + 13, p.y + 8, 18, 0.7, p.kind === "beanbag-blue" ? P.cyan : P.mag, 0.2]);
    for (const p of propsOf(L, "cooler")) out.push([p.x + 8, p.y + 7, 14, 0.7, P.cyan, 0.18]);
    for (const p of propsOf(L, "reception")) out.push([p.x + 18, p.y + 8, 22, 0.6, P.cyan, 0.14]);
    for (const p of propsOf(L, "dog-bed")) out.push([p.x + 13, p.y + 7, 14, 0.6, P.vio, 0.16]);
    for (const p of propsOf(L, "printer")) out.push([p.x + 15, p.y + 4, 10, 0.5, P.cyan, 0.12]);
    for (const p of propsOf(L, "planter")) {
      const w = p.w ?? 48;
      for (let x = p.x + 20; x < p.x + w - 10; x += 60) out.push([x, p.y + 8, 20, 0.5, "#3affd8", 0.12]);
    }
    for (const p of propsOf(L, "lamp")) out.push([p.x + 8, p.y + 18, 22, 0.7, P.mag, 0.2]);
    for (const p of propsOf(L, "arcade")) out.push([p.x + 13, p.y + 4, 16, 0.7, P.mag, 0.18]);
    for (const p of propsOf(L, "piano")) out.push([p.x + 16, p.y + 10, 16, 0.6, P.vio, 0.14]);
    for (const pl of L.plants) {
      if (pl.sprite === "HANGING_PLANT") out.push([pl.x + 8, pl.y + 18, 14, 0.5, "#3affd8", 0.14]);
      else if (pl.sprite === "LARGE_PLANT") out.push([pl.x + 16, pl.y + 22, 22, 0.6, P.cyan, 0.16]);
      else out.push([pl.x + 8, pl.y + 14, 14, 0.55, pl.sprite === "PLANT_2" ? P.vio : pl.sprite === "CACTUS" ? P.mag : "#3affd8", 0.16]);
    }
    for (const lt of lanterns(L)) out.push([lt.x + 2, lt.y + 3, 18, 0.7, "#ff5a3d", 0.22]);
    const plan = planOf(L);
    for (const s of plan?.lanterns ?? []) out.push([s.x + s.lean / 2 + 4, (s.y0 + s.y1) / 2 + 4, 26, 0.7, "#ff6a4a", 0.2]);
    for (const c of plan?.carts ?? []) out.push([c.x + 13, c.y - 10, 22, 0.75, [P.red, P.orange, P.cyan][c.kind]!, 0.22]);
    if (plan) L.pods.forEach((pod, i) => out.push([pod.x + pod.w / 2, pod.y + pod.h / 2, Math.min(70, pod.w * 0.45), 0.35, [P.cyan, P.mag, P.vio][i % 3]!, 0.06]));
    for (const f of plan?.fronts ?? []) {
      const cx = (f.x0 + f.x1) / 2;
      out.push([cx, f.side === "top" ? f.y : f.y - 3, Math.min(60, (f.x1 - f.x0) / 2), 0.55, f.color, 0.14]);
    }
    for (const bit of plan?.bits ?? []) {
      if (bit.kind === "booth") out.push([bit.x + 8, bit.y - 14, 18, 0.7, P.mag, 0.2]);
      if (bit.kind === "signal") out.push([bit.x, bit.y - 24, 10, 0.7, P.lime, 0.16]);
      if (bit.kind === "billboard") out.push([bit.x + 22, bit.y + 8, 30, 0.6, P.cyan, 0.16]);
    }
    for (const room of L.rooms) {
      const sg = roomSign(room, L);
      if (sg) out.push([sg.x + sg.base.width / 2, sg.y + sg.base.height / 2, 18, 0.75, sg.color, 0.24]);
    }
    for (const h of floorBits(L).holo) out.push([h.x + 8, h.y + 8, 18, 0.6, P.cyan, 0.16]);
    for (const k of L.props.filter((p) => p.kind === "kitchen-counter")) out.push([k.x + (k.w ?? 100) / 2, k.y + 26, 18, 0.6, P.orange, 0.2]);
    return out;
  });
}

export function neonLights(L: Layout, info: PaintInfo): Light[] {
  const base = staticLights(L);
  const t = info.t;
  // Signs stutter now and then; the rest breathes a little.
  const out = base.map((l, i): Light => {
    const k = hash(`l${i}:${Math.floor(t * 12)}`) % 89 === 0 ? 0.4 : 0.92 + 0.08 * Math.sin(t * 1.7 + i);
    return [l[0], l[1], l[2], Math.min(1, l[3] * 1.15) * k, l[4], Math.min(0.45, l[5] * 1.6) * k];
  });
  // The hallway chasers.
  for (const c of chasers(L, t)) out.push([c.x, c.y, 10, 0.5, P.cyan, 0.2]);
  return out;
}

export function neonDarkness(night: number, _weather: string, classic: number): number {
  const gloom = classic - night * 0.5;
  return Math.min(0.8, 0.06 + night * 0.6 + gloom);
}

// ------------------------------------------------------------------ the floor

/** Which hallway dashes are lit right now: a pulse running down each line. */
function chasers(L: Layout, t: number): { x: number; y: number }[] {
  const dashes = floorDashes(L);
  const out: { x: number; y: number }[] = [];
  const head = Math.floor(t * 9);
  for (const d of dashes) {
    if ((d.i - head) % 28 === 0 || (d.i - head) % 28 === -0) out.push({ x: d.x + d.w / 2, y: d.y });
  }
  return out;
}

/** The core's reactor: rings of light pulsing out from the AI cluster across the floor. */
function drawReactor(ctx: CanvasRenderingContext2D, L: Layout, t: number): void {
  const r = L.server;
  if (!r) return;
  const ai = L.props.find((p) => p.kind === "ai-rack" && p.x >= r.x && p.x < r.x + r.w);
  const cx = ai ? ai.x + 10 : r.x + r.w / 2;
  const cy = r.y + r.h - 3;
  const maxR = Math.min(r.w / 2 - 4, 46);
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.45 + k / 3) % 1;
    const rx = 6 + ph * maxR;
    const ry = 1.5 + ph * 3.5;
    ctx.globalAlpha = 0.85 * (1 - ph);
    ctx.fillStyle = k % 2 ? P.vio : P.cyan;
    const n = Math.max(16, Math.round(rx * 1.4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const py = cy + Math.sin(a) * ry;
      if (py > r.y + r.h - 1) continue;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(py), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

export function neonUnderlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const t = info.t;
  if (planOf(L)) drawReactor(ctx, L, t);
  const head = Math.floor(t * 9);
  for (const d of floorDashes(L)) {
    const k = (((d.i - head) % 28) + 28) % 28;
    if (k > 3) continue;
    ctx.fillStyle = k === 0 ? P.cyanHi : k === 1 ? P.cyan : P.cyanLo;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
  // Pod trims breathe.
  const a = 0.25 + 0.25 * Math.sin(t * 1.3);
  ctx.globalAlpha = a;
  L.pods.forEach((pod, i) => {
    const c = [P.cyan, P.mag, P.vio][i % 3]!;
    const r = { x: pod.x - 2, y: pod.y + 4, w: pod.w + 4, h: pod.h - 6 };
    ctx.fillStyle = c;
    ctx.fillRect(r.x, r.y, r.w, 1);
    ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
    ctx.fillRect(r.x, r.y, 1, r.h);
    ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
  });
  ctx.globalAlpha = 1;
}

/** A soft additive glow map of the floor and wall neon, baked once per layout. */
function glowMap(L: Layout): HTMLCanvasElement {
  return perLayout("glowmap", L, () =>
    makeCanvas(L.W, L.H, (ctx) => {
      ctx.globalCompositeOperation = "lighter";
      L.segments.forEach((sg, i) => {
        const c = i % 2 ? P.mag : P.cyan;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(glowBar(c, sg.x1 - sg.x0, 5, 0.6), sg.x0 - 5, sg.depth - 9 - 5);
      });
      const plan = planOf(L);
      ctx.globalAlpha = 0.6;
      for (const bo of plan?.bollards ?? []) ctx.drawImage(glowDot((bo.x >> 3) % 2 ? P.mag : P.cyan, 6, 0.7), bo.x - 6, bo.y - 10);
      for (const st of plan?.streets ?? []) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(glowBar(P.cyan, L.W, 3, 0.5), -3, st.y - st.half - 1 - 3);
        ctx.drawImage(glowBar(P.mag, L.W, 3, 0.5), -3, st.y + st.half - 3);
      }
      ctx.globalAlpha = 0.35;
      for (const d of floorDashes(L)) {
        if (d.i % 2) continue;
        ctx.drawImage(glowDot(P.cyan, 5, 0.6), d.x + d.w / 2 - 5, d.y - 5);
      }
      if (L.server) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glowBar(P.cyan, L.server.w, 6, 0.6), L.server.x - 6, L.server.y + L.server.h - 2 - 6);
      }
      L.pods.forEach((pod, i) => {
        const c = [P.cyan, P.mag, P.vio][i % 3]!;
        ctx.globalAlpha = 0.25;
        ctx.drawImage(glowBar(c, pod.w + 4, 3, 0.6), pod.x - 2 - 3, pod.y + 4 - 3);
        ctx.drawImage(glowBar(c, pod.w + 4, 3, 0.6), pod.x - 2 - 3, pod.y + pod.h - 3 - 3);
      });
      for (const p of L.props) {
        if (p.kind !== "couch" && p.kind !== "pingpong" && p.kind !== "tv") continue;
        const c = classicProp(p, L);
        ctx.globalAlpha = 0.4;
        if (p.kind === "couch") ctx.drawImage(glowBar(P.cyan, c.width - 8, 4, 0.7), p.x + 4 - 4, p.y + 24 - 4);
        if (p.kind === "pingpong") ctx.drawImage(glowBar(P.mag, c.width - 4, 4, 0.6), p.x + 2 - 4, p.y + 16 - 4);
        if (p.kind === "tv") ctx.drawImage(glowBar(P.mag, c.width - 18, 4, 0.6), p.x + 10 - 4, p.y + L.tv.h - 4);
      }
    }),
  );
}

/** Faint scanlines over the whole office. */
function scanlines(L: Layout): HTMLCanvasElement {
  return perLayout("scan", L, () =>
    makeCanvas(L.W, L.H, (ctx) => {
      ctx.fillStyle = "rgba(10,0,30,0.07)";
      for (let y = 0; y < L.H; y += 3) ctx.fillRect(0, y, L.W, 1);
    }),
  );
}

export function neonOverlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const t = info.t;
  const night = info.night;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, 0.12 + night * 0.75) * (0.92 + 0.08 * Math.sin(t * 1.1));
  ctx.drawImage(glowMap(L), 0, 0);
  if (night > 0.2) {
    ctx.globalAlpha = night * 0.8;
    for (const c of chasers(L, t)) ctx.drawImage(glowDot(P.cyan, 7, 0.8), c.x - 7, c.y - 7);
  }
  ctx.restore();
  // Rain falls on the open streets (a drizzle hangs there on grey nights too).
  const plan = planOf(L);
  const wet = info.weather === "rain" || info.weather === "storm" || info.weather === "drizzle";
  const mist = !wet && night > 0.5 && (info.weather === "cloudy" || info.weather === "fog");
  if (plan && (wet || mist)) {
    const n = wet ? (info.weather === "storm" ? 5 : 8) : 16;
    ctx.save();
    for (const st of plan.streets) {
      const y0 = st.y - st.half - 4;
      const span = st.half * 2 + 8;
      ctx.fillStyle = "#b8c8ff";
      for (let i = 0; i < L.W / n; i++) {
        const x = (i * 37 + Math.floor(t * 24) + (i % 7) * 11) % L.W;
        const y = y0 + ((i * 13 + Math.floor(t * (wet ? 110 : 50))) % span);
        ctx.globalAlpha = wet ? 0.4 : 0.22;
        ctx.fillRect(x, y, 1, wet ? 3 : 2);
      }
      if (wet) {
        ctx.fillStyle = "#e0e8ff";
        for (let i = 0; i < L.W / 20; i++) {
          const k = hash(`sp${i}:${Math.floor(t * 6)}`);
          ctx.globalAlpha = 0.5;
          ctx.fillRect(k % L.W, y0 + 2 + ((k >> 8) % (span - 4)), 2, 1);
        }
      }
    }
    ctx.restore();
  }
  // Rain on the windows throws moving streaks on the wet floor below them.
  if (info.weather === "rain" || info.weather === "storm" || info.weather === "drizzle") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const win of L.wall.windows) {
      const seg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
      const F = (seg?.depth ?? 64) + 2;
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.5 + i / 6) % 1;
        const sx = win.x + 4 + ((i * 7 + Math.floor(t * 0.5 + i / 6) * 3) % (win.w - 6)) + Math.round(k * 10);
        ctx.globalAlpha = 0.18 * (1 - k) * (0.4 + night * 0.6);
        ctx.fillStyle = i % 2 ? P.mag : P.cyan;
        ctx.fillRect(sx, F + Math.round(k * 30), 1, 4);
      }
    }
    ctx.restore();
  }
  ctx.drawImage(scanlines(L), 0, 0);
}

// ------------------------------------------------------------------ decor

/** Paper lanterns over the noodle bar. */
function lanterns(L: Layout): { x: number; y: number; c: string }[] {
  return perLayout("lanterns", L, () => {
    const out: { x: number; y: number; c: string }[] = [];
    const counter = L.props.find((p) => p.kind === "kitchen-counter");
    if (counter) {
      const w = counter.w ?? 100;
      const xs = w >= 100 ? [counter.x + 50, counter.x + 72] : [counter.x + 50];
      xs.forEach((x, i) => out.push({ x, y: counter.y - 12 + (i % 2) * 2, c: i % 2 ? "#ff8a3d" : "#ff3b5c" }));
    }
    return out;
  });
}

function lanternSprite(c: string): HTMLCanvasElement {
  return cached(`neon|lantern|${c}`, () =>
    makeCanvas(5, 11, (ctx) => {
      ctx.fillStyle = "#3a3458";
      ctx.fillRect(2, 0, 1, 3);
      ctx.fillStyle = "#2a1e2e";
      ctx.fillRect(0, 3, 5, 8);
      ctx.fillStyle = c;
      ctx.fillRect(1, 4, 3, 6);
      ctx.fillRect(0, 5, 5, 4);
      ctx.fillStyle = "#ffd88a";
      ctx.fillRect(2, 5, 1, 4);
      ctx.fillStyle = "#1a1018";
      ctx.fillRect(1, 3, 3, 1);
      ctx.fillRect(1, 10, 3, 1);
    }),
  );
}

/** Free floor for steam vents and a holo emitter. */
function floorBits(L: Layout): { vents: Rect[]; holo: Rect[] } {
  return perLayout("bits", L, () => {
    const fp = floorPlan(L);
    const inside = (r: Rect) =>
      L.rooms.some((m) => m.kind !== "lounge" && r.x + r.w > m.rect.x - 6 && r.x < m.rect.x + m.rect.w + 6 && r.y + r.h > m.rect.y - 12 && r.y < m.rect.y + m.rect.h + 6) ||
      L.pods.some((p) => r.x + r.w > p.x - 8 && r.x < p.x + p.w + 8 && r.y + r.h > p.y - 14 && r.y < p.y + p.h + 6);
    const couch = L.couch;
    const tv = L.tv;
    const nearSeat = (r: Rect) =>
      (r.x + r.w > couch.x - 70 && r.x < couch.x + couch.w + 70 && r.y + r.h > couch.y - 40 && r.y < couch.y + 40) ||
      (r.x + r.w > tv.x - 30 && r.x < tv.x + tv.w + 30 && r.y + r.h > tv.y - 4 && r.y < tv.y + tv.h + 30);
    const spots = fp.find(12, 6, 60).filter((r) => !inside(r) && !nearSeat(r));
    const vents: Rect[] = [];
    const holo: Rect[] = [];
    const pick = (n: number, into: Rect[], off: number) => {
      for (let i = 0; i < n && spots.length > 0; i++) {
        const k = Math.floor(((i + off) * spots.length) / (n + 1.7)) % spots.length;
        const r = spots.splice(k, 1)[0]!;
        into.push(r);
      }
    };
    const plan = planOf(L);
    const main = plan?.streets.find((q) => q.main) ?? plan?.streets[0];
    if (main && main.half >= 12) {
      // Manholes on the street, steaming.
      for (const k of [0.17, 0.5, 0.82]) {
        let x = Math.round(L.W * k);
        while (L.net.aisles.some((ax) => Math.abs(ax - x - 6) < 22)) x += 8;
        vents.push({ x, y: main.y + 6, w: 12, h: 6 });
      }
    } else pick(L.W * L.H > 400000 ? 4 : 3, vents, 0.5);
    const big = fp.find(16, 22, 40).filter((r) => !inside(r) && !nearSeat(r) && !vents.some((v) => Math.abs(v.x - r.x) < 30 && Math.abs(v.y - r.y) < 30));
    if (big.length > 0) holo.push(big[Math.floor(big.length * 0.6)]!);
    return { vents, holo };
  });
}

const ventSprite = () =>
  cached("neon|vent", () => {
    const g = new Grid(12, 6);
    g.ellipse(5.5, 2.5, 5, 2, "#2a2440");
    g.ellipse(5.5, 2.5, 4, 1.4, "#141022");
    for (let x = 3; x < 9; x += 2) g.rect(x, 2, 1, 1, "#4a3a5a");
    g.outline(OUTLINE);
    return g.toCanvas();
  });

/** Street-food carts: noodles, skewers, bubble tea (26×20, base at the bottom). */
function cartSprite(kind: number): HTMLCanvasElement {
  return cached(`neon|cart|${kind}`, () => {
    const g = new Grid(26, 20);
    const awn = [P.red, P.orange, P.cyan][kind]!;
    const awnLo = ["#a81a3a", "#b85a1a", P.cyanLo][kind]!;
    // Poles and a striped awning.
    g.rect(3, 4, 1, 9, "#6a6694").rect(22, 4, 1, 9, "#6a6694");
    g.rect(1, 1, 24, 4, awn);
    for (let x = 1; x < 25; x += 4) g.rect(x, 1, 2, 4, awnLo);
    g.rect(1, 5, 24, 1, awnLo);
    for (let x = 2; x < 25; x += 4) g.set(x, 6, awn);
    // Counter top with goods.
    g.rect(2, 12, 22, 2, "#4a4370");
    if (kind === 0) {
      g.rrect(5, 8, 7, 4, "#8a90b0", 1).rect(6, 8, 5, 1, "#c8cce6");
      g.ellipse(17, 10.5, 2.5, 1.2, P.white).rect(15, 10, 5, 1, "#e0a050");
    } else if (kind === 1) {
      g.rect(5, 10, 15, 2, "#2a1a1a");
      for (let x = 6; x < 19; x += 3) g.rect(x, 8, 1, 3, "#c9a06a").set(x, 9, "#d0602a");
      g.rect(5, 11, 15, 1, P.orange);
    } else {
      for (let x = 6; x < 20; x += 4) g.rect(x, 8, 3, 4, ["#ff9ad6", "#c2fcff", "#d2a8ff", "#ffe08a"][(x >> 2) % 4]!).set(x + 1, 7, "#2a1e2e");
    }
    // Body with a glyph sign, hover jets underneath.
    g.rect(2, 14, 22, 4, "#2a2148");
    g.rect(2, 14, 22, 1, awn);
    glyph(70 + kind).forEach((row, yy) => {
      if (yy < 3) for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") g.set(10 + xx, 15 + yy, awn);
    });
    g.rect(5, 18, 4, 1, P.cyanLo).rect(17, 18, 4, 1, P.cyanLo);
    g.outline(OUTLINE, { skip: [P.cyanLo] });
    return g.toCanvas();
  });
}

/** The doorman's booth by your penthouse: a lit kiosk, someone keeping watch. */
function drawBooth(ctx: CanvasRenderingContext2D, x: number, base: number, t: number): void {
  ctx.drawImage(boothSprite(), x, base - 24);
  // The doorman's visor glints now and then.
  if (Math.floor(t * 0.8) % 5 !== 0) {
    ctx.fillStyle = P.cyan;
    ctx.fillRect(x + 6, base - 15, 4, 1);
  }
}

function boothSprite(): HTMLCanvasElement {
  return cached("neon|booth", () => {
    const g = new Grid(16, 24);
    g.rect(1, 2, 14, 21, "#2a2444");
    g.rect(1, 1, 14, 2, P.mag);
    g.rect(2, 5, 12, 9, "#0e1a2a");
    g.rect(2, 5, 12, 1, P.magLo);
    // The doorman: a head and shoulders in the window.
    g.rrect(5, 7, 6, 5, "#c98a5e", 1).rect(5, 7, 6, 2, "#1a1f30");
    g.rect(4, 12, 8, 2, "#1e2642");
    g.rect(1, 15, 14, 1, "#4c4670");
    g.rect(3, 17, 10, 4, "#1a1530");
    g.rect(5, 18, 6, 1, P.magLo);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A crosswalk signal: walking figure, then a red hand, in turns. */
function drawSignal(ctx: CanvasRenderingContext2D, x: number, base: number, t: number): void {
  const walk = Math.floor(t / 6) % 2 === 0;
  const blink = !walk || Math.floor(t * 2) % 2 === 0 || (t % 6) < 4;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, base - 22, 3, 22);
  ctx.fillStyle = "#4c4670";
  ctx.fillRect(x, base - 21, 1, 21);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 4, base - 28, 9, 9);
  ctx.fillStyle = "#0c0a14";
  ctx.fillRect(x - 3, base - 27, 7, 7);
  if (!blink) return;
  ctx.fillStyle = walk ? P.lime : P.red;
  if (walk) {
    ctx.fillRect(x, base - 26, 1, 1);
    ctx.fillRect(x - 1, base - 25, 3, 2);
    ctx.fillRect(x - 1, base - 23, 1, 2);
    ctx.fillRect(x + 1, base - 23, 1, 2);
  } else {
    ctx.fillRect(x - 1, base - 26, 3, 4);
    ctx.fillRect(x - 2, base - 25, 1, 2);
  }
}

/** A holo billboard floating over the street: an ad loop of glyphs and a koi. */
function drawBillboard(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const w = 44;
  const h = 15;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = P.cyan;
  ctx.fillRect(x + w / 2 - 1, y + h, 2, 8);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#1a0a3a";
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = P.cyan;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  const phase = Math.floor(t / 5) % 3;
  if (phase === 0) {
    drawPixelText(ctx, "NEON", x + 3, y + 5, P.mag);
    const g = glyph(Math.floor(t / 5) % 40);
    ctx.fillStyle = P.yel;
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if (g[yy]![xx] === "#") ctx.fillRect(x + 22 + xx * 2, y + 3 + yy * 2, 2, 2);
  } else if (phase === 1) {
    const fx = x + 6 + Math.floor((t * 8) % (w - 14));
    ctx.fillStyle = P.orange;
    ctx.fillRect(fx, y + 6, 6, 3);
    ctx.fillRect(fx + 1, y + 5, 3, 1);
    ctx.fillRect(fx - 2, y + 5 + (Math.floor(t * 5) % 2), 2, 3);
    ctx.fillStyle = P.white;
    ctx.fillRect(fx + 2, y + 6, 1, 1);
    drawPixelText(ctx, "KOI", x + w - 14, y + 2, P.cyanHi);
  } else {
    for (let i = 0; i < w - 4; i += 3) {
      ctx.fillStyle = (Math.floor(i / 3 + t * 6) % 4) < 2 ? P.mag : P.vio;
      ctx.fillRect(x + 2 + i, y + 3 + Math.round(Math.sin(t * 3 + i * 0.4) * 2) + 3, 2, 3);
    }
  }
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y + (Math.floor(t * 9) % h), w, 1);
  ctx.restore();
}

/** An AC unit on the back of a building, dripping into the alley. */
function drawAc(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.drawImage(acSprite(), x - 7, y - 12);
  const ph = (t * 0.9 + x * 0.013) % 1;
  ctx.fillStyle = "rgba(160,200,255,0.8)";
  ctx.fillRect(x + 5, Math.round(y - 2 + ph * 14), 1, 2);
  // The fan turns.
  ctx.fillStyle = Math.floor(t * 10) % 2 ? "#6a6694" : "#4c4670";
  ctx.fillRect(x - 4, y - 8, 1, 3);
  ctx.fillRect(x - 5, y - 7, 3, 1);
}

function acSprite(): HTMLCanvasElement {
  return cached("neon|ac", () => {
    const g = new Grid(15, 12);
    g.rect(1, 1, 13, 9, "#5a5486");
    g.rect(1, 1, 13, 1, "#7a74a8");
    g.ellipse(3.5, 5.5, 2.5, 2.5, "#2a2444");
    for (let y = 3; y < 9; y += 2) g.rect(8, y, 5, 1, "#3a3458");
    g.rect(11, 10, 1, 2, "#6a6694");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A dumpster in the alley, a stray cat curled on its lid. */
function drawDumpster(ctx: CanvasRenderingContext2D, x: number, base: number, t: number): void {
  ctx.drawImage(dumpsterSprite(), x, base - 16);
  const blink = Math.floor(t * 0.7) % 6 === 0;
  ctx.drawImage(strayCat(blink), x + 6, base - 22);
  // A flyer of steam from the grate beside it.
  const ph = (t * 0.4) % 1;
  ctx.globalAlpha = 0.3 * (1 - ph);
  ctx.fillStyle = "#e8e4ff";
  ctx.fillRect(Math.round(x + 24 + Math.sin(t * 2) * 1.5), Math.round(base - 4 - ph * 12), 2, 2);
  ctx.globalAlpha = 1;
}

function dumpsterSprite(): HTMLCanvasElement {
  return cached("neon|dumpster", () => {
    const g = new Grid(24, 16);
    g.rect(1, 3, 22, 11, "#2f5a4a");
    g.rect(1, 2, 22, 2, "#3f7a62");
    g.rect(1, 1, 22, 1, "#2a4a3e");
    for (let x = 4; x < 22; x += 5) g.rect(x, 6, 1, 6, "#24463a");
    g.rect(3, 8, 6, 2, P.yel);
    g.rect(3, 14, 2, 1, "#1a1a24").rect(19, 14, 2, 1, "#1a1a24");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function strayCat(blink: boolean): HTMLCanvasElement {
  return cached(`neon|stray|${blink}`, () => {
    const g = new Grid(13, 8);
    g.rrect(1, 3, 9, 4, "#3a3a4a", 2);
    g.rrect(7, 1, 5, 4, "#3a3a4a", 1);
    g.set(7, 0, "#3a3a4a").set(11, 0, "#3a3a4a");
    if (!blink) g.set(8, 2, P.lime).set(10, 2, P.lime);
    else g.set(8, 3, "#1a1a24").set(10, 3, "#1a1a24");
    g.rect(0, 5, 2, 1, "#3a3a4a");
    g.outline(OUTLINE, { skip: [P.lime] });
    return g.toCanvas();
  });
}

/** A sandwich board on the sidewalk with the shop's name in neon (glyphs if it's long). */
function aframeSprite(text: string, color: string): HTMLCanvasElement {
  return cached(`neon|aframe|${text}|${color}`, () => {
    const word = text.replace(" ", "");
    const w = Math.max(14, word.length * 4 + 5);
    const c = makeCanvas(w + 2, 14, (ctx) => {
      const g = new Grid(w + 2, 14);
      g.rect(1, 1, w, 9, "#14101f");
      g.rect(1, 1, w, 1, color);
      g.line(2, 10, 1, 12, "#4c4670").line(w - 1, 10, w, 12, "#4c4670");
      g.outline(OUTLINE);
      ctx.drawImage(g.toCanvas(), 0, 0);
      drawPixelText(ctx, word, 3, 4, color);
    });
    return c;
  });
}

/** A hover-bike parked by the curb. */
function bikeSprite(): HTMLCanvasElement {
  return cached("neon|bike", () => {
    const g = new Grid(26, 13);
    g.rrect(2, 4, 20, 5, "#2a2444", 2);
    g.rrect(4, 2, 10, 4, P.mag, 2);
    g.rect(5, 3, 6, 1, P.magHi);
    g.rect(15, 3, 6, 2, "#4c4670").rect(19, 1, 2, 3, "#6a6694");
    g.rect(21, 5, 2, 2, P.cyanHi);
    g.rect(1, 6, 2, 2, P.red);
    g.rect(4, 10, 6, 1, P.cyan).rect(14, 10, 6, 1, P.cyan);
    g.outline(OUTLINE, { skip: [P.cyan] });
    return g.toCanvas();
  });
}

/** Lanterns strung across the street (overhead: drawn over everyone). */
function drawLanternString(ctx: CanvasRenderingContext2D, s: { x: number; y0: number; y1: number; lean: number }, t: number, i: number): void {
  const n = 12;
  ctx.fillStyle = "#0c0a14";
  for (let k = 0; k <= n; k++) {
    const f = k / n;
    const sag = Math.sin(f * Math.PI) * 5;
    ctx.fillRect(Math.round(s.x + s.lean * f + sag), Math.round(s.y0 + (s.y1 - s.y0) * f), 1, 2);
  }
  const colors = ["#ff3b5c", "#ff8a3d", "#ff2fa8", "#ffd23f"];
  for (let k = 1; k <= 3; k++) {
    const f = k / 4;
    const sag = Math.sin(f * Math.PI) * 5;
    const sway = Math.round(Math.sin(t * 1.3 + i + k) * 0.6);
    ctx.drawImage(lanternSprite(colors[(i + k) % colors.length]!), Math.round(s.x + s.lean * f + sag - 2 + sway), Math.round(s.y0 + (s.y1 - s.y0) * f));
  }
}

const emitterSprite = () =>
  cached("neon|emitter", () => {
    const g = new Grid(12, 6);
    g.ellipse(5.5, 2.5, 5, 2, "#3d3660");
    g.ellipse(5.5, 2.5, 3.5, 1.2, P.cyanLo);
    g.ellipse(5.5, 2.5, 1.5, 0.6, P.cyanHi);
    g.outline(OUTLINE);
    return g.toCanvas();
  });

/** A small hologram: a koi swimming round in a cone of light. */
function drawHolo(ctx: CanvasRenderingContext2D, cx: number, base: number, t: number): void {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = P.cyan;
  ctx.beginPath();
  ctx.moveTo(cx - 1, base);
  ctx.lineTo(cx - 7, base - 18);
  ctx.lineTo(cx + 8, base - 18);
  ctx.lineTo(cx + 2, base);
  ctx.closePath();
  ctx.fill();
  const a = t * 1.3;
  const fx = Math.round(cx + Math.cos(a) * 5);
  const fy = Math.round(base - 13 + Math.sin(a) * 2);
  const dir = Math.sin(a) > 0 ? -1 : 1;
  ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t * 9);
  ctx.fillStyle = P.cyanHi;
  ctx.fillRect(fx - 2, fy, 5, 2);
  ctx.fillStyle = P.cyan;
  ctx.fillRect(dir > 0 ? fx - 4 : fx + 3, fy - 1 + (Math.floor(t * 4) % 2), 2, 2);
  ctx.fillStyle = P.mag;
  ctx.fillRect(dir > 0 ? fx + 1 : fx - 2, fy, 1, 1);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = P.cyanHi;
  ctx.fillRect(cx - 6, base - 18 + (Math.floor(t * 10) % 18), 13, 1);
  ctx.restore();
}

/** Now and then a little drone hums down the main hallway. */
function drawDrone(ctx: CanvasRenderingContext2D, L: Layout, t: number, shadow: boolean): void {
  const period = 50;
  const k = (t % period) / 16;
  if (k >= 1) return;
  const lap = Math.floor(t / period);
  const hy = L.net.halls[lap % Math.max(1, L.net.halls.length)] ?? L.H / 2;
  const x = lap % 2 ? L.W + 20 - k * (L.W + 40) : -20 + k * (L.W + 40);
  const y = hy - 26 + Math.sin(t * 3) * 1.5;
  if (shadow) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(Math.round(x - 3), hy, 7, 1);
    return;
  }
  const px = Math.round(x);
  const py = Math.round(y);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(px - 4, py - 1, 9, 4);
  ctx.fillStyle = "#4c4670";
  ctx.fillRect(px - 3, py, 7, 2);
  ctx.fillStyle = Math.floor(t * 4) % 2 ? P.red : "#5a1020";
  ctx.fillRect(px - 3, py + 1, 1, 1);
  ctx.fillStyle = P.lime;
  ctx.fillRect(px + 3, py + 1, 1, 1);
  // Spinning rotors.
  ctx.fillStyle = "rgba(220,220,255,0.6)";
  const r = Math.floor(t * 20) % 2;
  ctx.fillRect(px - 5 + r, py - 2, 3 - r, 1);
  ctx.fillRect(px + 3, py - 2, 3 - r, 1);
  ctx.fillStyle = P.cyan;
  ctx.fillRect(px, py + 3, 1, 1);
}

export function neonDecor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const out: Drawable[] = [];
  const t = info.t;
  const bits = floorBits(L);
  for (const v of bits.vents) {
    out.push({
      z: v.y + 3,
      draw: () => {
        ctx.drawImage(ventSprite(), v.x, v.y);
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.35 + k / 4 + v.x * 0.01) % 1;
          ctx.globalAlpha = 0.32 * (1 - ph);
          ctx.fillStyle = "#d8d0f0";
          ctx.fillRect(Math.round(v.x + 3 + k * 2 + Math.sin(t * 1.5 + k) * 2), Math.round(v.y + 1 - ph * 18), 2, 2);
        }
        ctx.globalAlpha = 1;
      },
    });
  }
  for (const h of bits.holo) {
    const cx = h.x + 8;
    const base = h.y + 19;
    out.push({
      z: base + 2,
      draw: () => {
        ctx.drawImage(emitterSprite(), cx - 6, base - 3);
        drawHolo(ctx, cx, base - 2, t);
      },
    });
  }
  const plan = planOf(L);
  for (const bit of plan?.bits ?? []) {
    switch (bit.kind) {
      case "booth":
        out.push({ z: bit.y, draw: () => drawBooth(ctx, bit.x, bit.y, t) });
        break;
      case "signal":
        out.push({ z: bit.y, draw: () => drawSignal(ctx, bit.x, bit.y, t) });
        break;
      case "billboard":
        out.push({ z: 2e5, draw: () => drawBillboard(ctx, bit.x, bit.y, t) });
        break;
      case "ac":
        out.push({ z: bit.y - 1, draw: () => drawAc(ctx, bit.x, bit.y, t) });
        break;
      case "dumpster":
        out.push({ z: bit.y, draw: () => drawDumpster(ctx, bit.x, bit.y, t) });
        break;
      case "bike":
        out.push({ z: bit.y, draw: () => ctx.drawImage(bikeSprite(), bit.x, bit.y - 12) });
        break;
      case "aframe":
        out.push({ z: bit.y, draw: () => ctx.drawImage(aframeSprite(bit.text ?? "OPEN", bit.color ?? P.cyan), bit.x, bit.y - 13) });
        break;
    }
  }
  if (plan) {
    plan.lanterns.forEach((s, i) => out.push({ z: 1e5 + i, draw: () => drawLanternString(ctx, s, t, i) }));
    for (const c of plan.carts) {
      out.push({
        z: c.y,
        draw: () => {
          const bob = Math.round(Math.sin(t * 2 + c.x) * 0.5);
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(c.x + 4, c.y - 1, 18, 2);
          ctx.drawImage(cartSprite(c.kind), c.x, c.y - 21 + bob);
          if (c.kind !== 2) {
            for (let k = 0; k < 3; k++) {
              const ph = (t * 0.5 + k / 3 + c.x * 0.01) % 1;
              ctx.globalAlpha = 0.45 * (1 - ph);
              ctx.fillStyle = c.kind === 1 ? "#ffb070" : "#e8e4ff";
              ctx.fillRect(Math.round(c.x + 8 + k * 2 + Math.sin(t * 2 + k) * 1.5), Math.round(c.y - 14 - ph * 12), 1, 2);
            }
            ctx.globalAlpha = 1;
          }
        },
      });
    }
  }
  out.push({ z: 0.5, draw: () => drawDrone(ctx, L, t, true) });
  out.push({ z: 1e6, draw: () => drawDrone(ctx, L, t, false) });
  const counter = L.props.find((p) => p.kind === "kitchen-counter");
  for (const lt of lanterns(L)) {
    const sway = Math.round(Math.sin(t * 1.2 + lt.x) * 0.6);
    out.push({ z: (counter?.z ?? lt.y) + 0.2, draw: () => ctx.drawImage(lanternSprite(lt.c), lt.x + sway, lt.y) });
  }
  // Steam curling off the noodle bowls.
  for (const p of L.props) {
    if (p.kind !== "kitchen-island") continue;
    const w = p.w ?? 72;
    const bowls = [p.x + 20, p.x + w - 14, p.x + w - 24];
    out.push({
      z: p.z + 0.1,
      draw: () => {
        bowls.forEach((bx, i) => {
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.45 + k / 3 + i * 0.27) % 1;
            ctx.globalAlpha = 0.5 * (1 - ph);
            ctx.fillStyle = "#e8e4ff";
            ctx.fillRect(Math.round(bx + Math.sin(t * 2 + k + i) * 1.5), Math.round(p.y + 4 - ph * 9), 1, 2);
          }
        });
        ctx.globalAlpha = 1;
      },
    });
  }
  return out;
}

/** The steel door slid open: two panels tucked into the frame, a lit corridor beyond. */
export function neonDoorOpen(ctx: CanvasRenderingContext2D, d: Rect, info: PaintInfo): boolean {
  const { x, y, w, h } = d;
  ctx.fillStyle = "#0a0816";
  ctx.fillRect(x, y + 1, w, h - 1);
  // The corridor: floor lines running away, a cyan glow at the far end.
  ctx.fillStyle = "#16122a";
  ctx.fillRect(x + 3, y + 6, w - 6, h - 8);
  ctx.fillStyle = P.cyanDim;
  ctx.fillRect(x + 5, y + 8, w - 10, 3);
  ctx.fillStyle = P.cyan;
  ctx.fillRect(x + 6, y + 9, w - 12, 1);
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = k % 2 ? "#221c3a" : "#2a2448";
    ctx.fillRect(x + 3, y + 14 + k * 7, w - 6, 1);
  }
  // The two panels, slid into the walls.
  ctx.fillStyle = "#3a3458";
  ctx.fillRect(x, y + 1, 3, h - 1);
  ctx.fillRect(x + w - 3, y + 1, 3, h - 1);
  ctx.fillStyle = "#5a5486";
  ctx.fillRect(x, y + 1, 1, h - 1);
  ctx.fillRect(x + w - 1, y + 1, 1, h - 1);
  // A scan line sweeps whoever walks through.
  ctx.fillStyle = "rgba(46,242,255,0.55)";
  ctx.fillRect(x + 3, y + 4 + Math.floor((info.t * 30) % (h - 6)), w - 6, 1);
  return true;
}
