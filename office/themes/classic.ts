// The classic office: no overrides, everything as drawn in the core, but for
// a couple of hidden Easter eggs (classic/eggs.ts).
import type { Theme } from "../theme.ts";
import { click, clickables, decor, SOUNDS, tick } from "./classic/eggs.ts";

export const CLASSIC: Theme = {
  id: "classic",
  name: "Classic office",
  blurb: "Wooden floors, a cozy lounge and a city view",
  icon: "🏢",
  clickables,
  click,
  tick,
  decor,
  sounds: SOUNDS,
};
