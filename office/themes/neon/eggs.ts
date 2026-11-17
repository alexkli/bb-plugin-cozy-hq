// Neon City: Easter eggs, left for you to find (holding Alt doesn't outline
// them), and each turns up on its own once in a long while.
//
// - A stuck pixel on the pavement: poke it and the whole city crashes and
//   reboots, boot screen and all.
// - A can of cat food by a wall: something very big comes to see about it,
//   rising up over the skyline in a window.
// - A fortune cookie on a bollard: a little drone takes the fortune to
//   whoever's nearest, and they read it out.
import type { Drawable, OutsideInfo, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, drawPixelText, Grid, hash, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { P } from "./kit.ts";
import { planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;
type Kind = "reboot" | "cat" | "fortune";

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

const SAY = {
  hover: {
    pixel: "A stuck pixel. It's been like that for weeks",
    can: "A can of cat food. Family size. Very, very large family",
    cookie: "A fortune cookie, left on a bollard",
  },
  crashed: ["Did the city just… crash?", "Who unplugged the city?", "Was that a blue screen? The whole street?"],
  rebooted: ["Have you tried turning it off and on again?", "Everything looks… slightly sharper?", "Install updates later, please."],
  cat: ["Is that… a cat?!", "Nobody make eye contact.", "Okay, who fed it last time?", "It's purring. The windows are rattling."],
  catBoss: "Nobody feed it.",
  fortunes: [
    "“Your next merge will be conflict-free.”",
    "“A long-running job finishes. Rejoice.”",
    "“The bug is in the code you didn't touch.”",
    "“You will rename a variable and feel at peace.”",
    "“Lucky numbers: 200, 201, 204.”",
    "“Today, the tests are green. Do not ask why.”",
  ],
} as const;

/** How long each runs (s). */
const DUR: Record<Kind, number> = { reboot: 7, cat: 11, fortune: 9 };

/** The egg playing now (one at a time). */
let egg: { kind: Kind; t0: number; to?: { x: number; y: number }; from?: { x: number; y: number } } | null = null;

// ------------------------------------------------------------------ where they hide

interface Spots {
  pixel: Rect | null;
  can: Rect | null;
  cookie: { x: number; y: number } | null;
}

/**
 * The hiding places, from the plan alone (no sprites, so it works anywhere):
 * the pixel on the main street's far curb, the can at the foot of the last
 * bollard, the cookie on top of the first.
 */
function spots(L: Layout): Spots {
  return cached(`neon|eggs|${L.W}x${L.H}`, () => {
    const plan = planOf(L);
    const street = plan?.streets.find((st) => st.main) ?? plan?.streets[0];
    const first = plan?.bollards[0];
    const last = plan && plan.bollards.length > 1 ? plan.bollards[plan.bollards.length - 1]! : null;
    return {
      pixel: street ? { x: Math.round(L.W * 0.37), y: street.y + street.half - 7, w: 6, h: 6 } : null,
      can: last ? { x: Math.min(L.W - 12, last.x + 5), y: last.y - 9, w: 10, h: 9 } : null,
      cookie: first ? { x: first.x, y: first.y } : null,
    };
  });
}

export function eggClickables(L: Layout): SceneryClickable[] {
  const s = spots(L);
  const out: SceneryClickable[] = [];
  if (s.pixel) out.push({ id: "egg-pixel", rect: { x: s.pixel.x - 2, y: s.pixel.y - 2, w: 10, h: 10 }, hover: SAY.hover.pixel, secret: true });
  if (s.can) out.push({ id: "egg-can", rect: { x: s.can.x - 1, y: s.can.y - 1, w: 12, h: 12 }, hover: SAY.hover.can, secret: true });
  if (s.cookie) out.push({ id: "egg-cookie", rect: { x: s.cookie.x - 5, y: s.cookie.y - 14, w: 11, h: 9 }, hover: SAY.hover.cookie, secret: true });
  return out;
}

// ------------------------------------------------------------------ starting them

/** A click on one of them: start its egg (undefined: not one of ours). */
export function eggClick(id: string, act: SceneryActions): string | null | undefined {
  const kind: Kind | null = id === "egg-pixel" ? "reboot" : id === "egg-can" ? "cat" : id === "egg-cookie" ? "fortune" : null;
  if (!kind) return undefined;
  return start(kind, act);
}

function start(kind: Kind, act: SceneryActions): string | null {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return null;
  const L = act.L;
  const s = spots(L);
  if (kind === "reboot") {
    egg = { kind, t0: act.t };
    for (const [i, p] of act.near(L.W / 2, L.H / 2, L.W).slice(0, 2).entries()) act.say(p.id, pick(SAY.crashed), 2.6, 4.9 + i * 0.6);
    act.say("boss", pick(SAY.rebooted), 3, 6.4);
    return "nc-egg-reboot";
  }
  if (kind === "cat") {
    egg = { kind, t0: act.t };
    const win = L.wall.windows[0];
    if (win) for (const [i, p] of act.near(win.x + win.w / 2, win.y + win.h, 220).slice(0, 2).entries()) act.say(p.id, pick(SAY.cat), 2.8, 2.2 + i * 2.4);
    act.say("boss", SAY.catBoss, 2.6, 7.6);
    return "nc-egg-purr";
  }
  const from = s.cookie ?? { x: L.W / 2, y: L.H / 2 };
  const who = act.near(from.x, from.y, 260)[0];
  if (!who) return null;
  egg = { kind, t0: act.t, from, to: { x: who.x, y: who.y } };
  act.say(who.id, pick(SAY.fortunes), 4, 3.4);
  return "nc-egg-drone";
}

/** Now and then, all on its own (about once every hour and a half). */
export function eggTick(act: SceneryActions): void {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return;
  if (Math.random() > 1 / (2 * 3600 * 1.5)) return;
  start(pick<Kind>(["reboot", "cat", "fortune"]), act);
}

function running(kind: Kind, t: number): number | null {
  if (!egg || egg.kind !== kind) return null;
  const k = t - egg.t0;
  return k >= 0 && k < DUR[kind] ? k : null;
}

// ------------------------------------------------------------------ drawing

function spr(key: string, w: number, h: number, draw: (g: Grid) => void): HTMLCanvasElement {
  return cached(`neon|egg|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

const canSprite = () =>
  spr("can", 10, 9, (g) => {
    g.rect(1, 1, 8, 7, P.chrome).rect(1, 1, 8, 1, P.chromeHi).rect(1, 3, 8, 3, P.mag);
    g.set(3, 4, P.white).set(6, 4, P.white).set(4, 5, P.magHi).set(5, 5, P.magHi);
  });

const cookieSprite = () =>
  spr("cookie", 9, 6, (g) => {
    g.rect(1, 2, 7, 3, P.yel).rect(2, 1, 5, 1, P.yel).set(4, 2, P.yelLo).set(4, 3, P.yelLo);
    g.rect(7, 3, 2, 1, P.white);
  });

const droneSprite = () =>
  spr("drone", 13, 7, (g) => {
    g.rect(0, 0, 4, 1, P.cyan).rect(9, 0, 4, 1, P.cyan);
    g.rect(1, 1, 1, 2, P.steel2).rect(11, 1, 1, 2, P.steel2);
    g.rect(2, 2, 9, 3, P.steel).rect(3, 2, 7, 1, P.steelHi).set(6, 3, P.mag);
  });

const slipSprite = () => spr("slip", 7, 4, (g) => g.rect(0, 0, 7, 4, P.white).hline(1, 1, 5, P.red).hline(1, 2, 3, P.red));

/** The clues lying about, and the drone on its way. */
export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const s = spots(L);
  const out: Drawable[] = [];
  const t = info.t;
  if (s.pixel) {
    const p = s.pixel;
    // Stuck on one color most of the time, cycling now and then.
    const c = Math.floor(t * 3) % 17 < 3 ? [P.red, P.lime, P.cyan][Math.floor(t * 9) % 3]! : P.mag;
    out.push({ z: p.y + 2, draw: () => rect(ctx, p.x + 1, p.y + 1, 2, 2, c) });
  }
  if (s.can) {
    const p = s.can;
    out.push({ z: p.y + 9, draw: () => ctx.drawImage(canSprite(), p.x, p.y) });
  }
  const k = running("fortune", t);
  if (s.cookie && !(k !== null && k > 0.2)) {
    const c = s.cookie;
    out.push({ z: c.y + 0.5, draw: () => ctx.drawImage(cookieSprite(), c.x - 4, c.y - 13) });
  }
  return out;
}

/** The fortune drone and the city's reboot, over everything. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const t = info.t;
  const f = running("fortune", t);
  if (f !== null && egg?.from && egg.to) drawDrone(ctx, egg.from, egg.to, f, t);
  const r = running("reboot", t);
  if (r !== null) drawReboot(ctx, L, r, t);
}

/** Up off the bollard with the slip, over to them, a hover while they read, and off up out of the picture. */
function drawDrone(ctx: Ctx, from: { x: number; y: number }, to: { x: number; y: number }, k: number, t: number): void {
  const hoverY = to.y - 44;
  let x: number;
  let y: number;
  if (k < 0.8) {
    x = from.x;
    y = from.y - 14 - k * 30;
  } else if (k < 3.2) {
    const u = (k - 0.8) / 2.4;
    const e = u * u * (3 - 2 * u);
    x = from.x + (to.x - from.x) * e;
    y = from.y - 38 + (hoverY - (from.y - 38)) * e - Math.sin(u * Math.PI) * 24;
  } else if (k < 7.4) {
    x = to.x;
    y = hoverY + Math.sin(t * 4) * 1.5;
  } else {
    x = to.x + (k - 7.4) * 30;
    y = hoverY - (k - 7.4) * (k - 7.4) * 60;
  }
  ctx.drawImage(droneSprite(), Math.round(x - 6), Math.round(y));
  // Its little blades whirring.
  if (Math.floor(t * 20) % 2) {
    rect(ctx, Math.round(x - 7), Math.round(y), 2, 1, P.cyanHi);
    rect(ctx, Math.round(x + 5), Math.round(y), 2, 1, P.cyanHi);
  }
  // The slip dangles under it until it's handed over.
  if (k < 3.4) ctx.drawImage(slipSprite(), Math.round(x - 3), Math.round(y + 8));
}

/** The city crashes: glitching bands, black from the top down, a boot screen, then the picture back from the top. */
function drawReboot(ctx: Ctx, L: Layout, k: number, t: number): void {
  const { W, H } = L;
  if (k < 0.9) {
    // Glitch bands, more and more of them.
    const n = Math.floor(3 + k * 14);
    for (let i = 0; i < n; i++) {
      const h = hash(`band${i}${Math.floor(t * 12)}`);
      const y = h % H;
      ctx.fillStyle = [P.mag, P.cyan, P.lime, P.white][h % 4]!;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, y, W, 1 + (h >>> 8) % 4);
      ctx.globalAlpha = 1;
    }
    return;
  }
  const down = Math.min(1, (k - 0.9) / 0.5);
  const back = k > 5.6 ? Math.min(1, (k - 5.6) / 1.2) : 0;
  const top = Math.round(H * back);
  const bottom = Math.round(H * down);
  if (bottom > top) {
    ctx.fillStyle = "#06040e";
    ctx.fillRect(0, top, W, bottom - top);
  }
  if (back > 0 && back < 1) rect(ctx, 0, top, W, 2, P.cyanHi);
  if (k < 1.4 || k > 5.6) return;
  // The boot screen.
  const cx = Math.round(W / 2);
  const cy = Math.round(H / 2);
  // (The pixel font has capitals, digits and a little punctuation.)
  const title = "NEON CITY OS";
  drawPixelText(ctx, title, cx - Math.round(pixelTextWidth(title) / 2), cy - 22, P.cyan);
  const pct = Math.min(100, Math.floor(((k - 1.6) / 3.6) * 100));
  const line = k < 1.9 ? "CITY.EXE STOPPED RESPONDING" : pct < 100 ? `REBOOTING CITY... ${Math.max(0, pct)}` : "ALL LIGHTS ON";
  drawPixelText(ctx, line, cx - Math.round(pixelTextWidth(line) / 2), cy - 8, k < 1.9 ? P.red : P.white);
  const bw = Math.min(160, W - 40);
  rect(ctx, cx - bw / 2 - 1, cy + 6, bw + 2, 6, P.steel);
  rect(ctx, cx - bw / 2, cy + 7, Math.round((bw * Math.max(0, pct)) / 100), 4, P.mag);
  if (Math.floor(t * 2) % 2) rect(ctx, cx - bw / 2, cy + 18, 4, 6, P.cyan);
}

/** In a window, over the skyline: a very big cat, come about its dinner. */
export function eggOutside(ctx: Ctx, win: Rect, info: OutsideInfo): void {
  const k = running("cat", info.t);
  if (k === null) return;
  // It peeks in at the widest window (all of its face in one pane).
  const wins = info.windows.length > 0 ? info.windows : [win];
  const pane = wins.reduce((a, b) => (b.w > a.w ? b : a));
  if (pane.x !== win.x || pane.y !== win.y) return;
  // Up from below the skyline, a good look round, back down.
  const up = k < 2.2 ? k / 2.2 : k > 8.6 ? Math.max(0, 1 - (k - 8.6) / 2.2) : 1;
  const e = up * up * (3 - 2 * up);
  const r = Math.round(Math.max(12, Math.min(win.w * 0.3, win.h * 0.5)));
  const cx = Math.round(win.x + win.w / 2 + Math.sin(info.t * 0.6) * 4);
  const cy = Math.round(win.y + win.h + r * 1.4 - e * (r * 1.4 + win.h * 0.3));
  ctx.fillStyle = P.vioDim;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.15, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ears, one twitching now and then.
  const twitch = Math.floor(info.t * 1.3) % 5 === 0 ? 3 : 0;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * r * 0.95, cy - r * 0.35);
    ctx.lineTo(cx + side * r * 0.85, cy - r * 1.35 + (side > 0 ? twitch : 0));
    ctx.lineTo(cx + side * r * 0.3, cy - r * 0.85);
    ctx.fill();
  }
  // A rim of neon light along the top of its head.
  ctx.strokeStyle = P.mag;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.15, r, 0, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // Eyes: glowing, a slow blink, following the street a little.
  const blink = Math.floor(info.t * 10) % 37 < 2 || (k > 5 && k < 5.2);
  const look = Math.round(Math.sin(info.t * 0.9) * r * 0.08);
  for (const side of [-1, 1]) {
    const ex = Math.round(cx + side * r * 0.42 + look);
    const ey = Math.round(cy - r * 0.2);
    if (blink) {
      rect(ctx, ex - 4, ey, 9, 1, P.cyan);
      continue;
    }
    ctx.fillStyle = P.cyan;
    ctx.beginPath();
    ctx.ellipse(ex, ey, Math.max(3, r * 0.2), Math.max(2, r * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, ex - 1, ey - Math.round(r * 0.12), 2, Math.max(3, Math.round(r * 0.24)), P.void);
  }
  // A little nose and a satisfied mouth.
  rect(ctx, cx - 2, Math.round(cy + r * 0.08), 4, 2, P.magHi);
  rect(ctx, cx - 5, Math.round(cy + r * 0.2), 4, 1, P.magLo);
  rect(ctx, cx + 1, Math.round(cy + r * 0.2), 4, 1, P.magLo);
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // Power down, a pause, the boot chime.
  "nc-egg-reboot": (k) => {
    k.tone(440, 0, 0.9, "sawtooth", 0.05, 40);
    k.noise(0, 0.6, 0.04, 3000);
    k.tone(392, 5.6, 0.25, "sine", 0.06);
    k.tone(523, 5.8, 0.25, "sine", 0.06);
    k.tone(784, 6.0, 0.6, "sine", 0.06);
  },
  // A purr deep enough to rattle the glass.
  "nc-egg-purr": (k) => {
    for (let i = 0; i < 5; i++) k.tone(38 + (i % 2) * 4, 2.4 + i * 0.9, 0.7, "sawtooth", 0.035);
    k.tone(330, 5.6, 0.5, "triangle", 0.04, 520);
  },
  // Whirring blades, up and over.
  "nc-egg-drone": (k) => {
    k.swell(0, 3.2, 0.03, 900, 1600, 6, "bandpass");
    k.tone(1320, 3.3, 0.08, "square", 0.03);
    k.swell(7.4, 1.4, 0.03, 1400, 2400, 6, "bandpass");
  },
};
