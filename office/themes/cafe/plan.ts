// Coffee Shop: the floor plan. A small neighborhood café in a brick building
// on its lot. Downstairs: the espresso bar under the mezzanine with the
// baristas behind it and the back-of-house corner beside it (the router
// shelves, the AI box and the roaster), a counter along the wall with stools
// and sockets, small round and square tables spread about, and your usual
// armchair on a round rug. Up the stairs, the cozier mezzanine: the fireside
// sofa under the specials screen, the big table under the RESERVED sign,
// armchairs by the window, the open-mic corner and the arcade cabinet. Out
// front: the shop's brick face with its striped awning and the terrace of
// bistro tables on the pavement, a sliver of cobbled street.
// Pure geometry (no canvas): the layout tests run it in Node.
//
// Wide:                                           Phone:
//  ┌ back wall upstairs: board · TV+fire · window ┐  ┌ back wall upstairs ──────┐
//  │ reserved table │ fireside │ armchairs │ stage │  │ fireside │ arcade │ chairs │
//  ╞═══ upstairs hall ══════════ ═══╗ stairs ══════╡  │ stage     │ armchairs   ║
//  │ wall bar  ║ back room │ counter (baristas)  │  ╞═══ balustrade ════════════╣
//  ╞═══════════╬══════════════════════════════════╡  │ counter │ back room      ║
//  │ tables    ║ tables          │ your armchair │  │ tables                    ║
//  ╞═══════════╬══════════════════════════════════╡  │ your armchair │ reserved  ║
//  │ brick front · awning · door · terrace · street │  └ front · terrace ─────────┘
//  Single aisle: the stairs (every way between floors and halls takes them).

import type { Layout, Point, Rect, Spot } from "../../layout.ts";
import {
  hash,
  Builder,
  bossToys,
  buildArcade,
  buildServerRoom,
  clamp,
  finish,
  POD_H,
  via,
  type Access,
  type Network,
  type WallSegment,
} from "../../themekit.ts";

/** A café table the desks sit at (`y` is the north desk's y; a bar's desks' y). */
export interface Table {
  x: number;
  y: number;
  w: number;
  kind: "round" | "square" | "bar";
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
  /** Against a wall (the back bar is painted on it) or free-standing. */
  walled: boolean;
  /** Things standing on the counter top (the till only where the counter's long enough). */
  grinder: Rect;
  tips: Rect;
  register: Rect | null;
  pastry: Rect;
  /** Cups waiting at the pickup. */
  cups: Rect;
}

/** What someone squeezed in with a laptop sits on. */
export type NookSeat = "armchair" | "bistro" | "bench";

/** A squeeze-in workplace (a desk-group spot after the real desks): feet position and seat. */
export interface Nook {
  id: string;
  x: number;
  y: number;
  seat: NookSeat;
}

export interface CafePlan {
  cafe: true;
  /** The building's inside, wall to wall (the lot's margins outside it). */
  bldg: { x0: number; x1: number };
  /** The back wall's depth. */
  wallD: number;
  /** The mezzanine (null on short panels): its floor, and the y of its edge (the balustrade; the riser under it is 16 deep). */
  upstairs: { r: Rect; edge: number } | null;
  /** The stairs down from the mezzanine: the column's x and the steps' top and bottom. */
  stairs: { x: number; y0: number; y1: number } | null;
  /** The shop's front wall seen from outside (null when the panel's too short): the doors' x. */
  facade: { y: number; h: number; doors: number[] } | null;
  terrace: Rect | null;
  /** The road along the bottom (two lanes and a crosswalk at the door). */
  street: Rect | null;
  /** The little piazza beside the café: its paving, the fountain in it, benches (seat feet). */
  piazza: Rect | null;
  fountain: { x: number; y: number; rx: number; ry: number } | null;
  benches: Point[];
  /** The fireplace in the back wall. */
  fireplace: Rect | null;
  /** Chalkboard menus (over the counter). */
  menus: Rect[];
  tables: Table[];
  counter: Counter;
  /** The big table under the RESERVED sign (planning). */
  reserved: Rect;
  /** The open-mic stage. */
  stage: Rect | null;
  /** The back-of-house corner (the server room) and which side its doorway is on. */
  server: { r: Rect; gap: "left" | "right" } | null;
  roaster: Point | null;
  /** Your round rug (center and radii). */
  rug: { x: number; y: number; rx: number; ry: number };
  /** Armchairs (reading corner) and bistro chairs out front: feet positions, some of them squeeze-ins. */
  armchairs: Point[];
  bistro: { x: number; y: number; chairs: number[] }[];
  nooks: Nook[];
  /** Cement tiles (the counter) and rugs. */
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
/** Squeeze-in spot ids start with this (never `desk-`: those are the real desks). */
export const NOOK = "laptop-";
const LIFT: Record<NookSeat, number> = { armchair: 3, bistro: 2, bench: 2 };

// ------------------------------------------------------------------ tables

/**
 * A café table for two (a desk pair's geometry, so the subagent helpers fit as
 * at any desk): the north seat is reached straight down from the hallway
 * above, the south seat straight up from the one below, or round the table's
 * left side from above when there's none below.
 */
function table(b: Builder, dx: number, py: number, kind: Table["kind"], above: number, below: number | null, tables: Table[]): void {
  const n = b.desks.length;
  const nx = dx + 30;
  const north = b.spot({
    id: `desk-${n}`,
    kind: "desk",
    group: "desk",
    x: nx,
    y: py + 18,
    facing: "front",
    pose: "sit-desk-front",
    path: [{ x: nx, y: above, c: true }, { x: nx, y: py - 12 }, { x: nx, y: py + 18 }],
    activity: "at a café table",
  });
  b.desks.push({ index: n, side: "north", x: dx, y: py, pcX: dx + 4, pcY: py + 2, chairX: dx + 22, chairY: py - 8, spot: north, screen: null });
  const s = b.desks.length;
  const sx = dx + 32;
  const lane = py + 82;
  const path: Point[] =
    below !== null
      ? [{ x: sx, y: below, c: true }, { x: sx, y: lane }, { x: sx, y: py + 73 }]
      : [{ x: dx - 5, y: above, c: true }, { x: dx - 5, y: lane }, { x: sx, y: lane }, { x: sx, y: py + 73 }];
  const south = b.spot({ id: `desk-${s}`, kind: "desk", group: "desk", x: sx, y: py + 73, facing: "back", pose: "sit-desk", path, activity: "at a café table" });
  b.desks.push({ index: s, side: "south", x: dx, y: py + 30, pcX: dx + 24, pcY: py + 24, chairX: dx + 24, chairY: py + 59, spot: south, screen: { x: dx + 27, y: py + 29, w: 10, h: 5 } });
  const pod: Rect = { x: dx, y: py - 18, w: 48, h: POD_H - 4 };
  b.pods.push(pod);
  b.rooms.push({ kind: "pod", rect: pod });
  tables.push({ x: dx, y: py, w: 48, kind });
}

/** Tables sit this far apart (just room between them for a helper and a chair). */
const PITCH = 54;
const BAND = 114;
/** The shop front's height, the road's. */
const FAC = 32;
const ROAD = 30;

/** Tables close together along [x0, x1], centered: round ones mostly, a square one now and then, every other one a little lower when there's room. */
function tablesIn(b: Builder, x0: number, x1: number, py: number, above: number, below: number | null, tables: Table[]): void {
  if (x1 - x0 < 48) return;
  const n = Math.floor((x1 - x0 - 48) / PITCH) + 1;
  const start = x0 + Math.floor((x1 - x0 - 48 - (n - 1) * PITCH) / 2);
  for (let i = 0; i < n; i++) {
    const dx = start + i * PITCH;
    const kind = hash(`cafe-table-${dx}-${py}`) % 3 === 0 ? "square" : "round";
    table(b, dx, py, kind, above, below, tables);
  }
}

/**
 * A counter along a wall: a plank with sockets, stools in a row with
 * everyone's back to you (south seats, a desk's geometry), reached straight up
 * from the hallway below.
 */
function wallBar(b: Builder, x0: number, n: number, Y: number, below: number, tables: Table[]): void {
  if (n <= 0) return;
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
      path: [{ x: sx, y: below, c: true }, { x: sx, y: Y + 52 }, { x: sx, y: Y + 43 }],
      activity: "at the counter by the wall",
    });
    b.desks.push({ index, side: "south", x: dx, y: Y, pcX: dx + 24, pcY: Y - 6, chairX: dx + 24, chairY: Y + 29, spot, screen: { x: dx + 27, y: Y - 1, w: 10, h: 5 } });
  }
  const pod: Rect = { x: x0, y: Y - 4, w: n * 48, h: 52 };
  b.pods.push(pod);
  b.rooms.push({ kind: "pod", rect: pod });
  tables.push({ x: x0, y: Y, w: n * 48, kind: "bar" });
}


// ------------------------------------------------------------------ the counter, the back of house

/**
 * The espresso bar in `r` (the hallway below it): the counter with the
 * machine at its left end, the order point and the tea station, a row of
 * pickup stools (where threads that need you wait for their order), the
 * drinks cooler at the left end and the cake fridge at the right. The
 * baristas work behind it.
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
 * The back of house beside the counter: a small brick room with the router
 * shelves and the AI box (the server room; the shock gag happens here,
 * through a doorway at the bottom of the side facing the stairs) and the
 * roaster beside it, behind the baristas.
 */
function backOfHouse(b: Builder, r: Rect, stairX: number): { server: CafePlan["server"]; roaster: Point } {
  buildServerRoom(b, r);
  return { server: { r, gap: stairX < r.x ? "left" : "right" }, roaster: stairX < r.x ? { x: r.x + r.w + 18, y: r.y + r.h - 8 } : { x: r.x - 18, y: r.y + r.h - 8 } };
}

// ------------------------------------------------------------------ the reserved table

/**
 * The big table under the RESERVED sign on an open floor reached from the
 * hallway above: a chalkboard on an easel at its head (planners draw on it,
 * presenters stand beside it), the table with chairs round it.
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


/**
 * The reserved table upstairs, reached from the hallway below: the
 * chalkboard hangs on the back wall (planners draw on it, presenters stand
 * beside it), the long table in front with its chairs on the near side.
 */
function buildReservedWall(b: Builder, r: Rect, hall: number, wallD: number): Rect {
  b.rooms.push({ kind: "meeting", rect: r });
  const boardW = clamp(r.w - 134, 56, 72);
  const board: Rect = { x: r.x + 6, y: wallD - 42, w: boardW, h: 34 };
  b.prop("whiteboard", "whiteboard", board.x, board.y, wallD - 1, boardW);
  b.poke("whiteboard", "whiteboard", board);
  const up = (x: number, y: number): Point[] => [{ x, y: hall, c: true }, { x, y }];
  for (const [i, k] of [0.3, 0.7].entries()) {
    const x = Math.round(board.x + boardW * k);
    b.spot({ id: `board-${i}`, kind: "whiteboard", group: "meeting", x, y: wallD + 12, facing: "back", pose: "draw", path: up(x, wallD + 12), activity: "planning at the whiteboard" });
  }
  for (const [i, dx] of [12, 32].entries()) {
    const x = board.x + boardW + dx;
    b.spot({ id: `present-${i}`, kind: "present", group: "present", x, y: wallD + 10, facing: "front", pose: "stand", path: up(x, wallD + 10), activity: "presenting a plan for your review" });
  }
  const tableX = board.x + boardW + 50;
  const tableY = wallD + 18;
  b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
  const seatY = tableY + 38;
  for (const [i, dx] of [12, 34, 56].entries()) {
    const x = tableX + dx;
    b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: seatY, facing: "back", pose: "sit-back", path: up(x, seatY), activity: "planning in the meeting room" });
    b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, seatY - 14, seatY + 2);
  }
  return board;
}

// ------------------------------------------------------------------ the fireside, the armchairs, the stage

/**
 * The fireside corner under the back wall (the specials screen and the
 * fireplace on it), reached from the hallway below: the chesterfield facing
 * them with the coffee table, the piano on the left, the aquarium on the
 * sideboard on the right.
 */
function buildFireside(b: Builder, r: Rect, hall: number, tv: Rect) {
  b.rooms.push({ kind: "lounge", rect: r });
  b.prop("tv", "tv", tv.x, tv.y, 0, tv.w);
  const screen: Rect = { x: tv.x + 4, y: tv.y + 4, w: tv.w - 8, h: tv.h - 8 };
  const speakers: Rect[] = [
    { x: tv.x - 14, y: tv.y + tv.h - 26, w: 10, h: 26 },
    { x: tv.x + tv.w + 4, y: tv.y + tv.h - 26, w: 10, h: 26 },
  ];
  const couchW = 82;
  const couchX = r.x + Math.round((r.w - couchW) / 2);
  const couchY = r.y + 28;
  const couch: Rect = { x: couchX, y: couchY, w: couchW, h: 26 };
  b.prop("couch", "couch", couchX - 1, couchY - 1, couchY + 26);
  b.poke("couch", "couch", { x: couchX, y: couchY - 2, w: couchW, h: 28 });
  b.prop("coffee-table", "coffee-table", couchX + 22, couchY - 22, couchY - 10);
  const side = couchX - 6;
  for (const [i, dx] of [20, 41, 62].entries()) {
    const x = couchX + dx;
    b.spot({ id: `couch-${i + 1}`, kind: "couch", group: "lounge", x, y: couchY + 13, facing: "back", pose: "sit-back", path: [{ x: side, y: hall, c: true }, { x: side, y: couchY - 8 }, { x, y: couchY - 8 }, { x, y: couchY + 13 }], activity: "watching TV" });
  }
  const px = r.x + 4;
  const py = couchY - 8;
  b.prop("piano", "piano", px, py, py + 30);
  b.poke("piano", "piano", { x: px, y: py, w: 30, h: 30 });
  b.spot({ id: "piano", kind: "piano", group: "lounge", x: px + 15, y: py + 38, facing: "back", pose: "play", path: [{ x: px + 15, y: hall, c: true }, { x: px + 15, y: py + 38 }], activity: "playing the piano" });
  const fishtank: Rect = { x: r.x + r.w - 44, y: couchY - 14, w: 40, h: 24 };
  b.prop("fishtank-stand", "fishtank-stand", fishtank.x - 1, fishtank.y + 24, fishtank.y + 44);
  b.poke("fishtank", "fishtank", { x: fishtank.x, y: fishtank.y, w: 40, h: 44 });
  const fy = Math.min(fishtank.y + 52, hall - 4);
  b.spot({ id: "fishtank", kind: "fishtank", group: "lounge", x: fishtank.x + 20, y: fy, facing: "back", pose: "stand", path: [{ x: fishtank.x + 20, y: hall, c: true }, { x: fishtank.x + 20, y: fy }], activity: "watching the fish" });
  return { tv, screen, speakers, couch, fishtank, arcade: null as Rect | null };
}

/** Armchairs in a row facing you (feet at `y`), reached straight from the hallway: the first a reading seat, the rest squeeze-ins. */
function armchairRow(b: Builder, x0: number, x1: number, y: number, hall: number, chairs: Point[], nooks: Pending[]): void {
  for (let x = x0 + 12, i = 0; x <= x1 - 12; x += 30, i++) {
    chairs.push({ x, y });
    const path: Point[] = [{ x, y: hall, c: true }, { x, y }];
    if (i === 0 && !b.spots.some((s) => s.id === "read-0")) {
      b.spot({ id: "read-0", kind: "armchair", group: "lounge", x, y, facing: "front", pose: "read", path, activity: "reading by the window", lift: 3 });
    } else nooks.push({ x, y, seat: "armchair", path, activity: "working from an armchair" });
  }
}

/** A squeeze-in waiting to be added after all the real desks. */
interface Pending {
  x: number;
  y: number;
  seat: NookSeat;
  path: Point[];
  activity: string;
}

/** The squeeze-ins, after every real desk (the desk group fills in order). */
function addNooks(b: Builder, pending: Pending[]): Nook[] {
  return pending.map((p, i) => {
    const id = `${NOOK}${i}`;
    b.spot({ id, kind: "bench", group: "desk", x: p.x, y: p.y, facing: "front", pose: "sit-desk-front", path: p.path, activity: p.activity, lift: LIFT[p.seat] });
    return { id, x: p.x, y: p.y, seat: p.seat };
  });
}

// ------------------------------------------------------------------ your armchair

/**
 * Your usual spot: an open corner on a round rug (no walls), your armchair
 * facing out over a low table (your papers, the cradle), two chairs for your
 * guests across it, the lamp, a bookshelf, Mocha's basket; the hoop and the
 * putting strip where they fit (bossToys). Reached from the hallway above.
 */
function buildArmchair(b: Builder, r: Rect, hall: number): Layout["boss"] {
  const doorX = r.x + 16;
  b.rooms.push({ kind: "boss", rect: r, doorX, doorSide: "top" });
  const deskW = 60;
  const desk: Rect = { x: r.x + Math.round((r.w - deskW) / 2) + 8, y: r.y + Math.min(30, Math.round(r.h * 0.26)), w: deskW, h: 26 };
  const seat = { x: desk.x + deskW / 2, y: desk.y + 4 };
  b.prop("boss-chair", "boss-chair", seat.x - 10, desk.y - 22, desk.y - 1);
  b.prop("boss-desk", "boss-desk", desk.x, desk.y, desk.y + 22, deskW);
  b.poke("boss", "boss", { x: seat.x - 9, y: desk.y - 24, w: 18, h: 24 });
  const guestY = desk.y + 44;
  const lane = r.y + r.h - 8;
  for (const [i, dx] of [-12, 12].entries()) {
    const x = Math.round(seat.x + dx);
    b.spot({
      id: `boss-guest-${i}`,
      kind: "boss-guest",
      group: "boss",
      x,
      y: guestY,
      facing: "back",
      pose: "sit-back",
      path: [{ x: doorX, y: hall, c: true }, { x: doorX, y: r.y - 3 }, { x: doorX, y: lane }, { x, y: lane }, { x, y: guestY }],
      activity: "going over a draft with you",
    });
    b.prop(`guest-chair-${i}`, "guest-chair", x - 8, guestY - 14, guestY + 2);
  }
  b.prop("boss-shelf", "library-shelf", r.x + r.w - 38, r.y - 4, r.y + 26);
  b.poke("globe", "globe", { x: r.x + r.w - 38, y: r.y - 4, w: 32, h: 14 });
  const dogBed = { x: r.x + r.w - 20, y: r.y + r.h - 10 };
  b.prop("dog-bed", "dog-bed", dogBed.x - 12, dogBed.y - 8, dogBed.y - 6);
  b.prop("lamp", "lamp", r.x + 6, r.y + 2, r.y + 52);
  b.poke("lamp", "lamp", { x: r.x + 6, y: r.y + 2, w: 16, h: 52 });
  return bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 14, y: r.y + 4 } });
}

// ------------------------------------------------------------------ out front

/**
 * The terrace: rows of bistro tables with a chair either side; whoever
 * squeezes in works out here, reached through the nearest door and down the
 * gap between the tables.
 */
function terrace(b: Builder, t: Rect, x0: number, x1: number, hall: number, doors: number[], bistro: CafePlan["bistro"], pending: Pending[]): void {
  const lane = t.y + 6;
  let n = 0;
  for (let row = 0, y = t.y + Math.min(t.h - 4, 26); y <= t.y + t.h - 4 && row < 3; row++, y += 36) {
    for (let cx = x0 + 22; cx + 18 <= x1; cx += 62) {
      if (doors.some((d) => Math.abs(d - cx) < 26)) continue;
      const chairs = [cx - 14, cx + 14];
      bistro.push({ x: cx, y, chairs });
      for (const x of chairs) {
        const door = doors.reduce((a, d) => (Math.abs(d - x) < Math.abs(a - x) ? d : a));
        const gx = x < cx ? cx - 31 : cx + 31;
        const path: Point[] = [{ x: door, y: hall, c: true }, { x: door, y: lane }, { x: gx, y: lane }, { x: gx, y }, { x, y }];
        if (n < 2) b.spot({ id: `terrace-${n}`, kind: "bench", group: "lounge", x, y, facing: "front", pose: "sit-front", path, activity: "having a coffee out front", lift: 2 });
        else pending.push({ x, y, seat: "bistro", path, activity: "working out on the terrace" });
        n++;
      }
    }
  }
}

/**
 * The piazza beside the café (wide panels): paving with a stone fountain in
 * the middle, benches along its edges (squeeze-ins with a laptop) and one by
 * the fountain, all reached from the terrace's lane (people step onto a
 * bench from the side). Greens are dressed round them in live.ts.
 */
function piazza(b: Builder, P: Rect, lane: number, hall: number, door: number, benches: Point[], pending: Pending[]): CafePlan["fountain"] {
  const cx = Math.round(P.x + P.w / 2);
  const rx = Math.max(14, Math.min(24, Math.floor(P.w / 2) - 30));
  const ry = Math.round(rx * 0.6);
  const fy = Math.round(P.y + P.h * 0.5);
  const to = (x: number, col: number, y: number): Point[] => [{ x: door, y: hall, c: true }, { x: door, y: lane }, { x: col, y: lane }, { x: col, y }, { x, y }];
  // By the fountain: a bench for two watching the water.
  const by = fy + ry + 26;
  if (by < lane - 8) {
    for (const [i, dx] of [-10, 10].entries()) {
      const x = cx + dx;
      benches.push({ x, y: by });
      b.spot({ id: `fountain-${i}`, kind: "bench", group: "lounge", x, y: by, facing: "front", pose: "sit-front", path: [{ x: door, y: hall, c: true }, { x: door, y: lane }, { x, y: lane }, { x, y: by }], activity: "watching the fountain", lift: 2 });
    }
  }
  // Along the edges, every so often: a bench with a laptop on it.
  const le = P.x + 12;
  const re = P.x + P.w - 12;
  for (let y = P.y + 70, k = 0; y <= lane - 22; y += 64, k++) {
    const x = k % 2 ? re : le;
    const col = k % 2 ? re - 14 : le + 14;
    benches.push({ x, y });
    pending.push({ x, y, seat: "bench", path: to(x, col, y), activity: "working on a bench in the piazza" });
  }
  return { x: cx, y: fy, rx, ry };
}

/**
 * The phone's strip of piazza under the terrace: the fountain under one of
 * the terrace's table columns, benches down the gaps between the tables
 * (people come down those from the terrace's lane).
 */
function piazzaStrip(b: Builder, P: Rect, x0: number, x1: number, lane: number, hall: number, door: number, benches: Point[], pending: Pending[]): CafePlan["fountain"] {
  const first = x0 + 22;
  const k = Math.round((P.x + P.w / 2 - first) / 62);
  const cx = first + k * 62;
  const rx = 22;
  const ry = 13;
  const fy = P.y + Math.round(P.h / 2) - 4;
  const y = P.y + P.h - 8;
  let n = 0;
  for (let gx = first + 31; gx + 10 <= x1; gx += 62) {
    if (Math.abs(gx - cx) < rx + 12 || Math.abs(gx - door) < 16) continue;
    benches.push({ x: gx, y });
    const path: Point[] = [{ x: door, y: hall, c: true }, { x: door, y: lane }, { x: gx, y: lane }, { x: gx, y }];
    if (n++ % 2 === 0) pending.push({ x: gx, y, seat: "bench", path, activity: "working on a bench in the piazza" });
    else b.spot({ id: `fountain-${n}`, kind: "bench", group: "lounge", x: gx, y, facing: "front", pose: "sit-front", path, activity: "watching the fountain", lift: 2 });
  }
  return { x: cx, y: fy, rx, ry };
}

// ------------------------------------------------------------------ the wall

/** Chalkboard menus hanging between x0 and x1 from `y`, 30–64 px wide. */
function menuBoards(x0: number, x1: number, y: number, h: number): Rect[] {
  const out: Rect[] = [];
  let x = x0;
  while (x1 - x >= 30 && out.length < 3) {
    const w = Math.min(64, x1 - x);
    out.push({ x, y, w, h });
    x += w + 10;
  }
  return out;
}

/** Windows in [x0, x1] on the back wall (40–70 px each, arched in the drawing). */
function windowsIn(x0: number, x1: number, depth: number): Rect[] {
  const len = x1 - x0;
  if (len < 40) return [];
  const n = Math.max(1, Math.round(len / 70));
  const w = Math.min(70, Math.floor((len - (n - 1) * 8) / n));
  const off = Math.floor((len - (n * w + (n - 1) * 8)) / 2);
  return Array.from({ length: n }, (_, i) => ({ x: x0 + off + i * (w + 8), y: 8, w, h: depth - 22 }));
}

interface Fixtures {
  pin: Rect;
  clock: Point;
  windows: Rect[];
  door: Rect;
  entrance: Point;
  hall: number;
}

function hang(L: Layout, f: Fixtures, bldg: { x0: number; x1: number }): void {
  const w = L.wall;
  w.pinboard = f.pin;
  w.calendar = { x: f.pin.x + f.pin.w + 6, y: 6, w: 20, h: 22 };
  w.status = { x: w.calendar.x, y: 31, w: 20, h: 18 };
  w.door = f.door;
  w.legendNote = { x: f.door.x + f.door.w + 5, y: f.door.y + 6, w: 12, h: 12 };
  if (w.legendNote.x + 14 > L.W) w.legendNote.x = f.door.x - 17;
  w.clock = { x: Math.round(f.clock.x), y: f.clock.y, r: 9 };
  w.windows = f.windows;
  w.paintings = [];
  w.pillars = [];
  L.entrance = f.entrance;
  L.entrancePath = [{ x: f.entrance.x, y: f.hall, c: true }, f.entrance];
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  // Rounds stay indoors.
  L.patrol = [];
  for (const [i, hy] of L.net.halls.entries()) {
    const row = i % 2 ? [bldg.x1 - 10, bldg.x0 + 10] : [bldg.x0 + 10, bldg.x1 - 10];
    for (const x of row) L.patrol.push({ x, y: hy, c: true });
  }
}

function extras(L: Layout): Point[][] {
  return [L.entrancePath];
}

function done(L: Layout, plan: Omit<CafePlan, "cafe" | "extra">, f: Fixtures): Layout {
  hang(L, f, plan.bldg);
  const full: CafePlan = { cafe: true, ...plan, extra: [] };
  L.themeData = full;
  full.extra = extras(L);
  return L;
}

/** The rug under your armchair and your guests. */
const rugOf = (boss: Layout["boss"]) => ({ x: boss.desk.x + boss.desk.w / 2, y: boss.desk.y + 22, rx: 54, ry: 34 });

/** Desks wanted for a head count: everyone working has a table, with a couple spare. */
const wanted = (threads: number) => Math.max(8, threads + 2);

// ------------------------------------------------------------------ wide panels

function wide(W: number, H: number, threads: number): Layout {
  if (H < 410) return short(W, H);
  const b = new Builder();
  // The building on the left of its lot, the piazza on the right.
  const M = clamp(Math.round(W * 0.03), 10, 36);
  // (The upstairs needs about 510 px; a narrow panel has no piazza.)
  const roomFor = W - 2 * M - 12 - 510;
  const pw = roomFor >= 96 ? clamp(Math.round(W * 0.18), 96, Math.min(150, roomFor)) : 0;
  const x0 = M + 6;
  const x1 = pw ? W - pw - 6 : W - M - 6;
  const wallD = 56;
  const hU = wallD + 76;
  const edge = hU + HALF;
  const kY = edge + 16;
  const hG1 = kY + 94;
  const tables: Table[] = [];
  const pending: Pending[] = [];
  const armchairs: Point[] = [];

  // ---- upstairs: the reserved table, the fireside, armchairs by the window, the stage, the arcade
  const inner = x1 - x0;
  const rw = clamp(Math.round(inner * 0.28), 188, 210);
  const reserved: Rect = { x: x0, y: wallD, w: rw, h: hU - HALF - wallD };
  const whiteboard = buildReservedWall(b, reserved, hU, wallD);
  const fw = clamp(Math.round(inner * 0.32), 186, 240);
  const fx = x0 + rw + 8;
  const lounge: Rect = { x: fx, y: wallD, w: fw, h: hU - HALF - wallD };
  const wallTv: Rect = { x: fx + 16, y: 8, w: 80, h: Math.min(42, wallD - 20) };
  const fireplace: Rect = { x: fx + fw - 76, y: wallD - 44, w: 64, h: 44 };
  const tvParts = buildFireside(b, lounge, hU, wallTv);
  const ax = x1 - 28;
  buildArcade(b, ax, wallD - 10, [{ x: ax + 12, y: hU, c: true }, { x: ax + 12, y: wallD + 48 }]);
  const rest0 = fx + fw + 8;
  const sw = Math.min(clamp(Math.round((ax - 8 - rest0) * 0.55), 90, 150), ax - 8 - rest0);
  const readX1 = ax - 8 - sw - 8;
  if (readX1 - rest0 >= 24) armchairRow(b, rest0, readX1, wallD + 36, hU, armchairs, pending);
  const sx0 = Math.max(rest0, readX1 + 8);
  const stage: Rect = { x: sx0 + 2, y: wallD + 2, w: sw - 4, h: 26 };
  const eventArea: Rect = { x: sx0, y: wallD + 32, w: sw, h: hU - HALF - (wallD + 32) };

  // ---- downstairs: the counter along the wall, the stairs, the back of house, the espresso bar
  const barSeats = clamp(Math.floor((inner * 0.37) / 48), 2, 8);
  const stairX = x0 + barSeats * 48 + 18;
  wallBar(b, x0, barSeats, kY + 4, hG1, tables);
  const { server, roaster } = backOfHouse(b, { x: stairX + 14, y: kY + 4, w: 72, h: 62 }, stairX);
  const kx = stairX + 122;
  const kw = Math.min(310, x1 - kx);
  const K: Rect = { x: kx, y: kY, w: kw, h: 84 };
  const { counter, waiting } = buildCounter(b, K, { hallY: hG1, aisleX: kx + 14 }, true);
  const more = Math.floor((x1 - (kx + kw) - 10) / 48);
  if (more > 0) wallBar(b, kx + kw + 10, more, kY + 4, hG1, tables);
  const tiles: Rect[] = [{ x: stairX + 12, y: kY, w: kx + kw - (stairX + 12), h: hG1 - HALF - kY }];

  // ---- tables, your armchair in the corner of the first row
  const halls = [hU, hG1];
  let hall = hG1;
  // Your corner, with room for the putting strip beside your guests.
  const bossW = 200;
  const bossR: Rect = { x: x1 - bossW, y: hG1 + 12, w: bossW, h: 92 };
  const boss = buildArmchair(b, bossR, hG1);
  for (let row = 0; row === 0 || (b.desks.length < wanted(threads) && hall + BAND + 12 + FAC + 30 + ROAD + 4 <= H); row++) {
    const py = hall + 22;
    const below = hall + BAND;
    tablesIn(b, x0, stairX - 14, py, hall, below, tables);
    tablesIn(b, stairX + 14, row === 0 ? bossR.x - 8 : x1, py, hall, below, tables);
    hall = below;
    halls.push(hall);
  }

  // ---- the shop's front, the terrace, the piazza beside it, the road
  const fy = hall + 12;
  const doors = [stairX, stairX + Math.round((x1 - stairX) / 2)];
  const facade = { y: fy, h: FAC, doors };
  const tY = fy + FAC;
  const road: Rect | null = H - tY >= ROAD + 4 ? { x: 0, y: H - ROAD, w: W, h: ROAD } : null;
  const tEnd = (road ? road.y : H) - 4;
  const bistro: CafePlan["bistro"] = [];
  const benches: Point[] = [];
  // No room beside the café (a narrow panel): a strip of piazza under the terrace instead, when it's tall.
  const strip = !pw && tEnd - tY >= 66 + 56;
  const terraceR: Rect | null = tEnd - tY >= 22 ? { x: 0, y: tY, w: W, h: strip ? 66 : tEnd - tY } : null;
  let piazzaR: Rect | null = pw ? { x: x1 + 6, y: 0, w: W - (x1 + 6), h: terraceR ? tY : (road ? road.y : H) } : null;
  let fountain: CafePlan["fountain"] = null;
  if (terraceR) terrace(b, terraceR, x0, pw ? W - 12 : x1, hall, doors, bistro, pending);
  if (piazzaR) {
    fountain = terraceR ? piazza(b, piazzaR, tY + 6, hall, doors[1]!, benches, pending) : { x: Math.round(piazzaR.x + piazzaR.w / 2), y: Math.round(piazzaR.h * 0.5), rx: 22, ry: 13 };
  } else if (strip && terraceR) {
    piazzaR = { x: 0, y: tY + 66, w: W, h: tEnd - (tY + 66) };
    fountain = piazzaStrip(b, piazzaR, x0, x1, tY + 6, hall, stairX, benches, pending);
  }
  const nooks = addNooks(b, pending);

  const net: Network = { halls, aisles: [stairX] };
  const segments: WallSegment[] = [{ x0: 0, x1: W, depth: wallD }];
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
    doorX: stairX,
    lamp: boss.lamp,
    wallTv,
  });
  const pinW = clamp(sw - 30, 64, 100);
  return done(
    L,
    {
      bldg: { x0, x1 },
      wallD,
      upstairs: { r: { x: x0, y: wallD, w: inner, h: edge - wallD }, edge },
      stairs: { x: stairX, y0: hU, y1: kY + 6 },
      facade,
      terrace: terraceR,
      street: road,
      piazza: piazzaR,
      fountain,
      benches,
      fireplace,
      menus: menuBoards(kx + 40, kx + kw - 12, edge - 2, 26),
      tables,
      counter,
      reserved,
      stage,
      server,
      roaster,
      rug: rugOf(boss),
      armchairs,
      bistro,
      nooks,
      tiles,
      rugs: [
        { x: tvParts.couch.x - 14, y: wallD + 2, w: tvParts.couch.w + 28, h: tvParts.couch.y + tvParts.couch.h - wallD + 2 },
        { x: eventArea.x + 4, y: eventArea.y, w: eventArea.w - 8, h: eventArea.h - 2 },
      ],
    },
    {
      pin: { x: sx0 + 2, y: 4, w: pinW, h: Math.min(50, wallD - 14) },
      clock: { x: ax + 12, y: 16 },
      windows: [...windowsIn(x0 + 6 + clamp(rw - 134, 56, 72) + 12, x0 + rw - 4, wallD), ...windowsIn(rest0 + 2, readX1 - 2, wallD)],
      door: { x: stairX - 10, y: fy + 4, w: 20, h: FAC - 4 },
      entrance: { x: stairX, y: Math.min(H - 2, fy + FAC + 6) },
      hall,
    },
  );
}

// ------------------------------------------------------------------ short wide panels: one floor

function short(W: number, H: number): Layout {
  const b = new Builder();
  const M = clamp(Math.round(W * 0.02), 8, 20);
  const x0 = M + 6;
  const x1 = W - M - 6;
  const wallD = 56;
  const hy = wallD + 94;
  const tables: Table[] = [];
  // The fireside on the left, the back of house and the counter under the back wall.
  const fw = clamp(Math.round((x1 - x0) * 0.32), 186, 230);
  const lounge: Rect = { x: x0, y: wallD, w: fw, h: hy - HALF - wallD };
  const wallTv: Rect = { x: x0 + 16, y: 6, w: 80, h: 36 };
  const fireplace: Rect = { x: x0 + fw - 76, y: wallD - 44, w: 64, h: 44 };
  const tvParts = buildFireside(b, lounge, hy, wallTv);
  const aisle = x0 + fw + 14;
  const { server, roaster } = backOfHouse(b, { x: aisle + 14, y: wallD + 4, w: 72, h: 62 }, aisle);
  const kx = aisle + 122;
  const K: Rect = { x: kx, y: wallD, w: x1 - kx, h: 84 };
  const { counter, waiting } = buildCounter(b, K, { hallY: hy, aisleX: kx + 14 }, true);
  // Under the hallway: tables, the arcade, the reserved table, your armchair.
  const by = hy + 12;
  const bossR: Rect = { x: x1 - 150, y: by, w: 150, h: Math.min(110, H - 4 - by) };
  const boss = buildArmchair(b, bossR, hy);
  const reserved: Rect = { x: bossR.x - 8 - 120, y: hy + 10, w: 120, h: H - 6 - (hy + 10) };
  const whiteboard = buildReserved(b, reserved, { hallY: hy, aisleX: reserved.x + reserved.w - 4 });
  const ax = reserved.x - 32;
  arcadeFromAboveAt(b, ax, hy + 6, hy);
  tablesIn(b, x0 + 6, ax - 16, hy + 22, hy, null, tables);
  const couch = tvParts.couch;
  const eventArea: Rect = { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, hy - HALF - (couch.y + couch.h + 4)) };
  const net: Network = { halls: [hy], aisles: [aisle] };
  const L = finish(b, W, H, false, [{ x0: 0, x1: W, depth: wallD }], net, {
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
    doorX: aisle,
    lamp: boss.lamp,
    wallTv,
  });
  return done(
    L,
    {
      bldg: { x0, x1 },
      wallD,
      upstairs: null,
      stairs: null,
      facade: null,
      terrace: null,
      street: null,
      piazza: null,
      fountain: null,
      benches: [],
      fireplace,
      menus: menuBoards(kx + 36, x1 - 34, 6, 24),
      tables,
      counter,
      reserved,
      stage: null,
      server,
      roaster,
      rug: rugOf(boss),
      armchairs: [],
      bistro: [],
      nooks: [],
      tiles: [{ x: aisle + 10, y: wallD, w: x1 - aisle - 10, h: hy - HALF - wallD }],
      rugs: [{ x: couch.x - 14, y: wallD + 2, w: couch.w + 28, h: couch.y + couch.h - wallD + 2 }],
    },
    {
      pin: { x: aisle + 14, y: 4, w: 72, h: 44 },
      clock: { x: x1 - 16, y: 16 },
      windows: [],
      door: { x: aisle - 10, y: wallD - 42, w: 20, h: 42 },
      entrance: { x: aisle, y: wallD + 2 },
      hall: hy,
    },
  );
}

/** An arcade cabinet at x against the top of an open floor, reached down its left side from the hallway above. */
function arcadeFromAboveAt(b: Builder, x: number, top: number, hall: number): void {
  const y = top + 2;
  buildArcade(b, x, y, [{ x: x - 8, y: hall, c: true }, { x: x - 8, y: y + 58 }, { x: x + 12, y: y + 58 }]);
}

// ------------------------------------------------------------------ the phone held upright

function portrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const x0 = 10;
  const x1 = W - 10;
  const stairX = x1 - 12;
  const cr = stairX - 14;
  const wallD = H >= 700 ? 64 : 56;
  const tables: Table[] = [];
  const pending: Pending[] = [];
  const armchairs: Point[] = [];

  // ---- upstairs: the fireside, the arcade, armchairs; under them the stage and more armchairs
  const hU = wallD + 76;
  const fw = clamp(cr - x0 - 110, 186, 210);
  const lounge: Rect = { x: x0, y: wallD, w: fw, h: hU - HALF - wallD };
  const wallTv: Rect = { x: x0 + 16, y: 8, w: 80, h: Math.min(42, wallD - 20) };
  const fireplace: Rect = { x: x0 + fw - 76, y: wallD - 44, w: 64, h: 44 };
  const tvParts = buildFireside(b, lounge, hU, wallTv);
  const ax = x0 + fw + 8;
  buildArcade(b, ax, wallD - 10, [{ x: ax + 12, y: hU, c: true }, { x: ax + 12, y: wallD + 48 }]);
  armchairRow(b, ax + 30, cr, wallD + 36, hU, armchairs, pending);
  const edge = hU + 80;
  const stage: Rect = { x: x0 + 2, y: hU + 12, w: 120, h: 26 };
  const eventArea: Rect = { x: x0, y: hU + 42, w: 160, h: edge - 2 - (hU + 42) };
  armchairRow(b, x0 + 170, cr, hU + 44, hU, armchairs, pending);

  // ---- downstairs: the counter and the back of house by the stairs
  const kY = edge + 16;
  const hG1 = kY + 94;
  const srv: Rect = { x: cr - 72, y: kY + 4, w: 72, h: 62 };
  const { server, roaster } = backOfHouse(b, srv, stairX);
  const K: Rect = { x: x0, y: kY, w: srv.x - 36 - x0, h: 84 };
  const { counter, waiting } = buildCounter(b, K, { hallY: hG1, aisleX: x0 + 14 }, true);

  // ---- tables while the head count needs them (and the front still fits), your armchair and the reserved table
  const halls = [hU, hG1];
  let hall = hG1;
  const lastH = 122;
  for (let row = 0; row === 0 || (b.desks.length < wanted(threads) && hall + BAND + lastH + FAC + 30 + ROAD <= H - 4); row++) {
    const below = hall + BAND;
    tablesIn(b, x0, cr, hall + 22, hall, below, tables);
    hall = below;
    halls.push(hall);
  }
  const bossR: Rect = { x: x0, y: hall + 12, w: 160, h: 98 };
  const boss = buildArmchair(b, bossR, hall);
  const reserved: Rect = { x: x0 + 168, y: hall + 10, w: cr - x0 - 168, h: 108 };
  const whiteboard = buildReserved(b, reserved, { hallY: hall, aisleX: reserved.x + reserved.w - 4 });

  // ---- the shop's front, the terrace, a strip of piazza with the fountain, the road, as far as there's room
  const fy = hall + lastH;
  const front = H - fy >= FAC;
  const facade = front ? { y: fy, h: FAC, doors: [stairX] } : null;
  const tY = fy + FAC;
  const room = H - tY;
  const bistro: CafePlan["bistro"] = [];
  const benches: Point[] = [];
  let terraceR: Rect | null = null;
  let road: Rect | null = null;
  let piazzaR: Rect | null = null;
  let fountain: CafePlan["fountain"] = null;
  if (front && room >= 24) {
    const tH = room >= 30 + ROAD ? 30 : room;
    terraceR = { x: 0, y: tY, w: W, h: tH };
    terrace(b, terraceR, x0, x1, hall, [stairX], bistro, pending);
    if (room - tH >= ROAD) road = { x: 0, y: H - ROAD, w: W, h: ROAD };
    const pzH = (road ? road.y : H) - (tY + tH);
    if (pzH >= 56) {
      piazzaR = { x: 0, y: tY + tH, w: W, h: pzH };
      fountain = piazzaStrip(b, piazzaR, x0, x1, tY + 6, hall, stairX, benches, pending);
    }
  }
  const nooks = addNooks(b, pending);

  const net: Network = { halls, aisles: [stairX] };
  const L = finish(b, W, H, true, [{ x0: 0, x1: W, depth: wallD }], net, {
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
    doorX: stairX,
    lamp: boss.lamp,
    wallTv,
  });
  const pinX = ax + 34;
  return done(
    L,
    {
      bldg: { x0, x1 },
      wallD,
      upstairs: { r: { x: x0, y: wallD, w: x1 - x0, h: edge - wallD }, edge },
      stairs: { x: stairX, y0: hU, y1: kY + 6 },
      facade,
      terrace: terraceR,
      street: road,
      piazza: piazzaR,
      fountain,
      benches,
      fireplace,
      menus: menuBoards(K.x + 40, K.x + K.w - 10, edge - 2, 26),
      tables,
      counter,
      reserved,
      stage,
      server,
      roaster,
      rug: rugOf(boss),
      armchairs,
      bistro,
      nooks,
      tiles: [{ x: x0, y: kY, w: cr - x0 + 6, h: hG1 - HALF - kY }],
      rugs: [
        { x: tvParts.couch.x - 14, y: wallD + 2, w: tvParts.couch.w + 28, h: tvParts.couch.y + tvParts.couch.h - wallD + 2 },
        { x: eventArea.x + 4, y: eventArea.y, w: eventArea.w - 8, h: eventArea.h - 2 },
      ],
    },
    {
      pin: { x: pinX, y: 4, w: Math.max(40, Math.min(64, cr - pinX - 26)), h: Math.min(50, wallD - 14) },
      clock: { x: ax + 12, y: 16 },
      windows: [],
      door: front ? { x: stairX - 10, y: fy + 4, w: 20, h: FAC - 4 } : { x: stairX - 10, y: wallD - 42, w: 20, h: 42 },
      entrance: front ? { x: stairX, y: Math.min(H - 2, fy + FAC + 6) } : { x: stairX, y: wallD + 2 },
      hall: front ? hall : hU,
    },
  );
}

/** The Coffee Shop floor plan for a panel (already at least the minimum size). */
export function cafeLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}
