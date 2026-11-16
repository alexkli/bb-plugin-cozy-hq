// Startup House: words and sounds. Upbeat, a little sleep-deprived, fluent in
// pivots and runway. The bulldog snores, the hen clucks, the grill sizzles.

import type { SynthKit, Theme } from "../../theme.ts";
import type { WeatherKind } from "../../../contract.ts";

const words: Record<string, string> = {
  lounge: "living room",
  Lounge: "Living room",
  "water cooler": "water jug",
  "Water cooler": "Water jug",
  cooler: "jug",
  "waiting room": "entryway",
  "Waiting room": "Entryway",
  "meeting room": "bunk room",
  "Meeting room": "Bunk room",
  "Planning room": "Bunk room",
  "server room": "garage",
  "Server room": "Garage",
  "the AI cluster": "the GPU rig",
  "office event": "house party",
  "Office events": "House parties",
  "Office party": "House party",
  "office party": "house party",
  "String lights": "Holiday lights",
  "making coffee": "pulling an espresso",
  "brewing tea": "whisking a matcha",
  "having a tea": "having a matcha",
  "picking a snack": "grabbing an energy drink",
  "raiding the fridge": "eating someone's leftovers",
  "playing the piano": "playing the keyboard",
  "snacking at the island": "eating cereal at the table",
  "hanging out on the couch": "sinking into the sectional",
  "planning at the whiteboard": "planning on the closet doors",
  "planning in the meeting room": "planning in the bunk room",
  "enjoying the garden": "hanging out in the yard",
  garden: "yard",
  library: "den",
  "reading in the library": "reading in the den",
  "dozing off in the library": "dozing off in the den",
  "poking at the server cables": "poking at the garage cables",
  "fixing the server rack": "rebooting the garage servers",
  "watching the fish": "watching the fish (and their servers)",
};

const poke = {
  coffee: "Espresso machine · cost more than the car, cleaned never",
  kettle: "Kettle · for the matcha people",
  vending: "Drinks fridge · ninety percent energy drinks",
  fridge: "Fridge · label your leftovers (nobody does)",
  microwave: "Microwave · burrito in progress",
  piano: "Keyboard · someone's writing a jingle for the launch",
  dartboard: "Dartboard · the plywood takes most of the hits",
  printer: "Printer · out of cyan since launch",
  cooler: "Water jug · whoever empties it changes it",
  lamp: "Your lamp · on/off",
  plant: "Water the plant · it's been a while",
  bin: "Trash · mostly pizza boxes",
  clock: "Sunburst clock · from a yard sale, five minutes fast",
  arcade: "Arcade cabinet · from a neighbor's garage, works if you kick it",
  pingpong: "Ping-pong table · where the real decisions get made",
  fishtank: "Feed the fish · they live in a tiny server rack",
  whiteboard: "The closet doors · threads in plan mode draw here",
  server: "The garage servers · click to train a model (box fans on max)",
  couch: "The sectional · it remembers every all-nighter",
  beanbag: "Beanbag · slowly losing beans",
  cornhole: "Cornhole · for the house party",
  globe: "Spin the globe · for the international expansion",
};

const npc = {
  guard: "An investor · 'just swinging by', fleece vest and all",
  janitor: "The cleaner · comes Tuesdays, paid in pizza",
  technician: "The internet installer · upgrading the fiber, again",
  delivery: "Pizza delivery · knows everyone by name",
  kid: "A neighbor kid · wants to see the robots",
  dog: "Pivot, the house bulldog · snores like a server fan · pet",
  cat: "Beta, the backyard hen · lays one egg per sprint · pet",
  roomba: "The robot vacuum · more stickers than battery · send it off (or home)",
};

// ------------------------------------------------------------------ things to click

/** A line in a get-together: seconds after everyone's arrived, who says it (−1: nobody), what, and a sound. */
export type ClickLine = readonly [number, number, string, string?];

export const CLICK_LINES = {
  hover: {
    grill: "The grill · burgers, veggie dogs, the odd flare-up",
    pool: "The pool · a bit green, still a pool",
    hammock: "The hammock · the best meeting room in the house",
    garage: "The garage door · roll it up for the light",
    pyramid: "The can pyramid · do not touch",
    console: "The game console · just one round",
    bunk: "The bunk bed · someone might be living up there",
  },
  flare: ["Whoa! Eyebrows intact?", "That's the marinade.", "Nobody tell the landlord."],
  smoke: ["Smells like product-market fit.", "Is it supposed to smoke like that?", "Open a window. Wait, we're outside."],
  cannonball: ["Ten out of ten!", "My laptop was right there.", "Splash zone!", "Morning standup, aquatic edition."],
  float: ["Is that a pizza?", "Best purchase of the quarter.", "It's on the expense report."],
  swing: ["Five more minutes.", "Lazy afternoon.", "Back and forth, like the roadmap."],
  swingNapper: ["Five more minutes…", "I'm thinking. With my eyes closed.", "Zzz… ship it… zzz"],
  flip: ["Classic.", "And that's why we need a hammock policy.", "Who flipped the hammock?"],
  flipNapper: ["Oof.", "I'm up! I'm up!", "That was a pivot."],
  garageOpen: ["Let some light in!", "Air it out, the servers are cooking.", "Smells like solder and sunscreen."],
  garageStuck: ["It does that.", "Halfway is a feature.", "Somebody file a ticket."],
  collapse: ["Nobody move.", "That was load-bearing.", "Eight weeks of caffeine, gone."],
  gameBusy: ["One more round.", "Winner stays on.", "After this I'll fix the bug."],
  snore: ["Is someone living up there?", "Shh. He's on a different time zone.", "I think that's the intern. Or a sleeping bag."],
  bunkLights: ["Festive.", "Who wired those to the router?", "Very cozy."],
  /** A cookout: the one on the tongs (0) and up to three with plates. */
  cookout: [
    [0.5, 0, "Who wants a burger?"],
    [2.6, 1, "Is there a veggie one?"],
    [4.6, 0, "There is now."],
    [6.8, 2, "Is it supposed to be that black?"],
    [8.8, 0, "It's caramelized."],
    [11, 3, "Ship it."],
    [12.6, -1, "", "su-sizzle"],
  ] as ClickLine[],
  /** Feet in the pool. */
  dip: [
    [0.8, 0, "It's warmer than it looks."],
    [3.4, 1, "It's greener than it looks."],
    [6, 2, "This counts as a standup."],
    [8.6, 0, "Blocker: the pool filter."],
  ] as ClickLine[],
  /** Demo-day rehearsal in the garage: the pitch (0) and the hole-pokers. */
  rehearsal: [
    [0.6, 0, "Imagine: everything, but for dogs."],
    [3.6, 1, "What's the business model?"],
    [6.2, 0, "Subscriptions. No, ads. No…"],
    [9, 2, "What's the moat?"],
    [11.4, 0, "The pool. It's a moat now."],
    [14, 3, "Ship it."],
    [14.6, -1, "", "su-applause"],
  ] as ClickLine[],
  /** Game night at the coffee table. */
  gameNight: [
    [0.6, 0, "Just one round."],
    [3.2, 1, "That was lag."],
    [5.8, 2, "Who unplugged my controller?"],
    [8.6, 3, "Winner stays on."],
    [11.4, 0, "Okay, one more."],
  ] as ClickLine[],
  /** Restacking the pyramid. */
  restack: [
    [0.4, 0, "Rebuilding. Taller this time."],
    [3, 0, "Version two."],
  ] as ClickLine[],
};

// ------------------------------------------------------------------ sounds

const sounds: Record<string, (k: SynthKit) => void> = {
  /** A sunny street: a lawnmower down the block, a mockingbird showing off. */
  "su-street"(k) {
    k.tone(92, 0, 2.6, "sawtooth", 0.02, 98);
    k.swell(0, 2.6, 0.05, 300, 380, 0.9, "lowpass");
    [1900, 2300, 2100, 2600, 2400].forEach((f, i) => k.tone(f, 0.5 + i * 0.16, 0.1, "sine", 0.05, f * 1.15));
    [1500, 1500, 1800].forEach((f, i) => k.tone(f, 1.6 + i * 0.13, 0.08, "sine", 0.04, f * 0.9));
  },
  /** Sprinklers ticking across the lawns. */
  "su-sprinkler"(k) {
    for (let i = 0; i < 14; i++) k.noise(i * 0.12, 0.05, 0.05, 3600);
    k.swell(1.7, 0.9, 0.04, 2400, 3200, 0.8);
  },
  /** A warm night: crickets, the freeway hum far off, a dog two yards over. */
  "su-night"(k) {
    k.swell(0, 2.8, 0.03, 90, 120, 0.7, "lowpass");
    for (let i = 0; i < 8; i++) k.tone(4200, i * 0.32, 0.06, "sine", 0.025);
    k.tone(330, 1.8, 0.14, "triangle", 0.03, 260);
  },
  /** Rain on the patio and the gutters running. */
  "su-rain"(k) {
    k.swell(0, 2.8, 0.12, 2400, 2000, 0.5);
    k.swell(0, 2.8, 0.05, 180, 240, 0.7, "lowpass");
    for (let i = 0; i < 8; i++) k.tone(1200 + Math.random() * 1200, Math.random() * 2.6, 0.03, "sine", 0.04, 700);
  },
  /** Fog off the bay: everything muffled. */
  "su-fog"(k) {
    k.swell(0, 2.8, 0.05, 110, 140, 0.7, "lowpass");
    k.tone(150, 0.6, 1.4, "sine", 0.03);
  },
  // The pets: a hen and a bulldog.
  meow(k) {
    [620, 700, 580].forEach((f, i) => k.tone(f, i * 0.09, 0.07, "square", 0.025, f * 0.85));
    k.tone(820, 0.32, 0.22, "square", 0.03, 560);
  },
  purr(k) {
    for (let i = 0; i < 4; i++) k.tone(420 + (i % 2) * 40, i * 0.18, 0.08, "triangle", 0.03, 380);
  },
  bark(k) {
    k.noise(0, 0.12, 0.08, 300);
    k.tone(170, 0.02, 0.16, "sawtooth", 0.06, 120);
    k.noise(0.3, 0.3, 0.05, 180);
  },
};

const clickSounds: Record<string, (k: SynthKit) => void> = {
  "su-sizzle"(k) {
    k.swell(0, 2.2, 0.09, 4800, 5600, 0.6, "highpass");
    for (let i = 0; i < 8; i++) k.noise(Math.random() * 2, 0.04, 0.06, 6000);
  },
  "su-whoosh"(k) {
    k.swell(0, 0.9, 0.18, 300, 1800, 0.8);
    k.noise(0, 0.3, 0.12, 500);
    for (let i = 0; i < 5; i++) k.noise(0.4 + i * 0.12, 0.05, 0.06, 4200);
  },
  "su-splash"(k) {
    k.noise(0, 0.25, 0.25, 700);
    k.swell(0.05, 1.3, 0.14, 1600, 500, 0.6);
    for (let i = 0; i < 8; i++) k.tone(900 + Math.random() * 900, 0.3 + Math.random() * 0.8, 0.05, "sine", 0.05, 500);
  },
  "su-float"(k) {
    k.swell(0, 1.2, 0.05, 600, 900, 0.7);
    k.tone(520, 0.1, 0.25, "sine", 0.04, 640);
  },
  "su-creak"(k) {
    for (let i = 0; i < 3; i++) k.tone(180 + i * 20, i * 0.6, 0.4, "sawtooth", 0.022, 240);
  },
  "su-thud"(k) {
    k.tone(200, 0, 0.3, "sawtooth", 0.03, 400);
    k.noise(0.32, 0.16, 0.22, 220);
    k.tone(58, 0.32, 0.3, "sine", 0.2, 40);
  },
  "su-garage"(k) {
    // The opener's motor and the panels rattling up the track.
    k.tone(70, 0, 2.2, "sawtooth", 0.035, 78);
    k.swell(0, 2.2, 0.06, 200, 320, 1, "lowpass");
    for (let i = 0; i < 9; i++) k.noise(0.1 + i * 0.22, 0.05, 0.07, 1400);
    k.noise(2.15, 0.12, 0.12, 300);
  },
  "su-clatter"(k) {
    for (let i = 0; i < 12; i++) {
      const t0 = i * 0.07 + Math.random() * 0.05;
      k.tone(1800 + Math.random() * 1600, t0, 0.06, "triangle", 0.06, 1200);
      k.noise(t0, 0.03, 0.06, 5200);
    }
    for (let i = 0; i < 6; i++) k.tone(700 + Math.random() * 300, 1 + i * 0.18, 0.08, "triangle", 0.03, 650);
  },
  "su-game"(k) {
    // A little chiptune fanfare from the console.
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => k.tone(f, i * 0.11, 0.1, "square", 0.04));
    k.tone(131, 0, 0.66, "triangle", 0.05);
  },
  "su-snore"(k) {
    k.swell(0, 1.1, 0.09, 120, 260, 1.4, "lowpass");
    k.tone(80, 0.1, 0.9, "sawtooth", 0.025, 96);
    k.swell(1.3, 0.9, 0.05, 900, 1600, 0.7);
  },
  "su-twinkle"(k) {
    [1568, 2093, 1760, 2349, 1976].forEach((f, i) => k.tone(f, i * 0.09, 0.12, "sine", 0.05));
  },
  "su-applause"(k) {
    for (let i = 0; i < 14; i++) k.noise(i * 0.13 + Math.random() * 0.05, 0.04, 0.12, 2400);
  },
};

function outdoor(weather: WeatherKind, night: boolean): string {
  if (weather === "storm") return "thunder";
  if (weather === "rain" || weather === "drizzle") return "su-rain";
  if (weather === "snow") return "wind";
  if (weather === "fog") return "su-fog";
  if (night) return "su-night";
  return Math.random() < 0.6 ? "su-street" : "su-sprinkler";
}

export const WORDS: Pick<Theme, "labels" | "sounds" | "outdoor"> = {
  labels: {
    pets: { dog: "Pivot", cat: "Beta" },
    tvNews: "DEMO DAY NEWS",
    tvWeather: "BACKYARD WEATHER",
    words,
    poke,
    npc,
  },
  sounds: { ...sounds, ...clickSounds },
  outdoor,
};
