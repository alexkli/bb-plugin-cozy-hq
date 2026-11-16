// Startup House: the floor plan. A small, sunny suburban ranch house on its
// lot, turned founders' incubator and far too full: the street with the
// beat-up car out front, side yards with the driveway, hedges and the
// neighbours' fences, and the backyard behind (the pool, a bit green, the
// grill, a hammock between two palms) where the house parties happen. Inside
// it's cramped: as many desks as the head count needs, jammed into the living
// room beside the TV corner and, when they run out of room, by the back door;
// a galley kitchen along the front wall with the bunk room as a box room
// behind it; the garage with the servers, the arcade cabinet and the water
// jug; the entryway where everyone waits; your room at the end of the hall.
// Pure geometry (no canvas): the layout tests run it in Node.

import type { Layout, Point, Rect, Spot } from "../../layout.ts";
import {
  Builder,
  buildArcade,
  buildBoss,
  buildKitchen,
  buildLounge,
  buildPods,
  buildServerRoom,
  clamp,
  finish,
  utilities,
  POD_H,
  via,
  type Access,
  type Network,
  type WallSegment,
} from "../../themekit.ts";

/** What a stretch of floor is in the house (it picks the floor and the walls around it). */
export type CellKind = "living" | "kitchen" | "garage" | "entry" | "yard";

export interface Cell {
  kind: CellKind;
  r: Rect;
  /** Sides with a wall (top, bottom, left, right); doorways open where people walk. */
  sides: { t: boolean; b: boolean; l: boolean; r: boolean };
}

export interface Yard {
  /** The whole backyard: grass inside the fence. */
  r: Rect;
  pool: Rect;
  /** The grill's feet (center bottom). */
  grill: Point | null;
  /** The hammock strung between two palms: its ends and the sag. */
  hammock: { x: number; y: number; w: number } | null;
  /** Palm trunk bases. */
  palms: Point[];
  /** Pool loungers (the seat's feet position). */
  loungers: Point[];
  /** A lemon tree in a corner of the lawn. */
  lemon: Point | null;
  /** How people get out here: the hallway and the aisle down to the lawn. */
  access: { hallY: number; aisleX: number };
  /** Raised vegetable beds along the back fence, in a deep yard. */
  beds: Rect | null;
}

export interface Garage {
  /** The concrete floor. */
  r: Rect;
  /** The roll-up door in the house's side wall, onto the driveway (null: no door to roll). */
  door: Rect | null;
  /** The way in from the hallway, for the demo-day rehearsal (with a door to roll up). */
  access: { hallY: number; x: number } | null;
}

/** The lot the house stands on: the house's walls, the street out front, the patio out back. */
export interface Lot {
  /** The house's outer walls, left and right. */
  x0: number;
  x1: number;
  /** The street and front yard over the roof (0: none). */
  front: number;
  /** Where the house's back wall runs (the patio or the yard below it), or the panel's bottom. */
  back: number;
}

export interface StartupPlan {
  startup: true;
  cells: Cell[];
  yard: Yard | null;
  garage: Garage | null;
  /** The bunk bed pushed aside in the meeting room (the bedroom it was). */
  bunk: Rect | null;
  /** Where the house's back wall runs above the patio (null: no patio). */
  patio: { y: number; x0: number; x1: number } | null;
  lot: Lot;
  /** Walks besides the spots' own paths (the gags, the technician): walls open there too. */
  extra: Point[][];
}

/** The plan stashed on a Startup House layout (null on any other). */
export function planOf(L: Layout): StartupPlan | null {
  const d = L.themeData as Partial<StartupPlan> | undefined;
  return d && d.startup === true ? (d as StartupPlan) : null;
}

const HALF = 10; // hallways are 20 px wide

// ------------------------------------------------------------------ rooms

/** The bedroom that became the meeting room: closet doors as the whiteboard, a table, the bunk bed pushed into the corner. */
function buildBunkRoom(b: Builder, r: Rect, hallY: number): { board: Rect; bunk: Rect | null } {
  const doorX = r.x + r.w - 16;
  b.rooms.push({ kind: "meeting", rect: r, walls: "glass", doorX, doorSide: "bottom" });
  const bunkW = 28;
  const hasBunk = r.w >= 150;
  const boardW = Math.max(56, Math.min(84, r.w - 62 - (hasBunk ? bunkW + 4 : 0)));
  const board: Rect = { x: r.x + 8, y: r.y + 4, w: boardW, h: 34 };
  b.prop("whiteboard", "whiteboard", board.x, board.y, board.y + 40, boardW);
  b.poke("whiteboard", "whiteboard", board);
  const lane = (x: number, y: number, laneY: number): Point[] => [
    { x: doorX, y: hallY, c: true },
    { x: doorX, y: r.y + r.h + 3 },
    { x: doorX, y: laneY },
    { x, y: laneY },
    { x, y },
  ];
  const boardY = r.y + 50;
  for (const [i, k] of [0.3, 0.7].entries()) {
    const x = Math.round(board.x + boardW * k);
    b.spot({ id: `board-${i}`, kind: "whiteboard", group: "meeting", x, y: boardY, facing: "back", pose: "draw", path: lane(x, boardY, boardY + 2), activity: "planning at the whiteboard" });
  }
  const bunk = hasBunk ? { x: r.x + r.w - bunkW - 3, y: r.y - 8, w: bunkW, h: 46 } : null;
  const presentY = boardY - 2;
  const presentEnd = r.x + r.w - 10 - (bunk ? bunkW : 0);
  for (let i = 0, x = board.x + boardW + 14; i < 2 && x <= presentEnd; i++, x += 22) {
    b.spot({ id: `present-${i}`, kind: "present", group: "present", x, y: presentY, facing: "front", pose: "stand", path: lane(x, presentY, presentY + 8), activity: "presenting a plan for your review" });
  }
  const tableX = r.x + Math.round((r.w - 68) / 2) - 6;
  if (r.h >= 150) {
    const tableY = boardY + 26;
    b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
    const topY = tableY + 4;
    const bottomY = tableY + 38;
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-t${i}`, kind: "meeting-seat", group: "meeting", x, y: topY, facing: "front", pose: "sit-front", path: lane(x, topY, tableY - 6), activity: "going through the plans" });
      b.prop(`meet-chair-t${i}`, "meeting-chair-front", x - 8, topY - 24, topY - 1);
    }
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: bottomY, facing: "back", pose: "sit-back", path: lane(x, bottomY, bottomY + 6), activity: "planning in the meeting room" });
      b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, bottomY - 14, bottomY + 2);
    }
    if (r.h >= 180) b.prop("plan-rolls", "plan-rolls", r.x + 6, r.y + r.h - 34, r.y + r.h - 6);
  } else if (r.h >= 104) {
    const tableY = r.y + 56;
    const seatY = tableY + 38;
    b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: seatY, facing: "back", pose: "sit-back", path: lane(x, seatY, seatY + 6), activity: "planning in the meeting room" });
      b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, seatY - 14, seatY + 2);
    }
  }
  b.prop("meeting-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  return { board, bunk };
}

/** The entryway: whatever chairs the house had, in rows facing you, and the hall table with the bell. */
function buildEntry(b: Builder, r: Rect, hallY: number): void {
  b.rooms.push({ kind: "waiting", rect: r });
  const aisleX = r.x + 8;
  const hasTable = r.w >= 100;
  const tableX = r.x + r.w - 40;
  if (hasTable) {
    b.prop("reception", "reception", tableX, r.y + 2, r.y + 20);
    b.poke("bell", "bell", { x: tableX, y: r.y - 4, w: 34, h: 24 });
  }
  const rows: Spot[][] = [];
  for (let row = 0, y = r.y + 38; y <= r.y + r.h - 4 && row < 2; row++, y += 30) {
    const list: Spot[] = [];
    const xEnd = row === 0 && hasTable ? tableX - 12 : r.x + r.w - 12;
    for (let i = 0, x = r.x + 26; x <= xEnd; i++, x += 20) {
      list.push({
        id: `wait-${row}-${i}`,
        kind: "review",
        group: "review",
        x,
        y,
        facing: "front",
        pose: "sit-front",
        path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: y - 22 }, { x, y: y - 22 }, { x, y }],
        activity: "waiting for you",
        lift: 2,
      });
      b.prop(`wait-chair-${row}-${i}`, "waiting-chair", x - 8, y - 15, y - 2);
    }
    rows.push(list);
  }
  const order = rows.flat();
  for (const s of order) b.spot(s);
  b.seats.push(...order);
}

/**
 * The backyard: the pool on the right, the lawn (where the office gathers)
 * on the left with the grill at its edge, a hammock between two palms and a
 * lounger under the pool. A narrow yard stacks the pool under the lawn.
 * People come in from the hallway at `hallY` down the aisle at `aisleX`.
 */
function buildYard(b: Builder, Y: Rect, hallY: number, aisleX: number): { yard: Yard; event: Rect } {
  const palms: Point[] = [];
  const loungers: Point[] = [];
  let hammock: Yard["hammock"] = null;
  const lounger = (x: number, y: number) => {
    loungers.push({ x, y });
    b.spot({ id: `lounger-${loungers.length}`, kind: "bench", group: "lounge", x, y, facing: "front", pose: "sit-front", path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: y + 8 }, { x, y: y + 8 }, { x, y }], activity: "working on a tan by the pool", lift: 2 });
  };
  if (Y.w < 170) {
    // Stacked: the lawn on top, the pool along the bottom.
    const ph = clamp(Math.round(Y.h * 0.36), 24, 50);
    const pool: Rect = { x: Y.x + 8, y: Y.y + Y.h - ph - 8, w: Y.w - 16, h: ph };
    const lawn: Rect = { x: Y.x + 6, y: Y.y + 6, w: Y.w - 12, h: pool.y - 12 - (Y.y + 6) };
    return { yard: { r: Y, pool, grill: null, hammock, palms, loungers, lemon: null, access: { hallY, aisleX }, beds: null }, event: lawn };
  }
  const pw = clamp(Math.round(Y.w * 0.42), 56, 150);
  const ph = clamp(Math.round(Y.h * 0.48), 26, 62);
  const pool: Rect = { x: Y.x + Y.w - pw - 10, y: Y.y + 12, w: pw, h: ph };
  // Under the pool: the hammock (a nap spot) and a lounger when there's width.
  const under = Y.y + Y.h - (pool.y + pool.h + 6);
  if (under >= 30) {
    const hy = pool.y + pool.h + 22;
    const hw = 40;
    const hx = pool.x + 2;
    hammock = { x: hx, y: hy, w: hw };
    palms.push({ x: hx, y: hy - 2 }, { x: hx + hw, y: hy - 2 });
    const cx = hx + Math.round(hw / 2);
    b.spot({ id: "hammock", kind: "bench", group: "nap", x: cx, y: hy, facing: "front", pose: "nap", path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: hy + 8 }, { x: cx, y: hy + 8 }, { x: cx, y: hy }], activity: "napping in the hammock", lift: 3 });
    if (pool.w >= 96) lounger(pool.x + pool.w - 16, hy);
  }
  // The lawn: the grill at its top left, a lemon tree in the far corner when there's room.
  const lawn: Rect = { x: Y.x + 6, y: Y.y + 6, w: pool.x - 14 - (Y.x + 6), h: Y.h - 12 };
  let grill: Point | null = null;
  let event: Rect = lawn;
  if (lawn.w >= 100) {
    grill = { x: lawn.x + 10, y: lawn.y + 22 };
    event = { x: lawn.x + 24, y: lawn.y, w: lawn.w - 24, h: lawn.h };
  }
  let lemon: Point | null = null;
  if (grill && lawn.h >= 90) {
    lemon = { x: lawn.x + 12, y: lawn.y + lawn.h - 4 };
    event = { ...event, h: event.h - 4 };
  }
  // A deep yard: raised vegetable beds along the back fence, under the lawn.
  let beds: Rect | null = null;
  if (Y.h >= 150 && event.w >= 90) {
    beds = { x: event.x + 8, y: Y.y + Y.h - 26, w: Math.min(event.w - 16, 160), h: 18 };
    event = { ...event, h: Math.min(event.h, beds.y - 8 - event.y) };
  }
  return { yard: { r: Y, pool, grill, hammock, palms, loungers, lemon, access: { hallY, aisleX }, beds }, event };
}

/**
 * The garage: the water jug, the printer and the bin along the left, the
 * server cage on the right with the arcade cabinet over it, and just enough
 * floor in the middle for a demo-day rehearsal.
 */
function buildGarage(b: Builder, G: Rect, hallY: number): void {
  utilities(b, G.y + G.h, G.x + 2, hallY);
  const sh = clamp(G.h - 76, 34, 56);
  buildServerRoom(b, { x: G.x + 76, y: G.y + G.h - 2 - sh, w: G.w - 78, h: sh });
  // The cabinet in the top corner, reached down the cage's side.
  const ax = G.x + G.w - 28;
  const ay = G.y + 2;
  buildArcade(b, ax, ay, [{ x: ax - 8, y: hallY, c: true }, { x: ax - 8, y: ay + 62 }, { x: ax + 12, y: ay + 62 }, { x: ax + 12, y: ay + 58 }]);
}

/** A garage corner (short panels): the water jug, the printer and the bin by the wall, the server cage beside them. */
function garageCorner(b: Builder, r: Rect, hallY: number): void {
  utilities(b, r.y + r.h, r.x + 2, hallY);
  const sx = r.x + 80;
  const sw = r.x + r.w - sx;
  const sh = Math.min(56, r.h - 8);
  if (sw >= 60 && sh >= 34) buildServerRoom(b, { x: sx, y: r.y + r.h - 2 - sh, w: sw, h: sh });
}

/** How many desks the house squeezes in: enough for the head count, ten at most, no spares to speak of. */
function deskCount(threads: number): number {
  return Math.max(Math.min(threads, 8), Math.min(10, Math.ceil(threads / 2)));
}

/** A pod row of `cols` desk pairs, centered in `r` (the rest of the floor stays clutter). */
function podsIn(b: Builder, r: Rect, cols: number, acc: Access): void {
  const w = cols * 48;
  buildPods(b, { x: r.x + Math.floor((r.w - w) / 2), y: r.y, w, h: POD_H }, acc);
}

// ------------------------------------------------------------------ finishing

/** Where the shock gag sends people (mirrors the office's own choice), so the garage wall opens there. */
function serverWay(L: Layout): Point[] | null {
  const server = L.server;
  if (!server) return null;
  const cooler = L.byId.get("cooler");
  const sy = server.y + server.h - 3;
  const cx = server.x + server.w / 2;
  const outside = (x: number) => x < server.x - 2 || x > server.x + server.w + 2;
  const ways: Point[] = [];
  for (const ax of L.net.aisles) if (outside(ax)) for (const hy of L.net.halls) ways.push({ x: ax, y: hy });
  if (cooler && outside(cooler.x)) ways.push({ x: cooler.x, y: cooler.path[0]!.y });
  if (ways.length === 0) return null;
  const cost = (p: Point) => Math.abs(p.x - cx) + Math.abs(p.y - sy) * 0.6;
  const way = ways.reduce((a, p) => (cost(p) < cost(a) ? p : a));
  const x = way.x < server.x ? server.x + 14 : server.x + server.w - 14;
  return [{ x: way.x, y: way.y }, { x: way.x, y: sy }, { x, y: sy }];
}

function extras(L: Layout): Point[][] {
  const out: Point[][] = [];
  const way = serverWay(L);
  if (way) out.push(way);
  const cooler = L.byId.get("cooler");
  if (cooler) out.push([{ x: cooler.x + 29, y: cooler.path[0]!.y }, { x: cooler.x + 29, y: cooler.y }]);
  out.push(L.entrancePath);
  return out;
}

/**
 * The front wall's fixtures, moved onto the house: the pinboard, calendar and
 * status board by its left end, the "?" note by the door, windows wherever
 * the wall is free, a poster or two, the hanging pothos, all below the
 * street when there is one. The guard's round stays indoors too.
 */
function hangWall(L: Layout, lot: Lot, wallTv: Rect | null): void {
  const M = lot.front;
  const segs = L.segments;
  const seg0 = segs[0]!;
  const w = L.wall;
  // In a small house the pinboard gives way to the door (the calendar and status board stand between them).
  const room = w.door.x > lot.x0 + 8 ? w.door.x - 6 - 28 - (lot.x0 + 8) : 128;
  w.pinboard = { x: lot.x0 + 8, y: M + 3, w: clamp(room, 96, 128), h: Math.min(53, seg0.depth - M - 11) };
  w.calendar = { x: w.pinboard.x + w.pinboard.w + 8, y: M + 6, w: 20, h: 22 };
  w.status = { x: w.calendar.x, y: M + 31, w: 20, h: 18 };
  const noteY = Math.max(M + 8, w.door.y + 8);
  const leftOfDoor = w.door.x - 16 >= w.calendar.x + w.calendar.w + 4;
  w.legendNote = { x: leftOfDoor ? w.door.x - 16 : w.door.x + w.door.w + 4, y: noteY, w: 12, h: 12 };
  const last = segs[segs.length - 1]!;
  w.clock = { x: last.x0 + 20, y: M + 18, r: 9 };
  const busy: [number, number][] = [
    [w.pinboard.x - 4, w.status.x + w.status.w + 4],
    [Math.min(w.legendNote.x, w.door.x) - 4, Math.max(w.legendNote.x + w.legendNote.w, w.door.x + w.door.w) + 4],
    [w.clock.x - 12, w.clock.x + 12],
  ];
  if (wallTv) busy.push([wallTv.x - 18, wallTv.x + wallTv.w + 18]);
  const pillars = segs.slice(1).map((s) => s.x0);
  const windows: Rect[] = [];
  const paintings: Layout["wall"]["paintings"] = [];
  for (const s of segs) {
    let x = s.x0 + 8;
    while (x + 40 <= s.x1 - 8) {
      const free = !busy.some(([a, z]) => x < z && x + 40 > a) && !pillars.some((p) => x < p + 6 && x + 40 > p - 6);
      if (free) {
        windows.push({ x, y: M + 9, w: 40, h: Math.min(38, s.depth - M - 22) });
        busy.push([x - 2, x + 42]);
        x += 52;
        if (x + 16 < s.x1 - 8 && windows.length % 3 === 0 && !busy.some(([a, z]) => x < z && x + 16 > a)) {
          paintings.push({ sprite: windows.length % 2 ? "SMALL_PAINTING" : "SMALL_PAINTING_2", x, y: M + 1 });
          busy.push([x - 2, x + 18]);
          x += 24;
        }
      } else x += 6;
    }
  }
  w.windows = windows;
  w.paintings = paintings;
  w.pillars = pillars;
  // The hanging pothos, in a couple of free stretches.
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  let hanging = 0;
  for (const s of segs) {
    for (let x = s.x0 + 10; x + 16 <= s.x1 - 10 && hanging < 3; x += 4) {
      const free = !busy.some(([a, z]) => x < z + 2 && x + 16 > a - 2) && !pillars.some((p) => x < p + 8 && x + 16 > p - 8);
      if (!free) continue;
      L.plants.push({ sprite: "HANGING_PLANT", x, y: M, z: M + 1 });
      busy.push([x, x + 16]);
      hanging++;
      x += 60;
    }
  }
  // Rounds stay inside the house.
  L.patrol = [];
  for (const [i, hy] of L.net.halls.entries()) {
    if (hy > lot.back) continue;
    const row = i % 2 ? [lot.x1 - 12, lot.x0 + 12] : [lot.x0 + 12, lot.x1 - 12];
    for (const x of row) L.patrol.push({ x, y: hy, c: true });
  }
  if (L.patrol.length < 2) {
    const hy = L.net.halls[0]!;
    L.patrol = [{ x: lot.x0 + 12, y: hy, c: true }, { x: lot.x1 - 12, y: hy, c: true }];
  }
}

function done(L: Layout, plan: Omit<StartupPlan, "startup" | "extra">, wallTv: Rect | null): Layout {
  hangWall(L, plan.lot, wallTv);
  const full: StartupPlan = { startup: true, ...plan, extra: [] };
  L.themeData = full;
  full.extra = extras(L);
  const e = L.eventArea;
  if (plan.yard && e.y >= plan.yard.r.y) L.words = { "in the lounge": "out in the backyard" };
  return L;
}

// ------------------------------------------------------------------ wide panels

function wide(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const cells: Cell[] = [];
  const desks = deskCount(threads);
  // Two hallways and a backyard when the panel is tall enough; the street out front when taller still.
  const two = H >= 400;
  const M = two && H >= 440 ? 30 : 0;
  // The house, well inside the panel: the side yards take the rest. (Short panels
  // need the room: a wider house with the kitchen beside the garage.)
  const HW = two ? clamp(W - 126, 526, 560) : clamp(W - 80, 560, 600);
  const x0 = Math.round((W - HW) / 2);
  const x1 = x0 + HW;
  const c1x = x0 + 6;
  const c1w = two ? 144 : 192;
  const a12 = c1x + c1w + HALF;
  const c3w = 150;
  const c3x = x1 - 6 - c3w;
  const a23 = c3x - HALF;
  const c2x = a12 + HALF;
  const c2w = a23 - HALF - c2x;
  // The front wall: the TV wall of the living room is the deepest.
  const d1 = M + 64;
  const d2 = M + 88;
  const d3 = M + 70;
  const segments: WallSegment[] = [
    { x0: x0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: x1, depth: d3 },
  ];
  const tvW = Math.min(c2w - 62, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - M - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const colsMax = Math.floor(c1w / 48);
  const rowsA = two && desks > 2 * colsMax && H >= 600 ? 2 : 1;
  // Hallway 1 under the living room (and the galley kitchen with the box room behind it).
  const h1 = two ? Math.max(d1 + rowsA * POD_H + HALF, d3 + 130) : clamp(Math.round(H * 0.56), d1 + POD_H + HALF, H - 110);
  const hB = two ? clamp(Math.round((H - h1 - 2 * HALF) * 0.45), 112, 160) : 0;
  const h2 = two ? h1 + HALF + hB + HALF : h1;
  const net: Network = { halls: two ? [h1, h2] : [h1], aisles: [a12, a23] };
  const back = two ? h2 - HALF : H;
  const lot: Lot = { x0, x1, front: M, back };

  // ---- the living room: desks jammed in on the carpet, the TV corner
  let placed = 0;
  for (let row = 0; row < rowsA && placed < desks; row++) {
    const cols = Math.min(colsMax, Math.ceil((desks - placed) / 2));
    podsIn(b, { x: c1x, y: d1 + row * POD_H, w: c1w, h: POD_H }, cols, { hallY: h1, aisleX: a12 });
    placed += cols * 2;
  }
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: h1 - 8 - d2 };
  cells.push({ kind: "living", r: { x: x0 + 4, y: d1, w: a23 + 8 - (x0 + 4), h: h1 - HALF - d1 }, sides: { t: false, b: true, l: false, r: true } });

  let meeting: Rect;
  let whiteboard: Rect;
  let bunk: Rect | null;
  let kitchen: Rect;
  let waiting: Rect;
  let boss: Layout["boss"];
  let games: Rect | null = null;
  let eventArea: Rect | null = null;
  let yard: Yard | null = null;
  let garage: Garage | null = null;
  let patio: StartupPlan["patio"] = null;
  const lowY = h1 + HALF;

  if (two) {
    // ---- the galley kitchen along the front wall, the bunk room as a box room behind it
    kitchen = { x: c3x, y: d3 + 8, w: c3w, h: 40 };
    buildKitchen(b, kitchen, { hallY: h1, aisleX: a23 });
    cells.push({ kind: "kitchen", r: { x: a23 + 8, y: d3, w: x1 - 4 - (a23 + 8), h: 44 }, sides: { t: false, b: false, l: false, r: false } });
    meeting = { x: c3x, y: kitchen.y + 46, w: c3w, h: h1 - 8 - (kitchen.y + 46) };
    ({ board: whiteboard, bunk } = buildBunkRoom(b, meeting, h1));

    // ---- under the hallway: the garage, the entryway (desks by the back door if the living room's full), your room
    const G: Rect = { x: c1x, y: lowY, w: c1w, h: hB };
    buildGarage(b, G, h1);
    garage = { r: { x: x0 + 4, y: lowY, w: a12 - HALF + 2 - (x0 + 4), h: hB }, door: { x: x0 - 1, y: lowY + 10, w: 6, h: hB - 20 }, access: { hallY: h1, x: G.x + 44 } };
    cells.push({ kind: "garage", r: garage.r, sides: { t: true, b: true, l: false, r: true } });
    const extraPod = placed < desks && c2w >= 140 && hB >= 108;
    if (extraPod) {
      podsIn(b, { x: c2x + c2w - 50, y: lowY + 2, w: 48, h: POD_H }, 1, { hallY: h1, aisleX: a23 });
      placed += 2;
    }
    waiting = { x: c2x, y: lowY + 4, w: c2w - (extraPod ? 58 : 0), h: hB - 8 };
    buildEntry(b, waiting, h1);
    cells.push({ kind: "entry", r: { x: a12 + HALF - 2, y: lowY, w: a23 - HALF - (a12 + HALF) + 4, h: hB }, sides: { t: true, b: true, l: false, r: true } });
    const bossRoom: Rect = { x: c3x, y: lowY + 2, w: c3w, h: hB - 4 };
    boss = buildBoss(b, bossRoom, h1);

    // ---- out back: the patio, the backyard and its pool
    const yTop = h2 + HALF;
    const built = buildYard(b, { x: x0 + 6, y: yTop + 2, w: HW - 12, h: H - 6 - (yTop + 2) }, h2, a23);
    yard = { ...built.yard, r: { x: 0, y: yTop, w: W, h: H - yTop } };
    eventArea = built.event;
    patio = { y: h2 - HALF, x0: 0, x1: W };
  } else {
    // One hallway: the bunk room in the front corner; below the hall the galley kitchen and
    // the garage corner, the entryway, and your room.
    meeting = { x: c3x, y: d3, w: c3w, h: h1 - 8 - d3 };
    ({ board: whiteboard, bunk } = buildBunkRoom(b, meeting, h1));
    const lowH = H - 4 - lowY;
    const kw = c1w - 66 - 12;
    kitchen = { x: c1x, y: lowY + 12, w: kw, h: Math.min(92, H - 6 - (lowY + 12)) };
    buildKitchen(b, kitchen, { hallY: h1, aisleX: c1x + kw + 6 });
    cells.push({ kind: "kitchen", r: { x: x0 + 4, y: lowY, w: c1x + kw + 8 - (x0 + 4), h: H - 4 - lowY }, sides: { t: true, b: false, l: false, r: true } });
    const sh = Math.min(56, lowH - 4);
    const sx = c1x + kw + 12;
    buildServerRoom(b, { x: sx, y: H - 6 - sh, w: 64, h: sh });
    garage = { r: { x: sx - 4, y: lowY, w: a12 - HALF + 2 - (sx - 4), h: H - 4 - lowY }, door: null, access: null };
    cells.push({ kind: "garage", r: garage.r, sides: { t: true, b: false, l: false, r: true } });
    waiting = { x: c2x, y: lowY + 2, w: c2w, h: lowH - 4 };
    buildEntry(b, waiting, h1);
    cells.push({ kind: "entry", r: { x: a12 + HALF - 2, y: lowY, w: c2w + 6, h: H - 4 - lowY }, sides: { t: true, b: false, l: false, r: true } });
    const bossRoom: Rect = { x: c3x, y: lowY + 2, w: c3w, h: clamp(H - 10 - (lowY + 2), 96, 230) };
    boss = buildBoss(b, bossRoom, h1);
  }

  // The TV corner last: if nobody else has the arcade cabinet, it goes by the keyboard.
  const tvParts = buildLounge(b, lounge, { hallY: h1, aisleX: a23 }, wallTv, true);
  if (!eventArea || eventArea.w < 60 || eventArea.h < 26) {
    const couch = tvParts.couch;
    const free = lounge.y + lounge.h - (couch.y + couch.h + 6);
    eventArea = { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, free) };
  }
  const L = finish(b, W, H, false, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting,
    kitchen,
    lounge,
    games,
    eventArea,
    tvParts,
    gamesParts: null,
    doorX: a12,
    lamp: boss.lamp,
    wallTv,
  });
  return done(L, { cells, yard, garage, bunk, patio, lot }, wallTv);
}

// ------------------------------------------------------------------ the phone held upright: a narrow house

function portrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const cells: Cell[] = [];
  const desks = deskCount(threads);
  // A strip of side yard either side; the hallway runs down the house's right side.
  const hx0 = 12;
  const hx1 = W - 12;
  const aisleX = hx1 - 10;
  const x0 = hx0 + 6;
  const innerW = aisleX - HALF - x0;
  const M = H >= 780 ? 26 : 0;
  const segments: WallSegment[] = [
    { x0: hx0, x1: Math.round(W * 0.42), depth: M + 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: M + 54 },
    { x0: Math.round(W * 0.7), x1: hx1, depth: M + 70 },
  ];
  const top = M + 70;
  const gap = HALF * 2;
  type Kind = "podA" | "kitchenMeeting" | "lounge" | "podB" | "games" | "waitingBoss" | "yard";
  type Row = { kind: Kind; min: number; grow: number };
  const colsMax = Math.max(2, Math.floor(innerW / 48));
  const rows: Row[] = [
    { kind: "podA", min: POD_H, grow: 0 },
    { kind: "kitchenMeeting", min: 112, grow: 1 },
    { kind: "lounge", min: 136, grow: 0.6 },
    { kind: "waitingBoss", min: 150, grow: 1.2 },
  ];
  const used = () => rows.reduce((s, r) => s + r.min, 0) + gap * rows.length;
  // The backyard first (it's where the office gathers), then a second row of desks only if the head count needs it.
  if (top + used() + 90 + gap <= H - 6) rows.push({ kind: "yard", min: 90, grow: 0.8 });
  if (desks > 2 * colsMax && top + used() + POD_H + gap <= H - 6) rows.splice(1, 0, { kind: "podB", min: POD_H, grow: 0 });
  const extra = Math.max(0, H - 6 - top - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const plan: { row: Row; rect: Rect; hallY: number }[] = [];
  const halls: number[] = [];
  let y = top;
  for (const row of rows) {
    const h = row.min + Math.floor((extra * row.grow) / growSum);
    const rect: Rect = { x: x0, y, w: innerW, h };
    const above = row.kind === "waitingBoss" || row.kind === "yard";
    const hallY = above ? y - gap / 2 : y + h + gap / 2;
    plan.push({ row, rect, hallY });
    if (!above || row.kind === "yard") halls.push(hallY);
    y += h + gap;
  }
  const net: Network = { halls: [...new Set(halls)].sort((p, q) => p - q), aisles: [aisleX] };
  let kitchen: Rect | null = null;
  let lounge: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let bunk: Rect | null = null;
  let waiting: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let yard: Yard | null = null;
  let yardEvent: Rect | null = null;
  let garage: Garage | null = null;
  let patio: StartupPlan["patio"] = null;
  let back = H;
  let placed = 0;
  for (const { row, rect, hallY } of plan) {
    const acc: Access = { hallY, aisleX };
    const band = { x: hx0 + 4, y: rect.y - (rect.y > top ? 2 : 6), w: aisleX - HALF + 2 - (hx0 + 4), h: rect.h + (rect.y > top ? 4 : 6) };
    switch (row.kind) {
      case "podA":
      case "podB": {
        const cols = Math.min(colsMax, Math.max(1, Math.ceil((desks - placed) / 2)));
        podsIn(b, { ...rect, h: POD_H }, cols, acc);
        placed += cols * 2;
        cells.push({ kind: "living", r: band, sides: { t: false, b: true, l: false, r: true } });
        break;
      }
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y + 14, w: kw - 6, h: rect.h - 14 };
        buildKitchen(b, kitchen, { hallY, aisleX: rect.x + kw - 1 });
        cells.push({ kind: "kitchen", r: { ...band, w: kw - 4 + x0 - band.x }, sides: { t: false, b: true, l: false, r: true } });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        ({ board: whiteboard, bunk } = buildBunkRoom(b, meeting, hallY));
        break;
      }
      case "lounge": {
        lounge = rect;
        // The arcade cabinet in the TV corner on the right, before the lounge (which would put it by the keyboard).
        if (rect.w >= 230) {
          const cx = rect.x + rect.w - 30;
          buildArcade(b, cx, rect.y + 2, via(acc, rect.y + 64, cx + 12, rect.y + 60));
        }
        tvParts = buildLounge(b, rect, acc, null, true);
        cells.push({ kind: "living", r: band, sides: { t: true, b: true, l: false, r: true } });
        break;
      }
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 58 };
        buildEntry(b, waiting, hallY);
        cells.push({ kind: "entry", r: { x: band.x, y: rect.y - 2, w: rect.x + ww + 2 - band.x, h: waiting.h + 10 }, sides: { t: true, b: false, l: false, r: true } });
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, hallY);
        // The garage corner under the entryway.
        const gy = waiting.y + waiting.h + 6;
        const corner: Rect = { x: x0, y: gy, w: ww - 4, h: rect.y + rect.h - gy };
        garageCorner(b, corner, hallY);
        garage = { r: { x: band.x, y: gy - 2, w: rect.x + ww + 2 - band.x, h: corner.h + 4 }, door: null, access: null };
        cells.push({ kind: "garage", r: garage.r, sides: { t: true, b: true, l: false, r: true } });
        back = rect.y + rect.h + 1;
        break;
      }
      case "yard": {
        const built = buildYard(b, { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, hallY, aisleX);
        yard = { ...built.yard, r: { x: 0, y: rect.y - 2, w: W, h: H - (rect.y - 2) } };
        yardEvent = built.event;
        patio = { y: rect.y - gap, x0: 0, x1: W };
        break;
      }
      case "games":
        break;
    }
  }
  const couch = tvParts!.couch;
  const loungeFloor = { x: lounge!.x + 10, y: couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - couch.y - 30) };
  const ye = yardEvent as Rect | null;
  const eventArea = ye && ye.w >= 60 && ye.h >= 26 ? ye : loungeFloor;
  const L = finish(b, W, H, true, segments, net, {
    meeting: meeting!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: kitchen!,
    lounge: lounge!,
    games: null,
    eventArea,
    tvParts: tvParts!,
    gamesParts: null,
    doorX: aisleX,
    lamp: boss!.lamp,
  });
  return done(L, { cells, yard, garage, bunk, patio, lot: { x0: hx0, x1: hx1, front: M, back: Math.min(back, H) } }, null);
}

/** The Startup House floor plan for a panel (already at least the minimum size). */
export function startupLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}
