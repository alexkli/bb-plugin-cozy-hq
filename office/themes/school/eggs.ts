// School: hidden Easter eggs (not outlined when Alt is held).
//
// - Peanut the class hamster: his cage door is a bit loose. Tap the cage and
//   out he goes, zigzagging down the corridor with the whole school yelling,
//   until he trots back in on his own for a snack.
// - A paper airplane on a classroom floor: tap it and it's thrown, loops
//   round the school and lands on your desk. It's a note: can we have recess
//   early? (Fine. Five minutes.)
// - The fire alarm pull station on the wall: a drill! Red lights flash all
//   over, the bell clangs, everyone lines up in their heads, and the
//   principal times it. Who pulled it? …Peanut?
//
// Each also happens on its own about once every hour or two (the drill and
// the airplane by day). Drawn from decor and overlay by the clock.
import type { Layout, Rect } from "../../layout.ts";
import type { Drawable, Light, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { cached, floorPlan } from "../../themekit.ts";
import { bareWall, chorus, ease, pick, rarely } from "../eggs.ts";
import { wallItems } from "./background.ts";
import { HAMSTER, hamsterOut } from "./hamster.ts";
import { C, OUTLINE, sprite } from "./kit.ts";
import { hamsterAt } from "./live.ts";
import { planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const RUN = 20;
const FLIGHT = 7;
const DRILL = 14;

let forL: Layout | null = null;
let plane: { t0: number } | null = null;
let drill: { t0: number } | null = null;
let lastEgg = -1e9;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  plane = drill = null;
  HAMSTER.back = 0;
}

// ------------------------------------------------------------------ where

/** The paper airplane: on a clear bit of classroom floor (needs sprites, so a browser). */
function planeAt(L: Layout): Rect | null {
  if (typeof document === "undefined") return null;
  return cached(`school|egg-plane-at|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const room = L.rooms.find((r) => r.kind === "pod")?.rect;
    const c = floorPlan(L).find(10, 6, 12, room);
    return c[Math.floor(c.length / 2)] ?? null;
  });
}

/** The fire alarm pull station: a bare bit of the back wall, clear of the school's posters and lockers. */
function pullAt(L: Layout): Rect | null {
  return cached(`school|egg-pull-at|${L.W}x${L.H}|${L.props.length}`, () => {
    const avoid = wallItems(L).map((it) => ({ x: it.x - 2, y: it.y - 2, w: it.w + 4, h: it.h + 4 }));
    return bareWall(L, 7, 9, 16, L.W * 0.3, avoid);
  });
}

/** The main corridor Peanut runs along. */
function corridorOf(L: Layout): number {
  return planOf(L)?.corridor ?? L.net.halls[0] ?? L.H / 2;
}

export function eggClickables(L: Layout): SceneryClickable[] {
  bind(L);
  const out: SceneryClickable[] = [];
  const cage = typeof document === "undefined" ? null : hamsterAt(L);
  if (cage) out.push({ id: "egg-hamster", rect: cage, hover: "Peanut, the class hamster. The cage door's a bit loose.", secret: true });
  const p = planeAt(L);
  if (p) out.push({ id: "egg-plane", rect: p, hover: "A paper airplane. Nice folds.", secret: true });
  const f = pullAt(L);
  if (f) out.push({ id: "egg-drill", rect: f, hover: "FIRE ALARM: PULL DOWN", secret: true });
  return out;
}

export function eggClick(id: string, act: SceneryActions): string | null {
  bind(act.L);
  if (id === "egg-hamster") return escape(act);
  if (id === "egg-plane") return throwPlane(act);
  if (id === "egg-drill") return fireDrill(act);
  return null;
}

export function eggTick(act: SceneryActions): void {
  bind(act.L);
  if (hamsterOut(act.t) || plane || drill || !rarely(act.t, lastEgg)) return;
  const day = act.hour > 8 && act.hour < 16;
  const options: (() => string | null)[] = [() => escape(act)];
  if (day) options.push(() => throwPlane(act), () => fireDrill(act));
  const sound = pick(options)();
  if (sound) act.play(sound);
}

function escape(act: SceneryActions): string | null {
  const cage = hamsterAt(act.L);
  if (!cage || hamsterOut(act.t)) return null;
  HAMSTER.outAt = act.t;
  HAMSTER.back = RUN;
  lastEgg = act.t;
  const y = corridorOf(act.L);
  chorus(act, cage.x + 9, y, [
    [0.8, pick(["PEANUT'S OUT!", "The hamster! The hamster's loose!"])],
    [3, "He's heading for the cafeteria!", 1],
    [5.2, "Everybody freeze. Nobody step on Peanut.", "boss"],
    [8.6, pick(["He's so fast!", "Look at him go!"]), 2],
    [17.5, pick(["He went back in all by himself.", "He just wanted a snack."]), 0],
  ], 320);
  return "egg-squeak";
}

function throwPlane(act: SceneryActions): string | null {
  const p = planeAt(act.L);
  if (!p || plane) return null;
  plane = { t0: act.t };
  lastEgg = act.t;
  const near = act.near(p.x, p.y, 120)[0];
  if (near) act.say(near.id, pick(["Watch this!", "It's my best one yet."]), 2.2, 0.2);
  act.say("boss", "Who threw this?!", 2.4, FLIGHT + 0.3);
  act.say("boss", "\"Can we have recess early?\" …Fine. Five minutes.", 3.6, FLIGHT + 3);
  const kid = act.near(p.x, p.y, 400)[1];
  if (kid) act.say(kid.id, "YAAAY!", 2, FLIGHT + 6.8);
  return "egg-whoosh";
}

function fireDrill(act: SceneryActions): string | null {
  const f = pullAt(act.L);
  if (!f || drill) return null;
  drill = { t0: act.t };
  lastEgg = act.t;
  const all = act.near(f.x, f.y + 100, 1000);
  all.slice(0, 5).forEach((p, i) => act.say(p.id, pick(["FIRE DRILL!", "Single file!", "Leave your bags!", "Walk, don't run!", "Is this a real one?!"]), 2, 0.6 + i * 0.4));
  act.say("boss", "Just a drill! Two minutes ten. Not bad!", 3, DRILL - 3.5);
  const w = all[1];
  if (w) act.say(w.id, "Who pulled it?", 2.2, DRILL - 0.2);
  const z = all[2];
  if (z) act.say(z.id, "…Peanut?", 2.2, DRILL + 2);
  return "egg-alarm";
}

// ------------------------------------------------------------------ drawing

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const out: Drawable[] = [];
  const t = info.t;
  const f = pullAt(L);
  if (f) out.push({ z: f.y + f.h, draw: () => ctx.drawImage(pullSprite(drill !== null), f.x, f.y) });
  const p = planeAt(L);
  if (p) {
    const k = plane ? t - plane.t0 : -1;
    if (plane && k > FLIGHT + 8) plane = null;
    if (k < 0.3) out.push({ z: p.y + 6, draw: () => ctx.drawImage(planeSprite(0), p.x, p.y) });
    else if (k < FLIGHT) out.push({ z: L.H + 50, draw: () => drawFlight(ctx, L, p, k / FLIGHT) });
    else {
      // Landed on your desk, then unfolded into a note.
      const d = L.boss.desk;
      out.push({ z: d.y + d.h + 1, draw: () => ctx.drawImage(k < FLIGHT + 2.6 ? planeSprite(0) : noteSprite(), d.x + d.w / 2 - 5, d.y + 2) });
    }
  }
  const cage = hamsterOut(t) ? hamsterAt(L) : null;
  if (cage) {
    const h = hamsterPos(L, cage, t - HAMSTER.outAt);
    out.push({ z: h.y + 1, draw: () => ctx.drawImage(peanut(h.face, Math.floor(t * 14) % 2), Math.round(h.x - 3), Math.round(h.y - 4)) });
  }
  return out;
}

/** After the darkness: the drill's red lights flashing over the whole school. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || !drill) return;
  const k = info.t - drill.t0;
  if (k > DRILL + 4) {
    drill = null;
    return;
  }
  if (k > DRILL) return;
  const on = Math.floor(k * 2.5) % 2 === 0;
  if (!on) return;
  ctx.fillStyle = `rgba(255,40,30,${(0.16 * Math.min(1, (DRILL - k) / 2)).toFixed(3)})`;
  ctx.fillRect(0, 0, L.W, L.H);
}

export function eggLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL || !drill) return [];
  const f = pullAt(L);
  return f && info.t - drill.t0 < DRILL && Math.floor((info.t - drill.t0) * 2.5) % 2 === 0 ? [[f.x + 3, f.y + 4, 40, 0.8, "#ff3a2a", 0.5]] : [];
}

/** Peanut's run: out of the cage to the corridor, zigzag along it and back, home. */
function hamsterPos(L: Layout, cage: Rect, k: number): { x: number; y: number; face: 1 | -1 } {
  const x0 = cage.x + 9;
  const y0 = cage.y + cage.h + 2;
  const yc = corridorOf(L);
  const far = Math.max(20, Math.min(L.W - 20, x0 + (x0 < L.W / 2 ? 220 : -220)));
  const dir = far > x0 ? 1 : -1;
  if (k < 2) return { x: x0, y: y0 + (yc - y0) * ease(k / 2), face: dir };
  if (k < 9) return { x: x0 + (far - x0) * ((k - 2) / 7), y: yc + Math.sin(k * 6) * 4, face: dir };
  if (k < 10.5) return { x: far + Math.sin(k * 20), y: yc, face: (Math.floor(k * 4) % 2 ? 1 : -1) as 1 | -1 };
  if (k < 17) return { x: far + (x0 - far) * ((k - 10.5) / 6.5), y: yc + Math.sin(k * 7) * 3, face: (-dir) as 1 | -1 };
  return { x: x0, y: yc + (y0 - yc) * ease((k - 17) / 2.5), face: (-dir) as 1 | -1 };
}

/** The airplane's flight: up over the room, a loop, a long glide down onto your desk. */
function drawFlight(ctx: Ctx, L: Layout, p: Rect, q: number): void {
  const d = L.boss.desk;
  const tx = d.x + d.w / 2;
  const ty = d.y + 4;
  const x = p.x + (tx - p.x) * q + Math.sin(q * Math.PI * 2) * 40;
  const y = p.y + (ty - p.y) * q - Math.sin(q * Math.PI) * 60 + Math.cos(q * Math.PI * 2 + Math.PI / 2) * 18;
  ctx.drawImage(planeSprite(Math.cos(q * Math.PI * 2) > 0 ? 0 : 1), Math.round(x - 5), Math.round(y - 3));
}

// ------------------------------------------------------------------ sprites

const planeSprite = (frame: number) =>
  sprite(`egg-plane-${frame}`, 10, 6, (g) => {
    if (frame === 0) g.rect(0, 2, 9, 1, "#f4f2ea").rect(2, 1, 6, 1, "#f4f2ea").rect(3, 3, 6, 1, "#d8d4cc").set(9, 2, "#f4f2ea");
    else g.rect(1, 2, 9, 1, "#f4f2ea").rect(2, 1, 6, 1, "#f4f2ea").rect(1, 3, 6, 1, "#d8d4cc").set(0, 2, "#f4f2ea");
  });

const noteSprite = () =>
  sprite("egg-note", 11, 9, (g) => {
    // Unfolded, still creased: a crayon note on yellow paper, with a smiley.
    g.rect(0, 0, 11, 9, "#fff3a0").vline(5, 0, 9, "#e8d878").hline(0, 4, 11, "#e8d878");
    g.hline(1, 2, 3, C.red).hline(1, 6, 3, C.blue).hline(7, 2, 3, C.purple);
    g.set(7, 6, OUTLINE).set(9, 6, OUTLINE).hline(7, 7, 3, C.red);
  });

const pullSprite = (pulled: boolean) =>
  sprite(`egg-pull-${pulled}`, 7, 9, (g) => {
    g.rect(0, 0, 7, 9, C.red).rect(1, 1, 5, 2, "#f4f2ea").rect(2, pulled ? 6 : 4, 3, 2, "#f4f2ea");
  });

const peanut = (face: 1 | -1, step: number) =>
  sprite(`egg-peanut-${face}-${step}`, 7, 5, (g) => {
    // A round golden hamster, side on, legs a blur.
    g.rect(1, 1, 5, 3, "#e8a050").rect(face > 0 ? 4 : 1, 1, 2, 2, "#f2c48a").set(face > 0 ? 6 : 0, 2, "#e8a050");
    g.set(face > 0 ? 5 : 1, 1, OUTLINE).set(face > 0 ? 6 : 0, 3, "#f2a0a8");
    g.set(step ? 2 : 3, 4, "#c47a3a").set(step ? 4 : 5, 4, "#c47a3a");
  });

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  "egg-squeak"(k) {
    // The cage door, then a tiny squeak.
    k.tone(600, 0, 0.12, "square", 0.02, 400);
    k.tone(2200, 0.3, 0.08, "sine", 0.05, 2800);
    k.tone(2400, 0.45, 0.06, "sine", 0.04, 3000);
  },
  "egg-whoosh"(k) {
    k.swell(0, 1.4, 0.08, 600, 2400, 1.2);
  },
  "egg-alarm"(k) {
    // The bell ringing on and on, a whoop over it.
    for (let i = 0; i < 18; i++) k.tone(1400, i * 0.11, 0.06, "square", 0.04);
    k.tone(600, 0, 1, "sawtooth", 0.03, 1200);
    k.tone(600, 1, 1, "sawtooth", 0.03, 1200);
  },
};
