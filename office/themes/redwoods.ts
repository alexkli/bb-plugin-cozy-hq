// Redwood Camp: glamping among the redwoods: tents, lanterns and a campfire.
// See office/themes/README.md for the hooks; anything left out looks classic.
//
// The pieces live in office/themes/redwoods/: the backdrop (forest floor,
// boardwalks, decks, the canvas wall between giant trunks, tents and the
// cabin), the furniture, the camp tables and chairs, the people, the live
// layers (the forest out the windows, lanterns on a rope, the campfire,
// fireflies, fog) and the words and sounds.
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./redwoods/background.ts";
import { chair, desk, SCREEN_COLORS, screen } from "./redwoods/desks.ts";
import { darkness, decor, doorOpen, lights, outside, overlay, sky, underlay, wallLights } from "./redwoods/live.ts";
import { dress, look, npc } from "./redwoods/people.ts";
import { dressVisitor, mower, pet, pond } from "./redwoods/critters.ts";
import { campLayout } from "./redwoods/plan.ts";
import { plant, prop, speaker } from "./redwoods/props.ts";
import { LABELS, outdoor, SOUNDS } from "./redwoods/words.ts";

export const REDWOODS: Theme = {
  id: "redwoods",
  name: "Redwood Camp",
  blurb: "Glamping among the redwoods: tents, lanterns and a campfire",
  icon: "🌲",
  layout: (W, H, opts) => campLayout(W, H, opts),
  background: BACKGROUND,
  prop,
  plant: (name) => plant(name),
  speaker: () => speaker(),
  desk: (style) => desk(style),
  chair: (tone, side) => chair(tone, side),
  screen,
  sky: (hour) => sky(hour),
  outside,
  wallLights,
  doorOpen: (ctx, door, info) => doorOpen(ctx, door, info),
  underlay,
  decor,
  overlay,
  lighting: {
    tint: "10,18,34",
    darkness,
    lights,
  },
  screenColors: SCREEN_COLORS,
  boardInk: ["#3a3046", "#b5432f", "#3f6b3a", "#2f5a7a"],
  look: (l) => look(l),
  npc,
  dress: (ctx, a) => dress(ctx, a),
  dressVisitor: (ctx, v) => dressVisitor(ctx, v),
  pet: (kind, pose, facing, blink) => pet(kind, pose, facing, blink),
  roomba: () => mower(),
  fishTank: (ctx, tank, info) => pond(ctx, tank, info),
  labels: LABELS,
  sounds: SOUNDS,
  outdoor,
};
