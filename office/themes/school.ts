// School: an elementary and middle school: classrooms, cafeteria and playground.
// See office/themes/README.md for the hooks; anything left out looks classic.
// The pieces live in office/themes/school/:
//   background.ts  linoleum halls, block walls with lockers and posters, ABC rugs, rooms
//   props.ts       classroom, cafeteria, library, gym and office furniture; plants
//   desks.ts       school desks, molded chairs, class laptops and tablets
//   outside.ts     the playground view, recess by day, a quiet yard at night
//   live.ts        paper bunting with fairy lights, night lights, floor extras
//   people.ts      teachers' lanyards and backpacks, the principal and visitors
//   clicks.ts      things to click: the bell, the field, the playground, the bus, lockers
//   words.ts       names, lines and sounds
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./school/background.ts";
import { click, clickables } from "./school/clicks.ts";
import { schoolChair, schoolDesk, schoolScreen } from "./school/desks.ts";
import { decor, lights, overlay, wallLights } from "./school/live.ts";
import { paintOutside } from "./school/outside.ts";
import { aquarium, dressVisitor, ladybugBot, schoolPet } from "./school/pets.ts";
import { schoolLayout } from "./school/plan.ts";
import { schoolDress, schoolLook, schoolNpc } from "./school/people.ts";
import { intercom, schoolPlant, schoolProp } from "./school/props.ts";
import { LABELS, outdoor, SOUNDS } from "./school/words.ts";

export const SCHOOL: Theme = {
  id: "school",
  name: "School",
  blurb: "Classrooms, a cafeteria and a schoolyard with a bus stop",
  icon: "🏫",
  layout: schoolLayout,
  background: BACKGROUND,
  prop: schoolProp,
  plant: (s) => schoolPlant(s),
  speaker: () => intercom(),
  desk: (style) => schoolDesk(style),
  chair: (tone, side) => schoolChair(tone, side),
  screen: schoolScreen,
  outside: paintOutside,
  wallLights,
  decor,
  overlay,
  lighting: {
    tint: "20,22,54",
    darkness: (night, _weather, classic) => classic + night * 0.12,
    lights,
  },
  // Colored chalk on the chalkboard.
  boardInk: ["#eef3ea", "#f7e08a", "#f5b5c8", "#a8d4f5"],
  screenColors: { bg: "#eef5ff", code: ["#3e7cc4", "#e5544b", "#3a9a5a", "#9b72cf", "#f39a3d"] },
  look: schoolLook,
  npc: schoolNpc,
  dress: schoolDress,
  dressVisitor,
  pet: (kind, pose, facing, blink) => schoolPet(kind, pose, facing, blink),
  roomba: () => ladybugBot(),
  fishTank: aquarium,
  labels: LABELS,
  sounds: SOUNDS,
  outdoor,
  // The bell, the yard's games, the apple trees, the bus and the lockers do things when you click them.
  clickables,
  click,
};
