// School scenery: what things are called, and what you hear out the window.
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";
import type { WeatherKind } from "../../../contract.ts";

export const LABELS: ThemeLabels = {
  tvNews: "ANNOUNCEMENTS",
  tvWeather: "RECESS FORECAST",
  poke: {
    coffee: "Teachers' coffee maker · brew a pot",
    kettle: "Kettle · tea for the staff room",
    vending: "Book vending machine · trade a token for a book",
    fridge: "Milk fridge · white or chocolate?",
    microwave: "Microwave · warm up a lunch",
    piano: "Music corner piano · play a tune",
    dartboard: "Soft-dart target · take a shot",
    printer: "Copier · run off some worksheets",
    cooler: "Water fountain · take a sip",
    lamp: "Your desk lamp · on/off",
    plant: "Water the class sunflower",
    bin: "Recycling bin · toss some paper",
    clock: "School clock",
    arcade: "Math quiz machine · press start",
    pingpong: "Gym ping-pong table · serve",
    fishtank: "Class aquarium · feed the fish and Shelly the turtle",
    whiteboard: "Chalkboard · threads in plan mode",
    bell: "Front office bell",
    boss: "That's you, the principal · whistle for Biscuit",
    server: "Computer lab · the AI cluster · click to train a model",
    couch: "The reading couch · bounce on it",
    beanbag: "Reading cushion · squish",
    cornhole: "Beanbag toss · throw one",
    globe: "Spin the globe",
  },
  npc: {
    guard: "Hall monitor · making the rounds",
    janitor: "The custodian · mind the wet floor",
    technician: "The IT teacher · fixing things around school",
    delivery: "Pizza day! Lunch delivery for the class",
    kid: "A student on a class visit",
    dog: "Biscuit, the school reading dog · pet",
    cat: "Clover, the class bunny · pet",
    roomba: "The ladybug robot · send it off (or home)",
  },
  words: {
    // Places
    "meeting room": "teachers' room",
    "Meeting room": "Teachers' room",
    "Planning room whiteboard": "Teachers' room chalkboard",
    whiteboard: "chalkboard",
    "Waiting room": "Hallway bench",
    "waiting room": "hallway bench",
    "Your office": "Principal's office",
    kitchen: "cafeteria",
    Kitchen: "Cafeteria",
    lounge: "library corner",
    Lounge: "Library corner",
    "water cooler": "water fountain",
    cooler: "fountain",
    "Server room": "Computer lab",
    "server room": "computer lab",
    "server cables": "computer lab cables",
    "server rack": "computer lab rack",
    garden: "school garden",
    island: "lunch counter",
    blueprint: "lesson plan",
    Beanbag: "Reading cushion",
    "At a desk": "At a school desk",
    "at the desk": "at their school desk",
    "Desk & chair": "School desk & chair",
    // Activities
    "watching TV": "watching the smartboard",
    "watching the fish": "watching the class turtle",
    "raiding the fridge": "grabbing a milk",
    "picking a snack": "picking a book from the book machine",
    "playing arcade games": "playing math games",
    "playing darts": "playing soft darts",
    "a game of darts": "a game of soft darts",
    napping: "napping on a reading cushion",
    "Office events": "School events",
    "String lights": "Paper bunting",
    "office event": "school event",
    "Office party": "School party",
    "Team lunch": "Pizza day",
    "team lunch": "pizza day",
    "Darts night": "Soft-dart night",
    "Bring your kids to work day": "Little buddies day",
  },
};

// ------------------------------------------------------------------ sounds

export const SOUNDS: Record<string, SoundRecipe> = {
  // Recess: kids shouting and laughing far off, then a whistle or the bell.
  "school-day": (k) => {
    k.swell(0, 3, 0.05, 700, 1300, 0.7);
    for (let i = 0; i < 12; i++) {
      const f = 520 + Math.random() * 700;
      const t0 = Math.random() * 2.2;
      k.tone(f, t0, 0.1 + Math.random() * 0.18, "triangle", 0.022, f * (0.75 + Math.random() * 0.6));
    }
    if (Math.random() < 0.45) {
      // The electric school bell.
      for (let i = 0; i < 26; i++) k.tone(i % 2 ? 1046 : 1108, 2 + i * 0.035, 0.03, "square", 0.018);
    } else {
      // The gym teacher's whistle.
      k.tone(2350, 2.2, 0.16, "sine", 0.05, 2500);
      k.tone(2350, 2.45, 0.32, "sine", 0.05, 2200);
    }
  },
  // Night: crickets in the schoolyard and the lamp's hum.
  "school-night": (k) => {
    k.swell(0, 2.6, 0.02, 240, 300, 0.5, "lowpass");
    for (const [base, off] of [
      [4400, 0],
      [3800, 0.4],
    ] as const) {
      for (let burst = 0; burst < 3; burst++) {
        for (let n = 0; n < 5; n++) k.tone(base, off + burst * 0.7 + n * 0.035, 0.022, "sine", 0.04);
      }
    }
  },
  // Rain drumming on the windows and dripping off the sill.
  "school-rain": (k) => {
    k.swell(0, 2.8, 0.12, 2800, 2300, 0.5);
    k.swell(0, 2.8, 0.05, 650, 550, 0.6);
    for (let i = 0; i < 16; i++) k.tone(2600 + Math.random() * 2200, Math.random() * 2.5, 0.012, "sine", 0.035, 1800);
    for (let i = 0; i < 4; i++) k.tone(900 + Math.random() * 300, 0.4 + i * 0.6, 0.05, "sine", 0.05, 500);
  },
  // Snow: hushed, a little wind and far-off giggles.
  "school-snow": (k) => {
    k.swell(0, 2.8, 0.1, 300, 700, 4);
    for (let i = 0; i < 5; i++) {
      const f = 700 + Math.random() * 400;
      k.tone(f, 0.6 + Math.random() * 1.6, 0.12, "triangle", 0.015, f * 1.25);
    }
  },
  // Fog: quiet, a school bus idling and a soft honk.
  "school-fog": (k) => {
    k.swell(0, 2.8, 0.08, 90, 120, 0.8, "lowpass");
    k.tone(330, 1.4, 0.25, "square", 0.02);
    k.tone(392, 1.4, 0.25, "square", 0.015);
  },
};

export function outdoor(weather: WeatherKind, night: boolean): string {
  if (weather === "storm") return "thunder";
  if (weather === "rain" || weather === "drizzle") return "school-rain";
  if (weather === "snow") return "school-snow";
  if (weather === "fog") return "school-fog";
  return night ? "school-night" : "school-day";
}
