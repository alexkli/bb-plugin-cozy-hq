// Coffee Shop: the floor plan. A neighborhood café on a street corner, with
// the office moved in: the shop windows onto the street with the window bar
// and its stools under them, café tables everywhere (two-tops, four-tops and
// a long communal table, laptops open), the espresso bar under the back wall
// with the baristas behind it and the pickup stools in front, the fireside
// corner with the sofa, the big table under the RESERVED sign (planning),
// your usual corner (the snug: a raised nook with a railing), the open-mic
// stage and the storeroom with the router and the roaster.
// Pure geometry (no canvas): the layout tests run it in Node.
//
// Wide:                                              Phone:
//  ┌ shop windows · door ┬ fireplace ┬ back bar ┐     ┌ back bar · window · door ┐
//  │ window bar          │ fireside  │ baristas │     │ baristas, the counter    │
//  │ tables              │ corner    │ counter  │     │ tables                   │
//  ╞═════════════════════╪═══════════╪══════════╡     │ fireside corner          │
//  │ tables / reserved   │ stage     │ snug     │     │ tables                   │
//  │ table               │ arcade    │ storeroom│     │ reserved table · snug    │
//  └─────────────────────┴───────────┴──────────┘     └ stage · storeroom ───────┘

import type { Layout, Point, Rect, Spot } from "../../layout.ts";
import {
  arcadeFromAbove,
  Builder,
  buildBoss,
  buildLounge,
  buildPods,
  buildServerRoom,
  clamp,
  finish,
  POD_H,
  utilities,
  via,
  type Access,
  type Network,
  type WallSegment,
} from "../../themekit.ts";

/** A café table the desks sit at: `y` is the north desk's y (the bar: its desks' y). */
export interface Table {
  x: number;
  y: number;
  w: number;
  kind: "two" | "four" | "long" | "bar";
}

/** The espresso bar. */
export interface Counter {
  /** The whole area (the kitchen). */
  r: Rect;
  /** The front counter's top-left (the kitchen-counter prop) and its width. */
  x: number;
  y: number;
  w: number;
  /** Where the baristas stand (feet), and how far they roam. */
  staffY: number;
  staffX0: number;
  staffX1: number;
  /** The espresso machine (the prop's top-left). */
  machine: Point;
  /** The pickup end of the counter (the bell). */
  pickup: Rect;
  /** Things standing on the counter top (null where the counter's too short for them). */
  grinder: Rect;
  tips: Rect;
  register: Rect | null;
  pastry: Rect;
  /** Cups waiting at the pickup. */
  cups: Rect;
  /** Against a wall (the back bar is painted on it) or free-standing (a back counter of its own). */
  walled: boolean;
}

export interface CafePlan {
  cafe: true;
  /** The shop windows' stretch of wall. */
  storefront: { x0: number; x1: number };
  /** The fireplace in the wall (wide plans). */
  fireplace: Rect | null;
  /** Chalkboard menus on the back wall. */
  menus: Rect[];
  /** The window bar's plank. */
  bar: Rect | null;
  tables: Table[];
  counter: Counter;
  /** The big table under the RESERVED sign (planning). */
  reserved: Rect;
  /** The open-mic stage. */
  stage: Rect | null;
  /** The storeroom (the server room and the roaster beside it). */
  storeroom: Rect | null;
  roaster: Point | null;
  /** The wooden floor of the café proper vs. the tiles at the counter. */
  tiles: Rect[];
  rugs: Rect[];
  /** Walks besides the spots' own paths (gags): kept clear when decor is placed. */
  extra: Point[][];
}

/** The plan stashed on a Coffee Shop layout (null on any other). */
export function planOf(L: Layout): CafePlan | null {
  const d = L.themeData as Partial<CafePlan> | undefined;
  return d && d.cafe === true ? (d as CafePlan) : null;
}

const HALF = 10; // hallways are 20 px wide

// ------------------------------------------------------------------ the pieces

/**
 * A row of café tables: `groups` desk pairs side by side per table (1 a
 * two-top, 2 a four-top, 3+ the long communal table), with a gap between
 * tables. Pods' geometry, so the subagent helpers fit as at any desk.
 */
function tableRow(b: Builder, x: number, ry: number, groups: number[], gap: number, acc: Access, tables: Table[]): number {
  let cx = x;
  for (const n of groups) {
    buildPods(b, { x: cx, y: ry, w: n * 48, h: POD_H }, acc);
    tables.push({ x: cx, y: ry + 18, w: n * 48, kind: n === 1 ? "two" : n === 2 ? "four" : "long" });
    cx += n * 48 + gap;
  }
  return cx - gap;
}

/** How a row of `cols` desk pairs breaks into tables: a long one in the middle when there's width, else two- and four-tops. */
function grouping(cols: number, communal: boolean): number[] {
  if (cols <= 0) return [];
  if (communal && cols >= 4) {
    const long = Math.min(cols - 2, 4);
    const left = Math.floor((cols - long) / 2);
    return [...(left ? [left] : []), long, ...(cols - long - left ? [cols - long - left] : [])];
  }
  const out: number[] = [];
  let left = cols;
  let i = 0;
  while (left > 0) {
    const n = left >= 3 || (left === 2 && i % 2 === 0) ? (i % 2 === 0 ? 2 : 1) : left;
    out.push(Math.min(n, left));
    left -= Math.min(n, left);
    i++;
  }
  return out;
}

/** Width of a table row with gaps. */
const rowWidth = (groups: number[], gap: number) => groups.reduce((s, n) => s + n * 48, 0) + gap * Math.max(0, groups.length - 1);

/** The most desk pairs that fit in `w` (the tables touch; each is drawn a little inset). */
function fitCols(w: number, communal: boolean): number[] {
  for (let cols = Math.floor(w / 48); cols > 0; cols--) {
    const g = grouping(cols, communal);
    if (rowWidth(g, 0) <= w) return g;
  }
  return [];
}

/**
 * The window bar: a plank under the shop windows, laptops on it, stools in a
 * row with everyone's back to you (south seats, a desk's geometry).
 */
function windowBar(b: Builder, x0: number, n: number, Y: number, acc: Access): Rect | null {
  if (n <= 0) return null;
  for (let i = 0; i < n; i++) {
    const dx = x0 + i * 48;
    const index = b.desks.length;
    const sx = dx + 32;
    const spot = b.spot({
      id: `desk-${index}`,
      kind: "desk",
      group: "desk",
      x: sx,
      y: Y + 43,
      facing: "back",
      pose: "sit-desk",
      path: via(acc, Y + 52, sx, Y + 43),
      activity: "at the window bar",
    });
    b.desks.push({ index, side: "south", x: dx, y: Y, pcX: dx + 24, pcY: Y - 6, chairX: dx + 24, chairY: Y + 29, spot, screen: { x: dx + 27, y: Y - 1, w: 10, h: 5 } });
  }
  const pod: Rect = { x: x0, y: Y - 4, w: n * 48, h: 52 };
  b.pods.push(pod);
  b.rooms.push({ kind: "pod", rect: pod });
  return { x: x0 + 2, y: Y - 4, w: n * 48 - 4 + 14, h: 20 };
}

/**
 * The espresso bar in `r` (the hallway below it): the counter with the
 * machine at its left end, the order point and the tea station, a row of
 * pickup stools (where threads that need you wait for their order), the
 * drinks cooler at the left end and the cake fridge at the right. The
 * baristas work behind it. `o` pushes it down a little in a deep room.
 */
function buildCounter(b: Builder, r: Rect, acc: Access, walled: boolean): { counter: Counter; waiting: Rect } {
  b.rooms.push({ kind: "kitchen", rect: r });
  const o = clamp(r.h - 100, 0, 24) + (walled ? 0 : 10);
  const top = r.y + 28 + o;
  const cx = r.x + 30;
  const cw = r.w - 56;
  b.prop("kitchen-counter", "kitchen-counter", cx, top, top + 32, cw);
  const machine = { x: cx + 6, y: top - 20 };
  b.prop("espresso", "espresso", machine.x, machine.y, top + 32.5);
  b.poke("coffee", "coffee", { x: machine.x, y: machine.y, w: 26, h: 30 });
  const front = top + 46;
  const lane = front + 8;
  b.spot({ id: "coffee", kind: "coffee", group: "break", x: machine.x + 13, y: front, facing: "back", pose: "stand", path: via(acc, lane, machine.x + 13, front), activity: "making coffee" });
  b.spot({ id: "tea", kind: "tea", group: "break", x: machine.x + 34, y: front, facing: "back", pose: "stand", path: via(acc, lane, machine.x + 34, front), activity: "brewing tea" });
  // The drinks cooler at the left end, the cake fridge at the right.
  const vx = r.x + 2;
  b.prop("vending", "vending", vx, front - 44, front);
  b.poke("vending", "vending", { x: vx, y: front - 44, w: 22, h: 42 });
  b.spot({ id: "vending", kind: "vending", group: "break", x: vx + 11, y: front + 10, facing: "back", pose: "stand", path: via(acc, lane + 6, vx + 11, front + 10), activity: "picking a snack" });
  const fx = r.x + r.w - 22;
  b.prop("fridge", "fridge", fx, front - 34, front);
  b.poke("fridge", "fridge", { x: fx, y: front - 34, w: 20, h: 34 });
  b.spot({ id: "fridge", kind: "fridge", group: "break", x: fx + 10, y: front + 10, facing: "back", pose: "stand", path: via(acc, lane + 6, fx + 10, front + 10), activity: "raiding the fridge" });
  // The pickup stools, in fill order from the order point along to the bell.
  const seats: Spot[] = [];
  const x0 = machine.x + 52;
  const x1 = cx + cw - 8;
  for (let i = 0, x = x0; x <= x1; i++, x += 20) {
    const s: Spot = {
      id: `wait-${i}`,
      kind: "review",
      group: "review",
      x,
      y: front - 2,
      facing: "back",
      pose: "sit-back",
      path: via(acc, lane, x, front - 2),
      activity: "waiting for you",
      lift: 3,
    };
    b.prop(`wait-stool-${i}`, "stool", x - 6, front - 8, front);
    seats.push(s);
  }
  for (const s of seats) b.spot(s);
  b.seats.push(...seats);
  // On the counter top: the grinder, the tip jar and the till by the machine; the cake stand,
  // the cups waiting for pickup and the bell at the far end.
  const pickup: Rect = { x: cx + cw - 20, y: top - 8, w: 18, h: 16 };
  b.poke("bell", "bell", pickup);
  const on = (x: number, w: number, h: number): Rect => ({ x: cx + x, y: top + 8 - h, w, h });
  const pastry = on(cw - 58, 23, 16);
  const counter: Counter = {
    r,
    x: cx,
    y: top,
    w: cw,
    staffY: top + 8,
    staffX0: cx + 8,
    staffX1: cx + cw - 8,
    machine,
    pickup,
    walled,
    grinder: on(33, 9, 18),
    tips: on(44, 6, 9),
    register: cw - 58 >= 72 ? on(52, 16, 12) : null,
    pastry,
    cups: on(cw - 34, 12, 8),
  };
  return { counter, waiting: { x: x0 - 10, y: front - 30, w: x1 - x0 + 20, h: 34 } };
}

/**
 * The big table under the RESERVED sign: a chalkboard on an easel at its
 * head (planners draw on it, presenters stand beside it), the table with
 * chairs round it. Open floor, reached from the hallway above.
 */
function buildReserved(b: Builder, r: Rect, acc: Access): Rect {
  b.rooms.push({ kind: "meeting", rect: r });
  const boardW = clamp(r.w - 72, 56, 84);
  const board: Rect = { x: r.x + 8, y: r.y + 4, w: boardW, h: 34 };
  b.prop("whiteboard", "whiteboard", board.x, board.y, board.y + 40, boardW);
  b.poke("whiteboard", "whiteboard", board);
  const boardY = r.y + 50;
  for (const [i, k] of [0.3, 0.7].entries()) {
    const x = Math.round(board.x + boardW * k);
    b.spot({ id: `board-${i}`, kind: "whiteboard", group: "meeting", x, y: boardY, facing: "back", pose: "draw", path: via(acc, boardY + 2, x, boardY), activity: "planning at the whiteboard" });
  }
  const presentY = boardY - 2;
  for (let i = 0, x = board.x + boardW + 14; i < 2 && x <= r.x + r.w - 10; i++, x += 22) {
    b.spot({ id: `present-${i}`, kind: "present", group: "present", x, y: presentY, facing: "front", pose: "stand", path: via(acc, presentY + 8, x, presentY), activity: "presenting a plan for your review" });
  }
  const tableX = r.x + Math.round((r.w - 68) / 2) - 6;
  if (r.h >= 150) {
    const tableY = boardY + 26;
    b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
    const topY = tableY + 4;
    const bottomY = tableY + 38;
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-t${i}`, kind: "meeting-seat", group: "meeting", x, y: topY, facing: "front", pose: "sit-front", path: via(acc, tableY - 6, x, topY), activity: "going through the plans" });
      b.prop(`meet-chair-t${i}`, "meeting-chair-front", x - 8, topY - 24, topY - 1);
    }
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: bottomY, facing: "back", pose: "sit-back", path: via(acc, bottomY + 6, x, bottomY), activity: "planning in the meeting room" });
      b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, bottomY - 14, bottomY + 2);
    }
  } else if (r.h >= 104) {
    const tableY = r.y + 56;
    const seatY = tableY + 38;
    b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: seatY, facing: "back", pose: "sit-back", path: via(acc, seatY + 6, x, seatY), activity: "planning in the meeting room" });
      b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, seatY - 14, seatY + 2);
    }
  }
  return board;
}

/** The storeroom: the router shelves (the server room) and, where there's width, the roaster beside them. */
function buildStore(b: Builder, r: Rect): { store: Rect; roaster: Point | null } {
  const roast = r.w >= 120;
  const sw = roast ? Math.min(r.w - 44, 96) : r.w;
  buildServerRoom(b, { x: r.x, y: r.y, w: sw, h: r.h });
  return { store: r, roaster: roast ? { x: r.x + sw + 20, y: r.y + r.h - 6 } : null };
}

// ------------------------------------------------------------------ finishing

/**
 * The wall fixtures moved where a café has them: the community corkboard,
 * calendar and status board on the brick pier at the storefront's left end,
 * the shop windows filling the rest of the storefront either side of the
 * door, the clock on the back wall; no hanging plants over the windows.
 */
function hangWall(L: Layout, front: { x0: number; x1: number }, pin: { x: number; w: number }, busyExtra: [number, number][]): void {
  const w = L.wall;
  const seg = L.segments.find((s) => front.x0 >= s.x0 && front.x0 < s.x1) ?? L.segments[0]!;
  const depth = seg.depth;
  const pinSeg = L.segments.find((s) => pin.x >= s.x0 && pin.x < s.x1) ?? seg;
  w.pinboard = { x: pin.x, y: 4, w: pin.w, h: Math.min(50, pinSeg.depth - 14) };
  w.calendar = { x: w.pinboard.x + w.pinboard.w + 6, y: 6, w: 20, h: 22 };
  w.status = { x: w.calendar.x, y: 31, w: 20, h: 18 };
  const noteLeft = w.door.x - 16 >= w.calendar.x + w.calendar.w + 4;
  w.legendNote = { x: noteLeft ? w.door.x - 16 : w.door.x + w.door.w + 4, y: Math.max(8, w.door.y + 8), w: 12, h: 12 };
  const busy: [number, number][] = [
    [w.pinboard.x - 4, w.status.x + w.status.w + 4],
    [Math.min(w.legendNote.x, w.door.x) - 4, Math.max(w.legendNote.x + w.legendNote.w, w.door.x + w.door.w) + 4],
    ...busyExtra,
  ];
  // Big shop windows: as wide as the free stretches allow (40–86 px), mullions between.
  const windows: Rect[] = [];
  const free: [number, number][] = [];
  let x = front.x0 + 4;
  const sorted = [...busy].sort((a, b) => a[0] - b[0]);
  for (const [a, z] of sorted) {
    if (a > x) free.push([x, Math.min(a, front.x1 - 4)]);
    x = Math.max(x, z);
  }
  if (x < front.x1 - 4) free.push([x, front.x1 - 4]);
  for (const [a, z] of free) {
    const len = z - a;
    if (len < 40) continue;
    const n = Math.max(1, Math.round(len / 86));
    const ww = Math.floor((len - (n - 1) * 6) / n);
    for (let i = 0; i < n; i++) windows.push({ x: a + i * (ww + 6), y: 8, w: ww, h: depth - 20 });
  }
  w.windows = windows;
  w.paintings = [];
  w.pillars = L.segments.slice(1).map((s) => s.x0);
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
}

function extras(L: Layout): Point[][] {
  const out: Point[][] = [L.entrancePath];
  const cooler = L.byId.get("cooler");
  if (cooler) out.push([{ x: cooler.x + 29, y: cooler.path[0]!.y }, { x: cooler.x + 29, y: cooler.y }]);
  return out;
}

/** Chalkboard menus between x0 and x1 on a back wall `depth` deep: one or two boards, 30–70 px wide. */
function menuBoards(x0: number, x1: number, depth: number): Rect[] {
  const out: Rect[] = [];
  const h = Math.min(40, depth - 40);
  let x = x0;
  while (x1 - x >= 30 && out.length < 3) {
    const w = Math.min(70, x1 - x);
    out.push({ x, y: 8, w, h });
    x += w + 8;
  }
  return out;
}

function done(L: Layout, plan: Omit<CafePlan, "cafe" | "extra">, pin: { x: number; w: number }, clock: { x: number; y: number }, busy: [number, number][]): Layout {
  hangWall(L, plan.storefront, pin, busy);
  L.wall.clock = { x: Math.round(clock.x), y: clock.y, r: 9 };
  const full: CafePlan = { cafe: true, ...plan, extra: [] };
  L.themeData = full;
  full.extra = extras(L);
  return L;
}

/** Desk pairs wanted for a head count: everyone working has a table, with a few spare. */
const wanted = (threads: number) => Math.max(8, threads + 2);

// ------------------------------------------------------------------ wide panels

function wide(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const tall = H >= 400;
  const dS = tall ? 74 : 66;
  const dF = tall ? 88 : 78;
  const dB = tall ? 84 : 74;
  // Columns: the tables on the left, the fireside corner, the counter.
  const tw = clamp(W - 378, 192, 432);
  const c1x = 8;
  const a1 = c1x + tw + HALF;
  const rx = a1 + HALF;
  const rest = W - 6 - rx;
  const lw = clamp(Math.round(rest * 0.45), 160, 250);
  const a2 = rx + lw + HALF;
  const kx = a2 + HALF;
  const kw = W - 6 - kx;
  const segments: WallSegment[] = [
    { x0: 0, x1: a1 + 14, depth: dS },
    { x0: a1 + 14, x1: a2 - 2, depth: dF },
    { x0: a2 - 2, x1: W, depth: dB },
  ];
  const tables: Table[] = [];
  const tiles: Rect[] = [];
  const rugs: Rect[] = [];

  // ---- the window bar under the shop windows, a row of tables under it when the panel's tall
  const Y = dS - 2;
  const barSeats = Math.floor((a1 - 14 - c1x) / 48);
  let hall1: number;
  let rowA: number[] = [];
  if (tall) {
    rowA = fitCols(tw, false);
    hall1 = Y + 46 + 108;
  } else hall1 = clamp(Math.round(H * 0.56), dB + 100, H - 108);
  const net: Network = { halls: [hall1], aisles: [a1, a2] };
  const left: Access = { hallY: hall1, aisleX: a1 };
  const right: Access = { hallY: hall1, aisleX: a2 };
  const bar = windowBar(b, c1x, barSeats, Y, left);
  if (bar) tables.push({ x: c1x, y: Y, w: barSeats * 48, kind: "bar" });
  if (rowA.length) tableRow(b, c1x + Math.floor((tw - rowWidth(rowA, 0)) / 2), Y + 46, rowA, 0, left, tables);

  // ---- the fireside corner under the chimney, the TV (the specials screen) on the back wall over the counter
  const lounge: Rect = { x: rx, y: dF, w: lw, h: hall1 - HALF - dF };
  const tvW = clamp(kw - 100, 60, 104);
  const tvH = Math.min(Math.round(tvW * 0.52), dB - 34);
  const wallTv: Rect = { x: a2 + 16, y: 8, w: tvW, h: tvH };
  const menus = menuBoards(wallTv.x + wallTv.w + 18, W - 6, dB);
  const tvParts = buildLounge(b, lounge, left, wallTv, true, false);
  const fireplace: Rect = { x: rx + Math.round(lw / 2) - 32, y: dF - 46, w: 64, h: 46 };
  rugs.push({ x: tvParts.couch.x - 14, y: lounge.y + 4, w: tvParts.couch.w + 28, h: tvParts.couch.y + tvParts.couch.h - lounge.y });

  // ---- the counter under the back wall
  const K: Rect = { x: kx, y: dB, w: kw, h: hall1 - HALF - dB };
  const { counter, waiting } = buildCounter(b, K, right, true);
  tiles.push({ x: a2 - 2, y: dB, w: W - (a2 - 2), h: hall1 - HALF + 2 - dB });

  // ---- under the hallway
  const by = hall1 + HALF + 2;
  const below = H - 6 - by;
  let reserved: Rect;
  let whiteboard: Rect;
  let stage: Rect | null = null;
  let storeroom: Rect | null = null;
  let roaster: Point | null = null;
  let boss: Layout["boss"];
  let eventArea: Rect;
  if (tall) {
    // Left: more tables while the head count needs them, then the reserved table.
    let y = hall1 + 4;
    let desks = b.desks.length;
    // (In a tall panel, more tables anyway while the reserved table still fits under them.)
    while ((desks < wanted(threads) && H - 6 - (y + POD_H + 4) >= 110) || H - 6 - (y + POD_H + 4) >= 196) {
      const g = fitCols(tw, tables.every((t) => t.kind !== "long"));
      tableRow(b, c1x + Math.floor((tw - rowWidth(g, 0)) / 2), y, g, 0, left, tables);
      desks = b.desks.length;
      y += POD_H + 4;
    }
    const top = y === hall1 + 4 ? by : y + 4;
    const rh = Math.min(H - 6 - top, 186);
    reserved = { x: c1x, y: top, w: Math.min(tw, 250), h: rh };
    whiteboard = buildReserved(b, reserved, left);
    // Middle: the open-mic stage in the corner, the arcade cabinet, the water station along the bottom.
    arcadeFromAbove(b, rx + lw - 28, by - 2, hall1);
    stage = { x: rx + 4, y: by + 2, w: Math.min(76, lw - 64), h: 30 };
    const utilY = H - 46;
    const hasUtil = utilY - (by + 70) >= 40;
    if (hasUtil) utilities(b, H, rx + lw - 76, hall1);
    eventArea = { x: rx + 6, y: stage.y + stage.h + 8, w: lw - 46, h: Math.max(30, (hasUtil ? utilY - 6 : H - 8) - (stage.y + stage.h + 8)) };
    rugs.push({ x: eventArea.x + 4, y: eventArea.y + 2, w: eventArea.w - 8, h: Math.min(eventArea.h - 4, 84) });
    // Right: your snug, the storeroom under it.
    const bw = Math.min(kw, 230);
    const bossRoom: Rect = { x: W - 6 - bw, y: by, w: bw, h: clamp(below - 90, 96, 170) };
    boss = buildBoss(b, bossRoom, hall1);
    const sy = bossRoom.y + bossRoom.h + 12;
    if (H - 6 - sy >= 40) ({ store: storeroom, roaster } = buildStore(b, { x: kx, y: sy, w: Math.min(kw, 200), h: Math.min(60, H - 6 - sy) }));
  } else {
    // Short: one row of tables with the arcade cabinet beside it, the reserved table, your snug.
    const g = fitCols(tw - 40, true);
    tableRow(b, c1x, hall1 + 4, g, 0, left, tables);
    arcadeFromAbove(b, c1x + tw - 26, by - 2, hall1);
    reserved = { x: rx, y: by, w: lw, h: below };
    whiteboard = buildReserved(b, reserved, left);
    const bossRoom: Rect = { x: kx, y: by, w: kw, h: below - 2 };
    boss = buildBoss(b, bossRoom, hall1);
    const couch = tvParts.couch;
    const free = lounge.y + lounge.h - (couch.y + couch.h + 4);
    eventArea = { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, free) };
  }
  const L = finish(b, W, H, false, segments, net, {
    meeting: reserved,
    whiteboard,
    boss,
    waiting,
    kitchen: K,
    lounge,
    games: null,
    eventArea,
    tvParts,
    gamesParts: null,
    doorX: a1,
    lamp: boss.lamp,
    wallTv,
  });
  return done(
    L,
    { storefront: { x0: 0, x1: a1 + 14 }, fireplace, menus, bar, tables, counter, reserved, stage, storeroom, roaster, tiles, rugs },
    { x: 6, w: clamp(a1 - 180, 72, 112) },
    { x: fireplace.x + fireplace.w / 2, y: 18 },
    [],
  );
}

// ------------------------------------------------------------------ the phone held upright

function portrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const aisleX = W - 9;
  const x0 = 6;
  const innerW = aisleX - HALF - x0;
  const dB = 80;
  const front = Math.round(W * 0.64);
  const segments: WallSegment[] = [
    { x0: 0, x1: front, depth: dB },
    { x0: front, x1: W, depth: 72 },
  ];
  const tables: Table[] = [];
  const tiles: Rect[] = [];
  const rugs: Rect[] = [];
  const gap = HALF * 2;
  const small = H < 700;
  const counterH = small ? 96 : 108;
  const loungeH = small ? 122 : 132;
  const lastH = 134;
  // Rows: the counter, tables, the fireside corner, more tables while needed, the reserved table and the snug, the stage.
  type Kind = "counter" | "tables" | "lounge" | "tables2" | "last" | "stage";
  const rows: { kind: Kind; h: number }[] = [
    { kind: "counter", h: counterH },
    { kind: "tables", h: POD_H },
    { kind: "lounge", h: loungeH },
    { kind: "last", h: lastH },
  ];
  const used = () => dB + rows.reduce((s, r) => s + r.h + gap, 0);
  const g = fitCols(innerW, false);
  const per = g.reduce((s, n) => s + n, 0) * 2;
  let desks = per;
  while (desks < wanted(threads) && used() + POD_H + gap <= H - 6) {
    rows.splice(rows.length - 1, 0, { kind: "tables2", h: POD_H });
    desks += per;
  }
  if (used() + 90 + gap <= H - 6) rows.push({ kind: "stage", h: 90 });
  const extra = Math.max(0, H - 6 - used());
  const grow: Partial<Record<Kind, number>> = { lounge: 0.25, last: 0.6, stage: 0.5 };
  const growSum = rows.reduce((s, r) => s + (grow[r.kind] ?? 0), 0) || 1;
  let y = dB;
  const placed: { kind: Kind; r: Rect; hallY: number }[] = [];
  const halls: number[] = [];
  for (const row of rows) {
    const h = row.h + Math.floor((extra * (grow[row.kind] ?? 0)) / growSum);
    // Rows open onto the hallway below them, except the last ones (onto the one above).
    const above = row.kind === "last" || row.kind === "stage";
    const hallY = above ? y - HALF : y + h + HALF;
    if (!above) halls.push(hallY);
    placed.push({ kind: row.kind, r: { x: x0, y, w: innerW, h }, hallY });
    y += h + gap;
  }
  const net: Network = { halls: [...new Set(halls)].sort((p, q) => p - q), aisles: [aisleX] };
  let counter: Counter | null = null;
  let waiting: Rect | null = null;
  let K: Rect | null = null;
  let lounge: Rect | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let reserved: Rect | null = null;
  let whiteboard: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let stage: Rect | null = null;
  let storeroom: Rect | null = null;
  let roaster: Point | null = null;
  let eventArea: Rect | null = null;
  const wallTv: Rect = { x: 114, y: 8, w: 72, h: 38 };
  for (const { kind, r, hallY } of placed) {
    const acc: Access = { hallY, aisleX };
    switch (kind) {
      case "counter": {
        K = r;
        ({ counter, waiting } = buildCounter(b, r, acc, true));
        tiles.push({ x: 0, y: dB, w: W, h: r.h + 2 });
        break;
      }
      case "tables":
      case "tables2":
        tableRow(b, x0 + Math.floor((innerW - rowWidth(g, 0)) / 2), r.y + 4, kind === "tables2" ? fitCols(innerW, true) : g, 0, acc, tables);
        break;
      case "lounge": {
        lounge = { ...r, y: r.y + 10, h: r.h - 10 };
        tvParts = buildLounge(b, lounge, acc, wallTv, true, false);
        rugs.push({ x: tvParts.couch.x - 14, y: lounge.y, w: tvParts.couch.w + 28, h: tvParts.couch.y + tvParts.couch.h - lounge.y + 4 });
        break;
      }
      case "last": {
        // Your snug on the left, the arcade cabinet, the reserved table by the aisle.
        const sw = Math.max(150, Math.round(r.w * 0.46));
        const bossRoom: Rect = { x: r.x, y: r.y + 2, w: sw, h: Math.min(r.h - 4, 170) };
        boss = buildBoss(b, bossRoom, hallY);
        arcadeFromAbove(b, r.x + sw + 10, r.y, hallY);
        reserved = { x: r.x + sw + 40, y: r.y + 2, w: r.w - sw - 40, h: r.h - 4 };
        whiteboard = buildReserved(b, reserved, acc);
        break;
      }
      case "stage": {
        // Under the snug: the stage, the floor in front of it, the storeroom by the aisle.
        const sw = Math.min(170, r.w - 120);
        const sh = Math.min(56, r.h - 8);
        stage = { x: r.x + 4, y: r.y + 4, w: 64, h: 28 };
        ({ store: storeroom, roaster } = buildStore(b, { x: r.x + r.w - sw, y: r.y + r.h - sh - 2, w: sw, h: sh }));
        eventArea = { x: r.x + 4, y: stage.y + stage.h + 4, w: Math.max(60, r.w - sw - 14), h: Math.max(26, r.h - stage.h - 10) };
        break;
      }
    }
  }
  const couch = tvParts!.couch;
  eventArea ??= { x: lounge!.x + 10, y: couch.y + couch.h + 4, w: lounge!.w - 20, h: Math.max(26, lounge!.y + lounge!.h - (couch.y + couch.h + 4)) };
  const ev = eventArea as Rect;
  rugs.push({ x: ev.x + Math.round(ev.w * 0.2), y: ev.y + 4, w: Math.round(ev.w * 0.6), h: Math.max(20, Math.min(ev.h - 8, 70)) });
  const L = finish(b, W, H, true, segments, net, {
    meeting: reserved!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: K!,
    lounge: lounge!,
    games: null,
    eventArea,
    tvParts: tvParts!,
    gamesParts: null,
    doorX: aisleX,
    lamp: boss!.lamp,
    wallTv,
  });
  return done(
    L,
    { storefront: { x0: front, x1: W }, fireplace: null, menus: menuBoards(wallTv.x + wallTv.w + 18, front - 6, dB), bar: null, tables, counter: counter!, reserved: reserved!, stage, storeroom, roaster, tiles, rugs },
    { x: 6, w: 64 },
    { x: front + 14, y: 18 },
    [[front, front + 26]],
  );
}

/** The Coffee Shop floor plan for a panel (already at least the minimum size). */
export function cafeLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}
