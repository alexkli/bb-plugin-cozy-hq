// Sky Loft: what things are called, and what you hear with the window open,
// sixty-odd floors up.
import type { WeatherKind } from "../../../contract.ts";
import type { SoundRecipe, ThemeLabels } from "../../theme.ts";

export const LABELS: ThemeLabels = {
  pets: { dog: "Biscuit", cat: "Pixel" },
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
    arcade: "Vintage arcade · play a game",
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

// ------------------------------------------------------------------ things to click

/** Hover texts, activities and lines for the loft's things to click. Cues are [seconds after everyone's there, who (by spot), words, sound]. */
export const SKY = {
  hover: {
    tub: "Hot tub · turn on the jets",
    fire: "Fire table · turn it up",
    scope: "Telescope · what's down there?",
    scopeIn: "Telescope · spy on the city",
    glass: "The city, sixty floors down · look out",
    edge: "The drop past the glass · look down",
    pendants: "Glass pendants · the dimmer",
    stair: "Spiral stair · up to the roof",
  },
  activity: {
    soak: "soaking in the hot tub",
    smores: "toasting marshmallows at the fire table",
    cocoa: "sipping cocoa by the fire",
    look: "looking through the telescope",
    fireworks: "watching the fireworks",
  },
  soak: [
    [0.6, 0, "Ahh…"],
    [2.8, 1, "Best meeting room in the building."],
    [6.6, 0, "Wake me at five."],
    [10.4, 1, "Shouldn't we be working?"],
    [12.6, 0, "We are. Deep thinking."],
  ],
  duck: [
    [0.4, 0, "Ahh…"],
    [2, 1, "Wait. Who brought a duck?", "sky-duck"],
    [4.8, 0, "He's on the team now."],
    [8.6, 1, "Quack."],
    [11, 0, "He has a better view than my desk."],
  ],
  soakNight: [
    [0.6, 0, "Ahh…"],
    [3, 1, "Look at all those lights."],
    [7, 0, "Somebody pinch me."],
    [11, 1, "Best office ever."],
  ],
  smores: [
    [0.4, 0, "Marshmallows, sixty floors up."],
    [3.4, 2, "Turn it slowly… golden…"],
    [6.6, 1, "Mine's flambé now.", "sky-whoosh"],
    [8.4, 0, "Very penthouse."],
    [11.2, 2, "A perfect one. Who wants it?"],
    [12.8, 1, "Me!"],
  ],
  cocoa: [
    [0.5, 0, "Ooh, toasty."],
    [3.4, 1, "It's chilly up here at night."],
    [6.8, 2, "Extra marshmallows in mine."],
    [10.2, 0, "I could stay out here all night."],
  ],
  fireworks: [
    [0.6, 0, "Ooooh!"],
    [2.4, 1, "Aaaah!"],
    [5, 2, "Best seats in town."],
    [8.2, 0, "Was that a heart?!"],
    [11, 1, "Encore!"],
  ],
  flare: ["Whoa!", "Easy on the dial!", "Toasty!"],
  jets: ["Ooh, bubbles!", "Jets on!", "Now we're talking."],
  look: ["Let's see…", "Hm, where's it pointed…"],
  /** What the telescope finds: the line when it comes into view, then one more. */
  scope: {
    falcon: ["A peregrine falcon! Right on that ledge.", "They nest up here, you know."],
    parade: ["There's a parade down there!", "Balloons and a whole marching band."],
    party: ["Rooftop party across the street.", "We're not invited."],
    proposal: ["Someone's proposing on that roof!", "They said yes!"],
    waver: ["Someone in that tower is waving at me.", "Hi! Hello!"],
    moon: ["You can see the craters!", "Hello, moon."],
  },
  heli: ["Traffic chopper!", "That one's flying low.", "Wave at the helicopter!"],
  blimp: ["A blimp! Haven't seen one in years.", "Is that a blimp? Up here?"],
  washer: ["Morning!", "They missed a spot.", "Brave job, that."],
  ooh: ["Fireworks!", "Ooh!", "Over the river!"],
  dimDay: ["Ooh, mood lighting.", "Presentation mode!"],
  dimNight: ["Who's on the dimmer?", "Fancy."],
  slinky: ["Ha! A slinky.", "Who's up on the roof?", "Again! Again!"],
  plane: ["It says: ‘Roof, five o'clock. Bring snacks.’", "A note from the roof: ‘Wave!’", "Nice fold. Ten out of ten."],
} as const;

const crackle = (k: Parameters<SoundRecipe>[0], from: number, dur: number, n: number, vol: number) => {
  for (let i = 0; i < n; i++) k.noise(from + ((i * 0.6180339) % 1) * dur, 0.025, vol * (0.6 + ((i * 7) % 5) / 10), 2400 + ((i * 13) % 7) * 300);
};

/** The synth sounds for the things to click. */
export const CLICK_SOUNDS: Record<string, SoundRecipe> = {
  // The hot tub's jets: a rush of water and bubbles popping.
  "sky-jets": (k) => {
    k.swell(0, 2.6, 0.08, 600, 900, 0.7, "lowpass");
    k.swell(0.1, 2.4, 0.04, 2400, 3200, 1.2);
    for (let i = 0; i < 16; i++) k.tone(700 + ((i * 197) % 900), 0.15 + ((i * 0.6180339) % 1) * 2.3, 0.05, "sine", 0.025, 1500 + ((i * 131) % 500));
  },
  // A rubber duck's squeak.
  "sky-duck": (k) => {
    k.tone(1450, 0, 0.09, "square", 0.02, 1850);
    k.tone(1400, 0.16, 0.13, "square", 0.02, 1750);
  },
  // The fire table flaring up.
  "sky-whoosh": (k) => {
    k.swell(0, 0.9, 0.11, 220, 1400, 1.1);
    k.swell(0.4, 2.2, 0.05, 520, 400, 0.6, "lowpass");
    crackle(k, 0.3, 2.2, 14, 0.06);
  },
  // A peregrine's call: kek-kek-kek.
  "sky-falcon": (k) => {
    for (let i = 0; i < 5; i++) k.tone(2300, 0.1 + i * 0.13, 0.06, "square", 0.012, 1900);
  },
  // A helicopter close by the glass.
  "sky-chopper": (k) => {
    k.swell(0, 4.5, 0.05, 140, 240, 0.7, "lowpass");
    for (let i = 0; i < 60; i++) {
      const env = Math.sin((i / 60) * Math.PI);
      k.noise(i * 0.075, 0.04, 0.03 + env * 0.12, 220 + env * 160);
    }
    k.tone(72, 0, 4.4, "sawtooth", 0.012, 64);
  },
  // A blimp's engines droning by.
  "sky-blimp": (k) => {
    k.tone(58, 0, 3.6, "sawtooth", 0.014, 60);
    k.tone(116, 0.2, 3.2, "sine", 0.03, 118);
    k.swell(0, 3.6, 0.03, 180, 260, 0.6, "lowpass");
  },
  // A window washer's winch, then the squeegee.
  "sky-winch": (k) => {
    k.tone(180, 0, 1.6, "sawtooth", 0.012, 300);
    k.swell(0, 1.6, 0.03, 500, 900, 2);
    for (let i = 0; i < 3; i++) k.tone(1900, 2.4 + i * 0.5, 0.18, "sine", 0.03, 2600);
  },
  // Fireworks over the river: thumps, whistles and crackling.
  "sky-fireworks": (k) => {
    for (const [i, s] of [0, 0.9, 1.6, 2.7, 3.3, 4.4].entries()) {
      k.tone(900 + i * 80, s, 0.45, "sine", 0.012, 1600);
      k.tone(110, s + 0.5, 0.35, "sine", 0.12, 45);
      k.noise(s + 0.5, 0.12, 0.08, 900);
      crackle(k, s + 0.7, 0.8, 8, 0.03);
    }
  },
  // A soft chime as the pendants come up, and again as they settle.
  "sky-dimmer": (k) => {
    [1047, 1319, 1568].forEach((f, i) => k.tone(f, i * 0.4, 0.8, "sine", 0.05, f));
    [1568, 1319, 1047].forEach((f, i) => k.tone(f, 4.8 + i * 0.35, 0.8, "sine", 0.035, f));
    k.tone(120, 0, 5.6, "sine", 0.01, 124);
  },
  // A slinky stepping down the stairs.
  "sky-slinky": (k) => {
    for (let i = 0; i < 12; i++) k.tone(520 - i * 18, 0.05 + i * 0.26, 0.16, "sine", 0.05, 900 - i * 30);
  },
  // A paper plane gliding down.
  "sky-glide": (k) => {
    k.swell(0, 2.6, 0.04, 2200, 700, 1.5);
    k.noise(2.7, 0.06, 0.04, 2500);
  },
  // Looking through the telescope: a click and a little whirr.
  "sky-scope": (k) => {
    k.noise(0, 0.03, 0.08, 3000);
    k.tone(600, 0.05, 0.35, "triangle", 0.015, 900);
  },
  // Far below: a marching band and a crowd.
  "sky-parade": (k) => {
    const tune = [392, 440, 494, 523, 494, 440, 392, 330];
    tune.forEach((f, i) => k.tone(f, i * 0.32, 0.26, "sawtooth", 0.012, f));
    for (let i = 0; i < 8; i++) k.tone(i % 2 ? 147 : 98, i * 0.32, 0.18, "square", 0.012, i % 2 ? 147 : 98);
    k.swell(0, 2.8, 0.03, 900, 1300, 0.8);
  },
  // A party across the street: a muffled beat.
  "sky-party": (k) => {
    for (let i = 0; i < 8; i++) k.tone(70, i * 0.36, 0.14, "sine", 0.12, 45);
    for (let i = 0; i < 4; i++) k.tone(330, 0.18 + i * 0.72, 0.12, "square", 0.01, 330);
  },
  // Aww: a little rising sparkle.
  "sky-aww": (k) => {
    [784, 988, 1175, 1568].forEach((f, i) => k.tone(f, i * 0.09, 0.3, "triangle", 0.03, f));
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
