// Surf Villa: everything drawn live. The ocean outside the windows (waves,
// surfers, sailboats, gulls, palms, a sunset and a moon path), shell lights on
// a rope, tiki torches and lanterns at night, a crab on the sand and a warm
// glare by day.
import type { Light, OutsideInfo, PaintInfo, SkyColors, Theme, WallLightsInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import type { Drawable } from "../../theme.ts";
import { cached, floorPlan, Grid, hash, mix, OUTLINE } from "../../themekit.ts";
import { C, fill } from "./kit.ts";

// ------------------------------------------------------------------ sky

const SKY: [number, string, string][] = [
  [0, "#0a1838", "#1b3358"],
  [5, "#172b55", "#3d4d7c"],
  [6.5, "#ff9f86", "#ffdca6"],
  [8, "#3db4f2", "#bff0ff"],
  [16.5, "#38aaee", "#b6ecff"],
  [18.5, "#ff7f6e", "#ffd184"],
  [19.6, "#5d3f8e", "#ff8f7c"],
  [21, "#0f1f46", "#22396c"],
  [24, "#0a1838", "#1b3358"],
];

export function beachSky(hour: number, classic: SkyColors): SkyColors {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i]!;
    const [h1, t1, b1] = SKY[i + 1]!;
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), night: classic.night };
    }
  }
  return classic;
}

// ------------------------------------------------------------------ the view

type Tone = 0 | 1 | 2;

/** A palm tree leaning right (flip for left), in day, dusk or night tones. */
function palmSprite(tone: Tone, flip: boolean, tall: number): HTMLCanvasElement {
  return cached(`beach|palm|${tone}|${flip}|${tall}`, () => {
    const g = new Grid(30, tall + 10);
    const trunk = tone === 0 ? "#a07a4e" : tone === 1 ? "#5a3e3a" : "#0d1830";
    const trunkLo = tone === 0 ? "#7c5a36" : tone === 1 ? "#432c30" : "#0a1226";
    const leaf = tone === 0 ? "#3f9a5a" : tone === 1 ? "#2e4a44" : "#0d1a30";
    const leafHi = tone === 0 ? "#6cc070" : tone === 1 ? "#3e5c50" : "#122340";
    const leafLo = tone === 0 ? "#2b7046" : tone === 1 ? "#243a38" : "#0a1428";
    const base = g.h - 1;
    let tx = 8;
    let ty = base;
    for (let j = 0; j < tall; j++) {
      tx = 8 + Math.round(Math.pow(j / tall, 1.8) * 7);
      ty = base - j;
      g.set(tx, ty, trunk).set(tx + 1, ty, j % 3 === 0 ? trunkLo : trunk);
    }
    const cx = tx;
    const cy = ty;
    const fronds: [number, number, number][] = [
      [-11, 3, 0],
      [-8, -3, 1],
      [-2, -5, 0],
      [5, -4, 1],
      [11, 1, 0],
      [9, 5, 1],
      [-6, 6, 0],
    ];
    for (const [fx, fy, k] of fronds) {
      const n = Math.max(Math.abs(fx), Math.abs(fy));
      for (let i = 1; i <= n; i++) {
        const px = cx + Math.round((fx * i) / n);
        const py = cy + Math.round((fy * i) / n + Math.pow(i / n, 2) * 3);
        g.set(px, py, k ? leafHi : leaf);
        if (i % 2 === 0 && i < n) g.set(px, py + 1, leafLo);
      }
    }
    g.set(cx, cy + 1, tone === 0 ? "#6b4a2c" : trunkLo).set(cx + 1, cy + 1, tone === 0 ? "#5a3c22" : trunkLo);
    return flip ? g.flipped().toCanvas() : g.toCanvas();
  });
}

function umbrellaSprite(tone: Tone): HTMLCanvasElement {
  return cached(`beach|umbrella|${tone}`, () => {
    const g = new Grid(15, 14);
    const a = tone === 0 ? C.coral : tone === 1 ? "#8a4a4e" : "#1a2440";
    const b = tone === 0 ? C.white : tone === 1 ? "#a08a8a" : "#26304c";
    for (let j = 0; j < 4; j++) {
      const half = 2 + j * 2;
      for (let i = -half; i <= half; i++) g.set(7 + i, 2 + j, Math.floor((i + 9) / 3) % 2 ? a : b);
    }
    g.rect(7, 6, 1, 8, tone === 2 ? "#141c34" : "#8a6a42");
    return g.toCanvas();
  });
}

function surfboardSprite(tone: Tone): HTMLCanvasElement {
  return cached(`beach|board|${tone}`, () => {
    const g = new Grid(5, 12);
    g.ellipse(2, 5.5, 1.6, 5.5, tone === 0 ? C.sun : tone === 1 ? "#8a7050" : "#18223c");
    g.rect(2, 1, 1, 10, tone === 0 ? C.coral : tone === 1 ? "#7a4a44" : "#1e2a46");
    return g.toCanvas();
  });
}

export function beachOutside(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void {
  const { x, y, w, h } = win;
  const t = info.t;
  const n = info.night;
  const wx = info.weather;
  const stormy = wx === "rain" || wx === "storm" || wx === "drizzle";
  const overcast = wx !== "clear" && wx !== "partly";
  const grey = stormy ? 0.5 : overcast ? 0.3 : 0;
  const tone: Tone = n > 0.7 ? 2 : n > 0.3 ? 1 : 0;
  const horizon = y + Math.round(h * 0.5);
  const shore = y + h - 8;
  const seaH = shore - horizon;
  const dusk = Math.max(0, 1 - Math.abs(info.hour - 19) / 1.4);
  const tint = (day: string, night: string) => mix(mix(mix(day, night, n), "#7a8a94", grey), info.sky.bottom, 0.16 + 0.3 * dusk);

  // Far shore: an island, or a headland with a lighthouse.
  const far = mix(mix("#3f8a7a", "#0b1a33", n), info.sky.bottom, 0.35);
  if (index % 3 === 1) {
    for (let i = 0; i < 18; i++) {
      const hh = Math.round(Math.sin((i / 17) * Math.PI) * 4);
      fill(ctx, x + 4 + i, horizon - hh, 1, hh, far);
    }
    fill(ctx, x + 13, horizon - 8, 1, 4, far);
    fill(ctx, x + 11, horizon - 9, 2, 1, far);
    fill(ctx, x + 14, horizon - 9, 2, 1, far);
  } else if (index % 4 === 2) {
    for (let i = 0; i < 14; i++) {
      const hh = Math.round(3 + Math.sin((i / 13) * Math.PI * 0.5) * 2);
      fill(ctx, x + w - 15 + i, horizon - hh, 1, hh, far);
    }
    const lx = x + w - 8;
    fill(ctx, lx, horizon - 12, 3, 8, n > 0.5 ? "#c8c8d8" : "#f4f1ea");
    fill(ctx, lx, horizon - 10, 3, 1, C.coralLo);
    fill(ctx, lx, horizon - 7, 3, 1, C.coralLo);
    fill(ctx, lx, horizon - 13, 3, 1, "#3a3046");
    const beam = Math.sin(t * 1.2);
    if (n > 0.4) {
      fill(ctx, lx + 1, horizon - 13, 1, 1, "#fff3b0");
      if (beam > 0.6) {
        ctx.fillStyle = `rgba(255,240,170,${0.35 * (beam - 0.6) * 2.5})`;
        ctx.fillRect(lx - 14, horizon - 13, 14, 1);
        ctx.fillRect(lx - 9, horizon - 14, 6, 1);
      }
    } else fill(ctx, lx + 1, horizon - 13, 1, 1, "#ffe9a0");
  }

  // The sea in bands, deep to turquoise.
  const day = ["#2673ab", "#2c88bb", "#35a2c8", "#45bccb"];
  const night = ["#142a4c", "#183258", "#1d3b62", "#23466e"];
  for (let i = 0; i < 4; i++) {
    const y0 = horizon + Math.floor((i * seaH) / 4);
    const y1 = horizon + Math.floor(((i + 1) * seaH) / 4);
    fill(ctx, x, y0, w, y1 - y0, tint(day[i]!, night[i]!));
  }
  fill(ctx, x, horizon, w, 1, mix(info.sky.bottom, "#ffffff", 0.25 * (1 - n)));

  // Sun glitter by day, a moon path by night (window 0 holds the sun and moon).
  const glint = (cx: number, color: string, spread: number) => {
    ctx.fillStyle = color;
    for (let r = horizon + 1; r < shore - 1; r++) {
      const k = (r - horizon) / seaH;
      const half = Math.round(k * spread);
      const flick = hash(`g${r}-${Math.floor(t * 2.5)}`) % 7;
      if (flick < 2) continue;
      const jitter = (flick % 3) - 1;
      ctx.fillRect(Math.round(cx - half + jitter), r, half * 2 + 1 - (flick === 6 ? 1 : 0), 1);
    }
  };
  if (index === 0 && !overcast) {
    const dayK = (info.hour - 6) / 13;
    if (dayK > 0 && dayK < 1 && n < 0.7) glint(x + 8 + dayK * (w - 16), n > 0.1 ? "rgba(255,200,120,0.85)" : "rgba(255,250,215,0.85)", 4);
    else {
      const nk = ((info.hour + 24 - 19) % 24) / 11;
      glint(x + 10 + nk * (w - 20), "rgba(244,241,220,0.7)", 3);
    }
  }
  // The sun sets into the sea in the second window.
  if (index === 1 && !overcast && info.hour > 18.4 && info.hour < 20) {
    const k = (info.hour - 18.4) / 1.6;
    const sx = x + Math.round(w * 0.58);
    const sy = horizon - 6 + Math.round(k * 10);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, horizon - y);
    ctx.clip();
    ctx.fillStyle = "rgba(255,190,110,0.35)";
    ctx.fillRect(sx - 8, sy - 6, 17, 13);
    ctx.fillStyle = "#ffcf6a";
    ctx.fillRect(sx - 3, sy - 5, 7, 11);
    ctx.fillRect(sx - 5, sy - 3, 11, 7);
    ctx.fillStyle = "#fff0b0";
    ctx.fillRect(sx - 2, sy - 4, 4, 3);
    ctx.restore();
    glint(sx, "rgba(255,170,90,0.9)", 4);
  }

  // Swell lines drifting along.
  const foam = mix(mix(C.foam, "#8ea4cc", n), "#c7d0d6", grey * 0.5);
  ctx.fillStyle = foam;
  for (let r = horizon + 2, i = 0; r < shore - 3; r += 2, i++) {
    const k = (r - horizon) / seaH;
    const period = 18 + ((i * 7) % 11) - (stormy ? 6 : 0);
    const speed = 2 + k * 4 + (stormy ? 4 : 0);
    const off = Math.floor(t * speed + i * 13) % period;
    const len = k < 0.35 ? 1 : k < 0.7 ? 2 : 3;
    for (let xx = x - off - ((x * 3) % period); xx < x + w; xx += period) {
      if (xx + len > x) ctx.fillRect(Math.max(x, xx), r, len, 1);
    }
  }

  // Sand, with wet sand at the waterline.
  const sand = mix(mix("#f0dba6", "#2c3654", n), "#b8b0a0", grey * 0.6);
  fill(ctx, x, shore, w, y + h - shore, sand);
  fill(ctx, x, shore, w, 2, mix(sand, "#8a7a6a", 0.25));
  ctx.fillStyle = mix(sand, "#ffffff", 0.25);
  for (let i = 0; i < w; i += 3) {
    const hx = hash(`s${index}-${i}`);
    if (hx % 3 === 0) ctx.fillRect(x + i, shore + 3 + (hx % 4), 1, 1);
  }

  // The breaker rolls in and washes up the beach.
  const period = stormy ? 3.4 : 5.2;
  const ph = (t / period) % 1;
  const crest = shore - 6 + Math.floor(Math.min(1, ph / 0.7) * 6);
  if (ph < 0.75) {
    fill(ctx, x, crest + 1, w, 1, tint("#6fd6d6", "#22466a"));
    ctx.fillStyle = foam;
    for (let i = 0; i < w; i++) if ((i + Math.floor(t * 6)) % 7 !== 0) ctx.fillRect(x + i, crest, 1, 1);
  } else {
    const wash = Math.round((ph - 0.75) * 14);
    ctx.fillStyle = n > 0.5 ? "rgba(140,170,210,0.45)" : "rgba(255,255,255,0.6)";
    for (let i = 0; i < w; i++) ctx.fillRect(x + i, shore - 1, 1, 1 + ((i * 5 + index) % 3 === 0 ? wash : Math.max(0, wash - 1)));
  }

  // Surfers ride the swell, sailboats cross the horizon, gulls glide by day.
  if (n < 0.6 && wx !== "storm" && wx !== "fog") {
    for (let k = 0; k < 2; k++) {
      const ax = ((t * (11 + k * 4) + k * 410) % 980) - 60;
      const sx = Math.round(ax);
      if (sx < x - 6 || sx > x + w + 6) continue;
      const sy = horizon + Math.round(seaH * (0.55 + k * 0.2));
      ctx.fillStyle = foam;
      ctx.fillRect(sx - 6, sy + 1, 5, 1);
      ctx.fillRect(sx - 3, sy, 3, 1);
      ctx.fillStyle = k ? C.coral : C.sun;
      ctx.fillRect(sx - 2, sy + 1, 5, 1);
      ctx.fillStyle = k ? "#e8453c" : "#2a6aa0";
      ctx.fillRect(sx, sy - 2, 1, 2);
      ctx.fillStyle = "#c98a5e";
      ctx.fillRect(sx, sy - 3, 1, 1);
      ctx.fillRect(sx + 1, sy - 2, 1, 1);
    }
  }
  {
    const ax = ((t * 1.6 + 220) % 760) - 30;
    const bx = Math.round(ax);
    if (bx > x - 6 && bx < x + w + 4) {
      ctx.fillStyle = n > 0.5 ? "#1a2238" : "#5a3e30";
      ctx.fillRect(bx - 2, horizon - 1, 6, 1);
      ctx.fillStyle = n > 0.5 ? "#8a90b0" : "#ffffff";
      ctx.fillRect(bx, horizon - 5, 1, 4);
      ctx.fillRect(bx + 1, horizon - 4, 1, 3);
      ctx.fillRect(bx + 2, horizon - 2, 1, 1);
      if (n > 0.5 && Math.floor(t * 1.5) % 2) {
        ctx.fillStyle = "#ffd27a";
        ctx.fillRect(bx, horizon - 6, 1, 1);
      }
    }
  }
  if (n < 0.4 && !stormy) {
    ctx.fillStyle = "#4a4458";
    for (let k = 0; k < 2; k++) {
      const gx = Math.round(((t * (8 + k * 3) + k * 260) % 840) - 40);
      if (gx < x - 4 || gx > x + w + 2) continue;
      const gy = Math.round(y + 7 + k * 5 + Math.sin(t * 0.8 + k) * 2);
      const flap = Math.floor(t * 3 + k) % 2;
      ctx.fillRect(gx - 2, gy - flap, 1, 1);
      ctx.fillRect(gx - 1, gy + 1 - flap, 1, 1);
      ctx.fillRect(gx, gy + 1, 1, 1);
      ctx.fillRect(gx + 1, gy + 1 - flap, 1, 1);
      ctx.fillRect(gx + 2, gy - flap, 1, 1);
    }
  }

  // Foreground: palms, a beach umbrella and a surfboard in the sand.
  const kind = index % 3;
  if (kind === 0) ctx.drawImage(palmSprite(tone, false, h - 8), x - 6, y + h - (h + 2));
  else if (kind === 2) ctx.drawImage(palmSprite(tone, true, h - 12), x + w - 24, y + h - (h - 2));
  else {
    ctx.drawImage(umbrellaSprite(tone), x + w - 17, shore - 9);
    ctx.drawImage(surfboardSprite(tone), x + 5, shore - 6);
    if (n > 0.55) {
      // A little bonfire down the beach.
      const f = Math.floor(t * 8) % 3;
      ctx.fillStyle = "rgba(255,150,60,0.25)";
      ctx.fillRect(x + 15, shore, 7, 3);
      ctx.fillStyle = "#5a3a2a";
      ctx.fillRect(x + 16, shore + 3, 5, 1);
      ctx.fillStyle = "#ff8a3d";
      ctx.fillRect(x + 17, shore + 1, 3, 2);
      ctx.fillStyle = "#ffd27a";
      ctx.fillRect(x + 18 - (f === 2 ? 1 : 0), shore - (f % 2), 1, 2);
    }
  }
}

// ------------------------------------------------------------------ shell lights

const OFF = ["#fbe3d6", "#f4efe2", "#d9f0ec", "#fbeec8"];
const ON = ["#ffd27a", "#ff9f86", "#86eee4", "#fff2b8"];
const PARTY = ["#ff6b8b", "#5ad1ff", "#ffd84a", "#86e07f", "#ff9f40"];

export function beachWallLights(ctx: CanvasRenderingContext2D, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  let n = 0;
  for (const seg of L.segments) {
    for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
      const x1 = Math.min(seg.x1 - 6, x0 + 100);
      if (x1 - x0 < 30) continue;
      if (!glow) {
        // Knots on the beam.
        fill(ctx, x0 - 1, 2, 3, 2, "#8a6a3a");
        fill(ctx, x1 - 1, 2, 3, 2, "#8a6a3a");
      }
      for (let x = x0; x < x1; x++) {
        const k = (x - x0) / (x1 - x0);
        const y = 2 + Math.round(Math.sin(k * Math.PI) * 4);
        if (!glow) fill(ctx, x, y, 1, 1, (x + y) % 3 === 0 ? "#8a6a3a" : "#c49a5e");
        if ((x - x0) % 10 !== 5) continue;
        const i = n++;
        const dead = info.brokenBulbX === x && Math.floor(info.t * 9) % 7 !== 0;
        const on = night > 0.3 && !dead;
        const color = info.party ? PARTY[(i + Math.floor(info.t * 6)) % PARTY.length]! : ON[i % ON.length]!;
        const tw = info.party ? ((i + Math.floor(info.t * 8)) % 3 === 0 ? 1 : 0.45) : 0.7 + 0.3 * Math.sin(info.t * 1.1 + i * 1.9);
        if (glow) {
          if (!on) continue;
          const g = ctx.createRadialGradient(x + 0.5, y + 3, 0, x + 0.5, y + 3, 7);
          g.addColorStop(0, `${color}${Math.round(110 * tw * night).toString(16).padStart(2, "0")}`);
          g.addColorStop(1, `${color}00`);
          ctx.fillStyle = g;
          ctx.fillRect(x - 7, y - 4, 15, 15);
          fill(ctx, x - 1, y + 2, 3, 2, color);
          fill(ctx, x, y + 4, 1, 1, mix(color, "#ffffff", 0.5));
        } else {
          // A scallop-shell lamp: a cap, a fan and a little point.
          const body = dead ? "#7a7070" : on ? color : OFF[i % OFF.length]!;
          fill(ctx, x, y + 1, 1, 1, "#6a4e2a");
          fill(ctx, x - 1, y + 2, 3, 2, body);
          fill(ctx, x, y + 4, 1, 1, body);
          if (!on && !dead) fill(ctx, x, y + 2, 1, 2, mix(body, "#c49a7a", 0.35));
        }
      }
    }
  }
}

// ------------------------------------------------------------------ decor spots

export interface DecorSpots {
  torches: { x: number; y: number }[];
  racks: { x: number; y: number }[];
  shower: { x: number; y: number } | null;
  castle: { x: number; y: number } | null;
}

/** Where the tiki torches, surfboard racks and the beach shower go (per layout). */
export function decorSpots(L: Layout): DecorSpots {
  return cached(`beach|decor|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const plan = floorPlan(L);
    const taken: Rect[] = [];
    const clear = (r: Rect) => !taken.some((o) => r.x < o.x + o.w + 10 && r.x + r.w + 10 > o.x && r.y < o.y + o.h + 10 && r.y + r.h + 10 > o.y);
    const wallDepth = (x: number) => L.segments.find((sg) => x >= sg.x0 && x < sg.x1)?.depth ?? 64;
    // Tall things need the floor behind them clear too (leaning on the wall is fine).
    const room = (r: Rect, tall: number) => {
      const top = Math.max(r.y - tall, wallDepth(r.x) + 5, wallDepth(r.x + r.w - 1) + 5);
      return top >= r.y || plan.isFree({ x: r.x, y: top, w: r.w, h: r.y - top });
    };
    const pick = (w: number, h: number, within: Rect | null, n = 1, tall = 0): Rect[] => {
      if (!within) return [];
      const out: Rect[] = [];
      for (const r of plan.find(w, h, 200, within)) {
        if (out.length >= n) break;
        if (!clear(r) || !room(r, tall)) continue;
        out.push(r);
        taken.push(r);
      }
      return out;
    };
    const racks: { x: number; y: number }[] = [];
    // Surfboard racks: by the lounge and in the games room (or anywhere free).
    for (const r of [...pick(28, 10, L.lounge, 1, 30), ...pick(28, 10, L.games, 1, 30)]) racks.push({ x: r.x, y: r.y + r.h });
    if (racks.length === 0) for (const r of pick(28, 10, { x: 0, y: 0, w: L.W, h: L.H }, 1, 30)) racks.push({ x: r.x, y: r.y + r.h });
    // Tiki torches: one per room, in the corner nearest the hallway, clear
    // of the TV wall and its speakers.
    const avoid: Rect[] = [L.tv, ...L.speakers].map((r) => ({ x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 40 }));
    for (const pl of L.plants) {
      const big = pl.sprite === "LARGE_PLANT";
      avoid.push({ x: pl.x - 4, y: pl.y, w: big ? 40 : 24, h: (big ? 48 : 32) + 12 });
    }
    const hit = (r: Rect) => avoid.some((o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y);
    const wallAt = (x: number) => L.segments.find((sg) => x >= sg.x0 && x < sg.x1)?.depth ?? 64;
    const torches: { x: number; y: number }[] = [];
    for (const area of [L.kitchen, L.waiting, L.games, L.lounge, L.rooms.find((r) => r.kind === "garden")?.rect ?? null]) {
      if (!area) continue;
      const cands = plan.find(8, 8, 400, area).filter((r) => !hit(r) && r.y > wallAt(r.x) + 16 && clear(r) && room(r, 18));
      if (cands.length === 0) continue;
      const corners = [
        { x: area.x, y: area.y + area.h },
        { x: area.x + area.w, y: area.y + area.h },
        { x: area.x, y: area.y },
        { x: area.x + area.w, y: area.y },
      ];
      let best = cands[0]!;
      let bestD = Infinity;
      for (const r of cands) {
        const d = Math.min(...corners.map((c) => Math.hypot(r.x + 4 - c.x, r.y + 8 - c.y)));
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      }
      taken.push(best);
      torches.push({ x: best.x + 4, y: best.y + best.h });
    }
    const sh = pick(14, 10, L.games, 1, 32);
    const shower = sh[0] ? { x: sh[0].x + 7, y: sh[0].y + sh[0].h } : null;
    const sandy = L.games ?? L.rooms.find((r) => r.kind === "garden")?.rect ?? null;
    const cs = sandy ? plan.find(20, 12, 200, sandy).filter((r) => clear(r)) : [];
    const c = cs.length ? cs[Math.floor(cs.length * 0.6)]! : null;
    const castle = c ? { x: c.x + 2, y: c.y + c.h } : null;
    return { torches, racks, shower, castle };
  });
}

function torchSprite(): HTMLCanvasElement {
  return cached("beach|torch", () => {
    const g = new Grid(9, 28);
    for (let j = 9; j < 27; j++) g.rect(4, j, 1, 1, j % 4 === 0 ? C.bambooNode : C.bamboo).set(3, j, C.bambooLo);
    g.rect(2, 5, 5, 5, C.thatch);
    g.rect(2, 5, 5, 1, C.thatchHi);
    for (let i = 2; i < 7; i += 2) g.set(i, 7, C.thatchLo).set(i + 1, 8, C.thatchDk);
    g.rect(3, 4, 3, 1, "#3a2a20");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function rackSprite(): HTMLCanvasElement {
  return cached("beach|rack", () => {
    const g = new Grid(30, 40);
    // An A-frame of bamboo with three boards leaning in it.
    g.rect(2, 12, 2, 27, C.bambooLo).rect(26, 12, 2, 27, C.bambooLo);
    g.rect(1, 34, 28, 2, C.bamboo);
    g.rect(1, 22, 28, 1, C.bambooLo);
    const boards: [number, string, string][] = [
      [8, C.aqua, C.white],
      [15, C.coral, C.sunHi],
      [22, C.sun, C.coral],
    ];
    for (const [bx, c, stripe] of boards) {
      g.ellipse(bx, 18, 3.4, 16.5, c);
      g.rect(bx, 3, 1, 31, stripe);
      g.set(bx - 2, 8, shade(c));
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function shade(c: string): string {
  return mix(c, "#ffffff", 0.4);
}

function showerSprite(): HTMLCanvasElement {
  return cached("beach|shower", () => {
    const g = new Grid(14, 42);
    g.rect(5, 6, 3, 34, C.teak).rect(5, 6, 1, 34, C.teakHi);
    g.rect(6, 3, 6, 2, C.chromeLo).rect(10, 5, 3, 2, C.chrome);
    g.rect(2, 38, 10, 3, C.driftLo);
    g.rect(2, 38, 10, 1, C.driftHi);
    g.rect(8, 22, 2, 1, C.chrome);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

export function beachDecor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const s = decorSpots(L);
  const out: Drawable[] = [];
  const t = info.t;
  for (const [i, p] of s.torches.entries()) {
    out.push({
      z: p.y,
      draw: () => {
        ctx.drawImage(torchSprite(), p.x - 4, p.y - 27);
        const f = Math.floor(t * 9 + i * 3) % 4;
        const fx = p.x - 1;
        const fy = p.y - 22;
        fill(ctx, fx, fy - 4 + (f === 1 ? 1 : 0), 3, 4 - (f === 1 ? 1 : 0), "#ff8a3d");
        fill(ctx, fx + (f % 2), fy - 6 + (f === 3 ? 1 : 0), 1, 2, "#ffb347");
        fill(ctx, fx + 1, fy - 3, 1, 2, "#fff0a0");
      },
    });
  }
  for (const p of s.racks) out.push({ z: p.y, draw: () => ctx.drawImage(rackSprite(), p.x - 1, p.y - 40) });
  const sh = s.shower;
  if (sh) {
    out.push({
      z: sh.y,
      draw: () => {
        ctx.drawImage(showerSprite(), sh.x - 7, sh.y - 41);
        // The odd drip.
        const k = (t * 0.9) % 1;
        if (k < 0.5) fill(ctx, sh.x + 4, sh.y - 34 + Math.floor(k * 60), 1, 1, "#9fe0f0");
      },
    });
  }
  const c = s.castle;
  if (c) out.push({ z: c.y, draw: () => ctx.drawImage(castleSprite(), c.x - 1, c.y - 15) });
  // A gull wanders in off the beach now and then, pecking at crumbs.
  const hall = L.net.halls[0];
  if (hall !== undefined && info.night < 0.4 && (info.weather === "clear" || info.weather === "partly")) {
    const cyc = (t % 80) / 80;
    if (cyc < 0.4) {
      const k = cyc / 0.4;
      const from = L.entrance.x + 20;
      const span = Math.min(120, L.W - from - 20);
      const there = k < 0.5;
      const pos = there ? k * 2 : (1 - k) * 2;
      const pecking = Math.floor(t * 1.3) % 4 === 0;
      const gx = Math.round(from + pos * span);
      const gy = hall + 7;
      out.push({ z: gy, draw: () => drawGull(ctx, gx, gy, there, pecking, Math.floor(t * 6) % 2 === 0) });
    }
  }
  return out;
}

function castleSprite(): HTMLCanvasElement {
  return cached("beach|castle", () => {
    const g = new Grid(20, 16);
    const sand = "#e8c88a";
    const hi = "#f6dfaa";
    const lo = "#c9a462";
    g.rect(2, 9, 16, 5, sand).rect(2, 9, 16, 1, hi).rect(2, 13, 16, 1, lo);
    g.rect(3, 4, 5, 6, sand).rect(12, 4, 5, 6, sand).rect(7, 6, 6, 4, sand);
    for (const x of [3, 5, 7, 12, 14, 16]) g.set(x, 3, sand);
    g.rect(3, 4, 5, 1, hi).rect(12, 4, 5, 1, hi);
    g.rect(9, 10, 2, 3, "#8a6a3a");
    g.vline(14, 0, 4, "#8a6a3a").rect(15, 0, 3, 2, C.coral);
    g.set(5, 6, lo).set(14, 6, lo);
    g.rect(1, 13, 2, 1, C.pink).set(18, 12, "#f4d3c4");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, right: boolean, peck: boolean, step: boolean): void {
  const d = right ? 1 : -1;
  const px = (dx: number) => x + (right ? dx : -dx - 1);
  fill(ctx, x - 3, y, 7, 1, "rgba(60,40,30,0.18)");
  fill(ctx, px(-3), y - 5, 6, 3, OUTLINE);
  fill(ctx, px(-2), y - 4, 4, 2, "#ffffff");
  fill(ctx, px(-3), y - 4, 2, 1, "#9aa6b8");
  fill(ctx, px(-1), y - 4, 2, 1, "#c4ccd8");
  const hy = peck ? y - 3 : y - 6;
  fill(ctx, px(1), hy - 1, 3, 3, OUTLINE);
  fill(ctx, px(2), hy, 1, 1, "#ffffff");
  fill(ctx, px(1), hy, 1, 1, "#ffffff");
  fill(ctx, px(3), hy + (peck ? 1 : 0), 1, 1, "#ffc83d");
  fill(ctx, px(2), hy, 1, 1, peck ? "#ffffff" : "#ffffff");
  fill(ctx, px(-1), y - 2, 1, 2, "#ff9f40");
  fill(ctx, px(step ? 1 : 0), y - 2, 1, 2, "#ff9f40");
  void d;
}

// ------------------------------------------------------------------ lighting

export const beachLighting: NonNullable<Theme["lighting"]> = {
  tint: "14,26,62",
  darkness: (night, _wx, classic) => classic * 0.96 + night * 0.02,
  lights(L, info) {
    const s = decorSpots(L);
    const out: Light[] = [];
    const t = info.t;
    for (const [i, p] of s.torches.entries()) {
      const fl = 0.82 + Math.sin(t * 9 + i * 2) * 0.06 + Math.sin(t * 3.7 + i) * 0.08;
      out.push([p.x, p.y - 26, 40, 0.9 * fl, "#ffa040", 0.26 * fl]);
    }
    // Hurricane candles on the veranda's little tables.
    for (const [i, c] of candles(L).entries()) {
      const fl = 0.8 + Math.sin(t * 7 + i * 1.7) * 0.08 + Math.sin(t * 2.9 + i) * 0.07;
      out.push([c.x, c.y, 20, 0.75 * fl, "#ffc070", 0.2 * fl]);
    }
    // Lanterns: the tiki bar, the cabana and the waiting lounge.
    const k = L.kitchen;
    out.push([k.x + k.w * 0.75, k.y + 34, 46, 0.7, "#ffc070", 0.16]);
    const m = L.meeting;
    out.push([m.x + 14, m.y + m.h - 24, 34, 0.6, "#ffd08a", 0.14]);
    if (L.games) out.push([L.games.x + L.games.w / 2, L.games.y + L.games.h / 2, 60, 0.45, "#ffb870", 0.08]);
    if (L.server) out.push([L.server.x + 8, L.server.y + 8, 22, 0.5, "#86eee4", 0.12]);
    return out;
  },
};

function candles(L: Layout): { x: number; y: number }[] {
  return cached(`beach|candles|${L.W}x${L.H}|${L.props.length}`, () => L.props.filter((p) => p.kind === "lounge-table").map((p) => ({ x: p.x + 13, y: p.y + 2 })));
}

// ------------------------------------------------------------------ underlay and overlay

/** A crab scuttling sideways across the sand (games pit or dunes). */
export function beachUnderlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const sandy = L.games ?? L.rooms.find((r) => r.kind === "garden")?.rect ?? null;
  if (!sandy) return;
  const t = info.t;
  const cycle = (t * 0.05) % 1;
  // It pops out for a while, then hides.
  if (cycle > 0.55) return;
  const k = Math.sin(cycle * Math.PI * 4) * 0.5 + 0.5;
  const x = Math.round(sandy.x + 30 + k * Math.max(10, sandy.w - 60));
  const y = Math.round(sandy.y + Math.min(sandy.h - 14, 52));
  const step = Math.floor(t * 10) % 2;
  fill(ctx, x - 3, y, 7, 1, "rgba(120,80,40,0.18)");
  fill(ctx, x - 2, y - 3, 5, 3, C.coralLo);
  fill(ctx, x - 1, y - 3, 3, 1, C.coral);
  fill(ctx, x - 1, y - 4, 1, 1, OUTLINE);
  fill(ctx, x + 1, y - 4, 1, 1, OUTLINE);
  fill(ctx, x - 4, y - 3 - step, 2, 1, C.coral);
  fill(ctx, x + 3, y - 3 - (1 - step), 2, 1, C.coral);
  fill(ctx, x - 3, y - step, 1, 1, C.coralDk);
  fill(ctx, x + 3, y - 1 + step, 1, 1, C.coralDk);
}

/** Warm sun glare from the windows by day, a rosy cast at sunset. */
export function beachOverlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const clear = info.weather === "clear" || info.weather === "partly";
  if (!clear) return;
  const h = info.hour;
  // Golden hour: a warm soft-light wash at sunset (and a little at dawn).
  const golden = Math.max(0, 1 - Math.abs(h - 18.7) / 1.5) * (h > 17.2 && h < 20.2 ? 1 : 0) + Math.max(0, 1 - Math.abs(h - 6.6) / 0.9) * 0.6;
  if (golden > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = `rgba(255,${Math.round(150 - golden * 30)},70,${0.55 * golden})`;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.restore();
  }
  if (info.night > 0.65) return;
  const k = (1 - info.night) * 0.08;
  const g = ctx.createLinearGradient(0, 0, 0, L.H * 0.55);
  g.addColorStop(0, `rgba(255,236,180,${k})`);
  g.addColorStop(1, "rgba(255,236,180,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.W, Math.ceil(L.H * 0.55));
  // Heat shimmer: a few slow glints drifting near the windows.
  const t = info.t;
  ctx.fillStyle = `rgba(255,250,225,${0.35 * (1 - info.night)})`;
  for (const [i, win] of L.wall.windows.entries()) {
    for (let j = 0; j < 2; j++) {
      const p = (t * 0.05 + i * 0.31 + j * 0.5) % 1;
      ctx.fillRect(Math.round(win.x + 6 + ((i * 13 + j * 17) % (win.w - 8)) + Math.sin(t + j) * 2), Math.round(win.y + win.h + 8 + p * 40), 1, 1);
    }
  }
}
