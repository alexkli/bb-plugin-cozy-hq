// Mountain Cabin: two secrets, neither outlined when you hold Alt.
//
// The alphorn: a brass mouthpiece left lying on the sun deck. Click it and
// someone takes the lodge's alphorn out onto the deck and plays. The peaks
// echo the call back, twice, softer each time, and someone far across the
// valley yodels an answer. Now and then, on a clear evening, it happens on
// its own.
//
// The snowdrift: a lump of snow out on the mountainside with a red mitten
// sticking out. Click it and it wiggles ("Mmmf!"). The ski patrol's dog
// bounds over with the little cask on its collar and digs out a ski tourer,
// blue with cold, who gets a warming cup from the cask, and the two of them
// head off. The drift builds up again a minute later. Rarely, while it
// snows, someone gets stuck in it on their own.
import { charSprite, type Look } from "../../characters.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, Gathering, GatherSpot, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import { drawPixelText, OUTLINE, pixelTextWidth, rect } from "../../themekit.ts";
import { pet } from "./critters.ts";
import { C, sprite } from "./kit.ts";
import { speech } from "./lift.ts";
import { planOf, type CabinPlan } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

// ------------------------------------------------------------------ where they are

/** The alphorn's player on the deck (feet), facing right, and how long the horn can be. */
interface HornPlace {
  spot: GatherSpot;
  /** The mouthpiece on the boards: what you click. */
  piece: Point;
  len: number;
}

interface Places {
  horn: HornPlace | null;
  /** The snowdrift's middle, on the ground. */
  drift: Point | null;
}

let forL: Layout | null = null;
let places: Places = { horn: null, drift: null };
let horn: { t0: number; g: Gathering | null } | null = null;
let rescue: { t0: number; from: number; look: Look } | null = null;
/** When the drift was dug away (it builds up again a minute later). */
let dugAt = -Infinity;

function bind(L: Layout): Places {
  if (L === forL) return places;
  forL = L;
  horn = null;
  rescue = null;
  dugAt = -Infinity;
  const p = planOf(L);
  places = p ? { horn: hornPlace(L, p), drift: driftPlace(L, p) } : { horn: null, drift: null };
  return places;
}

/** On the deck's open end (the deck chairs are at the other), with room for the horn to the right. */
function hornPlace(L: Layout, p: CabinPlan): HornPlace | null {
  const d = p.deck;
  if (!d || d.w < 96 || d.h < 40) return null;
  const y = d.y + Math.min(d.h - 8, 34);
  // Past the sauna and the ski rack when they stand on the deck (phones), clear of the deck chairs.
  const inWay = [p.sauna, p.skiRack].filter((r): r is Rect => !!r && r.x < d.x + d.w && r.x + r.w > d.x && r.y < y + 4 && r.y + r.h > y - 30);
  const x = Math.max(d.x + 18, ...inWay.map((r) => r.x + r.w + 12));
  const len = Math.min(58, d.x + d.w - 70 - x);
  if (len < 30) return null;
  // Along the deck's own hallway (phones) or in through the nearest door in the deck wall (the hallway runs inside it).
  const w = p.deckWall;
  let path: Point[] | undefined;
  const onDeck = L.net.halls.some((h) => h > d.y && h < d.y + d.h);
  if (!onDeck && w && w.gaps.length > 0 && w.y0 === w.y1) {
    const mid = (g: [number, number]) => Math.round((g[0] + g[1]) / 2);
    const g = w.gaps.reduce((b, q) => (Math.abs(mid(q) - x) < Math.abs(mid(b) - x) ? q : b));
    const hall = L.net.halls.filter((h) => h < w.y0).reduce((b, h) => Math.max(b, h), -Infinity);
    if (Number.isFinite(hall)) path = [{ x: mid(g), y: hall, c: true }, { x: mid(g), y: w.y0 + 6 }, { x, y }];
  }
  return {
    spot: { x, y, facing: "right", pose: "stand", activity: "playing the alphorn", path },
    piece: { x: x - 12, y: y + 2 },
    len,
  };
}

/** A bare patch of snow outside (clear of the lodge, the deck, the lift and everything on the mountainside), low down. */
function driftPlace(L: Layout, p: CabinPlan): Point | null {
  const t = p.terrain;
  const taken: Rect[] = [{ x: p.lodge.x - 14, y: 0, w: p.lodge.w + 28, h: p.lodge.y + p.lodge.h + 8 }];
  const grow = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });
  if (p.deck) taken.push(grow(p.deck, 8));
  if (p.sauna) taken.push({ x: p.sauna.x - 8, y: p.sauna.y - 34, w: p.sauna.w + 16, h: p.sauna.h + 42 });
  if (p.lift) taken.push(grow(p.lift.area, 6));
  if (p.slope) taken.push(p.slope);
  if (t.tarn) taken.push(grow(t.tarn, 8));
  if (t.logs) taken.push(grow(t.logs, 6));
  if (t.path) taken.push({ x: t.path.x - 12, y: t.path.y0, w: 48, h: t.path.y1 - t.path.y0 });
  for (const q of [t.sled, t.cairn, t.sign, p.snowman]) if (q) taken.push({ x: q.x - 14, y: q.y - 26, w: 28, h: 30 });
  for (const r of t.rocks) taken.push(grow(r, 5));
  for (const r of t.scree) taken.push(grow(r, 3));
  for (const q of t.pines) taken.push({ x: q.x - 9, y: q.y - q.h - 2, w: 18, h: q.h + 6 });
  for (const q of t.stream ?? []) taken.push({ x: q.x - 8, y: q.y - 8, w: 16, h: 16 });
  for (const n of p.nooks) taken.push({ x: n.x - 12, y: n.y - 26, w: 24, h: 30 });
  for (const s of L.spots) taken.push({ x: s.x - 10, y: s.y - 26, w: 20, h: 30 });
  const free = (x: number, y: number) => {
    const r = { x: x - 14, y: y - 12, w: 28, h: 16 };
    return r.x >= 4 && r.x + r.w <= L.W - 4 && r.y >= p.top && r.y + r.h <= L.H - 2 && !taken.some((q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h);
  };
  // Lowest first (nearest you), then from the middle out.
  for (let y = L.H - 6; y > p.top + 30; y -= 4) {
    for (let k = 0; k < L.W / 2; k += 6) {
      for (const x of [Math.round(L.W / 2 + k), Math.round(L.W / 2 - k)]) if (free(x, y)) return { x, y };
    }
  }
  return null;
}

// ------------------------------------------------------------------ clicks

export function eggClickables(L: Layout): SceneryClickable[] {
  const { horn: h, drift } = bind(L);
  const out: SceneryClickable[] = [];
  if (h) out.push({ id: "alphorn", rect: { x: h.piece.x - 5, y: h.piece.y - 5, w: 12, h: 8 }, hover: "A brass mouthpiece, left on the deck", secret: true });
  if (drift) out.push({ id: "drift", rect: { x: drift.x - 12, y: drift.y - 10, w: 24, h: 12 }, hover: "A lump in the snow. Is that a mitten?", secret: true });
  return out;
}

const SAY = {
  hornGo: ["Stand back, everyone.", "Let's see who's listening.", "Big breath…"],
  hornEnd: ["They answered!", "Someone's over there!", "The mountains talk back."],
  hornNear: ["Is that an alphorn?!", "Goosebumps.", "Do it again!"],
  drift: ["Did that snowdrift just move?", "Uh… the snow said 'mmf'.", "Is someone in there?!"],
  dog: ["Good dog!", "Who's a hero? You are!", "The ski patrol's dog!"],
};

export function eggClick(id: string, act: SceneryActions): string | null {
  const pl = bind(act.L);
  if (id === "alphorn") return blow(act, pl);
  if (id === "drift") return dig(act, pl);
  return null;
}

function blow(act: SceneryActions, pl: Places): string | null {
  const h = pl.horn;
  if (!h || (horn && !horn.g?.done && act.t - horn.t0 < 60)) return null;
  const g = act.gather([h.spot], 9, [
    { at: 0.1, who: 0, say: pick(SAY.hornGo), seconds: 1.6 },
    { at: 1.2, sound: "cab-alphorn" },
    { at: 8.4, who: 0, say: pick(SAY.hornEnd), seconds: 2.4 },
  ]);
  if (!g) return null;
  horn = { t0: act.t, g };
  const near = act.near(h.spot.x, h.spot.y, 260)[1];
  if (near) act.say(near.id, pick(SAY.hornNear), 2.4, 12);
  return null;
}

/** When the dog gets there, digs, and the tourer is out (seconds since the drift wiggled). */
const ARRIVE = 3;
const OUT = 6;
const WARM = 9;
const GONE = 14;

function dig(act: SceneryActions, pl: Places): string | null {
  const d = pl.drift;
  if (!d || rescue || act.t - dugAt < 60) return null;
  // The dog comes from the nearer side, no further than it can run in time.
  const side = d.x < act.L.W / 2 ? -1 : 1;
  const from = d.x + side * Math.min(200, side < 0 ? d.x + 20 : act.L.W - d.x + 20);
  rescue = { t0: act.t, from, look: tourer() };
  const near = act.near(d.x, d.y, 300);
  if (near[0]) act.say(near[0].id, pick(SAY.drift), 2.4, 0.9);
  if (near[1] ?? near[0]) act.say((near[1] ?? near[0])!.id, pick(SAY.dog), 2.4, WARM);
  return "cab-rescue";
}

/** Someone out on a tour who took a wrong turn: a red jacket, a beanie. */
function tourer(): Look {
  const skin = pick(["#f6c7a4", "#e7b08a", "#c98a5e", "#9b6340"]);
  const hair = pick(["#5a3a2a", "#2a1e1a", "#c89a5a", "#8a3a22"]);
  return { key: `cabin-tourer|${skin}|${hair}`, skin, hair, hairStyle: "crop", shirt: C.red, pants: "#2f3a4f", accessory: "beanie", accent: C.mustard };
}

/** Rarely: an alphorn at sunset, or someone stuck in a drift while it snows. */
export function eggTick(act: SceneryActions): void {
  const pl = bind(act.L);
  if (act.weather === "storm") return;
  const evening = act.hour >= 17 && act.hour < 21 && (act.weather === "clear" || act.weather === "partly");
  if (evening && pl.horn && !horn && Math.random() < 1 / 3600) blow(act, pl);
  if (act.weather === "snow" && pl.drift && Math.random() < 1 / 4800) {
    const sound = dig(act, pl);
    if (sound) act.play(sound);
  }
}

// ------------------------------------------------------------------ drawing

/** The alphorn: a long wooden tube with dark bands, curving down into an upturned bell resting on the boards. */
function hornSprite(len: number): HTMLCanvasElement {
  return sprite(
    `alphorn-${len}`,
    len + 12,
    24,
    (g) => {
      const fall = 14;
      for (let x = 0; x <= len; x++) {
        const k = x / len;
        const y = 2 + Math.round(fall * k * k);
        // Wider toward the bell.
        const w = k < 0.5 ? 2 : k < 0.8 ? 3 : 4;
        g.rect(x, y - 1, 1, w + 2, OUTLINE);
        g.rect(x, y, 1, w, x > 4 && x % 10 < 2 ? C.beamDk : C.beam);
        g.set(x, y, x > 4 && x % 10 < 2 ? C.beamDk : C.beamHi);
      }
      // The bell, turned up at the end, with a red band.
      g.rect(len - 4, 9, 14, 13, OUTLINE);
      g.rect(len - 3, 10, 12, 11, C.beam);
      g.rect(len - 3, 10, 12, 2, C.beamHi);
      g.rect(len - 1, 12, 8, 6, C.beamDk);
      g.rect(len - 3, 19, 12, 2, C.red);
      // The mouthpiece.
      g.rect(0, 1, 2, 3, C.brass);
    },
    false,
  );
}

const driftSprite = () =>
  sprite("drift", 28, 13, (g) => {
    g.ellipse(14, 9, 13, 4, "#eef4fa");
    g.ellipse(13, 7, 9, 5, "#f7fafd");
    g.ellipse(11, 5, 4, 3, "#ffffff");
    g.rect(2, 11, 24, 1, C.snowShade);
  });

const mitten = (ctx: Ctx, x: number, y: number) => {
  rect(ctx, x - 1, y - 1, 5, 6, OUTLINE);
  rect(ctx, x, y, 3, 4, C.red);
  rect(ctx, x + 3, y + 1, 1, 2, C.red);
  rect(ctx, x, y + 4, 3, 1, "#ffffff");
};

/** The patrol dog's cask (on the dog's collar, under its chin). */
const cask = (ctx: Ctx, x: number, y: number) => {
  rect(ctx, x - 1, y - 1, 6, 5, OUTLINE);
  rect(ctx, x, y, 4, 3, C.beam);
  rect(ctx, x, y + 1, 4, 1, C.brass);
};

/** A music note (its head's top left at x, y + 4). */
function note(ctx: Ctx, x: number, y: number): void {
  for (const [dx, c] of [[1, "#3a4a6a"], [0, "#ffffff"]] as const) {
    rect(ctx, x + dx, y + 4 + dx, 3, 2, c);
    rect(ctx, x + 2 + dx, y + dx, 1, 5, c);
    rect(ctx, x + 3 + dx, y + dx, 2, 1, c);
  }
}

function sky(ctx: Ctx, x: number, y: number, text: string, a: number): void {
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  const w = pixelTextWidth(text);
  drawPixelText(ctx, text, Math.round(x - w / 2) + 1, y + 1, "rgba(30,40,70,0.5)");
  drawPixelText(ctx, text, Math.round(x - w / 2), y, "#ffffff");
  ctx.globalAlpha = 1;
}

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const pl = bind(L);
  const t = info.t;
  const out: Drawable[] = [];
  // The mouthpiece on the deck boards (the only clue), the horn while someone's playing it.
  const h = pl.horn;
  if (h) {
    const playing = horn?.g && !horn.g.done && horn.g.arrivedAt !== null && horn.g.present[0];
    if (!playing) out.push({ z: h.piece.y, draw: () => rect(ctx, h.piece.x, h.piece.y - 1, 3, 2, C.brassHi) });
    else {
      const s = h.spot;
      out.push({
        z: s.y + 0.5,
        draw: () => {
          ctx.drawImage(hornSprite(h.len), s.x + 6, s.y - 18);
          // The call rising off the bell.
          const k = t - horn!.g!.arrivedAt! - 1.2;
          if (k > 0 && k < 3.4) {
            for (let i = 0; i < 3; i++) {
              const q = (k * 0.8 + i * 0.3) % 1;
              ctx.globalAlpha = 1 - q;
              note(ctx, s.x + 6 + h.len + 2 + i * 6, s.y - 20 - Math.round(q * 16));
            }
            ctx.globalAlpha = 1;
          }
          // Puffed cheeks while the notes last.
          const e = t - horn!.g!.arrivedAt!;
          if (e > 1.2 && e < 4.4) rect(ctx, s.x + 5, s.y - 17, 2, 2, "#f2a0a0");
        },
      });
    }
  }
  // The drift, wiggling when someone inside wants out; dug away for a minute after.
  const d = pl.drift;
  if (!d) return out;
  const r = rescue;
  const e = r ? t - r.t0 : 99;
  if (r && e > GONE + 2) rescue = null;
  const gone = (!r && t - dugAt < 60) || (r && e >= OUT);
  if (!gone) {
    const shrink = r && e > ARRIVE ? Math.min(1, (e - ARRIVE) / (OUT - ARRIVE)) : 0;
    const wig = r && e < ARRIVE ? Math.round(Math.sin(e * 26)) : 0;
    out.push({
      z: d.y,
      draw: () => {
        const s = driftSprite();
        const hgt = Math.max(2, Math.round(s.height * (1 - shrink * 0.8)));
        ctx.drawImage(s, 0, s.height - hgt, s.width, hgt, d.x - 14 + wig, d.y - hgt + 1, s.width, hgt);
        // The mitten: still, or waving for help.
        const wave = r && e < ARRIVE ? (Math.floor(e * 5) % 2) * -2 : 0;
        if (shrink < 0.7) mitten(ctx, d.x + 4 + wig, d.y - hgt - 3 + wave);
        if (r && e < 1.8) speech(ctx, d.x, d.y - 26, "MMMF!");
      },
    });
  }
  if (!r) return out;
  // The dog, bounding over, digging, then off with the tourer.
  const dir = r.from < d.x ? 1 : -1;
  const stand = d.x - dir * 16;
  let dx: number;
  let pose: "walk0" | "walk1" | "sit" | "wag0" | "wag1";
  let face: "left" | "right" = dir > 0 ? "right" : "left";
  const away = (k: number) => stand + (r.from - stand) * Math.min(1, k);
  if (e < ARRIVE) {
    const k = Math.max(0, (e - 0.6) / (ARRIVE - 0.6));
    dx = r.from + (stand - r.from) * k;
    pose = Math.floor(t * 8) % 2 ? "walk0" : "walk1";
  } else if (e < OUT) {
    dx = stand;
    pose = Math.floor(t * 10) % 2 ? "wag0" : "wag1";
  } else if (e < WARM + 1) {
    dx = stand;
    pose = "sit";
  } else {
    dx = away((e - WARM - 1) / (GONE - WARM - 1));
    pose = Math.floor(t * 8) % 2 ? "walk0" : "walk1";
    face = dir > 0 ? "left" : "right";
  }
  const fade = e > GONE - 1 ? Math.max(0, GONE - e) : 1;
  out.push({
    z: d.y + 1,
    draw: () => {
      ctx.globalAlpha = fade;
      const s = pet("dog", pose, face, false);
      const bound = pose.startsWith("walk") ? -Math.round(Math.abs(Math.sin(t * 9)) * 3) : 0;
      const x = Math.round(dx - s.width / 2);
      const y = d.y - s.height + 1 + bound;
      ctx.drawImage(s, x, y);
      cask(ctx, face === "right" ? x + s.width - 9 : x + 5, y + s.height - 6);
      ctx.globalAlpha = 1;
      // Snow flying back from the paws while it digs.
      if (e >= ARRIVE && e < OUT) {
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 6; i++) {
          const q = (t * 2.4 + i / 6) % 1;
          ctx.fillRect(Math.round(dx - dir * (6 + q * 18)), Math.round(d.y - 6 - Math.sin(q * Math.PI) * 14), 2, 2);
        }
      }
    },
  });
  // The tourer: out of the snow blue and shivering, warmed by the cask, then off with the dog.
  if (e >= OUT) {
    const cold = e < WARM;
    const look: Look = cold ? { ...r.look, skin: "#b8d4ee", hair: "#e8f2fa", key: `${r.look.key}|cold` } : r.look;
    const walk = e >= WARM + 1;
    const tx = walk ? away((e - WARM - 1) / (GONE - WARM - 1)) + dir * 18 : d.x;
    out.push({
      z: d.y + 1.5,
      draw: () => {
        ctx.globalAlpha = fade;
        const shiver = cold ? (Math.floor(t * 14) % 2 ? 1 : -1) : 0;
        const pose = walk ? (["walk0", "walk1", "walk2", "walk3"] as const)[Math.floor(t * 6) % 4]! : e > WARM - 2 && e < WARM ? "raise" : "stand";
        const facing = walk ? (dir > 0 ? "left" : "right") : dir > 0 ? "left" : "right";
        const spr = charSprite({ look, facing, pose, expr: cold ? "surprised" : "happy" });
        ctx.drawImage(spr, Math.round(tx) - 10 + shiver, d.y - 27);
        // Icicles on the beanie, until they've warmed up.
        if (cold) for (const ix of [4, 8, 13]) rect(ctx, Math.round(tx) - 10 + ix + shiver, d.y - 25, 1, 2, "#dff0ff");
        ctx.globalAlpha = 1;
        if (e < OUT + 2.2) speech(ctx, tx, d.y - 40, "B-B-BRRR!");
        else if (e > WARM - 2 && e < WARM + 0.6) speech(ctx, tx, d.y - 40, "COCOA?! BEST. DOG.");
      },
    });
  }
  if (e > GONE && t - dugAt > 60) dugAt = r.t0 + OUT;
  return out;
}

/** In the sky over the peaks: the echoes of the call, and the yodel from across the valley. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const g = horn?.g;
  if (!g || g.arrivedAt === null) return;
  const p = planOf(L);
  if (!p) return;
  const e = info.t - g.arrivedAt - 1.2;
  if (e < 0 || e > 10) {
    if (g.done) horn = null;
    return;
  }
  const y0 = Math.max(10, Math.min(p.top - 14, 30));
  const notes = (x: number, k: number, a: number) => {
    for (let i = 0; i < 3; i++) {
      const q = (k + i * 0.3) % 1;
      ctx.globalAlpha = a * (1 - q);
      note(ctx, x + i * 9 - 9, y0 + 4 - Math.round(q * 6));
    }
    ctx.globalAlpha = 1;
  };
  // Two echoes off the far faces (the call itself rises off the bell, in eggDecor), the yodel last.
  if (e > 1.7 && e < 5.1) notes(Math.round(L.W * 0.72), ((e - 1.7) * 0.8) % 1, 0.6);
  if (e > 3.4 && e < 6.8) notes(Math.round(L.W * 0.28), ((e - 3.4) * 0.8) % 1, 0.35);
  if (e > 5.6 && e < 9.6) sky(ctx, Math.round(L.W * 0.5), y0, "YO-DEL-AY-EE-OO!", Math.min(1, (e - 5.6) * 2, (9.6 - e) * 2) * 0.85);
}
