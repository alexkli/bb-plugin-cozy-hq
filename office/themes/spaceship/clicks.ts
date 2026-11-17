// Spaceship: things to click. The viewscreen jumps to the next star
// system; the food synthesizer makes something (not always what you
// ordered); the drive core pulses (or hiccups); the gravity switch lets
// everyone float for a few seconds; the ship's AI says something; the grow
// lights go to full and the greens shoot up; the suit locker sends someone
// out on a spacewalk past the windows; cargo crates pop open. The shows are
// drawn in live.ts from the state these set (state.ts).
import type { Layout, Point, Rect } from "../../layout.ts";
import type { GatherCue, GatherSpot, SceneryActions, SceneryClickable, SoundRecipe, SynthKit, Theme } from "../../theme.ts";
import { DUEL_SOUND, duelTick, startDuel } from "./duel.ts";
import { planOf } from "./plan.ts";
import { CALLER_COUNT, SYSTEMS, systemOf } from "./space.ts";
import { SHIP, afterSeated, faceScreen, since, type CrateKind, type StationShow, type SynthItem } from "./state.ts";
import { WORDS } from "./words.ts";

const HOVER = {
  viewscreen: "Viewscreen · open a channel",
  helm: "Helm · jump to the next star system",
  captain: "The captain's chair · give the order",
  alert: "Tactical · sound red alert",
  ready: "The ready room · knock",
  synth: "Food synthesizer · order lunch (results vary)",
  core: "The drive core · give it a nudge",
  gravity: "Gravity switch · please don't",
  ai: "The ship's AI · say hello",
  hydro: "Hydroponics · grow lights to full",
  airlock: "Suit locker · send someone out on a spacewalk",
  crate: "Cargo crate · what's in this one?",
  officer: "First officer's chair · call someone over",
  helmSeat: "The helm seat · send someone to fly",
  ops: "Operations · send someone to the board",
  side: "A side station · send someone over",
  science: "Science station · send someone to look closer",
  tactical: "Tactical · send someone to run a scan",
};

type SeatKind = "officer" | "helm" | "ops" | "side" | "science" | "tactical";

/** What someone says at each station (the first when they sit down, the second a bit later). */
const SEAT_LINES: Record<SeatKind, [string, string][]> = {
  officer: [
    ["Morning, captain.", "Quiet shift so far."],
    ["Your coffee, captain. Still warm.", "Mostly."],
    ["Ship's in good shape today.", "I checked twice."],
    ["Shall I take the next watch?", "You look like you need a nap."],
  ],
  helm: [
    ["Helm's answering.", "Small course trim. Smooth."],
    ["Nudging us a hair to port.", "And back. Perfect."],
    ["Dodging a pebble.", "A big pebble. Done."],
  ],
  ops: [
    ["Power's balanced.", "Coffee maker included."],
    ["All decks green.", "Well, greenish."],
    ["Readout's up.", "Numbers look happy."],
  ],
  side: [
    ["Checking the side sensors.", "Nothing but stars."],
    ["Environmental's fine.", "Someone's microwaving fish again."],
  ],
  science: [
    ["Ooh. A very interesting rock.", "It's still a rock."],
    ["Running an analysis.", "Inconclusive. Delightfully so."],
    ["Stellar readings coming in.", "That star is showing off."],
  ],
  tactical: [
    ["Sweeping the sector.", "Scan clear. Just dust."],
    ["Shields at full.", "Just in case. They're cosy."],
  ],
};

const SEAT_SHOW: Record<SeatKind, StationShow | null> = { officer: null, helm: "helmAt", ops: "opsAt", side: "opsAt", science: "scienceAt", tactical: "scanAt" };

const AI_LINES = [
  "Good morning, crew. Oxygen levels: delightful.",
  "Reminder: the airlock is not the way to the snack bar.",
  "I have rerouted spare power to the coffee. You're welcome.",
  "Course plotted. Snacks plotted.",
  "All systems nominal. Mostly.",
  "Someone left a sock in the cargo bay. I'm not saying who.",
  "Hull integrity: one hundred percent. Morale: also high.",
  "Fun fact: space is very big.",
  "Warp lag is normal. So is a nap.",
  "The plants and I are on speaking terms again.",
  "Please do not tap the viewscreen. It tickles.",
  "Recycled coffee is ninety percent coffee. Don't ask about the rest.",
];

/** The order from the chair, and the crew's answer (the gesture, in the ship's own words). */
const ORDERS: [string, string][] = [
  ["You heard the captain. Let's go.", "Aye!"],
  ["Nice and smooth. Engage.", "Engines answering."],
  ["Course is set. Off we go.", "Aye, captain."],
  ["On your word. And that was the word.", "Going!"],
  ["Ahead, gently. Coffee's on the console.", "Aye aye."],
];

/** What friendly callers say when they hail us. */
const HAILS = [
  "Greetings, friends. We bring snacks.",
  "Hello! Your ship is very shiny.",
  "We come in peace. And in slippers.",
  "Is this the way to the nebula? We took a left.",
  "Our captain says hi. Hi!",
  "Lovely day for it. Any day, really. It's space.",
];

const SYNTH: { item: SynthItem; odd: boolean; lines: [string, string, string] }[] = [
  { item: "toast", odd: false, lines: ["Toast! Real toast!", "It's shaped like the ship.", "Five stars. Would synthesize again."] },
  { item: "jelly", odd: true, lines: ["I ordered a sandwich.", "Is it… supposed to wobble?", "It's looking at me."] },
  { item: "soup", odd: true, lines: ["Soup, please.", "That's soup. In a cube.", "Bite or sip? Bite or sip?"] },
  { item: "cake", odd: true, lines: ["A cake! For me?", "It won't stay down.", "Gravity's fine. The cake isn't."] },
  { item: "noodles", odd: true, lines: ["Noodles, extra spicy.", "Did the noodles just wave?", "They're friendly, at least."] },
  { item: "fish", odd: true, lines: ["Fish and chips, please.", "That fish is alive.", "And it's not happy about it."] },
];

const CRATES: { kind: CrateKind; lines: [string, string] }[] = [
  { kind: "foam", lines: ["Packing foam. Everywhere.", "Who packed this, a cloud?"] },
  { kind: "bot", lines: ["There's a robot in here!", "It says it's the new intern."] },
  { kind: "duck", lines: ["A rubber duck?", "And there it goes. Bye, duck."] },
  { kind: "socks", lines: ["Socks. A whole crate of socks.", "So that's where they all went."] },
];

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

// ------------------------------------------------------------------ where

/** The crew stations, the bridge and so on are the plan's; here: which rects are clickable. */
function clickables(L: Layout): SceneryClickable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: SceneryClickable[] = [];
  const add = (id: string, rect: Rect | null, hover: string) => {
    if (rect && rect.w > 0 && rect.h > 0) out.push({ id, rect, hover });
  };
  // First, so it wins over red alert next to it; left out of the Alt outline (it's for finding).
  if (plan.duel) out.push({ id: "duel-switch", rect: plan.duel.switch, hover: "A tiny switch. No label.", secret: true });
  add("viewscreen", plan.viewscreen, HOVER.viewscreen);
  add("helm", plan.helm, HOVER.helm);
  add("captain", plan.captain, HOVER.captain);
  add("alert", plan.alert, HOVER.alert);
  add("ready", plan.readyRoom, HOVER.ready);
  add("synth", plan.synth, HOVER.synth);
  add("core", plan.core, HOVER.core);
  add("gravity", plan.gravity, HOVER.gravity);
  add("ai", plan.ai, HOVER.ai);
  add("hydro", plan.hydro, HOVER.hydro);
  add("airlock", plan.airlock, HOVER.airlock);
  for (const s of plan.seats) add(`seat-${s.id}`, s.rect, s.kind === "helm" ? HOVER.helmSeat : HOVER[s.kind]);
  plan.crates.forEach((c, i) => add(`crate-${i}`, { x: c.x, y: c.y - 3, w: c.w, h: c.h + 3 }, HOVER.crate));
  return out;
}

// ------------------------------------------------------------------ the shows

/** A quick word from whoever's nearest (at most `lines.length` of them, staggered). */
function chatter(act: SceneryActions, at: Point, r: number, lines: string[], delay = 0.3, gap = 2.2): void {
  const who = act.near(at.x, at.y, r);
  lines.forEach((text, i) => {
    const p = who[i % Math.max(1, Math.min(who.length, 2))];
    if (p) act.say(p.id, text, 2.6, delay + i * gap);
  });
}

/** Spots along a lane in front of something, reached the way an existing spot is (its hallway, aisle and lane). */
function along(base: { path: Point[] }, xs: number[], y: number, facing: GatherSpot["facing"], activity: string): GatherSpot[] {
  const lane = base.path[base.path.length - 2]!;
  return xs.map((x) => ({ x, y, facing, pose: "stand" as const, activity, path: [...base.path.slice(0, -2), { x: lane.x, y: lane.y }, { x, y: lane.y }, { x, y }] }));
}

function jump(act: SceneryActions): string | null {
  if (since(SHIP.jumpAt, act.t, 3) >= 0) return null;
  SHIP.jumpAt = act.t;
  faceScreen(act.t, 3);
  SHIP.system = (SHIP.system + 1) % SYSTEMS.length;
  const plan = planOf(act.L)!;
  const v = plan.viewscreen;
  const name = systemOf(SHIP.system).name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  chatter(act, { x: v.x + v.w / 2, y: v.y + v.h + 40 }, 220, [pick(["Hold on to your coffee!", "Here we go!", "Jumping!"]), `${name}. Lovely.`], 0.2, 2.6);
  return "ship-warp";
}

/** The bridge's crew: whoever's on the bridge, else whoever's nearest it. */
function bridgeCrew(act: SceneryActions): { id: string }[] {
  const r = planOf(act.L)!.bridge;
  return act.near(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.6 + 80);
}

function order(act: SceneryActions): string | null {
  if (since(SHIP.engageAt, act.t, 3) >= 0) return null;
  SHIP.engageAt = act.t;
  faceScreen(act.t, 3);
  const [first, answer] = pick(ORDERS);
  const crew = bridgeCrew(act);
  if (crew[0]) act.say(crew[0].id, first, 2.6, 0.3);
  if (crew[1]) act.say(crew[1].id, answer, 2, 2.2);
  return "ship-warp";
}

function hail(act: SceneryActions): string | null {
  if (since(SHIP.hailAt, act.t, 8) >= 0) return null;
  SHIP.hailAt = act.t;
  faceScreen(act.t, 8);
  SHIP.hailWho = (SHIP.hailWho + 1 + Math.floor(Math.random() * (CALLER_COUNT - 1))) % CALLER_COUNT;
  SHIP.hailLine = pick(HAILS);
  const crew = bridgeCrew(act);
  if (crew[0]) act.say(crew[0].id, pick(["Incoming hail!", "Someone's calling.", "On screen."]), 2, 0.2);
  if (crew[1]) act.say(crew[1].id, pick(["They seem nice.", "Wave, everyone!", "Snacks? We accept.", "Friendly ones. Phew."]), 2.4, 4.4);
  return "ship-hail";
}

function redAlert(act: SceneryActions): string | null {
  if (since(SHIP.alertAt, act.t, 8) >= 0) return null;
  SHIP.alertAt = act.t;
  faceScreen(act.t, 7);
  // The crew scramble to the bridge's side stations for a few seconds.
  const L = act.L;
  const r = planOf(L)!.bridge;
  const room = L.rooms.find((q) => q.kind === "boss");
  const doorX = room?.doorX ?? r.x + 14;
  const hall = L.net.halls.filter((h) => h > r.y + r.h).reduce((a, h) => Math.min(a, h), Infinity);
  if (Number.isFinite(hall)) {
    const spots: GatherSpot[] = [];
    for (const [x, y] of [
      [r.x + 26, r.y + 44],
      [r.x + r.w - 26, r.y + 44],
      [r.x + 26, r.y + 64],
      [r.x + r.w - 26, r.y + 64],
    ] as const) {
      if (y > r.y + r.h - 20) continue;
      spots.push({ x, y, facing: x < r.x + r.w / 2 ? "left" : "right", pose: "stand", activity: "at a station for red alert", path: [{ x: doorX, y: hall, c: true }, { x: doorX, y: r.y + r.h + 3 }, { x: doorX, y }, { x, y }] });
    }
    const g = act.gather(spots, 3, [
      { at: 0.3, who: 0, say: "Stations, everyone!" },
      { at: 1.6, who: 1, say: "All decks report ready." },
      { at: 2.6, who: 2, say: "False alarm? False alarm." },
    ]);
    if (!g) chatter(act, { x: r.x + r.w / 2, y: r.y + r.h / 2 }, 240, ["Red alert!", "Was that a drill?"], 0.2, 2.4);
  }
  return "ship-red-alert";
}

function readyRoom(act: SceneryActions): string | null {
  const d = planOf(act.L)!.readyRoom;
  if (!d || since(SHIP.readyAt, act.t, 4) >= 0) return null;
  SHIP.readyAt = act.t;
  chatter(act, { x: d.x + 20, y: d.y + d.h }, 200, [pick(["Ready room's all yours, captain.", "Knock knock. Just the fish.", "Anyone seen my mug? Last seen in there."])], 0.5);
  return "ship-door";
}

function synth(act: SceneryActions): string | null {
  const plan = planOf(act.L)!;
  const s = plan.synth;
  if (!s || since(SHIP.synthAt, act.t, 2.6) >= 0) return null;
  const order = Math.random() < 0.25 ? SYNTH[0]! : pick(SYNTH.slice(1));
  SHIP.synthAt = act.t;
  SHIP.synthItem = order.item;
  const coffee = act.L.byId.get("coffee");
  const g = coffee
    ? act.gather(along(coffee, [s.x + 4, s.x + 22, s.x + 40].map(Math.round), coffee.y, "back", "tasting the synthesizer's lunch"), 7, [
        { at: 0.5, who: 0, say: order.lines[0] },
        { at: 2.8, who: 1, say: order.lines[1] },
        { at: 5, who: 2, say: order.lines[2] },
      ] satisfies GatherCue[])
    : null;
  if (!g) chatter(act, { x: s.x + 9, y: s.y + 30 }, 160, [order.lines[1], order.lines[2]], 2.4);
  return order.odd ? "ship-synth-odd" : "ship-synth";
}

function core(act: SceneryActions): string | null {
  const c = planOf(act.L)!.core;
  if (!c || since(SHIP.coreAt, act.t, 1.5) >= 0) return null;
  SHIP.coreAt = act.t;
  SHIP.coreHiccup = Math.random() < 0.3;
  const lines = SHIP.coreHiccup ? ["Was that a hiccup?", "It does that. Probably."] : [pick(["Purring like a kitten.", "Listen to her hum.", "That's a happy core."])];
  chatter(act, { x: c.x + c.w / 2, y: c.y + c.h }, 180, lines, 0.6);
  return "ship-core";
}

function gravity(act: SceneryActions): string | null {
  if (since(SHIP.gravityAt, act.t, 9.5) >= 0) return null;
  SHIP.gravityAt = act.t;
  const everyone = act.near(act.L.W / 2, act.L.H / 2, 9999);
  const shuffled = [...everyone].sort(() => Math.random() - 0.5);
  const lines = ["Whoa!", "My coffee!", "Who touched the switch?", "Wheee!", "I'm a balloon!"];
  shuffled.slice(0, 4).forEach((p, i) => act.say(p.id, lines[(i + Math.floor(Math.random() * 5)) % lines.length]!, 2.2, 0.4 + i * 0.9));
  if (shuffled[4] ?? shuffled[0]) act.say((shuffled[4] ?? shuffled[0])!.id, "And we're down.", 2.4, 8.4);
  return "ship-zero-g";
}

let lastLine = -1;
function ai(act: SceneryActions): string | null {
  const a = planOf(act.L)!.ai;
  if (!a || since(SHIP.aiAt, act.t, 4) >= 0) return null;
  let i = Math.floor(Math.random() * AI_LINES.length);
  if (i === lastLine) i = (i + 1) % AI_LINES.length;
  lastLine = i;
  SHIP.aiAt = act.t;
  SHIP.aiLine = AI_LINES[i]!;
  if (Math.random() < 0.6) chatter(act, { x: a.x + 8, y: a.y + 50 }, 200, [pick(["Thanks, ship.", "Good to know.", "Noted, ship.", "Love you too, ship."])], 4.2);
  return "ship-ai";
}

function hydro(act: SceneryActions): string | null {
  const plan = planOf(act.L)!;
  const r = plan.hydro;
  if (!r || since(SHIP.hydroAt, act.t, 6) >= 0) return null;
  SHIP.hydroAt = act.t;
  const bench = act.L.byId.get("garden-0-0");
  const bay = plan.troughs[0] && plan.troughs[0].w > 20 ? plan.troughs[0] : null;
  const g =
    bay && bench
      ? act.gather(along(bench, [bay.x + Math.round(bay.w * 0.3), bay.x + Math.round(bay.w * 0.7)], bay.y + bay.h + 10, "back", "harvesting the hydroponics"), 7, [
          { at: 0.6, who: 0, say: "Look at them go!" },
          { at: 3, who: 1, say: "Salad for the whole crew." },
          { at: 5.4, who: 0, say: "Save me a tomato." },
        ])
      : null;
  if (!g) chatter(act, { x: r.x + r.w / 2, y: r.y + r.h }, 180, ["Look at them go!", "Salad for the whole crew."], 1);
  return "ship-grow";
}

function airlock(act: SceneryActions): string | null {
  const lk = planOf(act.L)!.airlock;
  if (!lk || since(SHIP.evaAt, act.t, 16) >= 0) return null;
  SHIP.evaAt = act.t;
  chatter(act, { x: lk.x + 8, y: lk.y + 32 }, 260, ["Suit check… go!", "They're waving at us!"], 0.4, 5.5);
  return "ship-airlock";
}

function crate(act: SceneryActions, i: number): string | null {
  const plan = planOf(act.L)!;
  const c = plan.crates[i];
  if (!c || since(SHIP.crateAt, act.t, 4) >= 0) return null;
  const what = pick(CRATES);
  SHIP.crate = i;
  SHIP.crateAt = act.t;
  SHIP.crateKind = what.kind;
  const cx = c.x + c.w / 2;
  const y = c.y - 8;
  const g = act.gather(
    [-10, 10].map((dx) => ({ x: Math.round(cx + dx), y, facing: "front" as const, pose: "stand" as const, activity: "peeking into a cargo crate" })),
    6,
    [
      { at: 0.5, who: 0, say: what.lines[0] },
      { at: 2.8, who: 1, say: what.lines[1] },
    ],
  );
  if (!g) chatter(act, { x: cx, y: c.y }, 200, [...what.lines], 0.8);
  return "ship-crate";
}

/** A bridge seat: someone idle walks over, sits, says something and works the console (the show starts once they're seated). */
function seat(act: SceneryActions, id: string): string | null {
  const plan = planOf(act.L)!;
  const s = plan.seats.find((q) => q.id === id);
  if (!s) return null;
  const [first, second] = pick(SEAT_LINES[s.kind]);
  const show = SEAT_SHOW[s.kind];
  // Already somebody there: they answer and get on with it.
  const there = act.near(s.x, s.y, 5)[0];
  if (there) {
    act.say(there.id, first, 2.4, 0.2);
    act.say(there.id, second, 2.4, 2.8);
    if (show) SHIP[show] = act.t + 0.4;
    if (s.kind === "helm") faceScreen(act.t, 3);
    return "ship-beep";
  }
  const spot = act.L.byId.get(s.id);
  const g = act.gather(
    [{ x: s.x, y: s.y, facing: spot?.facing ?? "back", pose: spot?.pose ?? "sit-back", activity: s.kind === "officer" ? "keeping the captain company" : `at the ${s.kind === "ops" ? "operations" : s.kind} station`, path: s.path }],
    9,
    [
      { at: 0.2, who: 0, say: first, seconds: 2.4 },
      { at: 0.8, sound: "ship-beep" },
      { at: 2.8, who: 0, say: second, seconds: 2.4 },
      { at: 4.2, sound: "ship-beep" },
    ],
  );
  if (!g) return null;
  if (show) afterSeated(g, show);
  return "ship-beep";
}

function click(id: string, act: SceneryActions): string | null {
  if (!planOf(act.L)) return null;
  switch (id) {
    case "duel-switch":
      return startDuel(act);
    case "viewscreen":
      return hail(act);
    case "helm":
      return jump(act);
    case "captain":
      return order(act);
    case "alert":
      return redAlert(act);
    case "ready":
      return readyRoom(act);
    case "synth":
      return synth(act);
    case "core":
      return core(act);
    case "gravity":
      return gravity(act);
    case "ai":
      return ai(act);
    case "hydro":
      return hydro(act);
    case "airlock":
      return airlock(act);
    default:
      if (id.startsWith("seat-")) return seat(act, id.slice(5));
      return id.startsWith("crate-") ? crate(act, Number(id.slice(6))) : null;
  }
}

// ------------------------------------------------------------------ sounds

/** The same synth kit, everything shifted `dt` seconds later. */
const later = (k: SynthKit, dt: number): SynthKit => ({
  tone: (f, s, d, ty, v, sl) => k.tone(f, s + dt, d, ty, v, sl),
  noise: (s, d, v, hz) => k.noise(s + dt, d, v, hz),
  swell: (s, d, v, a, b, q, ty) => k.swell(s + dt, d, v, a, b, q, ty),
});

/** Gravity off, and back on again as everyone settles (one recipe: a click can only start one sound). */
export const CLICK_SOUNDS: Record<string, SoundRecipe> = {
  // A channel opening: a crackle and a friendly three-note chirp.
  "ship-hail": (k) => {
    k.noise(0, 0.25, 0.05, 2400);
    k.tone(660, 0.3, 0.12, "sine", 0.05);
    k.tone(880, 0.45, 0.12, "sine", 0.05);
    k.tone(1100, 0.6, 0.22, "sine", 0.05, 990);
  },
  // Red alert: a rising two-tone whoop, three times.
  "ship-red-alert": (k) => {
    for (let i = 0; i < 3; i++) {
      k.tone(420, i * 0.9, 0.35, "square", 0.025, 640);
      k.tone(640, i * 0.9 + 0.38, 0.3, "triangle", 0.03, 480);
    }
  },
  // A sliding door: a soft hiss up and down.
  "ship-door": (k) => {
    k.swell(0, 0.5, 0.06, 1800, 900, 1);
    k.tone(220, 0.42, 0.06, "sine", 0.03);
  },
  // The boarding-party duel, start to finish (duel.ts).
  "ship-duel": DUEL_SOUND,
  "ship-zero-g": (k) => {
    WORDS.sounds?.["ship-gravity-off"]?.(k);
    WORDS.sounds?.["ship-gravity-on"]?.(later(k, 7.6));
  },
};

export const CLICKS: Pick<Theme, "clickables" | "click" | "tick"> = { clickables, click, tick: duelTick };
