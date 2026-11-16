// Spaceship: things to click. The viewscreen jumps to the next star
// system; the food synthesizer makes something (not always what you
// ordered); the drive core pulses (or hiccups); the gravity switch lets
// everyone float for a few seconds; the ship's AI says something; the grow
// lights go to full and the greens shoot up; the suit locker sends someone
// out on a spacewalk past the windows; cargo crates pop open. The shows are
// drawn in live.ts from the state these set (state.ts).
import type { Layout, Point, Rect } from "../../layout.ts";
import type { GatherCue, GatherSpot, SceneryActions, SceneryClickable, SoundRecipe, SynthKit, Theme } from "../../theme.ts";
import { planOf } from "./plan.ts";
import { SYSTEMS, systemOf } from "./space.ts";
import { SHIP, since, type CrateKind, type SynthItem } from "./state.ts";
import { WORDS } from "./words.ts";

const HOVER = {
  viewscreen: "Viewscreen · jump to the next star system",
  synth: "Food synthesizer · order lunch (results vary)",
  core: "The drive core · give it a nudge",
  gravity: "Gravity switch · please don't",
  ai: "The ship's AI · say hello",
  hydro: "Hydroponics · grow lights to full",
  airlock: "Suit locker · send someone out on a spacewalk",
  crate: "Cargo crate · what's in this one?",
};

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
  add("viewscreen", plan.viewscreen, HOVER.viewscreen);
  add("synth", plan.synth, HOVER.synth);
  add("core", plan.core, HOVER.core);
  add("gravity", plan.gravity, HOVER.gravity);
  add("ai", plan.ai, HOVER.ai);
  add("hydro", plan.hydro, HOVER.hydro);
  add("airlock", plan.airlock, HOVER.airlock);
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
  SHIP.system = (SHIP.system + 1) % SYSTEMS.length;
  const plan = planOf(act.L)!;
  const v = plan.viewscreen;
  const name = systemOf(SHIP.system).name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  chatter(act, { x: v.x + v.w / 2, y: v.y + v.h + 40 }, 220, [pick(["Hold on to your coffee!", "Here we go!", "Jumping!"]), `${name}. Lovely.`], 0.2, 2.6);
  return "ship-warp";
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
  if (since(SHIP.gravityAt, act.t, 8) >= 0) return null;
  SHIP.gravityAt = act.t;
  const everyone = act.near(act.L.W / 2, act.L.H / 2, 9999);
  const shuffled = [...everyone].sort(() => Math.random() - 0.5);
  const lines = ["Whoa!", "My coffee!", "Who touched the switch?", "Wheee!", "I'm a balloon!"];
  shuffled.slice(0, 4).forEach((p, i) => act.say(p.id, lines[(i + Math.floor(Math.random() * 5)) % lines.length]!, 2.2, 0.4 + i * 0.9));
  if (shuffled[4] ?? shuffled[0]) act.say((shuffled[4] ?? shuffled[0])!.id, "And we're down.", 2.4, 7.2);
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

function click(id: string, act: SceneryActions): string | null {
  if (!planOf(act.L)) return null;
  switch (id) {
    case "viewscreen":
      return jump(act);
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

/** Gravity off, and back on again seven seconds later (one recipe: a click can only start one sound). */
export const CLICK_SOUNDS: Record<string, SoundRecipe> = {
  "ship-zero-g": (k) => {
    WORDS.sounds?.["ship-gravity-off"]?.(k);
    WORDS.sounds?.["ship-gravity-on"]?.(later(k, 6.8));
  },
};

export const CLICKS: Pick<Theme, "clickables" | "click"> = { clickables, click };
