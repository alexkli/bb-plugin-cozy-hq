// Redwood Camp: things to click. The campfire puts on a little show (s'mores,
// a singalong, ghost stories after dark, a bonfire, popcorn); the giants have
// an owl, a squirrel, a woodpecker, pinecones and birds; the creek has trout,
// frogs, a duck, paper boats and, once in a while, a bear cub fishing.
//
// Clicks only start things; everything is drawn from the camp's live layers
// (decor, overlay, underlay, lights) by the animation clock.
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Facing, Layout, Rect } from "../../layout.ts";
import { clamp, OUTLINE } from "../../themekit.ts";
import { C, cached, Grid } from "./kit.ts";
import { creekX } from "./forest.ts";
import { campData } from "./plan.ts";
import { CAMP } from "./words.ts";
import { ctx2d } from "../../pixel.ts";

type Ctx = CanvasRenderingContext2D;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

function weighted<T extends string>(options: [T, number][]): T {
  let roll = Math.random() * options.reduce((n, [, w]) => n + w, 0);
  for (const [o, w] of options) {
    roll -= w;
    if (roll <= 0) return o;
  }
  return options[0]![0];
}

// ------------------------------------------------------------------ where things are

interface Fire {
  /** The flames' base. */
  x: number;
  y: number;
  /** The ring's depth (its bottom edge). */
  z: number;
  ring: Rect;
}

function fireOf(L: Layout): Fire | null {
  const p = L.props.find((q) => q.kind === "coffee-table");
  return p ? { x: p.x + 19, y: p.y + 7, z: p.z, ring: { x: p.x, y: p.y, w: 38, h: 14 } } : null;
}

/** A trunk to climb: the giants on the camp floor and the ones in the treeline. */
interface Giant {
  x: number;
  w: number;
  top: number;
  base: number;
  /** Just under its lowest boughs (or the canopy). */
  crown: number;
  /** Where an owl perches or a bird takes off: under the boughs, or partway up a trunk that runs out of the picture. */
  perch: number;
}

function giants(L: Layout): Giant[] {
  const d = campData(L);
  return cached(`redwoods|giants|${L.W}x${L.H}|${d?.trees.length ?? 0}|${d?.line?.trunks.length ?? 0}`, () => {
    const out: Giant[] = [];
    for (const t of d?.trees ?? []) {
      const top = t.base - t.h;
      const crowned = top > 2;
      const crown = crowned ? top + clamp(Math.round(t.h * 0.34), 18, 36) : 10;
      out.push({ x: t.x, w: t.w, top, base: t.base, crown, perch: crowned ? crown + 3 : clamp(Math.round(t.base * 0.35), 16, t.base - 30) });
    }
    for (const t of d?.line?.trunks ?? []) if (t.kind === "trunk" && t.w >= 10) out.push({ x: Math.max(0, t.x), w: t.w, top: 0, base: t.d, crown: 10, perch: 16 });
    return out;
  });
}

export function clickables(L: Layout): SceneryClickable[] {
  const out: SceneryClickable[] = [];
  const f = fireOf(L);
  if (f) out.push({ id: "campfire", rect: { x: f.ring.x, y: f.ring.y - 12, w: f.ring.w, h: f.ring.h + 12 }, hover: CAMP.hover.fire });
  const d = campData(L);
  const strip = d?.strips[1];
  if (d?.creek && strip) {
    const y0 = d.creek.pts[0]!.y;
    out.push({ id: "creek", rect: { x: strip.x, y: y0, w: strip.w, h: L.H - y0 }, hover: CAMP.hover.creek });
  }
  giants(L).forEach((g, i) => out.push({ id: `tree-${i}`, rect: { x: g.x, y: g.top, w: g.w, h: g.base - g.top }, hover: CAMP.hover.tree }));
  return out;
}

// ------------------------------------------------------------------ what's going on

type CampKind = "smores" | "sing" | "ghost";
type CritterKind = "owl" | "squirrel" | "woodpecker" | "pinecone" | "bird" | "trout" | "frog" | "boat" | "duck" | "cub";

/** Campers round the fire. */
let camp: { kind: CampKind; g: Gathering; spots: GatherSpot[]; fire: Fire } | null = null;
/** The fire itself showing off (or just flaring up a bit as you poke it). */
let blaze: { kind: "bonfire" | "popcorn" | "stoke"; t0: number; fire: Fire } | null = null;

interface Critter {
  kind: CritterKind;
  t0: number;
  dur: number;
  x: number;
  y: number;
  /** Left (−1) or right (1). */
  dir: number;
  /** Its tree (tree critters). */
  g?: Giant;
  /** Where a pinecone lands (on someone's head, or the ground). */
  to?: { x: number; y: number; head: boolean };
}

let critters: Critter[] = [];
/** Rings spreading on the creek. */
let rings: { x: number; y: number; t0: number }[] = [];
/** The plan the shows belong to; a new one (a resize) starts over. */
let forL: Layout | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  camp = null;
  blaze = null;
  critters = [];
  rings = [];
}

const STAY: Record<CampKind, number> = { smores: 15, sing: 18, ghost: 16 };

function cues(list: readonly (readonly [number, number, string, string?])[]): GatherCue[] {
  return list.map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 24 ? 4.4 : 2.6, sound }));
}

/** Standing round the fire: one at each side, a third by the end of the log bench. They come up beside the bench. */
function campSpots(L: Layout, f: Fire, activity: string): GatherSpot[] {
  const c = L.couch;
  const below = L.net.halls.filter((h) => h > f.y);
  const hall = below.length > 0 ? Math.min(...below) : L.net.halls.reduce((b, h) => (Math.abs(h - f.y) < Math.abs(b - f.y) ? h : b));
  const left = c.x - 7;
  const right = c.x + c.w + 7;
  const at = (x: number, y: number, facing: Facing, side: number): GatherSpot => ({
    x,
    y,
    facing,
    pose: "stand",
    activity,
    path: [{ x: side, y: hall, c: true }, { x: side, y }, { x, y }],
  });
  return [at(f.x - 22, f.y + 2, "right", left), at(f.x + 22, f.y + 2, "left", right), at(f.x + 37, f.y + 12, "left", right)];
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  if (id === "campfire") return clickFire(act);
  if (id === "creek") return clickCreek(act);
  if (id.startsWith("tree-")) {
    const g = giants(act.L)[Number(id.slice(5))];
    return g ? clickTree(g, act) : null;
  }
  return null;
}

function clickFire(act: SceneryActions): string | null {
  const fire = fireOf(act.L);
  if (!fire) return null;
  // Most of the time idle campers come over; when nobody's free (or a show's on), the fire does something itself.
  if ((camp === null || camp.g.done) && Math.random() < 0.75) {
    const kind = weighted<CampKind>(
      act.night > 0.5
        ? [
            ["ghost", 3],
            ["smores", 3],
            ["sing", 2],
          ]
        : [
            ["smores", 3],
            ["sing", 2],
          ],
    );
    const spots = campSpots(act.L, fire, CAMP.activity[kind]);
    const g = act.gather(spots, STAY[kind], cues(CAMP[kind]), 2);
    if (g) {
      camp = { kind, g, spots, fire };
      // They take a while to walk over: the fire flares a little right away.
      blaze = { kind: "stoke", t0: act.t, fire };
      return "rw-crackle";
    }
  }
  const recent = blaze !== null && blaze.kind !== "stoke" && act.t - blaze.t0 < 8;
  const kind = recent ? (blaze!.kind === "bonfire" ? "popcorn" : "bonfire") : Math.random() < 0.6 ? "bonfire" : "popcorn";
  blaze = { kind, t0: act.t, fire };
  const who = act.near(fire.x, fire.y, 80)[0];
  if (who) act.say(who.id, pick(CAMP[kind]), 2.6, kind === "bonfire" ? 0.5 : 1.6);
  return kind === "bonfire" ? "rw-bonfire" : "rw-popcorn";
}

function addCritter(c: Critter): void {
  critters.push(c);
  if (critters.length > 12) critters.shift();
}

function clickTree(g: Giant, act: SceneryActions): string {
  const t = act.t;
  const busy = new Set(critters.filter((c) => c.g === g && t - c.t0 < c.dur).map((c) => c.kind));
  const night = act.night > 0.5;
  const options = (
    night
      ? [
          ["owl", 5],
          ["pinecone", 2],
          ["squirrel", 1],
        ]
      : [
          ["squirrel", 3],
          ["bird", 3],
          ["woodpecker", 2],
          ["pinecone", 2],
          ["owl", 1],
        ]
  ).filter(([k]) => !busy.has(k as CritterKind)) as [CritterKind, number][];
  const kind = options.length > 0 ? weighted(options) : "pinecone";
  const cx = g.x + Math.floor(g.w / 2);
  const dir = Math.random() < 0.5 ? -1 : 1;
  switch (kind) {
    case "owl":
      addCritter({ kind, t0: t, dur: 5.5, x: cx - 4, y: g.perch, dir, g });
      return "rw-owl";
    case "squirrel":
      addCritter({ kind, t0: t, dur: 2.8, x: g.x + 2, y: g.base - 3, dir, g });
      return "rw-scurry";
    case "woodpecker":
      addCritter({ kind, t0: t, dur: 2.2, x: g.x + g.w - 1, y: Math.max(g.crown + 12, g.base - 42), dir, g });
      return "rw-knock";
    case "bird":
      addCritter({ kind, t0: t, dur: 2.8, x: cx + dir * 4, y: Math.max(8, g.perch - 6), dir, g });
      return "rw-flutter";
    default: {
      // A pinecone, on whoever's standing under the tree.
      const under = act.near(cx, g.base, 48)[0];
      const to = under ? { x: Math.round(under.x), y: Math.round(under.y - 27), head: true } : { x: cx + dir * (g.w / 2 + 6), y: g.base + 3, head: false };
      if (under) act.say(under.id, pick(CAMP.ow), 2.4, 0.36);
      addCritter({ kind: "pinecone", t0: t, dur: 3.2, x: cx + dir * 3, y: Math.max(4, g.crown - 2), dir, g, to });
      return "rw-pinecone";
    }
  }
}

function clickCreek(act: SceneryActions): string | null {
  const d = campData(act.L);
  const creek = d?.creek;
  if (!creek) return null;
  const t = act.t;
  const H = act.L.H;
  const y = Math.round(clamp(act.at.y, creek.pts[0]!.y + 10, H - 14));
  const x = Math.round(creekX(creek.pts, y));
  const dir = Math.random() < 0.5 ? -1 : 1;
  // A bank to sit on, clear of tents and cabins.
  const bank = (wide: number): number | null => {
    for (const side of [-1, 1]) {
      const bx = side < 0 ? x - creek.w / 2 - wide - 2 : x + creek.w / 2 + 2;
      const r = { x: bx, y: y - 12, w: wide, h: 14 };
      if (!act.L.rooms.some((rm) => r.x < rm.rect.x + rm.rect.w && r.x + r.w > rm.rect.x && r.y < rm.rect.y + rm.rect.h && r.y + r.h > rm.rect.y)) return Math.round(bx);
    }
    return null;
  };
  const kind = weighted<CritterKind>([
    ["trout", 3],
    ["frog", 2],
    ["boat", 2],
    ["duck", 2],
    ["cub", 0.6],
  ]);
  switch (kind) {
    case "cub": {
      const bx = bank(13);
      if (bx === null) break;
      addCritter({ kind, t0: t, dur: 8, x: bx, y, dir: bx < x ? 1 : -1 });
      for (const s of [1, 2.4, 3.8]) rings.push({ x, y, t0: t + s + 0.2 });
      return "rw-cub";
    }
    case "frog": {
      const bx = bank(6);
      if (bx === null) break;
      addCritter({ kind, t0: t, dur: 1.65, x: bx, y, dir: bx < x ? 1 : -1 });
      rings.push({ x, y, t0: t + 1.55 });
      return "rw-plop";
    }
    case "boat":
    case "duck": {
      const speed = kind === "boat" ? 14 : 9;
      addCritter({ kind, t0: t, dur: Math.min(16, (H + 8 - y) / speed), x, y, dir });
      return kind === "boat" ? "rw-trickle" : "rw-quack";
    }
    default:
      break;
  }
  addCritter({ kind: "trout", t0: t, dur: 1.4, x, y, dir });
  rings.push({ x, y, t0: t + 0.15 }, { x: x + dir * 4, y, t0: t + 0.95 });
  return "rw-splash";
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void, flip = false): HTMLCanvasElement {
  return cached(`redwoods|click|${key}|${flip}`, () => {
    const g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE);
    if (flip) {
      const f = new Grid(g.w, g.h);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) f.set(g.w - 1 - x, y, g.get(x, y));
      return f.toCanvas();
    }
    return g.toCanvas();
  });
}

const owl = (blink: boolean) =>
  spr(`owl-${blink}`, 9, 11, (g) => {
    g.rect(2, 2, 5, 8, "#6e5034").rect(1, 4, 7, 5, "#6e5034");
    g.set(2, 1, "#5a3e26").set(6, 1, "#5a3e26");
    g.rect(2, 3, 5, 3, "#c8a878");
    g.rect(2, 7, 5, 2, "#a8865a").set(3, 8, "#7a5a3a").set(5, 7, "#7a5a3a");
    if (blink) g.rect(2, 4, 2, 1, "#5a3e26").rect(5, 4, 2, 1, "#5a3e26");
    else g.set(2, 4, "#ffd84a").set(3, 4, OUTLINE).set(5, 4, OUTLINE).set(6, 4, "#ffd84a");
    g.set(4, 5, "#e8a03a");
    g.rect(3, 10, 1, 1, "#e8a03a").rect(5, 10, 1, 1, "#e8a03a");
  });

const squirrelUp = (step: number) =>
  spr(`sq-up-${step}`, 7, 11, (g) => {
    // A grey squirrel climbing: head up, bushy tail streaming down behind.
    g.rect(2, 1, 3, 3, "#8f8a84").set(2, 1, "#b8b2a8").set(4, 1, "#b8b2a8");
    g.rect(2, 4, 3, 4, "#8f8a84").rect(3, 5, 1, 2, "#e8e4dc");
    g.rect(1, step ? 3 : 4, 1, 1, "#5e5a56").rect(5, step ? 4 : 3, 1, 1, "#5e5a56");
    g.rect(1, 7, 1, 1, "#5e5a56").rect(5, 7, 1, 1, "#5e5a56");
    g.rect(1, 8, 5, 3, "#a8a29a").set(3, 10, "#d8d2c8");
    g.set(3, 2, OUTLINE);
  });

const woodpecker = (peck: boolean) =>
  spr(`wp-${peck}`, 8, 10, (g) => {
    const dx = peck ? 0 : 1;
    g.rect(2 + dx, 1, 3, 3, "#2a2a2e").rect(2 + dx, 0, 2, 1, "#d23a2a").set(3 + dx, 2, "#f4f0e4");
    g.set(1 + dx, 2, "#c8b070").set(0 + dx, 2, peck ? "#c8b070" : null);
    g.rect(3, 4, 3, 5, "#2a2a2e").rect(4, 5, 1, 3, "#f4f0e4").set(3, 6, "#f4f0e4");
    g.rect(5, 8, 2, 2, "#2a2a2e");
  });

const pinecone = () =>
  spr("cone", 4, 5, (g) => {
  g.rect(0, 1, 4, 3, "#8a5a30").rect(1, 0, 2, 5, "#8a5a30");
  g.set(1, 1, "#b0804a").set(2, 3, "#b0804a").set(1, 3, "#6a4022").set(2, 1, "#6a4022");
});

/** A blue jay with a dark crest: wings up, down, or folded while it sits. */
const bird = (wings: "up" | "down" | "folded") =>
  spr(`bird-${wings}`, 8, 7, (g) => {
    g.rect(2, 3, 4, 2, "#3a64b0").rect(4, 1, 2, 3, "#3a64b0").set(4, 0, "#1e2a4a").set(5, 1, "#1e2a4a").set(6, 2, "#3a3046");
    g.rect(0, 3, 2, 1, "#2a4a8a");
    if (wings === "up") g.rect(2, 0, 2, 3, "#5a86d0");
    else if (wings === "down") g.rect(2, 5, 2, 2, "#5a86d0");
    else g.rect(2, 3, 3, 1, "#5a86d0");
  });

const trout = (tilt: number) =>
  spr(`trout-${tilt}`, 9, 5, (g) => {
    for (let x = 0; x < 8; x++) {
      const y = 2 + Math.round(((x - 4) * tilt) / 5);
      g.set(x, y, "#8aa07a").set(x, y - 1, x > 1 && x < 7 ? "#a8b890" : null).set(x, y + 1, x > 1 && x < 7 ? "#d8a0a0" : null);
    }
    g.set(7, 2 + Math.round((3 * tilt) / 5) - 1, OUTLINE);
  });

const frog = (jump: boolean) =>
  spr(`frog-${jump}`, 7, 5, (g) => {
    g.rect(1, 1, 5, 3, "#5a9a3a").set(1, 0, "#5a9a3a").set(5, 0, "#5a9a3a");
    g.set(1, 0, "#f4f0e4").set(5, 0, "#f4f0e4");
    g.rect(2, 3, 3, 1, "#c8d870");
    if (jump) g.rect(0, 3, 1, 2, "#4a8a2e").rect(6, 3, 1, 2, "#4a8a2e");
    else g.rect(0, 3, 2, 1, "#4a8a2e").rect(5, 3, 2, 1, "#4a8a2e");
  });

const boat = () =>
  spr("boat", 9, 6, (g) => {
  g.rect(0, 3, 9, 1, "#f4f0e4").rect(1, 4, 7, 1, "#e2dccb").rect(2, 5, 5, 1, "#cfc8b4");
  g.rect(4, 0, 1, 3, "#f4f0e4").set(3, 1, "#e2dccb").set(3, 2, "#e2dccb").set(5, 2, "#cfc8b4");
});

const duck = (paddle: boolean) =>
  spr(`duck-${paddle}`, 9, 7, (g) => {
    g.rect(1, 3, 6, 3, "#8a6a4a").rect(2, 3, 3, 1, "#a88a64").set(1, 2, "#6a4a32");
    g.rect(5, 1, 2, 2, "#2f6b3a").set(6, 0, "#2f6b3a").set(5, 3, "#f4f0e4").set(6, 3, "#f4f0e4");
    g.rect(7, 2, 2, 1, "#e8b84a").set(6, 1, OUTLINE);
    g.rect(2, 6, 4, 1, paddle ? "#cfe0e8" : "#a8c4d4");
  });

const cub = (frame: number, flip: boolean) =>
  spr(
    `cub-${frame}`,
    13,
    12,
    (g) => {
    const fur = "#6a4a2e";
    const hi = "#8a6440";
    g.ellipse(6, 8, 4, 3.4, fur);
    g.rect(4, 2, 5, 5, fur).set(4, 1, fur).set(8, 1, fur).set(4, 1, hi);
    g.rect(5, 4, 3, 2, "#a8865a").set(6, 4, OUTLINE).set(5, 3, OUTLINE).set(7, 3, OUTLINE);
    g.rect(3, 6, 2, 3, hi);
    // A paw reaching for the water, or a fish caught
    if (frame === 1) g.rect(9, 7, 3, 2, fur).set(11, 9, fur);
    else g.rect(8, 7, 2, 3, fur);
    if (frame === 2) g.rect(6, 5, 5, 1, "#a8b890").set(11, 4, "#a8b890").set(11, 6, "#a8b890").set(7, 6, "#d8a0a0");
    g.rect(3, 11, 3, 1, fur).rect(7, 11, 3, 1, fur);
    },
    flip,
  );

const guitar = (flip: boolean) =>
  spr(
    "guitar",
    12,
    7,
    (g) => {
      g.ellipse(3, 4, 2.6, 2.2, "#c07a3a").set(3, 4, "#3a2416").set(2, 3, "#e0a060");
      g.rect(5, 3, 5, 1, "#7a4a2a").rect(10, 2, 2, 2, "#5a3a22");
      g.set(6, 2, "#e8dcc8").set(8, 2, "#e8dcc8");
    },
    flip,
  );

const pan = () =>
  spr("pan", 18, 6, (g) => {
  g.ellipse(6, 3, 5.5, 2.3, "#3a3836").rect(2, 2, 8, 1, "#5a5752");
  g.rect(11, 2, 7, 1, "#4a3a2a").rect(16, 1, 2, 3, "#6a4a32");
});

const note = () =>
  spr("note", 5, 7, (g) => {
    g.rect(0, 4, 3, 3, C.cream).rect(2, 0, 1, 5, C.cream).rect(3, 0, 2, 1, C.cream).set(4, 1, C.cream);
  });

const flashlight = () =>
  spr("flashlight", 3, 6, (g) => {
  g.rect(0, 0, 3, 2, "#f4f0c0").rect(0, 2, 3, 4, "#4a5a6a").set(1, 3, "#8a9aaa");
});

// ------------------------------------------------------------------ drawing

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n)), Math.round(y0 + ((y1 - y0) * i) / Math.max(1, n)), 1, 1);
}

/** Seconds since the campers had all arrived (null when there's no show on). */
function campClock(t: number): number | null {
  if (!camp || camp.g.done || camp.g.arrivedAt === null) return null;
  return t - camp.g.arrivedAt;
}

/** How hard the fire is roaring (0 … 1), for the flames and the glow. */
export function fireBoost(t: number): number {
  if (!blaze || blaze.kind === "popcorn") return 0;
  const k = t - blaze.t0;
  if (blaze.kind === "stoke") return k < 0 || k > 1.6 ? 0 : 0.35 * Math.min(1, k / 0.2, (1.6 - k) / 0.8);
  if (k < 0 || k > 7) return 0;
  return k < 0.4 ? k / 0.4 : k < 4.5 ? 1 : 1 - (k - 4.5) / 2.5;
}

function marshmallow(ctx: Ctx, i: number, x: number, y: number, k: number, t: number): void {
  // Camper 1's catches fire at 6 s and gets blown out at 8.6 s.
  const burning = i === 1 && k >= 6 && k < 8.6;
  const charred = i === 1 && k >= 8.6;
  ctx.fillStyle = charred ? "#2a2220" : k > 11 ? "#c8904a" : k > 6 ? "#e8c070" : "#f4f0e4";
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.fillStyle = charred ? "#4a3a30" : "#fff8e8";
  ctx.fillRect(x - 1, y - 1, 1, 1);
  if (burning) {
    const fh = 3 + (Math.floor(t * 12) % 2);
    ctx.fillStyle = C.flame;
    ctx.fillRect(x - 1, y - 1 - fh, 3, fh);
    ctx.fillStyle = C.flameHi;
    ctx.fillRect(x, y - fh, 1, fh - 1);
  }
}

/** Things on the ground and in the trees, sorted with people (decor). */
export function clickItems(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const t = info.t;
  const out: Drawable[] = [];
  const k = campClock(t);
  if (camp && k !== null) {
    const { kind, spots, fire, g } = camp;
    for (let i = 0; i < g.size; i++) {
      if (!g.present[i]) continue;
      const sp = spots[i]!;
      const dir = sp.facing === "right" ? 1 : -1;
      if (kind === "smores") {
        const stay = STAY.smores;
        const reach = Math.min(1, k / 0.6, Math.max(0, (stay - 0.6 - k) / 0.6));
        if (reach <= 0) continue;
        // Toasting at the edge of the flames, in front of the fire.
        const hx = sp.x + 5 * dir;
        const hy = sp.y - 11;
        const tx = Math.round(hx + (fire.x - dir * (6 + 2 * i) - hx) * reach);
        const ty = Math.round(hy + (fire.y - 6 - (i % 2) * 2 - hy) * reach);
        out.push({
          z: Math.max(sp.y, fire.z) + 0.6,
          draw: () => {
            ctx.fillStyle = "#4a2e1c";
            line(ctx, hx, hy, tx, ty);
            ctx.fillStyle = "#9a7048";
            line(ctx, hx, hy - 1, Math.round((hx + tx) / 2), Math.round((hy + ty) / 2) - 1);
            marshmallow(ctx, i, tx, ty, k, t);
          },
        });
      } else if (i === 0 && kind === "sing") {
        out.push({ z: sp.y + 0.6, draw: () => ctx.drawImage(guitar(dir < 0), dir > 0 ? sp.x - 5 : sp.x - 7, sp.y - 13 + (Math.floor(t * 3) % 2)) });
      } else if (i === 0 && kind === "ghost") {
        out.push({ z: sp.y + 0.6, draw: () => ctx.drawImage(flashlight(), sp.x + dir * 2 - 1, sp.y - 15) });
      }
    }
  }
  if (blaze?.kind === "popcorn") {
    const b = blaze;
    const kk = t - b.t0;
    if (kk >= 0 && kk < 9) {
      const f = b.fire;
      out.push({
        z: f.z + 0.3,
        draw: () => {
          ctx.globalAlpha = Math.min(1, kk / 0.3, (9 - kk) / 0.5);
          ctx.drawImage(pan(), f.x - 7, f.y - 6);
          ctx.globalAlpha = 1;
          drawPopcorn(ctx, f, kk);
        },
      });
    }
  }
  if (critters.length > 0 && t - critters[0]!.t0 > critters[0]!.dur) critters = critters.filter((c) => t - c.t0 <= c.dur);
  for (const c of critters) {
    const kk = t - c.t0;
    if (kk < 0 || kk > c.dur) continue;
    const item = critterItem(ctx, L, c, kk, t);
    if (item) out.push(item);
  }
  return out;
}

const POPS = [0.5, 0.95, 1.3, 1.5, 1.65, 1.8, 1.9, 2.05, 2.15, 2.3, 2.38, 2.5, 2.7, 2.85, 3.1, 3.4, 3.9, 4.6];

function drawPopcorn(ctx: Ctx, f: Fire, k: number): void {
  for (const [i, at] of POPS.entries()) {
    const p = (k - at) / 0.5;
    if (p < 0) continue;
    const side = i % 2 ? 1 : -1;
    const land = { x: f.x + side * (10 + ((i * 7) % 13)), y: f.y + 3 + (i % 3) * 2 };
    const sx = f.x - 3 + ((i * 3) % 7);
    const sy = f.y - 5;
    const q = Math.min(1, p);
    const x = Math.round(sx + (land.x - sx) * q);
    const y = Math.round(sy + (land.y - sy) * q - Math.sin(q * Math.PI) * (8 + (i % 4) * 2));
    if (k > 8.5) ctx.globalAlpha = Math.max(0, (9 - k) / 0.5);
    ctx.fillStyle = "#fff6dc";
    ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = "#f2cd6a";
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.globalAlpha = 1;
  }
}

/** On the water, a duck or a boat ducks out of sight under the bridges. */
function underBridge(L: Layout, y: number): boolean {
  const d = campData(L);
  return L.net.halls.some((h) => Math.abs(h - y) < 8) || (d?.bridges ?? []).some((b) => y > b.y - 2 && y < b.y + b.h + 2);
}

function critterItem(ctx: Ctx, L: Layout, c: Critter, k: number, t: number): Drawable | null {
  const g = c.g;
  switch (c.kind) {
    case "owl": {
      // It peeks out from behind the trunk, blinks twice, ducks back.
      const show = Math.min(1, k / 0.4, (c.dur - k) / 0.4);
      const blink = (k > 1.6 && k < 1.8) || (k > 3.4 && k < 3.6);
      return { z: g!.base + 0.3, draw: () => ctx.drawImage(owl(blink), c.x, c.y + Math.round((1 - show) * 4)) };
    }
    case "squirrel": {
      // Up the trunk, a pause to look at you, then on up into the boughs.
      const p = k < 1 ? k : k < 1.5 ? 1 : k - 0.5;
      const y = Math.round(c.y - (p / (c.dur - 0.5)) * (c.y - g!.crown + 4));
      const step = k >= 1 && k < 1.5 ? 0 : Math.floor(t * 12) % 2;
      return { z: g!.base + 0.3, draw: () => ctx.drawImage(squirrelUp(step), c.x, y - 11) };
    }
    case "woodpecker": {
      const peck = (k < 0.5 || (k > 0.9 && k < 1.4)) && Math.floor(t * 16) % 2 === 0;
      return {
        z: g!.base + 0.3,
        draw: () => {
          ctx.drawImage(woodpecker(peck), c.x - 2, c.y - 8);
          // Chips of bark flying
          ctx.fillStyle = "#c66a45";
          for (let i = 0; i < 3; i++) {
            const q = (k * 1.8 + i * 0.33) % 1;
            ctx.fillRect(Math.round(c.x - 2 + q * 5), Math.round(c.y - 5 + q * q * 14), 1, 1);
          }
        },
      };
    }
    case "bird": {
      // It sits a moment on a twig, then takes off up and away.
      const q = Math.max(0, (k - 0.5) / (c.dur - 0.5));
      const x = Math.round(c.x + c.dir * q * 60);
      const y = Math.round(c.y - q * q * (c.y + 12));
      const wings = q === 0 ? "folded" : Math.floor(t * 10) % 2 === 0 ? "up" : "down";
      return { z: L.H + 2, draw: () => ctx.drawImage(bird(wings), x - 4, y - 4) };
    }
    case "pinecone": {
      const to = c.to!;
      const fall = 0.34;
      let x: number;
      let y: number;
      if (k < fall) {
        const q = k / fall;
        x = c.x + (to.x - c.x) * q;
        y = c.y + (to.y - c.y) * q * q;
      } else {
        // Bounce off (a head) and come to rest on the ground.
        const ground = to.head ? to.y + 27 : to.y;
        const q = Math.min(1, (k - fall) / 0.45);
        x = to.x + c.dir * 7 * q;
        y = to.y + (ground - to.y) * q - Math.sin(q * Math.PI) * 6;
      }
      const fade = Math.min(1, (c.dur - k) / 0.5);
      const stars = to.head && k > fall && k < fall + 0.8;
      return {
        z: (to.head ? to.y + 27 : to.y) + 1,
        draw: () => {
          ctx.globalAlpha = fade;
          ctx.drawImage(pinecone(), Math.round(x) - 2, Math.round(y) - 4);
          ctx.globalAlpha = 1;
          if (stars) {
            ctx.fillStyle = "#ffd84a";
            for (let i = 0; i < 3; i++) {
              const a = t * 6 + i * 2.1;
              ctx.fillRect(Math.round(to.x + Math.cos(a) * 6), Math.round(to.y - 2 + Math.sin(a) * 2), 1, 1);
            }
          }
        },
      };
    }
    case "trout": {
      const q = (k - 0.15) / 0.7;
      if (q < 0 || q > 1) return null;
      const x = Math.round(c.x - 4 + c.dir * q * 4);
      const y = Math.round(c.y - Math.sin(q * Math.PI) * 12);
      const tilt = q < 0.35 ? -3 : q > 0.65 ? 3 : 0;
      return { z: c.y + 0.5, draw: () => ctx.drawImage(trout(tilt * c.dir), x, y - 3) };
    }
    case "frog": {
      const d = campData(L)!.creek!;
      const water = Math.round(creekX(d.pts, c.y));
      const jump = k > 1.25;
      const q = jump ? Math.min(1, (k - 1.25) / 0.3) : 0;
      if (q >= 1) return null;
      const x = Math.round(c.x + (water - 3 - c.x) * q);
      const y = Math.round(c.y - Math.sin(q * Math.PI) * 6 - (!jump && Math.floor(t * 3) % 3 === 0 ? 1 : 0));
      return { z: c.y + 0.5, draw: () => ctx.drawImage(frog(jump), x, y - 4) };
    }
    case "boat":
    case "duck": {
      const d = campData(L)!.creek!;
      const speed = c.kind === "boat" ? 14 : 9;
      const y = c.y + k * speed;
      if (underBridge(L, y)) return null;
      const x = Math.round(creekX(d.pts, y));
      const bob = Math.floor(t * 2 + c.t0) % 2;
      const sprite = c.kind === "boat" ? boat() : duck(Math.floor(t * 4) % 2 === 0);
      return { z: y + 0.5, draw: () => ctx.drawImage(sprite, x - 4, Math.round(y) - 5 + bob) };
    }
    case "cub": {
      const fish = k > 4.2;
      const swipe = !fish && [1, 2.4, 3.8].some((s) => k > s && k < s + 0.35);
      const show = Math.min(1, k / 0.4, (c.dur - k) / 0.4);
      return {
        z: c.y + 0.5,
        draw: () => {
          ctx.globalAlpha = show;
          ctx.drawImage(cub(fish ? 2 : swipe ? 1 : 0, c.dir < 0), c.x - 1, c.y - 11);
          ctx.globalAlpha = 1;
        },
      };
    }
  }
  return null;
}

/** Splash rings on the creek (under everything). */
export function clickUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || rings.length === 0) return;
  const t = info.t;
  rings = rings.filter((r) => t - r.t0 < 1.2);
  for (const r of rings) {
    const k = (t - r.t0) / 1.2;
    if (k < 0) continue;
    const rx = Math.round(1 + k * 6);
    const ry = Math.max(1, Math.round(rx * 0.45));
    ctx.fillStyle = `rgba(226,240,252,${(0.85 * (1 - k)).toFixed(2)})`;
    ctx.fillRect(r.x - rx, r.y, 1, 1);
    ctx.fillRect(r.x + rx, r.y, 1, 1);
    ctx.fillRect(r.x - rx + 1, r.y - ry, rx * 2 - 1, 1);
    ctx.fillRect(r.x - rx + 1, r.y + ry, rx * 2 - 1, 1);
  }
}

/** The flashlight's glow on a face, brightest under the chin. */
function faceGlow(): HTMLCanvasElement {
  return cached("redwoods|click|faceglow", () => {
    const c = document.createElement("canvas");
    c.width = 15;
    c.height = 15;
    const ctx = ctx2d(c);
    const g = ctx.createRadialGradient(7.5, 10, 0, 7.5, 9, 7.5);
    g.addColorStop(0, "rgba(255,240,170,0.55)");
    g.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 15, 15);
    return c;
  });
}

/** Above everything: sparks, notes, the flashlight on a face, a puff of smoke. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  const boost = fireBoost(t);
  if (boost > 0 && blaze) {
    // A shower of sparks
    const f = blaze.fire;
    for (let i = 0; i < 36; i++) {
      const q = (t * (0.55 + (i % 5) * 0.08) + i * 0.137) % 1;
      const x = Math.round(f.x + Math.sin(i * 2.3 + t * 1.5) * (3 + q * 16));
      const y = Math.round(f.y - 10 - q * (34 + (i % 4) * 10));
      ctx.globalAlpha = boost * (1 - q);
      ctx.fillStyle = q < 0.3 ? C.flameCore : q < 0.65 ? C.flameHi : C.flame;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  const k = campClock(t);
  if (!camp || k === null) return;
  const { kind, spots, g } = camp;
  if (kind === "sing") {
    // Notes drifting up beside the campers' heads (low enough to clear the screen above the fire)
    for (let i = 0; i < g.size; i++) {
      if (!g.present[i]) continue;
      const sp = spots[i]!;
      const q = (k * 0.5 + i * 0.37) % 1;
      const x = Math.round(sp.x + (sp.facing === "right" ? -11 : 9) + Math.sin(q * 6 + i) * 2);
      const y = Math.round(sp.y - 14 - q * 12);
      ctx.globalAlpha = Math.min(1, (1 - q) * 1.5);
      ctx.drawImage(note(), x - 1, y - 4);
    }
    ctx.globalAlpha = 1;
  } else if (kind === "ghost" && g.present[0]) {
    // The flashlight under the storyteller's chin
    const sp = spots[0]!;
    ctx.globalAlpha = info.night > 0.5 ? 0.9 : 0.45;
    ctx.drawImage(faceGlow(), sp.x - 7, sp.y - 26);
    ctx.globalAlpha = 1;
  } else if (kind === "smores" && g.present[1] && k > 8.6 && k < 10.4) {
    // The puff of smoke off the blown-out marshmallow
    const tx = camp.fire.x + 4;
    const ty = camp.fire.y - 8;
    for (let i = 0; i < 4; i++) {
      const q = (k - 8.6) / 1.8;
      ctx.fillStyle = `rgba(200,196,190,${(0.7 * (1 - q)).toFixed(2)})`;
      ctx.fillRect(Math.round(tx + Math.sin(i * 1.7 + q * 4) * 2), Math.round(ty - q * 12 - i * 3), 2, 2);
    }
  }
}

/** Light at night: the bonfire, a burning marshmallow, the flashlight. */
export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL) return [];
  const out: Light[] = [];
  const t = info.t;
  const boost = fireBoost(t);
  if (boost > 0 && blaze) out.push([blaze.fire.x, blaze.fire.y - 6, 70 + 70 * boost, 0.9 * boost, "#ffb05a", 0.35 * boost]);
  const k = campClock(t);
  if (camp && k !== null) {
    if (camp.kind === "ghost" && camp.g.present[0]) {
      const sp = camp.spots[0]!;
      out.push([sp.x, sp.y - 22, 16, 1, "#fff2c0", 0.4]);
    }
    if (camp.kind === "smores" && camp.g.present[1] && k > 6 && k < 8.6) out.push([camp.fire.x + 4, camp.fire.y - 10, 14, 0.8, "#ffb05a", 0.25]);
  }
  return out;
}
