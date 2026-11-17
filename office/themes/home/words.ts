// Home Office: what everything's called when everyone works from home, and
// the sounds: the call chime, birds and traffic out the window, a car horn,
// a bike bell, the doorbell.
import type { WeatherKind } from "../../../contract.ts";
import type { SoundRecipe, Theme, ThemeLabels } from "../../theme.ts";

const LABELS: ThemeLabels = {
  pets: { dog: "Pretzel", cat: "Mochi" },
  tvNews: "BLOCK NEWS",
  tvWeather: "OUTSIDE",
  poke: {
    coffee: "Their coffee maker · brew one",
    kettle: "The kettle · put it on",
    fridge: "The fridge · have a look inside",
    lamp: "Your desk lamp · on/off",
    plant: "Water the plant",
    clock: "The clock over the watchmaker's",
    arcade: "The arcade cabinet · play a game",
    fishtank: "The pond in your garden · feed the fish",
    whiteboard: "A whiteboard at home · planning on a group call",
    boss: "That's you, working from home · whistle for {dog}",
    globe: "Spin the globe",
    couch: "The sofa · bounce on it",
    beanbag: "Beanbag · squish",
  },
  npc: {
    guard: "The patrol officer · on the beat",
    janitor: "The street sweeper · tidying the block",
    technician: "The internet technician · fixing someone's wifi",
    delivery: "The bike courier · lunch is here",
    kid: "A neighborhood kid",
    dog: "Pretzel, your dog · pet",
    cat: "Mochi, the street cat · pet",
    roomba: "The robot mower · send it off (or home)",
  },
  words: {
    // The legend.
    "At a desk": "At their desk at home",
    "Meeting room": "Group call",
    "Waiting room · hand up": "Call lobby · hand up",
    "Waiting room · page ✓": "Call lobby · page ✓",
    "Waiting room · rain cloud": "Call lobby · rain cloud",
    "Meeting room · blueprint": "On a call with you · blueprint",
    "Your office": "A call with you",
    "Kitchen · cooler": "Their kitchenette",
    Lounge: "Armchair, sofa or hammock",
    Beanbag: "In bed",
    "Desk & chair": "Desk & chair at home",
    // Places.
    "Waiting room": "Call lobby",
    "waiting room": "call lobby",
    "meeting room": "group call",
    "Planning room": "Group call",
    "planning room": "group call",
    Reception: "Your doorbell",
    reception: "your doorbell",
    kitchen: "kitchenette",
    Kitchen: "Kitchenette",
    "in the lounge": "in the park",
    lounge: "park",
    "your office": "your house",
    "String lights": "Lights across the street",
    "string lights": "lights across the street",
    "Open the window": "Look out",
    "Office TV": "The big screen",
    "at the office": "in the neighborhood",
    "in the office": "in the neighborhood",
    "office event": "block party",
    "an office event": "a block party",
    "Office events": "Block parties",
    "Office party": "Block party",
    "office party": "block party",
    "Team lunch": "Lunch in the park",
    "team lunch": "lunch in the park",
    hallway: "street",
    // What people are up to.
    "at the desk": "at their desk at home",
    "chatting in the hallway": "on a quick call",
    "chatting at the water cooler": "on a quick call",
    "planning at the whiteboard": "planning on a group call",
    "planning in the meeting room": "planning on a group call",
    "going through the plans": "going through the plans on a call",
    "waiting for you": "waiting for you to let them in",
    "going over a draft with you": "on a call with you about a draft",
  },
};

// ------------------------------------------------------------------ sounds

/** Joining a video call: a soft two-note chime. */
const ring: SoundRecipe = (k) => {
  k.tone(660, 0, 0.14, "sine", 0.08);
  k.tone(990, 0.12, 0.22, "sine", 0.07);
};

/** A car horn down the street. */
const honk: SoundRecipe = (k) => {
  k.tone(392, 0, 0.18, "square", 0.04);
  k.tone(370, 0, 0.18, "square", 0.03);
  k.tone(392, 0.24, 0.3, "square", 0.04);
  k.tone(370, 0.24, 0.3, "square", 0.03);
};

/** A bike bell. */
const bell: SoundRecipe = (k) => {
  k.tone(2300, 0, 0.25, "triangle", 0.05);
  k.tone(2300, 0.12, 0.3, "triangle", 0.04);
};

/** The neighborhood out the window: traffic far off, birds, a bike bell now and then. */
const street: SoundRecipe = (k) => {
  k.swell(0, 2.6, 0.05, 140, 260, 0.8, "lowpass");
  for (let i = 0; i < 4; i++) k.tone(2600 + i * 180, 0.3 + i * 0.35, 0.08, "sine", 0.03, 3100 + i * 120);
  k.tone(2300, 1.7, 0.2, "triangle", 0.025);
};

/** A plop in the pond. */
const plop: SoundRecipe = (k) => {
  k.tone(420, 0, 0.12, "sine", 0.08, 160);
  k.noise(0.04, 0.12, 0.03, 900);
};

export const WORDS: Pick<Theme, "labels" | "sounds" | "outdoor"> = {
  labels: LABELS,
  sounds: { ring, honk, bell, street, plop },
  outdoor(weather: WeatherKind, night: boolean): string {
    if (weather === "storm") return "thunder";
    if (weather === "rain" || weather === "drizzle") return "rainfall";
    if (weather === "snow" || weather === "fog") return "wind";
    return night ? "crickets" : "street";
  },
};
