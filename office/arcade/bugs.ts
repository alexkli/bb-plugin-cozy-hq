// Bug Hunt: a swarm of bugs marches across the screen and down toward your
// zapper, faster as it thins out, dropping glitches on you. Zap every bug to
// win. A glitch costs a life (three in all); if the swarm reaches you, it's
// over.

import { C, clamp, hud, overlaps, rand, sprite, SH, SW, TOP, type Game, type Input, type Play } from "./kit.ts";

const COLS = 8;
const ROWS = 4;
const GX = 16;
const GY = 12;
/** A bug's size. */
const BUG_W = 11;
export const BUG_H = 8;
const MARGIN = 3;
const FX0 = Math.round((SW - ((COLS - 1) * GX + BUG_W)) / 2);
const FY0 = TOP + 14;
/** Your zapper: its center x moves, its top is at ZY. */
export const ZY = SH - 11;
const ZW = 11;
const ZSPEED = 1.6;
const SHOT_SPEED = 4;
const DROP_SPEED = 1.25;
/** The swarm wins when its lowest bug gets this low. */
export const LINE = ZY - 6;
const POINTS = [30, 20, 20, 10];

export interface BugsState extends Play {
  /** Your zapper's center. */
  x: number;
  /** 1: still there (row by row from the top). */
  alive: number[];
  /** The swarm's top-left, the way it marches (1 right, −1 left), ticks to its next step. */
  fx: number;
  fy: number;
  dir: 1 | -1;
  march: number;
  /** Your zap in the air (null: ready). */
  shot: { x: number; y: number } | null;
  /** Glitches falling. */
  drops: { x: number; y: number }[];
  /** Little bursts where something was zapped (ticks left). */
  booms: { x: number; y: number; t: number }[];
  /** Ticks you blink after a hit (nothing hits you meanwhile). */
  hurt: number;
  /** Ticks to the swarm's next glitch. */
  reload: number;
}

export const bugAt = (s: BugsState, i: number) => ({ x: s.fx + (i % COLS) * GX, y: s.fy + Math.floor(i / COLS) * GY });

export function initBugs(seed: number): BugsState {
  return { status: "play", score: 0, lives: 3, tick: 0, seed, sfx: [], x: SW / 2, alive: new Array<number>(COLS * ROWS).fill(1), fx: FX0, fy: FY0, dir: 1, march: 30, shot: null, drops: [], booms: [], hurt: 0, reload: 90 };
}

/** Ticks between the swarm's steps: quicker as it thins out. */
const marchOf = (left: number) => 3 + Math.round(left * 0.8);

function lost(s: BugsState): void {
  s.status = "lost";
  s.sfx.push("miss");
}

export function stepBugs(s: BugsState, input: Input): void {
  s.sfx.length = 0;
  if (s.status !== "play") return;
  s.tick++;
  const move = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
  s.x = clamp(s.x + move * ZSPEED, ZW / 2 + 2, SW - ZW / 2 - 2);
  if (s.hurt > 0) s.hurt--;
  for (const b of s.booms) b.t--;
  if (s.booms.length > 0 && s.booms[0]!.t <= 0) s.booms = s.booms.filter((b) => b.t > 0);

  // Your zap: one in the air at a time; hold fire to keep zapping.
  if (!s.shot && (input.held.fire || input.pressed.fire)) {
    s.shot = { x: Math.round(s.x), y: ZY - 4 };
    s.sfx.push("pew");
  }
  const shot = s.shot;
  if (shot) {
    shot.y -= SHOT_SPEED;
    if (shot.y < TOP) s.shot = null;
    else {
      for (let i = 0; i < s.alive.length; i++) {
        if (!s.alive[i]) continue;
        const b = bugAt(s, i);
        if (!overlaps(shot.x, shot.y, 1, 4, b.x, b.y, BUG_W, BUG_H)) continue;
        s.alive[i] = 0;
        s.score += POINTS[Math.floor(i / COLS)]!;
        s.booms.push({ x: b.x + BUG_W / 2, y: b.y + BUG_H / 2, t: 12 });
        s.sfx.push("boom");
        s.shot = null;
        if (s.alive.every((a) => a === 0)) {
          s.status = "won";
          return;
        }
        break;
      }
    }
  }

  // The swarm marches a step at a time, and down a row at the edges.
  let left = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < s.alive.length; i++) {
    if (!s.alive[i]) continue;
    left++;
    const b = bugAt(s, i);
    minX = Math.min(minX, b.x);
    maxX = Math.max(maxX, b.x + BUG_W);
    maxY = Math.max(maxY, b.y + BUG_H);
  }
  if (--s.march <= 0) {
    s.march = marchOf(left);
    const step = 2 * s.dir;
    if (minX + step < MARGIN || maxX + step > SW - MARGIN) {
      s.fy += 5;
      s.dir = s.dir === 1 ? -1 : 1;
      maxY += 5;
    } else s.fx += step;
  }
  if (maxY >= LINE) {
    lost(s);
    return;
  }

  // Glitches from the lowest bug of a random column.
  if (--s.reload <= 0) {
    s.reload = 30 + Math.floor(rand(s) * 60);
    const col = Math.floor(rand(s) * COLS);
    for (let k = 0; k < COLS && s.drops.length < 3; k++) {
      const c = (col + k) % COLS;
      let low = -1;
      for (let r = 0; r < ROWS; r++) if (s.alive[r * COLS + c]) low = r * COLS + c;
      if (low < 0) continue;
      const b = bugAt(s, low);
      s.drops.push({ x: b.x + 4, y: b.y + BUG_H });
      break;
    }
  }
  for (const d of s.drops) d.y += DROP_SPEED;
  const hit = s.hurt === 0 ? s.drops.findIndex((d) => overlaps(d.x, d.y, 3, 5, s.x - ZW / 2, ZY, ZW, 6)) : -1;
  if (hit >= 0) {
    s.lives--;
    s.drops = [];
    s.booms.push({ x: s.x, y: ZY + 3, t: 16 });
    if (s.lives <= 0) {
      lost(s);
      return;
    }
    s.sfx.push("miss");
    s.hurt = 90;
  }
  if (s.drops.length > 0 && s.drops[0]!.y > SH) s.drops = s.drops.filter((d) => d.y <= SH);
}

// ------------------------------------------------------------------ drawing

const BUGS: { rows: [string[], string[]]; colors: Record<string, string> }[] = [
  {
    // A moth, wings beating.
    rows: [
      ["..a.....a..", "...a...a...", "pp..aba..pp", "pqpp.b.ppqp", "pppppbppppp", ".ppp.b.ppp.", "..p..b..p..", "..........."],
      ["..a.....a..", "...a...a...", "....aba....", ".pqp.b.pqp.", "ppppbbbpppp", "pppp.b.pppp", ".pp..b..pp.", "..........."],
    ],
    colors: { a: C.grey, b: "#6b4f9e", p: C.purple, q: C.yellow },
  },
  {
    // A ladybird, legs scuttling.
    rows: [
      ["....hhh....", "...hwhwh...", "l.rrrkrrr.l", ".rkrrkrrkr.", "lrrrrkrrrrl", ".rrkrkrkrr.", "l.rrrkrrr.l", "....rkr...."],
      ["....hhh....", "...hwhwh...", ".lrrrkrrrl.", "lrkrrkrrkrl", ".rrrrkrrrr.", "lrrkrkrkrrl", ".lrrrkrrrl.", "....rkr...."],
    ],
    colors: { h: C.ink, w: C.white, k: C.ink, l: C.ink, r: C.pink },
  },
  {
    // A beetle with a shiny shell.
    rows: [
      [".a.......a.", "..a.....a..", "...hhhhh...", "l.ssslsss.l", ".lshslshsl.", "l.ssslsss.l", "..ssslsss..", "...ss.ss..."],
      [".a.......a.", "..a.....a..", "...hhhhh...", ".lssslsssl.", "l.shslshs.l", ".lssslsssl.", "..ssslsss..", "...ss.ss..."],
    ],
    colors: { a: C.grey, h: "#3f7a5c", l: "#2f5e46", s: C.green, },
  },
];
const ROW_KIND = [0, 1, 1, 2];

const bug = (kind: number, frame: number) => {
  const b = BUGS[kind]!;
  return sprite(`bug-${kind}-${frame}`, b.rows[frame]!, b.colors);
};
const zapper = () => sprite("bug-zapper", ["....www....", "....wbw....", "...bbbbb...", ".bbbbbbbbb.", "bbybbbbbybb", "bbbbbbbbbbb"], { w: C.white, b: C.blue, y: C.yellow });

/** A few fixed stars behind the swarm. */
const STARS = Array.from({ length: 24 }, (_, i) => ({ x: (i * 67 + 13) % SW, y: TOP + ((i * 41 + 7) % (SH - TOP - 20)), p: i % 5 }));

export const BUGS_GAME: Game<BugsState> = {
  id: "bugs",
  name: "Bug Hunt",
  tag: "Zap the swarm before it lands",
  goal: ["ZAP EVERY BUG", "DODGE THE GLITCHES"],
  keys: "← → move · space zap",
  init: initBugs,
  step: stepBugs,
  draw(ctx, s, hi) {
    ctx.fillStyle = C.screen;
    ctx.fillRect(0, TOP, SW, SH - TOP);
    for (const st of STARS) {
      ctx.fillStyle = Math.floor(s.tick / 30 + st.p) % 5 === 0 ? C.white : C.line;
      ctx.fillRect(st.x, st.y, 1, 1);
    }
    ctx.fillStyle = C.line;
    ctx.fillRect(0, LINE + 1, SW, 1);
    const frame = Math.floor(s.fx / 2 + s.fy / 5) % 2;
    for (let i = 0; i < s.alive.length; i++) {
      if (!s.alive[i]) continue;
      const b = bugAt(s, i);
      ctx.drawImage(bug(ROW_KIND[Math.floor(i / COLS)]!, frame), b.x - 1, b.y - 1);
    }
    for (const bm of s.booms) {
      const r = bm.t > 6 ? 2 : 4;
      ctx.fillStyle = bm.t > 6 ? C.white : C.yellow;
      ctx.fillRect(bm.x - r, bm.y, 1, 1);
      ctx.fillRect(bm.x + r, bm.y, 1, 1);
      ctx.fillRect(bm.x, bm.y - r, 1, 1);
      ctx.fillRect(bm.x, bm.y + r, 1, 1);
      ctx.fillRect(bm.x - r + 1, bm.y - r + 1, 1, 1);
      ctx.fillRect(bm.x + r - 1, bm.y - r + 1, 1, 1);
      ctx.fillRect(bm.x - r + 1, bm.y + r - 1, 1, 1);
      ctx.fillRect(bm.x + r - 1, bm.y + r - 1, 1, 1);
    }
    for (const d of s.drops) {
      const zig = Math.floor(d.y / 3) % 2;
      ctx.fillStyle = C.orange;
      ctx.fillRect(d.x + zig, d.y, 2, 2);
      ctx.fillRect(d.x + 1 - zig, d.y + 2, 2, 2);
      ctx.fillStyle = C.pink;
      ctx.fillRect(d.x + zig, d.y + 4, 2, 1);
    }
    if (s.shot) {
      ctx.fillStyle = C.yellow;
      ctx.fillRect(s.shot.x, s.shot.y, 1, 4);
      ctx.fillStyle = C.white;
      ctx.fillRect(s.shot.x, s.shot.y, 1, 1);
    }
    if (s.hurt === 0 || Math.floor(s.hurt / 5) % 2 === 0) ctx.drawImage(zapper(), Math.round(s.x - ZW / 2) - 1, ZY - 1);
    hud(ctx, s.score, hi, s.lives);
  },
  icon(ctx, x, y) {
    ctx.drawImage(bug(1, 0), x - 1, y);
  },
  cheer: "All bugs squashed!",
  sigh: () => "The bugs won this round…",
};
