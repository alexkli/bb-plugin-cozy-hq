// Spaceship: a deck on a long-haul starship, somewhere between stars. The
// hallway is the ship's main corridor, the meeting room the bridge under its
// viewscreen, your office the captain's cabin; crew stations glow along the
// port side, the galley's food synthesizer has opinions, the rec room shows
// SHIP NEWS, hydroponics grows the salad, the engine room hums aft and
// newcomers arrive through the airlock. The windows are portholes onto
// space (no weather out here: the local weather turns into space phenomena).
// See office/themes/README.md for the hooks; the pieces live in ./spaceship/:
//   plan.ts      the deck: corridor, compartments, hull and space beyond
//   pal.ts       the palette and small drawing helpers
//   backdrop.ts  deck plating, bulkheads, the hull wall, portholes, the airlock
//   live.ts      space outside, the viewscreen, running lights, night shift
//   props.ts     furniture; desks.ts the crew stations
//   people.ts    space suits (station suits, helmets off, helmets on) and visitors; critters.ts the pets, drone and sphere
//   clicks.ts    things to click; words.ts names and sounds
import type { Theme } from "../theme.ts";
import { BACKGROUND } from "./spaceship/backdrop.ts";
import { CLICK_SOUNDS, CLICKS } from "./spaceship/clicks.ts";
import { CRITTERS } from "./spaceship/critters.ts";
import { DESKS } from "./spaceship/desks.ts";
import { LIVE } from "./spaceship/live.ts";
import { PEOPLE } from "./spaceship/people.ts";
import { spaceshipPlan } from "./spaceship/plan.ts";
import { PROPS } from "./spaceship/props.ts";
import { WORDS } from "./spaceship/words.ts";

export const SPACESHIP: Theme = {
  id: "spaceship",
  name: "Spaceship",
  blurb: "Deep space: a bridge with a viewscreen, crew pods, hydroponics and an airlock",
  icon: "🚀",
  layout: spaceshipPlan,
  // Portholes look out on space, not the local weather (live.ts turns that into space phenomena).
  windowWeather: false,
  background: BACKGROUND,
  ...PROPS,
  ...DESKS,
  ...LIVE,
  ...PEOPLE,
  ...CRITTERS,
  ...WORDS,
  sounds: { ...WORDS.sounds, ...CLICK_SOUNDS },
  ...CLICKS,
};
