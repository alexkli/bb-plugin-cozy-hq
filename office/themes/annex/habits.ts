// Dusty Annex: bad habits. You (the boss) smoke at the desk over an
// overflowing ashtray, put your feet up, eat takeaway out of the carton, doze
// off behind the paper and grumble at anyone who comes in; now and then a
// noise from your chair clears the room. The staff have their ways too, one
// at a time and now and then: a crafty smoke out of the corridor window,
// feeding the pigeons, peeking at the street through the blinds, fish in the
// microwave (everyone else fanning the air), dozing off on the keyboard, and
// a tower of files nobody may touch. Everything here is picked from the
// clock (no randomness), so it's the same for everyone watching.

import type { CharPose, Expression, Look } from "../../characters.ts";
import type { Facing, Layout, Rect, Spot } from "../../layout.ts";
import type { Drawable } from "../../life.ts";
import type { Gathering, Light, PaintInfo, PoseOf, SceneryActions, Theme } from "../../theme.ts";
import { Grid, OUTLINE, cached, hash } from "../../themekit.ts";
import { P } from "./pal.ts";
import { siteOf } from "./plan.ts";
import { sideWindows, type SideWindow } from "./street.ts";
import { HABIT_ACTIVITY, HABIT_LINES } from "./words.ts";

/** What you're up to at your desk, in turns of 40 seconds. */
export type BossDoing = "work" | "smoke" | "feet" | "takeaway" | "crisps" | "nap";
const TURN = 40;
const CYCLE: BossDoing[] = ["smoke", "feet", "work", "takeaway", "smoke", "nap", "crisps", "feet", "smoke", "work", "nap", "takeaway"];

/** Visitors or not: it's your office. */
export function bossDoing(t: number): BossDoing {
  return CYCLE[hash(`annex-boss-${Math.floor(t / TURN)}`) % CYCLE.length]!;
}

type ShowKind = "smoke" | "pigeon" | "blinds" | "fish";
const SHOWS: ShowKind[] = ["smoke", "fish", "blinds", "pigeon", "smoke", "blinds", "pigeon", "fish"];

interface Show {
  kind: ShowKind;
  g: Gathering;
  at: { x: number; y: number };
  win: SideWindow | null;
  /** The microwave (fish). */
  oven: Rect | null;
  /** The others have had their say. */
  reacted: boolean;
}

/** Everything that moves on, bound to one layout. */
const st = {
  L: null as Layout | null,
  show: null as Show | null,
  turn: 0,
  nextShow: 50,
  guests: 0,
  lastWave: -99,
  waveAt: -99,
  grumbled: -99,
  napWhenWaved: false,
  parp: null as { at: number; until: number } | null,
  parpReady: 60,
  doing: "work" as BossDoing,
  lastDoing: "work" as BossDoing,
  look: null as Look | null,
  /** When you were last drawn at your desk (the habits stay there when you go off putting). */
  atDesk: -99,
};

/** Who's doing what this frame (by agent seed), for `dress`. */
const roles = new Map<number, "nap" | "fan" | ShowKind>();

function bind(L: Layout): void {
  if (st.L === L) return;
  st.L = L;
  st.show = null;
  st.parp = null;
}

const pick = (list: readonly string[], k: number) => list[Math.abs(k) % list.length]!;

/** The kitchen counter's microwave, if the counter has one. */
function ovenOf(L: Layout): Rect | null {
  const c = L.props.find((p) => p.kind === "kitchen-counter");
  const w = c?.w ?? 0;
  return c && w >= 100 ? { x: c.x + w - 26, y: c.y, w: 22, h: 14 } : null;
}

function guestChairs(L: Layout): Spot[] {
  return cached(`annex|guestchairs|${L.W}x${L.H}|${L.spots.length}`, () => L.spots.filter((s) => s.kind === "boss-guest"));
}

// ------------------------------------------------------------------ tick: starting things

function startShow(act: SceneryActions, kind: ShowKind): Show | null {
  const L = act.L;
  const wins = sideWindows(L);
  const k = hash(`annex-show-${st.turn + 1}`);
  if (kind === "fish") {
    const oven = ovenOf(L);
    const tea = L.spots.find((s) => s.kind === "tea");
    if (!oven || !tea) return null;
    const x = oven.x + 11;
    const path = tea.path.map((p, i) => (i >= tea.path.length - 2 ? { ...p, x } : p));
    const at = { x, y: tea.y };
    const g = act.gather([{ x, y: at.y, facing: "back", pose: "stand", activity: HABIT_ACTIVITY.fish, path }], 34, [
      { at: 1, who: 0, say: pick(HABIT_LINES.fishCook, k), seconds: 2.4 },
      { at: 7, sound: "annex-ping" },
    ]);
    return g && { kind, g, at, win: null, oven, reacted: false };
  }
  // The smoker goes to the alley side (the fire escape); the others to the street.
  const side = kind === "smoke" ? "left" : "right";
  const list = wins.filter((w) => w.side === side);
  const win = list[(kind === "blinds" ? k + 1 : k) % list.length];
  if (!win) return null;
  const at = win.at;
  const facing: Facing = side;
  const lines = HABIT_LINES[kind];
  const g = act.gather(
    [{ x: at.x, y: at.y, facing, pose: "stand", activity: HABIT_ACTIVITY[kind], path: [{ x: at.x + (side === "left" ? 16 : -16), y: win.hall, c: true }, { x: at.x, y: at.y }] }],
    kind === "smoke" ? 36 : 26,
    [{ at: 2, who: 0, say: pick(lines, k), seconds: 2.6 }, ...(kind === "pigeon" ? [{ at: 4, sound: "annex-coo" }] : [])],
  );
  return g && { kind, g, at, win, oven: null, reacted: false };
}

function tick(act: SceneryActions): void {
  const L = act.L;
  bind(L);
  const t = act.t;
  // Who's sitting across your desk.
  const chairs = guestChairs(L);
  let guests = 0;
  for (const c of chairs) if (act.near(c.x, c.y, 2).length > 0) guests++;
  if (guests > st.guests && t > st.grumbled + 4) {
    act.say("boss", pick(st.doing === "nap" ? HABIT_LINES.pokeNap : HABIT_LINES.guests, hash(`g${Math.floor(t)}`)), 2.8, 1.2);
    st.grumbled = t;
  }
  st.guests = guests;
  // Clicked: a grumble instead of a cheery wave.
  if (st.waveAt > st.grumbled) {
    st.grumbled = st.waveAt;
    act.say("boss", pick(st.napWhenWaved ? HABIT_LINES.pokeNap : HABIT_LINES.poke, hash(`p${Math.floor(st.waveAt * 10)}`)), 2.6);
  }
  // Your turns: light up, nod off.
  if (st.doing !== st.lastDoing) {
    if (st.doing === "smoke") act.play("annex-lighter");
    if (st.doing === "nap") act.play("annex-snore");
    st.lastDoing = st.doing;
  }
  // Once in a while, with company: a noise from the chair, and nobody stays.
  if (st.parp && t > st.parp.until) st.parp = null;
  if (!st.parp && guests > 0 && t >= st.parpReady && hash(`annex-parp-${Math.floor(t / 15)}`) % 9 === 0) {
    st.parp = { at: t, until: t + 9 };
    st.parpReady = t + 150;
    act.play("annex-parp");
    act.say("boss", pick(HABIT_LINES.parp, hash(`pp${Math.floor(t)}`)), 2.4, 1.4);
    chairs.forEach((c, i) => {
      const who = act.near(c.x, c.y, 2)[0];
      if (who) act.say(who.id, pick(HABIT_LINES.parpGuests, hash(`pg${i}${Math.floor(t)}`)), 2.4, 3.6 + i * 1.8);
    });
  }
  // The staff's habits, one at a time.
  const show = st.show;
  if (show?.g.done) st.show = null;
  if (show && show.kind === "fish" && show.g.arrivedAt !== null && !show.reacted) {
    // Whoever's within smelling distance has something to say about it.
    show.reacted = true;
    const o = show.oven!;
    act.near(o.x + 11, o.y + 30, 150)
      .filter((p) => Math.hypot(p.x - show.at.x, p.y - show.at.y) > 3)
      .slice(0, 2)
      .forEach((p, i) => act.say(p.id, pick(HABIT_LINES.fishNose, hash(`fn${st.turn}${i}`)), 2.6, 9 + i * 3));
  }
  if (!st.show && t >= st.nextShow) {
    // Nobody free (or an office do on): try again in a bit.
    st.show = startShow(act, SHOWS[(st.turn + 1) % SHOWS.length]!);
    if (st.show) st.turn++;
    st.nextShow = t + (st.show ? 40 + (hash(`annex-next-${st.turn}`) % 40) : 8);
  }
}

// ------------------------------------------------------------------ pose: who does what

/** Some people nod off at the keyboard: one in five, for 45 seconds every few minutes. */
const sleepers = new Map<number, boolean>();
function dozing(seed: number, t: number): boolean {
  let sleeper = sleepers.get(seed);
  if (sleeper === undefined) sleepers.set(seed, (sleeper = hash(`annex-doze-${seed}`) % 5 === 0));
  return sleeper && Math.floor((t + (seed % 97)) / 45) % 5 === 0;
}

function stinking(t: number): Show | null {
  const s = st.show;
  return s && s.kind === "fish" && s.g.arrivedAt !== null && t > s.g.arrivedAt + 6 && !s.g.done ? s : null;
}

function pose(p: PoseOf, info: PaintInfo): { pose: CharPose; expr: Expression; facing?: Facing } | null {
  const t = info.t;
  if (p.kind === "boss") {
    st.atDesk = t;
    const waving = p.pose === "raise" || p.pose === "cheer";
    if (waving) {
      // A wave of the hand that means "go away".
      if (t - st.lastWave > 0.5) {
        st.waveAt = t;
        st.napWhenWaved = st.doing === "nap";
      }
      st.lastWave = t;
      return { pose: "raise", expr: "worried" };
    }
    st.doing = bossDoing(t);
    switch (st.doing) {
      case "work":
        return null;
      case "nap":
        return { pose: "nap", expr: "closed" };
      case "smoke":
        return { pose: Math.floor(t / 9) % 3 === 2 ? (Math.floor(t * 5) % 2 ? "type1" : "type0") : "sit-back", expr: Math.floor(t * 10) % 37 === 0 ? "blink" : "open" };
      default:
        return { pose: "sit-back", expr: Math.floor(t * 10) % 41 === 0 ? "blink" : st.doing === "feet" ? "happy" : "open" };
    }
  }
  roles.delete(p.seed);
  if (p.spot === "desk" && (p.pose === "type0" || p.pose === "type1") && dozing(p.seed, t)) {
    roles.set(p.seed, "nap");
    return { pose: "nap", expr: "closed" };
  }
  if (p.spot === "boss-guest" && st.parp && t > st.parp.at + 1.6) {
    roles.set(p.seed, "fan");
    return { pose: "raise", expr: "worried", facing: "front" };
  }
  const show = st.show;
  if (show && p.spot === "huddle" && Math.abs(p.x - show.at.x) < 2 && Math.abs(p.y - show.at.y) < 2) {
    roles.set(p.seed, show.kind);
    if (show.kind === "blinds") return { pose: "raise", expr: "focus" };
    if (show.kind === "fish" && show.g.arrivedAt !== null && t > show.g.arrivedAt + 8) return { pose: "cup", expr: "happy", facing: "front" };
    return null;
  }
  const stink = stinking(t);
  if (stink && p.spot !== null && Math.hypot(p.x - stink.at.x, p.y - stink.at.y) < 140) {
    roles.set(p.seed, "fan");
    return { pose: "raise", expr: "worried" };
  }
  return null;
}

// ------------------------------------------------------------------ drawing on people

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** Smoke curling up from (x, y), drifting `dx` px sideways as it goes. */
function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, rise: number, dx = 0): void {
  ctx.fillStyle = "#e4e2d8";
  for (let i = 0; i < 11; i++) {
    const ph = (t * 0.4 + i / 11) % 1;
    ctx.globalAlpha = 0.9 * (1 - ph * ph);
    const sx = x + Math.round(Math.sin(ph * 6 + i * 0.9) * (0.5 + ph * 2.5) + dx * ph);
    ctx.fillRect(sx, Math.round(y - ph * rise), ph > 0.35 ? 2 : 1, ph > 0.7 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

/** Little z's floating up from a sleeper. */
function zzz(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.35 + i / 2) % 1;
    const zx = Math.round(x + ph * 5);
    const zy = Math.round(y - ph * 9);
    ctx.globalAlpha = 1 - ph;
    px(ctx, zx - 1, zy - 1, 5, 5, OUTLINE);
    px(ctx, zx, zy, 3, 1, "#f4f0fa");
    px(ctx, zx + 1, zy + 1, 1, 1, "#f4f0fa");
    px(ctx, zx, zy + 2, 3, 1, "#f4f0fa");
  }
  ctx.globalAlpha = 1;
}

/** A sheet of paper flapping in a raised hand. */
function fanning(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const k = Math.floor(t * 8) % 2;
  px(ctx, x + 14 + k, y + 7, 5, 5, OUTLINE);
  px(ctx, x + 15 + k, y + 8, 3, 3, "#e6dfc8");
  px(ctx, x + 15 + k, y + 9, 2, 1, "#a59a7c");
}

/** The staff: drawn after each person's sprite (x, y: the sprite's top-left). */
export function dressHabit(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number }, t: number): void {
  const role = roles.get(a.seed);
  if (!role) return;
  const { x, y } = a;
  switch (role) {
    case "nap":
      zzz(ctx, x + 13, y + 4, t + (a.seed % 7));
      break;
    case "fan":
      fanning(ctx, x, y, t + (a.seed % 3) * 0.1);
      break;
    case "smoke": {
      // Hand up to the mouth, the cigarette out of the window, the smoke out into the alley.
      if (a.facing !== "left") break;
      const drag = (t % 6) < 1.2;
      px(ctx, x + 5, y + 12, 2, 3, OUTLINE);
      px(ctx, x + 5, y + 12, 1, 2, "#e0b090");
      px(ctx, x + 2, y + 11, 3, 1, "#e8e4d8");
      px(ctx, x + 1, y + 11, 1, 1, drag ? "#ffcf5a" : "#e0602a");
      smoke(ctx, x + 1, y + 10, t, 14, -10);
      break;
    }
    case "pigeon": {
      if (a.facing !== "right") break;
      px(ctx, x + 15, y + 15, 4, 2, OUTLINE);
      px(ctx, x + 16, y + 15, 2, 1, "#e0b090");
      // Crumbs out of the window, down to the pavement.
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.8 + i / 3) % 1;
        px(ctx, Math.round(x + 19 + ph * 8), Math.round(y + 16 + ph * ph * 12), 1, 1, "#d8c090");
      }
      break;
    }
    default:
      break;
  }
}

/** You at your desk: the cigarette, the carton, the crisps, the paper over your face. */
export function dressBoss(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; look?: Look }, t: number): void {
  if (v.look) st.look = v.look;
  if (st.atDesk !== t || v.facing !== "front" || (v.pose === "raise" && st.lastWave === t)) return;
  const { x, y } = v;
  switch (st.doing) {
    case "smoke": {
      // Out of the corner of the mouth; a long drag every few seconds.
      const drag = (t % 7) < 1.1;
      px(ctx, x + 10, y + 10, 8, 3, OUTLINE);
      px(ctx, x + 10, y + 11, 1, 1, "#c8a060");
      px(ctx, x + 11, y + 11, 5, 1, "#f2eee2");
      px(ctx, x + 16, y + 11, 1, 1, drag ? "#ffd84a" : "#ff6a2a");
      smoke(ctx, x + 16, y + 9, t, 22, 3);
      if ((t % 7) > 1.3 && (t % 7) < 2.6) {
        // Breathing it out.
        const k = ((t % 7) - 1.3) / 1.3;
        ctx.globalAlpha = 0.5 * (1 - k);
        px(ctx, x + 7 - Math.round(k * 3), y + 10 - Math.round(k * 6), 3, 2, "#d8d6cc");
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "takeaway": {
      // The carton in one hand, chopsticks going back and forth.
      px(ctx, x + 2, y + 14, 7, 6, OUTLINE);
      px(ctx, x + 3, y + 15, 5, 4, "#e2dccb");
      px(ctx, x + 3, y + 15, 5, 1, "#f0ebdc");
      px(ctx, x + 4, y + 17, 3, 1, P.red);
      const bite = (t % 1.8) < 0.55;
      if (bite) {
        px(ctx, x + 7, y + 11, 1, 4, "#8a6a3a");
        px(ctx, x + 8, y + 11, 1, 4, "#a8865a");
        px(ctx, x + 8, y + 12, 1, 2, "#e8d890");
      } else {
        px(ctx, x + 5, y + 11, 1, 4, "#8a6a3a");
        px(ctx, x + 6, y + 12, 1, 3, "#a8865a");
      }
      break;
    }
    case "crisps": {
      px(ctx, x + 2, y + 13, 7, 8, OUTLINE);
      px(ctx, x + 3, y + 14, 5, 6, "#4a6a9a");
      px(ctx, x + 3, y + 14, 5, 1, "#c8ccd4");
      px(ctx, x + 4, y + 16, 2, 2, "#d8b84a");
      if ((t % 2.2) < 0.5) {
        px(ctx, x + 8, y + 11, 2, 2, "#e0b090");
        px(ctx, x + 9, y + 13 + Math.round((t % 0.5) * 8), 1, 1, "#d8b84a");
      }
      break;
    }
    case "nap": {
      // The paper over the face, rising and falling.
      const lift = Math.floor(t / 1.6) % 2;
      const top = y + 6 - lift;
      px(ctx, x + 2, top, 16, 9, OUTLINE);
      px(ctx, x + 3, top + 1, 14, 7, "#d8d2c0");
      px(ctx, x + 3, top + 1, 14, 1, "#e8e2d0");
      px(ctx, x + 4, top + 2, 8, 1, "#3a3630");
      px(ctx, x + 4, top + 4, 4, 3, "#7a766a");
      for (let r = 4; r < 8; r += 2) px(ctx, x + 9, top + r, 7, 1, "#9a968a");
      px(ctx, x + 10, top + 1, 1, 7, "#b8b2a0");
      zzz(ctx, x + 16, y + 3, t);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ on the desks and round the building

/** An overflowing ashtray, 9×6. */
function ashtray(): HTMLCanvasElement {
  return cached("annex|ashtray", () => {
    const g = new Grid(11, 7);
    g.ellipse(5, 3.5, 4.5, 2.5, "#8c8e86");
    g.ellipse(5, 3.2, 3.2, 1.6, "#5a5c56");
    g.rect(3, 2, 4, 2, "#9a968a");
    for (const [bx, by] of [[2, 2], [6, 1], [8, 3], [4, 4], [1, 4]] as const) g.set(bx, by, "#ece8dc").set(bx + 1, by, "#c8a060");
    g.set(9, 5, "#ece8dc").set(10, 5, "#c8a060");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A mug with a stain down the side, and half a sandwich on a plate (16×8). */
function lunch(): HTMLCanvasElement {
  return cached("annex|lunch", () => {
    const g = new Grid(18, 9);
    g.rect(1, 1, 4, 5, "#d8d0b8");
    g.rect(1, 1, 4, 1, "#5a3a24");
    g.rect(2, 3, 1, 3, "#a87a4a");
    g.set(5, 2, "#d8d0b8").set(5, 3, "#d8d0b8");
    g.ellipse(12, 5.5, 5, 2.2, "#e6e2d6");
    g.rect(9, 3, 6, 3, "#d8b880");
    g.rect(9, 3, 6, 1, "#e8d0a0");
    g.rect(10, 5, 4, 1, "#7a9a4a");
    g.set(14, 3, "#e6e2d6").set(13, 3, "#e6e2d6").set(14, 4, "#e6e2d6");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A tower of files, leaning (8×26). */
function fileTower(seed: number): HTMLCanvasElement {
  return cached(`annex|filetower|${seed % 3}`, () => {
    const g = new Grid(11, 30);
    const colors = ["#6a7a5a", "#d3c8a6", "#8a6a3a", "#5a6470", "#c8b080", "#e6dfc8"];
    for (let i = 0; i < 9; i++) {
      const y = 26 - i * 3;
      const dx = Math.round(Math.sin(i * 0.7 + seed) * 1.2) + (i > 5 ? (seed % 2 ? 1 : -1) : 0);
      g.rect(2 + dx, y, 7, 3, colors[(i + seed) % colors.length]!);
      g.rect(2 + dx, y, 7, 1, "#e6dfc8");
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A pigeon on the pavement, pecking or not (6×5). */
function pigeon(peck: boolean): HTMLCanvasElement {
  return cached(`annex|pigeon|${peck}`, () => {
    const g = new Grid(8, 7);
    g.rect(2, 3, 4, 2, "#8a8e94");
    g.rect(1, 3, 1, 1, "#6a6e74");
    g.set(peck ? 6 : 5, peck ? 4 : 1, "#6a7a74").set(peck ? 6 : 5, peck ? 3 : 2, "#7a8a84");
    g.set(5, 3, "#5a7a6a");
    g.set(3, 5, "#c87a6a").set(4, 5, "#c87a6a");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

export function habitDecor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  bind(L);
  const t = info.t;
  const out: Drawable[] = [];
  // Your desk: the ashtray, the mug, the sandwich; your feet when they're up.
  const d = L.boss.desk;
  out.push({
    z: d.y + 22.6,
    draw: () => {
      ctx.drawImage(lunch(), d.x + 3, d.y + 1);
      ctx.drawImage(ashtray(), d.x + d.w - 13, d.y + 6);
      if (st.doing !== "smoke") smoke(ctx, d.x + d.w - 5, d.y + 7, t, 8);
      if (st.doing === "feet" && st.atDesk === t && t - st.lastWave > 0.3) {
        // Up on the desk, crossed at the ankle, soles to the visitors.
        const sx = Math.round(L.boss.seat.x);
        const pants = st.look?.pants ?? "#3a3a40";
        px(ctx, sx - 6, d.y - 3, 12, 9, OUTLINE);
        px(ctx, sx - 5, d.y - 3, 4, 8, pants);
        px(ctx, sx + 1, d.y - 3, 4, 8, pants);
        px(ctx, sx - 1, d.y - 1, 2, 6, pants);
        px(ctx, sx - 5, d.y - 3, 10, 1, "rgba(0,0,0,0.3)");
        for (const fx of [sx - 8, sx + 2]) {
          px(ctx, fx, d.y + 4, 7, 7, OUTLINE);
          px(ctx, fx + 1, d.y + 5, 5, 5, "#8a7a62");
          px(ctx, fx + 1, d.y + 8, 5, 2, "#5a4a3a");
          px(ctx, fx + 2, d.y + 6, 3, 1, "#a8987a");
          px(ctx, fx + 1, d.y + 5, 5, 1, "#3a2a20");
        }
      }
    },
  });
  // Towers of files on some desks: don't touch, there's a system.
  const hoards = cached(`annex|hoards|${L.W}x${L.H}|${L.desks.length}`, () =>
    L.desks.flatMap((desk, i) => (hash(`annex-hoard-${i}`) % 8 === 1 ? [{ canvas: fileTower(i), x: desk.side === "north" ? desk.x + 2 : desk.x + 36, y: desk.y - 12, z: desk.y + 26.7 }] : [])),
  );
  for (const h of hoards) out.push({ z: h.z, draw: () => ctx.drawImage(h.canvas, h.x, h.y) });
  const show = st.show;
  if (show && show.g.arrivedAt !== null && !show.g.done) {
    const since = t - show.g.arrivedAt;
    const w = show.win;
    if (w) {
      out.push({
        z: w.hall + 1.5,
        draw: () => {
          const g = w.r;
          if (show.kind === "blinds") {
            // The blind, two slats held apart.
            for (let yy = g.y; yy < g.y + g.h; yy += 2) px(ctx, g.x + 1, yy, g.w - 2, 1, "#c8c0a0");
            px(ctx, g.x + 1, g.y + 5, g.w - 2, 2, "#2a2a2c");
          } else {
            // Cracked open at the bottom.
            px(ctx, g.x + 1, g.y + 8, g.w - 2, 4, "#1e1c1c");
          }
        },
      });
    }
    if (show.kind === "pigeon" && w) {
      // Two regulars on the pavement below.
      const s = siteOf(L);
      const x0 = s.x + s.w + 3;
      if (L.W - x0 >= 8) {
        for (let i = 0; i < 2; i++) {
          const arrive = Math.min(1, Math.max(0, (since - 1 - i) / 1.5));
          const bx = Math.round(x0 + 2 + i * 6 + (1 - arrive) * 30);
          const by = Math.round(w.hall + 4 + i * 5 - (1 - arrive) * 20);
          out.push({ z: by + 5, draw: () => ctx.drawImage(pigeon(arrive === 1 && Math.floor(t * 3 + i) % 2 === 0), bx, by) });
        }
      }
    }
    const stink = stinking(t);
    if (stink?.oven) {
      const o = stink.oven;
      out.push({
        z: o.y + 40,
        draw: () => {
          // Wavy green lines off the microwave, and off the bowl once it's out.
          const turned = t > stink.g.arrivedAt! + 8;
          const from = turned ? [stink.at.x - 6, stink.at.y - 14] : [o.x + 3, o.y - 1];
          for (let i = 0; i < 3; i++) {
            const ph = (t * 0.45 + i / 3) % 1;
            ctx.globalAlpha = 0.9 * (1 - ph * ph);
            const bx = from[0]! + i * 6;
            for (let j = 0; j < 5; j++) {
              const lx = bx + Math.round(Math.sin((j + ph * 6) * 1.3) * 1.5);
              const ly = Math.round(from[1]! - ph * 20 - j * 3);
              ctx.fillStyle = "#4a5a2a";
              ctx.fillRect(lx - 1, ly, 1, 3);
              ctx.fillStyle = "#b8d060";
              ctx.fillRect(lx, ly, 1, 3);
            }
          }
          ctx.globalAlpha = 1;
        },
      });
    }
  }
  return out;
}

/** A haze in your office while you smoke. */
export function habitOverlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  if (st.L !== L || st.doing !== "smoke" || info.t - st.atDesk > 0.5) return;
  const r = L.boss.room;
  ctx.fillStyle = "rgba(200,196,180,0.06)";
  ctx.fillRect(r.x, r.y - 8, r.w, r.h + 8);
}

/** The glow of a cigarette in the dark. */
export function habitLights(L: Layout, info: PaintInfo): Light[] {
  if (st.L !== L) return [];
  const out: Light[] = [];
  const glow = 0.5 + ((info.t % 7) < 1.1 ? 0.4 : 0);
  if (st.doing === "smoke" && info.t - st.atDesk < 0.5) out.push([Math.round(L.boss.seat.x + 4), Math.round(L.boss.seat.y - 16), 10, glow, "#ff8a3a", 0.6]);
  const s = st.show;
  if (s?.kind === "smoke" && s.g.arrivedAt !== null && !s.g.done) out.push([s.at.x - 9, s.at.y - 16, 10, glow, "#ff8a3a", 0.6]);
  return out;
}

export const HABITS: Pick<Theme, "pose" | "tick"> = { pose, tick };
