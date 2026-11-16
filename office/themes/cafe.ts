// Coffee Shop: the office moves into a neighborhood café on a street corner.
// Laptops at café tables and along the window bar, the espresso bar with
// baristas pulling shots under the chalkboard menus, the pickup stools
// where threads wait for you, the fireside corner, the big table under the
// RESERVED sign, your usual snug in the corner, an open-mic stage and the
// storeroom with the router and the roaster.
// See office/themes/README.md for the hooks; the pieces live in ./cafe/:
//   plan.ts      the floor plan (tables, the counter, the snug, the stage)
//   backdrop.ts  floors, the storefront, the fireplace and back-bar walls, the wall fixtures
//   props.ts     furniture and plants;  desks.ts  chairs, laptops, speakers
//   view.ts      the street out the shop windows, the door and windows opening
//   live.ts      the tables, the baristas, the counter, the fire, the stage, night lights
//   clicks.ts    things to click;  people.ts  outfits and visitors
//   pets.ts      the café dog, the shop cat, the sweeping robot, the aquarium
//   words.ts     names, lines and sounds
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./cafe/backdrop.ts";
import { cafeClickables, CLICK_SOUNDS, click } from "./cafe/clicks.ts";
import { cafeChair, cafeDesk, cafeScreen, cafeSpeaker } from "./cafe/desks.ts";
import { cafeDecor, cafeLights, cafeOverlay, cafeUnderlay, cafeWallLights } from "./cafe/live.ts";
import { cafeDress, cafeDressVisitor, cafeLook, cafeNpc } from "./cafe/people.ts";
import { cafeFishTank, cafePet, cafeRoomba } from "./cafe/pets.ts";
import { cafeLayout } from "./cafe/plan.ts";
import { cafePlant, cafeProp } from "./cafe/props.ts";
import { cafeDoorOpen, cafeOpenWindow, cafeOutside } from "./cafe/view.ts";
import { WORDS } from "./cafe/words.ts";

export const CAFE: Theme = {
  id: "cafe",
  name: "Coffee Shop",
  blurb: "A corner café: laptops at every table, baristas behind the counter, your usual snug in the corner",
  icon: "☕",
  layout: cafeLayout,
  background: BACKGROUND,
  prop: cafeProp,
  plant: (sprite) => cafePlant(sprite),
  desk: (style) => cafeDesk(style),
  chair: (tone, side) => cafeChair(tone, side),
  screen: cafeScreen,
  speaker: () => cafeSpeaker(),
  outside: cafeOutside,
  wallLights: cafeWallLights,
  underlay: cafeUnderlay,
  decor: cafeDecor,
  overlay: cafeOverlay,
  lighting: {
    tint: "30,18,40",
    // Warm and a bit dim at night: the pendant lamps, the fire and the screens glow.
    darkness: (night, _weather, classic) => classic + night * 0.08,
    lights: cafeLights,
  },
  doorOpen: cafeDoorOpen,
  openWindow: cafeOpenWindow,
  // Chalk on the chalkboard easel.
  boardInk: ["#efeee6", "#f2a7b8", "#f4dc8a", "#9fd0e6", "#b3dfa0"],
  screenColors: { bg: "#1d1a22", code: ["#f4dc8a", "#9fd0e6", "#f2a7b8", "#b3dfa0", "#efeee6"] },
  look: cafeLook,
  npc: cafeNpc,
  dress: cafeDress,
  dressVisitor: cafeDressVisitor,
  pet: (kind, pose, facing, blink) => cafePet(kind, pose, facing, blink),
  roomba: () => cafeRoomba(),
  fishTank: cafeFishTank,
  clickables: cafeClickables,
  click,
  ...WORDS,
  sounds: { ...WORDS.sounds, ...CLICK_SOUNDS },
};
