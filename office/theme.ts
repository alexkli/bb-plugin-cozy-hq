// Sceneries: the same office (the same people, places, events and behavior)
// dressed as a different place. A theme only changes how things look and
// sound and what they're called; every hook is optional and falls back to the
// classic office. Themes live in office/themes/<id>.ts; see
// office/themes/README.md for how to write one.

import type { WeatherKind } from "../contract.ts";
import type { CatPose, CharPose, DogPose, Look } from "./characters.ts";
import type { ChairTone, Screen } from "./desks.ts";
import type { Facing, Layout, LayoutOptions, PlantPlacement, Point, PokeKind, Pose, PropPlacement, Rect, Room } from "./layout.ts";
import type { Drawable, Season } from "./life.ts";
import type { DeskStyle } from "./model.ts";

export type SceneryId = "classic" | "neon" | "redwoods" | "beach" | "skyline" | "annex" | "school";

/** Sky gradient for the hour; `night` is 0 by day, 1 at night (it drives lamps and darkness). */
export interface SkyColors {
  top: string;
  bottom: string;
  night: number;
}

/** What live hooks know about the moment. */
export interface PaintInfo {
  /** Seconds since the office started (animation clock). */
  t: number;
  /** Local hour, 0–24 (fractional). */
  hour: number;
  /** 0 by day, 1 at night. */
  night: number;
  weather: WeatherKind;
  date: Date;
  /** The festival decorating the office, if any. */
  season: Season | null;
}

export interface OutsideInfo extends PaintInfo {
  sky: SkyColors;
  /** Every window on the wall (this one is `windows[index]`), for a view that runs across them. */
  windows: Rect[];
}

export interface WallLightsInfo extends PaintInfo {
  /** Someone clicked the lights: do a little show for a few seconds. */
  party: boolean;
  /** The x of a dead bulb the technician is coming to fix (or null). */
  brokenBulbX: number | null;
}

/** Something in the scenery to click (a campfire, a tree); `hover` is its tooltip. */
export interface SceneryClickable {
  id: string;
  rect: Rect;
  hover: string;
}

/** Where someone stands (or sits) when a scenery asks people over. */
export interface GatherSpot {
  /** Feet position. */
  x: number;
  y: number;
  facing: Facing;
  pose: Pose;
  /** Their activity in tooltips ("toasting marshmallows"). */
  activity: string;
  /** Waypoints from a hallway point ({ c: true }) to the spot; default: straight over from the nearest hallway. */
  path?: Point[];
  /** Drawn this many pixels higher (sitting up on something). */
  lift?: number;
}

/** Something that happens `at` seconds after everyone has arrived: a bubble over the one at spot `who`, a sound. */
export interface GatherCue {
  at: number;
  who?: number;
  say?: string;
  /** How long the bubble stays (default 3 s). */
  seconds?: number;
  sound?: string;
}

/** A gathering in progress; it updates as it goes, so read it while drawing. */
export interface Gathering {
  /** How many came: spots 0 … size − 1 are taken. */
  readonly size: number;
  /** When they had all arrived (PaintInfo.t), or null while they're still walking over. */
  readonly arrivedAt: number | null;
  /** They've gone back (time's up, or someone got called back to work). */
  readonly done: boolean;
  /** Whether someone's at spot i right now. */
  readonly present: readonly boolean[];
}

/** What a scenery's click can do with the people in the office. */
export interface SceneryActions extends PaintInfo {
  L: Layout;
  /** Where it was clicked (native px). */
  at: Point;
  /**
   * Ask idle people over: up to `spots.length` of them (the nearest first)
   * walk to the spots, stay `seconds` after they've all arrived, play the cues
   * and go back. Null when fewer than `min` (default 1) are free, or during an
   * office event.
   */
  gather(spots: GatherSpot[], seconds: number, cues?: GatherCue[], min?: number): Gathering | null;
  /** People within `r` px of a point, nearest first. */
  near(x: number, y: number, r: number): { id: string; x: number; y: number }[];
  /** A speech bubble over someone (an id from `near`), `delay` seconds from now. */
  say(id: string, text: string, seconds: number, delay?: number): void;
  /** A sound now: a name from the theme's `sounds` or a built-in. */
  play(sound: string): void;
}

/** A light at night: [x, y, radius, strength 0..1, color "#rrggbb", glow 0..1]. */
export type Light = [number, number, number, number, string, number];

/**
 * The backdrop, baked once per layout in this order. Each step paints into
 * the background canvas; the classic step runs for any you leave out.
 */
export interface BackgroundSteps {
  /** The floor everywhere (rooms paint over it). */
  floor(ctx: CanvasRenderingContext2D, L: Layout): void;
  /** The back wall: `L.segments` (each `x0..x1`, `depth` tall) and pillars at `L.wall.pillars`. */
  wall(ctx: CanvasRenderingContext2D, L: Layout): void;
  /** Under each desk pod (`L.pods`). */
  pods(ctx: CanvasRenderingContext2D, L: Layout): void;
  /** One room's floor (`room.kind`, `room.rect`). */
  room(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void;
  /** The shell of a closed room (`room.walls` is "glass" or "wood"); the front edge is a prop ("glass-front"). */
  roomWalls(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void;
  /**
   * A window frame. The glass is already cleared (sky shows through it):
   * paint the frame around `win` and at most thin mullions over the glass.
   */
  window(ctx: CanvasRenderingContext2D, win: Rect, L: Layout): void;
  /** Frames of the wall fixtures; their contents are live. */
  pinboard(ctx: CanvasRenderingContext2D, r: Rect): void;
  calendar(ctx: CanvasRenderingContext2D, r: Rect): void;
  status(ctx: CanvasRenderingContext2D, r: Rect): void;
  door(ctx: CanvasRenderingContext2D, r: Rect): void;
  legend(ctx: CanvasRenderingContext2D, r: Rect): void;
  painting(ctx: CanvasRenderingContext2D, p: Layout["wall"]["paintings"][number]): void;
  clock(ctx: CanvasRenderingContext2D, c: { x: number; y: number; r: number }): void;
}

/** Synth building blocks for theme sounds (times in seconds from now). */
export interface SynthKit {
  tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void;
  noise(start: number, dur: number, vol: number, filterHz: number): void;
  /** Filtered noise that swells in and out (wind, waves, rain, traffic). */
  swell(start: number, dur: number, vol: number, fromHz: number, toHz: number, q?: number, type?: BiquadFilterType): void;
}
export type SoundRecipe = (k: SynthKit) => void;

export type VisitorKind = "boss" | "guard" | "janitor" | "technician" | "delivery";

export interface ThemeLabels {
  /**
   * The pets' names (classic Biscuit the dog and Pixel the cat), filled in
   * wherever the office names them: `{dog}` and `{cat}` in hover texts and
   * people's lines ("whistle for {dog}").
   */
  pets?: { dog?: string; cat?: string };
  /** TV channel titles (classic "HQ NEWS", "HQ WEATHER", "TECH", "INBOX"). */
  tvNews?: string;
  tvWeather?: string;
  /** Hover text for clickable things. */
  poke?: Partial<Record<PokeKind, string>>;
  /** Hover text for visitors, pets and the roomba ("String lights · …" is relabeled via `words`). */
  npc?: Partial<Record<"guard" | "janitor" | "technician" | "delivery" | "kid" | "dog" | "cat" | "roomba", string>>;
  /**
   * Word swaps in the legend, activities ("chatting at the water cooler")
   * and hover texts, e.g. { "kitchen": "cafeteria", "Kitchen": "Cafeteria" }.
   * Whole words or phrases, case-sensitive, longest first.
   */
  words?: Record<string, string>;
}

export interface Theme {
  id: SceneryId;
  /** Shown in the scenery picker. */
  name: string;
  /** One line under the name. */
  blurb: string;
  /** An emoji for the picker. */
  icon: string;

  // ------------------------------------------------------------ the floor plan
  /**
   * The scenery's own floor plan for a panel of W×H native pixels (already
   * at least the minimum size; `portrait` for a phone held upright), with
   * desks for about `threads` people. Return null to use the classic plan.
   * It must provide everything a Layout has (see office/themes/README.md,
   * "Floor plans"); `node --test` checks every scenery's plan at many sizes.
   */
  layout?(W: number, H: number, opts: Required<Pick<LayoutOptions, "threads">> & { portrait: boolean }): Layout | null;

  // ------------------------------------------------------------ the backdrop (baked)
  background?: Partial<BackgroundSteps>;
  /**
   * A furniture sprite. Return null to keep the classic one (`classic()`
   * builds it, e.g. to recolor it). Keep the classic size: the office places
   * and animates props by their classic geometry.
   */
  prop?(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  plant?(sprite: PlantPlacement["sprite"], classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  /** The desk under each workstation (classic is 48×32; the model picks `style`). */
  desk?(style: DeskStyle, classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  /** Desk chairs; north chairs face you, south chairs face their screen. */
  chair?(tone: ChairTone, side: "north" | "south", classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  /** The two speakers beside the TV (classic 12×28; sound notes float above them). */
  speaker?(classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  /** Monitors. Keep `screens` (where live screen content is drawn) inside the sprite. */
  screen?(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean, classic: () => Screen): Screen | null;

  // ------------------------------------------------------------ live drawing
  /** Sky colors for the hour (classic blue days, sunsets, starry nights). */
  sky?(hour: number, classic: SkyColors): SkyColors;
  /**
   * The view out of a window beyond the sky: classic draws a city skyline
   * and a bird. Sun, moon, stars, clouds, weather and festival skies are
   * drawn by the office around this (clipped to the window).
   */
  outside?(ctx: CanvasRenderingContext2D, win: Rect, index: number, info: OutsideInfo): void;
  /**
   * Replaces the string lights along the top of the wall. Called twice per
   * frame: `glow` false before people, true after the night darkness (draw
   * only the glow there).
   */
  wallLights?(ctx: CanvasRenderingContext2D, L: Layout, info: WallLightsInfo, glow: boolean): void;
  /** Live drawing on the floor, under furniture and people. */
  underlay?(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void;
  /** Extra things sorted by depth with furniture and people (z = the y of their base). */
  decor?(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[];
  /** On top of everything (after the darkness), e.g. scanlines, dust motes, glare. */
  overlay?(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void;
  lighting?: {
    /** The night overlay color, "r,g,b" (classic "16,14,44"). */
    tint?: string;
    /** How dark it gets, 0..1 (classic: night × 0.5 plus a bit for gloomy weather). */
    darkness?(night: number, weather: WeatherKind, classic: number): number;
    /** More lights (they punch through the darkness and glow at night). */
    lights?(L: Layout, info: PaintInfo): Light[];
    /** Sunbeams through the windows on clear days (default true). */
    sunbeam?: boolean;
  };
  /**
   * The door standing open while someone comes or goes (`door` is
   * `L.wall.door`; the frame is the `door` background step). Return true when
   * you drew it (false: the classic dark doorway and swung-open leaf).
   */
  doorOpen?(ctx: CanvasRenderingContext2D, door: Rect, info: PaintInfo): boolean;
  /**
   * A window someone clicked open, for a few seconds (`k` fades 0 → 1 → 0).
   * Return true when you drew it (false: the classic slid-up pane and a
   * breeze). Its hover text "Open the window" goes through `labels.words`.
   */
  openWindow?(ctx: CanvasRenderingContext2D, win: Rect, k: number, info: PaintInfo): boolean;
  /** Marker colors for planners' whiteboard strokes (chalk on a chalkboard, say). */
  boardInk?: string[];
  /** Busy screens: the background and the code colors. */
  screenColors?: { bg: string; code: string[] };

  // ------------------------------------------------------------ people
  /** Dress an agent for the scenery (same person: keep skin and hair, say). */
  look?(look: Look, threadId: string): Look;
  /**
   * You (the boss) and the visitors. Your classic look already has what you
   * picked in the settings (skin, hair, glasses, figure): keep those.
   */
  npc?(kind: VisitorKind, classic: Look): Look;
  /**
   * Draw something on an agent after its sprite (a backpack, a visor, a lei).
   * `x, y` is the top-left of the 20×28 character sprite (the same grid as
   * characters.ts: head from row 2, body from row 14, feet at row 27).
   */
  dress?(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }, t: number): void;

  /**
   * The office pets, any animal you like: the dog (20×15 sprite, drawn at
   * x−10, y−14 of its position) and the cat (16×13, drawn at x−8, y−12).
   * Keep the size; poses are the classic ones.
   */
  pet?(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean, classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  /** The roomba, or whatever cleans in your scenery (16×9 sprite, drawn at x−8, y−6 of its position). */
  roomba?(classic: () => HTMLCanvasElement): HTMLCanvasElement | null;
  /**
   * The fish tank's water and fish, drawn into `tank` (`L.fishtank`) every
   * frame; the "fishtank-stand" prop is under it. Return true when you drew
   * it (false: the classic tank).
   */
  fishTank?(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean;
  /**
   * Like `dress`, for you and the visitors (the guard's visor, the courier's
   * bag). For you, `look.figure` is the figure you picked in the settings
   * ("woman", "man", "nonbinary"): keep your extras right for it.
   */
  dressVisitor?(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void;

  // ------------------------------------------------------------ things to click
  /**
   * Things in the scenery to click, checked after the office's own
   * clickables (people, furniture, fixtures, free desks): rects with an id
   * and a hover text. Asked once per floor plan.
   */
  clickables?(L: Layout): SceneryClickable[];
  /**
   * One of them was clicked: start something and draw it from `decor` or
   * `overlay` (by PaintInfo.t); `act` can ask idle people over and give them
   * lines. Return a sound to play now, or null.
   */
  click?(id: string, act: SceneryActions): string | null;

  // ------------------------------------------------------------ words and sounds
  labels?: ThemeLabels;
  /** Synth recipes by name; play them from `outdoor` (or anywhere a sound name goes). */
  sounds?: Record<string, SoundRecipe>;
  /** What you hear when you open a window: a name from `sounds`, or a built-in like "birds". */
  outdoor?(weather: WeatherKind, night: boolean): string;
}

/** Fill in the scenery's pet names for `{dog}` and `{cat}`. */
export function withPets(text: string, theme: Theme): string {
  if (!text.includes("{")) return text;
  return text.replaceAll("{dog}", theme.labels?.pets?.dog ?? "Biscuit").replaceAll("{cat}", theme.labels?.pets?.cat ?? "Pixel");
}

/** Apply a theme's word swaps to a piece of UI text. */
export function relabel(theme: Theme, text: string): string {
  const words = theme.labels?.words;
  if (!words) return text;
  const keys = Object.keys(words).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return text;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![A-Za-z])(${keys.map(esc).join("|")})(?![A-Za-z])`, "g");
  return text.replace(re, (m) => words[m] ?? m);
}

export type { Drawable, Season };
