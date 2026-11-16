// Surf Villa: a breezy beach villa office with surf vibes. Sun-bleached decks
// and sand, whitewashed shiplap and aqua shutters, the ocean outside with
// surfers and palms, a curtained cabana for planning, a teak villa office, a
// tiki bar, a sandy games pit, a board shed for the servers, shell lights on a
// rope and tiki torches at night.
// See office/themes/README.md for the hooks; the pieces live in ./beach/.
import type { Theme } from "../theme.ts";
import { BACKDROP } from "./beach/backdrop.ts";
import { beachChair, beachDesk, beachPlant, beachScreen } from "./beach/furnish.ts";
import { BEACH_LABELS, BEACH_SOUNDS, beachDress, beachLook, beachNpc, beachOutdoor } from "./beach/people.ts";
import { beachProp } from "./beach/props.ts";
import { beachDecor, beachLighting, beachOutside, beachOverlay, beachSky, beachUnderlay, beachWallLights } from "./beach/view.ts";

export const BEACH: Theme = {
  id: "beach",
  name: "Surf Villa",
  blurb: "A beach villa with surfboards, palms and the waves outside",
  icon: "🏄",
  background: BACKDROP,
  prop: beachProp,
  plant: (sprite) => beachPlant(sprite),
  desk: (style) => beachDesk(style),
  chair: (tone, side, classic) => beachChair(tone, side, classic),
  screen: (style, side, variant, vision, classic) => beachScreen(`${style}|${side}|${variant % 9}|${vision}`, classic),
  sky: beachSky,
  outside: beachOutside,
  wallLights: beachWallLights,
  underlay: beachUnderlay,
  decor: beachDecor,
  overlay: beachOverlay,
  lighting: beachLighting,
  screenColors: { bg: "#0e2a36", code: ["#7fe0d8", "#ffd166", "#ff9f86", "#9fdc5a", "#f4fbff"] },
  look: beachLook,
  npc: beachNpc,
  dress: beachDress,
  labels: BEACH_LABELS,
  sounds: BEACH_SOUNDS,
  outdoor: beachOutdoor,
};
