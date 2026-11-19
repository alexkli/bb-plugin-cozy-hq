// Mountain Cabin: a timber lodge high above the treeline. Inside it's warm:
// pine floors, a fieldstone chimney with the fire crackling under the TV,
// red and navy wool, sheepskins; outside it's all snow, rock and ice, the
// peaks filling the big windows, a sun deck with a sauna, and the piste with
// its chairlift right outside the log wall. See office/themes/README.md for
// the hooks; anything left out looks classic.
//
// The pieces live in office/themes/cabin/: the floor plan (plan.ts), the
// backdrop (background.ts), the furniture (props.ts, desks.ts), the things
// standing about outside and on the hearth (outdoor.ts), the view through
// the windows (view.ts), the live layers (live.ts), the people (people.ts),
// the residents (critters.ts), the things to click (clicks.ts) and the words
// and sounds (words.ts).
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./cabin/background.ts";
import { click, clickables } from "./cabin/clicks.ts";
import { pet, plow, troutTank } from "./cabin/critters.ts";
import { chair, desk } from "./cabin/desks.ts";
import { darkness, decor, doorOpen, lights, overlay, underlay, wallLights } from "./cabin/live.ts";
import { eggTick } from "./cabin/eggs.ts";
import { liftDrift, liftPose, liftTick } from "./cabin/lift.ts";
import { dress, dressVisitor, look, npc } from "./cabin/people.ts";
import { cabinPlan } from "./cabin/plan.ts";
import { plant, prop, speaker } from "./cabin/props.ts";
import { openWindow, outside, sky } from "./cabin/view.ts";
import { LABELS, outdoor, SOUNDS } from "./cabin/words.ts";

export const CABIN: Theme = {
  id: "cabin",
  name: "Mountain Cabin",
  blurb: "A timber lodge above the treeline: a stone fireplace, snowy peaks and a chairlift",
  icon: "🏔️",
  layout: (W, H, opts) => cabinPlan(W, H, opts),
  // Room beside the lodge for the chairlift up the mountainside, and its piste.
  minSize: { w: 700, h: 470 },
  background: BACKGROUND,
  prop,
  plant: (name) => plant(name),
  speaker: () => speaker(),
  desk: (style) => desk(style),
  chair: (tone, side) => chair(tone, side),
  sky: (hour) => sky(hour),
  outside,
  openWindow,
  wallLights,
  underlay,
  decor,
  overlay,
  doorOpen,
  lighting: {
    tint: "12,18,46",
    darkness,
    lights,
    // The snow light through the windows is drawn in the underlay (cool, not golden).
    sunbeam: false,
  },
  boardInk: ["#3a2a22", "#c4402e", "#2f5a7a", "#3f6a4a"],
  screenColors: { bg: "#1c1a1e", code: ["#ffcf7a", "#e8e4da", "#8ac8e8", "#a8d89a", "#e88a7a", "#9a948a"] },
  look: (l, id) => look(l, id),
  npc,
  pose: (p, info) => liftPose(p, info),
  // Off the kicker.
  drift: (who) => liftDrift(who),
  dress: (ctx, a, t) => dress(ctx, a, t),
  dressVisitor: (ctx, v) => dressVisitor(ctx, v),
  pet: (kind, pose, facing, blink) => pet(kind, pose, facing, blink),
  roomba: () => plow(),
  fishTank: troutTank,
  labels: LABELS,
  sounds: SOUNDS,
  outdoor,
  // The fireplace, the woodpile, the fondue pot, the sauna, the telescope, the chairlift and the skis.
  clickables,
  click,
  // Now and then, on a bright day, a few of the idle ones go up the lift and ski down together; the rest is a secret.
  tick: (act) => {
    liftTick(act);
    eggTick(act);
  },
};
