// Sky Loft: things to click. The hot tub's jets (and a rubber duck), the fire
// table turned up (marshmallows, cocoa), the telescopes (a falcon on a ledge,
// a parade, a proposal across the way), the city through the glass (a
// helicopter close by, a blimp, the window washers, fireworks at night), the
// globe pendants' dimmer and the spiral stair (a slinky, a paper plane from
// the roof).
//
// Clicks only start things; everything is drawn from the loft's live layers
// (decor, overlay, underlay, the view outside, lights) by the animation clock.
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, OutsideInfo, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import { cached, Grid, makeCanvas, OUTLINE } from "../../themekit.ts";
import { clamp } from "./kit.ts";
import { lowerPane } from "./background.ts";
import { decorAt } from "./live.ts";
import { dimmer, DIM_SHOW, pendants, type Globe } from "./luxe.ts";
import { planOf } from "./plan.ts";
import { fireBoost, flare } from "./terrace.ts";
import { SKY } from "./words.ts";

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

/** A cheap integer hash (no strings in the hot loops). */
function ih(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function cues(list: readonly (readonly [number, number, string, string?])[]): GatherCue[] {
  return list.map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 26 ? 4.2 : 2.8, sound }));
}

// ------------------------------------------------------------------ where things are

interface Places {
  tub: Rect | null;
  fire: Rect | null;
  /** The telescope on the terrace (its foot), and the one by the glass (sprite rect). */
  scope: Point | null;
  scopeIn: Rect | null;
  stair: Rect | null;
  globes: Globe[];
  /** The lower glass under each window. */
  panes: { i: number; r: Rect }[];
  strips: Rect[];
  /** The way out onto the terrace: a hall point, the aisle down, and the lane along the open floor. */
  way: { p0: Point; ax: number; lane: number } | null;
}

let placesFor: Layout | null = null;
let placesOf: Places | null = null;

function places(L: Layout): Places {
  if (L !== placesFor || !placesOf) {
    placesFor = L;
    placesOf = findPlaces(L);
  }
  return placesOf;
}

function findPlaces(L: Layout): Places {
  const plan = planOf(L);
  const deck = plan?.terrace ?? null;
  const ev = L.eventArea;
  let way: Places["way"] = null;
  if (deck) {
    const s = L.spots.find((sp) => sp.path.length >= 3 && sp.x >= deck.x && sp.x <= deck.x + deck.w && sp.y >= deck.y && sp.y <= deck.y + deck.h);
    if (s) way = { p0: { ...s.path[0]! }, ax: s.path[1]!.x, lane: ev.y + ev.h + 2 };
  }
  const panes: Places["panes"] = [];
  for (const [i, w] of L.wall.windows.entries()) {
    const r = lowerPane(L, w);
    if (r) panes.push({ i, r });
  }
  // The decor is placed around the props' sprites, so it needs a canvas (there's none in the layout tests).
  const drawn = typeof document !== "undefined";
  return {
    tub: plan?.tub ?? null,
    fire: plan?.fire ?? null,
    scope: plan?.scope ?? null,
    scopeIn: drawn ? decorAt(L, "telescope") : null,
    stair: drawn ? decorAt(L, "stair") : null,
    globes: pendants(L),
    panes,
    strips: plan?.beyond ?? [],
    way,
  };
}

export function clickables(L: Layout): SceneryClickable[] {
  const P = places(L);
  const out: SceneryClickable[] = [];
  if (P.tub) out.push({ id: "tub", rect: P.tub, hover: SKY.hover.tub });
  if (P.fire) out.push({ id: "fire", rect: { x: P.fire.x - 2, y: P.fire.y - 8, w: P.fire.w + 4, h: P.fire.h + 10 }, hover: SKY.hover.fire });
  if (P.scope) out.push({ id: "scope", rect: { x: P.scope.x - 8, y: P.scope.y - 25, w: 16, h: 26 }, hover: SKY.hover.scope });
  if (P.scopeIn) out.push({ id: "scope-in", rect: P.scopeIn, hover: SKY.hover.scopeIn });
  if (P.stair) out.push({ id: "stair", rect: P.stair, hover: SKY.hover.stair });
  if (P.globes.length > 0) {
    const g = P.globes[1]!;
    out.push({ id: "pendants", rect: { x: g.x - 16, y: g.y - 8, w: 32, h: 20 }, hover: SKY.hover.pendants });
  }
  for (const p of P.panes) out.push({ id: `glass-${p.i}`, rect: p.r, hover: SKY.hover.glass });
  P.strips.forEach((r, i) => out.push({ id: `edge-${i}`, rect: r, hover: SKY.hover.edge }));
  return out;
}

// ------------------------------------------------------------------ what's going on

type Sight = "falcon" | "parade" | "party" | "proposal" | "waver" | "moon";
type SkyKind = "heli" | "blimp" | "washer" | "fireworks";

interface Burst {
  at: number;
  x: number;
  y: number;
  r: number;
  color: string;
  heart: boolean;
  /** Seen from above in the glass below (no rising shell), clipped to this pane. */
  below: Rect | null;
  /** Where the shell goes up from (window bursts). */
  y0: number;
}

interface SkyEvent {
  kind: SkyKind;
  t0: number;
  dur: number;
  dir: number;
  y: number;
  /** Left and right ends of the run (heli, blimp). */
  x0: number;
  x1: number;
  win: Rect | null;
  bursts: Burst[];
}

/** The plan the shows belong to; a new one (a resize) starts over. */
let forL: Layout | null = null;
let wins: Rect[] | null = null;

/** The hot tub: jets on until `jets`, soakers who came over, a rubber duck bobbing about. */
let tub: { jets: number; g: Gathering | null } = { jets: -1e9, g: null };
let duck: { t0: number | null; g: Gathering | null; until: number } | null = null;
let fireShow: { kind: "smores" | "cocoa"; g: Gathering; spots: GatherSpot[]; f: Rect } | null = null;
/** Someone at a telescope and what they spotted, shown in a round lens view (centered at c, a trail of dots from `from`). */
let look: { kind: Sight; t0: number | null; g: Gathering | null; from: Point; c: Point } | null = null;
let lastSight: Sight | null = null;
let skyEvents: SkyEvent[] = [];
/** People out on the terrace for the fireworks; they get a finale of their own once they're there. */
let watch: { g: Gathering; finale: boolean } | null = null;
let stairShow: { kind: "slinky" | "plane"; t0: number; dir: number; to: Point } | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  wins = L.wall.windows;
  tub = { jets: -1e9, g: null };
  duck = null;
  fireShow = null;
  look = null;
  skyEvents = [];
  watch = null;
  stairShow = null;
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const P = places(act.L);
  switch (id) {
    case "tub":
      return clickTub(P, act);
    case "fire":
      return clickFire(P, act);
    case "scope":
      return clickScope(P, act, false);
    case "scope-in":
      return clickScope(P, act, true);
    case "pendants":
      return clickPendants(P, act);
    case "stair":
      return clickStair(P, act);
    default:
      return id.startsWith("glass-") || id.startsWith("edge-") ? clickGlass(P, act) : null;
  }
}

function clickTub(P: Places, act: SceneryActions): string | null {
  const r = P.tub;
  if (!r) return null;
  const t = act.t;
  tub.jets = t + 12;
  const seats = act.L.spots.filter((s) => s.id.startsWith("hot-tub-"));
  const soaking = seats.flatMap((s) => act.near(s.x, s.y, 4).slice(0, 1));
  const free = seats.filter((s) => act.near(s.x, s.y, 4).length === 0);
  if ((tub.g === null || tub.g.done) && free.length > 0) {
    const kind = act.night > 0.5 ? "soakNight" : Math.random() < 0.45 ? "duck" : "soak";
    const spots: GatherSpot[] = free.map((s) => ({ x: s.x, y: s.y, facing: s.facing, pose: s.pose, activity: SKY.activity.soak, path: s.path.map((p) => ({ ...p })), lift: s.lift }));
    const g = act.gather(spots, 15, cues(SKY[kind]), 1);
    if (g) {
      tub.g = g;
      if (kind === "duck") duck = { t0: null, g, until: Infinity };
    }
  }
  for (const s of soaking) act.say(s.id, pick(SKY.jets), 2.4, 0.4);
  // Now and then the duck pops up on its own.
  if (duck === null && Math.random() < 0.3) duck = { t0: t + 0.6, g: null, until: t + 40 };
  return "sky-jets";
}

function fireSpots(P: Places, f: Rect, kind: "smores" | "cocoa"): GatherSpot[] {
  const way = P.way!;
  const row = f.y + 19;
  const col = forL!.eventArea.x + 3;
  const pose = kind === "cocoa" ? "cup" : "stand";
  const activity = SKY.activity[kind];
  const at = (x: number, y: number, facing: GatherSpot["facing"]): GatherSpot => ({
    x,
    y,
    facing,
    pose,
    activity,
    path: [{ ...way.p0 }, { x: way.ax, y: way.lane }, { x: col, y: way.lane }, { x: col, y: row }, { x, y: row }, ...(y !== row ? [{ x, y }] : [])],
  });
  return [at(f.x + 12, row, "back"), at(f.x + Math.min(32, f.w - 10), row, "back"), at(f.x + f.w + 8, f.y + 8, "left")];
}

function clickFire(P: Places, act: SceneryActions): string | null {
  const f = P.fire;
  if (!f) return null;
  flare.t0 = act.t;
  if ((fireShow === null || fireShow.g.done) && P.way && Math.random() < 0.75) {
    const cold = act.night > 0.5 || act.weather === "snow" || act.weather === "rain" || act.weather === "drizzle" || act.weather === "fog";
    const kind = cold && Math.random() < 0.55 ? "cocoa" : "smores";
    const spots = fireSpots(P, f, kind);
    const g = act.gather(spots, kind === "smores" ? 15 : 13, cues(SKY[kind]), 2);
    if (g) {
      fireShow = { kind, g, spots, f };
      return "sky-whoosh";
    }
  }
  const who = act.near(f.x + f.w / 2, f.y + 8, 90)[0];
  if (who) act.say(who.id, pick(SKY.flare), 2.4, 0.4);
  return "sky-whoosh";
}

const SIGHT_SOUND: Record<Sight, [string | undefined, string | undefined]> = {
  falcon: ["sky-falcon", undefined],
  parade: ["sky-parade", undefined],
  party: ["sky-party", undefined],
  proposal: [undefined, "sky-aww"],
  waver: [undefined, undefined],
  moon: [undefined, undefined],
};
const LENS_FOR = 7.5;

function lensStart(l: NonNullable<typeof look>): number {
  if (l.t0 !== null) return l.t0;
  return l.g && l.g.arrivedAt !== null ? l.g.arrivedAt + 1 : Infinity;
}

function clickScope(P: Places, act: SceneryActions, indoor: boolean): string | null {
  const t = act.t;
  if (look) {
    const s = lensStart(look);
    if (s === Infinity ? look.g !== null && !look.g.done : t < s + LENS_FOR) return "sky-scope";
  }
  const night = act.night > 0.5;
  const options: [Sight, number][] = night
    ? [
        ["party", 2],
        ["proposal", 2],
        ["waver", 2],
        ["moon", 2],
      ]
    : [
        ["falcon", 3],
        ["parade", 2],
        ["waver", 2],
        ["proposal", 1],
        ["party", 1],
      ];
  const kind = weighted(options.filter(([k]) => k !== lastSight));
  lastSight = kind;
  const [line1, line2] = SKY.scope[kind];
  const [s1, s2] = SIGHT_SOUND[kind];
  // The lens view pops up beside the telescope, clear of the looker's speech bubble.
  const L = act.L;
  const inside = (x: number, y: number): Point => ({ x: Math.round(clamp(x, LR + 3, L.W - LR - 3)), y: Math.round(clamp(y, LR + 3, L.H - LR - 3)) });
  let from: Point;
  let c: Point;
  if (indoor) {
    const r = P.scopeIn!;
    const side = r.x + r.w + 50 < L.W ? 1 : -1;
    from = { x: r.x + (side > 0 ? 13 : 3), y: r.y + 4 };
    c = inside(r.x + 8 + side * 32, r.y + 30);
  } else {
    const s = P.scope!;
    from = { x: s.x - 16, y: s.y - 19 };
    c = inside(s.x - 44, s.y - 14);
  }
  const s = P.scope;
  const way = P.way;
  if (!indoor && s && way && Math.abs(s.y - 1 - way.lane) <= 14) {
    const x = s.x - 9;
    const y = s.y - 1;
    const spot: GatherSpot = { x, y, facing: "right", pose: "stand", activity: SKY.activity.look, path: [{ ...way.p0 }, { x: way.ax, y: way.lane }, { x, y: way.lane }, { x, y }] };
    const g = act.gather([spot], 9.5, cues([[0.2, 0, pick(SKY.look)], [1.6, 0, line1, s1], [4.6, 0, line2, s2]]), 1);
    if (g) {
      look = { kind, t0: null, g, from, c };
      return "sky-scope";
    }
  }
  look = { kind, t0: t + 0.3, g: null, from, c };
  const who = act.near(from.x, from.y + 22, indoor ? 120 : 90)[0];
  if (who) {
    act.say(who.id, line1, 3.6, 1.2);
    act.say(who.id, line2, 3, 4.4);
  }
  return s1 ?? s2 ?? "sky-scope";
}

function clickPendants(P: Places, act: SceneryActions): string | null {
  const g = P.globes[1];
  if (!g) return null;
  if (act.t - dimmer.t0 < DIM_SHOW) return null;
  dimmer.t0 = act.t;
  const who = act.near(g.x, g.y + 40, 100)[0];
  if (who) act.say(who.id, pick(act.night > 0.3 ? SKY.dimNight : SKY.dimDay), 2.6, 1.8);
  return "sky-dimmer";
}

const SLINKY_HOP = 0.27;
const SLINKY_STOPS = 14;

function clickStair(P: Places, act: SceneryActions): string | null {
  const st = P.stair;
  if (!st) return null;
  const t = act.t;
  if (stairShow && t - stairShow.t0 < (stairShow.kind === "slinky" ? SLINKY_STOPS * SLINKY_HOP : 3)) return null;
  const L = act.L;
  const foot = { x: st.x + 16, y: st.y + 49 };
  let dir = foot.x < L.W / 2 ? 1 : -1;
  if (Math.random() < 0.3) dir = -dir;
  if (Math.random() < 0.55) {
    stairShow = { kind: "slinky", t0: t, dir, to: { x: foot.x + dir * 18, y: foot.y + 1 } };
    const who = act.near(foot.x, foot.y, 90)[0];
    if (who) act.say(who.id, pick(SKY.slinky), 2.6, 2.2);
    return "sky-slinky";
  }
  const to = { x: Math.round(clamp(foot.x + dir * (50 + Math.random() * 50), 10, L.W - 10)), y: Math.round(clamp(foot.y + 8 + Math.random() * 30, foot.y + 4, L.H - 8)) };
  stairShow = { kind: "plane", t0: t, dir: to.x >= foot.x ? 1 : -1, to };
  const who = act.near(to.x, to.y, 70)[0];
  if (who) act.say(who.id, pick(SKY.plane), 3.6, 3.3);
  return "sky-glide";
}

/** The run across the windows (the sky view is one long panorama). */
function span(): { x0: number; x1: number; y: number; h: number } | null {
  if (!wins || wins.length === 0) return null;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y = Infinity;
  let h = Infinity;
  for (const w of wins) {
    x0 = Math.min(x0, w.x);
    x1 = Math.max(x1, w.x + w.w);
    y = Math.min(y, w.y);
    h = Math.min(h, w.h);
  }
  return { x0, x1, y, h };
}

const BURST_COLORS = ["#ff5a6a", "#ffd84a", "#7cc8ff", "#9dff8a", "#ff9a3a", "#e07aff", "#ffffff"];

/** A fireworks show from t0: bursts over the skyline in the windows and, seen from above, in the glass below; a heart `heartAt` seconds in. */
function fireworks(P: Places, t0: number, dur: number, heartAt: number): SkyEvent {
  const ev: SkyEvent = { kind: "fireworks", t0, dur: dur + RISE + BLOOM, dir: 1, y: 0, x0: 0, x1: 0, win: null, bursts: [] };
  const below: Rect[] = [...P.strips, ...P.panes.map((p) => p.r)].filter((r) => Math.min(r.w, r.h) >= 10);
  const n = Math.round(dur / 0.8);
  for (let i = 0; i < n; i++) {
    const at = 0.2 + (i * (dur - 0.6)) / n + Math.random() * 0.5;
    const color = BURST_COLORS[i % BURST_COLORS.length]!;
    const heart = Math.abs(at - heartAt) < 0.45 && !ev.bursts.some((b) => b.heart);
    if (wins && wins.length > 0 && (heart || i % 3 !== 2 || below.length === 0)) {
      const w = pick(wins);
      ev.bursts.push({ at, x: w.x + 8 + Math.round(Math.random() * (w.w - 16)), y: w.y + 7 + Math.round(Math.random() * w.h * 0.3), r: heart ? 11 : 8 + Math.round(Math.random() * 5), color: heart ? "#ff5a7a" : color, heart, below: null, y0: w.y + w.h });
    } else if (below.length > 0) {
      const r = pick(below);
      ev.bursts.push({ at, x: r.x + Math.round(Math.random() * r.w), y: r.y + Math.round(Math.random() * r.h), r: 5 + Math.round(Math.random() * 3), color, heart: false, below: r, y0: 0 });
    }
  }
  return ev;
}

function clickGlass(P: Places, act: SceneryActions): string | null {
  const t = act.t;
  const sp = span();
  skyEvents = skyEvents.filter((e) => t < e.t0 + e.dur);
  const active = new Set(skyEvents.map((e) => e.kind));
  const night = act.night > 0.5;
  const options = (
    night
      ? [
          ["fireworks", 4],
          ["heli", 2],
          ["blimp", 1],
        ]
      : [
          ["heli", 3],
          ["washer", 3],
          ["blimp", 2],
        ]
  ).filter(([k]) => !active.has(k as SkyKind) && (sp !== null || k === "fireworks")) as [SkyKind, number][];
  if (options.length === 0) return null;
  const kind = weighted(options);
  const dir = Math.random() < 0.5 ? -1 : 1;
  const ev: SkyEvent = { kind, t0: t, dur: 10, dir, y: 0, x0: sp?.x0 ?? 0, x1: sp?.x1 ?? 0, win: null, bursts: [] };
  const who = act.near(act.at.x, act.at.y, 130)[0];
  switch (kind) {
    case "heli":
      ev.x0 -= 30;
      ev.x1 += 30;
      ev.dur = (ev.x1 - ev.x0) / 85;
      ev.y = sp!.y + Math.round(sp!.h * 0.28 + Math.random() * 6);
      if (who) act.say(who.id, pick(SKY.heli), 2.6, 1.2);
      skyEvents.push(ev);
      return "sky-chopper";
    case "blimp":
      ev.x0 -= 40;
      ev.x1 += 40;
      ev.dur = (ev.x1 - ev.x0) / 16;
      ev.y = sp!.y + 4 + Math.round(Math.random() * 4);
      if (who) act.say(who.id, pick(SKY.blimp), 3.2, 2.5);
      skyEvents.push(ev);
      return "sky-blimp";
    case "washer": {
      ev.win = wins!.reduce((b, w) => (Math.abs(w.x + w.w / 2 - act.at.x) < Math.abs(b.x + b.w / 2 - act.at.x) ? w : b));
      ev.dur = 13;
      if (who) act.say(who.id, pick(SKY.washer), 2.6, 4.4);
      skyEvents.push(ev);
      return "sky-winch";
    }
    default: {
      skyEvents.push(fireworks(P, t, 18, 7));
      // Folks come out on the terrace to watch.
      const way = P.way;
      if (way && (watch === null || watch.g.done) && Math.random() < 0.85) {
        const L = act.L;
        const ev2 = L.eventArea;
        const spots: GatherSpot[] = [0, 1, 2].map((i) => {
          const x = ev2.x + 12 + i * 17;
          return { x, y: way.lane, facing: "front", pose: "stand", activity: SKY.activity.fireworks, path: [{ ...way.p0 }, { x: way.ax, y: way.lane }, { x, y: way.lane }] };
        });
        const g = act.gather(spots, 12, cues(SKY.fireworks), 1);
        watch = g ? { g, finale: false } : null;
      }
      if (who) act.say(who.id, pick(SKY.ooh), 2.4, 0.8);
      return "sky-fireworks";
    }
  }
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void, flip = false, after?: (g: Grid) => void): HTMLCanvasElement {
  return cached(`skyline|click|${key}|${flip}`, () => {
    let g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE);
    after?.(g);
    if (flip) g = g.flipped();
    return g.toCanvas();
  });
}

/** A helicopter close by the glass, nose to the right (or flipped). */
const chopper = (blade: number, flip: boolean) =>
  spr(
    `chopper-${blade}`,
    36,
    14,
    (g) => {
      const body = "#24364f";
      g.rect(15, 3, 9, 2, body);
      g.ellipse(22, 7, 8, 4, body);
      g.ellipse(26, 6, 4, 2.6, "#a9d4ef").rect(26, 4, 2, 1, "#e4f3fb");
      g.rect(20, 5, 1, 5, "#1b2a3e");
      g.rect(14, 9, 14, 1, "#d8453a");
      g.rect(3, 6, 12, 2, body).rect(3, 6, 12, 1, "#33496a");
      g.rect(1, 2, 3, 6, body).rect(2, 2, 1, 5, "#33496a");
      g.set(19, 1, "#2b2f38").set(19, 2, "#2b2f38");
      g.rect(13, 12, 17, 1, "#1c1e23").set(16, 11, "#1c1e23").set(26, 11, "#1c1e23");
    },
    flip,
    (g) => {
      // The rotor after the outline, a blur that comes and goes.
      if (blade) g.rect(1, 0, 35, 1, "#3a3f48");
      else g.rect(8, 0, 22, 1, "#6a707b");
      g.rect(0, blade ? 1 : 4, 1, 3, "#5a606b");
    },
  );

/** A silver blimp, nose to the right; the light board on its side is drawn live. */
const blimpSprite = (flip: boolean) =>
  spr(
    "blimp",
    46,
    17,
    (g) => {
      g.ellipse(23, 7, 21, 6.5, "#c9cfd6");
      g.ellipse(22, 4, 15, 2, "#e4e8ec");
      g.rect(6, 11, 34, 1, "#a7aeb7");
      g.rect(1, 1, 4, 4, "#8e96a0").rect(1, 9, 4, 4, "#8e96a0").rect(0, 6, 4, 2, "#8e96a0");
      g.set(44, 7, "#b6bdc6");
      g.rect(14, 4, 18, 6, "#2a2f3a");
      g.rect(20, 14, 8, 2, "#5a616c").set(22, 14, "#cfe4f2").set(24, 14, "#cfe4f2").set(26, 14, "#cfe4f2");
    },
    flip,
  );

/** What scrolls across the blimp's light board: a heart and a hello. */
const BOARD = [".#.#..#.#.#.....", "#####.#.#.#.....", ".###..###.#.....", "..#...#.#.#....."];

const duckSprite = (flip: boolean) =>
  spr(
    "duck",
    7,
    6,
    (g) => {
      g.rect(0, 3, 6, 2, "#f6d23a").rect(1, 2, 4, 1, "#f6d23a").set(0, 2, "#f6d23a");
      g.rect(3, 0, 3, 3, "#f6d23a").set(4, 1, "#1c1e23").rect(6, 1, 1, 1, "#f08a2a");
      g.set(1, 3, "#ffe680").set(2, 5, "#e0b42a");
    },
    flip,
  );

/** A paper plane from above, nose to the right; tilt rocks its wings. */
const planeSprite = (flip: boolean, tilt: number) =>
  spr(
    `plane-${tilt}`,
    10,
    5,
    (g) => {
      g.rect(0, tilt ? 1 : 0, 2, 1, "#ffffff").rect(1, 1, 4, 1, "#ffffff").rect(2, 2, 8, 1, "#ffffff").rect(1, 3, 4, 1, "#e6e9ee").rect(0, tilt ? 3 : 4, 2, 1, "#e6e9ee");
      g.rect(2, 2, 5, 1, "#c9ced6");
    },
    flip,
  );

// ------------------------------------------------------------------ the lens view

const LENS = 37;
const LR = 17.5;

const skin = "#e0ac82";

/** A tiny person standing, feet at y (2 px wide). */
function person(g: Grid, x: number, y: number, shirt: string, hair = "#3a2a20", s = skin): void {
  g.rect(x, y - 7, 2, 2, s).rect(x, y - 8, 2, 1, hair);
  g.rect(x, y - 5, 2, 3, shirt);
  g.rect(x, y - 2, 2, 2, "#2a2c34");
}

/** Seen from above: a head and shoulders. */
function topPerson(g: Grid, x: number, y: number, shirt: string, hair: string): void {
  g.rect(x - 1, y + 1, 3, 1, shirt);
  g.set(x, y, hair);
}

const heart = (g: Grid, x: number, y: number, c: string) => {
  g.set(x, y, c).set(x + 2, y, c).rect(x - 1, y + 1, 5, 1, c).rect(x, y + 2, 3, 1, c).set(x + 1, y + 3, c);
};

/** Pixel maps: K hood, S slate, s light slate, W cream, b barring, Y yellow, E eye, k beak tip. */
const FALCON_INK: Record<string, string> = { K: "#262c38", S: "#4f5b70", s: "#7a88a0", W: "#f1e8d4", b: "#8f8270", Y: "#f0c040", E: "#111318", k: "#1c1e23" };
/** Perched on the ledge, looking left (its tail hangs over the edge). */
const FALCON = [
  "....KKKK....",
  "...KKKKKKK..",
  "..KYEKKKKKS.",
  ".kYKWKKKSSS.",
  "..WKWWKSSSS.",
  "..WWWWSSsSS.",
  "..WbWWSsSSS.",
  "..WWbWSSsSS.",
  "..bWWbSSSsS.",
  "..WbWWSSSSs.",
  "...WbWSSSSS.",
  "...WWbSSSSS.",
  "....WWSSSSS.",
  "....YY.SSSS.",
  "...YY..SSS..",
  ".......SSS..",
  "........SS..",
];
/** Wings out, off the ledge. */
const FALCON_UP = [
  "........KKKK........",
  ".SS....KKKKKK....SS.",
  "SSSs..KYEKKKK...sSSS",
  ".SSSSskYKWKKSsSSSSS.",
  "..sSSSSWKWWKSSSSs...",
  "...ssSSWWbWWSSss....",
  ".....SSWbWWbSS......",
  ".......WWbWW........",
  "........SSSS........",
  ".........SS.........",
];

function stamp(g: Grid, map: readonly string[], x: number, y: number, flip = false): void {
  for (const [dy, row] of map.entries()) {
    for (let dx = 0; dx < row.length; dx++) {
      const c = FALCON_INK[row[dx]!];
      if (c) g.set(flip ? x + row.length - 1 - dx : x + dx, y + dy, c);
    }
  }
}

function scene(g: Grid, kind: Sight, frame: number, night: boolean): void {
  switch (kind) {
    case "falcon": {
      // A stone ledge on the tower next door, and its resident peregrine.
      g.rect(0, 0, LENS, LENS, "#d9ccb2");
      for (const [i, y] of [5, 11, 17].entries()) {
        g.rect(0, y, LENS, 1, "#c8b99c");
        for (let x = i % 2 ? 3 : 9; x < LENS; x += 12) g.rect(x, y - 5, 1, 5, "#c8b99c");
      }
      g.rect(22, 1, 12, 15, "#2c323d").rect(23, 2, 10, 13, "#7fa6c4").rect(23, 2, 10, 4, "#a9c8de");
      g.line(24, 13, 31, 5, "#c4dbeb");
      g.rect(0, 24, LENS, 2, "#efe5d1").rect(0, 26, LENS, 3, "#c2b293").rect(0, 29, LENS, 1, "#8c7f66").rect(0, 30, LENS, 7, "#d1c3a6");
      if (frame === 2) stamp(g, FALCON_UP, 8, 9);
      else stamp(g, FALCON, 12, 9, frame === 1);
      break;
    }
    case "parade": {
      // Straight down onto the avenue: rooftops, the crowd, a band and a giant balloon.
      const roofs = ["#a49786", "#8f949c", "#b7a68e"];
      g.rect(0, 0, LENS, LENS, "#9a958c");
      for (let i = 0, x = -2; x < LENS; i++, x += 9) {
        g.rect(x, 0, 8, 9, roofs[i % 3]!).rect(x + 2, 3, 2, 2, "#d7dbe0");
        g.rect(x + 1, 28, 8, 9, roofs[(i + 1) % 3]!).rect(x + 5, 31, 2, 1, "#6f9a5c");
      }
      g.rect(0, 10, LENS, 2, "#d9d4ca").rect(0, 12, LENS, 13, "#5d626b").rect(0, 25, LENS, 2, "#d9d4ca");
      const crowd = ["#c2694a", "#2e3a55", "#e9c46a", "#4f7d47", "#d59ad6", "#f4f1ea"];
      for (let x = 0; x < LENS; x += 2) {
        g.set(x, 10 + (x % 4 === 0 ? 1 : 0), crowd[ih(x, 1) % crowd.length]!);
        g.set(x + 1, 25 + (x % 4 === 2 ? 1 : 0), crowd[ih(x, 2) % crowd.length]!);
      }
      const off = frame * 2;
      for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) topPerson(g, 1 + c * 3 + off, 14 + r * 3, "#2f4f9a", "#f2c230");
      g.ellipse(24 + off, 21, 5, 3, "#4b4f57");
      g.ellipse(22 + off, 17, 5, 4, "#e2483f").ellipse(28 + off, 18, 2.5, 2.5, "#e2483f").rect(20 + off, 15, 2, 1, "#ff9a8a");
      for (const dx of [-4, 0, 4]) topPerson(g, 22 + dx + off, 22, "#f4f1ea", "#3a2a20");
      for (let i = 0; i < 16; i++) {
        const h = ih(i, frame + 7);
        g.set(h % LENS, (h >>> 8) % 27 + 5, BURST_COLORS[(h >>> 16) % BURST_COLORS.length]!);
      }
      break;
    }
    case "party": {
      // A roof deck across the street: string lights, dancing, a DJ.
      g.rect(0, 0, LENS, LENS, night ? "#1e2230" : "#c7ccd3");
      g.rect(0, 6, LENS, 2, night ? "#454a58" : "#9aa1aa");
      g.rect(0, 8, LENS, 29, night ? "#3a3530" : "#a8865a");
      for (let y = 10; y < LENS; y += 3) g.rect(0, y, LENS, 1, night ? "#332e2a" : "#97774f");
      const bulbs = ["#ff5a6a", "#ffd84a", "#7cc8ff", "#9dff8a"];
      for (let x = 1, i = 0; x < LENS; x += 3, i++) {
        const y = 10 + Math.round(Math.sin((x / LENS) * Math.PI) * 3);
        g.set(x, y, night ? bulbs[(i + frame) % 4]! : "#f4ead0");
        g.set(x + 1, y, "#2a2c31");
      }
      g.rect(14, 28, 9, 3, "#2a2a30").set(18, 27, "#9fe0ff").set(17, 27, "#cfefff");
      const dancers: [number, number, string, string][] = [
        [6, 24, "#c2694a", "#3a2a20"],
        [11, 22, "#7cc8ff", "#e9c46a"],
        [23, 23, "#d59ad6", "#3a2a20"],
        [28, 25, "#9dff8a", "#6a4a2e"],
        [18, 26, "#f4f1ea", "#1c1e23"],
      ];
      dancers.forEach(([x, y, shirt, hair], i) => person(g, x, y - ((i + frame) % 2), shirt, hair));
      break;
    }
    case "proposal": {
      // A roof garden; one of them on one knee, then a heart.
      g.rect(0, 0, LENS, LENS, night ? "#3a3026" : "#9a7a58");
      for (let y = 2; y < LENS; y += 4) g.rect(0, y, LENS, 1, night ? "#322920" : "#8c6e4e");
      for (let x = 0; x < LENS; x += 6) g.rect(x, 3, 5, 3, night ? "#24402c" : "#4f7d47").set(x + 2, 2, night ? "#2f5a3a" : "#71a05e");
      if (night) for (let x = 2; x < LENS; x += 5) g.set(x, 8 + (x % 2), "#ffe3a8");
      g.rect(26, 22, 6, 2, "#f4f1ea").set(27, 21, "#ffd25a").set(30, 21, "#ffd25a");
      if (frame < 2) {
        person(g, 20, 29, "#c2694a", "#6a4a2e");
        // Kneeling, holding up a ring.
        g.rect(13, 23, 2, 2, skin).rect(13, 22, 2, 1, "#1c1e23").rect(13, 25, 2, 2, "#2e3a55").rect(14, 27, 3, 1, "#2a2c34").set(13, 28, "#2a2c34");
        g.set(16, 24, skin).set(17, 23, frame ? "#ffffff" : "#f2d43a");
      } else {
        person(g, 18, 29, "#c2694a", "#6a4a2e");
        person(g, 15, 29, "#2e3a55", "#1c1e23");
        heart(g, 16, 12 - (frame - 2), "#ff4a6a");
      }
      break;
    }
    case "waver": {
      // The tower across the way: one window, someone at their desk, waving.
      g.rect(0, 0, LENS, LENS, night ? "#1c2232" : "#7b93a8");
      for (let y = 0; y < LENS; y += 9) for (let x = 0; x < LENS; x += 9) {
        const lit = night && ih(x, y) % 3 === 0;
        g.rect(x + 1, y + 1, 8, 8, night ? (lit ? "#e8c27a" : "#283048") : "#9db6cb").rect(x + 1, y + 1, 8, 2, night ? (lit ? "#f4d89a" : "#2e3754") : "#b8cddd");
      }
      g.rect(9, 9, 19, 19, "#3d4656");
      g.rect(10, 10, 17, 17, night ? "#f4e2b8" : "#e9e4da");
      g.rect(10, 23, 17, 2, "#8a6a4a").rect(19, 18, 6, 5, "#2a2f3a").rect(20, 19, 4, 3, "#9fd0ff");
      g.rect(13, 16, 3, 3, skin).rect(13, 15, 3, 1, "#3a2a20").rect(12, 19, 5, 4, "#3a7a5a");
      if (frame % 2) g.rect(17, 13, 1, 6, "#3a7a5a").rect(17, 12, 2, 2, skin);
      else g.rect(17, 14, 1, 5, "#3a7a5a").rect(18, 12, 2, 2, skin);
      break;
    }
    default: {
      // The moon, close enough to touch.
      g.rect(0, 0, LENS, LENS, "#0f1528");
      for (const [x, y] of [
        [4, 6],
        [31, 9],
        [7, 30],
        [29, 31],
      ])
        g.set(x!, y!, "#c8ccff");
      g.ellipse(18, 18, 12, 12, "#efe7cc");
      g.ellipse(22, 20, 8, 9, "#e2d8b8");
      g.ellipse(14, 14, 2.5, 2, "#d3c8a6").ellipse(22, 23, 3, 2.4, "#d3c8a6").ellipse(12, 22, 1.5, 1.5, "#d3c8a6").ellipse(23, 12, 1.2, 1.2, "#d3c8a6");
      if (frame > 0) {
        const x = 2 + frame * 9;
        g.set(x, 19, "#1c1e23").set(x + 1, 20, "#1c1e23").set(x + 2, 19, "#1c1e23").set(x - 1, 18, "#1c1e23").set(x + 3, 18, "#1c1e23");
      }
    }
  }
}

/** The round view through the telescope: the scene, a black rim and a brass ring. */
function lens(kind: Sight, frame: number, night: boolean): HTMLCanvasElement {
  return cached(`skyline|lens|${kind}|${frame}|${night}`, () => {
    const g = new Grid(LENS, LENS);
    scene(g, kind, frame, night);
    const c = (LENS - 1) / 2;
    for (let y = 0; y < LENS; y++) {
      for (let x = 0; x < LENS; x++) {
        const d = Math.hypot(x - c, y - c);
        if (d > LR + 0.5) g.set(x, y, null);
        else if (d > LR - 0.7) g.set(x, y, OUTLINE);
        else if (d > LR - 1.7) g.set(x, y, "#c8a04c");
        else if (d > LR - 2.6) g.set(x, y, "#1c1e23");
      }
    }
    // A glint on the glass.
    for (const [x, y] of [
      [8, 9],
      [9, 8],
      [10, 7],
      [11, 6],
    ])
      g.set(x!, y!, "#ffffff");
    return g.toCanvas();
  });
}

function lensFrame(kind: Sight, k: number): number {
  switch (kind) {
    case "falcon":
      return k > 5.2 ? 2 : Math.floor(k / 1.3) % 2;
    case "proposal":
      return k < 3.4 ? Math.floor(k * 3) % 2 : k < 4.2 ? 2 : 3;
    case "moon":
      return k < 2 ? 0 : Math.min(3, 1 + Math.floor((k - 2) / 0.8)) % 4;
    default:
      return Math.floor(k * 2.5) % 3;
  }
}

// ------------------------------------------------------------------ drawing

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n)), Math.round(y0 + ((y1 - y0) * i) / Math.max(1, n)), 1, 1);
}

/** Whether the jets are on: for a while after a click, and while people came over to soak. */
function jetsOn(t: number): boolean {
  return t < tub.jets || (tub.g !== null && tub.g.arrivedAt !== null && !tub.g.done);
}

function marshmallow(ctx: Ctx, i: number, x: number, y: number, k: number, t: number): void {
  // Spot 1's goes up in flames at 6.6 s and is blown out at 8 s.
  const burning = i === 1 && k >= 6.6 && k < 8;
  const charred = i === 1 && k >= 8;
  ctx.fillStyle = charred ? "#2a2220" : k > 10 ? "#c8904a" : k > 5 ? "#e8c070" : "#f4f0e4";
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.fillStyle = charred ? "#4a3a30" : "#fff8e8";
  ctx.fillRect(x - 1, y - 1, 1, 1);
  if (burning) {
    const fh = 3 + (Math.floor(t * 12) % 2);
    ctx.fillStyle = "#ff8a2a";
    ctx.fillRect(x - 1, y - 1 - fh, 3, fh);
    ctx.fillStyle = "#ffd25a";
    ctx.fillRect(x, y - fh, 1, fh - 1);
  }
}

const RAINBOW = ["#e84a4a", "#f2a23a", "#f2d43a", "#5ac85a", "#4a8ae8"];

/** Where the slinky stops on its way down: the landing, each tread, the floor (stair sprite coordinates). */
function slinkyStops(dir: number): Point[] {
  return cached(`skyline|slinky|${dir}`, () => {
    const out: Point[] = [{ x: 16, y: 4 }];
    for (let i = 10; i >= 0; i--) {
      const a = i * 0.72;
      out.push({ x: Math.round(16 + Math.cos(a) * 7), y: Math.round(44 - i * 3.6 + Math.sin(a) * 2 - 1) });
    }
    out.push({ x: 16 + dir * 9, y: 49 }, { x: 16 + dir * 18, y: 50 });
    return out;
  });
}

/** Once a frame: the fireworks watchers' finale, and clearing out what's over. */
function tick(L: Layout, t: number): void {
  if (watch && !watch.finale && watch.g.arrivedAt !== null) {
    // Everyone's out on the terrace: a finale, with the heart just before someone spots it.
    watch.finale = true;
    skyEvents.push(fireworks(places(L), watch.g.arrivedAt, 11, 7.4));
  }
  if (skyEvents.length > 0 && t > skyEvents[0]!.t0 + skyEvents[0]!.dur) skyEvents = skyEvents.filter((e) => t < e.t0 + e.dur);
}

/** Things on the floor, in the tub and at the fire, sorted with people (decor). */
export function clickItems(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const t = info.t;
  tick(L, t);
  const P = places(L);
  const out: Drawable[] = [];
  const r = P.tub;
  if (r) {
    const waterY = r.y + 13;
    const wx = r.x + 4;
    const ww = r.w - 8;
    const wb = r.y + r.h - 6;
    if (jetsOn(t)) {
      out.push({
        z: r.y + 22.7,
        draw: () => {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          for (let i = 0; i < 22; i++) {
            const h = ih(i, Math.floor(t * 6 + i * 0.37));
            ctx.fillRect(wx + (h % ww), waterY + 1 + ((h >>> 8) % Math.max(1, wb - waterY - 1)), (h >>> 16) % 3 === 0 ? 2 : 1, 1);
          }
          const f = Math.floor(t * 8);
          ctx.fillStyle = "rgba(240,252,255,0.9)";
          for (let x = wx; x < wx + ww; x += 2) {
            const h = ih(x, f);
            if (h & 3) ctx.fillRect(x, waterY - ((h >>> 4) & 1), 2, 1);
          }
          // Extra steam off the churning water.
          for (let i = 0; i < 5; i++) {
            const k = (t * 0.4 + i / 5) % 1;
            ctx.fillStyle = `rgba(255,255,255,${(0.35 * (1 - k)).toFixed(2)})`;
            ctx.fillRect(wx + 3 + ((i * 9) % (ww - 6)) + Math.round(Math.sin(t * 1.3 + i) * 2), Math.round(waterY - 3 - k * 16), 3, 2);
          }
        },
      });
    }
    const d = duck;
    if (d) {
      const start = d.t0 ?? (d.g && d.g.arrivedAt !== null ? d.g.arrivedAt + 1.8 : null);
      const end = d.g ? (d.g.done ? -Infinity : Infinity) : d.until;
      if (d.g?.done || t > end) duck = null;
      else if (start !== null && t >= start) {
        const ph = (t - start) * 0.45;
        const x = Math.round(wx + ww / 2 + Math.cos(ph) * (ww / 2 - 5));
        const y = Math.round(waterY + 4 + Math.sin(ph) * 2 + Math.sin(t * 3) * 0.6);
        const pop = Math.min(1, (t - start) / 0.4);
        out.push({
          z: r.y + 22.8,
          draw: () => {
            ctx.globalAlpha = pop;
            ctx.drawImage(duckSprite(Math.sin(ph) > 0), x - 3, y - 4 + Math.round((1 - pop) * 3));
            ctx.globalAlpha = 1;
          },
        });
      }
    }
  }
  const f = P.fire;
  if (f) {
    const boost = fireBoost(t);
    if (boost > 0.15) {
      out.push({
        z: f.y + 14.5,
        draw: () => {
          for (let i = 0; i < 12; i++) {
            const run = t * 1.4 + i * 0.137;
            const k = run % 1;
            const h = ih(i, Math.floor(run));
            ctx.fillStyle = k < 0.5 ? "#ffd25a" : "#ff8a2a";
            ctx.globalAlpha = boost * (1 - k);
            ctx.fillRect(f.x + 6 + (h % Math.max(1, f.w - 12)) + Math.round(Math.sin(t * 3 + i) * 2), Math.round(f.y - 4 - k * 26), 1, 1);
          }
          ctx.globalAlpha = 1;
        },
      });
    }
    const show = fireShow;
    if (show && show.kind === "smores" && !show.g.done && show.g.arrivedAt !== null) {
      const k = t - show.g.arrivedAt;
      const reach = Math.min(1, (k - 0.3) / 0.5, (15 - 0.4 - k) / 0.5);
      for (let i = 0; i < show.g.size && reach > 0; i++) {
        if (!show.g.present[i]) continue;
        const sp = show.spots[i]!;
        if (sp.facing === "left") {
          const hx = sp.x - 5;
          const hy = sp.y - 12;
          const tx = Math.round(hx + (f.x + f.w - 7 - hx) * reach);
          out.push({
            z: sp.y + 0.5,
            draw: () => {
              ctx.fillStyle = "#6a4a2e";
              line(ctx, hx, hy, tx, hy - 1);
              marshmallow(ctx, i, tx, hy - 2, k, t);
            },
          });
        } else {
          // Seen from behind: the stick comes up past a shoulder and over the flames.
          const side = i === 0 ? 1 : -1;
          const hx = sp.x + side * 4;
          const hy = sp.y - 15;
          const tx = sp.x + side * 9;
          const ty = Math.round(hy + (f.y - 3 - hy) * reach);
          out.push({
            z: sp.y + 0.5,
            draw: () => {
              ctx.fillStyle = "#6a4a2e";
              line(ctx, hx, hy, tx, ty);
              marshmallow(ctx, i, tx, ty, k, t);
            },
          });
        }
      }
    }
  }
  const st = P.stair;
  const s = stairShow;
  if (st && s) {
    const k = t - s.t0;
    if (s.kind === "slinky") {
      const stops = slinkyStops(s.dir);
      const hops = stops.length - 1;
      const restFor = 6;
      if (k > hops * SLINKY_HOP + restFor) stairShow = null;
      else {
        const hIdx = Math.min(hops - 1, Math.floor(k / SLINKY_HOP));
        const p = k >= hops * SLINKY_HOP ? 1 : (k - hIdx * SLINKY_HOP) / SLINKY_HOP;
        const a = stops[hIdx]!;
        const b = stops[hIdx + 1]!;
        const head = Math.min(1, p * 1.6);
        const tail = Math.max(0, p * 1.6 - 0.6);
        const hx = st.x + a.x + (b.x - a.x) * head;
        const hy = st.y + a.y + (b.y - a.y) * head;
        const tx = st.x + a.x + (b.x - a.x) * tail;
        const ty = st.y + a.y + (b.y - a.y) * tail;
        const arch = Math.sin(p * Math.PI) * 4;
        const fade = Math.min(1, (hops * SLINKY_HOP + restFor - k) / 0.8);
        out.push({
          z: st.y + 49.5 + (hIdx >= hops - 2 ? 2 : 0),
          draw: () => {
            ctx.globalAlpha = fade;
            for (let j = 0; j < 5; j++) {
              ctx.fillStyle = RAINBOW[j]!;
              if (p >= 1) {
                // Come to rest: a little stack of coils.
                ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1 - j, 3, 1);
                continue;
              }
              // Walking: the front end hops ahead, the back end follows, the coils arch between.
              const u = j / 4;
              ctx.fillRect(Math.round(tx + (hx - tx) * u) - 1, Math.round(ty + (hy - ty) * u - Math.sin(u * Math.PI) * arch) - 2, 3, 2);
            }
            ctx.globalAlpha = 1;
          },
        });
      }
    } else {
      const flight = 3;
      if (k > flight + 6) stairShow = null;
      else {
        const u = Math.min(1, k / flight);
        const e = 1 - (1 - u) * (1 - u);
        const gx = st.x + 16 + (s.to.x - st.x - 16) * e;
        const gy = st.y + 49 + (s.to.y - st.y - 49) * e;
        const alt = u >= 1 ? 0 : 45 * Math.pow(1 - u, 1.3) + Math.sin(k * 4) * 2 * (1 - u);
        const fade = Math.min(1, (flight + 6 - k) / 1);
        out.push({
          z: gy,
          draw: () => {
            ctx.globalAlpha = fade;
            if (alt > 1) {
              ctx.fillStyle = "rgba(0,0,0,0.18)";
              ctx.fillRect(Math.round(gx) - 2, Math.round(gy), 5, 1);
            }
            ctx.drawImage(planeSprite(s.dir < 0, alt > 1 && Math.floor(k * 3) % 2 === 0 ? 1 : 0), Math.round(gx) - 6, Math.round(gy - alt) - 4);
            ctx.globalAlpha = 1;
          },
        });
      }
    }
  }
  return out;
}

/** The lens view over everyone (it pops up by the telescope). */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || !look) return;
  const l = look;
  const start = lensStart(l);
  if (start === Infinity) {
    if (l.g?.done) look = null;
    return;
  }
  const k = info.t - start;
  if (k < 0) return;
  if (k > LENS_FOR) {
    look = null;
    return;
  }
  const { x: cx, y: cy } = l.c;
  ctx.globalAlpha = Math.min(1, k / 0.25, (LENS_FOR - k) / 0.35);
  // A trail of little brass dots from the telescope to the view.
  const d = Math.max(1, Math.hypot(l.from.x - cx, l.from.y - cy));
  const gap = Math.max(0, d - LR - 1);
  for (const [u, s] of [
    [0.1, 2],
    [0.55, 3],
  ] as const) {
    const x = Math.round(l.from.x + ((cx - l.from.x) / d) * gap * u) - (s >> 1);
    const y = Math.round(l.from.y + ((cy - l.from.y) / d) * gap * u) - (s >> 1);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, s + 2, s + 2);
    ctx.fillStyle = "#c8a04c";
    ctx.fillRect(x, y, s, s);
  }
  ctx.drawImage(lens(l.kind, lensFrame(l.kind, k), info.night > 0.5), cx - (LENS - 1) / 2, cy - (LENS - 1) / 2);
  ctx.globalAlpha = 1;
}

/** A soft glow of a burst's colour lighting up the sky around it. */
function burstGlow(color: string): HTMLCanvasElement {
  return cached(`skyline|burst-glow|${color}`, () =>
    makeCanvas(35, 35, (c) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
      const grad = c.createRadialGradient(17.5, 17.5, 0, 17.5, 17.5, 17.5);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, 35, 35);
    }),
  );
}

/** Unit offsets of a burst's sparks: a ring, or a heart. */
function sparks(heart: boolean): Point[] {
  return cached(`skyline|sparks|${heart}`, () => {
    const n = heart ? 20 : 16;
    const out: Point[] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      if (heart) {
        const s = Math.sin(a);
        out.push({ x: s * s * s, y: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 });
      } else out.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return out;
  });
}

function drawBurst(ctx: Ctx, b: Burst, k: number): void {
  // k: 0 … 1 through the bloom.
  const rad = b.r * (1 - (1 - k) * (1 - k) * (1 - k));
  const fall = k * k * (b.below ? 0 : 5);
  if (k < 0.5) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, (0.5 - k) * 2.4);
    ctx.drawImage(burstGlow(b.color), b.x - 17, b.y - 17);
    ctx.globalCompositeOperation = "source-over";
  }
  const fade = k < 0.6 ? 1 : (1 - k) / 0.4;
  const big = k < 0.45 ? 2 : 1;
  for (const [j, p] of sparks(b.heart).entries()) {
    const x = Math.round(b.x + p.x * rad);
    const y = Math.round(b.y + p.y * rad + fall);
    // A short trail behind each spark, then the spark (twinkling white as it dies).
    ctx.globalAlpha = fade * 0.5;
    ctx.fillStyle = b.color;
    ctx.fillRect(Math.round(b.x + p.x * rad * 0.72), Math.round(b.y + p.y * rad * 0.72 + fall * 0.7), 1, 1);
    ctx.globalAlpha = fade;
    ctx.fillStyle = k > 0.6 && (j + Math.floor(k * 20)) % 3 === 0 ? "#ffffff" : b.color;
    ctx.fillRect(x, y, big, big);
  }
  if (k < 0.12) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
  }
  ctx.globalAlpha = 1;
}

const RISE = 0.7;
const BLOOM = 1.4;

/** The sky through the north glass: a helicopter, a blimp, the window washers, fireworks. */
export function clickOutside(ctx: Ctx, win: Rect, info: OutsideInfo): void {
  if (skyEvents.length === 0 || info.windows !== wins) return;
  const t = info.t;
  const night = info.night > 0.5;
  for (const e of skyEvents) {
    const k = t - e.t0;
    if (k < 0 || k > e.dur) continue;
    switch (e.kind) {
      case "heli": {
        const x = Math.round(e.dir > 0 ? e.x0 + (k / e.dur) * (e.x1 - e.x0) : e.x1 - (k / e.dur) * (e.x1 - e.x0));
        if (x < win.x - 30 || x > win.x + win.w + 30) break;
        const y = Math.round(e.y + Math.sin(t * 1.6) * 1.5);
        const d = e.dir;
        if (night) {
          // A searchlight angled down at the streets ahead.
          ctx.fillStyle = "#ebf2ff";
          for (let i = 0; i < 30; i++) {
            const half = 1 + Math.floor(i * 0.35);
            ctx.globalAlpha = 0.24 * (1 - i / 30);
            ctx.fillRect(Math.round(x + d * (5 + i * 0.5)) - half, y + 5 + i, half * 2 + 1, 1);
          }
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(chopper(Math.floor(t * 18) % 2, d < 0), x - 18, y - 7);
        if (night) {
          // The cabin lit, a white strobe up top, green and red on the sides.
          ctx.fillStyle = "#ffe9b0";
          ctx.fillRect(x + d * 8 - (d < 0 ? 2 : 0), y - 2, 3, 2);
          ctx.fillStyle = "#7dff9a";
          ctx.fillRect(x + d * 12, y + 1, 1, 1);
          if ((t * 1.5) % 1 < 0.12) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x, y - 6, 2, 1);
          }
        }
        if (Math.floor(t * 2) % 2 === 0) {
          ctx.fillStyle = "#ff4a4a";
          ctx.fillRect(d > 0 ? x - 17 : x + 16, y - 5, 1, 1);
        }
        break;
      }
      case "blimp": {
        const x = Math.round(e.dir > 0 ? e.x0 + (k / e.dur) * (e.x1 - e.x0) : e.x1 - (k / e.dur) * (e.x1 - e.x0));
        if (x < win.x - 40 || x > win.x + win.w + 40) break;
        const y = Math.round(e.y + Math.sin(t * 0.5) * 1);
        const bx = x - 23;
        ctx.drawImage(blimpSprite(e.dir < 0), bx, y - 7);
        if (night) {
          ctx.fillStyle = "rgba(20,24,40,0.35)";
          ctx.fillRect(bx + 3, y - 6, 40, 13);
        }
        // The light board: a heart and a hello scrolling by.
        const off = Math.floor(t * 4);
        const px = bx + 15;
        for (let row = 0; row < 4; row++) {
          const line = BOARD[row]!;
          for (let c = 0; c < 16; c++) {
            if (line[(c + off) % line.length] !== "#") continue;
            ctx.fillStyle = (c + off) % line.length < 5 ? "#ff5a7a" : "#ffd84a";
            ctx.fillRect(px + c, y - 2 + row, 1, 1);
          }
        }
        break;
      }
      case "washer": {
        const w = e.win;
        if (w !== win) break;
        const pw = Math.min(30, win.w - 6);
        const px = win.x + Math.round((win.w - pw) / 2);
        const top = win.y + Math.round(win.h * 0.62);
        const bottom = win.y + win.h + 10;
        const u = k < 2.5 ? k / 2.5 : k < 10.5 ? 1 : Math.max(0, 1 - (k - 10.5) / 2.5);
        const py = Math.round(bottom + (top - bottom) * (1 - (1 - u) * (1 - u)));
        // The streak they've cleaned, and the cables.
        if (k > 3) {
          ctx.fillStyle = `rgba(255,255,255,${(0.16 * Math.min(1, (k - 3) / 2)).toFixed(3)})`;
          ctx.fillRect(px + 2, py - 13, pw - 4, 6);
        }
        ctx.fillStyle = "#2b2f38";
        ctx.fillRect(px + 2, win.y, 1, py - win.y);
        ctx.fillRect(px + pw - 3, win.y, 1, py - win.y);
        const swing = k > 3 && k < 10 ? Math.round(Math.sin(t * 3) * 4) : 0;
        const ax = px + 6;
        // Worker one, squeegeeing.
        ctx.fillStyle = "#f2c230";
        ctx.fillRect(ax - 1, py - 9, 4, 2);
        ctx.fillStyle = skin;
        ctx.fillRect(ax - 1, py - 7, 3, 2);
        ctx.fillStyle = "#2f5d9a";
        ctx.fillRect(ax - 1, py - 5, 4, 5);
        ctx.fillStyle = "#3a3d44";
        line(ctx, ax + 3, py - 4, ax + 6 + swing, py - 10);
        ctx.fillRect(ax + 4 + swing, py - 11, 5, 1);
        // Worker two, waving.
        const bx = px + pw - 9;
        ctx.fillStyle = "#e8742a";
        ctx.fillRect(bx - 1, py - 9, 4, 2);
        ctx.fillStyle = skin;
        ctx.fillRect(bx - 1, py - 7, 3, 2);
        ctx.fillStyle = "#2f5d9a";
        ctx.fillRect(bx - 1, py - 5, 4, 5);
        if (k > 4 && k < 9) {
          const up = Math.floor(t * 4) % 2;
          ctx.fillRect(bx + 3, py - 8 - up, 1, 4);
          ctx.fillStyle = skin;
          ctx.fillRect(bx + 3 + (up ? 0 : 1), py - 10 - up, 2, 2);
        }
        // The cradle.
        ctx.fillStyle = "#9aa1aa";
        ctx.fillRect(px, py - 1, pw, 1);
        ctx.fillStyle = "#6c737d";
        ctx.fillRect(px, py - 1, 1, 6);
        ctx.fillRect(px + pw - 1, py - 1, 1, 6);
        ctx.fillRect(px, py + 2, pw, 1);
        ctx.fillStyle = "#4b515c";
        ctx.fillRect(px, py + 3, pw, 2);
        break;
      }
      default: {
        for (const b of e.bursts) {
          if (b.below) continue;
          const kb = k - b.at;
          if (kb < 0 || kb > RISE + BLOOM || b.x < win.x - b.r - 2 || b.x > win.x + win.w + b.r + 2) continue;
          if (kb < RISE) {
            const y = Math.round(b.y0 + (b.y - b.y0) * (kb / RISE));
            ctx.fillStyle = "#ffe9b0";
            ctx.fillRect(b.x, y, 1, 2);
            ctx.fillStyle = "rgba(255,233,176,0.4)";
            ctx.fillRect(b.x, y + 2, 1, 3);
          } else drawBurst(ctx, b, (kb - RISE) / BLOOM);
        }
      }
    }
  }
}

/** Fireworks seen from above, in the glass at the floor's edges. */
export function clickUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || skyEvents.length === 0) return;
  const t = info.t;
  for (const e of skyEvents) {
    if (e.kind !== "fireworks") continue;
    const k = t - e.t0;
    if (k < 0 || k > e.dur) continue;
    for (const b of e.bursts) {
      const kb = k - b.at;
      if (!b.below || kb < 0 || kb > BLOOM) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.below.x, b.below.y, b.below.w, b.below.h);
      ctx.clip();
      drawBurst(ctx, b, kb / BLOOM);
      ctx.restore();
    }
  }
}

/** The light they throw: fireworks flashing on the floor, a searchlight, the pendants in their show. */
const NO_LIGHTS: Light[] = [];

export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL) return NO_LIGHTS;
  const t = info.t;
  const dim = t - dimmer.t0 <= DIM_SHOW && info.night > 0.3;
  if (!dim && skyEvents.length === 0) return NO_LIGHTS;
  const out: Light[] = [];
  const P = places(L);
  if (dim) {
    for (const g of P.globes) out.push([g.x, g.y + 24, 30, 0.45, "#ffe2b0", 0.06]);
  }
  for (const e of skyEvents) {
    const k = t - e.t0;
    if (k < 0 || k > e.dur) continue;
    if (e.kind === "fireworks") {
      for (const b of e.bursts) {
        const kb = k - b.at - (b.below ? 0 : RISE);
        if (kb < 0 || kb > 0.7) continue;
        const s = 1 - kb / 0.7;
        if (b.below) out.push([b.x, b.y, 40, 0.5 * s, b.color, 0.15 * s]);
        else {
          const w = wins?.find((q) => b.x >= q.x && b.x < q.x + q.w);
          const sg = w && L.segments.find((g) => w.x >= g.x0 && w.x < g.x1);
          if (sg) out.push([b.x, sg.depth + 12, 52, 0.55 * s, b.color, 0.18 * s]);
        }
      }
    } else if (e.kind === "heli" && info.night > 0.5) {
      const x = e.dir > 0 ? e.x0 + (k / e.dur) * (e.x1 - e.x0) : e.x1 - (k / e.dur) * (e.x1 - e.x0);
      const w = wins?.find((q) => x >= q.x - 4 && x < q.x + q.w + 4);
      const sg = w && L.segments.find((g) => w.x >= g.x0 && w.x < g.x1);
      if (sg) out.push([x, sg.depth + 18, 34, 0.5, "#e8f0ff", 0.1]);
    }
  }
  return out;
}
