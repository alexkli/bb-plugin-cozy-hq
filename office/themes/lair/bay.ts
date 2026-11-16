// Villain's Lair: the launch bay. Where the secret rocket stands, how big it
// is, and where people stand to watch it (or polish it). The floor plans
// place it; rocket.ts draws it and runs its shows.
import type { Facing, Point, Rect } from "../../layout.ts";

export interface BaySpot {
  x: number;
  y: number;
  facing: Facing;
  path: Point[];
}

export interface Bay {
  /** The rocket: the center of its base (under the engine bell), its height, and 1 for a full-size pad and tower, 0.5 for a scale model's. */
  x: number;
  base: number;
  h: number;
  scale: 1 | 0.5;
  /** The launch pad, an ellipse in this rect. */
  pad: Rect;
  /** The service tower right of the rocket: its left x and its top (null: none). */
  gantry: { x: number; top: number } | null;
  /** The bulkhead behind the rocket and the launch doors in it (a window onto the sky), on the big bays. */
  bulkhead: Rect | null;
  doors: Rect | null;
  /** Where people watch a launch, and where someone stands to polish the hull. */
  watch: BaySpot[];
  polish: BaySpot[];
  /** The coffee cup the nose ray reheats. */
  cup: Point;
}

const even = (v: number) => 2 * Math.round(v / 2);

/** A rocket this tall: its full width with the fins and its body's width. */
export function rocketSize(h: number): { w: number; h: number; body: number } {
  return { w: even(h * 0.355), h, body: even(h * 0.177) };
}

/** The rocket's outline on the floor plan (for clicks and gathering spots). */
export function rocketBox(bay: Bay): Rect {
  const s = rocketSize(bay.h);
  return { x: bay.x - s.w / 2, y: bay.base - s.h, w: s.w, h: s.h };
}

/** The launch doors in the bay's bulkhead (windows the office draws the sky in). */
export const BAY_DOORS = new WeakSet<Rect>();

/** A small bay (a scale model `h` tall on a little pad, no doors): base center at x, base. */
export function miniBay(x: number, base: number, h: number, watch: BaySpot[], polish: BaySpot[], gantry: boolean): Bay {
  const w = rocketSize(h).w;
  const pad: Rect = { x: x - w - 2, y: base - 7, w: 2 * w + 4, h: 14 };
  return { x, base, h, scale: 0.5, pad, gantry: gantry ? { x: x + Math.round(w * 0.6) + 2, top: base - Math.round(h * 0.82) } : null, bulkhead: null, doors: null, watch, polish, cup: { x: pad.x + 6, y: base - 2 } };
}
