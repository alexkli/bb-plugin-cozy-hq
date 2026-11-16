// Dusty Annex: words and sounds. Dry, tired and a little bit British.

import type { Theme, SynthKit } from "../../theme.ts";
import type { WeatherKind } from "../../../contract.ts";

const words: Record<string, string> = {
  kitchen: "kitchenette",
  Kitchen: "Kitchenette",
  lounge: "break room",
  Lounge: "Break room",
  "water cooler": "dripping tap",
  "Water cooler": "Dripping tap",
  cooler: "tap",
  "waiting room": "corridor",
  "Waiting room": "Corridor",
  "meeting room": "fishbowl",
  "Meeting room": "Fishbowl",
  "Planning room": "Fishbowl",
  "server room": "comms cupboard",
  "Server room": "Comms cupboard",
  "the AI cluster": "the AI box",
  "office event": "office do",
  "Office events": "Office dos",
  "Office party": "Office do",
  TV: "telly",
  "watching TV": "watching the telly",
  "making coffee": "making instant coffee",
  "brewing tea": "stewing the tea",
  "having a tea": "having a cuppa",
  "picking a snack": "arguing with the vending machine",
  "raiding the fridge": "braving the fridge",
  "watching the fish": "watching the last fish",
  "playing the piano": "playing the out-of-tune piano",
  "snacking at the island": "snacking at the table",
  "coffee with a colleague": "instant coffee with a colleague",
  "chatting in the hallway": "moaning in the corridor",
  "hanging out on the couch": "sinking into the sofa",
  "enjoying the garden": "standing about in the yard",
  garden: "yard",
  library: "archive",
  "reading in the library": "reading old files in the archive",
  "dozing off in the library": "dozing off in the archive",
  "poking at the server cables": "poking at the cupboard cables",
  "fixing the server rack": "thumping the server",
};

const poke = {
  coffee: "Filter coffee · brewed this morning, possibly last week",
  kettle: "Kettle · limescale with a handle",
  vending: "Vending machine · eats coins, sometimes gives crisps",
  fridge: "Fridge · open at your own risk",
  microwave: "Microwave · someone's reheating fish again",
  piano: "Piano · three keys still work",
  dartboard: "Dartboard · mind the wall",
  printer: "Printer · jammed since spring",
  cooler: "The dripping tap · drip... drip...",
  lamp: "Your lamp · on/off (mostly)",
  plant: "Water the plant · it won't help",
  bin: "Bin · emptied on Thursdays, allegedly",
  clock: "Clock · four minutes slow",
  arcade: "Arcade cabinet · play a game, hope for the best",
  pingpong: "Ping-pong table · net held up with tape",
  fishtank: "Feed the last fish",
  whiteboard: "Whiteboard · threads in plan mode, over last year's scribbles",
  server: "The comms cupboard · click to train a model (and pray)",
  couch: "The sofa · springs included",
  beanbag: "Beanbag · mostly leaking beans",
  cornhole: "Cornhole · the board's warped",
  globe: "Spin the globe · several countries out of date",
};

const npc = {
  guard: "Night guard · seen it all, twice",
  janitor: "Cleaner · moves the dust about",
  technician: "The handyman · fixing things, eventually",
  delivery: "Takeaway rider · soaked through",
  kid: "A visiting kid · unimpressed",
  dog: "Crumpet, the office dog · old, scruffy, snores · pet",
  cat: "Smudge, the alley cat · came in through a window · pet",
  roomba: "The taped-up robot vacuum · send it off (or home)",
};

// ------------------------------------------------------------------ things to click

/** A line in a get-together: seconds after everyone's arrived, who says it (−1: nobody), what, and a sound. */
export type ClickLine = readonly [number, number, string, string?];

export const CLICK_LINES = {
  hover: {
    leak: "The leak · there's a bucket, mostly under it",
    tube: "Fluorescent tube · buzzing since before you started",
    store: "Storeroom · nobody knows what's at the back",
    copier: "The old photocopier · out of order, officially",
    stage: "The stage · open mic, closed audience",
    urn: "The tea urn · boiling since Tuesday",
    radiator: "Radiator · clanks on the hour, warms nothing",
    stairs: "The stairs · mind the fourth step",
  },
  leakFill: ["Someone should empty that.", "Not it.", "Nearly full again."],
  leakGush: ["Facilities have been told.", "It's fine. It's fine.", "The ceiling's at it again."],
  leakTune: ["Is it… playing something?", "I know this one.", "Hum along, why not."],
  tubeDie: ["And we're in the dark.", "Well, that's that.", "Typical."],
  tubeFlare: ["Too bright. Put it back.", "My eyes.", "Who turned the sun on?"],
  thumpOk: ["There.", "Still got it.", "Percussive maintenance."],
  thumpBad: ["Hm.", "Oh.", "Give it a minute."],
  avalanche: ["Nobody touch anything.", "That's the old archive.", "Was looking for that box. Not now."],
  drawer: ["Found the minutes, then.", "These are from another decade.", "Nobody saw that."],
  dust: ["Atchoo!", "Has anyone ever cleaned in there?", "I'm not going in after it."],
  mouse: ["Was that a—", "No it wasn't.", "That's Gerald. He's fine."],
  copier: ["It's eaten my form.", "Paper jam. Everywhere.", "Stand back, it does this."],
  pa: ["Testing… testing…", "Is this thing on?", "Sorry. Sorry."],
  curtain: ["That'll be the rail.", "Encore, then.", "Nobody saw that either."],
  urnBoil: ["Give it another forty minutes.", "It's thinking about it.", "Not hot. Just loud."],
  clank: ["That's the heating on, then.", "Is someone trapped in there?", "It knows we're talking about it."],
  hiss: ["It's hissing at me.", "Steam. Lovely. Still cold.", "Is that meant to happen?"],
  cold: ["Stone cold. As ever.", "Bleed it? I wouldn't."],
  step: ["Mind the fourth step.", "That's new.", "Somebody tape that."],
  creak: ["Just the building settling.", "Ghosts, probably.", "It's been settling for years."],
  /** A one-person show on the old stage: the performer (0) and an audience of up to three. */
  show: [
    [0.4, 0, "Act one. The memo."],
    [3.4, 0, "Nobody knew who sent it."],
    [6.6, 0, "Act two. Reply all."],
    [9.4, 1, "Is there an interval?"],
    [11.6, 2, "Is there a bar?"],
    [13, -1, "", "annex-applause"],
    [13.4, 0, "Thank you. Both of you."],
  ] as ClickLine[],
  /** A tea round at the urn: a queue, mugs, grievances. */
  urn: [
    [0.6, 0, "Who's on milk?"],
    [2.6, 1, "It's stewed."],
    [4.6, 2, "Biscuits are gone. Again."],
    [6.6, 3, "There's a rota, you know."],
    [8.8, 0, "Lovely. Lukewarm."],
  ] as ClickLine[],
};

/** Bad habits (habits.ts): what the boss grumbles, and what the staff say while they're at it. */
export const HABIT_LINES = {
  /** You, clicked. */
  poke: [
    "What.",
    "Do I look busy? Good. I am.",
    "If it's about the heating, no.",
    "Knock. It's a door. You knock.",
    "It was like that when I got here.",
    "Go and do something useful. Or don't. Just go.",
    "I'm thinking. Don't interrupt.",
    "Is it lunch? It feels like lunch.",
  ],
  /** You, clicked while dozing behind the paper. */
  pokeNap: ["I was resting my eyes.", "I'm awake. I'm reading.", "Who let you in?"],
  /** You, when someone sits down across the desk. */
  guests: [
    "Sit. Don't touch anything.",
    "Shut the door, you're letting the warm out.",
    "Make it quick. I'm very important.",
    "Oh, it's you. Fine.",
    "Mind the ashtray. It's a filing system.",
    "If it's about the fish, it wasn't me.",
  ],
  /** You, after a noise nobody will mention again. */
  parp: ["Wasn't me.", "Old building. The pipes.", "That's the chair. It does that.", "Better out than in."],
  /** Your guests, getting up. */
  parpGuests: ["Oh, come ON.", "I'll… come back later.", "Is that the drains?", "My eyes are watering."],
  smoke: ["Just the one.", "Don't tell facilities.", "Doesn't count. It's out the window."],
  pigeon: ["There you go, my lovely.", "Same time tomorrow, sir.", "He's the only one who listens."],
  blinds: ["That car's been there all week.", "Don't look. Don't all look.", "Same van. Different hat.", "We're being watched. Or it's the bins."],
  fishCook: ["Two minutes. Tops.", "Lovely bit of haddock, this."],
  fishNose: ["Who's doing fish?!", "That's a crime, that is.", "Open a window. Open ALL the windows.", "It's in my jumper now."],
};

/** What people are up to, in their tooltips. */
export const HABIT_ACTIVITY = {
  smoke: "having a crafty smoke out the window",
  pigeon: "feeding the pigeons",
  blinds: "keeping an eye on the street",
  fish: "microwaving fish (again)",
};

// ------------------------------------------------------------------ sounds

const sounds: Record<string, (k: SynthKit) => void> = {
  /** Rain on the back street, tyres hissing through puddles. */
  "annex-rain"(k) {
    k.swell(0, 2.8, 0.12, 2500, 2100, 0.5);
    k.swell(0, 2.8, 0.05, 140, 190, 0.7, "lowpass");
    k.swell(0.5, 1.6, 0.07, 500, 1700, 1.4);
    for (let i = 0; i < 6; i++) k.tone(1400 + Math.random() * 1200, Math.random() * 2.4, 0.03, "sine", 0.04, 900);
  },
  /** A bus grinding past, and the hiss of its brakes. */
  "annex-bus"(k) {
    k.tone(52, 0, 2.6, "sawtooth", 0.035, 74);
    k.swell(0, 2.6, 0.12, 160, 420, 1, "lowpass");
    k.swell(0.2, 2.2, 0.04, 900, 600, 0.8);
    k.noise(2.1, 0.45, 0.07, 4200);
  },
  /** Pigeons on the ledge, cooing and flapping off. */
  "annex-pigeons"(k) {
    k.swell(0, 2.4, 0.04, 130, 200, 0.7, "lowpass");
    for (const t0 of [0, 0.9]) {
      k.tone(430, t0, 0.22, "sine", 0.09, 390);
      k.tone(470, t0 + 0.24, 0.16, "sine", 0.07, 420);
      k.tone(380, t0 + 0.42, 0.34, "sine", 0.08, 340);
    }
    for (let i = 0; i < 5; i++) k.noise(1.75 + i * 0.07, 0.05, 0.06, 1800);
  },
  /** Night: the city's hum and a siren a few streets away. */
  "annex-siren"(k) {
    k.swell(0, 2.8, 0.05, 110, 160, 0.7, "lowpass");
    for (let i = 0; i < 3; i++) {
      k.tone(760, 0.2 + i * 0.9, 0.42, "triangle", 0.025);
      k.tone(600, 0.65 + i * 0.9, 0.42, "triangle", 0.025);
    }
  },
  /** Fog: everything muffled, a horn somewhere on the river. */
  "annex-fog"(k) {
    k.swell(0, 2.8, 0.06, 120, 150, 0.7, "lowpass");
    k.tone(110, 0.4, 1.6, "sawtooth", 0.02);
    k.tone(220, 0.4, 1.6, "sine", 0.04);
  },
};

// The things to click: drips, gushes, tubes, thuds, the urn, the radiator, the stairs.
// The bad habits: a lighter, a microwave, a snore, a pigeon, and a noise from the chair.
const habitSounds: Record<string, (k: SynthKit) => void> = {
  "annex-lighter"(k) {
    k.noise(0, 0.03, 0.14, 5200);
    k.noise(0.09, 0.03, 0.1, 5200);
    k.swell(0.12, 0.5, 0.05, 700, 500, 0.6, "lowpass");
  },
  "annex-ping"(k) {
    for (let i = 0; i < 3; i++) k.tone(1980, i * 0.32, 0.16, "square", 0.025);
  },
  "annex-snore"(k) {
    k.swell(0, 1.1, 0.07, 180, 320, 2, "lowpass");
    k.tone(64, 0.1, 0.9, "sawtooth", 0.018, 58);
  },
  "annex-coo"(k) {
    k.tone(430, 0, 0.2, "sine", 0.07, 390);
    k.tone(380, 0.24, 0.3, "sine", 0.06, 340);
  },
  /** Short, brassy and never mentioned again. */
  "annex-parp"(k) {
    k.tone(98, 0, 0.42, "sawtooth", 0.06, 74);
    k.tone(104, 0.03, 0.36, "square", 0.025, 78);
    k.swell(0, 0.42, 0.04, 260, 180, 1.2, "lowpass");
    k.tone(150, 0.4, 0.07, "square", 0.02, 120);
  },
};

const clickSounds: Record<string, (k: SynthKit) => void> = {
  "annex-drips"(k) {
    for (let i = 0; i < 9; i++) k.tone(1500 - i * 25, i * (0.26 - i * 0.015), 0.05, "sine", 0.08, 800);
  },
  "annex-gush"(k) {
    k.noise(0, 0.12, 0.12, 900);
    k.swell(0, 2.4, 0.16, 1100, 600, 0.6);
    k.swell(0.1, 2.2, 0.06, 300, 200, 0.7, "lowpass");
  },
  "annex-tune"(k) {
    // The drips find a little tune, then lose it.
    [1568, 1319, 1175, 1047, 1175, 1319, 1245].forEach((f, i) => k.tone(f, i * 0.32, 0.14, "sine", 0.09, f * 0.72));
  },
  "annex-sputter"(k) {
    k.tone(100, 0, 1.2, "sawtooth", 0.03);
    for (let i = 0; i < 6; i++) k.noise(i * 0.19 + Math.random() * 0.05, 0.03, 0.08, 3200);
    k.noise(1.2, 0.05, 0.14, 2600);
  },
  "annex-hum"(k) {
    k.tone(120, 0, 2.2, "sawtooth", 0.022);
    k.tone(240, 0, 2.2, "sine", 0.02);
  },
  "annex-thump"(k) {
    k.noise(0, 0.08, 0.2, 320);
    k.tone(82, 0, 0.16, "sine", 0.22, 48);
  },
  "annex-avalanche"(k) {
    for (let i = 0; i < 6; i++) {
      const t0 = i * 0.12 + Math.random() * 0.05;
      k.noise(t0, 0.1, 0.18, 260);
      k.tone(70 + Math.random() * 30, t0, 0.14, "sine", 0.16, 40);
    }
  },
  "annex-drawer"(k) {
    k.tone(300, 0, 0.32, "sawtooth", 0.035, 540);
    k.noise(0.3, 0.12, 0.12, 400);
    for (let i = 0; i < 6; i++) k.noise(0.45 + i * 0.12, 0.08, 0.05, 3600);
  },
  "annex-dust"(k) {
    k.swell(0, 1.4, 0.08, 400, 1300, 0.8);
  },
  "annex-squeak"(k) {
    for (let i = 0; i < 3; i++) k.tone(2600 + i * 200, i * 0.14, 0.06, "sine", 0.07, 3300);
  },
  "annex-jam"(k) {
    k.tone(90, 0, 0.9, "square", 0.03, 55);
    k.noise(0, 0.9, 0.05, 900);
    for (let i = 0; i < 4; i++) k.tone(1760, 1 + i * 0.24, 0.1, "square", 0.04);
  },
  "annex-squeal"(k) {
    // Feedback off an old PA.
    k.tone(2100, 0, 1.3, "sine", 0.05, 3400);
    k.tone(4200, 0.2, 0.9, "sine", 0.015, 5200);
  },
  "annex-applause"(k) {
    // Two people clapping, politely.
    for (let i = 0; i < 9; i++) k.noise(i * 0.21 + (i % 2) * 0.07, 0.04, 0.12, 2400);
  },
  "annex-thud"(k) {
    k.noise(0, 0.16, 0.2, 220);
    k.tone(60, 0, 0.3, "sine", 0.18, 40);
    k.swell(0.1, 1, 0.05, 400, 1000, 0.8);
  },
  "annex-urn"(k) {
    for (let i = 0; i < 10; i++) k.tone(180 + Math.random() * 220, i * 0.11, 0.08, "sine", 0.06, 120);
    k.tone(2093, 1.3, 0.4, "triangle", 0.05);
  },
  "annex-clank"(k) {
    for (let i = 0; i < 4; i++) {
      k.tone(420 + ((i * 130) % 300), i * 0.24, 0.22, "square", 0.035, 300);
      k.noise(i * 0.24, 0.04, 0.1, 1800);
    }
  },
  "annex-hiss"(k) {
    k.swell(0, 2.4, 0.08, 5000, 6200, 0.7, "highpass");
  },
  "annex-tick"(k) {
    k.tone(1800, 0, 0.03, "square", 0.05);
  },
  "annex-crack"(k) {
    k.noise(0, 0.12, 0.26, 1200);
    k.tone(140, 0.02, 0.3, "sawtooth", 0.05, 70);
    k.noise(0.18, 0.3, 0.06, 500);
  },
  "annex-creak"(k) {
    k.tone(160, 0, 1.3, "sawtooth", 0.034, 250);
    k.tone(230, 0.35, 0.9, "sawtooth", 0.02, 150);
  },
};

function outdoor(weather: WeatherKind, night: boolean): string {
  if (weather === "storm") return "thunder";
  if (weather === "rain" || weather === "drizzle") return "annex-rain";
  if (weather === "snow") return "wind";
  if (weather === "fog") return "annex-fog";
  if (night) return "annex-siren";
  return Math.random() < 0.5 ? "annex-pigeons" : "annex-bus";
}

export const WORDS: Pick<Theme, "labels" | "sounds" | "outdoor"> = {
  labels: {
    pets: { dog: "Crumpet", cat: "Smudge" },
    tvNews: "THE BULLETIN",
    tvWeather: "WEATHER (GREY)",
    words,
    poke,
    npc,
  },
  sounds: { ...sounds, ...clickSounds, ...habitSounds },
  outdoor,
};
