// Coffee Shop: things to click. The grinder (it whirrs, or jams and gets a
// bonk), the cake stand (the last almond croissant, free samples, warm
// buns), the tip jar (coins, a bill, the bell), the chalkboard menu (a new
// special of the day), the open-mic stage (a folk song, poetry with snaps, a
// ukulele, or the mic squeals), the fireplace (a log on, sparks, cocoa round
// the hearth), the roaster behind the counter (first crack and the beans
// tumbling into the cooling tray) and the cups at the pickup (latte art,
// close up, and an order called out).
//
// Clicks only start things; everything is drawn from the café's live layers
// (decor, overlay, lights) by the animation clock.

import type { Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { drawPixelText, OUTLINE, pixelTextWidth } from "../../themekit.ts";
import { C, fill, sprite } from "./kit.ts";
import { planOf, type CafePlan } from "./plan.ts";

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

// ------------------------------------------------------------------ words

const HOVER = {
  grinder: "The grinder · fresh grounds for every shot (it jams on Mondays)",
  pastry: "The cake stand · one almond croissant left, probably",
  tips: "Tip jar · the baristas say thank you, loudly",
  menu: "Today's special · ask the chalkboard, it changes its mind",
  stage: "Open mic · anyone can play, some people should",
  fire: "The fireplace · put another log on",
  roaster: "The roaster · small batches, big smells",
  cups: "The pickup · whose flat white is this?",
  fountain: "The fountain · toss a coin and make a wish",
};

const SPECIALS = ["MAPLE OAT LATTE", "CARDAMOM BUN", "SMOKED CHAI", "HONEY LAVENDER", "FIG AND RYE", "BROWN BUTTER MOCHA", "ORANGE CORTADO", "PEAR TART", "SESAME LATTE", "COLD BREW TONIC", "DATE SCONE", "MINT MOCHA"];
const NAMES = ["SAM", "JO", "KAI", "RIO", "NOOR", "ANA", "LEO", "MIA", "TEO", "ZED", "IVY", "OLA"];
const DRINKS = ["FLAT WHITE", "CORTADO", "OAT LATTE", "CHAI", "MOCHA", "AMERICANO"];

const LINES = {
  jam: ["It does that.", "Give it a bonk.", "Mondays."],
  croissant: ["Last almond croissant!", "Mine. Sorry.", "Called it."],
  sample: ["Don't mind if I do.", "Is that cardamom?", "Just one. Or three."],
  warm: ["Something smells warm.", "Are the buns fresh?", "Cinnamon. Definitely."],
  tips: ["Worth it.", "Best foam in town.", "For the playlist."],
  menu: ["Ooh, new special.", "I'll have that.", "Who comes up with these?"],
  squeal: ["Ow.", "My ears!", "Check, one, two…"],
  fire: ["Toasty.", "Cocoa, anyone?", "Best seat in the house."],
  fireAlone: ["Nice and toasty.", "That's the stuff.", "Crackle crackle."],
  roast: ["Smells amazing.", "First crack!", "Is that the new single origin?", "I could live in this smell."],
  cups: ["That's mine!", "Oh, that's me.", "Ooh, a swan."],
  wish: ["Make a wish!", "I wished for a green build.", "No more merge conflicts, please.", "Can't tell. It won't come true."],
  boat: ["Ahoy!", "She floats!", "Full steam ahead.", "Fold, sail, ship."],
  pigeon: ["Bath time.", "Hey, that's for wishes!", "Someone's having fun."],
  abstract: ["It's… abstract.", "Is that a cat?", "Bold choice."],
};

// ------------------------------------------------------------------ sounds (merged into the theme's sounds)

/** Click-only sounds: a guitar strum, a ukulele, finger snaps, mic feedback, a log on the fire, beans pouring, first crack. */
export const CLICK_SOUNDS: Record<string, SoundRecipe> = {
  "cafe-splash": (k) => {
    // Wings, then splashing in the water.
    k.noise(0, 0.15, 0.05, 2400);
    k.noise(0.4, 0.3, 0.05, 1800);
    k.noise(0.8, 0.25, 0.04, 2600);
    k.tone(1400, 0.45, 0.05, "sine", 0.02, 900);
  },
  "cafe-strum": (k) => {
    // A G chord strummed down, then up.
    const chord = [98, 123, 147, 196, 247, 392];
    chord.forEach((f, i) => k.tone(f, i * 0.025, 1.2, "triangle", 0.035));
    [392, 247, 196].forEach((f, i) => k.tone(f, 0.55 + i * 0.02, 0.7, "triangle", 0.025));
  },
  "cafe-uke": (k) => {
    const notes = [392, 523, 659, 440];
    notes.forEach((f, i) => k.tone(f, i * 0.02, 0.45, "triangle", 0.04));
    notes.forEach((f, i) => k.tone(f * 1.0, 0.32 + i * 0.02, 0.4, "triangle", 0.03));
  },
  "cafe-snaps": (k) => {
    for (let i = 0; i < 7; i++) k.noise(i * 0.11 + Math.random() * 0.04, 0.02, 0.06, 3200);
  },
  "cafe-squeal": (k) => {
    k.tone(2900, 0, 1.1, "sine", 0.05, 3400);
    k.tone(1450, 0.1, 0.9, "square", 0.012, 1700);
  },
  "cafe-crackle": (k) => {
    k.noise(0, 0.12, 0.08, 300);
    for (let i = 0; i < 12; i++) k.noise(0.15 + Math.random() * 1.6, 0.02, 0.05, 1500 + Math.random() * 2500);
    k.swell(0.1, 1.6, 0.03, 200, 500, 1, "lowpass");
  },
  "cafe-pour": (k) => {
    k.swell(0, 1.8, 0.06, 1800, 3600, 0.6);
    for (let i = 0; i < 22; i++) k.noise(Math.random() * 1.8, 0.015, 0.04, 2500 + Math.random() * 2000);
  },
  "cafe-crack": (k) => {
    for (let i = 0; i < 6; i++) k.noise(i * 0.18 + Math.random() * 0.1, 0.02, 0.07, 2200);
  },
  "cafe-coins": (k) => {
    k.tone(2600, 0, 0.18, "triangle", 0.04, 2500);
    k.tone(3100, 0.22, 0.16, "triangle", 0.035, 3000);
    k.tone(2800, 0.42, 0.25, "triangle", 0.03, 2750);
  },
};

// ------------------------------------------------------------------ what's going on

let forL: Layout | null = null;
let grinder: { t0: number; jam: boolean } | null = null;
let pastry: { kind: "croissant" | "sample" | "warm"; t0: number; g?: Gathering } | null = null;
let tips: { kind: "coins" | "bill" | "bell"; t0: number } | null = null;
let menu = { special: -1, prev: -1, t0: -99 };
let show: { kind: "folk" | "poetry" | "uke" | "squeal"; t0: number; g?: Gathering; spots?: GatherSpot[] } | null = null;
let fire: { t0: number; g?: Gathering } | null = null;
let roast: { t0: number } | null = null;
let latte: { t0: number; art: Art; name: string } | null = null;
let splash: { kind: "wish" | "boat" | "pigeon"; t0: number; g?: Gathering | null } | null = null;

type Art = "heart" | "rosetta" | "tulip" | "swan" | "abstract";

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  grinder = null;
  pastry = null;
  tips = null;
  show = null;
  fire = null;
  roast = null;
  latte = null;
  splash = null;
  // The special keeps across layouts (resizes); a fresh office picks today's.
  if (menu.special < 0) menu = { special: new Date().getDate() % SPECIALS.length, prev: -1, t0: -99 };
}

// ------------------------------------------------------------------ where things are

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** `r`, moved down past any of the office's own clickables it covers (null if nothing's left of it). */
function clear(L: Layout, r: Rect): Rect | null {
  let q = { ...r };
  for (let i = 0; i < 8; i++) {
    const hit = L.pokeables.find((p) => overlaps(p.rect, q));
    if (!hit) return q;
    const top = hit.rect.y + hit.rect.h;
    q = { ...q, y: top, h: q.y + q.h - top };
    if (q.h < 5) return null;
  }
  return null;
}

/** The fire's opening in the chimney breast. */
const fireOf = (f: Rect): Rect => ({ x: f.x + 14, y: f.y + 16, w: f.w - 28, h: f.h - 18 });

/** The roaster as live.ts draws it (30×40, feet at p): the drum's door, the cooling tray, the chimney. */
const roasterRect = (p: Point): Rect => ({ x: p.x - 15, y: p.y - 38, w: 30, h: 39 });

export function cafeClickables(L: Layout): SceneryClickable[] {
  bind(L);
  const plan = planOf(L);
  if (!plan) return [];
  const c = plan.counter;
  const out: SceneryClickable[] = [];
  const add = (id: keyof typeof HOVER, r: Rect | null) => {
    const q = r && clear(L, r);
    if (q && q.w > 0 && q.h > 0) out.push({ id, rect: q, hover: HOVER[id] });
  };
  add("grinder", { x: c.grinder.x - 1, y: c.grinder.y - 2, w: c.grinder.w + 2, h: c.grinder.h + 2 });
  add("tips", { x: c.tips.x - 1, y: c.tips.y - 3, w: c.tips.w + 1, h: c.tips.h + 3 });
  add("pastry", { x: c.pastry.x, y: c.pastry.y - 2, w: c.pastry.w, h: c.pastry.h + 2 });
  add("cups", { x: c.cups.x - 1, y: c.cups.y - 3, w: c.cups.w + 1, h: c.cups.h + 3 });
  const m = plan.menus[0];
  if (m) add("menu", m);
  if (plan.stage) add("stage", { x: plan.stage.x, y: plan.stage.y - 18, w: plan.stage.w, h: plan.stage.h + 18 });
  if (plan.fireplace) add("fire", fireOf(plan.fireplace));
  if (plan.roaster) add("roaster", roasterRect(plan.roaster));
  const f = plan.fountain;
  if (f && plan.terrace) add("fountain", { x: f.x - f.rx - 2, y: f.y - f.ry - 24, w: f.rx * 2 + 4, h: f.ry * 2 + 26 });
  return out;
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const plan = planOf(act.L);
  if (!plan) return null;
  switch (id) {
    case "grinder":
      return clickGrinder(act, plan);
    case "pastry":
      return clickPastry(act, plan);
    case "tips":
      return clickTips(act, plan);
    case "menu":
      return clickMenu(act, plan);
    case "stage":
      return clickStage(act, plan);
    case "fire":
      return clickFire(act, plan);
    case "roaster":
      return clickRoaster(act, plan);
    case "cups":
      return clickCups(act, plan);
    case "fountain":
      return clickFountain(act, plan);
    default:
      return null;
  }
}

/** Whoever's closest says one of these (after a beat). */
function mutter(act: SceneryActions, x: number, y: number, lines: readonly string[], delay = 0.7, r = 100): void {
  const who = act.near(x, y, r)[0];
  if (who) act.say(who.id, pick(lines), 2.8, delay);
}

/** The aisle nearest to x and the hallway nearest above y (or the nearest one). */
function accessTo(L: Layout, x: number, y: number): { ax: number; hy: number } {
  const ax = L.net.aisles.reduce((b, a) => (Math.abs(a - x) < Math.abs(b - x) ? a : b), L.net.aisles[0]!);
  const above = L.net.halls.filter((h) => h < y);
  const hy = above.length ? Math.max(...above) : L.net.halls.reduce((b, h) => (Math.abs(h - y) < Math.abs(b - y) ? h : b), L.net.halls[0]!);
  return { ax, hy };
}

// ------------------------------------------------------------------ clicks

function clickGrinder(act: SceneryActions, plan: CafePlan): string {
  const g = plan.counter.grinder;
  const jam = !!grinder && act.t - grinder.t0 < 4 ? false : Math.random() < 0.3;
  grinder = { t0: act.t, jam };
  if (jam) mutter(act, g.x, plan.counter.y + 46, LINES.jam, 1.6, 90);
  return "grind";
}

function clickPastry(act: SceneryActions, plan: CafePlan): string {
  const c = plan.counter;
  const p = c.pastry;
  const busy = pastry?.g && !pastry.g.done;
  const kind = busy ? weighted<"sample" | "warm">([["sample", 1], ["warm", 1]]) : weighted<"croissant" | "sample" | "warm">([["croissant", 3], ["sample", 2], ["warm", 1]]);
  if (kind === "croissant") {
    // The nearest free person comes over for it.
    const coffee = act.L.byId.get("coffee");
    if (coffee && coffee.path.length >= 3) {
      const x = Math.round(p.x + p.w / 2);
      const lane = coffee.path[coffee.path.length - 2]!.y;
      const y = coffee.y + 3;
      const spot: GatherSpot = { x, y, facing: "back", pose: "stand", activity: "claiming the last croissant", path: [coffee.path[0]!, coffee.path[1]!, { x, y: lane }, { x, y }] };
      const g = act.gather([spot], 5, [{ at: 0.3, who: 0, say: pick(LINES.croissant), seconds: 2.6 }]);
      if (g) {
        pastry = { kind, t0: act.t, g };
        return "clink";
      }
    }
  }
  const k = kind === "croissant" ? "sample" : kind;
  pastry = { kind: k, t0: act.t };
  mutter(act, p.x + p.w / 2, c.y + 46, k === "sample" ? LINES.sample : LINES.warm, 1, 110);
  return k === "sample" ? "clink" : "steam";
}

function clickTips(act: SceneryActions, plan: CafePlan): string {
  const kind = weighted<"coins" | "bill" | "bell">([["coins", 3], ["bill", 2], ["bell", 1]]);
  tips = { kind, t0: act.t };
  mutter(act, plan.counter.tips.x, plan.counter.y + 46, LINES.tips, 0.9, 80);
  return kind === "bell" ? "chime" : kind === "coins" ? "cafe-coins" : "clink";
}

function clickMenu(act: SceneryActions, plan: CafePlan): string {
  const m = plan.menus[0];
  if (!m) return "marker";
  const fits = SPECIALS.map((s, i) => [s, i] as const).filter(([s, i]) => i !== menu.special && pixelTextWidth(s) <= m.w - 6);
  const next = fits.length ? pick(fits)[1] : (menu.special + 1) % SPECIALS.length;
  menu = { special: next, prev: menu.special, t0: act.t };
  mutter(act, m.x + m.w / 2, plan.counter.y + 46, LINES.menu, 1.8, 160);
  return "marker";
}

/** The stage's performer and audience: up on the stage at the mic, the rest on the floor in front. */
function stageSpots(L: Layout, plan: CafePlan, seated: boolean): GatherSpot[] {
  const s = plan.stage!;
  const { ax, hy } = accessTo(L, s.x + s.w / 2, s.y);
  const laneY = s.y - 3;
  const side = s.x + s.w + 5;
  const audY = s.y + s.h + 18;
  const px = s.x + Math.round(s.w / 2);
  const py = s.y + s.h - 8;
  // Upstairs on a wide panel the stage stands against the back wall, the hallway below it: everyone comes up from there.
  const below = hy > s.y + s.h;
  const front = s.y + s.h + 4;
  const out: GatherSpot[] = [
    {
      x: px,
      y: py,
      facing: "front",
      pose: seated ? "sit-front" : "stand",
      activity: "playing the open mic",
      lift: seated ? 6 : 3,
      path: below
        ? [{ x: side, y: hy, c: true }, { x: side, y: front }, { x: px, y: front }, { x: px, y: py }]
        : [{ x: ax, y: hy, c: true }, { x: ax, y: laneY }, { x: side, y: laneY }, { x: side, y: front }, { x: px, y: front }, { x: px, y: py }],
    },
  ];
  const seats: [number, number, GatherSpot["pose"]][] = [
    [-22, 0, "stand"],
    [-4, 2, "cup"],
    [14, 0, "stand"],
    [-13, 15, "cup"],
    [6, 16, "stand"],
  ];
  for (const [dx, dy, pose] of seats) {
    const x = px + dx;
    const y = audY + dy;
    const path = below ? [{ x, y: hy, c: true }, { x, y }] : [{ x: ax, y: hy, c: true }, { x: ax, y: laneY }, { x: side, y: laneY }, { x: side, y }, { x, y }];
    out.push({ x, y, facing: "back", pose, activity: "listening to the open mic", path });
  }
  return out;
}

function clickStage(act: SceneryActions, plan: CafePlan): string | null {
  const s = plan.stage;
  if (!s) return null;
  if (show?.g && !show.g.done) {
    mutter(act, s.x + s.w / 2, s.y + s.h + 20, ["Shh, they're playing.", "Encore!", "Next up after this."], 0.3, 80);
    return "cheer";
  }
  const kind = weighted<"folk" | "poetry" | "uke" | "squeal">([["folk", 3], ["poetry", 2], ["uke", 2], ["squeal", 1]]);
  if (kind !== "squeal") {
    const spots = stageSpots(act.L, plan, kind !== "poetry");
    const cues: GatherCue[] =
      kind === "folk"
        ? [
            { at: 0.3, sound: "cafe-strum" },
            { at: 1.6, who: 0, say: "This one's about oat milk.", seconds: 3 },
            { at: 4.5, sound: "cafe-strum" },
            { at: 7.5, sound: "cafe-strum" },
            { at: 10.5, who: 2, say: "Encore!", seconds: 2.2 },
            { at: 11, sound: "cheer" },
          ]
        : kind === "uke"
          ? [
              { at: 0.3, sound: "cafe-uke" },
              { at: 1.5, who: 0, say: "A little ditty about Wi-Fi.", seconds: 3 },
              { at: 3.5, sound: "cafe-uke" },
              { at: 6, sound: "cafe-uke" },
              { at: 8.5, who: 1, say: "Adorable.", seconds: 2.2 },
              { at: 9, sound: "cheer" },
            ]
          : [
              { at: 0.4, who: 0, say: "Ode to the one table with an outlet.", seconds: 3.4 },
              { at: 4.2, who: 0, say: "O, socket… so close… so taken.", seconds: 3.4 },
              { at: 8, sound: "cafe-snaps" },
              { at: 8.4, who: 1, say: "*snap snap*", seconds: 2 },
              { at: 10.2, who: 0, say: "Thank you, thank you.", seconds: 2.4 },
            ];
    const g = act.gather(spots, kind === "poetry" ? 13 : 12, cues, 2);
    if (g) {
      show = { kind, t0: act.t, g, spots };
      return "click";
    }
  }
  show = { kind: "squeal", t0: act.t };
  mutter(act, s.x + s.w / 2, s.y + s.h + 20, LINES.squeal, 0.5, 130);
  return "cafe-squeal";
}

function clickFire(act: SceneryActions, plan: CafePlan): string | null {
  const f = plan.fireplace;
  if (!f) return null;
  let g: Gathering | null = null;
  if (!(fire?.g && !fire.g.done)) {
    // A few come over with their cocoa: either side of the hearth and in front of it.
    const L = act.L;
    const { ax, hy } = accessTo(L, f.x + f.w / 2, f.y + f.h + 40);
    const lane = f.y + f.h + 6;
    const at = (x: number, y: number, facing: GatherSpot["facing"]): GatherSpot => ({
      x,
      y,
      facing,
      pose: "cup",
      activity: "warming up by the fire",
      // From the hallway below, up past the sofa's end (the way to the sofa).
      path: hy > f.y + f.h ? [{ x: L.couch.x - 6, y: hy, c: true }, { x: L.couch.x - 6, y: lane }, { x, y: lane }, { x, y }] : [{ x: ax, y: hy, c: true }, { x: ax, y: lane }, { x, y: lane }, { x, y }],
    });
    // Clear of the coffee table in front of the hearth.
    const spots = [at(f.x + 4, f.y + f.h + 4, "back"), at(f.x + f.w - 4, f.y + f.h + 4, "back"), at(f.x - 7, f.y + f.h + 12, "right")];
    g = act.gather(spots, 12, [
      { at: 0.6, who: 0, say: pick(LINES.fire), seconds: 2.6 },
      { at: 3.6, who: 1, say: pick(LINES.fire), seconds: 2.6 },
    ]);
  }
  fire = { t0: act.t, g: g ?? undefined };
  if (!g) mutter(act, f.x + f.w / 2, f.y + f.h + 20, LINES.fireAlone, 1, 120);
  return "cafe-crackle";
}

function clickRoaster(act: SceneryActions, plan: CafePlan): string | null {
  const p = plan.roaster;
  if (!p) return null;
  roast = { t0: act.t };
  mutter(act, p.x, p.y, LINES.roast, 1.4, 160);
  return "cafe-crack";
}

/**
 * The fountain: someone comes over to toss a coin in and make a wish, or to
 * sail a paper boat round the basin; or a pigeon drops in for a bath.
 */
function clickFountain(act: SceneryActions, plan: CafePlan): string | null {
  const f = plan.fountain;
  const t = plan.terrace;
  if (!f || !t || (splash && act.t - splash.t0 < 6)) return null;
  const kind = weighted<"wish" | "boat" | "pigeon">([["wish", 3], ["boat", 2], ["pigeon", 2]]);
  if (kind === "pigeon") {
    splash = { kind, t0: act.t };
    mutter(act, f.x, f.y + f.ry + 20, LINES.pigeon, 1.2, 90);
    return "cafe-splash";
  }
  // Up from the terrace's lane beside the fountain, to stand at its rim.
  const door = plan.facade!.doors[plan.facade!.doors.length - 1]!;
  const hall = Math.max(...act.L.net.halls.filter((h) => h < plan.facade!.y));
  const lane = t.y + 6;
  const x = f.x - f.rx - 6;
  const y = f.y + 3;
  const spot: GatherSpot = {
    x,
    y,
    facing: "right",
    pose: "stand",
    activity: kind === "wish" ? "making a wish at the fountain" : "sailing a paper boat",
    path: [{ x: door, y: hall, c: true }, { x: door, y: lane }, { x, y: lane }, { x, y }],
  };
  const g = act.gather([spot], kind === "wish" ? 6 : 12, [{ at: kind === "wish" ? 1.4 : 0.8, who: 0, say: pick(kind === "wish" ? LINES.wish : LINES.boat), seconds: 2.6, sound: kind === "wish" ? "clink" : undefined }]);
  if (!g) return null;
  splash = { kind, t0: act.t, g };
  return "click";
}

function clickCups(act: SceneryActions, plan: CafePlan): string {
  const art = weighted<Art>([["heart", 3], ["rosetta", 3], ["tulip", 2], ["swan", 2], ["abstract", 1]]);
  latte = { t0: act.t, art, name: `${pick(DRINKS)} FOR ${pick(NAMES)}!` };
  const c = plan.counter.cups;
  mutter(act, c.x + c.w / 2, plan.counter.y + 44, art === "abstract" ? LINES.abstract : LINES.cups, 1.5, 90);
  return "clink";
}

// ------------------------------------------------------------------ sprites

/** A close-up of a cup of latte from above, on its saucer, with the art in the foam. */
function latteSprite(art: Art): HTMLCanvasElement {
  return sprite(`latte-${art}`, 34, 30, (g) => {
    g.ellipse(16, 15, 14, 13, "#e9e3d8");
    g.ellipse(16, 15, 13, 12, C.cream);
    g.ellipse(15, 14, 13, 12, "#fdfaf4");
    // The handle, right.
    g.rect(28, 12, 5, 5, "#fdfaf4").rect(29, 13, 3, 3, C.creamLo);
    g.ellipse(16, 15, 11, 10, "#f2ece2");
    g.ellipse(16, 15, 10, 9, "#9a6235");
    g.ellipse(16, 15, 9, 8, C.crema);
    g.ellipse(15, 14, 6, 5, "#cf9660");
    const m = "#fbf3e6";
    const ms = "#ecdcc6";
    switch (art) {
      case "heart":
        g.ellipse(13, 13, 3, 3, m).ellipse(19, 13, 3, 3, m);
        for (let y = 14; y <= 20; y++) g.rect(16 - (20 - y), y, (20 - y) * 2 + 1, 1, m);
        g.set(16, 21, m).rect(16, 9, 1, 3, ms);
        break;
      case "rosetta":
        for (let i = 0; i < 6; i++) {
          const y = 20 - i * 2;
          const w = 9 - i;
          g.rect(16 - w, y, w * 2 + 1, 1, m);
          g.set(16 - w, y - 1, m).set(16 + w, y - 1, m);
        }
        g.ellipse(16, 8, 2, 1, m).vline(16, 8, 15, ms);
        break;
      case "tulip":
        g.ellipse(16, 9, 2, 2, m);
        g.ellipse(16, 14, 4, 2, m).rect(14, 13, 5, 1, "#cf9660");
        g.ellipse(16, 19, 6, 2, m).rect(13, 18, 7, 1, "#cf9660");
        g.vline(16, 10, 12, ms);
        break;
      case "swan":
        // The neck curling up into the head, the wings as a rosetta behind.
        for (let i = 0; i < 4; i++) g.rect(9 + i, 19 - i * 2, 9 - i, 1, m);
        g.rect(20, 10, 1, 9, m).rect(19, 9, 2, 1, m).set(18, 10, m).set(17, 10, "#e8a066");
        g.ellipse(14, 19, 5, 2, m);
        break;
      case "abstract":
        g.ellipse(12, 12, 3, 2, m).ellipse(19, 17, 2, 4, m).rect(14, 15, 3, 1, m).set(21, 10, m).set(10, 18, m);
        break;
    }
  });
}

const croissant = () =>
  sprite("croissant-plate", 13, 7, (g) => {
    g.ellipse(6, 4, 6, 2, C.paper);
    g.rect(2, 2, 9, 2, "#d99a48").rect(4, 1, 5, 1, "#e9b766").rect(1, 3, 2, 1, "#c27f34").rect(10, 3, 2, 1, "#c27f34");
    g.set(5, 2, "#b56d2c").set(8, 2, "#b56d2c");
  });

const samples = () =>
  sprite("samples", 11, 6, (g) => {
    g.ellipse(5, 4, 5, 1, C.paper);
    for (const x of [2, 5, 8]) g.rect(x, 2, 2, 2, "#c98a52").set(x, 0, C.kraft).set(x, 1, C.kraft);
  });

const guitar = () =>
  sprite("guitar", 15, 9, (g) => {
    // Held across the body: the lower bout left, the neck up to the right.
    g.ellipse(4, 5, 3, 3, "#d08a3c").ellipse(7, 4, 2, 2, "#d08a3c");
    g.set(3, 4, "#e9b766").set(4, 3, "#e9b766");
    g.set(5, 5, OUTLINE).set(6, 4, OUTLINE);
    g.rect(9, 3, 4, 1, "#6e432a").rect(12, 1, 2, 3, "#3a2114");
  });

const uke = () =>
  sprite("uke", 9, 5, (g) => {
    g.ellipse(2, 2, 2, 2, "#e0a860").set(2, 2, OUTLINE);
    g.rect(4, 2, 5, 1, "#8a5737");
  });

const page = () =>
  sprite("poem", 6, 7, (g) => {
    g.rect(0, 0, 6, 7, C.paper);
    for (const y of [1, 3, 5]) g.rect(1, y, 4, 1, "#b9b1a6");
  });

const log = () =>
  sprite("log", 12, 5, (g) => {
    g.rect(0, 1, 12, 3, "#6e4630").rect(0, 1, 12, 1, "#8a5a3c");
    g.ellipse(1, 2, 1, 2, "#c69a6a").set(1, 2, "#8a5a3c");
  });

// ------------------------------------------------------------------ drawing helpers

/** A little speech bubble with pixel text, its tail pointing down at (cx, bottom). */
function bubble(ctx: Ctx, L: Layout, cx: number, bottom: number, text: string): void {
  const w = pixelTextWidth(text) + 6;
  const x = Math.round(Math.max(2, Math.min(L.W - w - 2, cx - w / 2)));
  const y = Math.round(bottom - 12);
  fill(ctx, x - 1, y - 1, w + 2, 11, OUTLINE);
  fill(ctx, x, y, w, 9, "#fffdf6");
  fill(ctx, Math.round(cx) - 1, y + 9, 3, 1, "#fffdf6");
  fill(ctx, Math.round(cx), y + 10, 1, 2, OUTLINE);
  fill(ctx, Math.round(cx) - 2, y + 10, 1, 1, OUTLINE);
  fill(ctx, Math.round(cx) + 2, y + 10, 1, 1, OUTLINE);
  drawPixelText(ctx, text, x + 3, y + 2, OUTLINE);
}

/** A music note (2 wide) at x, y. */
function note(ctx: Ctx, x: number, y: number, a: number): void {
  ctx.globalAlpha = a;
  fill(ctx, x, y + 3, 2, 2, C.chalk);
  fill(ctx, x + 1, y, 1, 3, C.chalk);
  fill(ctx, x + 2, y, 1, 1, C.chalk);
  ctx.globalAlpha = 1;
}

const ease = (k: number) => 1 - (1 - k) * (1 - k);

// ------------------------------------------------------------------ live layers

/** Drawn in depth order with the furniture and people (the parent's decor). */
export function clickDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  bind(L);
  const t = info.t;
  const out: Drawable[] = [];
  const c = plan.counter;
  const onTop = c.y + 33;

  // The special of the day, chalked on the first menu board (drawn with the wall, before the darkness).
  const m = plan.menus[0];
  if (m && m.w >= 30) out.push({ z: 1, draw: () => drawSpecial(ctx, m, t) });

  if (grinder) {
    const k = t - grinder.t0;
    if (k > 4) grinder = null;
    else out.push({ z: onTop, draw: () => drawGrinder(ctx, c.grinder, k, grinder!.jam) });
  }
  if (pastry) {
    const k = t - pastry.t0;
    const p = pastry;
    const gone = p.g ? p.g.done || (p.g.arrivedAt !== null && t - p.g.arrivedAt > 1.2) : k > 6;
    if (gone || k > 20) pastry = null;
    else out.push({ z: onTop, draw: () => drawPastry(ctx, c.pastry, c.y, k, p) });
  }
  if (tips) {
    const k = t - tips.t0;
    if (k > 3.5) tips = null;
    else {
      const kind = tips.kind;
      out.push({ z: c.y + 52, draw: () => drawTips(ctx, c.tips, c.y, k, kind) });
    }
  }
  if (show && plan.stage) {
    const s = show;
    const k = t - s.t0;
    if ((s.g && s.g.done) || (!s.g && k > 2.5)) show = null;
    else if (s.g && s.spots && s.g.present[0] && s.g.arrivedAt !== null) {
      const sp = s.spots[0]!;
      out.push({ z: sp.y + 0.7, draw: () => drawInstrument(ctx, sp, s.kind, t) });
    }
  }
  if (fire && plan.fireplace) {
    const f = plan.fireplace;
    const k = t - fire.t0;
    if (k > 14 && (!fire.g || fire.g.done)) fire = null;
    else if (k < 3) out.push({ z: f.y + f.h + 0.5, draw: () => drawLogAndSparks(ctx, fireOf(f), k) });
  }
  if (roast && plan.roaster) {
    const k = t - roast.t0;
    const p = plan.roaster;
    if (k > 24) roast = null;
    else out.push({ z: p.y + 1, draw: () => drawRoast(ctx, p, k) });
  }
  const f = plan.fountain;
  if (splash && f) {
    const sp = splash;
    const since = sp.g ? (sp.g.arrivedAt === null ? -1 : t - sp.g.arrivedAt) : t - sp.t0;
    if ((sp.g && sp.g.done) || (!sp.g && since > 5) || t - sp.t0 > 40) splash = null;
    else if (since >= 0) out.push({ z: f.y + f.ry + 0.6, draw: () => drawSplash(ctx, f, sp.kind, since, t) });
  }
  return out;
}

/** On top of everything: bubbles over the counter, music notes, the latte-art close-up. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  if (!plan || L !== forL) return;
  const t = info.t;
  const c = plan.counter;
  const staffTop = c.staffY - 30;
  if (grinder?.jam) {
    const k = t - grinder.t0;
    if (k > 0.6 && k < 1.4) bubble(ctx, L, c.grinder.x + c.grinder.w / 2, c.grinder.y - 2, "!");
    if (k > 1.4 && k < 2.4) bubble(ctx, L, c.grinder.x + c.grinder.w / 2, staffTop, "BONK");
  }
  if (tips) {
    const k = t - tips.t0;
    const text = tips.kind === "bell" ? "DING DING!" : "THANK YOU!";
    if (k > 0.7 && k < 3) bubble(ctx, L, c.tips.x + 3, staffTop, text);
  }
  if (pastry?.kind === "sample") {
    const k = t - pastry.t0;
    if (k > 0.2 && k < 2.6) bubble(ctx, L, c.pastry.x + c.pastry.w / 2, staffTop, "FREE SAMPLES!");
  }
  if (show && plan.stage) {
    const s = show;
    const st = plan.stage;
    const k = t - s.t0;
    if (s.kind === "squeal") {
      if (k < 1.4 && Math.floor(k * 8) % 2 === 0) bubble(ctx, L, st.x + st.w / 2, st.y - 14, "EEEEE!");
    } else if (s.g && s.spots && s.g.present[0] && s.g.arrivedAt !== null && s.kind !== "poetry") {
      const sp = s.spots[0]!;
      const since = t - s.g.arrivedAt;
      for (let i = 0; i < 4; i++) {
        const age = (since + i * 0.6) % 2.4;
        const dx = Math.sin(i * 2.3 + age * 2) * 6 + (i % 2 ? 6 : -6);
        note(ctx, Math.round(sp.x + dx), Math.round(sp.y - 34 - (sp.lift ?? 0) - age * 9), Math.max(0, Math.min(1, (2.4 - age) * 1.2, age * 3)));
      }
    }
  }
  if (latte) {
    const k = t - latte.t0;
    if (k > 3.6) latte = null;
    else {
      const cups = c.cups;
      if (k > 0.2 && k < 3) bubble(ctx, L, cups.x + cups.w / 2, staffTop, latte.name);
      // The close-up pops up above the cups, bobs, and fades.
      const img = latteSprite(latte.art);
      const s = 2;
      const w = img.width * s;
      const h = img.height * s;
      const pop = Math.min(1, k * 5);
      const a = Math.min(1, (3.6 - k) * 2);
      const x = Math.round(Math.max(3, Math.min(L.W - w - 3, cups.x + cups.w / 2 - w / 2 - 20)));
      const y = Math.round(Math.max(3, staffTop - 14 - h + (1 - pop) * 10 + Math.sin(k * 3) * 1.5));
      ctx.globalAlpha = a;
      fill(ctx, x - 3, y - 3, w + 6, h + 6, OUTLINE);
      fill(ctx, x - 2, y - 2, w + 4, h + 4, "#f4ead8");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

/** The fire flaring with the new log, the stage lit for the act, the roaster's glow. */
export function clickLights(L: Layout, info: PaintInfo): Light[] {
  const plan = planOf(L);
  if (!plan || L !== forL) return [];
  const t = info.t;
  const out: Light[] = [];
  if (fire && plan.fireplace) {
    const k = t - fire.t0;
    const f = fireOf(plan.fireplace);
    const flare = k < 0.5 ? k * 2 : Math.max(0, 1 - (k - 0.5) / 8);
    if (flare > 0) out.push([f.x + f.w / 2, f.y + f.h, 50 + 30 * flare, 0.5 * flare + 0.2 * Math.sin(t * 13) * flare, "#ffa040", 0.5 * flare]);
  }
  if (show && show.kind !== "squeal" && show.g && !show.g.done && show.g.arrivedAt !== null && plan.stage) {
    const s = plan.stage;
    out.push([s.x + s.w / 2, s.y + s.h - 10, 46, 0.55, "#ffe2a8", 0.35]);
  }
  if (roast && plan.roaster) {
    const k = t - roast.t0;
    if (k < 8) out.push([plan.roaster.x, plan.roaster.y - 14, 26, 0.35 * (1 - k / 8), "#ff9a4a", 0.2]);
  }
  return out;
}

// ------------------------------------------------------------------ the pieces drawn

function drawSpecial(ctx: Ctx, m: Rect, t: number): void {
  const k = t - menu.t0;
  const x = m.x + 3;
  const w = m.w - 6;
  const title = w >= 39 ? "TODAY:" : "NEW";
  const fitText = (i: number) => {
    const s = SPECIALS[i] ?? "CHAI";
    if (pixelTextWidth(s) <= w) return s;
    // Too long for a small board: the first word.
    const first = s.split(" ")[0]!;
    return pixelTextWidth(first) <= w ? first : "CHAI";
  };
  drawPixelText(ctx, title, x, m.y + 2, C.chalkYellow);
  if (k < 0.45 && menu.prev >= 0) {
    // The old special, being wiped off.
    const text = fitText(menu.prev);
    drawPixelText(ctx, text, x, m.y + 8, C.chalk);
    const wipe = Math.round(w * (k / 0.45));
    fill(ctx, x - 1, m.y + 7, wipe + 1, 7, C.board);
    ctx.globalAlpha = 0.35;
    fill(ctx, x + wipe - 3, m.y + 7, 4, 7, C.chalk);
    ctx.globalAlpha = 1;
    return;
  }
  const text = fitText(menu.special);
  // Written out letter by letter.
  const n = k < 0.45 ? text.length : Math.min(text.length, Math.floor((k - 0.45) * 14));
  if (n > 0) drawPixelText(ctx, text.slice(0, n), x, m.y + 8, k > 0.45 && k < 4 && Math.floor(k * 3) % 2 === 0 ? C.chalkPink : C.chalk);
  if (k > 0.45 && n < text.length) fill(ctx, x + n * 4, m.y + 9, 1, 3, C.chalk);
}

function drawGrinder(ctx: Ctx, g: Rect, k: number, jam: boolean): void {
  const running = jam ? k < 0.6 || (k > 2.4 && k < 3.4) : k < 1.6;
  if (running) {
    // Whirr lines either side and a shiver.
    const on = Math.floor(k * 16) % 2;
    ctx.globalAlpha = 0.8;
    fill(ctx, g.x - 2 - on, g.y + 4, 1, 3, C.chalk);
    fill(ctx, g.x + g.w + 1 + on, g.y + 5, 1, 3, C.chalk);
    ctx.globalAlpha = 1;
  }
  // A puff of grounds from the chute.
  const k0 = jam ? k - 2.4 : k;
  for (let i = 0; i < 9; i++) {
    const age = k0 - i * 0.09;
    if (age < 0 || age > 0.9) continue;
    const x = g.x + g.w / 2 + Math.sin(i * 2.1) * 4 * age + (i % 3) - 1;
    const y = g.y + g.h - 6 - age * 10;
    ctx.globalAlpha = 0.7 * (1 - age / 0.9);
    fill(ctx, Math.round(x), Math.round(y), i % 2 ? 2 : 1, 1, i % 3 ? "#6b4a33" : "#8a6343");
  }
  ctx.globalAlpha = 1;
  if (jam && k > 1.4 && k < 1.7) {
    // The bonk: a little star.
    const cx = g.x + g.w / 2;
    fill(ctx, cx - 3, g.y - 1, 7, 1, C.chalkYellow);
    fill(ctx, cx, g.y - 4, 1, 7, C.chalkYellow);
  }
}

function drawPastry(ctx: Ctx, p: Rect, counterY: number, k: number, st: NonNullable<typeof pastry>): void {
  const cx = Math.round(p.x + p.w / 2);
  if (st.kind === "croissant") {
    // Plated, slid to the front edge for whoever comes over.
    const slide = Math.min(1, k * 2);
    ctx.drawImage(croissant(), cx - 6, Math.round(counterY - 1 + slide * 3));
  } else if (st.kind === "sample") {
    if (k < 6) ctx.drawImage(samples(), cx - 5, counterY + 1);
  } else {
    // Warm buns: steam curling up out of the case.
    for (let i = 0; i < 3; i++) {
      const age = (k + i * 0.5) % 1.5;
      ctx.globalAlpha = Math.max(0, 0.6 * (1 - age / 1.5)) * Math.min(1, (6 - k) / 2);
      fill(ctx, Math.round(p.x + 5 + i * 6 + Math.sin(age * 5 + i) * 1.5), Math.round(p.y - age * 9), 1, 2, "#ffffff");
    }
    ctx.globalAlpha = 1;
  }
}

function drawTips(ctx: Ctx, j: Rect, counterY: number, k: number, kind: "coins" | "bill" | "bell"): void {
  const tx = j.x + Math.round(j.w / 2);
  const ty = j.y + 1;
  if (kind === "coins") {
    for (let i = 0; i < 3; i++) {
      const p = (k - i * 0.25) / 0.55;
      if (p < 0 || p > 1) continue;
      const sx = tx + (i - 1) * 9;
      const sy = counterY + 40;
      const x = sx + (tx - sx) * p;
      const y = sy + (ty - sy) * p - Math.sin(Math.PI * p) * 16;
      fill(ctx, Math.round(x) - 1, Math.round(y) - 1, 3, 3, C.brassLo);
      fill(ctx, Math.round(x) - 1, Math.round(y) - 1, 2, 2, C.brassHi);
    }
  } else if (kind === "bill") {
    const p = Math.min(1, k / 1.6);
    if (p < 1) {
      const x = tx + Math.sin(p * 9) * 5;
      const y = ty - 26 + p * 26;
      fill(ctx, Math.round(x) - 3, Math.round(y) - 1, 6, 3, "#4f7d4a");
      fill(ctx, Math.round(x) - 2, Math.round(y), 4, 1, "#9ccf8a");
    }
  } else if (k < 1.2) {
    // The bell rung at the pickup: rings of sound.
    const r = 2 + (k % 0.4) * 14;
    ctx.globalAlpha = 0.6 * (1 - (k % 0.4) / 0.4);
    ctx.strokeStyle = C.chalkYellow;
    ctx.strokeRect(Math.round(tx - r) + 0.5, Math.round(ty - 4 - r) + 0.5, Math.round(r * 2), Math.round(r * 2));
    ctx.globalAlpha = 1;
  }
  // A glint in the jar once the money's in.
  if (k > 0.9 && k < 2 && Math.floor(k * 8) % 2 === 0) fill(ctx, j.x + 1, j.y + 2, 1, 1, "#ffffff");
}

function drawInstrument(ctx: Ctx, sp: GatherSpot, kind: "folk" | "poetry" | "uke" | "squeal", t: number): void {
  const x = sp.x;
  const y = sp.y - (sp.lift ?? 0);
  const strum = Math.floor(t * 4) % 2;
  if (kind === "folk") ctx.drawImage(guitar(), x - 8, y - 15 + strum);
  else if (kind === "uke") ctx.drawImage(uke(), x - 5, y - 13 + strum);
  else if (kind === "poetry") ctx.drawImage(page(), x + 2, y - 16);
}

function drawLogAndSparks(ctx: Ctx, f: Rect, k: number): void {
  // The log arcs in from the right and lands on the fire.
  if (k < 0.5) {
    const p = ease(k / 0.5);
    const x = f.x + f.w + 20 - (f.w / 2 + 20) * p;
    const y = f.y + f.h + 14 - (16 + Math.sin(Math.PI * p) * 10) * p;
    ctx.drawImage(log(), Math.round(x - 6), Math.round(y - 2));
  }
  // Sparks fly up out of the opening.
  for (let i = 0; i < 16; i++) {
    const age = k - 0.45 - i * 0.07;
    if (age < 0 || age > 1.4) continue;
    const x = f.x + f.w / 2 + Math.sin(i * 1.7) * (4 + age * 8);
    const y = f.y + f.h - 4 - age * 22 - (i % 4) * 2;
    ctx.globalAlpha = Math.max(0, 1 - age / 1.4);
    fill(ctx, Math.round(x), Math.round(y), 1, 1, i % 3 ? "#ffd27a" : "#ff8a3a");
  }
  ctx.globalAlpha = 1;
}

/** What happens in the fountain: a coin's arc and its ripple, a paper boat sailing round, a pigeon splashing about. */
function drawSplash(ctx: Ctx, f: { x: number; y: number; rx: number; ry: number }, kind: "wish" | "boat" | "pigeon", k: number, t: number): void {
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  if (kind === "wish") {
    const k0 = k - 1.2;
    if (k0 < 0) return;
    if (k0 < 0.7) {
      // The coin's arc from the hand into the water, glinting.
      const p = k0 / 0.7;
      const sx = f.x - f.rx - 2;
      const ex = f.x - 4;
      px(sx + (ex - sx) * p, f.y - 14 - Math.sin(p * Math.PI) * 14 + p * 16, 2, 2, Math.floor(t * 12) % 2 ? "#ffe68a" : "#d6a64a");
    } else if (k0 < 2.4) {
      const r = (k0 - 0.7) * 10;
      ctx.strokeStyle = "rgba(220,240,250,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(f.x - 4, f.y + 2, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (k0 < 1.4) for (let i = 0; i < 4; i++) px(f.x - 4 + Math.cos(i * 1.6 + k0 * 6) * 5, f.y - 6 - (k0 - 0.7) * 8 + i, 1, 1, "#fff6c8");
    }
    return;
  }
  if (kind === "boat") {
    // Folded paper, a triangle sail, going round with a little wake.
    const a = k * 0.9;
    const bx = f.x + Math.cos(a) * (f.rx - 8);
    const by = f.y + 2 + Math.sin(a) * (f.ry - 5);
    px(bx - 4, by, 9, 2, "#f6efe4");
    px(bx - 3, by + 2, 7, 1, "#d8cfbf");
    px(bx, by - 4, 1, 4, "#f6efe4");
    px(bx + 1, by - 3, 2, 2, "#ffffff");
    px(bx - Math.sin(a) * 6, by + 3 - Math.cos(a) * 2, 2, 1, "rgba(220,240,250,0.8)");
    return;
  }
  // The pigeon: lands on the rim, hops in, splashes, shakes off.
  const rx = f.x + f.rx - 8;
  const ry = f.y - 1;
  const inWater = k > 1 && k < 4;
  const yy = inWater ? ry + 2 : ry - 2;
  px(rx, yy - 3, 4, 3, "#7a7e8a");
  px(rx + 3, yy - 4, 2, 2, "#5a5e6a");
  px(rx + 4, yy - 3, 1, 1, "#e8a066");
  if (inWater && Math.floor(t * 8) % 2) {
    px(rx - 3, yy - 6, 1, 1, "#cfe9f5");
    px(rx + 6, yy - 7, 1, 1, "#cfe9f5");
    px(rx + 1, yy - 9, 1, 1, "#cfe9f5");
    px(rx - 1, yy - 1, 6, 1, "rgba(220,240,250,0.8)");
  }
  if (k < 1) px(rx - 2 + (Math.floor(t * 10) % 2), yy - 5, 3, 1, "#9a9ea8");
}

function drawRoast(ctx: Ctx, p: Point, k: number): void {
  const door = { x: p.x - 3, y: p.y - 21 };
  // First crack: little pops round the drum before the beans drop.
  if (k < 1.4) {
    for (let i = 0; i < 6; i++) {
      const at = i * 0.22;
      if (k > at && k < at + 0.12) fill(ctx, p.x - 11 + ((i * 7) % 16), p.y - 26 + ((i * 5) % 10), 1, 1, "#fff4d8");
    }
  }
  // The pour: beans tumbling from the drum's door into the cooling tray.
  if (k > 1.2 && k < 3.8) {
    for (let i = 0; i < 7; i++) {
      const q = (k * 2.6 + i / 7) % 1;
      const x = door.x + 3 + q * 7;
      const y = door.y + q * q * 14;
      fill(ctx, Math.round(x), Math.round(y), 1, 1, i % 2 ? "#4a2a18" : "#7a4a2c");
    }
  }
  // The tray fills, a stirring arm sweeping round over the beans (fading as they cool).
  const tray = { x: p.x + 2, y: p.y - 7, w: 11, h: 5 };
  const level = Math.max(0, Math.min(1, (k - 1.3) / 2.4));
  if (level > 0) {
    ctx.globalAlpha = Math.min(1, (24 - k) / 4);
    const bw = Math.round(tray.w * level);
    fill(ctx, tray.x, tray.y, bw, tray.h, "#5a3520");
    for (let i = 0; i < bw; i += 2) fill(ctx, tray.x + i, tray.y + 1 + (i % 4 ? 0 : 2), 1, 1, "#9a6440");
    const ang = k * 2.5;
    const cx = tray.x + tray.w / 2;
    const cy = tray.y + tray.h / 2;
    fill(ctx, Math.round(cx), Math.round(cy) - 3, 1, 3, C.iron);
    fill(ctx, Math.round(cx + Math.cos(ang) * 4), Math.round(cy + Math.sin(ang) * 1.5), 2, 1, C.chromeHi);
    ctx.globalAlpha = 1;
  }
  // Smoke curling up from the chimney.
  if (k < 10) {
    for (let i = 0; i < 5; i++) {
      const age = (k + i * 0.7) % 3.5;
      ctx.globalAlpha = Math.max(0, 0.4 * (1 - age / 3.5)) * Math.min(1, (10 - k) / 3);
      fill(ctx, Math.round(p.x - 10 + Math.sin(age * 2 + i) * 3), Math.round(p.y - 40 - age * 8), 2, 2, "#d8d0c4");
    }
    ctx.globalAlpha = 1;
  }
}
