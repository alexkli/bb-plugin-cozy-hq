// Redwood Camp: Easter eggs, left for you to find (holding Alt doesn't
// outline them), and each turns up on its own once in a long while.
//
// - A big bare footprint in the mud by a redwood: the shy forest giant who
//   made it leans out from behind the trunk, waves, and ducks back.
// - A banana slug on the plank bridge: the slug races across the bridge
//   against another, as fast as slugs go (the world's slowest photo finish).
// - A jar with holes in its lid at the foot of a tree: fireflies pour out
//   and spell a word over the clearing, then drift off.
import type { Drawable, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, drawPixelText, Grid, makeCanvas, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { ctx2d } from "../../pixel.ts";
import { C } from "./kit.ts";
import { campData, type Tree } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;
type Kind = "giant" | "slugs" | "fireflies";

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

const SAY = {
  hover: {
    print: "A footprint in the mud. A very, very big bare footprint",
    slug: "A banana slug, resting on the bridge rail",
    jar: "A jar with holes poked in the lid",
  },
  giant: ["Did anyone else see that?!", "I'm not putting that in the standup.", "It waved. It WAVED.", "Get a picture! …Too late."],
  giantBoss: "Probably just a very tall camper.",
  race: ["Go, Sunny, go!", "Come on, Lemon!", "This is so tense.", "Is it… moving?"],
  finish: ["Photo finish!", "By a whisker. A slime whisker.", "Rematch next week."],
  words: ["LGTM", "SHIP IT", "HI", "NICE", "NO BUGS"],
  sparkle: ["Whoa… it spells something.", "Did the fireflies just review my code?", "Okay, that's magic."],
} as const;

const DUR: Record<Kind, number> = { giant: 8, slugs: 24, fireflies: 11 };

let egg: { kind: Kind; t0: number; word?: string; winner?: 0 | 1 } | null = null;

// ------------------------------------------------------------------ where they hide

interface Spots {
  /** The redwood the giant hides behind, and its footprint beside it. */
  tree: Tree | null;
  print: Rect | null;
  bridge: Rect | null;
  jar: Rect | null;
  /** Where the fireflies spell their word. */
  sky: { x: number; y: number };
}

/** From the plan alone (works without sprites): the tallest redwood on the camp floor, the first bridge, a tree near the bottom. */
function spots(L: Layout): Spots {
  return cached(`redwoods|eggs|${L.W}x${L.H}`, () => {
    const d = campData(L);
    const floor = (d?.trees ?? []).filter((t) => t.role !== "treehouse" && t.base > t.h - 1 && t.base < L.H - 20 && t.x + t.w + 26 < L.W);
    const tree = floor.reduce<Tree | null>((a, b) => (!a || b.h > a.h ? b : a), null);
    const jarTree = (d?.trees ?? []).filter((t) => t !== tree && t.role !== "treehouse" && t.x + t.w + 12 < L.W).sort((a, b) => b.base - a.base)[0];
    const bridge = d?.bridges[0] ?? null;
    const a = L.net.aisles;
    return {
      tree,
      print: tree ? { x: tree.x + tree.w + 4, y: tree.base - 9, w: 7, h: 9 } : null,
      bridge,
      jar: jarTree ? { x: jarTree.x + jarTree.w + 2, y: Math.min(L.H - 12, jarTree.base) - 10, w: 7, h: 9 } : null,
      sky: { x: Math.round(a.length >= 2 ? (a[0]! + a[1]!) / 2 : L.W / 2), y: Math.round((L.net.halls[0] ?? L.H / 3) + 26) },
    };
  });
}

export function eggClickables(L: Layout): SceneryClickable[] {
  const s = spots(L);
  const out: SceneryClickable[] = [];
  if (s.print) out.push({ id: "egg-print", rect: { x: s.print.x - 2, y: s.print.y - 2, w: s.print.w + 4, h: s.print.h + 4 }, hover: SAY.hover.print, secret: true });
  if (s.bridge) out.push({ id: "egg-slug", rect: { x: s.bridge.x - 1, y: s.bridge.y - 6, w: 9, h: 7 }, hover: SAY.hover.slug, secret: true });
  if (s.jar) out.push({ id: "egg-jar", rect: { x: s.jar.x - 1, y: s.jar.y - 1, w: s.jar.w + 2, h: s.jar.h + 2 }, hover: SAY.hover.jar, secret: true });
  return out;
}

// ------------------------------------------------------------------ starting them

/** A click on one of them: start its egg (undefined: not one of ours). */
export function eggClick(id: string, act: SceneryActions): string | null | undefined {
  const kind: Kind | null = id === "egg-print" ? "giant" : id === "egg-slug" ? "slugs" : id === "egg-jar" ? "fireflies" : null;
  if (!kind) return undefined;
  return start(kind, act);
}

function start(kind: Kind, act: SceneryActions): string | null {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return null;
  const s = spots(act.L);
  if (kind === "giant") {
    if (!s.tree) return null;
    egg = { kind, t0: act.t };
    for (const [i, p] of act.near(s.tree.x + s.tree.w, s.tree.base - 20, 200).slice(0, 2).entries()) act.say(p.id, pick(SAY.giant), 2.8, 6.4 + i * 1.6);
    act.say("boss", SAY.giantBoss, 3, 9.2);
    return "rw-egg-giant";
  }
  if (kind === "slugs") {
    if (!s.bridge) return null;
    egg = { kind, t0: act.t, winner: Math.random() < 0.5 ? 0 : 1 };
    const fans = act.near(s.bridge.x + s.bridge.w / 2, s.bridge.y, 180).slice(0, 3);
    fans.forEach((p, i) => act.say(p.id, pick(SAY.race), 2.6, 2 + i * 5));
    if (fans[0]) act.say(fans[0].id, pick(SAY.finish), 3, DUR.slugs - 2.6);
    return "rw-egg-race";
  }
  egg = { kind, t0: act.t, word: pick(SAY.words) };
  const p = act.near(s.sky.x, s.sky.y + 20, 220)[0];
  if (p) act.say(p.id, pick(SAY.sparkle), 3, 4.2);
  return "rw-egg-fireflies";
}

/** Now and then, all on its own (about once every hour and a half). */
export function eggTick(act: SceneryActions): void {
  if (egg && act.t - egg.t0 < DUR[egg.kind]) return;
  if (Math.random() > 1 / (2 * 3600 * 1.5)) return;
  start(pick<Kind>(["giant", "slugs", "fireflies"]), act);
}

function running(kind: Kind, t: number): number | null {
  if (!egg || egg.kind !== kind) return null;
  const k = t - egg.t0;
  return k >= 0 && k < DUR[kind] ? k : null;
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement {
  return cached(`redwoods|egg|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });
}

const FUR = "#5e4330";
const FUR_HI = "#7d5c40";
const FUR_LO = "#45301f";
const FACE = "#a98466";

/** The forest giant, facing you, one arm down or up (waving). */
const giantSprite = (wave: number) =>
  spr(`giant-${wave}`, 26, 48, (g) => {
    // Shaggy body, wider at the shoulders.
    g.rect(6, 12, 14, 26, FUR).rect(4, 16, 18, 16, FUR);
    for (let y = 14; y < 38; y += 3) for (let x = 5 + (y % 2); x < 21; x += 3) g.set(x, y, y % 6 ? FUR_HI : FUR_LO);
    // Head with a lighter face.
    g.rect(7, 2, 12, 12, FUR).rect(9, 5, 8, 7, FACE).set(8, 1, FUR).set(17, 1, FUR);
    g.set(11, 7, OUTLINE).set(14, 7, OUTLINE).hline(11, 10, 4, FUR_LO).set(10, 6, FUR_LO).set(15, 6, FUR_LO);
    // Legs and big feet.
    g.rect(7, 38, 5, 8, FUR).rect(14, 38, 5, 8, FUR).rect(5, 45, 7, 3, FACE).rect(14, 45, 7, 3, FACE);
    // Arms: the left one down, the right one down or up in a wave.
    g.rect(2, 16, 3, 16, FUR).rect(1, 31, 4, 3, FACE);
    if (wave === 0) g.rect(21, 16, 3, 16, FUR).rect(21, 31, 4, 3, FACE);
    else g.rect(21, 6 + wave, 3, 12, FUR).rect(21, 3 + wave, 4, 3, FACE);
  });

const printSprite = () =>
  spr(
    "print",
    7,
    9,
    (g) => {
      g.rect(1, 3, 5, 6, C.soilLo).rect(2, 2, 3, 1, C.soilLo);
      for (const x of [0, 2, 4, 6]) g.set(x, x === 0 || x === 6 ? 1 : 0, C.soilLo);
      g.rect(2, 5, 3, 2, "#3c2c1d");
    },
    false,
  );

const slugSprite = (color: string, lo: string) =>
  spr(`slug-${color}`, 8, 4, (g) => {
    g.rect(0, 2, 7, 2, color).rect(2, 1, 4, 1, color).set(6, 1, color).set(7, 0, lo).set(6, 0, lo).hline(1, 3, 5, lo);
  });

const jarSprite = () =>
  spr("jar", 7, 9, (g) => {
    g.rect(1, 2, 5, 7, "#cfe3d8").rect(1, 0, 5, 2, C.brass).set(2, 0, C.brassHi).set(4, 0, C.iron);
    g.set(2, 4, "#e9ff8a").set(4, 6, "#e9ff8a").set(3, 7, "#f6ffc8");
  });

const flagSprite = () =>
  spr("flag", 6, 9, (g) => {
    g.vline(0, 0, 9, C.iron);
    for (let y = 0; y < 4; y++) for (let x = 1; x < 6; x++) g.set(x, y, (x + y) % 2 ? "#ffffff" : OUTLINE);
  });

// ------------------------------------------------------------------ drawing

/** The footprint, the slug and the jar where they wait; the giant and the racers when they're on. */
export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const s = spots(L);
  const t = info.t;
  const out: Drawable[] = [];
  if (s.print) {
    const p = s.print;
    out.push({ z: p.y - 30, draw: () => ctx.drawImage(printSprite(), p.x, p.y) });
  }
  if (s.jar) {
    const j = s.jar;
    const open = running("fireflies", t) !== null;
    out.push({ z: j.y + j.h, draw: () => ctx.drawImage(jarSprite(), j.x, j.y - (open ? 1 : 0)) });
  }
  const g = running("giant", t);
  if (g !== null && s.tree) {
    const tr = s.tree;
    // Out from behind the trunk, a look and a wave, back behind it.
    const out1 = g < 1.4 ? g / 1.4 : g > 6.4 ? Math.max(0, 1 - (g - 6.4) / 1.4) : 1;
    const e = out1 * out1 * (3 - 2 * out1);
    const x = Math.round(tr.x + (tr.w - 26) / 2 + e * 18);
    const wave = g > 2.2 && g < 5.6 ? 1 + (Math.floor(g * 4) % 2) * 2 : 0;
    out.push({ z: tr.base - 0.5, draw: () => ctx.drawImage(giantSprite(wave), x, tr.base - 47) });
  }
  const r = running("slugs", t);
  if (s.bridge) {
    const b = s.bridge;
    const y = b.y - 2;
    if (r === null) out.push({ z: b.y + 0.4, draw: () => ctx.drawImage(slugSprite("#f2d64a", "#b8961c"), b.x, y) });
    else {
      // From one end of the bridge to the other, ever so slowly, neck and neck.
      const track = Math.max(8, b.w - 6);
      const pos = (i: 0 | 1) => {
        const k = Math.max(0, Math.min(1, (r - 1) / (DUR.slugs - 4)));
        const lead = egg?.winner === i ? 1 : 0.94;
        return Math.round(b.x - 4 + track * k * lead + Math.sin(r * 0.8 + i * 2) * 0.6);
      };
      out.push({ z: b.y + 0.4, draw: () => ctx.drawImage(slugSprite("#f2d64a", "#b8961c"), pos(0), y) });
      out.push({ z: b.y + 0.5, draw: () => ctx.drawImage(slugSprite("#c8e04a", "#7f9a1c"), pos(1), y + 4) });
      out.push({ z: b.y + 0.6, draw: () => ctx.drawImage(flagSprite(), b.x + b.w + 1, b.y - 6) });
    }
  }
  return out;
}

/** The fireflies: out of the jar, into a word over the clearing, and away. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const k = running("fireflies", info.t);
  const s = spots(L);
  if (k === null || !s.jar || !egg?.word) return;
  const pts = wordPoints(egg.word);
  const w = pixelTextWidth(egg.word) * 4;
  const ox = Math.round(s.sky.x - w / 2);
  const oy = s.sky.y;
  const from = { x: s.jar.x + 3, y: s.jar.y };
  pts.forEach(([px, py], i) => {
    const tx = ox + px * 4;
    const ty = oy + py * 4;
    const delay = (i % 13) * 0.08;
    const u = Math.max(0, Math.min(1, (k - delay) / 3));
    const e = u * u * (3 - 2 * u);
    let x = from.x + (tx - from.x) * e + Math.sin(k * 3 + i) * 10 * (1 - e);
    let y = from.y + (ty - from.y) * e - Math.sin(u * Math.PI) * 30;
    if (k > 7.6) {
      // Scatter, each its own way.
      const v = k - 7.6;
      x += Math.cos(i * 2.4) * v * 14;
      y += Math.sin(i * 1.7) * v * 10 - v * 6;
    }
    const fade = k > 9.4 ? Math.max(0, 1 - (k - 9.4) / 1.6) : 1;
    const on = 0.55 + 0.45 * Math.sin(info.t * 6 + i * 1.3);
    ctx.globalAlpha = fade * on * (0.35 + 0.65 * info.night + (1 - info.night) * 0.4);
    rect(ctx, Math.round(x) - 1, Math.round(y), 3, 1, "#c9f56a");
    rect(ctx, Math.round(x), Math.round(y) - 1, 1, 3, "#c9f56a");
    ctx.globalAlpha = fade;
    rect(ctx, Math.round(x), Math.round(y), 1, 1, "#f8ffd0");
  });
  ctx.globalAlpha = 1;
}

/** The lit pixels of a word in the pixel font (where each firefly goes). */
function wordPoints(word: string): [number, number][] {
  return cached(`redwoods|egg|word|${word}`, () => {
    const w = pixelTextWidth(word) + 1;
    const c = makeCanvas(w, 7, (x) => drawPixelText(x, word, 0, 0, "#ffffff"));
    const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
    const out: [number, number][] = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]! > 128) out.push([x, y]);
    return out;
  });
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // A low, far-off whoop from the giant as it ducks back.
  "rw-egg-giant": (k) => {
    k.tone(150, 2.4, 0.5, "triangle", 0.05, 230);
    k.tone(230, 2.95, 0.6, "triangle", 0.05, 140);
    k.noise(6.6, 0.5, 0.025, 600);
  },
  // A tiny fanfare to start, another at the line.
  "rw-egg-race": (k) => {
    for (const [i, f] of [523, 659, 784].entries()) k.tone(f, i * 0.14, 0.12, "square", 0.03);
    for (const [i, f] of [784, 659, 1047].entries()) k.tone(f, 21.4 + i * 0.16, 0.16, "square", 0.03);
  },
  // Twinkles as they rise and spell.
  "rw-egg-fireflies": (k) => {
    for (let i = 0; i < 8; i++) k.tone(1320 + (i % 4) * 220, 0.3 + i * 0.35, 0.2, "sine", 0.02);
    k.tone(1760, 3.3, 0.6, "sine", 0.025);
  },
};
