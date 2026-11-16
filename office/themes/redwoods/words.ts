// Redwood Camp words and sounds: camp names for every place, and the forest
// through the window: birdsong and a creek by day, owls and crickets at night,
// wind in the redwoods and rain drumming on canvas.
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";
import type { WeatherKind } from "../../../contract.ts";

export const LABELS: ThemeLabels = {
  tvNews: "CAMP NEWS",
  tvWeather: "TRAIL WEATHER",
  poke: {
    coffee: "Camp coffee urn · pour a cup",
    kettle: "Enamel kettle · put it on the stove",
    vending: "Camp store cabinet · grab some trail mix",
    fridge: "The old icebox · have a look inside",
    microwave: "Camp oven · heat up lunch",
    piano: "The lodge piano · play a tune",
    dartboard: "Log-round dartboard · throw a dart",
    printer: "Typewriter · type something up",
    cooler: "Water jug",
    lamp: "Your lantern · on/off",
    plant: "Water the fern",
    bin: "Bucket · toss some paper",
    arcade: "Old wooden arcade · insert a coin",
    pingpong: "Lawn ping-pong · serve",
    fishtank: "The trout pond · feed the trout (mind the frog)",
    whiteboard: "Big-tent planning board · threads in plan mode",
    server: "Solar hut · the AI battery bank · click to train a model",
    couch: "The log bench · bounce on it",
    beanbag: "Moss cushion · squish",
    cornhole: "Cornhole · toss a bag",
    globe: "Spin the globe",
  },
  npc: {
    guard: "Park ranger on the evening rounds",
    janitor: "Camp caretaker · raking the needles",
    technician: "The camp fixer · patching things up",
    delivery: "Bike courier with lunch from the valley",
    kid: "A junior ranger · bring your kids to camp day",
    dog: "Juniper, the camp husky · pet",
    cat: "Bandit, the camp raccoon · pet",
    roomba: "The solar mower · send it off (or home)",
  },
  words: {
    "Kitchen · cooler": "Camp kitchen · water jug",
    "water cooler": "water jug",
    "Water cooler": "Water jug",
    kitchen: "camp kitchen",
    Kitchen: "Camp kitchen",
    lounge: "campfire",
    Lounge: "Campfire",
    "Meeting room": "Big tent",
    "meeting room": "big tent",
    "Waiting room": "Porch",
    "waiting room": "porch",
    "Your office": "Your cabin",
    "your office": "your cabin",
    "String lights": "Lanterns",
    "Open the window": "Listen to the woods",
    "string lights": "lanterns",
    "in the lounge": "at the campfire",
    "at the office": "at camp",
    "in the office": "at camp",
    "Office TV": "Camp screen",
    office: "camp",
    Office: "Camp",
    "Server room": "Solar hut",
    "server room": "solar hut",
    "server cables": "battery cables",
    "server rack": "battery bank",
    Reception: "Check-in",
    reception: "check-in",
    "at the desk": "at the camp table",
    "At a desk": "At a camp table",
    "Desk & chair": "Table & chair",
    "Desk = model": "Table = model",
    "watching TV": "watching the outdoor screen",
    "on the couch": "on the log bench",
    "the couch": "the log bench",
    Beanbag: "Moss cushion",
    beanbag: "moss cushion",
    "raiding the fridge": "raiding the icebox",
    "picking a snack": "picking some trail mix",
    "making coffee": "pouring camp coffee",
    "brewing tea": "brewing tea on the stove",
    "chatting in the hallway": "chatting on the boardwalk",
    hallway: "boardwalk",
    "enjoying the garden": "enjoying the fern grove",
    garden: "fern grove",
    library: "reading nook",
    "playing arcade games": "playing the old wooden arcade",
    "watching the fish": "watching the creek fish",
    "planning at the whiteboard": "planning at the board",
  },
};

// ------------------------------------------------------------------ sounds

const birdsong: SoundRecipe = (k) => {
  // A thrush-like phrase, a chickadee, and the creek running underneath.
  k.swell(0, 2.8, 0.05, 1600, 2400, 0.7);
  k.swell(0.3, 2.4, 0.035, 900, 1300, 0.9);
  const phrase = [1850, 2350, 2100, 2650, 2400];
  phrase.forEach((f, i) => k.tone(f, 0.15 + i * 0.13, 0.11, "sine", 0.06, f * (i % 2 ? 0.92 : 1.08)));
  k.tone(3900, 1.25, 0.12, "sine", 0.05, 3700);
  k.tone(3100, 1.42, 0.2, "sine", 0.05, 3000);
  for (let i = 0; i < 4; i++) k.tone(4200 + i * 60, 1.9 + i * 0.07, 0.03, "sine", 0.035);
};

const nightForest: SoundRecipe = (k) => {
  // Crickets, an owl's two-note hoot, the creek low and soft.
  k.swell(0, 2.8, 0.025, 1200, 1500, 0.8);
  for (let burst = 0; burst < 4; burst++) for (let i = 0; i < 4; i++) k.tone(4500, burst * 0.55 + i * 0.04, 0.025, "sine", 0.035);
  k.tone(392, 0.4, 0.32, "sine", 0.11, 370);
  k.tone(370, 0.85, 0.22, "sine", 0.07, 350);
  k.tone(392, 1.15, 0.5, "sine", 0.1, 360);
};

const rainOnCanvas: SoundRecipe = (k) => {
  // A soft roar plus taps drumming on the tent, and drips off the edge.
  k.swell(0, 2.8, 0.1, 1800, 1500, 0.5);
  k.swell(0, 2.8, 0.05, 420, 380, 0.7, "lowpass");
  for (let i = 0; i < 26; i++) k.noise(Math.random() * 2.6, 0.035, 0.05 + Math.random() * 0.04, 900 + Math.random() * 900);
  for (let i = 0; i < 4; i++) k.tone(1300 + Math.random() * 500, 0.3 + Math.random() * 2.2, 0.06, "sine", 0.04, 700);
};

const windInRedwoods: SoundRecipe = (k) => {
  // Wind high in the canopy and a slow creak of a trunk.
  k.swell(0, 3, 0.14, 240, 700, 3);
  k.swell(0.8, 2.2, 0.09, 600, 300, 4);
  k.tone(130, 1, 0.7, "sawtooth", 0.012, 112);
};

const storm: SoundRecipe = (k) => {
  rainOnCanvas(k);
  k.noise(0.1, 0.15, 0.16, 1000);
  k.swell(0.15, 2.8, 0.4, 110, 50, 0.7, "lowpass");
};

const fogDrip: SoundRecipe = (k) => {
  // Fog dripping off the needles, a distant raven.
  k.swell(0, 2.6, 0.03, 500, 600, 0.6, "lowpass");
  for (let i = 0; i < 6; i++) k.tone(1100 + Math.random() * 600, 0.2 + i * 0.4 + Math.random() * 0.1, 0.05, "sine", 0.05, 650);
  k.tone(420, 1.4, 0.18, "square", 0.02, 380);
  k.tone(400, 1.7, 0.2, "square", 0.018, 360);
};

const snowHush: SoundRecipe = (k) => {
  k.swell(0, 3, 0.06, 300, 500, 2);
  k.tone(2600, 1.2, 0.08, "sine", 0.03, 2500);
};

// ------------------------------------------------------------------ things to click

/** The campfire, the giants and the creek: hover texts and what people say there. */
export const CAMP = {
  hover: {
    fire: "Campfire · gather round",
    tree: "A giant redwood · who lives up there?",
    creek: "The creek · what's in the water?",
  },
  activity: {
    smores: "toasting marshmallows",
    sing: "singing round the campfire",
    ghost: "telling ghost stories",
  },
  /** [seconds after everyone's there, who (by spot), words, sound]. Spot 1 is the one whose marshmallow catches fire. */
  smores: [
    [0.4, 0, "Marshmallow time!"],
    [3.4, 2, "Low and slow. Golden brown."],
    [6, 1, "Uh-oh. Mine's on fire!", "rw-whoosh"],
    [7.5, 0, "Blow on it, quick!"],
    [8.6, 1, "Fwooo!", "rw-puff"],
    [10.8, 1, "…crispy is a flavor, right?"],
    [13.2, 2, "S'more, please!"],
  ],
  sing: [
    [0.3, -1, "", "rw-strum"],
    [0.5, 0, "♪ Under the redwoods, tall and wide… ♪"],
    [5.4, 1, "♪ …a crackling fire, the stars outside ♪"],
    [7.2, -1, "", "rw-strum"],
    [10.2, 2, "♪ la la la, la-la laaa ♪"],
    [13.4, -1, "", "rw-strum"],
    [13.6, 0, "♪ …and nobody's checking their inbox! ♪"],
    [16.6, 1, "Encore!"],
  ],
  ghost: [
    [0.3, -1, "", "rw-spooky"],
    [0.6, 0, "It was a night just like this one…"],
    [4.8, 0, "…a twig snapped behind the tents…"],
    [8.8, 1, "W-what was it?"],
    [11.2, 0, "…THE RACCOON!", "rw-boo"],
    [11.7, 1, "Eek!"],
    [12, 2, "Eeek!"],
    [14.2, 0, "Hehe. Gotcha."],
  ],
  bonfire: ["Whoa!", "Toasty!", "Who threw on the big log?"],
  popcorn: ["Popcorn!", "Pop, pop, pop!", "Save me some!"],
  ow: ["Ow!", "Hey! A pinecone.", "Bonk. Thanks, tree."],
} as const;

/** One strum per beat: down strokes, then a lighter up stroke, through G C D G. */
const strum: SoundRecipe = (k) => {
  const chords = [
    [196, 247, 294, 392],
    [262, 330, 392, 523],
    [147, 220, 294, 370],
    [196, 247, 294, 392],
  ];
  for (let beat = 0; beat < 16; beat++) {
    const chord = chords[Math.floor(beat / 4)]!;
    const up = beat % 2 === 1;
    const notes = up ? [...chord].reverse() : chord;
    notes.forEach((f, j) => k.tone(f, beat * 0.42 + j * 0.016, up ? 0.5 : 1, "triangle", up ? 0.022 : 0.034, f * 0.998));
  }
};

const crackle = (k: Parameters<SoundRecipe>[0], from: number, dur: number, n: number, vol: number) => {
  for (let i = 0; i < n; i++) k.noise(from + ((i * 0.6180339) % 1) * dur, 0.025, vol * (0.6 + ((i * 7) % 5) / 10), 2200 + ((i * 13) % 7) * 300);
};

const bonfire: SoundRecipe = (k) => {
  k.swell(0, 1.2, 0.12, 200, 1500, 1.2);
  k.swell(0.5, 2.6, 0.06, 500, 380, 0.6, "lowpass");
  crackle(k, 0.3, 2.6, 22, 0.09);
};

const popcorn: SoundRecipe = (k) => {
  // A few early pops, a flurry, a last stray one.
  const at = [0.5, 0.95, 1.3, 1.5, 1.65, 1.8, 1.9, 2.05, 2.15, 2.3, 2.38, 2.5, 2.7, 2.85, 3.1, 3.4, 3.9, 4.6];
  at.forEach((s, i) => {
    k.noise(s, 0.03, 0.14, 1600 + (i % 5) * 400);
    k.tone(700 + (i % 4) * 160, s, 0.03, "square", 0.018, 500);
  });
  crackle(k, 0, 4.8, 10, 0.04);
};

const SFX: Record<string, SoundRecipe> = {
  "rw-strum": strum,
  "rw-bonfire": bonfire,
  "rw-popcorn": popcorn,
  "rw-crackle": (k) => {
    k.swell(0, 2, 0.04, 500, 420, 0.6, "lowpass");
    crackle(k, 0, 2, 16, 0.07);
  },
  "rw-whoosh": (k) => k.swell(0, 0.5, 0.09, 300, 1700, 2),
  "rw-puff": (k) => {
    k.swell(0, 0.35, 0.08, 1000, 300, 1);
    k.noise(0.02, 0.18, 0.05, 600);
  },
  "rw-spooky": (k) => {
    k.tone(110, 0, 3, "sine", 0.06, 104);
    k.tone(165, 0.6, 2.4, "sine", 0.03, 156);
    k.swell(0, 3, 0.03, 300, 500, 2);
  },
  "rw-boo": (k) => {
    for (const [f, v] of [
      [233, 0.04],
      [277, 0.035],
      [330, 0.03],
    ] as const) k.tone(f, 0, 0.55, "sawtooth", v, f * 0.94);
    k.noise(0, 0.15, 0.08, 500);
  },
  "rw-owl": (k) => {
    k.tone(392, 0, 0.35, "sine", 0.1, 372);
    k.tone(370, 0.6, 0.18, "sine", 0.07, 360);
    k.tone(392, 0.85, 0.5, "sine", 0.09, 360);
  },
  "rw-scurry": (k) => {
    for (let i = 0; i < 12; i++) k.noise(i * 0.055, 0.02, 0.05, 3400);
    k.tone(3200, 0.75, 0.05, "sine", 0.03, 3700);
  },
  "rw-knock": (k) => {
    for (let b = 0; b < 2; b++) {
      for (let i = 0; i < 8; i++) {
        k.noise(b * 0.9 + i * 0.06, 0.02, 0.14, 1300);
        k.tone(720, b * 0.9 + i * 0.06, 0.02, "square", 0.018);
      }
    }
  },
  "rw-pinecone": (k) => {
    k.tone(1400, 0, 0.32, "sine", 0.02, 700);
    k.tone(320, 0.34, 0.09, "square", 0.06, 180);
    k.noise(0.34, 0.06, 0.08, 900);
    k.tone(260, 0.52, 0.06, "square", 0.03, 200);
  },
  "rw-flutter": (k) => {
    for (let i = 0; i < 8; i++) k.noise(i * 0.045, 0.03, 0.05, 700);
    k.tone(2900, 0.1, 0.08, "sine", 0.05, 3400);
    k.tone(3300, 0.26, 0.07, "sine", 0.04, 2800);
  },
  "rw-splash": (k) => {
    k.swell(0, 0.5, 0.12, 2400, 900, 0.9);
    for (let i = 0; i < 4; i++) k.tone(1300 + i * 170, 0.22 + i * 0.07, 0.04, "sine", 0.04, 800);
  },
  "rw-plop": (k) => {
    k.tone(180, 0, 0.12, "square", 0.025, 150);
    k.tone(170, 0.22, 0.12, "square", 0.022, 140);
    k.tone(700, 1.25, 0.12, "sine", 0.08, 220);
    k.noise(1.25, 0.1, 0.05, 1500);
  },
  "rw-quack": (k) => {
    k.tone(500, 0, 0.13, "sawtooth", 0.035, 420);
    k.tone(480, 0.22, 0.15, "sawtooth", 0.035, 400);
    k.swell(0, 1.2, 0.03, 1400, 1700, 0.8);
  },
  "rw-trickle": (k) => {
    k.swell(0, 1.6, 0.04, 1400, 1800, 0.8);
    for (let i = 0; i < 4; i++) k.tone(1500 + i * 120, 0.2 + i * 0.3, 0.05, "sine", 0.03, 1100);
  },
  "rw-cub": (k) => {
    k.swell(0, 0.5, 0.1, 2400, 900, 0.9);
    k.tone(110, 0.55, 0.45, "sawtooth", 0.025, 88);
    k.swell(1.3, 0.45, 0.08, 2200, 900, 0.9);
  },
};

export const SOUNDS: Record<string, SoundRecipe> = {
  "rw-day": birdsong,
  "rw-night": nightForest,
  "rw-rain": rainOnCanvas,
  "rw-wind": windInRedwoods,
  "rw-storm": storm,
  "rw-fog": fogDrip,
  "rw-snow": snowHush,
  ...SFX,
};

export function outdoor(weather: WeatherKind, night: boolean): string {
  if (weather === "storm") return "rw-storm";
  if (weather === "rain" || weather === "drizzle") return "rw-rain";
  if (weather === "snow") return "rw-snow";
  if (weather === "fog") return "rw-fog";
  if (weather === "cloudy") return night ? "rw-night" : "rw-wind";
  return night ? "rw-night" : "rw-day";
}
