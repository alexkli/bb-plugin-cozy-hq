// Mountain Cabin: the live layers. The fire crackling in the firebox and its
// glow on the rug, cool snow light through the windows, warm fairy lights
// along the beam, snow settling on the sills and the deck, the chairlift
// running up the piste with skiers coming down, weather over the deck and
// the slope, and the lights at night: firelight, candles, the sauna window.
import type { WeatherKind } from "../../../contract.ts";
import type { Drawable, Light, PaintInfo, WallLightsInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, makeCanvas, OUTLINE } from "../../themekit.ts";
import { C, h2 } from "./kit.ts";
import { planOf, type CabinPlan } from "./plan.ts";
import { bindView } from "./view.ts";
import { bootRack, deckChair, lantern, saunaHut, skiRack, skiWall, snowman, telescope, toolStand, waxBench, woodpile } from "./outdoor.ts";
import { clickDecor, clickLights, clickOverlay, clickUnderlay, fireBoost } from "./clicks.ts";

type Ctx = CanvasRenderingContext2D;

const rainy = (w: WeatherKind) => w === "rain" || w === "storm" || w === "drizzle";

// ------------------------------------------------------------------ settling snow

/** How much snow lies on the deck and the sills, 0..1, easing in and out as the weather turns. */
let snow = -1;
let lastT = -1;

function settle(info: PaintInfo): void {
  const dt = lastT < 0 ? 0 : Math.min(1, Math.max(0, info.t - lastT));
  lastT = info.t;
  const s = info.weather === "snow";
  snow = snow < 0 ? (s ? 1 : 0) : Math.min(1, Math.max(0, snow + (s ? dt / 50 : -dt / 240)));
}

export function snowLevel(): number {
  return Math.max(0, snow);
}

/** Fresh snow on the deck: soft drifts, thickest by the rail and the walls, the middle swept by the plow bot. */
function deckSnow(L: Layout, p: CabinPlan): HTMLCanvasElement | null {
  const d = p.deck;
  if (!d) return null;
  return cached(`cabin|decksnow|${L.W}x${L.H}|${d.x},${d.y},${d.w},${d.h}`, () =>
    makeCanvas(d.w, d.h, (ctx) => {
      const ev = L.eventArea;
      for (let y = 0; y < d.h; y++) {
        for (let x = 0; x < d.w; x++) {
          const ax = d.x + x;
          const ay = d.y + y;
          const edge = p.deckSide === "east" ? Math.min(x, d.w - x) : Math.min(y, d.h - y);
          // The plow bot keeps the middle mostly clear, with soft ragged edges.
          const inside = Math.min(ax - ev.x, ev.x + ev.w - ax, ay - ev.y, ev.y + ev.h - ay);
          const swept = Math.max(0, Math.min(1, (inside + 4) / 10));
          const n = h2(x >> 2, y >> 2) * 0.6 + h2(x >> 1, (y >> 1) + 50) * 0.4;
          const k = (edge < 8 ? 0.9 : 0.66 - swept * 0.34) - n * 0.35;
          if (k <= 0.2) continue;
          ctx.fillStyle = k > 0.55 ? C.snow : k > 0.35 ? "#e8eff7" : C.snowShade;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );
}

// ------------------------------------------------------------------ the fire

function drawFire(ctx: Ctx, box: Rect, t: number, boost: number): void {
  const bx = box.x;
  const base = box.y + box.h - 3;
  const w = box.w;
  // Logs on the grate.
  ctx.fillStyle = "#3a2216";
  ctx.fillRect(bx + 6, base - 3, w - 12, 3);
  ctx.fillStyle = "#5a3620";
  ctx.fillRect(bx + 8, base - 5, Math.round(w * 0.45), 2);
  ctx.fillRect(bx + w - 8 - Math.round(w * 0.4), base - 4, Math.round(w * 0.4), 2);
  // Embers breathing.
  for (let i = 0; i < w - 12; i += 2) {
    const k = Math.sin(t * 3 + i * 0.9) + Math.sin(t * 5.3 + i * 0.4);
    ctx.fillStyle = k > 0.8 ? "#ffcf5a" : k > -0.2 ? "#f07a2a" : "#b8321e";
    ctx.fillRect(bx + 6 + i, base - 1, 2, 1);
  }
  // Flames: tongues that lick up and flicker; a bigger fire when it's been stoked.
  const n = Math.max(3, Math.round(w / 9));
  const hmax = box.h - 5;
  for (let i = 0; i < n; i++) {
    const cx = bx + 7 + Math.round((i * (w - 14)) / Math.max(1, n - 1));
    const hh = Math.min(hmax, Math.round((7 + 3 * Math.sin(t * 7 + i * 1.7) + 2.5 * Math.sin(t * 11.3 + i * 2.9)) * (1 + boost * 0.7) * (i === 0 || i === n - 1 ? 0.7 : 1)));
    for (let j = 0; j < hh; j++) {
      const k = j / Math.max(1, hh);
      const half = Math.max(0, Math.round((1 - k) * 2.6 + Math.sin(t * 9 + j + i) * 0.4));
      const sway = Math.round(Math.sin(t * 6 + j * 0.5 + i) * k * 1.6);
      const y = base - 3 - j;
      ctx.fillStyle = C.fire3;
      ctx.fillRect(cx - half - 1 + sway, y, half * 2 + 3, 1);
      if (k < 0.75) {
        ctx.fillStyle = C.fire2;
        ctx.fillRect(cx - half + sway, y, half * 2 + 1, 1);
      }
      if (k < 0.4) {
        ctx.fillStyle = C.fire1;
        ctx.fillRect(cx - Math.max(0, half - 1) + sway, y, Math.max(1, half * 2 - 1), 1);
      }
    }
  }
  // Sparks up the flue.
  ctx.fillStyle = "#ffd77a";
  for (let i = 0; i < 3 + Math.round(boost * 6); i++) {
    const ph = (t * (0.8 + (i % 3) * 0.3) + i * 0.37) % 1;
    const sy = base - 6 - ph * (box.h - 4);
    if (sy < box.y + 2) continue;
    ctx.fillRect(Math.round(bx + 8 + ((i * 13) % (w - 16)) + Math.sin(t * 4 + i) * 2), Math.round(sy), 1, 1);
  }
}

/** A warm pool of firelight on the hearth and the rug (flickering). */
function fireGlow(): HTMLCanvasElement {
  return cached("cabin|fireglow", () =>
    makeCanvas(160, 70, (ctx) => {
      const g = ctx.createRadialGradient(80, 6, 2, 80, 6, 80);
      g.addColorStop(0, "rgba(255,170,80,0.5)");
      g.addColorStop(0.45, "rgba(255,140,60,0.16)");
      g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 160, 70);
    }),
  );
}

/** Cool daylight from a window laid across the floor below it. */
function windowLight(w: number): HTMLCanvasElement {
  return cached(`cabin|winlight|${w}`, () =>
    makeCanvas(w + 40, 54, (ctx) => {
      for (let y = 0; y < 54; y++) {
        const a = 0.13 * (1 - y / 54);
        ctx.fillStyle = `rgba(226,240,255,${a.toFixed(3)})`;
        ctx.fillRect(Math.round(y * 0.6) + 4, y, w - 6, 1);
      }
    }),
  );
}

// ------------------------------------------------------------------ the slope

function liftX(s: Rect): number {
  return s.x + Math.round(s.w * 0.42);
}

const JACKETS = ["#e0453a", "#f2c230", "#3a8ad8", "#e86aa8", "#4fbf7a", "#f08a3a", "#8a5ad8"];

/** A chair on the lift: a bar from the cable, a bench, maybe riders in bright jackets. */
function chair(ctx: Ctx, x: number, y: number, riders: number, seed: number, vertical: boolean): void {
  ctx.fillStyle = "#3a3d46";
  if (vertical) {
    ctx.fillRect(x, y, 1, 4);
    ctx.fillRect(x - 3, y + 4, 7, 2);
  } else {
    ctx.fillRect(x, y, 1, 3);
    ctx.fillRect(x - 3, y + 3, 7, 2);
  }
  for (let i = 0; i < riders; i++) {
    const rx = x - 2 + i * 3;
    const ry = y + (vertical ? 1 : 0);
    ctx.fillStyle = JACKETS[(seed + i * 3) % JACKETS.length]!;
    ctx.fillRect(rx, ry + 1, 2, 3);
    ctx.fillStyle = "#f2c9a0";
    ctx.fillRect(rx, ry, 2, 1);
    ctx.fillStyle = JACKETS[(seed + i * 5 + 2) % JACKETS.length]!;
    ctx.fillRect(rx, ry - 1, 2, 1);
  }
}

/** A skier coming down: jacket, helmet, skis, poles; `dir` −1/1 for the way they're carving. */
export function bigSkier(ctx: Ctx, x: number, y: number, seed: number, dir: number, vertical: boolean): void {
  const X = Math.round(x);
  const Y = Math.round(y);
  const jacket = JACKETS[seed % JACKETS.length]!;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(X - 1, Y - 7, 4, 8);
  ctx.fillStyle = jacket;
  ctx.fillRect(X, Y - 5, 2, 3);
  ctx.fillStyle = "#2a2c36";
  ctx.fillRect(X, Y - 2, 2, 2);
  ctx.fillStyle = JACKETS[(seed + 3) % JACKETS.length]!;
  ctx.fillRect(X, Y - 7, 2, 2);
  ctx.fillStyle = "#3a3d46";
  if (vertical) {
    ctx.fillRect(X - 1 + dir, Y, 1, 3);
    ctx.fillRect(X + 2 + dir, Y, 1, 3);
  } else {
    ctx.fillRect(X - 2, Y, 6, 1);
  }
  ctx.fillStyle = "#8d949e";
  ctx.fillRect(X - 2, Y - 4, 1, 4);
  ctx.fillRect(X + 3, Y - 4, 1, 4);
}

function slopeLife(ctx: Ctx, p: CabinPlan, info: PaintInfo): void {
  const s = p.slope;
  if (!s) return;
  const t = info.t;
  const east = p.deckSide === "east";
  ctx.save();
  ctx.beginPath();
  ctx.rect(s.x, s.y, s.w, s.h);
  ctx.clip();
  if (east) {
    const lx = liftX(s);
    ctx.fillStyle = "#3a3d46";
    ctx.fillRect(lx - 6, s.y, 1, s.h);
    ctx.fillRect(lx + 4, s.y, 1, s.h);
    // Up on the right, down on the left.
    const gap = 38;
    const run = info.night > 0.85 ? 0 : t * 9;
    for (let y = s.y - gap + (run % gap); y < s.y + s.h + gap; y += gap) {
      const n = Math.floor((y - run) / gap);
      chair(ctx, lx + 4, Math.round(s.y + s.h - (y - s.y)), info.night > 0.6 ? 0 : (n * 7) % 3, Math.abs(n), true);
      chair(ctx, lx - 6, Math.round(y - 12), 0, 0, true);
    }
    // Skiers carving down the piste.
    if (info.night < 0.5 && info.weather !== "storm") {
      for (let i = 0; i < 3; i++) {
        const period = (s.h + 40) / (22 + i * 6);
        const ph = ((t + i * 5.3) % period) / period;
        const y = s.y - 20 + ph * (s.h + 40);
        const sw = Math.sin(ph * Math.PI * 2 * (s.h / 70) + i);
        const x = s.x + 4 + (s.w - 8) * (0.5 + sw * 0.45);
        // Their tracks behind them.
        ctx.fillStyle = "#dfe8f2";
        for (let k = 1; k < 8; k++) {
          const py = y - k * 3;
          const pq = (py - (s.y - 20)) / (s.h + 40);
          const px = s.x + 4 + (s.w - 8) * (0.5 + Math.sin(pq * Math.PI * 2 * (s.h / 70) + i) * 0.45);
          ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        }
        bigSkier(ctx, x, y, i + Math.floor(t / period), Math.cos(ph * Math.PI * 2 * (s.h / 70) + i) > 0 ? 1 : -1, true);
      }
    }
  } else {
    const ly = s.y + Math.round(s.h * 0.3);
    ctx.fillStyle = "#3a3d46";
    ctx.fillRect(s.x, ly, s.w, 1);
    ctx.fillRect(s.x, ly + 6, s.w, 1);
    for (let x = s.x + 40; x < s.x + s.w; x += 110) {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 1, ly - 2, 3, s.h);
      ctx.fillStyle = "#8d949e";
      ctx.fillRect(x, ly - 2, 1, s.h - 1);
    }
    const gap = 40;
    const run = info.night > 0.85 ? 0 : t * 9;
    for (let x = s.x - gap + (run % gap); x < s.x + s.w + gap; x += gap) {
      const n = Math.floor((x - run) / gap);
      chair(ctx, Math.round(x), ly + 1, info.night > 0.6 ? 0 : (n * 7) % 3, Math.abs(n), false);
      chair(ctx, Math.round(s.x + s.w - (x - s.x)), ly + 7, 0, 0, false);
    }
    if (info.night < 0.5 && info.weather !== "storm") {
      for (let i = 0; i < 2; i++) {
        const period = (s.w + 40) / (26 + i * 8);
        const ph = ((t + i * 7.1) % period) / period;
        const x = s.x - 20 + ph * (s.w + 40);
        const y = s.y + s.h - 2 - Math.abs(Math.sin(ph * 14 + i)) * 4;
        bigSkier(ctx, i ? s.x + s.w - (x - s.x) : x, y, i + 2, i ? -1 : 1, false);
      }
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ hooks

export function underlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  bindView(L);
  settle(info);
  const p = planOf(L);
  if (!p) return;
  const t = info.t;
  // Cool snow light through the windows on bright days.
  if (info.night < 0.5 && (info.weather === "clear" || info.weather === "partly")) {
    ctx.globalAlpha = 1 - info.night * 2;
    for (const w of L.wall.windows) {
      if (p.open && w.x === p.open.x) continue;
      const seg = L.segments.find((s) => w.x >= s.x0 && w.x < s.x1);
      ctx.drawImage(windowLight(w.w), w.x, seg?.depth ?? w.y + w.h + 14);
    }
    ctx.globalAlpha = 1;
  }
  // The fire, and its glow on the hearth and the rug.
  const boost = fireBoost(t);
  drawFire(ctx, p.fire.box, t, boost);
  const f = p.fire.box;
  const flick = 0.75 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 2.1) * 0.1 + boost * 0.3;
  ctx.globalAlpha = Math.min(1, flick * (0.55 + info.night * 0.5));
  ctx.drawImage(fireGlow(), f.x + f.w / 2 - 80, f.y + f.h - 4);
  ctx.globalAlpha = 1;
  // Snow settles on the outer sills, and on the deck.
  const lvl = snowLevel();
  if (lvl > 0.05) {
    ctx.fillStyle = C.snow;
    for (const w of L.wall.windows) {
      if (p.open && w.x === p.open.x) continue;
      const hgt = 1 + Math.round(lvl * 3);
      for (let x = 0; x < w.w; x += 3) {
        const bump = Math.round(Math.sin(x * 0.7 + w.x) * 0.8 + (x < 3 || x > w.w - 4 ? 1 : 0));
        ctx.fillRect(w.x + x, w.y + w.h - hgt - bump, 3, hgt + bump);
      }
    }
    const mask = deckSnow(L, p);
    if (mask && p.deck) {
      ctx.globalAlpha = lvl;
      ctx.drawImage(mask, p.deck.x, p.deck.y);
      ctx.globalAlpha = 1;
    }
  }
  // Puddles of meltwater under the mudroom benches, and a drip from the boots.
  const rack = p.bootRack;
  if (rack) {
    ctx.fillStyle = "rgba(160,190,220,0.35)";
    ctx.fillRect(rack.x + 4, rack.y + rack.h - 1, rack.w - 8, 3);
    const ph = (t * 0.7) % 1;
    ctx.fillStyle = "#cfe6f5";
    ctx.fillRect(rack.x + 12, Math.round(rack.y + 6 + ph * 7), 1, 1);
  }
  slopeLife(ctx, p, info);
  clickUnderlay(ctx, L, info);
}

export function decor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const p = planOf(L);
  if (!p) return [];
  const out: Drawable[] = [];
  const wp = p.woodpile;
  out.push({ z: wp.y + wp.h, draw: () => ctx.drawImage(woodpile(wp.w), wp.x, wp.y) });
  const box = p.fire.box;
  out.push({ z: box.y + box.h + 4, draw: () => ctx.drawImage(toolStand(), box.x + box.w + 6, box.y + box.h - 18) });
  if (p.sauna) {
    const s = p.sauna;
    out.push({ z: s.y + s.h, draw: () => ctx.drawImage(saunaHut(s.w, snowLevel() > 0.4), s.x, s.y + s.h - saunaHut(s.w, false).height) });
  }
  for (const c of p.chairs) out.push({ z: c.y - 3, draw: () => ctx.drawImage(deckChair(snowLevel() > 0.6), c.x - 10, c.y - 12) });
  if (p.skiRack) {
    const r = p.skiRack;
    const sk = skiRack(p.deckSide === "south");
    out.push({ z: r.y + r.h, draw: () => ctx.drawImage(sk, r.x, r.y + r.h - sk.height) });
  }
  if (p.snowman && snowLevel() > 0.5) {
    const s = p.snowman;
    out.push({ z: s.y, draw: () => ctx.drawImage(snowman(), s.x - 8, s.y - 21) });
  }
  // Lanterns by the doors out to the deck.
  const w = p.deckWall;
  if (w) {
    const lit = info.night > 0.35;
    for (const [a, z] of w.gaps) {
      if (w.x0 === w.x1) out.push({ z: a, draw: () => ctx.drawImage(lantern(lit), w.x0 + 6, a - 14) });
      else out.push({ z: w.y0 + 2, draw: () => ctx.drawImage(lantern(lit), z + 3, w.y0 - 12) });
    }
  }
  if (p.skiWall) {
    const r = p.skiWall;
    out.push({ z: r.y + r.h, draw: () => ctx.drawImage(skiWall(r.w), r.x, r.y) });
  }
  if (p.wax) {
    const r = p.wax;
    out.push({ z: r.y + r.h, draw: () => ctx.drawImage(waxBench(), r.x, r.y - 2) });
  }
  if (p.bootRack) {
    const r = p.bootRack;
    out.push({ z: r.y + r.h - 2, draw: () => ctx.drawImage(bootRack(r.w), r.x, r.y) });
  }
  if (p.telescope) {
    const s = p.telescope;
    out.push({ z: s.y, draw: () => ctx.drawImage(telescope(), s.x - 7, s.y - 26) });
  }
  out.push(...clickDecor(ctx, L, info));
  return out;
}

export function overlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const p = planOf(L);
  if (!p) return;
  const t = info.t;
  const wx = info.weather;
  // Weather over the deck and the piste (the windows get theirs from the office).
  const out: Rect[] = [];
  if (p.deck && p.slope) {
    if (p.deckSide === "east") out.push({ x: p.deck.x - 2, y: p.deck.y, w: L.W - p.deck.x + 2, h: L.H - p.deck.y });
    else out.push({ x: 0, y: p.deck.y, w: L.W, h: L.H - p.deck.y });
  }
  for (const r of out) {
    if (wx === "snow" || wx === "storm") {
      const storm = wx === "storm";
      ctx.fillStyle = "#ffffff";
      const n = Math.round((r.w * r.h) / (storm ? 90 : 160));
      for (let i = 0; i < n; i++) {
        const sp = 10 + (i % 5) * 3;
        const fx = r.x + ((((i * 53 + Math.round(Math.sin(t * 0.9 + i) * 3) + (storm ? Math.floor(t * 30) : 0)) % r.w) + r.w) % r.w);
        const fy = r.y + ((i * 31 + Math.floor(t * sp)) % r.h);
        ctx.fillRect(fx, fy, i % 7 === 0 ? 2 : 1, 1);
      }
    } else if (rainy(wx)) {
      ctx.fillStyle = "rgba(210,228,250,0.7)";
      const n = Math.round((r.w * r.h) / (wx === "drizzle" ? 260 : 120));
      for (let i = 0; i < n; i++) {
        const fx = r.x + ((i * 47) % r.w);
        const fy = r.y + ((i * 29 + Math.floor(t * 80)) % r.h);
        ctx.fillRect(fx, fy, 1, wx === "drizzle" ? 1 : 3);
      }
    } else if (wx === "fog") {
      ctx.fillStyle = info.night > 0.5 ? "rgba(120,128,150,0.4)" : "rgba(228,234,242,0.5)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = info.night > 0.5 ? "rgba(150,156,176,0.25)" : "rgba(246,248,252,0.45)";
      for (let i = 0; i < 4; i++) ctx.fillRect(r.x + ((Math.floor(t * 3) + i * 23) % (r.w + 30)) - 30, r.y + 20 + i * 37, 34, 4);
    }
  }
  // Smoke from the sauna's stovepipe.
  if (p.sauna) {
    const s = p.sauna;
    const px = s.x + s.w - 9;
    const py = s.y + s.h - saunaHut(s.w, false).height - 2;
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.25 + i / 4) % 1;
      ctx.fillStyle = `rgba(230,234,240,${(0.5 * (1 - ph)).toFixed(3)})`;
      const r = 1 + Math.round(ph * 3);
      ctx.fillRect(Math.round(px + Math.sin(t + i) * 2 + ph * 6), Math.round(py - ph * 22), r, r);
    }
  }
  clickOverlay(ctx, L, info);
}

/** Fairy lights along the beam: warm white, a few drops hanging down like icicles. */
function bulbs(L: Layout): { x: number; y: number; drop: number }[] {
  return cached(`cabin|bulbs|${L.W}x${L.H}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}`, () => {
    const p = planOf(L);
    const out: { x: number; y: number; drop: number }[] = [];
    for (const [i, seg] of L.segments.entries()) {
      if (p?.segKinds[i] === "open") continue;
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        for (let x = x0; x < x1; x++) if ((x - x0) % 10 === 5) out.push({ x, y: 4 + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 2), drop: ((x * 7) % 3) + 1 });
      }
    }
    return out;
  });
}

export function wallLights(ctx: Ctx, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const B = bulbs(L);
  const t = info.t;
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  const party = ["#ff6b6b", "#ffffff", "#7fd0ff", "#ffd27a"];
  if (!glow) {
    ctx.fillStyle = "#3a2a22";
    for (const b of B) {
      ctx.fillRect(b.x - 5, b.y - 1, 10, 1);
      ctx.fillRect(b.x, b.y, 1, b.drop * 2);
    }
  }
  for (const [i, b] of B.entries()) {
    const dead = info.brokenBulbX === b.x && Math.floor(t * 9) % 7 !== 0;
    const twinkle = 0.75 + 0.25 * Math.sin(t * 2.3 + i * 1.7);
    const color = info.party ? party[(i + Math.floor(t * 6)) % party.length]! : i % 7 === 3 ? "#cfeaff" : "#ffe6a6";
    for (let k = 0; k < b.drop; k++) {
      const by = b.y + 1 + k * 2;
      if (glow) {
        if (dead || night < 0.2) continue;
        ctx.globalAlpha = night * twinkle * 0.35;
        ctx.fillStyle = color;
        ctx.fillRect(b.x - 2, by - 2, 5, 5);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = dead ? "#5a5050" : night > 0.2 || info.party ? color : "#f4ead2";
        ctx.fillRect(b.x, by, 1, 2);
      }
    }
  }
}

export function lights(L: Layout, info: PaintInfo): Light[] {
  const p = planOf(L);
  if (!p) return [];
  const t = info.t;
  const out: Light[] = [];
  const f = p.fire.box;
  const flick = 0.85 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 2.1) * 0.08 + fireBoost(t) * 0.2;
  out.push([f.x + f.w / 2, f.y + f.h, 110, Math.min(1, 0.9 * flick), "#ffa24a", 0.3]);
  out.push([f.x + f.w / 2, f.y + f.h + 30, 70, 0.7 * flick, "#ff8a3a", 0.18]);
  const m = p.fire.mantel;
  out.push([m.x + 5, m.y - 5, 10, 0.8, "#ffd27a", 0.2]);
  if (p.sauna) {
    const s = p.sauna;
    out.push([s.x + s.w / 2, s.y + s.h - 12, 30, 0.8, "#ffb05a", 0.22]);
  }
  for (const g of p.deckWall?.gaps ?? []) {
    // A lantern by each door out to the deck.
    if (p.deckSide === "east") out.push([p.deckWall!.x0 + 8, g[0] - 6, 34, 0.85, "#ffd28a", 0.2]);
    else out.push([g[1] + 6, p.deckWall!.y0 + 4, 34, 0.85, "#ffd28a", 0.2]);
  }
  out.push([L.kitchen.x + 30, L.kitchen.y + 4, 40, 0.6, "#ffb46a", 0.12]);
  out.push(...clickLights(L, info));
  return out;
}

export function darkness(night: number, weather: WeatherKind, classic: number): number {
  // Deep mountain nights; snow lights a gloomy day up a little.
  const gloom = weather === "storm" ? 0.12 : weather === "snow" ? 0.03 : weather === "fog" || weather === "rain" ? 0.07 : 0;
  return Math.min(0.7, Math.max(classic * 0.4, night * 0.62 + gloom));
}

/** The door swung open: the white world outside and a swirl of snow on the mat. */
export function doorOpen(ctx: Ctx, d: Rect, info: PaintInfo): boolean {
  const night = info.night > 0.5;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(d.x, d.y + 1, d.w, d.h - 1);
  ctx.fillStyle = night ? "#2a3460" : "#9cc8f0";
  ctx.fillRect(d.x + 2, d.y + 3, d.w - 4, Math.round(d.h * 0.4));
  ctx.fillStyle = night ? "#8a9cc4" : C.snow;
  ctx.fillRect(d.x + 2, d.y + 3 + Math.round(d.h * 0.4), d.w - 4, d.h - 4 - Math.round(d.h * 0.4));
  ctx.fillStyle = night ? "#6a7aa6" : C.snowShade;
  ctx.fillRect(d.x + 2, d.y + 3 + Math.round(d.h * 0.4), d.w - 4, 2);
  // The door leaf swung in against the wall.
  ctx.fillStyle = C.pineDk;
  ctx.fillRect(d.x - 4, d.y + 1, 4, d.h - 1);
  ctx.fillStyle = C.pine;
  ctx.fillRect(d.x - 3, d.y + 2, 2, d.h - 3);
  const t = info.t;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.8 + i / 6) % 1;
    ctx.fillRect(Math.round(d.x + 3 + ((i * 7) % (d.w - 6)) + Math.sin(t * 3 + i) * 2), Math.round(d.y + d.h - 4 + ph * 14), 1, 1);
  }
  return true;
}

