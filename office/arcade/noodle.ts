// Noodle: steer a noodle round the bowl and slurp up dumplings; every one
// makes it longer and a little faster. Twenty dumplings win. Bump into the
// rim or into yourself and you lose a life (three in all).

import { C, hud, rand, sprite, SH, type Dir, type Game, type Input, type Play } from "./kit.ts";

export const COLS = 20;
const ROWS = 20;
const CELL = 8;
/** The bowl's top edge on the screen. */
const FY = SH - ROWS * CELL;
export const GOAL = 20;
const CRASH_TICKS = 50;

export interface NoodleState extends Play {
  /** Cells (y × COLS + x), head first. */
  body: number[];
  dir: Dir;
  /** Turns pressed ahead of the next move (two at most, for quick double turns). */
  turns: Dir[];
  food: number;
  /** Ticks to the next move. */
  wait: number;
  /** Cells still to grow. */
  grow: number;
  /** Ticks left of the pause after a crash (the noodle blinks), then it starts over. */
  crash: number;
}

const MOVE: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const BACK: Record<Dir, Dir> = { left: "right", right: "left", up: "down", down: "up" };
const DIRS: Dir[] = ["up", "down", "left", "right"];

const startBody = () => [10 * COLS + 10, 10 * COLS + 9, 10 * COLS + 8, 10 * COLS + 7];

/** Ticks per move: quicker as you eat. */
const speedOf = (score: number) => Math.max(5, 9 - Math.floor(score / 4));

function placeFood(s: NoodleState): void {
  const n = COLS * ROWS;
  const from = Math.floor(rand(s) * n);
  for (let i = 0; i < n; i++) {
    const c = (from + i) % n;
    if (!s.body.includes(c)) {
      s.food = c;
      return;
    }
  }
}

export function initNoodle(seed: number): NoodleState {
  const s: NoodleState = { status: "play", score: 0, lives: 3, tick: 0, seed, sfx: [], body: startBody(), dir: "right", turns: [], food: -1, wait: 12, grow: 0, crash: 0 };
  placeFood(s);
  return s;
}

/** Queue a turn unless it's straight ahead or straight back. */
function turn(s: NoodleState, d: Dir): void {
  const last = s.turns[s.turns.length - 1] ?? s.dir;
  if (d === last || d === BACK[last] || s.turns.length >= 2) return;
  s.turns.push(d);
}

export function stepNoodle(s: NoodleState, input: Input): void {
  s.sfx.length = 0;
  if (s.status !== "play") return;
  s.tick++;
  for (const d of DIRS) if (input.pressed[d]) turn(s, d);
  if (s.crash > 0) {
    if (--s.crash === 0) {
      s.body = startBody();
      s.dir = "right";
      s.turns = [];
      s.grow = 0;
      s.wait = 12;
      if (s.body.includes(s.food)) placeFood(s);
    }
    return;
  }
  if (--s.wait > 0) return;
  s.wait = speedOf(s.score);
  s.dir = s.turns.shift() ?? s.dir;
  const head = s.body[0]!;
  const [dx, dy] = MOVE[s.dir];
  const x = (head % COLS) + dx;
  const y = Math.floor(head / COLS) + dy;
  const next = y * COLS + x;
  // The tail moves out of the way this move unless the noodle is growing.
  const end = s.grow > 0 ? s.body.length : s.body.length - 1;
  let self = false;
  for (let i = 0; i < end; i++) if (s.body[i] === next) self = true;
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS || self) {
    s.lives--;
    s.sfx.push("miss");
    if (s.lives <= 0) s.status = "lost";
    else s.crash = CRASH_TICKS;
    return;
  }
  s.body.unshift(next);
  if (next === s.food) {
    s.score++;
    s.grow += 2;
    s.sfx.push("chomp");
    if (s.score >= GOAL) {
      s.status = "won";
      return;
    }
    placeFood(s);
  }
  if (s.grow > 0) s.grow--;
  else s.body.pop();
}

// ------------------------------------------------------------------ drawing

const dumpling = () => sprite("noodle-dumpling", ["..ww..", ".wwww.", "wpwpww", "wwwwww", ".ssss."], { w: C.white, p: "#d9cbb4", s: "#e8dcc8" });

function drawNoodle(ctx: CanvasRenderingContext2D, s: NoodleState): void {
  const hurt = s.crash > 0 && Math.floor(s.crash / 5) % 2 === 0;
  const body = hurt ? C.pink : C.cream;
  const edge = hurt ? C.red : "#e0a84a";
  const at = (c: number) => [(c % COLS) * CELL, FY + Math.floor(c / COLS) * CELL] as const;
  // The links between cells first, then the round bits over them.
  ctx.fillStyle = edge;
  for (let i = 1; i < s.body.length; i++) {
    const [ax, ay] = at(s.body[i - 1]!);
    const [bx, by] = at(s.body[i]!);
    ctx.fillRect(Math.min(ax, bx) + 1, Math.min(ay, by) + 1, Math.abs(ax - bx) + 6, Math.abs(ay - by) + 6);
  }
  ctx.fillStyle = body;
  for (let i = 1; i < s.body.length; i++) {
    const [ax, ay] = at(s.body[i - 1]!);
    const [bx, by] = at(s.body[i]!);
    ctx.fillRect(Math.min(ax, bx) + 2, Math.min(ay, by) + 2, Math.abs(ax - bx) + 4, Math.abs(ay - by) + 4);
  }
  // A darker stripe now and then, like a twist in the noodle.
  ctx.fillStyle = edge;
  for (let i = 2; i < s.body.length; i += 3) {
    const [x, y] = at(s.body[i]!);
    ctx.fillRect(x + 3, y + 3, 2, 2);
  }
  const [hx, hy] = at(s.body[0]!);
  ctx.fillStyle = C.ink;
  ctx.fillRect(hx, hy, CELL, CELL);
  ctx.fillStyle = body;
  ctx.fillRect(hx + 1, hy + 1, CELL - 2, CELL - 2);
  // Eyes looking where it's going.
  const [dx, dy] = MOVE[s.dir];
  ctx.fillStyle = C.ink;
  if (dx !== 0) {
    const ex = hx + (dx > 0 ? 5 : 2);
    ctx.fillRect(ex, hy + 2, 1, 2);
    ctx.fillRect(ex, hy + 5, 1, 1);
  } else {
    const ey = hy + (dy > 0 ? 5 : 2);
    ctx.fillRect(hx + 2, ey, 1, 1);
    ctx.fillRect(hx + 5, ey, 1, 1);
  }
}

export const NOODLE: Game<NoodleState> = {
  id: "noodle",
  name: "Noodle",
  tag: "Slurp up the dumplings",
  goal: ["EAT 20 DUMPLINGS", "DON'T BITE YOURSELF"],
  keys: "←↑↓→ steer",
  init: initNoodle,
  step: stepNoodle,
  draw(ctx, s, hi) {
    // The bowl: a soft checker of broth.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#221b3b" : "#1d1734";
        ctx.fillRect(x * CELL, FY + y * CELL, CELL, CELL);
      }
    }
    if (s.food >= 0) {
      const fx = (s.food % COLS) * CELL;
      const fy = FY + Math.floor(s.food / COLS) * CELL;
      ctx.drawImage(dumpling(), fx, fy + (Math.floor(s.tick / 20) % 2));
      // A wisp of steam.
      if (Math.floor(s.tick / 10) % 3 !== 0) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(fx + 3 + (Math.floor(s.tick / 15) % 2), fy - 2, 1, 2);
      }
    }
    drawNoodle(ctx, s);
    hud(ctx, s.score, hi, s.lives);
  },
  icon(ctx, x, y) {
    ctx.fillStyle = "#e0a84a";
    ctx.fillRect(x, y + 6, 9, 4);
    ctx.fillRect(x + 5, y + 2, 4, 6);
    ctx.fillStyle = C.cream;
    ctx.fillRect(x + 1, y + 7, 7, 2);
    ctx.fillRect(x + 6, y + 3, 2, 5);
    ctx.drawImage(dumpling(), x + 7, y + 6);
  },
  cheer: "Noodle champion!",
  sigh: () => "Tied myself in knots…",
};
