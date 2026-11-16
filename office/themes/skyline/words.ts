// Sky Loft: what things are called, and what you hear with the window open,
// sixty-odd floors up.
import type { WeatherKind } from "../../../contract.ts";
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";

export const LABELS: ThemeLabels = {
  tvNews: "MARKETS",
  tvWeather: "CITY WEATHER",
  poke: {
    coffee: "Espresso machine · pull a shot",
    kettle: "Gooseneck kettle · put it on",
    vending: "Micro-market · grab a snack",
    fridge: "Fridge · have a look inside",
    microwave: "Microwave · heat up lunch",
    piano: "Baby grand · play a tune",
    printer: "Printer · print something",
    cooler: "Sparkling water tap",
    plant: "Water the fiddle-leaf fig",
    bin: "Bin · toss some paper",
    arcade: "Vintage arcade · insert a coin",
    pingpong: "Ping-pong table · serve",
    fishtank: "Discus aquarium · feed the fish",
    whiteboard: "Boardroom glass board · threads in plan mode",
    server: "Server closet · the AI cluster · click to train a model",
    couch: "The sofa · bounce on it",
    beanbag: "Leather beanbag · squish",
    globe: "Spin the globe",
    lamp: "Your floor lamp · on/off",
  },
  npc: {
    guard: "Building security · on the evening rounds",
    janitor: "Cleaning crew · mind the polished floor",
    technician: "Facilities · fixing things around the floor",
    delivery: "Food courier · lunch for the team",
    dog: "Biscuit, the loft's French bulldog · pet",
    cat: "Pixel, the loft's grey cat · pet",
    roomba: "The robot vacuum · on its rounds",
  },
  words: {
    "water cooler": "sparkling water tap",
    "Water cooler": "Sparkling water tap",
    cooler: "water tap",
    kitchen: "espresso bar",
    Kitchen: "Espresso bar",
    "waiting room": "reception",
    "Waiting room": "Reception",
    "meeting room": "boardroom",
    "Meeting room": "Boardroom",
    "Planning room": "Boardroom",
    "planning room": "boardroom",
    "server room": "server closet",
    "Server room": "Server closet",
    "Vending machine": "Micro-market",
    "vending machine": "micro-market",
    garden: "sky garden",
    couch: "sofa",
  },
};

export const SOUNDS: Record<string, SoundRecipe> = {
  // Traffic far below, a couple of horns.
  "sky-traffic": (k) => {
    k.swell(0, 3, 0.07, 160, 300, 0.6, "lowpass");
    k.swell(0.3, 2.4, 0.03, 900, 1400, 0.8);
    k.tone(415, 0.9, 0.16, "square", 0.018);
    k.tone(415, 1.12, 0.1, "square", 0.018);
    k.tone(349, 2.0, 0.32, "sawtooth", 0.01);
  },
  // A siren wailing down an avenue.
  "sky-siren": (k) => {
    k.swell(0, 3.2, 0.05, 160, 280, 0.6, "lowpass");
    k.tone(700, 0.2, 0.9, "sine", 0.03, 1050);
    k.tone(1050, 1.1, 0.9, "sine", 0.03, 700);
    k.tone(700, 2.0, 0.9, "sine", 0.02, 1000);
  },
  // A helicopter passing by the glass.
  "sky-heli": (k) => {
    k.swell(0, 3, 0.04, 140, 220, 0.7, "lowpass");
    for (let i = 0; i < 38; i++) {
      const env = Math.sin((i / 38) * Math.PI);
      k.noise(i * 0.075, 0.04, 0.02 + env * 0.07, 240 + env * 120);
    }
    k.tone(68, 0, 2.8, "sawtooth", 0.008, 62);
  },
  // Wind whistling at the top of the tower.
  "sky-wind": (k) => {
    k.swell(0, 3, 0.13, 300, 1150, 7);
    k.swell(0.6, 2.4, 0.08, 760, 380, 8);
    k.swell(0, 3, 0.04, 110, 160, 0.7, "lowpass");
  },
  // Rain drumming on glass, wet tires below.
  "sky-rain": (k) => {
    k.swell(0, 2.8, 0.1, 3300, 2600, 0.5);
    for (let i = 0; i < 18; i++) k.tone(2200 + Math.random() * 2200, Math.random() * 2.6, 0.015, "sine", 0.04, 1500);
    k.swell(0.5, 1.6, 0.05, 600, 1200, 1);
  },
  "sky-storm": (k) => {
    k.swell(0, 2.8, 0.1, 3300, 2600, 0.5);
    k.noise(0.1, 0.18, 0.16, 1100);
    k.swell(0.15, 3, 0.4, 110, 55, 0.7, "lowpass");
    k.swell(0.5, 2, 0.22, 80, 50, 0.7, "lowpass");
  },
  // The city at night: a low hum, a far siren, one horn.
  "sky-night": (k) => {
    k.swell(0, 3.2, 0.05, 120, 200, 0.6, "lowpass");
    k.tone(640, 0.6, 1.1, "sine", 0.012, 900);
    k.tone(900, 1.7, 1.1, "sine", 0.01, 640);
    k.tone(392, 2.6, 0.2, "square", 0.008);
  },
  // A foghorn on the river, muffled traffic.
  "sky-fog": (k) => {
    k.swell(0, 3, 0.05, 140, 220, 0.6, "lowpass");
    k.tone(92, 0.2, 1.8, "sawtooth", 0.03);
    k.tone(184, 0.2, 1.8, "sine", 0.05);
  },
  // Snow: everything hushed, a soft wind.
  "sky-snow": (k) => {
    k.swell(0, 3, 0.05, 380, 300, 0.5, "lowpass");
    k.swell(0.4, 2.4, 0.07, 500, 900, 5);
  },
};

export function skylineOutdoor(weather: WeatherKind, night: boolean): string {
  switch (weather) {
    case "storm":
      return "sky-storm";
    case "rain":
    case "drizzle":
      return "sky-rain";
    case "snow":
      return "sky-snow";
    case "fog":
      return "sky-fog";
    case "cloudy":
      return "sky-wind";
    default: {
      const r = Math.random();
      if (night) return r < 0.6 ? "sky-night" : "sky-siren";
      return r < 0.45 ? "sky-traffic" : r < 0.7 ? "sky-heli" : r < 0.9 ? "sky-siren" : "sky-wind";
    }
  }
}
