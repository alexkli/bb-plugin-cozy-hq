// Startup House: the floor plan. A sunny suburban ranch house turned founders'
// incubator. The front wall (windows on the street, the front door) runs
// along the top; the living room under it is the open-plan office with the
// TV corner, the kitchen beside it. The hallway runs through the middle: the
// garage (servers, ping-pong), the entryway where everyone waits for you and
// the bedroom-turned-meeting-room with its bunk bed pushed aside. Out back,
// the house wraps around the backyard: a pool (a bit green), a grill, a
// hammock between two palms, and your room at the end of the hall. Pure
// geometry (no canvas): the layout tests run it in Node.

import type { Layout, Point, Rect, Spot } from "../../layout.ts";
import {
  Builder,
  buildArcade,
  buildBoss,
  buildGames,
  buildKitchen,
  buildLibrary,
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
export type CellKind = "living" | "kitchen" | "spare" | "den" | "garage" | "entry" | "laundry" | "yard";

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
}

export interface Garage {
  /** The concrete floor. */
  r: Rect;
  /** The roll-up door along the bottom edge. */
  door: Rect | null;
  /** The way in from the hallway (through the door in its top wall), when there's a door to roll up. */
  access: { hallY: number; x: number } | null;
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
  /** Walks besides the spots' own paths (the gags, the technician): walls open there too. */
  extra: Point[][];
}

/** The plan stashed on a Startup House layout (null on any other). */
export function planOf(L: Layout): StartupPlan | null {
  const d = L.themeData as Partial<StartupPlan> | undefined;
  return d && d.startup === true ? (d as StartupPlan) : null;
}

const HALF = 10; // hallways are 20 px wide
const ALL = { t: true, b: true, l: true, r: true };

// ------------------------------------------------------------------ rooms

/** The bedroom that became the meeting room: closet doors as the whiteboard, a table, the bunk bed pushed into the corner. */
function buildBunkRoom(b: Builder, r: Rect, hallY: number): { board: Rect; bunk: Rect | null } {
  const doorX = r.x + r.w - 16;
  b.rooms.push({ kind: "meeting", rect: r, walls: "glass", doorX, doorSide: "bottom" });
  const bunkW = 30;
  const hasBunk = r.w >= 160;
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
  const bunk = hasBunk ? { x: r.x + r.w - bunkW - 4, y: r.y - 8, w: bunkW, h: 46 } : null;
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
    return { yard: { r: Y, pool, grill: null, hammock, palms, loungers, lemon: null, access: { hallY, aisleX } }, event: lawn };
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
  return { yard: { r: Y, pool, grill, hammock, palms, loungers, lemon, access: { hallY, aisleX } }, event };
}

/** A garage corner: the water jug, the printer and the bin by the wall, the server cage beside them (lower when the arcade stands over it). */
function garageCorner(b: Builder, r: Rect, hallY: number, low = false): void {
  utilities(b, r.y + r.h, r.x + 2, hallY);
  const sx = r.x + 80;
  const sw = r.x + r.w - sx;
  const sh = Math.min(low ? 44 : 56, r.h - 8);
  if (sw >= 60 && sh >= 34) buildServerRoom(b, { x: sx, y: r.y + r.h - 2 - sh, w: sw, h: sh });
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

function done(L: Layout, plan: Omit<StartupPlan, "startup" | "extra">): Layout {
  const full: StartupPlan = { startup: true, ...plan, extra: [] };
  L.themeData = full;
  full.extra = extras(L);
  const e = L.eventArea;
  if (plan.yard && e.x >= plan.yard.r.x && e.y >= plan.yard.r.y) L.words = { "in the lounge": "out in the backyard" };
  return L;
}

// ------------------------------------------------------------------ wide panels

function wide(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const cells: Cell[] = [];
  const podCols = clamp(Math.floor((W * 0.33) / 48), 3, 6);
  const c1x = 6;
  const c1w = podCols * 48;
  const a12 = c1x + c1w + HALF;
  const c3w = clamp(Math.round(W * 0.27), 150, 240);
  const c3x = W - 6 - c3w;
  const a23 = c3x - HALF;
  const c2x = a12 + HALF;
  const c2w = a23 - HALF - c2x;
  // The front wall: the TV wall of the living room is the deepest.
  const d1 = 64;
  const d2 = 88;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  // A hallway and a back patio when the panel is tall enough; else only the hallway.
  const two = H >= 420;
  const topRows = two && wantPods >= 3 && H >= 560 ? 2 : 1;
  const h1 = two ? Math.max(d1 + topRows * POD_H + HALF, 178) : clamp(Math.round(H * 0.56), d1 + POD_H + HALF, H - 110);
  const bottomH = two ? clamp(Math.round((H - h1) * 0.42), 100, 240) : 0;
  const h2 = two ? H - 6 - bottomH - HALF : h1;
  const net: Network = { halls: two ? [h1, h2] : [h1], aisles: [a12, a23] };

  // ---- the living room: desks on the carpet, the TV corner with the sectional
  buildPods(b, { x: c1x, y: d1, w: c1w, h: h1 - 8 - d1 }, { hallY: h1, aisleX: a12 });
  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: h1 - 8 - d2 };
  cells.push({ kind: "living", r: { x: 0, y: d1, w: a23 + HALF - 2, h: h1 - HALF - d1 }, sides: { t: false, b: true, l: false, r: true } });

  let meeting: Rect;
  let whiteboard: Rect;
  let bunk: Rect | null;
  let kitchen: Rect;
  let waiting: Rect;
  let boss: Layout["boss"];
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let eventArea: Rect | null = null;
  let yard: Yard | null = null;
  let garage: Garage | null = null;
  let patio: StartupPlan["patio"] = null;

  if (two) {
    // ---- the kitchen in the front corner, the counter under the window
    kitchen = { x: c3x, y: d3 + 8, w: c3w, h: h1 - 8 - (d3 + 8) };
    buildKitchen(b, kitchen, { hallY: h1, aisleX: a23 });
    cells.push({ kind: "kitchen", r: { x: a23 + HALF - 2, y: d3, w: W - (a23 + HALF - 2), h: h1 - HALF - d3 }, sides: { t: false, b: true, l: false, r: false } });

    // ---- the middle of the house: the spare room (more desks) or the garage's ping-pong end,
    // the entryway, the bunk room
    const midY = h1 + HALF;
    const midH = h2 - HALF - midY;
    let left: Rect = { x: c1x, y: midY, w: c1w, h: midH };
    let spare = false;
    while (wantPods > b.pods.length && left.h >= POD_H + 2) {
      buildPods(b, { ...left, y: left.y + 2, h: POD_H }, { hallY: h1, aisleX: a12 });
      left = { ...left, y: left.y + POD_H + 4, h: left.h - POD_H - 4 };
      spare = true;
    }
    if (spare) cells.push({ kind: "spare", r: { x: 0, y: midY, w: a12 - HALF + 2, h: left.y - midY }, sides: { t: false, b: true, l: false, r: true } });
    let gamesInGarage = false;
    if (left.h >= 104 && c1w >= 150) {
      games = { ...left, y: left.y + 6, h: Math.min(150, left.h - 6) };
      gamesParts = buildGames(b, games, { hallY: h1, aisleX: a12 });
      gamesInGarage = true;
    } else if (left.h >= 90) {
      // Not enough for the ping-pong table: the den, with recliners and the board games.
      const lib = { ...left, y: left.y + 14, h: Math.min(120, left.h - 14) };
      buildLibrary(b, lib, { hallY: h2, aisleX: a12 });
      cells.push({ kind: "den", r: { x: 0, y: left.y, w: a12 - HALF + 2, h: left.h }, sides: { t: false, b: true, l: false, r: true } });
      left = { ...left, y: left.y + left.h, h: 0 };
    }

    waiting = { x: c2x, y: midY + 4, w: c2w, h: midH - 8 };
    buildEntry(b, waiting, h1);
    cells.push({ kind: "entry", r: { x: a12 + HALF - 2, y: midY, w: a23 - HALF - (a12 + HALF) + 4, h: midH }, sides: { t: false, b: true, l: true, r: true } });

    const mh = Math.min(midH, 200);
    if (midH - mh >= 30) cells.push({ kind: "laundry", r: { x: c3x, y: midY, w: c3w, h: midH - mh - 8 }, sides: ALL });
    meeting = { x: c3x, y: midY + midH - mh, w: c3w, h: mh };
    ({ board: whiteboard, bunk } = buildBunkRoom(b, meeting, h2));

    // ---- out back: the garage, the backyard, your room at the end of the hall
    const lowY = h2 + HALF;
    const lowH = H - 4 - lowY;
    const gTop = gamesInGarage ? left.y : lowY;
    garage = { r: { x: 0, y: gTop, w: a12 - HALF + 2, h: H - gTop }, door: { x: c1x + 4, y: H - 5, w: c1w - 8, h: 5 }, access: { hallY: h2, x: c1x + 39 } };
    // The office's arcade cabinet (unless the ping-pong end of the garage brought one) stands
    // by the garage wall over the server cage, in through the side door; with no room there
    // the living room gets it.
    const cx = c1x + c1w - 30;
    const cabinet = lowH >= 118 ? buildArcade(b, cx, lowY + 2, via({ hallY: h2, aisleX: a12 }, lowY + 64, cx + 12, lowY + 60)) : null;
    garageCorner(b, { x: c1x, y: lowY, w: c1w, h: lowH }, h2, cabinet !== null);
    cells.push({ kind: "garage", r: garage.r, sides: { t: !gamesInGarage || left.y > midY, b: false, l: false, r: true } });

    const Y: Rect = { x: a12 - HALF, y: lowY - 2, w: a23 + HALF - (a12 - HALF), h: H - (lowY - 2) };
    const built = buildYard(b, { x: c2x, y: lowY, w: c2w, h: lowH }, h2, a23);
    yard = { ...built.yard, r: Y };
    eventArea = built.event;
    patio = { y: h2 - HALF, x0: a12 - HALF, x1: a23 + HALF };

    const bossRoom: Rect = { x: c3x, y: lowY + 2, w: c3w, h: clamp(lowH - 4, 96, 230) };
    boss = buildBoss(b, bossRoom, h2);
  } else {
    // One hallway: the bunk room in the front corner; below the hall the kitchen and
    // the garage corner, the entryway with the backyard beside it, and your room.
    meeting = { x: c3x, y: d3, w: c3w, h: h1 - 8 - d3 };
    ({ board: whiteboard, bunk } = buildBunkRoom(b, meeting, h1));
    const lowY = h1 + HALF;
    const lowH = H - 4 - lowY;
    const serverW = c1w >= 200 ? 76 : 66;
    const kw = c1w - serverW - 12;
    kitchen = { x: c1x, y: lowY + 12, w: kw, h: Math.min(92, H - 6 - (lowY + 12)) };
    buildKitchen(b, kitchen, { hallY: h1, aisleX: c1x + kw + 6 });
    cells.push({ kind: "kitchen", r: { x: 0, y: lowY, w: kw + 8, h: H - lowY }, sides: { t: true, b: false, l: false, r: true } });
    const sh = Math.min(56, lowH - 4);
    const sx = c1x + kw + 12;
    buildServerRoom(b, { x: sx, y: H - 6 - sh, w: serverW - 2, h: sh });
    garage = { r: { x: sx - 4, y: lowY, w: a12 - HALF + 2 - (sx - 4), h: H - lowY }, door: null, access: null };
    cells.push({ kind: "garage", r: garage.r, sides: { t: true, b: false, l: false, r: true } });

    const withYard = c2w >= 190 && lowH >= 70;
    const ww = withYard ? Math.max(104, Math.round(c2w * 0.5)) : c2w;
    waiting = { x: c2x, y: lowY + 2, w: ww, h: lowH - 4 };
    buildEntry(b, waiting, h1);
    cells.push({ kind: "entry", r: { x: a12 + HALF - 2, y: lowY, w: ww + 6, h: H - lowY }, sides: { t: true, b: false, l: true, r: true } });
    if (withYard) {
      const yx = c2x + ww + 8;
      const built = buildYard(b, { x: yx, y: lowY + 2, w: c2x + c2w - yx, h: lowH - 2 }, h1, a23);
      yard = { ...built.yard, r: { x: yx - 2, y: lowY, w: a23 + HALF - (yx - 2), h: H - lowY } };
      eventArea = built.event;
      cells.push({ kind: "yard", r: yard.r, sides: { t: true, b: false, l: false, r: false } });
    }
    const bossRoom: Rect = { x: c3x, y: lowY + 2, w: c3w, h: clamp(H - 10 - (lowY + 2), 96, 230) };
    boss = buildBoss(b, bossRoom, h1);
  }

  // The TV corner last, so its beanbags know whether there's a ping-pong table for naps.
  const tvParts = buildLounge(b, lounge, { hallY: h1, aisleX: a23 }, wallTv, games === null);
  if (!eventArea || eventArea.w < 60 || eventArea.h < 26) {
    const couch = tvParts.couch;
    const free = lounge.y + lounge.h - (couch.y + couch.h + 6);
    eventArea = free >= 50 || games === null ? { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, free) } : games;
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
    gamesParts,
    doorX: a12,
    lamp: boss.lamp,
    wallTv,
  });
  return done(L, { cells, yard, garage, bunk, patio });
}

// ------------------------------------------------------------------ the phone held upright: a narrow house

function portrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const cells: Cell[] = [];
  // The hallway runs down the right side, past every room.
  const aisleX = W - 10;
  const x0 = 6;
  const innerW = aisleX - HALF - x0;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 54 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const top = 70;
  const gap = HALF * 2;
  type Kind = "podA" | "kitchenMeeting" | "lounge" | "podB" | "games" | "waitingBoss" | "yard";
  type Row = { kind: Kind; min: number; grow: number };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const rows: Row[] = [
    { kind: "podA", min: POD_H, grow: 0 },
    { kind: "kitchenMeeting", min: 112, grow: 1 },
    { kind: "lounge", min: 136, grow: 0.6 },
    { kind: "waitingBoss", min: 150, grow: 1.2 },
  ];
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  const used = () => rows.reduce((s, r) => s + r.min, 0) + gap * rows.length;
  // The backyard first (it's where the office gathers), then more desks, then the garage's games.
  if (top + used() + 90 + gap <= H - 6) rows.push({ kind: "yard", min: 90, grow: 0.8 });
  for (const o of [{ kind: "podB", min: POD_H, grow: 0 }, { kind: "games", min: 96, grow: 0.4 }] as Row[]) {
    if (o.kind === "podB" && needPods < 2 && H - top - used() < o.min + gap + 220) continue;
    if (top + used() + o.min + gap <= H - 6) rows.splice(rows.findIndex((r) => r.kind === "waitingBoss"), 0, o);
  }
  const extra = Math.max(0, H - 6 - top - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const plan: { row: Row; rect: Rect; hallY: number }[] = [];
  const halls: number[] = [];
  let y = top;
  for (const row of rows) {
    const h = row.min + Math.floor((extra * row.grow) / growSum);
    const rect: Rect = { x: x0, y, w: innerW, h };
    // Rooms open onto the hallway below them; your room, the entryway and the yard onto the one above.
    const above = row.kind === "waitingBoss" || row.kind === "yard";
    const hallY = above ? y - gap / 2 : y + h + gap / 2;
    plan.push({ row, rect, hallY });
    if (!above) halls.push(hallY);
    else if (row.kind === "yard") halls.push(hallY);
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
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let yard: Yard | null = null;
  let yardEvent: Rect | null = null;
  let garage: Garage | null = null;
  let patio: StartupPlan["patio"] = null;
  const hasRest = rows.some((r) => r.kind === "games");
  for (const { row, rect, hallY } of plan) {
    const acc: Access = { hallY, aisleX };
    const band = { x: 0, y: rect.y - (rect.y > top ? 2 : 6), w: aisleX - HALF + 2, h: rect.h + (rect.y > top ? 4 : 6) };
    switch (row.kind) {
      case "podA":
      case "podB":
        buildPods(b, { ...rect, h: Math.min(rect.h, POD_H) }, acc);
        cells.push({ kind: row.kind === "podA" ? "living" : "spare", r: band, sides: { t: false, b: true, l: false, r: true } });
        break;
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y + 14, w: kw - 6, h: rect.h - 14 };
        // In through the gap between the kitchen and the bunk room.
        buildKitchen(b, kitchen, { hallY, aisleX: rect.x + kw - 1 });
        cells.push({ kind: "kitchen", r: { ...band, w: kw - 4 + x0 }, sides: { t: false, b: true, l: false, r: true } });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        ({ board: whiteboard, bunk } = buildBunkRoom(b, meeting, hallY));
        break;
      }
      case "lounge":
        lounge = rect;
        // The arcade cabinet: in the garage's games room when the house has one, else in the
        // TV corner on the right (before the lounge, which would put it by the keyboard).
        if (!hasRest && rect.w >= 300) {
          const cx = rect.x + rect.w - 30;
          buildArcade(b, cx, rect.y + 2, via(acc, rect.y + 64, cx + 12, rect.y + 60));
        }
        tvParts = buildLounge(b, rect, acc, null, !hasRest, !hasRest);
        cells.push({ kind: "living", r: band, sides: { t: true, b: true, l: false, r: true } });
        break;
      case "games":
        games = rect;
        gamesParts = buildGames(b, { ...rect, y: rect.y + 6, h: rect.h - 6 }, acc);
        garage = garage ?? { r: band, door: null, access: null };
        cells.push({ kind: "garage", r: band, sides: { t: true, b: true, l: false, r: true } });
        break;
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 58 };
        buildEntry(b, waiting, hallY);
        cells.push({ kind: "entry", r: { x: 0, y: rect.y - 2, w: ww + 2, h: waiting.h + 10 }, sides: { t: true, b: false, l: false, r: true } });
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, hallY);
        // The garage corner under the entryway.
        const gy = waiting.y + waiting.h + 6;
        const corner: Rect = { x: x0, y: gy, w: ww - 4, h: rect.y + rect.h - gy };
        garageCorner(b, corner, hallY);
        garage = { r: { x: 0, y: gy - 2, w: ww + 2, h: corner.h + 4 }, door: null, access: null };
        cells.push({ kind: "garage", r: garage.r, sides: { t: true, b: true, l: false, r: true } });
        break;
      }
      case "yard": {
        const built = buildYard(b, { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, hallY, aisleX);
        yard = { ...built.yard, r: { x: 0, y: rect.y - 2, w: W, h: H - (rect.y - 2) } };
        yardEvent = built.event;
        patio = { y: rect.y - gap, x0: 0, x1: W };
        break;
      }
    }
  }
  const couch = tvParts!.couch;
  const loungeFloor = { x: lounge!.x + 10, y: couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - couch.y - 30) };
  const ye = yardEvent as Rect | null;
  const eventArea = ye && ye.w >= 60 && ye.h >= 26 ? ye : games ?? loungeFloor;
  const L = finish(b, W, H, true, segments, net, {
    meeting: meeting!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: kitchen!,
    lounge: lounge!,
    games,
    eventArea,
    tvParts: tvParts!,
    gamesParts,
    doorX: aisleX,
    lamp: boss!.lamp,
  });
  return done(L, { cells, yard, garage, bunk, patio });
}

/** The Startup House floor plan for a panel (already at least the minimum size). */
export function startupLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}
