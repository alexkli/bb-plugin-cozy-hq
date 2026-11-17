// Sky Loft: sleek and modern on the top floor of a New York skyscraper.
// Polished concrete, walnut and marble, a black steel curtain wall with the
// skyline beyond and the street canyon far below. See office/themes/README.md
// for the hooks; the pieces live in office/themes/skyline/.
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./skyline/background.ts";
import { skylinePlan } from "./skyline/plan.ts";
import { skylineChair, skylineDesk, skylinePlant, skylineScreen } from "./skyline/furnish.ts";
import { skylineDecor, skylineLights, skylineUnderlay, skylineWallLights } from "./skyline/live.ts";
import { skylineDress, skylineLook, skylineNpc } from "./skyline/people.ts";
import { skylineProp, skylineSpeaker } from "./skyline/props.ts";
import { skylineOutside, skylineSky } from "./skyline/view.ts";
import { terraceOverlay } from "./skyline/terrace.ts";
import { drawPendants, elevatorOpen } from "./skyline/luxe.ts";
import { skylineDressVisitor, skylineFishTank, skylinePet, skylineRoomba } from "./skyline/critters.ts";
import { CLICK_SOUNDS, LABELS, SOUNDS, skylineOutdoor } from "./skyline/words.ts";
import { click, clickables, clickItems, clickLights, clickOutside, clickOverlay, clickUnderlay } from "./skyline/clicks.ts";
import { EGG_SOUNDS, eggClick, eggClickables, eggDecor, eggDrift, eggOutside, eggOverlay, eggTick } from "./skyline/eggs.ts";

export const SKYLINE: Theme = {
  id: "skyline",
  name: "Sky Loft",
  blurb: "A penthouse atop a New York skyscraper, the city far below",
  icon: "🏙️",
  layout: (W, H, opts) => skylinePlan(W, H, opts),
  background: BACKGROUND,
  prop: skylineProp,
  speaker: () => skylineSpeaker(),
  plant: (s) => skylinePlant(s),
  desk: (style) => skylineDesk(style),
  chair: (tone, side) => skylineChair(tone, side),
  screen: (style, side, variant, vision) => skylineScreen(style, side, variant, vision),
  sky: skylineSky,
  outside: (ctx, win, index, info) => {
    skylineOutside(ctx, win, index, info);
    clickOutside(ctx, win, info);
    eggOutside(ctx, win, info);
  },
  wallLights: skylineWallLights,
  underlay: (ctx, L, info) => {
    skylineUnderlay(ctx, L, info);
    clickUnderlay(ctx, L, info);
  },
  decor: (ctx, L, info) => {
    const out = skylineDecor(ctx, L, info);
    return out.concat(clickItems(ctx, L, info), eggDecor(ctx, L, info));
  },
  overlay: (ctx, L, info) => {
    drawPendants(ctx, L, info);
    terraceOverlay(ctx, L, info);
    clickOverlay(ctx, L, info);
    eggOverlay(ctx, L, info);
  },
  doorOpen: elevatorOpen,
  lighting: {
    tint: "14,18,40",
    darkness: (_night, _weather, classic) => Math.min(0.66, classic * 1.16),
    lights: (L, info) => {
      const out = skylineLights(L, info);
      const more = clickLights(L, info);
      return more.length > 0 ? out.concat(more) : out;
    },
  },
  boardInk: ["#2b5fa8", "#c2694a", "#2f7a5a", "#1f2126"],
  screenColors: { bg: "#12151c", code: ["#7cc8ff", "#c9d1d9", "#e0b871", "#9fd6a8", "#d59ad6", "#8b949e"] },
  look: skylineLook,
  npc: skylineNpc,
  dress: (ctx, a) => skylineDress(ctx, a),
  dressVisitor: (ctx, v) => skylineDressVisitor(ctx, v),
  pet: (kind, pose, facing, blink) => skylinePet(kind, pose, facing, blink),
  roomba: () => skylineRoomba(),
  fishTank: skylineFishTank,
  // The Easter eggs come first: they hide among the loft's own things.
  clickables: (L) => [...eggClickables(L), ...clickables(L)],
  click: (id, act) => eggClick(id, act) ?? click(id, act),
  tick: eggTick,
  drift: eggDrift,
  labels: LABELS,
  sounds: { ...SOUNDS, ...CLICK_SOUNDS, ...EGG_SOUNDS },
  outdoor: skylineOutdoor,
};
