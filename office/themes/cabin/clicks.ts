// Mountain Cabin: things to click. The fireplace (people gather for stories,
// marshmallows or a song; or someone throws a log on and it roars, or a log
// pops), the woodpile (a wild marmot, a little avalanche of logs, someone
// fetching wood for the fire), the copper pot on the kitchen table (fondue or
// cocoa for whoever's free), the sauna (someone runs out and flops into the
// snow, or a ladle of water hisses), the telescope (a climber on a summit,
// an ibex, an eagle, the hut, the moon), the chairlift (a waving skier, a
// dog, a dropped mitten, once in a while a yeti in a scarf) and the skis on
// the deck (down they go). The windows are the office's own clickables:
// opening one starts something out in the view (view.ts).
//
// Clicks only start things; everything is drawn from the live layers by the
// animation clock.
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Facing, Layout, Point, Rect } from "../../layout.ts";
import { OUTLINE } from "../../themekit.ts";
import { C, clamp } from "./kit.ts";
import { planOf, type CabinPlan } from "./plan.ts";
import { towelGuy } from "./outdoor.ts";
import { sledSprite } from "./terrain.ts";
import { liftClick, liftClickables } from "./lift.ts";
import { eggClick, eggClickables } from "./eggs.ts";

const px = (ctx: Ctx, c: string, x: number, y: number, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

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

// ------------------------------------------------------------------ lines

const LINES = {
  story: [
    [0, 0, "So there I was, halfway up the north face…"],
    [3.6, 0, "…and the fog rolled in. Thick as fondue."],
    [7.2, 1, "No way."],
    [9.4, 0, "Then a goat walked past me. Wearing my hat."],
    [13, 2, "Ha!"],
  ],
  legend: [
    [0, 0, "They say on still nights the glacier sings."],
    [4, 1, "Sings?"],
    [6, 0, "A long, low hum. Under the snow."],
    [9.6, 2, "Shh… listen."],
    [12.6, 1, "…that's the icebox."],
  ],
  toast: [
    [0.4, 0, "Golden brown. Perfect."],
    [3, 1, "Mine's on fire!"],
    [5.4, 2, "Blow on it!"],
    [8.8, 1, "Crunchy on the outside…"],
    [11.5, 0, "One more?"],
  ],
  song: [
    [0, 0, "♪ Up the lift and down the hill ♪"],
    [3.4, 1, "♪ Cocoa warm and fingers chill ♪"],
    [6.8, 2, "♪ Snow on the sill, fire in the grate ♪"],
    [10.2, 0, "♪ Who cares if the bus is late ♪"],
  ],
  fondue: [
    [0, 0, "Fondue's ready!"],
    [2.6, 1, "Don't drop your bread…"],
    [5.4, 2, "Oh no. Mine's gone."],
    [8, 0, "You know the rule. Sing!"],
    [10.6, 2, "♪ La la… la? ♪"],
  ],
  cocoa: [
    [0, 0, "Cocoa's up!"],
    [2.4, 1, "Marshmallows?"],
    [4.6, 0, "All of them."],
    [7.4, 2, "Mmm. Cream on top."],
    [10.2, 1, "You have a moustache."],
  ],
} as const;

const SAY = {
  logs: ["More wood!", "That'll warm us up.", "Stoke it!"],
  pop: ["Whoa!", "Pop!", "Jumpy log."],
  marmot: ["A marmot in the woodpile!", "Was that Murmel's cousin?", "It whistled at me!"],
  topple: ["Oops.", "Timber!", "I'll stack those."],
  carry: ["I'll get more wood.", "Firewood run!"],
  plunge: ["Brrr! Into the snow!", "Rather you than me.", "Snow angel!"],
  steam: ["Ahh, the steam!", "More water on the stones!"],
  climber: ["Someone's on the summit!", "They made it to the top!"],
  ibex: ["An ibex on the ledge!", "Look at those horns."],
  eagle: ["An eagle, up by the crags.", "Is that its nest?"],
  hut: ["The hut on the ridge has its lights on.", "Someone's cooking up there."],
  moon: ["You can see the craters!", "Full moon over the peaks."],
  wave: ["Hello up there!", "They're waving at us!"],
  yeti: ["Was that… a yeti?", "Nice scarf, though."],
  dog: ["A dog on the chairlift!", "Good dog."],
  mitten: ["They dropped a mitten!", "Somebody's cold hand."],
  skis: ["Who leaned those there?", "Domino skis.", "Oops."],
};

function cues(list: readonly (readonly [number, number, string])[], sound?: [number, string]): GatherCue[] {
  const out: GatherCue[] = list.map(([at, who, say]) => ({ at, who, say, seconds: say.length > 26 ? 3.6 : 2.4 }));
  if (sound) out.push({ at: sound[0], sound: sound[1] });
  return out;
}

// ------------------------------------------------------------------ where things are

interface Pot {
  /** The pot on the kitchen table. */
  x: number;
  y: number;
  island: Rect;
  aisleX: number;
  hall: number;
}

const pots = new WeakMap<Layout, Pot | null>();

function potOf(L: Layout): Pot | null {
  if (!pots.has(L)) pots.set(L, findPot(L));
  return pots.get(L)!;
}

function findPot(L: Layout): Pot | null {
  const p = L.props.find((q) => q.kind === "kitchen-island");
  if (!p) return null;
  const w = (p.w ?? 72) + 2;
  // The kitchen's spots come in along an aisle from a hallway: use the same way in.
  const way = (L.byId.get("stool-0") ?? L.byId.get("fridge"))?.path[0];
  if (!way) return null;
  return { x: p.x + Math.round(w / 2), y: p.y + 2, island: { x: p.x, y: p.y, w, h: 26 }, aisleX: way.x, hall: way.y };
}

function hearthSpots(L: Layout, p: CabinPlan, activity: string): GatherSpot[] {
  const box = p.fire.box;
  const y = p.fire.hearth.y + 15;
  const g = L.lounge;
  const hall = L.net.halls.reduce((b, h) => (h > g.y && (b < g.y || h < b) ? h : b), L.net.halls[0]!);
  const left = L.net.aisles.reduce((b, a) => (Math.abs(a - g.x) < Math.abs(b - g.x) ? a : b));
  const right = L.net.aisles.reduce((b, a) => (Math.abs(a - (g.x + g.w)) < Math.abs(b - (g.x + g.w)) ? a : b));
  const at = (x: number, facing: Facing): GatherSpot => {
    const side = Math.abs(left - x) <= Math.abs(right - x) ? left : right;
    return { x, y, facing, pose: "stand", activity, path: [{ x: side, y: hall, c: true }, { x: side, y }, { x, y }] };
  };
  // Clear of the room's walls and of the arcade cabinet if it stands in here.
  const cab = L.arcade;
  const xs = [box.x - 10, box.x + box.w + 10, box.x - 28, box.x + box.w + 28].filter(
    (x) => x > g.x + 8 && x < g.x + g.w - 8 && !(cab && x > cab.x - 8 && x < cab.x + cab.w + 8 && y > cab.y - 4 && y < cab.y + cab.h + 16),
  );
  return xs.map((x, i) => at(Math.round(x), i % 2 ? "left" : "right")).map((s) => ({ ...s, facing: "back" as Facing }));
}

function potSpots(pot: Pot, activity: string): GatherSpot[] {
  const r = pot.island;
  const y = r.y + 2;
  const lane = r.y - 3;
  return [r.x + 10, r.x + Math.round(r.w / 2) + 4, r.x + r.w - 12]
    .map((x) => Math.round(x))
    .map((x) => ({ x, y, facing: "front" as Facing, pose: "stand" as const, activity, path: [{ x: pot.aisleX, y: pot.hall, c: true }, { x: pot.aisleX, y: lane }, { x, y: lane }, { x, y }] }));
}

function saunaFrontOf(p: CabinPlan): Point | null {
  const s = p.sauna;
  return s ? { x: s.x + Math.floor(s.w / 2), y: s.y + s.h } : null;
}

export function clickables(L: Layout): SceneryClickable[] {
  const p = planOf(L);
  if (!p) return [];
  const out: SceneryClickable[] = [];
  const b = p.fire.box;
  out.push({ id: "fireplace", rect: { x: b.x - 4, y: b.y - 2, w: b.w + 8, h: b.h + 10 }, hover: "The fireplace · stories, marshmallows, more wood" });
  const wp = p.woodpile;
  out.push({ id: "woodpile", rect: { x: wp.x, y: wp.y, w: wp.w, h: wp.h }, hover: "The woodpile · something rustles in there" });
  const pot = potOf(L);
  if (pot) out.push({ id: "pot", rect: { x: pot.x - 7, y: pot.y - 8, w: 14, h: 12 }, hover: "The copper pot · fondue or cocoa?" });
  if (p.sauna) {
    const s = p.sauna;
    out.push({ id: "sauna", rect: { x: s.x, y: s.y + s.h - 44, w: s.w, h: 44 }, hover: "The sauna · steam, then the snow" });
  }
  if (p.telescope) out.push({ id: "telescope", rect: { x: p.telescope.x - 7, y: p.telescope.y - 26, w: 15, h: 28 }, hover: "The telescope · what's up on the peaks?" });
  // The lodge's own lift (see lift.ts), or on a small phone just the strip of it beyond the rail.
  if (p.lift) out.push(...liftClickables(p));
  else if (p.slope) out.push({ id: "lift", rect: p.slope, hover: "The chairlift · who's riding up?" });
  const t = p.terrain;
  if (t.tarn) out.push({ id: "tarn", rect: t.tarn, hover: "The frozen tarn · is the ice thick enough?" });
  if (t.sled) out.push({ id: "sled", rect: { x: t.sled.x - 9, y: t.sled.y - 9, w: 18, h: 10 }, hover: "The sled · one run down" });
  if (p.skiRack) {
    const r = p.skiRack;
    out.push({ id: "skis", rect: { x: r.x, y: r.y + r.h - 32, w: Math.max(r.w, 14), h: 32 }, hover: "Skis in the snow · don't lean on them" });
  }
  // And two things to find (eggs.ts).
  out.push(...eggClickables(L));
  return out;
}

// ------------------------------------------------------------------ what's going on

type HearthKind = "story" | "legend" | "toast" | "song";

let forL: Layout | null = null;
let hearth: { kind: HearthKind; g: Gathering; spots: GatherSpot[] } | null = null;
let blaze: { kind: "stoke" | "logs" | "pop"; t0: number } | null = null;
let pile: { kind: "marmot" | "topple" | "carry"; t0: number; g?: Gathering } | null = null;
let pot: { kind: "fondue" | "cocoa"; t0: number; g: Gathering | null; spots: GatherSpot[]; at: Pot } | null = null;
let sauna: { kind: "plunge" | "steam"; t0: number; skin: string } | null = null;
let scope: { kind: "climber" | "ibex" | "eagle" | "hut" | "moon"; t0: number } | null = null;
let lift: { kind: "wave" | "yeti" | "dog" | "mitten"; t0: number; at: number } | null = null;
let skis: { t0: number } | null = null;
let ice: { kind: "skate" | "crack" | "slide"; t0: number } | null = null;
let sled: { t0: number } | null = null;

/** The sled's off down the hill (and being dragged back up). */
export function sledGone(t: number): boolean {
  return sled !== null && t - sled.t0 > 0.2 && t - sled.t0 < 6;
}

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  hearth = null;
  blaze = null;
  pile = null;
  pot = null;
  sauna = null;
  scope = null;
  lift = null;
  skis = null;
  ice = null;
  sled = null;
}

/** How much the fire's been stoked right now (0 calm … 1 roaring). */
export function fireBoost(t: number): number {
  let k = 0;
  if (blaze) {
    const e = t - blaze.t0;
    if (blaze.kind === "logs") k = e < 0 ? 0 : e < 1 ? e : e < 8 ? 1 : Math.max(0, 1 - (e - 8) / 4);
    else if (blaze.kind === "stoke") k = Math.max(0, 0.6 - e * 0.1);
    else k = Math.max(0, 0.9 - e * 0.6);
  }
  if (pile?.kind === "carry" && pile.g?.arrivedAt != null) {
    const e = t - pile.g.arrivedAt - 1.5;
    if (e > 0) k = Math.max(k, e < 1 ? e : e < 8 ? 1 : Math.max(0, 1 - (e - 8) / 4));
  }
  return k;
}

function sayNear(act: SceneryActions, x: number, y: number, r: number, lines: readonly string[], delay = 0.4): void {
  const who = act.near(x, y, r)[0];
  if (who) act.say(who.id, pick(lines), 2.6, delay);
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const p = planOf(act.L);
  if (!p) return null;
  const t = act.t;
  switch (id) {
    case "fireplace":
      return clickFire(act, p);
    case "woodpile": {
      const wp = p.woodpile;
      const busy = pile && t - pile.t0 < 6;
      const kind = busy ? "carry" : weighted<"marmot" | "topple" | "carry">([["marmot", 3], ["topple", 2], ["carry", 2]]);
      if (kind === "carry") {
        const spot: GatherSpot = { ...hearthSpots(act.L, p, "fetching firewood")[0]!, x: wp.x + Math.round(wp.w / 2), y: p.fire.hearth.y + 14 };
        spot.path = [...spot.path!.slice(0, 2), { x: spot.x, y: spot.y }];
        const g = act.gather([spot], 4, [{ at: 0.2, who: 0, say: pick(SAY.carry) }, { at: 1.6, sound: "cab-whoosh" }]);
        pile = { kind, t0: t, g: g ?? undefined };
        if (!g) {
          blaze = { kind: "logs", t0: t };
          sayNear(act, wp.x, wp.y, 120, SAY.logs);
          return "cab-whoosh";
        }
        return "cab-thunk";
      }
      pile = { kind, t0: t };
      sayNear(act, wp.x, wp.y, 110, SAY[kind], kind === "marmot" ? 1.6 : 0.6);
      return kind === "marmot" ? "cab-marmot" : "cab-thunk";
    }
    case "pot": {
      const at = potOf(act.L);
      if (!at) return null;
      if (pot && pot.g && !pot.g.done) return "cab-bubble";
      const kind = act.hour >= 17 || act.hour < 6 ? weighted<"fondue" | "cocoa">([["fondue", 3], ["cocoa", 2]]) : weighted<"fondue" | "cocoa">([["fondue", 1], ["cocoa", 3]]);
      const spots = potSpots(at, kind === "fondue" ? "dipping bread in the fondue" : "drinking hot cocoa");
      const g = act.gather(spots, 14, cues(LINES[kind], [0.2, kind === "fondue" ? "cab-bubble" : "cab-pour"]), 2);
      pot = { kind, t0: t, g, spots, at };
      return kind === "fondue" ? "cab-bubble" : "cab-pour";
    }
    case "sauna": {
      const kind = sauna && t - sauna.t0 < 8 ? "steam" : weighted<"plunge" | "steam">([["plunge", 3], ["steam", 1]]);
      sauna = { kind, t0: t, skin: pick(["#f6c7a4", "#e7b08a", "#c98a5e", "#9b6340", "#ffdcc4"]) };
      const f = saunaFrontOf(p)!;
      sayNear(act, f.x, f.y, 140, SAY[kind], kind === "plunge" ? 2.4 : 0.8);
      return kind === "plunge" ? "cab-plunge" : "cab-hiss";
    }
    case "telescope": {
      const night = act.night > 0.55;
      const kind = night ? weighted<"moon" | "hut">([["moon", 3], ["hut", 2]]) : weighted<"climber" | "ibex" | "eagle" | "hut">([["climber", 3], ["ibex", 2], ["eagle", 2], ["hut", 1]]);
      scope = { kind, t0: t };
      const s = p.telescope!;
      sayNear(act, s.x, s.y, 130, SAY[kind], 1.2);
      return "cab-scope";
    }
    case "alphorn":
    case "drift":
      return eggClick(id, act);
    case "lift-hut":
    case "piste":
      return p.lift ? liftClick(id, act) : null;
    case "lift": {
      if (p.lift) return liftClick(id, act);
      const kind = Math.random() < 0.12 ? "yeti" : weighted<"wave" | "dog" | "mitten">([["wave", 3], ["dog", 2], ["mitten", 2]]);
      const s = p.slope!;
      const along = p.deckSide === "east" ? clamp(act.at.y + 50, s.y + 30, s.y + s.h) : clamp(act.at.x - 50, s.x, s.x + s.w - 30);
      lift = { kind, t0: t, at: along };
      const deck = p.deck;
      if (deck) sayNear(act, deck.x + deck.w / 2, act.at.y, 160, SAY[kind], 1.2);
      return "cab-clank";
    }
    case "tarn": {
      const kind = ice && t - ice.t0 < 8 ? "crack" : weighted<"skate" | "crack" | "slide">([["skate", 3], ["crack", 2], ["slide", 2]]);
      ice = { kind, t0: t };
      return kind === "crack" ? "cab-crack" : "cab-skate";
    }
    case "sled": {
      if (sled && t - sled.t0 < 6) return null;
      sled = { t0: t };
      const tr = p.terrain;
      if (tr.path) sayNear(act, tr.path.x, tr.path.y0, 160, ["Wheee!", "Mind the rocks!", "My turn next!"], 0.4);
      return "cab-swoosh";
    }
    case "skis": {
      if (skis && t - skis.t0 < 5) return null;
      skis = { t0: t };
      const r = p.skiRack!;
      sayNear(act, r.x, r.y, 110, SAY.skis, 0.8);
      return "cab-clatter";
    }
  }
  return null;
}

function clickFire(act: SceneryActions, p: CabinPlan): string {
  const t = act.t;
  if ((hearth === null || hearth.g.done) && Math.random() < 0.7) {
    const night = act.night > 0.5;
    const kind = weighted<HearthKind>(night ? [["legend", 3], ["toast", 3], ["song", 2], ["story", 1]] : [["story", 3], ["toast", 3], ["song", 2]]);
    const activity = kind === "toast" ? "toasting marshmallows" : kind === "song" ? "singing by the fire" : "telling stories by the fire";
    const spots = hearthSpots(act.L, p, activity);
    const g = act.gather(spots, kind === "song" ? 14 : 15, cues(LINES[kind], kind === "song" ? [0, "cab-crackle"] : undefined), 2);
    if (g) {
      hearth = { kind, g, spots };
      blaze = { kind: "stoke", t0: t };
      return "cab-crackle";
    }
  }
  const kind = blaze && blaze.kind === "logs" && t - blaze.t0 < 8 ? "pop" : weighted<"logs" | "pop">([["logs", 3], ["pop", 2]]);
  blaze = { kind, t0: t };
  const b = p.fire.box;
  sayNear(act, b.x + b.w / 2, b.y + b.h, 90, SAY[kind], kind === "pop" ? 0.3 : 0.6);
  return kind === "logs" ? "cab-whoosh" : "cab-pop";
}

// ------------------------------------------------------------------ drawing

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  ctx.fillStyle = color;
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
}

function puff(ctx: Ctx, x: number, y: number, r: number, a: number, color = "#f2f5f8"): void {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - r), Math.round(y - r / 2), r * 2, r);
  ctx.fillRect(Math.round(x - r / 2), Math.round(y - r), r, r * 2);
  ctx.globalAlpha = 1;
}

export function clickUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const p = planOf(L);
  if (!p) return;
  const t = info.t;
  // A crack zigzagging across the tarn's ice.
  const tarn = p.terrain.tarn;
  if (ice?.kind === "crack" && tarn && t - ice.t0 < 6) {
    const k = Math.min(1, (t - ice.t0) / 0.6);
    const n = Math.round((tarn.w - 10) * k);
    for (let i = 0; i < n; i++) px(ctx, i % 5 === 0 ? "#ffffff" : C.iceDk, tarn.x + 5 + i, Math.round(tarn.y + tarn.h / 2 + Math.sin(i * 0.9) * 2 + (i % 7 === 3 ? 1 : 0)), 1, 1);
  }
  // A special chair on the lift, and the mitten it dropped.
  if (lift && p.slope) {
    const e = t - lift.t0;
    const s = p.slope;
    if (e > 14) lift = null;
    else {
      const east = p.deckSide === "east";
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.x, s.y, s.w, s.h);
      ctx.clip();
      const lx = s.x + Math.round(s.w * 0.42) + 4;
      const ly = s.y + Math.round(s.h * 0.3) + 1;
      const cx = east ? lx : lift.at + e * 9;
      const cy = east ? lift.at - e * 9 : ly;
      specialChair(ctx, Math.round(cx), Math.round(cy), lift.kind, t, east);
      if (lift.kind === "mitten" && e > 2) {
        const fall = Math.min(1, (e - 2) / 0.8);
        const mx = east ? lift.at - 2 * 9 + 2 : lift.at + 2 * 9 + 2;
        const my0 = east ? lift.at - 18 + 8 : ly + 6;
        const my = east ? my0 + fall * 14 : my0 + fall * (s.y + s.h - 3 - my0);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(Math.round(east ? mx + 6 : mx) - 1, Math.round(my) - 1, 4, 4);
        ctx.fillStyle = C.red;
        ctx.fillRect(Math.round(east ? mx + 6 : mx), Math.round(my), 2, 2);
      }
      ctx.restore();
    }
  }
  // Logs rolled off the pile, lying on the floor for a bit.
  if (pile?.kind === "topple") {
    const e = t - pile.t0;
    if (e < 5) {
      const wp = p.woodpile;
      for (let i = 0; i < 3; i++) {
        const k = Math.min(1, e / (0.4 + i * 0.15));
        const x = wp.x + wp.w - 6 + i * 7 * k;
        const y = wp.y + 4 + k * (14 + i * 3);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 7, 4);
        ctx.fillStyle = C.beam;
        ctx.fillRect(Math.round(x), Math.round(y), 5, 2);
        ctx.fillStyle = "#d9b07a";
        ctx.fillRect(Math.round(x) + 4, Math.round(y), 1, 2);
      }
    }
  }
}

/** A little skater on the ice in a bobble hat, scarf flying. */
function skater(ctx: Ctx, x: number, y: number, dir: number, e: number): void {
  px(ctx, OUTLINE, x - 3, y - 13, 7, 14);
  px(ctx, C.navy, x - 2, y - 8, 5, 6);
  px(ctx, "#f2c9a0", x - 2, y - 11, 5, 3);
  px(ctx, C.red, x - 2, y - 12, 5, 1);
  px(ctx, C.red, x, y - 13, 1, 1);
  px(ctx, C.mustard, x - 2, y - 8, 5, 1);
  px(ctx, C.mustard, x - dir * 3, y - 8 + (Math.sin(e * 9) > 0 ? 1 : 0), 2, 1);
  px(ctx, "#2a2c36", x - 2, y - 2, 2, 2);
  px(ctx, "#2a2c36", x + 1, y - 2, 2, 2);
  px(ctx, "#c8d0d8", x - 3, y, 7, 1);
}

function specialChair(ctx: Ctx, x: number, y: number, kind: "wave" | "yeti" | "dog" | "mitten", t: number, vertical: boolean): void {
  ctx.fillStyle = "#3a3d46";
  ctx.fillRect(x, y, 1, vertical ? 4 : 3);
  const sy = y + (vertical ? 4 : 3);
  ctx.fillRect(x - 4, sy, 9, 2);
  if (kind === "yeti") {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 4, sy - 9, 9, 10);
    ctx.fillStyle = "#f4f6fa";
    ctx.fillRect(x - 3, sy - 8, 7, 8);
    ctx.fillStyle = "#c8d2e0";
    ctx.fillRect(x - 3, sy - 3, 7, 1);
    ctx.fillStyle = C.red;
    ctx.fillRect(x - 3, sy - 4, 7, 1);
    ctx.fillRect(x + 2, sy - 4, 1, 3);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 2, sy - 6, 1, 1);
    ctx.fillRect(x + 1, sy - 6, 1, 1);
    if (Math.sin(t * 8) > 0) {
      ctx.fillStyle = "#f4f6fa";
      ctx.fillRect(x + 5, sy - 10, 2, 4);
    }
    return;
  }
  // One rider in a bright jacket and a bobble hat.
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 3, sy - 7, 4, 8);
  ctx.fillStyle = "#e86aa8";
  ctx.fillRect(x - 2, sy - 4, 2, 4);
  ctx.fillStyle = "#f2c9a0";
  ctx.fillRect(x - 2, sy - 6, 2, 2);
  ctx.fillStyle = "#3a8ad8";
  ctx.fillRect(x - 2, sy - 7, 2, 1);
  if (kind === "wave") {
    const up = Math.sin(t * 10) > 0;
    ctx.fillStyle = "#e86aa8";
    ctx.fillRect(x - 4, sy - (up ? 8 : 6), 1, 3);
    ctx.fillRect(x + 1, sy - (up ? 6 : 8), 1, 3);
  } else if (kind === "dog") {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x, sy - 5, 5, 6);
    ctx.fillStyle = "#c08a52";
    ctx.fillRect(x + 1, sy - 4, 3, 4);
    ctx.fillRect(x + 3, sy - 5, 1, 1);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x + 3, sy - 3, 1, 1);
  }
}

export function clickDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return potDecor(ctx, L);
  const p = planOf(L);
  if (!p) return [];
  const t = info.t;
  const out: Drawable[] = potDecor(ctx, L);
  // Marshmallows on long sticks into the fire.
  if (hearth && !hearth.g.done && hearth.kind === "toast" && hearth.g.arrivedAt !== null) {
    const e = t - hearth.g.arrivedAt;
    const box = p.fire.box;
    hearth.spots.forEach((s, i) => {
      if (!hearth!.g.present[i]) return;
      out.push({
        z: s.y + 0.6,
        draw: () => {
          const hx = s.x + (s.x < box.x + box.w / 2 ? 3 : -3);
          const hy = s.y - 13;
          const tx = clamp(s.x + (s.x < box.x ? 18 : -18), box.x + 4, box.x + box.w - 4);
          const ty = box.y + box.h - 9 + Math.round(Math.sin(t * 2 + i) * 1);
          line(ctx, hx, hy, tx, ty, C.pineDk);
          const k = Math.min(1, (e + i * 2) / 10);
          ctx.fillStyle = k < 0.4 ? "#fffaf0" : k < 0.75 ? "#e8c890" : i === 1 && e > 3 && e < 6 ? "#ff8a3a" : "#a8743a";
          ctx.fillRect(tx - 1, ty - 1, 3, 3);
        },
      });
    });
  }
  // A wild marmot pops up behind the woodpile, looks round, whistles and ducks.
  if (pile?.kind === "marmot") {
    const e = t - pile.t0;
    if (e < 4) {
      const wp = p.woodpile;
      const up = e < 0.4 ? e / 0.4 : e < 3.3 ? 1 : Math.max(0, 1 - (e - 3.3) / 0.4);
      out.push({ z: wp.y + wp.h - 0.5, draw: () => wildMarmot(ctx, wp.x + Math.round(wp.w / 2) - 4, wp.y - Math.round(up * 8) + 4, e) });
    }
  }
  // The sauna-goer: out the door, across the deck, flop into the snow, a snow angel, back in.
  if (sauna?.kind === "plunge" && p.sauna) {
    const e = t - sauna.t0;
    if (e < 9) {
      const f = saunaFrontOf(p)!;
      const east = p.deckSide === "east";
      const to = east ? { x: p.deck!.x + p.deck!.w - 8, y: f.y + 14 } : { x: f.x + 4, y: p.deck!.y + p.deck!.h - 4 };
      const k = e < 0.8 ? 0 : e < 2.2 ? (e - 0.8) / 1.4 : e < 6.4 ? 1 : e < 7.8 ? 1 - (e - 6.4) / 1.4 : 0;
      const x = f.x + (to.x - f.x) * k;
      const y = f.y + 2 + (to.y - f.y - 2) * k;
      const lying = e >= 2.2 && e < 6.4;
      out.push({
        z: y,
        draw: () => {
          if (lying) {
            // Flat on their back in a heap of snow, flapping a snow angel.
            const X = Math.round(to.x);
            const Y = Math.round(to.y);
            const wing = Math.sin(e * 6) > 0 ? 1 : 0;
            // A heap of snow…
            ctx.fillStyle = C.snow;
            ctx.fillRect(X - 7, Y - 7, 14, 1);
            ctx.fillRect(X - 9, Y - 6, 18, 10);
            ctx.fillRect(X - 7, Y + 4, 14, 1);
            ctx.fillStyle = C.snowShade;
            ctx.fillRect(X - 9, Y + 3, 18, 1);
            ctx.fillRect(X - 7, Y + 4, 14, 1);
            // …the angel pressed into it…
            ctx.fillRect(X - 6 - wing * 2, Y - 5, 12 + wing * 4, 3);
            // …and them in it, arms and legs going, in a white towel.
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(X - 2, Y - 6, 5, 11);
            ctx.fillStyle = sauna!.skin;
            ctx.fillRect(X - 1, Y - 5, 3, 3);
            ctx.fillRect(X - 5 - wing, Y - 4 + wing, 4, 1);
            ctx.fillRect(X + 2, Y - 4 + wing, 4 + wing, 1);
            ctx.fillRect(X - 1, Y + 2, 1, 2);
            ctx.fillRect(X + 1, Y + 2, 1, 2);
            ctx.fillStyle = "#f4f2ee";
            ctx.fillRect(X - 1, Y - 2, 3, 4);
            ctx.fillStyle = "#c8c2b6";
            ctx.fillRect(X - 1, Y + 1, 3, 1);
            ctx.fillStyle = "#5a3a2a";
            ctx.fillRect(X - 1, Y - 5, 3, 1);
          } else if (e >= 0.8 && e < 7.8) ctx.drawImage(towelGuy(Math.floor(e * 8) % 2, sauna!.skin), Math.round(x) - 4, Math.round(y) - 12);
        },
      });
    }
  }
  // Out on the tarn: a skater's loops, a crack running across, a marmot sliding on its belly.
  const tarn = p.terrain.tarn;
  if (ice && tarn) {
    const e = t - ice.t0;
    const cx = tarn.x + tarn.w / 2;
    const cy = tarn.y + tarn.h / 2;
    if (ice.kind === "skate" && e < 8) {
      const a = e * 2.2;
      const x = cx + Math.sin(a) * (tarn.w / 2 - 9);
      const y = cy + Math.sin(a * 2) * (tarn.h / 2 - 6);
      out.push({ z: y, draw: () => skater(ctx, Math.round(x), Math.round(y), Math.cos(a) > 0 ? 1 : -1, e) });
    } else if (ice.kind === "slide" && e < 3) {
      const x = tarn.x - 4 + (e / 3) * (tarn.w + 8);
      out.push({
        z: cy,
        draw: () => {
          px(ctx, OUTLINE, Math.round(x) - 5, Math.round(cy) - 3, 11, 5);
          px(ctx, "#9a7a58", Math.round(x) - 4, Math.round(cy) - 2, 9, 3);
          px(ctx, "#5a4430", Math.round(x) + 3, Math.round(cy) - 2, 2, 2);
          px(ctx, "#ffffff", Math.round(x) - 8, Math.round(cy), 2, 1);
        },
      });
    }
  }
  // Down the path on the sled, and dragged back up.
  const tr = p.terrain;
  if (sled && tr.path && tr.sled) {
    const e = t - sled.t0;
    const down = e < 1.6;
    const k = down ? Math.min(1, e / 1.4) : Math.max(0, 1 - (e - 2.8) / 3);
    const y = tr.path.y0 + (L.H + 14 - tr.path.y0) * k;
    if (e < 6 && (down || e > 2.8)) {
      out.push({
        z: y,
        draw: () => {
          ctx.drawImage(sledSprite(), Math.round(tr.path!.x - 9), Math.round(y - 8));
          if (down) {
            // The rider, hunched on it, a spray of snow behind.
            px(ctx, OUTLINE, Math.round(tr.path!.x) - 3, Math.round(y) - 15, 7, 9);
            px(ctx, C.red, Math.round(tr.path!.x) - 2, Math.round(y) - 12, 5, 5);
            px(ctx, "#f2c9a0", Math.round(tr.path!.x) - 1, Math.round(y) - 14, 3, 2);
            px(ctx, C.navy, Math.round(tr.path!.x) - 2, Math.round(y) - 15, 5, 1);
            for (let i = 0; i < 4; i++) px(ctx, "#ffffff", Math.round(tr.path!.x) - 6 + i * 4, Math.round(y) - 10 - (i % 2) * 2, 1, 1);
          } else {
            // Somebody dragging it back up by the rope.
            px(ctx, C.cream, Math.round(tr.path!.x) + 8, Math.round(y) - 6, 6, 1);
          }
        },
      });
    }
  }
  // Skis toppled over in the snow.
  if (skis && p.skiRack) {
    const e = t - skis.t0;
    if (e < 5) {
      const r = p.skiRack;
      out.push({
        z: r.y + r.h + 0.5,
        draw: () => {
          const n = r.w > 20 ? 4 : 2;
          for (let i = 0; i < n; i++) {
            const k = Math.min(1, Math.max(0, (e - i * 0.12) / 0.3));
            if (k <= 0) continue;
            const x = r.x + 2 + i * 6;
            const y = r.y + r.h - 3;
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(x - 1, y - 1, Math.round(4 + 22 * k), 4);
            ctx.fillStyle = ["#d0453a", "#f2c230", "#3a8ad8", "#4fbf7a"][i]!;
            ctx.fillRect(x, y, Math.round(2 + 22 * k), 2);
          }
        },
      });
    }
  }
  return out;
}

/** The copper pot on the kitchen table (and forks and mugs when there's fondue or cocoa). */
function potDecor(ctx: Ctx, L: Layout): Drawable[] {
  const at = potOf(L);
  if (!at) return [];
  const out: Drawable[] = [];
  const live = pot && L === forL && pot.g && !pot.g.done && pot.g.arrivedAt !== null ? pot : null;
  out.push({
    z: at.island.y + 20.5,
    draw: () => {
      const x = at.x;
      const y = at.y;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 5, y - 6, 11, 8);
      ctx.fillStyle = C.copper;
      ctx.fillRect(x - 4, y - 5, 9, 6);
      ctx.fillStyle = C.copperHi;
      ctx.fillRect(x - 4, y - 5, 9, 1);
      ctx.fillStyle = C.iron;
      ctx.fillRect(x - 4, y + 1, 9, 1);
      if (live?.kind === "fondue") {
        ctx.fillStyle = "#f2d870";
        ctx.fillRect(x - 3, y - 5, 7, 1);
      } else {
        ctx.fillStyle = C.copperLo;
        ctx.fillRect(x - 2, y - 7, 5, 1);
        ctx.fillRect(x, y - 8, 1, 1);
      }
      if (live) {
        // Forks into the pot, or mugs by everyone's place.
        live.spots.forEach((s, i) => {
          if (!live.g!.present[i]) return;
          if (live.kind === "fondue") line(ctx, s.x + (s.x < x ? 2 : -2), y - 10, x + (i - 1) * 2, y - 4, "#9aa3ad");
          else {
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(s.x - 2, at.island.y + 4, 5, 5);
            ctx.fillStyle = [C.red, C.navy, C.cream][i % 3]!;
            ctx.fillRect(s.x - 1, at.island.y + 5, 3, 3);
            ctx.fillStyle = "#7a4a2a";
            ctx.fillRect(s.x - 1, at.island.y + 5, 3, 1);
          }
        });
      }
    },
  });
  return out;
}

function wildMarmot(ctx: Ctx, x: number, y: number, e: number): void {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, 10, 9);
  ctx.fillStyle = "#9a7a58";
  ctx.fillRect(x, y, 8, 8);
  ctx.fillStyle = "#5a4430";
  ctx.fillRect(x, y, 8, 2);
  ctx.fillStyle = "#c8aa80";
  ctx.fillRect(x + 2, y + 4, 4, 3);
  const look = e > 1 && e < 2 ? -1 : e >= 2 && e < 3 ? 1 : 0;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x + 2 + look, y + 3, 1, 1);
  ctx.fillRect(x + 5 + look, y + 3, 1, 1);
  ctx.fillStyle = "#3a2420";
  ctx.fillRect(x + 3, y + 5, 2, 1);
  if (e > 1.5 && e < 2.4) {
    // The whistle.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 10, y - 2, 1, 1);
    ctx.fillRect(x + 12, y - 4, 1, 1);
    ctx.fillRect(x + 11, y - 3, 1, 1);
  }
}

export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const p = planOf(L);
  if (!p) return;
  const t = info.t;
  const box = p.fire.box;
  // Sparks spraying out of the firebox when a log pops or the fire's fed.
  if (blaze && (blaze.kind === "pop" || blaze.kind === "logs")) {
    const e = t - blaze.t0;
    const dur = blaze.kind === "pop" ? 1.4 : 2.2;
    if (e < dur) {
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + ((i / 13) - 0.5) * 2.4;
        const v = 18 + (i % 4) * 9;
        const x = box.x + box.w / 2 + Math.cos(a) * v * e;
        const y = box.y + box.h - 6 + Math.sin(a) * v * e + 30 * e * e;
        ctx.globalAlpha = 1 - e / dur;
        ctx.fillStyle = i % 3 ? "#ffcf5a" : "#ff8a3a";
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
  // Steam from the sauna door (and the stones' hiss up the stovepipe).
  if (sauna && p.sauna) {
    const e = t - sauna.t0;
    const s = p.sauna;
    if (e < 4) {
      const dx = s.x + Math.floor(s.w / 2);
      const dy = s.y + s.h - 14;
      for (let i = 0; i < 7; i++) {
        const k = Math.max(0, e - i * 0.12);
        puff(ctx, dx + Math.sin(i * 2.1) * 6 + k * 4, dy - k * 9 - i * 2, 2 + Math.round(k * 2.5), Math.max(0, 0.75 - k / 4));
      }
      if (sauna.kind === "steam") for (let i = 0; i < 5; i++) puff(ctx, s.x + s.w - 12 + i, s.y + s.h - 46 - e * 10 - i * 3, 2 + Math.round(e), Math.max(0, 0.7 - e / 4));
    }
    if (sauna.kind === "plunge" && e > 2.1 && e < 3.2) {
      // The snow flying where they landed.
      const east = p.deckSide === "east";
      const to = east ? { x: p.deck!.x + p.deck!.w - 8, y: s.y + s.h + 14 } : { x: s.x + Math.floor(s.w / 2) + 4, y: p.deck!.y + p.deck!.h - 4 };
      const k = (e - 2.1) / 1.1;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        puff(ctx, to.x + Math.cos(a) * k * 12, to.y - 4 + Math.sin(a) * k * 6 - k * 6, 1, 1 - k, "#ffffff");
      }
    }
  }
  // Steam off the pot.
  if (pot && pot.g && !pot.g.done) {
    const at = pot.at;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.6 + i / 3) % 1;
      puff(ctx, at.x + Math.sin(t * 2 + i) * 2, at.y - 8 - ph * 12, 1, 0.6 * (1 - ph));
    }
  }
  // The view through the telescope.
  if (scope && p.telescope) {
    const e = t - scope.t0;
    if (e < 6.5) {
      const k = Math.min(1, e / 0.35, (6.5 - e) / 0.4);
      scopeView(ctx, L, p.telescope, scope.kind, e, k, info.night);
    } else scope = null;
  }
}

/** A round view through the eyepiece, near the telescope: a peak and whatever's on it. */
function scopeView(ctx: Ctx, L: Layout, at: Point, kind: "climber" | "ibex" | "eagle" | "hut" | "moon", e: number, k: number, night: number): void {
  const R = 26;
  const cx = clamp(at.x - 42, R + 4, L.W - R - 4);
  const cy = clamp(at.y - 14, R + 4, L.H - R - 4);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
  ctx.fillStyle = OUTLINE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const dark = night > 0.55;
  ctx.fillStyle = dark ? "#0d1430" : "#5a9ae0";
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.fillStyle = dark ? "#1c2850" : "#a8d0f0";
  ctx.fillRect(cx - R, cy, R * 2, R);
  if (kind === "moon") {
    ctx.fillStyle = "#f4f0dc";
    ctx.beginPath();
    ctx.arc(cx + 2, cy - 4, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8d2b8";
    for (const [dx, dy, r] of [[-6, -10, 3], [5, 0, 4], [-3, 4, 2], [8, -12, 2]] as const) {
      ctx.beginPath();
      ctx.arc(cx + 2 + dx, cy - 4 + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a4468";
    ctx.beginPath();
    ctx.moveTo(cx - R, cy + R);
    ctx.lineTo(cx - 10, cy + 12);
    ctx.lineTo(cx + 4, cy + 20);
    ctx.lineTo(cx + R, cy + 8);
    ctx.lineTo(cx + R, cy + R);
    ctx.fill();
  } else {
    // A big peak filling the view, lit from the left.
    const snow = dark ? "#8a9cc4" : "#f6fafe";
    const shade = dark ? "#4b5a86" : "#a8bfdc";
    const rock = dark ? "#2c3452" : "#6a707c";
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy + R);
    ctx.lineTo(cx, cy - 12);
    ctx.lineTo(cx + R, cy + R);
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx + R, cy + R);
    ctx.lineTo(cx + 2, cy + R);
    ctx.fill();
    ctx.fillStyle = rock;
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 8 + i * 4, cy - 2 + (i % 3) * 5, 3, 6);
    if (kind === "climber") {
      // Up the last bit, then the flag, then a wave.
      const up = Math.min(1, e / 2);
      const px = cx - 7 + up * 6;
      const py = cy - 4 - up * 9;
      ctx.fillStyle = "#d8402e";
      ctx.fillRect(Math.round(px), Math.round(py) - 4, 3, 4);
      ctx.fillStyle = "#f2c9a0";
      ctx.fillRect(Math.round(px), Math.round(py) - 6, 3, 2);
      ctx.fillStyle = "#2a2c36";
      ctx.fillRect(Math.round(px), Math.round(py), 1, 2);
      ctx.fillRect(Math.round(px) + 2, Math.round(py), 1, 2);
      if (e > 2.2) {
        ctx.fillStyle = "#3a3d46";
        ctx.fillRect(cx + 2, cy - 22, 1, 10);
        ctx.fillStyle = Math.sin(e * 6) > 0 ? "#f2c230" : "#e8b020";
        ctx.fillRect(cx + 3, cy - 22, 6, 4);
      }
      if (e > 3 && Math.sin(e * 9) > 0) {
        ctx.fillStyle = "#d8402e";
        ctx.fillRect(Math.round(px) + 3, Math.round(py) - 8, 1, 3);
      }
    } else if (kind === "ibex") {
      // An ibex on a rock ledge, big ridged horns swept back.
      const x = cx - 9;
      const y = cy + 6;
      ctx.fillStyle = rock;
      ctx.fillRect(x - 4, y + 6, 18, 3);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 1, y - 1, 10, 6);
      ctx.fillRect(x + 7, y - 5, 5, 5);
      ctx.fillStyle = "#8a7a62";
      ctx.fillRect(x, y, 8, 4);
      ctx.fillRect(x + 8, y - 4, 3, 4);
      ctx.fillStyle = "#c8b898";
      ctx.fillRect(x + 1, y + 3, 6, 1);
      ctx.fillStyle = "#5a4a38";
      for (const lx of [x + 1, x + 3, x + 5, x + 7]) ctx.fillRect(lx, y + 4, 1, 2);
      ctx.fillStyle = "#b8a682";
      for (const [hx, hy] of [[10, -5], [9, -6], [8, -7], [7, -7], [6, -6], [5, -5]] as const) ctx.fillRect(x + hx, y + hy, 1, 1);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x + 10, y - 3, 1, 1);
      if (Math.sin(e * 3) > 0.7) ctx.fillRect(x + 11, y - 1, 1, 1);
    } else if (kind === "eagle") {
      const ex = cx - R + ((e * 10) % (R * 2));
      const ey = cy - 14 + Math.sin(e * 2) * 3;
      const flap = Math.sin(e * 6) > 0;
      ctx.fillStyle = "#4a3426";
      ctx.fillRect(Math.round(ex) - 2, Math.round(ey), 5, 2);
      ctx.fillRect(Math.round(ex) - 7, Math.round(ey) - (flap ? 2 : -1), 5, 1);
      ctx.fillRect(Math.round(ex) + 3, Math.round(ey) - (flap ? 2 : -1), 5, 1);
      ctx.fillStyle = "#f4f2ee";
      ctx.fillRect(Math.round(ex) + 2, Math.round(ey), 2, 1);
    } else {
      // The hut on the ridge, smoke from its chimney, a light in the window.
      const hx = cx - 4;
      const hy = cy - 6;
      ctx.fillStyle = "#7a4e30";
      ctx.fillRect(hx, hy, 12, 7);
      ctx.fillStyle = snow;
      ctx.fillRect(hx - 2, hy - 3, 16, 3);
      ctx.fillStyle = dark ? "#ffcf6a" : "#3a3046";
      ctx.fillRect(hx + 3, hy + 2, 3, 2);
      for (let i = 0; i < 4; i++) {
        const ph = (e * 0.4 + i / 4) % 1;
        ctx.fillStyle = `rgba(230,234,240,${(0.7 * (1 - ph)).toFixed(3)})`;
        ctx.fillRect(Math.round(hx + 10 + ph * 4), Math.round(hy - 5 - ph * 12), 2, 2);
      }
    }
  }
  ctx.restore();
  // The scope's rim and a glint.
  ctx.globalAlpha = k;
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - R + 6, cy - R + 8, 2, 1);
  ctx.globalAlpha = 1;
}

export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL) return [];
  const p = planOf(L);
  if (!p) return [];
  const out: Light[] = [];
  const t = info.t;
  if (sauna && p.sauna && t - sauna.t0 < 4) out.push([p.sauna.x + p.sauna.w / 2, p.sauna.y + p.sauna.h - 10, 40, 0.9, "#ffb05a", 0.3]);
  if (scope && p.telescope) out.push([p.telescope.x - 42, p.telescope.y - 14, 36, 0.8, "#f4f0dc", 0.1]);
  return out;
}
