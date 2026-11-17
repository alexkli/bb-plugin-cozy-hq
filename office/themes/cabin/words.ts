// Mountain Cabin: what everything's called up here, and the sounds: wind
// over the ridge, snow hushing everything, the chairlift clacking over its
// towers, a chough, a far church bell in the fog, and the fire inside.
import type { WeatherKind } from "../../../contract.ts";
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";

export const LABELS: ThemeLabels = {
  pets: { dog: "Fondue", cat: "Murmel" },
  tvNews: "SUMMIT NEWS",
  tvWeather: "SNOW REPORT",
  poke: {
    coffee: "Copper lever machine · pull a coffee",
    kettle: "Kettle on the wood range · put it on",
    vending: "The hut shop · chocolate and an honesty box",
    fridge: "The icebox · have a look inside",
    microwave: "Warming oven · heat up lunch",
    piano: "The old upright · play a tune",
    dartboard: "Dartboard · throw a dart",
    printer: "Printer · print a trail map",
    cooler: "Spring water barrel",
    lamp: "Your floor lamp · on/off",
    plant: "Water the alpine flowers",
    bin: "Basket · toss some paper",
    arcade: "The old downhill game · insert a coin",
    pingpong: "Ping-pong · serve",
    fishtank: "Trout tank · feed the trout",
    whiteboard: "Route map · threads in plan mode",
    server: "The cold room · AI racks on ice · click to train a model",
    couch: "The red sofa · bounce on it",
    beanbag: "Knitted pouf · squish",
    globe: "Spin the globe",
  },
  npc: {
    guard: "Ski patrol · on the evening rounds",
    janitor: "The hut keeper · sweeping out the snow",
    technician: "The mountain guide · fixing things around the lodge",
    delivery: "Courier on snowshoes · lunch up from the valley",
    kid: "A little skier · bring your kids to the lodge",
    dog: "Fondue, the lodge's big mountain dog · pet",
    cat: "Murmel, the marmot who moved in · pet",
    roomba: "The little snow plow · send it off (or home)",
  },
  words: {
    "Kitchen · cooler": "Lodge kitchen · water barrel",
    "water cooler": "water barrel",
    "Water cooler": "Water barrel",
    cooler: "water barrel",
    kitchen: "lodge kitchen",
    Kitchen: "Lodge kitchen",
    lounge: "great room",
    Lounge: "Great room",
    "in the lounge": "in the great room",
    "Meeting room": "Map room",
    "meeting room": "map room",
    "Planning room": "Map room",
    "planning room": "map room",
    "Waiting room": "Mudroom",
    "waiting room": "mudroom",
    "Your office": "Your study",
    "your office": "your study",
    "Server room": "Cold room",
    "server room": "cold room",
    "server cables": "cold-room cables",
    "server rack": "frosty rack",
    "Games room": "Ski room",
    "games room": "ski room",
    library: "reading loft",
    Library: "Reading loft",
    "String lights": "Fairy lights",
    "string lights": "fairy lights",
    "Open the window": "Open the window to the peaks",
    "at the office": "at the lodge",
    "in the office": "in the lodge",
    "Office TV": "Lodge TV",
    office: "lodge",
    Office: "Lodge",
    Reception: "Hut desk",
    reception: "hut desk",
    "watching TV": "watching TV by the fire",
    "on the couch": "on the sofa",
    "the couch": "the sofa",
    couch: "sofa",
    Beanbag: "Pouf",
    beanbag: "pouf",
    "raiding the fridge": "raiding the icebox",
    "picking a snack": "picking a snack at the hut shop",
    "Vending machine": "Hut shop",
    "vending machine": "hut shop",
    "making coffee": "pulling a coffee",
    "brewing tea": "brewing tea on the range",
    "chatting in the hallway": "chatting in the hall",
    hallway: "hall",
    "watching the fish": "watching the trout",
    "planning at the whiteboard": "planning at the route map",
    "playing arcade games": "playing the old downhill game",
    "enjoying the garden": "enjoying the alpine garden",
    garden: "alpine garden",
  },
};

// ------------------------------------------------------------------ sounds

/** Wind over the ridge: a hollow howl rising and falling, a low rumble under it. */
const wind: SoundRecipe = (k) => {
  k.swell(0, 3, 0.15, 340, 980, 9);
  k.swell(0.7, 2.3, 0.1, 820, 420, 10);
  k.swell(0, 3, 0.05, 90, 140, 0.7, "lowpass");
};

/** Snow falling: everything hushed, a soft breath of wind. */
const snow: SoundRecipe = (k) => {
  k.swell(0, 3, 0.05, 320, 260, 0.5, "lowpass");
  k.swell(0.5, 2.3, 0.05, 600, 900, 6);
  for (let i = 0; i < 5; i++) k.tone(5200 + Math.random() * 1600, 0.3 + Math.random() * 2.2, 0.02, "sine", 0.008);
};

/** A blizzard: wind screaming round the corners, gusts, snow hissing on glass. */
const blizzard: SoundRecipe = (k) => {
  k.swell(0, 3, 0.2, 380, 1300, 11);
  k.swell(0.4, 2.6, 0.14, 1100, 520, 12);
  k.swell(0, 3, 0.1, 2600, 3400, 0.6);
  k.swell(0, 3, 0.08, 80, 120, 0.7, "lowpass");
};

const rain: SoundRecipe = (k) => {
  k.swell(0, 2.8, 0.09, 2800, 2300, 0.5);
  k.swell(0, 2.8, 0.05, 400, 360, 0.7, "lowpass");
  for (let i = 0; i < 20; i++) k.noise(Math.random() * 2.6, 0.03, 0.04 + Math.random() * 0.04, 1100 + Math.random() * 900);
};

/** Fog: muffled, and a church bell far down in the valley. */
const fog: SoundRecipe = (k) => {
  k.swell(0, 3, 0.04, 200, 300, 0.6, "lowpass");
  for (const [at, f] of [
    [0.3, 392],
    [1.6, 392],
  ] as const) {
    k.tone(f, at, 1.2, "sine", 0.05);
    k.tone(f * 2.01, at, 0.8, "sine", 0.02);
    k.tone(f * 2.76, at, 0.5, "sine", 0.012);
  }
};

/** A bright day: the chairlift clacking over a tower, a chough calling, a whoop from the piste. */
const day: SoundRecipe = (k) => {
  k.swell(0, 3, 0.05, 500, 800, 5);
  for (const at of [0.2, 0.32, 1.4, 1.52]) k.noise(at, 0.05, 0.12, 1500);
  k.tone(1900, 0.7, 0.16, "sine", 0.05, 2500);
  k.tone(2500, 0.88, 0.22, "sine", 0.04, 1500);
  k.tone(620, 2.1, 0.35, "triangle", 0.025, 880);
};

/** A cold clear night: wind low over the snow, the cable car's cable humming. */
const night: SoundRecipe = (k) => {
  k.swell(0, 3, 0.06, 240, 420, 6);
  k.tone(110, 0, 2.8, "sine", 0.012, 112);
  k.tone(165, 0.3, 2.4, "sine", 0.006);
};

/** An eagle's cry far up the valley. */
const eagle: SoundRecipe = (k) => {
  k.swell(0, 3, 0.05, 420, 700, 5);
  k.tone(2800, 0.3, 0.5, "sine", 0.05, 1900);
  k.tone(2600, 0.95, 0.35, "sine", 0.035, 1800);
};

export const SOUNDS: Record<string, SoundRecipe> = {
  "cab-wind": wind,
  "cab-snow": snow,
  "cab-storm": blizzard,
  "cab-rain": rain,
  "cab-fog": fog,
  "cab-day": day,
  "cab-night": night,
  "cab-eagle": eagle,
  // The fire: crackles, a flare-up, a log popping.
  "cab-crackle": (k) => {
    k.swell(0, 1.4, 0.05, 300, 500, 0.8, "lowpass");
    for (let i = 0; i < 14; i++) k.noise(Math.random() * 1.3, 0.012, 0.08 + Math.random() * 0.1, 2200 + Math.random() * 2400);
  },
  "cab-whoosh": (k) => {
    k.swell(0, 1.2, 0.22, 120, 600, 0.8, "lowpass");
    for (let i = 0; i < 10; i++) k.noise(0.2 + Math.random(), 0.012, 0.1, 3000);
  },
  "cab-pop": (k) => {
    k.noise(0, 0.04, 0.35, 2600);
    k.noise(0.05, 0.03, 0.15, 4200);
    for (let i = 0; i < 5; i++) k.noise(0.12 + i * 0.05, 0.01, 0.08, 5000);
  },
  // Logs tumbling off the pile.
  "cab-thunk": (k) => {
    for (const [at, f] of [
      [0, 180],
      [0.14, 150],
      [0.26, 210],
      [0.4, 130],
    ] as const) {
      k.tone(f, at, 0.08, "triangle", 0.18, f * 0.7);
      k.noise(at, 0.03, 0.08, 900);
    }
  },
  // A marmot's sharp whistle.
  "cab-marmot": (k) => {
    k.tone(2900, 0, 0.18, "sine", 0.12, 2700);
    k.tone(2900, 0.32, 0.12, "sine", 0.08, 2750);
  },
  // Water on the sauna stones; a door; a thump into the snow.
  "cab-hiss": (k) => {
    k.swell(0, 1.4, 0.2, 5200, 3600, 0.6);
    k.tone(160, 0.05, 0.12, "triangle", 0.05);
  },
  "cab-plunge": (k) => {
    k.swell(0, 1.2, 0.16, 5200, 3600, 0.6);
    k.swell(2.3, 0.5, 0.25, 260, 120, 0.7, "lowpass");
    k.noise(2.32, 0.12, 0.1, 700);
  },
  "cab-poof": (k) => {
    k.swell(0, 0.5, 0.25, 260, 120, 0.7, "lowpass");
    k.noise(0.02, 0.12, 0.1, 700);
  },
  // Cocoa poured into mugs, cheese bubbling in the pot.
  "cab-pour": (k) => {
    k.swell(0, 1.1, 0.08, 900, 1500, 3);
    for (let i = 0; i < 6; i++) k.tone(600 + i * 90, 0.9 + i * 0.05, 0.05, "sine", 0.04);
  },
  "cab-bubble": (k) => {
    for (let i = 0; i < 10; i++) k.tone(240 + Math.random() * 300, i * 0.12, 0.06, "sine", 0.06, 420 + Math.random() * 300);
  },
  // The telescope racked out, a click into focus.
  "cab-scope": (k) => {
    k.swell(0, 0.4, 0.06, 2000, 3600, 4);
    k.noise(0.42, 0.02, 0.12, 3800);
  },
  // Skis clattering down like dominoes.
  "cab-clatter": (k) => {
    for (let i = 0; i < 6; i++) {
      k.tone(420 - i * 30, i * 0.09, 0.06, "square", 0.04, 300);
      k.noise(i * 0.09, 0.03, 0.08, 1800);
    }
  },
  // Ice: a crack shooting across, skates scraping, a sled hissing down.
  "cab-crack": (k) => {
    k.tone(1800, 0, 0.05, "square", 0.06, 300);
    k.noise(0.02, 0.08, 0.14, 2600);
    k.tone(140, 0.05, 0.5, "sine", 0.08, 90);
  },
  "cab-skate": (k) => {
    for (let i = 0; i < 4; i++) k.swell(i * 0.45, 0.4, 0.06, 3200, 2200, 2);
  },
  "cab-swoosh": (k) => {
    k.swell(0, 1.3, 0.14, 1400, 600, 1.5);
    k.tone(700, 0.2, 0.3, "sine", 0.03, 1200);
  },
  // A chair clanking over the lift tower.
  "cab-clank": (k) => {
    k.noise(0, 0.05, 0.16, 1400);
    k.noise(0.13, 0.05, 0.14, 1300);
    k.tone(320, 0, 0.3, "triangle", 0.03, 300);
  },
  // The lift hut's bell.
  "cab-ding": (k) => {
    for (const at of [0, 0.32]) {
      k.tone(1320, at, 0.9, "sine", 0.09, 1310);
      k.tone(2640, at, 0.4, "sine", 0.03);
    }
  },
  // Far off: a slough of snow rumbling down a face.
  "cab-rumble": (k) => {
    k.swell(0, 3, 0.3, 70, 160, 0.7, "lowpass");
    k.swell(0.3, 2.4, 0.1, 400, 900, 1);
  },
};

export function outdoor(weather: WeatherKind, isNight: boolean): string {
  switch (weather) {
    case "storm":
      return "cab-storm";
    case "rain":
    case "drizzle":
      return "cab-rain";
    case "snow":
      return "cab-snow";
    case "fog":
      return "cab-fog";
    case "cloudy":
      return "cab-wind";
    default: {
      if (isNight) return Math.random() < 0.7 ? "cab-night" : "cab-wind";
      const r = Math.random();
      return r < 0.55 ? "cab-day" : r < 0.8 ? "cab-eagle" : "cab-wind";
    }
  }
}
