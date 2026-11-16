// Dusty Annex: things to click. Nothing in the building quite works, and
// clicking it doesn't help: the leak plays a tune or gushes, a fluorescent
// tube dies (or gets thumped back to life), a storeroom drops its boxes on
// you, the old photocopier jams spectacularly, the old hall's stage puts on a
// one-person show to an audience of two, the tea urn draws a grumbling queue,
// a radiator clanks and the stairs give way a little more.
//
// Clicks only start things; everything is drawn from the Annex's live layers
// (underlay, decor, overlay, lights) by the animation clock.

import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, Grid, hash, OUTLINE, rect } from "../../themekit.ts";
import { drawRadiator, hallOf, leakTop, radiators, stageOf, tubes, urnOf } from "./fixtures.ts";
import { P } from "./pal.ts";
import { planOf } from "./plan.ts";
import { CLICK_LINES as W, type ClickLine } from "./words.ts";

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

/** The leak's bucket and any dead photocopiers, which sit among the clutter (placed with sprites, so only in a browser). */
export interface ClutterSpots {
  leak: Rect | null;
  copiers: Rect[];
}

// ------------------------------------------------------------------ what's going on

let forL: Layout | null = null;
let spots: ClutterSpots = { leak: null, copiers: [] };

let leak: { kind: "fill" | "gush" | "tune"; t0: number } | null = null;
/** Tubes doing something (by index): sputtering out, flaring, waiting to be thumped. */
let tubeFx = new Map<number, { kind: "die" | "flare" | "thump"; t0: number; g?: Gathering; ok?: boolean }>();
let stores: { kind: "avalanche" | "drawer" | "dust" | "mouse"; t0: number; r: Rect; dir: number }[] = [];
let jam: { t0: number; r: Rect } | null = null;
let stage: { kind: "show" | "pa" | "curtain"; t0: number; r: Rect; g?: Gathering; spots?: GatherSpot[] } | null = null;
let urn: { kind: "round" | "boil"; t0: number; r: Rect; g?: Gathering } | null = null;
let rads = new Map<number, { kind: "clank" | "hiss" | "tick"; t0: number }>();
let steps: { kind: "step" | "creak"; t0: number; f: Rect; y: number }[] = [];
/** Treads that gave way and got taped over (they stay). */
let patches: { x: number; y: number; w: number }[] = [];

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  leak = null;
  tubeFx = new Map();
  stores = [];
  jam = null;
  stage = null;
  urn = null;
  rads = new Map();
  steps = [];
  patches = [];
}

// ------------------------------------------------------------------ what can be clicked

function tubeRect(x: number, w: number): Rect {
  return { x: x - 2, y: 0, w: w + 4, h: 8 };
}

export function clickables(L: Layout, found: ClutterSpots | null): SceneryClickable[] {
  if (L !== forL) bind(L);
  spots = found ?? { leak: null, copiers: [] };
  const out: SceneryClickable[] = [];
  spots.copiers.forEach((r, i) => out.push({ id: `copier-${i}`, rect: r, hover: W.hover.copier }));
  if (spots.leak) {
    const b = spots.leak;
    out.push({ id: "leak", rect: { x: b.x - 3, y: b.y - 24, w: b.w + 6, h: b.h + 24 }, hover: W.hover.leak });
  }
  const u = urnOf(L);
  if (u) out.push({ id: "urn", rect: u, hover: W.hover.urn });
  const hall = hallOf(L);
  const st = hall ? stageOf(hall) : null;
  if (st) out.push({ id: "stage", rect: { x: st.x - 3, y: st.y, w: st.w + 3, h: st.h + 3 }, hover: W.hover.stage });
  const plan = planOf(L);
  plan?.cells.forEach((c, i) => {
    if (c.kind === "storage") out.push({ id: `store-${i}`, rect: c.r, hover: W.hover.store });
  });
  plan?.flights.forEach((f, i) => out.push({ id: `stairs-${i}`, rect: f, hover: W.hover.stairs }));
  radiators(L).forEach((r, i) => out.push({ id: `rad-${i}`, rect: { x: r.x - 3, y: r.y - 1, w: r.w + 4, h: r.h + 2 }, hover: W.hover.radiator }));
  tubes(L).forEach((tb, i) => out.push({ id: `tube-${i}`, rect: tubeRect(tb.x, tb.w), hover: W.hover.tube }));
  return out;
}

const num = (id: string) => Number(id.slice(id.indexOf("-") + 1));

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  if (id === "leak") return clickLeak(act);
  if (id === "urn") return clickUrn(act);
  if (id === "stage") return clickStage(act);
  if (id.startsWith("copier-")) return clickCopier(num(id), act);
  if (id.startsWith("store-")) return clickStore(num(id), act);
  if (id.startsWith("stairs-")) return clickStairs(num(id), act);
  if (id.startsWith("rad-")) return clickRadiator(num(id), act);
  if (id.startsWith("tube-")) return clickTube(num(id), act);
  return null;
}

/** Whoever's closest says one of these (after a beat). */
function mutter(act: SceneryActions, x: number, y: number, lines: readonly string[], delay = 0.6, r = 90): void {
  const who = act.near(x, y, r)[0];
  if (who) act.say(who.id, pick(lines), 2.8, delay);
}

function cues(list: readonly ClickLine[]): GatherCue[] {
  return list
    .filter(([, , say, sound]) => say || sound)
    .map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 22 ? 3.6 : 2.6, sound }));
}

function clickLeak(act: SceneryActions): string | null {
  const b = spots.leak;
  if (!b) return null;
  const busy = leak !== null && act.t - leak.t0 < 10;
  const kind = weighted<"fill" | "gush" | "tune">(busy ? [["gush", 1]] : [["fill", 3], ["gush", 2], ["tune", 2]]);
  leak = { kind, t0: act.t };
  mutter(act, b.x + 6, b.y + 8, W[kind === "fill" ? "leakFill" : kind === "gush" ? "leakGush" : "leakTune"], kind === "tune" ? 2.4 : 0.8);
  return kind === "fill" ? "annex-drips" : kind === "gush" ? "annex-gush" : "annex-tune";
}

/** The aisle under a tube, if a ladder (or a thump) can reach it from the top corridor. */
function reachOf(L: Layout, i: number): { x: number; aisle: number; wall: number } | null {
  const tb = tubes(L)[i];
  if (!tb) return null;
  const cx = tb.x + tb.w / 2;
  const aisle = L.net.aisles.find((a) => Math.abs(a - cx) <= 2);
  if (aisle === undefined) return null;
  const seg = L.segments.find((s) => cx >= s.x0 && cx < s.x1);
  return { x: Math.round(cx), aisle, wall: (seg?.depth ?? 60) + 10 };
}

function clickTube(i: number, act: SceneryActions): string | null {
  const L = act.L;
  const tb = tubes(L)[i];
  if (!tb) return null;
  const cur = tubeFx.get(i);
  if (cur && act.t - cur.t0 < 3) return "annex-tick";
  // Someone comes over to give it a thump, when there's an aisle to stand in under it.
  const reach = reachOf(L, i);
  if (reach && Math.random() < 0.6) {
    const top = Math.min(...L.net.halls);
    const spot: GatherSpot = {
      x: reach.x,
      y: reach.wall,
      facing: "back",
      pose: "throw",
      activity: "thumping the light",
      path: [{ x: reach.aisle, y: top, c: true }, { x: reach.aisle, y: reach.wall }, { x: reach.x, y: reach.wall }],
    };
    const ok = Math.random() < 0.6;
    const g = act.gather([spot], 5, cues([[0.4, -1, "", "annex-thump"], [1.1, 0, ok ? pick(W.thumpOk) : pick(W.thumpBad)], [3, 0, ok ? "" : pick(W.tubeDie)]]));
    if (g) {
      tubeFx.set(i, { kind: "thump", t0: act.t, g, ok });
      return "annex-hum";
    }
  }
  const kind = Math.random() < 0.65 ? "die" : "flare";
  tubeFx.set(i, { kind, t0: act.t });
  mutter(act, tb.x + tb.w / 2, L.segments[0]!.depth + 20, kind === "die" ? W.tubeDie : W.tubeFlare, kind === "die" ? 1.4 : 0.6, 110);
  return kind === "die" ? "annex-sputter" : "annex-hum";
}

/** A tube's brightness while it's up to something (null: as usual). */
export function tubeKick(L: Layout, i: number, t: number): number | null {
  if (L !== forL) return null;
  const fx = tubeFx.get(i);
  if (!fx) return null;
  const k = t - fx.t0;
  const flick = () => (hash(`tk${i}-${Math.floor(t * 18)}`) % 3 === 0 ? 0.05 : 0.9);
  if (fx.kind === "die") {
    if (k < 1.2) return flick();
    if (k < 9) return 0;
    if (k < 9.7) return flick();
    tubeFx.delete(i);
    return null;
  }
  if (fx.kind === "flare") {
    if (k < 3.2) return 1.4;
    tubeFx.delete(i);
    return null;
  }
  // Thump: it sputters while they walk over; then it either holds or gives up.
  const g = fx.g!;
  if (g.arrivedAt === null) return g.done ? (tubeFx.delete(i), null) : flick();
  const since = t - g.arrivedAt;
  if (since < 0.4) return flick();
  if (fx.ok) {
    if (since < 10) return 1;
  } else if (since < 8) return 0;
  tubeFx.delete(i);
  return null;
}

function clickStore(i: number, act: SceneryActions): string | null {
  const c = planOf(act.L)?.cells[i];
  if (!c) return null;
  const r = c.r;
  const kind = weighted<"avalanche" | "drawer" | "dust" | "mouse">([
    ["avalanche", 3],
    ["drawer", 2],
    ["dust", 2],
    ["mouse", 1.2],
  ]);
  stores.push({ kind, t0: act.t, r, dir: act.at.x < r.x + r.w / 2 ? 1 : -1 });
  if (stores.length > 6) stores.shift();
  const lines = kind === "avalanche" ? W.avalanche : kind === "drawer" ? W.drawer : kind === "dust" ? W.dust : W.mouse;
  mutter(act, r.x + r.w / 2, r.y + r.h, lines, kind === "avalanche" ? 1.2 : 0.8, 120);
  return kind === "avalanche" ? "annex-avalanche" : kind === "drawer" ? "annex-drawer" : kind === "dust" ? "annex-dust" : "annex-squeak";
}

function clickCopier(i: number, act: SceneryActions): string | null {
  const r = spots.copiers[i];
  if (!r) return null;
  jam = { t0: act.t, r };
  mutter(act, r.x + r.w / 2, r.y + r.h, W.copier, 1.2, 120);
  return "annex-jam";
}

function clickStage(act: SceneryActions): string | null {
  const hall = hallOf(act.L);
  const st = hall ? stageOf(hall) : null;
  if (!st) return null;
  const busy = stage !== null && stage.g && !stage.g.done;
  if (!busy && Math.random() < 0.7) {
    // A one-person show: the performer on the boards, an audience of (at most) three.
    const y = Math.round(st.y + st.h / 2 + 10);
    const show: GatherSpot[] = [
      { x: st.x + 10, y, facing: "left", pose: "throw", activity: "doing a one-person show" },
      ...[0, 1, 2].map((k) => ({ x: st.x - 26 - k * 18, y: y + (k % 2 ? 6 : -2), facing: "right" as const, pose: "stand" as const, activity: "watching the show, politely" })),
    ];
    const g = act.gather(show, 16, cues(W.show), 2);
    if (g) {
      stage = { kind: "show", t0: act.t, r: st, g, spots: show };
      return "annex-squeal";
    }
  }
  const kind = Math.random() < 0.6 ? "pa" : "curtain";
  stage = { kind, t0: act.t, r: st };
  mutter(act, st.x, st.y + st.h / 2, kind === "pa" ? W.pa : W.curtain, kind === "pa" ? 0.4 : 1, 140);
  return kind === "pa" ? "annex-squeal" : "annex-thud";
}

function clickUrn(act: SceneryActions): string | null {
  const u = urnOf(act.L);
  if (!u) return null;
  const busy = urn !== null && urn.g && !urn.g.done;
  if (!busy) {
    // A tea round: a queue forms, mugs in hand, and everyone has a complaint.
    const base = u.y + u.h - 1;
    const queue: GatherSpot[] = [0, 1, 2, 3].map((k) => ({ x: u.x + 28 + k * 15, y: base + (k % 2), facing: "left", pose: "cup", activity: "queueing for the urn" }));
    const g = act.gather(queue, 11, cues(W.urn), 2);
    if (g) {
      urn = { kind: "round", t0: act.t, r: u, g };
      return "annex-urn";
    }
  }
  urn = { kind: "boil", t0: act.t, r: u };
  mutter(act, u.x + 9, u.y + u.h, W.urnBoil, 1, 110);
  return "annex-urn";
}

function clickRadiator(i: number, act: SceneryActions): string | null {
  const r = radiators(act.L)[i];
  if (!r) return null;
  const kind = weighted<"clank" | "hiss" | "tick">([
    ["clank", 3],
    ["hiss", 2],
    ["tick", 1],
  ]);
  rads.set(i, { kind, t0: act.t });
  mutter(act, r.x + r.w / 2, r.y + 20, kind === "clank" ? W.clank : kind === "hiss" ? W.hiss : W.cold, 1, 110);
  return kind === "clank" ? "annex-clank" : kind === "hiss" ? "annex-hiss" : "annex-tick";
}

function clickStairs(i: number, act: SceneryActions): string | null {
  const f = planOf(act.L)?.flights[i];
  if (!f) return null;
  const kind = Math.random() < 0.55 ? "step" : "creak";
  // A tread near where you clicked.
  const n = Math.max(0, Math.round((act.at.y - f.y - 2) / 5));
  const y = Math.min(f.y + f.h - 6, f.y + 2 + n * 5);
  steps.push({ kind, t0: act.t, f, y });
  if (steps.length > 6) steps.shift();
  if (kind === "step") {
    if (!patches.some((p) => p.x === f.x + 1 && p.y === y)) patches.push({ x: f.x + 1, y, w: f.w - 2 });
    if (patches.length > 8) patches.shift();
  }
  // Someone on the stairs says something first; failing that, whoever's nearest.
  mutter(act, f.x + f.w / 2, y, kind === "step" ? W.step : W.creak, 0.7, 70);
  return kind === "step" ? "annex-crack" : "annex-creak";
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void): HTMLCanvasElement {
  return cached(`annex|click|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

const box = (v: number) =>
  spr(`box-${v}`, 12, 10, (g) => {
    g.rect(1, 1, 10, 8, v ? P.card : "#9a7a50");
    g.rect(1, 1, 10, 2, v ? P.cardHi : "#ad8c5e");
    g.rect(5, 1, 2, 2, P.tape);
    g.rect(3, 4, 4, 2, P.paperOld);
  });

const mouse = (step: boolean) =>
  spr(`mouse-${step}`, 9, 5, (g) => {
    g.rect(2, 1, 5, 3, "#7a7470").set(7, 2, "#8a8480").set(6, 1, "#c09090");
    g.set(1, 3, "#5a5450").set(0, step ? 2 : 3, "#5a5450");
    g.set(6, 2, OUTLINE);
  });

const heap = () =>
  spr("curtain-heap", 30, 8, (g) => {
    g.rrect(1, 2, 28, 5, "#6a2a28", 2);
    g.rect(4, 2, 6, 2, "#8a3a34").rect(15, 3, 8, 2, "#8a3a34");
    g.rect(10, 4, 4, 2, "#4a1c1a");
  });

// ------------------------------------------------------------------ drawing

const done = (since: number, dur: number) => since < 0 || since > dur;

/** On the floor: the puddle that grows, taped-over treads, a wobbling banister. */
export function clickUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  for (const p of patches) {
    rect(ctx, p.x + 2, p.y, p.w - 4, 3, P.tape);
    rect(ctx, p.x + 2, p.y + 1, p.w - 4, 1, "#b8aa78");
  }
  const b = spots.leak;
  if (b && leak && (leak.kind === "fill" || leak.kind === "gush")) {
    const k = t - leak.t0;
    const grow = leak.kind === "gush" ? Math.min(1, k / 1.5) : Math.max(0, Math.min(1, (k - 5) / 3));
    const fade = Math.min(1, Math.max(0, (16 - k) / 3));
    if (grow > 0 && fade > 0) {
      const rx = Math.round(6 + grow * 12);
      ctx.fillStyle = `rgba(70,84,96,${(0.4 * fade).toFixed(2)})`;
      ctx.fillRect(b.x + 6 - rx, b.y + b.h - 4, rx * 2, 5);
      ctx.fillRect(b.x + 6 - rx + 3, b.y + b.h - 5, rx * 2 - 6, 7);
    }
    if (k > 18) leak = null;
  }
  for (const s of steps) {
    const k = t - s.t0;
    if (s.kind !== "creak" || done(k, 2.2)) continue;
    // The banisters sway.
    const dx = Math.round(Math.sin(k * 22) * 1.2 * (1 - k / 2.2));
    ctx.fillStyle = "#5a4026";
    ctx.fillRect(s.f.x + dx, s.f.y, 1, s.f.h);
    ctx.fillRect(s.f.x + s.f.w - 1 + dx, s.f.y, 1, s.f.h);
  }
}

/** In among people and furniture: the leak, falling boxes, a mouse, the stage curtain, a radiator shaking. */
export function clickDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const out: Drawable[] = [];
  const t = info.t;
  const b = spots.leak;
  if (b && leak) {
    const k = t - leak.t0;
    const top = leakTop(L, b);
    const z = b.y + b.h + 0.2;
    if (leak.kind === "gush" && k < 2.6) {
      out.push({
        z,
        draw: () => {
          // A column of water from the ceiling, splashing everywhere.
          ctx.fillStyle = "rgba(160,196,220,0.85)";
          ctx.fillRect(b.x + 5, top, 3, b.y + 3 - top);
          ctx.fillStyle = "rgba(220,236,248,0.8)";
          ctx.fillRect(b.x + 6, top, 1, b.y + 3 - top);
          for (let i = 0; i < 8; i++) {
            const q = (k * 2.2 + i / 8) % 1;
            const dir = i % 2 ? 1 : -1;
            ctx.fillRect(Math.round(b.x + 6 + dir * (2 + q * (6 + (i % 3) * 3))), Math.round(b.y + 2 - Math.sin(q * Math.PI) * 6), 1, 1);
          }
        },
      });
    } else if (leak.kind === "fill" && k < 14) {
      out.push({
        z,
        draw: () => {
          // Faster and faster, the level rising, then over the top.
          const period = Math.max(0.25, 0.9 - k * 0.06);
          const q = (k % period) / period;
          ctx.fillStyle = "rgba(170,200,220,0.9)";
          ctx.fillRect(b.x + 6, Math.round(top + q * q * (b.y - top)), 1, 2);
          const level = Math.min(1, k / 6);
          ctx.fillStyle = "#5a7a92";
          ctx.fillRect(b.x + 3, b.y + 2, 7, Math.max(1, Math.round(level * 2)));
          if (k > 6) {
            ctx.fillStyle = "rgba(150,186,210,0.85)";
            ctx.fillRect(b.x + 1, b.y + 3, 1, Math.round(Math.min(7, (k - 6) * 4)));
            ctx.fillRect(b.x + 10, b.y + 3, 1, Math.round(Math.min(7, (k - 6) * 3)));
          }
        },
      });
    } else if (leak.kind === "tune" && k < 2.6) {
      out.push({
        z,
        draw: () => {
          // A drop for every note.
          for (let i = 0; i < 7; i++) {
            const q = (k - i * 0.32 + 0.3) / 0.3;
            if (q < 0 || q > 1) continue;
            ctx.fillStyle = "rgba(170,200,220,0.9)";
            ctx.fillRect(b.x + 6, Math.round(top + q * q * (b.y - top)), 1, 2);
          }
        },
      });
    }
  }
  for (const s of stores) {
    const k = t - s.t0;
    const r = s.r;
    if (s.kind === "avalanche" && !done(k, 10)) {
      const floor = r.y + r.h - 3;
      for (let i = 0; i < 5; i++) {
        const k0 = k - i * 0.09;
        if (k0 < 0) continue;
        const x0 = r.x + 6 + ((i * 37 + hash(`av${s.t0}`)) % Math.max(1, r.w - 20));
        const land = floor + (i % 3) * 3;
        const fall = Math.min(1, k0 / 0.45);
        const bounce = k0 > 0.45 && k0 < 0.75 ? Math.sin(((k0 - 0.45) / 0.3) * Math.PI) * 4 : 0;
        const x = Math.round(x0 + s.dir * (fall * 8 + Math.min(1, Math.max(0, (k0 - 0.45) / 0.3)) * 4));
        const y = Math.round(r.y + 6 + (land - r.y - 6) * fall * fall - bounce);
        const fade = Math.min(1, (10 - k) / 1.5);
        out.push({
          z: land + 0.3,
          draw: () => {
            ctx.globalAlpha = fade;
            ctx.drawImage(box(i % 2), x - 6, y - 10);
            ctx.globalAlpha = 1;
          },
        });
      }
    } else if (s.kind === "mouse" && !done(k, 3.2)) {
      const y = r.y + r.h + 6;
      const x = Math.round(r.x + r.w / 2 + s.dir * k * 70);
      out.push({ z: y, draw: () => ctx.drawImage(mouse(Math.floor(t * 14) % 2 === 0), x - 4, y - 4) });
    }
  }
  if (stage && stage.kind === "curtain" && !done(t - stage.t0, 10)) {
    const st = stage.r;
    const k = t - stage.t0;
    out.push({
      z: st.y + st.h + 1,
      draw: () => {
        // The curtain's come off its rail: bare boards where it hung, a heap at the bottom.
        rect(ctx, st.x + 22, st.y, 6, st.h, "#8a6a44");
        for (let y = st.y + 4; y < st.y + st.h; y += 5) rect(ctx, st.x + 22, y, 6, 1, "#6e5234");
        rect(ctx, st.x + 23, st.y, 4, 1, "#3a3630");
        ctx.globalAlpha = Math.min(1, (10 - k) / 1.5);
        ctx.drawImage(heap(), st.x - 2, st.y + st.h - 8);
        ctx.globalAlpha = 1;
      },
    });
  }
  if (stage && stage.kind === "show" && stage.g && !stage.g.done) {
    // The curtain stays drawn across until the performer's on, then opens (and closes at the end).
    const st = stage.r;
    const g = stage.g;
    const since = g.arrivedAt === null ? -1 : t - g.arrivedAt;
    const open = since < 0 ? 0 : since < 1.2 ? since / 1.2 : since > 15 ? Math.max(0, 1 - (since - 15) / 0.8) : 1;
    out.push({
      z: st.y + st.h / 2 + 10.4,
      draw: () => {
        const w = Math.round(22 * (1 - open));
        if (w <= 0) return;
        rect(ctx, st.x + 22 - w, st.y, w + 6, st.h, "#6a2a28");
        for (let x = st.x + 23 - w; x < st.x + 28; x += 3) rect(ctx, x, st.y, 1, st.h, "#8a3a34");
      },
    });
  }
  radiators(L).forEach((r, i) => {
    const fx = rads.get(i);
    if (!fx || fx.kind !== "clank") return;
    const k = t - fx.t0;
    if (done(k, 1.5)) return;
    out.push({
      z: r.y + r.h + 2,
      draw: () => {
        // It rattles on its brackets.
        const dx = Math.round(Math.sin(k * 40) * (1 - k / 1.5));
        rect(ctx, r.x - 2, r.y - 1, r.w + 4, r.h + 2, "#666d51");
        drawRadiator(ctx, { ...r, x: r.x + dx }, r.x - 5);
      },
    });
  });
  return out;
}

/** Above everything: paper, dust, steam, the PA's squeal, the copier's fountain, a spotlight. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  for (const s of stores) {
    const k = t - s.t0;
    const r = s.r;
    const cx = r.x + r.w / 2;
    if (s.kind === "drawer" && !done(k, 7)) {
      // Paper out of a drawer, up and fluttering down.
      for (let i = 0; i < 10; i++) {
        const q = Math.min(1, Math.max(0, (k - i * 0.08) / 3.2));
        if (q <= 0) continue;
        const dir = i % 2 ? 1 : -1;
        const x = Math.round(cx + dir * (4 + (i * 7) % 18) * q + Math.sin(k * 3 + i) * 2 * (1 - q));
        const y = Math.round(r.y + r.h * 0.45 - Math.sin(q * Math.PI) * 18 + q * (r.h * 0.45));
        ctx.globalAlpha = Math.min(1, (7 - k) / 1.5);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x - 1, y - 1, 5, 4);
        ctx.fillStyle = i % 3 ? P.paper : P.paperOld;
        ctx.fillRect(x, y, 3, 2);
      }
      ctx.globalAlpha = 1;
    } else if ((s.kind === "dust" && !done(k, 3.5)) || (s.kind === "avalanche" && !done(k, 2.4))) {
      // A cloud of dust billowing out.
      const dur = s.kind === "dust" ? 3.5 : 2.4;
      const y0 = s.kind === "dust" ? r.y + r.h / 2 : r.y + r.h - 4;
      for (let i = 0; i < 14; i++) {
        const q = k / dur;
        const a = (i / 14) * Math.PI * 2;
        const d = 4 + q * (10 + (i % 4) * 5);
        ctx.fillStyle = `rgba(190,180,150,${(0.45 * (1 - q)).toFixed(2)})`;
        ctx.fillRect(Math.round(cx + Math.cos(a) * d * 1.4), Math.round(y0 + Math.sin(a) * d * 0.6 - q * 6), 3, 2);
      }
    }
  }
  stores = stores.filter((s) => t - s.t0 < 11);
  if (jam && !done(t - jam.t0, 4)) {
    // Paper jam fireworks: sheets shot up out of the top, a puff of toner, a red light blinking.
    const k = t - jam.t0;
    const r = jam.r;
    for (let i = 0; i < 14; i++) {
      const k0 = k - i * 0.12;
      if (k0 < 0 || k0 > 1.6) continue;
      const q = k0 / 1.6;
      const dir = ((i * 5) % 7) - 3;
      const x = Math.round(r.x + 10 + dir * 5 * q);
      const y = Math.round(r.y + 2 - Math.sin(q * Math.PI) * (16 + (i % 3) * 6) + q * 10);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 1, y - 1, 5, 4);
      ctx.fillStyle = i % 4 ? P.paper : "#f0c0a0";
      ctx.fillRect(x, y, 3, 2);
    }
    for (let i = 0; i < 5; i++) {
      const q = Math.min(1, k / 2);
      ctx.fillStyle = `rgba(60,58,54,${(0.5 * (1 - q)).toFixed(2)})`;
      ctx.fillRect(Math.round(r.x + 16 + Math.sin(i * 2 + k) * 4), Math.round(r.y - q * 14 - i * 3), 3, 3);
    }
    if (Math.floor(t * 6) % 2 === 0) rect(ctx, r.x + 4, r.y + 7, 2, 1, "#e0503a");
  }
  if (stage && stage.kind === "pa" && !done(t - stage.t0, 1.8)) {
    // The PA squeals: rings off the speaker on the stage.
    const k = t - stage.t0;
    const sx = stage.r.x + 4;
    const sy = stage.r.y + 4;
    for (let i = 0; i < 3; i++) {
      const q = (k * 1.6 + i / 3) % 1;
      const rad = Math.round(3 + q * 14);
      ctx.fillStyle = `rgba(255,248,220,${(0.6 * (1 - q)).toFixed(2)})`;
      ctx.fillRect(sx - rad, sy, 1, 2);
      ctx.fillRect(sx + rad, sy, 1, 2);
      ctx.fillRect(sx - 1, sy - Math.round(rad * 0.6), 2, 1);
    }
  }
  if (stage && stage.kind === "show" && stage.g && !stage.g.done && stage.g.arrivedAt !== null && stage.g.present[0]) {
    // A spotlight from the back of the hall, dust turning in it.
    const sp = stage.spots![0]!;
    const k = t - stage.g.arrivedAt;
    const a = Math.min(1, k / 1.2) * 0.16;
    ctx.fillStyle = `rgba(255,240,200,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(sp.x - 2, sp.y - 30);
    ctx.lineTo(sp.x + 3, sp.y - 30);
    ctx.lineTo(sp.x + 11, sp.y + 2);
    ctx.lineTo(sp.x - 10, sp.y + 2);
    ctx.closePath();
    ctx.fill();
  }
  if (urn) {
    const k = t - urn.t0;
    const going = urn.kind === "boil" ? k < 3.5 : urn.g !== undefined && !urn.g.done;
    if (going) {
      // Steam off the urn: a wisp while the queue's on, a cloud when it boils over.
      const big = urn.kind === "boil";
      const r = urn.r;
      for (let i = 0; i < (big ? 9 : 4); i++) {
        const q = (k * (big ? 0.9 : 0.5) + i / (big ? 9 : 4)) % 1;
        ctx.fillStyle = `rgba(235,235,225,${((big ? 0.6 : 0.45) * (1 - q)).toFixed(2)})`;
        ctx.fillRect(Math.round(r.x + 9 + Math.sin(k * 2 + i * 1.7) * (2 + q * (big ? 6 : 2))), Math.round(r.y - q * (big ? 18 : 12)), 2, 2);
      }
    } else urn = null;
  }
  radiators(L).forEach((r, i) => {
    const fx = rads.get(i);
    if (!fx) return;
    const k = t - fx.t0;
    const dur = fx.kind === "hiss" ? 2.6 : fx.kind === "clank" ? 1.6 : 0.4;
    if (k > dur) {
      rads.delete(i);
      return;
    }
    if (fx.kind === "tick") return;
    // Steam from the valve.
    for (let j = 0; j < (fx.kind === "hiss" ? 7 : 3); j++) {
      const q = (k * 1.4 + j / 7) % 1;
      ctx.fillStyle = `rgba(230,232,224,${(0.55 * (1 - q)).toFixed(2)})`;
      ctx.fillRect(Math.round(r.x - 3 + Math.sin(j + k * 3) * 2 - q * 3), Math.round(r.y + 5 - q * 14), 2, 2);
    }
  });
  for (const s of steps) {
    const k = t - s.t0;
    if (s.kind !== "step" || done(k, 1.4)) continue;
    // Splinters and dust off the tread that gave way.
    for (let i = 0; i < 6; i++) {
      const q = k / 1.4;
      ctx.fillStyle = i % 2 ? "#9a7e5a" : `rgba(190,180,150,${(0.6 * (1 - q)).toFixed(2)})`;
      ctx.fillRect(Math.round(s.f.x + 3 + ((i * 5) % (s.f.w - 4))), Math.round(s.y - q * (6 + i)), 1, 1);
    }
  }
  steps = steps.filter((s) => t - s.t0 < 3);
  if (jam && t - jam.t0 > 4) jam = null;
  if (stage && (stage.g ? stage.g.done : t - stage.t0 > 10)) stage = null;
}

/** Light: the stage's spotlight, the urn's little red lamp. */
export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL) return [];
  const out: Light[] = [];
  if (stage && stage.kind === "show" && stage.g && !stage.g.done && stage.g.arrivedAt !== null && stage.g.present[0]) {
    const sp = stage.spots![0]!;
    out.push([sp.x, sp.y - 12, 30, 0.95, "#fff0c0", 0.35]);
  }
  if (urn && urn.kind === "round" && urn.g && !urn.g.done) out.push([urn.r.x + 9, urn.r.y + 8, 22, 0.6, "#ffcf8a", 0.15]);
  if (jam && info.t - jam.t0 < 4) out.push([jam.r.x + 5, jam.r.y + 7, 10, 0.6, "#e0503a", 0.2]);
  return out;
}
