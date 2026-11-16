// The cabinet's own screens around the games: the picker, a game's title
// card, game over / you win, and paused.

import { C, center, SH, SW, text, type Game, type Play } from "./kit.ts";

const blink = (t: number, rate = 2) => Math.floor(t * rate) % 2 === 0;

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, edge: string): void {
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.screen;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}

/** Where row `i` of the picker is (for taps). */
export function menuRow(i: number): { x: number; y: number; w: number; h: number } {
  return { x: 8, y: 30 + i * 32, w: SW - 16, h: 28 };
}

export function drawMenu(ctx: CanvasRenderingContext2D, games: Game<Play>[], pick: number, hi: Record<string, number>, t: number): void {
  ctx.fillStyle = C.screen;
  ctx.fillRect(0, 0, SW, SH);
  // A slow starfield.
  for (let i = 0; i < 30; i++) {
    const x = (i * 53 + Math.floor(t * (4 + (i % 3) * 3))) % SW;
    ctx.fillStyle = i % 4 === 0 ? C.grey : C.line;
    ctx.fillRect(x, (i * 37) % SH, 1, 1);
  }
  center(ctx, "PICK A GAME", 10, C.yellow, 2);
  games.forEach((g, i) => {
    const r = menuRow(i);
    const on = i === pick;
    panel(ctx, r.x, r.y, r.w, r.h, on ? C.yellow : C.line);
    g.icon(ctx, r.x + 6, r.y + 8);
    text(ctx, g.name, r.x + 24, r.y + 5, on ? C.white : C.grey, 2);
    text(ctx, g.tag, r.x + 24, r.y + 18, on ? C.blue : "#5b5480");
    const best = hi[g.id] ?? 0;
    if (best > 0) text(ctx, String(best), r.x + r.w - 5 - String(best).length * 4 + 1, r.y + 5, C.yellow);
    if (on && blink(t, 3)) {
      ctx.fillStyle = C.yellow;
      for (let k = 0; k < 3; k++) ctx.fillRect(r.x - 6 + k, r.y + 11 + k, 1, 6 - k * 2);
    }
  });
  if (blink(t, 1.5)) center(ctx, "PRESS START", SH - 12, C.white);
}

/** A game's title card over a dimmed glimpse of it. */
export function drawTitle(ctx: CanvasRenderingContext2D, game: Game<Play>, demo: Play, hi: number, t: number): void {
  game.draw(ctx, demo, hi);
  ctx.fillStyle = "rgba(18,15,34,0.78)";
  ctx.fillRect(0, 0, SW, SH);
  center(ctx, game.name, 34, C.yellow, 3);
  game.goal.forEach((line, i) => center(ctx, line, 72 + i * 10, C.white));
  center(ctx, hi > 0 ? `HIGH SCORE ${hi}` : "NO HIGH SCORE YET", 100, C.blue);
  if (blink(t)) center(ctx, "PRESS START", 128, C.white, 2);
  center(ctx, "ESC FOR THE MENU", SH - 14, C.grey);
}

/** The last frame of a game, with the verdict over it. */
export function drawOver(ctx: CanvasRenderingContext2D, game: Game<Play>, s: Play, hi: number, record: boolean, t: number): void {
  game.draw(ctx, s, hi);
  ctx.fillStyle = "rgba(18,15,34,0.55)";
  ctx.fillRect(0, 0, SW, SH);
  const won = s.status === "won";
  panel(ctx, 14, 50, SW - 28, 80, won ? C.yellow : C.pink);
  center(ctx, won ? "YOU WIN!" : "GAME OVER", 60, won ? C.yellow : C.pink, 2);
  center(ctx, `SCORE ${s.score}`, 80, C.white);
  if (record && blink(t, 3)) center(ctx, "NEW HIGH SCORE!", 92, C.green);
  else if (!record) center(ctx, `HIGH SCORE ${hi}`, 92, C.grey);
  center(ctx, "START: PLAY AGAIN", 108, blink(t, 1.5) ? C.white : C.grey);
  center(ctx, "ESC: MENU", 118, C.grey);
}

export function drawPaused(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = "rgba(18,15,34,0.6)";
  ctx.fillRect(0, 0, SW, SH);
  panel(ctx, 30, 66, SW - 60, 40, C.blue);
  center(ctx, "PAUSED", 74, C.blue, 2);
  if (blink(t)) center(ctx, "PRESS START", 92, C.white);
}
