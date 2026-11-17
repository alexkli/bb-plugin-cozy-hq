// What the arcade's games share: the screen, the controls, the state every
// game keeps and a few drawing helpers. A game's logic is a pure step over
// its own state (one tick is 1/60 s, and the random seed lives in the state
// too), so the same seed and keys always play out the same and tests can
// play it; drawing is separate.

import { drawPixelText, pixelTextWidth } from "../pixelfont.ts";
import { ctx2d } from "../pixel.ts";

/** The cabinet's screen, in its own pixels. */
export const SW = 160;
export const SH = 176;
/** The score line along the top; play fields start below it. */
export const TOP = 16;
export const TICK = 1 / 60;

export type Dir = "left" | "right" | "up" | "down";
export type Key = Dir | "fire";

/** The controls for one tick: what's held, and what was pressed since the last tick. */
export interface Input {
  held: Record<Key, boolean>;
  pressed: Record<Key, boolean>;
}

export function noInput(): Input {
  return {
    held: { left: false, right: false, up: false, down: false, fire: false },
    pressed: { left: false, right: false, up: false, down: false, fire: false },
  };
}

/** Sound effects a tick asks for (the cabinet plays them through the office's synth). */
export type Sfx = "blip" | "bonk" | "chomp" | "pew" | "pop" | "boom" | "miss" | "point";

/** What every game keeps. */
export interface Play {
  status: "play" | "won" | "lost";
  score: number;
  lives: number;
  tick: number;
  /** The random seed, advanced by `rand`. */
  seed: number;
  /** Sounds from the last tick. */
  sfx: Sfx[];
}

export type GameId = "noodle" | "inbox" | "rally" | "bugs";

export interface Game<S extends Play = Play> {
  id: GameId;
  name: string;
  /** A line under the name in the picker. */
  tag: string;
  /** What it takes to win, on the title screen (a line each). */
  goal: string[];
  /** The controls, for the hint under the screen. */
  keys: string;
  init(seed: number): S;
  /** One tick. */
  step(s: S, input: Input): void;
  /** The play field and the score line (`hi`: the high score). */
  draw(ctx: CanvasRenderingContext2D, s: S, hi: number): void;
  /** A 12×12 picture for the picker, top-left at x, y. */
  icon(ctx: CanvasRenderingContext2D, x: number, y: number): void;
  /** What you say in the office when you win, and when you lose. */
  cheer: string;
  sigh(s: S): string;
}

/** A random number 0..1 from the state's seed (which it advances). */
export function rand(s: { seed: number }): number {
  let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const overlaps = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The office's colors, on a dark screen. */
export const C = {
  ink: "#2a1e2e",
  screen: "#120f22",
  field: "#191530",
  line: "#2c2550",
  white: "#fbfaf5",
  grey: "#8e93a8",
  pink: "#ff6b8b",
  red: "#e5484d",
  orange: "#ff8a3d",
  yellow: "#ffd84a",
  green: "#86e07f",
  blue: "#5ad1ff",
  purple: "#c39bff",
  cream: "#ffe3a3",
};

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, scale = 1): number {
  return drawPixelText(ctx, s, Math.round(x), Math.round(y), color, scale);
}

/** Centered on the screen (or on `cx`), with a dark drop shadow. */
export function center(ctx: CanvasRenderingContext2D, s: string, y: number, color: string, scale = 1, cx = SW / 2): void {
  const x = Math.round(cx - pixelTextWidth(s, scale) / 2);
  drawPixelText(ctx, s, x, y + scale, C.ink, scale);
  drawPixelText(ctx, s, x, y, color, scale);
}

/** The score line: your score, the high score and lives left (hearts). */
export function hud(ctx: CanvasRenderingContext2D, score: number, hi: number, lives: number): void {
  ctx.fillStyle = C.screen;
  ctx.fillRect(0, 0, SW, TOP);
  ctx.fillStyle = C.line;
  ctx.fillRect(0, TOP - 2, SW, 1);
  text(ctx, String(score), 4, 5, C.white);
  center(ctx, `HI ${Math.max(hi, score)}`, 5, C.yellow);
  for (let i = 0; i < lives; i++) heart(ctx, SW - 10 - i * 8, 5);
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = C.pink;
  ctx.fillRect(x, y, 2, 2);
  ctx.fillRect(x + 3, y, 2, 2);
  ctx.fillRect(x, y + 1, 5, 2);
  ctx.fillRect(x + 1, y + 3, 3, 1);
  ctx.fillRect(x + 2, y + 4, 1, 1);
}

/**
 * A little sprite from rows of characters ("." is clear, others index
 * `colors`), cached as a canvas; outlined in the office's ink when `outline`.
 */
const sprites = new Map<string, HTMLCanvasElement>();
export function sprite(key: string, rows: string[], colors: Record<string, string>, outline = true): HTMLCanvasElement {
  let c = sprites.get(key);
  if (c) return c;
  const pad = outline ? 1 : 0;
  const w = rows[0]!.length + pad * 2;
  const h = rows.length + pad * 2;
  c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = ctx2d(c);
  const at = (x: number, y: number) => rows[y]?.[x] ?? ".";
  if (outline) {
    g.fillStyle = C.ink;
    for (let y = -1; y <= rows.length; y++) {
      for (let x = -1; x <= rows[0]!.length; x++) {
        if (at(x, y) !== ".") continue;
        if (at(x - 1, y) !== "." || at(x + 1, y) !== "." || at(x, y - 1) !== "." || at(x, y + 1) !== ".") g.fillRect(x + pad, y + pad, 1, 1);
      }
    }
  }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = row[x]!;
      if (k === ".") continue;
      g.fillStyle = colors[k] ?? C.white;
      g.fillRect(x + pad, y + pad, 1, 1);
    }
  });
  sprites.set(key, c);
  return c;
}
