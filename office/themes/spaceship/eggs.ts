// Spaceship: two more hidden Easter eggs (besides the boarding-party duel).
// Neither is outlined when you hold Alt, and each also happens on its own
// about once every hour or two with the office open.
//
// - The self-destruct button: a little red button under a flip-up cover on
//   the bridge console, next to the gravity switch. Press it and the
//   viewscreen counts down from ten in big red letters, the bridge flashes
//   red, the crew panic, and at zero: confetti, a cake and HAPPY BIRTHDAY on
//   the screen. The ship's AI was just kidding. Nobody's birthday.
// - The loose vent: a grate in the corridor floor. Nudge it and Nugget, the
//   ship's hamster, comes rolling out in a zero-g exercise ball, careers up
//   and down the corridor and rolls back home again.
//
// Clicks only set the clock; it's all drawn from it by `eggDecor` and
// `eggOverlay`: a few cached sprites and some confetti pixels per frame.

import type { Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { ctx2d } from "../../pixel.ts";
import { Grid, cached, drawPixelText, pixelTextWidth } from "../../themekit.ts";
import { duelK } from "./duel.ts";
import { P, done, fill } from "./pal.ts";
import { planOf, type ShipPlan } from "./plan.ts";
import { SHIP, faceScreen, since } from "./state.ts";

type Ctx = CanvasRenderingContext2D;

const NEVER = -1e9;
const COUNT = 10;
const BOOM = 17;
const ROLL = 12;

const EGG = { boomAt: NEVER, rollAt: NEVER, autoAt: NEVER, told: false };

const HOVER = {
  button: "A little red button under a cover · SELF-DESTRUCT (do not)",
  vent: "A vent grate · one of the screws is missing",
};

const LINES = {
  boom: ["Captain?!", "Who pressed that?!", "Abandon snacks!", "I never finished my tea!"],
  boss: "It's not my birthday.",
  crew: "It's somebody's birthday somewhere.",
  ai: "Just kidding. Happy birthday!",
  roll: ["Is that… Nugget?", "Who left the habitat open?", "Go, Nugget, go!", "Mind your feet!"],
  rollBoss: "Somebody fetch a lettuce leaf.",
};

// ------------------------------------------------------------------ where things are

function buttonRect(plan: ShipPlan): Rect | null {
  const v = plan.viewscreen;
  if (v.w <= 0) return null;
  const g = plan.gravity;
  return g ? { x: g.x - 14, y: g.y + 5, w: 8, h: 7 } : { x: v.x + v.w - 30, y: v.y + v.h + 9, w: 8, h: 7 };
}

/** The vent: in the corridor floor, between the aisles (or the middle of the deck). */
function ventRect(L: Layout): Rect | null {
  const hall = L.net.halls[0];
  if (hall === undefined) return null;
  const [a, b] = L.net.aisles;
  const x = Math.round(a !== undefined && b !== undefined ? (a + b) / 2 + 30 : L.W / 2);
  return { x: x - 6, y: hall + 4, w: 12, h: 5 };
}

/** Nugget's run: out of the vent, off one way, back the other, home. */
function rollPath(L: Layout, v: Rect): Point[] {
  const y = v.y + 2;
  const cx = v.x + 6;
  return [{ x: cx, y }, { x: Math.min(L.W - 24, cx + 170), y: y - 4 }, { x: Math.max(24, cx - 210), y: y - 4 }, { x: cx, y }];
}

// ------------------------------------------------------------------ clicks

export function eggClickables(L: Layout): SceneryClickable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: SceneryClickable[] = [];
  const b = buttonRect(plan);
  if (b) out.push({ id: "egg-destruct", rect: { x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 }, hover: HOVER.button, secret: true });
  const v = ventRect(L);
  if (v) out.push({ id: "egg-vent", rect: { x: v.x - 1, y: v.y - 2, w: v.w + 2, h: v.h + 3 }, hover: HOVER.vent, secret: true });
  return out;
}

const quiet = (t: number) => since(EGG.boomAt, t, BOOM) < 0 && since(EGG.rollAt, t, ROLL) < 0 && duelK(t) < 0 && since(SHIP.alertAt, t, 8) < 0;

export function eggClick(id: string, act: SceneryActions): string | null {
  const plan = planOf(act.L);
  if (!plan || !quiet(act.t)) return null;
  if (id === "egg-destruct") {
    EGG.boomAt = act.t;
    EGG.told = false;
    faceScreen(act.t, BOOM - 1);
    const r = plan.bridge;
    const crew = act.near(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.6 + 120);
    LINES.boom.forEach((text, i) => {
      const p = crew[i % Math.max(1, Math.min(3, crew.length))];
      if (p) act.say(p.id, text, 2.2, 0.8 + i * 2.2);
    });
    act.say("boss", LINES.boss, 2.6, COUNT + 1.8);
    if (crew[1] ?? crew[0]) act.say((crew[1] ?? crew[0])!.id, LINES.crew, 3, COUNT + 4.4);
    return "ship-destruct";
  }
  if (id === "egg-vent") {
    const v = ventRect(act.L);
    if (!v) return null;
    EGG.rollAt = act.t;
    const near = act.near(v.x, v.y, 240);
    LINES.roll.forEach((text, i) => {
      const p = near[i % Math.max(1, Math.min(3, near.length))];
      if (p) act.say(p.id, text, 2.2, 0.9 + i * 2.4);
    });
    act.say("boss", LINES.rollBoss, 2.6, 9.6);
    return "ship-vent";
  }
  return null;
}

/** The AI owns up at zero; and now and then one of them on its own (about once an hour and a half). */
export function eggTick(act: SceneryActions): void {
  if (!EGG.told && since(EGG.boomAt, act.t, BOOM) >= COUNT) {
    EGG.told = true;
    SHIP.aiAt = act.t;
    SHIP.aiLine = LINES.ai;
  }
  if (!quiet(act.t) || act.t - EGG.autoAt < 1800 || Math.random() > 1 / 10800) return;
  EGG.autoAt = act.t;
  const sound = eggClick(Math.random() < 0.5 ? "egg-destruct" : "egg-vent", act);
  if (sound) act.play(sound);
}

// ------------------------------------------------------------------ sprites

function buttonSprite(open: boolean): HTMLCanvasElement {
  return cached(`spaceship|egg-button-${open}`, () => {
    const g = new Grid(8, 7);
    // A red button in a hazard-striped collar, its clear cover down or flipped up.
    g.rect(0, 2, 8, 5, P.steelDeep).rect(1, 3, 6, 3, P.hazard).set(2, 3, P.steelDeep).set(5, 5, P.steelDeep).rect(2, 3, 4, 2, P.red).set(3, 3, P.white);
    if (open) g.rect(1, 0, 6, 2, P.whiteLo);
    else g.rect(1, 2, 6, 1, P.whiteLo).set(1, 3, P.whiteLo).set(6, 3, P.whiteLo);
    return done(g);
  });
}

function ventSprite(open: boolean): HTMLCanvasElement {
  return cached(`spaceship|egg-vent-${open}`, () => {
    const g = new Grid(12, 5);
    if (open) g.rect(0, 0, 12, 5, P.void).rect(1, 1, 10, 3, "#0e1118");
    else for (let x = 0; x < 12; x++) g.vline(x, 0, 5, x % 2 ? P.grate : P.grateHi);
    g.set(1, 1, P.panelMid);
    return done(g);
  });
}

function ballSprite(frame: number): HTMLCanvasElement {
  return cached(`spaceship|egg-ball-${frame}`, () => {
    const g = new Grid(10, 10);
    // A clear exercise ball, a hamster scrambling inside it.
    g.ellipse(5, 5, 5, 5, "#bfe8f5").ellipse(5, 5, 4, 4, "#d9f3fa");
    g.ellipse(5, 6, 3, 2, "#e6a35a").set(frame % 2 ? 7 : 3, 5, "#f6efe4").set(frame % 2 ? 7 : 3, 4, "#2a2a30");
    g.set(frame % 2 ? 3 : 7, 8, "#f2a7b8").set(5, 8, "#f2a7b8");
    g.set(2, 2, P.white).set(3, 1, P.white);
    return done(g);
  });
}

/** Big pixel text: the little font drawn at `k`× (cached per text and color). */
function bigText(text: string, color: string, k: number): HTMLCanvasElement {
  return cached(`spaceship|egg-big-${text}-${color}-${k}`, () => {
    // A pixel of slack each side: some glyphs reach past their advance.
    const w = pixelTextWidth(text) + 4;
    const small = document.createElement("canvas");
    small.width = w;
    small.height = 8;
    drawPixelText(ctx2d(small), text, 1, 1, color);
    const big = document.createElement("canvas");
    big.width = w * k;
    big.height = 8 * k;
    const c = ctx2d(big);
    c.imageSmoothingEnabled = false;
    c.drawImage(small, 0, 0, w * k, 8 * k);
    return big;
  });
}

const cakeSprite = () =>
  cached("spaceship|egg-cake", () => {
    const g = new Grid(22, 16);
    // A two-tier cake with pink icing and three candles.
    g.rect(1, 9, 20, 6, P.cream).rect(1, 9, 20, 2, "#f2a7b8").rect(4, 4, 14, 5, P.cream).rect(4, 4, 14, 2, "#f2a7b8");
    for (const x of [7, 11, 15]) g.rect(x, 1, 1, 3, P.cyan);
    g.hline(0, 15, 22, P.panelLo);
    return done(g);
  });

// ------------------------------------------------------------------ drawing

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const t = info.t;
  const out: Drawable[] = [];
  const b = buttonRect(plan);
  const k = since(EGG.boomAt, t, BOOM);
  if (b) out.push({ z: b.y + b.h, draw: () => ctx.drawImage(buttonSprite(k >= 0 && k < COUNT), b.x, b.y) });
  if (k >= 0) out.push({ z: plan.viewscreen.y + plan.viewscreen.h + 1, draw: () => drawScreen(ctx, plan.viewscreen, k, t) });
  const v = ventRect(L);
  if (v) {
    const r = since(EGG.rollAt, t, ROLL);
    out.push({ z: v.y - 6, draw: () => ctx.drawImage(ventSprite(r >= 0 && r < ROLL - 0.6), v.x, v.y) });
    if (r >= 0.4 && r < ROLL - 0.8) {
      const path = rollPath(L, v);
      const u = (r - 0.4) / (ROLL - 1.2);
      const p = along(path, u * u * (3 - 2 * u));
      const hop = Math.round(Math.abs(Math.sin(r * 7)) * 3);
      out.push({
        z: p.y + 4,
        draw: () => {
          fill(ctx, Math.round(p.x) - 4, Math.round(p.y) + 4, 9, 1, "rgba(0,0,0,0.25)");
          ctx.drawImage(ballSprite(Math.floor(r * 10)), Math.round(p.x) - 5, Math.round(p.y) - 6 - hop);
        },
      });
    }
  }
  return out;
}

function along(path: Point[], u: number): Point {
  const segs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
  let left = Math.max(0, Math.min(1, u)) * (segs.reduce((a, b) => a + b, 0) || 1);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (left <= s || i === segs.length - 1) {
      const f = s > 0 ? Math.min(1, left / s) : 1;
      return { x: path[i]!.x + (path[i + 1]!.x - path[i]!.x) * f, y: path[i]!.y + (path[i + 1]!.y - path[i]!.y) * f };
    }
    left -= s;
  }
  return path[path.length - 1]!;
}

/** The biggest of 1× or 2× at which a line fits across the screen with a margin. */
const fitScale = (v: Rect, text: string) => Math.max(1, Math.min(2, Math.floor((v.w - 10) / (pixelTextWidth(text) + 2))));

/** On the viewscreen: the countdown in big red letters, then the cake and HAPPY BIRTHDAY. */
function drawScreen(ctx: Ctx, v: Rect, k: number, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.x, v.y, v.w, v.h);
  ctx.clip();
  if (k < COUNT) {
    const flash = Math.floor(k * 2) % 2 === 0;
    fill(ctx, v.x, v.y, v.w, v.h, flash ? "rgba(90,6,10,0.85)" : "rgba(30,4,8,0.85)");
    const title = bigText("SELF-DESTRUCT", flash ? P.red : "#ffb3b3", fitScale(v, "SELF-DESTRUCT"));
    ctx.drawImage(title, Math.round(v.x + (v.w - title.width) / 2), v.y + 6);
    const n = bigText(String(COUNT - Math.floor(k)), P.white, Math.max(2, Math.min(5, Math.floor(v.h / 14))));
    ctx.drawImage(n, Math.round(v.x + (v.w - n.width) / 2), Math.round(v.y + v.h - n.height - 4));
  } else {
    const kk = k - COUNT;
    fill(ctx, v.x, v.y, v.w, v.h, "rgba(20,24,60,0.9)");
    const word = "HAPPY BIRTHDAY!";
    const scale = fitScale(v, word);
    const colors = ["#ff6b8b", P.amber, P.mint, P.cyan, P.violet];
    let x = Math.round(v.x + (v.w - (pixelTextWidth(word) + 2) * scale) / 2);
    for (const [i, ch] of [...word].entries()) {
      const c = bigText(ch, colors[(i + Math.floor(t * 4)) % colors.length]!, scale);
      const bob = Math.round(Math.sin(t * 6 + i * 0.7) * 1.5);
      ctx.drawImage(c, x, v.y + 5 + bob);
      x += (pixelTextWidth(ch) + (ch === " " ? 0 : 1)) * scale;
    }
    const cake = cakeSprite();
    const cx = Math.round(v.x + (v.w - cake.width) / 2);
    const cy = Math.round(v.y + v.h - cake.height - 3);
    ctx.drawImage(cake, cx, cy);
    for (const fx of [7, 11, 15]) fill(ctx, cx + fx, cy - (Math.floor(t * 8 + fx) % 2), 1, 1, P.amber);
    // Fireworks bursting behind it now and then.
    for (let i = 0; i < 3; i++) {
      const p = (kk * 0.7 + i / 3) % 1;
      const bx = v.x + 16 + ((i * 53) % Math.max(1, v.w - 32));
      const by = v.y + 18 + ((i * 29) % Math.max(1, v.h - 36));
      for (let a = 0; a < 8; a++) fill(ctx, Math.round(bx + Math.cos(a * 0.785) * p * 12), Math.round(by + Math.sin(a * 0.785) * p * 8), 1, 1, colors[(i + a) % colors.length]!);
    }
  }
  ctx.restore();
}

/** Over everything: the bridge flashing red during the countdown, then confetti falling all over it. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  const k = since(EGG.boomAt, info.t, BOOM);
  if (!plan || k < 0) return;
  const r = plan.bridge;
  if (k < COUNT) {
    if (Math.floor(k * 2) % 2 === 0) fill(ctx, 0, 0, L.W, L.H, "rgba(255,40,40,0.09)");
    return;
  }
  const colors = ["#ff6b8b", P.amber, P.mint, P.cyan, P.violet, P.white];
  const kk = k - COUNT;
  for (let i = 0; i < 70; i++) {
    const h = (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296;
    const h2 = (Math.imul(i + 7, 40503) >>> 0) % 1000 / 1000;
    const x = r.x + h * r.w + Math.sin(info.t * 3 + i) * 3;
    const y = r.y - 10 + (kk * (26 + h2 * 30) + h2 * 40) % (r.h + 20);
    if (kk < 0.3 + h2 * 0.6) continue;
    fill(ctx, Math.round(x), Math.round(y), 1 + (i % 2), 1 + ((i >> 1) % 2), colors[i % colors.length]!);
  }
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // Ten falling klaxon beeps, then a party horn, pops and a happy fanfare.
  "ship-destruct": (k) => {
    for (let i = 0; i < COUNT; i++) {
      k.tone(880, i, 0.22, "square", 0.022, 760);
      k.tone(660, i + 0.5, 0.2, "square", 0.018);
    }
    k.tone(392, COUNT, 0.5, "sawtooth", 0.03, 523);
    for (const p of [0.1, 0.35, 0.6]) k.noise(COUNT + p, 0.06, 0.06, 2600);
    [523, 659, 784, 1047].forEach((f, i) => k.tone(f, COUNT + 0.8 + i * 0.16, 0.3, "triangle", 0.04));
  },
  // The grate clanking open, a squeak, the ball rumbling about, and it clicking shut.
  "ship-vent": (k) => {
    k.noise(0, 0.08, 0.05, 1400);
    k.tone(1800, 0.3, 0.1, "sine", 0.03, 2400);
    k.swell(0.5, ROLL - 1.4, 0.03, 300, 500, 2, "lowpass");
    k.tone(2000, 5.5, 0.08, "sine", 0.025, 2600);
    k.noise(ROLL - 0.7, 0.06, 0.05, 1600);
  },
};
