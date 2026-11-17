// Sky Loft: Easter eggs, left for you to find (holding Alt doesn't outline
// them), and each turns up on its own once in a long while.
//
// - A little red button by the elevator, "do not push": the whole tower
//   sways in the wind for a few seconds, everyone with it.
// - A green light blinking in the city far below: a flying saucer drifts
//   along the windows, has a look in, beams up a rooftop antenna and zips off.
// - A grey feather on the floor: a pigeon in a tiny tie struts through the
//   loft with its briefcase, as if it works here.
import type { DriftOf, Drawable, OutsideInfo, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, Grid, OUTLINE, rect } from "../../themekit.ts";
import { C } from "./kit.ts";
import { planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;
type Kind = "sway" | "saucer" | "pigeon";

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

const SAY = {
  hover: {
    button: "A little red button. The sign under it says: DO NOT PUSH",
    light: "A green light blinking far below. Three short, three long…",
    feather: "A grey feather. Business class, by the look of it",
  },
  sway: ["Is the building… swaying?", "My coffee's doing waves.", "Designed to do that. Totally normal. Probably."],
  swayBoss: "Who pushed the button?",
  saucer: ["Did… did you see that?", "It took the antenna!", "Someone tell the doorman."],
  saucerBoss: "Not on my floor, you don't.",
  pigeon: ["Is that pigeon… on a call?", "He has a briefcase.", "I think he's in Finance.", "Did he just nod at me?"],
} as const;

const DUR: Record<Kind, number> = { sway: 8, saucer: 12, pigeon: 16 };

let egg: { kind: Kind; t0: number } | null = null;

// ------------------------------------------------------------------ where they hide

interface Spots {
  button: Rect | null;
  light: { x: number; y: number } | null;
  feather: { x: number; y: number } | null;
  /** The pigeon's walk: along the first hallway, edge to edge. */
  walk: { y: number; x0: number; x1: number } | null;
}

/** From the plan alone (works without sprites): beside the elevator, the city strip below, the first hallway. */
function spots(L: Layout): Spots {
  return cached(`skyline|eggs|${L.W}x${L.H}`, () => {
    const d = L.wall.door;
    const hall = L.net.halls[0];
    // The city strip outside the south glass (not every plan has one).
    const below = planOf(L)?.beyond.find((r) => r.w > r.h && r.y > L.H / 2);
    return {
      // On the wall just left of the elevator, under the legend note (clear of its click areas).
      button: d.x > 20 ? { x: d.x - 14, y: L.wall.legendNote.y + L.wall.legendNote.h + 4, w: 5, h: 8 } : null,
      light: below ? { x: Math.round(below.x + below.w * 0.62), y: below.y + Math.round(below.h / 2) } : null,
      feather: hall !== undefined ? clearSpot(L, hall + 9) : null,
      walk: hall !== undefined ? { y: hall + 2, x0: 14, x1: L.W - 14 } : null,
    };
  });
}

/** A spot along the hallway's edge that no fixture's click area covers (they'd take the click), towards the right. */
function clearSpot(L: Layout, y: number): { x: number; y: number } | null {
  const A = L.eventArea;
  // Fixtures, desks and the roomba's home corner (it would sit on the feather).
  const taken: Rect[] = [...L.pokeables.map((p) => p.rect), ...L.desks.map((d) => ({ x: d.x, y: d.y - 12, w: 48, h: 60 })), { x: A.x + A.w - 24, y: A.y + A.h - 14, w: 28, h: 18 }];
  for (let x = Math.round(L.W * 0.72); x > 20; x -= 12) {
    if (!taken.some((r) => x + 8 > r.x && x - 2 < r.x + r.w && y + 3 > r.y && y - 3 < r.y + r.h)) return { x, y };
  }
  return null;
}

export function eggClickables(L: Layout): SceneryClickable[] {
  const s = spots(L);
  const out: SceneryClickable[] = [];
  if (s.button) out.push({ id: "egg-button", rect: { x: s.button.x - 1, y: s.button.y - 1, w: s.button.w + 2, h: s.button.h + 2 }, hover: SAY.hover.button, secret: true });
  if (s.light) out.push({ id: "egg-light", rect: { x: s.light.x - 4, y: s.light.y - 4, w: 9, h: 8 }, hover: SAY.hover.light, secret: true });
  if (s.feather) out.push({ id: "egg-feather", rect: { x: s.feather.x - 2, y: s.feather.y - 3, w: 10, h: 6 }, hover: SAY.hover.feather, secret: true });
  return out;
}

// ------------------------------------------------------------------ starting them

/** A click on one of them: start its egg (undefined: not one of ours). */
export function eggClick(id: string, act: SceneryActions): string | null | undefined {
  const kind: Kind | null = id === "egg-button" ? "sway" : id === "egg-light" ? "saucer" : id === "egg-feather" ? "pigeon" : null;
  if (!kind) return undefined;
  return start(kind, act);
}

function start(kind: Kind, act: SceneryActions): string | null {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return null;
  const L = act.L;
  const s = spots(L);
  egg = { kind, t0: act.t };
  if (kind === "sway") {
    for (const [i, p] of act.near(L.W / 2, L.H / 2, L.W).slice(0, 2).entries()) act.say(p.id, pick(SAY.sway), 2.6, 1.4 + i * 2.6);
    act.say("boss", SAY.swayBoss, 2.6, 6.6);
    return "sl-egg-sway";
  }
  if (kind === "saucer") {
    const win = L.wall.windows[L.wall.windows.length - 1];
    if (win) for (const [i, p] of act.near(win.x, win.y + 80, 260).slice(0, 2).entries()) act.say(p.id, pick(SAY.saucer), 2.8, 5.2 + i * 2.4);
    act.say("boss", SAY.saucerBoss, 2.6, 10);
    return "sl-egg-saucer";
  }
  const w = s.walk;
  if (w) {
    for (const [i, x] of [w.x0 + (w.x1 - w.x0) * 0.3, w.x0 + (w.x1 - w.x0) * 0.7].entries()) {
      const p = act.near(x, w.y, 90)[0];
      if (p) act.say(p.id, pick(SAY.pigeon), 2.6, 3 + i * 6);
    }
  }
  return "sl-egg-coo";
}

/** Now and then, all on its own (about once every hour and a half). */
export function eggTick(act: SceneryActions): void {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return;
  if (Math.random() > 1 / (2 * 3600 * 1.5)) return;
  start(pick<Kind>(["sway", "saucer", "pigeon"]), act);
}

function running(kind: Kind, t: number): number | null {
  if (!egg || egg.kind !== kind) return null;
  const k = t - egg.t0;
  return k >= 0 && k < DUR[kind] ? k : null;
}

// ------------------------------------------------------------------ the sway

/** Everyone leans with the tower: a slow swing that builds and settles. */
export function eggDrift(who: DriftOf, info: PaintInfo): { dx: number; dy: number; tilt?: number } | null {
  const k = running("sway", info.t);
  if (k === null) return null;
  const env = Math.sin((k / DUR.sway) * Math.PI);
  const s = Math.sin(k * 2.4 + (who.seed % 7) * 0.05);
  return { dx: s * 3 * env, dy: 0, tilt: s * 0.05 * env };
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`skyline|egg|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

const buttonSprite = (down: boolean) =>
  spr(`button-${down}`, 5, 8, (g) => {
    g.rect(0, 0, 5, 5, C.steel).rect(1, down ? 2 : 1, 3, 3, "#e5484d").set(1, down ? 2 : 1, "#ff9a9a");
    // The little sign under it.
    g.rect(0, 6, 5, 2, C.plasterHi).hline(1, 7, 3, "#e5484d");
  });

const featherSprite = () =>
  spr(
    "feather",
    7,
    3,
    (g) => {
      g.hline(0, 1, 7, "#8f959e").hline(2, 0, 4, "#b8bcc4").hline(2, 2, 4, "#b8bcc4").set(0, 1, "#5a5e66");
    },
    false,
  );

/** The pigeon from the side, walking (frame 0/1), with a tie and a briefcase. */
const pigeonSprite = (frame: number, flip: boolean) =>
  spr(`pigeon-${frame}-${flip}`, 14, 13, (g) => {
    const m = (x: number) => (flip ? 13 - x : x);
    const px = (x: number, y: number, c: string) => g.set(m(x), y, c);
    const box = (x: number, y: number, w: number, h: number, c: string) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
    };
    box(2, 4, 8, 5, "#8a8f9c");
    box(8, 1, 3, 4, "#7a7e8a");
    px(10, 2, OUTLINE);
    px(11, 3, "#e8a066");
    box(8, 4, 2, 1, "#5fae8a");
    box(1, 5, 2, 2, "#5e6270");
    // The tie, the briefcase hanging under its wing, two busy feet.
    px(8, 5, "#e5484d");
    px(8, 6, "#e5484d");
    box(3, 8, 5, 3, C.walLo);
    px(5, 7, C.walDk);
    px(frame ? 4 : 6, 9 + 2, "#e8a066");
    px(frame ? 7 : 5, 9 + 2, "#e8a066");
  });

// ------------------------------------------------------------------ drawing

/** The button, the light and the feather where they wait; the pigeon on its stroll. */
export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const s = spots(L);
  const t = info.t;
  const out: Drawable[] = [];
  if (s.button) {
    const b = s.button;
    const k = running("sway", t);
    out.push({ z: b.y + 8, draw: () => ctx.drawImage(buttonSprite(k !== null && k < 0.4), b.x, b.y) });
  }
  if (s.feather && running("pigeon", t) === null) {
    const f = s.feather;
    out.push({ z: f.y + 1, draw: () => ctx.drawImage(featherSprite(), f.x, f.y - 1) });
  }
  const p = running("pigeon", t);
  if (p !== null && s.walk) {
    const w = s.walk;
    // Across and back, stopping half way to look about.
    const half = DUR.pigeon / 2;
    const leg = p < half ? p / half : (p - half) / half;
    const out1 = p < half;
    const pause = leg > 0.45 && leg < 0.6;
    const u = pause ? 0.45 : leg < 0.45 ? leg : leg - 0.15;
    const x = Math.round(out1 ? w.x0 + (w.x1 - w.x0) * (u / 0.85) : w.x1 - (w.x1 - w.x0) * (u / 0.85));
    const frame = pause ? 0 : Math.floor(t * 8) % 2;
    const bob = pause ? 0 : frame;
    out.push({ z: w.y + 1, draw: () => ctx.drawImage(pigeonSprite(frame, !out1), x - 7, w.y - 12 - bob) });
  }
  return out;
}

/** The blinking light in the city far below. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const s = spots(L);
  if (!s.light) return;
  // Three short, three long, three short.
  const c = (info.t * 3) % 12;
  const on = c < 0.5 || (c > 1 && c < 1.5) || (c > 2 && c < 2.5) || (c > 3 && c < 4.2) || (c > 4.6 && c < 5.8) || (c > 6.2 && c < 7.4);
  if (on) rect(ctx, s.light.x, s.light.y, 2, 2, "#7dff6a");
}

/** Out of the windows: the saucer gliding along them, a look in, a tractor beam on a rooftop, off like a shot. */
export function eggOutside(ctx: Ctx, win: Rect, info: OutsideInfo): void {
  const k = running("saucer", info.t);
  if (k === null) return;
  const wins = info.windows.length > 0 ? info.windows : [win];
  const x0 = Math.min(...wins.map((r) => r.x)) - 30;
  const x1 = Math.max(...wins.map((r) => r.x + r.w));
  const stop = wins[wins.length - 1]!;
  const sx = stop.x + stop.w / 2;
  const top = Math.min(...wins.map((r) => r.y));
  let x: number;
  let y = top + 12 + Math.sin(info.t * 2) * 1.5;
  if (k < 5) x = x0 + (sx - x0) * (k / 5);
  else if (k < 9.4) x = sx + Math.sin((k - 5) * 1.4) * 2;
  else {
    x = sx + (k - 9.4) * (k - 9.4) * 140;
    y -= (k - 9.4) * 20;
  }
  if (x > x1 + 40) return;
  // The beam down to a rooftop (the antenna rising up it).
  if (k > 6.2 && k < 9.2) {
    const by = stop.y + stop.h;
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(info.t * 12);
    ctx.fillStyle = "#b8ff9a";
    for (let yy = Math.round(y + 4); yy < by; yy++) {
      const half = 2 + Math.round((yy - y) * 0.3);
      ctx.fillRect(Math.round(x - half), yy, half * 2, 1);
    }
    ctx.globalAlpha = 1;
    const ay = Math.round(by - 4 - ((k - 6.2) / 3) * (by - y - 8));
    rect(ctx, Math.round(x), ay - 5, 1, 6, C.steelHi);
    rect(ctx, Math.round(x) - 2, ay - 4, 5, 1, C.steelHi);
  }
  const X = Math.round(x);
  const Y = Math.round(y);
  ctx.fillStyle = "#9fd6c8";
  ctx.beginPath();
  ctx.ellipse(X, Y - 3, 4, 3, 0, Math.PI, 0);
  ctx.fill();
  rect(ctx, X - 9, Y - 1, 19, 3, C.chrome);
  rect(ctx, X - 7, Y + 2, 15, 1, C.chromeLo);
  // Its lights chasing round the rim.
  for (let i = 0; i < 4; i++) rect(ctx, X - 7 + i * 5, Y, 1, 1, Math.floor(info.t * 8 + i) % 4 === 0 ? "#ffd23f" : "#7dff6a");
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // A click, then the tower's long creak in the wind.
  "sl-egg-sway": (k) => {
    k.tone(1200, 0, 0.04, "square", 0.04);
    k.swell(0.3, 7, 0.05, 180, 500, 3, "bandpass");
    k.tone(70, 1, 2.5, "sine", 0.04, 58);
    k.tone(64, 4, 2.5, "sine", 0.04, 76);
  },
  // The wobbly hum of something not from round here.
  "sl-egg-saucer": (k) => {
    for (let i = 0; i < 10; i++) k.tone(520 + (i % 2) * 90, i * 0.5, 0.5, "sine", 0.02);
    k.tone(400, 6.2, 3, "triangle", 0.025, 900);
    k.tone(900, 9.4, 0.5, "sine", 0.03, 2400);
  },
  // Coo, coo.
  "sl-egg-coo": (k) => {
    for (const at of [0.4, 1.1, 8.4]) {
      k.tone(420, at, 0.18, "sine", 0.04, 360);
      k.tone(380, at + 0.22, 0.28, "sine", 0.04, 330);
    }
  },
};
