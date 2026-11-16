// Desk Rally: a paddle duel with the office computer across a desk. Return
// the ball past the CPU's paddle to score; the first to five points wins.

import { C, center, clamp, rand, SH, SW, text, TOP, type Game, type Input, type Play } from "./kit.ts";

export const WIN_POINTS = 5;
/** Paddles: your face (left) and the CPU's (right), their size. */
export const LX = 8;
export const RX = SW - 11;
const PADW = 3;
export const PADH = 22;
const YOU_SPEED = 2.4;
const CPU_SPEED = 1.45;
const R = 1.5;
const SPEED0 = 1.6;
const SPEED_MAX = 3.2;
const FY = TOP;
const FH = SH - TOP;

export interface RallyState extends Play {
  you: number;
  cpu: number;
  /** Paddle centers. */
  py: number;
  cy: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  speed: number;
  /** Ticks until the next serve; the ball goes toward `serveTo` (−1 you, 1 the CPU). */
  wait: number;
  serveTo: -1 | 1;
  /** How far off the CPU aims this rally (it isn't perfect). */
  aim: number;
}

export function initRally(seed: number): RallyState {
  return { status: "play", score: 0, lives: 0, tick: 0, seed, sfx: [], you: 0, cpu: 0, py: FY + FH / 2, cy: FY + FH / 2, bx: SW / 2, by: FY + FH / 2, vx: 0, vy: 0, speed: SPEED0, wait: 60, serveTo: -1, aim: 0 };
}

function serve(s: RallyState): void {
  s.bx = SW / 2;
  s.by = FY + FH / 2;
  s.speed = SPEED0;
  const a = (rand(s) - 0.5) * 0.9;
  s.vx = s.serveTo * s.speed * Math.cos(a);
  s.vy = s.speed * Math.sin(a);
  s.aim = (rand(s) - 0.5) * 16;
}

/** Off a paddle: where it hits the paddle sets the angle, and it speeds up. */
function bounce(s: RallyState, paddleY: number, dir: 1 | -1): void {
  const off = clamp((s.by - paddleY) / (PADH / 2), -1, 1);
  s.speed = Math.min(SPEED_MAX, s.speed + 0.1);
  const a = off * 0.9;
  s.vx = dir * s.speed * Math.cos(a);
  s.vy = s.speed * Math.sin(a);
  s.sfx.push("blip");
}

export function stepRally(s: RallyState, input: Input): void {
  s.sfx.length = 0;
  if (s.status !== "play") return;
  s.tick++;
  const move = (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0);
  s.py = clamp(s.py + move * YOU_SPEED, FY + PADH / 2, SH - PADH / 2);
  // The CPU follows the ball once it's past the net coming its way, and drifts back to the
  // middle otherwise.
  const target = s.vx > 0 && s.wait === 0 && s.bx > SW * 0.45 ? s.by + s.aim : FY + FH / 2;
  const d = target - s.cy;
  if (Math.abs(d) > 1.5) s.cy = clamp(s.cy + Math.sign(d) * Math.min(CPU_SPEED, Math.abs(d)), FY + PADH / 2, SH - PADH / 2);
  if (s.wait > 0) {
    if (--s.wait === 0) serve(s);
    return;
  }
  for (let half = 0; half < 2; half++) {
    s.bx += s.vx / 2;
    s.by += s.vy / 2;
    if (s.by < FY + R || s.by > SH - R) {
      s.by = clamp(s.by, FY + R, SH - R);
      s.vy = -s.vy;
      s.sfx.push("bonk");
    }
    if (s.vx < 0 && s.bx - R <= LX + PADW && s.bx + R >= LX && Math.abs(s.by - s.py) <= PADH / 2 + R) {
      s.bx = LX + PADW + R;
      bounce(s, s.py, 1);
      s.score += 1;
      // The CPU reads the new shot, a little off.
      s.aim = (rand(s) - 0.5) * (14 + s.speed * 8);
    } else if (s.vx > 0 && s.bx + R >= RX && s.bx - R <= RX + PADW && Math.abs(s.by - s.cy) <= PADH / 2 + R) {
      s.bx = RX - R;
      bounce(s, s.cy, -1);
    }
    if (s.bx < -4 || s.bx > SW + 4) {
      const yours = s.bx > SW;
      if (yours) {
        s.you++;
        s.score += 10;
        s.sfx.push("point");
      } else {
        s.cpu++;
        s.sfx.push("miss");
      }
      if (s.you >= WIN_POINTS) s.status = "won";
      else if (s.cpu >= WIN_POINTS) s.status = "lost";
      // The one who lost the point gets the next serve coming their way.
      s.serveTo = yours ? 1 : -1;
      s.vx = 0;
      s.vy = 0;
      s.wait = 50;
      return;
    }
  }
}

// ------------------------------------------------------------------ drawing

function paddle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, hi: string): void {
  const top = Math.round(y - PADH / 2);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 1, top - 1, PADW + 2, PADH + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, top, PADW, PADH);
  ctx.fillStyle = hi;
  ctx.fillRect(x, top, 1, PADH);
}

export const RALLY: Game<RallyState> = {
  id: "rally",
  name: "Desk Rally",
  tag: "A paddle duel with the CPU",
  goal: ["FIRST TO 5 POINTS", "WINS THE MATCH"],
  keys: "↑ ↓ move",
  init: initRally,
  step: stepRally,
  draw(ctx, s, hi) {
    // A green desk with a dashed net down the middle.
    ctx.fillStyle = "#183a2c";
    ctx.fillRect(0, FY, SW, FH);
    ctx.fillStyle = "#22513d";
    ctx.fillRect(0, FY, SW, 1);
    ctx.fillRect(0, SH - 1, SW, 1);
    ctx.fillStyle = "#3f7a5c";
    for (let y = FY + 2; y < SH; y += 8) ctx.fillRect(SW / 2 - 1, y, 2, 4);
    center(ctx, String(s.you), FY + 6, C.blue, 3, SW / 2 - 20);
    center(ctx, String(s.cpu), FY + 6, C.pink, 3, SW / 2 + 20);
    paddle(ctx, LX, s.py, C.blue, "#b5ecff");
    paddle(ctx, RX, s.cy, C.pink, "#ffc2cf");
    if (s.wait === 0 || Math.floor(s.wait / 6) % 2 === 0) {
      const bx = Math.round(s.bx - R);
      const by = Math.round(s.by - R);
      ctx.fillStyle = C.ink;
      ctx.fillRect(bx - 1, by, 5, 3);
      ctx.fillRect(bx, by - 1, 3, 5);
      ctx.fillStyle = C.white;
      ctx.fillRect(bx, by, 3, 3);
    }
    // The score line: points and returns, the best so far, and who's who.
    ctx.fillStyle = C.screen;
    ctx.fillRect(0, 0, SW, TOP);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, TOP - 2, SW, 1);
    text(ctx, String(s.score), 4, 5, C.white);
    center(ctx, `HI ${Math.max(hi, s.score)}`, 5, C.yellow);
    text(ctx, "YOU", SW - 52, 5, C.blue);
    text(ctx, "CPU", SW - 24, 5, C.pink);
  },
  icon(ctx, x, y) {
    ctx.fillStyle = C.blue;
    ctx.fillRect(x, y + 2, 2, 7);
    ctx.fillStyle = C.pink;
    ctx.fillRect(x + 10, y + 4, 2, 7);
    ctx.fillStyle = C.white;
    ctx.fillRect(x + 5, y + 5, 2, 2);
  },
  cheer: "Game, set, match!",
  sigh: (s) => (s.you >= WIN_POINTS - 1 ? "So close! Rematch!" : "That CPU must be cheating."),
};
