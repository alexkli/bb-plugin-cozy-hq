// Coffee Shop: what everything's called in the café, and its sounds: the
// street outside the shop windows, rain on the glass, the espresso machine
// hissing, the milk steaming, the grinder, the brass bell over the door,
// cups clinking; the café dog's woof and the shop cat.
import type { WeatherKind } from "../../../contract.ts";
import type { SoundRecipe, Theme, ThemeLabels } from "../../theme.ts";

const LABELS: ThemeLabels = {
  pets: { dog: "Mocha", cat: "Biscotti" },
  tvNews: "TODAY'S SPECIALS",
  tvWeather: "WEATHER OUTSIDE",
  poke: {
    coffee: "The espresso machine · pull a shot (oat milk's extra)",
    kettle: "The hot-water tap · for the tea people",
    vending: "Drinks cooler · cold brew, lemonade, sparkling",
    fridge: "The cake fridge · have a look inside",
    microwave: "Panini press · warm one up",
    piano: "The old upright · play a tune (requests welcome)",
    dartboard: "Dartboard · throw a dart",
    printer: "Order printer · tickets for the baristas, the Wi-Fi password on every one",
    cooler: "Water station · cucumber and mint, help yourself",
    lamp: "Your reading lamp · on/off",
    plant: "Water the plant · the baristas forget",
    bin: "Bus tub · cups, plates and a lost spoon",
    clock: "The clock over the fire · five minutes slow, nobody minds",
    arcade: "The vintage cabinet · a coin from the tip jar?",
    pingpong: "Ping-pong · serve",
    fishtank: "Feed the fish · they live in a coffee cup",
    whiteboard: "The chalkboard at the reserved table · threads in plan mode",
    server: "The storeroom · the router, bean sacks and the AI box · click to train a model",
    couch: "The chesterfield by the fire · bounce on it",
    beanbag: "Knitted pouf · squish",
    cornhole: "Cornhole · toss a bag",
    globe: "Spin the globe · pick next month's single origin",
  },
  npc: {
    guard: "A parking warden · peeking in at the pastries",
    janitor: "The closing barista · mopping up, stacking chairs",
    technician: "The espresso tech · descaling, calibrating, sighing",
    delivery: "The bean delivery · a sack of fresh roast on the shoulder",
    kid: "A little regular · babyccino, extra foam",
    dog: "Mocha, the café dog · naps by the door · pet",
    cat: "Biscotti, the shop cat · owns the windowsill · pet",
    roomba: "The sweeping robot · after the croissant crumbs · send it off (or home)",
  },
  words: {
    // Places.
    "Kitchen · cooler": "Counter · water station",
    kitchen: "counter",
    Kitchen: "Counter",
    "water cooler": "water station",
    "Water cooler": "Water station",
    cooler: "water station",
    "in the lounge": "by the fire",
    lounge: "fireside corner",
    Lounge: "Fireside corner",
    "Waiting room": "Pickup",
    "waiting room": "pickup counter",
    Reception: "Pickup",
    reception: "pickup",
    "Meeting room": "Reserved table",
    "meeting room": "reserved table",
    "Planning room": "Reserved table",
    "planning room": "reserved table",
    whiteboard: "chalkboard",
    Whiteboard: "Chalkboard",
    "Your office": "Your snug",
    "your office": "your snug",
    "Server room": "Storeroom",
    "server room": "storeroom",
    "the AI cluster": "the AI box",
    "server cables": "storeroom cables",
    "server rack": "router shelf",
    "Games room": "Back corner",
    "games room": "back corner",
    library: "bookshelf corner",
    Library: "Bookshelf corner",
    garden: "patio",
    hallway: "aisle",
    "String lights": "Café lights",
    "string lights": "café lights",
    "Open the window": "Open the shop window",
    "Office TV": "Specials screen",
    "at the office": "at the café",
    "in the office": "in the café",
    "office event": "café get-together",
    "an office event": "a café get-together",
    "Office events": "Café get-togethers",
    "Office party": "Café party",
    "office party": "café party",
    "Team lunch": "Lunch special",
    "team lunch": "lunch special",
    "Desk & chair": "Laptop & chair",
    "Desk = model": "Laptop = model",
    "At a desk": "At a table",
    // Furniture.
    "on the couch": "on the chesterfield",
    "the couch": "the chesterfield",
    couch: "chesterfield",
    Beanbag: "Pouf",
    beanbag: "pouf",
    "Vending machine": "Drinks cooler",
    "vending machine": "drinks cooler",
    // What people are up to.
    "at the desk": "at a café table",
    "making coffee": "ordering a flat white",
    "brewing tea": "ordering a chai",
    "having a tea": "having a chai",
    "picking a snack": "grabbing a cold brew",
    "raiding the fridge": "eyeing the cakes",
    "snacking at the island": "nibbling a croissant",
    "watching TV": "warming up by the fire",
    "hanging out on the couch": "curled up on the chesterfield",
    "chatting at the water cooler": "chatting at the water station",
    "chatting in the hallway": "chatting by the counter",
    "planning at the whiteboard": "planning at the chalkboard",
    "planning in the meeting room": "planning at the reserved table",
    "going through the plans": "going through the plans over a cortado",
    "waiting for you": "waiting at the pickup for you",
    "going over a draft with you": "going over a draft with you in the snug",
    "playing the piano": "playing the old upright",
    "playing arcade games": "playing the vintage cabinet",
    "watching the fish": "watching the fish in their cup",
    napping: "dozing on a pouf",
    "reading in the library": "reading by the bookshelf",
    "dozing off in the library": "dozing off by the bookshelf",
    "enjoying the garden": "sitting out on the patio",
    "poking at the server cables": "jiggling the router",
    "fixing the server rack": "rebooting the router (again)",
    "coffee with a colleague": "a cortado with a colleague",
  },
};

// ------------------------------------------------------------------ sounds

/** The street outside: traffic going by, footsteps, a bike bell. */
const street: SoundRecipe = (k) => {
  k.swell(0, 2.8, 0.06, 140, 220, 0.8, "lowpass");
  k.swell(0.6, 1.6, 0.05, 400, 900, 0.9);
  for (let i = 0; i < 6; i++) k.noise(0.3 + i * 0.28, 0.03, 0.03, 1800);
  k.tone(2350, 1.9, 0.18, "sine", 0.04);
  k.tone(2350, 2.15, 0.22, "sine", 0.035);
  k.tone(4700, 1.9, 0.12, "sine", 0.012);
};

/** The street at night: a low hum, one car going by, a far dog. */
const nightStreet: SoundRecipe = (k) => {
  k.swell(0, 2.8, 0.035, 90, 130, 0.7, "lowpass");
  k.swell(0.8, 1.6, 0.05, 220, 700, 0.8);
  k.tone(310, 2.2, 0.12, "triangle", 0.02, 250);
};

/** Rain running down the shop windows, drops ticking on the awning. */
const rainWindow: SoundRecipe = (k) => {
  k.swell(0, 2.8, 0.1, 2600, 2200, 0.5);
  k.swell(0, 2.8, 0.05, 300, 260, 0.7, "lowpass");
  for (let i = 0; i < 18; i++) k.tone(1400 + Math.random() * 1400, Math.random() * 2.6, 0.025, "sine", 0.035, 800);
};

/** Wind round the corner and down the street. */
const wind: SoundRecipe = (k) => {
  k.swell(0, 2.8, 0.1, 300, 800, 7);
  k.swell(0.6, 2, 0.06, 700, 380, 8);
};

/** The espresso machine: the pump's hum, a hiss, the shot dripping into the cup. */
const espresso: SoundRecipe = (k) => {
  k.tone(118, 0, 1.4, "sawtooth", 0.025, 112);
  k.swell(0, 1.4, 0.05, 600, 900, 1, "lowpass");
  k.swell(1.3, 0.5, 0.08, 3200, 4200, 0.6, "highpass");
  for (let i = 0; i < 7; i++) k.tone(900 + i * 40, 0.3 + i * 0.15, 0.04, "sine", 0.03, 600);
};

/** Milk steaming: the wand's hiss rising to a screech and a soft tap on the counter. */
const steam: SoundRecipe = (k) => {
  k.swell(0, 1.6, 0.09, 2400, 5200, 1.2, "highpass");
  k.tone(1800, 0.9, 0.6, "sine", 0.015, 2600);
  k.noise(1.7, 0.05, 0.08, 400);
};

/** The burr grinder: a gritty whirr spinning up and down. */
const grind: SoundRecipe = (k) => {
  k.tone(160, 0, 1.3, "sawtooth", 0.04, 210);
  k.swell(0, 1.3, 0.08, 900, 2600, 1.5);
  for (let i = 0; i < 16; i++) k.noise(i * 0.08, 0.03, 0.04, 3000 + Math.random() * 1500);
};

/** The brass bell over the shop door, jingling as it swings. */
const shopBell: SoundRecipe = (k) => {
  for (let i = 0; i < 5; i++) {
    const f = [2093, 2637, 2349, 2794, 2489][i]!;
    k.tone(f, i * 0.07, 0.45 - i * 0.05, "sine", 0.05 - i * 0.006);
    k.tone(f * 2.4, i * 0.07, 0.15, "sine", 0.012);
  }
};

/** Cups and saucers clinking. */
const clink: SoundRecipe = (k) => {
  k.tone(3100, 0, 0.12, "triangle", 0.05, 2900);
  k.tone(3700, 0.14, 0.1, "triangle", 0.04, 3500);
  k.tone(2600, 0.32, 0.18, "sine", 0.03);
};

const sounds: Record<string, SoundRecipe> = {
  street,
  "night-street": nightStreet,
  "rain-window": rainWindow,
  "street-wind": wind,
  espresso,
  steam,
  grind,
  "shop-bell": shopBell,
  clink,
  // The office's own sounds, café style: the door rings its bell, the machine pulls a shot.
  door(k) {
    k.tone(180, 0, 0.05, "triangle", 0.18);
    shopBell(k);
  },
  brew: espresso,
  // Mocha's scruffy woof and Biscotti's chirpy meow.
  bark(k) {
    k.noise(0, 0.08, 0.06, 500);
    k.tone(260, 0.01, 0.1, "square", 0.05, 190);
    k.tone(280, 0.22, 0.09, "square", 0.04, 200);
  },
  meow(k) {
    [700, 880].forEach((f, i) => k.tone(f, i * 0.08, 0.07, "triangle", 0.03, f * 1.1));
    k.tone(900, 0.22, 0.25, "triangle", 0.03, 620);
  },
};

function outdoor(weather: WeatherKind, night: boolean): string {
  if (weather === "storm") return "thunder";
  if (weather === "rain" || weather === "drizzle") return "rain-window";
  if (weather === "snow" || weather === "fog") return night ? "night-street" : "street-wind";
  if (night) return "night-street";
  return "street";
}

export const WORDS: Pick<Theme, "labels" | "sounds" | "outdoor"> = { labels: LABELS, sounds, outdoor };
