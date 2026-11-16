// Surf Villa: aloha shirts, sunglasses, leis and straw hats; a lifeguard, a
// surf-shop fixer and a smoothie rider; the words and the sounds of the beach.
import type { Theme, VisitorKind } from "../../theme.ts";
import type { Look } from "../../themekit.ts";
import { hash, OUTLINE } from "../../themekit.ts";

const SHORTS = ["#2fa8b0", "#ff7a5c", "#2a4f7a", "#c9b48a", "#4fae84", "#e8453c", "#3a6aa0", "#7a5fb0"];

export function beachLook(look: Look, threadId: string): Look {
  const r = hash(`beach-${threadId}`);
  return {
    ...look,
    pants: SHORTS[r % SHORTS.length]!,
    // Nobody wears a beanie at the beach: a sun cap instead.
    accessory: look.accessory === "beanie" ? "none" : look.accessory,
    hairStyle: look.accessory === "beanie" && look.hairStyle !== "long" ? "cap" : look.hairStyle,
  };
}

export function beachNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // You, in a linen shirt.
      return { ...classic, shirt: "#efe6d2", pants: "#c9b48a", accent: "#ff7a5c" };
    case "guard":
      // The lifeguard: red top, yellow visor.
      return { ...classic, shirt: "#e8453c", pants: "#b8302a", accent: "#ffd166" };
    case "janitor":
      return { ...classic, shirt: "#4fbf9a", pants: "#2a4f7a", accent: "#ffd166" };
    case "technician":
      // The surf-shop fixer: an orange aloha shirt and an aqua cap.
      return { ...classic, shirt: "#ff9f43", pants: "#2f7592", accent: "#3fbfc0", hair: "#d7a24f" };
    case "delivery":
      // Poke bowls and smoothies by bike: lime jacket, pink cap.
      return { ...classic, shirt: "#9fdc5a", pants: "#2a2f40", accent: "#ff6fa3" };
  }
}

const SANDALS = ["#ff7a5c", "#3fbfc0", "#ffd166", "#ff4f7b", "#7fe0d8"];
const LEI = ["#ff4f7b", "#ffd166", "#ffffff", "#ff9fc0", "#ff8a3d"];
const COVERED = new Set(["read", "present", "present-plan"]);
const SITTING = new Set(["type0", "type1", "slump", "sit-back", "nap", "read"]);

/** Flip-flops for everyone; an aloha print, a lei, sunglasses or a straw hat for some. */
export const beachDress: NonNullable<Theme["dress"]> = (ctx, a) => {
  const { x, y, facing, pose, seed } = a;
  const back = facing === "back";
  const side = facing === "left" || facing === "right";
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const bt = 14 + bob;
  const hy = 3 + bob + (pose === "slump" ? 2 : 0) + (pose === "nap" ? 1 : 0);
  const X = (px: number, w: number) => (facing === "left" ? x + 20 - px - w : x + px);
  const put = (px: number, py: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(X(px, w), y + py, w, h);
  };
  const s = seed >>> 0;
  const sitting = a.seated || SITTING.has(pose);
  // Flip-flops.
  const sandal = SANDALS[s % SANDALS.length]!;
  if (!sitting) {
    const legY = bt + 7;
    // Board shorts: bare shins under the shorts, flip-flops below.
    const skin = a.look?.skin;
    if (side) {
      const k = pose === "walk1" ? -1 : pose === "walk3" ? 1 : 0;
      if (skin) {
        put(7 + k, legY + 3, 3, 2, skin);
        put(10 - k, legY + 3, 3, 2, skin);
      }
      put(7 + k, legY + 5, 3, 1, sandal);
      put(10 - k, legY + 5, 3, 1, sandal);
    } else {
      const l = pose === "walk1" ? 1 : 0;
      const r = pose === "walk3" ? 1 : 0;
      if (skin) {
        put(5, legY + 3, 3, 2 - l, skin);
        put(10, legY + 3, 3, 2 - r, skin);
      }
      put(5, legY + 5 - l, 3, 1, sandal);
      put(10, legY + 5 - r, 3, 1, sandal);
    }
  } else if (pose === "nap" || pose === "read" || (a.seated && !back)) {
    put(3, bt + 8, 3, 1, sandal);
    put(12, bt + 8, 3, 1, sandal);
  }
  // An aloha print on about a third of the shirts.
  if (s % 3 === 0 && !COVERED.has(pose)) {
    const petal = "rgba(255,255,255,0.7)";
    for (const [px, py] of back
      ? [
          [6, 1],
          [10, 2],
          [7, 4],
          [11, 5],
        ]
      : [
          [6, 2],
          [10, 3],
          [7, 5],
          [11, 1],
        ]) {
      put(px!, bt + py!, 1, 1, petal);
      put(px! + 1, bt + py!, 1, 1, "rgba(255,230,120,0.75)");
    }
  }
  // A lei.
  if (s % 5 === 0 && pose !== "nap") {
    const pts = back ? [[5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0]] : [[5, 0], [6, 1], [7, 2], [8, 2], [9, 2], [10, 2], [11, 1], [12, 0]];
    pts.forEach(([px, py], i) => put(px!, bt + py!, 1, 1, LEI[(i + s) % LEI.length]!));
  }
  // Sunglasses.
  if (s % 4 === 1 && !back && pose !== "nap") {
    const shift = side ? 1 : 0;
    const lx = 6 + shift;
    const rx = 11 + shift;
    const ey = hy + 5;
    put(lx - 1, ey, 3, 2, OUTLINE);
    put(rx - 1, ey, 3, 2, OUTLINE);
    put(lx + 2, ey, rx - lx - 3, 1, OUTLINE);
    put(lx - 1, ey, 1, 1, "#4a6a8a");
    put(rx - 1, ey, 1, 1, "#4a6a8a");
  }
  // A straw hat.
  if (s % 7 === 3) {
    const straw = "#e8c87a";
    const top = hy - 2;
    put(4, top - 1, 12, 1, OUTLINE);
    put(3, top, 1, 3, OUTLINE);
    put(16, top, 1, 3, OUTLINE);
    put(4, top, 12, 3, straw);
    put(5, top, 4, 1, "#f6dfa0");
    put(4, top + 2, 12, 1, "#e8453c");
    put(1, top + 3, 18, 1, OUTLINE);
    put(2, top + 3, 16, 1, "#d9b260");
    put(1, top + 4, 18, 1, "rgba(42,30,46,0.5)");
  }
};

export const BEACH_LABELS: NonNullable<Theme["labels"]> = {
  tvNews: "SURF REPORT",
  tvWeather: "SWELL WATCH",
  poke: {
    coffee: "Cold-brew bar · pour a cold one",
    kettle: "Blender · whizz up a smoothie",
    vending: "Juice cooler · grab a juice",
    fridge: "Fridge · have a look inside",
    microwave: "Microwave · heat up a poke bowl",
    piano: "Piano · play a beach tune",
    dartboard: "Dartboard · throw a dart",
    printer: "Printer · print a tide chart",
    cooler: "Coconut water · fresh and cold",
    lamp: "Rattan lamp · on/off",
    plant: "Water the plant",
    bin: "Wicker basket · toss some paper",
    clock: "Life-ring clock",
    arcade: "Tiki arcade · insert a coin",
    pingpong: "Table tennis under the sail · serve",
    fishtank: "Rock pool · feed the fish",
    whiteboard: "Cabana whiteboard · threads in plan mode",
    server: "The board shed · the AI cluster · click to train a model",
    couch: "Rattan sofa · bounce on it",
    beanbag: "Beanbag on the sand · squish",
    cornhole: "Cornhole · toss a bag",
    globe: "Spin the globe",
  },
  npc: {
    guard: "The lifeguard on night watch",
    janitor: "Beach cleanup crew · mind the wet deck",
    technician: "The surf-shop fixer · patching things up",
    delivery: "Poke bowls and smoothies for the crew",
    dog: "Biscuit, the beach dog · pet",
    cat: "Mango, the villa parrot · pet",
    roomba: "The hermit crab · send it off (or home)",
  },
  words: {
    Kitchen: "Tiki bar",
    kitchen: "tiki bar",
    Lounge: "Beach lounge",
    lounge: "beach lounge",
    "chatting at the water cooler": "chatting by the coconut water",
    "water cooler": "coconut water",
    "Water cooler": "Coconut water",
    cooler: "coconut water",
    "Meeting room": "Cabana",
    "meeting room": "cabana",
    "Waiting room": "Veranda",
    "waiting room": "veranda",
    "Your office": "Your villa",
    "your office": "your villa",
    Office: "Villa",
    office: "villa",
    "Server room": "Board shed",
    "server room": "board shed",
    Reception: "Front desk",
    "making coffee": "pouring a cold brew",
    "brewing tea": "blending a smoothie",
    "having a tea": "sipping a coconut",
    "picking a snack": "grabbing a juice",
    "snacking at the island": "snacking at the tiki bar",
    "watching the fish": "watching the rock pool",
    "watching TV": "watching the surf report",
    "playing ping-pong": "playing table tennis",
    "a ping-pong match": "a table tennis match",
    "playing arcade games": "playing the tiki arcade",
    "enjoying the garden": "chilling in the dunes",
    "hanging out on the couch": "lounging on the rattan sofa",
    "chatting in the hallway": "chatting on the boardwalk",
    napping: "napping in the sun",
    "dozing off in the library": "dozing off in the hammock nook",
    "reading in the library": "reading in the hammock nook",
  },
};

export const BEACH_SOUNDS: NonNullable<Theme["sounds"]> = {
  // Mango the parrot squawks instead of meowing, and chirrs instead of purring.
  meow: (k) => {
    k.tone(1500, 0, 0.1, "sawtooth", 0.04, 2300);
    k.tone(2300, 0.1, 0.16, "square", 0.03, 1400);
  },
  purr: (k) => {
    for (let i = 0; i < 4; i++) k.tone(900 + i * 60, i * 0.07, 0.06, "triangle", 0.025, 1150);
  },
  // The hermit crab sets off: tiny clicks on the boardwalk.
  roomba: (k) => {
    for (let i = 0; i < 6; i++) k.noise(i * 0.07, 0.03, 0.04, 3200);
  },
  // Waves rolling in and out and a couple of gulls.
  "surf-day": (k) => {
    k.swell(0, 3.2, 0.14, 520, 220, 0.6, "lowpass");
    k.swell(1.5, 2.6, 0.1, 900, 300, 0.5, "lowpass");
    k.noise(0.9, 0.9, 0.025, 2600);
    for (const t0 of [0.3, 1.2, 2.3]) {
      k.tone(1500, t0, 0.18, "triangle", 0.04, 1050);
      k.tone(1320, t0 + 0.21, 0.22, "triangle", 0.03, 880);
    }
  },
  // Gentle surf and crickets in the dune grass.
  "surf-night": (k) => {
    k.swell(0, 3.4, 0.11, 380, 180, 0.6, "lowpass");
    k.swell(1.7, 2.4, 0.07, 600, 220, 0.5, "lowpass");
    for (let b = 0; b < 3; b++) for (let i = 0; i < 4; i++) k.tone(4200, 0.4 + b * 0.8 + i * 0.04, 0.02, "sine", 0.03);
  },
  // A tropical downpour on the deck, the sea underneath.
  "surf-rain": (k) => {
    k.swell(0, 3, 0.16, 2600, 2100, 0.5);
    k.swell(0, 3, 0.12, 420, 200, 0.6, "lowpass");
    for (let i = 0; i < 12; i++) k.tone(1400 + Math.random() * 1600, Math.random() * 2.6, 0.03, "sine", 0.045, 800);
  },
  // A sea breeze through the shutters.
  "surf-wind": (k) => {
    k.swell(0, 3, 0.14, 300, 900, 4);
    k.swell(0.3, 3, 0.11, 450, 200, 0.6, "lowpass");
  },
  // Thunder over the water and heavy surf.
  "surf-storm": (k) => {
    k.noise(0, 0.2, 0.18, 1000);
    k.swell(0.05, 3, 0.42, 110, 50, 0.7, "lowpass");
    k.swell(0, 3, 0.14, 2400, 2000, 0.5);
    k.swell(0.6, 2.4, 0.16, 500, 200, 0.6, "lowpass");
  },
};

export function beachOutdoor(weather: string, night: boolean): string {
  if (weather === "storm") return "surf-storm";
  if (weather === "rain" || weather === "drizzle") return "surf-rain";
  if (weather === "fog") return "foghorn";
  if (weather === "cloudy" || weather === "snow") return "surf-wind";
  return night ? "surf-night" : "surf-day";
}
