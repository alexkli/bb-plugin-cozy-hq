// Neon City: a cyberpunk loft high up in a rainy megacity. Wet steel floors
// with neon trim, signs in invented glyphs, a noodle bar, glowing vending,
// capsule seating, the core (server room) and hover traffic outside.
// See office/themes/README.md for the hooks; anything left out looks classic.
import type { Theme } from "../theme.ts";
import { NEON_BACKGROUND } from "./neon/background.ts";
import { neonChair, neonDesk, neonPlant, neonScreen } from "./neon/desks.ts";
import { neonDarkness, neonDecor, neonDoorOpen, neonLights, neonOutside, neonOverlay, neonSky, neonUnderlay, neonWallLights } from "./neon/live.ts";
import { neonProp, neonSpeaker } from "./neon/props.ts";
import { neonDress, neonLook, neonNpc } from "./neon/people.ts";
import { NEON_SOUNDS, neonOutdoor } from "./neon/sound.ts";
import { neonLayout } from "./neon/plan.ts";
import { neonDressVisitor, neonFishTank, neonPet, neonRoomba } from "./neon/critters.ts";
import { click, clickables } from "./neon/clicks.ts";
import { EGG_SOUNDS, eggClick, eggClickables, eggDecor, eggOutside, eggOverlay, eggTick } from "./neon/eggs.ts";

export const NEON: Theme = {
  id: "neon",
  name: "Neon City",
  blurb: "A city block on rainy neon streets: capsule desks, shops and food carts",
  icon: "🌃",

  layout: (W, H, opts) => neonLayout(W, H, opts),
  background: NEON_BACKGROUND,
  prop: neonProp,
  speaker: () => neonSpeaker(),
  plant: (sprite) => neonPlant(sprite),
  desk: (style) => neonDesk(style),
  chair: (tone, side) => neonChair(tone, side),
  screen: (style, side, _variant, _vision, classic) => neonScreen(style, side, classic),

  sky: (hour) => neonSky(hour),
  outside: (ctx, win, index, info) => {
    neonOutside(ctx, win, index, info);
    eggOutside(ctx, win, info);
  },
  wallLights: neonWallLights,
  doorOpen: neonDoorOpen,
  underlay: neonUnderlay,
  decor: (ctx, L, info) => neonDecor(ctx, L, info).concat(eggDecor(ctx, L, info)),
  overlay: (ctx, L, info) => {
    neonOverlay(ctx, L, info);
    eggOverlay(ctx, L, info);
  },
  lighting: {
    tint: "18,6,40",
    darkness: neonDarkness,
    lights: neonLights,
    sunbeam: false,
  },
  boardInk: ["#d81f86", "#0f8fb0", "#7a2ad0", "#2a1e4e"],
  screenColors: { bg: "#100a22", code: ["#ff2fa8", "#2ef2ff", "#a052ff", "#ffd23f", "#9dfcff", "#ff8ad0"] },

  look: neonLook,
  npc: neonNpc,
  dress: neonDress,
  dressVisitor: neonDressVisitor,
  pet: (kind, pose, facing, blink) => neonPet(kind, pose, facing, blink),
  roomba: () => neonRoomba(),
  fishTank: neonFishTank,

  // The Easter eggs come first: they hide among the street's own things.
  clickables: (L) => [...eggClickables(L), ...clickables(L)],
  click: (id, act) => eggClick(id, act) ?? click(id, act),
  tick: eggTick,

  labels: {
    pets: { dog: "Byte", cat: "Pixel" },
    tvNews: "NET NEWS",
    tvWeather: "SKY FEED",
    poke: {
      coffee: "Auto-brewer · pour a synth-coffee",
      kettle: "Broth pot · heat it up",
      vending: "Snack dispenser · grab a glow-snack",
      fridge: "Cryo-fridge · have a look inside",
      microwave: "Nuker · zap some noodles",
      piano: "Synth · play a riff",
      dartboard: "Laser darts · throw one",
      printer: "Fabricator · print something",
      cooler: "Hydration tap",
      lamp: "Your neon lamp · on/off",
      plant: "Neon bonsai · mist it",
      bin: "Recycler · toss some scrap",
      arcade: "Arcade cabinet · play a game",
      pingpong: "Laser pong · serve",
      fishtank: "Jellyfish tank · feed them",
      whiteboard: "Holo-board · threads in plan mode",
      server: "The core · the AI cluster · click to train a model",
      couch: "Capsule sofa · bounce on it",
      beanbag: "Sleep pod · squish",
      cornhole: "Neon toss · throw a bag",
      globe: "Spin the holo-globe",
    },
    npc: {
      guard: "Security on patrol · visor down, flashlight up",
      janitor: "Cleaning crew · the floors here are always wet",
      technician: "The cyber-mechanic · patching things up",
      delivery: "Noodle courier · lunch for the team",
      dog: "Byte, the office robo-dog · pet",
      cat: "Pixel, the holo-cat · pet",
      roomba: "Sweeper drone · keeps the floors clean",
    },
    words: {
      "water cooler": "hydration tap",
      "Water cooler": "Hydration tap",
      cooler: "hydration tap",
      kitchen: "noodle bar",
      Kitchen: "Noodle bar",
      "in the lounge": "on the chill deck",
      lounge: "chill deck",
      Lounge: "Chill deck",
      "server room": "core",
      "Server room": "The core",
      "meeting room": "holo room",
      "Meeting room": "Holo room",
      "waiting room": "queue lounge",
      "Waiting room": "Queue lounge",
      "Your office": "Your penthouse",
      "String lights": "Neon tubes",
      "make them twinkle": "make them flicker",
      whiteboard: "holo-board",
      "making coffee": "brewing a synth-coffee",
      "brewing tea": "steeping matcha",
      "having a tea": "sipping matcha",
      "snacking at the island": "slurping noodles at the counter",
      "raiding the fridge": "raiding the cryo-fridge",
      "picking a snack": "picking a glow-snack",
      "playing the piano": "playing the synth",
      "playing ping-pong": "playing laser pong",
      "playing darts": "playing laser darts",
      "watching the fish": "watching the jellyfish",
      "watching TV": "watching the net feed",
      napping: "napping in a sleep pod",
      Beanbag: "Sleep pod",
      beanbag: "sleep pod",
      garden: "bio-dome",
      library: "data archive",
      Cornhole: "Neon toss",
      cornhole: "neon toss",
    },
  },

  sounds: { ...NEON_SOUNDS, ...EGG_SOUNDS },
  outdoor: neonOutdoor,
};
