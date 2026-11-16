// Inbox Zero: the unread mail stacks up at the top; knock it out with the
// ball, bouncing it off your tray. Clear every letter to win. Miss the ball
// and you lose a life (three in all).

import { shade } from "../pixel.ts";
import { C, clamp, hud, overlaps, rand, sprite, SH, SW, TOP, type Game, type Input, type Play } from "./kit.ts";

const COLS = 8;
const ROWS = 5;
const BW = 18;
const BH = 7;
const PITCH_X = 20;
const PITCH_Y = 9;
const BY0 = TOP + 14;
/** The tray (your paddle): its top and size. */
export const PY = SH - 10;
export const PW = 26;
const PH = 4;
const PSPEED = 2.4;
/** The ball is 3×3 around its center. */
const R = 1.5;
const SPEED0 = 1.5;
const SPEED_MAX = 2.6;

export interface InboxState extends Play {
  /** 1: unread, 0: cleared (row by row from the top). */
  bricks: number[];
  /** Your tray's center. */
  px: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  speed: number;
  /** The ball is out (false: it sits on the tray until you serve). */
  served: boolean;
  /** Ticks until you can serve again after a miss. */
  wait: number;
}

export const brickAt = (i: number) => ({ x: 1 + (i % COLS) * PITCH_X, y: BY0 + Math.floor(i / COLS) * PITCH_Y, w: BW, h: BH });

export function initInbox(seed: number): InboxState {
  return { status: "play", score: 0, lives: 3, tick: 0, seed, sfx: [], bricks: new Array<number>(COLS * ROWS).fill(1), px: SW / 2, bx: SW / 2, by: PY - R, vx: 0, vy: 0, speed: SPEED0, served: false, wait: 20 };
}

/** The first unread letter the ball touches, or -1. */
function hitBrick(s: InboxState): number {
  for (let i = 0; i < s.bricks.length; i++) {
    if (!s.bricks[i]) continue;
    const b = brickAt(i);
    if (overlaps(s.bx - R, s.by - R, R * 2, R * 2, b.x, b.y, b.w, b.h)) return i;
  }
  return -1;
}

function clear(s: InboxState, i: number): void {
  s.bricks[i] = 0;
  s.score += 10;
  s.sfx.push("pop");
  // A touch quicker with every letter.
  const k = Math.min(SPEED_MAX, s.speed + 0.025) / s.speed;
  s.speed *= k;
  s.vx *= k;
  s.vy *= k;
  if (s.bricks.every((b) => b === 0)) s.status = "won";
}

export function stepInbox(s: InboxState, input: Input): void {
  s.sfx.length = 0;
  if (s.status !== "play") return;
  s.tick++;
  const move = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
  s.px = clamp(s.px + move * PSPEED, PW / 2, SW - PW / 2);
  if (!s.served) {
    s.bx = s.px;
    s.by = PY - R;
    if (s.wait > 0) s.wait--;
    else if (input.pressed.fire || input.pressed.up) {
      s.served = true;
      const lean = (rand(s) < 0.5 ? -1 : 1) * (0.35 + rand(s) * 0.2);
      s.vx = s.speed * lean;
      s.vy = -Math.sqrt(s.speed * s.speed - s.vx * s.vx);
      s.sfx.push("blip");
    }
    return;
  }
  // Two half steps a tick, so the ball can't slip through a letter.
  for (let half = 0; half < 2 && s.status === "play" && s.served; half++) {
    s.bx += s.vx / 2;
    if (s.bx < R || s.bx > SW - R) {
      s.bx = clamp(s.bx, R, SW - R);
      s.vx = -s.vx;
      s.sfx.push("bonk");
    }
    let i = hitBrick(s);
    if (i >= 0) {
      s.bx -= s.vx / 2;
      s.vx = -s.vx;
      clear(s, i);
      continue;
    }
    s.by += s.vy / 2;
    if (s.by < TOP + R) {
      s.by = TOP + R;
      s.vy = Math.abs(s.vy);
      s.sfx.push("bonk");
    }
    i = hitBrick(s);
    if (i >= 0) {
      s.by -= s.vy / 2;
      s.vy = -s.vy;
      clear(s, i);
      continue;
    }
    // Off the tray: where it lands on the tray sets the angle.
    if (s.vy > 0 && s.by + R >= PY && s.by - R <= PY + PH && s.bx + R >= s.px - PW / 2 && s.bx - R <= s.px + PW / 2) {
      const off = clamp((s.bx - s.px) / (PW / 2), -1, 1);
      const a = off * 1.05;
      s.vx = s.speed * Math.sin(a);
      s.vy = -s.speed * Math.cos(a);
      s.by = PY - R;
      s.sfx.push("blip");
    }
    if (s.by > SH + 3) {
      s.lives--;
      s.sfx.push("miss");
      if (s.lives <= 0) s.status = "lost";
      else {
        s.served = false;
        s.wait = 40;
      }
    }
  }
}

// ------------------------------------------------------------------ drawing

/** Rows of mail from the top: urgent, then less and less so. */
const ROW_COLORS = [C.pink, C.orange, C.yellow, C.green, C.blue];

const letter = (color: string) =>
  sprite(
    `inbox-letter-${color}`,
    ["vffffffffffffffffv", "fvvffffffffffffvvf", "fffvvffffffffvvfff", "fffffvvffffvvfffff", "fffffffvvvvfffffff", "ffffffffffffffffff", "ssssssssssssssssss"],
    { f: color, v: shade(color, -0.4), s: shade(color, -0.2) },
  );

export const INBOX: Game<InboxState> = {
  id: "inbox",
  name: "Inbox Zero",
  tag: "Knock out the unread mail",
  goal: ["CLEAR EVERY LETTER", "DON'T DROP THE BALL"],
  keys: "← → move · space serve",
  init: initInbox,
  step: stepInbox,
  draw(ctx, s, hi) {
    ctx.fillStyle = C.field;
    ctx.fillRect(0, TOP, SW, SH - TOP);
    for (let i = 0; i < s.bricks.length; i++) {
      if (!s.bricks[i]) continue;
      const b = brickAt(i);
      ctx.drawImage(letter(ROW_COLORS[Math.floor(i / COLS)]!), b.x - 1, b.y - 1);
    }
    // The tray.
    const x = Math.round(s.px - PW / 2);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - 1, PY - 1, PW + 2, PH + 2);
    ctx.fillStyle = C.blue;
    ctx.fillRect(x, PY, PW, PH);
    ctx.fillStyle = "#b5ecff";
    ctx.fillRect(x + 1, PY, PW - 2, 1);
    ctx.fillStyle = "#3e8ed0";
    ctx.fillRect(x, PY + PH - 1, PW, 1);
    // The ball.
    const bx = Math.round(s.bx - R);
    const by = Math.round(s.by - R);
    ctx.fillStyle = C.ink;
    ctx.fillRect(bx - 1, by, 5, 3);
    ctx.fillRect(bx, by - 1, 3, 5);
    ctx.fillStyle = C.white;
    ctx.fillRect(bx, by, 3, 3);
    hud(ctx, s.score, hi, s.lives);
  },
  icon(ctx, x, y) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x, y, 12, 8);
    ctx.fillStyle = C.pink;
    ctx.fillRect(x + 1, y + 1, 10, 6);
    ctx.fillStyle = shade(C.pink, -0.4);
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 1 + i, y + 1 + Math.floor(i / 1.4), 1, 1);
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 10 - i, y + 1 + Math.floor(i / 1.4), 1, 1);
    ctx.fillStyle = C.white;
    ctx.fillRect(x + 7, y + 9, 2, 1);
    ctx.fillStyle = C.blue;
    ctx.fillRect(x + 2, y + 11, 8, 1);
  },
  cheer: "Inbox zero!",
  sigh: (s) => {
    const left = s.bricks.filter((b) => b === 1).length;
    return left === 1 ? "One unread left. One!" : `Still ${left} unread…`;
  },
};
