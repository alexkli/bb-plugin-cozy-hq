// Surf Villa: the sky and the view: the ocean outside the windows (waves,
// surfers, sailboats, gulls, palms, a sunset and a moon path) and the shell
// lights on a rope along the villa's beam.
import type { OutsideInfo, SkyColors, WallLightsInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, Grid, hash, mix } from "../../themekit.ts";
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
  return cached(`beach|view-palm|${tone}|${flip}|${tall}`, () => {
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
  return cached(`beach|view-umbrella|${tone}`, () => {
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
  return cached(`beach|view-board|${tone}`, () => {
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

