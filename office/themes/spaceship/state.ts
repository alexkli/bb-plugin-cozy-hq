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
  /** The captain gave the order: the engines open up for a moment. */
  engageAt: NEVER,
  /** Someone's hailing us: their face on the viewscreen (which one, and what they say). */
  hailAt: NEVER,
  hailWho: 0,
  hailLine: "",
  /** Red alert: the lights pulse red and the crew scramble to stations. */
  alertAt: NEVER,
  /** The ready room's door, open for a moment. */
  readyAt: NEVER,
  /** The captain's chair swivels round to face the screen from `turnAt` for `turnFor` seconds. */
  turnAt: NEVER,
  turnFor: 0,
  /** Bridge stations at work: the helm nudging the course, ops' readout, a tactical sweep, a science scan. */
  helmAt: NEVER,
  opsAt: NEVER,
  scanAt: NEVER,
  scienceAt: NEVER,
  /** Porthole visitors: the next one picked when a porthole is clicked, and those on show per window. */
  nextVisitor: "satellite" as Visitor,
  portholes: new Map<number, { visitor: Visitor; at: number; seen: number }>(),
};

/** How far into a show we are (seconds), or -1 when it isn't on. */
export function since(at: number, t: number, length: number): number {
  const k = t - at;
  return k >= 0 && k < length ? k : -1;
}

/** Swivel the captain's chair round to the screen for a while (from now, `t`). */
export function faceScreen(t: number, seconds: number): void {
  const end = Math.max(SHIP.turnAt + SHIP.turnFor, t + seconds);
  if (t > SHIP.turnAt + SHIP.turnFor) SHIP.turnAt = t;
  SHIP.turnFor = end - SHIP.turnAt;
}

/** Where the captain's chair is in its swivel: facing you, turning, or facing the screen. */
export function chairView(t: number): "front" | "turnBack" | "back" | "turnFront" {
  const k = t - SHIP.turnAt;
  if (k < 0 || k > SHIP.turnFor) return "front";
  if (k < 0.35) return "turnBack";
  if (k > SHIP.turnFor - 0.35) return "turnFront";
  return "back";
}

/** A station show waiting for its crew member to sit down (a seat click): it starts once they have. */
export type StationShow = "helmAt" | "opsAt" | "scanAt" | "scienceAt";
const waiting: { g: { readonly arrivedAt: number | null; readonly done: boolean }; show: StationShow }[] = [];

export function afterSeated(g: { readonly arrivedAt: number | null; readonly done: boolean }, show: StationShow): void {
  waiting.push({ g, show });
}

/** Called each frame: starts the shows whose crew have sat down, drops the ones that never got there. */
export function seatedShows(): void {
  for (let i = waiting.length - 1; i >= 0; i--) {
    const w = waiting[i]!;
    if (w.g.arrivedAt !== null) SHIP[w.show] = w.g.arrivedAt + 0.8;
    if (w.g.arrivedAt !== null || w.g.done) waiting.splice(i, 1);
  }
}
