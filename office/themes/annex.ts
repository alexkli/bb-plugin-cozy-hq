// Dusty Annex: a shabby, forgotten back office in an old building, where the
// people nobody wants end up. Worn carpet tiles, peeling wallpaper, a leak in
// the ceiling, beige CRTs glowing amber and a fluorescent tube that never
// quite works, squeezed in between the neighbours, the street and a yard full
// of bins. Shabby and gloomy, but home. Click around: nothing works properly
// when you do either (clicks.ts). And mind the boss's habits (habits.ts).
// See office/themes/README.md for the hooks; the pieces live in ./annex/.
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./annex/backdrop.ts";
import { clutterSpots, LIVE } from "./annex/live.ts";
import { click, clickables } from "./annex/clicks.ts";
import { PEOPLE } from "./annex/people.ts";
import { PROPS } from "./annex/props.ts";
import { WORDS } from "./annex/words.ts";
import { DESKS } from "./annex/workstations.ts";
import { annexLayout } from "./annex/plan.ts";
import { PETS } from "./annex/pets.ts";
import { dressBoss, dressHabit, HABITS } from "./annex/habits.ts";

export const ANNEX: Theme = {
  id: "annex",
  name: "Dusty Annex",
  blurb: "A shabby, forgotten office where nothing quite works",
  icon: "🗄️",
  layout: annexLayout,
  background: BACKGROUND,
  ...PROPS,
  ...DESKS,
  ...LIVE,
  ...PEOPLE,
  ...PETS,
  ...WORDS,
  // Bad habits: yours at the desk and the staff's, now and then (habits.ts).
  ...HABITS,
  dress: (ctx, a, t) => {
    PEOPLE.dress!(ctx, a, t);
    dressHabit(ctx, a, t);
  },
  dressVisitor: (ctx, v, t) => {
    PETS.dressVisitor!(ctx, v, t);
    if (v.kind === "boss") dressBoss(ctx, v, t);
  },
  // The leak, the tubes, the storerooms, the stage, the urn, the radiators and the stairs.
  // The leak's bucket and the photocopiers are placed among the clutter, which takes
  // sprites: without a browser (the layout tests) there's just the rest to click.
  clickables: (L) => clickables(L, typeof document === "undefined" ? null : clutterSpots(L)),
  click,
};
