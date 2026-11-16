// Spaceship: what's going on aboard right now, shared by the clicks that
// start the shows and the live drawing that plays them (times are
// PaintInfo.t seconds; -1e9 means never).
export const NEVER = -1e9;

export type Visitor = "whale" | "satellite" | "comet" | "eva" | "drone" | "wrench";
export type SynthItem = "jelly" | "toast" | "soup" | "cake" | "noodles" | "fish";
export type CrateKind = "foam" | "bot" | "duck" | "socks";

export const SHIP = {
  /** The star system out there (a jump moves on to the next). */
  system: Math.floor(Date.now() / 86_400_000) % 6,
  /** A jump: the view streaks, flashes and opens on the next system. */
  jumpAt: NEVER,
  /** Someone out on a spacewalk, drifting past the windows. */
  evaAt: NEVER,
  /** The gravity is off (people float) for a few seconds. */
  gravityAt: NEVER,
  /** The food synthesizer at work, and what it made. */
  synthAt: NEVER,
  synthItem: "toast" as SynthItem,
  /** The drive core: a pulse, or a hiccup. */
  coreAt: NEVER,
  coreHiccup: false,
  /** The ship's AI speaking (its line). */
  aiAt: NEVER,
  aiLine: "",
  /** The grow lights at full: the plants shoot up. */
  hydroAt: NEVER,
  /** A cargo crate popping open: which one, and what's inside. */
  crateAt: NEVER,
  crate: 0,
  crateKind: "foam" as CrateKind,
  /** Porthole visitors: the next one picked when a porthole is clicked, and those on show per window. */
  nextVisitor: "satellite" as Visitor,
  portholes: new Map<number, { visitor: Visitor; at: number; seen: number }>(),
};

/** How far into a show we are (seconds), or -1 when it isn't on. */
export function since(at: number, t: number, length: number): number {
  const k = t - at;
  return k >= 0 && k < length ? k : -1;
}
