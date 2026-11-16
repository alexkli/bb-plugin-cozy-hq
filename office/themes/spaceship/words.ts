// Spaceship: words and sounds. Warm, wry and a little nerdy: the crew have
// been out here a while, the coffee is recycled, the snacks come in cubes.
import type { SynthKit, Theme } from "../../theme.ts";

const words: Record<string, string> = {
  kitchen: "galley",
  Kitchen: "Galley",
  lounge: "rec room",
  Lounge: "Rec room",
  "water cooler": "water recycler",
  "Water cooler": "Water recycler",
  cooler: "recycler",
  "waiting room": "muster station",
  "Waiting room": "Muster station",
  Reception: "Comms desk",
  "in the meeting room": "on the bridge",
  "meeting room": "bridge",
  "Meeting room": "Bridge",
  "Planning room": "Bridge",
  "server room": "engine room",
  "Server room": "Engine room",
  "the AI cluster": "the ship's AI core",
  library: "crew quarters",
  garden: "hydroponics bay",
  "games room": "rec deck",
  hallway: "corridor",
  "an office event": "a crew event",
  "office event": "crew event",
  "Office events": "Crew events",
  "Office party": "Deck party",
  "office party": "deck party",
  "Team lunch": "Crew lunch",
  "team lunch": "crew lunch",
  "Your office": "Captain's cabin",
  "your office": "your cabin",
  Beanbag: "Sleep pod",
  whiteboard: "star chart",
  "at the desk": "at a crew station",
  "Desk & chair": "Console & chair",
  "Desk = model": "Console = model",
  "Shirt badge": "Suit patch",
  "watching TV": "watching SHIP NEWS",
  "making coffee": "brewing recycled coffee",
  "brewing tea": "steeping hydro tea",
  "having a tea": "having a hydro tea",
  "picking a snack": "dispensing a snack",
  "raiding the fridge": "raiding the cold locker",
  "watching the fish": "watching the water sphere",
  "playing the piano": "playing the synth",
  "snacking at the island": "snacking at the mess table",
  "hanging out on the couch": "hanging out on the crew couch",
  "playing arcade games": "flying the sim pod",
  "ping-pong": "zero-g ping-pong",
  darts: "zero-g darts",
  "enjoying the garden": "tending the hydroponics",
  "poking at the server cables": "poking at the engine cables",
  "Open the window": "Look out the porthole",
  "String lights · make them twinkle": "Running lights · make them chase",
  // The subagents' lines at the desk.
  Checking: "Scanning",
  "Looks good": "All systems go",
  "Reading docs": "Reading the logs",
};

const poke = {
  coffee: "Coffee brewer · 100% recycled, 90% coffee",
  kettle: "Kettle · boils at ship pressure",
  vending: "Snack dispenser · press any button, receive a cube",
  fridge: "Cold locker · have a look inside",
  microwave: "Re-heater · warms lunch in four seconds, unevenly",
  piano: "Synth · play something for the long haul",
  dartboard: "Zero-g darts · they come back, eventually",
  printer: "Fabricator · prints anything, mostly memos",
  cooler: "Water recycler · best not to ask where it's been",
  lamp: "Light column · on/off",
  plant: "Hydroponic plant · give it a squirt",
  bin: "Recycling chute · toss some scrap",
  clock: "Ship's chronometer · set to home time",
  arcade: "Sim pod · insert a credit",
  pingpong: "Zero-g ping-pong · serve (mind the ceiling)",
  fishtank: "Water sphere · feed the fish",
  whiteboard: "Star chart · threads in plan mode",
  server: "Engine room · the ship's AI core · click to run a diagnostic",
  couch: "Crew couch · bounce on it",
  beanbag: "Sleep pod · fluff the pillow",
  cornhole: "Gravity toss · throw a beanbag",
  globe: "Star globe · give the galaxy a spin",
  putt: "Zero-g golf · watch {them} putt",
  cradle: "Momentum cradle · clack clack",
  hoop: "Recycling hoop · watch {them} shoot",
};

const npc = {
  guard: "Security officer · walking the corridors",
  janitor: "Maintenance tech · keeps the deck shiny",
  technician: "Ship's engineer · has the right spanner",
  delivery: "Courier off the supply shuttle · lunch has docked",
  kid: "A visiting cadet · pressing every button",
  dog: "Gasket, the ship's robot dog · pet",
  cat: "Plum, the ship's critter · nobody knows which planet · pet",
  roomba: "Maintenance drone · send it off (or home)",
};

// ------------------------------------------------------------------ sounds

const sounds: Record<string, (k: SynthKit) => void> = {
  /** The jump: a rising whoosh, a shimmer, and a soft thump as the stars settle. */
  "ship-warp"(k) {
    k.swell(0, 1.4, 0.12, 200, 2600, 1.2);
    k.tone(110, 0, 1.3, "sawtooth", 0.025, 660);
    k.tone(880, 0.9, 0.5, "sine", 0.04, 1760);
    k.noise(1.32, 0.1, 0.14, 300);
    k.tone(70, 1.32, 0.4, "sine", 0.2, 40);
  },
  /** The food synthesizer: a whirr, a sparkle, a ding. */
  "ship-synth"(k) {
    k.tone(220, 0, 0.9, "sawtooth", 0.02, 440);
    k.swell(0, 0.9, 0.05, 600, 1800, 1.5);
    for (let i = 0; i < 5; i++) k.tone(1800 + i * 260, 0.6 + i * 0.05, 0.08, "sine", 0.04);
    k.tone(1568, 1.05, 0.5, "triangle", 0.07);
  },
  /** The same, but what comes out is… something: a wobbly blorp. */
  "ship-synth-odd"(k) {
    k.tone(220, 0, 0.9, "sawtooth", 0.02, 440);
    k.swell(0, 0.9, 0.05, 600, 1800, 1.5);
    for (let i = 0; i < 4; i++) k.tone(1800 + i * 260, 0.6 + i * 0.05, 0.08, "sine", 0.04);
    k.tone(330, 1.0, 0.18, "square", 0.04, 180);
    k.tone(200, 1.2, 0.35, "sine", 0.12, 90);
    k.tone(140, 1.45, 0.3, "sine", 0.08, 260);
  },
  /** The drive core pulses: a deep swell and fade. */
  "ship-core"(k) {
    k.tone(55, 0, 1.8, "sine", 0.22, 62);
    k.tone(110, 0.05, 1.5, "triangle", 0.05, 124);
    k.swell(0, 1.8, 0.09, 120, 420, 2, "lowpass");
    k.tone(880, 0.3, 0.9, "sine", 0.012, 990);
  },
  /** Gravity off: everything goes light and wobbly. */
  "ship-gravity-off"(k) {
    k.tone(660, 0, 1.4, "sine", 0.06, 165);
    k.tone(990, 0.05, 1.2, "sine", 0.025, 330);
    for (let i = 0; i < 6; i++) k.tone(520 - i * 50, 0.15 + i * 0.18, 0.16, "triangle", 0.03, 560 - i * 40);
  },
  /** Gravity back on: a rising tone and a soft, collective clunk. */
  "ship-gravity-on"(k) {
    k.tone(165, 0, 0.7, "sine", 0.07, 660);
    k.noise(0.72, 0.1, 0.16, 260);
    k.tone(75, 0.72, 0.25, "sine", 0.18, 45);
    k.noise(0.82, 0.06, 0.06, 1400);
  },
  /** The ship's AI clears its throat: two friendly notes and a few bleeps. */
  "ship-ai"(k) {
    k.tone(784, 0, 0.22, "sine", 0.08);
    k.tone(1175, 0.18, 0.32, "sine", 0.08);
    for (let i = 0; i < 4; i++) k.tone(1400 + ((i * 370) % 600), 0.55 + i * 0.09, 0.05, "square", 0.015);
  },
  /** The grow lights to full: a bubbly rising arpeggio. */
  "ship-grow"(k) {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => k.tone(f, i * 0.11, 0.18, "sine", 0.06, f * 1.06));
    for (let i = 0; i < 6; i++) k.tone(300 + Math.random() * 500, Math.random() * 0.8, 0.05, "sine", 0.04, 900);
  },
  /** The airlock cycles: hiss, clunk, hiss. */
  "ship-airlock"(k) {
    k.swell(0, 0.9, 0.12, 3800, 5200, 0.8, "highpass");
    k.noise(0.9, 0.08, 0.2, 280);
    k.tone(62, 0.9, 0.3, "sine", 0.18, 40);
    k.swell(1.1, 1.3, 0.08, 5200, 2800, 0.8, "highpass");
  },
  /** A crate's latches: clack, clack, a hollow thunk. */
  "ship-crate"(k) {
    k.noise(0, 0.03, 0.12, 2400);
    k.noise(0.14, 0.03, 0.12, 2400);
    k.tone(140, 0.32, 0.3, "triangle", 0.1, 90);
    k.noise(0.32, 0.12, 0.08, 500);
  },
  /** Space through the porthole: a deep calm hum with a faint shimmer. */
  "ship-space"(k) {
    k.tone(49, 0, 3, "sine", 0.08, 52);
    k.swell(0, 3, 0.04, 90, 140, 0.7, "lowpass");
    k.tone(1318, 0.6, 1.6, "sine", 0.008, 1397);
    k.tone(1976, 1.4, 1.4, "sine", 0.006, 1865);
  },
  /** A meteor shower ticking past the hull. */
  "ship-meteors"(k) {
    k.tone(49, 0, 2.8, "sine", 0.05);
    for (let i = 0; i < 9; i++) {
      const t0 = Math.random() * 2.5;
      k.tone(1800 + Math.random() * 1800, t0, 0.05, "sine", 0.04, 700);
      if (i % 3 === 0) k.noise(t0, 0.03, 0.05, 3000);
    }
  },
  /** An ion storm: crackle over a low electric buzz. */
  "ship-ion"(k) {
    k.tone(60, 0, 2.6, "sawtooth", 0.022, 58);
    k.swell(0, 2.6, 0.04, 200, 600, 1.5, "lowpass");
    for (let i = 0; i < 10; i++) k.noise(Math.random() * 2.4, 0.04, 0.1, 2500 + Math.random() * 2500);
    k.tone(2400, 1.2, 0.3, "square", 0.012, 900);
  },
  /** An ice field: glassy little tinkles. */
  "ship-ice"(k) {
    k.tone(49, 0, 2.6, "sine", 0.04);
    for (let i = 0; i < 8; i++) {
      const f = [2093, 2637, 3136, 3520][i % 4]!;
      k.tone(f, 0.15 + i * 0.27 + Math.random() * 0.1, 0.4, "sine", 0.025, f * 0.98);
    }
  },
  /** A nebula: an airy pad drifting in and out. */
  "ship-nebula"(k) {
    k.swell(0, 3, 0.05, 500, 1400, 3);
    k.tone(220, 0.2, 2.6, "sine", 0.03, 233);
    k.tone(330, 0.5, 2.3, "sine", 0.02, 311);
    k.tone(440, 0.9, 1.9, "triangle", 0.008);
  },
  /** Something very large and gentle singing out there. */
  "ship-whale"(k) {
    k.tone(196, 0, 1.4, "sine", 0.07, 262);
    k.tone(262, 1.3, 1.1, "sine", 0.06, 175);
    k.tone(147, 2.3, 1.4, "sine", 0.07, 196);
    k.tone(392, 0.2, 1.2, "sine", 0.01, 523);
    k.swell(0, 3.6, 0.03, 80, 120, 0.7, "lowpass");
  },
  /** A console beep. */
  "ship-beep"(k) {
    k.tone(1320, 0, 0.07, "square", 0.04);
    k.tone(1760, 0.09, 0.06, "square", 0.03);
  },
  /** The intercom: three soft notes going up, then one down. */
  "ship-chime"(k) {
    k.tone(659, 0, 0.35, "triangle", 0.07);
    k.tone(880, 0.16, 0.35, "triangle", 0.07);
    k.tone(1109, 0.32, 0.45, "triangle", 0.06);
    k.tone(831, 0.62, 0.6, "triangle", 0.05);
  },
};

export const WORDS: Pick<Theme, "labels" | "sounds"> = {
  labels: {
    pets: { dog: "Gasket", cat: "Plum" },
    tvNews: "SHIP NEWS",
    tvWeather: "STAR WEATHER",
    words,
    poke,
    npc,
  },
  sounds,
};
