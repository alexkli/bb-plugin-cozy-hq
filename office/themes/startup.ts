// Startup House: a sunny suburban ranch house turned founders' incubator.
// Desks on the living-room carpet, a sagging sectional in front of the big
// TV, a kitchen of pizza boxes and energy drinks, servers in the garage, a
// bedroom-turned-meeting-room with the bunk bed pushed aside, and out back a
// pool (a bit green), a grill and a hammock between two palms.
// See office/themes/README.md for the hooks; the pieces live in ./startup/:
//   plan.ts    the floor plan (the house, the garage, the backyard)
//   squeeze.ts where the rest work when the desks are full; nooks.ts their seats and laptops
//   house.ts   floors, walls with doorways, windows, the wall fixtures
//   props.ts   furniture and plants;  desks.ts  desks, chairs, screens, speakers
//   view.ts    the street out the front windows, the door and windows opening
//   live.ts    holiday lights, the yard, the decor, weather out back, night lights
//   clicks.ts  things to click;  people.ts  outfits and visitors
//   pets.ts    the bulldog, the hen, the robot vacuum, the aquarium
//   words.ts   names, lines and sounds
import type { Theme } from "../theme.ts";
import { startupClickables, click } from "./startup/clicks.ts";
import { startupChair, startupDesk, startupScreen, startupSpeaker } from "./startup/desks.ts";
import { BACKGROUND } from "./startup/house.ts";
import { startupDecor, startupLights, startupOverlay, startupUnderlay, startupWallLights } from "./startup/live.ts";
import { startupDress, startupDressVisitor, startupLook, startupNpc } from "./startup/people.ts";
import { serverAquarium, startupPet, stickerBot } from "./startup/pets.ts";
import { startupLayout } from "./startup/plan.ts";
import { startupPlant, startupProp } from "./startup/props.ts";
import { startupDoorOpen, startupOpenWindow, startupOutside } from "./startup/view.ts";
import { WORDS } from "./startup/words.ts";

export const STARTUP: Theme = {
  id: "startup",
  name: "Startup House",
  blurb: "A suburban house turned startup: desks in the living room, servers in the garage, a pool out back",
  icon: "🏠",
  layout: startupLayout,
  background: BACKGROUND,
  prop: startupProp,
  plant: (sprite) => startupPlant(sprite),
  desk: (style) => startupDesk(style),
  chair: (tone, side) => startupChair(tone, side),
  screen: startupScreen,
  speaker: () => startupSpeaker(),
  outside: startupOutside,
  wallLights: startupWallLights,
  underlay: startupUnderlay,
  decor: startupDecor,
  overlay: startupOverlay,
  lighting: {
    tint: "18,16,50",
    // A touch darker than the classic office, so the lamps, the pool and the screens glow.
    darkness: (night, _weather, classic) => classic + night * 0.1,
    lights: startupLights,
  },
  doorOpen: startupDoorOpen,
  openWindow: startupOpenWindow,
  // Dry-erase markers on the old closet doors.
  boardInk: ["#3a74c4", "#e5544b", "#2e2c36", "#3a9a5a"],
  screenColors: { bg: "#151a2a", code: ["#7fe0ff", "#ff5fa2", "#b6e34a", "#ffd84a", "#f4f2ea"] },
  look: startupLook,
  npc: startupNpc,
  dress: startupDress,
  dressVisitor: startupDressVisitor,
  pet: (kind, pose, facing, blink) => startupPet(kind, pose, facing, blink),
  roomba: () => stickerBot(),
  fishTank: serverAquarium,
  clickables: startupClickables,
  click,
  ...WORDS,
};
