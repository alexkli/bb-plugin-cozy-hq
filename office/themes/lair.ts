// Villain's Lair: a secret base hollowed into a volcano on a tropical
// island. Basalt walls and steel catwalks, a control room under a wall-sized
// world map, a canteen, a lounge with a shark tank, your lair with the big
// red button, and the crater with the lava far below and a monorail across
// it. See office/themes/README.md for the hooks; the pieces live in
// office/themes/lair/.
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./lair/backdrop.ts";
import { lairClick, lairClickables } from "./lair/clicks.ts";
import { lairDrone, lairFishTank, lairPet } from "./lair/critters.ts";
import { lairChair, lairDesk, lairPlant } from "./lair/furnish.ts";
import { lairDecor, lairDoorOpen, lairLights, lairOverlay, lairUnderlay, lairWallLights } from "./lair/live.ts";
import { lairDress, lairDressVisitor, lairLook, lairNpc } from "./lair/people.ts";
import { lairPlan } from "./lair/plan.ts";
import { lairProp, lairSpeaker } from "./lair/props.ts";
import { lairOpenWindow, lairOutside, lairSky } from "./lair/view.ts";
import { LABELS, lairOutdoor, SOUNDS } from "./lair/words.ts";

export const LAIR: Theme = {
  id: "lair",
  name: "Villain's Lair",
  blurb: "A secret base inside a volcano: a control room, a shark tank and a monorail",
  icon: "🌋",
  layout: (W, H, opts) => lairPlan(W, H, opts),
  background: BACKGROUND,
  prop: lairProp,
  speaker: () => lairSpeaker(),
  plant: (s) => lairPlant(s),
  desk: (style) => lairDesk(style),
  chair: (tone, side) => lairChair(tone, side),
  sky: lairSky,
  outside: lairOutside,
  wallLights: lairWallLights,
  underlay: lairUnderlay,
  decor: lairDecor,
  overlay: lairOverlay,
  doorOpen: lairDoorOpen,
  openWindow: lairOpenWindow,
  lighting: {
    tint: "34,14,30",
    darkness: (_night, _weather, classic) => Math.min(0.68, classic * 1.2),
    lights: lairLights,
    // The windows don't throw sunbeams: one of them is the launch doors out in the bay.
    sunbeam: false,
  },
  boardInk: ["#c23544", "#1f625f", "#2a5690", "#26232a"],
  screenColors: { bg: "#0b1a14", code: ["#7cf0a0", "#ffc54a", "#7cc8ff", "#e2d8bf", "#ff8a6a", "#5ae0c8"] },
  look: lairLook,
  npc: lairNpc,
  dress: (ctx, a) => lairDress(ctx, a),
  dressVisitor: (ctx, v) => lairDressVisitor(ctx, v),
  pet: (kind, pose, facing, blink) => lairPet(kind, pose, facing, blink),
  roomba: () => lairDrone(),
  fishTank: lairFishTank,
  clickables: lairClickables,
  click: lairClick,
  labels: LABELS,
  sounds: SOUNDS,
  outdoor: lairOutdoor,
};
