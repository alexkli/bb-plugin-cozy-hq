// Villain's Lair: what things are called, what people say when you poke
// the base, and what you hear with a blast window open. The evil plans are
// suspiciously like office chores.
import type { WeatherKind } from "../../../contract.ts";
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";

export const LABELS: ThemeLabels = {
  pets: { dog: "Rivet", cat: "Meringue" },
  tvNews: "DOOM NEWS",
  tvWeather: "LAVA WEATHER",
  poke: {
    coffee: "Espresso machine · pull a villain-strength shot",
    kettle: "Kettle · evil plans run on tea",
    vending: "Snack machine · fuel for henchpeople",
    fridge: "The cold store · have a look inside",
    microwave: "Microwave · reheat yesterday's lava lasagne",
    piano: "The white piano · play a dramatic chord",
    dartboard: "Dartboard · aim at the competitor's logo",
    printer: "Line printer · print the master plan (in triplicate)",
    cooler: "Water cooler · strictly non-volcanic",
    plant: "Water the jungle plant",
    bin: "Bin · shred the evidence",
    clock: "Clock · synchronize watches",
    arcade: "Arcade cabinet · play a game (world domination can wait)",
    pingpong: "Ping-pong table · serve",
    fishtank: "The shark tank · feeding time",
    whiteboard: "The briefing screen · threads in plan mode",
    server: "The reactor · the doomsday core · click to train a model (stand back)",
    couch: "The velvet sofa · bounce on it",
    beanbag: "Beanbag · squish",
    cornhole: "Cornhole · toss a bag",
    globe: "Spin the globe · menacingly",
    lamp: "Your lava lamp · on/off",
  },
  npc: {
    guard: "Guard on patrol · clipboard at the ready",
    janitor: "Maintenance · mopping up after the last scheme",
    technician: "The base scientist · fixing things, goggles on",
    delivery: "Courier, fresh off the mini-sub · lunch for the base",
    kid: "A visiting kid · very impressed by the volcano",
    dog: "Rivet, the robot guard hound · all wag, no bite · pet",
    cat: "Meringue, the fluffy white cat · pet (if she lets you)",
    roomba: "The security drone · sweeping up · send it off (or home)",
  },
  words: {
    kitchen: "canteen",
    Kitchen: "Canteen",
    "waiting room": "antechamber",
    "Waiting room": "Antechamber",
    Reception: "Guard post",
    "meeting room": "briefing room",
    "Meeting room": "Briefing room",
    "Planning room": "Briefing room",
    "planning room": "briefing room",
    "server room": "reactor room",
    "Server room": "Reactor room",
    "the AI cluster": "the doomsday core",
    "Your office": "Your lair",
    "your office": "your lair",
    "an office event": "a base event",
    "office event": "base event",
    "Office events": "Base events",
    "Office party": "Lair party",
    subagent: "sidekick",
    subagents: "sidekicks",
    Subagent: "Sidekick",
    Subagents: "Sidekicks",
    "String lights · make them twinkle": "Alarm lamps · test the alarm",
    "Open the window": "Open the blast doors",
    "making coffee": "making villain-strength coffee",
    "snacking at the island": "snacking at the serving line",
    "raiding the fridge": "raiding the cold store",
    "picking a snack": "picking a henchsnack",
    "watching the fish": "watching the shark",
    "playing the piano": "playing dramatic chords",
    "poking at the server cables": "poking at the reactor cables",
    "fixing the server rack": "fixing the reactor",
    garden: "jungle garden",
    library: "archive",
    "reading in the library": "reading old schemes in the archive",
    "dozing off in the library": "dozing off in the archive",
  },
};

// ------------------------------------------------------------------ what people say

export const LINES = {
  hover: {
    button: "The big red button · do NOT press",
    map: "The world map · pick a target",
    countdown: "The countdown · to the next coffee break",
    monorail: "The monorail · call a car",
    lava: "The lava lake · have a look over the rail",
    hatch: "The trapdoor · what could go wrong?",
    tapes: "The tape computers · run the numbers",
  },
  confetti: ["Happy Friday!", "Did we… win?", "Party mode: armed.", "Who wired the button to the confetti again?"],
  alert: ["Red alert! …oh, it's cake.", "Battle stations! Snack stations.", "Is it lunch?", "False alarm. Someone microwaved fish."],
  disco: ["Is this a drill?", "It's a dance drill.", "Groovy.", "Evil never looked so funky."],
  heli: ["Who's flying?", "The coffee run.", "Bring back croissants!", "That's the dry cleaning."],
  swivelYou: ["Ah. Right on time.", "I've been expecting… the coffee.", "Let's discuss the quarterly snacks.", "Do sit down. Meringue insists."],
  swivelNear: ["The chair again.", "So dramatic.", "We know it's you, boss."],
  targetPrefix: "Target acquired: ",
  target: ["Pizza for twelve. Extra cheese.", "Delivery in thirty minutes.", "The anchovies are a statement.", "Phase one: dinner."],
  countdown: ["It always stops at one.", "Every single time.", "…coffee break, then?", "Phew. Again."],
  monorail: ["Next stop: the canteen.", "Mind the gap. And the lava.", "All aboard!", "Is that seat taken?"],
  bubble: ["Bless you, volcano.", "That one had a face.", "Lava's lively today.", "Bloop."],
  duck: ["Is that… a rubber duck?", "Heat-proof duck. Respect.", "It's surfing."],
  fountain: ["Ooooh.", "Better than fireworks.", "Don't tell maintenance."],
  tapes: ["The numbers say… lunch.", "Calculating world domination… 3%.", "Rewinding the master plan.", "It's just playing elevator music."],
} as const;

/** A line in a get-together: seconds after everyone's arrived, who says it (−1: nobody), what, and a sound. */
export type ClickLine = readonly [number, number, string, string?];

export const SHOWS = {
  pit: [
    [0.4, 0, "Wheee!", "lair-balls"],
    [2.2, 1, "Cannonball!", "lair-balls"],
    [4.6, 2, "HR approved this?"],
    [7.0, 0, "Best. Trapdoor. Ever."],
    [9.4, 1, "I'm filing this under team building."],
  ] as ClickLine[],
  roast: [
    [0.6, 0, "Marshmallows over the lava lake.", "lair-sizzle"],
    [3.0, 1, "Golden brown…"],
    [5.2, 2, "Mine's on fire!", "lair-sizzle"],
    [7.6, 0, "Item one of the master plan: s'mores."],
    [10.2, 1, "Item two: the expense report."],
    [12.4, 3, "Perfect."],
  ] as ClickLine[],
  pitActivity: "playing in the ball pit",
  roastActivity: "roasting marshmallows over the lava",
};

// ------------------------------------------------------------------ sounds

export const SOUNDS: Record<string, SoundRecipe> = {
  // Surf on the rocks below, a gull.
  "lair-sea": (k) => {
    k.swell(0, 3, 0.12, 260, 700, 0.6, "lowpass");
    k.swell(1.1, 2, 0.08, 400, 900, 0.6, "lowpass");
    k.tone(1500, 0.6, 0.16, "sine", 0.03, 1100);
    k.tone(1700, 0.85, 0.2, "sine", 0.025, 1200);
  },
  // Tree frogs and crickets over the surf.
  "lair-night": (k) => {
    k.swell(0, 3, 0.06, 200, 500, 0.6, "lowpass");
    for (let i = 0; i < 10; i++) k.tone(2400 + (i % 3) * 300, 0.2 + i * 0.26, 0.05, "square", 0.008);
    k.tone(620, 0.9, 0.12, "sine", 0.02, 520);
    k.tone(620, 1.9, 0.12, "sine", 0.02, 520);
  },
  "lair-rain": (k) => {
    k.swell(0, 2.8, 0.1, 3000, 2400, 0.5);
    k.swell(0, 3, 0.06, 260, 600, 0.6, "lowpass");
    for (let i = 0; i < 14; i++) k.tone(2000 + Math.random() * 2000, Math.random() * 2.6, 0.015, "sine", 0.035, 1500);
  },
  "lair-storm": (k) => {
    k.swell(0, 2.8, 0.1, 3000, 2400, 0.5);
    k.noise(0.1, 0.18, 0.16, 1100);
    k.swell(0.15, 3, 0.4, 110, 55, 0.7, "lowpass");
    k.swell(0.5, 2, 0.2, 80, 50, 0.7, "lowpass");
  },
  "lair-wind": (k) => {
    k.swell(0, 3, 0.11, 300, 1100, 6);
    k.swell(0.4, 2.4, 0.08, 260, 600, 0.6, "lowpass");
  },
  // A ship's horn far out, the surf muffled.
  "lair-fog": (k) => {
    k.swell(0, 3, 0.06, 200, 400, 0.6, "lowpass");
    k.tone(98, 0.3, 1.6, "sawtooth", 0.03);
    k.tone(196, 0.3, 1.6, "sine", 0.04);
  },
  "lair-snow": (k) => {
    k.swell(0, 3, 0.05, 380, 300, 0.5, "lowpass");
    k.swell(0.4, 2.4, 0.06, 500, 900, 5);
  },
  // The volcano grumbling somewhere deep down.
  "lair-rumble": (k) => {
    k.swell(0, 2.6, 0.3, 70, 40, 0.8, "lowpass");
    k.noise(0.2, 1.4, 0.05, 160);
  },
  // ---- things to click
  "lair-klaxon": (k) => {
    for (let i = 0; i < 3; i++) k.tone(440, i * 0.7, 0.5, "sawtooth", 0.05, 660);
  },
  "lair-confetti": (k) => {
    k.noise(0, 0.08, 0.2, 2400);
    k.noise(0.12, 0.08, 0.16, 2600);
    k.tone(523, 0.25, 0.12, "square", 0.04);
    k.tone(659, 0.37, 0.12, "square", 0.04);
    k.tone(784, 0.49, 0.3, "square", 0.04);
  },
  "lair-trapdoor": (k) => {
    k.noise(0, 0.06, 0.25, 600);
    k.tone(140, 0.02, 0.18, "square", 0.06, 70);
    k.tone(300, 0.3, 0.35, "sine", 0.06, 900);
  },
  "lair-balls": (k) => {
    for (let i = 0; i < 8; i++) k.tone(700 + Math.random() * 900, i * 0.05, 0.04, "sine", 0.04);
  },
  "lair-swivel": (k) => {
    k.tone(220, 0, 0.5, "sawtooth", 0.02, 180);
    // A dramatic organ chord.
    for (const f of [110, 131, 165, 220]) k.tone(f, 1.2, 1.4, "sawtooth", 0.018);
  },
  "lair-heli": (k) => {
    for (let i = 0; i < 34; i++) {
      const env = Math.min(1, i / 8);
      k.noise(i * 0.08, 0.04, 0.03 + env * 0.07, 260);
    }
    k.tone(70, 0, 2.6, "sawtooth", 0.01, 90);
  },
  "lair-disco": (k) => {
    const notes = [196, 0, 247, 196, 294, 0, 247, 330];
    notes.forEach((f, i) => {
      if (f) k.tone(f, i * 0.2, 0.16, "square", 0.035);
      k.noise(i * 0.2, 0.03, 0.06, 6000);
    });
    k.tone(98, 0, 1.6, "triangle", 0.05);
  },
  "lair-target": (k) => {
    for (let i = 0; i < 5; i++) k.tone(1200 + i * 120, i * 0.18, 0.06, "square", 0.03);
    k.tone(1800, 1.0, 0.25, "square", 0.035);
  },
  // Nine beeps down to 00:01, a sad horn when it sticks there, a ding for coffee.
  "lair-countdown": (k) => {
    for (let i = 0; i < 9; i++) k.tone(880, i, 0.09, "square", 0.03);
    for (const [i, f] of [392, 370, 349, 311].entries()) k.tone(f, 9.3 + i * 0.32, i === 3 ? 0.8 : 0.28, "sawtooth", 0.03, i === 3 ? 290 : undefined);
    k.tone(1047, 11.6, 0.5, "sine", 0.05);
    k.tone(1319, 11.75, 0.7, "sine", 0.05);
  },
  "lair-chime": (k) => {
    k.tone(784, 0, 0.5, "sine", 0.06);
    k.tone(622, 0.4, 0.8, "sine", 0.06);
  },
  "lair-whoosh": (k) => {
    k.swell(0, 1.6, 0.1, 300, 1400, 1.2);
  },
  "lair-blorp": (k) => {
    k.tone(90, 0, 0.35, "sine", 0.12, 220);
    k.tone(240, 0.3, 0.12, "sine", 0.08, 80);
    k.noise(0.32, 0.1, 0.06, 500);
  },
  "lair-sizzle": (k) => {
    k.swell(0, 1.2, 0.05, 4000, 6000, 0.8);
  },
  "lair-squeak": (k) => {
    k.tone(1300, 0, 0.08, "sine", 0.05, 1700);
    k.tone(1300, 0.15, 0.08, "sine", 0.05, 1700);
  },
  "lair-fountain": (k) => {
    k.swell(0, 1.8, 0.2, 120, 400, 0.8, "lowpass");
    for (let i = 0; i < 8; i++) k.noise(0.2 + i * 0.15, 0.05, 0.08, 1800);
  },
  // Eight beeps, ignition, a rumbling hover, a sputter and a sad little horn.
  "lair-launch": (k) => {
    for (let i = 0; i < 8; i++) k.tone(i === 7 ? 1320 : 880, i, 0.08, "square", 0.03);
    k.noise(8, 0.4, 0.2, 500);
    k.swell(8.2, 4.8, 0.35, 70, 120, 0.8, "lowpass");
    k.swell(8.2, 4.8, 0.08, 900, 1400, 1);
    for (let i = 0; i < 6; i++) k.noise(13 + i * 0.22, 0.08, 0.12, 300);
    for (const [i, f] of [392, 349, 311].entries()) k.tone(f, 15 + i * 0.3, i === 2 ? 0.7 : 0.26, "sawtooth", 0.03, i === 2 ? 280 : undefined);
  },
  // A rising hum, then the zap.
  "lair-charge": (k) => {
    k.tone(110, 0, 2.6, "sawtooth", 0.025, 880);
    k.tone(220, 0.4, 2.2, "sine", 0.03, 1320);
    k.noise(2.6, 0.5, 0.18, 4000);
    k.tone(1760, 2.6, 0.3, "square", 0.03, 440);
    k.tone(1568, 3.4, 0.25, "sine", 0.05);
  },
  "lair-tapes": (k) => {
    for (let i = 0; i < 12; i++) k.tone(400 + ((i * 7) % 5) * 180, i * 0.09, 0.06, "square", 0.025);
    k.swell(0, 1.2, 0.04, 2000, 800, 2);
  },
};

export function lairOutdoor(weather: WeatherKind, night: boolean): string {
  switch (weather) {
    case "storm":
      return "lair-storm";
    case "rain":
    case "drizzle":
      return "lair-rain";
    case "snow":
      return "lair-snow";
    case "fog":
      return "lair-fog";
    case "cloudy":
      return Math.random() < 0.5 ? "lair-wind" : "lair-sea";
    default:
      if (night) return Math.random() < 0.75 ? "lair-night" : "lair-rumble";
      return Math.random() < 0.8 ? "lair-sea" : "lair-rumble";
  }
}
