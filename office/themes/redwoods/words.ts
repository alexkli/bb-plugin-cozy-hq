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

export const SOUNDS: Record<string, SoundRecipe> = {
  "rw-day": birdsong,
  "rw-night": nightForest,
  "rw-rain": rainOnCanvas,
  "rw-wind": windInRedwoods,
  "rw-storm": storm,
  "rw-fog": fogDrip,
  "rw-snow": snowHush,
};

export function outdoor(weather: WeatherKind, night: boolean): string {
  if (weather === "storm") return "rw-storm";
  if (weather === "rain" || weather === "drizzle") return "rw-rain";
  if (weather === "snow") return "rw-snow";
  if (weather === "fog") return "rw-fog";
  if (weather === "cloudy") return night ? "rw-night" : "rw-wind";
  return night ? "rw-night" : "rw-day";
}
