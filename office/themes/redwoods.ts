// Redwood Camp: glamping among the redwoods: tents, lanterns and a campfire.
// See office/themes/README.md for the hooks; anything left out looks classic.
//
// The pieces live in office/themes/redwoods/: the floor plan (plan.ts,
// camp.ts, and outdoors.ts for the treeline that replaces the back wall), the
// backdrop (forest floor, trails, decks, the treeline with sky gaps, the
// notice board and the trailhead gate, tents and the cabin), the furniture,
// the camp tables and chairs, the people, the live layers (the view out of the
// woods, lanterns on a rope, the campfire, fireflies, the weather), the
// things to click (clicks.ts) and the words and sounds.
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./redwoods/background.ts";
import { chair, desk, SCREEN_COLORS, screen } from "./redwoods/desks.ts";
import { darkness, decor, doorOpen, lights, outside, overlay, sky, underlay, wallLights } from "./redwoods/live.ts";
import { dress, look, npc } from "./redwoods/people.ts";
import { dressVisitor, mower, pet, pond } from "./redwoods/critters.ts";
import { click, clickables } from "./redwoods/clicks.ts";
import { EGG_SOUNDS, eggClick, eggClickables, eggDecor, eggOverlay, eggTick } from "./redwoods/eggs.ts";
import { campLayout } from "./redwoods/plan.ts";
import { plant, prop, speaker } from "./redwoods/props.ts";
import { LABELS, outdoor, SOUNDS } from "./redwoods/words.ts";

export const REDWOODS: Theme = {
  id: "redwoods",
  name: "Redwood Camp",
  blurb: "Tents among giant redwoods, a creek and a campfire",
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
  // No pane to slide up out here: a clicked sky gap lets a few needles and
  // leaves drift down out of the treeline while you listen.
  openWindow: (ctx, win, k, info) => {
    for (let j = 0; j < 5; j++) {
      const p = (info.t * 0.35 + j / 5) % 1;
      const x = win.x + 4 + ((j * 37) % Math.max(1, win.w - 8)) + Math.round(Math.sin(info.t * 2.2 + j * 1.7) * 3);
      const y = win.y + win.h - 2 + Math.round(p * 26);
      ctx.globalAlpha = k * (1 - p);
      ctx.fillStyle = j % 2 ? "#5f8f3e" : "#a8743a";
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x + (Math.sin(info.t * 4 + j) > 0 ? 1 : -1), y + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
    return true;
  },
  underlay,
  decor: (ctx, L, info) => decor(ctx, L, info).concat(eggDecor(ctx, L, info)),
  overlay: (ctx, L, info) => {
    overlay(ctx, L, info);
    eggOverlay(ctx, L, info);
  },
  lighting: {
    tint: "10,18,34",
    darkness,
    lights,
    // Out under the trees the sun comes through the canopy in dapples, not window beams.
    sunbeam: false,
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
  sounds: { ...SOUNDS, ...EGG_SOUNDS },
  outdoor,
  // The campfire, the giants and the creek do things when you click them;
  // the Easter eggs come first, as they hide among them.
  clickables: (L) => [...eggClickables(L), ...clickables(L)],
  click: (id, act) => eggClick(id, act) ?? click(id, act),
  tick: eggTick,
};
