// Dusty Annex: a shabby, forgotten back office in an old building, where the
// people nobody wants end up. Worn carpet tiles, peeling wallpaper, a leak in
// the ceiling, beige CRTs glowing amber and a fluorescent tube that never
// quite works. Shabby and gloomy, but home.
// See office/themes/README.md for the hooks; the pieces live in ./annex/.
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./annex/backdrop.ts";
import { LIVE } from "./annex/live.ts";
import { PEOPLE } from "./annex/people.ts";
import { PROPS } from "./annex/props.ts";
import { WORDS } from "./annex/words.ts";
import { DESKS } from "./annex/workstations.ts";
import { annexLayout } from "./annex/plan.ts";
import { PETS } from "./annex/pets.ts";

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
};
