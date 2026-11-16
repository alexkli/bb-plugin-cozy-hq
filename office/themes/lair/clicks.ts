// Villain's Lair: things to click. The big red button (confetti, a red
// alert, a disco ball, the helicopter, the trapdoor or the chair swivelling
// round to reveal you and the cat), the world map that targets a city with
// pizza, the countdown that always stops at 00:01, the monorail, the lava
// lake (bubbles, a surfing duck, a fountain, marshmallows on long forks), the
// trapdoor over the ball pit, and the tape computers.
//
// Clicks only start things; everything is drawn from the live layers by the
// animation clock (see live.ts).

import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Layout } from "../../layout.ts";
import { cached, drawPixelText, Grid, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { CITIES, mapPoint } from "./atlas.ts";
import { fluffyCat } from "./critters.ts";
import { C } from "./kit.ts";
import { planOf, type LairPlan } from "./plan.ts";
import { heli } from "./view.ts";
import { LINES as W, SHOWS, type ClickLine } from "./words.ts";

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

function cues(list: readonly ClickLine[]): GatherCue[] {
  return list.map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 24 ? 3.8 : 2.6, sound }));
}

// ------------------------------------------------------------------ what's going on

type ButtonKind = "confetti" | "alert" | "disco" | "heli" | "trapdoor" | "swivel";
type Passenger = "cat" | "pizza" | "ducks" | "sleeper" | "palm" | "flamingo";
type LavaKind = "bubble" | "duck" | "fountain";

let forL: Layout | null = null;
let fx: { kind: "confetti" | "alert" | "disco"; t0: number } | null = null;
let swivel: { t0: number } | null = null;
let pit: { t0: number; g: Gathering | null; shut?: number } | null = null;
let target: { t0: number; city: (typeof CITIES)[number] } | null = null;
let countdown: { t0: number } | null = null;
let train: { t0: number; passenger: Passenger } | null = null;
let lava: { kind: LavaKind; t0: number; x: number }[] = [];
let roast: { g: Gathering; spots: GatherSpot[] } | null = null;
let tapes: { t0: number } | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  fx = null;
  swivel = null;
  pit = null;
  target = null;
  countdown = null;
  train = null;
  lava = [];
  roast = null;
  tapes = null;
}

// ------------------------------------------------------------------ what can be clicked

export function lairClickables(L: Layout): SceneryClickable[] {
  bind(L);
  const plan = planOf(L);
  if (!plan) return [];
  const out: SceneryClickable[] = [];
  const b = plan.button;
  out.push({ id: "button", rect: b, hover: W.hover.button });
  out.push({ id: "map", rect: plan.map, hover: W.hover.map });
  const cd = plan.countdown;
  out.push({ id: "countdown", rect: { x: cd.x - 2, y: cd.y - 2, w: cd.w + 4, h: cd.h + 4 }, hover: W.hover.countdown });
  plan.tapes.forEach((t, i) => out.push({ id: `tapes-${i}`, rect: t, hover: W.hover.tapes }));
  out.push({ id: "hatch", rect: { x: plan.hatch.x - 2, y: plan.hatch.y - 2, w: plan.hatch.w + 4, h: plan.hatch.h + 4 }, hover: W.hover.hatch });
  const c = plan.crater;
  if (c && plan.rail) {
    const st = plan.rail.station;
    out.push({ id: "monorail", rect: { x: st - 40, y: c.y + 2, w: 80, h: c.h - 2 }, hover: W.hover.monorail });
    out.push({ id: "lava", rect: { x: 0, y: c.y + 2, w: L.W, h: c.h - 2 }, hover: W.hover.lava });
  }
  return out;
}

export function lairClick(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const plan = planOf(act.L);
  if (!plan) return null;
  if (id === "button") return clickButton(plan, act);
  if (id === "map") return clickMap(plan, act);
  if (id === "countdown") return clickCountdown(plan, act);
  if (id === "hatch") return openPit(plan, act) ?? "lair-trapdoor";
  if (id === "monorail") return callTrain(plan, act);
  if (id === "lava") return clickLava(plan, act);
  if (id.startsWith("tapes-")) {
    tapes = { t0: act.t };
    const t = plan.tapes[Number(id.slice(6))];
    if (t) mutter(act, t.x + t.w / 2, t.y + t.h + 20, W.tapes, 0.8, 120);
    return "lair-tapes";
  }
  return null;
}

/** Whoever's closest says one of these (after a beat). */
function mutter(act: SceneryActions, x: number, y: number, lines: readonly string[], delay = 0.6, r = 100): void {
  const who = act.near(x, y, r)[0];
  if (who) act.say(who.id, pick(lines), 2.8, delay);
}

function clickButton(plan: LairPlan, act: SceneryActions): string | null {
  const recent = (t0: number | undefined, s: number) => t0 !== undefined && act.t - t0 < s;
  const options: [ButtonKind, number][] = [
    ["confetti", 3],
    ["alert", 2],
    ["disco", 2],
    ["trapdoor", 3],
    ["swivel", 3],
  ];
  if (act.L.wall.windows.length > 0 && !recent(heli.liftAt, 10)) options.push(["heli", 2]);
  const kind = weighted(options.filter(([k]) => !(k === "swivel" && swivel && recent(swivel.t0, 10)) && !(k === "trapdoor" && pit && recent(pit.t0, 14))));
  const b = plan.button;
  switch (kind) {
    case "swivel":
      swivel = { t0: act.t };
      act.say("boss", pick(W.swivelYou), 3.2, 3.1);
      mutter(act, b.x, b.y + 40, W.swivelNear, 5.2, 120);
      return "lair-swivel";
    case "trapdoor":
      return openPit(plan, act) ?? "lair-trapdoor";
    case "heli":
      heli.liftAt = act.t;
      mutter(act, act.L.wall.windows[act.L.wall.windows.length - 1]!.x, 90, W.heli, 1.2, 160);
      return "lair-heli";
    default:
      fx = { kind, t0: act.t };
      mutter(act, act.L.eventArea.x + act.L.eventArea.w / 2, act.L.eventArea.y + act.L.eventArea.h / 2, W[kind], 1.2, 220);
      return kind === "confetti" ? "lair-confetti" : kind === "alert" ? "lair-klaxon" : "lair-disco";
  }
}

/** The trapdoor drops open over the ball pit; idle people come and hop in. */
function openPit(plan: LairPlan, act: SceneryActions): string | null {
  if (pit && act.t - pit.t0 < 14 && !(pit.g?.done ?? false)) return null;
  const h = plan.hatch;
  const halls = act.L.net.halls;
  const above = halls.filter((y) => y < h.y);
  const hall = above.length > 0 ? Math.max(...above) : halls.reduce((b, y) => (Math.abs(y - h.y) < Math.abs(b - h.y) ? y : b));
  const spots: GatherSpot[] = [7, 15, 23].map((dx, i) => {
    const x = h.x + dx;
    const y = h.y + (i === 1 ? 12 : 10);
    return { x, y, facing: "front", pose: "stand", activity: SHOWS.pitActivity, path: [{ x, y: hall, c: true }, { x, y }] };
  });
  const g = act.gather(spots, 11, cues(SHOWS.pit), 1);
  pit = { t0: act.t, g };
  return "lair-trapdoor";
}

function clickMap(plan: LairPlan, act: SceneryActions): string {
  const city = pick(CITIES.filter((c) => c !== target?.city));
  target = { t0: act.t, city };
  const m = plan.map;
  const who = act.near(m.x + m.w / 2, m.y + m.h + 60, 140)[0];
  if (who) {
    act.say(who.id, `${W.targetPrefix}${city[0]}.`, 2.6, 2.2);
    act.say(who.id, pick(W.target), 2.8, 5.2);
  }
  return "lair-target";
}

function clickCountdown(plan: LairPlan, act: SceneryActions): string | null {
  if (countdown && act.t - countdown.t0 < 14) return null;
  countdown = { t0: act.t };
  const cd = plan.countdown;
  mutter(act, cd.x + cd.w / 2, cd.y + 90, W.countdown, 10.2, 160);
  return "lair-countdown";
}

function callTrain(plan: LairPlan, act: SceneryActions): string {
  if (train && act.t - train.t0 < TRAIN_T) return "lair-chime";
  train = { t0: act.t, passenger: pick<Passenger>(["cat", "pizza", "ducks", "sleeper", "palm", "flamingo"]) };
  const r = plan.rail!;
  mutter(act, r.station, plan.crater!.y - 10, W.monorail, 4.2, 120);
  return "lair-whoosh";
}

function clickLava(plan: LairPlan, act: SceneryActions): string {
  const c = plan.crater!;
  const x = Math.round(Math.max(12, Math.min(act.L.W - 12, act.at.x)));
  if ((roast === null || roast.g.done) && plan.railSpots.length > 0 && Math.random() < 0.4) {
    const spots = plan.railSpots.map(
      (s): GatherSpot => ({ x: s.x, y: s.y, facing: "front", pose: "stand", activity: SHOWS.roastActivity, path: [{ x: s.aisle, y: s.hall, c: true }, { x: s.aisle, y: s.y }, { x: s.x, y: s.y }] }),
    );
    const g = act.gather(spots, 14, cues(SHOWS.roast), 1);
    if (g) {
      roast = { g, spots };
      return "lair-sizzle";
    }
  }
  const kind = weighted<LavaKind>([
    ["bubble", 4],
    ["duck", 2],
    ["fountain", 2],
  ]);
  lava.push({ kind, t0: act.t, x });
  if (lava.length > 6) lava.shift();
  mutter(act, x, c.y - 6, kind === "bubble" ? W.bubble : kind === "duck" ? W.duck : W.fountain, kind === "bubble" ? 1.4 : 1.8, 110);
  return kind === "bubble" ? "lair-blorp" : kind === "duck" ? "lair-squeak" : "lair-fountain";
}

// ------------------------------------------------------------------ the monorail

const TRAIN_T = 15;
const CAR_W = 64;
/** Idle cars pass every so often without stopping. */
const PASS_EVERY = 46;
const PASS_T = 11;

/** The car's center x (or null when it's off the panel), whether it stands at the station, and who's riding. */
export function trainAt(plan: LairPlan, W: number, t: number): { x: number; stopped: boolean; passenger: Passenger | null } | null {
  const r = plan.rail;
  if (!r) return null;
  if (train && t - train.t0 < TRAIN_T) {
    const tt = t - train.t0;
    const st = r.station;
    if (tt < 4) {
      const s = tt / 4;
      return { x: st - (st + CAR_W) * (1 - s) * (1 - s), stopped: false, passenger: train.passenger };
    }
    if (tt < 10) return { x: st, stopped: true, passenger: train.passenger };
    const s = (tt - 10) / 5;
    return { x: st + (W - st + CAR_W) * s * s, stopped: false, passenger: train.passenger };
  }
  const k = t % PASS_EVERY;
  if (k > PASS_T) return null;
  const leftward = Math.floor(t / PASS_EVERY) % 2 === 1;
  const s = k / PASS_T;
  const x = -CAR_W + (W + 2 * CAR_W) * s;
  return { x: leftward ? W - x : x, stopped: false, passenger: null };
}

const carSprite = () =>
  cached("lair|monorail-car", () => {
    const g = new Grid(CAR_W, 14);
    g.rrect(0, 1, CAR_W, 11, "#eeeae2", 4);
    g.rect(3, 1, CAR_W - 6, 1, "#ffffff");
    g.rect(0, 8, CAR_W, 2, C.velvet);
    g.rect(0, 10, CAR_W, 1, C.velvetLo);
    for (let x = 8; x < CAR_W - 10; x += 12) g.rect(x, 3, 8, 4, "#1f3a4a");
    g.rect(1, 3, 4, 4, "#1f3a4a").rect(CAR_W - 5, 3, 4, 4, "#1f3a4a");
    g.rect(5, 12, CAR_W - 10, 2, C.steelDk);
    g.outline(OUTLINE);
    return g.toCanvas();
  });

function drawPassenger(ctx: Ctx, p: Passenger, wx: number, wy: number, t: number): void {
  switch (p) {
    case "cat":
      ctx.drawImage(fluffyCat("sit", "right", Math.floor(t * 2) % 5 === 0), wx - 4, wy - 7);
      break;
    case "pizza":
      for (let i = 0; i < 3; i++) {
        rect(ctx, wx - 3, wy + 1 - i * 2, 9, 2, i % 2 ? "#c9a36a" : "#e0bf86");
        rect(ctx, wx - 3, wy + 1 - i * 2, 9, 1, "#f2dcae");
      }
      break;
    case "ducks":
      for (let i = 0; i < 3; i++) {
        rect(ctx, wx - 4 + i * 4, wy, 3, 2, "#ffd84a");
        rect(ctx, wx - 3 + i * 4, wy - 1, 2, 1, "#ffd84a");
        rect(ctx, wx - 1 + i * 4, wy - 1, 1, 1, C.orange);
      }
      break;
    case "sleeper":
      rect(ctx, wx - 2, wy - 2, 5, 4, "#e8b48a");
      rect(ctx, wx - 2, wy - 3, 5, 1, "#4a2f22");
      drawPixelText(ctx, "Z", wx + 4, wy - 7 - (Math.floor(t * 2) % 2), "#ffffff");
      break;
    case "palm":
      rect(ctx, wx, wy - 3, 1, 5, "#8a6a42");
      rect(ctx, wx - 3, wy - 4, 7, 1, C.leaf);
      rect(ctx, wx - 2, wy - 5, 5, 1, C.leafHi);
      break;
    case "flamingo":
      rect(ctx, wx - 2, wy - 1, 5, 3, "#ff8fb0");
      rect(ctx, wx + 2, wy - 5, 1, 4, "#ff8fb0");
      rect(ctx, wx + 2, wy - 6, 2, 1, "#ff8fb0");
      rect(ctx, wx + 4, wy - 6, 1, 1, C.ink);
      break;
  }
}

function drawTrain(ctx: Ctx, plan: LairPlan, L: Layout, t: number): void {
  const at = trainAt(plan, L.W, t);
  if (!at) return;
  const r = plan.rail!;
  const x = Math.round(at.x - CAR_W / 2);
  const y = r.y - 13;
  ctx.drawImage(carSprite(), x, y);
  // Silhouettes in the windows, the passenger by the door.
  for (let i = 0, wx = x + 9; wx < x + CAR_W - 12; i++, wx += 12) {
    if (at.passenger && i === 2) continue;
    if ((i * 7 + Math.floor(t / PASS_EVERY)) % 3 === 0) rect(ctx, wx + 3, y + 5, 3, 3, "#0e1e28");
  }
  if (at.passenger) drawPassenger(ctx, at.passenger, x + 9 + 24 + 4, y + 5, t);
  if (at.stopped) {
    // Doors open: a bright gap.
    const tt = train ? t - train.t0 - 4 : 0;
    const open = Math.min(1, tt / 0.6, (6 - tt) / 0.6);
    if (open > 0) rect(ctx, x + 30, y + 2, Math.round(4 * open), 9, "#fff2c0");
  }
}

// ------------------------------------------------------------------ the trapdoor and the ball pit

const BALLS = ["#ff4a3a", "#ffd84a", "#4ab0ff", "#7ce07c", "#ff8fd0", "#ffffff"];

/** How open the trapdoor is (0 shut .. 1 open): open while people play, shut once they've gone (or after a while if nobody came). */
function pitOpen(t: number): number {
  if (!pit) return 0;
  const tt = t - pit.t0;
  const leaving = pit.g ? pit.g.done : tt > 7;
  if (leaving && pit.shut === undefined) pit.shut = t;
  if (pit.shut !== undefined) {
    const k = 1 - (t - pit.shut) / 0.6;
    if (k <= 0) pit = null;
    return Math.max(0, k);
  }
  return Math.min(1, tt / 0.35);
}

function drawPitHole(ctx: Ctx, plan: LairPlan, t: number): void {
  const k = pitOpen(t);
  if (k <= 0) return;
  const h = plan.hatch;
  rect(ctx, h.x, h.y, h.w, h.h, "#1a1418");
  // The balls, settling and churning.
  for (let i = 0; i < 26; i++) {
    const bx = h.x + 1 + ((i * 7) % (h.w - 3));
    const by = h.y + 3 + ((i * 5) % (h.h - 4)) + Math.round(Math.sin(t * 3 + i) * (pit?.g?.arrivedAt != null ? 1 : 0));
    rect(ctx, bx, by, 2, 2, BALLS[i % BALLS.length]!);
  }
  // The two leaves hang open at the sides.
  const leaf = Math.round((h.w / 2) * (1 - k));
  rect(ctx, h.x, h.y, leaf, h.h, C.steelLo);
  rect(ctx, h.x + h.w - leaf, h.y, leaf, h.h, C.steelLo);
  rect(ctx, h.x, h.y, 1, h.h, C.steelHi);
  rect(ctx, h.x + h.w - 1, h.y, 1, h.h, C.steelDk);
}

/** The front of the pit: balls up to the waist of whoever's in it, and balls flying when they jump. */
function pitFront(ctx: Ctx, plan: LairPlan, t: number): void {
  if (!pit || pitOpen(t) < 0.9) return;
  const h = plan.hatch;
  const g = pit.g;
  const people = g?.present.some(Boolean) ?? false;
  if (people) {
    for (let i = 0; i < 34; i++) {
      const bx = h.x - 1 + ((i * 11) % (h.w + 1));
      const by = h.y + 4 + ((i * 3) % 9) + Math.round(Math.sin(t * 4 + i * 1.7));
      rect(ctx, bx, by, 2, 2, BALLS[(i * 5) % BALLS.length]!);
    }
  }
  rect(ctx, h.x - 2, h.y + h.h, h.w + 4, 2, C.hazard);
  rect(ctx, h.x - 2, h.y + h.h + 1, h.w + 4, 1, C.ink);
  // A shower of balls now and then.
  const since = g?.arrivedAt != null ? t - g.arrivedAt : t - pit.t0;
  const burst = since % 2.4;
  if (burst < 0.9) {
    for (let i = 0; i < 8; i++) {
      const vx = ((i % 4) - 1.5) * 9;
      const vy = -28 - (i % 3) * 6;
      const bx = h.x + h.w / 2 + vx * burst;
      const by = h.y + 6 + vy * burst + 60 * burst * burst;
      if (by < h.y + h.h) rect(ctx, Math.round(bx), Math.round(by), 2, 2, BALLS[i % BALLS.length]!);
    }
  }
}

// ------------------------------------------------------------------ the swivel chair and the cat

const chairBack = () =>
  cached("lair|chair-back", () => {
    // Turned away from you: a tall wingback that hides whoever sits in it.
    const g = new Grid(22, 32);
    g.rrect(1, 0, 20, 28, "#1c181b", 5);
    g.rect(2, 2, 18, 25, C.leather);
    g.rect(4, 1, 14, 1, C.leatherHi);
    g.rect(10, 4, 2, 21, "#1c181b");
    g.rect(2, 2, 1, 25, C.brassLo).rect(19, 2, 1, 25, C.brassLo);
    for (let y = 5; y < 25; y += 5) g.set(5, y, C.brass).set(16, y, C.brass);
    g.rect(9, 28, 4, 2, C.steelHi);
    g.rect(4, 30, 14, 1, C.steelHi);
    g.outline(OUTLINE);
    return g.toCanvas();
  });

const chairSide = () =>
  cached("lair|chair-side", () => {
    const g = new Grid(22, 26);
    g.rrect(7, 0, 8, 22, "#1c181b", 3);
    g.rect(8, 1, 6, 20, C.leather);
    g.rect(8, 1, 1, 20, C.leatherHi);
    g.rect(4, 15, 14, 4, C.leatherHi);
    g.rect(10, 22, 2, 2, C.steelHi);
    g.rect(4, 24, 14, 1, C.steelHi);
    g.outline(OUTLINE);
    return g.toCanvas();
  });

function swivelItems(ctx: Ctx, L: Layout, t: number): Drawable[] {
  if (!swivel) return [];
  const tt = t - swivel.t0;
  if (tt > 10) {
    swivel = null;
    return [];
  }
  const seat = L.boss.seat;
  const desk = L.boss.desk;
  const out: Drawable[] = [];
  const cx = seat.x - 10;
  const cy = desk.y - 22;
  if (tt < 2.9) {
    const side = tt < 0.3 || tt > 2.6;
    out.push({ z: seat.y + 0.6, draw: () => (side ? ctx.drawImage(chairSide(), cx, cy) : ctx.drawImage(chairBack(), cx, cy - 6)) });
  }
  if (tt > 2.9) {
    // Meringue, revealed, held up over the desk; she hops off at the end.
    const hop = tt > 8.6 ? Math.min(1, (tt - 8.6) / 0.8) : 0;
    const x = Math.round(seat.x - 2 + hop * 24);
    const y = Math.round(desk.y + 2 - Math.sin(hop * Math.PI) * 8 + hop * 6);
    out.push({ z: desk.y + 22.4, draw: () => ctx.drawImage(fluffyCat(hop > 0 ? "walk0" : "sit", hop > 0 ? "right" : "left", Math.floor(t * 3) % 7 === 0), x - 8, y - 12) });
  }
  return out;
}

// ------------------------------------------------------------------ the crater

function roastItems(ctx: Ctx, t: number): Drawable[] {
  if (!roast) return [];
  if (roast.g.done) {
    roast = null;
    return [];
  }
  const out: Drawable[] = [];
  const at = roast.g.arrivedAt;
  roast.spots.forEach((s, i) => {
    if (!roast!.g.present[i]) return;
    out.push({
      z: s.y + 0.6,
      draw: () => {
        // A long fork over the rail, the marshmallow browning (one catches fire).
        const x0 = s.x + 4;
        const y0 = s.y - 12;
        const x1 = s.x + 2 + (i % 2 ? -4 : 4);
        const y1 = s.y + 9;
        ctx.fillStyle = "#8a6a42";
        const n = Math.max(1, Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1);
        const cook = at === null ? 0 : Math.min(1, (t - at) / 9);
        const burnt = i === 2 && at !== null && t - at > 5 && t - at < 8;
        ctx.fillStyle = burnt ? "#3a2a22" : cook > 0.6 ? "#d9a25a" : cook > 0.3 ? "#f0d8a8" : "#ffffff";
        ctx.fillRect(x1 - 1, y1, 3, 3);
        if (burnt) {
          ctx.fillStyle = Math.floor(t * 10) % 2 ? C.lavaHi : C.lava;
          ctx.fillRect(x1 - 1, y1 - 3, 3, 3);
          ctx.fillRect(x1, y1 - 4, 1, 1);
        }
      },
    });
  });
  return out;
}

/** Lava happenings, drawn in the crater (bubble, duck) and over it (fountain sparks). */
function drawLavaFx(ctx: Ctx, plan: LairPlan, t: number, over: boolean): void {
  const c = plan.crater;
  if (!c) return;
  const lavaY = c.y + c.h - 4;
  lava = lava.filter((f) => t - f.t0 < (f.kind === "duck" ? 7 : 3));
  for (const f of lava) {
    const tt = t - f.t0;
    if (f.kind === "bubble" && !over) {
      if (tt < 1.1) {
        const r = 1 + tt * 4;
        ctx.fillStyle = C.lavaLo;
        ctx.fillRect(Math.round(f.x - r), Math.round(lavaY - r), Math.round(r * 2), Math.round(r * 1.6));
        ctx.fillStyle = C.lavaHi;
        ctx.fillRect(Math.round(f.x - r + 1), Math.round(lavaY - r), Math.round(r), 1);
      } else if (tt < 2) {
        const k = (tt - 1.1) / 0.9;
        ctx.fillStyle = C.lavaHot;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI;
          ctx.fillRect(Math.round(f.x + Math.cos(a) * k * 12), Math.round(lavaY - Math.sin(a) * k * 10 + k * k * 8), 1, 1);
        }
      }
    } else if (f.kind === "duck" && !over) {
      const dx = Math.round(f.x + tt * 9);
      const dy = lavaY - 2 + Math.round(Math.sin(tt * 3));
      rect(ctx, dx - 1, dy - 3, 7, 5, OUTLINE);
      rect(ctx, dx, dy - 2, 5, 3, "#ffd84a");
      rect(ctx, dx + 3, dy - 3, 2, 1, "#ffd84a");
      rect(ctx, dx + 5, dy - 2, 1, 1, C.orange);
      rect(ctx, dx - 2, dy + 1, 2, 1, C.lavaHot);
    } else if (f.kind === "fountain" && over && tt < 2.6) {
      for (let i = 0; i < 30; i++) {
        const life = (tt * 1.6 + i / 30) % 1;
        const vx = ((i * 37) % 13) - 6;
        const x = f.x + vx * life * 2.4;
        const y = lavaY - 46 * life + 40 * life * life;
        ctx.fillStyle = life < 0.5 ? C.lavaHot : life < 0.8 ? C.lavaHi : C.lava;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1 + (i % 2));
      }
    }
  }
}

// ------------------------------------------------------------------ the wall: the map and the countdown

/** Where the base is on the map (somewhere very remote in the Pacific). */
const HOME: [number, number] = [-140, -12];

function drawTarget(ctx: Ctx, plan: LairPlan, t: number): void {
  if (!target) return;
  const tt = t - target.t0;
  if (tt > 7.5) {
    target = null;
    return;
  }
  const m = plan.map;
  const p = mapPoint(m, target.city[1], target.city[2]);
  // The reticle closes in.
  const s = Math.max(3, Math.round(24 * (1 - Math.min(1, tt / 1.4))) + 3);
  const on = tt > 1.4 ? Math.floor(t * 6) % 2 === 0 : true;
  if (on) {
    ctx.fillStyle = C.glowRed;
    ctx.fillRect(p.x - s, p.y - s, 3, 1);
    ctx.fillRect(p.x - s, p.y - s, 1, 3);
    ctx.fillRect(p.x + s - 2, p.y - s, 3, 1);
    ctx.fillRect(p.x + s, p.y - s, 1, 3);
    ctx.fillRect(p.x - s, p.y + s, 3, 1);
    ctx.fillRect(p.x - s, p.y + s - 2, 1, 3);
    ctx.fillRect(p.x + s - 2, p.y + s, 3, 1);
    ctx.fillRect(p.x + s, p.y + s - 2, 1, 3);
    ctx.fillRect(p.x, p.y, 1, 1);
  }
  // The pizza flies out along an arc.
  if (tt > 1.6 && tt < 3.8) {
    const k = (tt - 1.6) / 2.2;
    const h0 = mapPoint(m, HOME[0], HOME[1]);
    const x = h0.x + (p.x - h0.x) * k;
    const y = h0.y + (p.y - h0.y) * k - Math.sin(k * Math.PI) * m.h * 0.3;
    ctx.fillStyle = "#e0bf86";
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    ctx.fillStyle = C.glowRed;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // The caption along the bottom of the map.
  const text = tt > 3.8 ? `DELIVERED: ${target.city[0]}` : `TARGET: ${target.city[0]}`;
  const tw = pixelTextWidth(text);
  if (tw + 6 <= m.w && (tt < 3.8 || Math.floor(t * 3) % 2 === 0)) {
    rect(ctx, m.x + 2, m.y + m.h - 9, tw + 4, 7, "#00000099");
    drawPixelText(ctx, text, m.x + 4, m.y + m.h - 8, tt > 3.8 ? C.glowGreen : C.glowRed);
  }
}

/** Minutes and seconds to the next coffee break (on the hour and the half hour). */
function toCoffee(date: Date): string {
  const s = (30 * 60 - ((date.getMinutes() % 30) * 60 + date.getSeconds())) % (30 * 60);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function drawCountdown(ctx: Ctx, plan: LairPlan, info: PaintInfo): void {
  const r = plan.countdown;
  const t = info.t;
  let text = `COFFEE IN ${toCoffee(info.date)}`;
  let color = C.glowAmber;
  if (countdown) {
    const tt = t - countdown.t0;
    if (tt > 14) countdown = null;
    else if (tt < 9) {
      text = `SELF-DESTRUCT 00:0${Math.max(1, 9 - Math.floor(tt))}`;
      color = C.glowRed;
    } else if (tt < 11.5) {
      text = Math.floor(t * 3) % 2 ? "SELF-DESTRUCT 00:01" : "";
      color = C.glowRed;
    } else {
      text = "COFFEE TIME!";
      color = C.glowGreen;
    }
  }
  if (!text) return;
  let tw = pixelTextWidth(text);
  if (tw > r.w - 4) {
    text = text.replace("COFFEE IN ", "").replace("SELF-DESTRUCT ", "");
    tw = pixelTextWidth(text);
  }
  drawPixelText(ctx, text, Math.round(r.x + (r.w - tw) / 2), r.y + Math.floor((r.h - 5) / 2), color);
}

// ------------------------------------------------------------------ party tricks over everything

function drawFx(ctx: Ctx, L: Layout, t: number): void {
  if (!fx) return;
  const tt = t - fx.t0;
  const dur = fx.kind === "disco" ? 10 : 6;
  if (tt > dur) {
    fx = null;
    return;
  }
  if (fx.kind === "confetti") {
    const colors = ["#ff4a3a", "#ffd84a", "#4ab0ff", "#7ce07c", "#ff8fd0", "#ffffff"];
    for (let i = 0; i < 180; i++) {
      const x0 = (i * 97) % L.W;
      const sp = 40 + (i % 7) * 12;
      const y = -6 + (tt - (i % 12) * 0.15) * sp;
      if (y < -4 || y > L.H) continue;
      const x = x0 + Math.sin(tt * 3 + i) * 6;
      const flip = (i + Math.floor(tt * 6)) % 2;
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.fillRect(Math.round(x), Math.round(y), flip ? 3 : 2, flip ? 1 : 2);
    }
  } else if (fx.kind === "alert") {
    const k = Math.abs(Math.sin(tt * 4));
    ctx.fillStyle = `rgba(255,40,30,${0.2 * k})`;
    ctx.fillRect(0, 0, L.W, L.H);
    for (const px of [...L.wall.pillars, 8, L.W - 8]) {
      // A spinning beacon on each beam, sweeping a red beam around.
      const x = Math.round(px);
      rect(ctx, x - 4, 6, 9, 7, OUTLINE);
      rect(ctx, x - 3, 7, 7, 5, k > 0.5 ? "#ff4a3a" : "#c02a1e");
      rect(ctx, x - 2, 7, 2, 1, "#ffb0a0");
      const a = tt * 7 + px;
      ctx.fillStyle = "rgba(255,70,50,0.3)";
      const bx = Math.cos(a);
      const by = Math.abs(Math.sin(a)) * 0.6 + 0.2;
      for (let s = 4; s < 46; s += 2) ctx.fillRect(Math.round(x + bx * s), 10 + Math.round(by * s), 2 + (s >> 4), 2 + (s >> 4));
    }
  } else {
    // The mirror ball lowers over the concourse and spins.
    const ev = L.eventArea;
    const cx = Math.round(ev.x + ev.w / 2);
    const drop = Math.min(1, tt / 1.2) * (tt > dur - 1 ? Math.max(0, dur - tt) : 1);
    const by = Math.round(ev.y + ev.h / 2 - 44 + drop * 22);
    rect(ctx, cx, by - 40, 1, 40, "#9aa3ad");
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(cx - 4, by - 1, 9, 9);
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
      if ((i - 3) * (i - 3) + (j - 3) * (j - 3) > 11) continue;
      ctx.fillStyle = (i + j + Math.floor(tt * 8)) % 3 === 0 ? "#ffffff" : (i + j) % 2 ? "#b8c0c8" : "#7d868f";
      ctx.fillRect(cx - 3 + i, by + j, 1, 1);
    }
    if (drop > 0.8) {
      const colors = ["rgba(255,80,160,0.35)", "rgba(80,200,255,0.35)", "rgba(255,220,80,0.35)", "rgba(120,255,140,0.35)"];
      for (let i = 0; i < 40; i++) {
        const a = tt * 1.4 + i * 2.39;
        const rr = 14 + ((i * 29) % 80);
        ctx.fillStyle = colors[i % colors.length]!;
        ctx.fillRect(Math.round(cx + Math.cos(a) * rr * 1.7), Math.round(ev.y + ev.h / 2 + Math.sin(a) * rr * 0.6), 4, 3);
      }
    }
  }
}

// ------------------------------------------------------------------ hooks for live.ts

/** On the floor and the wall, under furniture and people. */
export function clickUnderlay(ctx: Ctx, L: Layout, plan: LairPlan, info: PaintInfo): void {
  bind(L);
  drawPitHole(ctx, plan, info.t);
  drawTarget(ctx, plan, info.t);
  drawCountdown(ctx, plan, info);
  drawLavaFx(ctx, plan, info.t, false);
}

/** Depth-sorted pieces of the shows. */
export function clickDecor(ctx: Ctx, L: Layout, plan: LairPlan, info: PaintInfo): Drawable[] {
  bind(L);
  const out: Drawable[] = [...swivelItems(ctx, L, info.t), ...roastItems(ctx, info.t)];
  if (pit) out.push({ z: plan.hatch.y + plan.hatch.h + 1, draw: () => pitFront(ctx, plan, info.t) });
  if (plan.rail) out.push({ z: L.H + 2, draw: () => drawTrain(ctx, plan, L, info.t) });
  return out;
}

export function clickOverlay(ctx: Ctx, L: Layout, plan: LairPlan, info: PaintInfo): void {
  bind(L);
  drawLavaFx(ctx, plan, info.t, true);
  drawFx(ctx, L, info.t);
}

/** Lights the shows make at night. */
export function clickLights(L: Layout, plan: LairPlan, t: number): Light[] {
  const out: Light[] = [];
  if (fx?.kind === "alert") for (const px of L.wall.pillars) out.push([px, 8, 40, 0.8, "#ff3a2a", 0.3]);
  if (fx?.kind === "disco") out.push([L.eventArea.x + L.eventArea.w / 2, L.eventArea.y + L.eventArea.h / 2, 70, 0.8, "#ff8fd0", 0.25]);
  if (pit && pitOpen(t) > 0) out.push([plan.hatch.x + plan.hatch.w / 2, plan.hatch.y + 6, 24, 0.7, "#ffd84a", 0.18]);
  const car = trainAt(plan, L.W, t);
  if (car && plan.rail) out.push([car.x, plan.rail.y - 7, 40, 0.8, "#fff2c0", 0.22]);
  for (const f of lava) if (f.kind !== "duck") out.push([f.x, (plan.crater?.y ?? L.H) + 10, 40, 0.9, "#ff8a2a", 0.4]);
  if (tapes && t - tapes.t0 < 4) for (const tp of plan.tapes) out.push([tp.x + tp.w / 2, tp.y + 12, 18, 0.7, "#ffc54a", 0.2]);
  return out;
}

/** How fast the tape reels turn (they race for a few seconds after a click). */
export function reelSpeed(t: number): number {
  return tapes && t - tapes.t0 < 4 ? 14 : 1.2;
}
