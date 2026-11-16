import { test } from "node:test";
import assert from "node:assert/strict";
import { noInput, type Input, type Key } from "./arcade/kit.ts";
import { COLS as NCOLS, GOAL, initNoodle, stepNoodle, type NoodleState } from "./arcade/noodle.ts";
import { brickAt, initInbox, PW, PY, stepInbox } from "./arcade/inbox.ts";
import { initRally, LX, PADH, RX, stepRally, WIN_POINTS } from "./arcade/rally.ts";
import { BUG_H, bugAt, initBugs, LINE, stepBugs, ZY } from "./arcade/bugs.ts";
import { GAMES } from "./arcade/games.ts";
import { buildLayout, layoutSize } from "./layout.ts";
import { checkLayout } from "./layoutcheck.ts";
import { THEMES } from "./themes/index.ts";

const press = (...keys: Key[]): Input => {
  const i = noInput();
  for (const k of keys) i.pressed[k] = i.held[k] = true;
  return i;
};
const hold = (...keys: Key[]): Input => {
  const i = noInput();
  for (const k of keys) i.held[k] = true;
  return i;
};
const idle = noInput();

/** Ticks until the noodle has moved once more. */
function move(s: NoodleState, input = idle): void {
  const len = s.body.length;
  const head = s.body[0];
  stepNoodle(s, input);
  for (let k = 0; k < 20 && s.status === "play" && s.crash === 0 && s.body[0] === head && s.body.length === len; k++) stepNoodle(s, idle);
}

test("noodle: a dumpling makes it grow and scores, and twenty win", () => {
  const s = initNoodle(7);
  const head = s.body[0]!;
  s.food = head + 1;
  move(s);
  assert.equal(s.score, 1);
  assert.deepEqual(s.sfx, ["chomp"]);
  assert.notEqual(s.food, head + 1, "a new dumpling appears");
  assert.ok(!s.body.includes(s.food), "never under the noodle");
  move(s);
  move(s);
  assert.equal(s.body.length, 6, "two cells longer per dumpling");
  s.score = GOAL - 1;
  s.food = s.body[0]! + 1;
  move(s);
  assert.equal(s.status, "won");
});

test("noodle: no turning straight back, and the rim or yourself costs a life", () => {
  const s = initNoodle(3);
  s.food = 0;
  move(s, press("left"));
  assert.equal(s.dir, "right", "pressing back is ignored");
  // Into the right rim: ten cells away.
  for (let k = 0; k < 12 && s.crash === 0; k++) move(s);
  assert.equal(s.lives, 2);
  assert.ok(s.crash > 0);
  while (s.crash > 0) stepNoodle(s, idle);
  assert.equal(s.body.length, 4, "starts over in the middle");
  // Biting itself: a long noodle turning round on itself.
  s.body = [5 * NCOLS + 5, 5 * NCOLS + 4, 4 * NCOLS + 4, 4 * NCOLS + 5, 4 * NCOLS + 6, 5 * NCOLS + 6, 6 * NCOLS + 6];
  s.dir = "up";
  s.turns = [];
  s.food = 0;
  move(s);
  assert.equal(s.lives, 1);
  while (s.crash > 0) stepNoodle(s, idle);
  s.body = [10 * NCOLS + 19, 10 * NCOLS + 18, 10 * NCOLS + 17, 10 * NCOLS + 16];
  move(s);
  assert.equal(s.status, "lost");
});

test("inbox zero: the ball bounces off the tray and knocks out a letter", () => {
  const s = initInbox(1);
  stepInbox(s, idle);
  for (let k = 0; k < 30; k++) stepInbox(s, idle);
  stepInbox(s, press("fire"));
  assert.ok(s.served && s.vy < 0, "served upward");
  // Straight down onto the tray's right half: back up and to the right.
  s.bx = s.px + PW / 4;
  s.by = PY - 6;
  s.vx = 0;
  s.vy = 1.5;
  for (let k = 0; k < 6; k++) stepInbox(s, idle);
  assert.ok(s.vy < 0 && s.vx > 0, "off the tray at an angle");
  // Up into the bottom row of letters.
  const i = 4 * 8 + 3;
  const b = brickAt(i);
  s.bx = b.x + b.w / 2;
  s.by = b.y + b.h + 3;
  s.vx = 0;
  s.vy = -1.5;
  for (let k = 0; k < 4 && s.bricks[i]; k++) stepInbox(s, idle);
  assert.equal(s.bricks[i], 0, "the letter is gone");
  assert.equal(s.score, 10);
  assert.ok(s.vy > 0, "and the ball comes back down");
});

test("inbox zero: clearing the last letter wins, dropping the last ball loses", () => {
  const s = initInbox(2);
  s.bricks.fill(0);
  s.bricks[0] = 1;
  const b = brickAt(0);
  s.served = true;
  s.bx = b.x + b.w / 2;
  s.by = b.y + b.h + 3;
  s.vx = 0;
  s.vy = -1.5;
  for (let k = 0; k < 6 && s.status === "play"; k++) stepInbox(s, idle);
  assert.equal(s.status, "won");

  const t = initInbox(2);
  t.lives = 1;
  t.served = true;
  t.px = 20;
  t.bx = 140;
  t.by = PY + 10;
  t.vx = 0;
  t.vy = 2;
  for (let k = 0; k < 20 && t.status === "play"; k++) stepInbox(t, idle);
  assert.equal(t.status, "lost");
});

test("desk rally: past the CPU scores, five wins; five for the CPU loses", () => {
  const s = initRally(4);
  s.wait = 0;
  s.bx = RX - 20;
  s.by = s.cy + PADH;
  s.vx = 3;
  s.vy = 0;
  s.cy = 30;
  for (let k = 0; k < 20 && s.you === 0; k++) stepRally(s, idle);
  assert.equal(s.you, 1);
  assert.equal(s.score, 10);
  assert.ok(s.wait > 0, "a pause, then the next serve");

  s.you = WIN_POINTS - 1;
  s.wait = 0;
  s.bx = RX - 20;
  s.by = 160;
  s.cy = 30;
  s.vx = 3;
  s.vy = 0;
  for (let k = 0; k < 20 && s.status === "play"; k++) stepRally(s, idle);
  assert.equal(s.status, "won");

  const t = initRally(4);
  t.cpu = WIN_POINTS - 1;
  t.wait = 0;
  t.py = 30;
  t.bx = LX + 20;
  t.by = 160;
  t.vx = -3;
  t.vy = 0;
  for (let k = 0; k < 20 && t.status === "play"; k++) stepRally(t, idle);
  assert.equal(t.status, "lost");
});

test("desk rally: your paddle returns the ball, and a player who keeps up beats the CPU", () => {
  const s = initRally(9);
  s.wait = 0;
  s.bx = LX + 20;
  s.by = s.py;
  s.vx = -2;
  s.vy = 0;
  for (let k = 0; k < 20 && s.vx < 0; k++) stepRally(s, idle);
  assert.ok(s.vx > 0, "back toward the CPU");
  assert.equal(s.score, 1, "a return counts");
  // Follow the ball, aiming off-center for angled shots.
  const g = initRally(11);
  for (let k = 0; k < 60 * 60 * 5 && g.status === "play"; k++) {
    const want = g.by + (g.tick % 240 < 120 ? 7 : -7);
    stepRally(g, Math.abs(want - g.py) < 2 ? idle : hold(want > g.py ? "down" : "up"));
  }
  assert.equal(g.status, "won", `${g.you}:${g.cpu}`);
  // Standing still loses.
  const h = initRally(11);
  for (let k = 0; k < 60 * 60 * 5 && h.status === "play"; k++) stepRally(h, idle);
  assert.equal(h.status, "lost");
});

test("bug hunt: a zap gets a bug and scores, and zapping them all wins", () => {
  const s = initBugs(5);
  // Under the bottom-left bug.
  const i = 3 * 8;
  s.x = bugAt(s, i).x + 5;
  stepBugs(s, press("fire"));
  assert.ok(s.shot, "zap in the air");
  for (let k = 0; k < 60 && s.alive[i]; k++) stepBugs(s, idle);
  assert.equal(s.alive[i], 0);
  assert.equal(s.score, 10);
  assert.equal(s.shot, null);
  s.alive.fill(0);
  s.alive[0] = 1;
  s.drops = [];
  const b = bugAt(s, 0);
  s.shot = { x: b.x + 5, y: b.y + BUG_H + 2 };
  for (let k = 0; k < 4 && s.status === "play"; k++) stepBugs(s, idle);
  assert.equal(s.status, "won");
});

test("bug hunt: a glitch costs a life, and a landing swarm ends it", () => {
  const s = initBugs(6);
  s.reload = 1e9;
  s.drops = [{ x: s.x - 1, y: ZY - 6 }];
  for (let k = 0; k < 8; k++) stepBugs(s, idle);
  assert.equal(s.lives, 2);
  assert.ok(s.hurt > 0, "a moment's grace");
  const t = initBugs(6);
  t.reload = 1e9;
  t.fy = LINE - 3 * 12 - BUG_H - 1;
  for (let k = 0; k < 400 && t.status === "play"; k++) stepBugs(t, idle);
  assert.equal(t.status, "lost");
});

test("every game plays out the same from the same seed", () => {
  for (const g of GAMES) {
    const a = g.init(42);
    const b = g.init(42);
    for (let k = 0; k < 900; k++) {
      const input = k % 50 < 25 ? hold("left", "up", "fire") : press("right", "down", "fire");
      g.step(a, input);
      g.step(b, input);
    }
    assert.deepEqual(a, b, g.id);
    assert.ok(g.name && g.tag && g.goal.length > 0 && g.cheer && g.sigh(a), `${g.id} has its words`);
  }
});

test("you can walk to the arcade and back in every scenery that has one", () => {
  const sizes = [[1200, 520], [600, 698], [666, 600], [1000, 900], [340, 736], [400, 900], [900, 420], [666, 474]] as const;
  for (const theme of THEMES) {
    let walked = 0;
    for (const [w, h] of sizes) {
      const size = layoutSize(w, h);
      const L = theme.layout?.(size.W, size.H, { threads: 12, portrait: size.portrait }) ?? buildLayout(w, h, { threads: 12 });
      assert.ok(L.boss.way, `${theme.id} at ${w}×${h} knows your way out`);
      if (!L.arcade) continue;
      walked++;
      const problems = checkLayout(L, { threads: 12 }).filter((p) => p.includes("your walk") || p.includes("your office") || p.includes("boss.way"));
      assert.deepEqual(problems, [], `${theme.id} at ${w}×${h}`);
    }
    assert.ok(walked > 0, `${theme.id} has an arcade at one of the sizes`);
  }
});

test("every scenery has an arcade at the sizes people use", () => {
  // Native sizes: desktop panels (1000×711 and 1400×900 at 2×, 1350×630, wider ones) and phones.
  const sizes = [[666, 474], [700, 450], [675, 315], [900, 420], [1200, 520], [390, 844], [375, 812], [340, 737], [345, 640]] as const;
  for (const theme of THEMES) {
    for (const [w, h] of sizes) {
      for (const threads of [4, 12, 20, 28]) {
        const size = layoutSize(w, h);
        const L = theme.layout?.(size.W, size.H, { threads, portrait: size.portrait }) ?? buildLayout(w, h, { threads });
        const where = `${theme.id} at ${w}×${h} with ${threads} threads`;
        assert.ok(L.arcade, `${where} has an arcade`);
        assert.equal(L.spots.filter((s) => s.kind === "arcade").length, 1, `${where}: one cabinet`);
        assert.ok(L.pokeables.some((p) => p.kind === "arcade"), `${where}: you can click it`);
      }
    }
  }
});
