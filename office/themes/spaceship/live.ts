// Spaceship: live drawing. Space out of every porthole and on the
// viewscreen, the hull's running lights, corridor lights chasing toward the
// airlock, the bridge console, the drive core, the hydroponic troughs under
// their grow lights, crates in the cargo bay, the suit locker by the
// airlock. Day shift is bright; the night shift dims to blue and the
// consoles glow. The shows the clicks start are drawn here (clicks.ts).
import type { WeatherKind } from "../../../contract.ts";
import type { Layout, Rect } from "../../layout.ts";
import type { Drawable, Light, PaintInfo, Theme } from "../../theme.ts";
import { Grid, OUTLINE, cached, drawPixelText, hash, mix, pixelTextWidth, shade } from "../../themekit.ts";
import { P, done, fill, hazard, panel } from "./pal.ts";
import { planOf, type ShipPlan } from "./plan.ts";
import { hullSpace, phenomenon, portholeView, systemOf, viewscreen } from "./space.ts";
import { SHIP, since, type Visitor } from "./state.ts";

let deckW = 666;

// ------------------------------------------------------------------ sprites

/** The food synthesizer: a capsule appliance with a glass chamber (18×24). */
function synthSprite(): HTMLCanvasElement {
  return cached("spaceship|synth", () => {
    const g = new Grid(18, 24);
    panel(g, 1, 1, 16, 22, P.white, 3);
    g.rect(3, 4, 12, 11, P.steelDeep);
    g.rect(4, 5, 10, 9, "#14223a");
    g.rect(4, 5, 10, 1, "#24385a");
    g.rect(3, 16, 12, 2, P.orange);
    g.rect(3, 16, 12, 1, P.orangeHi);
    g.rect(4, 19, 3, 2, P.steelDk).rect(8, 19, 2, 2, P.teal).rect(11, 19, 3, 2, P.steelDk);
    g.rect(6, 2, 6, 1, P.panelMid);
    return done(g);
  });
}

/** The drive core: a glass column on a heavy base, coolant rings, conduits (w×h of the core rect). */
function coreSprite(w: number, h: number): HTMLCanvasElement {
  return cached(`spaceship|core|${w}|${h}`, () => {
    const g = new Grid(w, h);
    // Base and cap.
    panel(g, 0, h - 9, w, 9, P.steel, 2);
    hazard(g, 2, h - 4, w - 4, 2);
    panel(g, 2, 0, w - 4, 8, P.steel, 2);
    g.rect(4, 3, w - 8, 1, P.steelDeep);
    // The glass column (the plasma is live).
    const cx = Math.floor(w / 2);
    g.rect(cx - 7, 8, 14, h - 17, P.steelDeep);
    g.rect(cx - 6, 8, 12, h - 17, "#0b1630");
    g.vline(cx - 6, 8, h - 17, "#2a4a7a");
    g.vline(cx + 5, 8, h - 17, "#1a2a4a");
    // Coolant rings.
    for (let y = 14; y < h - 12; y += 12) {
      g.rect(cx - 8, y, 16, 3, P.panelLo);
      g.rect(cx - 8, y, 16, 1, P.panelHi);
      g.rect(cx - 8, y + 2, 16, 1, P.steelDk);
    }
    // Conduits down the sides.
    for (const x of [1, w - 3]) {
      g.rect(x, 6, 2, h - 14, P.orangeLo);
      g.vline(x, 6, h - 14, P.orange);
    }
    return done(g);
  });
}

const CRATE_COLORS = [P.orangeLo, "#3f7f86", P.panelLo, "#5a6a8a"];

function crateSprite(w: number, h: number, v: number, open: boolean): HTMLCanvasElement {
  return cached(`spaceship|crate|${w}|${h}|${v}|${open}`, () => {
    const g = new Grid(w, h + 3);
    const c = CRATE_COLORS[v % CRATE_COLORS.length]!;
    g.rect(0, 3, w, h, shade(c, -0.25));
    g.rect(0, 3, w, h - 5, c);
    g.rect(1, 4, w - 2, 1, shade(c, 0.25));
    g.rect(0, h - 3, w, 1, shade(c, -0.35));
    g.rect(2, 7, w - 4, 1, shade(c, -0.15));
    g.rect(2, h - 6, w - 4, 1, shade(c, -0.15));
    g.rect(Math.floor(w / 2) - 2, 8, 4, 3, P.hazard);
    if (open) {
      g.rect(0, 3, w, 3, P.steelDeep);
      g.rect(-1, 0, w + 2, 2, shade(c, 0.1));
    } else {
      g.rect(0, 3, w, 2, shade(c, 0.12));
    }
    return done(g);
  });
}

/** The suit locker by the airlock: a spacesuit behind glass (16×32); empty while someone's outside. */
function lockerSprite(empty: boolean): HTMLCanvasElement {
  return cached(`spaceship|locker|${empty}`, () => {
    const g = new Grid(16, 32);
    panel(g, 0, 0, 16, 32, P.panel, 2);
    g.rect(2, 3, 12, 25, P.steelDeep);
    g.rect(3, 4, 10, 23, "#1c2a40");
    if (!empty) {
      g.ellipse(7.5, 8.5, 3, 3, P.white);
      g.rect(6, 7, 3, 2, "#3a6fb0").set(7, 7, "#a8e8ff");
      g.rect(4, 12, 8, 9, P.white);
      g.rect(5, 14, 6, 1, P.orange);
      g.rect(3, 13, 1, 6, P.whiteLo).rect(12, 13, 1, 6, P.whiteLo);
      g.rect(5, 21, 2, 5, P.whiteLo).rect(9, 21, 2, 5, P.whiteLo);
    } else {
      g.rect(6, 5, 4, 1, P.panelLo);
      g.vline(8, 6, 4, P.panelLo);
    }
    g.rect(3, 4, 1, 23, "#3a5a80");
    hazard(g, 2, 28, 12, 2);
    g.rect(13, 14, 1, 3, P.amber);
    return done(g);
  });
}

/** A hydroponic trough, w wide: lettuces, herbs and tomato vines in a white tray. */
function troughSprite(w: number): HTMLCanvasElement {
  return cached(`spaceship|trough|${w}`, () => {
    const g = new Grid(w, 22);
    g.rect(0, 12, w, 9, P.white);
    g.rect(0, 12, w, 1, P.panelHi);
    g.rect(0, 18, w, 3, P.whiteLo);
    g.rect(1, 15, w - 2, 1, P.teal);
    for (let x = 4, i = 0; x < w - 4; x += 9, i++) {
      const k = hash(`trough${i}`) % 3;
      if (k === 0) {
        g.ellipse(x + 2, 9, 4, 3, P.leaf);
        g.ellipse(x + 2, 8, 2.5, 2, P.leafHi);
        g.set(x + 1, 7, "#c8f0a0");
      } else if (k === 1) {
        for (let j = 0; j < 4; j++) g.vline(x + j, 4 + (j % 2) * 2, 8 - (j % 2) * 2, j % 2 ? P.leafLo : P.leaf);
        g.set(x + 1, 3, P.leafHi);
      } else {
        g.vline(x + 1, 2, 10, P.leafLo);
        g.set(x, 4, P.leaf).set(x + 2, 6, P.leaf).set(x, 8, P.leaf);
        g.set(x + 2, 3, P.red).set(x - 1, 7, P.red).set(x + 3, 9, "#ff9a7a");
      }
    }
    return done(g);
  });
}

/** A grow tower (18×34): pockets of greens up a column, a grow lamp on an arm. */
function towerSprite(): HTMLCanvasElement {
  return cached("spaceship|tower", () => {
    const g = new Grid(18, 34);
    g.rect(6, 4, 6, 27, P.white);
    g.vline(6, 4, 27, P.panelHi);
    g.vline(11, 4, 27, P.whiteLo);
    panel(g, 3, 29, 12, 5, P.steel, 1);
    g.rect(8, 0, 10, 3, P.steelDk);
    g.rect(10, 2, 7, 1, P.grow);
    for (let y = 8; y < 28; y += 6) {
      for (const [x, dir] of [[3, -1], [12, 1]] as const) {
        g.ellipse(x + 1.5, y, 2.5, 2, P.leaf);
        g.set(x + 1 + dir, y - 1, P.leafHi);
      }
    }
    g.set(4, 20, P.red).set(14, 14, P.red);
    return done(g);
  });
}

// ------------------------------------------------------------------ the synthesizer's creations

/** What the synthesizer made, in the chamber or on the counter (cx, base y). */
function drawItem(ctx: CanvasRenderingContext2D, item: typeof SHIP.synthItem, cx: number, by: number, t: number): void {
  const x = Math.round(cx);
  const y = Math.round(by);
  switch (item) {
    case "jelly": {
      const wob = Math.round(Math.sin(t * 9));
      fill(ctx, x - 4, y - 6 - wob, 8, 6 + wob, OUTLINE);
      fill(ctx, x - 3, y - 5 - wob, 6, 5 + wob, "#5ad1c8");
      fill(ctx, x - 2, y - 5 - wob, 2, 1, "#c8fff6");
      break;
    }
    case "toast":
      // Toast, unmistakably. In the shape of the ship.
      fill(ctx, x - 5, y - 5, 10, 5, OUTLINE);
      fill(ctx, x - 4, y - 4, 8, 3, "#d9a05a");
      fill(ctx, x + 4, y - 4, 2, 2, "#d9a05a");
      fill(ctx, x - 3, y - 4, 5, 1, "#f0c88a");
      break;
    case "soup":
      // Soup, but solid: a cube of it.
      fill(ctx, x - 3, y - 7, 7, 7, OUTLINE);
      fill(ctx, x - 2, y - 6, 5, 5, "#e0874a");
      fill(ctx, x - 2, y - 6, 5, 1, "#ffb88a");
      fill(ctx, x, y - 4, 1, 1, "#7fbf5a");
      break;
    case "cake": {
      // A tiny cake that won't stay down.
      const up = Math.round(4 + Math.sin(t * 2) * 2);
      fill(ctx, x - 3, y - 6 - up, 7, 6, OUTLINE);
      fill(ctx, x - 2, y - 5 - up, 5, 4, "#f4d8e8");
      fill(ctx, x - 2, y - 5 - up, 5, 1, "#ff8fb0");
      fill(ctx, x, y - 7 - up, 1, 1, P.amber);
      break;
    }
    case "noodles":
      // Noodles that wave back.
      fill(ctx, x - 4, y - 3, 8, 3, OUTLINE);
      fill(ctx, x - 3, y - 3, 6, 2, P.white);
      for (let i = 0; i < 3; i++) fill(ctx, x - 2 + i * 2, y - 6 + Math.round(Math.sin(t * 6 + i) * 1.5), 1, 3, "#f0d890");
      break;
    case "fish":
      // A fish, alive and offended.
      fill(ctx, x - 4, y - 5, 8, 4, OUTLINE);
      fill(ctx, x - 3, y - 4, 5, 2, "#ff9a5a");
      fill(ctx, x + 2, y - 5 + (Math.floor(t * 6) % 2), 2, 3, "#ff9a5a");
      fill(ctx, x - 2, y - 4, 1, 1, OUTLINE);
      break;
  }
}

// ------------------------------------------------------------------ porthole visitors

/** Something drifting past a porthole, `k` seconds into its 5 s, inside the glass circle. */
function drawVisitor(ctx: CanvasRenderingContext2D, win: Rect, v: Visitor, k: number, t: number): void {
  const cx = win.x + 12;
  const cy = win.y + 12;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.clip();
  const p = k / 5;
  switch (v) {
    case "whale": {
      // A gentle space whale, far bigger than the porthole: a slow slice of it goes by.
      const x = Math.round(cx + 30 - p * 70);
      const y = Math.round(cy - 2 + Math.sin(k * 1.2) * 2);
      fill(ctx, x - 14, y - 5, 44, 12, "#3a3f78");
      fill(ctx, x - 12, y - 6, 40, 3, "#5a63a8");
      fill(ctx, x - 14, y + 4, 44, 3, "#8a8fd0");
      for (let i = 0; i < 6; i++) fill(ctx, x - 6 + i * 6, y - 3 + (i % 2), 1, 1, "#a8e8ff");
      fill(ctx, x - 10, y - 1, 2, 2, "#f4f6ff");
      fill(ctx, x - 10, y - 1, 1, 1, OUTLINE);
      fill(ctx, x + 8, y + 7, 8, 3, "#2f3466");
      break;
    }
    case "satellite": {
      const x = Math.round(cx + 14 - p * 30);
      const y = Math.round(cy - 1 + Math.sin(k) * 2);
      const tilt = Math.floor(k * 2) % 2;
      fill(ctx, x - 7, y - 1 + tilt, 5, 3, "#3a5aa8");
      fill(ctx, x + 3, y - 1 - tilt, 5, 3, "#3a5aa8");
      fill(ctx, x - 2, y - 2, 5, 5, OUTLINE);
      fill(ctx, x - 1, y - 1, 3, 3, "#c8ccd6");
      if (Math.floor(t * 3) % 2) fill(ctx, x, y - 3, 1, 1, P.red);
      break;
    }
    case "comet": {
      const x = cx + 12 - p * 34;
      const y = cy - 7 + p * 12;
      for (let i = 0; i < 14; i++) fill(ctx, Math.round(x + i * 1.4), Math.round(y - i * 0.6), 1, 1, i === 0 ? "#ffffff" : i < 5 ? "#c8f0ff" : "#6aa8e0");
      break;
    }
    case "eva": {
      // A crewmate on a tether, close to the glass, waving.
      const x = Math.round(cx + 10 - p * 18);
      const y = Math.round(cy + 1 + Math.sin(k * 1.6) * 2);
      fill(ctx, x - 4, y - 7, 9, 8, OUTLINE);
      fill(ctx, x - 3, y - 6, 7, 6, "#f4f6f9");
      fill(ctx, x - 2, y - 5, 5, 3, "#3a6fb0");
      fill(ctx, x - 1, y - 5, 2, 1, "#a8e8ff");
      fill(ctx, x - 3, y + 1, 7, 7, "#e8ecf2");
      fill(ctx, x - 2, y + 2, 5, 1, P.orange);
      fill(ctx, x + 4, y - 3 + (Math.floor(t * 5) % 2) * 2, 2, 4, "#d3d9e2");
      break;
    }
    case "drone": {
      const x = Math.round(cx - 12 + p * 26);
      const y = Math.round(cy + Math.sin(k * 3) * 2);
      fill(ctx, x - 3, y - 2, 7, 4, OUTLINE);
      fill(ctx, x - 2, y - 1, 5, 2, P.orange);
      fill(ctx, x - 5, y - 1, 2, 1, "#c8ccd6");
      fill(ctx, x + 4, y - 1, 2, 1, "#c8ccd6");
      if (Math.floor(t * 4) % 2) fill(ctx, x, y + 2, 1, 1, P.mint);
      break;
    }
    case "wrench": {
      // Somebody's lost wrench, tumbling.
      const x = cx + 12 - p * 26;
      const y = cy - 2 + p * 4;
      const a = k * 4;
      for (let i = -4; i <= 4; i++) fill(ctx, Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i), 1, 1, "#c8ccd6");
      fill(ctx, Math.round(x + Math.cos(a) * 5) - 1, Math.round(y + Math.sin(a) * 5) - 1, 3, 3, "#a4a9b4");
      break;
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ live bits on the deck

/** The corridor lights: a chase running along the rails toward the airlock. */
function corridorLights(ctx: CanvasRenderingContext2D, L: Layout, t: number, night: number): void {
  const door = L.entrance.x;
  const base = night > 0.5 ? "#4fb6d6" : "#7fe3ff";
  for (const hy of L.net.halls) {
    for (let x = 3; x < L.W; x += 8) {
      const d = Math.abs(x - door);
      const wave = (((d + t * 40) % 72) + 72) % 72;
      if (wave > 14) continue;
      ctx.fillStyle = wave < 5 ? "#ffffff" : base;
      ctx.fillRect(x, hy - 9, 2, 1);
      ctx.fillRect(x, hy + 8, 2, 1);
    }
  }
  let top = L.H;
  for (const s of L.segments) top = Math.min(top, s.depth);
  for (const ax of L.net.aisles) {
    for (let y = top + 3 - (top % 8); y < L.H; y += 8) {
      const wave = (((y + t * 34) % 64) + 64) % 64;
      if (wave > 10) continue;
      ctx.fillStyle = wave < 4 ? "#ffffff" : base;
      ctx.fillRect(ax - 9, y, 1, 2);
      ctx.fillRect(ax + 8, y, 1, 2);
    }
  }
}

/** The bridge console: the AI's eye breathing (talking: a level meter), the gravity switch, blinkies. */
function bridgeConsole(ctx: CanvasRenderingContext2D, plan: ShipPlan, t: number): void {
  const v = plan.viewscreen;
  const band = plan.ai?.y ?? v.y + v.h + 6;
  for (let i = 0, x = v.x + 30; x < v.x + v.w - 34; i++, x += 6) {
    const on = Math.floor(t * 2 + i * 0.7) % 4 !== 0;
    fill(ctx, x + 1, band + 7, 2, 1, on ? (i % 3 === 0 ? P.amber : i % 3 === 1 ? P.mint : P.cyan) : P.steelDeep);
  }
  const a = plan.ai;
  if (a) {
    const talk = since(SHIP.aiAt, t, 5);
    const cx = a.x + Math.floor(a.w / 2);
    const cy = a.y + Math.floor(a.h / 2) - 2;
    const pulse = 0.5 + 0.5 * Math.sin(t * (talk >= 0 ? 9 : 1.6));
    const iris = talk >= 0 ? P.amber : P.cyan;
    fill(ctx, cx - 2, cy - 2, 4, 4, mix("#0b1020", iris, 0.35 + pulse * 0.4));
    fill(ctx, cx - 1, cy - 1, 2, 2, mix(iris, "#ffffff", pulse * 0.6));
    if (talk >= 0) for (let i = 0; i < 5; i++) fill(ctx, a.x + 3 + i * 2, a.y + a.h - 3, 1, -Math.round(1 + Math.abs(Math.sin(t * 13 + i * 1.7)) * 2), P.amber);
  }
  const s = plan.gravity;
  if (s) {
    const off = since(SHIP.gravityAt, t, 7) >= 0;
    const lx = s.x + Math.floor(s.w / 2) - 1;
    fill(ctx, lx - 1, off ? s.y + s.h - 6 : s.y + 5, 4, 3, OUTLINE);
    fill(ctx, lx, off ? s.y + s.h - 5 : s.y + 6, 2, 1, P.red);
    fill(ctx, s.x + s.w - 3, s.y + s.h - 3, 1, 1, off ? (Math.floor(t * 4) % 2 ? P.red : P.steelDeep) : P.mint);
  }
}

/** The floating crew: settled people drift up a few pixels while the gravity is off (spot lifts, restored after). */
const baseLift = new Map<object, number>();
function zeroG(L: Layout, t: number): void {
  const k = since(SHIP.gravityAt, t, 7);
  if (k < 0) {
    if (baseLift.size === 0) return;
    for (const s of L.spots) if (baseLift.has(s)) s.lift = baseLift.get(s) || undefined;
    baseLift.clear();
    return;
  }
  const env = k < 0.8 ? k / 0.8 : k > 5.8 ? Math.max(0, (7 - k) / 1.2) : 1;
  for (const s of L.spots) {
    if (!baseLift.has(s)) baseLift.set(s, s.lift ?? 0);
    const ph = (hash(s.id) % 100) / 16;
    s.lift = (baseLift.get(s) ?? 0) + Math.round(env * (4 + 2 * Math.sin(t * 2.1 + ph)));
  }
}

// ------------------------------------------------------------------ the hooks

function underlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  deckW = L.W;
  const plan = planOf(L);
  zeroG(L, info.t);
  corridorLights(ctx, L, info.t, info.night);
  if (!plan) return;
  viewscreen(ctx, plan.viewscreen, info.t, info.weather, L.W);
  aiCaption(ctx, plan, info.t);
  bridgeConsole(ctx, plan, info.t);
  hullSpace(ctx, L.W, L.H, plan.edgeX, plan.edgeY, info.t, info.weather, info.night);
  // The airlock's status light over the hatch: amber while someone's out on a spacewalk.
  const d = L.wall.door;
  const eva = since(SHIP.evaAt, info.t, 16) >= 0;
  fill(ctx, d.x + d.w + 2, d.y + 2, 2, 2, eva ? (Math.floor(info.t * 3) % 2 ? P.amber : "#5a4020") : P.mint);
}

function decor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const t = info.t;
  const out: Drawable[] = [];
  const syn = plan.synth;
  if (syn) {
    out.push({
      z: syn.y + syn.h + 15,
      draw: () => {
        ctx.drawImage(synthSprite(), syn.x, syn.y);
        const k = since(SHIP.synthAt, t, 30);
        const cx = syn.x + 9;
        if (k >= 0 && k < 2.2) {
          // Beams sweep the chamber, sparkles gather.
          fill(ctx, syn.x + 4, syn.y + 5, 10, 9, `rgba(127,227,255,${0.25 + 0.2 * Math.sin(t * 20)})`);
          const by = syn.y + 5 + Math.floor(((t * 14) % 9));
          fill(ctx, syn.x + 4, by, 10, 1, "#c8f6ff");
          for (let i = 0; i < 3; i++) fill(ctx, cx - 3 + ((i * 5 + Math.floor(t * 9)) % 7), syn.y + 7 + ((i * 3 + Math.floor(t * 7)) % 6), 1, 1, "#ffffff");
        } else if (k >= 2.2) {
          // Done: the dish sits in the chamber, then on the counter beside it.
          if (k < 6) drawItem(ctx, SHIP.synthItem, cx, syn.y + 14, t);
          else drawItem(ctx, SHIP.synthItem, syn.x + 26, syn.y + 24, t);
          if (k < 3) fill(ctx, syn.x + 4, syn.y + 5, 10, 9, `rgba(255,255,255,${(3 - k) * 0.5})`);
        }
        fill(ctx, syn.x + 8, syn.y + 19, 2, 2, k >= 0 && k < 2.2 ? (Math.floor(t * 8) % 2 ? P.amber : P.white) : P.teal);
      },
    });
  }
  const core = plan.core;
  if (core) {
    out.push({
      z: core.y + core.h,
      draw: () => {
        ctx.drawImage(coreSprite(core.w, core.h), core.x, core.y);
        const k = since(SHIP.coreAt, t, 4);
        const boost = k >= 0 ? Math.max(0, 1 - k / 4) : 0;
        const cx = core.x + Math.floor(core.w / 2);
        const top = core.y + 8;
        const h = core.h - 17;
        // Plasma rising through the column.
        for (let y = 0; y < h; y++) {
          const wave = 0.5 + 0.5 * Math.sin(y * 0.5 - t * (6 + boost * 14));
          const c = mix("#2a6fd0", "#bff4ff", Math.min(1, wave * 0.7 + boost * 0.5));
          const w = 6 + Math.round(wave * 2 + boost * 2);
          fill(ctx, cx - Math.floor(w / 2), top + y, w, 1, c);
        }
        fill(ctx, cx - 1, top, 2, h, mix("#ffffff", "#bff4ff", 0.5));
        if (SHIP.coreHiccup && k >= 0 && k < 2.5) {
          for (let i = 0; i < 6; i++) {
            const a = i * 1.1 + k * 3;
            fill(ctx, Math.round(cx + Math.cos(a) * (6 + k * 8)), Math.round(top - 2 - k * 10 + Math.sin(a) * 3), 2, 2, i % 2 ? "#9aa0ac" : "#c8ccd6");
          }
        }
      },
    });
  }
  for (const r of plan.troughs) {
    const tower = r.w <= 20;
    out.push({
      z: r.y + r.h,
      draw: () => {
        const k = since(SHIP.hydroAt, t, 9);
        const grow = k < 0 ? 0 : k < 5 ? k / 5 : Math.max(0, (9 - k) / 4) * 0.4 + 0.6;
        if (tower) ctx.drawImage(towerSprite(), r.x, r.y);
        else {
          // The grow light bar on two posts over the trough.
          fill(ctx, r.x + 2, r.y - 10, 2, 12, OUTLINE);
          fill(ctx, r.x + r.w - 4, r.y - 10, 2, 12, OUTLINE);
          fill(ctx, r.x + 1, r.y - 12, r.w - 2, 3, OUTLINE);
          fill(ctx, r.x + 2, r.y - 11, r.w - 4, 1, k >= 0 ? "#ffd0ff" : P.grow);
          ctx.drawImage(troughSprite(r.w), r.x, r.y);
        }
        if (grow > 0) {
          // Shoots racing up, leaves unfurling, the odd tomato.
          const slots = tower ? [[2, 8], [14, 14], [2, 20], [14, 26]] : Array.from({ length: Math.floor((r.w - 8) / 9) }, (_, i) => [6 + i * 9, 6]);
          slots.forEach(([dx, dy], i) => {
            const hgt = Math.round(grow * (4 + (i % 3) * 2));
            const x = r.x + dx!;
            const y = r.y + dy!;
            fill(ctx, x, y - hgt, 1, hgt, P.leafLo);
            fill(ctx, x - 1, y - hgt, 3, 1, P.leafHi);
            if (grow > 0.8 && i % 3 === 1) fill(ctx, x + 1, y - hgt + 1, 2, 2, P.red);
          });
        }
      },
    });
  }
  plan.crates.forEach((c, i) => {
    out.push({
      z: c.y + c.h,
      draw: () => {
        const k = SHIP.crate === i ? since(SHIP.crateAt, t, 12) : -1;
        ctx.drawImage(crateSprite(c.w, c.h, i, k >= 0), c.x, c.y - 3);
        if (k >= 0) crateShow(ctx, c, k, t);
      },
    });
  });
  const lk = plan.airlock;
  if (lk) {
    out.push({
      z: lk.y + lk.h,
      draw: () => {
        const eva = since(SHIP.evaAt, t, 16) >= 0;
        ctx.drawImage(lockerSprite(eva), lk.x, lk.y);
        fill(ctx, lk.x + 13, lk.y + 14, 1, 3, eva ? (Math.floor(t * 3) % 2 ? P.amber : P.steelDk) : P.mint);
      },
    });
  }
  return out;
}

/** What's in the crate: packing foam everywhere, a tiny robot, a rubber duck floating up, socks. */
function crateShow(ctx: CanvasRenderingContext2D, c: Rect, k: number, t: number): void {
  const cx = c.x + c.w / 2;
  switch (SHIP.crateKind) {
    case "foam":
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const r = Math.min(1, k * 1.5) * (6 + (i % 4) * 4);
        const fy = c.y - 2 - Math.max(0, Math.sin(Math.min(k, 1.2) * 2.6)) * (4 + (i % 3) * 3) + Math.min(k, 3) * 2;
        fill(ctx, Math.round(cx + Math.cos(a) * r), Math.round(fy + Math.sin(a) * r * 0.3), 2, 1, "#f4f0e0");
      }
      break;
    case "bot": {
      const hop = Math.abs(Math.sin(t * 6)) * 3;
      const x = Math.round(cx + Math.sin(k * 0.9) * 10);
      const y = Math.round(c.y - 4 - hop);
      fill(ctx, x - 3, y - 6, 7, 7, OUTLINE);
      fill(ctx, x - 2, y - 5, 5, 4, P.white);
      fill(ctx, x - 1, y - 4, 1, 1, P.cyan);
      fill(ctx, x + 1, y - 4, 1, 1, P.cyan);
      fill(ctx, x, y - 8, 1, 2, P.orange);
      break;
    }
    case "duck": {
      const y = Math.round(c.y - 4 - Math.min(k, 8) * 3);
      const x = Math.round(cx + Math.sin(k * 1.4) * 4);
      fill(ctx, x - 3, y - 4, 7, 5, OUTLINE);
      fill(ctx, x - 2, y - 3, 5, 3, P.hazard);
      fill(ctx, x + 1, y - 5, 3, 3, P.hazard);
      fill(ctx, x + 4, y - 4, 1, 1, P.orange);
      fill(ctx, x + 2, y - 4, 1, 1, OUTLINE);
      break;
    }
    case "socks":
      for (let i = 0; i < 5; i++) {
        const x = Math.round(cx - 8 + i * 4);
        const y = Math.round(c.y - 3 - Math.abs(Math.sin(k * 2 + i)) * Math.max(0, 3 - k) * 3);
        fill(ctx, x, y - 4, 2, 4, i % 2 ? "#ff8fb0" : "#7fc4ff");
        fill(ctx, x, y - 1, 3, 1, i % 2 ? "#ff8fb0" : "#7fc4ff");
      }
      break;
  }
}

/** The AI's words as a caption across the bottom of the viewscreen, typed out letter by letter. */
function aiCaption(ctx: CanvasRenderingContext2D, plan: ShipPlan, t: number): void {
  const v = plan.viewscreen;
  const k = since(SHIP.aiAt, t, 6);
  if (k < 0 || !SHIP.aiLine || v.w < 40) return;
  const lines: string[] = [];
  for (const w of SHIP.aiLine.toUpperCase().split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && pixelTextWidth(`${last} ${w}`) <= v.w - 10) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  const h = lines.length * 7 + 4;
  const y = v.y + v.h - h;
  ctx.fillStyle = "rgba(6,14,28,0.82)";
  ctx.fillRect(v.x, y, v.w, h);
  fill(ctx, v.x, y, v.w, 1, P.cyanDk);
  let left = Math.floor(k * 32);
  lines.forEach((line, i) => {
    const part = line.slice(0, Math.max(0, left));
    left -= line.length + 1;
    if (part) drawPixelText(ctx, part, v.x + 4, y + 3 + i * 7, i === lines.length - 1 && left < 0 && Math.floor(t * 4) % 2 ? P.white : P.cyan);
  });
}

/** Loose things floating about while the gravity's off. */
function floaters(ctx: CanvasRenderingContext2D, L: Layout, t: number): void {
  const k = since(SHIP.gravityAt, t, 7);
  if (k < 0) return;
  const env = k < 1 ? k : k > 5.8 ? Math.max(0, (7 - k) / 1.2) : 1;
  const things = Math.min(24, L.desks.length + 8);
  for (let i = 0; i < things; i++) {
    const h = hash(`float${i}`);
    const d = L.desks[i % Math.max(1, L.desks.length)];
    const bx = d ? d.x + 6 + (h % 36) : (h % L.W);
    const by = d ? d.y + 4 + ((h >>> 8) % 10) : 100 + ((h >>> 8) % 200);
    const x = Math.round(bx + Math.sin(t * 0.9 + i) * 4 * env);
    const y = Math.round(by - env * (8 + ((h >>> 4) % 10)) + Math.cos(t * 1.3 + i) * 2);
    switch (h % 4) {
      case 0:
        // A mug.
        fill(ctx, x - 1, y - 1, 5, 5, OUTLINE);
        fill(ctx, x, y, 3, 3, (h >>> 3) % 2 ? P.white : P.orange);
        fill(ctx, x + 3, y + 1, 1, 1, OUTLINE);
        break;
      case 1:
        // A sheet of paper, turning.
        fill(ctx, x - 1, y - 1, Math.floor(t * 2 + i) % 2 ? 6 : 4, 5, OUTLINE);
        fill(ctx, x, y, Math.floor(t * 2 + i) % 2 ? 4 : 2, 3, P.white);
        break;
      case 2:
        // A pen.
        fill(ctx, x, y, 4, 1, P.navy);
        fill(ctx, x + 3, y, 1, 1, P.amber);
        break;
      default:
        // Crumbs.
        fill(ctx, x, y, 1, 1, "#d9a05a");
        fill(ctx, x + 3, y + 2, 1, 1, "#d9a05a");
        break;
    }
  }
}

function overlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  const t = info.t;
  floaters(ctx, L, t);
  // The jump: a flash through the whole deck as the ship folds into the next system.
  const j = t - SHIP.jumpAt;
  if (j >= 0.8 && j < 1.6) {
    const a = j < 1 ? (j - 0.8) / 0.2 : 1 - (j - 1) / 0.6;
    ctx.fillStyle = `rgba(214,228,255,${(Math.max(0, a) * 0.42).toFixed(3)})`;
    ctx.fillRect(0, 0, L.W, L.H);
  }
  // The core's pulse rolls out through the engine room.
  const ck = since(SHIP.coreAt, t, 1.6);
  if (plan?.core && ck >= 0) {
    const c = plan.core;
    const r = 6 + ck * 40;
    ctx.fillStyle = `rgba(150,220,255,${(0.5 * (1 - ck / 1.6)).toFixed(3)})`;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      ctx.fillRect(Math.round(c.x + c.w / 2 + Math.cos(a) * r), Math.round(c.y + c.h / 2 + Math.sin(a) * r * 0.6), 1, 1);
    }
  }
  // An ion storm outside: the lights stutter with the arcs.
  if (phenomenon(info.weather) === "ion") {
    const beat = Math.floor(t * 1.3);
    if (hash(`ion${beat}`) % 4 === 0 && t * 1.3 - beat < 0.12) {
      ctx.fillStyle = "rgba(170,130,255,0.12)";
      ctx.fillRect(0, 0, L.W, L.H);
    }
  }
}

function lights(L: Layout, info: PaintInfo): Light[] {
  const plan = planOf(L);
  const out: Light[] = [];
  const t = info.t;
  if (plan) {
    const v = plan.viewscreen;
    const sys = systemOf(SHIP.system);
    const tint = mix(sys.bodies[0]?.colors[1] ?? "#9fc4ff", "#9fc4ff", 0.5);
    if (v.w > 0) out.push([v.x + v.w / 2, v.y + v.h / 2 + 10, Math.max(56, v.w * 0.55), 0.85, tint, 0.14]);
    if (plan.core) {
      const c = plan.core;
      const k = since(SHIP.coreAt, t, 4);
      const pulse = 0.2 + 0.05 * Math.sin(t * 4) + (k >= 0 ? (1 - k / 4) * 0.3 : 0);
      out.push([c.x + c.w / 2, c.y + c.h / 2, 46 + (k >= 0 ? (1 - k / 4) * 30 : 0), 0.95, "#7fd8ff", pulse]);
    }
    for (const r of plan.troughs) out.push([r.x + r.w / 2, r.y + 2, Math.max(30, r.w * 0.6), 0.8, P.grow, since(SHIP.hydroAt, t, 9) >= 0 ? 0.32 : 0.16]);
    if (plan.ai) out.push([plan.ai.x + 8, plan.ai.y + 7, 14, 0.7, since(SHIP.aiAt, t, 5) >= 0 ? P.amber : P.cyan, 0.16]);
    if (plan.synth && since(SHIP.synthAt, t, 3) >= 0) out.push([plan.synth.x + 9, plan.synth.y + 10, 24, 0.9, P.cyan, 0.28]);
    if (plan.airlock) out.push([plan.airlock.x + 8, plan.airlock.y + 14, 16, 0.6, P.mint, 0.08]);
    if (plan.cargo) out.push([plan.cargo.x + plan.cargo.w / 2, plan.cargo.y + 10, Math.max(40, plan.cargo.w * 0.5), 0.55, "#ffd9a0", 0.06]);
    if (plan.edgeX > 5) out.push([0, L.H - plan.edgeY - 40, 40, 0.6, "#6ebeff", 0.18]);
  }
  for (const w of L.wall.windows) out.push([w.x + 12, w.y + 12, 22, 0.55, "#a8b8ff", 0.06]);
  // The crew stations' consoles glow softly through the night shift.
  for (const pod of L.pods) out.push([pod.x + pod.w / 2, pod.y + 52, Math.max(40, pod.w * 0.45), 0.4, "#7fe3ff", 0.05]);
  // Night lights along the corridors.
  for (const hy of L.net.halls) for (let x = 24; x < L.W; x += 72) out.push([x, hy, 30, 0.5, "#7fe3ff", 0.05]);
  const d = L.wall.door;
  out.push([d.x + d.w + 3, d.y + 3, 10, 0.8, since(SHIP.evaAt, t, 16) >= 0 ? P.amber : P.mint, 0.2]);
  return out;
}

/** The running lights in the ceiling rail: soft white by day, dim blue on the night shift, a chase when clicked. */
function wallLights(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo & { party: boolean; brokenBulbX: number | null }, glow: boolean): void {
  const plan = planOf(L);
  const E = plan?.edgeX ?? 0;
  const t = info.t;
  const night = info.night;
  const colors = ["#ff6b6b", "#ffc857", "#8ff0b5", "#7fe3ff", "#a88bff"];
  for (let x = E + 8; x < L.W - E - 6; x += 16) {
    const broken = info.brokenBulbX !== null && Math.abs(x - info.brokenBulbX) < 8;
    const flick = broken && Math.sin(t * 23) + Math.sin(t * 7.3) > 0.4;
    let c = night > 0.5 ? "#8fb0ff" : "#f4f8ff";
    if (info.party) c = colors[(Math.floor(t * 8) + Math.floor(x / 16)) % colors.length]!;
    if (broken && !flick) c = P.steelDeep;
    if (!glow) {
      fill(ctx, x, 2, 6, 2, c);
      fill(ctx, x, 1, 6, 1, OUTLINE);
    } else if ((night > 0.3 || info.party) && !(broken && !flick)) {
      ctx.fillStyle = `${c}${Math.round(40 + (info.party ? 60 : 0) * night).toString(16).padStart(2, "0")}`;
      ctx.fillRect(x - 2, 4, 10, 3);
    }
  }
}

/** The airlock cycling: the leaves slide apart onto the chamber, a beacon turning inside, mist at the sill. */
let openSince = 0;
let lastSeen = -1;
function doorOpen(ctx: CanvasRenderingContext2D, d: Rect, info: PaintInfo): boolean {
  if (info.t - lastSeen > 0.25) openSince = info.t;
  lastSeen = info.t;
  const k = Math.min(1, (info.t - openSince) / 0.4);
  fill(ctx, d.x, d.y + 1, d.w, d.h - 1, "#1a1418");
  for (let y = 0; y < d.h - 2; y++) fill(ctx, d.x + 1, d.y + 2 + y, d.w - 2, 1, mix("#3a2a34", "#5a2a2a", y / d.h));
  // The inner hatch and the beacon.
  fill(ctx, d.x + 4, d.y + 6, d.w - 8, d.h - 8, "#4a4f5c");
  fill(ctx, d.x + 4, d.y + 6, d.w - 8, 1, "#6f7787");
  const beam = Math.sin(info.t * 8) > 0;
  fill(ctx, d.x + d.w / 2 - 1, d.y + 3, 2, 2, beam ? "#ff6b6b" : "#8a2a2a");
  if (beam) fill(ctx, d.x + 2, d.y + 6, d.w - 4, 6, "rgba(255,90,90,0.18)");
  for (let i = 0; i < 4; i++) fill(ctx, d.x + 2 + ((i * 5 + Math.floor(info.t * 6)) % (d.w - 4)), d.y + d.h - 3 - (i % 2), 3, 1, "rgba(220,230,240,0.5)");
  const leaf = Math.round((d.w / 2) * (1 - k));
  if (leaf > 0) {
    fill(ctx, d.x, d.y + 1, leaf, d.h - 1, P.panelMid);
    fill(ctx, d.x + d.w - leaf, d.y + 1, leaf, d.h - 1, P.panelMid);
    fill(ctx, d.x + leaf - 1, d.y + 1, 1, d.h - 1, P.panelLo);
    fill(ctx, d.x + d.w - leaf, d.y + 1, 1, d.h - 1, P.panelHi);
  }
  return true;
}

/** A porthole someone clicked: something drifts past outside for a few seconds. */
function openWindow(ctx: CanvasRenderingContext2D, win: Rect, _k: number, info: PaintInfo): boolean {
  const idx = Math.round(win.x * 1000 + win.y);
  let s = SHIP.portholes.get(idx);
  if (!s || info.t - s.seen > 0.3) {
    s = { visitor: SHIP.nextVisitor, at: info.t, seen: info.t };
    SHIP.portholes.set(idx, s);
  }
  s.seen = info.t;
  drawVisitor(ctx, win, s.visitor, info.t - s.at, info.t);
  return true;
}

const VISITORS: Visitor[] = ["whale", "satellite", "comet", "eva", "drone", "wrench", "satellite", "comet"];

/** A porthole was clicked: pick who drifts by, and what you hear. */
function outdoor(weather: WeatherKind, _night: boolean): string {
  const v = VISITORS[Math.floor(Math.random() * VISITORS.length)]!;
  SHIP.nextVisitor = v;
  if (v === "whale") return "ship-whale";
  if (v === "satellite" || v === "drone") return "ship-beep";
  switch (phenomenon(weather)) {
    case "meteors":
    case "drizzle":
      return "ship-meteors";
    case "ion":
      return "ship-ion";
    case "ice":
      return "ship-ice";
    case "nebula":
    case "dust":
      return "ship-nebula";
    default:
      return "ship-space";
  }
}

export const LIVE: Pick<Theme, "sky" | "outside" | "outdoor" | "wallLights" | "underlay" | "decor" | "overlay" | "lighting" | "doorOpen" | "openWindow" | "boardInk"> = {
  // Space is dark whatever the hour; the hour only sets the ship's shift (night dims the lights).
  sky: (_hour, classic) => ({ top: "#05070f", bottom: "#0b1024", night: classic.night }),
  outside: (ctx, win, index, info) => portholeView(ctx, win, index, info.t, info.weather, deckW),
  outdoor,
  wallLights,
  underlay,
  decor,
  overlay,
  lighting: {
    tint: "10,16,46",
    darkness: (night, weather) => night * 0.62 + (weather === "storm" ? 0.04 : 0),
    lights,
    sunbeam: false,
  },
  doorOpen,
  openWindow,
  // Inks on the bridge's glass star chart.
  boardInk: ["#2b5fa8", "#c2632a", "#23807f", "#6a4ad0"],
};
