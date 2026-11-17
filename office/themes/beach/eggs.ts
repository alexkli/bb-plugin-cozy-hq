// Surf Villa: Easter eggs, left for you to find (holding Alt doesn't outline
// them), and each turns up on its own once in a long while.
//
// - A little red buoy out in the surf: a periscope comes up beside it, has a
//   good look at the villa, and goes back down in a hurry.
// - A lone flip-flop on the sand: someone nobody can see walks up out of the
//   sea (or up the beach), wet footprints and all, spreads a towel and sunbathes, sun hat
//   floating over the dent they make.
// - A cardboard fin propped by the pool: a "shark" cruises the pool and
//   everyone near it shrieks, until it rises and it's the pool robot.
import type { Drawable, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, Grid, OUTLINE, rect } from "../../themekit.ts";
import { C } from "./kit.ts";
import { planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;
type Kind = "periscope" | "sunbather" | "shark";

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

const SAY = {
  hover: {
    buoy: "A little red buoy, bobbing",
    flop: "Someone's flip-flop. Just the one",
    fin: "A cardboard fin, propped up by the pool",
  },
  periscope: ["Was that… a periscope?", "Did the sea just look at us?", "I'm sure it's a very normal submarine."],
  periscopeBoss: "Act natural, everyone.",
  sunbather: ["Footprints… with nobody in them?!", "Who's there?", "Must be a very private person.", "Their towel is so nice though."],
  sunbatherBoss: "Don't forget sunscreen, whoever you are.",
  shark: ["SHARK!", "Out of the pool, out of the pool!", "Since when do we have a shark?!"],
  sharkEnd: ["…It's the pool robot.", "Very funny, robot.", "I wasn't scared. At all."],
} as const;

const DUR: Record<Kind, number> = { periscope: 9, sunbather: 18, shark: 12 };

let egg: { kind: Kind; t0: number } | null = null;

// ------------------------------------------------------------------ where they hide

interface Spots {
  buoy: { x: number; y: number } | null;
  /** The flip-flop, and the towel the invisible sunbather spreads (they come up out of the surf below it). */
  flop: { x: number; y: number } | null;
  towel: Rect | null;
  pool: Rect | null;
  fin: { x: number; y: number } | null;
}

/** From the plan alone (works without sprites): the surf, the open sand by the bonfire, the first pool. */
function spots(L: Layout): Spots {
  return cached(`beach|eggs|${L.W}x${L.H}`, () => {
    const p = planOf(L);
    const sea = p?.sea ?? null;
    const pool = p?.pools[0] ?? null;
    // Sand between the towels and the surf, beside the tower.
    const sandTop = Math.max(p?.sandY ?? 0, ...(p?.towels ?? []).map((t) => t.y + t.h + 10));
    // Down to the surf, or to the bottom edge on short panels with no surf.
    const end = sea ? sea.y : L.H - 2;
    const beach = p && sandTop + 28 < end ? { y0: sandTop, y1: end } : null;
    const towel = beach ? towelSpot(L, p?.tower ? p.tower.x + 70 : Math.round(L.W / 2), beach) : null;
    return {
      buoy: sea ? { x: Math.round(sea.x + sea.w * 0.86), y: sea.y + Math.round(sea.h / 2) } : null,
      flop: towel && beach ? { x: towel.x + towel.w + 10, y: beach.y1 - 9 } : null,
      towel,
      pool,
      fin: pool && pool.x + pool.w + 12 < L.W ? { x: pool.x + pool.w + 3, y: pool.y + 4 } : null,
    };
  });
}

/** Open sand for the towel and the footprints up to it (and the flip-flop beside them), clear of rooms and the other towels; null when there's none. */
function towelSpot(L: Layout, near: number, beach: { y0: number; y1: number }): Rect | null {
  const y = Math.round((beach.y0 + beach.y1) / 2) - 6;
  const towels = planOf(L)?.towels ?? [];
  // The hermit crab's home corner (the office's roomba dock): it would sit on the flip-flop.
  const A = L.eventArea;
  const dock = { x: A.x + A.w - 24, y: A.y + A.h - 14, w: 28, h: 18 };
  const blocked = (r: Rect) => [...L.rooms.map((m) => m.rect), ...towels, dock].some((q) => r.x < q.x + q.w + 4 && q.x < r.x + r.w + 4 && r.y < q.y + q.h + 4 && q.y < r.y + r.h + 4);
  for (let d = 0; d < L.W; d += 10) {
    for (const cx of [near - d, near + d]) {
      const r = { x: cx - 20, y, w: 38, h: 12 };
      if (r.x < 4 || r.x + r.w + 22 > L.W) continue;
      // The towel, and the strip below it the footprints and the flip-flop use.
      if (!blocked(r) && !blocked({ x: r.x + r.w - 10, y: r.y + r.h, w: 28, h: beach.y1 - (r.y + r.h) })) return r;
    }
  }
  return null;
}

export function eggClickables(L: Layout): SceneryClickable[] {
  const s = spots(L);
  const out: SceneryClickable[] = [];
  if (s.buoy) out.push({ id: "egg-buoy", rect: { x: s.buoy.x - 5, y: s.buoy.y - 8, w: 10, h: 11 }, hover: SAY.hover.buoy, secret: true });
  if (s.flop) out.push({ id: "egg-flop", rect: { x: s.flop.x - 2, y: s.flop.y - 2, w: 10, h: 7 }, hover: SAY.hover.flop, secret: true });
  if (s.fin) out.push({ id: "egg-fin", rect: { x: s.fin.x - 1, y: s.fin.y - 1, w: 9, h: 12 }, hover: SAY.hover.fin, secret: true });
  return out;
}

// ------------------------------------------------------------------ starting them

/** A click on one of them: start its egg (undefined: not one of ours). */
export function eggClick(id: string, act: SceneryActions): string | null | undefined {
  const kind: Kind | null = id === "egg-buoy" ? "periscope" : id === "egg-flop" ? "sunbather" : id === "egg-fin" ? "shark" : null;
  if (!kind) return undefined;
  return start(kind, act);
}

function start(kind: Kind, act: SceneryActions): string | null {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return null;
  const s = spots(act.L);
  if (kind === "periscope") {
    if (!s.buoy) return null;
    egg = { kind, t0: act.t };
    const p = act.near(s.buoy.x, s.buoy.y - 30, 260)[0];
    if (p) act.say(p.id, pick(SAY.periscope), 3, 6.4);
    act.say("boss", SAY.periscopeBoss, 2.6, 4);
    return "bv-egg-periscope";
  }
  if (kind === "sunbather") {
    if (!s.towel) return null;
    egg = { kind, t0: act.t };
    for (const [i, p] of act.near(s.towel.x + s.towel.w / 2, s.towel.y, 240).slice(0, 2).entries()) act.say(p.id, pick(SAY.sunbather), 3, 2.6 + i * 4);
    act.say("boss", SAY.sunbatherBoss, 3, 11);
    return "bv-egg-steps";
  }
  if (!s.pool) return null;
  egg = { kind, t0: act.t };
  const near = act.near(s.pool.x + s.pool.w / 2, s.pool.y + s.pool.h / 2, Math.max(120, s.pool.w));
  near.slice(0, 3).forEach((p, i) => act.say(p.id, pick(SAY.shark), 2.2, 1.6 + i * 1.1));
  if (near[0]) act.say(near[0].id, pick(SAY.sharkEnd), 3, DUR.shark - 2.6);
  return "bv-egg-shark";
}

/** Now and then, all on its own (about once every hour and a half). */
export function eggTick(act: SceneryActions): void {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return;
  if (Math.random() > 1 / (2 * 3600 * 1.5)) return;
  start(pick<Kind>(["periscope", "sunbather", "shark"]), act);
}

function running(kind: Kind, t: number): number | null {
  if (!egg || egg.kind !== kind) return null;
  const k = t - egg.t0;
  return k >= 0 && k < DUR[kind] ? k : null;
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`beach|egg|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

const buoySprite = () =>
  spr("buoy", 7, 8, (g) => {
    g.rect(1, 2, 5, 5, "#e5484d").rect(1, 4, 5, 1, C.white).set(3, 0, C.white).vline(3, 1, 1, "#a0a0a0").set(2, 2, "#ff8a8a");
  });

const flopSprite = () =>
  spr("flop", 7, 4, (g) => {
    g.rect(0, 1, 6, 3, "#ff8fb0").rect(1, 0, 4, 1, "#ff8fb0").set(2, 1, C.white).set(3, 2, C.white).set(4, 1, C.white);
  });

const finSprite = () =>
  spr("fin", 7, 10, (g) => {
    for (let y = 0; y < 9; y++) g.hline(Math.max(0, 5 - Math.floor(y * 0.7)), y, Math.min(7, 2 + Math.floor(y * 0.7)), y % 4 === 3 ? "#9a9488" : "#b5ad9e");
    g.hline(0, 9, 7, "#8a8070");
  });

/** The periscope's head looking left, ahead or right (0, 1, 2). */
const scopeSprite = (dir: number) =>
  spr(`scope-${dir}`, 9, 22, (g) => {
    g.rect(3, 4, 3, 18, "#6f7a80").vline(3, 4, 18, "#8f9aa0");
    if (dir === 1) g.rect(2, 0, 5, 5, "#56626a").rect(3, 1, 3, 2, "#cfe8ff");
    else g.rect(dir === 0 ? 0 : 3, 0, 6, 4, "#56626a").rect(dir === 0 ? 0 : 7, 1, 2, 2, "#cfe8ff");
  });

const towelSprite = (w: number) =>
  spr(`towel-${w}`, w, 12, (g) => {
    // Stripes, a little darker where someone's lying on it.
    for (let x = 0; x < w; x++) {
      const yellow = Math.floor(x / 5) % 2 === 1;
      g.vline(x, 0, 12, yellow ? "#f6c94a" : "#3fbfc0");
      if (x >= w * 0.2 && x < w * 0.8) g.vline(x, 3, 6, yellow ? "#d8a83a" : "#2b939b");
    }
  });

const hatSprite = () =>
  spr("hat", 14, 6, (g) => {
    g.rect(0, 4, 14, 2, C.rattan).rect(4, 0, 6, 4, C.rattanHi).hline(4, 3, 6, "#e5484d");
  });

const robotSprite = () =>
  spr("robot", 12, 7, (g) => {
    g.rect(1, 2, 10, 5, "#f2d64a").rect(3, 0, 6, 2, "#f2d64a").set(4, 3, OUTLINE).set(7, 3, OUTLINE).hline(4, 5, 4, "#b8961c");
  });

// ------------------------------------------------------------------ drawing

/** The clues where they wait; the footprints, the towel, the fin and the periscope when they're on. */
export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const s = spots(L);
  const t = info.t;
  const out: Drawable[] = [];
  if (s.buoy) {
    const b = s.buoy;
    const bob = Math.round(Math.sin(t * 2) * 1);
    out.push({ z: b.y + 3, draw: () => ctx.drawImage(buoySprite(), b.x - 3, b.y - 6 + bob) });
    const k = running("periscope", t);
    if (k !== null) out.push({ z: b.y + 2, draw: () => drawScope(ctx, b.x + 16, b.y, k, t) });
  }
  if (s.flop) {
    const f = s.flop;
    out.push({ z: f.y + 3, draw: () => ctx.drawImage(flopSprite(), f.x, f.y) });
  }
  const sb = running("sunbather", t);
  if (sb !== null && s.towel && s.flop) {
    const tw = s.towel;
    out.push({ z: tw.y - 20, draw: () => drawSteps(ctx, tw, s.flop!.y + 6, sb) });
    if (sb > 5.4 && sb < 15.6) out.push({ z: tw.y + tw.h, draw: () => ctx.drawImage(towelSprite(tw.w), tw.x, tw.y) });
    if (sb > 6.6 && sb < 17) {
      // The hat, hovering over where a face would be, rising off as they leave.
      const up = sb > 15 ? (sb - 15) * 18 : 0;
      const bob = Math.round(Math.sin(t * 1.4) * 1);
      out.push({ z: tw.y + tw.h + 1, draw: () => ctx.drawImage(hatSprite(), tw.x + 3, Math.round(tw.y - 8 + bob - up)) });
    }
  }
  if (s.fin && running("shark", t) === null) {
    const f = s.fin;
    out.push({ z: f.y + 10, draw: () => ctx.drawImage(finSprite(), f.x, f.y) });
  }
  return out;
}

/** In the pool, over the water: the fin cruising, then the robot under it. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const k = running("shark", info.t);
  const s = spots(L);
  if (k === null || !s.pool) return;
  const p = s.pool;
  // A lazy figure of eight round the pool, a ripple behind it.
  const a = (k / (DUR.shark - 2.4)) * Math.PI * 2;
  const x = Math.round(p.x + p.w / 2 + Math.sin(a) * (p.w / 2 - 16));
  const y = Math.round(p.y + p.h / 2 + Math.sin(a * 2) * (p.h / 2 - 14));
  const dir = Math.cos(a) >= 0 ? 1 : -1;
  const reveal = k > DUR.shark - 2.4 ? Math.min(1, (k - (DUR.shark - 2.4)) / 0.6) : 0;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 1; i <= 3; i++) {
    ctx.fillRect(x - dir * (4 + i * 4), y + 1 + i, 2, 1);
    ctx.fillRect(x - dir * (4 + i * 4), y + 1 - i, 2, 1);
  }
  const lift = Math.round(reveal * 6);
  if (reveal > 0) ctx.drawImage(robotSprite(), x - 6, y - 2 - lift);
  ctx.drawImage(finSprite(), x - 3, y - 9 - lift - (reveal > 0 ? 6 : 0));
}

/** Up out of the water, wet footprints one by one to the towel; later back down to the sea. */
function drawSteps(ctx: Ctx, tw: Rect, from: number, k: number): void {
  const n = 7;
  const fx = tw.x + tw.w - 6;
  const toY = tw.y + tw.h + 2;
  for (let i = 0; i < n; i++) {
    const at = 0.6 + i * 0.65;
    if (k < at) break;
    const u = i / (n - 1);
    const x = Math.round(fx + Math.sin(u * 2) * 6 + (i % 2 ? 3 : 0));
    const y = Math.round(from - (from - toY) * u);
    // Dark while wet, drying to sand.
    const dry = Math.min(1, (k - at) / 16);
    ctx.globalAlpha = 0.85 * (1 - dry * 0.7);
    rect(ctx, x, y, 2, 3, "#b08a4e");
    rect(ctx, x, y - 1, 2, 1, "#b08a4e");
  }
  ctx.globalAlpha = 1;
}

/** Up beside the buoy, a look left, at the villa, right, a glint, and down with a swirl of bubbles. */
function drawScope(ctx: Ctx, x: number, y: number, k: number, t: number): void {
  const rise = k < 1.4 ? k / 1.4 : k > 7.2 ? Math.max(0, 1 - (k - 7.2) / 0.6) : 1;
  const h = Math.round(rise * 18);
  if (h > 0) {
    const dir = k < 3 ? 0 : k < 5.4 ? 1 : 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 6, y - 30, 14, 30);
    ctx.clip();
    ctx.drawImage(scopeSprite(dir), x - 4, y - h);
    ctx.restore();
    // A glint off the lens as it looks at you.
    if (dir === 1 && Math.floor(t * 4) % 3 === 0) rect(ctx, x - 1, y - h - 2, 1, 1, "#ffffff");
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(x - 4, y, 9, 1);
  if (k > 7.2) for (let i = 0; i < 5; i++) ctx.fillRect(x - 6 + i * 3, y - 1 - ((i + Math.floor(t * 6)) % 3), 1, 1);
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // A sonar ping as it rises, a gurgle as it goes.
  "bv-egg-periscope": (k) => {
    k.tone(1180, 0.6, 0.5, "sine", 0.04, 1100);
    k.tone(1180, 4.2, 0.5, "sine", 0.03, 1100);
    k.swell(7.2, 1.2, 0.04, 300, 900, 4, "bandpass");
  },
  // Wet little steps, then the snap of a towel.
  "bv-egg-steps": (k) => {
    for (let i = 0; i < 7; i++) k.noise(0.6 + i * 0.65, 0.06, 0.03, 1800);
    k.noise(5.4, 0.12, 0.05, 4000);
  },
  // The two-note dread, then a sheepish beep.
  "bv-egg-shark": (k) => {
    for (let i = 0; i < 8; i++) k.tone(i % 2 ? 87 : 82, i * (0.55 - i * 0.04), 0.3, "sawtooth", 0.04);
    k.tone(880, 9.8, 0.12, "square", 0.03);
    k.tone(660, 10, 0.18, "square", 0.03);
  },
};
