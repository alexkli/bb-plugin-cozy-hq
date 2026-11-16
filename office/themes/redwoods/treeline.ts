// Redwood Camp's treeline: the top of the camp is forest, not a wall. Misty
// depth with far trunks, a dark canopy overhead, ferns and salal underneath,
// giant trunks with the sky showing between them (the office's windows), the
// notice board on log posts and the trailhead gate where people come and go.
import type { PaintInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { blit, Grid, hash, makeCanvas, OUTLINE, rng } from "../../themekit.ts";
import { barkFill, C, cached, hlog } from "./kit.ts";
import { campData, type LineTrunk } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;

/** The air in the woods, dark under the canopy and by the ground, misty light between. */
const AIR = ["#1f3326", "#2a4232", "#365240", "#43614d", "#4f705a"];
/** Far trunks in the haze: body, lit side, shade. */
const FAR = ["#6a5d53", "#7d6e61", "#574b43"];
/** Middle trunks. */
const MID = ["#6a3428", "#86452f", "#43201a", "#52281e"];
/** Canopy greens, darkest first. */
const LEAF = ["#14261a", "#1b3022", "#24402b", "#2f5230", "#3f6a38", "#57864a"];
/** Undergrowth: salal and huckleberry. */
const BUSH = ["#1d3520", "#27472a", "#335d33", "#467a3f", "#5f9a4e"];

function airLevel(k: number): number {
  if (k < 0.16) return 0.6 + (k / 0.16) * 1.6;
  if (k < 0.46) return 2.2 + ((k - 0.16) / 0.3) * 1.8;
  if (k < 0.72) return 4 - ((k - 0.46) / 0.26) * 2;
  return Math.max(0, 2 - ((k - 0.72) / 0.28) * 2);
}

/** How far the canopy hangs down at column x (deterministic, shared with the snow). */
export function canopyEdge(x: number): number {
  return 6 + Math.round(2.2 * Math.sin(x * 0.21) + 1.6 * Math.sin(x * 0.083 + 1.7) + 1.1 * Math.sin(x * 0.47 + 0.6));
}

/** Where the undergrowth tops out at column x, for a stretch of depth d. */
export function underTop(x: number, d: number): number {
  const bump = Math.max(0, Math.sin(x * 0.061 + 0.4)) * 4;
  return d - 7 - Math.round(2 * Math.sin(x * 0.19 + 0.8) + 1.4 * Math.sin(x * 0.53) + bump);
}

/** The misty depth of the woods, the far and middle trunks, the canopy and the undergrowth behind. */
function backLayer(x0: number, x1: number, d: number): Grid {
  const w = x1 - x0;
  const g = new Grid(w, d + 3);
  const r = rng(hash(`tl-${x0}-${d}`));
  for (let y = 0; y < d; y++) {
    const v = airLevel(y / d);
    const i = Math.floor(v);
    const f = v - i;
    for (let x = 0; x < w; x++) g.set(x, y, AIR[Math.min(AIR.length - 1, i + (f > bayer(x0 + x, y) ? 1 : 0))]!);
  }
  // Far trunks, pale in the haze
  for (let x = Math.floor(r() * 4); x < w; x += 5 + Math.floor(r() * 7)) {
    const tw = 2 + (r() < 0.3 ? 1 : 0);
    const bot = d - 3 - Math.floor(r() * 5);
    g.rect(x, 0, tw, bot, FAR[0]!);
    g.rect(x, 0, 1, bot, FAR[1]!);
    if (tw > 2) g.rect(x + tw - 1, 0, 1, bot, FAR[2]!);
  }
  // Mist lying among them
  for (let n = 0; n < w / 9; n++) {
    const my = Math.round(d * (0.36 + r() * 0.24));
    const mx = Math.floor(r() * w);
    const len = 6 + Math.floor(r() * 16);
    for (let i = 0; i < len; i++) if (r() < 0.8) g.set(mx + i, my, AIR[4]!);
    for (let i = 2; i < len - 2; i++) if (r() < 0.5) g.set(mx + i, my + 1, AIR[3]!);
  }
  // Middle trunks
  for (let x = 4 + Math.floor(r() * 14); x < w; x += 18 + Math.floor(r() * 22)) {
    const tw = 4 + Math.floor(r() * 4);
    g.rect(x, 0, tw, d, MID[0]!);
    g.rect(x, 0, 1, d, MID[1]!);
    g.rect(x + tw - 1, 0, 1, d, MID[2]!);
    for (let k = 0; k < tw - 2; k++) {
      let gx = x + 1 + Math.floor(r() * (tw - 2));
      for (let y = Math.floor(r() * 10); y < d; y += 1) {
        if (r() < 0.1) gx = Math.min(x + tw - 2, Math.max(x + 1, gx + (r() < 0.5 ? -1 : 1)));
        if (r() < 0.75) g.set(gx, y, MID[3]!);
      }
    }
    g.set(x - 1, d - 1, MID[2]!).set(x + tw, d - 1, MID[2]!).set(x - 1, d - 2, MID[0]!);
  }
  // Canopy overhead, with boughs hanging lower here and there
  for (let x = 0; x < w; x++) {
    const e = canopyEdge(x0 + x);
    for (let y = 0; y < e; y++) {
      const lit = (x0 + x + y * 3) % 7 === 0 && y > 1;
      g.set(x, y, y === e - 1 ? LEAF[0]! : lit ? LEAF[3]! : bayer(x0 + x, y) < 0.5 ? LEAF[1]! : LEAF[2]!);
    }
    if ((x0 + x) % 4 === 1) g.set(x, e - 2, LEAF[4]!);
  }
  for (let cx = Math.floor(r() * 12); cx < w + 8; cx += 14 + Math.floor(r() * 16)) {
    const bw = 10 + Math.floor(r() * 9);
    const bd = 4 + Math.floor(r() * 5);
    const e = canopyEdge(x0 + cx) - 2;
    bough(g, cx, e, bw, bd);
  }
  // Undergrowth behind: a mound of salal and young ferns
  for (let x = 0; x < w; x++) {
    const u = underTop(x0 + x, d);
    for (let y = u; y < d; y++) {
      const k = (y - u) / Math.max(1, d - u);
      const c = y === u ? BUSH[3]! : k < 0.35 ? (bayer(x0 + x, y) < 0.4 ? BUSH[3]! : BUSH[2]!) : k < 0.75 ? BUSH[1]! : BUSH[0]!;
      g.set(x, y, c);
    }
    if ((x0 + x) % 3 === 0) g.set(x, u - 1, BUSH[2]!);
    if ((x0 + x) % 5 === 2) g.set(x, u, BUSH[4]!);
    // A ragged edge over the camp floor
    const h = hash(`ug-${x0 + x}`) % 100;
    if (h < 60) g.set(x, d, BUSH[0]!);
    if (h < 22) g.set(x, d + 1, BUSH[1]!);
  }
  return g;
}

/** A fir bough hanging from the canopy: a drooping spray, lit on top. */
function bough(g: Grid, cx: number, y: number, bw: number, bd: number): void {
  for (let j = 0; j < bd; j++) {
    const half = Math.round((bw / 2) * Math.pow(1 - j / bd, 0.7));
    for (let x = cx - half; x <= cx + half; x++) {
      const edge = x === cx - half || x === cx + half;
      g.set(x, y + j, j === bd - 1 || edge ? LEAF[0]! : j < 2 && x < cx ? LEAF[4]! : (x + j) % 3 === 0 ? LEAF[3]! : LEAF[2]!);
    }
  }
  // Drooping tips
  g.set(cx - Math.round(bw / 2), y + 1, LEAF[2]!).set(cx - Math.round(bw / 2), y + 2, LEAF[0]!);
  g.set(cx + Math.round(bw / 2), y + 1, LEAF[2]!).set(cx + Math.round(bw / 2), y + 2, LEAF[0]!);
}

/** A sword fern: fronds fanning up from the ground (bx, by). */
function fern(g: Grid, bx: number, by: number, h: number, flip: boolean): void {
  const fronds = [-3, -1.4, 0, 1.4, 3];
  for (const [i, lean] of fronds.entries()) {
    const fh = Math.round(h * (i === 2 ? 1 : i === 1 || i === 3 ? 0.85 : 0.6));
    for (let j = 0; j < fh; j++) {
      const k = j / fh;
      const x = Math.round(bx + lean * k * (flip ? -1 : 1) + lean * k * k * 1.2);
      const y = by - j;
      g.set(x, y, j > fh - 3 ? C.fernHi : C.fern);
      if (j > 1 && j % 2 === 0) {
        g.set(x - 1, y, C.fernDk);
        g.set(x + 1, y, j % 4 === 0 ? C.fernHi : C.fernDk);
      }
    }
  }
}

function trunkGrid(t: LineTrunk): { g: Grid; ox: number } {
  const flare = t.kind === "post" ? 1 : Math.min(5, Math.max(2, Math.round(t.w * 0.3)));
  const gw = t.w + flare * 2 + 2;
  const top = t.top ?? 0;
  const gh = t.d + 4 - top;
  const g = new Grid(gw, gh);
  const ox = flare + 1;
  if (t.kind === "post") {
    // A peeled log post with a cut top.
    g.rect(ox, 0, t.w, gh - 1, C.log);
    g.rect(ox, 0, 1, gh - 1, C.logHi);
    g.rect(ox + t.w - 1, 0, 1, gh - 1, C.logLo);
    for (let y = 3; y < gh - 2; y += 7) g.set(ox + 1 + (y % 3), y, C.logLo).set(ox + 1 + (y % 3), y + 1, C.logLo);
    if (top > 0) g.rect(ox, 0, t.w, 1, C.ring).set(ox + Math.floor(t.w / 2), 0, C.logLo);
    g.set(ox - 1, gh - 2, C.logLo).set(ox + t.w, gh - 2, C.logDk);
  } else {
    barkFill(g, ox, 0, t.w, gh, t.seed);
    for (let y = gh - 12; y < gh; y++) {
      const k = (y - (gh - 12)) / 12;
      const grow = Math.round(Math.pow(Math.max(0, k), 1.6) * flare * 1.2);
      for (let i = 1; i <= Math.min(flare, grow); i++) {
        g.set(ox - i, y, i === grow ? C.barkDk : C.barkHi);
        g.set(ox + t.w - 1 + i, y, i === grow ? C.barkDk : C.bark);
      }
    }
    const r = rng(t.seed + 7);
    for (let i = -flare; i < t.w + flare; i++) if (g.get(ox + i, gh - 3) && r() < 0.6) g.set(ox + i, gh - 3 - Math.floor(r() * 3), r() < 0.5 ? C.moss : C.mossHi);
    if (t.w >= 12 && gh > 50 && r() < 0.7) {
      const fy = Math.floor(gh * (0.45 + r() * 0.2));
      g.rect(ox + t.w - 2, fy, 4, 1, "#e0b77e").rect(ox + t.w - 1, fy + 1, 3, 1, "#b58652");
    }
  }
  g.outline(OUTLINE);
  // The trunk carries on up out of the picture.
  if (top === 0) for (let x = 0; x < gw; x++) if (g.get(x, 0) === OUTLINE) g.set(x, 0, null);
  return { g, ox };
}

function birdhouse(g: Grid, x: number, y: number): void {
  g.rect(x + 1, y + 3, 5, 6, C.log).rect(x + 1, y + 3, 1, 6, C.logHi).rect(x + 5, y + 3, 1, 6, C.logLo);
  for (let j = 0; j < 3; j++) g.rect(x + 3 - j - 1, y + j + 1, (j + 1) * 2 + 1, 1, j === 2 ? C.plaidDk : C.plaid);
  g.set(x + 3, y + 5, OUTLINE).set(x + 3, y + 7, C.logDk).set(x + 4, y + 7, C.logDk);
}

/** The wall step: the treeline across the top of the camp. */
export function paintTreeline(ctx: Ctx, L: Layout): void {
  for (const s of L.segments) blit(ctx, backLayer(s.x0, s.x1, s.depth).toCanvas(), s.x0, 0);
  const line = campData(L)?.line;
  const trunks = line?.trunks ?? [];
  // Giant trunks (and the posts under the fixtures)
  for (const t of [...trunks].sort((a, b) => (a.kind === "post" ? 1 : 0) - (b.kind === "post" ? 1 : 0))) {
    const { g, ox } = trunkGrid(t);
    if (t.house !== undefined && t.kind === "trunk") {
      const hg = new Grid(7, 9);
      birdhouse(hg, 0, 0);
      hg.outline(OUTLINE);
      blit(ctx, g.toCanvas(), t.x - ox, t.top ?? 0);
      blit(ctx, hg.toCanvas(), t.x + Math.floor(t.w / 2) - 3, t.house);
      continue;
    }
    blit(ctx, g.toCanvas(), t.x - ox, t.top ?? 0);
  }
  // In front: the canopy closing over the trunk tops, ferns and salal at their feet.
  const door = L.wall.door;
  for (const s of L.segments) {
    const w = s.x1 - s.x0;
    const g = new Grid(w, s.depth + 4);
    const r = rng(hash(`tlf-${s.x0}-${s.depth}`));
    for (let cx = Math.floor(r() * 8); cx < w + 6; cx += 7 + Math.floor(r() * 9)) {
      const e = canopyEdge(s.x0 + cx);
      const cw = 6 + Math.floor(r() * 8);
      for (let x = cx - cw; x <= cx + cw; x++) {
        const dy = Math.round(Math.sqrt(Math.max(0, 1 - ((x - cx) / (cw + 0.5)) ** 2)) * (e - 1));
        for (let y = 0; y < dy; y++) g.set(x, y, y === dy - 1 ? LEAF[0]! : (x + y) % 5 === 0 ? LEAF[3]! : y < 2 ? LEAF[1]! : LEAF[2]!);
      }
    }
    for (const t of trunks) {
      if (t.kind !== "trunk" || t.x + t.w < s.x0 || t.x > s.x1) continue;
      const cx = t.x - s.x0 + Math.floor(t.w / 2);
      bough(g, cx + (t.seed % 2 ? 3 : -3), canopyEdge(t.x + Math.floor(t.w / 2)) - 3, t.w + 10, 5);
    }
    for (let x = 2 + Math.floor(r() * 5); x < w; x += 5 + Math.floor(r() * 8)) {
      const ax = s.x0 + x;
      if (ax > door.x - 4 && ax < door.x + door.w + 4) continue;
      const kind = r();
      if (kind < 0.55) fern(g, x, s.depth + 1, 6 + Math.floor(r() * 6), r() < 0.5);
      else if (kind < 0.85) {
        const rx = 3 + Math.floor(r() * 3);
        g.ellipse(x, s.depth - 1, rx, 3, BUSH[2]!);
        g.ellipse(x - 1, s.depth - 2, rx - 1, 2, BUSH[3]!);
        g.set(x - 1, s.depth - 4, BUSH[4]!).set(x + 1, s.depth - 3, BUSH[4]!);
        if (r() < 0.4) g.set(x + 2, s.depth - 2, "#c4453a").set(x - 2, s.depth - 1, "#c4453a");
      } else if (kind < 0.93) {
        // Trillium
        g.set(x, s.depth, C.fern).set(x, s.depth - 1, C.fern).rect(x - 1, s.depth - 3, 3, 1, C.fernHi);
        g.set(x, s.depth - 3, "#f4f0e4").set(x - 1, s.depth - 4, "#f4f0e4").set(x + 1, s.depth - 4, "#f4f0e4");
      } else {
        g.set(x, s.depth, "#e8d8b8").set(x, s.depth - 1, "#e8d8b8").rect(x - 1, s.depth - 3, 3, 2, "#c4453a").set(x, s.depth - 3, "#f4f0e4");
      }
    }
    blit(ctx, g.toCanvas(), s.x0, 0);
    // The undergrowth's shadow on the camp floor
    ctx.fillStyle = "rgba(20,14,8,0.22)";
    ctx.fillRect(s.x0, s.depth + 2, w, 2);
    ctx.fillStyle = "rgba(20,14,8,0.1)";
    ctx.fillRect(s.x0, s.depth + 4, w, 2);
  }
}

/** The window step: the sky gap's edges, canopy above and ferns below, a twig poking in. */
export function paintGap(ctx: Ctx, win: Rect): void {
  const { x, y, w, h } = win;
  const key = `redwoods|gap|${x}|${y}|${w}|${h}`;
  const cv = cached(key, () => {
    const g = new Grid(w + 4, h + 4);
    const ox = 2;
    const oy = 2;
    const r = rng(hash(key));
    // Leafy clumps hanging into the top, bushes rising into the bottom (masks first, then shading).
    const top = new Uint8Array((w + 4) * (h + 4));
    const bot = new Uint8Array((w + 4) * (h + 4));
    const blob = (m: Uint8Array, cx: number, cy: number, rx: number, ry: number) => {
      for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
        for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
          if (i < 0 || j < 0 || i >= w + 4 || j >= h + 4) continue;
          if (((i - cx) / (rx + 0.4)) ** 2 + ((j - cy) / (ry + 0.4)) ** 2 <= 1) m[j * (w + 4) + i] = 1;
        }
      }
    };
    for (let cx = 0; cx < w + 6; cx += 3 + Math.floor(r() * 4)) {
      blob(top, cx, oy + 1 + Math.floor(r() * 3), 2 + Math.floor(r() * 4), 2 + Math.floor(r() * 4));
      if (r() < 0.3) blob(top, cx + 1, oy + 6 + Math.floor(r() * 2), 1.5, 2.5 + r() * 2);
      const tall = r() < 0.35;
      blob(bot, cx, h + oy - 1 - Math.floor(r() * 3), 2 + Math.floor(r() * 3), tall ? 5 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3));
    }
    for (let i = 0; i < w + 4; i++) for (let j = 0; j < oy + 1; j++) top[j * (w + 4) + i] = 1;
    for (let i = 0; i < w + 4; i++) for (let j = h + oy - 1; j < h + 4; j++) bot[j * (w + 4) + i] = 1;
    const at = (m: Uint8Array, i: number, j: number) => i >= 0 && j >= 0 && i < w + 4 && j < h + 4 && m[j * (w + 4) + i] === 1;
    for (let j = 0; j < h + 4; j++) {
      for (let i = 0; i < w + 4; i++) {
        const ax = x - ox + i;
        if (at(top, i, j)) {
          const rim = !at(top, i, j + 1);
          g.set(i, j, rim ? LEAF[0]! : !at(top, i, j + 2) && (ax + j) % 3 === 0 ? LEAF[4]! : bayer(ax, j) < 0.45 ? LEAF[2]! : LEAF[1]!);
        } else if (at(bot, i, j)) {
          const rim = !at(bot, i, j - 1);
          const under = !at(bot, i, j - 2);
          g.set(i, j, rim ? (ax % 3 === 0 ? BUSH[4]! : BUSH[3]!) : under ? BUSH[3]! : bayer(ax, j) < 0.4 ? BUSH[2]! : BUSH[1]!);
          if (rim && (ax * 7 + j) % 11 === 0) g.set(i, j + 1, "#c4453a");
        }
      }
    }
    for (let n = 0; n < Math.max(2, Math.floor(w / 14)); n++) {
      const fx = ox + 3 + Math.floor(r() * (w - 6));
      fern(g, fx, h + oy, 5 + Math.floor(r() * 4), r() < 0.5);
    }
    // A twig with a few needle tufts poking in from one side
    const left = (x >> 3) % 2 === 0;
    const ty = oy + Math.round(h * 0.4) + Math.floor(r() * 4);
    const len = 5 + Math.floor(r() * 3);
    for (let i = 0; i < len; i++) {
      const tx = left ? ox + 2 + i : ox + w - 3 - i;
      const yy = ty + Math.floor(i / 3);
      g.set(tx, yy, C.walnut);
      if (i % 2 === 1) g.set(tx, yy - 1, LEAF[3]!).set(tx, yy + 1, LEAF[2]!);
      if (i === len - 1) g.set(tx + (left ? 1 : -1), yy, LEAF[3]!);
    }
    return g.toCanvas();
  });
  blit(ctx, cv, x - 2, y - 2);
}

/** The notice board: the usage board on its two log posts under a log beam. */
export function noticeBoard(ctx: Ctx, r: Rect, frame: (ctx: Ctx, r: Rect) => void): void {
  frame(ctx, r);
  const g = new Grid(r.w + 12, 6);
  hlog(g, 1, 0, r.w + 10, 5, 41, true);
  g.outline(OUTLINE);
  blit(ctx, g.toCanvas(), r.x - 6, Math.max(0, r.y - 3));
}

// ------------------------------------------------------------------ the trailhead

/** The trail leading off into the woods, seen through the gate (w×h). */
function trailView(w: number, h: number): HTMLCanvasElement {
  return cached(`redwoods|trail|${w}x${h}`, () => {
    const g = new Grid(w, h);
    const cx = Math.floor(w / 2);
    const vy = Math.round(h * 0.36);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.hypot((x - cx) * 1.2, (y - vy) * 0.9);
        const v = Math.max(0, 4.4 - d / 5.5);
        const i = Math.floor(v);
        g.set(x, y, AIR[Math.min(4, i + (v - i > bayer(x, y) ? 1 : 0))]!);
      }
    }
    // Sunlight in a clearing at the end of the trail
    g.ellipse(cx, vy - 1, 3, 2, "#9fbc94").ellipse(cx, vy - 1, 2, 1, "#cfe0b4").set(cx, vy - 1, "#eef2d0");
    // The trail, narrowing into the distance
    for (let y = vy; y < h; y++) {
      const k = (y - vy) / (h - vy);
      const half = 0.8 + k * (w / 2 - 2);
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const edge = x <= Math.round(cx - half) || x >= Math.round(cx + half);
        g.set(x, y, edge ? C.soilLo : k < 0.25 ? "#8a7a5c" : k < 0.55 ? "#7a5e42" : (x * 3 + y) % 7 === 0 ? C.needleHi : "#8a6a48");
      }
    }
    // Ferns along both sides, smaller further off
    for (let y = vy + 4; y < h; y += 5) {
      const k = (y - vy) / (h - vy);
      const half = Math.round(0.8 + k * (w / 2 - 2));
      const fh = 2 + Math.round(k * 5);
      for (const side of [-1, 1]) fern(g, cx + side * (half + 2), y, fh, side > 0);
    }
    // Boughs arching over
    for (let x = 0; x < w; x++) {
      const e = 2 + Math.round(1.5 * Math.sin(x * 0.9) + Math.abs(x - cx) * 0.45);
      for (let y = 0; y < e; y++) g.set(x, y, y === e - 1 ? LEAF[0]! : (x + y) % 4 === 0 ? LEAF[3]! : LEAF[2]!);
    }
    return g.toCanvas();
  });
}

/** One leaf of the split-rail gate (w wide, h tall), closed. */
function gateLeaf(g: Grid, x: number, y: number, w: number, h: number, hingeLeft: boolean): void {
  const wood = C.porch;
  g.rect(x, y, 2, h, wood).rect(x + w - 2, y, 2, h, wood);
  g.rect(x, y + 1, w, 2, wood).rect(x, y + h - 4, w, 2, wood);
  g.rect(x, y + 1, w, 1, C.porchHi).rect(x, y + h - 4, w, 1, C.porchHi);
  g.rect(x, y, 1, h, C.porchHi);
  // The diagonal brace
  for (let i = 0; i < w - 2; i++) {
    const yy = hingeLeft ? y + h - 4 - Math.round((i / (w - 2)) * (h - 6)) : y + 2 + Math.round((i / (w - 2)) * (h - 6));
    g.set(x + 1 + i, yy, C.porchLo);
  }
}

/** The door step: a trailhead gate between a giant and a log post, with a carved "+" sign. */
export function trailhead(ctx: Ctx, d: Rect): void {
  blit(ctx, trailView(d.w + 2, d.h), d.x - 1, d.y);
  const gate = new Grid(d.w + 2, 13);
  const lw = Math.floor((d.w + 2) / 2);
  gateLeaf(gate, 0, 1, lw, 11, true);
  gateLeaf(gate, lw, 1, d.w + 2 - lw, 11, false);
  gate.set(lw - 1, 4, C.iron).set(lw, 4, C.iron);
  gate.outline(OUTLINE);
  blit(ctx, gate.toCanvas(), d.x - 1, d.y + d.h - 12);
  // The lintel log across the top, from the giant to the post.
  const lg = new Grid(d.w + 26, 6);
  hlog(lg, 1, 1, d.w + 24, 4, 77, true);
  lg.outline(OUTLINE);
  blit(ctx, lg.toCanvas(), d.x - 15, d.y - 6);
  // A lantern hanging under the lintel by the post.
  const ln = new Grid(7, 10);
  ln.set(3, 0, C.iron).set(3, 1, C.iron).rect(2, 2, 3, 1, C.iron).rect(1, 3, 5, 5, C.iron).rect(2, 4, 3, 3, C.glass).set(3, 5, C.flameHi).rect(1, 8, 5, 1, C.iron);
  ln.outline(OUTLINE);
  blit(ctx, ln.toCanvas(), d.x + d.w - 6, d.y - 1);
  // The "+" sign: a carved plaque standing on the lintel.
  const sg = new Grid(16, 11);
  sg.rect(4, 8, 1, 3, C.logDk).rect(11, 8, 1, 3, C.logDk);
  sg.rect(1, 0, 14, 9, "#3f6b3a");
  sg.rect(1, 0, 14, 1, "#5a8a4a");
  sg.rect(7, 1, 2, 7, C.cream).rect(5, 3, 6, 2, C.cream);
  sg.outline(OUTLINE);
  blit(ctx, sg.toCanvas(), d.x + d.w / 2 - 8, Math.max(0, d.y - 16));
}

/** The gate swung open while someone comes or goes. */
export function gateOpen(ctx: Ctx, d: Rect, info: PaintInfo): boolean {
  const open = cached(`redwoods|gate-open|${d.w}x${d.h}`, () =>
    makeCanvas(d.w + 2, d.h, (c) => {
      c.drawImage(trailView(d.w + 2, d.h), 0, 0);
      // The two leaves folded back against the posts
      for (const x of [0, d.w - 2]) {
        c.fillStyle = OUTLINE;
        c.fillRect(x, d.h - 12, 4, 12);
        c.fillStyle = C.porch;
        c.fillRect(x + 1, d.h - 11, 2, 10);
        c.fillStyle = C.porchHi;
        c.fillRect(x + 1, d.h - 11, 1, 10);
      }
    }),
  );
  ctx.drawImage(open, d.x - 1, d.y);
  if (info.night > 0.4) {
    // Lantern light on the trail
    ctx.fillStyle = "rgba(255,200,110,0.18)";
    ctx.fillRect(d.x + 3, d.y + d.h - 10, d.w - 6, 8);
  }
  return true;
}
