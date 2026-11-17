// Villain's Lair: hidden Easter eggs. Neither is outlined when you hold Alt
// (they're for finding), and each also happens on its own about once every
// hour or two with the office open.
//
// - The suggestion box: a little locked box on a post by the open floor.
//   Drop a suggestion in and the henchmen walk out in a picket line in front
//   of your lair with hand-painted signs, chanting, until you give in.
// - The laser pointer: someone left one on your desk. Click it and a red
//   dot skitters off across the floor, out the door and down the corridor,
//   Meringue the cat hot on its heels, until it lands on a henchman's head.
//
// Clicks only set the clock; everything is drawn from it by `eggDecor`.
// Per frame that's a few cached sprites and a pixel or two.

import type { Facing, Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, GatherCue, GatherSpot, Gathering, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { drawPixelText, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { fluffyCat } from "./critters.ts";
import { C, sprite } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

const NEVER = -1e9;
/** The laser show, start to the cat walking off again. */
const LASER = 18;

const HOVER = {
  box: "The suggestion box · padlocked, slot facing the wall",
  laser: "A laser pointer · someone left it on",
};

const SIGNS = ["NAPS!", "PIZZA", "DENTAL", "NO LAVA"];

const LINES = {
  picket: ["WHAT DO WE WANT?", "LONGER LUNCHES!", "WHEN DO WE WANT THEM?", "AFTER THIS ONE!"],
  giveIn: "Fine. Pizza Friday.",
  cheer: "PIZZA FRIDAY!",
  laser: { aside: "Who keeps leaving that on the desk?", target: "Not the laser again.", boss: "Good kitty." },
};

const since = (at: number, t: number, len: number) => (t - at >= 0 && t - at < len ? t - at : -1);

let strike: { g: Gathering; spots: GatherSpot[]; told: boolean } | null = null;
let laser: { t0: number; dot: Point[]; cat: Point[]; head: Point; feet: Point } | null = null;
let autoAt = NEVER;
/** The animation clock as of the last frame (the cat's pet hook asks without one). */
let nowT = 0;

// ------------------------------------------------------------------ where things are

function bossRoom(L: Layout): (Layout["rooms"][number] & { doorX: number }) | null {
  const r = L.rooms.find((q) => q.kind === "boss");
  return r && r.doorX !== undefined && r.doorSide === "bottom" ? (r as Layout["rooms"][number] & { doorX: number }) : null;
}

function boxRect(L: Layout): Rect {
  const ev = L.eventArea;
  return { x: ev.x + ev.w - 12, y: ev.y + 2, w: 9, h: 15 };
}

function laserRect(L: Layout): Rect {
  const d = L.boss.desk;
  return { x: d.x + d.w - 9, y: d.y + 11, w: 7, h: 4 };
}

/** The hallway under a rect (the nearest one below it, else the nearest). */
function hallBelow(L: Layout, y: number): number {
  const below = L.net.halls.filter((h) => h > y);
  return below.length > 0 ? Math.min(...below) : L.net.halls.reduce((b, h) => (Math.abs(h - y) < Math.abs(b - y) ? h : b), L.net.halls[0] ?? y);
}

// ------------------------------------------------------------------ clicks

export function eggClickables(L: Layout): SceneryClickable[] {
  const out: SceneryClickable[] = [{ id: "egg-box", rect: boxRect(L), hover: HOVER.box, secret: true }];
  if (bossRoom(L)) {
    const l = laserRect(L);
    out.push({ id: "egg-laser", rect: { x: l.x - 1, y: l.y - 2, w: l.w + 2, h: l.h + 4 }, hover: HOVER.laser, secret: true });
  }
  return out;
}

export function eggClick(id: string, act: SceneryActions): string | null {
  if (id === "egg-box") return startStrike(act);
  if (id === "egg-laser") return startLaser(act);
  return null;
}

/** The picket line: four spots along the corridor in front of your lair, facing us. */
function startStrike(act: SceneryActions): string | null {
  if (strike && !strike.g.done) return null;
  const L = act.L;
  const r = L.rooms.find((q) => q.kind === "boss")?.rect ?? { x: L.boss.desk.x - 30, y: L.boss.desk.y, w: 120, h: 60 };
  const hall = hallBelow(L, r.y + r.h);
  const n = Math.max(2, Math.min(4, Math.floor((r.w - 20) / 26)));
  const x0 = Math.round(r.x + r.w / 2 - ((n - 1) * 26) / 2);
  const spots: GatherSpot[] = Array.from({ length: n }, (_, i) => {
    const x = x0 + i * 26;
    const y = Math.min(L.H - 4, hall + 10);
    return { x, y, facing: "front" as Facing, pose: "stand" as const, activity: "on strike (politely)", path: [{ x, y: hall, c: true }, { x, y }] };
  });
  const p = LINES.picket;
  const cues: GatherCue[] = [
    { at: 0.4, who: 0, say: p[0], sound: "lair-chant" },
    { at: 2, who: 1 % n, say: p[1] },
    { at: 3.6, who: 0, say: p[2] },
    { at: 5.2, who: 2 % n, say: p[3] },
    { at: 9.2, who: n - 1, say: LINES.cheer, sound: "lair-confetti" },
  ];
  const g = act.gather(spots, 11.5, cues, 2);
  if (!g) return null;
  strike = { g, spots, told: false };
  return "lair-chime";
}

/** The red dot's run: off the desk, round your lair, out the door, down the corridor and onto someone's head. */
function startLaser(act: SceneryActions): string | null {
  if (laser && since(laser.t0, act.t, LASER) >= 0) return null;
  const L = act.L;
  const room = bossRoom(L);
  if (!room) return null;
  const r = room.rect;
  const d = L.boss.desk;
  const hall = hallBelow(L, r.y + r.h);
  const door: Point = { x: room.doorX, y: r.y + r.h + 4 };
  const who = act.near(door.x - 120, hall, 320).filter((p) => p.id !== "boss");
  const target = who.find((p) => Math.abs(p.x - door.x) > 50) ?? who[0];
  if (!target) return null;
  const l = laserRect(L);
  const floor: Point = { x: Math.round(r.x + r.w * 0.62), y: r.y + r.h - 16 };
  const corner: Point = { x: r.x + r.w - 20, y: d.y + d.h + 20 };
  const dx = target.x < door.x ? -1 : 1;
  const mid: Point[] = [
    { x: door.x + dx * 30, y: hall + 6 },
    { x: door.x + dx * 50, y: hall - 4 },
    { x: Math.round((door.x + target.x) / 2), y: hall + 8 },
  ];
  const feet: Point = { x: target.x + (dx < 0 ? 12 : -12), y: target.y };
  laser = {
    t0: act.t,
    dot: [{ x: l.x + 1, y: l.y + 1 }, corner, floor, door, ...mid, { x: target.x, y: target.y - 24 }],
    cat: [{ x: d.x + 6, y: d.y + d.h + 8 }, corner, floor, door, ...mid, feet],
    head: { x: target.x, y: target.y - 24 },
    feet,
  };
  act.say(target.id, LINES.laser.target, 2.6, 11.2);
  const aside = who.find((p) => p.id !== target.id);
  if (aside) act.say(aside.id, LINES.laser.aside, 2.8, 6);
  act.say("boss", LINES.laser.boss, 2.4, 13.2);
  return "lair-laser";
}

/** On their own now and then (one or the other about once an hour and a half); and you giving in to the strike. */
export function eggTick(act: SceneryActions): void {
  const s = strike;
  if (s && !s.told && s.g.arrivedAt !== null && act.t - s.g.arrivedAt > 7) {
    s.told = true;
    act.say("boss", LINES.giveIn, 2.6);
  }
  const quiet = (!strike || strike.g.done) && (!laser || since(laser.t0, act.t, LASER) < 0);
  if (!quiet || act.t - autoAt < 1800 || Math.random() > 1 / 10800) return;
  autoAt = act.t;
  const sound = eggClick(Math.random() < 0.5 ? "egg-box" : "egg-laser", act);
  if (sound) act.play(sound);
}

/** While Meringue is off after the dot, the office's own cat sprite stays empty (there's only one Meringue). */
export function catAway(): boolean {
  return laser !== null && since(laser.t0, nowT, LASER) >= 0;
}

// ------------------------------------------------------------------ sprites

const boxSprite = () =>
  sprite("egg-box", 9, 15, (g) => {
    // A steel box on a post, a slot and a big padlock.
    g.rect(0, 0, 9, 7, C.steel).hline(0, 0, 9, C.steelTop).rect(2, 2, 5, 1, C.steelDk).rect(3, 4, 3, 3, C.brass).set(4, 5, C.brassLo);
    g.rect(4, 7, 1, 7, C.steelLo).rect(2, 14, 5, 1, C.steelDk);
    g.outline(OUTLINE);
  });

const laserSprite = () =>
  sprite("egg-laser", 7, 3, (g) => {
    g.rect(0, 0, 6, 2, C.steelLo).hline(0, 0, 6, C.steelHi).set(6, 0, C.glowRed).set(2, 1, C.velvetHi);
  });

function signSprite(text: string): HTMLCanvasElement {
  const w = pixelTextWidth(text) + 6;
  return sprite(`egg-sign-${text}`, w, 18, (g) => {
    // A hand-painted cardboard sign on a stick.
    g.rect(0, 0, w, 10, "#c9a46a").hline(0, 0, w, "#e0c08a").hline(0, 9, w, "#a8834e");
    g.rect(Math.floor(w / 2), 10, 1, 8, C.mahog);
  });
}

const blank = () => sprite("egg-blank", 1, 1, () => undefined);

/** The office's cat sprite, unless Meringue is busy with the laser. */
export function petSprite(kind: "dog" | "cat", draw: () => HTMLCanvasElement): HTMLCanvasElement {
  return kind === "cat" && catAway() ? blank() : draw();
}

// ------------------------------------------------------------------ drawing

/** Where along a path (0..1 of its length). */
function along(path: Point[], u: number): Point {
  const segs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
  const total = segs.reduce((a, b) => a + b, 0) || 1;
  let left = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (left <= s || i === segs.length - 1) {
      const k = s > 0 ? Math.min(1, left / s) : 1;
      const a = path[i]!;
      const b = path[i + 1]!;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= s;
  }
  return path[path.length - 1]!;
}

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const t = info.t;
  nowT = t;
  const out: Drawable[] = [];
  const b = boxRect(L);
  out.push({ z: b.y + b.h, draw: () => ctx.drawImage(boxSprite(), b.x, b.y) });
  if (bossRoom(L)) {
    const l = laserRect(L);
    const on = laser !== null && since(laser.t0, t, 10.5) >= 0;
    out.push({
      z: L.boss.desk.y + 23,
      draw: () => {
        ctx.drawImage(laserSprite(), l.x, l.y);
        // Its beam glinting while it's on.
        if (on && Math.floor(t * 6) % 2) rect(ctx, l.x + 6, l.y, 1, 1, C.white);
      },
    });
  }
  const s = strike;
  if (s && !s.g.done) {
    // Each sign goes up as its holder gets to their spot.
    const k = s.g.arrivedAt === null ? 0 : t - s.g.arrivedAt;
    s.spots.forEach((p, i) => {
      if (!s.g.present[i]) return;
      const spr = signSprite(SIGNS[i % SIGNS.length]!);
      // Up and down with the chant; waved about once there's pizza.
      const bob = k > 9 ? Math.round(Math.abs(Math.sin(t * 9 + i)) * 3) : Math.floor(t * 2 + i) % 2;
      out.push({
        z: p.y + 0.6,
        draw: () => {
          const x = p.x - Math.floor(spr.width / 2) + 4;
          const y = p.y - 44 - bob;
          ctx.drawImage(spr, x, y);
          drawPixelText(ctx, SIGNS[i % SIGNS.length]!, x + 3, y + 2, C.velvetLo);
        },
      });
    });
  }
  const z = laser;
  const k = z ? since(z.t0, t, LASER) : -1;
  if (z && k >= 0) out.push(...laserShow(ctx, z, k, t));
  return out;
}

/** The dot and Meringue: the chase (1–10 s), the leap onto a head, a sit up there, down again and off home. */
function laserShow(ctx: Ctx, z: NonNullable<typeof laser>, k: number, t: number): Drawable[] {
  const out: Drawable[] = [];
  const RUN0 = 1;
  const RUN1 = 10;
  if (k >= RUN0 && k < 13.4) {
    const u = (k - RUN0) / (RUN1 - RUN0);
    const p = u >= 1 ? z.head : along(z.dot, u);
    // A little jitter, as from a shaky hand.
    const jx = Math.round(Math.sin(t * 23) * 1.2);
    const jy = Math.round(Math.cos(t * 19) * 1.2);
    out.push({
      z: p.y + 40,
      draw: () => {
        rect(ctx, Math.round(p.x) + jx - 1, Math.round(p.y) + jy, 3, 1, "rgba(255,74,58,0.45)");
        rect(ctx, Math.round(p.x) + jx, Math.round(p.y) + jy - 1, 1, 3, "rgba(255,74,58,0.45)");
        rect(ctx, Math.round(p.x) + jx, Math.round(p.y) + jy, 1, 1, C.glowRed);
      },
    });
  }
  let cx: number;
  let cy: number;
  let lift = 0;
  let moving = true;
  let face: "left" | "right" = "right";
  if (k < RUN1 + 0.8) {
    const u = Math.max(0, (k - RUN0 - 0.8) / (RUN1 - RUN0));
    const p = along(z.cat, u);
    const q = along(z.cat, Math.min(1, u + 0.02));
    cx = p.x;
    cy = p.y;
    face = q.x < p.x - 0.1 ? "left" : "right";
    moving = u > 0 && u < 1;
  } else if (k < RUN1 + 1.4) {
    // The leap onto the head.
    const u = (k - RUN1 - 0.8) / 0.6;
    cx = z.feet.x + (z.head.x - z.feet.x) * u;
    cy = z.feet.y;
    lift = (z.feet.y - z.head.y) * u + Math.sin(u * Math.PI) * 10;
    face = z.head.x < z.feet.x ? "left" : "right";
  } else if (k < 14.4) {
    // Sitting up there, very pleased.
    cx = z.head.x;
    cy = z.feet.y;
    lift = z.feet.y - z.head.y;
    moving = false;
  } else if (k < 15) {
    const u = (k - 14.4) / 0.6;
    cx = z.head.x + (z.feet.x - z.head.x) * u;
    cy = z.feet.y;
    lift = (z.feet.y - z.head.y) * (1 - u) + Math.sin(u * Math.PI) * 6;
    face = z.feet.x < z.head.x ? "left" : "right";
  } else {
    // And off home to the door, tail up, as if nothing happened.
    const u = (k - 15) / (LASER - 15);
    const home = [z.feet, ...z.cat.slice(4, -1).reverse(), z.cat[3]!];
    const p = along(home, u);
    const q = along(home, Math.min(1, u + 0.02));
    cx = p.x;
    cy = p.y;
    face = q.x < p.x ? "left" : "right";
  }
  const pose = moving ? (Math.floor(t * 8) % 2 ? "walk1" : "walk0") : "sit";
  const zc = lift > 0 ? z.feet.y + 1 : cy;
  out.push({
    z: zc,
    draw: () => {
      const spr = fluffyCat(pose, face, false);
      ctx.drawImage(spr, Math.round(cx - 8), Math.round(cy - 12 - lift));
      // A little "?" once the dot's gone.
      if (k > 13.4 && k < 14.4) drawPixelText(ctx, "?", Math.round(cx + 6), Math.round(cy - 22 - lift), C.white);
    },
  });
  return out;
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // A crowd chanting, four times: a muffled rhythmic burst of voices.
  "lair-chant": (k) => {
    for (let i = 0; i < 4; i++) {
      const s = i * 1.6;
      for (const [dt, f] of [[0, 220], [0.22, 247], [0.44, 196]] as const) {
        k.tone(f, s + dt, 0.18, "sawtooth", 0.018, f * 0.92);
        k.noise(s + dt, 0.16, 0.02, 900);
      }
    }
  },
  // The pointer's click, a scampering patter, a "mrrrow" mid-leap and a soft landing.
  "lair-laser": (k) => {
    k.tone(2400, 0, 0.03, "square", 0.03);
    for (let i = 0; i < 26; i++) k.noise(1.8 + i * 0.32, 0.03, 0.025, 3200);
    k.tone(520, 10.8, 0.45, "sine", 0.05, 780);
    k.tone(780, 11.25, 0.25, "sine", 0.04, 560);
    k.noise(11.4, 0.08, 0.04, 600);
  },
};
