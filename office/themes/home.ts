// Home Office: everyone works from home. A neighborhood of little homes,
// each its own building with a floor plan and furniture of its own, with
// streets and city between them; one thread lives in each, and they meet on
// video calls. Threads without a home (yet) work from the co-working café.
// See office/themes/README.md for the hooks; the pieces live in ./home/:
//   plan.ts      the floor plan (blocks, homes of six kinds, the café, the park, your house)
//   backdrop.ts  streets, alleys, yards and lots, the shopfronts, every home's floor and walls
//   props.ts     furniture: kitchenettes, armchairs, sofas, beds, the big screen
//   live.ts      trees, lamps, cars, sleepers in bed, headsets, the calls, night lights
//   people.ts    home clothes and the neighborhood's visitors
//   clicks.ts    doorbells, the horn, the pond, a gnome and a duck (secrets)
//   words.ts     names, lines and sounds;  guide.ts  the tour, told for the neighborhood
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./home/backdrop.ts";
import { homeLayout } from "./home/plan.ts";
import { homeClick, homeClickables, homeClickDecor, homeFishTank } from "./home/clicks.ts";
import { homeGuide } from "./home/guide.ts";
import { homeDecor, homeDress, homeDrift, homeLights, homeOverlay, homePose, homeUnderlay, homeWallLights } from "./home/live.ts";
import { homeDressVisitor, homeLook, homeNpc, hoodie } from "./home/people.ts";
import { WORDS } from "./home/words.ts";
import { homeDesk, homePlant, homeProp } from "./home/props.ts";

export const HOME: Theme = {
  id: "home",
  name: "Home Office",
  blurb: "Everyone works from home: little homes down the street, video calls, your house with a garden",
  icon: "🏡",
  layout: homeLayout,
  minSize: { w: 680, h: 476 },
  background: BACKGROUND,
  prop: homeProp,
  plant: (sprite) => homePlant(sprite),
  desk: (style) => homeDesk(style),
  wallLights: homeWallLights,
  underlay: homeUnderlay,
  decor: (ctx, L, info) => [...homeDecor(ctx, L, info), ...homeClickDecor(ctx, L, info)],
  overlay: homeOverlay,
  lighting: { lights: homeLights },
  pose: homePose,
  drift: homeDrift,
  dress: (ctx, a, t) => {
    hoodie(ctx, a);
    homeDress(ctx, a, t);
  },
  look: homeLook,
  npc: homeNpc,
  dressVisitor: homeDressVisitor,
  fishTank: homeFishTank,
  clickables: homeClickables,
  click: homeClick,
  guide: homeGuide,
  boardInk: ["#3e8ed0", "#e5484d", "#30a46c", "#3a3046"],
  ...WORDS,
};
