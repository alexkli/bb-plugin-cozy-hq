// Surf Villa: things to click. The pool (noodle duels, beach ball, a flamingo
// float, cannonballs, the pool robot), the surf (a surfer, dolphins, a whale,
// a sailboat, a message in a bottle), the lifeguard tower (the whistle,
// binoculars, a rescue), the bonfire (a ukulele singalong, marshmallows, a
// flare-up), the beach (sandcastles the tide takes, digging, frisbee, a crab
// parade, a gull after someone's fries), the tiki bar and the palms.
//
// Clicks only start things; everything is drawn from the villa's live layers
// (decor, underlay, overlay, lights) by the animation clock.
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import type { Facing, Layout, Point, Rect } from "../../layout.ts";
import { clamp, drawPixelText, OUTLINE, pixelTextWidth } from "../../themekit.ts";
import { C, fill, spr } from "./kit.ts";
import { spotsOf } from "./life.ts";
import { planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;
type Cue = readonly [number, number, string, string?];

// ------------------------------------------------------------------ words

export const SHOW = {
  hover: {
    pool: "The infinity pool · make a splash",
    sea: "The surf · what's out there?",
    tower: "Lifeguard tower · ask the lifeguard",
    fire: "The bonfire · gather round",
    beach: "The beach · play in the sand",
    tiki: "Tiki bar · a coconut, please",
    palm: "A palm tree · give it a shake",
  },
  activity: {
    noodles: "having a pool noodle duel",
    ball: "playing beach ball in the pool",
    float: "floating on a flamingo",
    cannon: "judging cannonballs",
    uke: "singing round the bonfire",
    marsh: "roasting marshmallows",
    castle: "building a sandcastle",
    dig: "digging a hole to nowhere",
    frisbee: "throwing a frisbee",
  },
  /** [seconds after everyone's there, who (by spot), words, sound]. */
  noodles: [
    [0.5, 0, "En garde!"],
    [3.2, 1, "Bonk!", "beach-bonk"],
    [6.4, 0, "Take that, noodle!"],
    [9.6, 1, "I yield! I yield!"],
  ],
  ball: [
    [0.4, 0, "Keep it up!"],
    [3.4, 1, "Mine!"],
    [6.6, 2, "Nice one!"],
    [10.4, 0, "Oops!", "beach-splash"],
  ],
  float: [
    [0.6, 0, "This is the life.", "beach-squeak"],
    [6, 0, "Nobody wake me."],
    [11, 0, "Five more minutes…"],
  ],
  cannon: [
    [0.85, -1, "", "beach-cannon"],
    [1.3, 0, "Whoa!"],
    [2.2, 1, "Ten out of ten!"],
    [4.6, 0, "I'm soaked!"],
  ],
  uke: [
    [0.3, -1, "", "beach-uke"],
    [0.6, 0, "♪ Sun's going down on the sand… ♪"],
    [5.2, 1, "♪ …toes in the sea, drink in hand ♪"],
    [8.4, -1, "", "beach-uke"],
    [10, 2, "♪ aloha, aloha-ooh ♪"],
    [14.6, 1, "Encore!"],
  ],
  marsh: [
    [0.4, 0, "Marshmallows!"],
    [3.4, 2, "Golden brown, not black."],
    [6, 1, "Mine's on fire!", "beach-whoosh"],
    [8.2, 1, "…crispy beach style."],
    [11.6, 2, "Pass the crackers!"],
  ],
  castle: [
    [0.5, 0, "Moat first."],
    [4.4, 1, "Towers! We need towers."],
    [8.6, 0, "Look at it!"],
  ],
  castleWash: ["Nooo, the tide!", "Not the castle!", "Sea: 1, us: 0."],
  castleKeep: ["Best castle yet.", "Our finest work."],
  dig: [
    [0.5, 0, "Just a little hole…"],
    [4.6, 0, "Deeper…", "beach-dig"],
    [9.2, 0, "Treasure!", "beach-ding"],
  ],
  frisbee: [
    [0.4, 0, "Catch!", "beach-frisbee"],
    [4.2, 1, "Nice throw!"],
    [8.4, 0, "Long one!", "beach-frisbee"],
  ],
  whistle: ["Sorry!", "Walking, not running!", "Was that for me?"],
  binoculars: ["What's out there?", "Dolphins?", "Is that a whale?"],
  rescue: ["Hero!", "The duck is safe!", "Nice swim!"],
  bottle: ["A message in a bottle!", "Someone out there says hi!"],
  notes: ["WISH YOU WERE HERE", "SEND MORE SUNSCREEN", "GONE SURFING", "BACK AT HIGH TIDE"],
  fries: ["Hey! My fries!", "Rude gull!", "That was MY fry!"],
  crabs: ["Crab parade!", "Look at them go!", "Sideways is the way."],
  drink: ["Cheers!", "Coconut, no straw!", "Ooh, a little umbrella."],
  coconut: ["Ow! A coconut.", "Bonk!", "Thanks, palm tree."],
  flare: ["Whoa!", "Toasty!", "More driftwood!"],
  surf: ["Gnarly wave!", "Look, a surfer!"],
  whale: ["A whale!", "Thar she blows!"],
  tweet: "TWEET!",
} as const;

// ------------------------------------------------------------------ sounds

export const CLICK_SOUNDS: Record<string, SoundRecipe> = {
  "beach-splash": (k) => {
    k.swell(0, 0.5, 0.14, 2400, 900, 0.9);
    for (let i = 0; i < 4; i++) k.tone(1300 + i * 170, 0.2 + i * 0.07, 0.04, "sine", 0.04, 800);
  },
  "beach-cannon": (k) => {
    k.tone(150, 0, 0.3, "sine", 0.12, 60);
    k.noise(0.02, 0.5, 0.2, 1200);
    k.swell(0.05, 1.1, 0.16, 2600, 700, 0.8);
    for (let i = 0; i < 6; i++) k.tone(1200 + i * 150, 0.35 + i * 0.08, 0.05, "sine", 0.04, 700);
  },
  "beach-jump": (k) => {
    k.tone(420, 0, 0.6, "sine", 0.025, 1100);
    k.tone(150, 0.85, 0.3, "sine", 0.12, 60);
    k.noise(0.87, 0.5, 0.2, 1200);
    k.swell(0.9, 1.1, 0.16, 2600, 700, 0.8);
    for (let i = 0; i < 6; i++) k.tone(1200 + i * 150, 1.2 + i * 0.08, 0.05, "sine", 0.04, 700);
  },
  "beach-bonk": (k) => {
    k.tone(520, 0, 0.08, "square", 0.04, 300);
    k.noise(0, 0.05, 0.05, 1500);
  },
  "beach-squeak": (k) => {
    k.tone(900, 0, 0.12, "square", 0.02, 1400);
    k.tone(1300, 0.14, 0.1, "square", 0.018, 900);
  },
  "beach-robot": (k) => {
    for (let i = 0; i < 5; i++) k.tone(i % 2 ? 1600 : 1200, i * 0.12, 0.06, "square", 0.025);
    k.tone(400, 0.7, 0.3, "sine", 0.04, 900);
  },
  "beach-whistle": (k) => {
    for (let i = 0; i < 3; i++) k.tone(2900, i * 0.18, 0.14, "square", 0.035, 3100);
    k.tone(3000, 0.6, 0.45, "square", 0.04, 2600);
  },
  "beach-gull": (k) => {
    k.tone(1500, 0, 0.18, "triangle", 0.05, 1050);
    k.tone(1350, 0.22, 0.24, "triangle", 0.04, 900);
    k.tone(1500, 0.55, 0.16, "triangle", 0.035, 1000);
  },
  "beach-surf": (k) => {
    k.swell(0, 2.6, 0.16, 600, 220, 0.6, "lowpass");
    k.noise(1.2, 1, 0.04, 2600);
  },
  "beach-dolphin": (k) => {
    for (let i = 0; i < 6; i++) k.tone(2200 + i * 240, i * 0.09, 0.07, "sine", 0.035, 3200 + i * 100);
    k.swell(0.6, 0.6, 0.08, 1800, 900);
  },
  "beach-whale": (k) => {
    k.tone(160, 0, 1.6, "sine", 0.07, 110);
    k.tone(240, 0.3, 1.2, "sine", 0.04, 180);
    k.swell(1.4, 1.2, 0.12, 900, 3000, 0.7);
  },
  "beach-pop": (k) => {
    k.tone(700, 0, 0.06, "square", 0.04, 1600);
    k.tone(1800, 0.3, 0.2, "sine", 0.03, 2400);
  },
  // A ukulele: bright strums through C, A minor, F and G.
  "beach-uke": (k) => {
    const chords = [
      [392, 523, 659, 784],
      [440, 523, 659, 880],
      [440, 523, 698, 880],
      [392, 494, 587, 784],
    ];
    for (let beat = 0; beat < 16; beat++) {
      const chord = chords[Math.floor(beat / 4)]!;
      const up = beat % 2 === 1;
      (up ? [...chord].reverse() : chord).forEach((f, j) => k.tone(f, beat * 0.36 + j * 0.012, up ? 0.3 : 0.5, "triangle", up ? 0.018 : 0.028, f * 0.997));
    }
  },
  "beach-crackle": (k) => {
    for (let i = 0; i < 10; i++) k.noise(Math.random() * 1.2, 0.03, 0.06, 2000 + Math.random() * 2000);
    k.swell(0, 1.2, 0.08, 400, 200, 0.6, "lowpass");
  },
  "beach-whoosh": (k) => {
    k.swell(0, 0.8, 0.18, 300, 1400, 1.2);
    for (let i = 0; i < 10; i++) k.noise(0.2 + Math.random(), 0.03, 0.05, 2600);
  },
  "beach-blend": (k) => {
    k.tone(180, 0, 1, "sawtooth", 0.022, 260);
    k.noise(0, 1, 0.035, 1800);
    k.tone(1300, 1.15, 0.12, "sine", 0.04, 1500);
  },
  "beach-dig": (k) => {
    for (let i = 0; i < 6; i++) k.noise(i * 0.3, 0.12, 0.06, 900);
  },
  "beach-ding": (k) => {
    k.tone(1046, 0, 0.3, "triangle", 0.05);
    k.tone(1318, 0.12, 0.3, "triangle", 0.05);
    k.tone(1568, 0.24, 0.5, "triangle", 0.05);
  },
  "beach-crabs": (k) => {
    for (let i = 0; i < 14; i++) k.noise(i * 0.08, 0.02, 0.035, 3600);
  },
  "beach-frisbee": (k) => {
    k.swell(0, 0.7, 0.1, 800, 2400, 3);
  },
  "beach-rustle": (k) => {
    k.swell(0, 0.8, 0.12, 1800, 3200, 1.2);
    k.tone(240, 0.9, 0.08, "square", 0.05, 120);
  },
};

// ------------------------------------------------------------------ where things are

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

function weighted<T extends string>(options: [T, number][]): T {
  let roll = Math.random() * options.reduce((n, [, w]) => n + w, 0);
  for (const [o, w] of options) {
    roll -= w;
    if (roll <= 0) return o;
  }
  return options[0]![0];
}

function cues(list: readonly Cue[]): GatherCue[] {
  return list.map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 24 ? 4.2 : 2.6, sound }));
}

const nearestHall = (L: Layout, y: number) => L.net.halls.reduce((b, h) => (Math.abs(h - y) < Math.abs(b - y) ? h : b));

function hallAbove(L: Layout, y: number): number {
  const above = L.net.halls.filter((h) => h < y);
  return above.length > 0 ? Math.max(...above) : nearestHall(L, y);
}

function island(L: Layout): Rect | null {
  const p = L.props.find((q) => q.kind === "kitchen-island");
  return p ? { x: p.x, y: p.y, w: (p.w ?? 72) + 2, h: 26 } : null;
}

/** Open sand for games on the beach: the event area, when it's down on the beach. */
function sandArea(L: Layout): Rect | null {
  const P = planOf(L);
  return P && L.eventArea.y >= P.sandY ? L.eventArea : null;
}

/** The beach to click: the deck chairs and the sand below them, down to the surf. */
function beachRect(L: Layout): Rect {
  const w = L.waiting;
  const sea = planOf(L)?.sea;
  const bottom = sea && sea.y > w.y + w.h && L.eventArea.y >= w.y ? sea.y - 2 : w.y + w.h;
  return { x: w.x, y: w.y, w: w.w, h: bottom - w.y };
}

/** Palms need the floor plan of the furniture, which needs a canvas; there's none when the plan is checked outside a browser. */
function palms(L: Layout): { x: number; y: number }[] {
  return typeof document === "undefined" ? [] : spotsOf(L).palms;
}

export function clickables(L: Layout): SceneryClickable[] {
  const P = planOf(L);
  const out: SceneryClickable[] = [];
  P?.pools.forEach((p, i) => out.push({ id: `pool-${i}`, rect: p, hover: SHOW.hover.pool }));
  if (P?.sea) out.push({ id: "sea", rect: P.sea, hover: SHOW.hover.sea });
  if (P?.tower) out.push({ id: "tower", rect: { x: P.tower.x - 14, y: P.tower.y - 51, w: 30, h: 52 }, hover: SHOW.hover.tower });
  if (P?.bonfire) out.push({ id: "fire", rect: { x: P.bonfire.x - 12, y: P.bonfire.y - 16, w: 24, h: 22 }, hover: SHOW.hover.fire });
  const isl = island(L);
  if (isl) out.push({ id: "tiki", rect: isl, hover: SHOW.hover.tiki });
  palms(L).forEach((p, i) => out.push({ id: `palm-${i}`, rect: { x: p.x - 14, y: p.y - 56, w: 28, h: 56 }, hover: SHOW.hover.palm }));
  out.push({ id: "beach", rect: beachRect(L), hover: SHOW.hover.beach });
  return out;
}

// ------------------------------------------------------------------ what's going on

type Kind =
  | "noodles"
  | "ball"
  | "float"
  | "cannon"
  | "robot"
  | "drift"
  | "surfer"
  | "dolphins"
  | "whale"
  | "sail"
  | "bottle"
  | "whistle"
  | "binoculars"
  | "rescue"
  | "uke"
  | "marsh"
  | "flare"
  | "castle"
  | "dig"
  | "frisbee"
  | "crabs"
  | "gull"
  | "drink"
  | "coconut";

interface Show {
  kind: Kind;
  t0: number;
  /** How long it runs on its own clock (from t0, or from when everyone has arrived). */
  dur: number;
  x: number;
  y: number;
  dir: number;
  seed: number;
  /** The pool, the sea strip or the sand it happens in. */
  area: Rect;
  g: Gathering | null;
  spots: GatherSpot[];
  /** Where something lands (a gull's dive, a coconut, a drink) and whether it's on someone. */
  to: { x: number; y: number; hit: boolean } | null;
  text: string;
  /** A gathering that came and went: when the leftovers (a castle, a hole) are gone. */
  until: number;
}

let shows: Show[] = [];
let forL: Layout | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  shows = [];
}

function add(s: Omit<Show, "seed" | "g" | "spots" | "to" | "text" | "until"> & Partial<Show>): Show {
  const show: Show = { seed: Math.floor(Math.random() * 1000), g: null, spots: [], to: null, text: "", until: Infinity, ...s };
  shows = shows.filter((o) => !over(o, s.t0));
  shows.push(show);
  if (shows.length > 16) shows.shift();
  return show;
}

/** The show's own clock: from t0, or from when everyone came over (null while they're on their way). */
function clock(s: Show, t: number): number | null {
  if (!s.g) return t - s.t0;
  if (s.g.arrivedAt === null) return null;
  return t - s.g.arrivedAt;
}

function over(s: Show, t: number): boolean {
  if (s.g) {
    if (!s.g.done) return t - s.t0 > 90;
    if (s.until === Infinity) s.until = t + (s.kind === "castle" || s.kind === "dig" ? 14 : 0);
    return t > s.until;
  }
  return t - s.t0 > s.dur;
}

const running = (kind: Kind[], area: Rect, t: number) => shows.some((s) => kind.includes(s.kind) && s.area === area && !over(s, t));

// ------------------------------------------------------------------ clicks

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const P = planOf(act.L);
  if (!P) return null;
  if (id.startsWith("pool-")) {
    const pool = P.pools[Number(id.slice(5))];
    return pool ? clickPool(pool, act) : null;
  }
  if (id.startsWith("palm-")) {
    const p = palms(act.L)[Number(id.slice(5))];
    return p ? clickPalm(p, act) : null;
  }
  switch (id) {
    case "sea":
      return P.sea ? clickSea(P.sea, act) : null;
    case "tower":
      return P.tower ? clickTower(P.tower, act) : null;
    case "fire":
      return P.bonfire ? clickFire(P.bonfire, act) : null;
    case "tiki":
      return clickTiki(act);
    case "beach":
      return clickBeach(act);
  }
  return null;
}

const wadeY = (p: Rect, f: number) => Math.round(p.y + clamp(p.h * f, 13, p.h - 3));

/** Along the deck above the pool, then straight in: as little walking on water as can be. */
function inPool(L: Layout, p: Rect, x: number, y: number, facing: Facing, activity: string, pose: GatherSpot["pose"] = "stand"): GatherSpot {
  const hall = hallAbove(L, p.y);
  const px = Math.round(x);
  return { x: px, y, facing, pose, activity, path: [{ x: px, y: hall, c: true }, { x: px, y }] };
}

function clickPool(p: Rect, act: SceneryActions): string | null {
  const t = act.t;
  const L = act.L;
  const xs = (f: number) => p.x + clamp(p.w * f, 12, p.w - 12);
  if (!running(["noodles", "ball", "float", "cannon"], p, t) && Math.random() < 0.8) {
    const kind = weighted<"noodles" | "ball" | "float" | "cannon">([
      ["noodles", 3],
      ["ball", 3],
      ["float", 2],
      ["cannon", 3],
    ]);
    const A = SHOW.activity;
    let spots: GatherSpot[];
    if (kind === "noodles") spots = [inPool(L, p, xs(0.38), wadeY(p, 0.62), "right", A.noodles), inPool(L, p, xs(0.62), wadeY(p, 0.62), "left", A.noodles)];
    else if (kind === "ball") spots = [inPool(L, p, xs(0.25), wadeY(p, 0.5), "right", A.ball), inPool(L, p, xs(0.75), wadeY(p, 0.5), "left", A.ball), inPool(L, p, xs(0.5), wadeY(p, 0.85), "back", A.ball)];
    else if (kind === "float") spots = [inPool(L, p, xs(0.3 + Math.random() * 0.4), wadeY(p, 0.62), "front", A.float, "nap")];
    else spots = [inPool(L, p, xs(0.2), wadeY(p, 0.6), "right", A.cannon), inPool(L, p, xs(0.8), wadeY(p, 0.6), "left", A.cannon)];
    const stay = kind === "float" ? 15 : kind === "cannon" ? 7 : 12;
    const g = act.gather(spots, stay, cues(SHOW[kind]), kind === "float" ? 1 : 2);
    if (g) {
      add({ kind, t0: t, dur: stay, x: xs(0.5), y: wadeY(p, 0.55), dir: 1, area: p, g, spots });
      return kind === "cannon" ? "beach-jump" : "beach-splash";
    }
    // Nobody free: someone from out of town does the cannonball anyway.
    if (kind === "cannon") {
      add({ kind, t0: t, dur: 6, x: xs(0.5), y: wadeY(p, 0.55), dir: 1, area: p });
      return "beach-jump";
    }
  }
  const kind = running(["robot"], p, t) ? "drift" : Math.random() < 0.55 ? "robot" : "drift";
  add({ kind, t0: t, dur: kind === "robot" ? 8 : 12, x: p.x, y: wadeY(p, 0.5), dir: 1, area: p });
  return kind === "robot" ? "beach-robot" : "beach-squeak";
}

function clickSea(sea: Rect, act: SceneryActions): string {
  const t = act.t;
  const kind = weighted<Kind>(
    act.night > 0.5
      ? [
          ["whale", 2],
          ["dolphins", 2],
          ["sail", 2],
          ["bottle", 3],
        ]
      : [
          ["surfer", 4],
          ["dolphins", 3],
          ["whale", 2],
          ["sail", 2],
          ["bottle", 2],
        ],
  );
  const x = clamp(Math.round(act.at.x), 24, act.L.W - 24);
  const dir = Math.random() < 0.5 ? -1 : 1;
  switch (kind) {
    case "surfer": {
      add({ kind, t0: t, dur: 7.5, x: 0, y: sea.y, dir: 1, area: sea });
      const who = act.near(x, sea.y, 160)[0];
      if (who) act.say(who.id, pick(SHOW.surf), 2.6, 1.4);
      return "beach-surf";
    }
    case "dolphins":
      add({ kind, t0: t, dur: 4.6, x, y: sea.y, dir, area: sea });
      return "beach-dolphin";
    case "whale": {
      add({ kind, t0: t, dur: 7.5, x, y: sea.y, dir, area: sea });
      const who = act.near(x, sea.y, 180)[0];
      if (who) act.say(who.id, pick(SHOW.whale), 2.6, 1.8);
      return "beach-whale";
    }
    case "sail":
      add({ kind, t0: t, dur: 16, x: dir > 0 ? -24 : act.L.W + 24, y: sea.y, dir, area: sea });
      return "beach-surf";
    default: {
      add({ kind: "bottle", t0: t, dur: 11, x, y: sea.y, dir, area: sea, text: pick(SHOW.notes) });
      const who = act.near(x, sea.y, 140)[0];
      if (who) act.say(who.id, pick(SHOW.bottle), 2.8, 4);
      return "beach-pop";
    }
  }
}

function clickTower(tw: Point, act: SceneryActions): string {
  const t = act.t;
  const sea = planOf(act.L)?.sea;
  const area = { x: tw.x - 14, y: tw.y - 51, w: 30, h: 52 };
  const busy = running(["whistle", "binoculars", "rescue"], area, t);
  const kind = busy ? "whistle" : weighted<Kind>(sea ? [["whistle", 3], ["binoculars", 2], ["rescue", 3]] : [["whistle", 3], ["binoculars", 2]]);
  if (kind === "rescue" && sea) {
    const fx = clamp(tw.x + (Math.random() < 0.5 ? -44 : 52), 16, act.L.W - 16);
    add({ kind, t0: t, dur: 7.4, x: tw.x, y: tw.y, dir: fx < tw.x ? -1 : 1, area, to: { x: fx, y: sea.y, hit: false } });
    const who = act.near(tw.x, tw.y, 200)[0];
    if (who) act.say(who.id, pick(SHOW.rescue), 2.6, 6.2);
    return "beach-whistle";
  }
  add({ kind, t0: t, dur: kind === "whistle" ? 2.6 : 5, x: tw.x, y: tw.y, dir: 1, area });
  if (kind === "whistle") {
    const who = act.near(tw.x, tw.y, 150)[0];
    if (who) act.say(who.id, pick(SHOW.whistle), 2.4, 0.7);
  } else {
    const who = act.near(tw.x, tw.y, 150)[0];
    if (who) act.say(who.id, pick(SHOW.binoculars), 2.4, 1.2);
  }
  return kind === "whistle" ? "beach-whistle" : "beach-gull";
}

function clickFire(f: Point, act: SceneryActions): string {
  const t = act.t;
  const area = { x: f.x - 12, y: f.y - 16, w: 24, h: 22 };
  if (!running(["uke", "marsh"], area, t) && Math.random() < 0.75) {
    const kind = act.night > 0.4 ? (Math.random() < 0.6 ? "uke" : "marsh") : Math.random() < 0.5 ? "uke" : "marsh";
    const hall = nearestHall(act.L, f.y);
    const at = (x: number, y: number, facing: Facing): GatherSpot => ({ x, y, facing, pose: "stand", activity: SHOW.activity[kind], path: [{ x, y: hall, c: true }, { x, y }] });
    // Either side of the fire, and one behind it, facing us over the flames.
    const spots = [at(f.x - 20, f.y + 3, "right"), at(f.x + 19, f.y + 3, "left"), at(f.x - 1, f.y - 7, "front")];
    const g = act.gather(spots, kind === "uke" ? 17 : 14, cues(SHOW[kind]), 2);
    if (g) {
      add({ kind, t0: t, dur: 17, x: f.x, y: f.y, dir: 1, area, g, spots });
      add({ kind: "flare", t0: t, dur: 4, x: f.x, y: f.y, dir: 1, area: { ...area } });
      return "beach-crackle";
    }
  }
  add({ kind: "flare", t0: t, dur: 7, x: f.x, y: f.y, dir: 1, area: { ...area } });
  const who = act.near(f.x, f.y, 90)[0];
  if (who) act.say(who.id, pick(SHOW.flare), 2.4, 0.5);
  return "beach-whoosh";
}

function clickBeach(act: SceneryActions): string {
  const t = act.t;
  const L = act.L;
  const A = sandArea(L);
  const B = beachRect(L);
  if (A && !running(["castle", "dig", "frisbee"], A, t) && Math.random() < 0.75) {
    const kind = weighted<"castle" | "dig" | "frisbee">([
      ["castle", 3],
      ["dig", 2],
      ["frisbee", 2],
    ]);
    const hall = nearestHall(L, A.y);
    const at = (x: number, y: number, facing: Facing): GatherSpot => ({ x: Math.round(x), y: Math.round(y), facing, pose: "stand", activity: SHOW.activity[kind], path: [{ x: Math.round(x), y: hall, c: true }, { x: Math.round(x), y: Math.round(y) }] });
    // Not right on top of the bonfire or under the lifeguard tower.
    const P = planOf(L);
    const lo = A.x + 28;
    const hi = A.x + A.w - 28;
    let cx = clamp(Math.round(act.at.x), lo, hi);
    for (const ox of [P?.bonfire?.x, P?.tower?.x]) {
      if (ox === undefined || Math.abs(cx - ox) >= 72) continue;
      const side = cx >= ox ? (ox + 72 <= hi ? 1 : -1) : ox - 72 >= lo ? -1 : 1;
      cx = clamp(ox + side * 72, lo, hi);
    }
    const cy = A.y + A.h - 6;
    let spots: GatherSpot[];
    if (kind === "castle") spots = [at(cx - 18, cy + 1, "right"), at(cx + 18, cy + 1, "left")];
    else if (kind === "dig") spots = [at(cx - 9, cy, "right")];
    else spots = [at(A.x + 14, A.y + A.h * 0.6, "right"), at(A.x + A.w - 14, A.y + A.h * 0.6, "left")];
    const stay = kind === "frisbee" ? 11 : 12;
    const g = act.gather(spots, stay, cues(SHOW[kind]), kind === "dig" ? 1 : 2);
    if (g) {
      const s = add({ kind, t0: t, dur: stay, x: cx, y: cy, dir: 1, area: A, g, spots });
      // Close to the water the sea gets the castle in the end.
      const sea = P?.sea;
      if (kind === "castle") s.to = { x: cx, y: cy, hit: !!sea && sea.y - cy < 34 };
      return kind === "dig" ? "beach-dig" : "beach-splash";
    }
  }
  const x = clamp(Math.round(act.at.x), B.x + 8, B.x + B.w - 8);
  const y = clamp(Math.round(act.at.y), B.y + 8, B.y + B.h - 4);
  const who = act.near(x, y, 70)[0];
  if (who && Math.random() < 0.6) {
    add({ kind: "gull", t0: t, dur: 3.4, x: Math.round(who.x), y: Math.round(who.y), dir: who.x > L.W / 2 ? -1 : 1, area: B, to: { x: Math.round(who.x), y: Math.round(who.y - 27), hit: true } });
    act.say(who.id, pick(SHOW.fries), 2.4, 1.2);
    return "beach-gull";
  }
  if (Math.random() < 0.5) {
    add({ kind: "gull", t0: t, dur: 4.2, x, y, dir: x > L.W / 2 ? -1 : 1, area: B, to: { x, y, hit: false } });
    return "beach-gull";
  }
  add({ kind: "crabs", t0: t, dur: 8, x: B.x - 10, y, dir: 1, area: B });
  const by = act.near(x, y, 120)[0];
  if (by) act.say(by.id, pick(SHOW.crabs), 2.4, 1.5);
  return "beach-crabs";
}

function clickTiki(act: SceneryActions): string | null {
  const isl = island(act.L);
  if (!isl) return null;
  const t = act.t;
  const who = act.near(isl.x + isl.w / 2, isl.y + 30, 80)[0];
  const tx = clamp(Math.round(who ? who.x : isl.x + 14), isl.x + 8, isl.x + isl.w - 10);
  add({ kind: "drink", t0: t, dur: 9, x: isl.x + isl.w - 10, y: isl.y + 6, dir: -1, area: isl, to: { x: tx, y: isl.y + 6, hit: !!who } });
  if (who) act.say(who.id, pick(SHOW.drink), 2.4, 2.8);
  return "beach-blend";
}

function clickPalm(p: { x: number; y: number }, act: SceneryActions): string {
  const t = act.t;
  const dir = Math.random() < 0.5 ? -1 : 1;
  const under = act.near(p.x, p.y, 26)[0];
  const to = under ? { x: Math.round(under.x), y: Math.round(under.y - 27), hit: true } : { x: p.x + dir * 10, y: p.y + 2, hit: false };
  if (under) act.say(under.id, pick(SHOW.coconut), 2.4, 0.9);
  add({ kind: "coconut", t0: t, dur: 7, x: p.x + dir * 5, y: p.y - 46, dir, area: { x: p.x, y: p.y, w: 1, h: 1 }, to });
  return "beach-rustle";
}

// ------------------------------------------------------------------ sprites

/** A swimmer from out of town: curled up for the cannonball, or just a head bobbing. */
const curled = () =>
  spr("click-curled", 10, 10, (g) => {
    g.ellipse(4.5, 5, 3.6, 3.6, "#e7b08a");
    g.rect(2, 1, 5, 2, "#4a2f22");
    g.rect(2, 6, 6, 2, C.coral);
    g.set(6, 3, OUTLINE);
  });

const head = () =>
  spr("click-head", 8, 6, (g) => {
    g.rrect(1, 0, 6, 5, "#e7b08a", 1);
    g.rect(1, 0, 6, 2, "#4a2f22");
    g.set(5, 3, OUTLINE);
  });

/** The flamingo float: the back of the ring with the neck, and its front rim (drawn over whoever sits in it). */
const flamingo = (front: boolean) =>
  spr(`click-flamingo-${front}`, 28, 22, (g) => {
    const pink = "#ff8fb8";
    const hi = "#ffc0d8";
    const lo = "#e86a9a";
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 28; x++) {
        const dx = (x - 13.5) / 12.5;
        const dy = (y - 16) / 4.6;
        const d = dx * dx + dy * dy;
        if (d > 1 || d < 0.3) continue;
        if (front !== y >= 16) continue;
        g.set(x, y, y < 15 ? hi : d > 0.8 ? lo : pink);
      }
    }
    if (!front) {
      g.rect(3, 4, 2, 9, pink).rect(4, 3, 1, 1, pink);
      g.rect(3, 1, 4, 3, pink).set(6, 2, OUTLINE);
      g.rect(7, 2, 2, 1, "#2a2a2e").set(7, 3, "#f4ead8");
    }
  });

const robot = () =>
  spr("click-robot", 12, 7, (g) => {
    g.rect(1, 1, 10, 4, "#2c7f90").rect(1, 1, 10, 1, "#6ec4d2");
    g.rect(0, 5, 12, 1, "#1d4f5a");
    g.set(9, 2, "#ffd166").set(3, 2, "#a8e8f0");
  });

const ukulele = () =>
  spr("click-uke", 10, 5, (g) => {
    g.ellipse(2.5, 2, 2, 1.6, C.teakHi);
    g.set(2, 2, "#3a2a20");
    g.rect(4, 1, 6, 1, C.teakDk);
    g.set(9, 0, C.teakDk);
  });

const runner = (step: boolean, carry: boolean) =>
  spr(`click-runner-${step}-${carry}`, 12, 20, (g) => {
    g.rrect(2, 0, 8, 7, "#c98a5e", 2);
    g.rrect(2, 0, 8, 3, "#ffd166", 1);
    g.rect(1, 2, 10, 1, "#e7a83a");
    g.set(7, 4, OUTLINE);
    g.rect(3, 7, 6, 5, "#e8453c");
    g.rect(3, 12, 6, 2, "#b8302a");
    g.rect(2, 8, 1, 3, "#c98a5e").rect(9, 8, 1, 3, "#c98a5e");
    if (step) g.rect(3, 14, 2, 4, "#c98a5e").rect(7, 14, 2, 3, "#c98a5e").rect(2, 18, 3, 1, "#3a2a20").rect(7, 17, 3, 1, "#3a2a20");
    else g.rect(4, 14, 2, 4, "#c98a5e").rect(6, 14, 2, 4, "#c98a5e").rect(3, 18, 3, 1, "#3a2a20").rect(6, 18, 3, 1, "#3a2a20");
    if (carry) g.rect(8, 7, 4, 3, C.sun).set(11, 6, "#e8453c").set(11, 7, C.sun);
  });

/** A rubber duck ring, adrift. */
const duckRing = () =>
  spr("click-duck", 10, 7, (g) => {
    g.ellipse(4.5, 4.5, 4, 2, C.sun);
    g.ellipse(4.5, 4.5, 1.6, 0.8, "#3fb2c8");
    g.rect(6, 0, 3, 3, C.sun).set(8, 1, OUTLINE).set(9, 2, "#ff8a3d");
  });

const dolphin = (tilt: number) =>
  spr(`click-dolphin-${tilt}`, 12, 7, (g) => {
    for (let x = 0; x < 11; x++) {
      const y = 3 + Math.round(((x - 5) * tilt) / 5);
      g.set(x, y, "#5a7f9a").set(x, y - 1, x > 1 && x < 9 ? "#7fa0b8" : null).set(x, y + 1, x > 2 && x < 8 ? "#c8dce6" : null);
    }
    g.set(5, 1 - tilt, "#5a7f9a").set(0, 2 + tilt, "#4a6a84").set(0, 4 + tilt, "#4a6a84");
    g.set(8, 2 + tilt, OUTLINE);
  });

const sailboat = () =>
  spr("click-sail", 16, 15, (g) => {
    for (let j = 0; j < 9; j++) g.rect(8 - Math.floor(j * 0.7), 1 + j, Math.floor(j * 0.7) + 1, 1, C.white);
    g.rect(9, 3, 1, 7, C.coral).rect(10, 5, 2, 5, C.coralHi);
    g.rect(8, 0, 1, 11, C.teakDk);
    g.rect(2, 11, 12, 2, C.teak).rect(3, 13, 10, 1, C.teakLo);
  });

const bottle = () =>
  spr("click-bottle", 9, 4, (g) => {
    g.rect(1, 1, 5, 2, "#7fc8a0").rect(6, 1, 2, 1, "#7fc8a0").set(8, 1, C.teak);
    g.rect(2, 1, 2, 1, "#f4ead8");
  });

const coconut = () =>
  spr("click-coconut", 6, 6, (g) => {
    g.ellipse(2.5, 2.5, 2.2, 2.2, C.coconut);
    g.set(1, 1, C.coconutHi).set(3, 3, "#5c3a22");
  });

const drink = () =>
  spr("click-drink", 7, 8, (g) => {
    g.ellipse(3, 5, 2.4, 2, C.coconut);
    g.set(2, 4, "#f4ead8").set(3, 4, "#f4ead8");
    g.rect(4, 1, 1, 3, C.bambooLo);
    g.rect(3, 0, 3, 1, C.hibiscus).set(2, 1, C.hibiscus).set(6, 1, C.hibiscus);
  });

const fry = (ctx: Ctx, x: number, y: number) => fill(ctx, x, y, 4, 1, C.sun);

function crab(ctx: Ctx, x: number, y: number, step: number): void {
  fill(ctx, x - 2, y - 3, 5, 3, C.coralLo);
  fill(ctx, x - 1, y - 3, 3, 1, C.coral);
  fill(ctx, x - 1, y - 4, 1, 1, OUTLINE);
  fill(ctx, x + 1, y - 4, 1, 1, OUTLINE);
  fill(ctx, x - 4, y - 3 - step, 2, 1, C.coral);
  fill(ctx, x + 3, y - 4 + step, 2, 1, C.coral);
  fill(ctx, x - 3, y - step, 1, 1, C.coralDk);
  fill(ctx, x + 3, y - 1 + step, 1, 1, C.coralDk);
}

function gull(ctx: Ctx, x: number, y: number, flap: boolean, dir: number): void {
  const X = (dx: number) => Math.round(x + dx * dir);
  fill(ctx, X(-3) - (dir < 0 ? 5 : 0), y - 1, 7, 3, OUTLINE);
  fill(ctx, X(-2) - (dir < 0 ? 3 : 0), y, 5, 1, C.white);
  fill(ctx, X(3), y, 1, 1, "#ffc83d");
  fill(ctx, X(-4) - (dir < 0 ? 1 : 0), flap ? y - 3 : y + 2, 3, 1, "#c4ccd8");
  fill(ctx, X(1) - (dir < 0 ? 1 : 0), flap ? y - 3 : y + 2, 3, 1, "#c4ccd8");
}

/** A droplet fountain: `k` 0..1 through the splash, `h` how high it goes. */
function splash(ctx: Ctx, x: number, y: number, k: number, h: number, n: number): void {
  if (k < 0 || k > 1) return;
  ctx.fillStyle = "rgba(240,252,255,0.95)";
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * 2;
    const up = Math.sin(k * Math.PI) * h * (1 - Math.abs(a) * 0.45);
    ctx.fillRect(Math.round(x + a * (4 + k * 10)), Math.round(y - up), 2, 2);
  }
  const r = Math.round(3 + k * 12);
  ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
  ctx.fillRect(x - r, y, r * 2, 1);
  ctx.fillRect(x - r + 2, y + 2, r * 2 - 4, 1);
}

/** Pool water up to the waist of whoever's wading at (x, y). */
function wade(ctx: Ctx, x: number, y: number, t: number, i: number): void {
  ctx.fillStyle = "rgba(60,188,208,0.8)";
  ctx.fillRect(x - 8, y - 11, 17, 12);
  ctx.fillStyle = "rgba(220,250,255,0.9)";
  const w = Math.floor(t * 4 + i) % 3;
  ctx.fillRect(x - 9 + w, y - 12, 5, 1);
  ctx.fillRect(x + 3 - w, y - 12, 6, 1);
}

function bubble(ctx: Ctx, x: number, y: number, text: string): void {
  const w = pixelTextWidth(text) + 6;
  const bx = Math.round(x - w / 2);
  fill(ctx, bx - 1, y - 1, w + 2, 9, OUTLINE);
  fill(ctx, bx, y, w, 7, C.white);
  fill(ctx, Math.round(x) - 1, y + 8, 3, 1, OUTLINE);
  fill(ctx, Math.round(x), y + 9, 1, 1, OUTLINE);
  drawPixelText(ctx, text, bx + 3, y + 1, "#2a3a46");
}

// ------------------------------------------------------------------ drawing

const ease = (k: number) => k * k * (3 - 2 * k);

/** Shows among the furniture and people, depth-sorted. */
export function clickItems(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL || shows.length === 0) return [];
  const t = info.t;
  const out: Drawable[] = [];
  for (const s of shows) {
    if (over(s, t)) continue;
    const k = clock(s, t);
    switch (s.kind) {
      case "noodles":
      case "ball":
      case "cannon":
        poolPeople(ctx, s, k, t, out);
        break;
      case "float":
        floatItems(ctx, s, t, out);
        break;
      case "flare":
        if (k !== null) out.push({ z: s.y + 3.2, draw: () => flare(ctx, s.x, s.y, t, Math.min(1, k / 0.5, (s.dur - k) / 1.2)) });
        break;
      case "uke":
      case "marsh":
        fireItems(ctx, s, k, t, out);
        break;
      case "castle":
      case "dig":
      case "frisbee":
        sandItems(ctx, s, k, t, out);
        break;
      case "whistle":
      case "binoculars":
        if (k !== null) out.push({ z: s.y + 0.2, draw: () => lifeguardUp(ctx, s, k, t) });
        break;
      case "rescue":
        if (k !== null) rescueItems(ctx, s, k, t, out);
        break;
      case "gull":
        if (k !== null) out.push({ z: s.to?.hit ? L.H + 1 : s.y + 1, draw: () => gullShow(ctx, s, k, t) });
        break;
      case "drink":
        if (k !== null) out.push({ z: s.area.y + 20.5, draw: () => drinkShow(ctx, s, k) });
        break;
      case "coconut":
        if (k !== null) out.push({ z: s.to!.hit ? s.to!.y + 28 : s.to!.y + 1, draw: () => coconutShow(ctx, s, k, t) });
        break;
      default:
        break;
    }
  }
  return out;
}

function poolPeople(ctx: Ctx, s: Show, k: number | null, t: number, out: Drawable[]): void {
  const g = s.g;
  if (g) {
    for (let i = 0; i < g.size; i++) {
      if (!g.present[i]) continue;
      const sp = s.spots[i]!;
      out.push({ z: sp.y + 0.6, draw: () => wade(ctx, sp.x, sp.y, t, i) });
    }
  }
  if (s.kind === "cannon") {
    // One jump right away, and another for whoever came over to judge it.
    const own = t - s.t0;
    const early = g !== null && g.arrivedAt !== null && g.arrivedAt - s.t0 < 5.4;
    const kk = !early && own < 5.4 ? own : k;
    if (kk !== null) cannonball(ctx, s, kk, t, out);
    return;
  }
  if (k === null) return;
  if (s.kind === "noodles" && g && g.present[0] && g.present[1]) {
    const a = s.spots[0]!;
    const b = s.spots[1]!;
    out.push({
      z: Math.max(a.y, b.y) + 0.7,
      draw: () => {
        const clash = Math.sin(k * 5);
        for (const [i, sp] of [a, b].entries()) {
          const dir = i === 0 ? 1 : -1;
          const ang = -0.9 + (i === 0 ? clash : -clash) * 0.6;
          ctx.fillStyle = i === 0 ? "#ff8fb8" : C.lime;
          for (let d = 0; d < 16; d++) ctx.fillRect(Math.round(sp.x + dir * (5 + Math.cos(ang) * d)), Math.round(sp.y - 14 + Math.sin(ang) * d), 2, 2);
        }
        if (clash > 0.9) splash(ctx, Math.round((a.x + b.x) / 2), a.y - 10, (clash - 0.9) * 10, 8, 5);
      },
    });
  }
  if (s.kind === "ball" && g) {
    const who = s.spots.slice(0, g.size).filter((_, i) => g.present[i]);
    if (who.length < 2) return;
    out.push({
      z: s.area.y + s.area.h + 1,
      draw: () => {
        const last = s.dur - 2;
        let x: number;
        let y: number;
        if (k < last) {
          const n = Math.floor(k / 1.1);
          const p = (k % 1.1) / 1.1;
          const from = who[n % who.length]!;
          const to = who[(n + 1) % who.length]!;
          x = from.x + (to.x - from.x) * p;
          y = from.y - 30 + (to.y - from.y) * p - Math.sin(p * Math.PI) * 18;
        } else {
          const p = Math.min(1, (k - last) / 0.7);
          x = s.x + 10;
          y = s.y - 30 + p * 26;
          if (p >= 1) splash(ctx, Math.round(x), s.y - 2, (k - last - 0.7) / 0.8, 10, 6);
        }
        beachBall(ctx, Math.round(x), Math.round(y));
      },
    });
  }
}

function cannonball(ctx: Ctx, s: Show, k: number, t: number, out: Drawable[]): void {
  {
    const p = s.area;
    const jx = Math.round(p.x + p.w / 2);
    const wy = Math.round(p.y + clamp(p.h * 0.55, 13, p.h - 3));
    out.push({
      z: wy + 1,
      draw: () => {
        if (k < 0.9) {
          const q = k / 0.9;
          const x = jx + q * 8;
          const y = p.y - 6 + (wy - 4 - (p.y - 6)) * q - Math.sin(q * Math.PI) * 16;
          ctx.drawImage(curled(), Math.round(x - 5), Math.round(y - 8));
        } else if (k < 2.3) {
          // A column of water first, then the drops come down around it.
          const q = (k - 0.9) / 1.4;
          const ch = Math.round(Math.sin(Math.min(1, q * 1.6) * Math.PI) * 20);
          if (ch > 0) {
            ctx.fillStyle = "rgba(240,252,255,0.9)";
            ctx.fillRect(jx + 5, wy - ch, 6, ch);
            ctx.fillRect(jx + 6, wy - ch - 2, 4, 2);
          }
          splash(ctx, jx + 8, wy, q, 28, 11);
        }
        else if (k < 5.4) {
          ctx.drawImage(head(), Math.round(jx + 8 - 4 + (k - 2.3) * 3), wy - 5 + (Math.floor(t * 2) % 2));
          ctx.fillStyle = "rgba(220,250,255,0.85)";
          ctx.fillRect(Math.round(jx + 3 + (k - 2.3) * 3), wy, 10, 1);
        }
      },
    });
  }
}

function beachBall(ctx: Ctx, x: number, y: number): void {
  fill(ctx, x - 3, y - 3, 7, 7, OUTLINE);
  fill(ctx, x - 2, y - 2, 5, 5, C.white);
  fill(ctx, x - 2, y - 2, 2, 2, C.coral);
  fill(ctx, x + 1, y + 1, 2, 2, C.sea);
  fill(ctx, x + 1, y - 2, 2, 1, C.sun);
}

function floatItems(ctx: Ctx, s: Show, t: number, out: Drawable[]): void {
  const g = s.g;
  if (!g || !g.present[0]) return;
  const sp = s.spots[0]!;
  const bob = Math.floor(t * 1.5) % 2;
  out.push({
    z: sp.y - 0.4,
    draw: () => {
      ctx.fillStyle = "rgba(220,250,255,0.6)";
      ctx.fillRect(sp.x - 15, sp.y + 1, 30, 1);
      ctx.drawImage(flamingo(false), sp.x - 14, sp.y - 18 + bob);
    },
  });
  out.push({ z: sp.y + 0.6, draw: () => ctx.drawImage(flamingo(true), sp.x - 14, sp.y - 18 + bob) });
}

function flare(ctx: Ctx, x: number, y: number, t: number, k: number): void {
  if (k <= 0) return;
  const f = Math.floor(t * 12);
  const h = (n: number) => Math.round(n * k);
  fill(ctx, x - 6, y - h(8 + (f % 3)), 3, h(8 + (f % 3)), "#ff6a2a");
  fill(ctx, x + 4, y - h(9 + ((f + 1) % 3)), 3, h(9 + ((f + 1) % 3)), "#ff6a2a");
  fill(ctx, x - 3, y - h(15 + ((f + 2) % 3)), 3, h(15 + ((f + 2) % 3)), "#ff8a3d");
  fill(ctx, x + 1, y - h(13 + (f % 4)), 3, h(13 + (f % 4)), "#ff9a40");
  fill(ctx, x - 1, y - h(10 + (f % 2)), 3, h(8), "#ffc85a");
  fill(ctx, x, y - h(5), 1, h(4), "#fff3b0");
  ctx.fillStyle = "#ffcf6a";
  for (let i = 0; i < 6; i++) {
    const q = (t * 0.9 + i * 0.17) % 1;
    ctx.fillRect(Math.round(x + Math.sin(t * 3 + i * 1.7) * 6), Math.round(y - 16 * k - q * 26), 1, 1);
  }
}

function fireItems(ctx: Ctx, s: Show, k: number | null, t: number, out: Drawable[]): void {
  const g = s.g;
  if (!g || k === null) return;
  out.push({ z: s.y + 3.1, draw: () => flare(ctx, s.x, s.y, t, Math.min(0.75, k / 0.8, Math.max(0, (s.dur - k) / 1.5))) });
  for (let i = 0; i < g.size; i++) {
    if (!g.present[i]) continue;
    const sp = s.spots[i]!;
    const dir = sp.facing === "right" ? 1 : sp.facing === "left" ? -1 : 0;
    if (s.kind === "uke" && i === 0) {
      out.push({
        z: sp.y + 0.6,
        draw: () => {
          ctx.drawImage(ukulele(), sp.x - 4, sp.y - 13 + (Math.floor(t * 3) % 2));
          const q = (t * 0.6) % 1;
          ctx.fillStyle = "#3a3046";
          const nx = Math.round(sp.x + 4 + q * 6);
          const ny = Math.round(sp.y - 30 - q * 12);
          ctx.fillRect(nx, ny, 2, 2);
          ctx.fillRect(nx + 1, ny - 4, 1, 4);
        },
      });
    } else if (s.kind === "marsh" && dir !== 0) {
      const reach = Math.min(1, k / 0.6, Math.max(0, (s.dur - 0.6 - k) / 0.6));
      if (reach <= 0) continue;
      const hx = sp.x + 5 * dir;
      const hy = sp.y - 11;
      const tx = Math.round(hx + (s.x - dir * 6 - hx) * reach);
      const ty = Math.round(hy + (s.y - 7 - hy) * reach);
      out.push({
        z: Math.max(sp.y, s.y) + 3.3,
        draw: () => {
          ctx.fillStyle = "#6a4a2e";
          const n = Math.max(Math.abs(tx - hx), Math.abs(ty - hy));
          for (let j = 0; j <= n; j++) ctx.fillRect(Math.round(hx + ((tx - hx) * j) / n), Math.round(hy + ((ty - hy) * j) / n), 1, 1);
          const burning = i === 1 && k > 6 && k < 8.2;
          fill(ctx, tx - 1, ty - 1, 3, 3, OUTLINE);
          fill(ctx, tx, ty, 2, 2, burning ? "#3a2a20" : k > 4 ? "#e8b860" : "#fbf8f0");
          if (burning) fill(ctx, tx, ty - 3 - (Math.floor(t * 10) % 2), 2, 3, "#ff8a3d");
        },
      });
    }
  }
}

/** A sandcastle in four stages, and slumped once a wave has been through it. */
function castleSprite(stage: number): HTMLCanvasElement {
  return spr(`click-castle-${stage}`, 22, 16, (g) => {
    const sand = "#e8c88a";
    const hi = "#f6dfaa";
    const lo = "#c9a462";
    if (stage === 4) {
      g.ellipse(11, 12, 9, 3, sand).rect(5, 10, 12, 1, hi).set(14, 9, lo).set(8, 11, lo);
      return;
    }
    g.ellipse(11, 13, 9, 2.4, sand);
    g.rect(3, 12, 16, 1, hi);
    if (stage >= 1) g.rect(3, 7, 4, 6, sand).rect(15, 7, 4, 6, sand).rect(3, 7, 4, 1, hi).rect(15, 7, 4, 1, hi).set(3, 6, sand).set(6, 6, sand).set(15, 6, sand).set(18, 6, sand);
    if (stage >= 2) g.rect(8, 4, 6, 9, sand).rect(8, 4, 6, 1, hi).set(8, 3, sand).set(10, 3, sand).set(13, 3, sand).rect(10, 9, 2, 4, "#8a6a3a");
    if (stage >= 3) g.vline(11, 0, 4, "#8a6a3a").rect(12, 0, 3, 2, C.coral).set(5, 9, lo).set(17, 9, lo);
  });
}

function sandItems(ctx: Ctx, s: Show, k: number | null, t: number, out: Drawable[]): void {
  const g = s.g!;
  const leftover = g.done;
  if (s.kind === "castle") {
    const hit = s.to?.hit ?? false;
    const washAt = s.dur - 2.6;
    const stage = k === null ? -1 : leftover ? (hit ? 4 : 3) : hit && k > washAt + 0.6 ? 4 : Math.min(3, Math.floor((k / (s.dur * 0.7)) * 4));
    if (stage >= 0) {
      const fade = leftover ? Math.max(0, Math.min(1, (s.until - t) / 3)) : 1;
      out.push({
        z: s.y + 2,
        draw: () => {
          ctx.globalAlpha = fade;
          ctx.drawImage(castleSprite(stage), s.x - 11, s.y - 13);
          ctx.globalAlpha = 1;
        },
      });
    }
    // Spades in hand; sand flying as they dig the moat.
    if (k !== null && !leftover) {
      for (let i = 0; i < g.size; i++) {
        if (!g.present[i]) continue;
        const sp = s.spots[i]!;
        const dir = i === 0 ? 1 : -1;
        out.push({
          z: sp.y + 0.6,
          draw: () => {
            const dip = Math.floor(t * 4 + i) % 2;
            fill(ctx, sp.x + dir * 6, sp.y - 13 + dip * 3, 1, 6, C.teak);
            fill(ctx, sp.x + dir * 6 - 1, sp.y - 7 + dip * 3, 3, 2, i ? C.aqua : C.sun);
          },
        });
      }
    }
    // The wave that takes it.
    const sea = planOf(forL!)?.sea;
    if (hit && sea && k !== null && k > washAt && k < washAt + 2.2) {
      const q = (k - washAt) / 2.2;
      const reach = Math.sin(q * Math.PI);
      const top = Math.round(sea.y - (sea.y - s.y + 6) * reach);
      out.push({
        z: s.y + 3,
        draw: () => {
          ctx.fillStyle = "rgba(120,215,225,0.75)";
          ctx.fillRect(s.x - 24, top, 48, sea.y - top);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          for (let x = s.x - 24; x < s.x + 24; x += 3) ctx.fillRect(x, top + ((x + Math.floor(t * 8)) % 3 === 0 ? 1 : 0), 3, 1);
        },
      });
    }
    return;
  }
  if (s.kind === "dig") {
    if (k === null) return;
    const q = leftover ? 1 : Math.min(1, k / (s.dur * 0.75));
    const hx = s.x + 4;
    const fade = leftover ? Math.max(0, Math.min(1, (s.until - t) / 3)) : 1;
    out.push({
      z: s.y - 1,
      draw: () => {
        ctx.globalAlpha = fade;
        const r = Math.round(2 + q * 5);
        fill(ctx, hx - r, s.y - 2, r * 2 + 1, Math.max(2, Math.round(r * 0.7)), "#a8864e");
        fill(ctx, hx - r + 1, s.y - 1, r * 2 - 1, Math.max(1, Math.round(r * 0.5)), "#7a5a30");
        fill(ctx, hx + r + 1, s.y - 3, 4, 2, "#e0c088");
        if (q >= 1 && k > s.dur * 0.75) {
          fill(ctx, hx - 3, s.y - 6, 7, 5, OUTLINE);
          fill(ctx, hx - 2, s.y - 5, 5, 3, C.teak);
          fill(ctx, hx - 2, s.y - 5, 5, 1, C.sun);
          if (Math.floor(t * 4) % 2) fill(ctx, hx + 3, s.y - 8, 1, 1, "#ffffff");
        }
        ctx.globalAlpha = 1;
      },
    });
    if (!leftover && g.present[0]) {
      const sp = s.spots[0]!;
      out.push({
        z: sp.y + 0.6,
        draw: () => {
          const dip = Math.floor(t * 3) % 2;
          fill(ctx, sp.x + 6, sp.y - 13 + dip * 3, 1, 6, C.teak);
          fill(ctx, sp.x + 5, sp.y - 7 + dip * 3, 3, 2, C.coral);
          const c = (t * 1.6) % 1;
          if (c < 0.6) fill(ctx, Math.round(hx + c * 14), Math.round(s.y - 4 - Math.sin((c / 0.6) * Math.PI) * 10), 2, 2, "#d8b878");
        },
      });
    }
    return;
  }
  // Frisbee.
  if (k === null || leftover) return;
  const who = s.spots.slice(0, g.size).filter((_, i) => g.present[i]);
  if (who.length < 2) return;
  const a = who[0]!;
  const b = who[1]!;
  out.push({
    z: Math.max(a.y, b.y) + 1,
    draw: () => {
      const n = Math.floor(k / 1.5);
      const p = (k % 1.5) / 1.5;
      const [from, to] = n % 2 === 0 ? [a, b] : [b, a];
      const x = Math.round(from.x + (to.x - from.x) * p);
      const y = Math.round(from.y - 14 + (to.y - from.y) * p - Math.sin(p * Math.PI) * 10);
      fill(ctx, x - 3, y - 1, 7, 3, OUTLINE);
      fill(ctx, x - 2, y, 5, 1, Math.floor(t * 8) % 2 ? C.aqua : C.aquaHi);
    },
  });
}

/** The lifeguard up in the tower's window: blowing the whistle, or scanning with binoculars. */
function lifeguardUp(ctx: Ctx, s: Show, k: number, t: number): void {
  const x = s.x;
  const y = s.y;
  const look = s.kind === "binoculars" ? Math.round(Math.sin(k * 1.6) * 3) : 0;
  const hx = x - 3 + look;
  const hy = y - 40;
  fill(ctx, hx - 1, hy - 1, 8, 8, OUTLINE);
  fill(ctx, hx, hy, 6, 6, "#c98a5e");
  fill(ctx, hx, hy, 6, 2, "#ffd166");
  fill(ctx, hx - 2, hy + 6, 10, 3, "#e8453c");
  if (s.kind === "binoculars") {
    fill(ctx, hx + 1, hy + 3, 2, 2, "#2a2a32");
    fill(ctx, hx + 4, hy + 3, 2, 2, "#2a2a32");
    if (Math.floor(t * 3) % 4 === 0) fill(ctx, hx + 2, hy + 3, 1, 1, "#ffffff");
  } else {
    fill(ctx, hx + 2, hy + 4, 2, 1, "#2a2a32");
    fill(ctx, hx + 6, hy + 4, 2, 1, C.sun);
  }
}

function rescueItems(ctx: Ctx, s: Show, k: number, t: number, out: Drawable[]): void {
  const to = s.to!;
  const sea = planOf(forL!)?.sea;
  if (!sea) return;
  const foot = { x: s.x + 14, y: s.y };
  const shore = { x: to.x, y: sea.y - 2 };
  const duckY = sea.y + Math.round(sea.h * 0.5) + (Math.floor(t * 2) % 2);
  const out1 = 0.5;
  const reach = 2.8;
  const grab = 3.3;
  const back = 5.8;
  // The duck, adrift until it's picked up.
  if (k < grab) out.push({ z: sea.y + 2, draw: () => ctx.drawImage(duckRing(), Math.round(to.x - 5 + Math.sin(t) * 2), duckY - 4) });
  let x: number;
  let y: number;
  let carry = false;
  if (k < out1) return;
  if (k < reach) {
    const q = ease((k - out1) / (reach - out1));
    x = foot.x + (shore.x - foot.x) * q;
    y = foot.y + (shore.y - foot.y) * q;
  } else if (k < grab) {
    x = shore.x;
    y = shore.y + 3;
  } else if (k < back) {
    const q = ease((k - grab) / (back - grab));
    x = shore.x + (foot.x - shore.x) * q;
    y = shore.y + (foot.y - shore.y) * q;
    carry = true;
  } else if (k < s.dur) {
    x = foot.x;
    y = foot.y;
    carry = true;
  } else return;
  const step = Math.floor(t * 8) % 2 === 0 && k < back;
  const flip = (k < reach ? shore.x - foot.x : foot.x - shore.x) < 0;
  const fx = Math.round(x);
  const fy = Math.round(y);
  out.push({
    z: fy,
    draw: () => {
      if (k >= reach && k < grab) splash(ctx, fx, fy, (k - reach) / (grab - reach), 8, 5);
      const c = runner(step, carry);
      if (flip) {
        ctx.save();
        ctx.translate(fx * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(c, fx - 6, fy - 19);
        ctx.restore();
      } else ctx.drawImage(c, fx - 6, fy - 19);
    },
  });
}

function gullShow(ctx: Ctx, s: Show, k: number, t: number): void {
  const to = s.to!;
  const flap = Math.floor(t * 8) % 2 === 0;
  const startX = to.x - s.dir * 70;
  const startY = to.y - 50;
  if (to.hit) {
    if (k < 1.2) {
      const q = ease(k / 1.2);
      gull(ctx, startX + (to.x - startX) * q, Math.round(startY + (to.y - 6 - startY) * q), flap, s.dir);
    } else {
      const q = (k - 1.2) / (s.dur - 1.2);
      const x = to.x + s.dir * q * 90;
      const y = Math.round(to.y - 6 - q * 60);
      gull(ctx, x, y, flap, s.dir);
      fry(ctx, Math.round(x + s.dir * 3), y + 2);
    }
    return;
  }
  // Nobody to rob: it lands, pecks about and flies off.
  if (k < 1.2) {
    const q = ease(k / 1.2);
    gull(ctx, startX + (to.x - startX) * q, Math.round(startY + (to.y - 3 - startY) * q), flap, s.dir);
  } else if (k < s.dur - 1) {
    const peck = Math.floor(t * 2) % 3 === 0;
    gull(ctx, to.x, to.y - 3 + (peck ? 1 : 0), false, s.dir);
  } else {
    const q = k - (s.dur - 1);
    gull(ctx, to.x + s.dir * q * 70, Math.round(to.y - 3 - q * 50), flap, s.dir);
  }
}

function drinkShow(ctx: Ctx, s: Show, k: number): void {
  const to = s.to!;
  if (k < 1.2) return;
  const q = Math.min(1, (k - 1.2) / 1.3);
  const x = Math.round(s.x + (to.x - s.x) * ease(q));
  const fade = Math.min(1, (s.dur - k) / 1.5);
  ctx.globalAlpha = Math.max(0, fade);
  ctx.drawImage(drink(), x - 3, s.y - 4);
  if (q < 1) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(x + 3, s.y + 3, 4, 1);
  }
  ctx.globalAlpha = 1;
}

function coconutShow(ctx: Ctx, s: Show, k: number, t: number): void {
  const to = s.to!;
  // Leaves shaking loose first.
  if (k < 0.8) {
    ctx.fillStyle = C.palmHi;
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(s.x - 8 + i * 5 + Math.sin(t * 20 + i) * 2), Math.round(s.y - 4 + k * 20 + i), 2, 1);
  }
  const fall = 0.5;
  const land = fall + 0.6;
  let x: number;
  let y: number;
  if (k < fall) {
    x = s.x;
    y = s.y;
  } else if (k < land) {
    const q = (k - fall) / 0.6;
    x = s.x + (to.x - s.x) * q;
    y = s.y + (to.y - 3 - s.y) * q * q;
  } else if (to.hit) {
    // Bonk, and it rolls off to the sand.
    const q = Math.min(1, (k - land) / 0.6);
    x = to.x + s.dir * q * 12;
    y = to.y - 3 - Math.sin(q * Math.PI) * 8 + q * 30;
    if (k - land < 0.4) {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(to.x - 6, to.y - 8, 2, 1);
      ctx.fillRect(to.x + 5, to.y - 9, 2, 1);
      ctx.fillRect(to.x, to.y - 11, 1, 2);
    }
  } else {
    const q = Math.min(1, (k - land) / 0.4);
    x = to.x + s.dir * q * 4;
    y = to.y - 3 - Math.sin(q * Math.PI) * 4;
  }
  const fade = Math.min(1, (s.dur - k) / 1.5);
  ctx.globalAlpha = Math.max(0, fade);
  ctx.drawImage(coconut(), Math.round(x - 3), Math.round(y - 3));
  ctx.globalAlpha = 1;
}

/** Shows under the furniture and people: in the water (the pool robot, a drifting float) and out at sea. */
export function clickUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || shows.length === 0) return;
  const t = info.t;
  for (const s of shows) {
    if (s.g || over(s, t)) continue;
    const k = t - s.t0;
    const a = s.area;
    switch (s.kind) {
      case "robot": {
        const floor = Math.round(a.y + a.h * 0.72);
        let x = a.x + 6 + Math.min(1, k / 4.5) * (a.w - 22);
        let y = floor;
        if (k > 4.5) y = Math.round(floor - Math.min(1, (k - 4.5) / 1.5) * (floor - a.y - 5));
        if (k > 7) y = Math.round(a.y + 5 + (k - 7) * (floor - a.y - 5));
        x = Math.round(x);
        ctx.globalAlpha = k > 6 && k < 7 ? 1 : 0.7;
        ctx.drawImage(robot(), x, y - 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(240,252,255,0.8)";
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 3, Math.round(y - 6 - ((t * 10 + i * 5) % 12)), 1, 1);
        if (k > 6 && k < 7 && Math.floor(t * 6) % 2) fill(ctx, x + 9, y - 5, 2, 1, C.sun);
        break;
      }
      case "drift": {
        const x = Math.round(a.x + 4 + (k / s.dur) * (a.w - 32));
        const y = s.y + (Math.floor(t * 1.5) % 2);
        ctx.drawImage(flamingo(false), x, y - 18);
        ctx.drawImage(flamingo(true), x, y - 18);
        break;
      }
      case "surfer":
        surfer(ctx, s, k, t, L.W);
        break;
      case "dolphins":
        dolphins(ctx, s, k);
        break;
      case "whale":
        whale(ctx, s, k, t);
        break;
      case "sail": {
        const x = Math.round(s.x + s.dir * k * ((L.W + 48) / s.dur));
        ctx.drawImage(sailboat(), x - 8, a.y + a.h - 15 + (Math.floor(t * 1.2) % 2));
        break;
      }
      case "bottle":
        bottleShow(ctx, s, k, t);
        break;
      case "crabs": {
        const q = k / s.dur;
        for (let i = 0; i < 5; i++) {
          const x = Math.round(a.x - 10 + q * (a.w + 30) - i * 9);
          if (x < a.x - 4 || x > a.x + a.w + 4) continue;
          crab(ctx, x, s.y + (i % 2), Math.floor(t * 10 + i) % 2);
        }
        break;
      }
      default:
        break;
    }
  }
}

function surfer(ctx: Ctx, s: Show, k: number, t: number, W: number): void {
  const sea = s.area;
  const q = k / s.dur;
  const x = Math.round(-14 + q * (W + 28));
  const y = Math.round(sea.y + sea.h * 0.45);
  const wipeout = s.seed % 3 === 0 && q > 0.62;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  // The curl breaking behind them.
  for (let i = 0; i < 18; i++) ctx.fillRect(x - 4 - i * 2, y + 2 - Math.round(Math.sin((i / 18) * Math.PI) * 3), 2, 1);
  if (wipeout) {
    const w = (q - 0.62) / 0.38;
    splash(ctx, x, y + 2, Math.min(1, w * 2), 8, 5);
    fill(ctx, x + 6 + Math.round(w * 10), y - 3 - Math.round(Math.sin(w * Math.PI) * 6), 8, 2, C.sun);
    return;
  }
  fill(ctx, x - 5, y + 1, 11, 2, OUTLINE);
  fill(ctx, x - 4, y + 1, 9, 1, C.sun);
  fill(ctx, x - 1, y - 6, 3, 7, OUTLINE);
  fill(ctx, x, y - 5, 1, 3, "#2a6aa0");
  fill(ctx, x, y - 2, 1, 3, "#c98a5e");
  fill(ctx, x - 1, y - 8, 3, 3, "#c98a5e");
  fill(ctx, x - 1, y - 8, 3, 1, "#4a2f22");
  if (Math.floor(t * 6) % 2) fill(ctx, x - 6, y - 1, 2, 1, "rgba(255,255,255,0.9)");
}

function dolphins(ctx: Ctx, s: Show, k: number): void {
  const sea = s.area;
  const base = Math.round(sea.y + sea.h * 0.6);
  for (let i = 0; i < 3; i++) {
    const p = (k - i * 0.8) / 1.4;
    if (p < -0.1 || p > 1.15) continue;
    const x = Math.round(s.x - s.dir * 20 + s.dir * (i * 16 + p * 26));
    if (p >= 0 && p <= 1) {
      const tilt = p < 0.35 ? -2 : p > 0.65 ? 2 : 0;
      const y = Math.round(base - Math.sin(p * Math.PI) * 11);
      const c = dolphin(s.dir > 0 ? tilt : -tilt);
      if (s.dir < 0) {
        ctx.save();
        ctx.translate(x * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(c, x - 6, y - 4);
        ctx.restore();
      } else ctx.drawImage(c, x - 6, y - 4);
    }
    const r = Math.round(2 + Math.abs(p - 0.5) * 8);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    if (p < 0.2) ctx.fillRect(x - s.dir * 6 - r, base + 1, r * 2, 1);
    if (p > 0.85) ctx.fillRect(x + s.dir * 6 - r, base + 1, r * 2, 1);
  }
}

function whale(ctx: Ctx, s: Show, k: number, t: number): void {
  const sea = s.area;
  const y = Math.round(sea.y + sea.h * 0.62);
  const x = s.x;
  const up = Math.min(1, k / 1.2, Math.max(0, (6.4 - k) / 1));
  if (up > 0 && k < 4.6) {
    const h = Math.round(up * 4);
    fill(ctx, x - 12, y - h, 24, h + 1, "#2a3e5a");
    fill(ctx, x - 9, y - h, 16, 1, "#4a6280");
    fill(ctx, x + 6, y - h - 1, 2, 1, "#2a3e5a");
  }
  // The spout.
  if (k > 1.3 && k < 3.8) {
    const q = (k - 1.3) / 2.5;
    const h = Math.sin(q * Math.PI) * 20;
    ctx.fillStyle = "rgba(240,250,255,0.9)";
    for (let i = 0; i < 10; i++) {
      const yy = Math.round(y - 4 - (i / 10) * h);
      const spread = i > 6 ? (i - 6) * 2 : 0;
      ctx.fillRect(x - 1 - spread + (Math.floor(t * 10 + i) % 2), yy, 2, 1);
      if (spread) ctx.fillRect(x + spread, yy + 1, 2, 1);
    }
  }
  // The tail flukes on the way down.
  if (k > 4.6 && k < 6.8) {
    const q = (k - 4.6) / 2.2;
    const h = Math.round(Math.sin(q * Math.PI) * 9);
    const tx = x + s.dir * 4;
    fill(ctx, tx - 1, y - h, 3, h + 1, "#2a3e5a");
    fill(ctx, tx - 6, y - h - 3, 6, 2, "#2a3e5a");
    fill(ctx, tx + 1, y - h - 3, 6, 2, "#2a3e5a");
    fill(ctx, tx - 7, y - h - 4, 3, 1, "#2a3e5a");
    fill(ctx, tx + 5, y - h - 4, 3, 1, "#2a3e5a");
    fill(ctx, tx - 5, y - h - 3, 3, 1, "#4a6280");
    fill(ctx, tx - 2, y + 1, 5, 1, "rgba(255,255,255,0.8)");
    if (q > 0.8) splash(ctx, tx, y, (q - 0.8) * 5, 6, 5);
  }
}

function bottleShow(ctx: Ctx, s: Show, k: number, t: number): void {
  const sea = s.area;
  const from = sea.y + sea.h - 3;
  const shore = sea.y - 3;
  const fade = Math.min(1, (s.dur - k) / 1.5);
  ctx.globalAlpha = Math.max(0, fade);
  if (k < 3.6) {
    const q = ease(k / 3.6);
    ctx.drawImage(bottle(), s.x - 4, Math.round(from + (shore - from) * q) + (Math.floor(t * 2) % 2) - 2);
  } else ctx.drawImage(bottle(), s.x - 4, shore - 2);
  ctx.globalAlpha = 1;
}

/** On top of everything (readable at night): the lifeguard's whistle, the note from the bottle. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || shows.length === 0) return;
  const t = info.t;
  for (const s of shows) {
    if (over(s, t)) continue;
    const k = t - s.t0;
    if (s.kind === "whistle" && k < 2.2) bubble(ctx, s.x, s.y - 62, SHOW.tweet);
    if (s.kind === "rescue" && k < 1.4) bubble(ctx, s.x, s.y - 62, SHOW.tweet);
    if (s.kind === "bottle" && k > 3.9 && k < s.dur - 1) {
      // The note, unrolled above the bottle.
      const w = pixelTextWidth(s.text) + 8;
      const x = clamp(Math.round(s.x - w / 2), 2, L.W - w - 2);
      const y = s.area.y - 22;
      fill(ctx, x - 1, y - 1, w + 2, 11, OUTLINE);
      fill(ctx, x, y, w, 9, "#f4e6c4");
      fill(ctx, x, y, w, 1, "#e0cc9c");
      fill(ctx, x, y + 8, w, 1, "#e0cc9c");
      drawPixelText(ctx, s.text, x + 4, y + 2, "#5a3a22");
    }
  }
}

/** The fire flaring up and singers round it, the pool robot's lamp. */
export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL || shows.length === 0) return [];
  const out: Light[] = [];
  const t = info.t;
  for (const s of shows) {
    if (over(s, t)) continue;
    const k = clock(s, t);
    if (k === null) continue;
    if (s.kind === "flare" || s.kind === "uke" || s.kind === "marsh") {
      const fl = 0.85 + Math.sin(t * 9) * 0.08;
      out.push([s.x, s.y - 10, s.kind === "flare" ? 90 : 76, fl, "#ff9a40", (s.kind === "flare" ? 0.38 : 0.3) * fl]);
    }
    if (s.kind === "robot") out.push([s.area.x + s.area.w / 2, s.area.y + s.area.h / 2, 20, 0.5, "#ffd166", 0.1]);
  }
  return out;
}
