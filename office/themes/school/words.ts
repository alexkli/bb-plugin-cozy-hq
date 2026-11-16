// School scenery: what things are called, and what you hear out the window.
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";
import type { WeatherKind } from "../../../contract.ts";

export const LABELS: ThemeLabels = {
  pets: { dog: "Biscuit", cat: "Clover" },
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
    arcade: "Math quiz machine · press start to play",
    pingpong: "Gym ping-pong table · serve",
    fishtank: "Class aquarium · feed the fish and Shelly the turtle",
    whiteboard: "Chalkboard · threads in plan mode",
    bell: "Front office bell",
    boss: "That's you, the principal · whistle for {dog}",
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

// ------------------------------------------------------------------ things to click

/** Cues are [seconds after everyone's there, who (by spot), words, sound]. */
type Lines = readonly (readonly [number, number, string, string?])[];

export const CLICKS = {
  hover: {
    bell: "School bell · ring it",
    lockers: "Lockers · open one",
    swings: "Swings · go higher",
    slide: "The slide",
    sandbox: "Sandbox · build a castle",
    games: "Hopscotch and four square · play a round",
    tree: "Apple tree · pick one",
    bus: "Bus stop · here comes the bus",
    field: "The field · play ball",
    lunch: "Lunch line · grab a tray",
    story: "Reading rug · story time",
  },
  activity: {
    recess: "out at recess",
    line: "lining up in the hall",
    kickball: "playing kickball",
    stars: "stargazing on the field",
    swing: "on the swings",
    sandbox: "building a sand castle",
    four: "playing four square",
    hop: "playing hopscotch",
    apple: "picking an apple",
    lunch: "in the lunch line",
    story: "at story time",
  },
  recess: [
    [0.3, 0, "Recess!"],
    [2.2, 1, "Tag! You're it!"],
    [4.6, 2, "Can't catch me!"],
    [7.2, 3, "Race you to the fence!"],
    [10, 4, "Best. Recess. Ever."],
  ] as Lines,
  line: [
    [0.3, 0, "Line leader!"],
    [2.5, 1, "No cutting!"],
    [5, 2, "Single file, everyone."],
    [7.5, 3, "Hands to ourselves."],
  ] as Lines,
  kickball: [
    [0.4, 1, "Roll it in!"],
    [2, -1, "", "sch-kick"],
    [2.3, 0, "Run! Run!"],
    [3.6, 2, "Mine! I got it!"],
    [4.7, 2, "…I don't got it."],
    [6.2, 3, "Home run!"],
    [10, -1, "", "sch-kick"],
  ] as Lines,
  stars: [
    [0.5, 0, "So many stars out here."],
    [4, 1, "Is that the Big Dipper?"],
    [7.5, 2, "Fireflies!"],
    [11, 0, "Make a wish."],
  ] as Lines,
  swing: [
    [0.4, 0, "Wheee!", "sch-whee"],
    [4, 1, "Higher! Higher!"],
    [7.5, 0, "I can touch the sky!", "sch-whee"],
  ] as Lines,
  sandbox: [
    [0.5, 0, "Let's build a castle!", "sch-sand"],
    [4, 1, "It needs a moat."],
    [8, 0, "And a flag on top!", "sch-sand"],
    [11, 1, "Best castle ever."],
  ] as Lines,
  four: [
    [0.4, 0, "Four square! I'm king."],
    [3, 2, "Out!"],
    [5.4, 1, "No way, that was in!"],
    [8.5, 3, "One more round!"],
  ] as Lines,
  hop: [
    [0.4, 0, "One, two, three, four…"],
    [3.4, 0, "Hop on one foot!"],
    [6.5, 1, "My turn!"],
  ] as Lines,
  apple: [
    [0.4, 0, "Just one apple…"],
    [2.6, 0, "Crunchy!", "sch-crunch"],
  ] as Lines,
  lunch: [
    [0.4, 0, "Is it pizza day?"],
    [2.8, 1, "Tater tots!"],
    [5.2, 2, "Chocolate milk, please."],
    [7.6, 0, "Mystery casserole again…"],
  ] as Lines,
  story: [
    [0.5, 0, "Once upon a time…"],
    [3.5, 0, "…a dragon who only wanted a hug."],
    [7.5, 1, "Do the voices!"],
    [10.5, 0, "The end."],
    [12, 3, "Read it again!"],
  ] as Lines,
  /** On the PA: [what it says, how someone reacts]. The pixel font has no commas. */
  pa: [
    ["GOOD MORNING EVERYONE!", "Good morning!"],
    ["PIZZA DAY THIS FRIDAY", "Yes! Pizza!"],
    ["THE LIBRARY HAS NEW BOOKS", "Dibs on the dragon one."],
    ["PLEASE WALK IN THE HALLS", "I was walking. Mostly."],
    ["PICTURE DAY IS TOMORROW", "Oh no, my hair."],
    ["LOST: ONE RED MITTEN", "That's my mitten!"],
  ] as const,
  paNight: [
    ["THE BUILDING CLOSES SOON", "Already?"],
    ["LIGHTS OUT IN TEN MINUTES", "Five more minutes…"],
    ["GOOD NIGHT SCHOOL", "Good night!"],
  ] as const,
  apples: ["Ow! An apple.", "Bonk!", "Free snack!"],
  jam: ["Stuck again!", "Come on, open…", "Kick it at the bottom."],
  stuffed: ["Whose basketball is that?", "So that's where my books went.", "Avalanche!"],
  fence: ["Who's getting that?", "Not it!", "Over the fence again…"],
  slide: ["Whee!", "Look out below!"],
  swinging: ["Higher! Higher!", "Wheee!", "Watch this!"],
} as const;

// ------------------------------------------------------------------ sounds

export const SOUNDS: Record<string, SoundRecipe> = {
  // The electric school bell.
  "sch-bell": (k) => {
    for (let i = 0; i < 40; i++) k.tone(i % 2 ? 1046 : 1108, i * 0.035, 0.032, "square", 0.022);
  },
  // The PA chime: ding-dong-ding.
  "sch-dingdong": (k) => {
    k.tone(659, 0, 0.6, "sine", 0.09);
    k.tone(523, 0.32, 0.6, "sine", 0.09);
    k.tone(392, 0.64, 0.9, "sine", 0.09);
  },
  "sch-kick": (k) => {
    k.noise(0, 0.08, 0.16, 260);
    k.tone(170, 0, 0.16, "sine", 0.16, 60);
  },
  "sch-bounce": (k) => {
    k.tone(320, 0, 0.12, "sine", 0.1, 190);
  },
  "sch-whee": (k) => {
    k.tone(420, 0, 0.45, "triangle", 0.05, 980);
    k.tone(980, 0.42, 0.3, "triangle", 0.04, 700);
  },
  "sch-whoosh": (k) => {
    k.swell(0, 0.7, 0.1, 900, 2600, 1.2);
    k.tone(600, 0.6, 0.12, "sine", 0.06, 300);
  },
  "sch-thump": (k) => {
    k.tone(140, 0, 0.14, "sine", 0.14, 60);
    k.noise(0, 0.05, 0.06, 500);
  },
  "sch-crunch": (k) => {
    for (let i = 0; i < 3; i++) k.noise(i * 0.09, 0.05, 0.1, 3200);
  },
  "sch-tray": (k) => {
    k.tone(880, 0, 0.08, "triangle", 0.05, 820);
    k.noise(0.05, 0.06, 0.06, 2200);
  },
  "sch-page": (k) => {
    k.swell(0, 0.35, 0.05, 3000, 4200, 0.8);
  },
  "sch-rustle": (k) => {
    k.swell(0, 0.6, 0.06, 2400, 3200, 0.8);
  },
  "sch-sand": (k) => {
    k.swell(0, 0.5, 0.05, 1800, 1200, 0.6);
  },
  "sch-rattle": (k) => {
    for (let i = 0; i < 6; i++) k.noise(i * 0.07, 0.04, 0.12, 900 + (i % 2) * 400);
  },
  "sch-clang": (k) => {
    k.tone(330, 0, 0.35, "square", 0.04, 300);
    k.tone(495, 0, 0.25, "triangle", 0.05);
    k.noise(0, 0.06, 0.1, 2400);
    for (let i = 0; i < 3; i++) k.tone(360, 0.45 + i * 0.22, 0.1, "sine", 0.08 - i * 0.02, 250);
  },
  // The bus: it rumbles in, doors fold open, a honk, doors close, off it goes.
  "sch-bus": (k) => {
    k.swell(0, 2.8, 0.12, 80, 140, 0.8, "lowpass");
    k.noise(2.7, 0.35, 0.08, 1800);
    k.tone(392, 3.3, 0.28, "square", 0.04);
    k.tone(330, 3.3, 0.28, "square", 0.03);
    k.tone(392, 3.7, 0.4, "square", 0.04);
    k.tone(330, 3.7, 0.4, "square", 0.03);
    k.noise(6.3, 0.35, 0.08, 1800);
    k.swell(6.8, 2.6, 0.12, 140, 70, 0.8, "lowpass");
  },
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
