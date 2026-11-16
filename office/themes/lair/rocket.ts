// Villain's Lair: the secret rocket. A white rocket with a red nose (a ray
// emitter in its tip, of course) on a launch pad, its service tower with
// umbilical arms and a beacon, steam venting, and on the big bays a bulkhead
// with launch doors that slide open onto the sky. Things to click: a launch
// (a countdown, a wobbly hover, a sheepish return to the pad), the nose ray
// (it charges up and reheats a coffee cup, or fires confetti), and the pad
// (someone comes to polish the hull). The doors are a window: clicking them
// opens them (the office draws the sky and the weather in them).
//
// Everything per frame is a few cached sprites and small rects.

import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { drawPixelText, Grid, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { rocketBox, rocketSize, type Bay, type BaySpot } from "./bay.ts";
import { C, hazardRect, hazardStripes, sprite } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

// ------------------------------------------------------------------ sprites

const HULL = "#eeeae2";
const HULL_HI = "#ffffff";
const HULL_LO = "#c9c3b8";
const NOSE = C.velvetHi;
const NOSE_HI = "#e86a6a";
const NOSE_LO = C.velvet;

/** The rocket, nose up, `h` tall: (w + 2) × (h + 2) with its outline; the base center is at the bottom middle. */
function rocketSprite(h0: number): HTMLCanvasElement {
  const { w, h, body } = rocketSize(h0);
  const scale = h / 124;
  return sprite(`rocket-${h}`, w + 2, h + 2, (g) => {
    const ox = 1;
    const oy = 1;
    const bl = ox + (w - body) / 2;
    const br = bl + body - 1;
    const cx = bl + body / 2;
    const noseH = Math.round(h * 0.26);
    const bellH = Math.round(h * 0.1);
    const bodyBot = oy + h - bellH;
    const finTop = oy + Math.round(h * 0.64);
    // The nose: an ogive in red, the ray emitter's black tip and a brass coil ring.
    for (let j = 0; j < noseH; j++) {
      const half = Math.max(1, Math.round((body / 2) * Math.sin((((j + 1) / noseH) * Math.PI) / 2)));
      const x0 = Math.round(cx - half);
      const x1 = Math.round(cx + half) - 1;
      for (let x = x0; x <= x1; x++) g.set(x, oy + j, x - x0 < Math.max(1, Math.round(half * 0.45)) ? NOSE_HI : x1 - x < Math.max(1, Math.round(half * 0.35)) ? NOSE_LO : NOSE);
    }
    const tip = Math.max(2, Math.round(3 * scale));
    for (let j = 0; j < tip; j++) for (let x = Math.round(cx - 1); x <= Math.round(cx); x++) g.set(x, oy + j, C.ink);
    const ring = oy + Math.round(noseH * 0.45);
    for (let x = bl; x <= br; x++) {
      const inNose = g.get(x, ring) !== null;
      if (inNose) g.set(x, ring, x < cx ? C.brassHi : C.brass);
      if (inNose && scale >= 0.8) g.set(x, ring + 1, C.brassLo);
    }
    // The body, lit from the left.
    for (let y = oy + noseH; y < bodyBot; y++) {
      for (let x = bl; x <= br; x++) g.set(x, y, x - bl < 2 * scale + 1 ? HULL_HI : br - x < 3 * scale + 1 ? HULL_LO : HULL);
    }
    const band = (y: number, hh: number) => {
      for (let j = 0; j < hh; j++) for (let x = bl; x <= br; x++) g.set(x, y + j, x - bl < 2 ? NOSE_HI : br - x < 2 ? NOSE_LO : NOSE);
    };
    band(oy + noseH, Math.max(1, Math.round(2 * scale)));
    band(oy + Math.round(h * 0.78), Math.max(2, Math.round(3 * scale)));
    // Portholes.
    for (const k of scale >= 0.8 ? [0.36, 0.5] : [0.42]) {
      const py = oy + Math.round(h * k);
      const r = Math.max(1.4, 2.4 * scale);
      g.ellipse(cx - 0.5, py, r + 0.8, r + 0.8, C.steelLo);
      g.ellipse(cx - 0.5, py, r, r, "#1f3a4a");
      g.set(Math.round(cx - 1), py - 1, "#9fd8f0");
    }
    // The emblem: a little volcano with lava on top.
    if (scale >= 0.7) {
      const ey = oy + Math.round(h * 0.62);
      for (let j = 0; j < Math.round(5 * scale); j++) for (let x = Math.round(cx - 1 - j); x <= Math.round(cx + j); x++) g.set(x, ey + j, C.rockHi);
      g.set(Math.round(cx - 1), ey, C.lava).set(Math.round(cx), ey, C.lava).set(Math.round(cx - 1), ey - 1, C.lavaHot);
    }
    // Fins: swept, in red, and the front one edge-on.
    const finBot = oy + h - 1;
    for (let y = finTop; y <= finBot; y++) {
      const k = (y - finTop) / Math.max(1, finBot - finTop);
      const reach = Math.round(k * (bl - ox));
      for (let x = bl - reach; x < bl; x++) g.set(x, y, y > finBot - 2 * scale ? NOSE_LO : NOSE);
      for (let x = br + 1; x <= br + reach; x++) g.set(x, y, y > finBot - 2 * scale ? NOSE_LO : NOSE_LO);
    }
    for (let y = bodyBot - Math.round(h * 0.14); y <= finBot; y++) g.set(Math.round(cx - 1), y, NOSE_LO).set(Math.round(cx), y, NOSE_LO);
    // The engine bell.
    for (let j = 0; j < bellH; j++) {
      const half = Math.round(body * (0.28 + (0.14 * j) / bellH));
      for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) g.set(x, bodyBot + j, x < cx - half / 2 ? C.steelHi : C.steelLo);
    }
    g.outline(OUTLINE);
  });
}

/** The service tower: steel lattice with yellow bracing and hazard-striped platforms, a crane jib on top. */
function towerSprite(scale: 1 | 0.5, height: number): HTMLCanvasElement {
  const tw = scale === 1 ? 16 : 8;
  return sprite(`tower-${scale}-${height}`, tw + 12, height + 2, (g) => {
    const x0 = 11;
    for (let y = 4; y <= height; y++) {
      g.set(x0, y, C.steelDk).set(x0 + tw - 1, y, C.steelDk);
      if (scale === 1) g.set(x0 + 1, y, C.steelLo).set(x0 + tw - 2, y, C.steelLo);
    }
    const step = scale === 1 ? 10 : 7;
    for (let y = 6; y < height - 2; y += step) {
      for (let k = 0; k < step && y + k < height; k++) {
        const x = x0 + 1 + Math.round(((tw - 3) * k) / step);
        g.set((Math.floor(y / step) % 2 ? x : x0 + tw - 2 - (x - x0 - 1)), y + k, C.hazardLo);
      }
    }
    for (let y = 14; y < height - 4; y += scale === 1 ? 26 : 18) hazardStripes(g, x0 - 1, y, tw + 2, 2);
    // The crane jib on top, reaching over the rocket, and the beacon housing.
    g.rect(0, 2, x0 + tw, 2, C.steelLo);
    g.rect(0, 2, x0 + tw, 1, C.steelHi);
    g.rect(1, 4, 1, scale === 1 ? 6 : 3, C.steelDk);
    g.rect(x0 + tw - 3, 0, 3, 2, C.steelDk);
    g.rect(x0 - 2, height - 1, tw + 4, 2, C.steelDk);
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the backdrop (baked)

/** The pad on the floor, and on the big bays the bulkhead behind the rocket. */
export function paintBay(ctx: Ctx, bay: Bay): void {
  const p = bay.pad;
  if (bay.scale === 1) {
    // A dashed safety line painted round the pad.
    const rx = p.w / 2 + 16;
    const ry = p.h / 2 + 9;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      // Dashes, and none along the front where the crater's edge comes close.
      if (i % 6 > 3 || Math.sin(a) > 0.45) continue;
      rect(ctx, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 2, 1, i % 12 < 6 ? C.hazard : C.hazardLo);
    }
  }
  const g = new Grid(p.w, p.h);
  g.ellipse(p.w / 2 - 0.5, p.h / 2 - 0.5, p.w / 2 - 0.5, p.h / 2 - 0.5, C.ink);
  g.ellipse(p.w / 2 - 0.5, p.h / 2 - 0.5, p.w / 2 - 2, p.h / 2 - 2, C.hazard);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (g.get(x, y) === C.hazard && (x + y) % 6 < 3) g.set(x, y, C.ink);
  g.ellipse(p.w / 2 - 0.5, p.h / 2 - 0.5, p.w / 2 - 4, p.h / 2 - 3.5, "#7a7570");
  g.ellipse(p.w / 2 - 0.5, p.h / 2 - 0.5, p.w / 2 - 10, p.h / 2 - 6, "#6a6560");
  // Scorch marks, and the flame trench grate under the bell.
  g.ellipse(p.w / 2 - 0.5, p.h / 2 - 0.5, p.w * 0.22, p.h * 0.28, "#3a3436");
  for (let x = Math.round(p.w * 0.3); x < p.w * 0.7; x += 2) for (let y = Math.round(p.h * 0.32); y < p.h * 0.68; y++) if (g.get(x, y) === "#3a3436") g.set(x, y, "#1f1b1f");
  ctx.drawImage(g.toCanvas(), p.x, p.y);
  const bh = bay.bulkhead;
  if (bh) {
    // A slab of riveted steel and concrete, hazard stripes along the foot, the doors' frame.
    const w = new Grid(bh.w, bh.h + 4);
    w.rect(0, 0, bh.w, bh.h, "#5a5458");
    for (let y = 2; y < bh.h - 4; y += 6) w.rect(1, y, bh.w - 2, 1, "#4e484c");
    for (let x = 6; x < bh.w; x += 14) w.rect(x, 1, 1, bh.h - 6, "#4e484c");
    w.rect(0, 0, bh.w, 1, "#7a7276");
    hazardStripes(w, 0, bh.h - 4, bh.w, 4);
    w.rect(2, bh.h, bh.w - 4, 4, "#00000040");
    w.outline(OUTLINE, { skip: ["#00000040"] });
    ctx.drawImage(w.toCanvas(), bh.x, bh.y);
  }
}

/** The frame round the launch doors (the office paints the sky inside it). */
export function bayDoorFrame(ctx: Ctx, win: Rect): void {
  const { x, y, w, h } = win;
  rect(ctx, x - 4, y - 3, w + 8, h + 6, C.steelDk);
  rect(ctx, x - 4, y - 3, w + 8, 1, C.steelHi);
  rect(ctx, x - 1, y - 1, w + 2, h + 2, OUTLINE);
  for (const yy of [y - 2, y + h + 1]) for (let xx = x - 2; xx < x + w + 2; xx += 6) rect(ctx, xx, yy, 1, 1, C.rivet);
  ctx.clearRect(x, y, w, h);
}

// ------------------------------------------------------------------ what's going on

type RayKind = "cup" | "confetti";

let forL: Layout | null = null;
let launch: { t0: number; g: Gathering | null } | null = null;
let ray: { t0: number; kind: RayKind } | null = null;
let polish: { t0: number; g: Gathering | null } | null = null;
/** The doors opened from the office (a window click): how far, and when we heard. */
let doorsAsked = { k: 0, t: -10 };

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  launch = null;
  ray = null;
  polish = null;
  doorsAsked = { k: 0, t: -10 };
}

const LAUNCH_T = 19;
const RAY_T = 7;
/** How long a launch waits for its audience to walk over. */
const WAIT_T = 12;

/** Seconds into the launch show (negative while the audience walks over), or null when there's none. */
function launchClock(t: number): number | null {
  if (!launch) return null;
  const arrived = launch.g?.arrivedAt ?? Infinity;
  const start = launch.g ? Math.min(arrived, launch.t0 + WAIT_T) : launch.t0;
  const tt = t - start;
  if (tt > LAUNCH_T) {
    launch = null;
    return null;
  }
  return tt;
}

/** The rocket's lift off the pad and its sideways wobble right now (0 on the pad). */
function liftOf(bay: Bay, t: number): { lift: number; dx: number; flame: number; smoke: number; count: number | null } {
  const none = { lift: 0, dx: 0, flame: 0, smoke: 0, count: null };
  const tt = launchClock(t);
  if (tt === null) return none;
  // Waiting for the audience: the count holds at the start.
  if (tt < 0) return { ...none, count: 8, smoke: 0.15 };
  const top = Math.round(bay.h * 0.15);
  if (tt < 8) return { ...none, count: 8 - Math.floor(tt), smoke: tt > 6 ? (tt - 6) / 2 : 0.15 };
  if (tt < 8.6) return { lift: 0, dx: 0, flame: (tt - 8) / 0.6, smoke: 1, count: 0 };
  if (tt < 13) {
    const k = Math.min(1, (tt - 8.6) / 1.6);
    return { lift: top * (1 - (1 - k) * (1 - k)) + Math.sin(tt * 5) * 1.5, dx: Math.sin(tt * 9) * 1.4 + Math.sin(tt * 3.1) * 1.2, flame: 0.9 + Math.sin(tt * 37) * 0.1, smoke: 0.8, count: null };
  }
  if (tt < 14.6) {
    // Sputtering, sinking back.
    const k = (tt - 13) / 1.6;
    const sput = Math.floor(tt * 12) % 3 === 0 ? 0 : 0.6 * (1 - k);
    return { lift: top * (1 - k * k) + Math.abs(Math.sin(tt * 14)) * (1 - k), dx: Math.sin(tt * 11) * (1 - k), flame: sput, smoke: 0.6, count: null };
  }
  return { lift: tt < 15 ? Math.sin((tt - 14.6) * Math.PI * 2.5) * 1.2 : 0, dx: 0, flame: 0, smoke: Math.max(0, 1 - (tt - 14.6) / 4), count: null };
}

/** How open the launch doors are: asked by the office, or opened for a launch or the ray. */
function doorsOpen(t: number): number {
  let k = t - doorsAsked.t < 0.25 ? doorsAsked.k : 0;
  const tt = launchClock(t);
  if (tt !== null && tt > 1 && tt < 17.5) k = Math.max(k, Math.min(1, (tt - 1) / 1.5, (17.5 - tt) / 1.5));
  if (ray?.kind === "confetti") {
    const tt = t - ray.t0;
    if (tt < RAY_T) k = Math.max(k, Math.min(1, tt / 1.2, (RAY_T - tt) / 1.2));
  }
  return Math.max(0, k);
}

/** The office opened the doors (a window click): `k` 0 → 1 → 0 over a few seconds. */
export function askDoors(k: number, t: number): void {
  doorsAsked = { k, t };
}

// ------------------------------------------------------------------ things to click

export const BAY_HOVER = {
  ray: "The nose ray · charge it up (mostly harmless)",
  rocket: "The secret rocket · launch it (a short test flight)",
  pad: "The launch pad · send someone to polish the rocket",
};

export function bayClickables(bay: Bay): SceneryClickable[] {
  const box = rocketBox(bay);
  const noseH = Math.round(box.h * 0.22);
  const s = rocketSize(bay.h);
  return [
    { id: "rocket-ray", rect: { x: bay.x - s.body / 2, y: box.y, w: s.body, h: noseH }, hover: BAY_HOVER.ray },
    { id: "rocket", rect: { x: box.x, y: box.y + noseH, w: box.w, h: box.h - noseH }, hover: BAY_HOVER.rocket },
    { id: "rocket-pad", rect: bay.pad, hover: BAY_HOVER.pad },
  ];
}

export const BAY_LINES = {
  launch: [
    [0.6, 0, "Ooh, it's doing the thing."],
    [3.0, 1, "Is it supposed to wobble?"],
    [5.6, 2, "Very majestic. Very… low."],
    [8.4, 0, "Put it in the newsletter."],
    [10.8, 1, "Next time: the stratosphere."],
  ] as const,
  launchSolo: ["Ignition… sort of.", "We have hover-off.", "It's a test flight. Of the landing."],
  sheepish: ["…and it's back on the pad.", "Nailed the landing, at least.", "Flight time: four seconds. A record."],
  charge: ["Charging the doomsday ray…", "Stand back, it's warming up.", "That hum means it's working. Probably."],
  cup: ["Coffee: reheated.", "Perfect drinking temperature.", "Worth every watt."],
  confetti: ["Confetti mode. Of course.", "Doom, but festive.", "That's going in the brochure."],
  polish: [
    [0.6, 0, "Missed a spot."],
    [3.4, 0, "You can see your face in it."],
    [6.4, 0, "Who left fingerprints on the fins?"],
  ] as const,
  polishSolo: ["Gleaming.", "Freshly waxed.", "Shiny enough for the brochure."],
  watchActivity: "watching the rocket launch",
  polishActivity: "polishing the rocket",
};

function cuesOf(list: readonly (readonly [number, number, string])[]): GatherCue[] {
  return list.map(([at, who, say]) => ({ at, who, say, seconds: say.length > 24 ? 3.6 : 2.6 }));
}

function spotsOf(list: BaySpot[], activity: string, pose: GatherSpot["pose"] = "stand"): GatherSpot[] {
  return list.map((s) => ({ x: s.x, y: s.y, facing: s.facing, pose, activity, path: s.path }));
}

/** Count down, ignite, hover (wobbling), sputter and settle back on the pad; idle people come to watch. */
export function startLaunch(bay: Bay, act: SceneryActions): string | null {
  bind(act.L);
  if (launchClock(act.t) !== null) return null;
  // The show starts once the audience is there (the countdown and its sound with it).
  const cues = [{ at: 0, sound: "lair-launch" }, ...cuesOf(BAY_LINES.launch), { at: 15.2, who: 0, say: pick(BAY_LINES.sheepish), seconds: 3 }];
  const g = bay.watch.length > 0 ? act.gather(spotsOf(bay.watch, BAY_LINES.watchActivity), LAUNCH_T - 1, cues, 1) : null;
  launch = { t0: act.t, g };
  if (g) return "lair-chime";
  const who = act.near(bay.x, bay.base, 140)[0];
  if (who) {
    act.say(who.id, pick(BAY_LINES.launchSolo), 2.8, 9.2);
    act.say(who.id, pick(BAY_LINES.sheepish), 3, 15.2);
  }
  return "lair-launch";
}

export function bayClick(id: string, bay: Bay, act: SceneryActions): string | null {
  bind(act.L);
  if (id === "rocket") return startLaunch(bay, act);
  if (id === "rocket-ray") {
    if (ray && act.t - ray.t0 < RAY_T) return null;
    ray = { t0: act.t, kind: Math.random() < 0.5 ? "cup" : "confetti" };
    const who = act.near(bay.x, bay.base, 150)[0];
    if (who) {
      act.say(who.id, pick(BAY_LINES.charge), 2.4, 0.4);
      act.say(who.id, pick(ray.kind === "cup" ? BAY_LINES.cup : BAY_LINES.confetti), 3, 3.8);
    }
    return "lair-charge";
  }
  if (id === "rocket-pad") {
    if (polish && act.t - polish.t0 < 12) return "lair-squeak";
    const g = bay.polish.length > 0 ? act.gather(spotsOf(bay.polish, BAY_LINES.polishActivity, "draw"), 9, cuesOf(BAY_LINES.polish), 1) : null;
    polish = { t0: act.t, g };
    if (!g) {
      const who = act.near(bay.x, bay.base, 150)[0];
      if (who) act.say(who.id, pick(BAY_LINES.polishSolo), 2.6, 0.8);
    }
    return "lair-squeak";
  }
  return null;
}

// ------------------------------------------------------------------ drawing

/** The launch doors: two slabs over the sky, sliding apart when they open. */
export function drawDoors(ctx: Ctx, bay: Bay, t: number): void {
  const d = bay.doors;
  if (!d) return;
  const k = doorsOpen(t);
  const half = Math.round((d.w / 2) * (1 - k));
  for (const [x, w] of [
    [d.x, half],
    [d.x + d.w - half, half],
  ] as const) {
    if (w <= 0) continue;
    rect(ctx, x, d.y, w, d.h, C.steelLo);
    rect(ctx, x, d.y, w, 1, C.steelHi);
    for (let yy = d.y + 4; yy < d.y + d.h - 2; yy += 6) rect(ctx, x + 1, yy, w - 2, 1, C.steelDk);
    hazardRect(ctx, x, d.y + d.h - 3, w, 3, 4);
  }
  // The seam between them, and a lamp over the doors that turns green when they're open.
  if (half > 0) rect(ctx, d.x + half - 1, d.y, 1, d.h, OUTLINE);
  rect(ctx, d.x + d.w / 2 - 2, d.y - 3, 4, 2, k > 0.5 ? C.glowGreen : Math.floor(t * 2) % 2 ? C.glowRed : "#6a1a14");
}

function flameAt(ctx: Ctx, x: number, y: number, scale: number, k: number, t: number): void {
  if (k <= 0) return;
  const len = Math.round((10 + Math.sin(t * 31) * 3 + Math.sin(t * 17) * 2) * scale * k);
  for (let j = 0; j < len; j++) {
    const f = j / Math.max(1, len);
    const half = Math.max(1, Math.round((4.5 * scale + 1) * (1 - f * 0.7)));
    ctx.fillStyle = f < 0.2 ? "#fffbe0" : f < 0.45 ? C.lavaHot : f < 0.75 ? C.lavaHi : C.lava;
    ctx.fillRect(Math.round(x - half + Math.sin(t * 40 + j) * 0.6), y + j, half * 2, 1);
  }
}

function puffs(ctx: Ctx, bay: Bay, t: number, amount: number): void {
  // Steam venting at the pad's edges (always a little; a lot at a launch).
  const p = bay.pad;
  const n = amount > 0.3 ? 10 : 4;
  for (let i = 0; i < n; i++) {
    const life = (t * (0.35 + amount * 0.5) + i / n) % 1;
    if (amount < 0.3 && i % 2 === 1 && Math.floor(t / 4) % 2 === 0) continue;
    const side = i % 2 ? 1 : -1;
    const x = bay.x + side * (p.w * 0.36 + life * (8 + amount * 26)) * (bay.scale === 1 ? 1 : 0.6);
    const y = p.y + p.h / 2 - life * (14 + amount * 14) * bay.scale;
    const s = Math.round((3 + life * (5 + amount * 8)) * (bay.scale === 1 ? 1 : 0.6));
    ctx.fillStyle = `rgba(232,232,236,${(0.45 + amount * 0.3) * (1 - life)})`;
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, Math.max(2, Math.round(s * 0.7)));
  }
}

function arms(ctx: Ctx, bay: Bay, retract: number): void {
  const gy = bay.gantry;
  if (!gy) return;
  const s = rocketSize(bay.h);
  const right = bay.x + s.body / 2;
  for (const k of [0.72, 0.45]) {
    const y = Math.round(bay.base - s.h * k);
    const len = Math.round((gy.x - right) * (1 - retract));
    if (len <= 0) continue;
    const x0 = gy.x - len;
    rect(ctx, x0, y - 1, len, 3, OUTLINE);
    rect(ctx, x0, y, len, 1, C.steelHi);
    // A hose drooping under the arm.
    ctx.fillStyle = C.ink;
    for (let i = 0; i < len; i++) ctx.fillRect(x0 + i, y + 2 + Math.round(Math.sin((i / len) * Math.PI) * 2), 1, 1);
  }
}

function sparkle(ctx: Ctx, x: number, y: number, k: number): void {
  if (k <= 0) return;
  ctx.fillStyle = `rgba(255,255,255,${k})`;
  ctx.fillRect(x, y - 2, 1, 5);
  ctx.fillRect(x - 2, y, 5, 1);
}

/** The cup on its crate by the pad (steaming after the ray has been at it). */
function cupAt(ctx: Ctx, bay: Bay, t: number): void {
  const { x, y } = bay.cup;
  rect(ctx, x - 4, y - 5, 9, 6, OUTLINE);
  rect(ctx, x - 3, y - 4, 7, 4, "#8a6a42");
  rect(ctx, x - 3, y - 4, 7, 1, "#a8844e");
  rect(ctx, x - 2, y - 9, 5, 5, OUTLINE);
  rect(ctx, x - 1, y - 8, 3, 3, C.white);
  rect(ctx, x + 2, y - 7, 1, 1, OUTLINE);
  const tt = ray?.kind === "cup" ? t - ray.t0 : -1;
  if (tt > 3.2 && tt < RAY_T) {
    ctx.fillStyle = "rgba(240,240,240,0.7)";
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 1 + i, Math.round(y - 11 - ((tt * 6 + i * 2) % 6)), 1, 2);
  }
}

/** The rocket, its tower, the cup and the steam, sorted with the people. */
export function bayDecor(ctx: Ctx, L: Layout, bay: Bay, info: PaintInfo): Drawable[] {
  bind(L);
  const t = info.t;
  const s = rocketSize(bay.h);
  const fly = liftOf(bay, t);
  const clock = launchClock(t);
  const launching = clock !== null;
  const out: Drawable[] = [];
  const gy = bay.gantry;
  if (gy) {
    const tower = towerSprite(bay.scale, Math.round(bay.base - 4 - gy.top));
    out.push({
      z: bay.base - 4,
      draw: () => {
        ctx.drawImage(tower, gy.x - 11, gy.top - 1);
        // The beacon on top: red, blinking (fast during a launch).
        const on = Math.floor(t * (launching ? 6 : 1.5)) % 2 === 0;
        const tw = bay.scale === 1 ? 16 : 8;
        rect(ctx, gy.x + tw - 2, gy.top - 3, 2, 2, on ? C.glowRed : "#5a1a14");
        const tt = clock ?? 0;
        arms(ctx, bay, launching ? Math.min(1, Math.max(0, (tt - 6.5) / 1.5), Math.max(0, (LAUNCH_T - 1 - tt) / 1.5)) : 0);
      },
    });
  }
  out.push({ z: bay.cup.y, draw: () => cupAt(ctx, bay, t) });
  out.push({
    z: bay.base - 3,
    draw: () => {
      const x = Math.round(bay.x + fly.dx);
      const y = Math.round(bay.base - fly.lift);
      ctx.drawImage(rocketSprite(bay.h), x - s.w / 2 - 1, y - s.h - 1);
      flameAt(ctx, x, y, bay.h / 124, fly.flame, t);
      // The nose ray charging: the coil ring glows and sparks crawl up the tip.
      const rt = ray ? t - ray.t0 : -1;
      if (rt >= 0 && rt < 3.4) {
        const tipY = y - s.h;
        const ringY = tipY + Math.round(s.h * 0.26 * 0.45);
        const glow = Math.min(1, rt / 2.4);
        ctx.fillStyle = `rgba(124,240,240,${0.4 + 0.6 * glow})`;
        ctx.fillRect(x - Math.round(s.body * 0.35), ringY, Math.round(s.body * 0.7), 2);
        for (let i = 0; i < 4; i++) {
          if ((Math.floor(t * 20) + i) % 3 === 0) continue;
          sparkle(ctx, x - 3 + ((i * 5 + Math.floor(t * 30)) % 7), tipY + ((i * 3 + Math.floor(t * 25)) % Math.max(4, ringY - tipY)), 0.8 * glow);
        }
      }
      // A polish: glints running over the hull.
      if (polish && t - polish.t0 < 12) {
        const pt = t - polish.t0;
        for (let i = 0; i < 2; i++) {
          const ph = (pt * 0.9 + i * 0.5) % 1;
          sparkle(ctx, x - s.body / 2 + 2 + ((i * 7 + Math.floor(pt)) % Math.max(3, s.body - 4)), Math.round(y - s.h * (0.2 + 0.6 * ((Math.floor(pt * 0.9 + i * 0.5) * 0.37) % 1))), Math.sin(ph * Math.PI));
        }
      }
      // The countdown over the nose.
      if (fly.count !== null && fly.count > 0) {
        const text = `T-${fly.count}`;
        const tw = pixelTextWidth(text);
        const ty = y - s.h - 9;
        rect(ctx, x - tw / 2 - 2, ty - 2, tw + 4, 9, "#140c0e");
        drawPixelText(ctx, text, Math.round(x - tw / 2), ty, C.glowRed);
      }
    },
  });
  out.push({ z: bay.base + 3, draw: () => puffs(ctx, bay, t, launching ? fly.smoke : 0) });
  return out;
}

/** The beam and the confetti, over everything. */
export function bayOverlay(ctx: Ctx, bay: Bay, t: number): void {
  if (!ray) return;
  const rt = t - ray.t0;
  if (rt > RAY_T) {
    ray = null;
    return;
  }
  const s = rocketSize(bay.h);
  const tipX = bay.x;
  const tipY = bay.base - s.h;
  if (ray.kind === "cup" && rt > 2.6 && rt < 3.3) {
    // A crackling bolt from the tip down to the cup.
    const { x, y } = bay.cup;
    const n = 9;
    let px = tipX;
    let py = tipY;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const nx = Math.round(tipX + (x - tipX) * k + (i < n ? ((Math.floor(t * 40) * 7 + i * 13) % 7) - 3 : 0));
      const ny = Math.round(tipY + (y - 8 - tipY) * k);
      const steps = Math.max(Math.abs(nx - px), Math.abs(ny - py), 1);
      for (let j = 0; j <= steps; j++) {
        ctx.fillStyle = j % 3 ? "#bff8ff" : "#ffffff";
        ctx.fillRect(Math.round(px + ((nx - px) * j) / steps), Math.round(py + ((ny - py) * j) / steps), 1, 1);
      }
      px = nx;
      py = ny;
    }
    sparkle(ctx, x, y - 8, 1);
  }
  if (ray.kind === "confetti") {
    const top = bay.doors ? bay.doors.y + bay.doors.h / 2 : tipY - 40 * bay.scale;
    if (rt > 2.6 && rt < 3.4) {
      ctx.fillStyle = "rgba(191,248,255,0.85)";
      ctx.fillRect(tipX - 1, Math.round(top), 2, Math.round(tipY - top));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(tipX, Math.round(top), 1, Math.round(tipY - top));
    }
    if (rt > 3.2) {
      const colors = ["#ff4a3a", "#ffd84a", "#4ab0ff", "#7ce07c", "#ff8fd0", "#ffffff"];
      const k = rt - 3.2;
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2;
        const v = 18 + (i % 5) * 7;
        const x = tipX + Math.cos(a) * v * Math.min(1, k * 1.5);
        const y = top + Math.sin(a) * v * 0.5 * Math.min(1, k * 1.5) + k * k * 9;
        ctx.fillStyle = colors[i % colors.length]!;
        ctx.fillRect(Math.round(x), Math.round(y), (i + Math.floor(t * 6)) % 2 ? 2 : 1, (i + Math.floor(t * 6)) % 2 ? 1 : 2);
      }
    }
  }
}

/** Floodlights on the rocket at night, the beacon, the engine and the ray. */
export function bayLights(bay: Bay, t: number): Light[] {
  const s = rocketSize(bay.h);
  const out: Light[] = [
    [bay.x - 20 * bay.scale, bay.base - s.h * 0.5, 46 * bay.scale + 10, 0.7, "#fff2d0", 0.1],
    [bay.x + 20 * bay.scale, bay.base - s.h * 0.75, 40 * bay.scale + 10, 0.6, "#fff2d0", 0.08],
  ];
  if (bay.gantry) out.push([bay.gantry.x + 12 * bay.scale, bay.gantry.top, 10, 0.8, "#ff4a3a", 0.25]);
  const fly = liftOf(bay, t);
  if (fly.flame > 0) out.push([bay.x, bay.base - fly.lift + 6, 70 * bay.scale + 20, 1, "#ffb238", 0.45 * fly.flame]);
  if (ray && t - ray.t0 < 3.4) out.push([bay.x, bay.base - s.h, 24, 0.9, "#7cf0f0", 0.35]);
  return out;
}

