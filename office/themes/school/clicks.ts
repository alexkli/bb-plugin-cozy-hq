// School: things to click. The bell rings for recess (or everyone lines up
// in the hall when there's no yard; after dark the PA has the last word);
// the field gets a kickball game, a ball over the fence, or stargazing and
// fireflies at night; the swings, the slide, the sandbox (a castle),
// hopscotch and four square, the apple trees, the yellow bus at the stop,
// and the lockers (one jams, one is stuffed).
//
// Clicks only start things; everything is drawn from the school's live
// layers (decor, overlay, lights) by the animation clock.
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Facing, Layout, Rect } from "../../layout.ts";
import { clamp, drawPixelText, pixelTextWidth } from "../../themekit.ts";
import { wallItems, type WallItem } from "./background.ts";
import { C, OUTLINE, sprite } from "./kit.ts";
import { yardThings } from "./live.ts";
import { planOf, type SchoolPlan } from "./plan.ts";
import { playParts, shadeTree } from "./yard.ts";
import { CLICKS } from "./words.ts";

type Ctx = CanvasRenderingContext2D;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

function cues(list: readonly (readonly [number, number, string, string?])[]): GatherCue[] {
  return list.map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 24 ? 4 : 2.6, sound }));
}

// ------------------------------------------------------------------ where things are

function bellOf(L: Layout): WallItem | undefined {
  return wallItems(L).find((it) => it.kind === "bell");
}

function lockersOf(L: Layout): WallItem[] {
  return wallItems(L).filter((it) => it.kind === "lockers");
}

function treesOf(L: Layout): { x: number; y: number }[] {
  return yardThings(L).filter((t) => t.sprite === shadeTree);
}

/** The aisle between the playground corner and the field (the way into the corner). */
function cornerAisle(P: SchoolPlan): number {
  return (P.field?.x ?? 0) - 8;
}

function busStopOf(L: Layout, P: SchoolPlan): Rect | null {
  return P.gate ? { x: P.gate.x - 30, y: L.H - 34, w: 14, h: 30 } : null;
}

/** The lunch line: along the cafeteria counter, past the coffee and the kettle; in the way the coffee drinkers come. */
function lunchLine(L: Layout): GatherSpot[] {
  const coffee = L.byId.get("coffee");
  if (!coffee || coffee.path.length < 4) return [];
  const lane = coffee.path[coffee.path.length - 2]!.y;
  const fridge = L.props.find((p) => p.kind === "fridge");
  const out: GatherSpot[] = [];
  for (let i = 0; i < 3; i++) {
    const x = coffee.x + 46 + i * 14;
    if (fridge && x > fridge.x - 8) break;
    out.push({ x, y: coffee.y, facing: "back", pose: "stand", activity: CLICKS.activity.lunch, path: [...coffee.path.slice(0, -2), { x, y: lane }, { x, y: coffee.y }] });
  }
  return out;
}

/** Story time on the floor in front of the reading couch, when there's room: a reader and three listeners. */
export function storyArea(L: Layout): Rect | null {
  const c = L.couch;
  const y0 = c.y + c.h + 6;
  const fish = L.byId.get("fishtank");
  if (!fish || fish.path.length < 4 || L.lounge.y + L.lounge.h < y0 + 36) return null;
  return { x: Math.round(c.x + c.w / 2) - 34, y: y0, w: 68, h: 36 };
}

function storySpots(L: Layout): GatherSpot[] {
  const a = storyArea(L);
  const fish = L.byId.get("fishtank");
  if (!a || !fish) return [];
  // In through the library corner's side door, the way the aquarium watchers come.
  const lane = fish.path[1]!.y;
  const via = (x: number, y: number) => [...fish.path.slice(0, 2), { x, y: lane }, { x, y }];
  const cx = a.x + 34;
  const at: [number, number, Facing, "read" | "sit-back"][] = [
    [cx, a.y + 10, "front", "read"],
    [cx - 24, a.y + 28, "back", "sit-back"],
    [cx + 24, a.y + 28, "back", "sit-back"],
    [cx, a.y + 32, "back", "sit-back"],
  ];
  return at.map(([x, y, facing, pose]) => ({ x, y, facing, pose, activity: CLICKS.activity.story, path: via(x, y) }));
}

export function clickables(L: Layout): SceneryClickable[] {
  const out: SceneryClickable[] = [];
  const h = CLICKS.hover;
  const bell = bellOf(L);
  if (bell) out.push({ id: "bell", rect: { x: bell.x - 2, y: bell.y - 2, w: 13, h: 13 }, hover: h.bell });
  lockersOf(L).forEach((it, i) => out.push({ id: `locker-${i}`, rect: { x: it.x, y: it.y, w: it.w, h: it.h }, hover: h.lockers }));
  const island = L.props.find((p) => p.kind === "kitchen-island");
  if (island && lunchLine(L).length > 0) out.push({ id: "lunch", rect: { x: island.x, y: island.y, w: (island.w ?? 72) + 2, h: 24 }, hover: h.lunch });
  const story = storyArea(L);
  if (story) out.push({ id: "story", rect: story, hover: h.story });
  const P = planOf(L);
  if (!P?.yard) return out;
  if (P.swings) out.push({ id: "swings", rect: { x: P.swings.x - 2, y: P.swings.y - 2, w: 34, h: 42 }, hover: h.swings });
  if (P.slide) out.push({ id: "slide", rect: { x: P.slide.x - 1, y: P.slide.y - 2, w: 30, h: 42 }, hover: h.slide });
  const play = playParts(P);
  if (play.sandbox) out.push({ id: "sandbox", rect: play.sandbox, hover: h.sandbox });
  if (play.hop) out.push({ id: "hopscotch", rect: { x: play.hop.x, y: play.hop.y - 4, w: 41, h: 18 }, hover: h.games });
  if (play.four) out.push({ id: "foursquare", rect: { x: play.four.x, y: play.four.y, w: play.four.s * 2, h: play.four.s * 2 }, hover: h.games });
  treesOf(L).forEach((t, i) => out.push({ id: `tree-${i}`, rect: { x: t.x + 4, y: t.y, w: 32, h: 50 }, hover: h.tree }));
  const stop = busStopOf(L, P);
  if (stop) out.push({ id: "bus", rect: stop, hover: h.bus });
  if (P.field) out.push({ id: "field", rect: P.field, hover: h.field });
  return out;
}

// ------------------------------------------------------------------ what's going on

type ShowKind = "recess" | "line" | "kickball" | "stars" | "swing" | "sandbox" | "four" | "hop" | "apple" | "lunch" | "story";

/** One get-together at a time. */
let show: { kind: ShowKind; g: Gathering; spots: GatherSpot[]; t0: number } | null = null;

type FxKind = "slide" | "fence" | "apple" | "jam" | "stuffed" | "swoosh";
interface Fx {
  kind: FxKind;
  t0: number;
  dur: number;
  x: number;
  y: number;
  dir: number;
  /** Where something lands, or a locker's floor line. */
  to?: { x: number; y: number; head?: boolean };
  /** The locker bank and which locker. */
  item?: WallItem;
  j?: number;
}
let fx: Fx[] = [];
let bell: number | null = null;
let pa: { t0: number; text: string } | null = null;
let bus: { t0: number } | null = null;
/** The sand castle: built while people play in the sandbox; it stands a while. */
let castle: { x: number; y: number; t0: number; until: number } | null = null;
let forL: Layout | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  show = null;
  fx = [];
  bell = null;
  pa = null;
  bus = null;
  castle = null;
}

function busyShow(): boolean {
  return show !== null && !show.g.done;
}

function addFx(f: Fx): void {
  fx.push(f);
  if (fx.length > 10) fx.shift();
}

function start(act: SceneryActions, kind: ShowKind, spots: GatherSpot[], seconds: number, lines: readonly (readonly [number, number, string, string?])[], min = 1): boolean {
  if (busyShow()) return false;
  const g = act.gather(spots, seconds, cues(lines), min);
  if (!g) return false;
  show = { kind, g, spots, t0: act.t };
  return true;
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const P = planOf(act.L);
  if (id === "bell") return clickBell(act, P);
  if (id.startsWith("locker-")) return clickLocker(act, Number(id.slice(7)));
  if (id === "lunch") return start(act, "lunch", lunchLine(act.L), 10, CLICKS.lunch) ? "sch-tray" : null;
  if (id === "story") return start(act, "story", storySpots(act.L), 14, CLICKS.story, 2) ? "sch-page" : null;
  if (!P?.yard || P.walk === null) return null;
  switch (id) {
    case "field":
      return clickField(act, P);
    case "swings":
      return clickSwings(act, P);
    case "slide":
      return clickSlide(act, P);
    case "sandbox":
      return clickSandbox(act, P);
    case "hopscotch":
    case "foursquare":
      return clickGames(act, P, id === "foursquare");
    case "bus":
      return clickBus(act);
    default:
      if (id.startsWith("tree-")) return clickTree(act, P, Number(id.slice(5)));
      return null;
  }
}

// ------------------------------------------------------------------ the bell and the PA

function clickBell(act: SceneryActions, P: SchoolPlan | null): string {
  bell = act.t;
  const L = act.L;
  // By day the bell sends everyone out to recess (or into a line in the hall); after dark, the PA.
  if (act.night < 0.5 && Math.random() < 0.75) {
    const E = L.eventArea;
    if (P?.field && E.y >= (P.yard?.y ?? Infinity)) {
      const spots: GatherSpot[] = [];
      for (const [fx0, fy] of [
        [0.2, 0.35],
        [0.5, 0.3],
        [0.8, 0.35],
        [0.3, 0.75],
        [0.62, 0.78],
        [0.88, 0.72],
      ] as const) {
        const x = Math.round(E.x + E.w * fx0);
        spots.push({ x, y: Math.round(E.y + E.h * fy), facing: x < E.x + E.w / 2 ? "right" : "left", pose: "stand", activity: CLICKS.activity.recess });
      }
      if (start(act, "recess", spots, 14, CLICKS.recess, 2)) return "sch-bell";
    } else {
      const hall = P?.corridor ?? L.net.halls[0]!;
      const x0 = clamp(Math.round(L.W * 0.3), 30, L.W - 90);
      const spots: GatherSpot[] = [0, 1, 2, 3, 4].map((i) => {
        const x = x0 + i * 13;
        return { x, y: hall + 4, facing: "left" as Facing, pose: "stand" as const, activity: CLICKS.activity.line, path: [{ x, y: hall, c: true }, { x, y: hall + 4 }] };
      });
      if (start(act, "line", spots, 10, CLICKS.line, 2)) return "sch-bell";
    }
  }
  const lines: readonly (readonly [string, string])[] = act.night > 0.5 ? CLICKS.paNight : CLICKS.pa;
  const [text, reply] = pick(lines);
  pa = { t0: act.t + 1.2, text };
  const sp = L.speakers[0] ?? L.tv;
  const who = act.near(sp.x, sp.y + sp.h, 140)[0];
  if (who) act.say(who.id, reply, 2.6, 4.4);
  return "sch-dingdong";
}

// ------------------------------------------------------------------ the field

function clickField(act: SceneryActions, P: SchoolPlan): string | null {
  const E = act.L.eventArea;
  if (!P.field || E.y < (P.yard?.y ?? Infinity)) return null;
  const night = act.night > 0.5;
  if (night) {
    const spots: GatherSpot[] = [0.3, 0.5, 0.7].map((k, i) => ({ x: Math.round(E.x + E.w * k), y: Math.round(E.y + E.h * (i === 1 ? 0.45 : 0.6)), facing: "back" as Facing, pose: "sit-back" as const, activity: CLICKS.activity.stars }));
    if (start(act, "stars", spots, 14, CLICKS.stars)) return "crickets";
  } else if (Math.random() < 0.7) {
    const y = Math.round(E.y + E.h * 0.62);
    const spots: GatherSpot[] = [
      { x: E.x + 12, y, facing: "right", pose: "stand", activity: CLICKS.activity.kickball },
      { x: Math.round(E.x + E.w * 0.48), y, facing: "left", pose: "stand", activity: CLICKS.activity.kickball },
      { x: E.x + E.w - 14, y: Math.round(E.y + E.h * 0.3), facing: "left", pose: "stand", activity: CLICKS.activity.kickball },
      { x: Math.round(E.x + E.w * 0.3), y: E.y + 12, facing: "right", pose: "stand", activity: CLICKS.activity.kickball },
    ];
    if (start(act, "kickball", spots, 13, CLICKS.kickball, 2)) return "sch-bounce";
  }
  // Somebody boots the ball over the fence.
  const who = act.near(act.at.x, act.at.y, 90)[0];
  const x = who ? who.x : act.at.x;
  const y = who ? who.y : act.at.y;
  addFx({ kind: "fence", t0: act.t, dur: 1.6, x, y: y - 2, dir: Math.random() < 0.5 ? -1 : 1, to: { x: x + (Math.random() - 0.5) * 60, y: act.L.H + 12 } });
  if (who) act.say(who.id, pick(CLICKS.fence), 2.4, 1);
  return "sch-kick";
}

// ------------------------------------------------------------------ the playground

function swingSeats(P: SchoolPlan): GatherSpot[] {
  const s = P.swings!;
  const walk = P.walk!;
  const y = s.y + s.h - 4;
  const lane = s.x + s.w + 4;
  return [9, 21].map((dx) => ({ x: s.x + dx, y, facing: "front" as Facing, pose: "sit-front" as const, lift: 4, activity: CLICKS.activity.swing, path: [{ x: lane, y: walk, c: true }, { x: lane, y: y + 4 }, { x: s.x + dx, y: y + 4 }, { x: s.x + dx, y }] }));
}

function clickSwings(act: SceneryActions, P: SchoolPlan): string | null {
  if (!P.swings) return null;
  const seats = swingSeats(P);
  const taken = seats.map((s) => act.near(s.x, s.y, 4)[0]);
  // Whoever's on a swing goes higher; free seats get new swingers.
  taken.forEach((who, i) => {
    if (!who) return;
    addFx({ kind: "swoosh", t0: act.t, dur: 5, x: seats[i]!.x, y: seats[i]!.y - 4, dir: 1 });
    act.say(who.id, pick(CLICKS.swinging), 2.4, 0.3 + i * 1.4);
  });
  const free = seats.filter((_, i) => !taken[i]);
  if (free.length > 0 && start(act, "swing", free, 11, CLICKS.swing)) return "sch-whee";
  return taken.some(Boolean) ? "sch-whee" : null;
}

function clickSlide(act: SceneryActions, P: SchoolPlan): string | null {
  const s = P.slide;
  if (!s) return null;
  addFx({ kind: "slide", t0: act.t, dur: 2.6, x: s.x + 11, y: s.y + 8, dir: 1 });
  const who = act.near(s.x + 6, s.y + s.h - 2, 24)[0];
  if (who) act.say(who.id, pick(CLICKS.slide), 2.2, 0.2);
  return "sch-whoosh";
}

function clickSandbox(act: SceneryActions, P: SchoolPlan): string | null {
  const sb = playParts(P).sandbox;
  if (!sb) return null;
  const y = Math.min(sb.y + sb.h + 7, act.L.H - 5);
  const ax = cornerAisle(P);
  const spots: GatherSpot[] = [12, 28].map((dx) => ({ x: sb.x + dx, y, facing: "back" as Facing, pose: "sit-back" as const, activity: CLICKS.activity.sandbox, path: [{ x: ax, y: P.walk!, c: true }, { x: ax, y: y + 2 }, { x: sb.x + dx, y: y + 2 }, { x: sb.x + dx, y }] }));
  if (!start(act, "sandbox", spots, 13, CLICKS.sandbox)) return null;
  castle = { x: sb.x + 13, y: sb.y + 4, t0: Infinity, until: Infinity };
  return "sch-sand";
}

/** Four square (on its court) or hopscotch; whichever can't get players tries the other. */
function clickGames(act: SceneryActions, P: SchoolPlan, four: boolean): string | null {
  const play = playParts(P);
  const ax = cornerAisle(P);
  const walk = P.walk!;
  const via = (x: number, y: number) => [{ x: ax, y: walk, c: true }, { x: ax, y: y + 4 }, { x, y: y + 4 }, { x, y }];
  const f = play.four;
  if (f && four) {
    const s = f.s;
    const at: [number, number, Facing][] = [
      [f.x - 8, f.y + s + 1, "right"],
      [f.x + 2 * s + 8, f.y + s + 1, "left"],
      [f.x + s, Math.min(f.y + 2 * s + 10, act.L.H - 8), "back"],
      [f.x + s, Math.max(walk + 12, f.y - 4), "front"],
    ];
    const spots: GatherSpot[] = at.map(([x, y, facing]) => ({ x, y, facing, pose: "stand", activity: CLICKS.activity.four, path: via(x, y) }));
    if (start(act, "four", spots, 12, CLICKS.four, 2)) return "sch-bounce";
  }
  const h = play.hop;
  if (!h) return null;
  const spots: GatherSpot[] = [6, 14].map((dy) => ({ x: h.x - 6, y: h.y + dy, facing: "right" as Facing, pose: "stand" as const, activity: CLICKS.activity.hop, path: via(h.x - 6, h.y + dy) }));
  return start(act, "hop", spots, 10, CLICKS.hop) ? "sch-bounce" : null;
}

function clickTree(act: SceneryActions, P: SchoolPlan, i: number): string | null {
  const tree = treesOf(act.L)[i];
  if (!tree) return null;
  const inGarden = P.garden !== null && tree.x >= P.garden.x;
  const lane = inGarden ? P.garden!.x + 30 : cornerAisle(P);
  const sx = tree.x + 30;
  const sy = tree.y + 52;
  if (act.night < 0.5 && Math.random() < 0.6) {
    const spot: GatherSpot = { x: sx, y: sy, facing: "left", pose: "stand", activity: CLICKS.activity.apple, path: [{ x: lane, y: P.walk!, c: true }, { x: lane, y: sy + 4 }, { x: sx, y: sy + 4 }, { x: sx, y: sy }] };
    if (start(act, "apple", [spot], 6, CLICKS.apple)) return "sch-rustle";
  }
  // An apple drops: on whoever's under the tree, or into the grass.
  const cx = tree.x + 20;
  const under = act.near(cx, tree.y + 50, 30)[0];
  const to = under ? { x: Math.round(under.x), y: Math.round(under.y - 27), head: true } : { x: cx + 8, y: tree.y + 54, head: false };
  if (under) act.say(under.id, pick(CLICKS.apples), 2.4, 0.4);
  addFx({ kind: "apple", t0: act.t, dur: 3, x: cx - 4 + Math.round(Math.random() * 12), y: tree.y + 16, dir: Math.random() < 0.5 ? -1 : 1, to });
  return "sch-thump";
}

function clickBus(act: SceneryActions): string | null {
  if (bus && act.t - bus.t0 < 10) return null;
  bus = { t0: act.t };
  return "sch-bus";
}

function clickLocker(act: SceneryActions, i: number): string | null {
  const item = lockersOf(act.L)[i];
  if (!item) return null;
  const j = Math.floor(Math.random() * item.n);
  const seg = act.L.segments.find((s) => item.x >= s.x0 && item.x < s.x1);
  const floor = (seg?.depth ?? item.y + item.h) + 5;
  const stuffed = Math.random() < 0.55;
  const cx = item.x + 4 + j * 7;
  addFx({ kind: stuffed ? "stuffed" : "jam", t0: act.t, dur: stuffed ? 4.6 : 1.5, x: item.x + 1 + j * 7, y: item.y + 1, dir: cx < act.L.W / 2 ? 1 : -1, to: { x: cx, y: floor }, item, j });
  const who = act.near(cx, floor + 10, 80)[0];
  if (who) act.say(who.id, pick(stuffed ? CLICKS.stuffed : CLICKS.jam), 2.6, stuffed ? 0.8 : 0.4);
  return stuffed ? "sch-clang" : "sch-rattle";
}

// ------------------------------------------------------------------ sprites

function ballSprite(color: string): HTMLCanvasElement {
  return sprite(`ball-${color}`, 5, 5, (g) => {
    g.rect(1, 1, 3, 3, color);
    g.set(1, 1, "#ffffff");
  });
}

function basketball(): HTMLCanvasElement {
  return sprite("basketball", 8, 8, (g) => {
    g.ellipse(3.5, 3.5, 2.8, 2.8, C.orange);
    g.rect(1, 3, 6, 1, "#a8521a").vline(3, 1, 6, "#a8521a");
    g.set(2, 1, C.orangeHi);
  });
}

/** The sand castle in stages: a mound, towers, a moat, a flag. */
function castleSprite(stage: number): HTMLCanvasElement {
  return sprite(`castle-${stage}`, 16, 14, (g) => {
    const sand = "#d9b874";
    const lo = "#b8964f";
    if (stage >= 3) g.ellipse(7.5, 10, 7.5, 3.2, "#7fc4e8");
    g.rect(3, 7, 10, 5, sand);
    g.rect(3, 11, 10, 1, lo);
    if (stage >= 2) {
      g.rect(2, 4, 3, 7, sand).rect(11, 4, 3, 7, sand);
      g.set(2, 3, sand).set(4, 3, sand).set(11, 3, sand).set(13, 3, sand);
      g.rect(7, 9, 2, 3, lo);
    }
    if (stage >= 4) {
      g.vline(8, 1, 6, "#6b7280");
      g.rect(9, 1, 3, 2, C.red);
    }
  }, ["#6b7280"]);
}

/** The yellow school bus, front to the left (60×22). */
function busSprite(open: boolean): HTMLCanvasElement {
  return sprite(`bus-${open}`, 60, 22, (g) => {
    const y = "#f5c22b";
    g.rrect(1, 2, 58, 16, y, 2);
    g.rect(2, 2, 56, 1, "#fde38a");
    // Windshield and side windows with heads in some.
    g.rect(2, 5, 5, 5, "#bfe2f5");
    for (let i = 0; i < 7; i++) {
      const wx = 16 + i * 6;
      g.rect(wx, 5, 5, 4, "#bfe2f5");
      if (i % 3 !== 1) g.rect(wx + 1, 7, 3, 2, ["#f1c7a4", "#a8714a", "#d9a07a"][i % 3]!).rect(wx + 1, 6, 3, 1, ["#4a2f22", "#2b1d16", "#d7a24f"][i % 3]!);
    }
    // The door, folded open or shut.
    g.rect(8, 4, 6, 13, open ? "#3a3046" : "#e8b020");
    if (!open) g.vline(11, 4, 13, "#3a3046");
    g.rect(1, 11, 58, 1, "#2a1e2e");
    g.rect(1, 13, 58, 1, "#2a1e2e");
    for (let i = 0; i < 9; i++) g.set(20 + i * 4, 15, "#2a1e2e");
    g.rect(1, 16, 58, 2, "#3a3a46");
    g.set(1, 9, "#fff3c0").set(1, 10, "#fff3c0");
    g.set(58, 9, C.red).set(58, 10, C.red);
    // Wheels
    for (const wx of [10, 46]) {
      g.ellipse(wx, 18, 3, 3, "#2a2a32");
      g.set(wx, 18, "#9aa3ad");
    }
  });
}

// ------------------------------------------------------------------ drawing

/** Seconds since everyone arrived at the current show (null when none). */
function showClock(t: number): number | null {
  if (!show || show.g.done || show.g.arrivedAt === null) return null;
  return t - show.g.arrivedAt;
}

function arc(a: { x: number; y: number }, b: { x: number; y: number }, q: number, h: number): { x: number; y: number } {
  return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q - Math.sin(q * Math.PI) * h };
}

function bounceBall(ctx: Ctx, x: number, y: number, ground: number, color = C.red): void {
  ctx.fillStyle = "rgba(40,30,40,0.2)";
  ctx.fillRect(Math.round(x) - 1, Math.round(ground), 4, 1);
  ctx.drawImage(ballSprite(color), Math.round(x) - 2, Math.round(y) - 4);
}

/** The ball passed round the people in a show, a hop every `beat` seconds. */
function passBall(ctx: Ctx, out: Drawable[], k: number, beat: number, height: number, color: string, bounce: boolean): void {
  const s = show!;
  const here = s.spots.filter((_, i) => i < s.g.size && s.g.present[i]);
  if (here.length < 2) return;
  const n = Math.floor(k / beat);
  const a = here[n % here.length]!;
  const b = here[(n + 1) % here.length]!;
  const q = (k % beat) / beat;
  const from = { x: a.x, y: a.y - 8 };
  const to = { x: b.x, y: b.y - 8 };
  let p: { x: number; y: number };
  let ground: number;
  if (bounce) {
    // Down into the middle, up to the next one.
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    p = q < 0.5 ? arc(from, mid, q * 2, 2) : arc(mid, to, (q - 0.5) * 2, height);
    ground = q < 0.5 ? mid.y : mid.y + (b.y - mid.y) * (q - 0.5) * 2;
  } else {
    p = arc(from, to, q, height);
    ground = a.y + (b.y - a.y) * q;
  }
  out.push({ z: Math.max(a.y, b.y) + 0.7, draw: () => bounceBall(ctx, p.x, p.y, ground, color) });
}

/** Things on the ground and in the air, sorted with people (decor). */
export function clickItems(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const t = info.t;
  const out: Drawable[] = [];
  const k = showClock(t);
  if (show && k !== null) {
    const s = show;
    switch (s.kind) {
      case "recess":
        passBall(ctx, out, k, 1.1, 14, C.red, false);
        break;
      case "four":
        passBall(ctx, out, k, 0.9, 6, C.red, true);
        break;
      case "kickball":
        kickball(ctx, out, k % 8, s);
        break;
      case "hop": {
        // A pebble tossed onto the squares, one further each turn.
        const P = planOf(L);
        const h = P ? playParts(P).hop : null;
        if (!h) break;
        const turn = Math.floor(k / 2.5);
        const q = Math.min(1, (k % 2.5) / 0.5);
        const squares = [[4, 4], [12, 4], [20, 0], [20, 8], [28, 4], [36, 0], [36, 8]];
        const [sx, sy] = squares[turn % squares.length]!;
        const p = arc({ x: h.x - 4, y: h.y + 2 }, { x: h.x + sx, y: h.y + sy }, q, 6);
        out.push({ z: h.y + 12, draw: () => {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
          ctx.fillStyle = "#c9c3b8";
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        } });
        break;
      }
      case "swing":
        s.spots.forEach((sp, i) => {
          if (i < s.g.size && s.g.present[i]) out.push({ z: sp.y + 0.8, draw: () => swoosh(ctx, sp.x, sp.y - 4 - (sp.lift ?? 0), t) });
        });
        break;
      case "apple": {
        const sp = s.spots[0]!;
        if (s.g.present[0] && k > 1.2) out.push({ z: sp.y + 0.8, draw: () => {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(sp.x - 9, sp.y - 16, 4, 4);
          ctx.fillStyle = k > 2.6 ? "#f4efe6" : "#e5544b";
          ctx.fillRect(sp.x - 8, sp.y - 15, 2, 2);
        } });
        break;
      }
      case "lunch":
        // Trays, and lunch landing on them as they go down the line.
        s.spots.forEach((sp, i) => {
          if (i >= s.g.size || !s.g.present[i]) return;
          const food = k > 1.5 + i * 2.3;
          out.push({ z: sp.y + 0.8, draw: () => {
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(sp.x + 3, sp.y - 13, 9, 4);
            ctx.fillStyle = C.orange;
            ctx.fillRect(sp.x + 4, sp.y - 12, 7, 2);
            if (food) {
              ctx.fillStyle = "#f2c14e";
              ctx.fillRect(sp.x + 5, sp.y - 13, 2, 2);
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(sp.x + 9, sp.y - 14, 1, 2);
            }
          } });
        });
        break;
      case "story": {
        // The reader turns the pages of a picture book now and then.
        const sp = s.spots[0]!;
        if (s.g.present[0] && Math.floor(k / 3) % 2 === 1 && k % 3 < 0.25) out.push({ z: sp.y + 0.8, draw: () => {
          ctx.fillStyle = "#fbfaf3";
          ctx.fillRect(sp.x, sp.y - 13, 1, 4);
        } });
        break;
      }
      case "sandbox":
        if (castle && castle.t0 === Infinity && show.g.arrivedAt !== null) castle.t0 = show.g.arrivedAt;
        break;
      default:
        break;
    }
  }
  if (castle) {
    if (show?.kind === "sandbox" && show.g.done && castle.until === Infinity) castle.until = t + 90;
    if (t > castle.until) castle = null;
    else if (castle.t0 !== Infinity) {
      const stage = clamp(1 + Math.floor((t - castle.t0) / 2.6), 1, 4);
      const c = castle;
      out.push({ z: c.y + 12, draw: () => ctx.drawImage(castleSprite(stage), c.x, c.y) });
    }
  }
  if (fx.length > 0 && t - fx[0]!.t0 > fx[0]!.dur) fx = fx.filter((f) => t - f.t0 <= f.dur);
  for (const f of fx) {
    const kk = t - f.t0;
    if (kk < 0 || kk > f.dur) continue;
    const item = fxItem(ctx, L, f, kk, t);
    if (item) out.push(item);
  }
  if (bus) {
    const kk = t - bus.t0;
    const P = planOf(L);
    const stop = P ? busStopOf(L, P) : null;
    if (kk > 10 || !stop) bus = null;
    else {
      const x = busX(L, stop, kk);
      const open = kk > 2.8 && kk < 6.2;
      const rock = kk < 2.6 || kk > 6.4 ? Math.floor(t * 8) % 2 : 0;
      out.push({ z: L.H + 20, draw: () => ctx.drawImage(busSprite(open), Math.round(x), L.H - 22 - rock) });
    }
  }
  return out;
}

/** The bus's left edge `k` seconds after it was called: in from the right, a stop, off to the left. */
function busX(L: Layout, stop: Rect, k: number): number {
  // The door (just behind the front) stops at the sign.
  const at = Math.min(stop.x - 10, L.W - 62);
  if (k < 2.6) return L.W + 4 + (at - L.W - 4) * (1 - (1 - k / 2.6) ** 2);
  if (k < 6.4) return at;
  return at + (-70 - at) * ((k - 6.4) / 3.6) ** 2;
}

function swoosh(ctx: Ctx, x: number, y: number, t: number): void {
  const k = Math.floor(t * 4) % 2;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (const side of [-1, 1]) {
    const sx = x + side * (9 + k);
    ctx.fillRect(sx, y - 10, 1, 3);
    ctx.fillRect(sx + side, y - 6, 1, 4);
    ctx.fillRect(sx, y - 1, 1, 3);
  }
}

/** Kickball, an 8-second round: the roll, the kick, the catch that isn't, the throw back. */
function kickball(ctx: Ctx, out: Drawable[], k: number, s: NonNullable<typeof show>): void {
  const [kicker, pitcher, fielder] = s.spots;
  if (!kicker || !pitcher || !fielder || !s.g.present[0] || !s.g.present[1]) return;
  const ground = (y: number) => y - 1;
  let p: { x: number; y: number };
  let g: number;
  if (k < 1) {
    p = { x: pitcher.x - 6, y: ground(pitcher.y) };
    g = pitcher.y;
  } else if (k < 2) {
    const q = k - 1;
    p = { x: pitcher.x - 6 + (kicker.x + 6 - pitcher.x + 6) * q, y: ground(pitcher.y) - Math.abs(Math.sin(q * Math.PI * 3)) * 2 };
    g = pitcher.y;
  } else if (k < 4.2) {
    const q = (k - 2) / 2.2;
    const land = { x: fielder.x + 12, y: fielder.y + 6 };
    p = arc({ x: kicker.x + 6, y: kicker.y - 2 }, land, q, 34);
    g = kicker.y + (land.y - kicker.y) * q;
  } else if (k < 5) {
    const q = (k - 4.2) / 0.8;
    p = { x: fielder.x + 12 + q * 10, y: fielder.y + 5 - Math.abs(Math.sin(q * Math.PI * 2)) * (4 - q * 3) };
    g = fielder.y + 6;
  } else if (k < 6.2) {
    const q = (k - 5) / 1.2;
    p = arc({ x: fielder.x + 22, y: fielder.y - 6 }, { x: pitcher.x - 6, y: pitcher.y - 6 }, q, 16);
    g = fielder.y + (pitcher.y - fielder.y) * q;
  } else {
    p = { x: pitcher.x - 6, y: ground(pitcher.y) };
    g = pitcher.y;
  }
  out.push({ z: g + 0.7, draw: () => bounceBall(ctx, p.x, p.y, g, C.red) });
}

function fxItem(ctx: Ctx, L: Layout, f: Fx, k: number, t: number): Drawable | null {
  switch (f.kind) {
    case "slide": {
      // Down the chute, a hop off the end, a roll onto the grass.
      let x: number;
      let y: number;
      if (k < 0.9) {
        const q = k / 0.9;
        x = f.x + q * 16;
        y = f.y + q * q * 28;
      } else {
        const q = Math.min(1, (k - 0.9) / 1.2);
        x = f.x + 16 + q * 26;
        y = f.y + 28 + (4 - Math.abs(Math.sin(q * Math.PI * 2)) * (6 - q * 5));
      }
      const fade = Math.min(1, (f.dur - k) / 0.4);
      return { z: f.y + 36, draw: () => {
        ctx.globalAlpha = fade;
        bounceBall(ctx, x, y, f.y + 34, C.blue);
        ctx.globalAlpha = 1;
      } };
    }
    case "fence": {
      const q = k / f.dur;
      const p = arc({ x: f.x, y: f.y }, f.to!, q, 40);
      const g = f.y + (f.to!.y - f.y) * q;
      return { z: L.H + 4, draw: () => bounceBall(ctx, p.x, p.y, Math.min(g, L.H - 2), "#f4f1ea") };
    }
    case "apple": {
      const to = f.to!;
      const fall = 0.4;
      let x: number;
      let y: number;
      if (k < fall) {
        const q = k / fall;
        x = f.x + (to.x - f.x) * q;
        y = f.y + (to.y - f.y) * q * q;
      } else {
        const ground = to.head ? to.y + 27 : to.y;
        const q = Math.min(1, (k - fall) / 0.5);
        x = to.x + f.dir * 8 * q;
        y = to.y + (ground - to.y) * q - Math.sin(q * Math.PI) * 6;
      }
      const stars = to.head === true && k > fall && k < fall + 0.8;
      const fade = Math.min(1, (f.dur - k) / 0.5);
      return { z: (to.head ? to.y + 27 : to.y) + 1, draw: () => {
        ctx.globalAlpha = fade;
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        ctx.fillStyle = "#e5544b";
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        ctx.fillStyle = "#5cb860";
        ctx.fillRect(Math.round(x), Math.round(y) - 3, 1, 1);
        ctx.globalAlpha = 1;
        if (stars) {
          ctx.fillStyle = "#ffd84a";
          for (let i = 0; i < 3; i++) {
            const a = t * 6 + i * 2.1;
            ctx.fillRect(Math.round(to.x + Math.cos(a) * 6), Math.round(to.y - 2 + Math.sin(a) * 2), 1, 1);
          }
        }
      } };
    }
    case "jam": {
      // The door rattles in its frame.
      const off = Math.floor(t * 20) % 2 ? 1 : -1;
      return { z: f.to!.y - 4, draw: () => {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(f.x - 2 + off, f.y + 8, 1, 3);
        ctx.fillRect(f.x + 7 + off, f.y + 14, 1, 3);
        ctx.fillRect(f.x - 2 - off, f.y + 18, 1, 2);
        if (k < 1) drawPixelText(ctx, "!", f.x + 2, f.y - 7, C.red);
      } };
    }
    case "stuffed":
      return { z: f.to!.y + 1, draw: () => stuffedLocker(ctx, f, k) };
    case "swoosh":
      return { z: f.y + 4.8, draw: () => swoosh(ctx, f.x, f.y, t) };
  }
}

/** A locker pops open: books and a basketball tumble out onto the floor. */
function stuffedLocker(ctx: Ctx, f: Fx, k: number): void {
  const it = f.item!;
  const h = it.h - 3;
  const x = f.x;
  const y = f.y;
  const shut = k > f.dur - 0.5;
  if (!shut) {
    ctx.fillStyle = "#2a2633";
    ctx.fillRect(x, y, 6, h);
    ctx.fillStyle = "#4a4458";
    ctx.fillRect(x, y + 9, 6, 1);
    const books = [C.red, C.blue, C.yellow, C.green];
    books.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + i + 1, y + 4 + (i % 2), 1, 5 - (i % 2));
    });
    // The door, open toward you.
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x + 6, y - 1, 3, h + 2);
    ctx.fillStyle = "#cfd5dc";
    ctx.fillRect(x + 7, y, 1, h);
  }
  // The basketball: out, down, bounce, bounce, roll.
  const floor = f.to!.y;
  const dir = f.dir;
  const q = Math.min(1, k / 1.6);
  const bx = x + 3 + dir * q * 26;
  const by = floor - 3 - Math.abs(Math.cos(q * Math.PI * 1.5)) * (1 - q) * (floor - y - 10);
  ctx.drawImage(basketball(), Math.round(bx) - 4, Math.round(by) - 4);
  // Two books slid out onto the floor.
  if (k > 0.5) {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 3, floor - 2, 7, 4);
    ctx.fillRect(x + 4, floor - 1, 6, 4);
    ctx.fillStyle = C.red;
    ctx.fillRect(x - 2, floor - 1, 5, 2);
    ctx.fillStyle = C.blue;
    ctx.fillRect(x + 5, floor, 4, 2);
  }
}

/** After the darkness: the bell ringing, the PA's words, fireflies over the field. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  if (bell !== null) {
    const k = t - bell;
    const it = bellOf(L);
    if (k > 1.8 || !it) bell = null;
    else {
      const off = Math.floor(t * 24) % 2;
      ctx.fillStyle = "#3a3046";
      for (const side of [-1, 1]) {
        const x = side < 0 ? it.x - 3 - off : it.x + it.w + 2 + off;
        ctx.fillRect(x, it.y + 1, 1, 2);
        ctx.fillRect(x + side, it.y + 4, 1, 2);
        ctx.fillRect(x, it.y + 7, 1, 2);
      }
    }
  }
  if (pa) {
    const k = t - pa.t0;
    if (k > 5) pa = null;
    else if (k >= 0) paBanner(ctx, L, pa.text, k);
  }
  if (show?.kind === "stars" && !show.g.done) {
    const E = L.eventArea;
    for (let i = 0; i < 12; i++) {
      const on = Math.sin(t * 2.2 + i * 1.9) > 0.3;
      if (!on) continue;
      const x = E.x + ((i * 37 + Math.sin(t * 0.4 + i) * 14) % E.w + E.w) % E.w;
      const y = E.y + ((i * 23 + Math.cos(t * 0.5 + i) * 8) % E.h + E.h) % E.h;
      ctx.fillStyle = "rgba(255,240,140,0.35)";
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = "#fff6b0";
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}

/** The PA's words in a banner under the smartboard, with a speaker icon. */
function paBanner(ctx: Ctx, L: Layout, text: string, k: number): void {
  const tw = pixelTextWidth(text);
  const w = tw + 16;
  const tv = L.tv;
  const x = Math.round(clamp(tv.x + tv.w / 2 - w / 2, 2, L.W - w - 2));
  const y = Math.round(Math.min(tv.y + tv.h + 6, L.H - 14));
  ctx.globalAlpha = Math.min(1, k / 0.25, (5 - k) / 0.4);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, 11);
  ctx.fillStyle = "#fff6d6";
  ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = C.blue;
  ctx.fillRect(x + 2, y + 3, 2, 3);
  ctx.fillRect(x + 4, y + 2, 1, 5);
  ctx.fillRect(x + 5, y + 1, 1, 7);
  // Typed out a letter at a time.
  const shown = text.slice(0, Math.min(text.length, Math.floor(k * 18)));
  drawPixelText(ctx, shown, x + 10, y + 2, C.blueLo);
  ctx.globalAlpha = 1;
}

/** The bus's headlights at night. */
export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL || !bus || info.night < 0.3) return [];
  const P = planOf(L);
  const stop = P ? busStopOf(L, P) : null;
  if (!stop) return [];
  const x = busX(L, stop, info.t - bus.t0);
  return [
    [x - 8, L.H - 12, 30, 0.8, "#fff1c0", 0.25],
    [x + 30, L.H - 14, 40, 0.5, "#fff1c0", 0.12],
  ];
}
