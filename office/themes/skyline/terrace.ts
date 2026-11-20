// Sky Loft: life on the terrace. A linear fire table, teak sun loungers,
// festoon lights strung between poles, and the warm light they all give.
import type { Drawable, Light, PaintInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, hash, makeCanvas, OUTLINE } from "../../themekit.ts";
import { C, clamp, sprite } from "./kit.ts";
import { planOf } from "./plan.ts";

/** Someone turned the fire table up: when (by PaintInfo.t). */
export const flare = { t0: -1e9 };

/** How hard the fire table is roaring (0 … 1): up fast, a few seconds high, then back down. */
export function fireBoost(t: number): number {
  const k = t - flare.t0;
  if (k < 0 || k > 6) return 0;
  return k < 0.35 ? k / 0.35 : k < 3.5 ? 1 : 1 - (k - 3.5) / 2.5;
}

function fireTable(w: number): HTMLCanvasElement {
  return sprite(`fire-table-${w}`, w + 2, 18, (g) => {
    // A long concrete trough with a black burner channel and glass guards.
    g.rect(1, 6, w, 10, "#b9b5ad");
    g.rect(1, 6, w, 1, "#d4d0c8");
    g.rect(1, 15, w, 1, "#9a968f");
    g.rect(1, 3, w, 4, "#c9c5be");
    g.rect(1, 3, w, 1, "#dedad3");
    g.rect(4, 4, w - 6, 2, "#26282d");
    for (let x = 6; x < w - 4; x += 3) g.set(x, 5, "#3a3d44");
    g.rect(3, 1, w - 4, 1, "#d6e6efaa");
    g.outline(OUTLINE);
  });
}

function lounger(): HTMLCanvasElement {
  // A teak chaise with a white cushion, back raised toward the glass.
  return sprite("lounger", 20, 30, (g) => {
    const teak = "#9a7350";
    const teakLo = "#7a583a";
    g.rect(3, 1, 14, 9, teak);
    for (let y = 2; y < 10; y += 2) g.rect(3, y, 14, 1, teakLo);
    g.rect(4, 2, 12, 7, "#f4f1ea");
    g.rect(4, 2, 12, 1, "#ffffff");
    g.rect(2, 9, 16, 17, teak);
    g.rect(3, 9, 14, 15, "#f4f1ea");
    g.rect(3, 9, 14, 1, "#ffffff");
    g.rect(3, 16, 14, 1, "#e2ddd2");
    g.rect(2, 26, 16, 1, teakLo);
    g.rect(3, 27, 2, 2, teakLo).rect(15, 27, 2, 2, teakLo);
    g.rect(13, 3, 3, 2, C.terra);
    g.outline(OUTLINE);
  });
}

function pole(h: number): HTMLCanvasElement {
  return sprite(`festoon-pole-${h}`, 5, h + 3, (g) => {
    g.rect(2, 1, 1, h, "#23252a");
    g.rect(1, h, 3, 2, "#3a3d44");
    g.outline(OUTLINE);
  });
}

interface Strand {
  pts: { x: number; y: number }[];
}

interface TerraceLife {
  fire: Rect | null;
  loungers: { x: number; y: number }[];
  poles: { x: number; y: number; h: number }[];
  strands: Strand[];
  bulbs: { x: number; y: number }[];
}

function life(L: Layout): TerraceLife | null {
  const plan = planOf(L);
  const deck = plan?.terrace;
  if (!plan || !deck) return null;
  return cached(`skyline|terrace|${L.W}x${L.H}|${deck.x},${deck.y},${deck.w},${deck.h}`, () => {
    const poleH = 24;
    const left = deck.x + 3;
    const right = deck.x + deck.w - 4;
    // Strung over the open floor where everyone gets together.
    const ev = L.eventArea;
    const bottom = deck.y + deck.h - 2;
    const bases = deck.h >= 90 ? [ev.y + 16, Math.min(bottom, ev.y + ev.h + 8)] : [Math.min(bottom, ev.y + Math.round(ev.h / 2) + 14)];
    const poles: TerraceLife["poles"] = [];
    const strands: Strand[] = [];
    const bulbs: TerraceLife["bulbs"] = [];
    for (const raw of bases) {
      const base = Math.round(raw);
      poles.push({ x: left, y: base, h: poleH }, { x: right, y: base, h: poleH });
      const pts: Strand["pts"] = [];
      const y0 = base - poleH;
      const n = Math.max(2, Math.round((right - left) / 2));
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        pts.push({ x: Math.round(left + (right - left) * u), y: Math.round(y0 + Math.sin(u * Math.PI) * 6) });
      }
      strands.push({ pts });
      for (let i = 3; i < pts.length - 2; i += 4) bulbs.push({ x: pts[i]!.x, y: pts[i]!.y + 1 });
    }
    return { fire: plan.fire, loungers: plan.loungers, poles, strands, bulbs };
  });
}

/** Where the festoon poles stand on the deck (their feet), from the plan alone. */
export function terracePoles(L: Layout): { x: number; y: number }[] {
  return life(L)?.poles ?? [];
}

function tubShell(w: number, h: number): HTMLCanvasElement {
  // A travertine-rimmed hot tub with a teak step.
  return sprite(`tub-${w}x${h}`, w + 2, h + 2, (g) => {
    g.rrect(1, 1, w, h, "#d6cfc2", 3);
    g.rect(2, 1, w - 2, 1, "#ece6db");
    g.rrect(4, 4, w - 6, h - 10, "#2f8fb0", 2);
    g.rect(5, 4, w - 8, 1, "#1f6f8f");
    g.rect(1, h - 4, w, 4, "#bfb7a8");
    g.rect(w / 2 - 6, h, 12, 2, "#9a7350");
    g.outline(OUTLINE);
  });
}

function scopeSprite(): HTMLCanvasElement {
  return sprite("terrace-scope", 16, 26, (g) => {
    g.line(4, 3, 10, 10, C.brass).line(5, 3, 11, 10, C.brass).line(4, 4, 10, 11, C.brassLo);
    g.rect(3, 2, 3, 3, C.brassHi);
    g.rect(9, 10, 3, 2, "#2a2c31");
    g.rect(8, 11, 2, 3, "#2a2c31");
    g.line(8, 14, 3, 24, "#2a2c31").line(8, 14, 13, 24, "#2a2c31").line(8, 14, 8, 24, "#3a3d44");
    g.outline(OUTLINE);
  });
}

/** Fire table, hot tub, loungers and poles, sorted with everyone else. */
export function terraceDecor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const T = life(L);
  if (!T) return [];
  const out: Drawable[] = [];
  const plan = planOf(L);
  const tub = plan?.tub;
  if (tub) {
    const shell = tubShell(tub.w, tub.h);
    const t = info.t;
    const waterY = tub.y + 13;
    const steamy = info.night > 0.3 || info.weather === "snow" || info.hour < 9;
    out.push({
      z: tub.y + 4,
      draw: () => {
        ctx.drawImage(shell, tub.x - 1, tub.y - 1);
        // Ripples and the underwater light.
        ctx.fillStyle = info.night > 0.4 ? "#7fe0ff" : "#8fd3ea";
        for (let i = 0; i < 6; i++) {
          const k = (t * 0.6 + i * 0.37) % 1;
          ctx.fillRect(tub.x + 5 + ((i * 7 + Math.floor(t * 2)) % (tub.w - 12)), tub.y + 6 + Math.floor(k * (tub.h - 14)), 2, 1);
        }
      },
    });
    out.push({
      z: tub.y + 22.6,
      draw: () => {
        // Water over whoever is soaking, then the front rim.
        ctx.fillStyle = info.night > 0.4 ? "rgba(70,170,210,0.62)" : "rgba(60,160,200,0.55)";
        ctx.fillRect(tub.x + 3, waterY, tub.w - 6, tub.h - 6 - (waterY - tub.y) + 2);
        ctx.fillStyle = "rgba(220,245,255,0.5)";
        ctx.fillRect(tub.x + 3, waterY, tub.w - 6, 1);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(tub.x, tub.y + tub.h - 5, tub.w + 1, 1);
        ctx.fillStyle = "#cfc8ba";
        ctx.fillRect(tub.x + 1, tub.y + tub.h - 4, tub.w - 1, 4);
        ctx.fillStyle = "#e6dfd2";
        ctx.fillRect(tub.x + 1, tub.y + tub.h - 4, tub.w - 1, 1);
        if (steamy) {
          for (let i = 0; i < 7; i++) {
            const k = (t * 0.25 + i / 7) % 1;
            ctx.fillStyle = `rgba(255,255,255,${(0.45 * (1 - k)).toFixed(2)})`;
            const sx = tub.x + 6 + ((i * 11) % (tub.w - 12)) + Math.round(Math.sin(t + i) * 2);
            ctx.fillRect(sx, Math.round(waterY - 2 - k * 22), 3, 2);
          }
        }
      },
    });
  }
  const scope = plan?.scope;
  if (scope) {
    const spr = scopeSprite();
    out.push({ z: scope.y, draw: () => ctx.drawImage(spr, scope.x - 8, scope.y - 25) });
  }
  const f = T.fire;
  if (f) {
    const spr = fireTable(f.w);
    out.push({
      z: f.y + 14,
      draw: () => {
        ctx.drawImage(spr, f.x - 1, f.y - 2);
        // Flames dancing along the burner (taller when someone turns it up).
        const t = info.t;
        const boost = fireBoost(t);
        for (let x = f.x + 4; x < f.x + f.w - 4; x += 2) {
          const h0 = 1 + ((hash(`fl${x}|${Math.floor(t * 9 + x * 0.7)}`) % 4) + (Math.sin(t * 6 + x) > 0.4 ? 1 : 0));
          const h = boost > 0 ? Math.round(h0 * (1 + boost * 1.8)) : h0;
          ctx.fillStyle = "#ff8a2a";
          ctx.fillRect(x, f.y + 1 - h, 2, h);
          ctx.fillStyle = "#ffd25a";
          ctx.fillRect(x, f.y + 2 - Math.max(1, h - 1), 1, Math.max(1, h - 1));
          if (h >= 4) {
            ctx.fillStyle = "#fff3c0";
            ctx.fillRect(x, f.y + 1, 1, 1);
          }
        }
      },
    });
  }
  const chaise = lounger();
  for (const l of T.loungers) out.push({ z: l.y - 2, draw: () => ctx.drawImage(chaise, l.x - 10, l.y - 20) });
  for (const p of T.poles) {
    const spr = pole(p.h);
    out.push({ z: p.y, draw: () => ctx.drawImage(spr, p.x - 2, p.y - p.h - 1) });
  }
  return out;
}

function glowDot(): HTMLCanvasElement {
  return cached("skyline|glowdot", () =>
    makeCanvas(13, 13, (c) => {
      const g = c.createRadialGradient(6.5, 6.5, 0, 6.5, 6.5, 6.5);
      g.addColorStop(0, "rgba(255,214,150,0.9)");
      g.addColorStop(1, "rgba(255,214,150,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 13, 13);
    }),
  );
}

/** Festoon lights strung over the terrace (on top of everyone; they glow at night). */
export function terraceOverlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const T = life(L);
  if (!T) return;
  ctx.fillStyle = "#2a2c31";
  for (const s of T.strands) for (const p of s.pts) ctx.fillRect(p.x, p.y, 1, 1);
  const on = info.night > 0.3;
  const k = clamp((info.night - 0.2) * 1.6, 0, 1);
  for (const [i, b] of T.bulbs.entries()) {
    const tw = 0.8 + 0.2 * Math.sin(info.t * 1.7 + i * 1.3);
    ctx.fillStyle = on ? "#fff1c4" : "#e9e2cf";
    ctx.fillRect(b.x, b.y, 1, 2);
    if (on) {
      ctx.globalAlpha = k * tw;
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glowDot(), b.x - 6, b.y - 5);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }
}

/** The fire and the festoons light the terrace at night. */
export function terraceLights(L: Layout, info: PaintInfo): Light[] {
  const T = life(L);
  if (!T) return [];
  const out: Light[] = [];
  const f = T.fire;
  if (f) {
    const flick = 0.82 + Math.sin(info.t * 9) * 0.06 + Math.sin(info.t * 3.7) * 0.08;
    const boost = fireBoost(info.t);
    out.push([f.x + f.w / 2, f.y + 4 - boost * 4, Math.max(40, f.w * 0.9) * (1 + boost * 0.5), Math.min(1, flick + boost * 0.25), "#ff9a45", 0.28 + boost * 0.2]);
  }
  for (const [i, b] of T.bulbs.entries()) if (i % 3 === 1) out.push([b.x, b.y + 16, 26, 0.45, "#ffd9a0", 0.06]);
  const tub = planOf(L)?.tub;
  if (tub) out.push([tub.x + tub.w / 2, tub.y + tub.h / 2, 34, 0.75, "#7fe0ff", 0.22]);
  return out;
}

/** Where the terrace is (for keeping indoor things off it). */
export function outdoors(L: Layout): Rect[] {
  const plan = planOf(L);
  if (!plan?.terrace) return [];
  return [plan.terrace, ...plan.beyond];
}
