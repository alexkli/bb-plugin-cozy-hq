// Sky Loft: penthouse touches. A cluster of smoked-glass globe pendants over
// the boardroom table, a sculptural spiral stair up to the roof, and the
// elevator opening onto a warm, lit cab.
import type { PaintInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, makeCanvas, mix, OUTLINE, rect } from "../../themekit.ts";
import { C, clamp, sprite } from "./kit.ts";

// ------------------------------------------------------------------ pendants

export interface Globe {
  x: number;
  y: number;
  top: number;
}

export function pendants(L: Layout): Globe[] {
  return cached(`skyline|pendants|${L.W}x${L.H}|${L.props.length}`, () => {
    const table = L.props.find((p) => p.kind === "meeting-table");
    if (!table) return [];
    const cx = table.x + 34;
    const cy = table.y - 30;
    const top = Math.max(L.meeting.y + 2, cy - 30);
    return [
      [-12, 1],
      [0, -3],
      [12, 1],
    ].map(([dx, dy]) => ({ x: cx + dx!, y: cy + dy!, top }));
  });
}

function globeSprite(lit: boolean): HTMLCanvasElement {
  return sprite(`globe-${lit}`, 7, 8, (g) => {
    g.rect(2, 0, 3, 1, C.brass);
    // Hand-blown amber glass.
    g.ellipse(3, 4, 2.6, 2.6, lit ? "#f7cf86" : "#c98f45");
    if (lit) g.rect(2, 3, 3, 3, "#fff6dc");
    else g.set(2, 3, "#f1d29c").set(4, 5, "#a86f2e");
    g.outline(OUTLINE);
  });
}

function glow(): HTMLCanvasElement {
  return cached("skyline|pendant-glow", () =>
    makeCanvas(21, 21, (c) => {
      const g = c.createRadialGradient(10.5, 10.5, 0, 10.5, 10.5, 10.5);
      g.addColorStop(0, "rgba(255,226,170,0.85)");
      g.addColorStop(1, "rgba(255,226,170,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 21, 21);
    }),
  );
}

/** Someone's on the dimmer: when the show started (by PaintInfo.t). */
export const dimmer = { t0: -1e9 };
export const DIM_SHOW = 6.4;

/**
 * How bright globe i is (0 … 1): steady (lit at night, off by day), or in a
 * show they light one by one (dim one by one at night), pulse in a wave and
 * settle back.
 */
export function globeLevel(i: number, t: number, night: number): number {
  const base = night > 0.3 ? Math.min(1, night) : 0;
  const k = t - dimmer.t0;
  if (k < 0 || k > DIM_SHOW) return base;
  const away = base > 0.5 ? 0.12 : 1;
  const first = clamp((k - i * 0.4) / 0.3, 0, 1);
  const back = clamp((k - 4.8 - i * 0.35) / 0.3, 0, 1);
  if (k < 1.6) return base + (away - base) * first;
  if (k < 4.8) return 0.55 + 0.45 * Math.sin((k - 1.6) * 5 - i * 1.3);
  return away + (base - away) * back;
}

/** The statement light over the boardroom table (drawn over everyone: it hangs from the ceiling). */
export function drawPendants(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const globes = pendants(L);
  if (globes.length === 0) return;
  const show = info.t - dimmer.t0 <= DIM_SHOW;
  for (const [i, g] of globes.entries()) {
    for (let y = g.top; y < g.y; y++) {
      ctx.fillStyle = `rgba(30,32,38,${(0.15 + (0.75 * (y - g.top)) / Math.max(1, g.y - g.top)).toFixed(2)})`;
      ctx.fillRect(g.x, y, 1, 1);
    }
    ctx.drawImage(globeSprite(show ? globeLevel(i, info.t, info.night) > 0.45 : info.night > 0.3), g.x - 3, g.y);
  }
  if (show || info.night > 0.3) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [i, g] of globes.entries()) {
      ctx.globalAlpha = globeLevel(i, info.t, info.night) * 0.7;
      if (ctx.globalAlpha > 0.02) ctx.drawImage(glow(), g.x - 10, g.y - 6);
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the spiral stair

/** A black steel spiral stair with walnut treads and a brass rail, up to the roof terrace. */
export function spiralStair(): HTMLCanvasElement {
  return sprite("spiral-stair", 32, 50, (g) => {
    const cx = 16;
    g.ellipse(cx, 45, 13, 4, "#9a968f");
    g.rect(cx - 1, 6, 2, 40, "#25272c");
    const steps = 11;
    const outer: [number, number][] = [];
    // Draw the far treads first so the near ones overlap them.
    const order = [...Array(steps).keys()].map((i) => ({ i, a: i * 0.72 })).sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    for (const { i, a } of order) {
      const y = 44 - i * 3.6;
      const ox = Math.cos(a) * 12;
      const oy = Math.sin(a) * 3.5;
      const near = Math.sin(a) > 0;
      g.line(cx, y, cx + ox, y + oy, near ? C.walHi : C.wal);
      g.line(cx, y + 1, cx + ox, y + oy + 1, C.walDk);
      outer[i] = [Math.round(cx + ox), Math.round(y + oy - 6)];
    }
    for (let i = 1; i < steps; i++) {
      const [x0, y0] = outer[i - 1]!;
      const [x1, y1] = outer[i]!;
      g.line(x0, y0, x1, y1, C.brass);
    }
    for (let i = 0; i < steps; i += 2) {
      const [x, y] = outer[i]!;
      g.rect(x, y, 1, 6, "#3a3d44");
    }
    // The landing up top.
    g.ellipse(cx, 5, 7, 2.2, C.walHi);
    g.rect(cx - 6, 5, 13, 1, C.walLo);
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the elevator

let openSince = -1;
let lastSeen = -1;

/** The elevator standing open: doors slid into the wall, a warm lit cab with a brass rail. */
export function elevatorOpen(ctx: CanvasRenderingContext2D, d: Rect, info: PaintInfo): boolean {
  if (info.t - lastSeen > 0.25) openSince = info.t;
  lastSeen = info.t;
  const k = Math.min(1, (info.t - openSince) / 0.35);
  rect(ctx, d.x, d.y + 1, d.w, d.h - 1, "#2a2420");
  const h = d.h - 4;
  for (let i = 0; i < h; i++) {
    ctx.fillStyle = mix("#fff3d6", "#c8a678", i / h);
    ctx.fillRect(d.x + 2, d.y + 2 + i, d.w - 4, 1);
  }
  rect(ctx, d.x + 2, d.y + 2, 2, h, "#b9bec5");
  rect(ctx, d.x + d.w - 4, d.y + 2, 2, h, "#9aa0a8");
  rect(ctx, d.x + 3, d.y + Math.round(h * 0.55), d.w - 6, 1, C.brass);
  rect(ctx, d.x + 2, d.y + d.h - 6, d.w - 4, 4, "#5a4636");
  rect(ctx, d.x + d.w / 2 - 3, d.y + 3, 6, 1, "#ffffff");
  const leaf = Math.round((d.w / 2) * (1 - k));
  if (leaf > 0) {
    rect(ctx, d.x, d.y + 1, leaf, d.h - 1, "#b4bac2");
    rect(ctx, d.x + d.w - leaf, d.y + 1, leaf, d.h - 1, "#b4bac2");
    rect(ctx, d.x + leaf - 1, d.y + 1, 1, d.h - 1, "#7f858e");
    rect(ctx, d.x + d.w - leaf, d.y + 1, 1, d.h - 1, "#dfe3e8");
  }
  return true;
}

