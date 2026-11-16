// Dusty Annex: words and sounds. Dry, tired and a little bit British.

import type { Theme, SynthKit } from "../../theme.ts";
import type { WeatherKind } from "../../../contract.ts";

const words: Record<string, string> = {
  Biscuit: "Crumpet",
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
  arcade: "Arcade cabinet · insert a coin, hope for the best",
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
    tvNews: "THE BULLETIN",
    tvWeather: "WEATHER (GREY)",
    words,
    poke,
    npc,
  },
  sounds,
  outdoor,
};
