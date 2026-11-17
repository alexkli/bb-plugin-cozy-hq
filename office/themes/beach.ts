// Surf Villa: a breezy beach villa office with surf vibes. Sun-bleached decks
// and sand, whitewashed shiplap and aqua shutters, the ocean outside with
// surfers and palms, a curtained cabana for planning, a teak villa office, a
// tiki bar, a sandy games pit, a board shed for the servers, shell lights on a
// rope and tiki torches at night; things to click in ./beach/clicks.ts.
// See office/themes/README.md for the hooks; the pieces live in ./beach/.
import type { Theme } from "../theme.ts";
import { BACKDROP } from "./beach/backdrop.ts";
import { click, clickables, clickItems, clickLights, clickOverlay, clickUnderlay, CLICK_SOUNDS } from "./beach/clicks.ts";
import { EGG_SOUNDS, eggClick, eggClickables, eggDecor, eggOverlay, eggTick } from "./beach/eggs.ts";
import { beachDressVisitor, beachPet, beachTidePool, hermitCrab } from "./beach/critters.ts";
import { beachChair, beachDesk, beachPlant, beachScreen } from "./beach/furnish.ts";
import { BEACH_LABELS, BEACH_SOUNDS, beachDress, beachLook, beachNpc, beachOutdoor } from "./beach/people.ts";
import { beachLayout } from "./beach/plan.ts";
import { beachProp } from "./beach/props.ts";
import { beachDecor, beachLighting, beachOverlay, beachUnderlay } from "./beach/life.ts";
import { beachOutside, beachSky, beachWallLights } from "./beach/view.ts";

export const BEACH: Theme = {
  id: "beach",
  name: "Surf Villa",
  blurb: "A villa, a pool deck and the beach down to the surf",
  icon: "🏄",
  layout: (W, H, opts) => beachLayout(W, H, opts),
  background: BACKDROP,
  prop: beachProp,
  plant: (sprite) => beachPlant(sprite),
  desk: (style) => beachDesk(style),
  chair: (tone, side, classic) => beachChair(tone, side, classic),
  screen: (style, side, variant, vision, classic) => beachScreen(`${style}|${side}|${variant % 9}|${vision}`, classic),
  sky: beachSky,
  outside: beachOutside,
  wallLights: beachWallLights,
  underlay: (ctx, L, info) => {
    beachUnderlay(ctx, L, info);
    clickUnderlay(ctx, L, info);
  },
  decor: (ctx, L, info) => beachDecor(ctx, L, info).concat(clickItems(ctx, L, info), eggDecor(ctx, L, info)),
  overlay: (ctx, L, info) => {
    beachOverlay(ctx, L, info);
    clickOverlay(ctx, L, info);
    eggOverlay(ctx, L, info);
  },
  lighting: { ...beachLighting, lights: (L, info) => beachLighting.lights!(L, info).concat(clickLights(L, info)) },
  screenColors: { bg: "#0e2a36", code: ["#7fe0d8", "#ffd166", "#ff9f86", "#9fdc5a", "#f4fbff"] },
  look: beachLook,
  npc: beachNpc,
  dress: beachDress,
  dressVisitor: beachDressVisitor,
  pet: beachPet,
  roomba: () => hermitCrab(),
  fishTank: beachTidePool,
  labels: BEACH_LABELS,
  sounds: { ...BEACH_SOUNDS, ...CLICK_SOUNDS, ...EGG_SOUNDS },
  outdoor: beachOutdoor,
  // The pool, the surf, the lifeguard tower, the bonfire, the beach, the tiki bar and the palms do things when you click them;
  // the Easter eggs come first, as they hide among them.
  clickables: (L) => [...eggClickables(L), ...clickables(L)],
  click: (id, act) => eggClick(id, act) ?? click(id, act),
  tick: eggTick,
};
