// Dusty Annex: everything that moves or glows. A low grey sky over a soot-dark
// back street, buzzing fluorescent tubes (one always dying), a bucket under
// the leak, boxes and filing cabinets in every free corner, and dust in the air.

import type { Light, OutsideInfo, PaintInfo, SkyColors, Theme, WallLightsInfo, Drawable } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { Grid, OUTLINE, cached, classicProp, floorPlan, hash, makeCanvas, mix, rng } from "../../themekit.ts";
import { P, papers } from "./pal.ts";
import { planOf, siteOf, type Site } from "./plan.ts";
import { leakTop, tubes, urnOf, type Tube } from "./fixtures.ts";
import { clickDecor, clickLights, clickOverlay, clickUnderlay, tubeKick, type ClutterSpots } from "./clicks.ts";
import { habitDecor, habitLights, habitOverlay } from "./habits.ts";
import { streetLights, surroundingsRain } from "./street.ts";

// ------------------------------------------------------------------ sky

function sky(hour: number, classic: SkyColors): SkyColors {
  const n = classic.night;
  const day = { top: "#8c9298", bottom: "#b3b5b0" };
  const night = { top: "#12141b", bottom: "#3a2c22" };
  let top = mix(day.top, night.top, n);
  let bottom = mix(day.bottom, night.bottom, n);
  // A brief bruised dusk and a dirty dawn.
  const dusk = Math.max(0, 1 - Math.abs(n - 0.45) / 0.3);
  if (dusk > 0 && hour > 4 && hour < 22) {
    top = mix(top, "#5e5260", dusk * 0.5);
    bottom = mix(bottom, "#b0806a", dusk * 0.55);
  }
  return { top, bottom, night: n };
}

// ------------------------------------------------------------------ the view: a back street

interface View {
  canvas: HTMLCanvasElement;
  /** Window boxes of the building opposite (for live flickers). */
  lit: { x: number; y: number; w: number; h: number; color: string }[];
  /** Pigeon perch: y of the ledge. */
  ledge: number;
}

function buildView(w: number, h: number, index: number, nightView: boolean, wet: boolean): View {
  const r = rng(hash(`annex-view-${index}-${w}x${h}`));
  const lit: View["lit"] = [];
  const kind = index % 3;
  // Below the bunched blind: a strip of sky over the rooftops opposite.
  const roof = Math.min(h - 16, 11 + ((index * 5) % 3) * 2);
  let ledge = h - 6;
  const canvas = makeCanvas(w, h, (ctx) => {
    const f = (x: number, y: number, ww: number, hh: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, ww, hh);
    };
    const dim = (c: string) => (nightView ? mix(c, "#0c0a0a", 0.6) : wet ? mix(c, "#262a2e", 0.2) : c);
    if (kind === 2) {
      // A gap between buildings: a paler block further off, a crane of a chimney stack.
      f(0, roof - 3, w, h - roof + 3, dim("#6a6862"));
      for (let y = roof; y < h; y += 5) for (let x = 2 + ((y / 5) % 2) * 3; x < w; x += 6) f(x, y, 2, 2, nightView && r() < 0.3 ? "#c8a060" : dim("#55534e"));
      f(w - 14, roof - 9, 4, 9, dim("#5a4a40"));
      f(w - 15, roof - 10, 6, 1, dim("#4a3c34"));
    }
    // The building opposite: parapet, chimney pots, an old aerial.
    const bx0 = kind === 2 ? 0 : 0;
    const bx1 = kind === 2 ? Math.floor(w * 0.55) : w;
    f(bx0, roof, bx1 - bx0, h - roof, dim("#5a463c"));
    f(bx0, roof, bx1 - bx0, 2, dim("#6e6660"));
    f(bx0, roof + 2, bx1 - bx0, 1, dim("#2e2420"));
    const cx = bx0 + 3 + Math.floor(r() * Math.max(1, bx1 - bx0 - 14));
    f(cx, roof - 5, 9, 5, dim("#6a4c40"));
    f(cx, roof - 5, 9, 1, dim("#7a5a4c"));
    f(cx + 1, roof - 7, 2, 2, dim("#8a6a50"));
    f(cx + 4, roof - 8, 2, 3, dim("#8a6a50"));
    f(cx + 7, roof - 7, 1, 2, dim("#8a6a50"));
    if (kind === 0) {
      const ax = w - 8 - Math.floor(r() * 8);
      f(ax, roof - 9, 1, 9, dim("#2a2826"));
      f(ax - 4, roof - 7, 9, 1, dim("#2a2826"));
      f(ax - 3, roof - 4, 7, 1, dim("#2a2826"));
    }
    // Brick, darkened by a century of soot.
    for (let y = roof + 3; y < h; y += 3) {
      const off = ((y - roof) / 3) % 2 ? 2 : 0;
      f(bx0, y + 2, bx1 - bx0, 1, dim("#3e3029"));
      for (let x = bx0 - off; x < bx1; x += 5) {
        const k = r();
        f(x, y, 4, 2, dim(k < 0.15 ? "#6a5244" : k < 0.3 ? "#4a3a32" : "#5a463c"));
      }
    }
    for (let k = 0; k < 4; k++) {
      const sx = bx0 + Math.floor(r() * (bx1 - bx0));
      ctx.fillStyle = nightView ? "rgba(0,0,0,0.25)" : "rgba(24,16,12,0.4)";
      ctx.fillRect(sx, roof + 3, 2, 6 + Math.floor(r() * 14));
    }
    // Windows opposite: dark by day, a few lit at night.
    const wy = roof + 6;
    const wh = Math.min(10, h - wy - 10);
    const spots = kind === 2 ? [3 + Math.floor(r() * 4)] : [3 + Math.floor(r() * 3), w - 13 - Math.floor(r() * 3)];
    for (const [i, wx] of spots.entries()) {
      if (wh < 5) break;
      const ww = 9;
      f(wx - 1, wy - 1, ww + 2, wh + 2, dim("#8a8478"));
      f(wx - 2, wy + wh + 1, ww + 4, 1, dim("#a29a8c"));
      const on = nightView && r() < 0.7;
      const color = on ? (i % 2 ? "#a8bcc4" : "#e0b468") : "#22272b";
      f(wx, wy, ww, wh, color);
      if (on) {
        lit.push({ x: wx, y: wy, w: ww, h: wh, color });
        f(wx + 5, wy + wh - 5, 2, 5, "#3a2a20");
      } else {
        f(wx + 1, wy + 1, 2, 2, dim("#3a4248"));
      }
      f(wx, wy + Math.floor(wh / 2), ww, 1, dim("#8a8478"));
      if (r() < 0.5) f(wx, wy, ww, 3, on ? "#b88a48" : dim("#6e6a60"));
      ledge = Math.min(ledge, wy + wh + 1);
    }
    // A drainpipe, or a fire escape zigzagging down.
    const iron = dim("#1c1a18");
    if (kind === 1) {
      const px = Math.floor(w / 2) - 1;
      f(px, roof - 1, 2, h - roof + 1, iron);
      f(px - 2, roof - 1, 6, 2, iron);
      for (let y = roof + 5; y < h; y += 8) f(px - 1, y, 4, 1, dim("#3a3632"));
    } else if (kind === 0) {
      const fx = Math.floor(w / 2) - 4;
      const ly = wy + wh + 2;
      f(fx - 2, ly, 14, 1, iron);
      f(fx - 2, ly - 3, 14, 1, iron);
      for (let x = fx - 2; x <= fx + 11; x += 3) f(x, ly - 3, 1, 3, iron);
      for (let k = 0; k < 9 && ly + 1 + k < h; k++) f(fx + 10 - k, ly + 1 + k, 2, 1, iron);
    }
    // A street lamp on our side of the road.
    if (index % 2 === 0) {
      const lx = kind === 2 ? w - 10 : 2 + ((index * 7) % (w - 12));
      f(lx + 3, h - 9, 1, 9, "#1e1c1a");
      f(lx, h - 11, 7, 2, "#1e1c1a");
      f(lx + 1, h - 9, 5, 1, nightView ? "#ffc070" : "#8a8a80");
      if (nightView) {
        const g = ctx.createRadialGradient(lx + 3.5, h - 8, 0, lx + 3.5, h - 8, 13);
        g.addColorStop(0, "rgba(255,170,80,0.5)");
        g.addColorStop(1, "rgba(255,170,80,0)");
        ctx.fillStyle = g;
        ctx.fillRect(lx - 12, h - 22, 31, 22);
      }
    }
    if (wet) {
      ctx.fillStyle = nightView ? "rgba(255,170,90,0.1)" : "rgba(200,210,220,0.1)";
      ctx.fillRect(0, h - 3, w, 3);
    }
  });
  return { canvas, lit, ledge };
}

function outside(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void {
  const nightView = info.night > 0.45;
  const wet = info.weather === "rain" || info.weather === "drizzle" || info.weather === "storm";
  const view = cached(`annex|view|${win.w}x${win.h}|${index}|${nightView}|${wet}`, () => buildView(win.w, win.h, index, nightView, wet));
  ctx.drawImage(view.canvas, win.x, win.y);
  const t = info.t;
  // Someone opposite watching telly: a blue flicker.
  if (nightView && view.lit.length > 0) {
    const b = view.lit[0]!;
    const k = 0.15 + 0.12 * Math.sin(t * 7 + index) + 0.08 * Math.sin(t * 13.3);
    ctx.fillStyle = `rgba(140,170,255,${Math.max(0, k)})`;
    ctx.fillRect(win.x + b.x, win.y + b.y, b.w, b.h);
  }
  // A pigeon on the ledge opposite, bobbing, by day.
  if (!nightView && info.weather !== "storm" && hash(`pigeon${index}-${Math.floor(t / 23)}`) % 3 === 0) {
    const px = win.x + 6 + (hash(`px${index}-${Math.floor(t / 23)}`) % Math.max(1, win.w - 14));
    const py = win.y + view.ledge - 1;
    const bob = Math.floor(t * 2.3 + index) % 3 === 0 ? 1 : 0;
    ctx.fillStyle = "#7a7c80";
    ctx.fillRect(px, py - 3, 4, 3);
    ctx.fillStyle = "#6a6c70";
    ctx.fillRect(px + 3, py - 4 + bob, 2, 2);
    ctx.fillStyle = "#5a7a6a";
    ctx.fillRect(px + 3, py - 2 + bob, 1, 1);
    ctx.fillStyle = "#c08a50";
    ctx.fillRect(px + 5, py - 3 + bob, 1, 1);
    ctx.fillStyle = "#4a4c50";
    ctx.fillRect(px - 1, py - 2, 1, 1);
  }
  // A red bus trundling along the street below, passing every window in turn.
  const bx = ((t % 70) * 26) - 120;
  if (bx + 72 > win.x && bx < win.x + win.w) {
    const by = win.y + win.h - 9;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(Math.round(bx) - 1, by - 1, 72, 11);
    ctx.fillStyle = "#8e3b32";
    ctx.fillRect(Math.round(bx), by, 70, 10);
    ctx.fillStyle = "#a9503f";
    ctx.fillRect(Math.round(bx), by, 70, 1);
    ctx.fillStyle = nightView ? "#d8c080" : "#2e3236";
    for (let k = 4; k < 66; k += 7) ctx.fillRect(Math.round(bx) + k, by + 2, 5, 3);
    ctx.fillRect(Math.round(bx) + 66, by + 2, 3, 6);
  }
  // Headlights sweeping past at night.
  if (nightView) {
    const cxp = ((t * 60 + index * 0) % 900) - 50;
    if (cxp > win.x - 4 && cxp < win.x + win.w) {
      ctx.fillStyle = "rgba(255,240,200,0.8)";
      ctx.fillRect(Math.round(cxp), win.y + win.h - 3, 2, 1);
      ctx.fillRect(Math.round(cxp) + 5, win.y + win.h - 3, 2, 1);
    }
  }
}

// ------------------------------------------------------------------ fluorescent tubes

/** The tube that buzzes and blinks no matter what. */
function buzzer(L: Layout, list: Tube[]): number {
  return list.length > 2 ? (hash(`annex-buzz-${L.W}`) % (list.length - 1)) + 1 : 0;
}

/** 0..1 brightness of tube i at time t. */
function tubeLevel(i: number, L: Layout, list: Tube[], info: WallLightsInfo | PaintInfo, dead: number): number {
  const t = info.t;
  const party = "party" in info && info.party;
  if (party) {
    const beat = Math.floor(t * 7);
    return (i + beat) % 3 === 0 ? 1 : (hash(`p${i}-${beat}`) % 4 === 0 ? 0.9 : 0.15);
  }
  // Someone clicked it (or thumped it).
  const kick = tubeKick(L, i, t);
  if (kick !== null) return kick;
  if (i === dead) {
    // Dead, apart from a feeble sputter now and then.
    return Math.floor(t * 9) % 23 === 0 ? 0.6 : 0;
  }
  if (i === buzzer(L, list)) {
    const ph = t % 6.3;
    if (ph < 1.1) return hash(`b${Math.floor(t * 18)}`) % 3 === 0 ? 0.1 : 0.85;
    return 0.8;
  }
  return 0.92 + 0.08 * Math.sin(t * 50 + i);
}

function deadTube(list: Tube[], brokenBulbX: number | null): number {
  if (brokenBulbX === null) return -1;
  let best = -1;
  let dist = Infinity;
  list.forEach((tb, i) => {
    const d = Math.abs(tb.x + tb.w / 2 - brokenBulbX);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

let lastDead = -1;

function wallLights(ctx: CanvasRenderingContext2D, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const list = tubes(L);
  const dead = deadTube(list, info.brokenBulbX);
  lastDead = dead;
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  list.forEach((tb, i) => {
    const lv = tubeLevel(i, L, list, info, dead);
    if (!glow) {
      // The fitting: a grimy metal trough, the tube behind a yellowed diffuser.
      ctx.fillStyle = "#5e5c52";
      ctx.fillRect(tb.x - 1, 0, tb.w + 2, 4);
      ctx.fillStyle = "#8f8d80";
      ctx.fillRect(tb.x, 0, tb.w, 1);
      ctx.fillStyle = lv > 0.5 ? "#eef2dc" : lv > 0.05 ? "#b4b7a2" : "#6a6b62";
      ctx.fillRect(tb.x + 1, 1, tb.w - 2, 2);
      if (i === dead && lv <= 0.05) {
        // Dying ends glow a little orange.
        ctx.fillStyle = "#b07a4a";
        ctx.fillRect(tb.x + 1, 1, 1, 2);
        ctx.fillRect(tb.x + tb.w - 2, 1, 1, 2);
      }
      // A dead fly or two in the diffuser.
      ctx.fillStyle = "#3a3630";
      ctx.fillRect(tb.x + 4 + ((i * 5) % 12), 2, 1, 1);
      ctx.fillStyle = "rgba(40,30,20,0.25)";
      ctx.fillRect(tb.x - 1, 4, tb.w + 2, 1);
      return;
    }
    if (lv <= 0.05) return;
    const k = Math.max(0.3, Math.min(1, night * 1.2)) * lv;
    if (k > 0.02) {
      const cone = cached("annex|cone", () =>
        makeCanvas(60, 44, (c) => {
          for (let y = 0; y < 44; y++) {
            const a = 0.32 * (1 - y / 44) * (1 - y / 44);
            const half = 11 + y * 0.42;
            c.fillStyle = `rgba(232,240,200,${a})`;
            c.fillRect(Math.round(30 - half), y, Math.round(half * 2), 1);
          }
        }),
      );
      ctx.save();
      ctx.globalAlpha = k;
      ctx.drawImage(cone, tb.x + tb.w / 2 - 30, 3);
      ctx.restore();
    }
    if (night > 0.3) {
      ctx.fillStyle = lv > 0.5 ? "#f6f8ea" : "#c9ccb6";
      ctx.fillRect(tb.x + 1, 1, tb.w - 2, 2);
    }
  });
}

// ------------------------------------------------------------------ clutter: boxes, cabinets, the leak

type Kind = "boxes" | "cabinet" | "pile" | "chair" | "deadplant" | "sign" | "coatstand" | "crts" | "copier" | "chairs" | "carpet" | "urn";

interface Item {
  kind: Kind | "bucket";
  x: number;
  y: number;
  canvas: HTMLCanvasElement;
  /** Base y for depth sorting. */
  z: number;
}

function boxStack(seed: number): HTMLCanvasElement {
  return cached(`annex|deco|boxes|${seed % 3}`, () => {
    const g = new Grid(20, 22);
    const n = 2 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const y = 21 - (i + 1) * 7;
      const x = 1 + ((i * 3 + seed) % 3);
      const c = i % 2 ? P.card : "#9a7a50";
      g.rect(x, y, 16, 7, c);
      g.rect(x, y, 16, 2, i % 2 ? P.cardHi : "#ad8c5e");
      g.rect(x + 7, y, 2, 2, P.tape);
      g.rect(x + 3, y + 3, 6, 3, P.paperOld).rect(x + 4, y + 4, 4, 1, P.paperLine);
      if (i === 0) g.rect(x, y + 5, 16, 1, "#7a5e3c");
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function cabinet(seed: number): HTMLCanvasElement {
  return cached(`annex|deco|cabinet|${seed % 2}`, () => {
    const g = new Grid(16, 30);
    g.rect(1, 1, 14, 28, P.metal);
    g.rect(1, 1, 14, 2, P.metalHi);
    for (let y = 4; y < 28; y += 6) {
      g.rect(2, y, 12, 5, P.metalLo);
      g.rect(2, y, 12, 1, P.metal);
      g.rect(6, y + 2, 4, 1, P.metalDk);
      g.rect(5, y + 1, 6, 1, P.paper);
    }
    // One drawer jammed open, files spilling out.
    if (seed % 2 === 0) {
      g.rect(1, 15, 14, 4, P.metalDk);
      g.rect(2, 13, 12, 3, "#c9bc94").rect(3, 12, 3, 2, "#6a7a5a").rect(9, 12, 3, 2, "#c8a050");
    }
    g.rect(3, 4, 5, 2, "#6a8a6a");
    g.set(12, 26, P.rust).set(3, 24, P.rust);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function pile(seed: number): HTMLCanvasElement {
  return cached(`annex|deco|pile|${seed % 3}`, () => {
    // Towers of paper nobody will ever read again, and a box file on its side.
    const g = new Grid(18, 18);
    const tower = (x: number, w: number, h: number, lean: number) => {
      const top = 16 - h;
      for (let j = 0; j < h - 3; j++) {
        const y = top + 3 + j;
        const dx = Math.round((j / h) * lean);
        g.rect(x + dx, y, w, 1, j % 3 === 2 ? "#b4aa8a" : j % 2 ? P.paperOld : "#ddd5bc");
      }
      g.rect(x, top, w, 3, P.paper);
      g.rect(x + 1, top + 1, w - 3, 1, P.paperLine);
    };
    tower(1, 8, 9 + (seed % 3) * 2, seed % 2 ? 1 : -1);
    tower(9, 7, 6 + (seed % 2) * 2, 0);
    if (seed % 3 !== 1) g.rect(10, 13 - (seed % 2) * 2, 7, 3, "#6a7a5a").rect(10, 13 - (seed % 2) * 2, 7, 1, "#7f8f6a").rect(12, 14 - (seed % 2) * 2, 3, 1, P.paper);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function brokenChair(): HTMLCanvasElement {
  return cached("annex|deco|chair", () => {
    // An office chair that gave up: back snapped, one castor gone.
    const g = new Grid(18, 18);
    g.rrect(3, 5, 11, 4, "#4a4a44", 1);
    g.rect(4, 5, 9, 1, "#5e5e56");
    g.rect(13, 1, 3, 7, "#4a4a44").rect(14, 1, 1, 6, "#5e5e56");
    g.rect(5, 6, 3, 1, P.foam);
    g.rect(8, 9, 2, 4, P.metalDk);
    g.rect(3, 13, 12, 1, P.metalDk);
    g.set(3, 14, "#2a2826").set(14, 14, "#2a2826");
    g.rect(1, 15, 3, 2, "#2a2826");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function deadPlant(): HTMLCanvasElement {
  return cached("annex|deco|deadplant", () => {
    const g = new Grid(16, 26);
    g.rect(4, 18, 8, 7, "#7a5a3e");
    g.rect(4, 18, 8, 1, "#8f6c4a");
    g.rect(5, 17, 6, 1, "#3a2a1e");
    const fronds: [number, number, number, number][] = [
      [7, 17, 3, 3],
      [8, 17, 12, 6],
      [7, 16, 1, 9],
      [9, 16, 14, 11],
      [6, 17, 2, 13],
    ];
    for (const [x0, y0, x1, y1] of fronds) g.line(x0, y0, x1, y1, P.leafDead);
    g.set(3, 3, P.leafDry).set(12, 6, P.leafDry).set(1, 13, P.leafDry).set(14, 11, P.leafDry);
    g.set(13, 24, P.leafDead).set(2, 24, P.leafDry);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function wetSign(): HTMLCanvasElement {
  return cached("annex|deco|sign", () => {
    // A yellow A-frame that's been "temporary" for two years.
    const g = new Grid(12, 16);
    g.rect(2, 1, 8, 13, "#c9b040");
    g.rect(2, 1, 8, 1, "#ddc65a");
    g.rect(1, 13, 10, 2, "#a89030");
    g.rect(5, 4, 2, 4, "#2a2620").set(5, 9, "#2a2620").set(6, 9, "#2a2620");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function coatStand(): HTMLCanvasElement {
  return cached("annex|deco|coat", () => {
    // A coat stand: a crumpled overcoat, a trilby, a brolly that never dries.
    const g = new Grid(16, 40);
    g.rect(7, 4, 2, 33, P.woodDk);
    g.rect(4, 37, 8, 2, P.woodDk);
    g.set(5, 4, P.woodDk).set(10, 4, P.woodDk);
    g.rect(4, 2, 8, 2, "#4a4036").rect(3, 3, 10, 1, "#3a322a");
    g.rect(3, 6, 10, 16, "#7a6a4e");
    g.rect(4, 6, 3, 15, "#8c7c5c");
    g.rect(10, 8, 3, 13, "#6a5a40");
    g.rect(7, 6, 2, 6, "#5e5040");
    g.rect(2, 9, 2, 10, "#6a5a40");
    g.rect(3, 22, 9, 2, "#6a5a40").set(5, 24, "#6a5a40");
    g.rect(12, 22, 2, 13, "#2a3038").set(13, 35, "#2a3038").set(11, 34, "#2a3038");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function crtStack(seed: number): HTMLCanvasElement {
  return cached(`annex|deco|crts|${seed % 2}`, () => {
    // Dead monitors stacked two high, a tangle of leads.
    const g = new Grid(18, 24);
    for (const [y, dx] of [[11, 0], [1, 1 + (seed % 2)]] as const) {
      g.rect(1 + dx, y + 1, 14, 10, P.beigeLo);
      g.rect(1 + dx, y + 1, 14, 1, P.beige);
      g.rect(3 + dx, y + 3, 10, 6, "#2a2a26");
      g.set(4 + dx, y + 4, "#4a4a44");
    }
    g.rect(2, 21, 12, 2, P.beigeDk);
    g.rect(14, 16, 3, 1, "#2a2826").set(16, 17, "#2a2826").set(15, 18, "#2a2826");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function copier(): HTMLCanvasElement {
  return cached("annex|deco|copier", () => {
    // A photocopier that died in the nineties, a sheet over half of it.
    const g = new Grid(28, 24);
    g.rect(1, 6, 26, 16, P.beigeLo);
    g.rect(1, 6, 26, 1, P.beige);
    g.rect(3, 9, 22, 4, P.beigeDk);
    g.rect(2, 2, 24, 5, P.beige);
    g.rect(4, 3, 20, 2, "#3a3630");
    g.rect(14, 1, 13, 14, "#cfc8b0");
    g.rect(14, 1, 13, 1, "#e0dac6");
    g.rect(16, 6, 1, 8, "#b8b098").rect(22, 4, 1, 10, "#b8b098");
    g.rect(3, 15, 9, 5, P.beigeDk).rect(4, 16, 7, 1, P.beige);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function chairStack(): HTMLCanvasElement {
  return cached("annex|deco|chairs", () => {
    // Plastic chairs stacked up to the ceiling, more or less.
    const g = new Grid(16, 26);
    const colors = ["#b0603a", "#5c6470", "#b0603a", "#6a7a5a", "#b0603a"];
    colors.forEach((c, i) => {
      const y = 2 + i * 3;
      g.rrect(3, y, 10, 4, c, 1);
      g.rect(4, y, 8, 1, "#c8784c");
    });
    g.rect(2, 17, 12, 3, "#b0603a");
    g.rect(3, 20, 1, 5, P.metal).rect(12, 20, 1, 5, P.metal);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function urnTrolley(): HTMLCanvasElement {
  return cached("annex|deco|urn", () => {
    // A tea urn on a squeaky trolley, for office dos.
    const g = new Grid(18, 24);
    g.rect(1, 10, 16, 2, P.metal).rect(1, 10, 16, 1, P.metalHi);
    g.rect(1, 18, 16, 2, P.metalLo);
    g.rect(2, 12, 1, 8, P.metalDk).rect(15, 12, 1, 8, P.metalDk);
    g.set(2, 21, "#2a2826").set(15, 21, "#2a2826");
    g.rrect(5, 1, 8, 9, "#a9aba2", 1);
    g.rect(6, 2, 2, 6, "#c8cac0");
    g.rect(8, 0, 2, 1, P.metalDk);
    g.rect(12, 6, 3, 1, P.metalDk);
    g.rect(3, 7, 2, 3, "#c8bc97").rect(13, 15, 3, 3, "#c8bc97").rect(4, 15, 4, 3, P.card);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function rolledCarpet(): HTMLCanvasElement {
  return cached("annex|deco|carpet", () => {
    const g = new Grid(26, 10);
    g.rect(2, 2, 22, 6, "#7a4a3a");
    g.rect(2, 2, 22, 1, "#8e5a46");
    for (let x = 5; x < 22; x += 5) g.rect(x, 3, 1, 5, "#6a3e30");
    g.ellipse(23, 5, 2, 3, "#a87a5a");
    g.set(23, 5, "#6a3e30");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** One or two boxes, low enough to stack along a corridor without tripping anyone (16×12). */
function lowBoxes(seed: number): HTMLCanvasElement {
  return cached(`annex|deco|lowbox|${seed % 4}`, () => {
    const g = new Grid(18, 12);
    const files = seed % 4 === 3;
    if (files) {
      // Box files on their sides, spines out.
      for (let i = 0; i < 4; i++) g.rect(1 + i * 4, 3, 4, 8, ["#6a7a5a", "#5a6470", "#8a6a3a", "#6a5a70"][i]!).rect(2 + i * 4, 5, 2, 1, P.paper);
    } else {
      g.rect(1, 4, 15, 7, "#9a7a50").rect(1, 4, 15, 2, "#ad8c5e").rect(7, 4, 2, 2, P.tape);
      g.rect(3, 7, 5, 3, P.paperOld);
      if (seed % 2) g.rect(4, 0, 12, 5, P.card).rect(4, 0, 12, 1, P.cardHi).rect(9, 1, 2, 1, P.tape);
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function bucket(): HTMLCanvasElement {
  return cached("annex|deco|bucket", () => {
    const g = new Grid(12, 11);
    g.ellipse(5.5, 2.5, 4.5, 2, P.metalLo);
    g.ellipse(5.5, 2.5, 3.5, 1.2, "#5a6a72");
    g.rect(2, 3, 8, 6, P.metal);
    g.rect(2, 3, 2, 6, P.metalHi);
    g.rect(2, 8, 8, 1, P.metalLo);
    g.set(1, 2, P.metalDk).set(10, 2, P.metalDk);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function clutter(L: Layout): Item[] {
  return cached(`annex|clutter|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const plan = floorPlan(L);
    const items: Item[] = [];
    const taken: Rect[] = [];
    const overlap = (a: Rect, b: Rect, m = 0) => a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;
    const plants: Rect[] = L.plants.filter((pl) => pl.sprite !== "HANGING_PLANT").map((pl) => ({ x: pl.x, y: pl.y, w: pl.sprite === "LARGE_PLANT" ? 32 : 16, h: pl.sprite === "LARGE_PLANT" ? 48 : 32 }));
    const clash = (r: Rect) => taken.some((o) => overlap(r, o, 4)) || plants.some((o) => overlap(r, o, 2));
    // Keep off the event floor and wherever the gags and the handyman walk.
    const building = planOf(L);
    const ev = L.eventArea;
    const walks = building?.extra ?? [];
    const nearWalk = (r: Rect) =>
      walks.some((path) =>
        path.some((p, i) => {
          const q = path[i + 1];
          if (!q) return false;
          const x0 = Math.min(p.x, q.x) - 8;
          const x1 = Math.max(p.x, q.x) + 8;
          const y0 = Math.min(p.y, q.y) - 8;
          const y1 = Math.max(p.y, q.y) + 4;
          return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0;
        }),
      );
    const site = siteOf(L);
    const add = (kind: Item["kind"], canvas: HTMLCanvasElement, at: Rect) => {
      const r = { x: at.x, y: at.y, w: canvas.width, h: canvas.height };
      if (r.x < site.x + 6 || r.x + r.w > site.x + site.w - 6 || r.y + r.h > site.h - 4) return false;
      if (overlap(r, ev, 6) || nearWalk(r)) return false;
      if (clash(r) || !plan.isFree(r)) return false;
      taken.push(r);
      items.push({ kind, x: r.x, y: r.y, canvas, z: r.y + r.h - 1 });
      return true;
    };
    // The tea urn has its own spot in the old hall (you can click it).
    const urn = urnOf(L);
    if (urn) {
      taken.push(urn);
      items.push({ kind: "urn", x: urn.x, y: urn.y, canvas: urnTrolley(), z: urn.y + urn.h - 1 });
    }
    // The leak: a bucket in the open, near the top half.
    const leakSpots = plan.find(14, 12, 6, { x: 20, y: 40, w: L.W - 40, h: Math.max(60, L.H * 0.6) });
    for (const leak of [...leakSpots.slice(Math.floor(leakSpots.length / 2)), ...leakSpots]) {
      if (!add("bucket", bucket(), leak)) continue;
      // And the sign that's been out since the leak started.
      add("sign", wetSign(), { x: leak.x + 15, y: leak.y - 6, w: 12, h: 16 }) || add("sign", wetSign(), { x: leak.x - 14, y: leak.y - 6, w: 12, h: 16 });
      break;
    }
    // Your office: the messiest room in the building.
    const boss = L.boss.room;
    for (const s of plan.find(18, 12, 3, boss)) add("pile", pile(hash(`bp${s.x}`)), s);
    for (const s of plan.find(20, 22, 1, boss)) add("boxes", boxStack(hash(`bb${s.x}`)), s);
    // Beside the desks, where a pod would have gone: filing cabinets shoulder to shoulder, boxes on top.
    for (const c of building?.cells ?? []) {
      if (c.kind !== "junk") continue;
      const rs = rng(hash(`junk-${c.r.x}-${c.r.y}`));
      for (let bottom = c.r.y + Math.min(32, c.r.h); bottom <= c.r.y + c.r.h; bottom += 34) {
        for (let x = c.r.x + c.r.w - 1; x > c.r.x + 2; ) {
          const k = rs();
          const seed = Math.floor(rs() * 1000);
          const canvas = k < 0.5 ? cabinet(seed) : k < 0.8 ? boxStack(seed) : k < 0.9 ? crtStack(seed) : pile(seed);
          const kind: Kind = k < 0.5 ? "cabinet" : k < 0.8 ? "boxes" : k < 0.9 ? "crts" : "pile";
          if (x - canvas.width < c.r.x + 1) break;
          const at = { x: x - canvas.width, y: bottom - canvas.height, w: canvas.width, h: canvas.height };
          if (add(kind, canvas, at)) x -= canvas.width - 1;
          else x -= 6;
        }
      }
    }
    // The storerooms, crammed: boxes, cabinets and dead equipment in rows.
    for (const c of building?.cells ?? []) {
      if (c.kind !== "storage") continue;
      const rs = rng(hash(`store-${c.r.x}-${c.r.y}`));
      for (let bottom = c.r.y + Math.min(30, c.r.h - 2); bottom <= c.r.y + c.r.h - 2; bottom += 28) {
        for (let x = c.r.x + 5; x < c.r.x + c.r.w - 8; ) {
          const k = rs();
          const seed = Math.floor(rs() * 1000);
          const kind: Kind = k < 0.42 ? "boxes" : k < 0.56 ? "cabinet" : k < 0.68 ? "crts" : k < 0.76 ? "copier" : k < 0.86 ? "chairs" : k < 0.93 ? "carpet" : "deadplant";
          const canvas = kind === "boxes" ? boxStack(seed) : kind === "cabinet" ? cabinet(seed) : kind === "crts" ? crtStack(seed) : kind === "copier" ? copier() : kind === "chairs" ? chairStack() : kind === "carpet" ? rolledCarpet() : deadPlant();
          if (x + canvas.width > c.r.x + c.r.w - 3) break;
          const at = { x, y: Math.min(bottom, c.r.y + c.r.h - 2) - canvas.height, w: canvas.width, h: canvas.height };
          if (at.y >= c.r.y + 3 && add(kind, canvas, at)) x += canvas.width + 1 + Math.floor(rs() * 3);
          else x += 6;
        }
      }
    }
    // The old hall: chairs stacked down the side under the tea urn on its trolley.
    for (const c of building?.cells ?? []) {
      if (c.kind !== "hall") continue;
      for (let y = c.r.y + 36; y + 26 <= c.r.y + c.r.h - 4; y += 30) add("chairs", chairStack(), { x: c.r.x + 5, y, w: 16, h: 26 });
    }
    // Every room's walls lined with whatever came out of the last office move.
    const lining: Kind[] = ["cabinet", "boxes", "pile", "boxes", "crts", "cabinet", "deadplant", "boxes", "chair", "pile", "coatstand", "cabinet"];
    const sprite = (kind: Kind, seed: number) =>
      kind === "boxes" ? boxStack(seed) : kind === "cabinet" ? cabinet(seed) : kind === "pile" ? pile(seed) : kind === "crts" ? crtStack(seed) : kind === "chair" ? brokenChair() : kind === "deadplant" ? deadPlant() : coatStand();
    for (const c of building?.cells ?? []) {
      if (!["break", "kitchen", "hall", "waiting", "games", "archive", "nook"].includes(c.kind)) continue;
      const rl = rng(hash(`line-${c.kind}-${c.r.x}-${c.r.y}`));
      let k = Math.floor(rl() * lining.length);
      const next = () => {
        const kind = lining[k++ % lining.length]!;
        return { kind, canvas: sprite(kind, Math.floor(rl() * 1000)) };
      };
      // Along the bottom, then up both sides.
      const floorY = Math.min(c.r.y + c.r.h - 1, site.h - 5);
      for (let x = c.r.x + 4; x < c.r.x + c.r.w - 8; ) {
        const { kind, canvas } = next();
        if (add(kind, canvas, { x, y: floorY - canvas.height, w: canvas.width, h: canvas.height })) x += canvas.width + 1 + Math.floor(rl() * 4);
        else x += 5;
      }
      for (const left of [true, false]) {
        for (let bottom = floorY - 25; bottom > c.r.y + 34; ) {
          const { kind, canvas } = next();
          const x = left ? c.r.x + 4 : c.r.x + c.r.w - 4 - canvas.width;
          if (add(kind, canvas, { x, y: bottom - canvas.height, w: canvas.width, h: canvas.height })) bottom -= canvas.height - 6;
          else bottom -= 6;
        }
      }
    }
    // And everywhere else: whatever fits, and plenty of it.
    const n = Math.max(6, Math.min(30, Math.round((site.w * site.h) / 11000)));
    // Clutter collects against walls and furniture, not in the middle of the floor.
    const all = plan.find(20, 30, 160);
    const solids: Rect[] = [];
    for (const p of L.props) {
      const c = classicProp(p, L);
      solids.push({ x: p.x, y: p.y, w: c.width, h: c.height });
    }
    for (const d of L.desks) solids.push({ x: d.x, y: d.y + 10, w: 48, h: 22 });
    for (const rm of L.rooms) {
      if (!rm.walls) continue;
      const q = rm.rect;
      solids.push({ x: q.x - 3, y: q.y - 3, w: q.w + 6, h: 3 }, { x: q.x - 3, y: q.y, w: 3, h: q.h }, { x: q.x + q.w, y: q.y, w: 3, h: q.h }, { x: q.x - 3, y: q.y + q.h, w: q.w + 6, h: 3 });
    }
    for (const sg of L.segments) solids.push({ x: sg.x0, y: 0, w: sg.x1 - sg.x0, h: sg.depth });
    solids.push({ x: site.x - 10, y: 0, w: 10, h: site.h }, { x: site.x + site.w, y: 0, w: 10, h: site.h }, { x: site.x, y: site.h, w: site.w, h: 10 });
    const hugs = (s: Rect) => solids.some((o) => s.x - 5 < o.x + o.w && s.x + s.w + 5 > o.x && s.y - 5 < o.y + o.h && s.y + s.h + 5 > o.y);
    const spots = all.filter(hugs).sort((a, b) => (hash(`${a.x},${a.y}`) % 97) - (hash(`${b.x},${b.y}`) % 97));
    const r = rng(hash(`annex-clutter-${L.W}x${L.H}`));
    const order: Kind[] = ["boxes", "cabinet", "pile", "deadplant", "boxes", "chair", "cabinet", "pile", "coatstand", "boxes", "pile", "cabinet", "boxes", "pile"];
    let placed = 0;
    for (const s of spots) {
      if (placed >= n) break;
      const kind = order[placed % order.length]!;
      const seed = Math.floor(r() * 1000);
      const canvas =
        kind === "boxes" ? boxStack(seed) : kind === "cabinet" ? cabinet(seed) : kind === "pile" ? pile(seed) : kind === "chair" ? brokenChair() : kind === "deadplant" ? deadPlant() : kind === "sign" ? wetSign() : coatStand();
      // Sit it at the bottom of the free box so it stands on the floor there.
      const at = { x: s.x + Math.floor((20 - canvas.width) / 2), y: s.y + 30 - canvas.height, w: canvas.width, h: canvas.height };
      if (add(kind, canvas, at)) placed++;
    }
    items.push(...corridorBoxes(L, site, taken));
    return items;
  });
}

/**
 * Boxes stacked along the corridors, against the partitions on both sides:
 * not across doorways, junctions, the windows at the ends or the way in.
 */
function corridorBoxes(L: Layout, site: Site, taken: Rect[]): Item[] {
  const out: Item[] = [];
  const walks = [...L.spots.map((s) => s.path), ...(planOf(L)?.extra ?? [])];
  const crosses = (x0: number, x1: number, y0: number, y1: number) =>
    walks.some((path) =>
      path.some((p, i) => {
        const q = path[i + 1];
        if (!q || Math.abs(p.x - q.x) >= 1) return false;
        return p.x > x0 - 10 && p.x < x1 + 10 && Math.min(p.y, q.y) < y1 && Math.max(p.y, q.y) > y0;
      }),
    );
  const solid: Rect[] = [];
  for (const p of L.props) {
    const c = classicProp(p, L);
    solid.push({ x: p.x, y: p.y, w: c.width, h: c.height });
  }
  for (const d of L.desks) solid.push({ x: d.x, y: d.y - 12, w: 48, h: 50 });
  for (const pl of L.plants) if (pl.sprite !== "HANGING_PLANT") solid.push({ x: pl.x, y: pl.y, w: 16, h: 32 });
  const hit = (r: Rect) => [...solid, ...taken].some((o) => r.x < o.x + o.w + 2 && r.x + r.w + 2 > o.x && r.y < o.y + o.h && r.y + r.h > o.y);
  L.net.halls.forEach((hy, h) => {
    for (const up of [true, false]) {
      const r = rng(hash(`annex-corr-${hy}-${up}-${L.W}`));
      for (let x = site.x + 30 + Math.floor(r() * 20); x + 18 < site.x + site.w - 30; x += 18 + Math.floor(r() * 46)) {
        if (r() < 0.25) continue;
        const canvas = up && r() < 0.5 ? boxStack(Math.floor(r() * 1000)) : lowBoxes(Math.floor(r() * 1000) + h);
        const y = up ? hy - 3 - canvas.height : hy + 11 - canvas.height;
        const box = { x, y, w: canvas.width, h: canvas.height };
        if (L.net.aisles.some((ax) => x < ax + 14 && x + box.w > ax - 14)) continue;
        if (Math.abs(x + box.w / 2 - L.entrance.x) < 26) continue;
        if (crosses(x, x + box.w, up ? hy - 12 : hy, up ? hy : hy + 12)) continue;
        if (hit(box)) continue;
        taken.push(box);
        out.push({ kind: "boxes", x, y, canvas, z: up ? hy - 3 : hy + 10 });
        x += box.w;
      }
    }
  });
  return out;
}

/** Where the leak's bucket and the dead photocopiers ended up (things to click). */
export function clutterSpots(L: Layout): ClutterSpots {
  const items = clutter(L);
  const box = (it: Item) => ({ x: it.x, y: it.y, w: it.canvas.width, h: it.canvas.height });
  const b = items.find((it) => it.kind === "bucket");
  return { leak: b ? box(b) : null, copiers: items.filter((it) => it.kind === "copier").map(box) };
}

function leakOf(L: Layout): Item | undefined {
  return clutter(L).find((i) => i.kind === "bucket");
}

function decor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const out: Drawable[] = [];
  for (const it of clutter(L)) {
    if (it.kind === "bucket") {
      out.push({
        z: it.z,
        draw: () => {
          ctx.drawImage(it.canvas, it.x, it.y);
          // Drip... drip... from the ceiling tile above.
          const period = info.weather === "rain" || info.weather === "storm" ? 1.1 : 2.4;
          const ph = (info.t % period) / period;
          const cx = it.x + 6;
          const top = leakTop(L, { x: it.x, y: it.y, w: 12, h: 11 });
          if (ph < 0.55) {
            const y = top + (ph / 0.55) ** 2 * (it.y - top);
            ctx.fillStyle = "rgba(170,200,220,0.85)";
            ctx.fillRect(cx, Math.round(y), 1, 2);
          } else if (ph < 0.75) {
            ctx.fillStyle = "rgba(200,220,235,0.7)";
            const s = Math.round((ph - 0.55) * 20);
            ctx.fillRect(cx - 1 - s, it.y + 2, 1, 1);
            ctx.fillRect(cx + 1 + s, it.y + 2, 1, 1);
          }
        },
      });
    } else {
      out.push({ z: it.z, draw: () => ctx.drawImage(it.canvas, it.x, it.y) });
    }
  }
  // The dripping tap.
  const tap = L.props.find((p) => p.kind === "cooler");
  if (tap) {
    out.push({
      z: tap.z + 0.05,
      draw: () => {
        const ph = info.t % 1.7;
        if (ph < 0.25) {
          ctx.fillStyle = "rgba(170,200,220,0.9)";
          ctx.fillRect(tap.x + 8, tap.y + 14 + Math.round(ph * 8), 1, 1);
        }
      },
    });
  }
  out.push(...clickDecor(ctx, L, info));
  out.push(...habitDecor(ctx, L, info));
  return out;
}

function underlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  clickUnderlay(ctx, L, info);
  // A puddle around the bucket (it never quite catches everything).
  const b = leakOf(L);
  if (!b) return;
  const g = cached(`annex|puddle`, () =>
    makeCanvas(24, 10, (c) => {
      c.fillStyle = "rgba(60,70,80,0.35)";
      c.fillRect(3, 3, 18, 5);
      c.fillRect(5, 2, 14, 7);
      c.fillRect(1, 4, 22, 3);
      c.fillStyle = "rgba(190,200,210,0.25)";
      c.fillRect(6, 3, 5, 1);
    }),
  );
  ctx.drawImage(g, b.x - 6, b.y + b.canvas.height - 7);
  const ph = (info.t % 2.4) / 2.4;
  if (ph > 0.55 && ph < 0.9) {
    const s = Math.round((ph - 0.55) * 16);
    ctx.fillStyle = "rgba(190,205,220,0.35)";
    ctx.fillRect(b.x - 2 - s, b.y + b.canvas.height - 3, 2, 1);
  }
}

// ------------------------------------------------------------------ dust and gloom

let vignette: HTMLCanvasElement | null = null;

function overlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  clickOverlay(ctx, L, info);
  const t = info.t;
  const day = 1 - info.night;
  // Pale grey shafts from the windows, dust turning in them.
  if (day > 0.2) {
    for (const win of L.wall.windows) {
      const seg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
      const F = seg?.depth ?? 64;
      const shaft = cached(`annex|shaft|${win.w}`, () =>
        makeCanvas(win.w + 50, 64, (c) => {
          for (let y = 0; y < 64; y++) {
            const a = 0.07 * (1 - y / 64);
            c.fillStyle = `rgba(225,228,215,${a})`;
            c.fillRect(Math.round(4 + y * 0.55), y, win.w - 6, 1);
          }
        }),
      );
      ctx.save();
      ctx.globalAlpha = day;
      ctx.drawImage(shaft, win.x, F);
      ctx.restore();
      for (let i = 0; i < 7; i++) {
        const k = (t * 0.03 + i * 0.141 + win.x * 0.01) % 1;
        const mx = win.x + 6 + ((i * 11) % (win.w - 6)) + k * 26 + Math.sin(t * 0.6 + i * 2) * 3;
        const my = F + 4 + k * 54 + Math.sin(t * 0.9 + i) * 2;
        ctx.fillStyle = `rgba(255,248,220,${0.55 * day * (1 - k)})`;
        ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
    }
  }
  // At night a few motes drift under the tubes.
  if (info.night > 0.4) {
    const list = tubes(L);
    list.forEach((tb, i) => {
      if (i === lastDead) return;
      for (let j = 0; j < 3; j++) {
        const k = (t * 0.05 + j * 0.33 + i * 0.17) % 1;
        const mx = tb.x + 4 + ((j * 7 + i * 3) % 14) + Math.sin(t * 0.7 + j + i) * 3;
        const my = 6 + k * 30;
        ctx.fillStyle = `rgba(240,245,220,${0.5 * (1 - k)})`;
        ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
    });
  }
  habitOverlay(ctx, L, info);
  surroundingsRain(ctx, L, info);
  // A gloomy vignette.
  // (One full-size canvas, rebuilt only when the office changes size.)
  if (!vignette || vignette.width !== L.W || vignette.height !== L.H) {
    vignette = makeCanvas(L.W, L.H, (c) => {
      const g = c.createRadialGradient(L.W / 2, L.H / 2, Math.min(L.W, L.H) * 0.35, L.W / 2, L.H / 2, Math.max(L.W, L.H) * 0.75);
      g.addColorStop(0, "rgba(30,22,10,0)");
      g.addColorStop(1, "rgba(30,22,10,0.28)");
      c.fillStyle = g;
      c.fillRect(0, 0, L.W, L.H);
    });
  }
  ctx.drawImage(vignette, 0, 0);
}

// ------------------------------------------------------------------ light

function lights(L: Layout, info: PaintInfo): Light[] {
  const out: Light[] = clickLights(L, info);
  const list = tubes(L);
  list.forEach((tb, i) => {
    const lv = tubeLevel(i, L, list, info, lastDead);
    if (lv > 0.05) out.push([tb.x + tb.w / 2, 12, 56, 0.6 * lv, "#e6eed0", 0.07 * lv]);
  });
  // The building: a tired fluorescent over every room (one always on the blink), bare bulbs in the storerooms.
  const building = planOf(L);
  if (building && info.night > 0.2) {
    building.cells.forEach((c, i) => {
      if (c.kind === "walled") return;
      const store = c.kind === "storage" || c.kind === "nook";
      const blink = i === 2 && Math.floor(info.t * 7) % 9 < 2 ? 0.2 : 1;
      const rad = Math.max(26, Math.min(70, Math.min(c.r.w, c.r.h) * 0.6));
      out.push([c.r.x + c.r.w / 2, c.r.y + c.r.h / 2, rad, (store ? 0.32 : 0.45) * blink, store ? "#ffd890" : "#e6e8c8", store ? 0.08 : 0.05]);
    });
    const site = siteOf(L);
    for (const hy of L.net.halls) for (let x = site.x + 50; x < site.x + site.w; x += 140) out.push([x, hy, 30, 0.38, "#ece6c0", 0.05]);
  }
  // A bare bulb over the kitchenette, a glow off the vending machine.
  const k = L.kitchen;
  out.push([k.x + k.w * 0.55, k.y + 6, 46, 0.5, "#ffd890", 0.12]);
  const v = L.props.find((p) => p.kind === "vending");
  if (v) out.push([v.x + 10, v.y + 20, 20, 0.45, "#a8c0c8", 0.08]);
  // Sodium street light leaking in through the windows at night.
  if (info.night > 0.3) for (const w of L.wall.windows) out.push([w.x + w.w / 2, w.y + w.h, 30, 0.3, "#ffb060", 0.1]);
  out.push(...streetLights(L), ...habitLights(L, info));
  return out;
}

export const LIVE: Pick<Theme, "sky" | "outside" | "wallLights" | "underlay" | "decor" | "overlay" | "lighting"> = {
  sky,
  outside,
  wallLights,
  underlay,
  decor,
  overlay,
  lighting: {
    tint: "28,22,12",
    darkness: (_night, _weather, classic) => Math.min(0.8, 0.12 + classic * 1.15),
    lights,
    sunbeam: false,
  },
};
