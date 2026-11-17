// Mountain Cabin: the lodge's own little chairlift and the piste beside it.
// Up the mountainside right of the lodge (or up the yard, or along the bottom
// of a phone): towers, a bull wheel at each end, red chairs going round, the
// operator's hut with its bell, a summit flag at the top of the piste, and
// a kicker halfway down. Click the lift and someone who's free walks out,
// rides up and waves from the top (or the lift stops and the chairs swing,
// or a dog or a yeti rides up); click the hut for the bell. Rarely, or when
// you click the summit flag, someone in goggles and a beanie comes down the
// piste in S-curves: sometimes over the kicker with a trick, sometimes into
// a cloud of powder (thumbs up), then they walk back into the lodge.
import { charSprite, type CharPose, type Expression, type Look } from "../../characters.ts";
import type { Facing, Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, Gathering, GatherSpot, Light, PaintInfo, PoseOf, SceneryActions, SceneryClickable } from "../../theme.ts";
import { drawPixelText, Grid, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { pet } from "./critters.ts";
import { C, h2, sprite } from "./kit.ts";
import { CABLE, planOf, type CabinPlan, type SkiLift } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const px = (ctx: Ctx, c: string, x: number, y: number, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

const IRON = "#3a3d46";
const IRON_HI = "#5b5f6b";
const MARKER = "#f08a3a";
const TRACK = "#cbd8e6";

/** The cable runs this fast (px/s); the chairs hang this far apart. */
const SPEED = 15;
const GAP = 40;

// ------------------------------------------------------------------ the piste (baked into the backdrop)

/** Groomed corduroy, marker poles down both edges, old ski tracks and the kicker. */
export function paintPiste(ctx: Ctx, p: CabinPlan): void {
  const l = p.lift;
  if (!l) return;
  const s = l.piste;
  if (l.axis === "y") {
    for (let y = s.y; y < s.y + s.h; y++) {
      const edge = Math.round(Math.sin(y * 0.21) * 1.5 + Math.sin(y * 0.07) * 1.5);
      const x0 = s.x + 2 + edge;
      const x1 = s.x + s.w - 2 - edge;
      rect(ctx, x0, y, x1 - x0, 1, y % 2 ? "#f7fafd" : "#e8eff7");
      px(ctx, C.snowShade, x0 - 1, y);
      px(ctx, C.snowShade, x1, y);
    }
    // Old tracks, swinging down the fall line.
    const pc = s.x + s.w / 2;
    const A = Math.max(4, Math.min(14, s.w / 2 - 9));
    for (const [ph, a] of [
      [0, 1],
      [2.1, 0.7],
    ] as const) {
      for (let y = s.y + 6; y < s.y + s.h - 4; y++) {
        const x = Math.round(pc + Math.sin(y / 11 + ph) * A * a);
        px(ctx, "#dbe5f0", x - 1, y);
        px(ctx, "#dbe5f0", x + 1, y);
      }
    }
    // Marker poles, orange tops.
    for (let y = s.y + 12; y < s.y + s.h - 6; y += 44) {
      for (const x of [s.x + 1, s.x + s.w - 2]) {
        px(ctx, OUTLINE, x - 1, y - 1, 3, 9);
        px(ctx, MARKER, x, y, 1, 3);
        px(ctx, "#2a2c36", x, y + 3, 1, 4);
        px(ctx, C.snowShade, x - 1, y + 7, 3, 1);
      }
    }
  } else {
    // The phone's strip (corduroy painted with it): tracks across it.
    for (let x = s.x + 4; x < s.x + s.w - 4; x++) {
      const y = Math.round(l.start.y + Math.sin(x / 9) * 3);
      px(ctx, "#dbe5f0", x, y - 1);
      px(ctx, "#dbe5f0", x, y + 1);
    }
  }
  kicker(ctx, l);
}

/** A kicker of packed snow, its lip facing down the piste, a blue line along the lip. */
function kicker(ctx: Ctx, l: SkiLift): void {
  const k = l.kicker;
  if (l.axis === "y") {
    const g = new Grid(18, 9);
    g.ellipse(9, 4, 8, 4, C.snowShade);
    g.rect(2, 2, 14, 4, "#eef4fa");
    g.rect(2, 1, 14, 1, "#ffffff");
    g.rect(2, 6, 14, 1, "#3a8ad8");
    g.rect(3, 7, 12, 1, C.snowDeep);
    g.outline(OUTLINE);
    ctx.drawImage(g.toCanvas(), k.x - 9, k.y - 5);
  } else {
    const g = new Grid(12, 8);
    g.rect(2, 2, 8, 4, "#eef4fa");
    g.rect(2, 1, 8, 1, "#ffffff");
    g.rect(1, 2, 1, 4, "#3a8ad8");
    g.rect(10, 3, 1, 3, C.snowShade);
    g.outline(OUTLINE);
    ctx.drawImage(g.toCanvas(), k.x - 6, k.y - 6);
  }
}

// ------------------------------------------------------------------ what's going on

type Special = "yeti" | "dog";
type RunKind = "run" | "jump" | "wipeout";

interface Run {
  t0: number;
  kind: RunKind;
  board: boolean;
  trick: "spin" | "grab";
  look: Look;
  sign: number;
  last: Point | null;
  sprayed: Set<string>;
}

let forL: Layout | null = null;
let cur: SkiLift | null = null;
let run = 0;
let lastT = -1;
let stop: { t0: number } | null = null;
let special: { kind: Special; t0: number } | null = null;
let ride: { g: Gathering; t0: number } | null = null;
let bell: { t0: number } | null = null;
let skier: Run | null = null;
let rider: { y: number; x: number; t: number } | null = null;
let tracks: { x: number; y: number; t: number; board: boolean }[] = [];
let spray: { x: number; y: number; vx: number; vy: number; t0: number }[] = [];
let clouds: { x: number; y: number; t0: number }[] = [];
const looks = new Map<number, Look>();

function bind(L: Layout): SkiLift | null {
  if (L !== forL) {
    forL = L;
    run = 0;
    lastT = -1;
    stop = null;
    special = null;
    ride = null;
    bell = null;
    skier = null;
    rider = null;
    tracks = [];
    spray = [];
    clouds = [];
  }
  cur = planOf(L)?.lift ?? null;
  return cur;
}

const stopped = (t: number) => stop !== null && t - stop.t0 < 6;

/** How far a chair swings sideways (the lift jerked to a stop a moment ago). */
function swing(t: number, k: number): number {
  if (!stop) return 0;
  const e = t - stop.t0;
  if (e < 0 || e > 9) return 0;
  const after = e > 6 ? e - 6 : 0;
  return Math.round(Math.sin(e * 4.6 + k * 1.3) * (3 * Math.exp(-e / 2.4) + (after > 0 ? 1.6 * Math.exp(-after / 0.8) : 0)));
}

/** Where the lift's line is (feet positions along it): someone there is riding. */
function onLine(l: SkiLift, x: number, y: number): boolean {
  if (l.axis === "y") return Math.abs(x - l.bottom.x) < 0.5 && y < l.bottom.y - 1 && y > l.top.y + 1;
  return Math.abs(y - l.bottom.y) < 0.5 && x > l.bottom.x + 1 && x < l.top.x - 1;
}

// ------------------------------------------------------------------ the people

/** Riders sit (from behind going up, slumped happily coming down); whoever rode up waves from the top. */
export function liftPose(p: PoseOf, info: PaintInfo): { pose: CharPose; expr: Expression; facing?: Facing } | null {
  const l = cur;
  if (!l || p.kind !== "agent") return null;
  if (p.spot === null && onLine(l, p.x, p.y)) {
    if (l.axis === "y" && p.facing === "back") return { pose: "sit-back", expr: p.expr, facing: "back" };
    return { pose: "slump", expr: Math.floor(info.t * 0.7 + p.seed) % 5 === 0 ? "blink" : "happy", facing: "front" };
  }
  if (p.spot === "huddle" && Math.abs(p.x - l.wave.x) < 0.5 && Math.abs(p.y - l.wave.y) < 0.5) {
    return { pose: Math.floor(info.t * 4) % 2 ? "raise" : "stand", expr: "happy", facing: "front" };
  }
  return null;
}

/** On someone riding: the chair (its back, or the safety bar and footrest), the hanger up to the cable, legs dangling. */
export function liftRider(ctx: Ctx, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; look: Look; spot?: string | null }, t: number): void {
  if (looks.size > 40 && !looks.has(a.seed)) looks.delete(looks.keys().next().value!);
  looks.set(a.seed, a.look);
  const l = cur;
  if (!l || a.spot) return;
  const fx = a.x + 10;
  const fy = a.y + 27;
  if (!onLine(l, fx, fy)) return;
  rider = { x: fx, y: fy, t };
  const { x, y } = a;
  // The hanger: from the cable over their head, round to the chair's right side.
  px(ctx, IRON, fx, fy - CABLE, 1, 3);
  px(ctx, IRON, fx, fy - CABLE + 2, 8, 1);
  px(ctx, OUTLINE, x + 17, y + 1, 3, 21);
  px(ctx, IRON_HI, x + 18, y + 1, 1, 21);
  if (a.facing === "back") {
    // Going up, seen from behind: the chair's back over theirs.
    px(ctx, OUTLINE, x + 2, y + 16, 16, 7);
    px(ctx, C.red, x + 3, y + 17, 14, 5);
    px(ctx, C.redHi, x + 3, y + 17, 14, 1);
    px(ctx, C.redLo, x + 3, y + 19, 14, 1);
    px(ctx, IRON, x + 3, y + 22, 14, 1);
    return;
  }
  // Coming down (or across): the seat behind them, legs dangling, the bar down, boots on the footrest.
  px(ctx, OUTLINE, x + 2, y + 19, 16, 3);
  px(ctx, C.red, x + 3, y + 20, 2, 1);
  px(ctx, C.red, x + 15, y + 20, 2, 1);
  const pants = a.look.pants;
  px(ctx, OUTLINE, x + 4, y + 21, 10, 6);
  px(ctx, pants, x + 5, y + 21, 3, 4);
  px(ctx, pants, x + 10, y + 21, 3, 4);
  px(ctx, "#4a3a32", x + 5, y + 25, 3, 1);
  px(ctx, "#4a3a32", x + 10, y + 25, 3, 1);
  px(ctx, IRON, x + 2, y + 17, 16, 1);
  px(ctx, IRON, x + 3, y + 26, 13, 1);
}

// ------------------------------------------------------------------ the lift, live

function towersOf(l: SkiLift): number[] {
  const out: number[] = [];
  if (l.axis === "y") {
    const len = l.bottom.y - l.top.y;
    const n = Math.max(0, Math.round((len - 60) / 110));
    for (let i = 1; i <= n; i++) out.push(Math.round(l.top.y + (len * i) / (n + 1)));
  } else {
    const len = l.top.x - l.bottom.x;
    const n = Math.max(0, Math.round((len - 50) / 110));
    for (let i = 1; i <= n; i++) out.push(Math.round(l.bottom.x + (len * i) / (n + 1)));
  }
  return out;
}

/** The two cables (under everything, people and chairs hang off them), and ski tracks in the snow. */
export function liftUnder(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const l = bind(L);
  if (!l) return;
  const t = info.t;
  const dt = lastT < 0 ? 0 : Math.max(0, Math.min(0.25, t - lastT));
  lastT = t;
  if (!stopped(t) && info.night < 0.9) run += dt * SPEED;
  if (stop && t - stop.t0 > 10) stop = null;
  if (ride && (ride.g.done || t - ride.t0 > 90)) ride = null;
  // Tracks fade away after a while.
  if (tracks.length > 0 && t - tracks[0]!.t > 40) tracks = tracks.filter((q) => t - q.t < 40);
  for (const q of tracks) {
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (t - q.t - 25) / 15));
    if (q.board) px(ctx, TRACK, q.x - 1, q.y, 3, 1);
    else if (l.axis === "y") {
      px(ctx, TRACK, q.x - 2, q.y);
      px(ctx, TRACK, q.x + 1, q.y);
    } else {
      px(ctx, TRACK, q.x, q.y - 1);
      px(ctx, TRACK, q.x, q.y + 1);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = IRON;
  if (l.axis === "y") {
    const y0 = l.top.y - CABLE;
    const y1 = l.bottom.y - CABLE;
    ctx.fillRect(l.bottom.x, y0, 1, y1 - y0);
    ctx.fillRect(l.bottom.x + 12, y0, 1, y1 - y0);
  } else {
    ctx.fillRect(l.bottom.x, l.bottom.y - CABLE + 3, l.top.x - l.bottom.x, 1);
    ctx.fillRect(l.bottom.x, l.bottom.y - CABLE - 1, l.top.x - l.bottom.x, 1);
  }
  stepSkier(l, t);
}

/** A chair at ground position (x, g): the hanger from the cable, the back, the seat; seen from the front with its bars. */
function chairAt(ctx: Ctx, x: number, g: number, front: boolean, sw: number, vertical: boolean): void {
  const sx = x + sw;
  const top = vertical ? g - CABLE : g - CABLE + 3;
  px(ctx, IRON, x, top, 1, 2);
  ctx.fillStyle = IRON;
  const n = Math.max(1, Math.abs(sx + 7 - x));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x + ((sx + 7 - x) * i) / n), top + 2 + Math.round((3 * i) / n), 1, 1);
  px(ctx, OUTLINE, sx + 6, top + 4, 3, g - 9 - (top + 4));
  px(ctx, IRON_HI, sx + 7, top + 5, 1, g - 10 - (top + 5));
  px(ctx, OUTLINE, sx - 7, g - 17, 15, 9);
  px(ctx, C.red, sx - 6, g - 16, 13, 5);
  px(ctx, C.redHi, sx - 6, g - 16, 13, 1);
  px(ctx, C.redLo, sx - 6, g - 13, 13, 1);
  px(ctx, IRON, sx - 6, g - 11, 13, 2);
  if (front) {
    px(ctx, C.snow, sx - 5, g - 12, 11, 1);
    px(ctx, IRON, sx - 7, g - 14, 15, 1);
    px(ctx, IRON, sx - 5, g - 5, 11, 1);
  }
}

const wheelSprite = () =>
  sprite("lift-wheel", 19, 7, (g) => {
    g.ellipse(9, 3, 9, 3, OUTLINE);
    g.ellipse(9, 3, 8, 2, "#6d7077");
    g.ellipse(9, 3, 5, 1, "#a5a8ae");
  }, false);

function bullWheel(ctx: Ctx, cx: number, cy: number, t: number, turning: boolean): void {
  px(ctx, OUTLINE, cx - 9, cy - 9, 19, 7);
  px(ctx, "#8d949e", cx - 8, cy - 8, 17, 5);
  px(ctx, C.red, cx - 8, cy - 6, 17, 1);
  px(ctx, "#b0b5bb", cx - 8, cy - 8, 17, 1);
  ctx.drawImage(wheelSprite(), cx - 9, cy - 2);
  const a = (turning ? t * 2.2 : 0) % (Math.PI * 2);
  px(ctx, "#ffffff", cx + Math.round(Math.cos(a) * 7), cy + 1 + Math.round(Math.sin(a) * 2));
}

/** The operator's hut: logs, a snowy roof, a window, the door, the bell on its bracket. */
function hutSprite(): HTMLCanvasElement {
  return sprite("lift-hut", 20, 22, (g) => {
    g.rect(2, 8, 16, 13, C.beam);
    for (let y = 9; y < 21; y += 3) g.hline(2, y, 16, C.beamHi);
    g.rect(1, 6, 18, 3, C.beamLo);
    g.rect(0, 3, 20, 4, C.snow).rect(2, 2, 16, 1, C.snow).rect(0, 6, 20, 1, C.snowShade);
    g.rect(14, 0, 2, 3, IRON);
    g.rect(3, 11, 6, 5, IRON);
    g.rect(11, 12, 5, 9, C.pineDk).set(15, 16, C.brass);
    g.rect(2, 20, 16, 1, C.beamDk);
  });
}

function hutDrawable(ctx: Ctx, l: SkiLift, info: PaintInfo): Drawable {
  const h = l.hut;
  const t = info.t;
  return {
    z: h.y + h.h,
    draw: () => {
      const x = h.x - 1;
      const y = h.y + h.h - 22;
      ctx.drawImage(hutSprite(), x, y);
      // The window: lit at night or once the bell's been rung; the lifty looks out.
      const rung = bell !== null && t - bell.t0 < 30;
      const lit = info.night > 0.4 || rung;
      px(ctx, lit ? "#ffd47a" : "#8fb0c8", x + 4, y + 12, 4, 3);
      if (!lit) px(ctx, "#cfe6f5", x + 4, y + 12, 1, 1);
      if (bell && t - bell.t0 < 5) {
        px(ctx, "#f2c9a0", x + 5, y + 13, 2, 2);
        px(ctx, C.red, x + 4, y + 12, 4, 1);
      }
      // The bell, swinging after a ring.
      const e = bell ? t - bell.t0 : 99;
      const sw = e < 2.5 ? Math.round(Math.sin(e * 14) * 1.5 * (1 - e / 2.5)) : 0;
      px(ctx, OUTLINE, x - 3, y + 8, 4, 1);
      px(ctx, OUTLINE, x - 3 + sw, y + 9, 4, 4);
      px(ctx, C.brass, x - 2 + sw, y + 9, 2, 3);
      px(ctx, C.brassHi, x - 2 + sw, y + 9, 1, 1);
      if (e < 1.6) {
        ctx.globalAlpha = 1 - e / 1.6;
        px(ctx, "#ffffff", x - 6, y + 7, 1, 2);
        px(ctx, "#ffffff", x + 2, y + 6, 1, 2);
        ctx.globalAlpha = 1;
      }
    },
  };
}

/** A yeti in a red scarf (16×18), riding up. */
function yeti(): HTMLCanvasElement {
  return sprite("lift-yeti", 16, 18, (g) => {
    g.ellipse(8, 6, 6, 5.5, "#f4f6fa");
    g.rect(2, 8, 12, 9, "#f4f6fa");
    for (let x = 3; x < 14; x += 2) g.set(x, 16, "#c8d2e0");
    g.rect(4, 4, 8, 4, "#b8c8dc").set(6, 5, OUTLINE).set(9, 5, OUTLINE).rect(7, 7, 2, 1, "#8a6a8a");
    g.rect(3, 10, 10, 2, C.red).rect(10, 11, 2, 4, C.red).rect(10, 14, 2, 1, C.redLo);
    g.rect(0, 9, 2, 5, "#f4f6fa").rect(14, 9, 2, 5, "#f4f6fa");
  });
}

export function liftDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const l = cur;
  if (!l || L !== forL) return [];
  const t = info.t;
  const out: Drawable[] = [];
  const vertical = l.axis === "y";
  const turning = !stopped(t) && info.night < 0.9;
  // Towers.
  for (const k of towersOf(l)) {
    if (vertical) {
      const x = l.bottom.x + 6;
      out.push({
        z: k,
        draw: () => {
          px(ctx, OUTLINE, x - 1, k - CABLE - 1, 3, CABLE + 1);
          px(ctx, "#8d949e", x, k - CABLE, 1, CABLE);
          px(ctx, OUTLINE, l.bottom.x - 3, k - CABLE - 3, 19, 3);
          px(ctx, IRON_HI, l.bottom.x - 2, k - CABLE - 2, 17, 1);
          px(ctx, C.snow, l.bottom.x - 2, k - CABLE - 3, 17, 1);
          px(ctx, IRON, l.bottom.x - 1, k - CABLE - 1, 3, 2);
          px(ctx, IRON, l.bottom.x + 11, k - CABLE - 1, 3, 2);
          px(ctx, C.snowShade, x - 3, k, 7, 1);
        },
      });
    } else {
      const g = l.bottom.y;
      out.push({
        z: g - 6,
        draw: () => {
          px(ctx, OUTLINE, k - 1, g - CABLE - 3, 3, CABLE - 2);
          px(ctx, "#8d949e", k, g - CABLE - 2, 1, CABLE - 4);
          px(ctx, OUTLINE, k - 2, g - CABLE - 3, 5, 8);
          px(ctx, IRON_HI, k - 1, g - CABLE - 2, 3, 6);
          px(ctx, C.snow, k - 1, g - CABLE - 3, 3, 1);
        },
      });
    }
  }
  // The bull wheels: the bottom station (a loading board), the top one (an unloading ramp of snow).
  if (vertical) {
    const bx = l.bottom.x + 6;
    out.push({
      z: l.bottom.y + 3,
      draw: () => {
        px(ctx, OUTLINE, l.bottom.x - 10, l.bottom.y - 1, 16, 4);
        px(ctx, "#8c8174", l.bottom.x - 9, l.bottom.y, 14, 2);
        px(ctx, OUTLINE, bx - 7, l.bottom.y - CABLE, 3, CABLE + 2);
        px(ctx, OUTLINE, bx + 5, l.bottom.y - CABLE, 3, CABLE + 2);
        px(ctx, "#8d949e", bx - 6, l.bottom.y - CABLE, 1, CABLE + 1);
        px(ctx, "#8d949e", bx + 6, l.bottom.y - CABLE, 1, CABLE + 1);
        bullWheel(ctx, bx, l.bottom.y - CABLE, t, turning);
      },
    });
    out.push({
      z: l.top.y - 1,
      draw: () => {
        px(ctx, C.snowShade, l.top.x - 14, l.top.y - 1, 15, 4);
        px(ctx, "#ffffff", l.top.x - 13, l.top.y - 1, 13, 2);
        px(ctx, OUTLINE, bx - 1, l.top.y - CABLE, 3, CABLE + 1);
        px(ctx, "#8d949e", bx, l.top.y - CABLE, 1, CABLE);
        bullWheel(ctx, bx, l.top.y - CABLE, t, turning);
      },
    });
  } else {
    const g = l.bottom.y;
    for (const [wx, ramp] of [
      [l.bottom.x - 3, true],
      [l.top.x + 3, false],
    ] as const) {
      out.push({
        z: g + 1,
        draw: () => {
          if (ramp) {
            px(ctx, OUTLINE, wx - 6, g - 1, 14, 4);
            px(ctx, "#8c8174", wx - 5, g, 12, 2);
          }
          px(ctx, OUTLINE, wx - 1, g - CABLE + 2, 3, CABLE - 2);
          px(ctx, "#8d949e", wx, g - CABLE + 3, 1, CABLE - 4);
          bullWheel(ctx, wx, g - CABLE + 1, t, turning);
        },
      });
    }
  }
  out.push(hutDrawable(ctx, l, info));
  // The summit flag at the top of the piste.
  const f = l.flag;
  out.push({
    z: f.y,
    draw: () => {
      px(ctx, OUTLINE, f.x - 1, f.y - 13, 3, 14);
      px(ctx, "#e6e9ee", f.x, f.y - 12, 1, 12);
      const flap = Math.floor(t * 3 + h2(f.x, 3) * 5) % 2;
      px(ctx, OUTLINE, f.x + 1, f.y - 13, 7, 5);
      px(ctx, C.red, f.x + 1, f.y - 12, flap ? 5 : 6, 3);
      px(ctx, C.redHi, f.x + 1, f.y - 12, flap ? 5 : 6, 1);
      if (flap) px(ctx, C.red, f.x + 6, f.y - 11, 1, 1);
    },
  });
  // The chairs going round (none where someone's riding, or a special guest).
  const busy: number[] = [];
  if (rider && t - rider.t < 0.3) busy.push(vertical ? rider.y : rider.x);
  const sp = special ? specialAt(l, t) : null;
  if (sp !== null) busy.push(sp);
  const len = vertical ? l.bottom.y - l.top.y : l.top.x - l.bottom.x;
  const free = (v: number) => !busy.some((b) => Math.abs(b - v) < 26);
  for (let i = 0; i * GAP < len; i++) {
    const u = (((run + i * GAP) % len) + len) % len;
    const d = (((run + i * GAP + GAP / 2) % len) + len) % len;
    if (vertical) {
      const yu = l.bottom.y - u;
      const yd = l.top.y + d;
      if (u > 4 && u < len - 4 && free(yu)) out.push({ z: yu - 1, draw: () => chairAt(ctx, l.bottom.x, yu, false, swing(t, i), true) });
      if (d > 4 && d < len - 4) out.push({ z: yd - 1, draw: () => chairAt(ctx, l.bottom.x + 12, yd, true, swing(t, i + 0.5), true) });
    } else {
      const xu = l.bottom.x + u;
      const xd = l.top.x - d;
      const g = l.bottom.y;
      if (d > 4 && d < len - 4) out.push({ z: g - 5, draw: () => chairAt(ctx, xd, g - 4, true, swing(t, i + 0.5), false) });
      if (u > 4 && u < len - 4 && free(xu)) out.push({ z: g - 1, draw: () => chairAt(ctx, xu, g, true, swing(t, i), false) });
    }
  }
  if (sp !== null && special) {
    const kind = special.kind;
    const gx = vertical ? l.bottom.x : sp;
    const gy = vertical ? sp : l.bottom.y;
    out.push({
      z: gy,
      draw: () => {
        const sw = swing(t, 3);
        chairAt(ctx, gx, gy, !vertical, sw, vertical);
        if (kind === "yeti") {
          const wave = Math.sin(t * 9) > 0 ? -1 : 0;
          ctx.drawImage(yeti(), gx + sw - 8, gy - 25);
          px(ctx, OUTLINE, gx + sw + 7, gy - 28 + wave, 3, 5);
          px(ctx, "#f4f6fa", gx + sw + 8, gy - 27 + wave, 1, 3);
        } else {
          const d = pet("dog", "sit", vertical ? "left" : "right", Math.floor(t * 0.8) % 6 === 0);
          ctx.drawImage(d, Math.round(gx + sw - d.width / 2), gy - 9 - d.height);
        }
        if (!vertical) return;
        px(ctx, OUTLINE, gx + sw - 7, gy - 17, 15, 9);
        px(ctx, C.red, gx + sw - 6, gy - 16, 13, 5);
        px(ctx, C.redHi, gx + sw - 6, gy - 16, 13, 1);
      },
    });
  }
  skierDecor(ctx, l, info, out);
  return out;
}

/** Where the special guest's chair is (ground y, or x on a phone), null once it's off the top. */
function specialAt(l: SkiLift, t: number): number | null {
  if (!special) return null;
  const u = (t - special.t0) * SPEED * 1.4;
  const len = l.axis === "y" ? l.bottom.y - l.top.y : l.top.x - l.bottom.x;
  if (u > len - 4) {
    special = null;
    return null;
  }
  return l.axis === "y" ? l.bottom.y - u : l.bottom.x + u;
}

export function liftLights(L: Layout, info: PaintInfo): Light[] {
  const l = cur;
  if (!l || L !== forL || info.night < 0.05) return [];
  const h = l.hut;
  const out: Light[] = [[h.x + 6, h.y + h.h - 8, 26, 0.85, "#ffc870", 0.2]];
  // A lamp on each station.
  if (l.axis === "y") {
    out.push([l.bottom.x + 6, l.bottom.y - CABLE - 4, 20, 0.6, "#fff0c8", 0.15]);
    out.push([l.top.x + 6, l.top.y - CABLE - 4, 20, 0.6, "#fff0c8", 0.15]);
  }
  return out;
}

// ------------------------------------------------------------------ the run down the piste

const V = 34;
const FALL = 0.5;
const DOWN = 1.7;
const UP = 1.5;
const STOP = 1.1;
const WALK = 24;

interface At {
  mode: "ski" | "air" | "fall" | "down" | "up" | "stop" | "walk" | "done";
  x: number;
  y: number;
  h: number;
  facing: Facing;
  pose: CharPose;
  /** The turn's direction (−1, 0, 1), and how far into the fall / the air. */
  turn: number;
  k: number;
}

function lengths(l: SkiLift): { len: number; uk: number; uw: number } {
  const len = l.axis === "y" ? l.finish.y - l.start.y : l.start.x - l.finish.x;
  const uk = l.axis === "y" ? l.kicker.y - l.start.y : l.start.x - l.kicker.x;
  return { len, uk, uw: Math.round(len * 0.62) };
}

/** Where along the piste (u) and how far across (the S-curves). */
function curve(l: SkiLift, r: Run, u: number, len: number, uk: number): { x: number; y: number; d: number } {
  const A = l.axis === "y" ? Math.max(4, Math.min(14, l.piste.w / 2 - 9)) : 3;
  const lam = l.axis === "y" ? 64 : 48;
  let amp = A * Math.min(1, u / 24) * Math.min(1, (len - u) / 24);
  if (r.kind === "jump") amp *= Math.min(1, Math.max(0, Math.abs(u - uk - 10) - 14) / 30);
  const off = Math.sin((u / lam) * Math.PI * 2) * amp;
  const d = Math.cos((u / lam) * Math.PI * 2) * amp;
  return l.axis === "y" ? { x: l.start.x + off, y: l.start.y + u, d } : { x: l.start.x - u, y: l.start.y + off, d };
}

function skierAt(l: SkiLift, r: Run, t: number): At {
  const e = t - r.t0;
  const { len, uk, uw } = lengths(l);
  const pause = r.kind === "wipeout" ? FALL + DOWN + UP : 0;
  const tw = uw / V;
  let u: number;
  if (r.kind === "wipeout" && e >= tw && e < tw + pause) {
    const c = curve(l, r, uw, len, uk);
    const k = e - tw;
    const mode = k < FALL ? "fall" : k < FALL + DOWN ? "down" : "up";
    return { mode, x: c.x, y: c.y, h: 0, facing: "front", pose: mode === "up" ? (Math.floor(k * 3) % 2 ? "raise" : "stand") : "stand", turn: 0, k: mode === "fall" ? k / FALL : k };
  }
  u = (e - (r.kind === "wipeout" && e >= tw ? pause : 0)) * V;
  if (u < len) {
    const c = curve(l, r, u, len, uk);
    const turn = Math.abs(c.d) < 0.6 ? 0 : Math.sign(c.d);
    if (r.kind === "jump" && u >= uk && u < uk + 34) {
      const k = (u - uk) / 34;
      const facing: Facing = r.trick === "spin" ? (["front", "right", "back", "left"] as const)[Math.min(3, Math.floor(k * 4))]! : l.axis === "y" ? "front" : "left";
      return { mode: "air", x: c.x, y: c.y, h: Math.round(Math.sin(k * Math.PI) * 15), facing, pose: r.trick === "grab" ? "raise" : "cheer", turn: 0, k };
    }
    let facing: Facing;
    if (r.board) facing = c.d >= 0 ? "front" : "back";
    else if (l.axis === "x") facing = "left";
    else facing = turn > 0 && Math.abs(c.d) > 6 ? "right" : turn < 0 && Math.abs(c.d) > 6 ? "left" : "front";
    return { mode: "ski", x: c.x, y: c.y, h: 0, facing, pose: "stand", turn, k: u / len };
  }
  const end = curve(l, r, len, len, uk);
  const es = e - pause - len / V;
  if (es < STOP) return { mode: "stop", x: end.x, y: end.y, h: 0, facing: "front", pose: es > 0.3 ? "cheer" : "stand", turn: 0, k: es };
  // Walking back in, skis (or the board) over the shoulder.
  const pts: Point[] = [{ x: end.x, y: end.y }, ...l.home];
  let s = (es - STOP) * WALK;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (s <= seg) {
      const k = seg ? s / seg : 1;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "front" : "back";
      const pose = (["walk0", "walk1", "walk2", "walk3"] as const)[Math.floor(t * 6) % 4]!;
      return { mode: "walk", x: a.x + dx * k, y: a.y + dy * k, h: 0, facing, pose, turn: 0, k: i === pts.length - 1 ? k : 0 };
    }
    s -= seg;
  }
  return { mode: "done", x: 0, y: 0, h: 0, facing: "front", pose: "stand", turn: 0, k: 0 };
}

/** Once a frame: tracks behind the skier, a spray of snow at each turn, on landing and at the stop. */
function stepSkier(l: SkiLift, t: number): void {
  if (spray.length > 0) spray = spray.filter((q) => t - q.t0 < 0.7);
  if (clouds.length > 0) clouds = clouds.filter((q) => t - q.t0 < 2.2);
  const r = skier;
  if (!r) return;
  const s = skierAt(l, r, t);
  if (s.mode === "done") {
    skier = null;
    return;
  }
  const burst = (key: string, n: number, dir: number, power: number) => {
    if (r.sprayed.has(key)) return;
    r.sprayed.add(key);
    for (let i = 0; i < n; i++) {
      const a = (l.axis === "y" ? (dir >= 0 ? 0 : Math.PI) : Math.PI / 2) + (Math.random() - 0.5) * 1.6;
      const v = power * (0.5 + Math.random() * 0.8);
      spray.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 6 - Math.random() * 10, t0: t });
    }
  };
  if (s.mode === "ski") {
    const sign = s.turn;
    if (sign !== 0 && r.sign !== 0 && sign !== r.sign) burst(`turn${Math.round(s.k * 100)}`, 7, -sign, 28);
    if (sign !== 0) r.sign = sign;
    if (!r.last || Math.hypot(s.x - r.last.x, s.y - r.last.y) >= 2) {
      tracks.push({ x: Math.round(s.x), y: Math.round(s.y), t, board: r.board });
      r.last = { x: s.x, y: s.y };
      if (tracks.length > 600) tracks.shift();
    }
  } else if (s.mode === "air") {
    r.last = null;
    if (s.k > 0.9) burst("land", 10, 0, 30);
  } else if (s.mode === "fall") {
    if (!r.sprayed.has("cloud")) {
      r.sprayed.add("cloud");
      clouds.push({ x: s.x, y: s.y, t0: t });
    }
  } else if (s.mode === "stop") {
    burst("stop", 14, 1, 36);
  }
}

/** A run's look: one of the office's people (or a stranger), in a beanie. */
function runLook(): Look {
  const seen = [...looks.values()];
  const base: Look = seen.length
    ? pick(seen)
    : { key: "cabin-skier", skin: "#e7b08a", hair: "#5a3a2a", hairStyle: "crop", shirt: "#3a8ad8", pants: "#2f3a4f", accessory: "none", accent: C.red };
  const accent = pick([C.red, C.mustard, "#e86aa8", "#3a8ad8", "#4fbf7a"]);
  return { ...base, accessory: "beanie", accent, key: `${base.key}|skier|${accent}` };
}

function speech(ctx: Ctx, x: number, y: number, text: string): void {
  const w = pixelTextWidth(text) + 6;
  const bx = Math.round(x - w / 2);
  px(ctx, OUTLINE, bx - 1, y - 1, w + 2, 9);
  px(ctx, "#ffffff", bx, y, w, 7);
  px(ctx, OUTLINE, Math.round(x) - 1, y + 8, 3, 2);
  px(ctx, "#ffffff", Math.round(x), y + 7, 1, 2);
  drawPixelText(ctx, text, bx + 3, y + 1, OUTLINE);
}

function gear(ctx: Ctx, r: Run, s: At, X: number, Y: number, vertical: boolean): void {
  // X, Y: feet (minus the height off the snow).
  if (s.mode === "walk") {
    if (r.board) {
      px(ctx, OUTLINE, X + 4, Y - 18, 4, 14);
      px(ctx, r.look.accent, X + 5, Y - 17, 2, 12);
    } else {
      ctx.fillStyle = OUTLINE;
      for (let i = 0; i < 16; i++) ctx.fillRect(X - 7 + i, Y - 22 + Math.round(i * 0.7), 2, 2);
      ctx.fillStyle = r.look.accent;
      for (let i = 0; i < 16; i++) ctx.fillRect(X - 6 + i, Y - 22 + Math.round(i * 0.7), 1, 1);
    }
    return;
  }
  const c = r.look.accent;
  if (r.board) {
    px(ctx, OUTLINE, X - 9, Y - 1, 19, 4);
    px(ctx, c, X - 8, Y, 17, 2);
    px(ctx, "#ffffff", X - 6, Y, 3, 1);
    return;
  }
  if (!vertical || s.facing === "left" || s.facing === "right") {
    const dir = s.facing === "right" ? 1 : -1;
    px(ctx, OUTLINE, X - 10, Y - 1, 21, 3);
    px(ctx, c, X - 9, Y, 19, 1);
    px(ctx, OUTLINE, dir > 0 ? X + 10 : X - 11, Y - 2, 2, 2);
  } else {
    // Seen from the front: the tips pointing at you, a little apart.
    const sp = s.turn > 0 ? 1 : s.turn < 0 ? -1 : 0;
    for (const dx of [-4, 2]) {
      px(ctx, OUTLINE, X + dx - 1 + sp, Y - 2, 4, 6);
      px(ctx, c, X + dx + sp, Y - 1, 2, 4);
    }
  }
  // Poles.
  if (s.mode === "ski" || s.mode === "stop") {
    ctx.fillStyle = "#8d949e";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(X - 7 - Math.floor(i / 4), Y - 10 + i, 1, 1);
      ctx.fillRect(X + 7 + Math.floor(i / 4), Y - 10 + i, 1, 1);
    }
  }
}

function goggles(ctx: Ctx, x: number, y: number, facing: Facing, accent: string): void {
  // x, y: the sprite's top left (head from row 3, eyes at row 8).
  if (facing === "back") {
    px(ctx, OUTLINE, x + 3, y + 8, 14, 1);
    return;
  }
  if (facing === "front") {
    px(ctx, OUTLINE, x + 3, y + 7, 14, 4);
    px(ctx, "#f2a63a", x + 5, y + 8, 4, 2);
    px(ctx, "#f2a63a", x + 11, y + 8, 4, 2);
    px(ctx, "#ffe08a", x + 5, y + 8, 1, 1);
    px(ctx, "#ffe08a", x + 11, y + 8, 1, 1);
    px(ctx, accent, x + 3, y + 8, 1, 1);
    px(ctx, accent, x + 16, y + 8, 1, 1);
    return;
  }
  const r = facing === "right";
  px(ctx, OUTLINE, r ? x + 8 : x + 3, y + 7, 9, 4);
  px(ctx, "#f2a63a", r ? x + 12 : x + 4, y + 8, 4, 2);
}

function skierDecor(ctx: Ctx, l: SkiLift, info: PaintInfo, out: Drawable[]): void {
  const t = info.t;
  const vertical = l.axis === "y";
  for (const q of spray) {
    const e = t - q.t0;
    out.push({
      z: q.y + 1,
      draw: () => {
        ctx.globalAlpha = Math.max(0, 1 - e / 0.7);
        px(ctx, "#ffffff", q.x + q.vx * e, q.y - 3 + q.vy * e + 30 * e * e, e < 0.3 ? 2 : 1, 1);
        ctx.globalAlpha = 1;
      },
    });
  }
  const r = skier;
  if (r) {
    const s = skierAt(l, r, t);
    if (s.mode !== "done") {
      out.push({
        z: s.y,
        draw: () => {
          const X = Math.round(s.x);
          const Y = Math.round(s.y) - s.h;
          if (s.h > 0) {
            ctx.globalAlpha = 0.25;
            px(ctx, "#5a6a8a", X - 5, Math.round(s.y), 10, 2);
            ctx.globalAlpha = 1;
          }
          if (s.mode === "fall" || s.mode === "down") {
            // Tumbling into the snow, then lying in it, skis every which way.
            const a = s.mode === "fall" ? s.k * (Math.PI / 2) * (vertical ? 1 : -1) : (Math.PI / 2) * (vertical ? 1 : -1);
            const spr = charSprite({ look: r.look, facing: "front", pose: "cheer", expr: "surprised" });
            ctx.save();
            ctx.translate(X, Y - 6);
            ctx.rotate(a);
            ctx.drawImage(spr, -10, -21);
            ctx.restore();
            if (s.mode === "down") {
              ctx.fillStyle = OUTLINE;
              ctx.fillRect(X - 14, Y - 9, 9, 2);
              ctx.fillRect(X + 6, Y - 2, 2, 9);
              ctx.fillStyle = r.look.accent;
              ctx.fillRect(X - 13, Y - 9, 8, 1);
              ctx.fillRect(X + 6, Y - 1, 1, 8);
            }
            return;
          }
          const spr = charSprite({ look: r.look, facing: s.facing, pose: s.pose, expr: s.mode === "walk" ? "open" : "happy" });
          if (s.mode !== "walk" && s.facing === "back") gear(ctx, r, s, X, Y, vertical);
          // Walking in at the door: fade through it.
          if (s.mode === "walk" && s.k > 0.7) ctx.globalAlpha = Math.max(0, 1 - (s.k - 0.7) / 0.3);
          if (s.mode === "walk") gear(ctx, r, s, X, Y, vertical);
          ctx.drawImage(spr, X - 10, Y - 27);
          goggles(ctx, X - 10, Y - 27 + (s.pose === "slump" ? 2 : 0), s.facing, r.look.accent);
          // A bobble on the beanie.
          px(ctx, "#ffffff", X - 1, Y - 27 + 1, 2, 2);
          ctx.globalAlpha = 1;
          if (s.mode !== "walk" && s.facing !== "back") gear(ctx, r, s, X, Y, vertical);
          const e = t - r.t0;
          if (e < 1.6) speech(ctx, X, Y - 40, "WATCH THIS!");
          else if (s.mode === "up") speech(ctx, X, Y - 40, "I'M OK!");
          else if (s.mode === "stop" && r.kind === "jump") speech(ctx, X, Y - 40, "STOMPED IT!");
        },
      });
    }
  }
  for (const c of clouds) {
    const e = t - c.t0;
    out.push({
      z: c.y + 2,
      draw: () => {
        ctx.globalAlpha = Math.max(0, Math.min(1, 1.3 - e / 1.7));
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 + 0.4;
          const rr = 4 + e * 9 + (i % 3) * 2;
          const cx = c.x + Math.cos(a) * rr;
          const cy = c.y - 6 + Math.sin(a) * rr * 0.55 - e * 4;
          const size = Math.round(5 + e * 4 - (i % 2) * 2);
          px(ctx, i % 3 ? "#ffffff" : "#eaf1f8", cx - size / 2, cy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      },
    });
  }
}

/** Send someone down the piste; onlookers near the bottom say something as it happens. */
function startRun(act: SceneryActions, l: SkiLift, kind?: RunKind): void {
  const k = kind ?? weighted<RunKind>([["run", 2], ["jump", 3], ["wipeout", 2]]);
  skier = { t0: act.t, kind: k, board: Math.random() < 0.4, trick: Math.random() < 0.5 ? "spin" : "grab", look: runLook(), sign: 0, last: null, sprayed: new Set() };
  const { len, uk, uw } = lengths(l);
  const near = act.near(l.finish.x, l.finish.y, 320);
  const a = near[0];
  const b = near[1] ?? near[0];
  if (a) act.say(a.id, pick(["Someone's coming down!", "Look, up on the piste!", "Who's that?"]), 2.4, 0.8);
  if (k === "jump" && b) act.say(b.id, pick(["Whoa, big air!", "Did you see that?!", "Send it!"]), 2.4, uk / V + 0.3);
  if (k === "wipeout" && b) act.say(b.id, pick(["Ouch!", "Yard sale!", "Oof. You OK?"]), 2.4, uw / V + 0.5);
  if (k === "run" && b) act.say(b.id, pick(["Nice turns!", "Smooth.", "Fresh corduroy!"]), 2.4, len / V);
}

function weighted<T extends string>(options: [T, number][]): T {
  let roll = Math.random() * options.reduce((n, [, w]) => n + w, 0);
  for (const [o, w] of options) {
    roll -= w;
    if (roll <= 0) return o;
  }
  return options[0]![0];
}

// ------------------------------------------------------------------ clicks

export function liftClickables(p: CabinPlan): SceneryClickable[] {
  const l = p.lift;
  if (!l) return [];
  const h = l.hut;
  return [
    { id: "lift-hut", rect: { x: h.x - 4, y: h.y + h.h - 22, w: h.w + 4, h: 22 }, hover: "The lift hut · ring the bell" },
    { id: "lift", rect: l.area, hover: "The chairlift · who's riding up?" },
  ];
}

const SAY = {
  stop: ["Not again…", "It stopped. Again.", "Swing, swing…", "Uh-oh."],
  restart: ["And we're off!", "Phew."],
  dog: ["A dog on the chairlift!", "Fondue, is that you?", "Good dog."],
  yeti: ["Was that… a yeti?", "Nice scarf, though."],
  bell: ["Ding ding!", "The lifty's in.", "Lift's open!"],
  ride: ["Woo-hoo!", "What a view!", "Top of the world!"],
  top: ["Hello down there!", "I can see the valley!", "Fresh snow up here!"],
};

export function liftClick(id: string, act: SceneryActions): string | null {
  const l = bind(act.L);
  if (!l) return null;
  const t = act.t;
  const say = (x: number, y: number, lines: readonly string[], delay = 0.4) => {
    const who = act.near(x, y, 320)[0];
    if (who) act.say(who.id, pick(lines), 2.6, delay);
  };
  if (id === "lift-hut") {
    bell = { t0: t };
    say(l.hut.x, l.hut.y, SAY.bell, 0.5);
    return "cab-ding";
  }
  if (id !== "lift") return null;
  // The summit flag: someone sets off down the piste.
  if (Math.hypot(act.at.x - l.flag.x - 2, act.at.y - l.flag.y + 7) <= 8) {
    if (skier) return null;
    startRun(act, l);
    return "cab-swoosh";
  }
  // Stopped: clicking gets it going again.
  if (stopped(t)) {
    stop = { t0: t - 6 };
    say(l.bottom.x, l.bottom.y, SAY.restart);
    return "cab-clank";
  }
  const riding = ride !== null && !ride.g.done;
  const kind = weighted<"ride" | "stop" | "special">(riding ? [["special", 1]] : [["ride", 5], ["stop", 2], ["special", 1]]);
  if (kind === "ride") {
    const spot: GatherSpot = {
      x: l.wave.x,
      y: l.wave.y,
      facing: "front",
      pose: "stand",
      activity: "riding the chairlift",
      path: [...l.way, { x: l.top.x, y: l.top.y }, { x: l.wave.x, y: l.wave.y }],
    };
    const g = act.gather([spot], 4.5, [
      { at: 0.2, who: 0, say: pick(SAY.ride), seconds: 2 },
      { at: 2.3, who: 0, say: pick(SAY.top), seconds: 2 },
    ]);
    if (g) {
      ride = { g, t0: t };
      return "cab-clank";
    }
  }
  if (kind === "stop" || (kind === "ride" && Math.random() < 0.5)) {
    stop = { t0: t };
    say(l.bottom.x, l.bottom.y, SAY.stop, 0.6);
    return "cab-clank";
  }
  if (special && specialAt(l, t) !== null) return null;
  const s: Special = Math.random() < 0.3 ? "yeti" : "dog";
  special = { kind: s, t0: t };
  say(l.bottom.x, l.bottom.y, SAY[s], 1.4);
  return "cab-clank";
}

/** Now and then, on a bright day, someone comes down the piste on their own. */
export function liftTick(act: SceneryActions): void {
  const l = bind(act.L);
  if (!l || skier || act.night > 0.5 || act.weather === "storm" || act.weather === "fog") return;
  // About once every 20 minutes (ticks come twice a second).
  if (Math.random() < 1 / 2400) startRun(act, l);
}
